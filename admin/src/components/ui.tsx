import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from "react";

import { IconClose } from "./icons";

/* ─────────────── Nút ─────────────── */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-shu text-white hover:brightness-110 active:brightness-95",
  gold: "bg-gold text-[#1a1509] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface2 text-washi border border-line2 hover:bg-surface3",
  ghost: "bg-transparent text-muted hover:text-washi hover:bg-surface2",
  danger: "bg-transparent text-shu border border-shu/40 hover:bg-shu/10",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  full,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  full?: boolean;
}) {
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-12 px-6 text-[15px]",
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition
        ${sizes[size]} ${VARIANTS[variant]} ${full ? "w-full" : ""}
        ${disabled || loading ? "cursor-not-allowed opacity-45" : ""} ${className}`}
    >
      {loading && <Spinner size={15} />}
      {children}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      style={{ width: size, height: size }}
      className="spin inline-block rounded-full border-2 border-current/25 border-t-current"
    />
  );
}

/* ─────────────── Trường nhập ─────────────── */
const field =
  "w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-[14px] text-washi outline-none transition placeholder:text-faint focus:border-line2";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ invalid, className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      {...rest}
      className={`${field} ${invalid ? "!border-shu" : ""} ${className}`}
    />
  );
});

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${field} min-h-[88px] resize-y ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${field} ${className}`}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[12px] font-medium uppercase tracking-wide text-muted">
        {label}
        {required && <span className="text-shu">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-shu">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[12px] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-jade" : "bg-surface3"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
          checked ? "left-[26px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/* ─────────────── Thẻ, nhãn ─────────────── */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "jade" | "shu" | "faint";
}) {
  const tones = {
    neutral: "bg-white/10 text-washi",
    gold: "bg-gold/15 text-gold",
    jade: "bg-jade/15 text-jade",
    shu: "bg-shu/15 text-shu",
    faint: "bg-white/5 text-faint",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-[3px] text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[22px] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

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
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 text-[40px] leading-none text-surface3">{kanji}</div>
      <p className="font-display text-[16px]">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[13px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`pulse-soft rounded bg-surface2 ${className}`} />;
}

/* Dải báo lỗi dùng chung cho mọi trang */
export function ErrorBar({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg border border-shu/40 bg-shu/10 px-3.5 py-2.5 text-[13px] text-shu">
      {error}
    </div>
  );
}

/* ─────────────── Hộp thoại ─────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line2 bg-surface sm:rounded-2xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-display text-[18px]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-washi"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* Xác nhận trước khi làm việc khó hoàn tác */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Xác nhận",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Thôi
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[14px] leading-relaxed text-muted">{body}</p>
    </Modal>
  );
}
