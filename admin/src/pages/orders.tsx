import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconTrash,
  IconTruck,
} from "@/components/icons";
import OrderComposer, {
  linesTotal,
  toRpcLines,
  type ComposedLine,
} from "@/components/order-composer";
import {
  printDeliveryLabel,
  printGuestBill,
  printKitchenTicket,
} from "@/components/print-bill";
import {
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorBar,
  Field,
  Input,
  Modal,
  Pill,
  SectionHeading,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { dateTimeLabel, timeAgo, vnd } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/status";
import {
  supabase,
  type Order,
  type OrderLine,
  type OrderStatus,
  type Reservation,
  type RestaurantTable,
  type Settings,
} from "@/lib/supabase";

type OrderWithLines = Order & { order_lines: OrderLine[] };

const FILTERS: {
  key: "open" | "takeout_delivery" | "dine_in" | OrderStatus;
  label: string;
}[] = [
  { key: "open", label: "Đang mở" },
  { key: "takeout_delivery", label: "🥩 Mang về & Giao hàng" },
  { key: "dine_in", label: "🍽️ Tại bàn" },
  { key: "sent", label: "Mới gửi" },
  { key: "preparing", label: "Đang làm" },
  { key: "served", label: "Đã ra món / Đã giao" },
  { key: "cancelled", label: "Đã huỷ" },
];

/** Bước tiếp theo của một đơn */
const NEXT_STEP: Partial<Record<string, { to: OrderStatus; label: string }>> = {
  sent: { to: "preparing", label: "Bắt đầu làm / Sơ chế" },
  preparing: { to: "served", label: "Đã ra món / Chờ giao" },
  delivering: { to: "completed" as OrderStatus, label: "Đã giao & Hoàn tất" },
};

export default function OrdersPage() {
  const [items, setItems] = useState<OrderWithLines[] | null>(null);
  const [filter, setFilter] = useState<
    "open" | "takeout_delivery" | "dine_in" | OrderStatus
  >("open");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [openReservations, setOpenReservations] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrderWithLines | null>(null);
  const [saving, setSaving] = useState(false);

  /** Đơn đang soạn */
  const [draft, setDraft] = useState<{
    id: string;
    code?: string;
    mode: "dine-in" | "pre-order" | "takeout" | "delivery";
    table_id: string;
    reservation_id: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    delivery_time: string;
    delivery_fee: number;
    payment_method: "cod" | "vietqr" | "transfer";
    payment_status: "unpaid" | "paid";
    note: string;
    lines: ComposedLine[];
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_lines(*)")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) setError(error.message);
    setItems((data as OrderWithLines[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from("restaurant_tables")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setTables(data ?? []));
    supabase
      .from("reservations")
      .select("*")
      .in("status", ["pending", "awaiting-deposit", "confirmed"])
      .order("reserved_date")
      .then(({ data }) => setOpenReservations(data ?? []));
    supabase
      .from("restaurant_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => setSettings(data));
  }, []);

  /* Bếp và thu ngân cập nhật realtime */
  useEffect(() => {
    const channel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const visible = useMemo(() => {
    const all = items ?? [];
    if (filter === "open") {
      return all.filter(
        (o) =>
          o.status === "sent" ||
          o.status === "preparing" ||
          o.status === "delivering"
      );
    }
    if (filter === "takeout_delivery") {
      return all.filter((o) => o.mode === "takeout" || o.mode === "delivery");
    }
    if (filter === "dine_in") {
      return all.filter((o) => o.mode === "dine-in");
    }
    return all.filter((o) => o.status === filter);
  }, [items, filter]);

  const setStatus = async (order: Order, status: OrderStatus) => {
    setBusyId(order.id);
    setError(null);

    // Khi chuyển sang completed: Tự động tích điểm cho khách hàng qua RPC
    if (status === "completed") {
      const { error: rpcError } = await (supabase.rpc as any)(
        "complete_order_and_credit_points",
        { p_order_id: order.id }
      );

      if (rpcError) {
        // Fallback update thông thường nếu RPC gặp sự cố
        const { data, error } = await supabase
          .from("orders")
          .update({ status: "completed", payment_status: "paid" })
          .eq("id", order.id)
          .select("*, order_lines(*)")
          .single();
        setBusyId(null);
        if (error) {
          setError(error.message);
        } else if (data) {
          setItems((prev) =>
            (prev ?? []).map((o) => (o.id === data.id ? (data as OrderWithLines) : o))
          );
        }
        return;
      }

      // Đọc lại đơn hàng đã được cập nhật điểm
      const { data } = await supabase
        .from("orders")
        .select("*, order_lines(*)")
        .eq("id", order.id)
        .single();
      setBusyId(null);
      if (data) {
        setItems((prev) =>
          (prev ?? []).map((o) => (o.id === data.id ? (data as OrderWithLines) : o))
        );

        // Gửi thông báo tự động vào Topic Tích điểm nếu có điểm thưởng
        const pointsEarned = (data as any).points_earned;
        if (pointsEarned && pointsEarned > 0) {
          const edgeUrl = import.meta.env.VITE_SUPABASE_URL;
          const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
          if (edgeUrl && key) {
            fetch(`${edgeUrl}/functions/v1/telegram-notify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: key,
                Authorization: `Bearer ${key}`,
              },
              body: JSON.stringify({
                type: "loyalty",
                data: {
                  action: "earn",
                  customer_name: (data as any).customer_name || "Khách hàng",
                  customer_phone: (data as any).customer_phone || "",
                  tier_name: "Thành viên",
                  order_code: data.code || order.code,
                  points_change: pointsEarned,
                  note: `Đơn hàng #${data.code || order.code} hoàn tất thành công`,
                },
              }),
            }).catch((err) => console.warn("Telegram loyalty notify:", err));
          }
        }
      }
      return;
    }

    const updatePayload: any = { status };
    const { data, error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id)
      .select("*, order_lines(*)")
      .single();
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setItems((prev) =>
        (prev ?? []).map((o) =>
          o.id === data.id ? (data as OrderWithLines) : o
        )
      );
    }
  };


  const togglePaymentStatus = async (order: Order) => {
    setBusyId(order.id);
    const nextStatus = order.payment_status === "paid" ? "unpaid" : "paid";
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: nextStatus })
      .eq("id", order.id)
      .select("*, order_lines(*)")
      .single();
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setItems((prev) =>
        (prev ?? []).map((o) =>
          o.id === data.id ? (data as OrderWithLines) : o
        )
      );
    }
  };

  const openNew = () =>
    setDraft({
      id: "",
      mode: "dine-in",
      table_id: tables[0]?.id ?? "",
      reservation_id: "",
      customer_name: "",
      customer_phone: "",
      delivery_address: "",
      delivery_time: "",
      delivery_fee: 0,
      payment_method: "cod",
      payment_status: "unpaid",
      note: "",
      lines: [],
    });

  const openEdit = (o: OrderWithLines) =>
    setDraft({
      id: o.id,
      code: o.code,
      mode: (o.mode as "dine-in" | "pre-order" | "takeout" | "delivery") || "dine-in",
      table_id: o.table_id ?? "",
      reservation_id: o.reservation_id ?? "",
      customer_name: o.customer_name ?? "",
      customer_phone: o.customer_phone ?? "",
      delivery_address: o.delivery_address ?? "",
      delivery_time: o.delivery_time ?? "",
      delivery_fee: o.delivery_fee ?? 0,
      payment_method: (o.payment_method as "cod" | "vietqr" | "transfer") ?? "cod",
      payment_status: (o.payment_status as "unpaid" | "paid") ?? "unpaid",
      note: o.note ?? "",
      lines: o.order_lines.map((l) => ({
        dish_id: l.dish_id ?? "",
        variant_code: null,
        qty: l.qty,
        note: l.note ?? "",
        name: l.name,
        unit_price: l.unit_price,
        variant_label: l.variant_label,
      })),
    });

  const saveDraft = async () => {
    if (!draft) return;
    if (draft.lines.length === 0) {
      setError("Đơn phải có ít nhất một món.");
      return;
    }
    if (draft.mode === "dine-in" && !draft.table_id) {
      setError("Chọn bàn cho đơn tại chỗ.");
      return;
    }
    if (draft.mode === "pre-order" && !draft.reservation_id) {
      setError("Chọn lượt đặt bàn cho đơn đặt trước.");
      return;
    }
    if (
      (draft.mode === "takeout" || draft.mode === "delivery") &&
      (!draft.customer_name.trim() || !draft.customer_phone.trim())
    ) {
      setError("Vui lòng điền họ tên và số điện thoại người nhận.");
      return;
    }
    if (draft.mode === "delivery" && !draft.delivery_address.trim()) {
      setError("Vui lòng điền địa chỉ giao hàng.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (draft.id) {
        // Cập nhật đơn đã có
        const { error: upErr } = await supabase
          .from("orders")
          .update({
            mode: draft.mode,
            table_id: draft.mode === "dine-in" ? draft.table_id : null,
            reservation_id:
              draft.mode === "pre-order" ? draft.reservation_id : null,
            customer_name: draft.customer_name.trim() || null,
            customer_phone: draft.customer_phone.trim() || null,
            delivery_address: draft.delivery_address.trim() || null,
            delivery_time: draft.delivery_time.trim() || null,
            delivery_fee: draft.delivery_fee || 0,
            payment_method: draft.payment_method,
            payment_status: draft.payment_status,
            note: draft.note.trim() || null,
          })
          .eq("id", draft.id);
        if (upErr) throw new Error(upErr.message);

        const { error } = await supabase.rpc("set_order_lines", {
          p_order_id: draft.id,
          p_lines: toRpcLines(draft.lines),
        });
        if (error) throw new Error(error.message);
      } else {
        // Tạo đơn mới
        if (draft.mode === "takeout" || draft.mode === "delivery") {
          const { error } = await supabase.rpc("create_order", {
            p_lines: toRpcLines(draft.lines),
            p_mode: draft.mode,
            p_customer_name: draft.customer_name.trim(),
            p_customer_phone: draft.customer_phone.trim(),
            p_delivery_address: draft.delivery_address.trim() || undefined,
            p_delivery_time: draft.delivery_time.trim() || undefined,
            p_delivery_fee: draft.delivery_fee || 0,
            p_payment_method: draft.payment_method,
            p_note: draft.note.trim() || undefined,
          });
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.rpc("staff_create_order", {
            p_lines: toRpcLines(draft.lines),
            p_mode: draft.mode,
            p_table_id: draft.mode === "dine-in" ? draft.table_id : undefined,
            p_reservation_id:
              draft.mode === "pre-order" ? draft.reservation_id : undefined,
            p_note: draft.note.trim() || undefined,
          });
          if (error) throw new Error(error.message);
        }
      }
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được đơn");
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async (o: OrderWithLines) => {
    setError(null);
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    setConfirmDelete(null);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => (prev ?? []).filter((x) => x.id !== o.id));
  };

  const openCount = (items ?? []).filter(
    (o) =>
      o.status === "sent" ||
      o.status === "preparing" ||
      o.status === "delivering"
  ).length;

  return (
    <>
      <SectionHeading
        title="Đơn gọi món & Butcher"
        subtitle={items ? `${openCount} đơn đang xử lý` : "Đang tải…"}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              <IconRefresh size={15} /> Tải lại
            </Button>
            <Button size="sm" onClick={openNew}>
              <IconPlus size={15} /> Thêm đơn
            </Button>
          </div>
        }
      />

      <ErrorBar error={error} />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition ${
              filter === f.key
                ? "bg-washi font-medium text-sumi"
                : "border border-line bg-surface2 text-muted hover:text-washi"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            kanji="静"
            title="Không có đơn nào"
            hint="Đơn khách gửi từ mini app hoặc tạo tại quầy sẽ hiện ở đây ngay lập tức."
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const st = ORDER_STATUS[o.status] || {
              label: o.status,
              tone: "default",
            };
            const next = NEXT_STEP[o.status];
            const fresh =
              o.status === "sent" &&
              Date.now() - new Date(o.created_at).getTime() < 5 * 60 * 1000;

            return (
              <Card
                key={o.id}
                className={`flex flex-col p-4 ${fresh ? "border-shu/50 shadow-md shadow-shu/10" : ""}`}
              >
                {/* Header card */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-[17px] tracking-wide flex items-center gap-1.5">
                      {o.mode === "delivery" ? (
                        <span className="text-sky-400">🛵 Giao tận nơi</span>
                      ) : o.mode === "takeout" ? (
                        <span className="text-amber-400">🏪 Mang về</span>
                      ) : o.table_id ? (
                        `Bàn ${o.table_id}`
                      ) : (
                        "Đặt trước kèm bàn"
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {o.code} · {timeAgo(o.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Pill tone={st.tone as any}>{st.label}</Pill>
                    {(o.mode === "delivery" || o.mode === "takeout") && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          o.payment_status === "paid"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-gold/15 text-gold border border-gold/30"
                        }`}
                      >
                        {o.payment_status === "paid"
                          ? "Đã thanh toán"
                          : `Chưa TT (${o.payment_method === "vietqr" ? "VietQR" : "COD"})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thông tin người nhận & Địa chỉ giao hàng nếu có */}
                {(o.customer_name || o.customer_phone || o.delivery_address) && (
                  <div className="mb-3 rounded-lg border border-line bg-surface2/60 p-2.5 text-[12.5px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">
                        {o.customer_name || "Khách mua mang về"}
                      </span>
                      {o.customer_phone && (
                        <a
                          href={`tel:${o.customer_phone}`}
                          className="font-mono text-[12px] text-gold hover:underline"
                        >
                          📞 {o.customer_phone}
                        </a>
                      )}
                    </div>
                    {o.delivery_address && (
                      <div className="text-muted line-clamp-2">
                        📍 {o.delivery_address}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11.5px] text-faint pt-0.5">
                      {o.delivery_time && <span>⏰ Giờ hẹn: {o.delivery_time}</span>}
                      {o.delivery_fee ? (
                        <span>Phí ship: {vnd(o.delivery_fee)}</span>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Danh sách món trong đơn */}
                <ul className="mb-3 flex-1 space-y-2">
                  {o.order_lines
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
                    .map((l) => (
                      <li key={l.id} className="flex gap-2.5 text-[14px]">
                        <span className="w-6 shrink-0 font-semibold tabular-nums text-gold">
                          {l.qty}×
                        </span>
                        <span className="min-w-0 flex-1">
                          {l.name}
                          {l.variant_label && (
                            <span className="text-muted"> · {l.variant_label}</span>
                          )}
                          {l.note && (
                            <span className="mt-0.5 block text-[12px] italic text-shu">
                              * {l.note}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[13px] text-muted tabular-nums">
                          {vnd(l.unit_price * l.qty)}
                        </span>
                      </li>
                    ))}
                </ul>

                {o.note && (
                  <div className="mb-3 rounded-lg bg-surface2 px-3 py-2 text-[12px] italic text-muted">
                    Yêu cầu / Ghi chú: {o.note}
                  </div>
                )}

                {/* Tổng tiền & In ấn */}
                <div className="mb-3 flex items-center justify-between border-t border-line pt-3 text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => printKitchenTicket(o)}
                      className="inline-flex items-center gap-1 rounded bg-surface2 px-2 py-1 text-[11.5px] text-muted hover:text-washi hover:bg-surface3"
                      title="In phiếu báo bếp 80mm"
                    >
                      <IconPrinter size={13} /> Bếp
                    </button>
                    {o.mode === "delivery" || o.mode === "takeout" ? (
                      <button
                        type="button"
                        onClick={() => printDeliveryLabel(o)}
                        className="inline-flex items-center gap-1 rounded bg-surface2 px-2 py-1 text-[11.5px] text-muted hover:text-washi hover:bg-surface3"
                        title="In phiếu giao hàng"
                      >
                        <IconTruck size={13} /> Phiếu Ship
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => printGuestBill(o, settings)}
                        className="inline-flex items-center gap-1 rounded bg-surface2 px-2 py-1 text-[11.5px] text-muted hover:text-washi hover:bg-surface3"
                        title="In hoá đơn tạm tính 80mm"
                      >
                        <IconPrinter size={13} /> Bill
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-0.5">
                      {(o as any).points_earned > 0 && (
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                          +{(o as any).points_earned}đ thưởng
                        </span>
                      )}
                      <span className="text-[11px] text-faint">
                        {o.delivery_fee ? `Ship: ${vnd(o.delivery_fee)} · ` : ""}
                        {dateTimeLabel(o.created_at)}
                      </span>
                    </div>
                    <span className="font-semibold text-[15px] tabular-nums text-washi">
                      {vnd((o.subtotal || 0) + (o.delivery_fee || 0))}
                    </span>
                  </div>

                </div>

                {/* Các nút hành động */}
                <div className="flex flex-wrap gap-2">
                  {next && (
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={busyId === o.id}
                      onClick={() => setStatus(o, next.to)}
                    >
                      {next.label}
                    </Button>
                  )}
                  {o.mode === "delivery" && o.status === "served" && (
                    <Button
                      size="sm"
                      variant="gold"
                      className="flex-1"
                      loading={busyId === o.id}
                      onClick={() => setStatus(o, "delivering" as OrderStatus)}
                    >
                      Bàn giao Shipper
                    </Button>
                  )}
                  {(o.mode === "delivery" || o.mode === "takeout") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyId === o.id}
                      onClick={() => togglePaymentStatus(o)}
                    >
                      {o.payment_status === "paid" ? "Chưa TT" : "Đã nhận tiền"}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
                    Sửa
                  </Button>
                  {o.status !== "cancelled" && o.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(o, "cancelled")}
                    >
                      Huỷ
                    </Button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(o)}
                    aria-label={`Xoá đơn ${o.code}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Soạn đơn */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        title={draft?.id ? `Sửa đơn ${draft.code}` : "Thêm đơn mới"}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-semibold tabular-nums">
              {draft
                ? `Tổng cộng: ${vnd(
                    linesTotal(draft.lines) + (draft.delivery_fee || 0)
                  )}`
                : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Thôi
              </Button>
              <Button loading={saving} onClick={saveDraft}>
                Lưu đơn
              </Button>
            </div>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hình thức phục vụ" required>
                <Select
                  value={draft.mode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mode: e.target.value as any,
                    })
                  }
                >
                  <option value="dine-in">🍽️ Tại bàn (Dine-in)</option>
                  <option value="pre-order">📅 Đặt trước kèm bàn</option>
                  <option value="delivery">🛵 Giao tận nơi (Butcher / Takeout)</option>
                  <option value="takeout">🏪 Mang về (Khách tới lấy)</option>
                </Select>
              </Field>

              {draft.mode === "dine-in" ? (
                <Field label="Chọn bàn" required>
                  <Select
                    value={draft.table_id}
                    onChange={(e) => setDraft({ ...draft, table_id: e.target.value })}
                  >
                    <option value="">Chọn bàn</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.zone})
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : draft.mode === "pre-order" ? (
                <Field label="Lượt đặt bàn" required>
                  <Select
                    value={draft.reservation_id}
                    onChange={(e) =>
                      setDraft({ ...draft, reservation_id: e.target.value })
                    }
                  >
                    <option value="">Chọn lượt đặt</option>
                    {openReservations.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} · {r.guest_name} · {r.reserved_date}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Hình thức thanh toán" required>
                  <Select
                    value={draft.payment_method}
                    onChange={(e) =>
                      setDraft({ ...draft, payment_method: e.target.value as any })
                    }
                  >
                    <option value="cod">Tiền mặt khi nhận (COD)</option>
                    <option value="vietqr">Chuyển khoản VietQR</option>
                    <option value="transfer">Chuyển khoản ngân hàng</option>
                  </Select>
                </Field>
              )}
            </div>

            {/* Thông tin giao hàng cho Butcher / Takeout */}
            {(draft.mode === "takeout" || draft.mode === "delivery") && (
              <div className="rounded-xl border border-line bg-surface2/50 p-3.5 space-y-3">
                <div className="font-medium text-[13.5px] text-washi">
                  Thông tin người nhận & Giao hàng thịt Butcher
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Họ tên người nhận" required>
                    <Input
                      value={draft.customer_name}
                      onChange={(e) =>
                        setDraft({ ...draft, customer_name: e.target.value })
                      }
                      placeholder="Anh Tuấn, Chị Mai..."
                    />
                  </Field>
                  <Field label="Số điện thoại" required>
                    <Input
                      value={draft.customer_phone}
                      onChange={(e) =>
                        setDraft({ ...draft, customer_phone: e.target.value })
                      }
                      placeholder="0912345678"
                    />
                  </Field>
                </div>

                {draft.mode === "delivery" && (
                  <Field label="Địa chỉ giao hàng chi tiết" required>
                    <Input
                      value={draft.delivery_address}
                      onChange={(e) =>
                        setDraft({ ...draft, delivery_address: e.target.value })
                      }
                      placeholder="Số nhà, ngõ, đường, phường, quận..."
                    />
                  </Field>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Giờ hẹn giao / nhận">
                    <Input
                      value={draft.delivery_time}
                      onChange={(e) =>
                        setDraft({ ...draft, delivery_time: e.target.value })
                      }
                      placeholder="Giao trước 18:00 hôm nay..."
                    />
                  </Field>
                  {draft.mode === "delivery" && (
                    <Field label="Phí giao hàng (VND)">
                      <Input
                        type="number"
                        value={draft.delivery_fee}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            delivery_fee: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        placeholder="30000"
                      />
                    </Field>
                  )}
                </div>
              </div>
            )}

            <Field label="Ghi chú đơn (Yêu cầu cắt thịt, dị ứng, gia vị...)">
              <Textarea
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="Cắt steak dày 2.5cm, ướp sẵn sốt yakiniku, không wasabi…"
                className="min-h-[60px]"
              />
            </Field>

            <OrderComposer
              lines={draft.lines}
              onChange={(lines) => setDraft({ ...draft, lines })}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Xoá đơn"
        danger
        confirmLabel="Xoá hẳn"
        onConfirm={() => confirmDelete && removeOrder(confirmDelete)}
        body={
          <>
            Xoá hẳn đơn {confirmDelete?.code} khỏi hệ thống, kể cả các dòng món.
            Nếu chỉ muốn huỷ mà vẫn giữ lịch sử, hãy bấm nút “Huỷ” trên đơn.
          </>
        }
      />
    </>
  );
}
