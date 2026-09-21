import { IconCheck } from "@/components/ui/icons";
import { Sheet } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import { haptic } from "@/services/zalo";
import type { ThemePreference } from "@/state/atoms";

const THEMES: { code: ThemePreference; label: string; desc: string; icon: string }[] = [
  {
    code: "system",
    icon: "🌓",
    label: "Theo hệ thống thiết bị",
    desc: "Tự động đổi sáng / tối theo cài đặt của máy",
  },
  {
    code: "light",
    icon: "☀️",
    label: "Giao diện sáng",
    desc: "Mỹ học Washi, nền giấy gạo êm mắt, tinh tế",
  },
  {
    code: "dark",
    icon: "🌙",
    label: "Giao diện tối",
    desc: "Nền đen mực Sumi huyền bí, sang trọng",
  },
];

export function ThemeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { themePref, setThemePref } = useTheme();

  const pick = (code: ThemePreference) => {
    haptic("light");
    setThemePref(code);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Giao diện hiển thị">
      <div className="pb-2">
        {THEMES.map((item) => {
          const active = item.code === themePref;
          return (
            <button
              key={item.code}
              onClick={() => pick(item.code)}
              aria-current={active ? "true" : undefined}
              className="flex w-full items-center gap-3.5 border-b border-[var(--line)] py-3.5 text-left transition-colors active:bg-[var(--surface-2)] last:border-0"
            >
              <span className="text-[20px]">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[15px] ${
                    active ? "font-semibold text-[var(--washi)]" : "text-[var(--muted)]"
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-[12px] text-[var(--faint)] mt-0.5">
                  {item.desc}
                </div>
              </div>
              {active && <IconCheck size={18} className="text-[var(--shu)]" />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
