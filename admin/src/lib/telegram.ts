import { supabase } from "./supabase";

export interface TelegramSettings {
  bot_token: string;
  chat_id: string;
  notify_order: boolean;
  notify_reservation: boolean;
  notify_loyalty: boolean;
  topic_order: string;
  topic_reservation: string;
  topic_omakase: string;
  topic_loyalty: string;
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
      return {
        bot_token: data.bot_token || "",
        chat_id: data.chat_id || "",
        notify_order: data.notify_order ?? true,
        notify_reservation: data.notify_reservation ?? true,
        notify_loyalty: data.notify_loyalty ?? true,
        topic_order: data.topic_order || "",
        topic_reservation: data.topic_reservation || "",
        topic_omakase: data.topic_omakase || "",
        topic_loyalty: data.topic_loyalty || "",
        is_active: data.is_active ?? true,
        updated_at: data.updated_at,
      };
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
      notify_loyalty: true,
      topic_order: "",
      topic_reservation: "",
      topic_omakase: "",
      topic_loyalty: "",
      is_active: true,
    };
  }

  const row = data as any;
  return {
    bot_token: row.bot_token || "",
    chat_id: row.chat_id || "",
    notify_order: row.notify_order ?? true,
    notify_reservation: row.notify_reservation ?? true,
    notify_loyalty: row.notify_loyalty ?? true,
    topic_order: row.topic_order || "",
    topic_reservation: row.topic_reservation || "",
    topic_omakase: row.topic_omakase || "",
    topic_loyalty: row.topic_loyalty || "",
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
      p_notify_loyalty: settings.notify_loyalty,
      p_topic_order: (settings.topic_order || "").trim(),
      p_topic_reservation: (settings.topic_reservation || "").trim(),
      p_topic_omakase: (settings.topic_omakase || "").trim(),
      p_topic_loyalty: (settings.topic_loyalty || "").trim(),
    });
    if (!error && data) {
      return {
        bot_token: data.bot_token || "",
        chat_id: data.chat_id || "",
        notify_order: data.notify_order ?? true,
        notify_reservation: data.notify_reservation ?? true,
        notify_loyalty: data.notify_loyalty ?? true,
        topic_order: data.topic_order || "",
        topic_reservation: data.topic_reservation || "",
        topic_omakase: data.topic_omakase || "",
        topic_loyalty: data.topic_loyalty || "",
        is_active: data.is_active ?? true,
        updated_at: data.updated_at,
      };
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
      notify_loyalty: settings.notify_loyalty,
      topic_order: (settings.topic_order || "").trim(),
      topic_reservation: (settings.topic_reservation || "").trim(),
      topic_omakase: (settings.topic_omakase || "").trim(),
      topic_loyalty: (settings.topic_loyalty || "").trim(),
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
    notify_loyalty: row.notify_loyalty ?? true,
    topic_order: row.topic_order || "",
    topic_reservation: row.topic_reservation || "",
    topic_omakase: row.topic_omakase || "",
    topic_loyalty: row.topic_loyalty || "",
    is_active: row.is_active ?? true,
    updated_at: row.updated_at,
  };
}

export async function testTelegramBot(
  token: string,
  chatId: string,
  topicId?: string
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
        topic_id: topicId?.trim() || undefined,
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
