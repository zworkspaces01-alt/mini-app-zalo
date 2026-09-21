import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { RESTAURANT } from "@/config/restaurant";
import { SETTINGS_IMAGES, SETTINGS_TEXT } from "@/data/page-content";
import { useT, useTr, type Dict } from "@/i18n";
import { openingHoursAtom, restaurantAtom } from "@/state/content";
import type { OpeningShift, ServiceSlot } from "@/types";

/**
 * Giờ mở cửa ghép từ bảng opening_hours, dùng khi nhà hàng chưa nhập câu giờ
 * mở cửa riêng. Mỗi ca lấy khung giờ phổ biến nhất trong tuần:
 * "Trưa 11:30 – 13:00 · Tối 17:30 – 20:00".
 */
function hoursFromShifts(shifts: OpeningShift[], t: Dict): string | undefined {
  const parts: string[] = [];
  for (const service of ["lunch", "dinner"] as const) {
    const count = new Map<string, number>();
    for (const s of shifts) {
      if (s.service !== service || s.closed) continue;
      const k = `${s.open} – ${s.close}`;
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) parts.push(`${t.service[service]} ${best}`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

/**
 * Dữ kiện nhà hàng đang dùng để hiển thị.
 *
 * Ưu tiên giá trị nhà hàng đã điền trong CMS; chưa lấy được thì lùi về bản
 * đóng gói sẵn trong `config/restaurant.ts` và `data/page-content.ts`. Nhờ
 * vậy màn hình không bao giờ trống hotline hay địa chỉ.
 *
 * Các câu chữ khách đọc trả về theo ngôn ngữ đang chọn. Chưa dịch thì lùi về
 * bản nhà hàng nhập; chưa nhập thì lùi tiếp về bản đóng gói.
 */
export function useRestaurant() {
  const live = useAtomValue(restaurantAtom);
  const shifts = useAtomValue(openingHoursAtom);
  const tr = useTr();
  const t = useT();

  return useMemo(() => {
    const row = live ?? undefined;
    /**
     * Một câu chữ trong cấu hình. `field` là tên cột, cũng là khoá trong i18n.
     * Máy chủ trả null nghĩa là nhà hàng cố ý để trống — trả undefined để UI
     * ẩn phần đó. Chưa tải được thì dùng bản đóng gói.
     */
    const text = (field: string, value: string | null | undefined): string | undefined => {
      if (live) return value ? tr.text(row, field, value) : undefined;
      const vi = (SETTINGS_TEXT.vi as Record<string, string | undefined>)[field];
      return tr.text(SETTINGS_TEXT, field, vi);
    };

    return {
      name: live?.name ?? RESTAURANT.name,
      tagline: tr.text(row, "tagline", live?.tagline ?? RESTAURANT.tagline),
      address: live?.address ?? RESTAURANT.address,
      mapsUrl: live?.mapsUrl ?? null,
      hotline: live?.hotline ?? RESTAURANT.hotline,
      oaId: live?.oaId ?? RESTAURANT.oaId,
      city: live?.city ?? RESTAURANT.city,
      counterSeats: live?.counterSeats ?? RESTAURANT.counterSeats,
      depositRate: live?.depositRate ?? RESTAURANT.depositRate,
      vatRate: live?.vatRate ?? RESTAURANT.vatRate,
      serviceChargeRate: live?.serviceChargeRate ?? RESTAURANT.serviceChargeRate,
      priceIncludesVat: live?.priceIncludesVat ?? RESTAURANT.priceIncludesVat,
      menuPriceNote: tr.text(
        row,
        "menu_price_note",
        live?.menuPriceNote ?? t.restaurant.menuPriceNote
      ),
      cancellationPolicy: tr.text(
        row,
        "cancellation_policy",
        live?.cancellationPolicy ?? undefined
      ),
      // Chưa khai báo tài khoản thì coi như tắt — thà không hiện mã QR còn
      // hơn hiện một mã trỏ vào tài khoản trống.
      paymentEnabled:
        !!live?.paymentEnabled &&
        !!live?.bankAccountNumber &&
        !!live?.bankCode,
      bankAccountNumber: live?.bankAccountNumber ?? null,
      bankCode: live?.bankCode ?? null,
      bankAccountName: live?.bankAccountName ?? null,
      paymentPrefix: live?.paymentPrefix ?? "MY",

      /* Ảnh thương hiệu */
      logo: live?.logoUrl || SETTINGS_IMAGES.logo_url,
      logoDark: live?.logoDarkUrl || SETTINGS_IMAGES.logo_dark_url,
      logoWide: live?.logoWideUrl || SETTINGS_IMAGES.logo_wide_url,
      logoWideDark: live?.logoWideDarkUrl || SETTINGS_IMAGES.logo_wide_dark_url,
      coverImage: live?.coverImageUrl || SETTINGS_IMAGES.cover_image_url,
      kanji: live?.kanji || RESTAURANT.kanji,

      /* Câu chữ khách đọc */
      hoursText:
        text("hours_text", live?.hoursText) ?? hoursFromShifts(shifts, t),
      hotlineHours: text("hotline_hours", live?.hotlineHours),
      hotlineNote: text("hotline_note", live?.hotlineNote),
      locationNote: text("location_note", live?.locationNote),
      parkingNote: text("parking_note", live?.parkingNote),
      aboutCounterText: text("about_counter_text", live?.aboutCounterText),
      aboutWagyuText: text("about_wagyu_text", live?.aboutWagyuText),
      privateRoomNote: text("private_room_note", live?.privateRoomNote),
      butcherTitle: text("butcher_title", live?.butcherTitle),
      butcherSubtitle: text("butcher_subtitle", live?.butcherSubtitle),
      butcherIntro: text("butcher_intro", live?.butcherIntro),
      butcherBadge: text("butcher_badge", live?.butcherBadge),
      butcherGuarantee: text("butcher_guarantee", live?.butcherGuarantee),
      deliveryEtaText: text("delivery_eta_text", live?.deliveryEtaText),

      /* Luật */
      minGuests: live?.minGuests ?? 1,
      maxGuests: live?.maxGuests ?? 20,
      alacarteServices: live?.alacarteServices ?? (["dinner"] as ServiceSlot[]),
      counterOmakaseOnly: live?.counterOmakaseOnly ?? true,
      takeoutEnabled: live?.takeoutEnabled ?? true,
      deliveryEnabled: live?.deliveryEnabled ?? true,
      deliveryFee: live?.deliveryFee ?? 0,
      freeDeliveryMin: live?.freeDeliveryMin ?? null,
      welcomePoints: live?.welcomePoints ?? 50,
      pointValue: live?.pointValue ?? 1000,
      bookingLeadDays: live?.bookingLeadDays ?? RESTAURANT.bookingLeadDays,
      omakaseLeadHours: live?.omakaseLeadHours ?? RESTAURANT.omakaseLeadHours,

      inboxResponseMinutes: RESTAURANT.inboxResponseMinutes,
    };
  }, [live, shifts, tr, t]);
}

export type RestaurantView = ReturnType<typeof useRestaurant>;
