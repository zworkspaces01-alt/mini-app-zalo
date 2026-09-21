import { supabase } from "./supabase";

export interface TelegramSettings {
  bot_token: string;
  chat_id: string;
  notify_order: boolean;
  notify_reservation: boolean;
  is_active: boolean;
  updated_at?: string;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchTelegramSettings(): Promise<TelegramSettings> {
  // Thử qua RPC get_telegram_settings trước
  try {
    const { data, error } = await (supabase.rpc as any)("get_telegram_settings");
    if (!error && data) {
      return data as unknown as TelegramSettings;
    }
  } catch {
    // fallback
  }

  // Fallback đọc bảng telegram_settings trực tiếp
  const { data, error } = await supabase
    .from("telegram_settings" as any)
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return {
      bot_token: "",
      chat_id: "",
      notify_order: true,
      notify_reservation: true,
      is_active: true,
    };
  }

  const row = data as any;
  return {
    bot_token: row.bot_token || "",
    chat_id: row.chat_id || "",
    notify_order: row.notify_order ?? true,
    notify_reservation: row.notify_reservation ?? true,
    is_active: row.is_active ?? true,
    updated_at: row.updated_at,
  };
}

export async function saveTelegramSettings(
  settings: TelegramSettings
): Promise<TelegramSettings> {
  // Thử qua RPC update_telegram_settings
  try {
    const { data, error } = await (supabase.rpc as any)("update_telegram_settings", {
      p_bot_token: settings.bot_token.trim(),
      p_chat_id: settings.chat_id.trim(),
      p_notify_order: settings.notify_order,
      p_notify_reservation: settings.notify_reservation,
      p_is_active: settings.is_active,
    });
    if (!error && data) {
      return data as unknown as TelegramSettings;
    }
  } catch {
    // fallback
  }

  // Fallback upsert trực tiếp
  const { data, error } = await supabase
    .from("telegram_settings" as any)
    .upsert({
      id: 1,
      bot_token: settings.bot_token.trim(),
      chat_id: settings.chat_id.trim(),
      notify_order: settings.notify_order,
      notify_reservation: settings.notify_reservation,
      is_active: settings.is_active,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  const row = data as any;
  return {
    bot_token: row.bot_token || "",
    chat_id: row.chat_id || "",
    notify_order: row.notify_order ?? true,
    notify_reservation: row.notify_reservation ?? true,
    is_active: row.is_active ?? true,
    updated_at: row.updated_at,
  };
}

export async function testTelegramBot(
  token: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  if (!token.trim() || !chatId.trim()) {
    return { success: false, error: "Vui lòng nhập đầy đủ Bot Token và Chat ID" };
  }

  if (!url || !anonKey) {
    return { success: false, error: "Thiếu cấu hình VITE_SUPABASE_URL" };
  }

  try {
    const res = await fetch(`${url}/functions/v1/telegram-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type: "test",
        bot_token: token.trim(),
        chat_id: chatId.trim(),
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return { success: false, error: body.error || "Gửi tin nhắn thử nghiệm thất bại" };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi kết nối tới Edge Function" };
  }
}
