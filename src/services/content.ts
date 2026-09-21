/**
 * Tải nội dung (thực đơn, omakase, cấu hình) từ Supabase.
 *
 * App luôn khởi động bằng dữ liệu đóng gói sẵn trong `src/data/` rồi mới
 * thay bằng dữ liệu máy chủ. Nhờ vậy khách mở app là thấy thực đơn ngay,
 * và mạng hỏng cũng không dẫn tới màn hình trống.
 */
import { CATEGORIES } from "@/data/categories";
import { DISHES } from "@/data/menu";
import { OMAKASE_SETS } from "@/data/omakase";
import { supabase } from "@/services/supabase";
import type {
  Badge,
  Category,
  Dish,
  I18nBag,
  OmakaseSet,
  ServicePeriod,
  Variant,
} from "@/types";
import type { Database, Json } from "@/types/db";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Cột `i18n` là jsonb nên kiểu gì cũng lọt qua được. Chỉ nhận đúng object
 * thường; mọi thứ khác coi như chưa dịch và app dùng bản tiếng Việt.
 *
 * Kiểm tra từng trường thì để `useTr()` lo — ở đây chỉ chặn null, mảng và
 * số lọt vào chỗ cần object.
 */
function bag(value: Json | null | undefined): I18nBag | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const keys = Object.keys(value);
  return keys.length ? (value as I18nBag) : undefined;
}

export interface RestaurantInfo {
  name: string;
  tagline: string | null;
  address: string | null;
  mapsUrl: string | null;
  hotline: string | null;
  oaId: string | null;
  city: string | null;
  counterSeats: number;
  depositRate: number;
  vatRate: number | null;
  menuPriceNote: string | null;
  cancellationPolicy: string | null;
  bookingLeadDays: number;
  /** Omakase phải đặt trước ít nhất bao nhiêu giờ; 0 = không bắt buộc. */
  omakaseLeadHours: number;
  /* Nhận cọc tự động qua SePay */
  paymentEnabled: boolean;
  bankAccountNumber: string | null;
  bankCode: string | null;
  bankAccountName: string | null;
  /** Bản dịch của tagline, ghi chú giá và chính sách huỷ bàn. */
  i18n?: I18nBag;
}

export interface Content {
  categories: Category[];
  dishes: Dish[];
  omakase: OmakaseSet[];
  restaurant: RestaurantInfo | null;
}

function mapDish(
  d: Row<"dishes">,
  variants: Row<"dish_variants">[]
): Dish {
  const vs: Variant[] = variants
    .filter((v) => v.dish_id === d.id)
    .map((v) => ({
      id: v.code,
      label: v.label,
      price: v.price,
      note: v.note ?? undefined,
      i18n: bag(v.i18n),
    }));

  return {
    id: d.id,
    name: d.name,
    romaji: d.romaji ?? undefined,
    jp: d.jp ?? undefined,
    price: d.price ?? undefined,
    variants: vs.length ? vs : undefined,
    unit: d.unit ?? undefined,
    categoryId: d.category_id,
    badges: (d.badges ?? []) as Badge[],
    description: d.description ?? undefined,
    includes: d.includes?.length ? d.includes : undefined,
    gifts: d.gifts?.length ? d.gifts : undefined,
    compareAtPrice: d.compare_at_price ?? undefined,
    image: d.image_path ?? undefined,
    sourcePage: d.source_page ?? "",
    i18n: bag(d.i18n),
  };
}

function mapOmakase(
  s: Row<"omakase_sets">,
  courses: Row<"omakase_courses">[]
): OmakaseSet {
  return {
    id: s.id,
    name: s.name,
    jp: s.jp ?? undefined,
    subtitle: s.subtitle ?? undefined,
    price: s.price,
    service: s.service as ServicePeriod,
    tier: (s.tier as 1 | 2 | 3 | 4) ?? 1,
    description: s.description ?? undefined,
    image: s.image_path ?? undefined,
    menuPending: s.menu_pending,
    courses: courses
      .filter((c) => c.set_id === s.id)
      .map((c) => ({
        section: c.section,
        items: c.items ?? [],
        i18n: bag(c.i18n),
      })),
    i18n: bag(s.i18n),
  };
}

/** Nội dung đóng gói sẵn — dùng ngay khi mở app và khi máy chủ không trả lời. */
export const BUNDLED: Content = {
  categories: CATEGORIES,
  dishes: DISHES,
  omakase: OMAKASE_SETS,
  restaurant: null,
};

export async function fetchContent(): Promise<Content | null> {
  if (!supabase) return null;

  const [cats, dishes, variants, sets, courses, settings] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("dishes").select("*").order("sort_order"),
    supabase.from("dish_variants").select("*").order("sort_order"),
    supabase.from("omakase_sets").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("omakase_courses").select("*").order("sort_order"),
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  // Thiếu bất kỳ mảnh nào thì giữ nguyên dữ liệu đang hiển thị, không ghép nửa vời.
  if (cats.error || dishes.error || variants.error || sets.error || courses.error) {
    return null;
  }

  const s = settings.data;

  return {
    categories: (cats.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      jp: c.jp ?? "",
      romaji: c.romaji ?? "",
      i18n: bag(c.i18n),
    })),
    // Món hết hàng vẫn hiện trong thực đơn nhưng không cho gọi — xử lý ở UI.
    dishes: (dishes.data ?? [])
      .filter((d) => d.is_available)
      .map((d) => mapDish(d, variants.data ?? [])),
    omakase: (sets.data ?? []).map((x) => mapOmakase(x, courses.data ?? [])),
    restaurant: s
      ? {
          name: s.name,
          tagline: s.tagline,
          address: s.address,
          mapsUrl: s.maps_url,
          hotline: s.hotline,
          oaId: s.oa_id,
          city: s.city,
          counterSeats: s.counter_seats,
          depositRate: Number(s.deposit_rate),
          vatRate: s.vat_rate === null ? null : Number(s.vat_rate),
          menuPriceNote: s.menu_price_note,
          cancellationPolicy: s.cancellation_policy,
          bookingLeadDays: s.booking_lead_days,
          omakaseLeadHours: s.omakase_lead_hours,
          paymentEnabled: s.payment_enabled,
          bankAccountNumber: s.bank_account_number,
          bankCode: s.bank_code,
          bankAccountName: s.bank_account_name,
          i18n: bag(s.i18n),
        }
      : null,
  };
}
