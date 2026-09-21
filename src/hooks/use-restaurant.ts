import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { RESTAURANT } from "@/config/restaurant";
import { useT, useTr } from "@/i18n";
import { restaurantAtom } from "@/state/content";

/**
 * Dữ kiện nhà hàng đang dùng để hiển thị.
 *
 * Ưu tiên giá trị nhà hàng đã điền trong CMS; chưa lấy được thì lùi về bản
 * đóng gói sẵn trong `config/restaurant.ts`. Nhờ vậy màn hình không bao giờ
 * trống hotline hay địa chỉ.
 *
 * Ba câu chữ khách đọc — tagline, ghi chú giá, chính sách huỷ bàn — trả về
 * theo ngôn ngữ đang chọn. Chưa dịch thì lùi về bản nhà hàng nhập; chưa nhập
 * thì lùi tiếp về từ điển.
 */
export function useRestaurant() {
  const live = useAtomValue(restaurantAtom);
  const tr = useTr();
  const t = useT();

  return useMemo(
    () => ({
      name: live?.name ?? RESTAURANT.name,
      tagline: tr.text(live ?? undefined, "tagline", live?.tagline ?? RESTAURANT.tagline),
      address: live?.address ?? RESTAURANT.address,
      mapsUrl: live?.mapsUrl ?? null,
      hotline: live?.hotline ?? RESTAURANT.hotline,
      oaId: live?.oaId ?? RESTAURANT.oaId,
      city: live?.city ?? RESTAURANT.city,
      counterSeats: live?.counterSeats ?? RESTAURANT.counterSeats,
      depositRate: live?.depositRate ?? RESTAURANT.depositRate,
      vatRate: live?.vatRate ?? RESTAURANT.vatRate,
      menuPriceNote: tr.text(
        live ?? undefined,
        "menu_price_note",
        live?.menuPriceNote ?? t.restaurant.menuPriceNote
      ),
      cancellationPolicy: tr.text(
        live ?? undefined,
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
      kanji: RESTAURANT.kanji,
      inboxResponseMinutes: RESTAURANT.inboxResponseMinutes,
    }),
    [live, tr, t]
  );
}

export type RestaurantView = ReturnType<typeof useRestaurant>;
