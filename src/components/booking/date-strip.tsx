import { useMemo } from "react";

import { useLang, useT } from "@/i18n";
import { haptic } from "@/services/zalo";
import { toISODate, weekdayName } from "@/utils/format";

/**
 * Dải ngày ngang — mặc định 30 ngày kể từ hôm nay.
 *
 * `minDate` (ISO) là ngày sớm nhất khách còn đặt được; ngày trước đó vẫn
 * hiện nhưng mờ và bấm không ăn, để khách thấy quy tắc thay vì thấy dải
 * ngày tự nhiên ngắn đi.
 */
export default function DateStrip({
  value,
  onChange,
  days = 30,
  minDate,
}: {
  value?: string;
  onChange: (iso: string) => void;
  days?: number;
  minDate?: string;
}) {
  const t = useT();
  const lang = useLang();

  const dates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, [days]);

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {dates.map((d, i) => {
        const iso = toISODate(d);
        const active = iso === value;
        // So sánh chuỗi ISO là đủ: cùng định dạng thì thứ tự chữ = thứ tự ngày.
        const blocked = !!minDate && iso < minDate;
        return (
          <button
            key={iso}
            disabled={blocked}
            aria-disabled={blocked}
            onClick={() => {
              if (!blocked) {
                haptic("light");
                onChange(iso);
              }
            }}
            className={[
              "flex h-[72px] w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border transition-all active:scale-95 shadow-sm",
              active
                ? "border-[var(--shu)] bg-[var(--shu-dim)] text-[var(--shu)] font-semibold shadow-md shadow-[var(--shu)]/10"
                : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--washi)]",
              blocked ? "opacity-30 pointer-events-none" : "",
            ].join(" ")}
          >
            <span className={["text-[11px]", active ? "text-[var(--shu)]" : "text-[var(--muted)]"].join(" ")}>
              {i === 0 ? t.booking.today : weekdayName(d, lang, true)}
            </span>
            <span className="text-[18px] font-semibold leading-none tabular-nums">
              {d.getDate()}
            </span>
            <span className={["text-[10px]", active ? "text-[var(--shu)] opacity-80" : "text-[var(--faint)]"].join(" ")}>
              {t.booking.monthShort(d.getMonth() + 1)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
