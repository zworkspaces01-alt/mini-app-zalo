import { useCallback, useEffect, useState } from "react";

import { IconCheck, IconClock, IconFire, IconRefresh } from "@/components/icons";
import { printKitchenTicket } from "@/components/print-bill";
import { Button, Card, EmptyState, ErrorBar } from "@/components/ui";
import { dateTimeLabel } from "@/lib/format";
import {
  supabase,
  type Order,
  type OrderLine,
  type OrderStatus,
} from "@/lib/supabase";

type OrderWithLines = Order & { order_lines: OrderLine[] };

export default function KdsPage() {
  const [items, setItems] = useState<OrderWithLines[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completedLines, setCompletedLines] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<"all" | "dine-in" | "delivery">("all");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Phát âm thanh cảnh báo khi có đơn mới
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Bỏ qua nếu trình duyệt chặn audio autoplay
    }
  }, [soundEnabled]);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_lines(*)")
      .in("status", ["sent", "preparing"])
      .order("created_at", { ascending: true }); // đơn cũ hơn làm trước
    if (error) setError(error.message);
    setItems((data as OrderWithLines[] | null) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription cho màn hình bếp
  useEffect(() => {
    const channel = supabase
      .channel("kds-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          playAlertSound();
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, playAlertSound]);

  const updateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setBusyId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);
    setBusyId(null);
    if (error) {
      setError(error.message);
    } else {
      await load();
    }
  };

  const toggleLineItem = (lineId: string) => {
    setCompletedLines((prev) => ({
      ...prev,
      [lineId]: !prev[lineId],
    }));
  };

  const visible = (items ?? []).filter((o) => {
    if (filterMode === "dine-in") return o.mode === "dine-in" || o.mode === "pre-order";
    if (filterMode === "delivery") return o.mode === "delivery" || o.mode === "takeout";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề KDS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-display text-[22px] tracking-wide text-washi">
              MÀN HÌNH BẾP (KDS)
            </h1>
            <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-[12px] text-muted">
              {visible.length} vé đang chế biến
            </span>
          </div>
          <p className="text-[12px] text-faint mt-0.5">
            Cập nhật thời gian thực · Chạm vào từng món để đánh dấu đã nấu xong
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bộ lọc phân loại */}
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-[13px]">
            <button
              onClick={() => setFilterMode("all")}
              className={`rounded px-3 py-1.5 transition ${
                filterMode === "all" ? "bg-surface2 text-washi font-medium" : "text-muted"
              }`}
            >
              Tất cả ({items?.length ?? 0})
            </button>
            <button
              onClick={() => setFilterMode("dine-in")}
              className={`rounded px-3 py-1.5 transition ${
                filterMode === "dine-in" ? "bg-surface2 text-washi font-medium" : "text-muted"
              }`}
            >
              Tại bàn
            </button>
            <button
              onClick={() => setFilterMode("delivery")}
              className={`rounded px-3 py-1.5 transition ${
                filterMode === "delivery" ? "bg-surface2 text-washi font-medium" : "text-muted"
              }`}
            >
              Butcher & Giao
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] transition ${
              soundEnabled ? "bg-surface2 text-washi" : "text-faint line-through"
            }`}
          >
            🔔 {soundEnabled ? "Chuông Bật" : "Chuông Tắt"}
          </button>

          <Button size="sm" variant="secondary" onClick={load}>
            <IconRefresh size={15} /> Làm mới
          </Button>
        </div>
      </div>

      <ErrorBar error={error} />

      {/* Danh sách thẻ đơn cho Bếp */}
      {visible.length === 0 ? (
        <Card className="py-16">
          <EmptyState
            kanji="完"
            title="Bếp đã hoàn thành tất cả món"
            hint="Các đơn gọi món mới sẽ tự động xuất hiện và phát chuông báo."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((o) => {
            const elapsedMins = Math.floor(
              (Date.now() - new Date(o.created_at).getTime()) / 60000
            );

            // Phân chia màu thời gian: <10m bình thường, 10-20m vàng, >20m đỏ nhấp nháy
            const isLate = elapsedMins >= 20;
            const isWarning = elapsedMins >= 10 && elapsedMins < 20;

            const timerTone = isLate
              ? "bg-shu/20 text-shu border-shu/50 animate-pulse"
              : isWarning
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
              : "bg-surface2 text-muted border-line";

            const allDone = o.order_lines.every((l) => completedLines[l.id]);

            return (
              <div
                key={o.id}
                className={`flex flex-col rounded-xl border bg-sumi shadow-lg transition ${
                  isLate
                    ? "border-shu/70 shadow-shu/10"
                    : o.status === "preparing"
                    ? "border-line2"
                    : "border-line"
                }`}
              >
                {/* Header vé đơn */}
                <div className="flex items-center justify-between border-b border-line bg-surface2/50 px-3.5 py-2.5">
                  <div>
                    <div className="font-display text-[18px] font-bold text-washi flex items-center gap-2">
                      {o.mode === "delivery" ? (
                        <span className="text-sky-400">🛵 Giao hàng</span>
                      ) : o.mode === "takeout" ? (
                        <span className="text-amber-400">🏪 Mang về</span>
                      ) : o.table_id ? (
                        <span className="text-gold">BÀN {o.table_id}</span>
                      ) : (
                        "ĐẶT TRƯỚC"
                      )}
                      <span className="text-[12px] font-mono text-faint">
                        #{o.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted">
                      {dateTimeLabel(o.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${timerTone}`}
                    >
                      <IconClock size={12} /> {elapsedMins} phút
                    </span>
                    <span
                      className={`text-[10.5px] uppercase font-bold tracking-wider ${
                        o.status === "preparing" ? "text-gold" : "text-shu"
                      }`}
                    >
                      {o.status === "preparing" ? "ĐANG LÀM" : "MỚI GỬI"}
                    </span>
                  </div>
                </div>

                {/* Ghi chú dị ứng / yêu cầu */}
                {o.note && (
                  <div className="border-b border-line bg-shu/10 px-3.5 py-2 text-[12px] font-medium text-shu">
                    ⚠️ Yêu cầu: {o.note}
                  </div>
                )}

                {/* Danh sách món ăn chạm gạch bỏ */}
                <div className="flex-1 p-3.5 space-y-2.5">
                  {o.order_lines.map((l) => {
                    const done = completedLines[l.id];
                    return (
                      <div
                        key={l.id}
                        onClick={() => toggleLineItem(l.id)}
                        className={`group flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 select-none transition ${
                          done
                            ? "border-emerald-500/30 bg-emerald-950/20 opacity-50"
                            : "border-line bg-surface2/60 hover:bg-surface3 hover:border-line2"
                        }`}
                      >
                        <button
                          type="button"
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                            done
                              ? "border-emerald-500 bg-emerald-500 text-black font-bold"
                              : "border-muted/50 group-hover:border-washi"
                          }`}
                        >
                          {done && <IconCheck size={14} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`text-[15px] font-medium leading-snug ${
                                done
                                  ? "line-through text-faint"
                                  : "text-washi font-semibold"
                              }`}
                            >
                              {l.name}
                            </span>
                            <span
                              className={`text-[16px] font-bold tabular-nums shrink-0 ${
                                done ? "text-faint" : "text-gold"
                              }`}
                            >
                              x{l.qty}
                            </span>
                          </div>

                          {l.variant_label && (
                            <div className="text-[12px] text-muted mt-0.5">
                              Phần: {l.variant_label}
                            </div>
                          )}

                          {l.note && (
                            <div className="text-[12px] font-bold text-shu mt-1 bg-shu/10 px-1.5 py-0.5 rounded inline-block">
                              * {l.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chân vé: Nút chuyển trạng thái & In phiếu */}
                <div className="border-t border-line bg-surface2/30 p-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printKitchenTicket(o)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface2 text-muted hover:text-washi"
                    title="In lại phiếu bếp"
                  >
                    🖨️
                  </button>

                  {o.status === "sent" ? (
                    <Button
                      size="sm"
                      full
                      loading={busyId === o.id}
                      onClick={() => updateStatus(o.id, "preparing")}
                    >
                      <IconFire size={15} /> Bắt đầu làm
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      full
                      variant={allDone ? "gold" : "primary"}
                      loading={busyId === o.id}
                      onClick={() => updateStatus(o.id, "served")}
                    >
                      <IconCheck size={15} /> {allDone ? "Đã xong tất cả món" : "Đã ra món"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
