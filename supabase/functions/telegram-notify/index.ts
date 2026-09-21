/**
 * Supabase Edge Function: Gửi thông báo tức thì qua Telegram Bot
 *
 * Hỗ trợ các sự kiện:
 * - test: Kiểm tra cấu hình bot từ Admin CMS
 * - reservation: Khách đặt bàn mới
 * - order: Khách gọi món tại bàn / mua mang về / giao hàng
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface TelegramSettings {
  bot_token?: string;
  chat_id?: string;
  notify_order?: boolean;
  notify_reservation?: boolean;
  is_active?: boolean;
}

async function loadTelegramSettings(): Promise<TelegramSettings> {
  let token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  let chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  let notifyOrder = true;
  let notifyReservation = true;
  let isActive = true;

  try {
    const res = await svc("/rest/v1/telegram_settings?select=*&id=eq.1");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const row = data[0];
        if (row.bot_token) token = row.bot_token;
        if (row.chat_id) chatId = row.chat_id;
        if (typeof row.notify_order === "boolean") notifyOrder = row.notify_order;
        if (typeof row.notify_reservation === "boolean") notifyReservation = row.notify_reservation;
        if (typeof row.is_active === "boolean") isActive = row.is_active;
      }
    }
  } catch (err) {
    console.error("Lỗi đọc cấu hình telegram_settings:", err);
  }

  return {
    bot_token: token,
    chat_id: chatId,
    notify_order: notifyOrder,
    notify_reservation: notifyReservation,
    is_active: isActive,
  };
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; description?: string }> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
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

  const { type, data, bot_token: customToken, chat_id: customChatId } = body;

  const settings = await loadTelegramSettings();
  const token = customToken || settings.bot_token;
  const chatId = customChatId || settings.chat_id;

  if (!token || !chatId) {
    return json(
      {
        error: "Chưa cấu hình Telegram Bot Token hoặc Chat ID trong Cài đặt nhà hàng",
        configured: false,
      },
      400
    );
  }

  if (type !== "test" && settings.is_active === false) {
    return json({ success: false, reason: "Thông báo Telegram đang tạm tắt" });
  }

  let messageHtml = "";

  // 1. Gửi thử nghiệm kết nối
  if (type === "test") {
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    messageHtml = [
      "🛎 <b>MIYAKO JAPANESE DINING — TEST BOT</b>",
      "━━━━━━━━━━━━━━━━━━",
      "✅ <b>Kết nối thành công!</b>",
      "Kênh Telegram này đã được cấu hình để nhận thông báo Đặt bàn & Gọi món tự động từ Miyako Zalo Mini App.",
      `⏰ <b>Thời gian kiểm tra:</b> ${escapeHtml(now)}`,
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  // 2. Thông báo Đặt bàn mới
  else if (type === "reservation") {
    if (!settings.notify_reservation && !customToken) {
      return json({ success: false, reason: "Thông báo đặt bàn đang tắt" });
    }

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
      deposit_amount,
      deposit_paid,
      dietary,
      note,
    } = data || {};

    const purposeText =
      purpose === "omakase" ? "🍣 Tiệc Bếp Trưởng Omakase" : "🥢 Gọi món Ala Carte";
    const depositText =
      deposit_amount && deposit_amount > 0
        ? `${formatVnd(deposit_amount)} (${deposit_paid ? "✅ Đã thanh toán" : "⏳ Chờ cọc"})`
        : "Không yêu cầu cọc";

    messageHtml = [
      "🍣 <b>MIYAKO — ĐẶT BÀN MỚI!</b>",
      "━━━━━━━━━━━━━━━━━━",
      `🔖 <b>Mã đặt bàn:</b> <code>#${escapeHtml(code || "RES")}</code>`,
      `👤 <b>Khách hàng:</b> ${escapeHtml(guest_name || "Khách")}`,
      `📞 <b>Điện thoại:</b> <code>${escapeHtml(guest_phone || "")}</code>`,
      `👥 <b>Số khách:</b> <b>${guests || 1} người</b>`,
      `📅 <b>Thời gian:</b> <b>${escapeHtml(reserved_time || "")}</b> ngày <b>${escapeHtml(reserved_date || "")}</b>`,
      `🍱 <b>Hình thức:</b> ${purposeText}`,
      omakase_title ? `✨ <b>Set:</b> ${escapeHtml(omakase_title)}` : null,
      seat_labels && seat_labels.length > 0
        ? `🪑 <b>Ghế quầy bar:</b> ${escapeHtml(Array.isArray(seat_labels) ? seat_labels.join(", ") : seat_labels)}`
        : null,
      `💰 <b>Tiền cọc:</b> ${depositText}`,
      dietary ? `⚠️ <b>Kiêng ăn/Dị ứng:</b> ${escapeHtml(dietary)}` : null,
      note ? `📝 <b>Ghi chú:</b> ${escapeHtml(note)}` : null,
      "━━━━━━━━━━━━━━━━━━",
      "⚡ <i>Vui lòng vào CMS kiểm tra và chuẩn bị đón khách!</i>",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // 3. Thông báo Gọi món mới
  else if (type === "order") {
    if (!settings.notify_order && !customToken) {
      return json({ success: false, reason: "Thông báo đơn hàng đang tắt" });
    }

    const {
      code,
      mode,
      table_id,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_time,
      delivery_fee = 0,
      lines = [],
      subtotal = 0,
      payment_method = "cod",
      note,
    } = data || {};

    const modeText =
      mode === "table"
        ? `🍽 Tại bàn: <b>Bàn ${escapeHtml(table_id || "Chưa chọn")}</b>`
        : mode === "takeaway"
        ? "🥡 Mua mang về (Takeaway)"
        : "🛵 Giao hàng tận nơi (Delivery)";

    const payText =
      payment_method === "vietqr"
        ? "Chuyển khoản VietQR"
        : payment_method === "transfer"
        ? "Chuyển khoản ngân hàng"
        : "Tiền mặt khi nhận (COD)";

    const total = subtotal + delivery_fee;

    // Chi tiết danh sách món
    const itemsList = Array.isArray(lines)
      ? lines
          .map((item: any, i: number) => {
            const name = escapeHtml(item.dishName || item.name || "Món ăn");
            const qty = item.qty || 1;
            const price = formatVnd((item.price || 0) * qty);
            const variant = item.variantName ? ` (${escapeHtml(item.variantName)})` : "";
            const itemNote = item.note ? ` - <i>${escapeHtml(item.note)}</i>` : "";
            return `  ${i + 1}. <b>${name}${variant}</b> x${qty} → ${price}${itemNote}`;
          })
          .join("\n")
      : "  (Chưa có danh sách món)";

    messageHtml = [
      "🥢 <b>MIYAKO — ĐƠN GỌI MÓN MỚI!</b>",
      "━━━━━━━━━━━━━━━━━━",
      `🔖 <b>Mã đơn hàng:</b> <code>#${escapeHtml(code || "ORD")}</code>`,
      `🛎 <b>Hình thức:</b> ${modeText}`,
      customer_name ? `👤 <b>Khách hàng:</b> ${escapeHtml(customer_name)}` : null,
      customer_phone ? `📞 <b>Điện thoại:</b> <code>${escapeHtml(customer_phone)}</code>` : null,
      delivery_address ? `📍 <b>Địa chỉ:</b> ${escapeHtml(delivery_address)}` : null,
      delivery_time ? `⏰ <b>Thời gian nhận:</b> ${escapeHtml(delivery_time)}` : null,
      "",
      "📋 <b>DANH SÁCH MÓN:</b>",
      itemsList,
      "",
      delivery_fee > 0 ? `🚚 <b>Phí giao hàng:</b> ${formatVnd(delivery_fee)}` : null,
      `💰 <b>TỔNG CỘNG:</b> <b>${formatVnd(total)}</b>`,
      `💳 <b>Thanh toán:</b> ${payText}`,
      note ? `📝 <b>Ghi chú đơn:</b> ${escapeHtml(note)}` : null,
      "━━━━━━━━━━━━━━━━━━",
      "⚡ <i>Đơn đã được chuyển đến màn hình Bếp và Thu ngân!</i>",
    ]
      .filter(Boolean)
      .join("\n");
  }

  else {
    return json({ error: "Loại thông báo không hợp lệ (hỗ trợ: test, reservation, order)" }, 400);
  }

  try {
    const tgRes = await sendTelegramMessage(token, chatId, messageHtml);
    if (!tgRes.ok) {
      return json(
        {
          error: `Telegram Bot API báo lỗi: ${tgRes.description || "Không thể gửi tin nhắn"}`,
          details: tgRes,
        },
        502
      );
    }
    return json({ success: true, message: "Đã gửi thông báo Telegram thành công" });
  } catch (err: any) {
    return json({ error: "Lỗi kết nối tới Telegram API: " + err.message }, 500);
  }
});
