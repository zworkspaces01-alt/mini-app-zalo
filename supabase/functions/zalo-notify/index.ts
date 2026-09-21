/**
 * Supabase Edge Function: Gửi tin nhắn Zalo OA / ZNS cho khách hàng
 *
 * Hỗ trợ:
 * - Gửi tin ZNS qua số điện thoại khách hàng (https://business.openapi.zalo.me/message/template)
 * - Gửi tin nhắn Zalo OA qua Zalo User ID (https://openapi.zalo.me/v3.0/oa/message/transaction)
 * - Tự động phát hiện token hết hạn và Refresh Token tự động 24/7
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const svc = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

/** Chuẩn hoá số điện thoại sang định dạng chuẩn Zalo ZNS (84xxxxxxxxx) */
function normalizeZaloPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return "84" + cleaned.slice(1);
  }
  if (cleaned.startsWith("84")) {
    return cleaned;
  }
  return cleaned;
}

interface ZaloOASettings {
  oa_id: string;
  app_id: string;
  secret_key: string;
  access_token: string;
  refresh_token: string;
  token_expires_at?: string | null;
  zns_template_reservation?: string;
  zns_template_order?: string;
  send_mode: "zns" | "oa_message" | "both";
  is_active: boolean;
}

async function loadZaloSettings(): Promise<ZaloOASettings | null> {
  try {
    const res = await svc("/rest/v1/zalo_oa_settings?select=*&id=eq.1");
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0] as ZaloOASettings;
  } catch (err) {
    console.error("Lỗi đọc zalo_oa_settings:", err);
    return null;
  }
}

/** Tự động refresh token Zalo OA khi hết hạn */
async function refreshZaloAccessToken(settings: ZaloOASettings): Promise<string | null> {
  const { app_id, secret_key, refresh_token } = settings;
  if (!app_id || !secret_key || !refresh_token) {
    console.warn("Không đủ thông tin app_id, secret_key hoặc refresh_token để làm mới access_token");
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append("app_id", app_id);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refresh_token);

    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: secret_key,
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      const expiresIn = Number(data.expires_in) || 90000;
      // Lưu lại token mới vào DB
      await svc("/rest/v1/rpc/update_zalo_oa_tokens", {
        method: "POST",
        body: JSON.stringify({
          p_access_token: data.access_token,
          p_refresh_token: data.refresh_token,
          p_expires_in: expiresIn,
        }),
      });

      return data.access_token;
    } else {
      console.error("Zalo refresh token thất bại:", data);
      return null;
    }
  } catch (err) {
    console.error("Lỗi gọi API refresh token:", err);
    return null;
  }
}

async function logZaloNotification(log: {
  recipient_phone?: string;
  recipient_zalo_id?: string;
  event_type: string;
  reference_code?: string;
  send_mode: string;
  status: "success" | "failed";
  error_message?: string;
  response_data?: any;
}) {
  try {
    await svc("/rest/v1/zalo_notification_logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
  } catch (err) {
    console.error("Lỗi ghi log zalo notification:", err);
  }
}

/** Gửi tin ZNS qua số điện thoại */
async function sendZns(
  token: string,
  phone: string,
  templateId: string,
  templateData: Record<string, any>,
  trackingId?: string
) {
  const url = "https://business.openapi.zalo.me/message/template";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: token,
    },
    body: JSON.stringify({
      phone: normalizeZaloPhone(phone),
      template_id: templateId,
      template_data: templateData,
      tracking_id: trackingId || "miyako_" + Date.now(),
    }),
  });
  return await res.json();
}

/** Gửi tin nhắn giao dịch qua Zalo User ID */
async function sendOaTransactionMessage(
  token: string,
  userId: string,
  text: string
) {
  const url = "https://openapi.zalo.me/v3.0/oa/message/transaction";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: token,
    },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text },
    }),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Yêu cầu JSON không hợp lệ" }, 400);
  }

  const { type, data, phone, zalo_id } = body;
  const settings = await loadZaloSettings();

  if (!settings || !settings.is_active) {
    return json({ success: false, reason: "Hệ thống Zalo OA đang tạm tắt hoặc chưa cấu hình" });
  }

  let token = settings.access_token;
  if (!token) {
    // Thử dùng refresh token để sinh token đầu tiên
    const fresh = await refreshZaloAccessToken(settings);
    if (fresh) token = fresh;
  }

  if (!token) {
    return json(
      {
        error: "Chưa cấu hình Access Token hoặc Refresh Token cho Zalo OA trong Cài đặt",
        configured: false,
      },
      400
    );
  }

  // 1. Xử lý sự kiện kiểm tra (Test)
  if (type === "test") {
    const testPhone = phone || data?.phone;
    const testUserId = zalo_id || data?.zalo_id;

    if (!testPhone && !testUserId) {
      return json({ error: "Vui lòng nhập Số điện thoại hoặc Zalo User ID để gửi thử" }, 400);
    }

    let result: any = null;
    let modeUsed = "zns";

    if (testPhone && settings.zns_template_reservation) {
      result = await sendZns(token, testPhone, settings.zns_template_reservation, {
        customer_name: "Khách hàng thử nghiệm",
        order_code: "TEST-" + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleDateString("vi-VN"),
        time: "19:00",
        guests: 2,
        deposit: "0đ",
      });
      modeUsed = "zns";
    } else if (testUserId) {
      result = await sendOaTransactionMessage(
        token,
        testUserId,
        "🛎 [Miyako Japanese Dining] Đây là tin nhắn thử nghiệm kết nối Zalo OA thành công!"
      );
      modeUsed = "oa_message";
    } else {
      return json(
        {
          error: "Chưa cấu hình ZNS Template ID hoặc chưa truyền Zalo User ID",
          suggestion: "Hãy nhập ZNS Template ID hoặc điền Zalo User ID để test",
        },
        400
      );
    }

    // Nếu token hết hạn (-216 hoặc -217), thử refresh và gửi lại 1 lần
    if (result && (result.error === -216 || result.error === -217)) {
      const freshToken = await refreshZaloAccessToken(settings);
      if (freshToken) {
        if (modeUsed === "zns") {
          result = await sendZns(freshToken, testPhone, settings.zns_template_reservation!, {
            customer_name: "Khách hàng thử nghiệm",
            order_code: "TEST-" + Math.floor(1000 + Math.random() * 9000),
            date: new Date().toLocaleDateString("vi-VN"),
            time: "19:00",
            guests: 2,
            deposit: "0đ",
          });
        } else {
          result = await sendOaTransactionMessage(
            freshToken,
            testUserId,
            "🛎 [Miyako Japanese Dining] Đây là tin nhắn thử nghiệm kết nối Zalo OA thành công!"
          );
        }
      }
    }

    const success = result && (result.error === 0 || result.status === "success");
    await logZaloNotification({
      recipient_phone: testPhone,
      recipient_zalo_id: testUserId,
      event_type: "test",
      reference_code: "TEST",
      send_mode: modeUsed,
      status: success ? "success" : "failed",
      error_message: success ? undefined : result?.message || JSON.stringify(result),
      response_data: result,
    });

    if (!success) {
      return json(
        {
          error: `Zalo API báo lỗi: ${result?.message || "Không gửi được tin"} (mã lỗi: ${result?.error})`,
          details: result,
        },
        502
      );
    }

    return json({ success: true, message: "Đã gửi tin nhắn Zalo thử nghiệm thành công!", details: result });
  }

  // 2. Thông báo Đặt bàn thành công (Reservation)
  if (type === "reservation") {
    const {
      code,
      guest_name,
      guest_phone,
      guests,
      reserved_date,
      reserved_time,
      purpose,
      omakase_title,
      seat_labels,
      deposit_amount = 0,
      zalo_id: targetZaloId,
    } = data || {};

    const targetPhone = guest_phone || phone;
    let result: any = null;
    let modeUsed = "zns";

    // Gửi qua ZNS (nếu có template và số điện thoại)
    if (targetPhone && settings.zns_template_reservation && settings.send_mode !== "oa_message") {
      modeUsed = "zns";
      const templateData = {
        customer_name: guest_name || "Quý khách",
        order_code: code || "RES",
        date: reserved_date || "",
        time: reserved_time || "",
        guests: guests || 1,
        purpose: purpose === "omakase" ? "Omakase" : "Ala carte",
        deposit: deposit_amount > 0 ? formatVnd(deposit_amount) : "0đ",
        hotline: "0965630828",
      };

      result = await sendZns(token, targetPhone, settings.zns_template_reservation, templateData, code);

      // Xử lý token hết hạn
      if (result && (result.error === -216 || result.error === -217)) {
        const fresh = await refreshZaloAccessToken(settings);
        if (fresh) {
          result = await sendZns(fresh, targetPhone, settings.zns_template_reservation, templateData, code);
        }
      }
    }

    // Hoặc gửi qua Zalo OA Message (nếu có user_id)
    if ((!result || result.error !== 0) && (targetZaloId || zalo_id)) {
      modeUsed = "oa_message";
      const uid = targetZaloId || zalo_id;
      const msg = [
        `🍣 [Miyako Dining] Xác nhận đặt bàn thành công!`,
        `Kính chào ${guest_name || "Quý khách"},`,
        `Mã đặt bàn: #${code}`,
        `Thời gian: ${reserved_time} ngày ${reserved_date}`,
        `Số lượng: ${guests} khách`,
        purpose === "omakase" ? `Set: ${omakase_title || "Omakase"}` : "Hình thức: Gọi món",
        seat_labels?.length ? `Vị trí: ${Array.isArray(seat_labels) ? seat_labels.join(", ") : seat_labels}` : null,
        deposit_amount > 0 ? `Tiền cọc: ${formatVnd(deposit_amount)}` : null,
        `Miyako rất hân hạnh được đón tiếp Quý khách! Hotline hỗ trợ: 0965630828`,
      ]
        .filter(Boolean)
        .join("\n");

      result = await sendOaTransactionMessage(token, uid, msg);
    }

    const isSuccess = result && (result.error === 0 || result.status === "success");
    await logZaloNotification({
      recipient_phone: targetPhone,
      recipient_zalo_id: targetZaloId || zalo_id,
      event_type: "reservation",
      reference_code: code,
      send_mode: modeUsed,
      status: isSuccess ? "success" : "failed",
      error_message: isSuccess ? undefined : result?.message || JSON.stringify(result),
      response_data: result,
    });

    return json({ success: isSuccess, details: result });
  }

  // 3. Thông báo Đơn gọi món / Giao hàng mới (Order)
  if (type === "order") {
    const {
      code,
      customer_name,
      customer_phone,
      mode,
      table_id,
      subtotal = 0,
      delivery_fee = 0,
      zalo_id: targetZaloId,
    } = data || {};

    const targetPhone = customer_phone || phone;
    const total = subtotal + delivery_fee;
    let result: any = null;
    let modeUsed = "zns";

    if (targetPhone && settings.zns_template_order && settings.send_mode !== "oa_message") {
      modeUsed = "zns";
      const templateData = {
        customer_name: customer_name || "Quý khách",
        order_code: code || "ORD",
        total_amount: formatVnd(total),
        order_mode: mode === "table" ? `Bàn ${table_id || ""}` : mode === "takeaway" ? "Mang về" : "Giao tận nơi",
        hotline: "0965630828",
      };

      result = await sendZns(token, targetPhone, settings.zns_template_order, templateData, code);

      if (result && (result.error === -216 || result.error === -217)) {
        const fresh = await refreshZaloAccessToken(settings);
        if (fresh) {
          result = await sendZns(fresh, targetPhone, settings.zns_template_order, templateData, code);
        }
      }
    }

    if ((!result || result.error !== 0) && (targetZaloId || zalo_id)) {
      modeUsed = "oa_message";
      const uid = targetZaloId || zalo_id;
      const msg = [
        `🥢 [Miyako Dining] Tiếp nhận đơn hàng thành công!`,
        `Kính chào ${customer_name || "Quý khách"},`,
        `Mã đơn: #${code}`,
        mode === "table" ? `Phục vụ tại: Bàn ${table_id}` : mode === "takeaway" ? "Hình thức: Mang về" : "Hình thức: Giao hàng tận nơi",
        `Tổng thanh toán: ${formatVnd(total)}`,
        `Miyako đang tiến hành chuẩn bị các món ăn cho Quý khách. Xin chân thành cảm ơn!`,
      ].join("\n");

      result = await sendOaTransactionMessage(token, uid, msg);
    }

    const isSuccess = result && (result.error === 0 || result.status === "success");
    await logZaloNotification({
      recipient_phone: targetPhone,
      recipient_zalo_id: targetZaloId || zalo_id,
      event_type: "order",
      reference_code: code,
      send_mode: modeUsed,
      status: isSuccess ? "success" : "failed",
      error_message: isSuccess ? undefined : result?.message || JSON.stringify(result),
      response_data: result,
    });

    return json({ success: isSuccess, details: result });
  }

  return json({ error: "Loại thông báo không hợp lệ (hỗ trợ: test, reservation, order)" }, 400);
});
