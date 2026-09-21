import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IconEdit,
  IconRefresh,
  IconSearch,
} from "@/components/icons";
import {
  Button,
  Card,
  EmptyState,
  ErrorBar,
  Field,
  Input,
  Modal,
  SectionHeading,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { dateTimeLabel, deaccent, formatNumber, pointsLabel, vnd } from "@/lib/format";
import {
  supabase,
  type Customer,
  type CustomerPointsLedger,
  type Order,
  type Reservation,
} from "@/lib/supabase";

const TIER_CONFIG: Record<
  string,
  { label: string; tone: string; bg: string; color: string }
> = {
  bronze: {
    label: "Đồng (Bronze)",
    tone: "neutral",
    bg: "bg-amber-800/20",
    color: "text-amber-600",
  },
  silver: {
    label: "Bạc (Silver)",
    tone: "info",
    bg: "bg-slate-400/20",
    color: "text-slate-300",
  },
  gold: {
    label: "Vàng (Gold)",
    tone: "warning",
    bg: "bg-gold/20",
    color: "text-gold",
  },
  diamond: {
    label: "Kim Cương (Diamond)",
    tone: "success",
    bg: "bg-cyan-500/20",
    color: "text-cyan-400",
  },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<CustomerPointsLedger[]>([]);
  const [custBookings, setCustBookings] = useState<Reservation[]>([]);
  const [custOrders, setCustOrders] = useState<Order[]>([]);

  // Modal điều chỉnh điểm
  const [adjustModal, setAdjustModal] = useState<Customer | null>(null);
  const [pointDelta, setPointDelta] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "sub">("add");
  const [adjusting, setAdjusting] = useState(false);

  // Modal sửa thông tin / ghi chú khách
  const [editModal, setEditModal] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadCustomers = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setCustomers((data as Customer[]) ?? []);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Khi chọn một khách hàng để xem chi tiết
  const openCustomerDetail = async (c: Customer) => {
    setSelectedCust(c);
    const [ledRes, bookRes, ordRes] = await Promise.all([
      supabase
        .from("customer_points_ledger")
        .select("*")
        .eq("customer_id", c.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("reservations")
        .select("*")
        .eq("customer_id", c.id)
        .order("reserved_date", { ascending: false })
        .limit(20),
      supabase
        .from("orders")
        .select("*")
        .eq("customer_id", c.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setLedger((ledRes.data as CustomerPointsLedger[]) ?? []);
    setCustBookings(bookRes.data ?? []);
    setCustOrders(ordRes.data ?? []);
  };

  const handleAdjustPoints = async () => {
    if (!adjustModal || !adjustReason.trim()) return;
    setAdjusting(true);
    setError(null);

    const delta = adjustType === "add" ? Math.abs(pointDelta) : -Math.abs(pointDelta);

    try {
      const { data, error } = await (supabase.rpc as any)("adjust_customer_points", {
        p_customer_id: adjustModal.id,
        p_amount: delta,
        p_reason: adjustReason.trim(),
      });

      if (error) throw new Error(error.message);

      setAdjustModal(null);
      setAdjustReason("");
      await loadCustomers();
      if (selectedCust && selectedCust.id === adjustModal.id && data) {
        openCustomerDetail(data as unknown as Customer);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi điều chỉnh điểm");
    } finally {
      setAdjusting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSavingEdit(true);
    setError(null);
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: editName.trim() || null,
        phone: editPhone.trim() || null,
        note: editNote.trim() || null,
      })
      .eq("id", editModal.id)
      .select()
      .single();

    setSavingEdit(false);
    if (error) {
      setError(error.message);
    } else {
      setEditModal(null);
      await loadCustomers();
      if (selectedCust && selectedCust.id === editModal.id) {
        setSelectedCust(data as Customer);
      }
    }
  };

  const visible = useMemo(() => {
    let list = customers ?? [];
    if (tierFilter !== "all") {
      list = list.filter((c) => c.tier === tierFilter);
    }
    if (query.trim()) {
      const q = deaccent(query.trim());
      list = list.filter(
        (c) =>
          deaccent(c.name || "").includes(q) ||
          (c.phone || "").includes(q) ||
          (c.zalo_id || "").includes(q) ||
          deaccent(c.note || "").includes(q)
      );
    }
    return list;
  }, [customers, query, tierFilter]);

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Quản lý Khách hàng (CRM & Rewards)"
        subtitle="Hồ sơ khách hàng, phân hạng thành viên, tích luỹ điểm và lịch sử tiêu dùng"
        action={
          <Button size="sm" variant="secondary" onClick={loadCustomers}>
            <IconRefresh size={15} /> Làm mới
          </Button>
        }
      />

      <ErrorBar error={error} />

      {/* Bộ lọc tìm kiếm & Phân hạng */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[280px] flex-1 max-w-md">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, SĐT, Zalo ID, ghi chú..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted">Hạng:</span>
          <Select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">Tất cả hạng</option>
            <option value="bronze">🥉 Đồng</option>
            <option value="silver">🥈 Bạc</option>
            <option value="gold">🥇 Vàng</option>
            <option value="diamond">💎 Kim Cương</option>
          </Select>
        </div>
      </div>

      {/* Bảng danh sách khách hàng */}
      {customers === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            kanji="客"
            title="Chưa tìm thấy khách hàng nào"
            hint="Khách hàng sử dụng Zalo Mini App sẽ tự động đồng bộ vào đây."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-[13.5px]">
            <thead className="border-b border-line bg-surface2/60 text-muted font-medium">
              <tr>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-3">Hạng</th>
                <th className="py-3 px-3 text-right">Điểm hiện có</th>
                <th className="py-3 px-3 text-right">Tổng chi tiêu</th>
                <th className="py-3 px-3 text-center">Số lượt ghé</th>
                <th className="py-3 px-4">Ghi chú khẩu vị / VIP</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {visible.map((c) => {
                const tier = TIER_CONFIG[c.tier || "bronze"] || TIER_CONFIG.bronze;
                return (
                  <tr
                    key={c.id}
                    onClick={() => openCustomerDetail(c)}
                    className="cursor-pointer transition hover:bg-surface2/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover border border-line"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-muted font-bold text-[14px]">
                            {(c.name || "K")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-washi">
                            {c.name || "Khách ẩn danh"}
                          </div>
                          <div className="text-[12px] font-mono text-muted">
                            {c.phone || (c.zalo_id ? `Zalo: ${c.zalo_id.slice(0, 10)}...` : "—")}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${tier.bg} ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-semibold font-mono text-gold">
                      {formatNumber(c.points || 0)}
                    </td>

                    <td className="py-3 px-3 text-right font-medium font-mono text-washi">
                      {vnd(c.total_spent || 0)}
                    </td>

                    <td className="py-3 px-3 text-center text-muted">
                      {c.visit_count || 0} lần
                    </td>

                    <td className="py-3 px-4 max-w-[200px] truncate text-[12px] text-muted italic">
                      {c.note || "—"}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setAdjustModal(c);
                            setAdjustReason("");
                            setPointDelta(50);
                          }}
                        >
                          ± Điểm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditModal(c);
                            setEditName(c.name || "");
                            setEditPhone(c.phone || "");
                            setEditNote(c.note || "");
                          }}
                        >
                          <IconEdit size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Chi tiết hồ sơ khách hàng */}
      <Modal
        open={!!selectedCust}
        onClose={() => setSelectedCust(null)}
        wide
        title={`Hồ sơ khách hàng: ${selectedCust?.name || "Khách lẻ"}`}
      >
        {selectedCust && (
          <div className="space-y-6">
            {/* Header thông tin tổng quan */}
            <div className="grid gap-3 sm:grid-cols-4 rounded-xl border border-line bg-surface2/50 p-4">
              <div>
                <div className="text-[11.5px] text-faint">Hạng thành viên</div>
                <div className="font-semibold text-[15px] text-gold mt-0.5">
                  {TIER_CONFIG[selectedCust.tier]?.label}
                </div>
              </div>
              <div>
                <div className="text-[11.5px] text-faint">Điểm tích luỹ</div>
                <div className="font-semibold text-[17px] text-gold font-mono mt-0.5">
                  {pointsLabel(selectedCust.points)}
                </div>
              </div>
              <div>
                <div className="text-[11.5px] text-faint">Tổng chi tiêu</div>
                <div className="font-semibold text-[15px] text-washi font-mono mt-0.5">
                  {vnd(selectedCust.total_spent)}
                </div>
              </div>
              <div>
                <div className="text-[11.5px] text-faint">Số lần ghé quán</div>
                <div className="font-semibold text-[15px] text-washi mt-0.5">
                  {selectedCust.visit_count} lượt
                </div>
              </div>
            </div>

            {selectedCust.note && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-[13px] text-gold">
                <b>Ghi chú đặc biệt / Khẩu vị quen:</b> {selectedCust.note}
              </div>
            )}

            {/* Tabs: Sổ cái điểm thưởng / Lịch sử đặt bàn / Lịch sử đơn */}
            <div className="space-y-3">
              <h3 className="font-display text-[15px] text-washi border-b border-line pb-2">
                Lịch sử tích & đổi điểm gần nhất
              </h3>
              {ledger.length === 0 ? (
                <div className="py-4 text-center text-muted text-[13px]">
                  Chưa có giao dịch biến động điểm nào.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {ledger.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2 text-[12.5px]"
                    >
                      <div>
                        <span className="font-medium text-washi">{l.reason}</span>
                        <span className="text-[11px] text-muted ml-2">
                          {dateTimeLabel(l.created_at)}
                        </span>
                      </div>
                      <div className="font-mono font-bold">
                        <span className={l.amount >= 0 ? "text-emerald-400" : "text-shu"}>
                          {l.amount >= 0 ? `+${l.amount}` : l.amount}
                        </span>
                        <span className="text-faint text-[11px] ml-2">
                          (Số dư: {l.balance})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lịch sử đặt bàn */}
            <div className="space-y-3">
              <h3 className="font-display text-[15px] text-washi border-b border-line pb-2">
                Lịch sử đặt bàn ăn tại quán ({custBookings.length})
              </h3>
              {custBookings.length === 0 ? (
                <div className="py-4 text-center text-muted text-[13px]">
                  Chưa có lượt đặt bàn nào.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {custBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2 text-[12.5px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-gold mr-2">{b.code}</span>
                        <span>{b.reserved_date} lúc {b.reserved_time.slice(0, 5)}</span>
                        <span className="text-muted ml-2">({b.guests} khách · {b.purpose})</span>
                      </div>
                      <span className="text-muted">{b.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lịch sử đơn hàng & Butcher */}
            <div className="space-y-3">
              <h3 className="font-display text-[15px] text-washi border-b border-line pb-2">
                Lịch sử đơn hàng & Butcher ({custOrders.length})
              </h3>
              {custOrders.length === 0 ? (
                <div className="py-4 text-center text-muted text-[13px]">
                  Chưa có đơn hàng nào từ khách này.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {custOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2 text-[12.5px]"
                    >
                      <div>
                        <span className="font-mono font-bold text-gold mr-2">{o.code}</span>
                        <span>{dateTimeLabel(o.created_at)}</span>
                        <span className="text-muted ml-2">({o.mode})</span>
                      </div>
                      <span className="font-mono font-semibold text-washi">{vnd(o.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Điều chỉnh Điểm thưởng */}
      <Modal
        open={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        title={`Cộng / Trừ điểm cho ${adjustModal?.name || "Khách"}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdjustModal(null)}>
              Huỷ
            </Button>
            <Button
              loading={adjusting}
              disabled={!adjustReason.trim() || pointDelta <= 0}
              onClick={handleAdjustPoints}
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hành động">
              <Select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
              >
                <option value="add">➕ Cộng thêm điểm</option>
                <option value="sub">➖ Trừ bớt điểm</option>
              </Select>
            </Field>

            <Field label="Số điểm">
              <Input
                type="number"
                min={1}
                value={pointDelta}
                onChange={(e) => setPointDelta(Math.max(1, parseInt(e.target.value) || 0))}
              />
            </Field>
          </div>

          <Field label="Lý do điều chỉnh (Bắt buộc)" required>
            <Input
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Thưởng sinh nhật khách VIP, bù điểm lỗi thanh toán..."
            />
          </Field>
        </div>
      </Modal>

      {/* Modal Chỉnh sửa thông tin khách */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Chỉnh sửa thông tin khách hàng"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditModal(null)}>
              Huỷ
            </Button>
            <Button loading={savingEdit} onClick={handleSaveEdit}>
              Lưu
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label="Họ tên">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label="Số điện thoại">
            <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          </Field>
          <Field label="Ghi chú nội bộ (Sở thích, dị ứng, vị trí ngồi)">
            <Textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Khách thích ngồi ghế Q6 nhìn bếp, thích uống rượu vang đỏ, dị ứng tôm..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
