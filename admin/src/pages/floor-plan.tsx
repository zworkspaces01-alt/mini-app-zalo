import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IconCheck,
  IconPrinter,
  IconRefresh,
} from "@/components/icons";
import { printGuestBill } from "@/components/print-bill";
import {
  Button,
  ErrorBar,
  Field,
  Modal,
  SectionHeading,
  Select,
} from "@/components/ui";
import { dateTimeLabel, timeAgo, vnd } from "@/lib/format";
import {
  supabase,
  type Order,
  type OrderLine,
  type Reservation,
  type RestaurantTable,
  type Settings,
} from "@/lib/supabase";

type OrderWithLines = Order & { order_lines: OrderLine[] };

export default function FloorPlanPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderWithLines[]>([]);
  const [todayBookings, setTodayBookings] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [moveModal, setMoveModal] = useState<RestaurantTable | null>(null);
  const [targetTableId, setTargetTableId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    const today = new Date().toISOString().slice(0, 10);

    const [tRes, oRes, bRes, setRes] = await Promise.all([
      supabase.from("restaurant_tables").select("*").order("sort_order"),
      supabase
        .from("orders")
        .select("*, order_lines(*)")
        .in("status", ["sent", "preparing", "served"])
        .eq("mode", "dine-in"),
      supabase
        .from("reservations")
        .select("*")
        .eq("reserved_date", today)
        .in("status", ["pending", "awaiting-deposit", "confirmed"]),
      supabase.from("restaurant_settings").select("*").eq("id", 1).single(),
    ]);

    if (tRes.error) setError(tRes.error.message);
    setTables(tRes.data ?? []);
    setActiveOrders((oRes.data as OrderWithLines[]) ?? []);
    setTodayBookings(bRes.data ?? []);
    setSettings(setRes.data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription cho sơ đồ bàn
  useEffect(() => {
    const channel = supabase
      .channel("floor-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => loadData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Map đơn hàng theo bàn
  const orderMap = useMemo(() => {
    const m = new Map<string, OrderWithLines>();
    for (const o of activeOrders) {
      if (o.table_id) m.set(o.table_id, o);
    }
    return m;
  }, [activeOrders]);

  // Map đặt bàn hôm nay theo bàn
  const bookingMap = useMemo(() => {
    const m = new Map<string, Reservation>();
    for (const b of todayBookings) {
      if (b.table_id) m.set(b.table_id, b);
    }
    return m;
  }, [todayBookings]);

  // Chuyển bàn
  const handleMoveTable = async () => {
    if (!moveModal || !targetTableId) return;
    const currentOrder = orderMap.get(moveModal.id);
    if (!currentOrder) return;

    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("orders")
      .update({ table_id: targetTableId })
      .eq("id", currentOrder.id);
    setBusy(false);

    if (upErr) {
      setError(upErr.message);
    } else {
      setMoveModal(null);
      setSelectedTable(null);
      await loadData();
    }
  };

  // Thanh toán và đóng bàn
  const handleCheckoutTable = async (order: OrderWithLines) => {
    setBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("orders")
      .update({ status: "served", payment_status: "paid" })
      .eq("id", order.id);
    setBusy(false);

    if (upErr) {
      setError(upErr.message);
    } else {
      setSelectedTable(null);
      await loadData();
    }
  };

  const counterTables = tables.filter((t) => t.zone === "counter");
  const diningTables = tables.filter((t) => t.zone === "table");
  const privateTables = tables.filter((t) => t.zone === "private");

  const renderTableCard = (t: RestaurantTable) => {
    const order = orderMap.get(t.id);
    const booking = bookingMap.get(t.id);

    // Trạng thái: Có khách (Đỏ/Vàng), Đã đặt cọc (Tím), Trống (Xanh lá)
    let stateColor = "border-emerald-500/40 bg-emerald-950/15 hover:border-emerald-400";

    if (order) {
      stateColor = "border-shu/60 bg-shu/10 hover:border-shu shadow-md shadow-shu/10";
    } else if (booking) {
      stateColor = "border-purple-500/50 bg-purple-950/20 hover:border-purple-400";
    }

    return (
      <div
        key={t.id}
        onClick={() => setSelectedTable(t)}
        className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${stateColor}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-[18px] font-bold text-washi">
              {t.label}
            </div>
            <div className="text-[12px] text-faint">Sức chứa: {t.seats} khách</div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
              order
                ? "bg-shu/20 text-shu"
                : booking
                ? "bg-purple-500/20 text-purple-300"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {order ? "Có khách" : booking ? "Đã cọc" : "Trống"}
          </span>
        </div>

        <div className="mt-4 border-t border-line/60 pt-2 text-[12px]">
          {order ? (
            <div className="space-y-0.5">
              <div className="font-medium text-washi truncate">
                {order.order_lines.length} món · {vnd(order.subtotal)}
              </div>
              <div className="text-[11px] text-muted">
                Ngồi: {timeAgo(order.created_at)}
              </div>
            </div>
          ) : booking ? (
            <div className="space-y-0.5">
              <div className="font-medium text-purple-300 truncate">
                Khách: {booking.guest_name}
              </div>
              <div className="text-[11px] text-faint">
                Giờ: {booking.reserved_time.slice(0, 5)} · {booking.guests} khách
              </div>
            </div>
          ) : (
            <div className="text-emerald-400/80 text-[11.5px] italic">
              Sẵn sàng đón tiếp
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeTableOrder = selectedTable ? orderMap.get(selectedTable.id) : null;
  const activeTableBooking = selectedTable ? bookingMap.get(selectedTable.id) : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Sơ đồ bàn trực quan (Floor Plan)"
        subtitle="Mặt bằng nhà hàng thời gian thực · Click vào bàn để xem hoá đơn hoặc chuyển bàn"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={loadData}>
              <IconRefresh size={15} /> Làm mới
            </Button>
          </div>
        }
      />

      <ErrorBar error={error} />

      {/* Chú thích màu sắc */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface2/40 p-3 text-[12.5px]">
        <span className="text-muted font-medium">Trạng thái:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span>Bàn trống ({tables.length - activeOrders.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-shu" />
          <span>Đang phục vụ ({activeOrders.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-purple-500" />
          <span>Đã cọc đón khách ({todayBookings.length})</span>
        </div>
      </div>

      {/* 1. Quầy Omakase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="font-display text-[16px] text-washi flex items-center gap-2">
            🍣 QUẦY ITAMAE OMAKASE
            <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[11px] font-mono">
              12 ghế chữ L
            </span>
          </h2>
        </div>

        {counterTables.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {counterTables.map(renderTableCard)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-muted">
            Chưa có bàn quầy nào được khai báo trong Cấu hình › Bàn.
          </div>
        )}
      </div>

      {/* 2. Bàn chung Dining */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="font-display text-[16px] text-washi">
            🍽️ KHU BÀN ĂN CHUNG (DINING TABLES)
          </h2>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {diningTables.map(renderTableCard)}
        </div>
      </div>

      {/* 3. Phòng riêng VIP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="font-display text-[16px] text-washi">
            🏮 PHÒNG RIÊNG VIP (PRIVATE ROOMS)
          </h2>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {privateTables.map(renderTableCard)}
        </div>
      </div>

      {/* Modal chi tiết bàn khi click */}
      <Modal
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        wide
        title={`Chi tiết bàn: ${selectedTable?.label}`}
        footer={
          <div className="flex items-center justify-between gap-2 w-full">
            <div>
              {activeTableOrder && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMoveModal(selectedTable)}
                >
                  ⇄ Chuyển bàn
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {activeTableOrder && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => printGuestBill(activeTableOrder, settings)}
                  >
                    <IconPrinter size={15} /> In tạm tính
                  </Button>
                  <Button
                    size="sm"
                    variant="gold"
                    loading={busy}
                    onClick={() => handleCheckoutTable(activeTableOrder)}
                  >
                    <IconCheck size={15} /> Thu tiền & Đóng bàn
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedTable(null)}>
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {selectedTable && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-surface2 p-3 text-[13px]">
              <div>
                <span className="text-muted">Khu vực: </span>
                <span className="font-medium text-washi uppercase">
                  {selectedTable.zone}
                </span>
                <span className="mx-2 text-line">|</span>
                <span className="text-muted">Sức chứa: </span>
                <span className="font-medium text-washi">{selectedTable.seats} khách</span>
              </div>
              <span className="font-semibold text-gold">
                {activeTableOrder ? `Đang có đơn #${activeTableOrder.code}` : "Bàn trống"}
              </span>
            </div>

            {/* Nếu đang có đơn món tại bàn */}
            {activeTableOrder ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="text-[13.5px] font-medium text-washi">
                    Danh sách món đang phục vụ
                  </div>
                  <div className="text-[12px] text-muted">
                    Bắt đầu: {dateTimeLabel(activeTableOrder.created_at)}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {activeTableOrder.order_lines.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-surface2/50 p-2.5 text-[13.5px]"
                    >
                      <div>
                        <span className="font-semibold text-gold mr-2">{l.qty}×</span>
                        <span className="font-medium text-washi">{l.name}</span>
                        {l.variant_label && (
                          <span className="text-[12px] text-muted"> · {l.variant_label}</span>
                        )}
                        {l.note && (
                          <div className="text-[11.5px] text-shu italic">* {l.note}</div>
                        )}
                      </div>
                      <div className="font-mono font-medium text-washi">
                        {vnd(l.unit_price * l.qty)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-line pt-3 font-semibold text-[15px]">
                  <span>Tổng tiền tạm tính:</span>
                  <span className="text-gold text-[17px]">
                    {vnd(activeTableOrder.subtotal)}
                  </span>
                </div>
              </div>
            ) : activeTableBooking ? (
              <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-2">
                <div className="font-medium text-purple-300 text-[14px]">
                  Lịch đặt bàn trước đã gán cho bàn này:
                </div>
                <div className="text-[13px] space-y-1">
                  <div>Khách: <b>{activeTableBooking.guest_name}</b> ({activeTableBooking.guest_phone})</div>
                  <div>Giờ hẹn: <b>{activeTableBooking.reserved_time.slice(0, 5)}</b> · Số khách: <b>{activeTableBooking.guests}</b></div>
                  <div>Tiền cọc: <b>{vnd(activeTableBooking.deposit_amount)}</b> ({activeTableBooking.deposit_paid ? "ĐÃ CỌC" : "CHƯA CỌC"})</div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted text-[13.5px]">
                Bàn đang trống. Khách có thể quét mã QR tại bàn để tự gọi món hoặc nhân viên mở đơn tại trang Đơn gọi món.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Chuyển bàn */}
      <Modal
        open={!!moveModal}
        onClose={() => setMoveModal(null)}
        title={`Chuyển đơn từ bàn ${moveModal?.label}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMoveModal(null)}>
              Thôi
            </Button>
            <Button loading={busy} disabled={!targetTableId} onClick={handleMoveTable}>
              Xác nhận chuyển
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-muted">
            Chọn bàn trống mới để chuyển toàn bộ đơn món đang phục vụ sang:
          </p>
          <Field label="Bàn mới" required>
            <Select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
            >
              <option value="">-- Chọn bàn trống --</option>
              {tables
                .filter((t) => t.id !== moveModal?.id && !orderMap.has(t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.zone} - {t.seats} khách)
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
