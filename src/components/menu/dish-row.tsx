import { useAtomValue, useSetAtom } from "jotai";

import { DishBadge, Price } from "@/components/ui";
import { IconPlus } from "@/components/ui/icons";
import { dishFromPrice } from "@/data/menu";
import { useT, useTr } from "@/i18n";
import { addToCartAtom, dishQtyAtom } from "@/state/atoms";
import { Dish } from "@/types";
import { img } from "@/utils/images";

/**
 * Một dòng món — bố cục mượn từ menu giấy: tên Việt, romaji nghiêng,
 * kanji đỏ nhỏ, dấu chấm dẫn, giá canh phải.
 */
export default function DishRow({
  dish,
  onOpen,
}: {
  dish: Dish;
  onOpen: (d: Dish) => void;
}) {
  const addToCart = useSetAtom(addToCartAtom);
  const qtyMap = useAtomValue(dishQtyAtom);
  const qty = qtyMap[dish.id] ?? 0;
  const thumb = img(dish.image);
  const hasVariants = !!dish.variants?.length;
  const t = useT();
  const tr = useTr();

  const name = tr.text(dish, "name", dish.name);
  const unit = tr.text(dish, "unit", dish.unit);

  return (
    <div className="flex items-start gap-3 py-3.5">
      {thumb && (
        <button onClick={() => onOpen(dish)} className="shrink-0">
          <img
            src={thumb}
            alt={name}
            loading="lazy"
            className="h-[68px] w-[68px] rounded-xl object-cover shadow-sm"
          />
        </button>
      )}

      <button onClick={() => onOpen(dish)} className="min-w-0 flex-1 text-left">
        {dish.jp && (
          <div className="jp mb-0.5 text-[11px] leading-none text-[var(--shu)]">
            {dish.jp}
          </div>
        )}
        <div className="text-[15px] font-medium leading-snug">{name}</div>
        {dish.romaji && (
          <div className="mt-0.5 text-[12px] italic leading-snug text-[var(--muted)]">
            {dish.romaji}
          </div>
        )}
        {(dish.badges?.length || unit) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {dish.badges?.map((b) => (
              <DishBadge key={b} badge={b} />
            ))}
            {unit && (
              <span className="text-[11px] text-[var(--faint)]">{unit}</span>
            )}
          </div>
        )}
      </button>

      <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
        <Price
          value={dishFromPrice(dish)}
          from={hasVariants}
          compareAt={dish.compareAtPrice}
          className="text-[15px] font-semibold"
        />
        <button
          aria-label={t.dish.add(name)}
          onClick={() => (hasVariants ? onOpen(dish) : addToCart({ dish }))}
          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] text-[var(--washi)] hover:bg-[var(--shu)] hover:text-white transition-all active:scale-90 shadow-sm"
        >
          <IconPlus size={16} />
          {qty > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--shu)] px-1 text-[9px] font-bold text-white shadow-md shadow-[var(--shu)]/40 ring-1 ring-[var(--surface)]">
              {qty}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
