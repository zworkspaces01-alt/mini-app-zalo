export type Badge = "signature" | "best-seller" | "must-try";

/** Ba thứ tiếng app chạy. Tiếng Việt là bản gốc mọi nội dung. */
export type Lang = "vi" | "en" | "ja";

/** Ngôn ngữ có bản dịch trong CSDL — tiếng Việt nằm ở cột thường. */
export type TranslatedLang = Exclude<Lang, "vi">;

/**
 * Bản dịch của một dòng nội dung, đúng như cột `i18n` trong CSDL:
 * `{ en: { name: "…" }, ja: { name: "…", includes: ["…"] } }`.
 *
 * Thiếu ngôn ngữ, thiếu trường, sai kiểu — tất cả đều lùi về tiếng Việt.
 * Dữ liệu này do AI sinh ra nên không có gì bảo đảm, phải luôn có đường lùi.
 */
export type I18nBag = Partial<
  Record<TranslatedLang, Record<string, string | string[] | undefined>>
>;

/** Mọi dòng nội dung dịch được đều mang theo `i18n`. */
export interface Translatable {
  i18n?: I18nBag;
}

/** Một biến thể giá (ví dụ lẩu size M / L, wagyu theo 100gr). */
export interface Variant extends Translatable {
  id: string;
  label: string;
  /** VND */
  price: number;
  note?: string;
}

export interface Dish extends Translatable {
  id: string;
  /** Tên tiếng Việt in trên menu */
  name: string;
  /** Romaji in trên menu */
  romaji?: string;
  /** Kanji/kana in trên menu */
  jp?: string;
  /** VND. Bỏ trống khi món chỉ bán theo variant. */
  price?: number;
  variants?: Variant[];
  /** Ví dụ "100gr", "2 pax · 250gr" */
  unit?: string;
  categoryId: string;
  badges?: Badge[];
  /** Mô tả in trên menu giấy — chỉ điền khi menu có sẵn, không tự viết thêm. */
  description?: string;
  /** Các phần thịt/món trong combo, đúng như in trên menu. */
  includes?: string[];
  /** Quà kèm combo */
  gifts?: string[];
  /** Giá gạch ngang in trên menu (combo đang ưu đãi) */
  compareAtPrice?: number;
  image?: string;
  /** Trang menu giấy gốc — để đối chiếu khi cập nhật giá */
  sourcePage: string;
}

export interface Category extends Translatable {
  id: string;
  name: string;
  jp: string;
  romaji: string;
  image?: string;
}

/** Ca phục vụ của một suất omakase. */
export type ServicePeriod = "lunch" | "dinner" | "both";

/** Hai ca thật sự trong ngày — dùng cho opening_hours và tra khung giờ. */
export type ServiceSlot = "lunch" | "dinner";

export interface OmakaseCourse extends Translatable {
  /** Tên nhóm: Khai vị, Sashimi, … */
  section: string;
  items: string[];
}

export interface OmakaseSet extends Translatable {
  id: string;
  name: string;
  jp?: string;
  subtitle?: string;
  price: number;
  /** Ca phục vụ; "both" = bán cả trưa lẫn tối */
  service: ServicePeriod;
  tier: 1 | 2 | 3 | 4;
  description?: string;
  courses: OmakaseCourse[];
  /** true khi thực đơn chi tiết chưa được xác nhận */
  menuPending: boolean;
  image?: string;
}

export interface CartLine {
  key: string;
  dishId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  unitPrice: number;
  qty: number;
  note?: string;
}

export type SeatingType = "counter" | "table" | "private";
export type BookingPurpose = "omakase" | "alacarte";

export interface BookingDraft {
  purpose: BookingPurpose;
  omakaseSetId?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  guests: number;
  seating: SeatingType;
  name?: string;
  phone?: string;
  occasion?: string;
  note?: string;
  /** Dị ứng / chế độ ăn — bếp cần biết trước */
  dietary?: string;
  /** Ghế đã chọn ở quầy omakase, ví dụ ["Q6","Q7"] */
  seatIds?: string[];
}

export type ReservationStatus =
  | "pending"       // chờ nhà hàng xác nhận
  | "awaiting-deposit"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface Reservation extends BookingDraft {
  id: string;
  code: string;
  status: ReservationStatus;
  createdAt: string;
  /** VND — 0 khi suất không yêu cầu cọc */
  depositAmount: number;
  depositPaid: boolean;
  /** Món đặt trước kèm bàn */
  preOrder?: CartLine[];
}

export interface SeatAvailability {
  id: string;
  label: string;
  x: number;
  z: number;
  rotation: number;
  premium: boolean;
  taken: boolean;
}

export interface Order {
  id: string;
  code: string;
  createdAt: string;
  lines: CartLine[];
  subtotal: number;
  /** "dine-in" tại bàn, "pre-order" đặt trước kèm bàn, "takeout" lấy tại quán, "delivery" giao tận nơi */
  mode: "dine-in" | "pre-order" | "takeout" | "delivery";
  tableId?: string;
  reservationId?: string;
  note?: string;
  status: "sent" | "preparing" | "delivering" | "served" | "completed" | "cancelled";
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  paymentMethod?: "vietqr" | "cod" | "transfer";
  paymentStatus?: "unpaid" | "paid";
  pointsEarned?: number;
  discountAmount?: number;
  voucherCode?: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  avatar?: string;
  phone?: string;
}

/* ─────────────── Tích Điểm & Hội Viên ─────────────── */
export type MembershipTier = "bronze" | "silver" | "gold" | "diamond";

export interface RewardGiftItem {
  id: string;
  category: "all" | "voucher" | "dish" | "drink";
  title: string;
  desc: string;
  worthText: string;
  pointsCost: number;
  badge?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface CustomerVoucher {
  id: string;
  code: string;
  giftId?: string;
  giftTitle: string;
  giftCategory: string;
  worthText?: string;
  status: "active" | "used" | "expired";
  createdAt: string;
  usedAt?: string;
}

export interface PointsHistoryItem {
  id: string;
  title: string;
  desc: string;
  date: string;
  points: number;
  type: "order" | "booking" | "redeem" | "reward" | "bonus";
}


