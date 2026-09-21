import { supabase } from "./supabase";

/**
 * Gọi Edge Function `staff-admin`.
 *
 * Tạo, đổi mật khẩu và xoá tài khoản cần service_role key nên phải chạy trên
 * máy chủ. Sửa tên / vai trò / trạng thái thì ghi thẳng vào bảng qua RLS.
 */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("staff-admin", { body });

  if (error) {
    // Lỗi có nội dung nằm trong phần thân phản hồi, không nằm ở error.message.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = await ctx.json();
        if (payload?.error) throw new Error(payload.error);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error(
      /Failed to send|fetch/i.test(error.message)
        ? "Không gọi được máy chủ. Kiểm tra Edge Function đã được triển khai chưa."
        : error.message
    );
  }

  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const createStaff = (input: {
  email: string;
  password: string;
  full_name: string;
  role: string;
}) => call<{ user_id: string }>({ action: "create", ...input });

export const resetStaffPassword = (user_id: string, password: string) =>
  call<{ ok: true }>({ action: "reset-password", user_id, password });

export const deleteStaff = (user_id: string) =>
  call<{ ok: true }>({ action: "delete", user_id });
