import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { MouseEvent } from "react";

import { DishBadge, Price } from "@/components/ui";
import { IconHeart, IconPlus } from "@/components/ui/icons";
import { Icon3DMenu, Icon3DStar } from "@/components/ui/icons-3d";
import { dishFromPrice } from "@/data/menu";
import { useT, useTr } from "@/i18n";
import { haptic } from "@/services/zalo";
import { addToCartAtom, dishQtyAtom, favoritesAtom } from "@/state/atoms";
import { Dish } from "@/types";
import { img } from "@/utils/images";

export interface DishCardProps {
  dish: Dish;
  onOpen: (dish: Dish) => void;
  aspectRatio?: "1:1" | "4:5";
  className?: string;
}

export default function DishCard({
  dish,
  onOpen,
  aspectRatio = "1:1",
  className = "",
}: DishCardProps) {
  const addToCart = useSetAtom(addToCartAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const qtyMap = useAtomValue(dishQtyAtom);
  const qty = qtyMap[dish.id] ?? 0;
  const isFav = favorites.includes(dish.id);
  const t = useT();
  const tr = useTr();

  const name = tr.text(dish, "name", dish.name);
  const photo = img(dish.image);
  const badge = dish.badges?.[0];
  const hasVariants = !!dish.variants?.length;

  const toggleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    haptic("light");
    setFavorites((prev) =>
      prev.includes(dish.id)
        ? prev.filter((id) => id !== dish.id)
        : [...prev, dish.id]
    );
  };

  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    haptic("light");
    if (hasVariants) {
      onOpen(dish);
    } else {
      addToCart({ dish });
    }
  };

  return (
    <div
      onClick={() => {
        haptic("light");
        onOpen(dish);
      }}
      className={`card group cursor-pointer overflow-hidden rounded-2xl border border-[var(--line)] text-left shadow-sm transition-all duration-200 active:scale-[0.98] flex flex-col justify-between bg-[var(--surface)] ${className}`}
    >
      <div>
        {/* Ảnh món: 1:1 (aspect-square) hoặc 4:5 (aspect-[4/5]) */}
        <div
          className={`relative w-full overflow-hidden bg-[var(--surface-2)] ${
            aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square"
          }`}
        >
          {photo ? (
            <img
              src={photo}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-60">
              <Icon3DMenu size={36} />
            </div>
          )}

          {/* Huy hiệu món */}
          {badge && (
            <div className="absolute left-2 top-2 z-10">
              <DishBadge badge={badge} />
            </div>
          )}

          {/* Nút tim yêu thích */}
          <button
            type="button"
            aria-label={isFav ? "Bỏ yêu thích" : "Yêu thích"}
            onClick={toggleFavorite}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-transform active:scale-90 shadow-sm"
          >
            <IconHeart
              size={13}
              filled={isFav}
              className={isFav ? "text-[var(--shu)]" : "text-white"}
            />
          </button>
        </div>

        {/* Thông tin món */}
        <div className="p-2.5 pb-1">
          <h3 className="line-clamp-2 min-h-[34px] text-[12.5px] font-bold leading-snug text-[var(--washi)]">
            {name}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--faint)]">
            <span className="truncate pr-1">{dish.romaji || dish.jp}</span>
            <span className="shrink-0 flex items-center gap-0.5 text-amber-500 font-semibold text-[10px]">
              <Icon3DStar size={11} /> 4.9
            </span>
          </div>
        </div>
      </div>

      {/* Giá tiền và nút thêm giỏ hàng */}
      <div className="p-2.5 pt-2 flex items-end justify-between border-t border-[var(--line)]/50 mt-1 min-h-[40px]">
        <div className="min-w-0 flex-1 pr-1.5 overflow-hidden">
          <Price
            value={dishFromPrice(dish)}
            from={hasVariants}
            compareAt={dish.compareAtPrice}
            className="text-[13px] font-bold text-[var(--shu)]"
          />
        </div>
        <button
          type="button"
          aria-label={t.dish.add(name)}
          onClick={handleAdd}
          className="relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--shu)] text-white shadow-sm transition-transform active:scale-90"
        >
          <IconPlus size={14} />
          {qty > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[9px] font-black text-[var(--gold-contrast)] shadow-md ring-1 ring-[var(--surface)]">
              {qty}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
