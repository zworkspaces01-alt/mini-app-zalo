import React, { SVGProps } from "react";
import * as Outline from "@heroicons/react/24/outline";
import * as Solid from "@heroicons/react/24/solid";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  active?: boolean;
  filled?: boolean;
};

type P = IconProps;

/**
 * Wrapper tích hợp bộ icon chuẩn Heroicons từ Tailwind Labs:
 * - Khi active hoặc filled = true ➔ tự động chuyển sang biến thể Solid (tô đặc)
 * - Khi bình thường ➔ hiển thị biến thể Outline (nét 24x24 chuẩn mực)
 */
function wrap(
  OutlineComponent: React.ComponentType<React.ComponentProps<"svg">>,
  SolidComponent?: React.ComponentType<React.ComponentProps<"svg">>
) {
  return ({ size = 22, active, filled, className = "", style, ...props }: P) => {
    const isSolid = Boolean(active || filled) && SolidComponent;
    const Component = isSolid ? SolidComponent : OutlineComponent;

    return (
      <Component
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, flexShrink: 0, ...style }}
        {...props}
      />
    );
  };
}

/* ─── Bộ Icon Chính ─── */
export const IconHome = wrap(Outline.HomeIcon, Solid.HomeIcon);
export const IconOmakase = wrap(Outline.SparklesIcon, Solid.SparklesIcon);
export const IconMenu = wrap(Outline.BookOpenIcon, Solid.BookOpenIcon);
export const IconCalendar = wrap(Outline.CalendarDaysIcon, Solid.CalendarDaysIcon);
export const IconUser = wrap(Outline.UserIcon, Solid.UserIcon);

/* ─── Điều Hướng & Thao Tác ─── */
export const IconChevronRight = wrap(Outline.ChevronRightIcon, Solid.ChevronRightIcon);
export const IconChevronLeft = wrap(Outline.ChevronLeftIcon, Solid.ChevronLeftIcon);
export const IconClose = wrap(Outline.XMarkIcon, Solid.XMarkIcon);
export const IconSearch = wrap(Outline.MagnifyingGlassIcon, Solid.MagnifyingGlassIcon);
export const IconPlus = wrap(Outline.PlusIcon, Solid.PlusIcon);
export const IconMinus = wrap(Outline.MinusIcon, Solid.MinusIcon);

/* ─── Thương Mại & Tương Tác ─── */
export const IconCart = wrap(Outline.ShoppingBagIcon, Solid.ShoppingBagIcon);
export const IconHeart = wrap(Outline.HeartIcon, Solid.HeartIcon);
export const IconCheck = wrap(Outline.CheckIcon, Solid.CheckIcon);
export const IconQR = wrap(Outline.QrCodeIcon, Solid.QrCodeIcon);
export const IconClock = wrap(Outline.ClockIcon, Solid.ClockIcon);
export const IconPhone = wrap(Outline.PhoneIcon, Solid.PhoneIcon);
export const IconChat = wrap(Outline.ChatBubbleLeftEllipsisIcon, Solid.ChatBubbleLeftEllipsisIcon);
export const IconPin = wrap(Outline.MapPinIcon, Solid.MapPinIcon);

/* ─── Tiện Ích & Hệ Thống ─── */
export const IconUsers = wrap(Outline.UsersIcon, Solid.UsersIcon);
export const IconInfo = wrap(Outline.InformationCircleIcon, Solid.InformationCircleIcon);
export const IconShare = wrap(Outline.ShareIcon, Solid.ShareIcon);
export const IconGlobe = wrap(Outline.GlobeAltIcon, Solid.GlobeAltIcon);
export const IconTheme = wrap(Outline.SunIcon, Solid.SunIcon);
