import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "zmp-ui";

import CartBar from "@/components/menu/cart-bar";
import DishGrid from "@/components/menu/dish-grid";
import DishSheet from "@/components/menu/dish-sheet";
import { BrandLogo, Chip, EmptyState, Note } from "@/components/ui";
import { IconChevronRight, IconClose, IconQR, IconSearch, IconCart } from "@/components/ui/icons";
import { Icon3DButcher } from "@/components/ui/icons-3d";
import { LangButton } from "@/components/ui/lang-switch";
import { Screen } from "@/components/ui/screen";

import { useRestaurant } from "@/hooks/use-restaurant";
import { useScrollSearchBar } from "@/hooks/use-scroll-search-bar";
import { useT, useTr, useLang } from "@/i18n";
import { haptic, scanTableQR } from "@/services/zalo";
import { cartCountAtom, tableIdAtom } from "@/state/atoms";
import { categoriesAtom, dishesAtom } from "@/state/content";
import { Dish } from "@/types";
import { deaccent } from "@/utils/format";

/* ─── Danh sách từ khoá placeholder chuyển động liên tục đồng bộ Trang Chủ ─── */
const SEARCH_PLACEHOLDERS = {
  vi: [
    "Tìm Bò Wagyu A5 nướng than hoa...",
    "Tìm Sashimi Cá Hồi Na Uy tươi sống...",
    "Tìm Tiệc Bếp Trưởng Omakase 12 ghế...",
    "Tìm Set Lẩu Shabu Shabu & Sukiyaki...",
    "Tìm Cơm Lươn Nhật sốt Kabayaki...",
    "Tìm Thịt Bò Tươi Butcher cắt lát...",
    "Tìm Sushi bụng cá ngừ Otoro béo ngậy...",
  ],
  en: [
    "Search Charcoal Grilled A5 Wagyu...",
    "Search Fresh Norwegian Salmon...",
    "Search Master Chef Omakase 12 seats...",
    "Search Shabu Shabu & Sukiyaki Boxes...",
    "Search Japanese Eel Donburi...",
    "Search Butcher Fresh Sliced Beef...",
    "Search Melting Otoro Bluefin Tuna...",
  ],
  ja: [
    "炭火焼きA5和牛を探す...",
    "新鮮な生サーモン刺身を探す...",
    "板前おまかせコース12席を探す...",
    "しゃぶしゃぶ＆すき焼きセットを探す...",
    "特製うな重・蒲焼きを探す...",
    "切り立て和牛精肉を探す...",
    "とろける本鮪大トロを探す...",
  ],
};

export default function MenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tableId, setTableId] = useAtom(tableIdAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const categories = useAtomValue(categoriesAtom);
  const dishes = useAtomValue(dishesAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();
  const [categoryId, setCategoryId] = useState<string>("");
  const [query, setQuery] = useState("");
  const { searchContainerStyle, inputProps, onScroll } = useScrollSearchBar({
    activeQuery: query,
  });
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentPlaceholders = useMemo(() => {
    return SEARCH_PLACEHOLDERS[lang] ?? SEARCH_PLACEHOLDERS.vi;
  }, [lang]);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  /* Chuyển động thay đổi placeholder liên tục mỗi 3.2 giây */
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % currentPlaceholders.length);
        setPlaceholderFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(interval);
  }, [currentPlaceholders.length]);

  // Chỉ hiển thị các nhóm món ăn phục vụ tại nhà hàng (tách riêng Butcher)
  const restaurantCategories = useMemo(
    () => categories.filter((c) => c.id !== "butcher"),
    [categories]
  );

  /* Nhóm món đến từ máy chủ hoặc truyền qua URL/state. */
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const requestedCat = params.get("category") || (location.state as any)?.category;
    const requestedQuery = params.get("q") || params.get("search");
    if (requestedQuery) {
      setQuery(requestedQuery);
    }
    if (requestedCat === "butcher") {
      navigate("/butcher", { replace: true });
      return;
    }
    if (requestedCat && restaurantCategories.some((c) => c.id === requestedCat)) {
      setCategoryId(requestedCat);
    } else if (!categoryId && restaurantCategories.length) {
      setCategoryId(restaurantCategories[0].id);
    }
  }, [restaurantCategories, categoryId, location, navigate]);

  /* Tìm theo cả tên đã dịch (chỉ tìm trong thực đơn nhà hàng) */
  const results = useMemo(() => {
    const q = deaccent(query.trim());
    if (!q) return null;
    return dishes.filter((d) =>
      d.categoryId !== "butcher" &&
      [d.name, d.romaji, d.jp, tr.text(d, "name", d.name)].some(
        (s) => s && deaccent(s).includes(q)
      )
    );
  }, [query, dishes, tr]);

  const visible = results ?? dishes.filter((d) => d.categoryId === categoryId);
  const category = restaurantCategories.find((c) => c.id === categoryId);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    listRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    // QR tại bàn được mã hoá dạng "...table=A3" hoặc chỉ mã bàn.
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
  };

  return (
    <Screen name="menu" pad={false} onScroll={onScroll}>
      {/* ─── 1. THANH ĐẦU TRANG & TÌM KIẾM ĐỒNG BỘ TRANG CHỦ ─── */}
      <header
        className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-3 pb-1.5 shadow-sm transition-colors"
        style={{
          paddingTop: "calc(max(var(--sat), env(safe-area-inset-top, 0px)) + 26px)",
          overflowAnchor: "none",
        }}
      >
        {/* Hàng 1: Logo ngang, Quét QR, Giỏ hàng, Đổi ngôn ngữ */}
        <div className="flex h-9 items-center justify-between gap-2">
          <BrandLogo
            variant="horizontal"
            className="h-[25px] w-auto object-contain select-none"
          />

          <div className="flex items-center gap-1.5 head-safe">
            {/* Nút quét QR tại bàn */}
            <button
              aria-label={t.menu.scanTable}
              onClick={handleScan}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--washi)] border border-[var(--line)] transition-all active:scale-95"
            >
              <IconQR size={17} />
            </button>

            {/* Nút giỏ hàng có badge đỏ */}
            <button
              aria-label="Giỏ hàng"
              onClick={() => {
                haptic("light");
                navigate("/cart");
              }}
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--washi)] border border-[var(--line)] transition-all active:scale-95"
            >
              <IconCart size={17} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--shu)] px-1 text-[9px] font-bold text-white shadow-md shadow-[var(--shu)]/40 ring-2 ring-[var(--surface)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Đổi ngôn ngữ */}
            <LangButton />
          </div>
        </div>

        {/* Hàng 2: Thanh tìm kiếm TMĐT hoạt động trực tiếp với Placeholder chuyển động (ẩn khi kéo xuống, hiện khi dừng lại) */}
        <div className="relative" style={searchContainerStyle}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!query.trim()) {
                const term = currentPlaceholders[placeholderIndex]
                  .replace(/^(Tìm|Search)\s+/, "")
                  .replace(/\s*(を探す)?\.\.\.$/, "");
                setQuery(term);
              }
              haptic("light");
            }}
            className="flex items-center gap-2"
          >
            {/* Ô tìm kiếm bo tròn 50% */}
            <div className="flex flex-1 items-center gap-2 h-[36px] rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3.5 transition-all focus-within:border-[var(--shu)] focus-within:ring-1 focus-within:ring-[var(--shu)]/30">
              <IconSearch size={16} className="text-[var(--shu)] shrink-0" />

              {/* Input với placeholder chuyển động mượt mà */}
              <div className="relative flex-1 flex items-center h-full overflow-hidden">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={inputProps.onFocus}
                  onBlur={inputProps.onBlur}
                  className="relative z-10 w-full bg-transparent text-[13px] text-[var(--washi)] outline-none border-none"
                />
                {!query && (
                  <div
                    className={`absolute inset-0 flex items-center pointer-events-none transition-all duration-300 ease-out text-[12.5px] text-[var(--muted)] select-none ${
                      placeholderFade
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-2"
                    }`}
                  >
                    <span className="truncate">
                      {currentPlaceholders[placeholderIndex]}
                    </span>
                  </div>
                )}
              </div>

              {query && (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => {
                    haptic("light");
                    setQuery("");
                  }}
                  className="text-[var(--muted)] hover:text-[var(--washi)] p-1 shrink-0 z-20"
                >
                  <IconClose size={14} />
                </button>
              )}
            </div>

            {/* Nút tìm kiếm nằm ngoài ô tìm kiếm */}
            <button
              type="submit"
              className="h-[36px] px-3.5 rounded-full bg-[var(--shu)] text-[12px] font-bold text-white shadow-sm active:scale-95 transition-transform shrink-0 flex items-center justify-center z-20"
            >
              {lang === "ja" ? "検索" : lang === "en" ? "Search" : "Tìm kiếm"}
            </button>
          </form>
        </div>

        {/* Hàng 3: Danh mục món ăn dạng lướt ngang */}
        <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
          {restaurantCategories.map((c) => (
            <Chip
              key={c.id}
              active={!query && c.id === categoryId}
              onClick={() => {
                haptic("light");
                if (query) setQuery("");
                pickCategory(c.id);
              }}
            >
              {tr.text(c, "name", c.name)}
            </Chip>
          ))}
        </div>
      </header>

      <div
        className="page-pad pt-3"
        ref={listRef}
        style={{
          paddingBottom:
            cartCount > 0
              ? "calc(var(--nav-h) + var(--sab) + 84px)"
              : undefined,
        }}
      >
        {tableId && (
          <div className="mb-4 flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-[12px] shadow-sm">
            <IconQR size={15} className="text-[var(--shu)]" />
            <span className="flex-1">{t.menu.orderingAtTable(tableId)}</span>
            <button
              onClick={() => setTableId(null)}
              className="text-[var(--muted)] underline"
            >
              {t.menu.clearTable}
            </button>
          </div>
        )}

        {/* ── Lối tắt sang Miyako Butcher (Thịt bò tươi mang về) ── */}
        {!query.trim() && (
          <div
            onClick={() => {
              haptic("light");
              navigate("/butcher");
            }}
            className="butcher-card mb-4 flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--line-strong)] p-3 text-[13px] transition-all active:scale-[0.99] shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Icon3DButcher size={28} className="shrink-0" />
              <div>
                <div className="font-medium text-[var(--gold)]">
                  Miyako Wagyu Butcher Shop
                </div>
                <div className="text-[11.5px] text-[var(--muted)]">
                  {lang === "ja"
                    ? "テイクアウト用 切り立てA5和牛＆USプライムビーフ"
                    : lang === "en"
                    ? "Fresh Japanese A5 Wagyu & US Prime beef to take home"
                    : "Thịt bò tươi Wagyu A5 & Bò Mỹ sơ chế mang về"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-[12px] font-medium text-[var(--gold)]">
              <span>{lang === "ja" ? "今すぐ見る" : lang === "en" ? "View now" : "Xem ngay"}</span>
              <IconChevronRight size={14} />
            </div>
          </div>
        )}

        {results ? (
          <div className="mb-2 text-[13px] text-[var(--muted)]">
            {t.menu.results(results.length, query.trim())}
          </div>
        ) : (
          category && (
            <div className="mb-1">
              <div className="jp text-[12px] tracking-[0.25em] text-[var(--shu)]">
                {category.jp}
              </div>
              <h2 className="font-display text-[22px] leading-tight">
                {tr.text(category, "name", category.name)}
              </h2>
              <div className="mt-1 text-[12px] italic text-[var(--faint)]">
                {category.romaji} · {t.common.dishes(visible.length)}
              </div>
            </div>
          )
        )}

        {visible.length === 0 ? (
          <EmptyState
            kanji="無"
            title={t.menu.emptyTitle}
            hint={t.menu.emptyHint}
          />
        ) : (
          <DishGrid
            dishes={visible}
            onOpen={setOpenDish}
            className="mt-4"
          />
        )}

        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <Note>{restaurant.menuPriceNote}</Note>
        </div>
      </div>

      <CartBar />
      <DishSheet dish={openDish} onClose={() => setOpenDish(null)} />
    </Screen>
  );
}
