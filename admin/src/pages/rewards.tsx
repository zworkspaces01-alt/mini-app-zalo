import { useCallback, useEffect, useState } from "react";

import {
  IconCheck,
  IconGift,
  IconPlus,
  IconRefresh,
  IconTag,
  IconTrash,
} from "@/components/icons";
import {
  Button,
  Card,
  ConfirmModal,
  ErrorBar,
  Field,
  Input,
  Modal,
  SectionHeading,
  Select,
  Textarea,
} from "@/components/ui";
import { dateTimeLabel, pointsLabel, vnd } from "@/lib/format";
import {
  supabase,
  type RewardGift,
  type Voucher,
  type VoucherRedemption,
} from "@/lib/supabase";

export default function RewardsPage() {
  const [tab, setTab] = useState<"gifts" | "vouchers" | "verify">("gifts");
  const [gifts, setGifts] = useState<RewardGift[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal quà tặng
  const [giftDraft, setGiftDraft] = useState<RewardGift | null>(null);
  const [savingGift, setSavingGift] = useState(false);
  const [deleteGift, setDeleteGift] = useState<RewardGift | null>(null);

  // Modal voucher
  const [voucherDraft, setVoucherDraft] = useState<Voucher | null>(null);
  const [savingVoucher, setSavingVoucher] = useState(false);
  const [deleteVoucher, setDeleteVoucher] = useState<Voucher | null>(null);

  // Công cụ xác minh voucher
  const [verifyCode, setVerifyCode] = useState("");
  const [verifiedRedemption, setVerifiedRedemption] = useState<VoucherRedemption | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    const [gRes, vRes] = await Promise.all([
      supabase.from("reward_gifts").select("*").order("sort_order"),
      supabase.from("vouchers").select("*").order("created_at", { ascending: false }),
    ]);

    if (gRes.error) setError(gRes.error.message);
    setGifts((gRes.data as RewardGift[]) ?? []);
    setVouchers((vRes.data as Voucher[]) ?? []);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lưu Quà tặng
  const saveGift = async () => {
    if (!giftDraft) return;
    if (!giftDraft.id.trim() || !giftDraft.title.trim()) {
      setError("Vui lòng điền mã quà và tiêu đề");
      return;
    }

    setSavingGift(true);
    setError(null);
    const { error: upErr } = await supabase.from("reward_gifts").upsert({
      id: giftDraft.id.trim(),
      category: giftDraft.category,
      title: giftDraft.title.trim(),
      description: giftDraft.description?.trim() || null,
      worth_text: giftDraft.worth_text?.trim() || null,
      points_cost: giftDraft.points_cost,
      badge: giftDraft.badge?.trim() || null,
      image_url: giftDraft.image_url || null,
      is_active: giftDraft.is_active,
      sort_order: giftDraft.sort_order,
      updated_at: new Date().toISOString(),
    });
    setSavingGift(false);

    if (upErr) {
      setError(upErr.message);
    } else {
      setGiftDraft(null);
      await loadData();
    }
  };

  const removeGift = async (g: RewardGift) => {
    setError(null);
    const { error: delErr } = await supabase
      .from("reward_gifts")
      .delete()
      .eq("id", g.id);
    setDeleteGift(null);
    if (delErr) {
      setError(delErr.message);
    } else {
      setGifts((prev) => prev.filter((x) => x.id !== g.id));
    }
  };

  // Lưu Voucher
  const saveVoucher = async () => {
    if (!voucherDraft) return;
    if (!voucherDraft.code.trim() || !voucherDraft.title.trim()) {
      setError("Vui lòng điền mã voucher và tiêu đề");
      return;
    }

    setSavingVoucher(true);
    setError(null);
    const payload = {
      code: voucherDraft.code.trim().toUpperCase(),
      title: voucherDraft.title.trim(),
      discount_type: voucherDraft.discount_type,
      discount_value: voucherDraft.discount_value,
      min_order_value: voucherDraft.min_order_value || 0,
      max_discount: voucherDraft.max_discount || null,
      usage_limit: voucherDraft.usage_limit || null,
      expires_at: voucherDraft.expires_at || null,
      is_active: voucherDraft.is_active,
    };

    let upErr;
    if (voucherDraft.id) {
      const res = await supabase
        .from("vouchers")
        .update(payload)
        .eq("id", voucherDraft.id);
      upErr = res.error;
    } else {
      const res = await supabase.from("vouchers").insert(payload);
      upErr = res.error;
    }

    setSavingVoucher(false);
    if (upErr) {
      setError(upErr.message);
    } else {
      setVoucherDraft(null);
      await loadData();
    }
  };

  const removeVoucher = async (v: Voucher) => {
    setError(null);
    const { error: delErr } = await supabase.from("vouchers").delete().eq("id", v.id);
    setDeleteVoucher(null);
    if (delErr) {
      setError(delErr.message);
    } else {
      setVouchers((prev) => prev.filter((x) => x.id !== v.id));
    }
  };

  // Tra cứu & Duyệt mã voucher của khách
  const handleVerify = async () => {
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifyMsg(null);
    setVerifiedRedemption(null);

    const code = verifyCode.trim().toUpperCase();

    // Tìm trong bảng voucher_redemptions kèm thông tin khách và quà tặng
    const { data, error } = await supabase
      .from("voucher_redemptions")
      .select("*, customers(name, phone), reward_gifts(title, worth_text)")
      .eq("code", code)
      .maybeSingle();

    setVerifying(false);

    if (error || !data) {
      setVerifyMsg({ text: `Không tìm thấy mã ưu đãi "${code}"`, ok: false });
    } else {
      setVerifiedRedemption(data as VoucherRedemption);
      if (data.status === "used") {
        setVerifyMsg({
          text: `Mã "${code}" đã được sử dụng lúc ${dateTimeLabel(data.used_at || "")}`,
          ok: false,
        });
      } else {
        setVerifyMsg({
          text: `Mã "${code}" HỢP LỆ! Sẵn sàng áp dụng cho khách.`,
          ok: true,
        });
      }
    }
  };


  // Đánh dấu mã đã sử dụng
  const handleApplyRedemption = async () => {
    if (!verifiedRedemption) return;
    setVerifying(true);
    const { error } = await supabase
      .from("voucher_redemptions")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
      })
      .eq("id", verifiedRedemption.id);
    setVerifying(false);

    if (error) {
      setVerifyMsg({ text: error.message, ok: false });
    } else {
      setVerifyMsg({
        text: `Đã áp dụng thành công mã "${verifiedRedemption.code}" vào hoá đơn!`,
        ok: true,
      });
      setVerifiedRedemption({ ...verifiedRedemption, status: "used" });
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Ưu đãi, Voucher & Quà đổi điểm"
        subtitle="Quản lý danh mục quà tặng tích điểm Mini App, tạo mã khuyến mãi và duyệt voucher tại quầy"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={loadData}>
              <IconRefresh size={15} /> Làm mới
            </Button>
            {tab === "gifts" && (
              <Button
                size="sm"
                onClick={() =>
                  setGiftDraft({
                    id: `gift-${Date.now().toString().slice(-4)}`,
                    category: "voucher",
                    title: "",
                    description: "",
                    worth_text: "",
                    points_cost: 100,
                    badge: "",
                    image_url: null,
                    discount_value: null,
                    min_order_value: 0,
                    is_active: true,
                    sort_order: gifts.length + 1,
                    i18n: {},
                    i18n_hash: null,
                    i18n_src_hash: null,
                    created_at: "",
                    updated_at: "",
                  })
                }
              >
                <IconPlus size={15} /> Thêm quà đổi điểm
              </Button>
            )}
            {tab === "vouchers" && (
              <Button
                size="sm"
                onClick={() =>
                  setVoucherDraft({
                    id: "",
                    code: "",
                    title: "",
                    discount_type: "fixed",
                    discount_value: 50000,
                    min_order_value: 300000,
                    max_discount: null,
                    usage_limit: 100,
                    used_count: 0,
                    expires_at: null,
                    is_active: true,
                    created_at: "",
                  })
                }
              >
                <IconPlus size={15} /> Tạo mã voucher
              </Button>
            )}
          </div>
        }
      />

      <ErrorBar error={error} />

      {/* Tabs chuyển đổi */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          onClick={() => setTab("gifts")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] transition ${
            tab === "gifts"
              ? "bg-surface2 font-medium text-washi border border-line"
              : "text-muted hover:text-washi"
          }`}
        >
          <IconGift size={16} /> Danh mục Quà đổi điểm ({gifts.length})
        </button>

        <button
          onClick={() => setTab("vouchers")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] transition ${
            tab === "vouchers"
              ? "bg-surface2 font-medium text-washi border border-line"
              : "text-muted hover:text-washi"
          }`}
        >
          <IconTag size={16} /> Mã Voucher Khuyến mãi ({vouchers.length})
        </button>

        <button
          onClick={() => setTab("verify")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] transition ${
            tab === "verify"
              ? "bg-surface2 font-medium text-washi border border-line"
              : "text-muted hover:text-washi"
          }`}
        >
          <IconCheck size={16} /> Duyệt mã tại bàn
        </button>
      </div>

      {/* 1. Tab Danh mục Quà đổi điểm */}
      {tab === "gifts" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gifts.map((g) => (
              <Card key={g.id} className="flex flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[16px] font-bold text-washi">
                        {g.title}
                      </span>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        g.is_active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-surface3 text-muted"
                      }`}
                    >
                      {g.is_active ? "Đang bật" : "Tạm ẩn"}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                    <span className="font-semibold text-gold font-mono">
                      {pointsLabel(g.points_cost)}
                    </span>
                    {g.worth_text && (
                      <span className="text-faint">({g.worth_text})</span>
                    )}
                    {g.badge && (
                      <span className="rounded bg-gold/10 px-1.5 py-0.5 text-[10.5px] text-gold">
                        {g.badge}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[12.5px] text-muted line-clamp-2">
                    {g.description || "Không có mô tả"}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12.5px]">
                  <span className="text-faint">Loại: {g.category}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setGiftDraft(g)}
                    >
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteGift(g)}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. Tab Mã Voucher */}
      {tab === "vouchers" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b border-line bg-surface2/60 text-muted">
                <tr>
                  <th className="py-3 px-4">Mã Code</th>
                  <th className="py-3 px-4">Tiêu đề ưu đãi</th>
                  <th className="py-3 px-3">Mức giảm</th>
                  <th className="py-3 px-3">Đơn tối thiểu</th>
                  <th className="py-3 px-3 text-center">Đã dùng / Giới hạn</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-surface2/40">
                    <td className="py-3 px-4 font-mono font-bold text-gold">
                      {v.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-washi">{v.title}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {v.discount_type === "percent"
                        ? `${v.discount_value}%`
                        : vnd(v.discount_value)}
                    </td>
                    <td className="py-3 px-3 text-muted">{vnd(v.min_order_value)}</td>
                    <td className="py-3 px-3 text-center text-muted font-mono">
                      {v.used_count} / {v.usage_limit ?? "∞"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          v.is_active
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-surface3 text-muted"
                        }`}
                      >
                        {v.is_active ? "Hoạt động" : "Tắt"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setVoucherDraft(v)}
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteVoucher(v)}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Tab Duyệt mã Voucher tại bàn */}
      {tab === "verify" && (
        <Card className="max-w-xl mx-auto p-6 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-display text-[18px] text-washi">
              Kiểm tra & Áp dụng Voucher của khách
            </h3>
            <p className="text-[12.5px] text-muted">
              Nhập mã đổi thưởng trên màn hình điện thoại của khách (ví dụ: RD-XXXXXX hoặc MIYAKO50)
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã voucher (VD: RD-8K9F2)..."
              className="text-center font-mono text-[16px] tracking-wider uppercase font-bold"
            />
            <Button loading={verifying} onClick={handleVerify}>
              Kiểm tra
            </Button>
          </div>

          {verifyMsg && (
            <div
              className={`rounded-lg p-3 text-[13px] text-center font-medium ${
                verifyMsg.ok
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-shu/15 text-shu border border-shu/30"
              }`}
            >
              {verifyMsg.text}
            </div>
          )}

          {verifiedRedemption && verifiedRedemption.status === "active" && (
            <div className="rounded-xl border border-line bg-surface2/60 p-4 space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Mã đổi quà:</span>
                <span className="font-mono font-bold text-gold">
                  {verifiedRedemption.code}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Phần quà:</span>
                <span className="font-semibold text-washi">
                  {(verifiedRedemption as any).reward_gifts?.title || "Ưu đãi đổi điểm"}
                  {(verifiedRedemption as any).reward_gifts?.worth_text ? ` - ${(verifiedRedemption as any).reward_gifts?.worth_text}` : ""}
                </span>
              </div>
              {(verifiedRedemption as any).customers?.name && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Khách hàng:</span>
                  <span className="text-washi">
                    {(verifiedRedemption as any).customers?.name}
                    {(verifiedRedemption as any).customers?.phone ? ` (${(verifiedRedemption as any).customers?.phone})` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Thời gian đổi:</span>
                <span>{dateTimeLabel(verifiedRedemption.created_at)}</span>
              </div>
              <Button full variant="gold" loading={verifying} onClick={handleApplyRedemption}>
                <IconCheck size={16} /> Xác nhận Áp dụng vào Hoá đơn
              </Button>
            </div>
          )}

        </Card>
      )}

      {/* Modal Quà đổi điểm */}
      <Modal
        open={!!giftDraft}
        onClose={() => setGiftDraft(null)}
        title={giftDraft?.title ? `Sửa: ${giftDraft.title}` : "Thêm quà đổi điểm"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGiftDraft(null)}>
              Huỷ
            </Button>
            <Button loading={savingGift} onClick={saveGift}>
              Lưu quà tặng
            </Button>
          </div>
        }
      >
        {giftDraft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mã định danh (ID)" required>
                <Input
                  value={giftDraft.id}
                  onChange={(e) => setGiftDraft({ ...giftDraft, id: e.target.value })}
                  placeholder="gift-v50, gift-sashimi..."
                />
              </Field>
              <Field label="Loại quà tặng" required>
                <Select
                  value={giftDraft.category}
                  onChange={(e) =>
                    setGiftDraft({ ...giftDraft, category: e.target.value as any })
                  }
                >
                  <option value="voucher">Voucher tiền mặt</option>
                  <option value="dish">Món ăn tặng kèm</option>
                  <option value="drink">Đồ uống</option>
                </Select>
              </Field>
            </div>

            <Field label="Tiêu đề quà tặng" required>
              <Input
                value={giftDraft.title}
                onChange={(e) => setGiftDraft({ ...giftDraft, title: e.target.value })}
                placeholder="Voucher Giảm 50.000đ, Sashimi Cá Hồi..."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Số điểm cần đổi" required>
                <Input
                  type="number"
                  value={giftDraft.points_cost}
                  onChange={(e) =>
                    setGiftDraft({
                      ...giftDraft,
                      points_cost: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field label="Giá trị tương đương">
                <Input
                  value={giftDraft.worth_text || ""}
                  onChange={(e) =>
                    setGiftDraft({ ...giftDraft, worth_text: e.target.value })
                  }
                  placeholder="Trị giá 50.000đ"
                />
              </Field>
              <Field label="Huy hiệu nổi bật">
                <Input
                  value={giftDraft.badge || ""}
                  onChange={(e) =>
                    setGiftDraft({ ...giftDraft, badge: e.target.value })
                  }
                  placeholder="Dễ đổi nhất, Wagyu A5..."
                />
              </Field>
            </div>

            <Field label="Mô tả quyền lợi / điều kiện áp dụng">
              <Textarea
                value={giftDraft.description || ""}
                onChange={(e) =>
                  setGiftDraft({ ...giftDraft, description: e.target.value })
                }
                placeholder="Trừ trực tiếp trên hoá đơn dùng bữa hoặc mua thịt Butcher..."
              />
            </Field>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[13.5px] text-washi cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftDraft.is_active}
                  onChange={(e) =>
                    setGiftDraft({ ...giftDraft, is_active: e.target.checked })
                  }
                  className="rounded border-line"
                />
                Kích hoạt cho khách đổi trên Mini App
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Voucher */}
      <Modal
        open={!!voucherDraft}
        onClose={() => setVoucherDraft(null)}
        title={voucherDraft?.code ? `Sửa Voucher: ${voucherDraft.code}` : "Tạo Voucher mới"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVoucherDraft(null)}>
              Huỷ
            </Button>
            <Button loading={savingVoucher} onClick={saveVoucher}>
              Lưu Voucher
            </Button>
          </div>
        }
      >
        {voucherDraft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mã khuyến mãi (Code)" required>
                <Input
                  value={voucherDraft.code}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="MIYAKO50, WAGYU2026..."
                />
              </Field>
              <Field label="Tiêu đề ưu đãi" required>
                <Input
                  value={voucherDraft.title}
                  onChange={(e) =>
                    setVoucherDraft({ ...voucherDraft, title: e.target.value })
                  }
                  placeholder="Giảm 50k cho hoá đơn đầu tiên..."
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Loại giảm">
                <Select
                  value={voucherDraft.discount_type}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      discount_type: e.target.value as any,
                    })
                  }
                >
                  <option value="fixed">Số tiền cố định (VND)</option>
                  <option value="percent">Phần trăm (%)</option>
                </Select>
              </Field>
              <Field label="Mức giảm">
                <Input
                  type="number"
                  value={voucherDraft.discount_value}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      discount_value: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field label="Đơn tối thiểu (VND)">
                <Input
                  type="number"
                  value={voucherDraft.min_order_value}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      min_order_value: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Giới hạn số lượt dùng (Bỏ trống nếu vô hạn)">
                <Input
                  type="number"
                  value={voucherDraft.usage_limit ?? ""}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      usage_limit: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="100"
                />
              </Field>
              <Field label="Ngày hết hạn (Tuỳ chọn)">
                <Input
                  type="date"
                  value={voucherDraft.expires_at ? voucherDraft.expires_at.slice(0, 10) : ""}
                  onChange={(e) =>
                    setVoucherDraft({
                      ...voucherDraft,
                      expires_at: e.target.value ? `${e.target.value}T23:59:59Z` : null,
                    })
                  }
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-[13.5px] text-washi cursor-pointer">
              <input
                type="checkbox"
                checked={voucherDraft.is_active}
                onChange={(e) =>
                  setVoucherDraft({ ...voucherDraft, is_active: e.target.checked })
                }
                className="rounded border-line"
              />
              Kích hoạt voucher này
            </label>
          </div>
        )}
      </Modal>

      {/* Xác nhận xoá Quà tặng */}
      <ConfirmModal
        open={!!deleteGift}
        onClose={() => setDeleteGift(null)}
        title="Xoá quà tặng đổi điểm"
        danger
        confirmLabel="Xoá hẳn"
        onConfirm={() => deleteGift && removeGift(deleteGift)}
        body={`Bạn có chắc muốn xoá quà tặng "${deleteGift?.title}"?`}
      />

      {/* Xác nhận xoá Voucher */}
      <ConfirmModal
        open={!!deleteVoucher}
        onClose={() => setDeleteVoucher(null)}
        title="Xoá mã Voucher"
        danger
        confirmLabel="Xoá hẳn"
        onConfirm={() => deleteVoucher && removeVoucher(deleteVoucher)}
        body={`Bạn có chắc muốn xoá voucher "${deleteVoucher?.code}"?`}
      />
    </div>
  );
}
