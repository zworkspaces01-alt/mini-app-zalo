export const vnd = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

/** 199000 → "199" — cách ghi giá trên menu giấy (đơn vị nghìn đồng) */
export const kilo = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(n / 1000);

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export const weekdayName = (i: number) => WEEKDAYS[i] ?? "";
export const WEEKDAY_LIST = WEEKDAYS;

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "2026-09-20" theo giờ địa phương */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const shiftDate = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return toISODate(dt);
};

/** "2026-09-20" → "Thứ bảy, 20/09/2026" */
export const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${weekdayName(dt.getDay())}, ${pad(d)}/${pad(m)}/${y}`;
};

/** "18:00:00" → "18:00" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "—");

export const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

export const dateTimeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu */
export const deaccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** "Mai cua nướng" → "mai-cua-nuong" */
export const slugify = (s: string) =>
  deaccent(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const formatNumber = (n: number | null | undefined) =>
  n === null || n === undefined ? "0" : new Intl.NumberFormat("vi-VN").format(n);

export const pointsLabel = (pts: number | null | undefined) =>
  pts === null || pts === undefined ? "0 điểm" : `${formatNumber(pts)} điểm`;

