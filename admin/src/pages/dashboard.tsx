import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { IconChevronRight, IconWarn } from "@/components/icons";
import {
  Card,
  EmptyState,
  ErrorBar,
  Pill,
  SectionHeading,
  Skeleton,
} from "@/components/ui";
import { dateLabel, hhmm, todayISO, vnd } from "@/lib/format";
import {
  ACTIVE_RESERVATION_STATUSES,
  RESERVATION_STATUS,
  SEATING_LABEL,
} from "@/lib/status";
import { supabase, type Reservation, type Settings } from "@/lib/supabase";

interface Stats {
  reservations: Reservation[];
  /** Bàn của những ngày tới đang chờ xử lý — bàn mới hầu như luôn rơi vào đây */
  upcomingPending: Reservation[];
  openOrders: number;
  orderRevenue: number;
  pendingDeposit: number;
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "gold" | "shu" | "jade";
}) {
  const colors = { gold: "text-gold", shu: "text-shu", jade: "text-jade" };
  return (
    <Card className="p-4">
      <div className="text-[12px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`mt-1.5 font-display text-[26px] leading-none tabular-nums ${
          tone ? colors[tone] : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[12px] text-faint">{hint}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  const load = useCallback(async () => {
    setError(null);
    const [res, upcoming, orders, cfg] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("reserved_date", today)
        .order("reserved_time"),
      // Omakase đặt trước ít nhất một ngày nên bàn mới không rơi vào hôm nay.
      // Không đếm riêng thì nhân viên mở Tổng quan sẽ không biết có khách đặt.
      supabase
        .from("reservations")
        .select("*")
        .gt("reserved_date", today)
        .in("status", ["pending", "awaiting-deposit"])
        .order("reserved_date")
        .limit(50),
      supabase
        .from("orders")
        .select("id, status, subtotal, created_at")
        .gte("created_at", `${today}T00:00:00`),
      supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    const err = res.error || upcoming.error || orders.error || cfg.error;
    if (err) setError(err.message);

    const reservations = res.data ?? [];
    const todayOrders = orders.data ?? [];

    setSettings(cfg.data ?? null);
    setStats({
      reservations,
      upcomingPending: upcoming.data ?? [],
      openOrders: todayOrders.filter(
        (o) => o.status === "sent" || o.status === "preparing"
      ).length,
      orderRevenue: todayOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((n, o) => n + o.subtotal, 0),
      pendingDeposit: reservations
        .filter((r) => r.deposit_amount > 0 && !r.deposit_paid && r.status !== "cancelled")
        .reduce((n, r) => n + r.deposit_amount, 0),
    });
  }, [today]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const active = (stats?.reservations ?? []).filter((r) =>
    ACTIVE_RESERVATION_STATUSES.includes(r.status)
  );
  const guests = active.reduce((n, r) => n + r.guests, 0);
  const needsAction = (stats?.reservations ?? []).filter(
    (r) => r.status === "pending" || r.status === "awaiting-deposit"
  );

  /* Những ô dữ kiện còn trống làm mini app phải ẩn bớt thông tin với khách. */
  const missing: string[] = [];
  if (settings) {
    if (!settings.oa_id) missing.push("OA ID của Zalo Official Account");
    if (settings.vat_rate === null) missing.push("thuế suất VAT");
    if (!settings.cancellation_policy) missing.push("chính sách huỷ bàn");
    if (!settings.maps_url) missing.push("link Google Maps");
  }

  return (
    <>
      <SectionHeading title="Tổng quan" subtitle={dateLabel(today)} />
      <ErrorBar error={error} />

      {stats === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              label="Bàn hôm nay"
              value={String(active.length)}
              hint={`${guests} khách`}
            />
            <Stat
              label="Cần xử lý"
              value={String(needsAction.length)}
              hint="chờ xác nhận hoặc chờ cọc"
              tone={needsAction.length > 0 ? "shu" : undefined}
            />
            <Stat
              label="Bàn sắp tới cần xử lý"
              value={String(stats.upcomingPending.length)}
              hint="ngày khác, chờ xác nhận hoặc chờ cọc"
              tone={stats.upcomingPending.length > 0 ? "gold" : undefined}
            />
            <Stat
              label="Đơn đang mở"
              value={String(stats.openOrders)}
              hint="bếp chưa ra món xong"
            />
            <Stat
              label="Tiền món hôm nay"
              value={vnd(stats.orderRevenue)}
              hint="tạm tính, chưa gồm VAT"
              tone="gold"
            />
          </div>

          {stats.pendingDeposit > 0 && (
            <Card className="mt-3 flex items-center gap-3 border-gold/40 bg-gold/5 p-4">
              <IconWarn size={18} className="shrink-0 text-gold" />
              <span className="text-[13px]">
                Còn <b className="tabular-nums">{vnd(stats.pendingDeposit)}</b> tiền
                cọc chưa thu của khách đặt hôm nay.
              </span>
            </Card>
          )}

          {missing.length > 0 && (
            <Card className="mt-3 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium">
                <IconWarn size={16} className="text-muted" />
                Còn thiếu dữ kiện
              </div>
              <p className="text-[13px] leading-relaxed text-muted">
                Chưa điền {missing.join(", ")}. Mini app đang ẩn các phần này với
                khách thay vì hiển thị thông tin chưa chắc chắn.{" "}
                <Link to="/settings" className="text-washi underline">
                  Điền ở Cấu hình
                </Link>
                .
              </p>
            </Card>
          )}

          {stats.upcomingPending.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-[18px]">Bàn sắp tới cần xử lý</h2>
                <Link
                  to="/reservations"
                  className="flex items-center gap-0.5 text-[13px] text-muted hover:text-washi"
                >
                  Mở danh sách <IconChevronRight size={15} />
                </Link>
              </div>
              <Card className="divide-y divide-line">
                {stats.upcomingPending.slice(0, 6).map((r) => (
                  <Link
                    key={r.id}
                    to="/reservations"
                    className="data-row flex items-center gap-4 px-4 py-3 transition"
                  >
                    <div className="w-[86px] shrink-0 text-[13px] tabular-nums text-muted">
                      {r.reserved_date.slice(8)}/{r.reserved_date.slice(5, 7)} ·{" "}
                      {hhmm(r.reserved_time)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">
                          {r.guest_name}
                        </span>
                        <Pill tone={RESERVATION_STATUS[r.status].tone}>
                          {RESERVATION_STATUS[r.status].label}
                        </Pill>
                      </div>
                      <div className="truncate text-[12px] text-muted">
                        {r.code} · {r.guests} khách · {SEATING_LABEL[r.seating]}
                      </div>
                    </div>
                    {r.dietary && <Pill tone="shu">dị ứng</Pill>}
                  </Link>
                ))}
              </Card>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[18px]">Lịch bàn hôm nay</h2>
              <Link
                to="/reservations"
                className="flex items-center gap-0.5 text-[13px] text-muted hover:text-washi"
              >
                Xem tất cả <IconChevronRight size={15} />
              </Link>
            </div>

            {active.length === 0 ? (
              <Card>
                <EmptyState
                  kanji="静"
                  title="Hôm nay chưa có bàn nào"
                  hint="Khách đặt từ mini app sẽ hiện ngay ở đây."
                />
              </Card>
            ) : (
              <Card className="divide-y divide-line">
                {active.map((r) => (
                  <Link
                    key={r.id}
                    to="/reservations"
                    className="data-row flex items-center gap-4 px-4 py-3 transition"
                  >
                    <div className="w-[46px] shrink-0 font-display text-[16px]">
                      {hhmm(r.reserved_time)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">
                          {r.guest_name}
                        </span>
                        <Pill tone={RESERVATION_STATUS[r.status].tone}>
                          {RESERVATION_STATUS[r.status].label}
                        </Pill>
                      </div>
                      <div className="truncate text-[12px] text-muted">
                        {r.guests} khách · {SEATING_LABEL[r.seating]}
                        {r.table_id ? ` · bàn ${r.table_id}` : ""}
                      </div>
                    </div>
                    {r.dietary && <Pill tone="shu">dị ứng</Pill>}
                  </Link>
                ))}
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
