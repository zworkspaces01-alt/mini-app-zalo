import { useAtom } from "jotai";
import { useEffect, useState } from "react";

import { IconCheck, IconClose, IconGlobe } from "@/components/ui/icons";
import { LANGS, langAtom, useT } from "@/i18n";
import { haptic } from "@/services/zalo";
import type { Lang } from "@/types";

/**
 * Hộp thoại chọn ngôn ngữ căn giữa màn hình (Centered Modal).
 *
 * Tên mỗi thứ tiếng viết bằng chính thứ tiếng đó — khách đang thấy màn hình
 * mình không đọc được thì chỉ nhận ra dòng "日本語", không nhận ra dòng
 * "Tiếng Nhật".
 */
export function LangSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [lang, setLang] = useAtom(langAtom);
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

  const pick = (code: Lang) => {
    haptic("light");
    setLang(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Thẻ Modal căn chính giữa màn hình */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Tiêu đề & Nút đóng */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gold-dim)] text-[var(--gold)]">
              <IconGlobe size={18} />
            </div>
            <h3 className="font-display text-[16px] font-bold text-[var(--washi)]">
              {t.lang.title}
            </h3>
          </div>
          <button
            aria-label={t.common.close}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--washi)] active:bg-[var(--surface-2)] transition-colors"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Danh sách ngôn ngữ */}
        <div className="mt-3 space-y-2">
          {LANGS.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                  active
                    ? "border-[var(--shu)] bg-[var(--shu-dim)] shadow-sm font-semibold"
                    : "border-[var(--line)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold tracking-wider ${
                    active
                      ? "bg-[var(--shu)] text-white shadow-sm"
                      : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]"
                  }`}
                >
                  {l.short}
                </span>
                <span
                  className={`flex-1 text-[14px] ${
                    active ? "text-[var(--washi)] font-semibold" : "text-[var(--muted)]"
                  }`}
                >
                  {l.label}
                </span>
                {active && <IconCheck size={18} className="text-[var(--shu)] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const LangModal = LangSheet;

/** Nút chuyển ngôn ngữ dạng viên thuốc Glassmorphism cao cấp (cao 32px chuẩn đối xứng). */
export function LangButton({ className = "" }: { className?: string }) {
  const [lang] = useAtom(langAtom);
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <>
      <button
        aria-label={t.lang.switch}
        onClick={() => {
          haptic("light");
          setOpen(true);
        }}
        className={[
          "inline-flex h-[32px] items-center gap-1.5 rounded-full border border-[var(--line-strong)]",
          "bg-[var(--glass-bg)] px-3 backdrop-blur-md text-[var(--washi)] shadow-sm shadow-black/10",
          "active:scale-95 active:bg-[var(--surface-3)] transition-all duration-150 select-none",
          className,
        ].join(" ")}
      >
        <IconGlobe size={14} className="text-[var(--gold)]" />
        <span className="text-[11px] font-semibold tracking-wider">
          {current.short}
        </span>
        <svg
          width="8"
          height="5"
          viewBox="0 0 8 5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--muted)] ml-0.5 opacity-80"
        >
          <path
            d="M1 1L4 4L7 1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <LangSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
