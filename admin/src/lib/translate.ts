import { supabase } from "./supabase";

/**
 * Gọi Edge Function `translate-content` — nơi giữ khoá Groq/Gemini.
 *
 * Khoá AI không bao giờ nằm trong mã chạy ở trình duyệt, nên mọi lần dịch
 * đều đi qua máy chủ. Hàm ở đó cũng kiểm tra người gọi có phải quản lý.
 */

/** Các bảng có nội dung dịch được — trùng với SPECS trong Edge Function. */
export const ENTITIES = [
  "categories",
  "dishes",
  "dish_variants",
  "omakase_sets",
  "omakase_courses",
  "restaurant_settings",
  "banners",
  "content_items",
  "loyalty_tiers",
  "loyalty_quests",
  "reward_gifts",
] as const;

export type Entity = (typeof ENTITIES)[number];

export const ENTITY_LABEL: Record<Entity, string> = {
  categories: "Nhóm món",
  dishes: "Món",
  dish_variants: "Phần của món",
  omakase_sets: "Suất omakase",
  omakase_courses: "Trình tự món",
  restaurant_settings: "Cấu hình nhà hàng",
  banners: "Banner",
  content_items: "Nội dung trang",
  loyalty_tiers: "Hạng thành viên",
  loyalty_quests: "Nhiệm vụ tích điểm",
  reward_gifts: "Quà đổi điểm",
};

export interface TranslateResult {
  /** Số dòng đã ghi được bản dịch trong lần gọi này. */
  translated: number;
  /** Số dòng còn lại chờ lượt sau — bấm tiếp hoặc để vòng lặp chạy nốt. */
  remaining: number;
  providers: string[];
  failures?: string[];
}

export interface TranslateStatus {
  providers: string[];
  total: number;
  pending: number;
  by: Record<string, { total: number; pending: number }>;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("translate-content", {
    body,
  });

  if (error) {
    // Nội dung lỗi nằm trong thân phản hồi, không nằm ở error.message.
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
        ? "Không gọi được máy chủ. Kiểm tra Edge Function translate-content đã được triển khai chưa."
        : error.message
    );
  }

  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const translationStatus = () =>
  call<TranslateStatus>({ action: "status" });

/**
 * Dịch một lượt.
 *
 * Mỗi lần gọi chỉ xử lý một số dòng rồi trả về `remaining`, để không chạm
 * trần thời gian của Edge Function. Bên gọi lặp tới khi `remaining` = 0.
 */
export const translate = (input: {
  entities?: Entity[];
  ids?: string[];
  /** true = dịch lại cả những dòng đã có bản dịch. */
  force?: boolean;
  /**
   * Mốc bắt đầu của lượt "dịch lại toàn bộ" (ISO). Bắt buộc khi `force`,
   * nếu không mỗi lượt gọi lại dịch đúng những dòng đầu bảng.
   */
  since?: string;
  limit?: number;
}) => call<TranslateResult>({ action: "translate", ...input });

/**
 * Dịch cho tới khi hết.
 *
 * `onProgress` nhận tổng số dòng đã dịch để hiện ra màn hình. Dừng khi hết
 * việc, hoặc khi một lượt không dịch thêm được dòng nào — tránh quay vòng
 * mãi khi nhà cung cấp AI đang hỏng.
 */
export async function translateAll(
  input: { entities?: Entity[]; ids?: string[]; force?: boolean },
  onProgress?: (done: number, remaining: number) => void
): Promise<TranslateResult> {
  let done = 0;
  let left = 0;
  const failures: string[] = [];
  let providers: string[] = [];

  // Một mốc duy nhất cho cả vòng lặp: dòng nào đã dịch sau mốc này thì thôi.
  const since = new Date().toISOString();

  for (let round = 0; round < 40; round++) {
    const res = await translate({ ...input, since });
    done += res.translated;
    left = res.remaining;
    providers = res.providers;
    if (res.failures) failures.push(...res.failures);
    onProgress?.(done, res.remaining);

    if (res.remaining === 0) break;
    // Còn việc nhưng không nhích được dòng nào: dừng, để lỗi nói lên chuyện.
    if (res.translated === 0) break;
  }

  return {
    translated: done,
    remaining: left,
    providers,
    ...(failures.length ? { failures: failures.slice(0, 10) } : {}),
  };
}
