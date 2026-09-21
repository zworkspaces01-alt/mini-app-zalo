import { useCallback, useEffect, useMemo, useState } from "react";

import { IconRefresh } from "@/components/icons";
import { Button, Card, ErrorBar, Input, SectionHeading } from "@/components/ui";
import { formatNumber, todayISO, vnd } from "@/lib/format";
import { supabase, type Order, type OrderLine, type Payment, type Reservation } from "@/lib/supabase";

type OrderWithLines = Order & { order_lines: OrderLine[] };

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<"today" | "yesterday" | "7days" | "month" | "custom">("7days");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayISO());

  const [orders, setOrders] = useState<OrderWithLines[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPresetRange = (preset: "today" | "yesterday" | "7days" | "month") => {
    setDateRange(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const startISO = `${startDate}T00:00:00Z`;
    const endISO = `${endDate}T23:59:59Z`;

    const [oRes, pRes, rRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_lines(*)")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .neq("status", "cancelled"),
      supabase
        .from("payments")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO),
      supabase
        .from("reservations")
        .select("*")
        .gte("reserved_date", startDate)
        .lte("reserved_date", endDate),
    ]);

    setLoading(false);
    if (oRes.error) setError(oRes.error.message);
    setOrders((oRes.data as OrderWithLines[]) ?? []);
    setPayments((pRes.data as Payment[]) ?? []);
    setReservations((rRes.data as Reservation[]) ?? []);
  }, [startDate, endDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Phân tích chỉ số tài chính
  const metrics = useMemo(() => {
    let totalGrossRevenue = 0;
    let dineInRevenue = 0;
    let deliveryRevenue = 0;
    let takeoutRevenue = 0;
    let totalDeliveryFees = 0;

    for (const o of orders) {
      const lineSum = o.subtotal || 0;
      totalGrossRevenue += lineSum + (o.delivery_fee || 0);
      totalDeliveryFees += o.delivery_fee || 0;

      if (o.mode === "dine-in" || o.mode === "pre-order") {
        dineInRevenue += lineSum;
      } else if (o.mode === "delivery") {
        deliveryRevenue += lineSum;
      } else if (o.mode === "takeout") {
        takeoutRevenue += lineSum;
      }
    }

    // Tiền cọc đặt bàn
    let totalDepositReceived = 0;
    let confirmedBookings = 0;
    for (const r of reservations) {
      if (r.deposit_paid) {
        totalDepositReceived += r.deposit_amount || 0;
      }
      if (r.status === "confirmed" || r.status === "completed") {
        confirmedBookings++;
      }
    }

    // Tiền SePay đã nhận
    let sepayTotal = 0;
    for (const p of payments) {
      if (p.transfer_type === "in" && p.status !== "ignored") {
        sepayTotal += p.amount || 0;
      }
    }

    const aov = orders.length > 0 ? Math.round(totalGrossRevenue / orders.length) : 0;

    return {
      totalGrossRevenue,
      dineInRevenue,
      deliveryRevenue,
      takeoutRevenue,
      totalDeliveryFees,
      totalDepositReceived,
      confirmedBookings,
      sepayTotal,
      aov,
      orderCount: orders.length,
      bookingCount: reservations.length,
    };
  }, [orders, reservations, payments]);

  // Top món bán chạy nhất
  const topDishes = useMemo(() => {
    const dishMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const l of o.order_lines) {
        const key = l.name;
        const current = dishMap.get(key) || { name: l.name, qty: 0, revenue: 0 };
        current.qty += l.qty;
        current.revenue += l.unit_price * l.qty;
        dishMap.set(key, current);
      }
    }
    return Array.from(dishMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [orders]);

  // Xuất file CSV
  const exportCsv = () => {
    let csv = "Mã đơn,Ngày tạo,Hình thức,Người nhận / Bàn,Số lượng món,Tiền món,Phí ship,Tổng tiền,Thanh toán,Trạng thái\n";
    for (const o of orders) {
      const target = o.table_id ? `Bàn ${o.table_id}` : o.customer_name || "Khách lẻ";
      const total = (o.subtotal || 0) + (o.delivery_fee || 0);
      csv += `"${o.code}","${o.created_at}","${o.mode}","${target}","${o.order_lines.length}","${o.subtotal}","${o.delivery_fee || 0}","${total}","${o.payment_status}","${o.status}"\n`;
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miyako-revenue-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Báo cáo Doanh thu & Thống kê"
        subtitle="Tổng hợp hiệu quả kinh doanh, cơ cấu nguồn thu và phân tích món bán chạy"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              📥 Xuất file Excel (CSV)
            </Button>
            <Button size="sm" loading={loading} onClick={loadReportData}>
              <IconRefresh size={15} /> Tải lại
            </Button>
          </div>
        }
      />

      <ErrorBar error={error} />

      {/* Bộ lọc khoảng thời gian */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted font-medium">Khoảng thời gian:</span>
            <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-[13px]">
              <button
                onClick={() => setPresetRange("today")}
                className={`rounded px-3 py-1.5 transition ${
                  dateRange === "today" ? "bg-surface2 text-washi font-medium" : "text-muted"
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setPresetRange("yesterday")}
                className={`rounded px-3 py-1.5 transition ${
                  dateRange === "yesterday" ? "bg-surface2 text-washi font-medium" : "text-muted"
                }`}
              >
                Hôm qua
              </button>
              <button
                onClick={() => setPresetRange("7days")}
                className={`rounded px-3 py-1.5 transition ${
                  dateRange === "7days" ? "bg-surface2 text-washi font-medium" : "text-muted"
                }`}
              >
                7 ngày qua
              </button>
              <button
                onClick={() => setPresetRange("month")}
                className={`rounded px-3 py-1.5 transition ${
                  dateRange === "month" ? "bg-surface2 text-washi font-medium" : "text-muted"
                }`}
              >
                Tháng này
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDateRange("custom");
                setStartDate(e.target.value);
              }}
              className="w-36 text-center"
            />
            <span className="text-muted">đến</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDateRange("custom");
                setEndDate(e.target.value);
              }}
              className="w-36 text-center"
            />
          </div>
        </div>
      </Card>

      {/* Thẻ chỉ số kinh doanh then chốt (KPIs) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-[12px] text-faint">TỔNG DOANH THU ĐƠN HÀNG</div>
          <div className="mt-1 font-display text-[24px] font-bold text-gold">
            {vnd(metrics.totalGrossRevenue)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted">
            {metrics.orderCount} đơn hàng đã xử lý
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[12px] text-faint">DOANH THU TẠI BÀN (DINE-IN)</div>
          <div className="mt-1 font-display text-[22px] font-bold text-washi">
            {vnd(metrics.dineInRevenue)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted">
            Omakase & Alacarte tại quầy/bàn
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[12px] text-faint">BUTCHER THỊT TƯƠI & GIAO HÀNG</div>
          <div className="mt-1 font-display text-[22px] font-bold text-sky-400">
            {vnd(metrics.deliveryRevenue + metrics.takeoutRevenue)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted">
            Ship: {vnd(metrics.deliveryRevenue)} · Lấy quán: {vnd(metrics.takeoutRevenue)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[12px] text-faint">GIÁ TRỊ ĐƠN TRUNG BÌNH (AOV)</div>
          <div className="mt-1 font-display text-[22px] font-bold text-emerald-400">
            {vnd(metrics.aov)}
          </div>
          <div className="mt-1 text-[11.5px] text-muted">
            Doanh thu bình quân / mỗi đơn
          </div>
        </Card>
      </div>

      {/* Cơ cấu nguồn thu & Đối soát SePay */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <h3 className="font-display text-[16px] text-washi border-b border-line pb-2">
            Cơ cấu doanh thu theo nguồn
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span>🍽️ Dùng bữa tại nhà hàng</span>
                <span className="font-semibold text-washi">{vnd(metrics.dineInRevenue)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{
                    width: `${metrics.totalGrossRevenue ? (metrics.dineInRevenue / metrics.totalGrossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span>🛵 Thịt tươi giao tận nơi (Butcher)</span>
                <span className="font-semibold text-sky-400">{vnd(metrics.deliveryRevenue)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{
                    width: `${metrics.totalGrossRevenue ? (metrics.deliveryRevenue / metrics.totalGrossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[13px] mb-1">
                <span>🏪 Khách mua mang về</span>
                <span className="font-semibold text-amber-400">{vnd(metrics.takeoutRevenue)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${metrics.totalGrossRevenue ? (metrics.takeoutRevenue / metrics.totalGrossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-display text-[16px] text-washi border-b border-line pb-2">
            Đối soát cọc đặt bàn & Ngân hàng SePay
          </h3>
          <div className="space-y-2.5 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-muted">Tổng lượt khách đặt bàn:</span>
              <span className="font-semibold">{metrics.bookingCount} lượt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Lượt đã xác nhận & hoàn tất:</span>
              <span className="font-semibold text-emerald-400">{metrics.confirmedBookings} bàn</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tổng tiền cọc đã thu:</span>
              <span className="font-semibold font-mono text-gold">{vnd(metrics.totalDepositReceived)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <span className="text-muted">Tổng tiền ngân hàng SePay ghi nhận:</span>
              <span className="font-semibold font-mono text-washi">{vnd(metrics.sepayTotal)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top 10 Món bán chạy nhất */}
      <Card className="p-5 space-y-4">
        <h3 className="font-display text-[16px] text-washi border-b border-line pb-2">
          Top 10 món bán chạy nhất trong kỳ
        </h3>

        {topDishes.length === 0 ? (
          <div className="py-8 text-center text-muted text-[13px]">
            Chưa có dữ liệu gọi món trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-line bg-surface2/60 text-muted">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-4">Tên món / Sản phẩm</th>
                  <th className="py-2.5 px-4 text-center">Số lượng bán</th>
                  <th className="py-2.5 px-4 text-right">Tổng doanh thu món</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {topDishes.map((d, idx) => (
                  <tr key={d.name} className="hover:bg-surface2/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-gold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-washi">{d.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono font-semibold text-washi">
                      {formatNumber(d.qty)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gold">
                      {vnd(d.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
