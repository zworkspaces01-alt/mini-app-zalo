import { createClient } from "@supabase/supabase-js";

import type { Dict } from "@/i18n/vi";
import type { Lang } from "@/types";
import type { Database } from "@/types/db";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Client dùng chung cho mini app.
 *
 * Chưa cấu hình thì `supabase` là null: app vẫn chạy được bằng dữ liệu đóng
 * gói sẵn trong `src/data/`, chỉ không đặt bàn và gọi món được. Nhờ vậy khi
 * mạng hỏng hoặc backend chưa dựng xong, khách vẫn xem được thực đơn.
 */
export const supabase =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const hasBackend = () => supabase !== null;

/**
 * Các hàm RPC trong `supabase/migrations/` báo lỗi bằng tiếng Việt — hợp lý,
 * vì cùng những câu đó còn hiện trong CMS và trong log cho nhân viên đọc.
 *
 * Khách đang xem tiếng Anh hay tiếng Nhật thì không đọc được. Những lỗi khách
 * thật sự có thể gặp được dịch ở bảng dưới; lỗi lạ thì lùi về câu chung của
 * màn hình — thà nói chung chung còn hơn ném ra một câu không đọc nổi.
 *
 * Bảng này khớp theo nội dung câu báo lỗi, nên sửa chữ trong migration thì
 * phải sửa cả ở đây.
 */
const SERVER_ERRORS: { match: RegExp; pick: (t: Dict) => string }[] = [
  { match: /đặt trước ít nhất/i, pick: (t) => t.errors.leadTime },
  { match: /đã qua/i, pick: (t) => t.errors.pastTime },
  { match: /không còn phục vụ|không tìm thấy món/i, pick: (t) => t.errors.dishUnavailable },
  { match: /phải chọn phần|phần đã chọn/i, pick: (t) => t.errors.dishVariant },
  { match: /không tìm thấy (đặt bàn|lượt đặt bàn)/i, pick: (t) => t.errors.reservationNotFound },
  { match: /thiếu tên hoặc số điện thoại/i, pick: (t) => t.errors.missingContact },
  { match: /số khách không hợp lệ/i, pick: (t) => t.errors.invalidGuests },
  { match: /không có món nào|ít nhất một món/i, pick: (t) => t.errors.emptyOrder },
  { match: /chưa kết nối được với nhà hàng/i, pick: (t) => t.errors.noBackend },
];

/**
 * Câu báo lỗi hiển thị cho khách.
 *
 * `fallback` là câu của riêng màn hình đang mở ("Chưa gửi được đơn…"), đã
 * dịch sẵn — dùng làm lưới an toàn cho mọi lỗi không nhận ra.
 */
export function backendError(
  e: unknown,
  fallback: string,
  i18n: { lang: Lang; t: Dict }
): string {
  const msg = (e as { message?: string })?.message;
  if (!msg) return fallback;

  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) {
    return i18n.t.errors.offline;
  }

  // Tiếng Việt là bản gốc của câu báo lỗi: hiện nguyên văn, đầy đủ nhất.
  if (i18n.lang === "vi") return msg;

  const hit = SERVER_ERRORS.find((r) => r.match.test(msg));
  return hit ? hit.pick(i18n.t) : fallback;
}
