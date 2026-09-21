import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "zmp-ui";

import CartBar from "@/components/menu/cart-bar";
import DishGrid from "@/components/menu/dish-grid";
import DishSheet from "@/components/menu/dish-sheet";
import { BrandLogo, Chip, EmptyState } from "@/components/ui";
import {
  IconClose,
  IconCart,
  IconQR,
  IconSearch,
} from "@/components/ui/icons";
import {
  Icon3DDelivery,
  Icon3DKnife,
  Icon3DMeat,
  Icon3DSnowflake,
} from "@/components/ui/icons-3d";
import { LangButton } from "@/components/ui/lang-switch";
import { Screen } from "@/components/ui/screen";
import { useLang, useT, useTr } from "@/i18n";
import { haptic, scanTableQR } from "@/services/zalo";
import { cartCountAtom, tableIdAtom } from "@/state/atoms";
import { dishesAtom } from "@/state/content";
import { Dish } from "@/types";
import { deaccent } from "@/utils/format";

type ButcherTab = "all" | "wagyu" | "us" | "box" | "sauce";

interface SubFilter {
  id: ButcherTab;
  label: { vi: string; en: string; ja: string };
  icon?: string;
}

const SUB_FILTERS: SubFilter[] = [
  { id: "all", label: { vi: "Tất cả", en: "All", ja: "すべて" } },
  { id: "wagyu", label: { vi: "Wagyu Nhật A5", en: "A5 Wagyu", ja: "A5和牛" } },
  { id: "us", label: { vi: "Bò Mỹ Prime", en: "US Prime", ja: "USプライム" } },
  { id: "box", label: { vi: "Set Nướng & Lẩu", en: "Home Boxes", ja: "セット" } },
  { id: "sauce", label: { vi: "Sốt & Gia vị", en: "Sauces", ja: "特製タレ" } },
];

/* ─── Danh sách từ khoá placeholder chuyển động liên tục cho Butcher ─── */
const BUTCHER_SEARCH_PLACEHOLDERS = [
  "Tìm Bò Wagyu A5 nướng than...",
  "Tìm Bò Mỹ Prime cắt Steak...",
  "Tìm Set thịt nướng BBQ tại gia...",
  "Tìm Ba chỉ bò lẩu Shabu Shabu...",
  "Tìm Sốt ướp Yakiniku đặc biệt...",
  "Tìm Lõi nạc vai Wagyu A5...",
];

export default function ButcherPage() {
  const navigate = useNavigate();
  const dishes = useAtomValue(dishesAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const [, setTableId] = useAtom(tableIdAtom);
  const lang = useLang();
  const t = useT();
  const tr = useTr();

  const [tab, setTab] = useState<ButcherTab>("all");
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  /* Chuyển động thay đổi placeholder liên tục mỗi 3.2 giây */
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex(
          (prev) => (prev + 1) % BUTCHER_SEARCH_PLACEHOLDERS.length
        );
        setPlaceholderFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
  };

  // Tất cả sản phẩm thuộc nhóm Butcher
  const butcherDishes = useMemo(
    () => dishes.filter((d) => d.categoryId === "butcher"),
    [dishes]
  );

  // Lọc theo tìm kiếm hoặc sub-filter
  const visible = useMemo(() => {
    let list = butcherDishes;
    const q = deaccent(searchQuery.trim());
    if (q) {
      list = list.filter((d) =>
        [d.name, d.romaji, d.jp, tr.text(d, "name", d.name)].some(
          (s) => s && deaccent(s).includes(q)
        )
      );
    } else {
      list = list.filter((d) => {
        if (tab === "wagyu") return d.id.includes("a5");
        if (tab === "us") return d.id.includes("us");
        if (tab === "box") return d.id.includes("set") || d.id.includes("box");
        if (tab === "sauce") return d.id.includes("sauce");
        return true;
      });
    }
    return list;
  }, [butcherDishes, tab, searchQuery, tr]);

  return (
    <Screen name="butcher" pad={false}>
      {/* ─── 1. THANH ĐẦU TRANG & TÌM KIẾM ĐỒNG BỘ TRANG CHỦ ─── */}
      <header
        className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-3 pb-1.5 shadow-sm transition-colors"
        style={{
          paddingTop: "calc(max(var(--sat), env(safe-area-inset-top, 0px)) + 26px)",
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

        {/* Hàng 2: Thanh tìm kiếm TMĐT hoạt động trực tiếp với Placeholder chuyển động */}
        <div className="relative mt-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!searchQuery.trim()) {
                const term = BUTCHER_SEARCH_PLACEHOLDERS[placeholderIndex]
                  .replace(/^Tìm\s+/, "")
                  .replace(/\.\.\.$/, "");
                setSearchQuery(term);
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="relative z-10 w-full bg-transparent text-[13px] text-[var(--washi)] outline-none border-none"
                />
                {!searchQuery && (
                  <div
                    className={`absolute inset-0 flex items-center pointer-events-none transition-all duration-300 ease-out text-[12.5px] text-[var(--muted)] select-none ${
                      placeholderFade
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-2"
                    }`}
                  >
                    <span className="truncate">
                      {BUTCHER_SEARCH_PLACEHOLDERS[placeholderIndex]}
                    </span>
                  </div>
                )}
              </div>

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => {
                    haptic("light");
                    setSearchQuery("");
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
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Hàng 3: Danh mục thịt (Sub-filters Chips) */}
        <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
          {SUB_FILTERS.map((f) => (
            <Chip
              key={f.id}
              active={!searchQuery && tab === f.id}
              onClick={() => {
                haptic("light");
                if (searchQuery) setSearchQuery("");
                setTab(f.id);
              }}
            >
              {f.label[lang] ?? f.label.vi}
            </Chip>
          ))}
        </div>
      </header>

      <div
        className="page-pad pt-3"
        style={{
          paddingBottom:
            cartCount > 0
              ? "calc(var(--nav-h) + var(--sab) + 84px)"
              : "calc(var(--nav-h) + var(--sab) + 20px)",
        }}
      >
        {/* Kết quả tìm kiếm nếu có */}
        {searchQuery.trim() && (
          <div className="mb-2 text-[13px] text-[var(--muted)]">
            {t.menu.results(visible.length, searchQuery.trim())}
          </div>
        )}

        {/* ── Giới thiệu dịch vụ Butcher cao cấp (ẩn khi đang tìm kiếm) ── */}
        {!searchQuery.trim() && (
          <div className="mb-5 rounded-2xl border border-[var(--line-strong)] bg-gradient-to-b from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-4 shadow-sm">
          {/* Tiêu đề & Icon 3D thịt Wagyu */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold-dim)] to-[var(--surface-3)] p-1 shadow-sm">
              <Icon3DMeat size={36} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/30 px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[var(--gold)] uppercase">
                  A5 Wagyu Specialist
                </span>
              </div>
              <h2 className="mt-1 font-display text-[16.5px] font-bold text-[var(--washi)] tracking-wide">
                Miyako Wagyu Butcher Shop
              </h2>
              <div className="jp text-[11px] text-[var(--gold)]">
                宮古 和牛精肉店 · Thịt tươi sơ chế theo yêu cầu
              </div>
            </div>
          </div>

          {/* Đoạn mô tả dịch vụ */}
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--muted)]">
            {lang === "vi"
              ? "Thịt bò Wagyu Nhật Bản A5 & Bò Mỹ Prime cắt tươi trong ngày. Đóng khay hút chân không tiệt trùng kèm đá gel giữ nhiệt chuẩn tươi ngon."
              : lang === "ja"
              ? "厳選されたA5ランク日本産和牛とUSプライムビーフ。ステーキ、焼肉、しゃぶしゃぶ用など、ご希望の厚さに無料カット。保冷剤入り真空パックでお届け。"
              : "Fresh Japanese A5 Wagyu & US Prime beef cut daily to order. Vacuum-sealed with thermal gel ice packs for guaranteed freshness."}
          </p>

          {/* Các tùy chọn cắt lát nổi bật */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
            <span className="rounded-lg bg-[var(--surface-3)] border border-[var(--line)] px-2.5 py-1 font-medium text-[var(--washi)] shadow-2xs">
              Steak 2.5cm
            </span>
            <span className="rounded-lg bg-[var(--surface-3)] border border-[var(--line)] px-2.5 py-1 font-medium text-[var(--washi)] shadow-2xs">
              Yakiniku 3-4mm
            </span>
            <span className="rounded-lg bg-[var(--surface-3)] border border-[var(--line)] px-2.5 py-1 font-medium text-[var(--washi)] shadow-2xs">
              Lẩu Shabu 1.5mm
            </span>
            <span className="rounded-lg bg-[var(--surface-3)] border border-[var(--line)] px-2.5 py-1 font-medium text-[var(--washi)] shadow-2xs">
              Nguyên tảng
            </span>
          </div>

          {/* 3 Tiêu chí dịch vụ (liền mạch, không chia card) */}
          <div className="relative z-10 mt-3.5 grid grid-cols-3 divide-x divide-[var(--line)] border-t border-[var(--line)] pt-3 text-center">
            {/* 1. Giữ lạnh 48h */}
            <div className="flex flex-col items-center px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 mb-1">
                <Icon3DSnowflake size={24} />
              </div>
              <span className="text-[11.5px] font-bold text-[var(--washi)] leading-tight">
                Giữ lạnh 48h
              </span>
              <span className="mt-0.5 text-[9.5px] text-[var(--faint)]">
                Đá gel tiệt trùng
              </span>
            </div>

            {/* 2. Cắt theo món */}
            <div className="flex flex-col items-center px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 mb-1">
                <Icon3DKnife size={24} />
              </div>
              <span className="text-[11.5px] font-bold text-[var(--washi)] leading-tight">
                Cắt theo món
              </span>
              <span className="mt-0.5 text-[9.5px] text-[var(--faint)]">
                Steak/Nướng/Lẩu
              </span>
            </div>

            {/* 3. Giao tận nơi */}
            <div className="flex flex-col items-center px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 mb-1">
                <Icon3DDelivery size={24} />
              </div>
              <span className="text-[11.5px] font-bold text-[var(--washi)] leading-tight">
                Giao tận nơi
              </span>
              <span className="mt-0.5 text-[9.5px] text-[var(--faint)]">
                Hoặc lấy tại quán
              </span>
            </div>
          </div>
        </div>
        )}

        {/* ── Danh sách thịt & sản phẩm ── */}
        {visible.length === 0 ? (
          <EmptyState
            kanji="肉"
            title="Đang cập nhật sản phẩm"
            hint="Vui lòng quay lại sau hoặc liên hệ nhà hàng để được cắt theo yêu cầu."
          />
        ) : (
          <DishGrid
            dishes={visible}
            onOpen={(d) => setOpenDish(d)}
            className="mt-2"
          />
        )}

        <div className="mt-5 text-center text-[11.5px] text-[var(--faint)]">
          ✨ Miyako bảo đảm 100% thịt bò Wagyu nhập khẩu chính ngạch Nhật Bản
        </div>
      </div>

      <CartBar />

      <DishSheet dish={openDish} onClose={() => setOpenDish(null)} />
    </Screen>
  );
}
