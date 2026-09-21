import { supabase } from "./supabase";

export interface ZaloOASettings {
  oa_id: string;
  app_id: string;
  secret_key: string;
  access_token: string;
  refresh_token: string;
  token_expires_at?: string | null;
  zns_template_reservation: string;
  zns_template_order: string;
  send_mode: "zns" | "oa_message" | "both";
  is_active: boolean;
  updated_at?: string;
}

export interface ZaloNotificationLog {
  id: string;
  recipient_phone: string | null;
  recipient_zalo_id: string | null;
  event_type: string;
  reference_code: string | null;
  send_mode: string;
  status: "success" | "failed";
  error_message: string | null;
  created_at: string;
}

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchZaloOASettings(): Promise<ZaloOASettings> {
  try {
    const { data, error } = await (supabase.rpc as any)("get_zalo_oa_settings");
    if (!error && data) {
      return data as unknown as ZaloOASettings;
    }
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from("zalo_oa_settings" as any)
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return {
      oa_id: "",
      app_id: "",
      secret_key: "",
      access_token: "",
      refresh_token: "",
      zns_template_reservation: "",
      zns_template_order: "",
      send_mode: "zns",
      is_active: true,
    };
  }

  const row = data as any;
  return {
    oa_id: row.oa_id || "",
    app_id: row.app_id || "",
    secret_key: row.secret_key || "",
    access_token: row.access_token || "",
    refresh_token: row.refresh_token || "",
    token_expires_at: row.token_expires_at,
    zns_template_reservation: row.zns_template_reservation || "",
    zns_template_order: row.zns_template_order || "",
    send_mode: row.send_mode || "zns",
    is_active: row.is_active ?? true,
    updated_at: row.updated_at,
  };
}

export async function saveZaloOASettings(
  settings: ZaloOASettings
): Promise<ZaloOASettings> {
  try {
    const { data, error } = await (supabase.rpc as any)("update_zalo_oa_settings", {
      p_oa_id: settings.oa_id.trim(),
      p_app_id: settings.app_id.trim(),
      p_secret_key: settings.secret_key.trim(),
      p_access_token: settings.access_token.trim(),
      p_refresh_token: settings.refresh_token.trim(),
      p_zns_template_reservation: settings.zns_template_reservation.trim(),
      p_zns_template_order: settings.zns_template_order.trim(),
      p_send_mode: settings.send_mode,
      p_is_active: settings.is_active,
    });
    if (!error && data) {
      return data as unknown as ZaloOASettings;
    }
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from("zalo_oa_settings" as any)
    .upsert({
      id: 1,
      oa_id: settings.oa_id.trim(),
      app_id: settings.app_id.trim(),
      secret_key: settings.secret_key.trim(),
      access_token: settings.access_token.trim(),
      refresh_token: settings.refresh_token.trim(),
      zns_template_reservation: settings.zns_template_reservation.trim(),
      zns_template_order: settings.zns_template_order.trim(),
      send_mode: settings.send_mode,
      is_active: settings.is_active,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  const row = data as any;
  return {
    oa_id: row.oa_id || "",
    app_id: row.app_id || "",
    secret_key: row.secret_key || "",
    access_token: row.access_token || "",
    refresh_token: row.refresh_token || "",
    token_expires_at: row.token_expires_at,
    zns_template_reservation: row.zns_template_reservation || "",
    zns_template_order: row.zns_template_order || "",
    send_mode: row.send_mode || "zns",
    is_active: row.is_active ?? true,
    updated_at: row.updated_at,
  };
}

export async function testZaloOAMessage(input: {
  phone?: string;
  zalo_id?: string;
}): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!input.phone?.trim() && !input.zalo_id?.trim()) {
    return { success: false, error: "Vui lòng nhập Số điện thoại hoặc Zalo User ID để gửi thử" };
  }

  if (!url || !anonKey) {
    return { success: false, error: "Thiếu cấu hình VITE_SUPABASE_URL" };
  }

  try {
    const res = await fetch(`${url}/functions/v1/zalo-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type: "test",
        phone: input.phone?.trim(),
        zalo_id: input.zalo_id?.trim(),
      }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      return { success: false, error: body.error || "Gửi tin nhắn thử nghiệm thất bại", details: body };
    }
    return { success: true, details: body.details };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi kết nối tới Edge Function" };
  }
}

export async function fetchZaloNotificationLogs(): Promise<ZaloNotificationLog[]> {
  const { data, error } = await supabase
    .from("zalo_notification_logs" as any)
    .select("id, recipient_phone, recipient_zalo_id, event_type, reference_code, send_mode, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as unknown as ZaloNotificationLog[];
}
