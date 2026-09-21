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
  IconChevronRight,
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

/* ─── Danh sách Banner Carousel quảng cáo chuẩn TMĐT ─── */
const BANNERS = [
  {
    id: "omakase",
    tag: "OMAKASE VIP",
    title: "Tiệc Bếp Trưởng Omakase",
    sub: "Trải nghiệm ẩm thực Kaiseki đỉnh cao tại quầy Bar riêng tư 12 ghế",
    cta: "Xem suất tiệc",
    route: "/omakase",
    img: heroOmakase,
    color: "from-black/80 via-black/40 to-transparent",
  },
  {
    id: "butcher",
    tag: "MIYAKO BUTCHER",
    title: "Thịt Bò Wagyu A5 Tươi",
    sub: "Sơ chế cắt theo yêu cầu: Steak, Lẩu Shabu, Nướng Yakiniku",
    cta: "Mua mang về",
    route: "/butcher",
    img: heroWagyu,
    color: "from-[#881008]/85 via-black/50 to-transparent",
  },
  {
    id: "hotpot",
    tag: "SET LẨU TẠI GIA",
    title: "Lẩu Shabu & Sukiyaki",
    sub: "Tặng kèm nước dùng hầm 12h, rau nấm và sốt mè rang Nhật Bản",
    cta: "Đặt giao ngay",
    route: "/menu",
    img: heroHotpot,
    color: "from-black/80 via-black/40 to-transparent",
  },
  {
    id: "sushi",
    tag: "TOYOSU DAILY",
    title: "Sashimi Tươi Sống Mỗi Ngày",
    sub: "Cá ngừ đại dương Hon Maguro & bụng cá hồi Na Uy thượng hạng",
    cta: "Khám phá menu",
    route: "/menu",
    img: heroSushi,
    color: "from-black/80 via-black/40 to-transparent",
  },
];

/* ─── Danh sách từ khoá placeholder chuyển động liên tục ─── */
const SEARCH_PLACEHOLDERS = [
  "Tìm Bò Wagyu A5 nướng than hoa...",
  "Tìm Sashimi Cá Hồi Na Uy tươi sống...",
  "Tìm Tiệc Bếp Trưởng Omakase 12 ghế...",
  "Tìm Set Lẩu Shabu Shabu & Sukiyaki...",
  "Tìm Cơm Lươn Nhật sốt Kabayaki...",
  "Tìm Thịt Bò Tươi Butcher cắt lát...",
  "Tìm Sushi bụng cá ngừ Otoro béo ngậy...",
];

/* ─── Tab phân loại feed món ăn TMĐT ─── */
type FeedTab = "all" | "sashimi" | "wagyu" | "hotpot" | "butcher";

const FEED_TABS: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "Gợi ý hôm nay", icon: <Icon3DFire size={16} /> },
  { id: "sashimi", label: "Sashimi & Sushi", icon: <Icon3DSushi size={16} /> },
  { id: "wagyu", label: "Wagyu Thượng Hạng", icon: <Icon3DMeat size={16} /> },
  { id: "hotpot", label: "Lẩu & Món Nóng", icon: <Icon3DHotpot size={16} /> },
  { id: "butcher", label: "Thịt Bò Mang Về", icon: <Icon3DTakeaway size={16} /> },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  /* Chuyển động thay đổi placeholder liên tục mỗi 3.2 giây */
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        setPlaceholderFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

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
      setActiveSlide((prev) => (prev + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

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
    // "all": món nổi bật
    return dishes.slice(0, 14);
  }, [dishes, feedTab]);

  return (
    <Screen name="home" pad={false}>
      {/* ─── 1. THANH ĐẦU TRANG & TÌM KIẾM CHUẨN TMĐT ─── */}
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
              const term =
                searchQuery.trim() ||
                SEARCH_PLACEHOLDERS[placeholderIndex].replace(/^Tìm\s+/, "").replace(/\.\.\.$/, "");
              haptic("light");
              navigate(`/menu?q=${encodeURIComponent(term)}`);
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
                      {SEARCH_PLACEHOLDERS[placeholderIndex]}
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

          {/* Bảng kết quả tìm kiếm trực tiếp nổi bên dưới */}
          {searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-[360px] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--line)] text-[11.5px] text-[var(--muted)]">
                <span>
                  Tìm thấy <b className="text-[var(--shu)]">{liveSearchResults.length}</b> món cho "{searchQuery}"
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-[11px] text-[var(--shu)] hover:underline font-medium"
                >
                  Đóng
                </button>
              </div>

              {liveSearchResults.length === 0 ? (
                <div className="py-5 text-center text-[12.5px] text-[var(--muted)]">
                  Không tìm thấy món ăn phù hợp với "{searchQuery}"
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
                            aria-label="Thêm vào giỏ"
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
                      Xem tất cả {liveSearchResults.length} món trên Thực đơn ➔
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
            {BANNERS.map((b) => (
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
            {BANNERS.map((_, idx) => (
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
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-sm">
          <div className="grid grid-cols-4 gap-y-2 gap-x-1">
            {/* 1. Menu */}
            <button
              onClick={() => {
                haptic("light");
                navigate("/menu");
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DMenu size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Menu
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
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DOmakase size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Omakase
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
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DButcher size={36} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--shu)] leading-tight text-center truncate w-full">
                Thịt Tươi
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
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DBooking size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Đặt Bàn
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
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DPoints size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Tích Điểm
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
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DVoucher size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Voucher
              </span>
            </button>

            {/* 7. Hotline */}
            <button
              onClick={() => {
                haptic("light");
                callHotline(restaurant.hotline);
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DHotline size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Hotline
              </span>
            </button>

            {/* 8. Maps */}
            <button
              onClick={() => {
                haptic("light");
                openMap(`Miyako ${restaurant.address}`);
              }}
              className="group flex flex-col items-center gap-1 transition-transform active:scale-95"
            >
              <div className="flex h-10 w-10 items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Icon3DMapPin size={36} />
              </div>
              <span className="text-[11px] font-medium text-[var(--washi)] leading-tight text-center truncate w-full">
                Maps
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
              Gọi món ➔
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
              Món Bán Chạy & Ưu Đãi Hôm Nay
            </h2>
          </div>
          <button
            onClick={() => navigate("/menu")}
            className="flex items-center gap-0.5 text-[11.5px] font-semibold text-[var(--shu)]"
          >
            Tất cả <IconChevronRight size={13} />
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
                    {index % 2 === 0 ? "HOT DEAL" : "BÁN CHẠY"}
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
                      aria-label="Thêm món"
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
                  Giao nhanh 45p
                </span>
              </div>
              <h3 className="mt-1 font-display text-[15px] font-bold text-[var(--washi)]">
                Thịt Bò Wagyu Nhật A5 Cắt Theo Yêu Cầu
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">
                Thịt tươi hút chân không kèm đá gel giữ nhiệt. Tùy chọn cắt lát Lẩu (1.5mm), Nướng (3.5mm), Steak (2cm).
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/30 bg-[var(--gold-dim)] p-1 shadow-sm">
              <Icon3DButcher size={34} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2">
            <span className="text-[11.5px] font-semibold text-[var(--gold)] flex items-center gap-1">
              Khám phá cửa hàng thịt <IconChevronRight size={13} />
            </span>
            <span className="rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-[10.5px] font-bold text-[var(--gold)]">
              Từ 280.000đ
            </span>
          </div>
        </div>
      </section>

      {/* ─── 6. FEED SẢN PHẨM LƯỚI 2 CỘT CHUẨN APP TMĐT (TỶ LỆ ẢNH 1:1 VÀ 3:4) ─── */}
      <section className="mt-5 px-3">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-[15.5px] font-bold text-[var(--washi)]">
            Thực Đơn Đề Xuất
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
          {FEED_TABS.map((tb) => {
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
              <span className="text-[10.5px] font-bold text-[var(--washi)]">100% Chính Ngạch</span>
              <span className="text-[9px] text-[var(--faint)]">Wagyu A5 & Bò Mỹ</span>
            </div>
            <div className="flex flex-col items-center border-x border-[var(--line)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 mb-1">
                <Icon3DSnowflake size={20} />
              </div>
              <span className="text-[10.5px] font-bold text-[var(--washi)]">Đóng Thùng Gel</span>
              <span className="text-[9px] text-[var(--faint)]">Giữ lạnh tuyệt đối</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 mb-1">
                <Icon3DLightning size={20} />
              </div>
              <span className="text-[10.5px] font-bold text-[var(--washi)]">Giao 45 Phút</span>
              <span className="text-[9px] text-[var(--faint)]">Nội thành hỏa tốc</span>
            </div>
          </div>
        </div>

        {/* Thông tin hỗ trợ */}
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[11.5px] text-[var(--muted)]">
          <button
            onClick={() => callHotline(restaurant.hotline)}
            className="flex items-center gap-1 hover:text-[var(--washi)] transition-colors"
          >
            <Icon3DHotline size={15} /> {restaurant.hotline}
          </button>
          <span>·</span>
          <button
            onClick={() => openMap(`Miyako ${restaurant.address}`)}
            className="flex items-center gap-1 hover:text-[var(--washi)] transition-colors"
          >
            <Icon3DMapPin size={15} /> Bản đồ chỉ đường
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
        title="Voucher Ưu Đãi Miyako"
      >
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">Giảm 100.000đ</div>
                <div className="text-[11px] text-[var(--muted)]">Áp dụng hóa đơn từ 1.000.000đ</div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">HSD: 31/12/2026</div>
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
              Dùng ngay
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">Giảm 15% Set Bò Wagyu</div>
                <div className="text-[11px] text-[var(--muted)]">Thịt bò tươi cắt trong ngày</div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">Mã: WAGYU15</div>
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
              Dùng ngay
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon3DVoucher size={36} />
              <div>
                <div className="text-[13.5px] font-bold text-[var(--washi)]">Tặng 1 Đĩa Sashimi</div>
                <div className="text-[11px] text-[var(--muted)]">Khi đặt bàn trước 18h hàng ngày</div>
                <div className="mt-0.5 text-[10px] text-[var(--shu)] font-medium">Mã: FREEOMAKASE</div>
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
              Dùng ngay
            </button>
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}
