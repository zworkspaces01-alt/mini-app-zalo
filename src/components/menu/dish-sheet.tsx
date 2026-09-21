import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useSnackbar } from "zmp-ui";

import {
  Button,
  DishBadge,
  Note,
  QtyStepper,
  Sheet,
  TextArea,
} from "@/components/ui";
import { IconHeart } from "@/components/ui/icons";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT, useTr } from "@/i18n";
import { haptic } from "@/services/zalo";
import { addToCartAtom, favoritesAtom } from "@/state/atoms";
import { Dish, Variant } from "@/types";
import { vnd } from "@/utils/format";
import { getDishImage, heroOmakase } from "@/utils/images";

export default function DishSheet({
  dish,
  onClose,
}: {
  dish: Dish | null;
  onClose: () => void;
}) {
  const addToCart = useSetAtom(addToCartAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const { openSnackbar } = useSnackbar();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<Variant | undefined>();
  const [note, setNote] = useState("");
  const t = useT();
  const tr = useTr();
  const lang = useLang();
  const restaurant = useRestaurant();

  useEffect(() => {
    if (!dish) return;
    setQty(1);
    setNote("");
    setVariant(dish.variants?.[0]);
  }, [dish]);

  if (!dish) return null;

  const unitPrice = variant?.price ?? dish.price ?? 0;
  const photo = getDishImage(dish);

  const name = tr.text(dish, "name", dish.name);
  const description = tr.text(dish, "description", dish.description);
  const includes = tr.list(dish, "includes", dish.includes);
  const gifts = tr.list(dish, "gifts", dish.gifts);

  const favorite = favorites.includes(dish.id);

  const toggleFavorite = () => {
    haptic("light");
    setFavorites((list) =>
      list.includes(dish.id)
        ? list.filter((x) => x !== dish.id)
        : [...list, dish.id]
    );
  };

  const submit = () => {
    haptic("medium");
    addToCart({ dish, variant, qty, note });
    openSnackbar({
      text: t.dish.added(qty, name),
      type: "success",
      duration: 1800,
    });
    onClose();
  };

  return (
    <Sheet
      open={!!dish}
      onClose={onClose}
      title={name}
      footer={
        <div className="flex items-center gap-3">
          <QtyStepper qty={qty} onChange={setQty} min={1} />
          <Button full onClick={submit} className="flex-1">
            {t.dish.addWithPrice(vnd(unitPrice * qty, lang))}
          </Button>
        </div>
      }
    >
      {/* Ảnh món ăn hiển thị đúng tỉ lệ và kích cỡ gốc đã tải lên, không bị crop mất góc */}
      <div className="relative mb-4 w-full overflow-hidden rounded-2xl bg-[var(--surface-2)] shadow-sm flex items-center justify-center">
        <img
          src={photo}
          alt={name}
          className="w-full h-auto max-h-[60vh] object-contain rounded-2xl block"
          onError={(e) => {
            (e.target as HTMLImageElement).src = heroOmakase;
          }}
        />

        {dish.badges?.[0] && (
          <div className="absolute left-3 top-3 z-10">
            <DishBadge badge={dish.badges[0]} />
          </div>
        )}

        <button
          type="button"
          aria-label={favorite ? t.dish.unsave : t.dish.save}
          aria-pressed={favorite}
          onClick={toggleFavorite}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md shadow-md transition-transform active:scale-90"
        >
          <IconHeart
            size={16}
            filled={favorite}
            className={favorite ? "text-[var(--shu)]" : "text-white"}
          />
        </button>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {dish.jp && (
            <span className="jp text-[13px] font-medium text-[var(--shu)]">
              {dish.jp}
            </span>
          )}
          {dish.romaji && (
            <span className="text-[13px] italic text-[var(--muted)]">
              {dish.romaji}
            </span>
          )}
        </div>
        <div className="text-[15px] font-bold text-[var(--shu)] tabular-nums">
          {vnd(unitPrice, lang)}
        </div>
      </div>

      {dish.badges && dish.badges.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {dish.badges.slice(1).map((b) => (
            <DishBadge key={b} badge={b} />
          ))}
        </div>
      )}

      {description && (
        <p className="mt-3.5 text-[14px] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      )}

      {!!includes?.length && (
        <div className="mt-4">
          <div className="mb-2 text-[12px] uppercase tracking-wider text-[var(--faint)]">
            {t.dish.includes}
          </div>
          <ul className="space-y-1.5">
            {includes.map((item, i) => (
              <li key={item} className="flex gap-2.5 text-[14px]">
                <span className="w-4 shrink-0 text-[var(--gold)] tabular-nums">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!gifts?.length && (
        <div className="mt-4 rounded-xl border border-[var(--gold-dim)] bg-[var(--gold-dim)] p-3">
          <div className="mb-1.5 text-[12px] uppercase tracking-wider text-[var(--gold)]">
            {t.dish.gifts}
          </div>
          <ul className="space-y-1 text-[13px]">
            {gifts.map((g) => (
              <li key={g}>· {g}</li>
            ))}
          </ul>
        </div>
      )}

      {!!dish.variants?.length && (
        <div className="mt-4">
          <div className="mb-2 text-[12px] uppercase tracking-wider text-[var(--faint)]">
            {t.dish.pickVariant}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dish.variants.map((v) => {
              const active = v.id === variant?.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  className={[
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-[var(--shu)] bg-[var(--shu-dim)]"
                      : "border-[var(--line)] bg-[var(--surface-2)]",
                  ].join(" ")}
                >
                  <div className="text-[14px] font-medium">
                    {tr.text(v, "label", v.label)}
                  </div>
                  {v.note && (
                    <div className="text-[12px] text-[var(--faint)]">
                      {tr.text(v, "note", v.note)}
                    </div>
                  )}
                  <div className="mt-1 text-[14px] font-semibold tabular-nums">
                    {vnd(v.price, lang)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 text-[12px] uppercase tracking-wider text-[var(--faint)]">
          {t.dish.kitchenNote}
        </div>
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.dish.kitchenNotePlaceholder}
          maxLength={200}
        />
      </div>

      <div className="mt-4 pb-2">
        <Note>{restaurant.menuPriceNote}</Note>
      </div>
    </Sheet>
  );
}
