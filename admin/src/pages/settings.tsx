import { useCallback, useEffect, useState } from "react";

import { IconPlus, IconTrash } from "@/components/icons";
import {
  Button,
  Card,
  ConfirmModal,
  ErrorBar,
  Field,
  Input,
  Modal,
  Pill,
  SectionHeading,
  Select,
  Skeleton,
  Textarea,
  Toggle,
} from "@/components/ui";
import { SEPAY_BANKS, sepayQrUrl } from "@/lib/banks";
import { WEEKDAY_LIST, hhmm, vnd } from "@/lib/format";
import { createStaff, deleteStaff, resetStaffPassword } from "@/lib/staff-admin";
import {
  supabase,
  type OpeningHours,
  type RestaurantTable,
  type Settings,
  type Staff,
} from "@/lib/supabase";
import LanguagePanel from "@/components/language-panel";
import BannerPanel from "@/components/banner-panel";
import {
  TranslationEditor,
  fromI18nDraft,
  toI18nDraft,
  type I18nDraft,
  type TransField,
} from "@/components/translations";

type Tab =
  | "info"
  | "payment"
  | "hours"
  | "tables"
  | "seats"
  | "banners"
  | "staff"
  | "language";

const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Nhà hàng" },
  { key: "payment", label: "Thanh toán" },
  { key: "hours", label: "Giờ mở cửa" },
  { key: "tables", label: "Bàn" },
  { key: "seats", label: "Ghế quầy" },
  { key: "banners", label: "Banner & Media" },
  { key: "staff", label: "Nhân sự" },
  { key: "language", label: "Ngôn ngữ" },
];

/** Ba câu chữ trong cấu hình mà khách đọc được. */
const SETTINGS_TRANS: TransField[] = [
  { key: "tagline", label: "Câu giới thiệu" },
  { key: "menu_price_note", label: "Ghi chú giá", multiline: true },
  { key: "cancellation_policy", label: "Chính sách huỷ bàn", multiline: true },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "Chủ nhà hàng",
  manager: "Quản lý",
  staff: "Nhân viên",
  kitchen: "Bếp",
};

import type { Database } from "@/types/db";

type Seat = Database["public"]["Tables"]["seats"]["Row"];

interface StaffDraft {
  user_id?: string;
  full_name: string;
  role: string;
  email: string;
  password: string;
  is_active: boolean;
  isNew: boolean;
}

const ZONE_LABEL: Record<string, string> = {
  counter: "Quầy itamae",
  table: "Bàn khu chung",
  private: "Phòng riêng",
};

/** Ô phần trăm: lưu 0.08 nhưng nhập bằng 8. */
function PercentInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={value === null ? "" : String(Math.round(value * 1000) / 10)}
        onChange={(e) => {
          const t = e.target.value.trim().replace(",", ".");
          if (t === "") return onChange(null);
          const n = Number(t);
          if (!Number.isNaN(n) && n >= 0 && n <= 100) onChange(n / 100);
        }}
        placeholder={placeholder}
        className="!pr-8"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint">
        %
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("info");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tableDraft, setTableDraft] = useState<Partial<RestaurantTable> | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<RestaurantTable | null>(null);

  const [settingsI18n, setSettingsI18n] = useState<I18nDraft>(() =>
    toI18nDraft(null, SETTINGS_TRANS)
  );

  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatDraft, setSeatDraft] = useState<Partial<Seat> | null>(null);
  const [confirmDeleteSeat, setConfirmDeleteSeat] = useState<Seat | null>(null);

  const [staffDraft, setStaffDraft] = useState<StaffDraft | null>(null);
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<Staff | null>(null);
  const [passwordFor, setPasswordFor] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [s, h, t, st, se] = await Promise.all([
      supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("opening_hours").select("*").order("weekday"),
      supabase.from("restaurant_tables").select("*").order("sort_order"),
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("seats").select("*").order("sort_order"),
    ]);
    const err = s.error || h.error || t.error || st.error;
    if (err) setError(err.message);
    setSettings(s.data ?? null);
    setSettingsI18n(toI18nDraft(s.data?.i18n ?? null, SETTINGS_TRANS));
    setHours(h.data ?? []);
    setTables(t.data ?? []);
    setStaff(st.data ?? []);
    setSeats(se.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    const { updated_at: _ignored, ...rest } = settings;
    const payload = {
      ...rest,
      i18n: fromI18nDraft(settingsI18n, SETTINGS_TRANS),
    };
    const { error } = await supabase
      .from("restaurant_settings")
      .update(payload)
      .eq("id", 1);
    setSaving(false);
    if (error) setError(error.message);
    else flash();
  };

  const saveHours = async (row: OpeningHours, patch: Partial<OpeningHours>) => {
    const next = { ...row, ...patch };
    setHours((prev) => prev.map((h) => (h.id === row.id ? next : h)));
    const { error } = await supabase
      .from("opening_hours")
      .update(patch)
      .eq("id", row.id);
    if (error) {
      setError(error.message);
      load();
    }
  };

  const addShift = async (weekday: number, service: "lunch" | "dinner") => {
    setError(null);
    const preset =
      service === "lunch"
        ? { open_time: "11:30", close_time: "13:30" }
        : { open_time: "17:30", close_time: "21:30" };
    const { error } = await supabase.from("opening_hours").insert({
      weekday,
      service,
      ...preset,
      slot_minutes: 30,
    });
    if (error) {
      setError(
        error.code === "23505"
          ? "Ngày này đã có ca đó rồi."
          : error.message
      );
      return;
    }
    load();
  };

  const deleteShift = async (row: OpeningHours) => {
    setError(null);
    const { error } = await supabase.from("opening_hours").delete().eq("id", row.id);
    if (error) {
      setError(error.message);
      return;
    }
    setHours((prev) => prev.filter((h) => h.id !== row.id));
  };

  /* ── Nhân sự ── */
  const saveStaff = async () => {
    if (!staffDraft) return;
    const name = staffDraft.full_name.trim();
    if (!name) {
      setError("Phải có họ tên.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (staffDraft.isNew) {
        await createStaff({
          email: staffDraft.email.trim(),
          password: staffDraft.password,
          full_name: name,
          role: staffDraft.role,
        });
      } else {
        // Sửa tên / vai trò / trạng thái không đụng hệ thống auth.
        const { error } = await supabase
          .from("staff")
          .update({
            full_name: name,
            role: staffDraft.role,
            is_active: staffDraft.is_active,
          })
          .eq("user_id", staffDraft.user_id!);
        if (error) throw new Error(error.message);
      }
      setStaffDraft(null);
      await load();
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (s: Staff) => {
    setError(null);
    try {
      await deleteStaff(s.user_id);
      setConfirmDeleteStaff(null);
      await load();
    } catch (e) {
      setConfirmDeleteStaff(null);
      setError(e instanceof Error ? e.message : "Không xoá được");
    }
  };

  const changePassword = async () => {
    if (!passwordFor) return;
    setSaving(true);
    setError(null);
    try {
      await resetStaffPassword(passwordFor.user_id, newPassword);
      setPasswordFor(null);
      setNewPassword("");
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đổi được mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  const saveSeat = async () => {
    if (!seatDraft) return;
    const id = (seatDraft.id ?? "").trim().toUpperCase();
    if (!id) {
      setError("Ghế phải có mã.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("seats").upsert({
      id,
      label: (seatDraft.label ?? id).trim(),
      zone: seatDraft.zone ?? "counter",
      pos_x: Number(seatDraft.pos_x) || 0,
      pos_z: Number(seatDraft.pos_z) || 0,
      rotation: Number(seatDraft.rotation) || 0,
      is_premium: seatDraft.is_premium ?? false,
      is_active: seatDraft.is_active ?? true,
      note: seatDraft.note?.trim() || null,
      sort_order: seatDraft.sort_order ?? seats.length,
    });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSeatDraft(null);
      load();
    }
  };

  const deleteSeat = async (s: Seat) => {
    const { error } = await supabase.from("seats").delete().eq("id", s.id);
    setConfirmDeleteSeat(null);
    if (error) {
      setError(
        error.code === "23503"
          ? "Ghế này đã nằm trong một lượt đặt bàn nên không xoá được. Hãy tắt hoạt động thay vì xoá."
          : error.message
      );
      return;
    }
    load();
  };

  const saveTable = async () => {
    if (!tableDraft) return;
    const id = (tableDraft.id ?? "").trim().toUpperCase();
    if (!id || !tableDraft.label?.trim()) {
      setError("Bàn phải có mã và tên.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("restaurant_tables").upsert({
      id,
      label: tableDraft.label.trim(),
      zone: tableDraft.zone ?? "table",
      seats: Number(tableDraft.seats) || 2,
      is_active: tableDraft.is_active ?? true,
      sort_order: tableDraft.sort_order ?? tables.length,
    });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setTableDraft(null);
      load();
    }
  };

  const deleteTable = async (t: RestaurantTable) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", t.id);
    setConfirmDeleteTable(null);
    if (error) {
      setError(
        error.code === "23503"
          ? "Bàn này đã gắn với đơn hoặc lượt đặt bàn cũ nên không xoá được. Hãy tắt hoạt động thay vì xoá."
          : error.message
      );
      return;
    }
    load();
  };

  const patch = (v: Partial<Settings>) =>
    setSettings((s) => (s ? { ...s, ...v } : s));

  if (loading) {
    return (
      <>
        <SectionHeading title="Cấu hình" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </>
    );
  }

  return (
    <>
      <SectionHeading
        title="Cấu hình"
        subtitle="Những gì điền ở đây sẽ hiện ra trong mini app của khách."
        action={
          saved ? (
            <Pill tone="jade">Đã lưu</Pill>
          ) : tab === "info" || tab === "language" ? (
            <Button size="sm" loading={saving} onClick={saveSettings}>
              Lưu
            </Button>
          ) : undefined
        }
      />

      <ErrorBar error={error} />

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition ${
              tab === t.key
                ? "bg-washi font-medium text-sumi"
                : "border border-line bg-surface2 text-muted hover:text-washi"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Thông tin nhà hàng ── */}
      {tab === "info" && settings && (
        <div className="max-w-2xl space-y-5">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên nhà hàng" required>
                <Input
                  value={settings.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field label="Tagline">
                <Input
                  value={settings.tagline ?? ""}
                  onChange={(e) => patch({ tagline: e.target.value || null })}
                />
              </Field>
            </div>
            <Field
              label="Địa chỉ"
              hint="Ghi đầy đủ số nhà, phường, quận để khách tìm đúng."
            >
              <Input
                value={settings.address ?? ""}
                onChange={(e) => patch({ address: e.target.value || null })}
                placeholder="28 Đào Tấn, phường…, quận…, Hà Nội"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hotline">
                <Input
                  value={settings.hotline ?? ""}
                  onChange={(e) => patch({ hotline: e.target.value || null })}
                />
              </Field>
              <Field
                label="Zalo OA ID"
                hint="Chưa điền thì mini app ẩn nút nhắn tin."
              >
                <Input
                  value={settings.oa_id ?? ""}
                  onChange={(e) => patch({ oa_id: e.target.value || null })}
                  placeholder="1234567890123456789"
                />
              </Field>
            </div>
            <Field label="Link Google Maps">
              <Input
                value={settings.maps_url ?? ""}
                onChange={(e) => patch({ maps_url: e.target.value || null })}
                placeholder="https://maps.app.goo.gl/…"
              />
            </Field>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-[16px]">Giá và đặt cọc</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Cọc khi đặt Omakase (%)"
                hint={
                  settings.deposit_rate > 0
                    ? `Khách đặt Omakase sẽ cọc ${Math.round(settings.deposit_rate * 100)}% (ví dụ: suất 2.000k cọc ${vnd(2000000 * settings.deposit_rate)}/khách). Gọi món Alacarte không cần cọc.`
                    : "Đang tắt (0%) — khách đặt Omakase không cần cọc tiền."
                }
              >
                <PercentInput
                  value={settings.deposit_rate}
                  onChange={(v) => patch({ deposit_rate: v ?? 0 })}
                />
              </Field>
              <Field
                label="VAT"
                hint="Bỏ trống thì mini app chỉ ghi “tạm tính, chưa gồm VAT”."
              >
                <PercentInput
                  value={settings.vat_rate}
                  onChange={(v) => patch({ vat_rate: v })}
                  placeholder="8"
                />
              </Field>
              <Field label="Phí phục vụ" hint="Bỏ trống nếu không thu">
                <PercentInput
                  value={settings.service_charge_rate}
                  onChange={(v) => patch({ service_charge_rate: v })}
                  placeholder="5"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Số ghế quầy itamae">
                <Input
                  inputMode="numeric"
                  value={String(settings.counter_seats)}
                  onChange={(e) =>
                    patch({ counter_seats: Number(e.target.value.replace(/\D/g, "")) || 0 })
                  }
                />
              </Field>
              <Field label="Cho đặt trước tối đa (ngày)">
                <Input
                  inputMode="numeric"
                  value={String(settings.booking_lead_days)}
                  onChange={(e) =>
                    patch({
                      booking_lead_days: Number(e.target.value.replace(/\D/g, "")) || 1,
                    })
                  }
                />
              </Field>
              <Field
                label="Omakase phải đặt trước (giờ)"
                hint="Bếp cần thời gian đặt cá. Để 0 nếu nhận khách sát giờ. Ví dụ: 24 = trước một ngày, 48 = trước hai ngày."
              >
                <Input
                  inputMode="numeric"
                  value={String(settings.omakase_lead_hours)}
                  onChange={(e) =>
                    patch({
                      omakase_lead_hours: Math.min(
                        720,
                        Number(e.target.value.replace(/\D/g, "")) || 0
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Ghi chú giá hiển thị cho khách">
              <Input
                value={settings.menu_price_note ?? ""}
                onChange={(e) => patch({ menu_price_note: e.target.value || null })}
              />
            </Field>
            <Field
              label="Chính sách huỷ bàn"
              hint="Hiện trong mini app khi khách muốn huỷ."
            >
              <Textarea
                value={settings.cancellation_policy ?? ""}
                onChange={(e) => patch({ cancellation_policy: e.target.value || null })}
                placeholder="Huỷ trước 24 giờ được hoàn cọc…"
              />
            </Field>
          </Card>

          <Button loading={saving} onClick={saveSettings}>
            Lưu thay đổi
          </Button>
        </div>
      )}

      {/* ── Thanh toán tự động ── */}
      {tab === "payment" && settings && (
        <div className="max-w-2xl space-y-5">
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="font-display text-[16px]">Nhận cọc tự động</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                SePay theo dõi tài khoản ngân hàng và báo về mỗi khi có tiền vào.
                Khách quét mã QR trong mini app, chuyển khoản xong là bàn tự
                chuyển sang đã xác nhận — không ai phải ngồi canh sao kê.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[200px] flex-1">
                  <div className="text-[14px] font-medium text-washi">
                    Tiền cọc khi đặt Omakase
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {settings.deposit_rate > 0
                      ? `Yêu cầu cọc ${Math.round(settings.deposit_rate * 100)}% giá suất qua VietQR. Gọi món Alacarte không cần cọc.`
                      : "Hiện đang tắt — khách đặt Omakase không phải cọc tiền."}
                  </div>
                </div>
                <div className="w-28">
                  <PercentInput
                    value={settings.deposit_rate}
                    onChange={(v) => patch({ deposit_rate: v ?? 0 })}
                  />
                </div>
              </div>
            </div>

            <Field label="Bật hiển thị mã QR trong mini app">
              <div className="flex h-[38px] items-center gap-3">
                <Toggle
                  checked={settings.payment_enabled}
                  onChange={(v) => patch({ payment_enabled: v })}
                />
                <span className="text-[13px] text-muted">
                  {settings.payment_enabled
                    ? "Khách thấy mã QR để chuyển cọc"
                    : "Đang tắt — nhân viên tự hướng dẫn khách chuyển khoản"}
                </span>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngân hàng" required>
                <Select
                  value={settings.bank_code ?? ""}
                  onChange={(e) => patch({ bank_code: e.target.value || null })}
                >
                  <option value="">Chọn ngân hàng</option>
                  {SEPAY_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Số tài khoản" required>
                <Input
                  value={settings.bank_account_number ?? ""}
                  onChange={(e) =>
                    patch({ bank_account_number: e.target.value.trim() || null })
                  }
                  placeholder="0123456789"
                />
              </Field>
            </div>

            <Field label="Tên chủ tài khoản" hint="Hiện cho khách đối chiếu.">
              <Input
                value={settings.bank_account_name ?? ""}
                onChange={(e) =>
                  patch({ bank_account_name: e.target.value || null })
                }
                placeholder="CONG TY TNHH MIYAKO"
              />
            </Field>

            <Field
              label="Tiền tố mã đặt bàn"
              hint="Dùng để dò mã trong nội dung chuyển khoản. Đổi thì các mã cũ sẽ không khớp nữa."
            >
              <Input
                value={settings.payment_prefix}
                onChange={(e) =>
                  patch({ payment_prefix: e.target.value.toUpperCase().slice(0, 6) })
                }
                placeholder="MY"
              />
            </Field>

            <Button loading={saving} onClick={saveSettings}>
              Lưu
            </Button>
          </Card>

          {/* Xem trước */}
          {settings.bank_account_number && settings.bank_code && (
            <Card className="p-5">
              <h2 className="mb-1 font-display text-[16px]">Khách sẽ thấy</h2>
              <p className="mb-4 text-[13px] text-muted">
                Ví dụ với mã đặt bàn {settings.payment_prefix}-A1B2C và tiền cọc{" "}
                {vnd(1500000)}.
              </p>
              <div className="flex flex-wrap items-center gap-5">
                <img
                  src={sepayQrUrl({
                    account: settings.bank_account_number,
                    bank: settings.bank_code,
                    amount: 1500000,
                    description: `${settings.payment_prefix}A1B2C`,
                  })}
                  alt="Mã QR mẫu"
                  className="h-[190px] w-[190px] rounded-lg bg-white p-1"
                />
                <dl className="space-y-2 text-[13px]">
                  <div>
                    <dt className="text-faint">Ngân hàng</dt>
                    <dd>{settings.bank_code}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Số tài khoản</dt>
                    <dd className="tabular-nums">{settings.bank_account_number}</dd>
                  </div>
                  {settings.bank_account_name && (
                    <div>
                      <dt className="text-faint">Chủ tài khoản</dt>
                      <dd>{settings.bank_account_name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-faint">Nội dung</dt>
                    <dd className="font-mono">{settings.payment_prefix}A1B2C</dd>
                  </div>
                </dl>
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-2 font-display text-[16px]">Cần làm trên SePay</h2>
            <ol className="space-y-2 text-[13px] leading-relaxed text-muted">
              <li>
                <b className="text-washi">1.</b> Đăng ký tại sepay.vn và liên kết
                đúng tài khoản ngân hàng ghi ở trên.
              </li>
              <li>
                <b className="text-washi">2.</b> Vào Cấu hình › Webhooks, thêm một
                webhook trỏ tới hàm <code className="text-washi">sepay-webhook</code>{" "}
                của dự án, kiểu xác thực <b className="text-washi">API Key</b>.
              </li>
              <li>
                <b className="text-washi">3.</b> Dán đúng khoá đó vào biến bí mật{" "}
                <code className="text-washi">SEPAY_WEBHOOK_API_KEY</code> của
                Supabase. Sai khoá thì webhook bị từ chối.
              </li>
              <li>
                <b className="text-washi">4.</b> Dùng Test mode của SePay để bắn
                thử một giao dịch, rồi mở mục Thanh toán xem đã về chưa.
              </li>
            </ol>
            <p className="mt-3 text-[12px] leading-relaxed text-faint">
              Chuyển khoản sai nội dung vẫn được ghi lại ở mục Thanh toán để gán
              tay — không khoản nào bị bỏ sót.
            </p>
          </Card>
        </div>
      )}

      {/* ── Giờ mở cửa ── */}
      {tab === "hours" && (
        <div className="max-w-3xl">
          <p className="mb-4 text-[13px] leading-relaxed text-muted">
            Khung giờ đặt bàn trong mini app được sinh ra từ bảng này. Tắt một ca
            nghĩa là ngày đó không nhận khách ca ấy.
          </p>
          <Card className="divide-y divide-line">
            {WEEKDAY_LIST.map((day, weekday) => {
              const rows = hours.filter((h) => h.weekday === weekday);
              return (
                <div key={weekday} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium">{day}</span>
                    <div className="flex gap-1.5">
                      {(["lunch", "dinner"] as const)
                        .filter((sv) => !rows.some((h) => h.service === sv))
                        .map((sv) => (
                          <button
                            key={sv}
                            onClick={() => addShift(weekday, sv)}
                            className="rounded-lg border border-line px-2 py-1 text-[12px] text-muted hover:text-washi"
                          >
                            + ca {sv === "lunch" ? "trưa" : "tối"}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {rows.length === 0 && (
                      <div className="text-[12px] text-faint">
                        Chưa có ca nào — ngày này nhà hàng nghỉ.
                      </div>
                    )}
                    {rows.map((h) => (
                      <div key={h.id} className="flex flex-wrap items-center gap-2">
                        <span className="w-[52px] shrink-0 text-[13px] text-muted">
                          {h.service === "lunch" ? "Trưa" : "Tối"}
                        </span>
                        <input
                          type="time"
                          value={hhmm(h.open_time)}
                          onChange={(e) => saveHours(h, { open_time: e.target.value })}
                          disabled={h.is_closed}
                          className="h-9 rounded-lg border border-line bg-surface2 px-2 text-[13px] text-washi outline-none disabled:opacity-40"
                        />
                        <span className="text-faint">–</span>
                        <input
                          type="time"
                          value={hhmm(h.close_time)}
                          onChange={(e) => saveHours(h, { close_time: e.target.value })}
                          disabled={h.is_closed}
                          className="h-9 rounded-lg border border-line bg-surface2 px-2 text-[13px] text-washi outline-none disabled:opacity-40"
                        />
                        <Select
                          value={String(h.slot_minutes)}
                          onChange={(e) =>
                            saveHours(h, { slot_minutes: Number(e.target.value) })
                          }
                          className="!h-9 !w-[124px] !py-0 !text-[13px]"
                        >
                          {[15, 20, 30, 60].map((m) => (
                            <option key={m} value={m}>
                              mỗi {m} phút
                            </option>
                          ))}
                        </Select>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-[12px] text-muted">
                            {h.is_closed ? "Nghỉ" : "Mở"}
                          </span>
                          <Toggle
                            checked={!h.is_closed}
                            onChange={(v) => saveHours(h, { is_closed: !v })}
                            label={`${day} ${h.service}`}
                          />
                          <button
                            onClick={() => deleteShift(h)}
                            aria-label={`Xoá ca ${h.service} ${day}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── Bàn ── */}
      {tab === "tables" && (
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] leading-relaxed text-muted">
              Tổng số ghế của các bàn đang hoạt động là sức chứa mặc định cho mỗi
              khung giờ đặt bàn.
            </p>
            <Button
              size="sm"
              onClick={() =>
                setTableDraft({ zone: "table", seats: 4, is_active: true })
              }
            >
              <IconPlus size={15} /> Thêm bàn
            </Button>
          </div>

          <Card className="divide-y divide-line">
            {tables.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-muted">
                Chưa có bàn nào.
              </div>
            )}
            {tables.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{t.label}</span>
                    <Pill tone="neutral">{t.id}</Pill>
                    {!t.is_active && <Pill tone="faint">Ngừng dùng</Pill>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {ZONE_LABEL[t.zone]} · {t.seats} ghế
                  </div>
                </div>
                <Toggle
                  checked={t.is_active}
                  onChange={async (v) => {
                    setTables((prev) =>
                      prev.map((x) => (x.id === t.id ? { ...x, is_active: v } : x))
                    );
                    await supabase
                      .from("restaurant_tables")
                      .update({ is_active: v })
                      .eq("id", t.id);
                  }}
                  label={t.label}
                />
                <button
                  onClick={() => setTableDraft(t)}
                  className="rounded-lg px-2 py-1 text-[13px] text-muted hover:text-washi"
                >
                  Sửa
                </button>
                <button
                  onClick={() => setConfirmDeleteTable(t)}
                  aria-label={`Xoá ${t.label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── Ghế quầy omakase ── */}
      {tab === "seats" && (
        <div className="max-w-3xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="text-[13px] leading-relaxed text-muted">
              Khách chọn ghế trên mô hình 3D trong mini app. Toạ độ ở đây quyết
              định vị trí ghế trong mô hình đó — đơn vị mét, gốc ở giữa phòng.
              Đổi bố cục quầy thì sửa ở đây, không phải sửa mã.
            </p>
            <Button
              size="sm"
              onClick={() =>
                setSeatDraft({
                  zone: "counter",
                  pos_x: 0,
                  pos_z: 1.6,
                  rotation: 0,
                  is_premium: false,
                  is_active: true,
                })
              }
            >
              <IconPlus size={15} /> Thêm ghế
            </Button>
          </div>

          <Card className="divide-y divide-line">
            {seats.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-muted">
                Chưa khai báo ghế nào.
              </div>
            )}
            {seats.map((st) => (
              <div key={st.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">{st.label}</span>
                    {st.is_premium && <Pill tone="gold">Nhìn thẳng bếp trưởng</Pill>}
                    {!st.is_active && <Pill tone="faint">Ngừng dùng</Pill>}
                  </div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-muted">
                    x {Number(st.pos_x).toFixed(2)} · z {Number(st.pos_z).toFixed(2)}{" "}
                    · quay {Number(st.rotation)}°
                    {st.note ? ` · ${st.note}` : ""}
                  </div>
                </div>
                <Toggle
                  checked={st.is_active}
                  onChange={async (v) => {
                    setSeats((prev) =>
                      prev.map((x) => (x.id === st.id ? { ...x, is_active: v } : x))
                    );
                    await supabase
                      .from("seats")
                      .update({ is_active: v })
                      .eq("id", st.id);
                  }}
                  label={st.label}
                />
                <button
                  onClick={() => setSeatDraft(st)}
                  className="rounded-lg px-2 py-1 text-[13px] text-muted hover:text-washi"
                >
                  Sửa
                </button>
                <button
                  onClick={() => setConfirmDeleteSeat(st)}
                  aria-label={`Xoá ${st.label}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Sửa ghế */}
      <Modal
        open={!!seatDraft}
        onClose={() => setSeatDraft(null)}
        title={seatDraft?.label ? `Sửa ghế ${seatDraft.label}` : "Thêm ghế"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSeatDraft(null)}>
              Thôi
            </Button>
            <Button loading={saving} onClick={saveSeat}>
              Lưu
            </Button>
          </div>
        }
      >
        {seatDraft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mã ghế" required>
                <Input
                  value={seatDraft.id ?? ""}
                  onChange={(e) =>
                    setSeatDraft({ ...seatDraft, id: e.target.value.toUpperCase() })
                  }
                  placeholder="Q13"
                />
              </Field>
              <Field label="Tên hiển thị">
                <Input
                  value={seatDraft.label ?? ""}
                  onChange={(e) => setSeatDraft({ ...seatDraft, label: e.target.value })}
                  placeholder="Q13"
                />
              </Field>
              <Field label="Vị trí ngang (x)" hint="Âm là bên trái, mét">
                <Input
                  inputMode="decimal"
                  value={String(seatDraft.pos_x ?? "")}
                  onChange={(e) =>
                    setSeatDraft({ ...seatDraft, pos_x: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Vị trí dọc (z)" hint="Âm là phía bếp, mét">
                <Input
                  inputMode="decimal"
                  value={String(seatDraft.pos_z ?? "")}
                  onChange={(e) =>
                    setSeatDraft({ ...seatDraft, pos_z: Number(e.target.value) || 0 })
                  }
                />
              </Field>
              <Field label="Hướng ngồi" hint="0° = nhìn thẳng vào bếp trưởng">
                <Select
                  value={String(seatDraft.rotation ?? 0)}
                  onChange={(e) =>
                    setSeatDraft({ ...seatDraft, rotation: Number(e.target.value) })
                  }
                >
                  <option value="0">0° — nhìn vào bếp</option>
                  <option value="90">90° — quay sang phải</option>
                  <option value="180">180° — quay ra cửa</option>
                  <option value="270">270° — quay sang trái</option>
                </Select>
              </Field>
              <Field label="Ghi chú">
                <Input
                  value={seatDraft.note ?? ""}
                  onChange={(e) => setSeatDraft({ ...seatDraft, note: e.target.value })}
                  placeholder="Nhìn thẳng tay bếp trưởng"
                />
              </Field>
            </div>

            <Field label="Ghế đẹp">
              <div className="flex h-[38px] items-center gap-3">
                <Toggle
                  checked={seatDraft.is_premium ?? false}
                  onChange={(v) => setSeatDraft({ ...seatDraft, is_premium: v })}
                />
                <span className="text-[13px] text-muted">
                  Đánh dấu viền vàng trong mô hình 3D
                </span>
              </div>
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteSeat}
        onClose={() => setConfirmDeleteSeat(null)}
        title="Xoá ghế"
        danger
        confirmLabel="Xoá"
        onConfirm={() => confirmDeleteSeat && deleteSeat(confirmDeleteSeat)}
        body={`Xoá ghế "${confirmDeleteSeat?.label}" khỏi sơ đồ quầy.`}
      />

      {/* ── Nhân sự ── */}
      {tab === "staff" && (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="text-[13px] leading-relaxed text-muted">
              Chỉ <b className="text-washi">Chủ nhà hàng</b> và{" "}
              <b className="text-washi">Quản lý</b> sửa được thực đơn và cấu hình.
              Nhân viên và bếp chỉ xử lý đặt bàn và đơn gọi món.
            </p>
            <Button
              size="sm"
              onClick={() =>
                setStaffDraft({
                  full_name: "",
                  role: "staff",
                  email: "",
                  password: "",
                  is_active: true,
                  isNew: true,
                })
              }
            >
              <IconPlus size={15} /> Thêm người
            </Button>
          </div>

          <Card className="divide-y divide-line">
            {staff.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-muted">
                Chưa có tài khoản nào.
              </div>
            )}
            {staff.map((s) => (
              <div key={s.user_id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <button
                  onClick={() =>
                    setStaffDraft({
                      user_id: s.user_id,
                      full_name: s.full_name,
                      role: s.role,
                      email: "",
                      password: "",
                      is_active: s.is_active,
                      isNew: false,
                    })
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[14px] font-medium ${
                        s.is_active ? "" : "text-faint line-through"
                      }`}
                    >
                      {s.full_name}
                    </span>
                    <Pill tone={s.role === "owner" ? "gold" : "neutral"}>
                      {ROLE_LABEL[s.role] ?? s.role}
                    </Pill>
                    {!s.is_active && <Pill tone="faint">Ngừng</Pill>}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-faint">
                    {s.user_id}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setPasswordFor(s);
                    setNewPassword("");
                  }}
                  className="rounded-lg px-2 py-1 text-[13px] text-muted hover:text-washi"
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => setConfirmDeleteStaff(s)}
                  aria-label={`Xoá ${s.full_name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Soạn nhân sự */}
      <Modal
        open={!!staffDraft}
        onClose={() => setStaffDraft(null)}
        title={staffDraft?.isNew ? "Thêm tài khoản" : `Sửa ${staffDraft?.full_name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStaffDraft(null)}>
              Thôi
            </Button>
            <Button loading={saving} onClick={saveStaff}>
              Lưu
            </Button>
          </div>
        }
      >
        {staffDraft && (
          <div className="space-y-4">
            <Field label="Họ tên" required>
              <Input
                value={staffDraft.full_name}
                onChange={(e) =>
                  setStaffDraft({ ...staffDraft, full_name: e.target.value })
                }
                placeholder="Nguyễn Văn A"
              />
            </Field>

            {staffDraft.isNew && (
              <>
                <Field label="Email đăng nhập" required>
                  <Input
                    type="email"
                    value={staffDraft.email}
                    onChange={(e) =>
                      setStaffDraft({ ...staffDraft, email: e.target.value })
                    }
                    placeholder="ten@miyako.vn"
                  />
                </Field>
                <Field label="Mật khẩu" required hint="Tối thiểu 8 ký tự">
                  <Input
                    type="text"
                    value={staffDraft.password}
                    onChange={(e) =>
                      setStaffDraft({ ...staffDraft, password: e.target.value })
                    }
                    placeholder="Đặt mật khẩu rồi báo lại cho nhân viên"
                  />
                </Field>
              </>
            )}

            <Field label="Vai trò" required>
              <Select
                value={staffDraft.role}
                onChange={(e) =>
                  setStaffDraft({ ...staffDraft, role: e.target.value })
                }
              >
                <option value="owner">Chủ nhà hàng</option>
                <option value="manager">Quản lý</option>
                <option value="staff">Nhân viên</option>
                <option value="kitchen">Bếp</option>
              </Select>
            </Field>

            {!staffDraft.isNew && (
              <Field label="Còn làm việc">
                <div className="flex h-[38px] items-center gap-3">
                  <Toggle
                    checked={staffDraft.is_active}
                    onChange={(v) => setStaffDraft({ ...staffDraft, is_active: v })}
                  />
                  <span className="text-[13px] text-muted">
                    {staffDraft.is_active
                      ? "Đăng nhập được"
                      : "Bị chặn đăng nhập vào CMS"}
                  </span>
                </div>
              </Field>
            )}
          </div>
        )}
      </Modal>

      {/* Đổi mật khẩu */}
      <Modal
        open={!!passwordFor}
        onClose={() => setPasswordFor(null)}
        title={`Đổi mật khẩu — ${passwordFor?.full_name ?? ""}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPasswordFor(null)}>
              Thôi
            </Button>
            <Button loading={saving} onClick={changePassword}>
              Đổi mật khẩu
            </Button>
          </div>
        }
      >
        <Field label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự">
          <Input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập rồi báo lại cho nhân viên"
          />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteStaff}
        onClose={() => setConfirmDeleteStaff(null)}
        title="Xoá tài khoản"
        danger
        confirmLabel="Xoá"
        onConfirm={() => confirmDeleteStaff && removeStaff(confirmDeleteStaff)}
        body={
          <>
            Xoá hẳn tài khoản của “{confirmDeleteStaff?.full_name}”. Người này
            sẽ không đăng nhập được nữa. Nếu chỉ tạm nghỉ, hãy tắt “Còn làm
            việc” thay vì xoá.
          </>
        }
      />

      {/* Sửa bàn */}
      {/* ── Ngôn ngữ ── */}
      {tab === "language" && (
        <div className="max-w-2xl space-y-5">
          <LanguagePanel />

          {settings && (
            <TranslationEditor
              fields={SETTINGS_TRANS}
              draft={settingsI18n}
              onChange={setSettingsI18n}
              entity="restaurant_settings"
              id="1"
              stale={settings.i18n_hash !== settings.i18n_src_hash}
              onTranslated={load}
            />
          )}
        </div>
      )}

      {/* ── Banner chiến dịch & Media ── */}
      {tab === "banners" && <BannerPanel />}

      <Modal
        open={!!tableDraft}
        onClose={() => setTableDraft(null)}
        title={tableDraft?.label ? `Sửa ${tableDraft.label}` : "Thêm bàn"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTableDraft(null)}>
              Thôi
            </Button>
            <Button loading={saving} onClick={saveTable}>
              Lưu
            </Button>
          </div>
        }
      >
        {tableDraft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mã bàn" required hint="Dùng cho QR đặt tại bàn">
                <Input
                  value={tableDraft.id ?? ""}
                  onChange={(e) =>
                    setTableDraft({ ...tableDraft, id: e.target.value.toUpperCase() })
                  }
                  placeholder="A3"
                />
              </Field>
              <Field label="Tên hiển thị" required>
                <Input
                  value={tableDraft.label ?? ""}
                  onChange={(e) => setTableDraft({ ...tableDraft, label: e.target.value })}
                  placeholder="Bàn A3"
                />
              </Field>
              <Field label="Khu vực" required>
                <Select
                  value={tableDraft.zone ?? "table"}
                  onChange={(e) =>
                    setTableDraft({
                      ...tableDraft,
                      zone: e.target.value as RestaurantTable["zone"],
                    })
                  }
                >
                  <option value="counter">Quầy itamae</option>
                  <option value="table">Bàn khu chung</option>
                  <option value="private">Phòng riêng</option>
                </Select>
              </Field>
              <Field label="Số ghế" required>
                <Input
                  inputMode="numeric"
                  value={String(tableDraft.seats ?? "")}
                  onChange={(e) =>
                    setTableDraft({
                      ...tableDraft,
                      seats: Number(e.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteTable}
        onClose={() => setConfirmDeleteTable(null)}
        title="Xoá bàn"
        danger
        confirmLabel="Xoá"
        onConfirm={() => confirmDeleteTable && deleteTable(confirmDeleteTable)}
        body={`Xoá "${confirmDeleteTable?.label}" khỏi danh sách bàn.`}
      />
    </>
  );
}
