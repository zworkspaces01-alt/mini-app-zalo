import type { Lang } from "@/types";

/**
 * Định dạng số, ngày giờ theo ngôn ngữ đang hiển thị.
 *
 * Ngôn ngữ luôn được truyền vào, không đọc từ biến toàn cục: React chỉ vẽ
 * lại khi state đổi, còn biến toàn cục đổi âm thầm thì màn hình giữ nguyên
 * số cũ. Chỗ gọi lấy `lang` từ `useLang()`.
 */

/** Mã locale cho Intl. Để ngay tại đây để `utils` không phụ thuộc `i18n`. */
const LOCALE: Record<Lang, string> = {
  vi: "vi-VN",
  en: "en-GB",
  ja: "ja-JP",
};

/** 199000 → "199.000đ" (vi) · "199,000₫" (en/ja) */
export function vnd(amount: number, lang: Lang = "vi"): string {
  const n = new Intl.NumberFormat(LOCALE[lang]).format(Math.round(amount));
  // "đ" là cách viết quen thuộc trong nước; "₫" là ký hiệu quốc tế.
  return lang === "vi" ? `${n}đ` : `${n}₫`;
}

/** 1250 → "1.250" */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

/** 199000 → "199" — kiểu ghi giá trên menu giấy (đơn vị nghìn đồng). */
export function menuPrice(amount: number, lang: Lang = "vi"): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(Math.round(amount / 1000));
}

/* ─────────────── Thứ trong tuần ─────────────── */

const WEEKDAYS: Record<Lang, { long: string[]; short: string[] }> = {
  vi: {
    long: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"],
    short: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  },
  en: {
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  ja: {
    long: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
    short: ["日", "月", "火", "水", "木", "金", "土"],
  },
};

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function weekdayName(d: Date, lang: Lang = "vi", short = false): string {
  const set = WEEKDAYS[lang];
  return (short ? set.short : set.long)[d.getDay()];
}

/* ─────────────── Ngày ─────────────── */

/** Date → "2026-09-20" theo giờ địa phương (không dùng toISOString để tránh lệch múi giờ). */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Ghép ngày "YYYY-MM-DD" với giờ "HH:mm" thành Date giờ máy.
 *
 * Tự dựng thay vì `new Date("...T...")` vì WebView cũ (iOS 9) hiểu chuỗi
 * ISO không có múi giờ theo UTC, lệch mất 7 tiếng.
 */
export function atLocalTime(iso: string, hhmm: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const [hh, mi] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mi, 0, 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "2026-09-20" → "Thứ bảy, 20/09" · "Sat, 20 Sep" · "9月20日(土)"
 *
 * Mỗi thứ tiếng đặt thứ, ngày và tháng theo một trật tự khác nhau nên viết
 * tay từng bản, không ghép chung một khuôn.
 */
export function formatDateLabel(iso: string, lang: Lang = "vi"): string {
  const d = fromISODate(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;

  if (lang === "ja") {
    return `${month}月${day}日(${weekdayName(d, "ja", true)})`;
  }
  if (lang === "en") {
    return `${weekdayName(d, "en", true)}, ${day} ${MONTHS_EN[d.getMonth()]}`;
  }
  return `${weekdayName(d, "vi")}, ${pad(day)}/${pad(month)}`;
}

/** "2026-09-20T10:03:00.000Z" → "20/09/2026 17:03" · "20 Sep 2026, 17:03" · "2026年9月20日 17:03" */
export function formatDateTime(iso: string, lang: Lang = "vi"): string {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (lang === "ja") {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
  }
  if (lang === "en") {
    return `${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}, ${time}`;
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${time}`;
}

/* ─────────────── Khác ─────────────── */

/** Sinh mã đặt bàn/đơn dễ đọc qua điện thoại: MY-4F7K2 */
export function makeCode(prefix = "MY"): string {
  const alphabet = "ACDEFGHJKLMNPQRSTUVWXY3456789";
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${s}`;
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
export function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function isValidVNPhone(s: string): boolean {
  const digits = s.replace(/[^\d+]/g, "");
  return /^(\+?84|0)(3|5|7|8|9)\d{8}$/.test(digits);
}
