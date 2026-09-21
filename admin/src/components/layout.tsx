import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

import {
  IconBook,
  IconCalendar,
  IconChart,
  IconDashboard,
  IconFire,
  IconFloorPlan,
  IconGift,
  IconKDS,
  IconLogout,
  IconMenuBars,
  IconOmakase,
  IconSettings,
  IconUsers,
  IconWallet,
} from "./icons";

interface NavItem {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  end?: boolean;
  badge?: string;
  roles?: string[]; // rỗng = mọi role
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Vận hành",
    items: [
      { to: "/", label: "Tổng quan", Icon: IconDashboard, end: true },
      { to: "/floor-plan", label: "Sơ đồ bàn", Icon: IconFloorPlan },
      { to: "/kds", label: "Màn hình bếp", Icon: IconKDS, badge: "Live" },
      { to: "/reservations", label: "Đặt bàn", Icon: IconCalendar },
      { to: "/orders", label: "Đơn gọi món & Butcher", Icon: IconFire },
    ],
  },
  {
    group: "Khách hàng & Ưu đãi",
    items: [
      { to: "/customers", label: "Khách hàng CRM", Icon: IconUsers },
      { to: "/rewards", label: "Ưu đãi & Voucher", Icon: IconGift },
      { to: "/payments", label: "Thanh toán SePay", Icon: IconWallet },
    ],
  },
  {
    group: "Quản trị & Báo cáo",
    items: [
      { to: "/menu", label: "Thực đơn 149 món", Icon: IconBook },
      { to: "/omakase", label: "Omakase", Icon: IconOmakase },
      { to: "/reports", label: "Báo cáo doanh thu", Icon: IconChart },
      { to: "/settings", label: "Cấu hình", Icon: IconSettings },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "Chủ nhà hàng",
  manager: "Quản lý",
  staff: "Nhân viên",
  kitchen: "Đầu bếp (KDS)",
};

function NavItems({
  role,
  onNavigate,
}: {
  role?: string;
  onNavigate?: () => void;
}) {
  // Bếp chỉ cần xem Màn hình bếp và Đơn món
  if (role === "kitchen") {
    return (
      <nav className="flex flex-col gap-1">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Khu vực bếp
        </div>
        <NavLink
          to="/kds"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition ${
              isActive
                ? "bg-surface2 font-medium text-washi"
                : "text-muted hover:bg-surface2 hover:text-washi"
            }`
          }
        >
          <IconKDS size={18} />
          Màn hình bếp (KDS)
        </NavLink>
        <NavLink
          to="/orders"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition ${
              isActive
                ? "bg-surface2 font-medium text-washi"
                : "text-muted hover:bg-surface2 hover:text-washi"
            }`
          }
        >
          <IconFire size={18} />
          Đơn gọi món
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((grp) => (
        <div key={grp.group} className="space-y-1">
          <div className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
            {grp.group}
          </div>
          {grp.items.map(({ to, label, Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] transition ${
                  isActive
                    ? "bg-surface2 font-medium text-washi"
                    : "text-muted hover:bg-surface2 hover:text-washi"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon size={17} />
                <span>{label}</span>
              </div>
              {badge && (
                <span className="rounded bg-shu/20 px-1.5 py-0.2 text-[10px] font-bold text-shu uppercase">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { staff, signOut } = useAuth();
  const [drawer, setDrawer] = useState(false);

  const identity = (
    <div className="border-t border-line pt-3 mt-auto">
      <div className="px-3 pb-2">
        <div className="truncate text-[13px] font-medium">{staff?.full_name}</div>
        <div className="text-[11px] text-faint">
          {ROLE_LABEL[staff?.role ?? ""] ?? staff?.role}
        </div>
      </div>
      <button
        onClick={signOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-muted transition hover:bg-surface2 hover:text-washi"
      >
        <IconLogout size={16} />
        Đăng xuất
      </button>
    </div>
  );

  return (
    <div className="flex min-h-full">
      {/* Thanh bên — máy tính */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line bg-sumi p-3 lg:flex">
        <div className="px-3 py-4">
          <div className="font-display text-[19px] tracking-[0.18em] text-washi">
            MIYAKO
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
            Quản trị nhà hàng
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-3">
          <NavItems role={staff?.role} />
        </div>
        {identity}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Thanh trên — điện thoại */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-sumi px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Mở menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2"
            >
              <IconMenuBars />
            </button>
            <span className="font-display text-[17px] tracking-[0.15em] text-washi">
              MIYAKO
            </span>
          </div>

          <div className="text-[12px] font-medium text-gold">
            {staff?.full_name}
          </div>
        </header>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/65"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-sumi p-3">
              <div className="px-3 py-4">
                <div className="font-display text-[19px] tracking-[0.18em] text-washi">
                  MIYAKO
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
                  Quản trị nhà hàng
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-3">
                <NavItems
                  role={staff?.role}
                  onNavigate={() => setDrawer(false)}
                />
              </div>
              {identity}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
