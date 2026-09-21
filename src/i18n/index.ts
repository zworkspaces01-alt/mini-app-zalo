/**
 * Ba thứ tiếng: Việt · Anh · Nhật.
 *
 * Chuỗi giao diện nằm trong `vi.ts` / `en.ts` / `ja.ts`. Nội dung thực đơn
 * thì tiếng Việt ở cột thường của CSDL, Anh và Nhật ở cột `i18n` — dùng
 * `useTr()` để đọc, và bao giờ cũng có đường lùi về tiếng Việt.
 *
 * Hàm định dạng ngày giờ và tiền không đoán ngôn ngữ: chỗ gọi truyền vào,
 * để không có trạng thái ẩn nào lệch pha với React.
 */
import { useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useMemo } from "react";

import { systemLanguages } from "@/services/zalo";
import type { Lang, Translatable } from "@/types";

import { en } from "./en";
import { ja } from "./ja";
import { vi, type Dict } from "./vi";

export type { Dict };

export const DICTS: Record<Lang, Dict> = { vi, en, ja };

/** Danh sách hiện trong bảng chọn. Mỗi tên viết bằng chính thứ tiếng đó. */
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "en", label: "English", short: "EN" },
  { code: "ja", label: "日本語", short: "JA" },
];

/**
 * Đoán ngôn ngữ lần đầu mở app.
 *
 * Chỉ chạy một lần; sau đó lấy theo lựa chọn khách đã lưu. Không đoán được
 * thì về tiếng Việt — phần lớn khách của nhà hàng là người Việt, và tiếng
 * Việt là bản gốc nên chắc chắn đủ chữ.
 */
function detectLang(): Lang {
  for (const tag of systemLanguages()) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (base === "vi") return "vi";
    if (base === "ja") return "ja";
    if (base === "en") return "en";
  }
  return "vi";
}

/**
 * Ngôn ngữ đang hiển thị.
 *
 * `getOnInit` đọc localStorage ngay lúc dựng atom thay vì trong effect —
 * nếu không, khách người Nhật sẽ thấy màn hình tiếng Việt nháy lên một
 * nhịp trước khi đổi.
 */
export const langAtom = atomWithStorage<Lang>("miyako.lang", detectLang(), undefined, {
  getOnInit: true,
});

export function useLang(): Lang {
  return useAtomValue(langAtom);
}

/** Từ điển giao diện của ngôn ngữ đang chọn. */
export function useT(): Dict {
  return DICTS[useLang()];
}

/* ════════════════════════════════════════════════════════════
   Nội dung từ CSDL
   ════════════════════════════════════════════════════════════ */

function pick(
  row: Translatable | undefined,
  field: string,
  lang: Lang
): string | string[] | undefined {
  if (lang === "vi" || !row?.i18n) return undefined;
  return row.i18n[lang]?.[field];
}

export interface Tr {
  lang: Lang;
  /** Một trường chữ, ví dụ tên món. Chưa dịch thì trả lại bản tiếng Việt. */
  text(row: Translatable | undefined, field: string, viValue: string): string;
  text(
    row: Translatable | undefined,
    field: string,
    viValue: string | undefined
  ): string | undefined;
  /** Một trường danh sách, ví dụ các phần thịt trong combo. */
  list(
    row: Translatable | undefined,
    field: string,
    viValue: string[] | undefined
  ): string[] | undefined;
}

/**
 * Đọc nội dung theo ngôn ngữ đang chọn.
 *
 * Bản dịch do AI sinh ra nên kiểm tra kiểu ngay tại đây: sai kiểu, rỗng,
 * hoặc lệch số phần tử thì coi như chưa dịch và dùng bản tiếng Việt.
 */
export function useTr(): Tr {
  const lang = useLang();

  return useMemo<Tr>(
    () => ({
      lang,
      text: ((row, field, viValue) => {
        const v = pick(row, field, lang);
        return typeof v === "string" && v.trim() ? v : viValue;
      }) as Tr["text"],
      list: (row, field, viValue) => {
        const v = pick(row, field, lang);
        if (
          Array.isArray(v) &&
          v.length === (viValue?.length ?? -1) &&
          v.every((x) => typeof x === "string" && x.trim())
        ) {
          return v as string[];
        }
        return viValue;
      },
    }),
    [lang]
  );
}
