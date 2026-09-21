import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@/components/icons";
import SeatChips from "@/components/seat-chips";
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
import { dateLabel, hhmm, shiftDate, todayISO, vnd } from "@/lib/format";
import {
  PURPOSE_LABEL,
  RESERVATION_STATUS,
  SEATING_LABEL,
} from "@/lib/status";
import {
  supabase,
  type OmakaseSet,
  type Reservation,
  type ReservationStatus,
  type RestaurantTable,
} from "@/lib/supabase";

/** Form dùng chung cho cả thêm mới và sửa. */
interface Draft {
  id?: string;
  purpose: string;
  omakase_set_id: string;
  reserved_date: string;
  reserved_time: string;
  guests: number;
  seating: string;
  guest_name: string;
  guest_phone: string;
  dietary: string;
  note: string;
  staff_note: string;
  status: ReservationStatus;
  table_id: string;
  deposit_paid: boolean;
  seat_ids: string[];
}

const emptyDraft = (date: string): Draft => ({
  purpose: "omakase",
  omakase_set_id: "",
  reserved_date: date,
  reserved_time: "18:00",
  guests: 2,
  seating: "counter",
  guest_name: "",
  guest_phone: "",
  dietary: "",
  note: "",
  staff_note: "",
  status: "confirmed",
  table_id: "",
  deposit_paid: false,
  seat_ids: [],
});

const toDraft = (r: Reservation): Draft => ({
  id: r.id,
  purpose: r.purpose,
  omakase_set_id: r.omakase_set_id ?? "",
  reserved_date: r.reserved_date,
  reserved_time: r.reserved_time.slice(0, 5),
  guests: r.guests,
  seating: r.seating,
  guest_name: r.guest_name,
  guest_phone: r.guest_phone,
  dietary: r.dietary ?? "",
  note: r.note ?? "",
  staff_note: r.staff_note ?? "",
  status: r.status,
  table_id: r.table_id ?? "",
  deposit_paid: r.deposit_paid,
  seat_ids: [],
});

const FILTERS: { key: "all" | ReservationStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "awaiting-deposit", label: "Chờ cọc" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "cancelled", label: "Đã huỷ" },
];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-2.5 last:border-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="text-right text-[14px]">{value}</span>
    </div>
  );
}

export default function ReservationsPage() {
  const [date, setDate] = useState(todayISO());
  /*
   * Omakase phải đặt trước ít nhất một ngày, nên bàn mới không bao giờ rơi
   * vào hôm nay. Chỉ xem theo ngày thì nhân viên mở lên thấy trang trống và
   * tưởng không ai đặt. Chế độ "Sắp tới" gom mọi ngày từ hôm nay trở đi.
   */
  const [scope, setScope] = useState<"day" | "upcoming">("upcoming");
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [omakaseSets, setOmakaseSets] = useState<OmakaseSet[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reservation | null>(null);
  /** Ghế của từng lượt trong ngày, để hiện ngay trên danh sách. */
  const [seatsByReservation, setSeatsByReservation] = useState<
    Record<string, string[]>
  >({});

  const load = useCallback(async () => {
    setError(null);
    const query = supabase.from("reservations").select("*");
    const { data, error } =
      scope === "day"
        ? await query
            .eq("reserved_date", date)
            .order("reserved_time", { ascending: true })
        : await query
            .gte("reserved_date", todayISO())
            .order("reserved_date", { ascending: true })
            .order("reserved_time", { ascending: true });
    if (error) setError(error.message);
    setItems(data ?? []);

    const ids = (data ?? []).map((r) => r.id);
    if (ids.length === 0) {
      setSeatsByReservation({});
      return;
    }
    const { data: seatRows } = await supabase
      .from("reservation_seats")
      .select("reservation_id, seat_id")
      .in("reservation_id", ids);
    const grouped: Record<string, string[]> = {};
    for (const row of seatRows ?? []) {
      (grouped[row.reservation_id] ??= []).push(row.seat_id);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    setSeatsByReservation(grouped);
  }, [date, scope]);

  useEffect(() => {
    setItems(null);
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
      .from("omakase_sets")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setOmakaseSets(data ?? []));
  }, []);

  /* Đặt bàn mới từ mini app hiện ngay, không cần bấm tải lại. */
  useEffect(() => {
    const channel = supabase
      .channel("reservations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const visible = useMemo(
    () => (items ?? []).filter((r) => filter === "all" || r.status === filter),
    [items, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of items ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [items]);

  const totalGuests = useMemo(
    () =>
      (items ?? [])
        .filter((r) => r.status !== "cancelled")
        .reduce((n, r) => n + r.guests, 0),
    [items]
  );

  const patch = async (id: string, values: Partial<Reservation>) => {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("reservations")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setSelected(data);
      setItems((prev) => (prev ?? []).map((r) => (r.id === data.id ? data : r)));
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.guest_name.trim() || !draft.guest_phone.trim()) {
      setError("Cần tên và số điện thoại của khách.");
      return;
    }
    if (draft.purpose === "omakase" && !draft.omakase_set_id) {
      setError("Chọn suất omakase.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (draft.id) {
        const { error } = await supabase
          .from("reservations")
          .update({
            purpose: draft.purpose,
            omakase_set_id:
              draft.purpose === "omakase" ? draft.omakase_set_id : null,
            reserved_date: draft.reserved_date,
            reserved_time: draft.reserved_time,
            guests: draft.guests,
            seating: draft.seating,
            guest_name: draft.guest_name.trim(),
            guest_phone: draft.guest_phone.trim(),
            dietary: draft.dietary.trim() || null,
            note: draft.note.trim() || null,
            staff_note: draft.staff_note.trim() || null,
            status: draft.status,
            table_id: draft.table_id || null,
            deposit_paid: draft.deposit_paid,
          })
          .eq("id", draft.id);
        if (error) throw new Error(error.message);

        if (draft.seating === "counter") {
          const { error: seatErr } = await supabase.rpc("assign_seats", {
            p_reservation_id: draft.id,
            p_seat_ids: draft.seat_ids,
          });
          if (seatErr) throw new Error(seatErr.message);
        }

        // Đổi suất hoặc số khách thì tiền cọc phải tính lại ở máy chủ.
        const { data: fresh, error: recalcErr } = await supabase.rpc(
          "recalc_reservation_deposit",
          { p_id: draft.id }
        );
        if (recalcErr) throw new Error(recalcErr.message);
        if (fresh) setSelected(fresh as unknown as Reservation);
      } else {
        const { data, error } = await supabase.rpc("staff_create_reservation", {
          p_purpose: draft.purpose,
          p_date: draft.reserved_date,
          p_time: draft.reserved_time,
          p_guests: draft.guests,
          p_seating: draft.seating,
          p_name: draft.guest_name.trim(),
          p_phone: draft.guest_phone.trim(),
          p_omakase_set_id: draft.omakase_set_id || undefined,
          p_dietary: draft.dietary.trim() || undefined,
          p_note: draft.note.trim() || undefined,
          p_status: draft.status,
          p_table_id: draft.table_id || undefined,
          p_deposit_paid: draft.deposit_paid,
          p_staff_note: draft.staff_note.trim() || undefined,
        });
        if (error) throw new Error(error.message);

        // Nhân viên tạo bàn mới kèm ghế: gán sau khi đã có id.
        if (draft.seating === "counter" && draft.seat_ids.length && data) {
          const created = data as unknown as Reservation;
          const { error: seatErr } = await supabase.rpc("assign_seats", {
            p_reservation_id: created.id,
            p_seat_ids: draft.seat_ids,
          });
          if (seatErr) throw new Error(seatErr.message);
        }
        setDate(draft.reserved_date);
      }
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const removeReservation = async (r: Reservation) => {
    setError(null);
    const { error } = await supabase.from("reservations").delete().eq("id", r.id);
    setConfirmDelete(null);
    if (error) {
      setError(
        error.code === "23503"
          ? "Lượt này đã gắn với một đơn gọi món. Xoá đơn đó trước, hoặc chỉ huỷ bàn."
          : error.message
      );
      return;
    }
    setSelected(null);
    setItems((prev) => (prev ?? []).filter((x) => x.id !== r.id));
  };

  return (
    <>
      <SectionHeading
        title="Đặt bàn"
        subtitle={
          items
            ? `${items.length} lượt · ${totalGuests} khách${
                scope === "upcoming" ? " · từ hôm nay trở đi" : ""
              } (chưa tính bàn đã huỷ)`
            : "Đang tải…"
        }
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={load}>
              <IconRefresh size={15} /> Tải lại
            </Button>
            <Button size="sm" onClick={() => setDraft(emptyDraft(date))}>
              <IconPlus size={15} /> Thêm bàn
            </Button>
          </div>
        }
      />

      <ErrorBar error={error} />

      {/* Phạm vi xem */}
      <div className="mb-3 flex gap-2">
        {([
          { key: "upcoming", label: "Sắp tới" },
          { key: "day", label: "Theo ngày" },
        ] as const).map((s2) => (
          <button
            key={s2.key}
            onClick={() => setScope(s2.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
              scope === s2.key
                ? "bg-washi font-medium text-sumi"
                : "border border-line bg-surface2 text-muted hover:text-washi"
            }`}
          >
            {s2.label}
          </button>
        ))}
      </div>

      {/* Chọn ngày */}
      <div
        className={`mb-4 flex flex-wrap items-center gap-2 ${
          scope === "upcoming" ? "hidden" : ""
        }`}
      >
        <div className="flex items-center rounded-lg border border-line bg-surface2">
          <button
            aria-label="Ngày trước"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="flex h-10 w-10 items-center justify-center text-muted hover:text-washi"
          >
            <IconChevronLeft size={17} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="h-10 border-x border-line bg-transparent px-3 text-[14px] text-washi outline-none"
          />
          <button
            aria-label="Ngày sau"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            className="flex h-10 w-10 items-center justify-center text-muted hover:text-washi"
          >
            <IconChevronRight size={17} />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setDate(todayISO())}>
          Hôm nay
        </Button>
        <span className="text-[13px] text-muted">{dateLabel(date)}</span>
      </div>

      {/* Lọc theo trạng thái */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n = f.key === "all" ? items?.length ?? 0 : counts[f.key] ?? 0;
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
            <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            title="Không có lượt đặt bàn nào"
            hint={
              filter !== "all"
                ? "Không có lượt nào ở trạng thái đang lọc."
                : scope === "upcoming"
                ? "Chưa có khách đặt cho những ngày tới."
                : "Ngày này chưa có khách đặt."
            }
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {visible.map((r) => {
            const st = RESERVATION_STATUS[r.status];
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="data-row flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition"
              >
                <div className="w-[60px] shrink-0 text-center">
                  <div className="font-display text-[18px] leading-none">
                    {hhmm(r.reserved_time)}
                  </div>
                  {scope === "upcoming" && (
                    <div className="mt-1 text-[11px] text-muted">
                      {r.reserved_date.slice(8)}/{r.reserved_date.slice(5, 7)}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-faint">
                    {r.guests} khách
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[15px] font-medium">
                      {r.guest_name}
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  <div className="mt-1 truncate text-[13px] text-muted">
                    {r.code} · {PURPOSE_LABEL[r.purpose]} ·{" "}
                    {SEATING_LABEL[r.seating]}
                    {r.table_id ? ` · bàn ${r.table_id}` : ""}
                    {seatsByReservation[r.id]?.length
                      ? ` · ghế ${seatsByReservation[r.id].join(", ")}`
                      : ""}
                  </div>
                  {r.dietary && (
                    <div className="mt-1 truncate text-[12px] text-shu">
                      Dị ứng: {r.dietary}
                    </div>
                  )}
                </div>
                {r.deposit_amount > 0 && (
                  <div className="shrink-0 text-right">
                    <div className="text-[13px] tabular-nums text-gold">
                      {vnd(r.deposit_amount)}
                    </div>
                    <div className="text-[11px] text-faint">
                      {r.deposit_paid ? "đã cọc" : "chưa cọc"}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Chi tiết */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.code} · ${selected.guest_name}` : ""}
        footer={
          selected && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(selected)}
                aria-label="Xoá hẳn"
                className="mr-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
              >
                <IconTrash size={16} />
              </button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setDraft({
                    ...toDraft(selected),
                    seat_ids: seatsByReservation[selected.id] ?? [],
                  })
                }
              >
                Sửa
              </Button>
              {selected.status !== "cancelled" &&
                selected.status !== "completed" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Huỷ bàn
                  </Button>
                )}
              {selected.deposit_amount > 0 && !selected.deposit_paid && (
                <Button
                  variant="gold"
                  size="sm"
                  loading={busy}
                  onClick={() =>
                    patch(selected.id, {
                      deposit_paid: true,
                      status: "confirmed",
                    })
                  }
                >
                  Đã nhận cọc
                </Button>
              )}
              {selected.status !== "confirmed" &&
                selected.status !== "cancelled" &&
                selected.status !== "completed" && (
                  <Button
                    size="sm"
                    loading={busy}
                    onClick={() => patch(selected.id, { status: "confirmed" })}
                  >
                    Xác nhận bàn
                  </Button>
                )}
              {selected.status === "confirmed" && (
                <Button
                  size="sm"
                  loading={busy}
                  onClick={() => patch(selected.id, { status: "completed" })}
                >
                  Đã dùng bữa
                </Button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <Row
                label="Trạng thái"
                value={
                  <Pill tone={RESERVATION_STATUS[selected.status].tone}>
                    {RESERVATION_STATUS[selected.status].label}
                  </Pill>
                }
              />
              <Row
                label="Thời gian"
                value={`${hhmm(selected.reserved_time)} · ${dateLabel(
                  selected.reserved_date
                )}`}
              />
              <Row label="Số khách" value={`${selected.guests} khách`} />
              <Row label="Hình thức" value={PURPOSE_LABEL[selected.purpose]} />
              <Row label="Suất" value={selected.omakase_set_id} />
              <Row label="Chỗ ngồi" value={SEATING_LABEL[selected.seating]} />
              <Row
                label="Ghế đã giữ"
                value={
                  seatsByReservation[selected.id]?.length ? (
                    <span className="font-medium tracking-wide">
                      {seatsByReservation[selected.id].join(" · ")}
                    </span>
                  ) : null
                }
              />
              <Row
                label="Điện thoại"
                value={
                  <a href={`tel:${selected.guest_phone}`} className="text-washi underline">
                    {selected.guest_phone}
                  </a>
                }
              />
              <Row
                label="Dị ứng / chế độ ăn"
                value={
                  selected.dietary ? (
                    <span className="text-shu">{selected.dietary}</span>
                  ) : null
                }
              />
              <Row label="Khách ghi chú" value={selected.note} />
              {selected.deposit_amount > 0 && (
                <Row
                  label="Tiền cọc"
                  value={
                    <span className="tabular-nums text-gold">
                      {vnd(selected.deposit_amount)}
                      <span className="ml-2 text-[12px] text-muted">
                        {selected.deposit_paid ? "đã thanh toán" : "chưa thanh toán"}
                      </span>
                    </span>
                  }
                />
              )}
            </div>

            <Field label="Xếp bàn">
              <Select
                value={selected.table_id ?? ""}
                onChange={(e) =>
                  patch(selected.id, { table_id: e.target.value || null })
                }
              >
                <option value="">Chưa xếp</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.seats} ghế)
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Ghi chú nội bộ"
              hint="Khách không nhìn thấy phần này."
            >
              <Textarea
                defaultValue={selected.staff_note ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (selected.staff_note ?? "")) {
                    patch(selected.id, { staff_note: e.target.value || null });
                  }
                }}
                placeholder="Khách quen, ngồi ghế đầu quầy, đến muộn 15 phút…"
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Thêm / sửa đặt bàn */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        title={draft?.id ? `Sửa ${selected?.code ?? "đặt bàn"}` : "Thêm đặt bàn"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Thôi
            </Button>
            <Button loading={busy} onClick={saveDraft}>
              Lưu
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên khách" required>
                <Input
                  value={draft.guest_name}
                  onChange={(e) =>
                    setDraft({ ...draft, guest_name: e.target.value })
                  }
                  placeholder="Nguyễn Văn A"
                />
              </Field>
              <Field label="Số điện thoại" required>
                <Input
                  type="tel"
                  value={draft.guest_phone}
                  onChange={(e) =>
                    setDraft({ ...draft, guest_phone: e.target.value })
                  }
                  placeholder="0912345678"
                />
              </Field>
              <Field label="Ngày" required>
                <Input
                  type="date"
                  value={draft.reserved_date}
                  onChange={(e) =>
                    setDraft({ ...draft, reserved_date: e.target.value })
                  }
                />
              </Field>
              <Field label="Giờ" required>
                <Input
                  type="time"
                  value={draft.reserved_time}
                  onChange={(e) =>
                    setDraft({ ...draft, reserved_time: e.target.value })
                  }
                />
              </Field>
              <Field label="Số khách" required>
                <Input
                  inputMode="numeric"
                  value={String(draft.guests)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      guests: Math.max(
                        1,
                        Number(e.target.value.replace(/\D/g, "")) || 1
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Chỗ ngồi" required>
                <Select
                  value={draft.seating}
                  onChange={(e) => setDraft({ ...draft, seating: e.target.value })}
                >
                  <option value="counter">Quầy itamae</option>
                  <option value="table">Bàn khu chung</option>
                  <option value="private">Phòng riêng</option>
                </Select>
              </Field>
              <Field label="Hình thức" required>
                <Select
                  value={draft.purpose}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      purpose: e.target.value,
                      omakase_set_id:
                        e.target.value === "omakase" ? draft.omakase_set_id : "",
                    })
                  }
                >
                  <option value="omakase">Omakase</option>
                  <option value="alacarte">Gọi món</option>
                </Select>
              </Field>
              {draft.purpose === "omakase" && (
                <Field
                  label="Suất omakase"
                  required
                  hint="Tiền cọc tính lại theo suất và số khách khi lưu."
                >
                  <Select
                    value={draft.omakase_set_id}
                    onChange={(e) =>
                      setDraft({ ...draft, omakase_set_id: e.target.value })
                    }
                  >
                    <option value="">Chọn suất</option>
                    {omakaseSets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {vnd(o.price)}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Trạng thái">
                <Select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as ReservationStatus,
                    })
                  }
                >
                  {Object.entries(RESERVATION_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Xếp bàn">
                <Select
                  value={draft.table_id}
                  onChange={(e) => setDraft({ ...draft, table_id: e.target.value })}
                >
                  <option value="">Chưa xếp</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.seats} ghế)
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {draft.seating === "counter" && (
              <Field
                label="Ghế ở quầy"
                hint="Chọn đúng số ghế bằng số khách. Ghế gạch ngang đã có lượt khác giữ."
              >
                <SeatChips
                  date={draft.reserved_date}
                  time={draft.reserved_time}
                  guests={draft.guests}
                  value={draft.seat_ids}
                  onChange={(ids) => setDraft({ ...draft, seat_ids: ids })}
                  excludeReservation={draft.id}
                />
              </Field>
            )}

            <Field label="Dị ứng / chế độ ăn" hint="Bếp cần biết trước.">
              <Input
                value={draft.dietary}
                onChange={(e) => setDraft({ ...draft, dietary: e.target.value })}
                placeholder="Dị ứng tôm cua, không ăn đồ sống…"
              />
            </Field>
            <Field label="Khách ghi chú">
              <Textarea
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Ghi chú nội bộ" hint="Khách không nhìn thấy.">
              <Textarea
                value={draft.staff_note}
                onChange={(e) => setDraft({ ...draft, staff_note: e.target.value })}
                className="min-h-[60px]"
              />
            </Field>

            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={draft.deposit_paid}
                onChange={(e) =>
                  setDraft({ ...draft, deposit_paid: e.target.checked })
                }
                className="h-4 w-4 accent-[#c9a96a]"
              />
              Đã nhận tiền cọc
            </label>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Xoá hẳn lượt đặt bàn"
        danger
        confirmLabel="Xoá hẳn"
        onConfirm={() => confirmDelete && removeReservation(confirmDelete)}
        body={
          <>
            Xoá hẳn {confirmDelete?.code} khỏi hệ thống, không còn trong lịch sử.
            Muốn giữ lại dấu vết thì bấm “Huỷ bàn” thay vì xoá.
          </>
        }
      />

      <ConfirmModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Huỷ lượt đặt bàn"
        danger
        confirmLabel="Huỷ bàn"
        loading={busy}
        body={
          selected?.deposit_paid
            ? "Lượt này đã nhận cọc. Huỷ xong nhớ xử lý hoàn cọc cho khách theo chính sách của nhà hàng."
            : "Khách sẽ mất chỗ đã giữ. Bạn chắc chứ?"
        }
        onConfirm={async () => {
          if (!selected) return;
          await patch(selected.id, { status: "cancelled" });
          setConfirmCancel(false);
        }}
      />
    </>
  );
}
