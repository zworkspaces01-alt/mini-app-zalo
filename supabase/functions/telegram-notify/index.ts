/**
 * Supabase Edge Function: Gửi thông báo tức thì qua Telegram Bot
 * Hỗ trợ phân luồng theo từng Topic (Forum Threads) trong Telegram Supergroup:
 * - test: Kiểm tra cấu hình bot từ Admin CMS
 * - reservation: Khách đặt bàn (phân biệt Đặt bàn thường & Đặt bàn Omakase)
 * - order: Khách gọi món tại bàn / mua mang về / giao hàng
 * - loyalty: Khách tích điểm đơn hàng / đổi quà voucher / hội viên
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
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface TelegramSettings {
  bot_token?: string;
  chat_id?: string;
  notify_order?: boolean;
  notify_reservation?: boolean;
  notify_loyalty?: boolean;
  topic_order?: string;
  topic_reservation?: string;
  topic_omakase?: string;
  topic_loyalty?: string;
  is_active?: boolean;
}

async function loadTelegramSettings(): Promise<TelegramSettings> {
  let token = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  let chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";
  let notifyOrder = true;
  let notifyReservation = true;
  let notifyLoyalty = true;
  let topicOrder = "";
  let topicReservation = "";
  let topicOmakase = "";
  let topicLoyalty = "";
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
        if (typeof row.notify_loyalty === "boolean") notifyLoyalty = row.notify_loyalty;
        if (row.topic_order) topicOrder = String(row.topic_order).trim();
        if (row.topic_reservation) topicReservation = String(row.topic_reservation).trim();
        if (row.topic_omakase) topicOmakase = String(row.topic_omakase).trim();
        if (row.topic_loyalty) topicLoyalty = String(row.topic_loyalty).trim();
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
    notify_loyalty: notifyLoyalty,
    topic_order: topicOrder,
    topic_reservation: topicReservation,
    topic_omakase: topicOmakase,
    topic_loyalty: topicLoyalty,
    is_active: isActive,
  };
}

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  threadId?: string | number | null
): Promise<{ ok: boolean; description?: string }> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  const parsedThreadId =
    threadId !== undefined && threadId !== null && String(threadId).trim() !== ""
      ? parseInt(String(threadId).trim(), 10)
      : null;

  if (parsedThreadId !== null && !isNaN(parsedThreadId) && parsedThreadId > 0) {
    body.message_thread_id = parsedThreadId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

  const {
    type,
    data,
    bot_token: customToken,
    chat_id: customChatId,
    message_thread_id: customThreadId,
    topic_id: aliasThreadId,
  } = body;

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
  let targetThreadId: string | number | null = customThreadId ?? aliasThreadId ?? null;

  // 1. Gửi thử nghiệm kết nối
  if (type === "test") {
    const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const topicDesc = targetThreadId ? ` (Topic ID: <code>${targetThreadId}</code>)` : " (Topic mặc định / General)";
    messageHtml = [
      "🛎 <b>MIYAKO JAPANESE DINING — TEST BOT</b>",
      "━━━━━━━━━━━━━━━━━━",
      "✅ <b>Kết nối thành công!</b>",
      `Kênh Telegram này đã nhận được thông báo kiểm tra tự động${topicDesc}.`,
      `⏰ <b>Thời gian:</b> ${escapeHtml(now)}`,
      "━━━━━━━━━━━━━━━━━━",
    ].join("\n");
  }

  // 2. Thông báo Đặt bàn mới (Phân luồng: Đặt bàn thường hoặc Đặt bàn Omakase)
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

    const isOmakase = purpose === "omakase" || !!omakase_title;

    // Định tuyến Topic: Ưu tiên topic Omakase nếu là tiệc Omakase, còn lại dùng topic Đặt bàn thường
    if (!targetThreadId) {
      if (isOmakase && settings.topic_omakase) {
        targetThreadId = settings.topic_omakase;
      } else {
        targetThreadId = settings.topic_reservation || settings.topic_omakase || null;
      }
    }

    const purposeText = isOmakase
      ? "🍣 <b>Tiệc Bếp Trưởng Omakase</b>"
      : "🥢 <b>Gọi món Ala Carte / Bàn thường</b>";

    const depositText =
      deposit_amount && deposit_amount > 0
        ? `${formatVnd(deposit_amount)} (${deposit_paid ? "✅ Đã thanh toán" : "⏳ Chờ cọc"})`
        : "Không yêu cầu cọc";

    const titlePrefix = isOmakase
      ? "🍣 <b>MIYAKO — ĐẶT BÀN OMAKASE MỚI!</b>"
      : "🪑 <b>MIYAKO — ĐẶT BÀN THƯỜNG MỚI!</b>";

    messageHtml = [
      titlePrefix,
      "━━━━━━━━━━━━━━━━━━",
      `🔖 <b>Mã đặt bàn:</b> <code>#${escapeHtml(code || "RES")}</code>`,
      `👤 <b>Khách hàng:</b> ${escapeHtml(guest_name || "Khách")}`,
      `📞 <b>Điện thoại:</b> <code>${escapeHtml(guest_phone || "")}</code>`,
      `👥 <b>Số khách:</b> <b>${guests || 1} người</b>`,
      `📅 <b>Thời gian:</b> <b>${escapeHtml(reserved_time || "")}</b> ngày <b>${escapeHtml(reserved_date || "")}</b>`,
      `🍱 <b>Hình thức:</b> ${purposeText}`,
      omakase_title ? `✨ <b>Set Menu:</b> ${escapeHtml(omakase_title)}` : null,
      seat_labels && seat_labels.length > 0
        ? `🪑 <b>Ghế quầy bar:</b> ${escapeHtml(Array.isArray(seat_labels) ? seat_labels.join(", ") : seat_labels)}`
        : null,
      `💰 <b>Tiền cọc:</b> ${depositText}`,
      dietary ? `⚠️ <b>Kiêng ăn/Dị ứng:</b> ${escapeHtml(dietary)}` : null,
      note ? `📝 <b>Ghi chú:</b> ${escapeHtml(note)}` : null,
      "━━━━━━━━━━━━━━━━━━",
      "⚡ <i>Vui lòng vào CMS kiểm tra và chuẩn bị đón tiếp quý khách!</i>",
    ]
      .filter(Boolean)
      .join("\n");
  }

  // 3. Thông báo Gọi món mới
  else if (type === "order") {
    if (!settings.notify_order && !customToken) {
      return json({ success: false, reason: "Thông báo đơn hàng đang tắt" });
    }

    if (!targetThreadId) {
      targetThreadId = settings.topic_order || null;
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
      mode === "table" || mode === "dine-in"
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

  // 4. Thông báo Khách tích điểm & Hội viên & Đổi quà
  else if (type === "loyalty") {
    if (!settings.notify_loyalty && !customToken) {
      return json({ success: false, reason: "Thông báo tích điểm đang tắt" });
    }

    if (!targetThreadId) {
      targetThreadId = settings.topic_loyalty || null;
    }

    const {
      action, // 'redeem' | 'earn' | 'tier_upgrade'
      customer_name,
      customer_phone,
      tier_name,
      order_code,
      points_change,
      current_points,
      gift_title,
      voucher_code,
      note,
    } = data || {};

    let actionTitle = "👑 <b>MIYAKO — HOẠT ĐỘNG TÍCH ĐIỂM & HỘI VIÊN</b>";
    let detailLines: string[] = [];

    if (action === "redeem") {
      actionTitle = "🎁 <b>MIYAKO — KHÁCH ĐỔI QUÀ / VOUCHER!</b>";
      detailLines = [
        `👤 <b>Hội viên:</b> ${escapeHtml(customer_name || "Khách hàng")} (${escapeHtml(tier_name || "Thành viên")})`,
        customer_phone ? `📞 <b>Điện thoại:</b> <code>${escapeHtml(customer_phone)}</code>` : "",
        gift_title ? `🎁 <b>Phần quà:</b> <b>${escapeHtml(gift_title)}</b>` : "",
        voucher_code ? `🎟 <b>Mã voucher:</b> <code>${escapeHtml(voucher_code)}</code>` : "",
        points_change ? `🔻 <b>Điểm trừ:</b> <b>-${Math.abs(points_change)} điểm</b>` : "",
        current_points !== undefined ? `💰 <b>Điểm còn lại:</b> <b>${current_points} điểm</b>` : "",
      ];
    } else if (action === "earn") {
      actionTitle = "⭐ <b>MIYAKO — TÍCH ĐIỂM ĐƠN HÀNG THÀNH CÔNG!</b>";
      detailLines = [
        `👤 <b>Hội viên:</b> ${escapeHtml(customer_name || "Khách hàng")} (${escapeHtml(tier_name || "Thành viên")})`,
        customer_phone ? `📞 <b>Điện thoại:</b> <code>${escapeHtml(customer_phone)}</code>` : "",
        order_code ? `🔖 <b>Đơn hàng:</b> <code>#${escapeHtml(order_code)}</code>` : "",
        points_change ? `✨ <b>Điểm cộng:</b> <b>+${points_change} điểm</b>` : "",
        current_points !== undefined ? `💰 <b>Tổng điểm hiện có:</b> <b>${current_points} điểm</b>` : "",
      ];
    } else {
      detailLines = [
        `👤 <b>Hội viên:</b> ${escapeHtml(customer_name || "Khách hàng")} (${escapeHtml(tier_name || "Thành viên")})`,
        customer_phone ? `📞 <b>Điện thoại:</b> <code>${escapeHtml(customer_phone)}</code>` : "",
        note ? `📝 <b>Nội dung:</b> ${escapeHtml(note)}` : "",
        current_points !== undefined ? `💰 <b>Tổng điểm:</b> <b>${current_points} điểm</b>` : "",
      ];
    }

    messageHtml = [
      actionTitle,
      "━━━━━━━━━━━━━━━━━━",
      ...detailLines.filter(Boolean),
      note && action !== "custom" ? `📝 <b>Ghi chú:</b> ${escapeHtml(note)}` : null,
      "━━━━━━━━━━━━━━━━━━",
      "⚡ <i>Hệ thống chăm sóc khách hàng tự động Miyako VIP Club.</i>",
    ]
      .filter(Boolean)
      .join("\n");
  }

  else {
    return json({ error: "Loại thông báo không hợp lệ (hỗ trợ: test, reservation, order, loyalty)" }, 400);
  }

  try {
    const tgRes = await sendTelegramMessage(token, chatId, messageHtml, targetThreadId);
    if (!tgRes.ok) {
      return json(
        {
          error: `Telegram Bot API báo lỗi: ${tgRes.description || "Không thể gửi tin nhắn"}`,
          details: tgRes,
          targetThreadId,
        },
        502
      );
    }
    return json({
      success: true,
      message: "Đã gửi thông báo Telegram thành công",
      topic_id: targetThreadId || "default",
    });
  } catch (err: any) {
    return json({ error: "Lỗi kết nối tới Telegram API: " + err.message }, 500);
  }
});
