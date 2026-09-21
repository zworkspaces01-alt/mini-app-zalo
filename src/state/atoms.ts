import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { BookingDraft, CartLine, Dish, UserProfile, Variant } from "@/types";
import { dishesByIdAtom } from "@/state/content";
import { toISODate } from "@/utils/format";

/* ─────────────── Người dùng ─────────────── */
export const userAtom = atom<UserProfile | null>(null);

/* ─────────────── Món đã lưu ─────────────── */
export const favoritesAtom = atomWithStorage<string[]>("miyako.favorites", []);

/* ─────────────── Chế độ gọi món ───────────────
   "pre-order": đặt trước kèm bàn. "dine-in": quét QR tại bàn. */
export const tableIdAtom = atomWithStorage<string | null>("miyako.table", null);

/* ─────────────── Giỏ món ─────────────── */
export const cartAtom = atomWithStorage<CartLine[]>("miyako.cart", []);

export const cartCountAtom = atom((get) =>
  get(cartAtom).reduce((n, l) => n + l.qty, 0)
);

export const cartSubtotalAtom = atom((get) =>
  get(cartAtom).reduce((s, l) => s + l.unitPrice * l.qty, 0)
);

export function lineKey(dishId: string, variantId?: string, note?: string) {
  return [dishId, variantId ?? "", note?.trim() ?? ""].join("|");
}

export const addToCartAtom = atom(
  null,
  (
    get,
    set,
    input: { dish: Dish; variant?: Variant; qty?: number; note?: string }
  ) => {
    const { dish, variant, qty = 1, note } = input;
    const unitPrice = variant?.price ?? dish.price ?? 0;
    const key = lineKey(dish.id, variant?.id, note);
    const cart = get(cartAtom);
    const existing = cart.find((l) => l.key === key);
    if (existing) {
      set(
        cartAtom,
        cart.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
      );
      return;
    }
    const line: CartLine = {
      key,
      dishId: dish.id,
      variantId: variant?.id,
      name: dish.name,
      variantLabel: variant?.label,
      unitPrice,
      qty,
      note: note?.trim() || undefined,
    };
    set(cartAtom, [...cart, line]);
  }
);

export const setLineQtyAtom = atom(
  null,
  (get, set, input: { key: string; qty: number }) => {
    const next = get(cartAtom)
      .map((l) => (l.key === input.key ? { ...l, qty: input.qty } : l))
      .filter((l) => l.qty > 0);
    set(cartAtom, next);
  }
);

export const clearCartAtom = atom(null, (_get, set) => set(cartAtom, []));

/** Số lượng của một món trong giỏ — dùng để hiện bộ đếm trên thẻ món. */
export const dishQtyAtom = atom((get) => {
  const map: Record<string, number> = {};
  for (const l of get(cartAtom)) {
    map[l.dishId] = (map[l.dishId] ?? 0) + l.qty;
  }
  return map;
});

/** Món trong giỏ nhưng đã bị gỡ khỏi thực đơn — dọn sau khi tải nội dung. */
export const pruneCartAtom = atom(null, (get, set) => {
  const byId = get(dishesByIdAtom);
  if (Object.keys(byId).length === 0) return;
  const cart = get(cartAtom);
  const valid = cart.filter((l) => byId[l.dishId]);
  if (valid.length !== cart.length) set(cartAtom, valid);
});

/* ─────────────── Bản nháp đặt bàn ─────────────── */
export const emptyBooking = (): BookingDraft => ({
  purpose: "omakase",
  omakaseSetId: undefined,
  date: toISODate(new Date()),
  time: undefined,
  guests: 2,
  seating: "counter",
});

export const bookingAtom = atomWithStorage<BookingDraft>(
  "miyako.booking",
  emptyBooking()
);

export const patchBookingAtom = atom(
  null,
  (get, set, patch: Partial<BookingDraft>) => {
    const prev = get(bookingAtom);
    const next = { ...prev, ...patch };

    // Đổi ngày, giờ, số khách hay khu vực ngồi thì ghế đã chọn không còn
    // đúng nữa — bỏ đi để khách chọn lại, tránh giữ chỗ nhầm.
    const seatKeys: (keyof BookingDraft)[] = ["date", "time", "guests", "seating"];
    const seatingChanged = seatKeys.some(
      (k) => patch[k] !== undefined && patch[k] !== prev[k]
    );
    if (seatingChanged && patch.seatIds === undefined) {
      next.seatIds = undefined;
    }

    // Khi chọn Alacarte thì không có chỗ ngồi ở quầy counter
    if (next.purpose === "alacarte" && next.seating === "counter") {
      next.seating = "table";
      next.seatIds = undefined;
    }

    set(bookingAtom, next);
  }
);

export const resetBookingAtom = atom(null, (_get, set) =>
  set(bookingAtom, emptyBooking())
);

/* ─────────────── Cấu hình giao diện (Sáng / Tối / Hệ thống) ─────────────── */
export type ThemePreference = "system" | "light" | "dark";
export const themePrefAtom = atomWithStorage<ThemePreference>(
  "miyako.theme_pref",
  "system"
);

/* ─────────────── Tích Điểm & Hội Viên (Miyako VIP Club) ─────────────── */
export type MembershipTier = "silver" | "gold" | "platinum";

export interface PointsHistoryItem {
  id: string;
  title: string;
  desc: string;
  date: string;
  points: number; // số dương: tích điểm, số âm: đổi quà
  type: "order" | "booking" | "redeem" | "reward" | "bonus";
}

export const userPointsAtom = atomWithStorage<number>("miyako.points", 1250);
export const userTierAtom = atomWithStorage<MembershipTier>("miyako.tier", "gold");

export const pointsHistoryAtom = atomWithStorage<PointsHistoryItem[]>(
  "miyako.points_history",
  [
    {
      id: "p-1",
      title: "Tích điểm Omakase Bếp Trưởng",
      desc: "Hóa đơn #MYK-8821 tại quầy Sushi Bar",
      date: "Hôm qua, 20:30",
      points: 180,
      type: "order",
    },
    {
      id: "p-2",
      title: "Đổi Voucher 100k Wagyu Butcher",
      desc: "Áp dụng đơn thịt tươi mang về",
      date: "18/09/2026",
      points: -100,
      type: "redeem",
    },
    {
      id: "p-3",
      title: "Tích điểm Bàn VIP Nướng Than",
      desc: "Hóa đơn #MYK-7419 (Set Lẩu & Bò A5)",
      date: "12/09/2026",
      points: 120,
      type: "order",
    },
    {
      id: "p-4",
      title: "Thưởng sinh nhật Hạng Vàng",
      desc: "Món quà tri ân từ bếp trưởng Miyako",
      date: "01/09/2026",
      points: 200,
      type: "bonus",
    },
    {
      id: "p-5",
      title: "Hoàn tất đăng ký thành viên",
      desc: "Gia nhập Miyako VIP Club trên Zalo OA",
      date: "25/08/2026",
      points: 50,
      type: "reward",
    },
  ]
);

export const redeemGiftAtom = atom(
  null,
  (
    get,
    set,
    input: { id: string; title: string; pointsCost: number }
  ): boolean => {
    const currentPoints = get(userPointsAtom);
    if (currentPoints < input.pointsCost) return false;

    set(userPointsAtom, currentPoints - input.pointsCost);

    const now = new Date();
    const dateStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")} - ${now.getDate()}/${now.getMonth() + 1}`;

    const newHistory: PointsHistoryItem = {
      id: "p-" + Date.now(),
      title: `Đổi ${input.title}`,
      desc: "Đổi thưởng bằng điểm tích luỹ Miyako",
      date: dateStr,
      points: -input.pointsCost,
      type: "redeem",
    };

    set(pointsHistoryAtom, [newHistory, ...get(pointsHistoryAtom)]);
    return true;
  }
);

