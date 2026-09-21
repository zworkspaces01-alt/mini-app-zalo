import { useCallback, useEffect, useMemo, useState } from "react";

import { IconRefresh, IconWarn } from "@/components/icons";
import {
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorBar,
  Field,
  Modal,
  Pill,
  SectionHeading,
  Select,
  Skeleton,
} from "@/components/ui";
import { dateTimeLabel, timeAgo, vnd } from "@/lib/format";
import { supabase, type Reservation, type Settings } from "@/lib/supabase";
import type { Database } from "@/types/db";

type Payment = Database["public"]["Tables"]["payments"]["Row"];

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "unmatched", label: "Chờ đối soát" },
  { key: "matched", label: "Đã khớp" },
  { key: "ignored", label: "Bỏ qua" },
] as const;

const STATUS: Record<string, { label: string; tone: "jade" | "gold" | "faint" }> = {
  matched: { label: "Đã khớp", tone: "jade" },
  unmatched: { label: "Chờ đối soát", tone: "gold" },
  ignored: { label: "Bỏ qua", tone: "faint" },
};

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[] | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<Payment | null>(null);
  const [linkTarget, setLinkTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmIgnore, setConfirmIgnore] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [p, r, s] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("reservations")
        .select("*")
        .in("status", ["pending", "awaiting-deposit", "confirmed"])
        .order("reserved_date", { ascending: false })
        .limit(100),
      supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    const err = p.error || r.error || s.error;
    if (err) setError(err.message);
    setItems(p.data ?? []);
    setReservations(r.data ?? []);
    setSettings(s.data ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Tiền vào là thứ phải thấy ngay, không đợi bấm tải lại. */
  useEffect(() => {
    const ch = supabase
      .channel("payments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const visible = useMemo(
    () => (items ?? []).filter((p) => filter === "all" || p.status === filter),
    [items, filter]
  );

  const pending = (items ?? []).filter(
    (p) => p.status === "unmatched" && p.transfer_type === "in"
  );

  const todayIn = (items ?? [])
    .filter(
      (p) =>
        p.transfer_type === "in" &&
        new Date(p.created_at).toDateString() === new Date().toDateString()
    )
    .reduce((n, p) => n + p.amount, 0);

  const link = async () => {
    if (!linking) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("link_payment", {
      p_payment_id: linking.id,
      p_reservation_id: linkTarget || undefined,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setLinking(null);
    load();
  };

  const ignore = async (p: Payment) => {
    setError(null);
    const { error } = await supabase.rpc("ignore_payment", { p_payment_id: p.id });
    setConfirmIgnore(null);
    if (error) {
      setError(error.message);
      return;
    }
    load();
  };

  const notConfigured =
    settings && (!settings.bank_account_number || !settings.bank_code);

  return (
    <>
      <SectionHeading
        title="Thanh toán"
        subtitle={
          items
            ? `${pending.length} giao dịch chờ đối soát · hôm nay nhận ${vnd(todayIn)}`
            : "Đang tải…"
        }
        action={
          <Button variant="secondary" size="sm" onClick={load}>
            <IconRefresh size={15} /> Tải lại
          </Button>
        }
      />

      <ErrorBar error={error} />

      {notConfigured && (
        <Card className="mb-4 flex items-start gap-3 border-gold/40 bg-gold/5 p-4">
          <IconWarn size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="text-[13px] leading-relaxed">
            Chưa khai báo tài khoản ngân hàng nên mini app không hiện mã QR cho
            khách. Điền ở <b>Cấu hình › Thanh toán</b>.
          </div>
        </Card>
      )}

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n =
            f.key === "all"
              ? items?.length ?? 0
              : (items ?? []).filter((p) => p.status === f.key).length;
          return (
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
              {n > 0 && <span className="ml-1.5 opacity-60">{n}</span>}
            </button>
          );
        })}
      </div>

      {items === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[78px] w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            kanji="静"
            title="Chưa có giao dịch nào"
            hint="Tiền khách chuyển vào tài khoản sẽ hiện ở đây trong vài giây."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {visible.map((p) => {
            const st = STATUS[p.status];
            const out = p.transfer_type === "out";
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[15px] font-semibold tabular-nums ${
                        out ? "text-muted" : "text-jade"
                      }`}
                    >
                      {out ? "−" : "+"}
                      {vnd(p.amount)}
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                    {p.matched_code && <Pill tone="neutral">{p.matched_code}</Pill>}
                  </div>
                  <div className="mt-1 truncate text-[13px] text-muted">
                    {p.content || p.description || "(không có nội dung)"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-faint">
                    {p.gateway} · {p.reference_code} ·{" "}
                    {p.transaction_date
                      ? dateTimeLabel(p.transaction_date)
                      : timeAgo(p.created_at)}
                  </div>
                </div>

                {!out && p.status !== "ignored" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLinking(p);
                        setLinkTarget(p.reservation_id ?? "");
                      }}
                    >
                      {p.reservation_id ? "Đổi bàn" : "Gán bàn"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmIgnore(p)}
                    >
                      Bỏ qua
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* Gán giao dịch vào lượt đặt bàn */}
      <Modal
        open={!!linking}
        onClose={() => setLinking(null)}
        title="Gán giao dịch vào bàn"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLinking(null)}>
              Thôi
            </Button>
            <Button loading={busy} onClick={link}>
              Lưu
            </Button>
          </div>
        }
      >
        {linking && (
          <div className="space-y-4">
            <Card className="p-3">
              <div className="text-[15px] font-semibold tabular-nums text-jade">
                +{vnd(linking.amount)}
              </div>
              <div className="mt-1 text-[13px] text-muted">{linking.content}</div>
            </Card>

            <Field
              label="Lượt đặt bàn"
              hint="Bỏ trống để gỡ giao dịch khỏi bàn đang gán."
            >
              <Select
                value={linkTarget}
                onChange={(e) => setLinkTarget(e.target.value)}
              >
                <option value="">Không gán</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.guest_name} · {r.reserved_date} ·{" "}
                    {r.deposit_paid ? "đã cọc" : `cần ${vnd(r.deposit_amount)}`}
                  </option>
                ))}
              </Select>
            </Field>

            <p className="text-[12px] leading-relaxed text-faint">
              Gán xong, hệ thống cộng lại tổng tiền đã nhận của bàn đó. Đủ tiền
              cọc thì bàn tự chuyển sang đã xác nhận.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmIgnore}
        onClose={() => setConfirmIgnore(null)}
        title="Bỏ qua giao dịch"
        confirmLabel="Bỏ qua"
        onConfirm={() => confirmIgnore && ignore(confirmIgnore)}
        body={
          <>
            Đánh dấu khoản {vnd(confirmIgnore?.amount ?? 0)} này là không liên
            quan tới đặt bàn. Giao dịch vẫn được giữ trong lịch sử, chỉ thôi
            nằm ở danh sách chờ đối soát.
          </>
        }
      />
    </>
  );
}
