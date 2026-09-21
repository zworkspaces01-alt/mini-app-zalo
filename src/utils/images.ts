/**
 * Toàn bộ hình ảnh Miyako được lưu trữ và tối ưu hoá trực tiếp trên Cloudinary CDN.
 * Tự động nén chuẩn WebP/AVIF (f_auto,q_auto) cho tốc độ tải tức thì trên Zalo Mini App.
 */

const CDN = "https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static";

export const logo = `${CDN}/logo.png`;
export const logoDark = `${CDN}/logo-dark.png`;
export const logoHorizontal = `${CDN}/Light_4x-scaled.png`;
export const logoHorizontalDark = `${CDN}/logo-horizontal-dark.png`;
export const space = `${CDN}/space.jpg`;

export const omakaseCounter = `${CDN}/omakase-counter.jpg`;
export const omakaseTatami = `${CDN}/omakase-tatami.jpg`;
export const omakaseChefPrep = `${CDN}/omakase-chef-prep.jpg`;
export const omakaseCounterMood = `${CDN}/omakase-counter-mood.jpg`;

export const heroDon = `${CDN}/hero-don.jpg`;
export const heroHotpot = `${CDN}/hero-hotpot.jpg`;
export const heroOmakase = `${CDN}/hero-omakase.jpg`;
export const heroSushi = `${CDN}/hero-sushi.jpg`;
export const heroWagyu = `${CDN}/hero-wagyu.jpg`;

export const IMAGES: Record<string, string> = {
  logo,
  "logo-dark": logoDark,
  "logo-horizontal": logoHorizontal,
  "logo-horizontal-dark": logoHorizontalDark,
  space,
  "omakase-counter": omakaseCounter,
  "omakase-tatami": omakaseTatami,
  "omakase-chef-prep": omakaseChefPrep,
  "omakase-counter-mood": omakaseCounterMood,
  "hero-omakase": heroOmakase,
  "hero-wagyu": heroWagyu,
  "hero-sushi": heroSushi,
  "hero-hotpot": heroHotpot,
  "hero-don": heroDon,
};

export function img(key?: string): string | undefined {
  if (!key) return undefined;
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("data:") ||
    key.startsWith("/")
  ) {
    return key;
  }
  return IMAGES[key];
}

/**
 * Lấy ảnh đại diện chất lượng cao cho món ăn.
 * Ưu tiên:
 * 1. Ảnh do nhà hàng tải lên qua CMS hoặc URL trực tiếp.
 * 2. Mã ảnh trong danh mục IMAGES (hero-wagyu, hero-omakase, hero-sushi,...).
 * 3. Tự động nhận diện theo danh mục (Wagyu, Sushi, Sashimi, Lẩu, Cơm/Mì, Khai vị, Salad...)
 *    và từ khoá tên món để đảm bảo POPUP và THẺ MÓN luôn có hình ảnh chuẩn Nhật, đẹp mắt.
 */
export function getDishImage(dish?: {
  image?: string;
  categoryId?: string;
  name?: string;
  id?: string;
} | null): string {
  if (!dish) return heroOmakase;

  const direct = img(dish.image);
  if (direct) return direct;

  const cat = dish.categoryId || "";
  const nameLower = (dish.name || "").toLowerCase();
  const idLower = (dish.id || "").toLowerCase();

  // 1. Wagyu, Bò & Món nướng than hoa / Butcher
  if (
    cat === "wagyu" ||
    cat === "nuong" ||
    cat === "butcher" ||
    nameLower.includes("bò") ||
    nameLower.includes("wagyu") ||
    nameLower.includes("steak") ||
    nameLower.includes("sườn") ||
    idLower.includes("wagyu") ||
    idLower.includes("beef")
  ) {
    return heroWagyu;
  }

  // 2. Sushi, Maki & Nigiri cuộn
  if (
    cat === "sushi" ||
    cat === "maki" ||
    nameLower.includes("sushi") ||
    nameLower.includes("maki") ||
    nameLower.includes("cuộn") ||
    nameLower.includes("nigiri") ||
    nameLower.includes("gunkan") ||
    nameLower.includes("tsutsumi")
  ) {
    return heroSushi;
  }

  // 3. Lẩu Shabu Shabu & Sukiyaki
  if (
    cat === "lau" ||
    nameLower.includes("lẩu") ||
    nameLower.includes("shabu") ||
    nameLower.includes("sukiyaki") ||
    nameLower.includes("nabe") ||
    idLower.includes("hotpot") ||
    idLower.includes("lau")
  ) {
    return heroHotpot;
  }

  // 4. Cơm Donburi, Mì Udon, Ramen & Món chiên Tempura
  if (
    cat === "com" ||
    cat === "mi" ||
    cat === "chien" ||
    nameLower.includes("cơm") ||
    nameLower.includes("don") ||
    nameLower.includes("mì") ||
    nameLower.includes("udon") ||
    nameLower.includes("ramen") ||
    nameLower.includes("soba") ||
    nameLower.includes("tempura") ||
    nameLower.includes("chiên")
  ) {
    return heroDon;
  }

  // 5. Khai vị, Salad & Tráng miệng
  if (cat === "salad") {
    return omakaseTatami;
  }
  if (cat === "trang-mieng") {
    return omakaseCounterMood;
  }
  if (cat === "khai-vi") {
    return omakaseChefPrep;
  }

  // 6. Mặc định là Sashimi tươi sống chuẩn Omakase
  return heroOmakase;
}

export {
  logo as logoSrc,
  logoDark as logoDarkSrc,
  logoHorizontal as logoHorizontalSrc,
  logoHorizontalDark as logoHorizontalDarkSrc,
  space as spaceSrc,
};
