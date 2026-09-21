import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "zmp-ui";

import { BrandLogo, Note } from "@/components/ui";
import {
  IconCart,
  IconCheck,
  IconChevronLeft,
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

interface LocalizedString {
  vi: string;
  en: string;
  ja: string;
}

/* ─── Cấu trúc mục ảnh Pinterest (Món ăn & Không gian Omakase) ─── */
export type RawPinterestItem = {
  id: string;
  type: "space" | "dish";
  title: LocalizedString;
  jp: string;
  tag: LocalizedString;
  aspectClass: string;
  image: string;
  desc: LocalizedString;
  seating?: "counter" | "private";
};

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

export const RAW_OMAKASE_PINTEREST_GALLERY: RawPinterestItem[] = [
  {
    id: "pin-counter-mood",
    type: "space",
    title: {
      vi: "Quầy Bar Itamae 12 Chỗ",
      en: "12-Seat Itamae Counter",
      ja: "板前カウンター12席",
    },
    jp: "板前カウンター · 12 SEATS",
    tag: {
      vi: "Không gian Omakase",
      en: "Omakase Space",
      ja: "空間・個室",
    },
    aspectClass: "aspect-[3/4]",
    image: omakaseCounterMood,
    desc: {
      vi: "12 chỗ ngồi độc quyền bao quanh quầy chế tác gỗ Hinoki, nơi thực khách trực diện thưởng lãm nghệ thuật ẩm thực từ Bếp Trưởng.",
      en: "Exclusive 12 seats surrounding the natural Hinoki counter, offering direct view of master culinary craftsmanship.",
      ja: "樹齢数百年の檜カウンターを囲む限定12席。総料理長の鮮やかな手捌きを特等席でお愉しみいただけます。",
    },
    seating: "counter",
  },
  {
    id: "pin-chef-prep",
    type: "dish",
    title: {
      vi: "Chế Tác Otoro & Uni Vàng 24K",
      en: "Crafting Otoro & 24K Uni",
      ja: "大トロ雲丹・24K金箔のにぎり",
    },
    jp: "大トロ雲丹 · CHEF'S CRAFT",
    tag: {
      vi: "Món ăn tại quầy",
      en: "Counter Dish",
      ja: "板前料理",
    },
    aspectClass: "aspect-[3/4]",
    image: omakaseChefPrep,
    desc: {
      vi: "Bếp trưởng nắn từng khối cơm giấm ấm, đặt lát cá ngừ Hon-Maguro béo đậm, nhím biển Hokkaido và dát vảy vàng 24k ngay trước mắt thực khách.",
      en: "The chef handcrafts warm Edomae shari, topped with rich Hon-Maguro Otoro, Hokkaido Uni, and delicate 24K gold flakes.",
      ja: "温かい赤酢のシャリに極上本鮪大トロ、北海道産雲丹をのせ、純金箔をあしらって握りたてをお出しします。",
    },
    seating: "counter",
  },
  {
    id: "pin-dish-wagyu",
    type: "dish",
    title: {
      vi: "Miyazaki Wagyu A5 Nướng Đá",
      en: "Volcano Stone Miyazaki Wagyu A5",
      ja: "宮崎牛 A5 溶岩石焼き",
    },
    jp: "宮崎牛 A5 · VOLCANO STONE",
    tag: {
      vi: "Món ăn tại quầy",
      en: "Counter Dish",
      ja: "板前料理",
    },
    aspectClass: "aspect-square",
    image: heroWagyu,
    desc: {
      vi: "Thịt bò Miyazaki Wagyu A5 vân mỡ hoa cẩm thạch béo ngậy tan chảy trên phiến đá núi lửa Phú Sĩ, ngập tràn hương vị đậm đà.",
      en: "Miyazaki A5 Wagyu with intricate marble fat melting on Fuji volcanic stone, bursting with unforgettable rich umami.",
      ja: "富士山溶岩プレートの上でジュワッと焼き上げる宮崎牛A5。口に入れた瞬間に上質な脂の甘みがとろけます。",
    },
  },
  {
    id: "pin-space-tatami",
    type: "space",
    title: {
      vi: "Phòng VIP Tatami Omakase",
      en: "VIP Tatami Private Room",
      ja: "完全個室 畳掘りごたつ席",
    },
    jp: "個室掘りごたつ · PRIVATE ROOM",
    tag: {
      vi: "Không gian Omakase",
      en: "Omakase Space",
      ja: "空間・個室",
    },
    aspectClass: "aspect-[4/5]",
    image: omakaseTatami,
    desc: {
      vi: "Phòng tiệc riêng tư 4-10 khách phong cách Nhật Bản với sàn chiếu Tatami, bàn chìm chân Horigotatsu và cửa trượt Shoji cách âm.",
      en: "Japanese style private room for 4-10 guests featuring authentic Tatami mats, sunken Horigotatsu table and Shoji screens.",
      ja: "4〜10名様対応の完全個室。伝統の畳敷きと足を伸ばせる掘りごたつ、防音障子戸で大切なご会食を優雅に演出。",
    },
    seating: "private",
  },
  {
    id: "pin-dish-sushi",
    type: "dish",
    title: {
      vi: "Otoro & Trứng Cá Tầm Caviar",
      en: "Otoro & Royal Caviar",
      ja: "本鮪大トロ キャビアのせ",
    },
    jp: "本鮪大トロ · CAVIAR NIGIRI",
    tag: {
      vi: "Món ăn tại quầy",
      en: "Counter Dish",
      ja: "板前料理",
    },
    aspectClass: "aspect-square",
    image: heroSushi,
    desc: {
      vi: "Sashimi và Nigiri bụng cá ngừ vây xanh hảo hạng kết hợp cùng trứng cá tầm Caviar hoàng gia và vảy vàng lấp lánh.",
      en: "Prime bluefin tuna Otoro sashimi and nigiri crowned with royal sturgeon caviar and glistening gold leaf.",
      ja: "脂ののった極上本鮪大トロに、贅沢な最高級キャビアと金箔を添えた珠玉のひと品。",
    },
  },
  {
    id: "pin-space-detail",
    type: "space",
    title: {
      vi: "Gỗ Bách Hinoki & Gốm Thủ Công",
      en: "Hinoki Wood & Artisanal Ceramics",
      ja: "檜カウンターと和食器の美",
    },
    jp: "檜木目の美 · HINOKI DETAIL",
    tag: {
      vi: "Không gian Omakase",
      en: "Omakase Space",
      ja: "空間・個室",
    },
    aspectClass: "aspect-[4/3]",
    image: omakaseCounter,
    desc: {
      vi: "Đường nét tinh tế của phiến gỗ Hinoki nguyên khối cùng bộ chén đĩa gốm mộc tráng men tạo nên cảm giác ấm áp và tĩnh tại chuẩn phong vị Nhật Bản.",
      en: "Refined grain of solid Hinoki cypress paired with handcrafted glazed pottery brings authentic warmth and zen tranquility.",
      ja: "樹齢を重ねた無垢の檜の木目と、職人が焼き上げた温もりある和陶器が心地よい静寂と安らぎをもたらします。",
    },
    seating: "counter",
  },
  {
    id: "pin-dish-course",
    type: "dish",
    title: {
      vi: "Tuyệt Tác Hải Sản Omakase",
      en: "Edomae Seafood Masterpieces",
      ja: "豊洲直送 旬の海鮮おまかせ",
    },
    jp: "おまかせ海鮮 · EDOMAE ART",
    tag: {
      vi: "Món ăn tại quầy",
      en: "Counter Dish",
      ja: "板前料理",
    },
    aspectClass: "aspect-[4/3]",
    image: heroOmakase,
    desc: {
      vi: "100% hải sản được nhập khẩu tươi sống bằng đường hàng không mỗi sáng từ chợ Toyosu Tokyo, phục vụ chuẩn nhiệt độ.",
      en: "100% live seafood air-flown every morning directly from Toyosu Market Tokyo, served at perfect serving temperature.",
      ja: "東京豊洲市場から毎朝空輸される活鮮魚。魚種ごとに最適な熟成と温度管理で最高の状態でお届けします。",
    },
  },
];

/* ─── Danh sách các Slide Showroom Omakase trên cùng ─── */
interface RawSlide {
  id: string;
  image: string;
  tag: LocalizedString;
  jp: string;
  title: LocalizedString;
  desc: LocalizedString;
}

const RAW_OMAKASE_SLIDES: RawSlide[] = [
  {
    id: "slide-counter-mood",
    image: omakaseCounterMood,
    tag: {
      vi: "Quầy Itamae 12 Ghế Bếp Trưởng",
      en: "12-Seat Master Itamae Bar",
      ja: "板前カウンター12席",
    },
    jp: "板前カウンター · 12 SEATS",
    title: {
      vi: "Không Gian Quầy Bar Bếp Trưởng",
      en: "Master Chef Counter Bar",
      ja: "板前カウンターの空間",
    },
    desc: {
      vi: "Không gian 12 ghế gỗ Hinoki độc quyền, nơi thực khách trực diện chiêm ngưỡng từng thao tác dao và nghệ thuật nắn sushi đỉnh cao.",
      en: "Exclusive 12 Hinoki seats where guests directly appreciate knife skills and the apex of sushi crafting.",
      ja: "厳選された檜の一枚板カウンター12席。職人の繊細な包丁さばきと美しい握りの技を間近で堪能。",
    },
  },
  {
    id: "slide-chef-prep",
    image: omakaseChefPrep,
    tag: {
      vi: "Nghệ Thuật Trình Diễn Tại Chỗ",
      en: "Live Culinary Artistry",
      ja: "目の前で魅せる職人技",
    },
    jp: "職人技 · MASTER CHEF CRAFT",
    title: {
      vi: "Kỹ Nghệ Nắn Sushi Đỉnh Cao",
      en: "Pinnacle of Sushi Craftsmanship",
      ja: "至高の江戸前寿司の技",
    },
    desc: {
      vi: "Chiêm ngưỡng Bếp trưởng nắn Nigiri, điểm xuyết Uni tươi, Otoro và vảy vàng 24k phục vụ ngay trong tích tắc chuẩn nhiệt độ.",
      en: "Witness the Head Chef sculpt Nigiri with fresh Uni, rich Otoro and 24K gold leaf, served in an instant at perfect warmth.",
      ja: "新鮮な雲丹、大トロ、純金箔を散りばめた握りたてのひと貫。温度と鮮度を極めた至福の口福。",
    },
  },
  {
    id: "slide-tatami",
    image: omakaseTatami,
    tag: {
      vi: "Phòng VIP Tatami Riêng Tư",
      en: "Private Tatami VIP Suite",
      ja: "完全個室 畳掘りごたつ",
    },
    jp: "個室畳 · PRIVATE TATAMI ROOM",
    title: {
      vi: "Không Gian Omakase VIP Riêng Tư",
      en: "Private VIP Omakase Setting",
      ja: "格調高いVIP個室空間",
    },
    desc: {
      vi: "Phòng riêng biệt lập từ 4-10 khách với bàn Horigotatsu chìm ấm cúng cho tiệc ngoại giao và họp mặt gia đình trang trọng.",
      en: "Secluded suite for 4-10 guests with sunken Horigotatsu table, ideal for diplomatic dinners and intimate family milestones.",
      ja: "4〜10名様用の静謐な個室。足を楽にできる掘りごたつで、大切な接待やご家族の記念日を特別に演出。",
    },
  },
  {
    id: "slide-wagyu",
    image: heroWagyu,
    tag: {
      vi: "Miyazaki Wagyu A5 · Núi Lửa Phú Sĩ",
      en: "Miyazaki A5 Wagyu · Fuji Stone",
      ja: "宮崎牛A5 · 富士山溶岩焼き",
    },
    jp: "宮崎牛 · WAGYU A5 PERFECTION",
    title: {
      vi: "Bò Wagyu A5 Nướng Đá Núi Lửa",
      en: "A5 Wagyu on Volcano Stone",
      ja: "A5ランク和牛の溶岩石焼き",
    },
    desc: {
      vi: "Vân mỡ cẩm thạch béo ngậy tan chảy trên đầu lưỡi, nướng xèo xèo đánh thức mọi giác quan của thực khách sành ăn.",
      en: "Delicate marbling melting effortlessly on the palate, sizzling on volcanic stone to awaken all senses.",
      ja: "極上の霜降りが舌の上ですっととろける芳醇な旨み。熱々の溶岩プレートが五感を心地よく刺激します。",
    },
  },
  {
    id: "slide-sushi",
    image: heroSushi,
    tag: {
      vi: "100% Nhập Khẩu Hàng Không",
      en: "100% Air-Flown Fresh Daily",
      ja: "豊洲より毎朝100%空輸",
    },
    jp: "江戸前寿司 · EDOMAE CRAFTSMANSHIP",
    title: {
      vi: "Otoro Vảy Vàng & Nhím Biển Uni",
      en: "Gold-Leaf Otoro & Fresh Sea Urchin",
      ja: "金箔大トロと極上生うに",
    },
    desc: {
      vi: "Bụng cá ngừ Hon-Maguro béo đậm dát vàng 24k kết hợp cùng trứng cá tầm Caviar hoàng đế.",
      en: "Decadent bluefin tuna Otoro leafed in 24k gold, complemented by imperial sturgeon caviar.",
      ja: "本鮪大トロに純度24Kの金箔と最高峰キャビアを贅沢に添えた、宮古を象徴するスペシャリテ。",
    },
  },
];

/* ─── 7 Bước thưởng thức Omakase truyền thống ─── */
interface StepItem {
  step: number;
  name: string;
  title: LocalizedString;
  desc: LocalizedString;
}

const OMAKASE_STEPS: StepItem[] = [
  {
    step: 1,
    name: "Sakizuke",
    title: { vi: "Khai vị tinh tế", en: "Delicate Appetizer", ja: "先付け（前菜）" },
    desc: {
      vi: "Đánh thức vị giác với nguyên liệu theo mùa tươi mát",
      en: "Awakens palate with fresh seasonal ingredients",
      ja: "旬の味覚で五感を優しく目覚めさせる最初の一品",
    },
  },
  {
    step: 2,
    name: "Otsukuri",
    title: { vi: "Sashimi hải vị", en: "Seasonal Sashimi", ja: "お造り（刺身）" },
    desc: {
      vi: "Hải sản tươi sống vận chuyển bằng đường hàng không",
      en: "Prime seafood air-flown daily from Toyosu Market",
      ja: "豊洲から直送された鮮魚の洗練されたお造り",
    },
  },
  {
    step: 3,
    name: "Yakimono",
    title: { vi: "Món nướng than hoa", en: "Charcoal Grilled Course", ja: "焼き物" },
    desc: {
      vi: "Bò Wagyu hoặc Lươn nướng thơm lừng chuẩn vị",
      en: "Fragrant grilled Wagyu or glazed Unagi",
      ja: "備長炭の香ばしさを纏わせた和牛や旬魚の焼き物",
    },
  },
  {
    step: 4,
    name: "Nigiri Edo",
    title: { vi: "Sushi thủ công", en: "Artisan Edomae Sushi", ja: "江戸前握り寿司" },
    desc: {
      vi: "Nghệ thuật nắn cơm giấm ấm và hải vị quý hiếm",
      en: "Craftsmanship of warm shari and rare seafood treasures",
      ja: "赤酢シャリと極上ネタをその場で握る伝統の技",
    },
  },
  {
    step: 5,
    name: "Wagyu A5",
    title: { vi: "Bò đá núi lửa", en: "Volcano Stone Wagyu", ja: "極上A5和牛" },
    desc: {
      vi: "Vị béo ngậy tan chảy của Wagyu A5 Miyazaki",
      en: "Melting richness of certified Miyazaki A5 Wagyu",
      ja: "口どけ豊かな宮崎牛A5の上質な脂と赤身の調和",
    },
  },
  {
    step: 6,
    name: "Tome-wan",
    title: { vi: "Canh thanh vị", en: "Finishing Soup", ja: "止椀（お椀）" },
    desc: {
      vi: "Nước dùng Dashi ấm bụng kết thúc món chính",
      en: "Warm rich Dashi broth gently closing the savory journey",
      ja: "丁寧に引いた出汁でホッとする締めのお吸い物",
    },
  },
  {
    step: 7,
    name: "Mizumono",
    title: { vi: "Wagashi & Matcha", en: "Wagashi & Ceremonial Tea", ja: "水物・甘味" },
    desc: {
      vi: "Tráng miệng thanh tao khép lại trọn vẹn hành trình",
      en: "Refreshing traditional dessert rounding off the feast",
      ja: "季節の和菓子と香り高い抹茶で締めくくる余韻",
    },
  },
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

/* ─── Trình xem Thư viện ảnh Gallery Lightbox toàn màn hình ─── */
function OmakaseLightboxGallery({
  items,
  currentIndex,
  onClose,
  onSelectIndex,
  onBook,
  lang,
}: {
  items: PinterestItem[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onBook: (item: PinterestItem) => void;
  lang: "vi" | "en" | "ja";
}) {
  const current = items[currentIndex] || items[0];
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const goPrev = () => {
    haptic("light");
    onSelectIndex((currentIndex - 1 + items.length) % items.length);
  };

  const goNext = () => {
    haptic("light");
    onSelectIndex((currentIndex + 1) % items.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, items.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-2xl animate-fade-in select-none"
      onClick={onClose}
    >
      {/* 1. Header: Loại ảnh + Chỉ số ảnh + Nút đóng */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingTop: "calc(var(--sat, 0px) + 12px)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-white/15 shadow-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                current.type === "space" ? "bg-[var(--gold)]" : "bg-[var(--shu)]"
              }`}
            />
            <span>
              {current.type === "space"
                ? (lang === "ja" ? "空間・個室" : lang === "en" ? "Omakase Space" : "Không gian Omakase")
                : (lang === "ja" ? "板前料理" : lang === "en" ? "Culinary Art" : "Món ăn nghệ thuật")}
            </span>
          </div>

          {current.seating && (
            <span className="rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/40 px-2.5 py-0.5 text-[10px] font-bold text-[var(--gold)]">
              {current.seating === "counter"
                ? (lang === "ja" ? "カウンター12席" : lang === "en" ? "12-Seat Bar" : "Quầy Bar 12 Ghế")
                : (lang === "ja" ? "個室畳席" : lang === "en" ? "VIP Tatami Room" : "Phòng VIP Tatami")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="font-mono text-[11.5px] font-bold tracking-widest text-[var(--gold)] bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {currentIndex + 1} / {items.length}
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 active:scale-90 transition-all hover:bg-white/25"
          >
            <IconClose size={20} />
          </button>
        </div>
      </div>

      {/* 2. Main Stage: Ảnh kích thước lớn + Mũi tên điều hướng + Vuốt cảm ứng */}
      <div
        className="relative flex-1 flex items-center justify-center px-2 min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const diff = e.changedTouches[0].clientX - touchStartX;
          if (diff > 40) goPrev();
          else if (diff < -40) goNext();
          setTouchStartX(null);
        }}
      >
        {/* Nút Prev */}
        <button
          type="button"
          aria-label="Previous"
          onClick={goPrev}
          className="absolute left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-90 hover:bg-black/80 hover:text-white"
        >
          <IconChevronLeft size={22} />
        </button>

        {/* Khung ảnh chính */}
        <div className="relative max-h-[56vh] w-full flex items-center justify-center px-8">
          <img
            key={current.id}
            src={current.image}
            alt={current.title}
            className="max-h-[56vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 transition-all duration-300"
          />
        </div>

        {/* Nút Next */}
        <button
          type="button"
          aria-label="Next"
          onClick={goNext}
          className="absolute right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-90 hover:bg-black/80 hover:text-white"
        >
          <IconChevronRight size={22} />
        </button>
      </div>

      {/* 3. Bottom Panel: Thông tin + Thumbnail Carousel + Nút đặt bàn */}
      <div
        className="bg-gradient-to-t from-black via-zinc-950/95 to-transparent px-4 pt-3 pb-5 border-t border-white/10 z-20 shrink-0"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(var(--sab, 0px) + 14px)" }}
      >
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Thông tin ảnh */}
          <div>
            <div className="jp text-[10.5px] tracking-widest text-[var(--gold)] font-medium">
              {current.jp}
            </div>
            <h3 className="font-display text-[15px] font-bold text-white mt-0.5 leading-snug">
              {current.title}
            </h3>
            <p className="text-[11.5px] leading-relaxed text-zinc-300 mt-0.5 line-clamp-2">
              {current.desc}
            </p>
          </div>

          {/* Dải hình ảnh thu nhỏ (Thumbnail Strip) */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {items.map((it, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    onSelectIndex(idx);
                  }}
                  className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                    isActive
                      ? "border-2 border-[var(--gold)] ring-2 ring-[var(--gold)]/40 scale-105 shadow-md"
                      : "opacity-45 hover:opacity-80 border border-white/20"
                  }`}
                >
                  <img
                    src={it.image}
                    alt={it.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>

          {/* Nút đặt bàn tương ứng với ảnh */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <span className="text-[10.5px] text-zinc-400">
              {lang === "ja"
                ? "左右にスワイプして閲覧"
                : lang === "en"
                ? "Swipe left/right to browse"
                : "Vuốt sang trái/phải để duyệt ảnh"}
            </span>

            <button
              type="button"
              onClick={() => onBook(current)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--shu)] px-4 py-2 text-[12px] font-bold text-white shadow-lg shadow-[var(--shu)]/30 active:scale-95 transition-all hover:brightness-110 shrink-0"
            >
              <span>
                {current.type === "space"
                  ? (lang === "ja" ? "このお席を予約" : lang === "en" ? "Reserve This Space" : "Đặt Giữ Chỗ Này")
                  : (lang === "ja" ? "コースを予約する" : lang === "en" ? "Book This Experience" : "Đặt Bàn Trải Nghiệm")}
              </span>
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
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

  // Trình xem Thư viện ảnh Gallery Lightbox toàn màn hình
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Danh sách Slides showroom theo ngôn ngữ
  const localizedSlides = useMemo(() => {
    return RAW_OMAKASE_SLIDES.map((s) => ({
      id: s.id,
      image: s.image,
      jp: s.jp,
      tag: s.tag[lang] ?? s.tag.vi,
      title: s.title[lang] ?? s.title.vi,
      desc: s.desc[lang] ?? s.desc.vi,
    }));
  }, [lang]);

  // Gallery Pinterest items theo ngôn ngữ
  const localizedPinterestItems = useMemo<PinterestItem[]>(() => {
    return RAW_OMAKASE_PINTEREST_GALLERY.map((p) => ({
      id: p.id,
      type: p.type,
      jp: p.jp,
      aspectClass: p.aspectClass,
      image: p.image,
      seating: p.seating,
      title: p.title[lang] ?? p.title.vi,
      tag: p.tag[lang] ?? p.tag.vi,
      desc: p.desc[lang] ?? p.desc.vi,
    }));
  }, [lang]);

  // Phân chia items vào 2 cột zic-zac phong cách Pinterest Masonry
  const filteredPins = useMemo(() => {
    if (galleryFilter === "all") return localizedPinterestItems;
    return localizedPinterestItems.filter((p) => p.type === galleryFilter);
  }, [localizedPinterestItems, galleryFilter]);

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
      setActiveSlide((prev) => (prev + 1) % localizedSlides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [localizedSlides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 40) {
      haptic("light");
      setActiveSlide((prev) => (prev + 1) % localizedSlides.length);
    } else if (diff < -40) {
      haptic("light");
      setActiveSlide((prev) => (prev - 1 + localizedSlides.length) % localizedSlides.length);
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
            {localizedSlides.map((slide) => (
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
            <span>{localizedSlides.length}</span>
          </div>

          {/* Dải Dots chỉ số ở đáy góc phải */}
          <div className="absolute bottom-2.5 right-4 z-10 flex items-center gap-1.5">
            {localizedSlides.map((_, i) => (
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
          {/* ─── 3 HÀNG SUẤT OMAKASE (3 CARDS DỌC XẾP THEO HÀNG) ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[var(--washi)]">
                  {lang === "ja"
                    ? "おまかせコースの選択"
                    : lang === "en"
                    ? "Omakase Course Selection"
                    : "Lựa Chọn Suất Omakase"}
                </h2>
                <div className="text-[11.5px] text-[var(--muted)]">
                  {lang === "ja"
                    ? "熟練の技と旬の厳選素材を織り込んだ3つのコース"
                    : lang === "en"
                    ? "3 curated fine-dining experiences with distinct master creations"
                    : "3 mức giá chuẩn Fine Dining với thực đơn chuẩn bị tỉ mỉ"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {sets.map((s) => {
                const active = s.id === selectedSetId;
                const setImg =
                  s.id === "kaze"
                    ? heroOmakase
                    : s.id === "omakase-2m"
                    ? heroWagyu
                    : heroSushi;

                const badgeText =
                  s.id === "kaze"
                    ? (lang === "ja" ? "最高峰・極み" : lang === "en" ? "Royal VIP Tier" : "VIP Nhất · Hoàng Gia")
                    : s.id === "omakase-2m"
                    ? (lang === "ja" ? "一番人気" : lang === "en" ? "Most Popular Choice" : "Được Chọn Nhiều Nhất")
                    : (lang === "ja" ? "精選入門" : lang === "en" ? "Essential Signature" : "Khởi Đầu Tinh Hoa");

                const statusText = active
                  ? (lang === "ja" ? "選択中" : lang === "en" ? "Selected" : "Đang chọn")
                  : (lang === "ja" ? "タップして選択" : lang === "en" ? "Tap to select" : "Chạm để chọn");

                const courseSeqTitle =
                  lang === "ja"
                    ? `お品書きの流れ（全${courseCount(s)}品）`
                    : lang === "en"
                    ? `Course Sequence (${courseCount(s)} Courses)`
                    : `Trình Tự Thực Đơn (${courseCount(s)} Món)`;

                const courseSeqHint =
                  lang === "ja"
                    ? "カウンターにて順次提供"
                    : lang === "en"
                    ? "served sequentially at counter"
                    : "phục vụ tuần tự tại quầy";

                const depositHint =
                  lang === "ja"
                    ? "お席の確保に30%のお預かり金（お会計時に相殺）"
                    : lang === "en"
                    ? "30% deposit to reserve (deducted from final bill)"
                    : "Cọc trước 30% giữ chỗ (trừ vào hoá đơn)";

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      haptic("light");
                      setSelectedSetId(s.id);
                    }}
                    className={`relative overflow-hidden rounded-3xl border transition-all duration-300 cursor-pointer shadow-md ${
                      active
                        ? "border-[var(--gold)] bg-gradient-to-b from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] ring-1 ring-[var(--gold)]/40 shadow-xl shadow-[var(--gold)]/10"
                        : "border-[var(--line)] bg-[var(--surface-2)] hover:border-white/25 opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Ảnh đại diện set + Thông tin header của hàng */}
                    <div className="relative h-[155px] w-full overflow-hidden select-none">
                      <img
                        src={setImg}
                        alt={s.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                      {/* Badge góc trên */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <span className="rounded-full bg-black/65 backdrop-blur-md px-2.5 py-0.5 text-[9.5px] font-bold text-white border border-white/20 shadow-sm">
                          {badgeText}
                        </span>

                        {/* Trạng thái chọn */}
                        <div
                          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                            active
                              ? "bg-[var(--gold)] text-black shadow-md"
                              : "bg-black/50 text-white/70 border border-white/20"
                          }`}
                        >
                          {active && <IconCheck size={12} />}
                          <span>{statusText}</span>
                        </div>
                      </div>

                      {/* Tiêu đề dưới chân ảnh */}
                      <div className="absolute inset-x-3 bottom-2.5 text-white">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="jp text-[11px] text-[var(--gold)] tracking-widest font-semibold">
                              {s.jp} · Omakase Course
                            </div>
                            <h3 className="font-display text-[18px] font-bold leading-tight mt-0.5 text-white truncate">
                              {s.name}
                            </h3>
                            <div className="text-[11.5px] text-zinc-300 italic truncate">
                              {s.subtitle}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-display text-[20px] font-black text-[var(--gold)] leading-none">
                              {vnd(s.price, lang)}
                            </div>
                            <div className="text-[9.5px] text-zinc-300 mt-0.5">
                              {t.common.perGuest} · {courseCount(s)}{" "}
                              {lang === "ja" ? "品" : lang === "en" ? "dishes" : "món"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phần nội dung chi tiết của hàng */}
                    <div className="p-3.5 space-y-3">
                      {/* Mô tả ngắn */}
                      {s.description && (
                        <p className="text-[12px] leading-relaxed text-[var(--muted)] line-clamp-2">
                          {s.description}
                        </p>
                      )}

                      {/* Danh sách các course nếu đang active */}
                      {active ? (
                        <div className="space-y-2 pt-1 border-t border-[var(--line)] animate-fade-in">
                          <div className="flex items-center justify-between text-[11.5px] font-bold text-[var(--gold)] uppercase tracking-wider">
                            <span>{courseSeqTitle}</span>
                            <span className="text-[10.5px] text-[var(--faint)] lowercase font-normal">
                              {courseSeqHint}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-1.5">
                            {s.courses.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-[var(--line)] bg-[var(--surface-3)]/60 p-2.5"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--gold)]/20 text-[9.5px] font-bold text-[var(--gold)]">
                                    0{idx + 1}
                                  </span>
                                  <h4 className="font-display text-[12px] font-bold text-[var(--washi)]">
                                    {c.section}
                                  </h4>
                                </div>

                                <ul className="grid grid-cols-1 gap-0.5 text-[11.5px] text-[var(--muted)] pl-6">
                                  {c.items.map((item, itemIdx) => (
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

                          <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--line)] text-[11.5px]">
                            <span className="text-[var(--faint)]">
                              {depositHint}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/omakase/${s.id}`);
                              }}
                              className="flex items-center gap-1 font-bold text-[var(--gold)] hover:underline shrink-0"
                            >
                              <span>
                                {lang === "ja" ? "詳細を見る" : lang === "en" ? "Course details" : "Chi tiết set"}
                              </span>
                              <IconChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Khi chưa active: Hiển thị tóm tắt món nổi bật và nút Xem chi tiết */
                        <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11.5px]">
                          <div className="flex items-center gap-1.5 text-[var(--muted)] truncate max-w-[72%]">
                            <span className="text-[var(--gold)] font-bold">
                              {lang === "ja" ? "内容:" : lang === "en" ? "Includes:" : "Gồm:"}
                            </span>
                            <span className="truncate">
                              {s.courses.map((c) => c.section.split("(")[0].trim()).join(" · ")}
                            </span>
                          </div>
                          <span className="font-bold text-[var(--gold)] shrink-0 flex items-center gap-0.5">
                            <span>
                              {lang === "ja" ? "メニューを見る" : lang === "en" ? "View menu" : "Chọn xem menu"}
                            </span>
                            <IconChevronRight size={12} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 5. PINTEREST GALLERY: KHÔNG GIAN OMAKASE & MÓN ĂN TUYỆT TÁC ─── */}
          <div>
            <div className="mb-3">
              <div className="jp text-[10px] text-[var(--shu)] tracking-[0.25em]">
                ギャラリー · PINTEREST GALLERY
              </div>
              <h3 className="font-display text-[18px] font-bold text-[var(--washi)] leading-tight">
                {lang === "ja"
                  ? "空間・個室とお料理ギャラリー"
                  : lang === "en"
                  ? "Omakase Spaces & Culinary Art"
                  : "Không Gian Omakase & Món Ăn"}
              </h3>
              <p className="text-[12px] text-[var(--muted)] mt-0.5">
                {lang === "ja"
                  ? "板前カウンター12席、個室畳席と職人が目の前で握る極上寿司"
                  : lang === "en"
                  ? "Exclusive 12-seat Hinoki counter, private Tatami rooms and master sushi"
                  : "Chỉ quầy Itamae 12 chỗ, phòng VIP Tatami và các tuyệt tác sushi chế tác trực diện"}
              </p>
            </div>

            {/* Filter Tabs phong cách Pinterest */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-3.5">
              {[
                {
                  id: "all",
                  label: lang === "ja" ? "すべて" : lang === "en" ? "All" : "Tất cả",
                  count: localizedPinterestItems.length,
                },
                {
                  id: "space",
                  label: lang === "ja" ? "空間・個室" : lang === "en" ? "Spaces" : "Không gian Omakase",
                  count: localizedPinterestItems.filter((p) => p.type === "space").length,
                },
                {
                  id: "dish",
                  label: lang === "ja" ? "お料理" : lang === "en" ? "Dishes" : "Món ăn tại quầy",
                  count: localizedPinterestItems.filter((p) => p.type === "dish").length,
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
                      const idx = filteredPins.findIndex((p) => p.id === pin.id);
                      setGalleryIndex(idx !== -1 ? idx : 0);
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
                      const idx = filteredPins.findIndex((p) => p.id === pin.id);
                      setGalleryIndex(idx !== -1 ? idx : 0);
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
                  {lang === "ja"
                    ? "伝統的なおまかせの7段階"
                    : lang === "en"
                    ? "Traditional 7-Stage Omakase"
                    : "Quy Trình Phục Vụ Chuẩn Nhật"}
                </h4>
                <div className="text-[11px] text-[var(--muted)]">
                  {lang === "ja"
                    ? "総料理長が細部まで調和させた美食のリズム"
                    : lang === "en"
                    ? "Pacing orchestrated with precision by the Head Chef"
                    : "Nhịp điệu ẩm thực được cân đo hoàn hảo bởi Bếp trưởng"}
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
                    <span className="text-[12px] text-[var(--muted)]">
                      {s.title[lang] ?? s.title.vi}
                    </span>
                    <div className="text-[10.5px] text-[var(--faint)] mt-0.2">
                      {s.desc[lang] ?? s.desc.vi}
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
                {lang === "ja" ? "選択中:" : lang === "en" ? "Selected:" : "Đang chọn:"}
              </span>
              <span className="font-display text-[13px] font-bold text-[var(--washi)] truncate">
                {currentSet?.name}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display text-[18px] font-extrabold text-[var(--gold)]">
                {vnd(currentSet?.price ?? 2000000, lang)}
              </span>
              <span className="text-[11px] text-[var(--faint)]">{t.common.perGuest}</span>
            </div>
          </div>

          <button
            onClick={() => handleBookNow()}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[var(--shu)] px-6 py-3 font-display text-[13.5px] font-bold text-white shadow-lg shadow-[var(--shu)]/30 active:scale-95 transition-transform hover:brightness-110 shrink-0"
          >
            <span>
              {lang === "ja" ? "今すぐ予約" : lang === "en" ? "BOOK NOW" : "ĐẶT BÀN NGAY"}
            </span>
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ─── 9. GALLERY LIGHTBOX TOÀN MÀN HÌNH (OMAKASE SHOWROOM) ─── */}
      {galleryIndex !== null && filteredPins[galleryIndex] && (
        <OmakaseLightboxGallery
          items={filteredPins}
          currentIndex={galleryIndex}
          lang={lang}
          onClose={() => setGalleryIndex(null)}
          onSelectIndex={(idx) => setGalleryIndex(idx)}
          onBook={(item) => {
            setGalleryIndex(null);
            handleBookNow(currentSet, item.seating || "counter");
          }}
        />
      )}
    </Screen>
  );
}
