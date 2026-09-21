import {
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useEffect,
} from "react";

import { useTheme } from "@/hooks/use-theme";
import { useT, useLang } from "@/i18n";
import { haptic } from "@/services/zalo";
import { Badge } from "@/types";
import { vnd } from "@/utils/format";
import {
  logoSrc,
  logoDarkSrc,
  logoHorizontalSrc,
  logoHorizontalDarkSrc,
} from "@/utils/images";

import { IconClose, IconMinus, IconPlus } from "./icons";

/* ─────────────── Nút ─────────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "gold";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  full?: boolean;
  size?: "md" | "lg";
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--shu)] text-white active:brightness-90",
  gold: "bg-[var(--gold)] text-[var(--gold-contrast)] active:brightness-90",
  secondary:
    "bg-[var(--surface-2)] text-[var(--washi)] border border-[var(--line-strong)] active:bg-[var(--surface-3)]",
  ghost: "bg-transparent text-[var(--muted)] active:text-[var(--washi)]",
};

export function Button({
  variant = "primary",
  full,
  size = "md",
  loading,
  className = "",
  children,
  disabled,
  onClick,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => {
        if (!disabled && !loading) haptic("light");
        onClick?.(e);
      }}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none shadow-sm",
        "transition-all duration-150 active:scale-[0.98] active:brightness-95",
        size === "lg" ? "h-13 min-h-[52px] px-6 text-[16px]" : "h-11 px-5 text-[14.5px]",
        full ? "w-full" : "",
        VARIANTS[variant],
        disabled || loading ? "opacity-45 pointer-events-none" : "",
        className,
      ].join(" ")}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  const t = useT();
  return (
    <span
      role="status"
      aria-label={t.common.loading}
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

/* ─────────────── Nhãn món ─────────────── */
const BADGE_STYLE: Record<Badge, string> = {
  signature: "bg-[var(--shu-dim)] text-[var(--shu)] border border-[var(--shu)]/20",
  "best-seller": "bg-[var(--gold-dim)] text-[var(--gold)] border border-[var(--gold)]/20",
  "must-try": "bg-[var(--surface-3)] text-[var(--washi)] border border-[var(--line-strong)]",
};

export function DishBadge({ badge }: { badge: Badge }) {
  const t = useT();
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE_STYLE[badge]}`}
    >
      {t.badge[badge]}
    </span>
  );
}

/* ─────────────── Chip lọc ─────────────── */
export function Chip({
  active,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={[
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] transition-colors",
        active
          ? "bg-[var(--washi)] font-semibold text-[var(--sumi)]"
          : "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ─────────────── Tiêu đề mục ─────────────── */
export function SectionTitle({
  jp,
  title,
  action,
}: {
  jp?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {jp && (
          <div className="jp mb-0.5 text-[11px] tracking-[0.3em] text-[var(--faint)]">
            {jp}
          </div>
        )}
        <h2 className="font-display text-[19px] leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ─────────────── Giá ─────────────── */
export function Price({
  value,
  from,
  compareAt,
  className = "",
}: {
  value: number;
  from?: boolean;
  compareAt?: number;
  className?: string;
}) {
  const lang = useLang();
  const t = useT();

  if (compareAt && compareAt > value) {
    return (
      <span className="inline-flex flex-col min-w-0 leading-tight tabular-nums">
        <span className="text-[10.5px] text-[var(--faint)] line-through truncate">
          {vnd(compareAt, lang)}
        </span>
        <span className={`whitespace-nowrap font-bold ${className}`}>
          {from && (
            <span className="mr-0.5 text-[11px] text-[var(--muted)] font-normal">
              {t.common.from}
            </span>
          )}
          {vnd(value, lang)}
        </span>
      </span>
    );
  }

  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {from && (
        <span className="mr-1 text-[12px] text-[var(--muted)] font-normal">
          {t.common.from}
        </span>
      )}
      {vnd(value, lang)}
    </span>
  );
}

/* ─────────────── Bộ đếm số lượng ─────────────── */
export function QtyStepper({
  qty,
  onChange,
  min = 0,
  max = 99,
  size = "md",
}: {
  qty: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const t = useT();
  const btn =
    size === "sm"
      ? "h-9 w-9 min-h-[36px] min-w-[36px]"
      : "h-11 w-11 min-h-[44px] min-w-[44px]";
  return (
    <div className="flex items-center gap-1.5">
      <button
        aria-label={t.common.decrease}
        disabled={qty <= min}
        onClick={() => {
          haptic("light");
          onChange(qty - 1);
        }}
        className={`${btn} relative flex items-center justify-center rounded-full border border-[var(--line-strong)] text-[var(--washi)] active:scale-95 transition-transform disabled:opacity-35`}
      >
        <IconMinus size={size === "sm" ? 15 : 17} />
      </button>
      <span className="min-w-[28px] text-center text-[15px] font-semibold tabular-nums">
        {qty}
      </span>
      <button
        aria-label={t.common.increase}
        disabled={qty >= max}
        onClick={() => {
          haptic("light");
          onChange(qty + 1);
        }}
        className={`${btn} relative flex items-center justify-center rounded-full bg-[var(--shu)] text-white shadow-sm active:scale-95 transition-transform disabled:opacity-35`}
      >
        <IconPlus size={size === "sm" ? 15 : 17} />
      </button>
    </div>
  );
}

/* ─────────────── Trống ─────────────── */
export function EmptyState({
  kanji = "空",
  title,
  hint,
  action,
}: {
  kanji?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="jp mb-4 text-[44px] leading-none text-[var(--surface-3)]">
        {kanji}
      </div>
      <p className="font-display text-[17px]">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-[var(--muted)]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─────────────── Skeleton ─────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ─────────────── Trường nhập ─────────────── */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--shu)]">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-[var(--shu)]">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-[var(--faint)]">{hint}</span>
      ) : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border bg-[var(--surface-2)] px-3.5 py-3 text-[15px] outline-none transition-all placeholder:text-[var(--faint)] focus:border-[var(--shu)] focus:ring-1 focus:ring-[var(--shu)]/30";

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function TextInput({ invalid, className = "", ...rest }, ref) {
  return (
    <input
      {...rest}
      ref={ref}
      className={`${fieldBase} ${
        invalid ? "border-[var(--shu)]" : "border-[var(--line)]"
      } ${className}`}
    />
  );
});

export function TextArea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`${fieldBase} min-h-[92px] resize-none border-[var(--line)] ${className}`}
    />
  );
}

/* ─────────────── Bottom sheet ─────────────── */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel" role="dialog" aria-modal="true">
        <div className="sticky top-0 z-10 bg-[var(--surface)] px-4 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[var(--surface-3)]" />
          {title && (
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[18px] leading-snug">{title}</h3>
              <button
                aria-label={t.common.close}
                onClick={onClose}
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)]"
              >
                <IconClose size={20} />
              </button>
            </div>
          )}
        </div>
        <div className="px-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 mt-4 border-t border-[var(--line)] bg-[var(--surface)] px-4 pb-2 pt-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

/* ─────────────── Dòng thông tin ─────────────── */
export function InfoRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      <span className="flex-1 text-[14px] text-[var(--muted)]">{label}</span>
      {value && <span className="text-[14px]">{value}</span>}
    </Tag>
  );
}

/* ─────────────── Ghi chú nhỏ ─────────────── */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] leading-relaxed text-[var(--faint)]">{children}</p>
  );
}

/* ─────────────── Logo nhận diện thương hiệu theo Theme ─────────────── */
export function BrandLogo({
  variant = "vertical",
  className = "",
  alt = "Miyako",
}: {
  variant?: "vertical" | "horizontal";
  className?: string;
  alt?: string;
}) {
  const { theme } = useTheme();
  const src =
    variant === "horizontal"
      ? theme === "light"
        ? logoHorizontalDarkSrc
        : logoHorizontalSrc
      : theme === "light"
      ? logoDarkSrc
      : logoSrc;

  return <img src={src} alt={alt} className={className} />;
}

/* ─────────────── Modal / Hộp Thoại Giữa Màn Hình ─────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        className="relative z-10 w-full max-w-[340px] rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-5 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <h3 className="font-display text-[16.5px] font-bold text-[var(--washi)] truncate pr-2">
            {title}
          </h3>
          <button
            aria-label={t.common.close}
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--washi)] bg-[var(--surface-2)] active:scale-95"
          >
            <IconClose size={17} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
