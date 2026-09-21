/**
 * Nội dung các trang — bản đóng gói sẵn.
 *
 * Nguồn sự thật là CSDL: bảng `banners`, `content_items`, `loyalty_tiers`,
 * `loyalty_quests` và các cột chữ của `restaurant_settings`, nhà hàng sửa
 * trong CMS. Bản ở đây chỉ để app hiện được ngay khi mở và khi mạng hỏng,
 * giống `menu.ts`.
 *
 * Migration 20260921000010 được sinh từ chính file này
 * (`node supabase/seed/generate-content-seed.mjs`), nên sửa ở đây rồi sinh
 * lại thì môi trường mới dựng lên có đúng nội dung này.
 *
 * Ý nghĩa các trường của `ContentItem` theo từng section:
 *
 *   home_search / menu_search / butcher_search
 *       title = một câu gợi ý trong ô tìm kiếm
 *   home_tab       title = tên tab · key = biểu tượng
 *                  meta.categories = các nhóm món của tab (rỗng = mọi món)
 *   home_promo     tag = nhãn nhỏ · subtitle = dòng phụ cạnh nhãn
 *                  title · body = mô tả · link = trang mở · key = biểu tượng
 *   home_highlight title · subtitle · key = biểu tượng
 *   home_offer     title · subtitle = điều kiện · body = hạn dùng
 *                  tag = mã ưu đãi · link = trang mở khi bấm "Dùng ngay"
 *   omakase_step   jp = tên món theo trình tự (romaji) · title · body
 *   omakase_gallery image · title · jp · tag · body
 *                  key = "space" | "dish" · meta.seating = "counter" | "private"
 *                  meta.aspect = tỷ lệ khung ảnh, ví dụ "3/4"
 *   about_spec     title = tên thông số · subtitle = giá trị
 *   butcher_tab    title = tên tab · key = nhãn lọc (khớp `dishes.tags`)
 *   butcher_cut    title = một kiểu cắt thịt
 *   butcher_promise title · subtitle · key = biểu tượng
 */
import type {
  Banner,
  BannerPlacement,
  ContentItem,
  ContentSection,
  I18nBag,
  LoyaltyQuest,
  LoyaltyTier,
  RewardGiftItem,
} from "@/types";

const CDN =
  "https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static";

export const STATIC_IMAGES = {
  logo: `${CDN}/logo.png`,
  logoDark: `${CDN}/logo-dark.png`,
  logoWide: `${CDN}/Light_4x-scaled.png`,
  logoWideDark: `${CDN}/logo-horizontal-dark.png`,
  space: `${CDN}/space.jpg`,
  omakaseCounter: `${CDN}/omakase-counter.jpg`,
  omakaseTatami: `${CDN}/omakase-tatami.jpg`,
  omakaseChefPrep: `${CDN}/omakase-chef-prep.jpg`,
  omakaseCounterMood: `${CDN}/omakase-counter-mood.jpg`,
  heroDon: `${CDN}/hero-don.jpg`,
  heroHotpot: `${CDN}/hero-hotpot.jpg`,
  heroOmakase: `${CDN}/hero-omakase.jpg`,
  heroSushi: `${CDN}/hero-sushi.jpg`,
  heroWagyu: `${CDN}/hero-wagyu.jpg`,
};

/** Một câu ba thứ tiếng: [Việt, Anh, Nhật]. Chỉ một chuỗi = không dịch. */
type T = string | [vi: string, en: string, ja: string];

/** Tách câu ba thứ tiếng thành cột tiếng Việt và cột `i18n`. */
function split<K extends string>(fields: Partial<Record<K, T | undefined>>) {
  const vi: Partial<Record<K, string>> = {};
  const en: Record<string, string> = {};
  const ja: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields) as [K, T | undefined][]) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      vi[k] = v;
    } else {
      vi[k] = v[0];
      en[k] = v[1];
      ja[k] = v[2];
    }
  }
  const i18n: I18nBag = {};
  if (Object.keys(en).length) i18n.en = en;
  if (Object.keys(ja).length) i18n.ja = ja;
  return { vi, i18n: Object.keys(i18n).length ? i18n : undefined };
}

/* ════════════════════════════════════════════════════════════
   Banner
   ════════════════════════════════════════════════════════════ */

function banner(
  placement: BannerPlacement,
  id: string,
  f: {
    tag?: T;
    title: T;
    subtitle?: T;
    cta?: T;
    jp?: string;
    link?: string;
    image: string;
    accent?: string;
  }
): Banner {
  const { vi, i18n } = split({
    tag: f.tag,
    title: f.title,
    subtitle: f.subtitle,
    cta_text: f.cta,
  });
  return {
    id,
    placement,
    title: vi.title ?? "",
    subtitle: vi.subtitle,
    tag: vi.tag,
    jp: f.jp,
    image: f.image,
    ctaText: vi.cta_text,
    ctaLink: f.link,
    accent: f.accent,
    i18n,
  };
}

export const BANNERS: Banner[] = [
  /* ── Trang chủ ── */
  banner("home_hero", "home-omakase", {
    tag: ["OMAKASE VIP", "VIP OMAKASE", "VIPおまかせ"],
    title: ["Tiệc Bếp Trưởng Omakase", "Master Chef Omakase Feast", "総料理長 おまかせコース"],
    subtitle: [
      "Trải nghiệm ẩm thực Kaiseki đỉnh cao tại quầy Bar riêng tư 12 ghế",
      "Exquisite Kaiseki dining at an exclusive private 12-seat counter",
      "限定12席の檜カウンターで味わう至高の会席・江戸前料理",
    ],
    cta: ["Xem suất tiệc", "Explore sets", "コースを見る"],
    link: "/omakase",
    image: STATIC_IMAGES.heroOmakase,
  }),
  banner("home_hero", "home-butcher", {
    tag: ["MIYAKO BUTCHER", "MIYAKO BUTCHER", "宮古 精肉店"],
    title: ["Thịt Bò Wagyu A5 Tươi", "Fresh Japanese A5 Wagyu", "切り立て A5ランク黒毛和牛"],
    subtitle: [
      "Sơ chế cắt theo yêu cầu: Steak, Lẩu Shabu, Nướng Yakiniku",
      "Custom-cut to order: Steak, Shabu Hotpot, Yakiniku Grill",
      "ステーキ・しゃぶしゃぶ・焼肉用にお好みの厚さでカット",
    ],
    cta: ["Mua mang về", "Shop meats", "精肉を見る"],
    link: "/butcher",
    image: STATIC_IMAGES.heroWagyu,
    accent: "#881008",
  }),
  banner("home_hero", "home-hotpot", {
    tag: ["SET LẨU TẠI GIA", "HOME HOTPOT SET", "おうち鍋セット"],
    title: ["Lẩu Shabu & Sukiyaki", "Shabu & Sukiyaki Sets", "特選しゃぶしゃぶ＆すき焼き"],
    subtitle: [
      "Tặng kèm nước dùng hầm 12h, rau nấm và sốt mè rang Nhật Bản",
      "Free 12h slow-simmered broth, fresh greens, and sesame sauce",
      "12時間煮込み特製出汁・旬の野菜・特製胡麻だれ付き",
    ],
    cta: ["Đặt giao ngay", "Order delivery", "今すぐ注文"],
    link: "/menu",
    image: STATIC_IMAGES.heroHotpot,
  }),
  banner("home_hero", "home-sushi", {
    tag: ["TOYOSU DAILY", "TOYOSU DAILY", "豊洲市場より毎日空輸"],
    title: ["Sashimi Tươi Sống Mỗi Ngày", "Fresh Daily Sashimi", "朝獲れ 鮮魚のお造り"],
    subtitle: [
      "Cá ngừ đại dương Hon Maguro & bụng cá hồi Na Uy thượng hạng",
      "Prime Pacific bluefin Hon-Maguro & fresh Norwegian salmon belly",
      "本鮪大トロとノルウェー産最高級サーモンの贅沢盛り合わせ",
    ],
    cta: ["Khám phá menu", "Explore menu", "メニューを見る"],
    link: "/menu",
    image: STATIC_IMAGES.heroSushi,
  }),

  /* ── Trang Omakase ── */
  banner("omakase_hero", "omakase-counter-mood", {
    tag: ["Quầy Itamae 12 Ghế Bếp Trưởng", "12-Seat Master Itamae Bar", "板前カウンター12席"],
    jp: "板前カウンター · 12 SEATS",
    title: ["Không Gian Quầy Bar Bếp Trưởng", "Master Chef Counter Bar", "板前カウンターの空間"],
    subtitle: [
      "Không gian 12 ghế gỗ Hinoki độc quyền, nơi thực khách trực diện chiêm ngưỡng từng thao tác dao và nghệ thuật nắn sushi đỉnh cao.",
      "Exclusive 12 Hinoki seats where guests directly appreciate knife skills and the apex of sushi crafting.",
      "厳選された檜の一枚板カウンター12席。職人の繊細な包丁さばきと美しい握りの技を間近で堪能。",
    ],
    image: STATIC_IMAGES.omakaseCounterMood,
  }),
  banner("omakase_hero", "omakase-chef-prep", {
    tag: ["Nghệ Thuật Trình Diễn Tại Chỗ", "Live Culinary Artistry", "目の前で魅せる職人技"],
    jp: "職人技 · MASTER CHEF CRAFT",
    title: ["Kỹ Nghệ Nắn Sushi Đỉnh Cao", "Pinnacle of Sushi Craftsmanship", "至高の江戸前寿司の技"],
    subtitle: [
      "Chiêm ngưỡng Bếp trưởng nắn Nigiri, điểm xuyết Uni tươi, Otoro và vảy vàng 24k phục vụ ngay trong tích tắc chuẩn nhiệt độ.",
      "Witness the Head Chef sculpt Nigiri with fresh Uni, rich Otoro and 24K gold leaf, served in an instant at perfect warmth.",
      "新鮮な雲丹、大トロ、純金箔を散りばめた握りたてのひと貫。温度と鮮度を極めた至福の口福。",
    ],
    image: STATIC_IMAGES.omakaseChefPrep,
  }),
  banner("omakase_hero", "omakase-tatami", {
    tag: ["Phòng VIP Tatami Riêng Tư", "Private Tatami VIP Suite", "完全個室 畳掘りごたつ"],
    jp: "個室畳 · PRIVATE TATAMI ROOM",
    title: ["Không Gian Omakase VIP Riêng Tư", "Private VIP Omakase Setting", "格調高いVIP個室空間"],
    subtitle: [
      "Phòng riêng biệt lập từ 4-10 khách với bàn Horigotatsu chìm ấm cúng cho tiệc ngoại giao và họp mặt gia đình trang trọng.",
      "Secluded suite for 4-10 guests with sunken Horigotatsu table, ideal for diplomatic dinners and intimate family milestones.",
      "4〜10名様用の静謐な個室。足を楽にできる掘りごたつで、大切な接待やご家族の記念日を特別に演出。",
    ],
    image: STATIC_IMAGES.omakaseTatami,
  }),
  banner("omakase_hero", "omakase-wagyu", {
    tag: ["Miyazaki Wagyu A5 · Núi Lửa Phú Sĩ", "Miyazaki A5 Wagyu · Fuji Stone", "宮崎牛A5 · 富士山溶岩焼き"],
    jp: "宮崎牛 · WAGYU A5 PERFECTION",
    title: ["Bò Wagyu A5 Nướng Đá Núi Lửa", "A5 Wagyu on Volcano Stone", "A5ランク和牛の溶岩石焼き"],
    subtitle: [
      "Vân mỡ cẩm thạch béo ngậy tan chảy trên đầu lưỡi, nướng xèo xèo đánh thức mọi giác quan của thực khách sành ăn.",
      "Delicate marbling melting effortlessly on the palate, sizzling on volcanic stone to awaken all senses.",
      "極上の霜降りが舌の上ですっととろける芳醇な旨み。熱々の溶岩プレートが五感を心地よく刺激します。",
    ],
    image: STATIC_IMAGES.heroWagyu,
  }),
  banner("omakase_hero", "omakase-sushi", {
    tag: ["100% Nhập Khẩu Hàng Không", "100% Air-Flown Fresh Daily", "豊洲より毎朝100%空輸"],
    jp: "江戸前寿司 · EDOMAE CRAFTSMANSHIP",
    title: ["Otoro Vảy Vàng & Nhím Biển Uni", "Gold-Leaf Otoro & Fresh Sea Urchin", "金箔大トロと極上生うに"],
    subtitle: [
      "Bụng cá ngừ Hon-Maguro béo đậm dát vàng 24k kết hợp cùng trứng cá tầm Caviar hoàng đế.",
      "Decadent bluefin tuna Otoro leafed in 24k gold, complemented by imperial sturgeon caviar.",
      "本鮪大トロに純度24Kの金箔と最高峰キャビアを贅沢に添えた、宮古を象徴するスペシャリテ。",
    ],
    image: STATIC_IMAGES.heroSushi,
  }),

  /* ── Trang Butcher ── */
  banner("butcher_hero", "butcher-wagyu-a5", {
    tag: ["WAGYU A5 NHẬT BẢN", "JAPANESE A5 WAGYU", "日本産 A5ランク和牛"],
    title: ["Vân Mỡ Cẩm Thạch BMS 10-12", "Marble Fat Score BMS 10-12", "最高峰 BMS 10-12 の極上霜降り"],
    subtitle: [
      "Nhập khẩu nguyên con từ Miyazaki, cắt lát theo yêu cầu Steak / Nướng / Lẩu",
      "Directly imported from Miyazaki, custom sliced for Steak, Grill, or Shabu",
      "宮崎県より産地直送。ステーキ・焼肉・しゃぶしゃぶ用に無料カット",
    ],
    cta: ["Khám phá Wagyu A5", "Explore A5 Wagyu", "A5和牛を見る"],
    link: "/butcher?tab=wagyu",
    image: STATIC_IMAGES.heroWagyu,
    accent: "#7b0808",
  }),
  banner("butcher_hero", "butcher-hotpot-box", {
    tag: ["SET TIỆC TẠI GIA", "HOME FEAST SET", "おうち贅沢セット"],
    title: ["Thịt Nướng BBQ & Lẩu Shabu", "BBQ Grill & Shabu Hotpot Box", "特選 焼肉＆しゃぶしゃぶセット"],
    subtitle: [
      "Tặng kèm nước dùng hầm 12h, rau củ và sốt chấm mè rang chuẩn vị",
      "Free 12h simmered Dashi broth, fresh vegetables, and roasted sesame sauce",
      "12時間煮込んだ特製出汁、季節の野菜、胡麻だれを無料でお届け",
    ],
    cta: ["Xem Set Nướng / Lẩu", "View Grill / Shabu Sets", "セットを見る"],
    link: "/butcher?tab=box",
    image: STATIC_IMAGES.heroHotpot,
    accent: "#2e1704",
  }),
  banner("butcher_hero", "butcher-us-prime", {
    tag: ["US PRIME BEEF", "US PRIME BEEF", "US プライムビーフ"],
    title: ["Bò Mỹ Prime Cao Cấp", "Premium US Prime Beef", "厳選 USプライムビーフ"],
    subtitle: [
      "Thăn lưng & dẻ sườn mềm mọng, ngọt đậm cho bữa tiệc gia đình",
      "Ribeye & short ribs juicy, rich flavor for family gatherings",
      "リブアイや骨付きカルビなど、ご家庭でのごちそうに最適な旨味",
    ],
    cta: ["Xem Bò Mỹ Prime", "View US Prime Beef", "USプライムを見る"],
    link: "/butcher?tab=us",
    image: STATIC_IMAGES.heroDon,
  }),
  banner("butcher_hero", "butcher-fresh-delivery", {
    tag: ["GIAO HỎA TỐC 2H", "2-HOUR EXPRESS", "市内2時間スピード配達"],
    title: ["Đóng Khay Khí Trơ & Đá Gel", "Thermal Gel & Vacuum Tray", "保冷剤入り真空パック包装"],
    subtitle: [
      "Giữ trọn vẹn độ tươi ngon và nhiệt độ lạnh sâu tới tận tay khách hàng",
      "Maintaining peak chill freshness straight to your kitchen table",
      "新鮮な美味しさと冷温を損なわずご家庭の食卓まで直送",
    ],
    cta: ["Đặt mua giao ngay", "Order Delivery", "今すぐ注文する"],
    link: "/butcher",
    image: STATIC_IMAGES.space,
    accent: "#0d1f38",
  }),
];

/* ════════════════════════════════════════════════════════════
   Khối nội dung
   ════════════════════════════════════════════════════════════ */

function item(
  section: ContentSection,
  id: string,
  f: {
    key?: string;
    title: T;
    subtitle?: T;
    body?: T;
    tag?: T;
    jp?: string;
    image?: string;
    link?: string;
    meta?: Record<string, unknown>;
  }
): ContentItem {
  const { vi, i18n } = split({
    title: f.title,
    subtitle: f.subtitle,
    body: f.body,
    tag: f.tag,
  });
  return {
    id,
    section,
    key: f.key,
    title: vi.title ?? "",
    subtitle: vi.subtitle,
    body: vi.body,
    tag: vi.tag,
    jp: f.jp,
    image: f.image,
    link: f.link,
    meta: f.meta ?? {},
    i18n,
  };
}

const SEARCH_HINTS: [string, string, string][] = [
  ["Tìm Bò Wagyu A5 nướng than hoa...", "Search Charcoal Grilled A5 Wagyu...", "炭火焼きA5和牛を探す..."],
  ["Tìm Sashimi Cá Hồi Na Uy tươi sống...", "Search Fresh Norwegian Salmon...", "新鮮な生サーモン刺身を探す..."],
  ["Tìm Tiệc Bếp Trưởng Omakase 12 ghế...", "Search Master Chef Omakase 12 seats...", "板前おまかせコース12席を探す..."],
  ["Tìm Set Lẩu Shabu Shabu & Sukiyaki...", "Search Shabu Shabu & Sukiyaki Boxes...", "しゃぶしゃぶ＆すき焼きセットを探す..."],
  ["Tìm Cơm Lươn Nhật sốt Kabayaki...", "Search Japanese Eel Donburi...", "特製うな重・蒲焼きを探す..."],
  ["Tìm Thịt Bò Tươi Butcher cắt lát...", "Search Butcher Fresh Sliced Beef...", "切り立て和牛精肉を探す..."],
  ["Tìm Sushi bụng cá ngừ Otoro béo ngậy...", "Search Melting Otoro Bluefin Tuna...", "とろける本鮪大トロを探す..."],
];

const BUTCHER_SEARCH_HINTS: [string, string, string][] = [
  ["Tìm Bò Wagyu A5 nướng than...", "Search Charcoal Grilled A5 Wagyu...", "備長炭焼きA5和牛を探す..."],
  ["Tìm Bò Mỹ Prime cắt Steak...", "Search US Prime Steak Cut...", "USプライム ステーキカットを探す..."],
  ["Tìm Set thịt nướng BBQ tại gia...", "Search Home BBQ Meat Box...", "おうち焼肉・BBQセットを探す..."],
  ["Tìm Sốt ướp Yakiniku đặc biệt...", "Search Specialty Yakiniku Sauce...", "宮古特製焼肉のタレを探す..."],
];

export const CONTENT_ITEMS: ContentItem[] = [
  ...SEARCH_HINTS.map((t, i) => item("home_search", `home-search-${i}`, { title: t })),
  ...SEARCH_HINTS.map((t, i) => item("menu_search", `menu-search-${i}`, { title: t })),
  ...BUTCHER_SEARCH_HINTS.map((t, i) =>
    item("butcher_search", `butcher-search-${i}`, { title: t })
  ),

  /* ── Tab món trang chủ ── */
  item("home_tab", "home-tab-all", {
    key: "fire",
    title: ["Gợi ý hôm nay", "Chef's Picks", "本日のおすすめ"],
    meta: { categories: [] },
  }),
  item("home_tab", "home-tab-sashimi", {
    key: "sushi",
    title: ["Sashimi & Sushi", "Sashimi & Sushi", "刺身・寿司"],
    meta: { categories: ["sashimi", "sushi", "maki"] },
  }),
  item("home_tab", "home-tab-wagyu", {
    key: "meat",
    title: ["Wagyu Thượng Hạng", "Premium Wagyu", "特選和牛"],
    meta: { categories: ["wagyu", "nuong"] },
  }),
  item("home_tab", "home-tab-hotpot", {
    key: "hotpot",
    title: ["Lẩu & Món Nóng", "Hotpot & Warm", "鍋・温物"],
    meta: { categories: ["lau"] },
  }),
  item("home_tab", "home-tab-butcher", {
    key: "takeaway",
    title: ["Thịt Bò Mang Về", "Takeaway Meats", "精肉テイクアウト"],
    meta: { categories: ["butcher"] },
  }),

  /* ── Thẻ quảng bá trang chủ ── */
  item("home_promo", "home-promo-butcher", {
    key: "butcher",
    tag: "MIYAKO BUTCHER",
    subtitle: ["Giao nhanh 45p", "45-min delivery", "45分スピード配達"],
    title: [
      "Thịt Bò Wagyu Nhật A5 Cắt Theo Yêu Cầu",
      "Custom-Cut Japanese A5 Wagyu Beef",
      "ご希望に合わせてカットする日本産A5和牛",
    ],
    body: [
      "Thịt tươi hút chân không kèm đá gel giữ nhiệt. Tùy chọn cắt lát Lẩu (1.5mm), Nướng (3.5mm), Steak (2cm).",
      "Vacuum packed with thermal ice gel. Custom slicing for Shabu (1.5mm), Yakiniku (3.5mm), Steak (2cm).",
      "保冷剤入り真空パック包装。しゃぶしゃぶ(1.5mm)、焼肉(3.5mm)、ステーキ(2cm)など無料カット。",
    ],
    link: "/butcher",
  }),

  /* ── Cam kết cuối trang chủ ── */
  item("home_highlight", "home-highlight-origin", {
    key: "shield",
    title: ["100% Chính Ngạch", "100% Certified", "100%正規輸入"],
    subtitle: ["Wagyu A5 & Bò Mỹ", "A5 Wagyu & US Beef", "A5和牛・US牛"],
  }),
  item("home_highlight", "home-highlight-cold", {
    key: "snowflake",
    title: ["Đóng Thùng Gel", "Thermal Gel Pack", "保冷パック包装"],
    subtitle: ["Giữ lạnh tuyệt đối", "Deep chill fresh", "冷温と鮮度を保持"],
  }),
  item("home_highlight", "home-highlight-fast", {
    key: "lightning",
    title: ["Giao 45 Phút", "45-Min Express", "45分スピード配達"],
    subtitle: ["Nội thành hỏa tốc", "Inner city rapid", "市内迅速にお届け"],
  }),

  /* ── Ưu đãi hiển thị ở trang chủ ── */
  item("home_offer", "home-offer-100k", {
    title: ["Giảm 100.000đ", "100,000₫ Discount", "100,000₫ 割引"],
    subtitle: [
      "Áp dụng hóa đơn từ 1.000.000đ",
      "For orders from 1,000,000₫",
      "1,000,000₫以上のお会計で利用可能",
    ],
    body: ["HSD: 31/12/2026", "EXP: 31/12/2026", "有効期限: 2026/12/31"],
    link: "/menu",
  }),
  item("home_offer", "home-offer-wagyu15", {
    title: ["Giảm 15% Set Bò Wagyu", "15% Off Wagyu Sets", "和牛セット 15% OFF"],
    subtitle: ["Thịt bò tươi cắt trong ngày", "Fresh meats cut daily", "当日切り立て新鮮和牛精肉"],
    tag: "WAGYU15",
    link: "/butcher",
  }),
  item("home_offer", "home-offer-sashimi", {
    title: ["Tặng 1 Đĩa Sashimi", "Free Salmon Sashimi Plate", "特選刺身一皿プレゼント"],
    subtitle: [
      "Khi đặt bàn trước 18h hàng ngày",
      "For bookings before 6:00 PM daily",
      "毎日18時までのご予約限定",
    ],
    tag: "FREEOMAKASE",
    link: "/booking",
  }),

  /* ── Trình tự omakase ── */
  item("omakase_step", "step-sakizuke", {
    jp: "Sakizuke",
    title: ["Khai vị tinh tế", "Delicate Appetizer", "先付け（前菜）"],
    body: [
      "Đánh thức vị giác với nguyên liệu theo mùa tươi mát",
      "Awakens palate with fresh seasonal ingredients",
      "旬の味覚で五感を優しく目覚めさせる最初の一品",
    ],
  }),
  item("omakase_step", "step-otsukuri", {
    jp: "Otsukuri",
    title: ["Sashimi hải vị", "Seasonal Sashimi", "お造り（刺身）"],
    body: [
      "Hải sản tươi sống vận chuyển bằng đường hàng không",
      "Prime seafood air-flown daily from Toyosu Market",
      "豊洲から直送された鮮魚の洗練されたお造り",
    ],
  }),
  item("omakase_step", "step-yakimono", {
    jp: "Yakimono",
    title: ["Món nướng than hoa", "Charcoal Grilled Course", "焼き物"],
    body: [
      "Bò Wagyu hoặc Lươn nướng thơm lừng chuẩn vị",
      "Fragrant grilled Wagyu or glazed Unagi",
      "備長炭の香ばしさを纏わせた和牛や旬魚の焼き物",
    ],
  }),
  item("omakase_step", "step-nigiri", {
    jp: "Nigiri Edo",
    title: ["Sushi thủ công", "Artisan Edomae Sushi", "江戸前握り寿司"],
    body: [
      "Nghệ thuật nắn cơm giấm ấm và hải vị quý hiếm",
      "Craftsmanship of warm shari and rare seafood treasures",
      "赤酢シャリと極上ネタをその場で握る伝統の技",
    ],
  }),
  item("omakase_step", "step-wagyu", {
    jp: "Wagyu A5",
    title: ["Bò đá núi lửa", "Volcano Stone Wagyu", "極上A5和牛"],
    body: [
      "Vị béo ngậy tan chảy của Wagyu A5 Miyazaki",
      "Melting richness of certified Miyazaki A5 Wagyu",
      "口どけ豊かな宮崎牛A5の上質な脂と赤身の調和",
    ],
  }),
  item("omakase_step", "step-tomewan", {
    jp: "Tome-wan",
    title: ["Canh thanh vị", "Finishing Soup", "止椀（お椀）"],
    body: [
      "Nước dùng Dashi ấm bụng kết thúc món chính",
      "Warm rich Dashi broth gently closing the savory journey",
      "丁寧に引いた出汁でホッとする締めのお吸い物",
    ],
  }),
  item("omakase_step", "step-mizumono", {
    jp: "Mizumono",
    title: ["Wagashi & Matcha", "Wagashi & Ceremonial Tea", "水物・甘味"],
    body: [
      "Tráng miệng thanh tao khép lại trọn vẹn hành trình",
      "Refreshing traditional dessert rounding off the feast",
      "季節の和菓子と香り高い抹茶で締めくくる余韻",
    ],
  }),

  /* ── Ảnh trưng bày omakase ── */
  item("omakase_gallery", "pin-counter-mood", {
    key: "space",
    image: STATIC_IMAGES.omakaseCounterMood,
    title: ["Quầy Bar Itamae 12 Chỗ", "12-Seat Itamae Counter", "板前カウンター12席"],
    jp: "板前カウンター · 12 SEATS",
    tag: ["Không gian Omakase", "Omakase Space", "空間・個室"],
    body: [
      "12 chỗ ngồi độc quyền bao quanh quầy chế tác gỗ Hinoki, nơi thực khách trực diện thưởng lãm nghệ thuật ẩm thực từ Bếp Trưởng.",
      "Exclusive 12 seats surrounding the natural Hinoki counter, offering direct view of master culinary craftsmanship.",
      "樹齢数百年の檜カウンターを囲む限定12席。総料理長の鮮やかな手捌きを特等席でお愉しみいただけます。",
    ],
    meta: { seating: "counter", aspect: "3/4" },
  }),
  item("omakase_gallery", "pin-chef-prep", {
    key: "dish",
    image: STATIC_IMAGES.omakaseChefPrep,
    title: ["Chế Tác Otoro & Uni Vàng 24K", "Crafting Otoro & 24K Uni", "大トロ雲丹・24K金箔のにぎり"],
    jp: "大トロ雲丹 · CHEF'S CRAFT",
    tag: ["Món ăn tại quầy", "Counter Dish", "板前料理"],
    body: [
      "Bếp trưởng nắn từng khối cơm giấm ấm, đặt lát cá ngừ Hon-Maguro béo đậm, nhím biển Hokkaido và dát vảy vàng 24k ngay trước mắt thực khách.",
      "The chef handcrafts warm Edomae shari, topped with rich Hon-Maguro Otoro, Hokkaido Uni, and delicate 24K gold flakes.",
      "温かい赤酢のシャリに極上本鮪大トロ、北海道産雲丹をのせ、純金箔をあしらって握りたてをお出しします。",
    ],
    meta: { seating: "counter", aspect: "3/4" },
  }),
  item("omakase_gallery", "pin-dish-wagyu", {
    key: "dish",
    image: STATIC_IMAGES.heroWagyu,
    title: ["Miyazaki Wagyu A5 Nướng Đá", "Volcano Stone Miyazaki Wagyu A5", "宮崎牛 A5 溶岩石焼き"],
    jp: "宮崎牛 A5 · VOLCANO STONE",
    tag: ["Món ăn tại quầy", "Counter Dish", "板前料理"],
    body: [
      "Thịt bò Miyazaki Wagyu A5 vân mỡ hoa cẩm thạch béo ngậy tan chảy trên phiến đá núi lửa Phú Sĩ, ngập tràn hương vị đậm đà.",
      "Miyazaki A5 Wagyu with intricate marble fat melting on Fuji volcanic stone, bursting with unforgettable rich umami.",
      "富士山溶岩プレートの上でジュワッと焼き上げる宮崎牛A5。口に入れた瞬間に上質な脂の甘みがとろけます。",
    ],
    meta: { aspect: "1/1" },
  }),
  item("omakase_gallery", "pin-space-tatami", {
    key: "space",
    image: STATIC_IMAGES.omakaseTatami,
    title: ["Phòng VIP Tatami Omakase", "VIP Tatami Private Room", "完全個室 畳掘りごたつ席"],
    jp: "個室掘りごたつ · PRIVATE ROOM",
    tag: ["Không gian Omakase", "Omakase Space", "空間・個室"],
    body: [
      "Phòng tiệc riêng tư 4-10 khách phong cách Nhật Bản với sàn chiếu Tatami, bàn chìm chân Horigotatsu và cửa trượt Shoji cách âm.",
      "Japanese style private room for 4-10 guests featuring authentic Tatami mats, sunken Horigotatsu table and Shoji screens.",
      "4〜10名様対応の完全個室。伝統の畳敷きと足を伸ばせる掘りごたつ、防音障子戸で大切なご会食を優雅に演出。",
    ],
    meta: { seating: "private", aspect: "4/5" },
  }),
  item("omakase_gallery", "pin-dish-sushi", {
    key: "dish",
    image: STATIC_IMAGES.heroSushi,
    title: ["Otoro & Trứng Cá Tầm Caviar", "Otoro & Royal Caviar", "本鮪大トロ キャビアのせ"],
    jp: "本鮪大トロ · CAVIAR NIGIRI",
    tag: ["Món ăn tại quầy", "Counter Dish", "板前料理"],
    body: [
      "Sashimi và Nigiri bụng cá ngừ vây xanh hảo hạng kết hợp cùng trứng cá tầm Caviar hoàng gia và vảy vàng lấp lánh.",
      "Prime bluefin tuna Otoro sashimi and nigiri crowned with royal sturgeon caviar and glistening gold leaf.",
      "脂ののった極上本鮪大トロに、贅沢な最高級キャビアと金箔を添えた珠玉のひと品。",
    ],
    meta: { aspect: "1/1" },
  }),
  item("omakase_gallery", "pin-space-detail", {
    key: "space",
    image: STATIC_IMAGES.omakaseCounter,
    title: ["Gỗ Bách Hinoki & Gốm Thủ Công", "Hinoki Wood & Artisanal Ceramics", "檜カウンターと和食器の美"],
    jp: "檜木目の美 · HINOKI DETAIL",
    tag: ["Không gian Omakase", "Omakase Space", "空間・個室"],
    body: [
      "Đường nét tinh tế của phiến gỗ Hinoki nguyên khối cùng bộ chén đĩa gốm mộc tráng men tạo nên cảm giác ấm áp và tĩnh tại chuẩn phong vị Nhật Bản.",
      "Refined grain of solid Hinoki cypress paired with handcrafted glazed pottery brings authentic warmth and zen tranquility.",
      "樹齢を重ねた無垢の檜の木目と、職人が焼き上げた温もりある和陶器が心地よい静寂と安らぎをもたらします。",
    ],
    meta: { seating: "counter", aspect: "4/3" },
  }),
  item("omakase_gallery", "pin-dish-course", {
    key: "dish",
    image: STATIC_IMAGES.heroOmakase,
    title: ["Tuyệt Tác Hải Sản Omakase", "Edomae Seafood Masterpieces", "豊洲直送 旬の海鮮おまかせ"],
    jp: "おまかせ海鮮 · EDOMAE ART",
    tag: ["Món ăn tại quầy", "Counter Dish", "板前料理"],
    body: [
      "100% hải sản được nhập khẩu tươi sống bằng đường hàng không mỗi sáng từ chợ Toyosu Tokyo, phục vụ chuẩn nhiệt độ.",
      "100% live seafood air-flown every morning directly from Toyosu Market Tokyo, served at perfect serving temperature.",
      "東京豊洲市場から毎朝空輸される活鮮魚。魚種ごとに最適な熟成と温度管理で最高の状態でお届けします。",
    ],
    meta: { aspect: "4/3" },
  }),

  /* ── Thông số ủ wet-aging, in trên menu giấy ── */
  item("about_spec", "spec-temperature", {
    title: ["Nhiệt độ", "Temperature", "温度"],
    subtitle: "−2°C – 2°C",
  }),
  item("about_spec", "spec-humidity", {
    title: ["Độ ẩm", "Humidity", "湿度"],
    subtitle: "70% – 80%",
  }),
  item("about_spec", "spec-airflow", {
    title: ["Tốc độ gió", "Airflow", "風速"],
    subtitle: "0,5 – 2 m/s",
  }),
  item("about_spec", "spec-duration", {
    title: ["Thời gian ủ", "Aging time", "熟成期間"],
    subtitle: ["21 ngày", "21 days", "21日間"],
  }),

  /* ── Butcher ── */
  item("butcher_tab", "butcher-tab-wagyu", {
    key: "wagyu",
    title: ["Wagyu Nhật A5", "A5 Wagyu", "A5和牛"],
  }),
  item("butcher_tab", "butcher-tab-us", {
    key: "us",
    title: ["Bò Mỹ Prime", "US Prime", "USプライム"],
  }),
  item("butcher_tab", "butcher-tab-box", {
    key: "box",
    title: ["Set Nướng & Lẩu", "Home Boxes", "セット"],
  }),
  item("butcher_tab", "butcher-tab-sauce", {
    key: "sauce",
    title: ["Sốt & Gia vị", "Sauces", "特製タレ"],
  }),

  item("butcher_cut", "cut-steak", { title: "Steak 2.5cm" }),
  item("butcher_cut", "cut-yakiniku", { title: "Yakiniku 3-4mm" }),
  item("butcher_cut", "cut-shabu", {
    title: ["Lẩu Shabu 1.5mm", "Shabu 1.5mm", "しゃぶしゃぶ 1.5mm"],
  }),
  item("butcher_cut", "cut-block", {
    title: ["Nguyên tảng", "Whole Block", "ブロック肉"],
  }),

  item("butcher_promise", "promise-cold", {
    key: "snowflake",
    title: ["Giữ lạnh 48h", "Cold-chain 48h", "48時間保冷"],
    subtitle: ["Đá gel tiệt trùng", "Sterile Gel Packs", "保冷剤入りパック"],
  }),
  item("butcher_promise", "promise-cut", {
    key: "knife",
    title: ["Cắt theo món", "Custom Cut", "オーダーカット"],
    subtitle: ["Steak/Nướng/Lẩu", "Steak/Grill/Shabu", "ステーキ・焼肉・鍋"],
  }),
  item("butcher_promise", "promise-delivery", {
    key: "delivery",
    title: ["Giao tận nơi", "Doorstep Delivery", "スピード配達"],
    subtitle: ["Hoặc lấy tại quán", "Or store pickup", "店頭受け取り対応"],
  }),
];

/** Nhãn lọc của các món Butcher có sẵn — thay cho việc dò chuỗi trong mã món. */
export const BUTCHER_DISH_TAGS: Record<string, string[]> = {
  "butcher-a5-tenderloin": ["wagyu"],
  "butcher-a5-sirloin": ["wagyu"],
  "butcher-a5-chuck-roll": ["wagyu"],
  "butcher-us-short-ribs": ["us"],
  "butcher-set-shabu-box": ["box"],
  "butcher-set-yakiniku-box": ["box"],
  "butcher-tare-sauce": ["sauce"],
  "butcher-ponzu-sauce": ["sauce"],
};

/* ════════════════════════════════════════════════════════════
   Tích điểm
   ════════════════════════════════════════════════════════════ */

function tier(
  code: LoyaltyTier["code"],
  f: { name: T; minPoints: number; earnRate: number; color: string; perks: T[] }
): LoyaltyTier {
  const { vi, i18n } = split({ name: f.name });
  const en = f.perks.map((p) => (typeof p === "string" ? p : p[1]));
  const ja = f.perks.map((p) => (typeof p === "string" ? p : p[2]));
  return {
    code,
    name: vi.name ?? code,
    minPoints: f.minPoints,
    earnRate: f.earnRate,
    color: f.color,
    perks: f.perks.map((p) => (typeof p === "string" ? p : p[0])),
    i18n: {
      en: { ...(i18n?.en ?? {}), perks: en },
      ja: { ...(i18n?.ja ?? {}), perks: ja },
    },
  };
}

/**
 * Mốc điểm và tỷ lệ khớp đúng với các hàm SQL trước khi chuyển vào bảng
 * (300 / 800 / 2000 điểm; 3 / 5 / 8 / 12%), để không khách nào bị đổi hạng
 * chỉ vì nâng cấp.
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  tier("bronze", {
    name: ["Hạng Đồng", "Bronze", "ブロンズ会員"],
    minPoints: 0,
    earnRate: 0.03,
    color: "#b08d57",
    perks: [
      [
        "Tích luỹ 3% trên mọi hoá đơn",
        "Earn 3% points on every bill",
        "すべてのお会計で3%ポイント還元",
      ],
      [
        "Quyền đổi quà và voucher từ kho điểm thưởng",
        "Redeem gifts and vouchers from the points store",
        "ポイント交換所で特典と交換",
      ],
    ],
  }),
  tier("silver", {
    name: ["Hạng Bạc", "Silver", "シルバー会員"],
    minPoints: 300,
    earnRate: 0.05,
    color: "#aab4be",
    perks: [
      [
        "Tích luỹ 5% trên mọi hoá đơn ăn tại quán hoặc Butcher",
        "Accumulate 5% points on all dine-in and Butcher orders",
        "店内飲食・精肉注文のすべてで5%ポイント還元",
      ],
      [
        "Tặng voucher 100.000đ trong tuần sinh nhật",
        "Gift a 100,000₫ voucher during birthday week",
        "お誕生週に100,000₫クーポンをプレゼント",
      ],
      [
        "Quyền đổi quà và voucher từ kho điểm thưởng",
        "Right to redeem gifts and vouchers from points store",
        "ポイント交換所での限定アイテム交換権利",
      ],
    ],
  }),
  tier("gold", {
    name: ["Hạng Vàng", "Gold", "ゴールド会員"],
    minPoints: 800,
    earnRate: 0.08,
    color: "#c9a96a",
    perks: [
      [
        "Tích luỹ 8% giá trị mọi hoá đơn (ăn tại chỗ & mang về)",
        "Accumulate 8% points on all orders (dine-in & take-away)",
        "店内飲食・テイクアウトのすべてで8%ポイント還元",
      ],
      [
        "Tặng 1 đĩa Sashimi Cá Hồi thượng hạng tháng sinh nhật",
        "Free Premium Salmon Sashimi during birthday month",
        "お誕生月に特選生サーモン刺身を一皿プレゼント",
      ],
      [
        "Ưu tiên xếp bàn phòng riêng Tatami sang trọng",
        "Priority seating in luxury Tatami VIP private rooms",
        "高級個室・畳席の優先リザーブ",
      ],
      [
        "Trải nghiệm trước các món mới trong mùa Omakase",
        "Early tasting privileges for seasonal Omakase creations",
        "季節のおまかせ新作メニューをいち早くテイスティング",
      ],
    ],
  }),
  tier("diamond", {
    name: ["Hạng Kim Cương", "Diamond", "ダイヤモンド会員"],
    minPoints: 2000,
    earnRate: 0.12,
    color: "#67c7e8",
    perks: [
      [
        "Tích luỹ tối đa 12% giá trị trên mọi hoá đơn",
        "Maximum 12% loyalty return on every transaction",
        "最大12%の最高還元率をすべての伝票に適用",
      ],
      [
        "Miễn phí 100% phụ phí phòng VIP & Tatami riêng tư",
        "100% waiver of VIP room & private Tatami room surcharges",
        "VIP個室および畳席の利用料が100%完全無料",
      ],
      [
        "Tặng 1 chai Sake vảy vàng 720ml vào ngày sinh nhật",
        "Gift 1 bottle of 24K Gold Flake Sake 720ml on birthday",
        "お誕生日に金箔入り特撰日本酒 720ml を1本進呈",
      ],
      [
        "Đầu bếp trưởng Omakase thiết kế thực đơn riêng",
        "Exclusive custom-designed menu crafted by Head Chef",
        "総料理長によるオーダーメイド専用コースの設計",
      ],
    ],
  }),
];

function quest(
  id: LoyaltyQuest["id"],
  f: { title: T; description: T; points: number; icon: string }
): LoyaltyQuest {
  const { vi, i18n } = split({ title: f.title, description: f.description });
  return {
    id,
    title: vi.title ?? id,
    description: vi.description,
    points: f.points,
    icon: f.icon,
    i18n,
  };
}

/** Điểm thưởng khớp với hàm claim_quest_reward trước khi chuyển vào bảng. */
export const LOYALTY_QUESTS: LoyaltyQuest[] = [
  quest("daily_checkin", {
    title: ["Điểm danh mỗi ngày", "Daily Check-in", "毎日ログイン"],
    description: [
      "Mở Zalo Mini App để nhận điểm tích luỹ hàng ngày",
      "Open Zalo Mini App to claim daily loyalty points",
      "アプリを開いて毎日の来店ポイントを獲得",
    ],
    points: 15,
    icon: "📅",
  }),
  quest("table_qr", {
    title: ["Check-in dùng bữa tại nhà hàng", "Dine-in Check-in", "店舗でチェックイン"],
    description: [
      "Quét QR tại bàn ăn hoặc hoá đơn thanh toán",
      "Scan QR code at your dining table or invoice",
      "お席のQRコードまたは伝票をスキャン",
    ],
    points: 30,
    icon: "🥢",
  }),
  quest("review", {
    title: ["Đánh giá dịch vụ 5 sao", "Leave 5-Star Review", "5つ星レビューを投稿"],
    description: [
      "Để lại cảm nhận và hình ảnh trải nghiệm ẩm thực",
      "Share photos and feedback about your dining experience",
      "お料理の写真と感想を投稿してシェア",
    ],
    points: 50,
    icon: "⭐",
  }),
  quest("share", {
    title: ["Chia sẻ Miyako cho bạn bè", "Share with Friends", "お友達にシェア"],
    description: [
      "Mời bạn bè cùng gia nhập Miyako VIP Club",
      "Invite friends to join the Miyako VIP Club",
      "お友達を宮古VIPクラブにご招待",
    ],
    points: 100,
    icon: "🎁",
  }),
];

/* ════════════════════════════════════════════════════════════
   Câu chữ trong cấu hình nhà hàng
   ════════════════════════════════════════════════════════════ */

/**
 * Giá trị mặc định cho các cột chữ mới của `restaurant_settings`. Tên khoá
 * trùng tên cột. Migration chỉ điền vào ô còn trống, không ghi đè thứ nhà
 * hàng đã nhập.
 */
const SETTINGS_TEXT_RAW: Record<string, T> = {
  hours_text: [
    "Trưa 10:30 - 14:00 · Tối 17:30 - 22:30",
    "Lunch 10:30 - 14:00 · Dinner 17:30 - 22:30",
    "昼 10:30 - 14:00 · 夜 17:30 - 22:30",
  ],
  hotline_hours: "10:00 - 22:30",
  hotline_note: [
    "Liên hệ trực tiếp lễ tân để được hỗ trợ đặt bàn Omakase, giữ phòng riêng Tatami VIP hoặc giải đáp mọi thắc mắc.",
    "Contact our reception directly for Omakase consultation, VIP room reservations, or express delivery.",
    "おまかせコースのご相談、VIP個室の優先予約、テイクアウト注文を承ります。",
  ],
  location_note: [
    "Phố ẩm thực Đào Tấn, cách ngã tư Liễu Giai & Lotte Center ~300m.",
    "Dao Tan culinary street, ~300m from Lotte Center Hanoi.",
    "ダオタン日本食街、ロッテセンターハノイより徒歩約3分 (~300m)。",
  ],
  parking_note: [
    "Có nhân viên bảo vệ hỗ trợ hướng dẫn đỗ xe ô tô và xe máy tận nơi.",
    "Valet security staff available for both cars and motorbikes.",
    "専属警備員が自動車・バイクの駐車をご案内いたします。",
  ],
  about_counter_text: [
    "Quầy itamae có 12 ghế. Khách ngồi đối diện bếp, mỗi phần được dọn ngay khi vừa hoàn thiện, theo trình tự bếp trưởng đã định cho ngày hôm đó.",
    "The itamae counter seats 12. Guests sit facing the chef, and each course is served the moment it is finished, in the order the head chef has set for the day.",
    "板前カウンターは12席。料理長の目の前で、その日の流れに沿って仕上がったばかりの一品をお出しします。",
  ],
  about_wagyu_text: [
    "Miyako chỉ dùng wagyu A5 chính hãng, có chứng nhận xuất xứ đi kèm từng lô.",
    "Miyako serves only genuine A5 wagyu, with a certificate of origin for every lot.",
    "宮古では、ロットごとに産地証明書が付いた正規のA5和牛のみを使用しています。",
  ],
  private_room_note: [
    "Phòng riêng sẽ được nhà hàng xác nhận lại theo số khách.",
    "The restaurant will confirm the private room based on your party size.",
    "個室はご人数に合わせて店舗より改めてご連絡いたします。",
  ],
  butcher_title: "Miyako Wagyu Butcher Shop",
  butcher_subtitle: [
    "Thịt tươi sơ chế theo yêu cầu",
    "Custom-cut fresh gourmet meats",
    "ご希望に合わせてカットする極上精肉",
  ],
  butcher_intro: [
    "Thịt bò Wagyu Nhật Bản A5 & Bò Mỹ Prime cắt tươi trong ngày. Đóng khay hút chân không tiệt trùng kèm đá gel giữ nhiệt chuẩn tươi ngon.",
    "Japanese A5 Wagyu & US Prime beef cut fresh daily. Vacuum-sealed with thermal gel ice packs for guaranteed freshness.",
    "厳選されたA5ランク日本産黒毛和牛とUSプライムビーフを毎日切り立てでご提供。保冷剤入り真空パックでお届け。",
  ],
  butcher_badge: ["A5 Wagyu Specialist", "A5 Wagyu Specialist", "A5和牛専門店"],
  butcher_guarantee: [
    "✨ Miyako bảo đảm 100% thịt bò Wagyu nhập khẩu chính ngạch Nhật Bản",
    "✨ Miyako guarantees 100% officially imported authentic Japanese Wagyu",
    "✨ 宮古は日本産黒毛和牛100%正規輸入品であることを保証いたします",
  ],
  delivery_eta_text: [
    "Giao ngay trong 1 giờ",
    "Delivered within 1 hour",
    "1時間以内にお届け",
  ],
};

export const SETTINGS_TEXT = split(SETTINGS_TEXT_RAW);

/** Ảnh thương hiệu mặc định, trùng tên cột của `restaurant_settings`. */
export const SETTINGS_IMAGES = {
  logo_url: STATIC_IMAGES.logo,
  logo_dark_url: STATIC_IMAGES.logoDark,
  logo_wide_url: STATIC_IMAGES.logoWide,
  logo_wide_dark_url: STATIC_IMAGES.logoWideDark,
  cover_image_url: STATIC_IMAGES.space,
};

/**
 * Nhãn và suất chọn sẵn của các suất omakase. Khoá là giá suất vì mã suất
 * trong CSDL và trong bản đóng gói khác nhau.
 */
export const OMAKASE_BADGES: {
  price: number;
  badge: [string, string, string];
  featured?: boolean;
  image: string;
}[] = [
  {
    price: 3000000,
    badge: ["VIP Nhất · Hoàng Gia", "Royal VIP Tier", "最高峰・極み"],
    image: STATIC_IMAGES.heroOmakase,
  },
  {
    price: 2000000,
    badge: ["Được Chọn Nhiều Nhất", "Most Popular Choice", "一番人気"],
    featured: true,
    image: STATIC_IMAGES.heroWagyu,
  },
  {
    price: 1000000,
    badge: ["Khởi Đầu Tinh Hoa", "Essential Signature", "精選入門"],
    image: STATIC_IMAGES.heroSushi,
  },
  {
    price: 500000,
    badge: ["Khởi Đầu Tinh Hoa", "Essential Signature", "精選入門"],
    image: STATIC_IMAGES.heroSushi,
  },
];

/* ════════════════════════════════════════════════════════════
   Quà đổi điểm
   ════════════════════════════════════════════════════════════ */

function gift(
  id: string,
  f: {
    category: RewardGiftItem["category"];
    title: T;
    desc: T;
    worth: T;
    badge?: T;
    pointsCost: number;
    discountValue?: number;
    minOrderValue?: number;
  }
): RewardGiftItem {
  const { vi, i18n } = split({
    title: f.title,
    description: f.desc,
    worth_text: f.worth,
    badge: f.badge,
  });
  return {
    id,
    category: f.category,
    title: vi.title ?? id,
    desc: vi.description ?? "",
    worthText: vi.worth_text ?? "",
    badge: vi.badge,
    pointsCost: f.pointsCost,
    discountValue: f.discountValue,
    minOrderValue: f.minOrderValue,
    isActive: true,
    i18n,
  };
}

/** Trùng với dữ liệu khởi tạo của bảng `reward_gifts` (migration 20260921000005). */
export const REWARD_GIFTS: RewardGiftItem[] = [
  gift("gift-v50", {
    category: "voucher",
    title: ["Voucher Giảm 50.000đ", "50,000₫ Cash Voucher", "50,000₫ お食事券"],
    desc: [
      "Trừ trực tiếp trên hoá đơn dùng bữa hoặc mua thịt Butcher",
      "Direct discount on dine-in or Butcher meat orders",
      "店内飲食または精肉のご購入時にご利用可能",
    ],
    worth: ["Trị giá 50.000đ", "Worth 50,000₫", "50,000₫ 相当"],
    badge: ["Dễ đổi nhất", "Easiest", "交換しやすい"],
    pointsCost: 50,
    discountValue: 50000,
  }),
  gift("gift-v100", {
    category: "voucher",
    title: ["Voucher Giảm 100.000đ", "100,000₫ Cash Voucher", "100,000₫ お食事券"],
    desc: [
      "Áp dụng cho hoá đơn từ 500.000đ tại toàn hệ thống",
      "Applicable for orders from 500,000₫ across all locations",
      "500,000₫以上のお会計で全店共通利用可能",
    ],
    worth: ["Trị giá 100.000đ", "Worth 100,000₫", "100,000₫ 相当"],
    badge: ["Phổ biến", "Popular", "人気"],
    pointsCost: 100,
    discountValue: 100000,
    minOrderValue: 500000,
  }),
  gift("gift-v200", {
    category: "voucher",
    title: ["Voucher Giảm 200.000đ", "200,000₫ Cash Voucher", "200,000₫ お食事券"],
    desc: [
      "Áp dụng cho mọi bữa ăn hoặc đơn hàng Wagyu Butcher",
      "Applicable for all dining meals or Wagyu Butcher orders",
      "すべてのお食事または和牛精肉のご注文で利用可能",
    ],
    worth: ["Trị giá 200.000đ", "Worth 200,000₫", "200,000₫ 相当"],
    badge: ["Ưu đãi lớn", "Big Value", "お得"],
    pointsCost: 200,
    discountValue: 200000,
  }),
  gift("gift-sashimi", {
    category: "dish",
    title: ["Sashimi Cá Hồi Na Uy Tươi", "Fresh Norwegian Salmon Sashimi", "特選ノルウェー産生サーモン刺身"],
    desc: [
      "Tặng 1 đĩa Sashimi cá hồi nhập khẩu Na Uy hảo hạng",
      "Complimentary premium fresh Norwegian salmon sashimi plate",
      "極上ノルウェー産生サーモン刺身を一皿プレゼント",
    ],
    worth: ["Trị giá 185.000đ", "Worth 185,000₫", "185,000₫ 相当"],
    badge: ["Món Bếp Trưởng", "Chef's Pick", "料理長おすすめ"],
    pointsCost: 250,
  }),
  gift("gift-wagyu", {
    category: "dish",
    title: ["Bò Wagyu A5 Nướng Đá Núi Lửa", "A5 Wagyu on Volcano Stone", "A5和牛 溶岩石焼き"],
    desc: [
      "Tặng 1 phần Wagyu A5 nướng đá thơm lừng béo ngậy",
      "Complimentary sizzling melt-in-mouth A5 Wagyu portion",
      "芳醇な香りととろける旨味のA5和牛を1人前進呈",
    ],
    worth: ["Trị giá 360.000đ", "Worth 360,000₫", "360,000₫ 相当"],
    badge: ["Wagyu A5", "Wagyu A5", "A5和牛"],
    pointsCost: 450,
  }),
  gift("gift-sake", {
    category: "drink",
    title: ["Chai Rượu Sake Vảy Vàng 720ml", "Gold Flake Sake Bottle 720ml", "金箔入り特撰日本酒 720ml"],
    desc: [
      "Rượu Sake thượng hạng chứa vảy vàng 24k tinh khiết Nhật Bản",
      "Premium Japanese sake infused with pure 24k gold flakes",
      "純度24Kの金箔が舞う贅沢な日本産特撰酒",
    ],
    worth: ["Trị giá 790.000đ", "Worth 790,000₫", "790,000₫ 相当"],
    badge: ["VIP Gift", "VIP Gift", "VIP限定"],
    pointsCost: 800,
  }),
  gift("gift-omakase", {
    category: "dish",
    title: ["1 Vé Omakase Thượng Hạng", "1 Premium Omakase Ticket", "極上おまかせ食事券 1名様分"],
    desc: [
      "Trải nghiệm trọn vẹn set menu 12 món do Bếp trưởng phục vụ",
      "Full 12-course dining experience crafted by the Head Chef",
      "総料理長が目の前で振る舞う全12品のコース体験",
    ],
    worth: ["Trị giá 1.500.000đ", "Worth 1,500,000₫", "1,500,000₫ 相当"],
    badge: ["Đặc biệt", "Special", "特別"],
    pointsCost: 1500,
  }),
];
