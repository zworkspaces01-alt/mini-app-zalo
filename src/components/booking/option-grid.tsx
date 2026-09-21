import { ReactNode } from "react";
import { haptic } from "@/services/zalo";

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: ReactNode;
  disabled?: boolean;
}

export default function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option<T>[];
  value?: T;
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }[columns];
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            disabled={o.disabled}
            onClick={() => {
              haptic("light");
              onChange(o.value);
            }}
            className={[
              "rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] shadow-sm",
              active
                ? "border-[var(--shu)] bg-[var(--shu-dim)] shadow-md shadow-[var(--shu)]/10"
                : "border-[var(--line)] bg-[var(--surface-2)]",
              o.disabled ? "opacity-40 pointer-events-none" : "",
            ].join(" ")}
          >
            <div className={`text-[14px] leading-snug ${active ? "font-semibold text-[var(--washi)]" : "font-medium"}`}>
              {o.label}
            </div>
            {o.hint && (
              <div className="mt-0.5 text-[12px] leading-snug text-[var(--muted)]">
                {o.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
