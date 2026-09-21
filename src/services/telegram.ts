/**
 * Gửi thông báo sự kiện (Đặt bàn, Gọi món, Tích điểm) đến Telegram Bot qua Supabase Edge Function.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface TelegramNotifyPayload {
  type: "reservation" | "order" | "loyalty" | "test";
  data?: any;
  bot_token?: string;
  chat_id?: string;
  topic_id?: string | number;
  message_thread_id?: string | number;
}

export async function notifyTelegram(
  payload: TelegramNotifyPayload
): Promise<{ success: boolean; error?: string }> {
  if (!url || !anonKey) {
    return { success: false, error: "Chưa cấu hình Supabase" };
  }

  try {
    const res = await fetch(`${url}/functions/v1/telegram-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || "Lỗi gửi thông báo Telegram" };
    }
    return { success: true };
  } catch (err: any) {
    // Không làm gián đoạn luồng người dùng nếu Telegram lỗi mạng
    console.warn("notifyTelegram:", err);
    return { success: false, error: err.message };
  }
}
