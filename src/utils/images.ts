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

export {
  logo as logoSrc,
  logoDark as logoDarkSrc,
  logoHorizontal as logoHorizontalSrc,
  logoHorizontalDark as logoHorizontalDarkSrc,
  space as spaceSrc,
};
