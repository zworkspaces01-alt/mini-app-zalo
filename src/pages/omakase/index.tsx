import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "zmp-ui";

import { BrandLogo, Note } from "@/components/ui";
import {
  IconCart,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconQR,
} from "@/components/ui/icons";
import {
  Icon3DFire,
  Icon3DMeat,
  Icon3DSushi,
} from "@/components/ui/icons-3d";
import { LangButton } from "@/components/ui/lang-switch";
import { Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT, useTr } from "@/i18n";
import { haptic, scanTableQR } from "@/services/zalo";
import { cartCountAtom, patchBookingAtom, tableIdAtom } from "@/state/atoms";
import { omakaseSetsAtom } from "@/state/content";
import { OmakaseSet } from "@/types";
import { courseCount } from "@/data/omakase";
import { formatNumber, vnd } from "@/utils/format";
import {
  heroOmakase,
  heroSushi,
  heroWagyu,
  omakaseChefPrep,
  omakaseCounter,
  omakaseCounterMood,
  omakaseTatami,
} from "@/utils/images";

/* ─── Cấu trúc mục ảnh Pinterest (Món ăn & Không gian Omakase) ─── */
export type PinterestItem = {
  id: string;
  type: "space" | "dish";
  title: string;
  jp: string;
  tag: string;
  aspectClass: string;
  image: string;
  desc: string;
  seating?: "counter" | "private";
};

export const OMAKASE_PINTEREST_GALLERY: PinterestItem[] = [
  {
    id: "pin-counter-mood",
    type: "space",
    title: "Quầy Bar Itamae 12 Chỗ",
    jp: "板前カウンター · 12 SEATS",
    tag: "Không gian Omakase",
    aspectClass: "aspect-[3/4]",
    image: omakaseCounterMood,
    desc: "12 chỗ ngồi độc quyền bao quanh quầy chế tác gỗ Hinoki, nơi thực khách trực diện thưởng lãm nghệ thuật ẩm thực từ Bếp Trưởng.",
    seating: "counter",
  },
  {
    id: "pin-chef-prep",
    type: "dish",
    title: "Chế Tác Otoro & Uni Vàng 24K",
    jp: "大トロ雲丹 · CHEF'S CRAFT",
    tag: "Món ăn tại quầy",
    aspectClass: "aspect-[3/4]",
    image: omakaseChefPrep,
    desc: "Bếp trưởng nắn từng khối cơm giấm ấm, đặt lát cá ngừ Hon-Maguro béo đậm, nhím biển Hokkaido và dát vảy vàng 24k ngay trước mắt thực khách.",
    seating: "counter",
  },
  {
    id: "pin-dish-wagyu",
    type: "dish",
    title: "Miyazaki Wagyu A5 Nướng Đá",
    jp: "宮崎牛 A5 · VOLCANO STONE",
    tag: "Món ăn tại quầy",
    aspectClass: "aspect-square",
    image: heroWagyu,
    desc: "Thịt bò Miyazaki Wagyu A5 vân mỡ hoa cẩm thạch béo ngậy tan chảy trên phiến đá núi lửa Phú Sĩ, ngập tràn hương vị đậm đà.",
  },
  {
    id: "pin-space-tatami",
    type: "space",
    title: "Phòng VIP Tatami Omakase",
    jp: "個室掘りごたつ · PRIVATE ROOM",
    tag: "Không gian Omakase",
    aspectClass: "aspect-[4/5]",
    image: omakaseTatami,
    desc: "Phòng tiệc riêng tư 4-10 khách phong cách Nhật Bản với sàn chiếu Tatami, bàn chìm chân Horigotatsu và cửa trượt Shoji cách âm.",
    seating: "private",
  },
  {
    id: "pin-dish-sushi",
    type: "dish",
    title: "Otoro & Trứng Cá Tầm Caviar",
    jp: "本鮪大トロ · CAVIAR NIGIRI",
    tag: "Món ăn tại quầy",
    aspectClass: "aspect-square",
    image: heroSushi,
    desc: "Sashimi và Nigiri bụng cá ngừ vây xanh hảo hạng kết hợp cùng trứng cá tầm Caviar hoàng gia và vảy vàng lấp lánh.",
  },
  {
    id: "pin-space-detail",
    type: "space",
    title: "Gỗ Bách Hinoki & Gốm Thủ Công",
    jp: "檜木目の美 · HINOKI DETAIL",
    tag: "Không gian Omakase",
    aspectClass: "aspect-[4/3]",
    image: omakaseCounter,
    desc: "Đường nét tinh tế của phiến gỗ Hinoki nguyên khối cùng bộ chén đĩa gốm mộc tráng men tạo nên cảm giác ấm áp và tĩnh tại chuẩn phong vị Nhật Bản.",
    seating: "counter",
  },
  {
    id: "pin-dish-course",
    type: "dish",
    title: "Tuyệt Tác Hải Sản Omakase",
    jp: "おまかせ海鮮 · EDOMAE ART",
    tag: "Món ăn tại quầy",
    aspectClass: "aspect-[4/3]",
    image: heroOmakase,
    desc: "100% hải sản được nhập khẩu tươi sống bằng đường hàng không mỗi sáng từ chợ Toyosu Tokyo, phục vụ chuẩn nhiệt độ.",
  },
];

/* ─── Danh sách các Slide Showroom Omakase trên cùng ─── */
const OMAKASE_SLIDES = [
  {
    id: "slide-counter-mood",
    image: omakaseCounterMood,
    tag: "Quầy Itamae 12 Ghế Bếp Trưởng",
    jp: "板前カウンター · 12 SEATS",
    title: "Không Gian Quầy Bar Bếp Trưởng",
    desc: "Không gian 12 ghế gỗ Hinoki độc quyền, nơi thực khách trực diện chiêm ngưỡng từng thao tác dao và nghệ thuật nắn sushi đỉnh cao.",
  },
  {
    id: "slide-chef-prep",
    image: omakaseChefPrep,
    tag: "Nghệ Thuật Trình Diễn Tại Chỗ",
    jp: "職人技 · MASTER CHEF CRAFT",
    title: "Kỹ Nghệ Nắn Sushi Đỉnh Cao",
    desc: "Chiêm ngưỡng Bếp trưởng nắn Nigiri, điểm xuyết Uni tươi, Otoro và vảy vàng 24k phục vụ ngay trong tích tắc chuẩn nhiệt độ.",
  },
  {
    id: "slide-tatami",
    image: omakaseTatami,
    tag: "Phòng VIP Tatami Riêng Tư",
    jp: "個室畳 · PRIVATE TATAMI ROOM",
    title: "Không Gian Omakase VIP Riêng Tư",
    desc: "Phòng riêng biệt lập từ 4-10 khách với bàn Horigotatsu chìm ấm cúng cho tiệc ngoại giao và họp mặt gia đình trang trọng.",
  },
  {
    id: "slide-wagyu",
    image: heroWagyu,
    tag: "Miyazaki Wagyu A5 · Núi Lửa Phú Sĩ",
    jp: "宮崎牛 · WAGYU A5 PERFECTION",
    title: "Bò Wagyu A5 Nướng Đá Núi Lửa",
    desc: "Vân mỡ cẩm thạch béo ngậy tan chảy trên đầu lưỡi, nướng xèo xèo đánh thức mọi giác quan của thực khách sành ăn.",
  },
  {
    id: "slide-sushi",
    image: heroSushi,
    tag: "100% Nhập Khẩu Hàng Không",
    jp: "江戸前寿司 · EDOMAE CRAFTSMANSHIP",
    title: "Otoro Vảy Vàng & Nhím Biển Uni",
    desc: "Bụng cá ngừ Hon-Maguro béo đậm dát vàng 24k kết hợp cùng trứng cá tầm Caviar hoàng đế.",
  },
];

/* ─── 7 Bước thưởng thức Omakase truyền thống ─── */
const OMAKASE_STEPS = [
  { step: 1, name: "Sakizuke", vi: "Khai vị tinh tế", desc: "Đánh thức vị giác với nguyên liệu tươi mát" },
  { step: 2, name: "Otsukuri", vi: "Sashimi hải vị", desc: "Hải sản tươi sống vận chuyển bằng đường hàng không" },
  { step: 3, name: "Yakimono", vi: "Món nướng than hoa", desc: "Bò Wagyu hoặc Lươn nướng thơm lừng" },
  { step: 4, name: "Nigiri Edo", vi: "Sushi thủ công", desc: "Nghệ thuật nắn cơm giấm và hải vị quý hiếm" },
  { step: 5, name: "Wagyu A5", vi: "Bò đá núi lửa", desc: "Vị béo ngậy tan chảy của Wagyu A5 Miyazaki" },
  { step: 6, name: "Tome-wan", vi: "Canh thanh vị", desc: "Nước dùng Dashi ấm bụng kết thúc món chính" },
  { step: 7, name: "Mizumono", vi: "Wagashi & Matcha", desc: "Tráng miệng thanh tao khép lại hành trình" },
];

/* ─── Thẻ ảnh phong cách Pinterest Masonry: Chỉ hiển thị ảnh thuần tuý ─── */
function PinterestCard({
  pin,
  onOpen,
}: {
  pin: PinterestItem;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
    >
      <div className={`relative w-full ${pin.aspectClass} overflow-hidden bg-black`}>
        <img
          src={pin.image}
          alt={pin.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </div>
  );
}

export default function OmakasePage() {
  const navigate = useNavigate();
  const sets = useAtomValue(omakaseSetsAtom);
  const cartCount = useAtomValue(cartCountAtom);
  const patchBooking = useSetAtom(patchBookingAtom);
  const [, setTableId] = useAtom(tableIdAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();

  // Slider trên cùng
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Mặc định chọn set 2 triệu hoặc set đầu tiên
  const [selectedSetId, setSelectedSetId] = useState<string>("omakase-2m");

  // Bộ lọc Gallery Pinterest (Tất cả / Không gian Omakase / Món ăn tại quầy)
  const [galleryFilter, setGalleryFilter] = useState<"all" | "space" | "dish">("all");

  // Lightbox xem ảnh Pinterest toàn màn hình
  const [previewPin, setPreviewPin] = useState<PinterestItem | null>(null);

  // Phân chia items vào 2 cột zic-zac phong cách Pinterest Masonry
  const filteredPins = useMemo(() => {
    if (galleryFilter === "all") return OMAKASE_PINTEREST_GALLERY;
    return OMAKASE_PINTEREST_GALLERY.filter((p) => p.type === galleryFilter);
  }, [galleryFilter]);

  const { col1, col2 } = useMemo(() => {
    const c1: PinterestItem[] = [];
    const c2: PinterestItem[] = [];
    filteredPins.forEach((item, index) => {
      if (index % 2 === 0) c1.push(item);
      else c2.push(item);
    });
    return { col1: c1, col2: c2 };
  }, [filteredPins]);

  // Tự động chuyển slide mỗi 3.8 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % OMAKASE_SLIDES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 40) {
      haptic("light");
      setActiveSlide((prev) => (prev + 1) % OMAKASE_SLIDES.length);
    } else if (diff < -40) {
      haptic("light");
      setActiveSlide((prev) => (prev - 1 + OMAKASE_SLIDES.length) % OMAKASE_SLIDES.length);
    }
    setTouchStart(null);
  };

  const currentSet = useMemo(() => {
    return sets.find((s) => s.id === selectedSetId) ?? sets[0];
  }, [sets, selectedSetId]);

  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
  };

  // Đặt bàn ngay cho set đang chọn, hỗ trợ chọn kiểu chỗ ngồi (counter, private, table)
  const handleBookNow = (
    setToBook?: OmakaseSet,
    seating: "counter" | "private" | "table" = "counter"
  ) => {
    const target = setToBook ?? currentSet;
    haptic("medium");
    patchBooking({
      purpose: "omakase",
      omakaseSetId: target.id,
      seating: seating,
    });
    navigate("/booking");
  };

  return (
    <Screen name="omakase" pad={false}>
      {/* ─── 1. THANH HEADER ĐỒNG BỘ ─── */}
      <header
        className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-3 pb-2 shadow-sm transition-colors"
        style={{
          paddingTop: "calc(max(var(--sat), env(safe-area-inset-top, 0px)) + 26px)",
        }}
      >
        <div className="flex h-9 items-center justify-between gap-2">
          <BrandLogo
            variant="horizontal"
            className="h-[25px] w-auto object-contain select-none"
          />

          <div className="flex items-center gap-1.5 head-safe">
            <button
              aria-label={t.menu.scanTable}
              onClick={handleScan}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--washi)] border border-[var(--line)] transition-all active:scale-95"
            >
              <IconQR size={17} />
            </button>

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

            <LangButton />
          </div>
        </div>
      </header>

      {/* ─── NỘI DUNG CHÍNH ─── */}
      <div className="pb-32">
        {/* ─── 2. HERO SLIDER SHOWROOM: NGHỆ THUẬT OMAKASE ĐỈNH CAO ─── */}
        <div
          className="relative h-[310px] w-full overflow-hidden bg-black select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dải trượt slide chuyển động mượt mà */}
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {OMAKASE_SLIDES.map((slide) => (
              <div
                key={slide.id}
                className="relative h-full w-full shrink-0 overflow-hidden"
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="h-full w-full object-cover scale-105 transition-transform duration-1000"
                />

                {/* Nội dung thông điệp của từng slide */}
                <div className="absolute inset-x-0 bottom-4 px-4 pb-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/50 bg-black/60 backdrop-blur-md px-3 py-1 text-[10.5px] font-bold text-[var(--gold)] shadow-lg mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)] animate-ping" />
                    <span>{slide.tag}</span>
                  </div>

                  <div className="jp text-[12px] tracking-[0.25em] text-[var(--gold)] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {slide.jp}
                  </div>
                  <h1 className="font-display text-[23px] font-bold text-white leading-tight mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {slide.title}
                  </h1>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-100 line-clamp-2 drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)]">
                    {slide.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Badge số trang góc trên phải */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-mono text-white/90">
            <span className="font-bold text-[var(--gold)]">{activeSlide + 1}</span>
            <span className="opacity-40">/</span>
            <span>{OMAKASE_SLIDES.length}</span>
          </div>

          {/* Dải Dots chỉ số ở đáy góc phải */}
          <div className="absolute bottom-2.5 right-4 z-10 flex items-center gap-1.5">
            {OMAKASE_SLIDES.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  haptic("light");
                  setActiveSlide(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === i
                    ? "w-6 bg-[var(--gold)] shadow-sm"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="page-pad pt-4 space-y-6">
          {/* ─── 3. BỘ CHỌN 3 PHÂN KHÚC GIÁ (1TR - 2TR - 3TR) ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[var(--washi)]">
                  Lựa Chọn Suất Omakase
                </h2>
                <div className="text-[11.5px] text-[var(--muted)]">
                  3 mức giá chuẩn Fine Dining với menu được chuẩn bị tỉ mỉ
                </div>
              </div>
            </div>

            {/* 3 Tabs chọn nhanh 1Tr - 2Tr - 3Tr */}
            <div className="grid grid-cols-3 gap-2">
              {sets.map((s) => {
                const active = s.id === selectedSetId;
                const isKaze = s.id === "kaze";
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      haptic("light");
                      setSelectedSetId(s.id);
                    }}
                    className={`relative flex flex-col items-center rounded-2xl p-3 border transition-all text-center ${
                      active
                        ? "border-[var(--gold)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-3)] shadow-lg shadow-[var(--gold)]/10 scale-[1.02]"
                        : "border-[var(--line)] bg-[var(--surface-2)] opacity-85 hover:opacity-100"
                    }`}
                  >
                    {isKaze && (
                      <span className="absolute -top-2 rounded-full bg-gradient-to-r from-[var(--shu)] to-amber-600 px-2 py-0.2 text-[8.5px] font-bold text-white shadow-sm">
                        VIP Nhất
                      </span>
                    )}
                    <span className="jp text-[12px] font-bold text-[var(--gold)]">
                      {s.jp}
                    </span>
                    <span className="mt-0.5 font-display text-[13.5px] font-bold text-[var(--washi)] truncate w-full">
                      {s.name}
                    </span>
                    <span className="mt-1 text-[13px] font-extrabold text-[var(--shu)]">
                      {s.price >= 1000000 ? `${s.price / 1000000}Tr` : vnd(s.price, lang)}
                    </span>
                    <span className="text-[10px] text-[var(--faint)] mt-0.5">
                      {courseCount(s)} món
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── 4. CHI TIẾT SET ĐANG CHỌN (SHOW MÓN CỰC KỲ HẤP DẪN) ─── */}
          {currentSet && (
            <div className="rounded-3xl border border-[var(--gold)]/35 bg-gradient-to-b from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] p-4 shadow-xl relative overflow-hidden">
              {/* Thẻ ảnh và tên set */}
              <div className="relative h-[180px] w-full rounded-2xl overflow-hidden mb-4 shadow-md">
                <img
                  src={
                    currentSet.id === "kaze"
                      ? heroOmakase
                      : currentSet.id === "omakase-2m"
                      ? heroWagyu
                      : heroSushi
                  }
                  alt={currentSet.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="jp text-[12px] text-[var(--gold)] tracking-widest font-semibold">
                        {currentSet.jp} · Omakase Course
                      </div>
                      <h3 className="font-display text-[20px] font-bold leading-tight mt-0.5">
                        {currentSet.name}
                      </h3>
                      <div className="text-[12px] text-zinc-300 italic">
                        {currentSet.subtitle}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-[22px] font-black text-[var(--gold)]">
                        {vnd(currentSet.price, lang)}
                      </div>
                      <div className="text-[10px] text-zinc-300">
                        {t.common.perGuest}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mô tả set */}
              {currentSet.description && (
                <p className="text-[12.5px] leading-relaxed text-[var(--muted)] border-b border-[var(--line)] pb-3.5 mb-3.5">
                  {currentSet.description}
                </p>
              )}

              {/* Danh sách các course món ăn thực tế */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[12px] font-bold text-[var(--gold)] uppercase tracking-wider">
                  <span>Trình Tự Thực Đơn ({courseCount(currentSet)} Món)</span>
                  <span className="text-[11px] text-[var(--faint)] lowercase font-normal">
                    phục vụ lần lượt tại quầy
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentSet.courses.map((course, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface-3)]/60 p-3"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--gold)]/20 text-[10px] font-bold text-[var(--gold)]">
                          {idx + 1}
                        </span>
                        <h4 className="font-display text-[13px] font-bold text-[var(--washi)]">
                          {course.section}
                        </h4>
                      </div>

                      <ul className="grid grid-cols-1 gap-1 text-[12px] text-[var(--muted)] pl-7">
                        {course.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-[var(--shu)] shrink-0" />
                            <span className="text-[var(--washi)] font-medium">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút xem chi tiết set */}
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[12px]">
                <span className="text-[var(--faint)]">
                  Cọc trước 30% giữ ghế (trừ vào hoá đơn)
                </span>
                <button
                  onClick={() => navigate(`/omakase/${currentSet.id}`)}
                  className="flex items-center gap-1 font-bold text-[var(--gold)] hover:underline"
                >
                  <span>Xem chi tiết set</span>
                  <IconChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ─── 5. PINTEREST GALLERY: KHÔNG GIAN OMAKASE & MÓN ĂN TUYỆT TÁC ─── */}
          <div>
            <div className="mb-3">
              <div className="jp text-[10px] text-[var(--shu)] tracking-[0.25em]">
                ギャラリー · PINTEREST GALLERY
              </div>
              <h3 className="font-display text-[18px] font-bold text-[var(--washi)] leading-tight">
                Không Gian Omakase & Món Ăn
              </h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                Chỉ quầy Itamae 12 chỗ, phòng VIP Tatami và các tuyệt tác sushi chế tác trực diện
              </p>
            </div>

            {/* Filter Tabs phong cách Pinterest */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-3.5">
              {[
                { id: "all", label: "Tất cả", count: OMAKASE_PINTEREST_GALLERY.length },
                {
                  id: "space",
                  label: "Không gian Omakase",
                  count: OMAKASE_PINTEREST_GALLERY.filter((p) => p.type === "space").length,
                },
                {
                  id: "dish",
                  label: "Món ăn tại quầy",
                  count: OMAKASE_PINTEREST_GALLERY.filter((p) => p.type === "dish").length,
                },
              ].map((tab) => {
                const active = galleryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      haptic("light");
                      setGalleryFilter(tab.id as any);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-all shrink-0 active:scale-95 ${
                      active
                        ? "bg-[var(--washi)] text-[var(--surface)] shadow-sm"
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--washi)] border border-[var(--line)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active
                          ? "bg-[var(--surface)]/20 text-[var(--surface)]"
                          : "bg-[var(--surface-3)] text-[var(--faint)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lưới ảnh Masonry 2 cột phong cách Pinterest */}
            <div className="flex gap-2.5 items-start">
              {/* Cột 1 */}
              <div className="flex flex-1 flex-col gap-2.5">
                {col1.map((pin) => (
                  <PinterestCard
                    key={pin.id}
                    pin={pin}
                    onOpen={() => {
                      haptic("light");
                      setPreviewPin(pin);
                    }}
                  />
                ))}
              </div>

              {/* Cột 2 */}
              <div className="flex flex-1 flex-col gap-2.5">
                {col2.map((pin) => (
                  <PinterestCard
                    key={pin.id}
                    pin={pin}
                    onOpen={() => {
                      haptic("light");
                      setPreviewPin(pin);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ─── 6. HÀNH TRÌNH 7 BƯỚC THƯỞNG THỨC OMAKASE ─── */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)]/20 text-[12px] text-[var(--gold)]">
                🍣
              </span>
              <div>
                <h4 className="font-display text-[14.5px] font-bold text-[var(--washi)]">
                  Quy Trình Phục Vụ Chuẩn Nhật
                </h4>
                <div className="text-[11px] text-[var(--muted)]">
                  Nhịp điệu ẩm thực được cân đo hoàn hảo bởi Bếp trưởng
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-[var(--line)]">
              {OMAKASE_STEPS.map((s) => (
                <div key={s.step} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--gold)] shrink-0 w-6">
                    0{s.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[12.5px] font-bold text-[var(--washi)]">
                      {s.name}
                    </span>
                    <span className="mx-1.5 text-[var(--faint)]">·</span>
                    <span className="text-[12px] text-[var(--muted)]">{s.vi}</span>
                    <div className="text-[10.5px] text-[var(--faint)] mt-0.2">
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── 7. GHI CHÚ CHÍNH SÁCH PHỤC VỤ ─── */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
            <Note>
              {t.omakase.listNote(Math.round(restaurant.depositRate * 100))}
            </Note>
          </div>
        </div>
      </div>

      {/* ─── 8. THANH ĐẶT BÀN CỐ ĐỊNH ĐÁY MÀN HÌNH (STICKY BOOKING BAR) ─── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-strong)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-2.5 shadow-2xl transition-all"
        style={{
          paddingBottom: "calc(var(--nav-h) + var(--sab) + 8px)",
        }}
      >
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--muted)]">
                Đang chọn:
              </span>
              <span className="font-display text-[13px] font-bold text-[var(--washi)] truncate">
                {currentSet?.name}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display text-[18px] font-extrabold text-[var(--gold)]">
                {vnd(currentSet?.price ?? 2000000, lang)}
              </span>
              <span className="text-[11px] text-[var(--faint)]">/ khách</span>
            </div>
          </div>

          <button
            onClick={() => handleBookNow()}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--shu)] px-6 py-3 font-display text-[13.5px] font-bold text-white shadow-lg shadow-[var(--shu)]/30 active:scale-95 transition-transform hover:brightness-110 shrink-0"
          >
            <span>ĐẶT BÀN NGAY</span>
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ─── 9. MODAL PHÓNG TO ẢNH PINTEREST (LIGHTBOX SHOWROOM) ─── */}
      {previewPin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewPin(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              aria-label="Đóng"
              onClick={() => setPreviewPin(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 active:scale-95 transition-all"
            >
              <IconClose size={18} />
            </button>

            {/* Ảnh full size */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
              <img
                src={previewPin.image}
                alt={previewPin.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-bold text-[var(--gold)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    previewPin.type === "space" ? "bg-[var(--gold)]" : "bg-[var(--shu)]"
                  }`}
                />
                <span>{previewPin.tag}</span>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div className="p-4 space-y-3">
              <div>
                <div className="jp text-[11px] tracking-widest text-[var(--gold)]">
                  {previewPin.jp}
                </div>
                <h3 className="font-display text-[18px] font-bold text-white mt-0.5">
                  {previewPin.title}
                </h3>
                <p className="text-[12.5px] leading-relaxed text-zinc-300 mt-1">
                  {previewPin.desc}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  onClick={() => setPreviewPin(null)}
                  className="rounded-full px-4 py-2 text-[12px] font-medium text-zinc-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    const chosen = previewPin;
                    setPreviewPin(null);
                    handleBookNow(currentSet, chosen.seating || "counter");
                  }}
                  className="flex items-center gap-1 rounded-full bg-[var(--shu)] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md active:scale-95"
                >
                  <span>
                    {previewPin.type === "space"
                      ? "Đặt giữ chỗ không gian này"
                      : "Đặt bàn thưởng thức ngay"}
                  </span>
                  <IconChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
