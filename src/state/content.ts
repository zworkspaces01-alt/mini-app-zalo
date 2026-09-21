import { atom } from "jotai";

import { BUNDLED, type Content, type RestaurantInfo } from "@/services/content";
import type { Category, Dish, OmakaseSet } from "@/types";

/**
 * Nội dung đang hiển thị. Khởi tạo bằng dữ liệu đóng gói sẵn rồi được
 * `useContentSync` thay bằng dữ liệu từ máy chủ.
 */
export const contentAtom = atom<Content>(BUNDLED);

export const categoriesAtom = atom<Category[]>((get) => get(contentAtom).categories);
export const dishesAtom = atom<Dish[]>((get) => get(contentAtom).dishes);
export const omakaseSetsAtom = atom<OmakaseSet[]>((get) => get(contentAtom).omakase);
export const restaurantAtom = atom<RestaurantInfo | null>(
  (get) => get(contentAtom).restaurant
);

export const dishesByIdAtom = atom<Record<string, Dish>>((get) =>
  Object.fromEntries(get(dishesAtom).map((d) => [d.id, d]))
);

export const omakaseByIdAtom = atom<Record<string, OmakaseSet>>((get) =>
  Object.fromEntries(get(omakaseSetsAtom).map((s) => [s.id, s]))
);

/** true khi đã lấy được nội dung mới từ máy chủ ít nhất một lần */
export const contentLiveAtom = atom(false);

export const bannersAtom = atom((get) => get(contentAtom).banners);
export const contentItemsAtom = atom((get) => get(contentAtom).items);
export const openingHoursAtom = atom((get) => get(contentAtom).hours);
export const loyaltyTiersAtom = atom((get) => get(contentAtom).tiers);
export const loyaltyQuestsAtom = atom((get) => get(contentAtom).quests);
export const rewardGiftsAtom = atom((get) => get(contentAtom).gifts);
