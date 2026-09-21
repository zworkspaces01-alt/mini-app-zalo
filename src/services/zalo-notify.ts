/**
 * Gửi tin nhắn xác nhận Zalo OA / ZNS cho khách hàng qua Supabase Edge Function.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ZaloNotifyPayload {
  type: "reservation" | "order" | "test";
  data?: any;
  phone?: string;
  zalo_id?: string;
}

export async function notifyCustomerZalo(
  payload: ZaloNotifyPayload
): Promise<{ success: boolean; error?: string }> {
  if (!url || !anonKey) {
    return { success: false, error: "Chưa cấu hình Supabase" };
  }

  try {
    const res = await fetch(`${url}/functions/v1/zalo-notify`, {
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
      return { success: false, error: data?.error || "Lỗi gửi tin nhắn Zalo OA" };
    }
    return { success: true };
  } catch (err: any) {
    // Không làm gián đoạn tiến trình người dùng nếu Zalo API bận
    console.warn("notifyCustomerZalo:", err);
    return { success: false, error: err.message };
  }
}
