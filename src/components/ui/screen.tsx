import { ReactNode } from "react";
import { Page, useNavigate } from "zmp-ui";

import { useT } from "@/i18n";
import { haptic } from "@/services/zalo";

import { IconChevronLeft } from "./icons";

/** Khung trang chuẩn — đã chừa chỗ cho thanh điều hướng dưới. */
export function Screen({
  name,
  children,
  className = "",
  pad = true,
  onScroll,
}: {
  name: string;
  children: ReactNode;
  className?: string;
  pad?: boolean;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  return (
    <Page name={name} hideScrollbar restoreScrollOnBack onScroll={onScroll}>
      <div className={`page-scroll ${pad ? "page-pad" : ""} ${className}`}>
        {children}
      </div>
    </Page>
  );
}

/** Header có nút quay lại — dùng cho các trang con. */
export function BackHeader({
  title,
  subtitle,
  right,
  onBack,
  /** Đặt chồng lên ảnh hero: header trong suốt, nút back có nền mờ. */
  overlay,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  overlay?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const t = useT();
  return (
    <div
      className={[
        "sticky-head -mx-4 px-4",
        overlay ? "sticky-head--overlay inset-x-0 top-0 mb-0" : "mb-4",
        className,
      ].join(" ")}
    >
      {/* head-safe: chừa góc phải trên cho hai nút mặc định của Zalo. */}
      <div className="head-safe flex h-10 items-center gap-2 pb-1">
        <button
          aria-label={t.common.back}
          onClick={() => {
            haptic("light");
            if (onBack) onBack();
            else navigate(-1);
          }}
          className={[
            "-ml-1.5 flex h-9 w-9 items-center justify-center rounded-full text-[var(--washi)] transition-transform active:scale-90",
            overlay ? "icon-scrim" : "active:bg-[var(--surface-2)]",
          ].join(" ")}
        >
          <IconChevronLeft />
        </button>
        <div className="min-w-0 flex-1">
          {title && (
            <div className="truncate font-display text-[17px] leading-tight">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="truncate text-[12px] text-[var(--muted)]">
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
    </div>
  );
}
