import { useAtomValue } from "jotai";
import { useLocation, useNavigate } from "zmp-ui";

import {
  IconCalendar,
  IconHome,
  IconMenu,
  IconOmakase,
  IconUser,
} from "@/components/ui/icons";
import { useT, type Dict } from "@/i18n";
import { haptic } from "@/services/zalo";
import { cartCountAtom } from "@/state/atoms";

const TABS: {
  path: string;
  label: (t: Dict) => string;
  Icon: typeof IconHome;
  isCenter?: boolean;
}[] = [
  { path: "/", label: (t) => t.nav.home, Icon: IconHome },
  { path: "/omakase", label: (t) => t.nav.omakase, Icon: IconOmakase },
  { path: "/booking", label: (t) => t.nav.booking, Icon: IconCalendar, isCenter: true },
  { path: "/menu", label: (t) => t.nav.menu, Icon: IconMenu },
  { path: "/profile", label: (t) => t.nav.profile, Icon: IconUser },
];

/** Tab nào đang mở — trang con vẫn sáng tab cha. */
function isActive(tab: string, pathname: string) {
  if (tab === "/") return pathname === "/";
  return pathname === tab || pathname.startsWith(tab + "/");
}

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cartCount = useAtomValue(cartCountAtom);
  const t = useT();

  // Các trang toàn màn hình (đặt bàn, giỏ hàng) không hiện thanh điều hướng.
  const hidden = ["/booking", "/cart"].some((p) =>
    pathname.startsWith(p)
  );
  if (hidden) return null;

  return (
    <nav className="bottom-nav" aria-label={t.nav.label}>
      {TABS.map(({ path, label, Icon, isCenter }) => {
        const active = isActive(path, pathname);

        if (isCenter) {
          return (
            <button
              key={path}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => {
                haptic("medium");
                navigate(path);
              }}
              className="group relative -top-3.5 flex flex-col items-center justify-center select-none outline-none"
            >
              {/* Vòng hào quang & Nút trung tâm sơn mài Urushi đỏ */}
              <div className="relative flex items-center justify-center">
                {/* Glow nhạt phía sau */}
                <div className="absolute -inset-1 rounded-full bg-[var(--shu)]/25 blur-[3px] group-hover:bg-[var(--shu)]/35 transition-all" />

                <div
                  className={[
                    "relative flex h-[50px] w-[50px] items-center justify-center rounded-full",
                    "border-[3px] border-[var(--surface)]",
                    "bg-gradient-to-tr from-[#9c120c] via-[#d61e16] to-[#ff473d]",
                    "shadow-[0_8px_20px_-2px_rgba(226,35,26,0.45),0_2px_6px_rgba(0,0,0,0.15)]",
                    "transition-all duration-200 ease-out active:scale-90 active:shadow-[0_4px_10px_rgba(226,35,26,0.3)]",
                  ].join(" ")}
                >
                  {/* Phản quang vòm kính / sơn mài */}
                  <div className="pointer-events-none absolute inset-x-1.5 top-1 h-[18px] rounded-t-full bg-gradient-to-b from-white/35 to-transparent" />

                  <Icon size={22} active={true} className="relative z-10 text-white drop-shadow-sm" />
                </div>
              </div>

              {/* Nhãn "Đặt bàn" */}
              <span
                className="mt-1 text-[10px] font-bold leading-none tracking-wider uppercase transition-colors"
                style={{ color: active ? "var(--shu)" : "var(--washi)" }}
              >
                {label(t)}
              </span>
            </button>
          );
        }

        return (
          <button
            key={path}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              haptic("light");
              navigate(path);
            }}
            className="group relative flex flex-col items-center justify-center gap-0.5 select-none outline-none transition-all duration-200 active:scale-95 py-0.5"
          >
            {/* Pill capsule cho tab đang chọn */}
            <div
              className={[
                "relative flex items-center justify-center rounded-full px-3 py-1 transition-all duration-300 ease-out",
                active
                  ? "bg-[var(--shu-dim)] text-[var(--shu)] scale-105 shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--washi)] group-hover:scale-105",
              ].join(" ")}
            >
              <Icon
                size={20}
                active={active}
                className={active ? "scale-105 transition-transform" : "transition-transform"}
              />

              {/* Badge số lượng món trong giỏ */}
              {path === "/menu" && cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--shu)] px-1 text-[9px] font-bold text-white shadow-md shadow-[var(--shu)]/35 ring-2 ring-[var(--surface)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>

            {/* Tên tab */}
            <span
              className={[
                "text-[10px] leading-tight tracking-tight transition-all duration-200",
                active
                  ? "font-bold text-[var(--shu)]"
                  : "font-medium text-[var(--muted)] group-hover:text-[var(--washi)]",
              ].join(" ")}
            >
              {label(t)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
