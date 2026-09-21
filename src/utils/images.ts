import heroDon from "@/static/img/hero-don.jpg";
import heroHotpot from "@/static/img/hero-hotpot.jpg";
import heroOmakase from "@/static/img/hero-omakase.jpg";
import heroSushi from "@/static/img/hero-sushi.jpg";
import heroWagyu from "@/static/img/hero-wagyu.jpg";
import logo from "@/static/img/logo.png";
import logoDark from "@/static/img/logo-dark.png";
import space from "@/static/img/space.jpg";
import omakaseCounter from "@/static/img/omakase-counter.jpg";
import omakaseTatami from "@/static/img/omakase-tatami.jpg";
import omakaseChefPrep from "@/static/img/omakase-chef-prep.jpg";
import omakaseCounterMood from "@/static/img/omakase-counter-mood.jpg";

import logoHorizontal from "@/static/img/Light@4x-scaled.png";
import logoHorizontalDark from "@/static/img/logo-horizontal-dark.png";

/**
 * Ảnh thật của Miyako: logo và ảnh không gian lấy từ bộ nhận diện,
 * ảnh món cắt từ chính bộ menu in của nhà hàng.
 *
 * Muốn thêm ảnh cho món khác: bỏ file vào `src/static/img/`, khai báo ở đây,
 * rồi điền khoá vào trường `image` của món trong `src/data/menu.ts`.
 */
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
  return key ? IMAGES[key] : undefined;
}

export {
  logo as logoSrc,
  logoDark as logoDarkSrc,
  logoHorizontal as logoHorizontalSrc,
  logoHorizontalDark as logoHorizontalDarkSrc,
  space as spaceSrc,
  omakaseCounter,
  omakaseTatami,
  omakaseChefPrep,
  omakaseCounterMood,
  heroDon,
  heroHotpot,
  heroOmakase,
  heroSushi,
  heroWagyu,
};

