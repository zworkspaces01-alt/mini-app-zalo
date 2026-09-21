import type { ComponentType } from "react";

import {
  Icon3DBooking,
  Icon3DButcher,
  Icon3DChat,
  Icon3DDelivery,
  Icon3DFavorite,
  Icon3DFire,
  Icon3DGift,
  Icon3DHotline,
  Icon3DHotpot,
  Icon3DInfo,
  Icon3DKnife,
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
} from "./icons-3d";

/**
 * Biểu tượng chọn được trong CMS, theo tên.
 *
 * Nội dung trong CSDL chỉ lưu tên (cột `key` của content_items). Danh sách
 * tên phải trùng với danh sách chọn trong CMS
 * (`admin/src/lib/content-sections.ts`).
 */
const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  booking: Icon3DBooking,
  butcher: Icon3DButcher,
  chat: Icon3DChat,
  delivery: Icon3DDelivery,
  favorite: Icon3DFavorite,
  fire: Icon3DFire,
  gift: Icon3DGift,
  hotline: Icon3DHotline,
  hotpot: Icon3DHotpot,
  info: Icon3DInfo,
  knife: Icon3DKnife,
  lightning: Icon3DLightning,
  map: Icon3DMapPin,
  meat: Icon3DMeat,
  menu: Icon3DMenu,
  omakase: Icon3DOmakase,
  points: Icon3DPoints,
  shield: Icon3DShield,
  snowflake: Icon3DSnowflake,
  star: Icon3DStar,
  sushi: Icon3DSushi,
  takeaway: Icon3DTakeaway,
  voucher: Icon3DVoucher,
};

/** Biểu tượng theo tên; tên lạ hoặc để trống thì dùng `fallback`. */
export function IconByKey({
  name,
  size,
  className,
  fallback = "star",
}: {
  name?: string;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const Icon = (name && ICONS[name]) || ICONS[fallback] || Icon3DStar;
  return <Icon size={size} className={className} />;
}
