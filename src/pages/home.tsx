import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "zmp-ui";

import CartBar from "@/components/menu/cart-bar";
import DishGrid from "@/components/menu/dish-grid";
import DishSheet from "@/components/menu/dish-sheet";
import { BrandLogo, Price, Sheet } from "@/components/ui";
import {
  IconCart,
  IconChat,
  IconCheck,
  IconChevronRight,
  IconClipboard,
  IconClose,
  IconHeart,
  IconPhone,
  IconPin,
  IconPlus,
  IconQR,
  IconSearch,
} from "@/components/ui/icons";
import { deaccent } from "@/utils/format";
import {
  Icon3DBooking,
  Icon3DButcher,
  Icon3DDelivery,
  Icon3DFavorite,
  Icon3DFire,
  Icon3DGift,
  Icon3DHotline,
  Icon3DHotpot,
  Icon3DLightning,
  Icon3DMapPin,
  Icon3DMeat,
  Icon3DMenu,
  Icon3DOmakase,
  Icon3DPoints,
  Icon3DShield,
  Icon3DSnowflake,
  Icon3DStar,
  Icon3DSushi,
  Icon3DTakeaway,
  Icon3DVoucher,
} from "@/components/ui/icons-3d";
import { LangButton } from "@/components/ui/lang-switch";
import { Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useScrollSearchBar } from "@/hooks/use-scroll-search-bar";
import { useLang, useT, useTr } from "@/i18n";
import { dishFromPrice } from "@/data/menu";
import { callHotline, chatWithOA, haptic, openMap, scanTableQR } from "@/services/zalo";
import { cartCountAtom, favoritesAtom, tableIdAtom } from "@/state/atoms";
import { dishesAtom, omakaseByIdAtom } from "@/state/content";
import { Dish } from "@/types";
import {
  heroDon,
  heroHotpot,
  heroOmakase,
  heroSushi,
  heroWagyu,
  img,
} from "@/utils/images";

interface LocalizedString {
  vi: string;
  en: string;
  ja: string;
}

/* ─── Danh sách Banner Carousel quảng cáo chuẩn TMĐT ─── */
interface RawBanner {
  id: string;
  tag: LocalizedString;
  title: LocalizedString;
  sub: LocalizedString;
  cta: LocalizedString;
  route: string;
  img: string;
  color: string;
}

const RAW_BANNERS: RawBanner[] = [
  {
    id: "omakase",
    tag: {
      vi: "OMAKASE VIP",
      en: "VIP OMAKASE",
      ja: "VIPおまかせ",
    },
    title: {
      vi: "Tiệc Bếp Trưởng Omakase",
      en: "Master Chef Omakase Feast",
      ja: "総料理長 おまかせコース",
    },
    sub: {
      vi: "Trải nghiệm ẩm thực Kaiseki đỉnh cao tại quầy Bar riêng tư 12 ghế",
      en: "Exquisite Kaiseki dining at an exclusive private 12-seat counter",
      ja: "限定12席の檜カウンターで味わう至高の会席・江戸前料理",
    },
    cta: {
      vi: "Xem suất tiệc",
      en: "Explore sets",
      ja: "コースを見る",
    },
    route: "/omakase",
    img: heroOmakase,
    color: "from-black/80 via-black/40 to-transparent",
  },
  {
    id: "butcher",
    tag: {
      vi: "MIYAKO BUTCHER",
      en: "MIYAKO BUTCHER",
      ja: "宮古 精肉店",
    },
    title: {
      vi: "Thịt Bò Wagyu A5 Tươi",
      en: "Fresh Japanese A5 Wagyu",
      ja: "切り立て A5ランク黒毛和牛",
    },
    sub: {
      vi: "Sơ chế cắt theo yêu cầu: Steak, Lẩu Shabu, Nướng Yakiniku",
      en: "Custom-cut to order: Steak, Shabu Hotpot, Yakiniku Grill",
      ja: "ステーキ・しゃぶしゃぶ・焼肉用にお好みの厚さでカット",
    },
    cta: {
      vi: "Mua mang về",
      en: "Shop meats",
      ja: "精肉を見る",
    },
    route: "/butcher",
    img: heroWagyu,
    color: "from-[#881008]/85 via-black/50 to-transparent",
  },
  {
    id: "hotpot",
    tag: {
      vi: "SET LẨU TẠI GIA",
      en: "HOME HOTPOT SET",
      ja: "おうち鍋セット",
    },
    title: {
      vi: "Lẩu Shabu & Sukiyaki",
      en: "Shabu & Sukiyaki Sets",
      ja: "特選しゃぶしゃぶ＆すき焼き",
    },
    sub: {
      vi: "Tặng kèm nước dùng hầm 12h, rau nấm và sốt mè rang Nhật Bản",
      en: "Free 12h slow-simmered broth, fresh greens, and sesame sauce",
      ja: "12時間煮込み特製出汁・旬の野菜・特製胡麻だれ付き",
    },
    cta: {
      vi: "Đặt giao ngay",
      en: "Order delivery",
      ja: "今すぐ注文",
    },
    route: "/menu",
    img: heroHotpot,
    color: "from-black/80 via-black/40 to-transparent",
  },
  {
    id: "sushi",
    tag: {
      vi: "TOYOSU DAILY",
      en: "TOYOSU DAILY",
      ja: "豊洲市場より毎日空輸",
    },
    title: {
      vi: "Sashimi Tươi Sống Mỗi Ngày",
      en: "Fresh Daily Sashimi",
      ja: "朝獲れ 鮮魚のお造り",
    },
    sub: {
      vi: "Cá ngừ đại dương Hon Maguro & bụng cá hồi Na Uy thượng hạng",
      en: "Prime Pacific bluefin Hon-Maguro & fresh Norwegian salmon belly",
      ja: "本鮪大トロとノルウェー産最高級サーモンの贅沢盛り合わせ",
    },
    cta: {
      vi: "Khám phá menu",
      en: "Explore menu",
      ja: "メニューを見る",
    },
    route: "/menu",
    img: heroSushi,
    color: "from-black/80 via-black/40 to-transparent",
  },
];

/* ─── Danh sách từ khoá placeholder chuyển động liên tục ─── */
const HOME_SEARCH_PLACEHOLDERS = {
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

/* ─── Tab phân loại feed món ăn TMĐT ─── */
type FeedTab = "all" | "sashimi" | "wagyu" | "hotpot" | "butcher";

const RAW_FEED_TABS: { id: FeedTab; label: LocalizedString; icon: React.ReactNode }[] = [
  {
    id: "all",
    label: { vi: "Gợi ý hôm nay", en: "Chef's Picks", ja: "本日のおすすめ" },
    icon: <Icon3DFire size={16} />,
  },
  {
    id: "sashimi",
    label: { vi: "Sashimi & Sushi", en: "Sashimi & Sushi", ja: "刺身・寿司" },
    icon: <Icon3DSushi size={16} />,
  },
  {
    id: "wagyu",
    label: { vi: "Wagyu Thượng Hạng", en: "Premium Wagyu", ja: "特選和牛" },
    icon: <Icon3DMeat size={16} />,
  },
  {
    id: "hotpot",
    label: { vi: "Lẩu & Món Nóng", en: "Hotpot & Warm", ja: "鍋・温物" },
    icon: <Icon3DHotpot size={16} />,
  },
  {
    id: "butcher",
    label: { vi: "Thịt Bò Mang Về", en: "Takeaway Meats", ja: "精肉テイクアウト" },
    icon: <Icon3DTakeaway size={16} />,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [tableId, setTableId] = useAtom(tableIdAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const dishes = useAtomValue(dishesAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();

  const [activeSlide, setActiveSlide] = useState(0);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
  const [openDish, setOpenDish] = useState<Dish | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [hotlineOpen, setHotlineOpen] = useState(false);
  const [mapsOpen, setMapsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { searchContainerStyle, inputProps, onScroll } = useScrollSearchBar({
    activeQuery: searchQuery,
  });
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  const localizedBanners = useMemo(() => {
    return RAW_BANNERS.map((b) => ({
      id: b.id,
      tag: b.tag[lang] ?? b.tag.vi,
      title: b.title[lang] ?? b.title.vi,
      sub: b.sub[lang] ?? b.sub.vi,
      cta: b.cta[lang] ?? b.cta.vi,
      route: b.route,
      img: b.img,
      color: b.color,
    }));
  }, [lang]);

  const currentPlaceholders = useMemo(() => {
    return HOME_SEARCH_PLACEHOLDERS[lang] ?? HOME_SEARCH_PLACEHOLDERS.vi;
  }, [lang]);

  const feedTabs = useMemo(() => {
    return RAW_FEED_TABS.map((tb) => ({
      id: tb.id,
      label: tb.label[lang] ?? tb.label.vi,
      icon: tb.icon,
    }));
  }, [lang]);

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

  /* Kết quả tìm kiếm trực tiếp trên Trang Chủ */
  const liveSearchResults = useMemo(() => {
    const q = deaccent(searchQuery.trim());
    if (!q) return [];
    return dishes.filter((d) =>
      [d.name, d.romaji, d.jp, tr.text(d, "name", d.name)].some(
        (s) => s && deaccent(s).includes(q)
      )
    );
  }, [searchQuery, dishes, tr]);

  /* Tự động xoay vòng Banner sau mỗi 4.5 giây */
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % localizedBanners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [localizedBanners.length]);

  /* Quét QR mã bàn */
  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
  };

  /* Toggle yêu thích */
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("light");
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* Danh sách món bán chạy (Deals hôm nay) */
  const flashDeals = useMemo(
    () =>
      dishes
        .filter((d) => d.badges?.includes("best-seller") || d.badges?.includes("signature"))
        .slice(0, 8),
    [dishes]
  );

  /* Lọc feed theo tab TMĐT */
  const feedDishes = useMemo(() => {
    if (feedTab === "sashimi") {
      return dishes.filter((d) => d.categoryId === "sashimi" || d.categoryId === "sushi");
    }
    if (feedTab === "wagyu") {
      return dishes.filter(
        (d) =>
          d.id.includes("wagyu") ||
          d.categoryId === "nuong" ||
          d.name.toLowerCase().includes("bò")
      );
    }
    if (feedTab === "hotpot") {
      return dishes.filter((d) => d.categoryId === "lau" || d.categoryId === "nong");
    }
    if (feedTab === "butcher") {
      return dishes.filter((d) => d.categoryId === "butcher");
    }
    return dishes;
  }, [dishes, feedTab]);

  return (
    <Screen name="home" pad={false} onScroll={onScroll}>
      {/* ─── 1. THANH TÌM KIẾM TMĐT TRÊN CÙNG (STICKY HEADER) ─── */}
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
              aria-label="Cart"
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
              if (!searchQuery.trim()) {
                const term = currentPlaceholders[placeholderIndex]
                  .replace(/^(Tìm|Search)\s+/, "")
                  .replace(/\s*(を探す)?\.\.\.$/, "");
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
                  onFocus={inputProps.onFocus}
                  onBlur={inputProps.onBlur}
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
                      {currentPlaceholders[placeholderIndex]}
                    </span>
                  </div>
                )}
              </div>

              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear"
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
              {lang === "ja" ? "検索" : lang === "en" ? "Search" : "Tìm kiếm"}
            </button>
          </form>

          {/* Bảng kết quả tìm kiếm trực tiếp nổi bên dưới */}
          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[360px] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--line)] text-[11.5px] text-[var(--muted)]">
                <span>
                  {lang === "ja"
                    ? `「${searchQuery}」の検索結果 ${liveSearchResults.length} 件`
                    : lang === "en"
                    ? `Found ${liveSearchResults.length} dishes for "${searchQuery}"`
                    : `Tìm thấy ${liveSearchResults.length} món cho "${searchQuery}"`}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[11px] text-[var(--shu)] hover:underline font-medium"
                >
                  {t.common.close}
                </button>
              </div>

              {liveSearchResults.length === 0 ? (
                <div className="py-5 text-center text-[12.5px] text-[var(--muted)]">
                  {lang === "ja"
                    ? `「${searchQuery}」に一致するお料理が見つかりませんでした`
                    : lang === "en"
                    ? `No dishes found matching "${searchQuery}"`
                    : `Không tìm thấy món ăn phù hợp với "${searchQuery}"`}
                </div>
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  {liveSearchResults.slice(0, 6).map((d) => {
                    const photo = img(d.image);
                    const name = tr.text(d, "name", d.name);
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          haptic("light");
                          setOpenDish(d);
                        }}
                        className="flex items-center justify-between py-2 cursor-pointer active:bg-[var(--surface-2)] rounded-lg px-1.5 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {photo ? (
                            <img
                              src={photo}
                              alt={name}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] shrink-0">
                              <Icon3DMenu size={22} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-semibold text-[var(--washi)]">
                              {name}
                            </div>
                            <div className="truncate text-[10.5px] text-[var(--faint)]">
                              {d.romaji || d.jp}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Price
                            value={dishFromPrice(d)}
                            from={!!d.variants?.length}
                            className="text-[12.5px] font-bold text-[var(--shu)]"
                          />
                          <button
                            type="button"
                            aria-label="Add to cart"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic("light");
                              setOpenDish(d);
                            }}
                            className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[var(--shu)] text-white shadow-sm active:scale-90"
                          >
                            <IconPlus size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {liveSearchResults.length > 6 && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic("light");
                        navigate(`/menu?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="w-full pt-2 pb-1 text-center text-[11.5px] font-bold text-[var(--shu)] hover:underline block"
                    >
                      {lang === "ja"
                        ? `お品書きで全 ${liveSearchResults.length} 品を見る ➔`
                        : lang === "en"
                        ? `View all ${liveSearchResults.length} dishes on Menu ➔`
                        : `Xem tất cả ${liveSearchResults.length} món trên Thực đơn ➔`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─── 2. BANNER CAROUSEL QUẢNG CÁO TMĐT ─── */}
      <section className="mt-2.5 px-3">
        <div className="relative overflow-hidden rounded-xl shadow-sm">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {localizedBanners.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  haptic("light");
                  navigate(b.route);
                }}
                className="relative h-[138px] w-full shrink-0 cursor-pointer overflow-hidden select-none"
              >
                <img
                  src={b.img}
                  alt={b.title}
                  className="h-full w-full object-cover"
                />
                {/* Lớp phủ chuyển sắc */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${b.color} p-3 flex flex-col justify-end text-white`}
                >
                  <span className="w-fit rounded-full bg-[var(--shu)]/90 px-2 py-0.5 text-[9.5px] font-bold tracking-wider uppercase text-white shadow-sm">
                    {b.tag}
                  </span>
                  <h3 className="mt-1 font-display text-[16px] font-semibold leading-snug drop-shadow-md">
                    {b.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-1 text-[11.5px] opacity-90 drop-shadow-sm">
                    {b.sub}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-[#ffd285]">
                    <span>{b.cta}</span>
                    <IconChevronRight size={13} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots chỉ số slide */}
          <div className="absolute bottom-2 right-2.5 flex items-center gap-1.5 z-10">
            {localizedBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  activeSlide === idx ? "w-3.5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. KHỐI TIỆN ÍCH & DANH MỤC THỐNG NHẤT (SINGLE BLOCK) ─── */}
      <section className="mt-4 px-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="grid grid-cols-4 gap-y-3 gap-x-1">
            {/* 1. Menu */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/menu");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DMenu size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "お品書き" : "Menu"}
              </span>
            </button>

            {/* 2. Omakase */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/omakase");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DOmakase size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "おまかせ" : "Omakase"}
              </span>
            </button>

            {/* 3. Thịt Tươi */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/butcher");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DButcher size={54} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--shu)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "和牛精肉" : lang === "en" ? "Butcher" : "Thịt Tươi"}
              </span>
            </button>

            {/* 4. Đặt Bàn */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/booking");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DBooking size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "ご予約" : lang === "en" ? "Booking" : "Đặt Bàn"}
              </span>
            </button>

            {/* 5. Tích Điểm */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/rewards");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DPoints size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "ポイント" : lang === "en" ? "Rewards" : "Tích Điểm"}
              </span>
            </button>

            {/* 6. Voucher */}
            <button
              onClick={() => {
                haptic("light");
                setVoucherOpen(true);
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DVoucher size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "優待券" : "Voucher"}
              </span>
            </button>

            {/* 7. Hotline */}
            <button
              onClick={() => {
                haptic("light");
                setHotlineOpen(true);
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DHotline size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Hotline
              </span>
            </button>

            {/* 8. Maps */}
            <button
              onClick={() => {
                haptic("light");
                setMapsOpen(true);
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-14 w-14 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DMapPin size={54} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                {lang === "ja" ? "店舗位置" : lang === "en" ? "Map" : "Bản đồ"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── THÔNG BÁO BÀN (NẾU ĐANG QUÉT MÃ BÀN) ─── */}
      {tableId && (
        <section className="mt-4 px-3">
          <button
            onClick={() => navigate("/menu")}
            className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--shu)] bg-[var(--shu-dim)] p-2 text-left shadow-sm"
          >
            <IconQR size={18} className="text-[var(--shu)] shrink-0" />
            <span className="flex-1">
              <span className="block text-[12.5px] font-semibold text-[var(--shu)]">
                {t.home.atTable(tableId)}
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                {t.home.atTableHint}
              </span>
            </span>
            <span className="rounded-lg bg-[var(--shu)] px-2 py-0.5 text-[10.5px] font-bold text-white">
              {t.home.order} ➔
            </span>
          </button>
        </section>
      )}

      {/* ─── 4. FLASH SALE / MÓN BÁN CHẠY HÔM NAY (DEALS HORIZONTAL) ─── */}
      <section className="mt-5">
        <div className="flex items-center justify-between px-3 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Icon3DFire size={20} className="shrink-0" />
            <h2 className="font-display text-[15.5px] font-bold text-[var(--washi)]">
              {lang === "ja"
                ? "人気メニュー＆本日の特選"
                : lang === "en"
                ? "Best Sellers & Today's Deals"
                : "Món Bán Chạy & Ưu Đãi Hôm Nay"}
            </h2>
          </div>
          <button
            onClick={() => navigate("/menu")}
            className="flex items-center gap-0.5 text-[11.5px] font-semibold text-[var(--shu)]"
          >
            {t.common.all} <IconChevronRight size={13} />
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-1">
          {flashDeals.map((d, index) => {
            const photo = img(d.image);
            const name = tr.text(d, "name", d.name);
            const isFav = favorites.includes(d.id);
            return (
              <div
                key={d.id}
                onClick={() => {
                  haptic("light");
                  setOpenDish(d);
                }}
                className="card group w-[130px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-[var(--line)] text-left shadow-sm transition-all active:scale-[0.98]"
              >
                {/* Ảnh món 1:1 vuông vức + Tag hot */}
                <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-2)]">
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center opacity-60">
                      <Icon3DMenu size={32} />
                    </div>
                  )}

                  {/* Tag giảm giá / bán chạy */}
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-[var(--shu)] px-1.5 py-0.5 text-[8.5px] font-bold text-white shadow-sm">
                    {index % 2 === 0
                      ? (lang === "ja" ? "人気" : "HOT")
                      : (lang === "ja" ? "名物" : "BEST")}
                  </span>

                  {/* Nút tim yêu thích */}
                  <button
                    onClick={(e) => toggleFavorite(d.id, e)}
                    className="absolute right-1.5 top-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-transform active:scale-90"
                  >
                    <IconHeart
                      size={12}
                      filled={isFav}
                      className={isFav ? "text-[var(--shu)]" : "text-white"}
                    />
                  </button>
                </div>

                {/* Thông tin món */}
                <div className="p-2">
                  <div className="line-clamp-1 text-[12px] font-medium leading-snug text-[var(--washi)]">
                    {name}
                  </div>
                  <div className="text-[10px] text-[var(--faint)] truncate">
                    {d.romaji || d.jp}
                  </div>

                  <div className="mt-1.5 flex items-end justify-between min-h-[34px]">
                    <div className="min-w-0 flex-1 pr-1 overflow-hidden">
                      <Price
                        value={dishFromPrice(d)}
                        from={!!d.variants?.length}
                        compareAt={d.compareAtPrice}
                        className="text-[12.5px] font-bold text-[var(--shu)]"
                      />
                    </div>
                    {/* Nút cộng vào giỏ */}
                    <button
                      aria-label="Add to cart"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic("light");
                        setOpenDish(d);
                      }}
                      className="relative shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--shu)] text-white shadow-sm transition-transform active:scale-90"
                    >
                      <IconPlus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. BANNER SPOTLIGHT: MIYAKO BUTCHER SHOP ─── */}
      <section className="mt-5 px-3">
        <div
          onClick={() => {
            haptic("light");
            navigate("/butcher");
          }}
          className="butcher-card group relative cursor-pointer overflow-hidden rounded-xl p-2.5 shadow-sm border border-[var(--line-strong)] transition-all active:scale-[0.99]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-[var(--gold)]/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[var(--gold)] flex items-center gap-1">
                  <Icon3DMeat size={13} /> MIYAKO BUTCHER
                </span>
                <span className="text-[9.5px] font-medium text-[var(--muted)]">
                  {lang === "ja" ? "45分スピード配達" : lang === "en" ? "45-min delivery" : "Giao nhanh 45p"}
                </span>
              </div>
              <h3 className="mt-1 font-display text-[15px] font-bold text-[var(--washi)]">
                {lang === "ja"
                  ? "ご希望に合わせてカットする日本産A5和牛"
                  : lang === "en"
                  ? "Custom-Cut Japanese A5 Wagyu Beef"
                  : "Thịt Bò Wagyu Nhật A5 Cắt Theo Yêu Cầu"}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                {lang === "ja"
                  ? "保冷剤入り真空パック包装。しゃぶしゃぶ(1.5mm)、焼肉(3.5mm)、ステーキ(2cm)など無料カット。"
                  : lang === "en"
                  ? "Vacuum packed with thermal ice gel. Custom slicing for Shabu (1.5mm), Yakiniku (3.5mm), Steak (2cm)."
                  : "Thịt tươi hút chân không kèm đá gel giữ nhiệt. Tùy chọn cắt lát Lẩu (1.5mm), Nướng (3.5mm), Steak (2cm)."}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/30 bg-[var(--gold-dim)] p-1 shadow-sm">
              <Icon3DButcher size={34} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2">
            <span className="text-[11.5px] font-semibold text-[var(--gold)] flex items-center gap-1">
              {lang === "ja"
                ? "精肉店を見る"
                : lang === "en"
                ? "Explore Butcher Shop"
                : "Khám phá cửa hàng thịt"}{" "}
              <IconChevronRight size={13} />
            </span>
            <span className="rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10.5px] font-bold text-[var(--gold)]">
              {lang === "ja" ? "280,000₫〜" : lang === "en" ? "From 280,000₫" : "Từ 280.000đ"}
            </span>
          </div>
        </div>
      </section>

      {/* ─── 6. FEED SẢN PHẨM LƯỚI 2 CỘT CHUẨN APP TMĐT (TỶ LỆ ẢNH 1:1 VÀ 3:4) ─── */}
      <section className="mt-5 px-3">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-[15.5px] font-bold text-[var(--washi)]">
            {lang === "ja"
              ? "おすすめメニュー"
              : lang === "en"
              ? "Recommended Dishes"
              : "Thực Đơn Đề Xuất"}
          </h2>
          <button
            onClick={() => navigate("/menu")}
            className="flex items-center gap-0.5 text-[11.5px] font-semibold text-[var(--muted)] hover:text-[var(--washi)]"
          >
            {t.common.all} <IconChevronRight size={13} />
          </button>
        </div>

        {/* Thanh Tab phân loại TMĐT */}
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2.5">
          {feedTabs.map((tb) => {
            const active = feedTab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => {
                  haptic("light");
                  setFeedTab(tb.id);
                }}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all ${
                  active
                    ? "bg-[var(--shu)] text-white font-semibold shadow-sm"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--washi)]"
                }`}
              >
                <span>{tb.icon}</span>
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>

        {/* Lưới sản phẩm 2 cột so le TMĐT với 2 tỷ lệ ảnh: 1:1 và 4:5 */}
        <DishGrid dishes={feedDishes} onOpen={setOpenDish} />
      </section>

      {/* ─── 7. BẢO CHỨNG DỊCH VỤ TMĐT (FOOTER TRUST BADGES) ─── */}
      <section className="mt-6 px-3 pb-10">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 mb-1">
                <Icon3DShield size={20} />
              </div>
              <span className="text-[10.5px] font-bold text-[var(--washi)]">
                {lang === "ja" ? "100%正規輸入" : lang === "en" ? "100% Certified" : "100% Chính Ngạch"}
              </span>
              <span className="text-[9px] text-[var(--faint)]">
                {lang === "ja" ? "A5和牛・US牛" : lang === "en" ? "A5 Wagyu & US Beef" : "Wagyu A5 & Bò Mỹ"}
              </span>
            </div>
            <div className="flex flex-col items-center border-x border-[var(--line)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 mb-1">
                <Icon3DSnowflake size={20} />
              </div>
              <span className="text-[10.5px] font-bold text-[var(--washi)]">
                {lang === "ja" ? "保冷パック包装" : lang === "en" ? "Thermal Gel Pack" : "Đóng Thùng Gel"}
              </span>
              <span className="text-[9px] text-[var(--faint)]">
                {lang === "ja" ? "冷温と鮮度を保持" : lang === "en" ? "Deep chill fresh" : "Giữ lạnh tuyệt đối"}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 mb-1">
                <Icon3DLightning size={20} />
              </div>
              <span className="text-[10.5px] font-bold text-[var(--washi)]">
                {lang === "ja" ? "45分スピード配達" : lang === "en" ? "45-Min Express" : "Giao 45 Phút"}
              </span>
              <span className="text-[9px] text-[var(--faint)]">
                {lang === "ja" ? "市内迅速にお届け" : lang === "en" ? "Inner city rapid" : "Nội thành hỏa tốc"}
              </span>
            </div>
          </div>
        </div>

        {/* Thông tin hỗ trợ */}
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[11.5px] text-[var(--muted)]">
          <button
            onClick={() => {
              haptic("light");
              setHotlineOpen(true);
            }}
            className="flex items-center gap-1 hover:text-[var(--washi)] transition-colors"
          >
            <Icon3DHotline size={15} /> {restaurant.hotline}
          </button>
          <span>·</span>
          <button
            onClick={() => {
              haptic("light");
              setMapsOpen(true);
            }}
            className="flex items-center gap-1 hover:text-[var(--washi)] transition-colors"
          >
            <Icon3DMapPin size={15} /> {lang === "ja" ? "地図・アクセス" : lang === "en" ? "Map & Directions" : "Bản đồ chỉ đường"}
          </button>
        </div>
      </section>

      {/* Thanh giỏ hàng nổi tự động xuất hiện khi có món trong giỏ */}
      <CartBar />

      {/* Sheet xem chi tiết và thêm món */}
      <DishSheet dish={openDish} onClose={() => setOpenDish(null)} />

      {/* Sheet Mã Giảm Giá / Voucher VIP */}
      <Sheet
        open={voucherOpen}
        onClose={() => setVoucherOpen(false)}
        title={lang === "ja" ? "宮古 限定クーポン" : lang === "en" ? "Miyako Vouchers" : "Voucher Ưu Đãi Miyako"}
      >
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">
                  {lang === "ja" ? "100,000₫ 割引" : lang === "en" ? "100,000₫ Discount" : "Giảm 100.000đ"}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {lang === "ja" ? "1,000,000₫以上のお会計で利用可能" : lang === "en" ? "For orders from 1,000,000₫" : "Áp dụng hóa đơn từ 1.000.000đ"}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">
                  {lang === "ja" ? "有効期限: 2026/12/31" : lang === "en" ? "EXP: 31/12/2026" : "HSD: 31/12/2026"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                haptic("medium");
                setVoucherOpen(false);
                navigate("/menu");
              }}
              className="rounded-full bg-[var(--shu)] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm active:scale-95 transition-transform"
            >
              {lang === "ja" ? "今すぐ使う" : lang === "en" ? "Use now" : "Dùng ngay"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">
                  {lang === "ja" ? "和牛セット 15% OFF" : lang === "en" ? "15% Off Wagyu Sets" : "Giảm 15% Set Bò Wagyu"}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {lang === "ja" ? "当日切り立て新鮮和牛精肉" : lang === "en" ? "Fresh meats cut daily" : "Thịt bò tươi cắt trong ngày"}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">
                  {lang === "ja" ? "コード: WAGYU15" : lang === "en" ? "Code: WAGYU15" : "Mã: WAGYU15"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                haptic("medium");
                setVoucherOpen(false);
                navigate("/butcher");
              }}
              className="rounded-full bg-[var(--shu)] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm active:scale-95 transition-transform"
            >
              {lang === "ja" ? "今すぐ使う" : lang === "en" ? "Use now" : "Dùng ngay"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">
                  {lang === "ja" ? "特選刺身一皿プレゼント" : lang === "en" ? "Free Salmon Sashimi Plate" : "Tặng 1 Đĩa Sashimi"}
                </div>
                <div className="text-[11px] text-[var(--muted)]">
                  {lang === "ja" ? "毎日18時までのご予約限定" : lang === "en" ? "For bookings before 6:00 PM daily" : "Khi đặt bàn trước 18h hàng ngày"}
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">
                  {lang === "ja" ? "コード: FREEOMAKASE" : lang === "en" ? "Code: FREEOMAKASE" : "Mã: FREEOMAKASE"}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                haptic("medium");
                setVoucherOpen(false);
                navigate("/booking");
              }}
              className="rounded-full bg-[var(--shu)] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm active:scale-95 transition-transform"
            >
              {lang === "ja" ? "今すぐ使う" : lang === "en" ? "Use now" : "Dùng ngay"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* Sheet Hotline Hỗ Trợ & Đặt Bàn */}
      <Sheet
        open={hotlineOpen}
        onClose={() => setHotlineOpen(false)}
        title={
          lang === "ja"
            ? "お問い合わせ・ご予約"
            : lang === "en"
            ? "Hotline & Reservations"
            : "Hotline Hỗ Trợ & Đặt Bàn"
        }
      >
        <div className="flex flex-col items-center text-center pb-3 pt-1">
          <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
            <Icon3DHotline size={58} />
            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[var(--surface)]" />
            </span>
          </div>

          <div className="text-[12.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
            {restaurant.name} · {restaurant.tagline}
          </div>
          <div className="mt-1 text-[26px] font-bold tracking-tight text-[var(--washi)] font-mono">
            {restaurant.hotline}
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {lang === "ja"
              ? "電話受付中 (10:00 - 22:30)"
              : lang === "en"
              ? "Available Now (10:00 - 22:30)"
              : "Sẵn sàng nhận cuộc gọi (10:00 - 22:30)"}
          </div>

          <p className="mt-3 px-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
            {lang === "ja"
              ? "おまかせコースのご相談、VIP個室の優先予約、テイクアウト注文を承ります。"
              : lang === "en"
              ? "Contact our reception directly for Omakase consultation, VIP room reservations, or express delivery."
              : "Liên hệ trực tiếp lễ tân để được hỗ trợ đặt bàn Omakase, giữ phòng riêng Tatami VIP hoặc giải đáp mọi thắc mắc."}
          </p>

          <div className="mt-5 flex w-full flex-col gap-2.5">
            <a
              href={`tel:${restaurant.hotline}`}
              onClick={() => {
                haptic("medium");
                callHotline(restaurant.hotline);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--shu)] font-bold text-white shadow-md active:scale-[0.98] transition-transform text-[14.5px]"
            >
              <IconPhone size={18} />
              {lang === "ja"
                ? `今すぐ電話する (${restaurant.hotline})`
                : lang === "en"
                ? `Call Now (${restaurant.hotline})`
                : `Gọi Ngay (${restaurant.hotline})`}
            </a>

            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => {
                  haptic("light");
                  if (restaurant.hotline) {
                    navigator.clipboard?.writeText(restaurant.hotline);
                  }
                  setCopiedKey("hotline");
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] text-[13px] font-semibold text-[var(--washi)] active:scale-[0.98] transition-all"
              >
                {copiedKey === "hotline" ? (
                  <>
                    <IconCheck size={16} className="text-emerald-500" />
                    <span className="text-emerald-500 font-bold">
                      {lang === "ja" ? "コピー完了" : lang === "en" ? "Copied!" : "Đã chép số!"}
                    </span>
                  </>
                ) : (
                  <>
                    <IconClipboard size={16} />
                    {lang === "ja" ? "番号をコピー" : lang === "en" ? "Copy Number" : "Sao chép số"}
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  haptic("light");
                  chatWithOA(restaurant.oaId);
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] text-[13px] font-semibold text-[var(--washi)] active:scale-[0.98] transition-all"
              >
                <IconChat size={16} className="text-blue-500" />
                {lang === "ja" ? "Zalo OA チャット" : lang === "en" ? "Chat Zalo OA" : "Nhắn Zalo OA"}
              </button>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Sheet Bản Đồ & Chỉ Đường */}
      <Sheet
        open={mapsOpen}
        onClose={() => setMapsOpen(false)}
        title={
          lang === "ja"
            ? "店舗アクセス・地図"
            : lang === "en"
            ? "Location & Directions"
            : "Vị Trí & Chỉ Đường"
        }
      >
        <div className="flex flex-col items-center pb-3 pt-1">
          <div className="mb-3 flex h-16 w-16 items-center justify-center">
            <Icon3DMapPin size={58} />
          </div>

          <div className="text-[12.5px] font-semibold text-[var(--muted)] uppercase tracking-wider">
            {restaurant.name} Japanese Dining
          </div>
          <div className="mt-1 text-center text-[16px] font-bold text-[var(--washi)] px-2">
            {restaurant.address}
          </div>

          <div className="mt-3.5 w-full space-y-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[12px] text-left">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">📍</span>
              <div>
                <span className="font-semibold text-[var(--washi)]">
                  {lang === "ja" ? "位置" : lang === "en" ? "Location" : "Vị trí"}:
                </span>{" "}
                <span className="text-[var(--muted)]">
                  {lang === "ja"
                    ? "ダオタン日本食街、ロッテセンターハノイより徒歩約3分 (~300m)。"
                    : lang === "en"
                    ? "Dao Tan culinary street, ~300m from Lotte Center Hanoi."
                    : "Phố ẩm thực Đào Tấn, cách ngã tư Liễu Giai & Lotte Center ~300m."}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">🚗</span>
              <div>
                <span className="font-semibold text-[var(--washi)]">
                  {lang === "ja" ? "駐車場" : lang === "en" ? "Parking" : "Đỗ xe"}:
                </span>{" "}
                <span className="text-[var(--muted)]">
                  {lang === "ja"
                    ? "専属警備員が自動車・バイクの駐車をご案内いたします。"
                    : lang === "en"
                    ? "Valet security staff available for both cars and motorbikes."
                    : "Có nhân viên bảo vệ hỗ trợ hướng dẫn đỗ xe ô tô và xe máy tận nơi."}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none">🕒</span>
              <div>
                <span className="font-semibold text-[var(--washi)]">
                  {lang === "ja" ? "営業時間" : lang === "en" ? "Hours" : "Giờ đón khách"}:
                </span>{" "}
                <span className="text-[var(--muted)]">
                  {lang === "ja"
                    ? "昼 10:30 - 14:00 · 夜 17:30 - 22:30"
                    : lang === "en"
                    ? "Lunch 10:30 - 14:00 · Dinner 17:30 - 22:30"
                    : "Trưa 10:30 - 14:00 · Tối 17:30 - 22:30"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex w-full flex-col gap-2.5">
            <button
              onClick={() => {
                haptic("medium");
                openMap(`Miyako ${restaurant.address}`);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--shu)] font-bold text-white shadow-md active:scale-[0.98] transition-transform text-[14.5px]"
            >
              <IconPin size={18} />
              {lang === "ja"
                ? "Googleマップで道案内"
                : lang === "en"
                ? "Open in Google Maps"
                : "Mở Google Maps Chỉ Đường"}
            </button>

            <button
              onClick={() => {
                haptic("light");
                if (restaurant.address) {
                  navigator.clipboard?.writeText(restaurant.address);
                }
                setCopiedKey("address");
                setTimeout(() => setCopiedKey(null), 2000);
              }}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] text-[13px] font-semibold text-[var(--washi)] active:scale-[0.98] transition-all"
            >
              {copiedKey === "address" ? (
                <>
                  <IconCheck size={16} className="text-emerald-500" />
                  <span className="text-emerald-500 font-bold">
                    {lang === "ja" ? "住所をコピーしました" : lang === "en" ? "Address Copied!" : "Đã sao chép địa chỉ!"}
                  </span>
                </>
              ) : (
                <>
                  <IconClipboard size={16} />
                  {lang === "ja" ? "住所をコピー" : lang === "en" ? "Copy Address" : "Sao chép địa chỉ nhà hàng"}
                </>
              )}
            </button>
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}
