import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "zmp-ui";

import DishGrid from "@/components/menu/dish-grid";
import DishSheet from "@/components/menu/dish-sheet";
import CartBar from "@/components/menu/cart-bar";
import { Button, EmptyState } from "@/components/ui";
import { BackHeader, Screen } from "@/components/ui/screen";
import { useT } from "@/i18n";
import { favoritesAtom, cartCountAtom } from "@/state/atoms";
import { dishesByIdAtom } from "@/state/content";
import { Dish } from "@/types";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites] = useAtom(favoritesAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const dishesById = useAtomValue(dishesByIdAtom);
  const t = useT();
  const [openDish, setOpenDish] = useState<Dish | null>(null);

  const dishes = favorites
    .map((id) => dishesById[id])
    .filter(Boolean) as Dish[];

  return (
    <Screen name="favorites">
      <BackHeader title={t.favorites.title} />
      {dishes.length === 0 ? (
        <EmptyState
          kanji="空"
          title={t.favorites.emptyTitle}
          hint={t.favorites.emptyHint}
          action={
            <Button onClick={() => navigate("/menu")}>
              {t.favorites.openMenu}
            </Button>
          }
        />
      ) : (
        <div
          style={{
            marginBottom:
              cartCount > 0
                ? "calc(var(--nav-h) + var(--sab) + 84px)"
                : undefined,
          }}
        >
          <DishGrid dishes={dishes} onOpen={setOpenDish} />
        </div>
      )}
      <CartBar />
      <DishSheet dish={openDish} onClose={() => setOpenDish(null)} />
    </Screen>
  );
}
