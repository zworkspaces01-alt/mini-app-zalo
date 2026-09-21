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
import {
  BANNERS,
  CONTENT_ITEMS,
  LOYALTY_QUESTS,
  LOYALTY_TIERS,
  OMAKASE_BADGES,
  REWARD_GIFTS,
} from "@/data/page-content";
import { supabase } from "@/services/supabase";
import type {
  Badge,
  Banner,
  BannerPlacement,
  Category,
  ContentItem,
  ContentSection,
  Dish,
  I18nBag,
  LoyaltyQuest,
  LoyaltyTier,
  MembershipTier,
  OmakaseSet,
  OpeningShift,
  RewardGiftItem,
  ServicePeriod,
  ServiceSlot,
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
  /** Tiền tố mã đặt bàn, cũng là tiền tố nội dung chuyển khoản. */
  paymentPrefix: string;
  serviceChargeRate: number | null;
  priceIncludesVat: boolean;

  /* Ảnh thương hiệu — null thì dùng ảnh đóng gói sẵn */
  logoUrl: string | null;
  logoDarkUrl: string | null;
  logoWideUrl: string | null;
  logoWideDarkUrl: string | null;
  coverImageUrl: string | null;
  kanji: string | null;

  /* Câu chữ khách đọc — có bản dịch trong i18n, khoá trùng tên cột */
  hoursText: string | null;
  hotlineHours: string | null;
  hotlineNote: string | null;
  locationNote: string | null;
  parkingNote: string | null;
  aboutCounterText: string | null;
  aboutWagyuText: string | null;
  privateRoomNote: string | null;
  butcherTitle: string | null;
  butcherSubtitle: string | null;
  butcherIntro: string | null;
  butcherBadge: string | null;
  butcherGuarantee: string | null;
  deliveryEtaText: string | null;

  /* Luật */
  minGuests: number;
  maxGuests: number;
  /** Ca khách gọi món (không omakase) được đặt bàn. */
  alacarteServices: ServiceSlot[];
  /** true = quầy itamae chỉ dành cho khách omakase. */
  counterOmakaseOnly: boolean;
  takeoutEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryMin: number | null;
  welcomePoints: number;
  /** Số đồng tiêu dùng đổi được 1 điểm, trước khi nhân tỷ lệ của hạng. */
  pointValue: number;

  /** Bản dịch của mọi câu chữ ở trên. */
  i18n?: I18nBag;
}

export interface Content {
  categories: Category[];
  dishes: Dish[];
  omakase: OmakaseSet[];
  restaurant: RestaurantInfo | null;
  banners: Banner[];
  items: ContentItem[];
  /** Ca nhận khách từ bảng opening_hours; rỗng = chưa tải được. */
  hours: OpeningShift[];
  tiers: LoyaltyTier[];
  quests: LoyaltyQuest[];
  gifts: RewardGiftItem[];
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
    tags: d.tags?.length ? d.tags : undefined,
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
    badge: s.badge ?? undefined,
    featured: s.is_featured,
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

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Nhãn, ảnh và suất chọn sẵn cho bản đóng gói. Mã suất trong bản đóng gói
 * khác mã trong CSDL nên khớp theo giá, đúng như migration nội dung.
 */
function withBundledBadges(sets: OmakaseSet[]): OmakaseSet[] {
  return sets.map((s) => {
    const b = OMAKASE_BADGES.find((x) => x.price === s.price);
    if (!b) return s;
    return {
      ...s,
      badge: s.badge ?? b.badge[0],
      featured: s.featured ?? !!b.featured,
      image: s.image ?? b.image,
      i18n: {
        en: { ...(s.i18n?.en ?? {}), badge: b.badge[1] },
        ja: { ...(s.i18n?.ja ?? {}), badge: b.badge[2] },
      },
    };
  });
}

/** Nội dung đóng gói sẵn — dùng ngay khi mở app và khi máy chủ không trả lời. */
export const BUNDLED: Content = {
  categories: CATEGORIES,
  dishes: DISHES,
  omakase: withBundledBadges(OMAKASE_SETS),
  restaurant: null,
  banners: BANNERS,
  items: CONTENT_ITEMS,
  hours: [],
  tiers: LOYALTY_TIERS,
  quests: LOYALTY_QUESTS,
  gifts: REWARD_GIFTS,
};

function mapBanner(b: Row<"banners">): Banner {
  return {
    id: b.id,
    placement: b.placement as BannerPlacement,
    title: b.title,
    subtitle: b.subtitle ?? undefined,
    tag: b.tag ?? undefined,
    jp: b.jp_text ?? undefined,
    image: b.image_url,
    ctaText: b.cta_text ?? undefined,
    ctaLink: b.cta_link ?? undefined,
    accent: b.accent ?? undefined,
    i18n: bag(b.i18n),
  };
}

function mapItem(c: Row<"content_items">): ContentItem {
  const meta =
    c.meta && typeof c.meta === "object" && !Array.isArray(c.meta)
      ? (c.meta as Record<string, unknown>)
      : {};
  return {
    id: c.id,
    section: c.section as ContentSection,
    key: c.key ?? undefined,
    title: c.title,
    subtitle: c.subtitle ?? undefined,
    body: c.body ?? undefined,
    tag: c.tag ?? undefined,
    jp: c.jp ?? undefined,
    image: c.image_url ?? undefined,
    link: c.link ?? undefined,
    meta,
    i18n: bag(c.i18n),
  };
}

function mapGift(g: Row<"reward_gifts">): RewardGiftItem {
  return {
    id: g.id,
    category: g.category as RewardGiftItem["category"],
    title: g.title,
    desc: g.description ?? "",
    worthText: g.worth_text ?? "",
    pointsCost: g.points_cost,
    badge: g.badge ?? undefined,
    imageUrl: g.image_url ?? undefined,
    isActive: g.is_active,
    discountValue: g.discount_value ?? undefined,
    minOrderValue: g.min_order_value || undefined,
    i18n: bag(g.i18n),
  };
}


export async function fetchContent(): Promise<Content | null> {
  if (!supabase) return null;

  const [
    cats,
    dishes,
    variants,
    sets,
    courses,
    settings,
    banners,
    items,
    hours,
    tiers,
    quests,
    gifts,
  ] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("dishes").select("*").order("sort_order"),
    supabase.from("dish_variants").select("*").order("sort_order"),
    supabase.from("omakase_sets").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("omakase_courses").select("*").order("sort_order"),
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("content_items").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("opening_hours").select("*").order("weekday"),
    supabase.from("loyalty_tiers").select("*").order("min_points"),
    supabase.from("loyalty_quests").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("reward_gifts").select("*").eq("is_active", true).order("sort_order"),
  ]);

  // Thiếu bất kỳ mảnh nào thì giữ nguyên dữ liệu đang hiển thị, không ghép nửa vời.
  if (cats.error || dishes.error || variants.error || sets.error || courses.error) {
    return null;
  }

  const s = settings.data;

  // Bảng nội dung mới: lỗi (máy chủ chưa có bảng) thì giữ bản đóng gói.
  // Bảng có nhưng section nào trống thì đó là nhà hàng đã xoá hết — tôn trọng.
  const liveBanners = banners.error ? null : (banners.data ?? []).map(mapBanner);
  const liveItems = items.error ? null : (items.data ?? []).map(mapItem);
  const liveTiers =
    tiers.error || !tiers.data?.length
      ? null
      : tiers.data.map(
          (t): LoyaltyTier => ({
            code: t.code as MembershipTier,
            name: t.name,
            minPoints: t.min_points,
            earnRate: Number(t.earn_rate),
            color: t.color ?? undefined,
            perks: t.perks ?? [],
            i18n: bag(t.i18n),
          })
        );
  const liveQuests = quests.error
    ? null
    : (quests.data ?? []).map(
        (q): LoyaltyQuest => ({
          id: q.id,
          title: q.title,
          description: q.description ?? undefined,
          points: q.points,
          icon: q.icon ?? undefined,
          i18n: bag(q.i18n),
        })
      );
  const liveGifts = gifts.error ? null : (gifts.data ?? []).map(mapGift);

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
          paymentPrefix: s.payment_prefix,
          serviceChargeRate:
            s.service_charge_rate === null ? null : Number(s.service_charge_rate),
          priceIncludesVat: s.price_includes_vat,
          logoUrl: s.logo_url,
          logoDarkUrl: s.logo_dark_url,
          logoWideUrl: s.logo_wide_url,
          logoWideDarkUrl: s.logo_wide_dark_url,
          coverImageUrl: s.cover_image_url,
          kanji: s.kanji,
          hoursText: s.hours_text,
          hotlineHours: s.hotline_hours,
          hotlineNote: s.hotline_note,
          locationNote: s.location_note,
          parkingNote: s.parking_note,
          aboutCounterText: s.about_counter_text,
          aboutWagyuText: s.about_wagyu_text,
          privateRoomNote: s.private_room_note,
          butcherTitle: s.butcher_title,
          butcherSubtitle: s.butcher_subtitle,
          butcherIntro: s.butcher_intro,
          butcherBadge: s.butcher_badge,
          butcherGuarantee: s.butcher_guarantee,
          deliveryEtaText: s.delivery_eta_text,
          minGuests: s.min_guests,
          maxGuests: s.max_guests,
          alacarteServices: (s.alacarte_services ?? []).filter(
            (x): x is ServiceSlot => x === "lunch" || x === "dinner"
          ),
          counterOmakaseOnly: s.counter_omakase_only,
          takeoutEnabled: s.takeout_enabled,
          deliveryEnabled: s.delivery_enabled,
          deliveryFee: s.delivery_fee,
          freeDeliveryMin: s.free_delivery_min,
          welcomePoints: s.welcome_points,
          pointValue: s.point_value,
          i18n: bag(s.i18n),
        }
      : null,
    banners: liveBanners ?? BUNDLED.banners,
    items: liveItems ?? BUNDLED.items,
    hours: hours.error
      ? []
      : (hours.data ?? []).map(
          (h): OpeningShift => ({
            weekday: h.weekday,
            service: h.service as ServiceSlot,
            open: hhmm(h.open_time),
            close: hhmm(h.close_time),
            closed: h.is_closed,
          })
        ),
    tiers: liveTiers ?? BUNDLED.tiers,
    quests: liveQuests ?? BUNDLED.quests,
    gifts: liveGifts ?? BUNDLED.gifts,
  };
}
