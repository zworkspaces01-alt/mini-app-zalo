import { useEffect, useState } from "react";

import { IconCheck } from "@/components/icons";
import { Button, Card, ErrorBar, Field, Input, SectionHeading, Select, Toggle } from "@/components/ui";
import {
  fetchZaloNotificationLogs,
  fetchZaloOASettings,
  saveZaloOASettings,
  testZaloOAMessage,
  type ZaloNotificationLog,
  type ZaloOASettings,
} from "@/lib/zalo-oa";

export default function ZaloOAPanel() {
  const [settings, setSettings] = useState<ZaloOASettings>({
    oa_id: "",
    app_id: "",
    secret_key: "",
    access_token: "",
    refresh_token: "",
    zns_template_reservation: "",
    zns_template_order: "",
    send_mode: "zns",
    is_active: true,
  });

  const [logs, setLogs] = useState<ZaloNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const loadData = async () => {
    try {
      const [s, l] = await Promise.all([
        fetchZaloOASettings(),
        fetchZaloNotificationLogs(),
      ]);
      setSettings(s);
      setLogs(l);
    } catch (err: any) {
      setError("Không thể tải cấu hình Zalo OA: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await saveZaloOASettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError("Không thể lưu cấu hình Zalo OA: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      setError("Vui lòng nhập số điện thoại để nhận tin nhắn thử nghiệm");
      return;
    }

    setError(null);
    setTesting(true);
    setTestSuccess(false);
    try {
      const res = await testZaloOAMessage({ phone: testPhone.trim() });
      if (!res.success) {
        setError(res.error || "Gửi tin thử nghiệm không thành công");
      } else {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 5000);
        // Tải lại nhật ký
        fetchZaloNotificationLogs().then((l) => setLogs(l));
      }
    } catch (err: any) {
      setError("Lỗi gửi thử nghiệm: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-faint">
        Đang tải cấu hình Zalo Official Account & ZNS...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeading
        title="Gửi Tin Nhắn Zalo OA & ZNS Cho Khách Hàng"
        subtitle="Tự động gửi tin nhắn xác nhận chính thức từ Zalo OA của Miyako đến số điện thoại hoặc tài khoản Zalo của khách khi Đặt bàn hoặc Gọi món."
      />

      {error && <ErrorBar error={error} />}

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm text-emerald-400">
          <IconCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Đã lưu cấu hình Zalo OA thành công!</span>
        </div>
      )}

      {testSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-sm text-sky-400">
          <IconCheck className="h-4 w-4 shrink-0 text-sky-400" />
          <span>
            Tin nhắn Zalo thử nghiệm đã được gửi thành công đến số điện thoại <b>{testPhone}</b>!
          </span>
        </div>
      )}

      {/* ── Khối 1: Bật/Tắt & Cấu hình App ── */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="font-semibold text-washi text-[15px]">
              Kích hoạt gửi tin nhắn Zalo OA
            </div>
            <div className="text-xs text-muted mt-0.5">
              Tự động gửi tin thông báo đến Zalo của khách hàng khi đặt bàn / gọi món
            </div>
          </div>
          <Toggle
            checked={settings.is_active}
            onChange={(checked) => setSettings({ ...settings, is_active: checked })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Field label="Zalo OA ID" required>
            <Input
              type="text"
              placeholder="Ví dụ: 4366657904098901234"
              value={settings.oa_id}
              onChange={(e) => setSettings({ ...settings, oa_id: e.target.value })}
              className="font-mono text-[13px]"
            />
          </Field>

          <Field label="Zalo App ID" required>
            <Input
              type="text"
              placeholder="Lấy tại developers.zalo.me"
              value={settings.app_id}
              onChange={(e) => setSettings({ ...settings, app_id: e.target.value })}
              className="font-mono text-[13px]"
            />
          </Field>

          <Field label="Secret Key (Khoá bí mật của App)" required>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="Nhập secret key của ứng dụng"
                value={settings.secret_key}
                onChange={(e) => setSettings({ ...settings, secret_key: e.target.value })}
                className="pr-16 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-faint hover:text-washi px-1.5 py-0.5 rounded bg-surface-2"
              >
                {showSecret ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </Field>

          <Field label="Hình thức gửi ưu tiên">
            <Select
              value={settings.send_mode}
              onChange={(e) => setSettings({ ...settings, send_mode: e.target.value as any })}
            >
              <option value="zns">ZNS (Theo SĐT - Khuyên dùng)</option>
              <option value="oa_message">Tin nhắn Zalo OA (Theo User ID)</option>
              <option value="both">Kết hợp cả hai (Ưu tiên ZNS, fallback OA)</option>
            </Select>
          </Field>
        </div>

        {/* Cấu hình Token */}
        <div className="pt-3 border-t border-line space-y-3">
          <div className="text-xs font-semibold text-faint uppercase tracking-wider flex items-center justify-between">
            <span>Mã Token Xác Thực (Tự động gia hạn 24/7)</span>
            {settings.token_expires_at && (
              <span className="text-[11px] text-muted lowercase font-normal">
                Hạn token: {new Date(settings.token_expires_at).toLocaleString("vi-VN")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Refresh Token (Dùng tự động cấp mới Access Token)">
              <Input
                type="password"
                placeholder="Nhập refresh_token từ Zalo OAuth"
                value={settings.refresh_token}
                onChange={(e) => setSettings({ ...settings, refresh_token: e.target.value })}
                className="font-mono text-[12px]"
              />
            </Field>

            <Field label="Access Token hiện tại">
              <Input
                type="password"
                placeholder="Nhập access_token nếu có sẵn"
                value={settings.access_token}
                onChange={(e) => setSettings({ ...settings, access_token: e.target.value })}
                className="font-mono text-[12px]"
              />
            </Field>
          </div>
        </div>

        {/* Cấu hình Template ZNS */}
        <div className="pt-3 border-t border-line space-y-3">
          <div className="text-xs font-semibold text-faint uppercase tracking-wider">
            Mẫu Tin Nhắn ZNS (Đăng ký tại Zalo Cloud Account)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Template ID - Xác nhận Đặt bàn">
              <Input
                type="text"
                placeholder="Ví dụ: 312849"
                value={settings.zns_template_reservation}
                onChange={(e) => setSettings({ ...settings, zns_template_reservation: e.target.value })}
                className="font-mono text-[13px]"
              />
            </Field>

            <Field label="Template ID - Xác nhận Đơn hàng">
              <Input
                type="text"
                placeholder="Ví dụ: 312850"
                value={settings.zns_template_order}
                onChange={(e) => setSettings({ ...settings, zns_template_order: e.target.value })}
                className="font-mono text-[13px]"
              />
            </Field>
          </div>
        </div>

        {/* Nút lưu */}
        <div className="flex justify-end pt-3 border-t border-line">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cấu hình Zalo OA"}
          </Button>
        </div>
      </Card>

      {/* ── Khối 2: Kiểm tra gửi tin nhắn thử nghiệm ── */}
      <Card className="p-5 space-y-3 border border-line">
        <div className="font-semibold text-washi text-[15px]">
          🧪 Kiểm tra gửi tin nhắn thử nghiệm
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Nhập số điện thoại có sử dụng Zalo để nhận một tin nhắn mẫu kiểm tra kết nối từ hệ thống.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="flex-1">
            <Input
              type="tel"
              placeholder="Nhập số điện thoại (ví dụ: 0912345678)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="font-mono"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={testing || !testPhone.trim()}
            className="shrink-0"
          >
            {testing ? "Đang gửi thử..." : "🔔 Gửi tin nhắn thử nghiệm"}
          </Button>
        </div>
      </Card>

      {/* ── Khối 3: Nhật ký gửi tin nhắn Zalo gần nhất ── */}
      {logs.length > 0 && (
        <Card className="p-5 space-y-3 border border-line">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-washi text-[15px]">
              📋 Nhật ký gửi tin nhắn Zalo gần đây
            </div>
            <button
              onClick={() => fetchZaloNotificationLogs().then((l) => setLogs(l))}
              className="text-xs text-shu hover:underline font-medium"
            >
              Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-faint">
                <tr>
                  <th className="py-2 font-medium">Thời gian</th>
                  <th className="py-2 font-medium">Số điện thoại</th>
                  <th className="py-2 font-medium">Sự kiện</th>
                  <th className="py-2 font-medium">Kênh</th>
                  <th className="py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {logs.slice(0, 8).map((lg) => (
                  <tr key={lg.id} className="hover:bg-surface-2/40">
                    <td className="py-2 text-muted whitespace-nowrap">
                      {new Date(lg.created_at).toLocaleTimeString("vi-VN")}{" "}
                      {new Date(lg.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="py-2 font-mono text-washi">
                      {lg.recipient_phone || lg.recipient_zalo_id || "-"}
                    </td>
                    <td className="py-2 text-muted capitalize">
                      {lg.event_type === "reservation"
                        ? "Đặt bàn"
                        : lg.event_type === "order"
                        ? "Đơn hàng"
                        : "Gửi thử"}
                    </td>
                    <td className="py-2 uppercase font-mono text-faint">
                      {lg.send_mode}
                    </td>
                    <td className="py-2">
                      {lg.status === "success" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          Thành công
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 cursor-help"
                          title={lg.error_message || "Lỗi gửi"}
                        >
                          Thất bại
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Khối 4: Hướng dẫn cấu hình Zalo OA ── */}
      <Card className="p-5 bg-surface/50 border border-line">
        <div className="font-semibold text-washi text-sm mb-2 flex items-center gap-2">
          <span>📘 Hướng dẫn liên kết Zalo Official Account & ZNS</span>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-xs text-muted leading-relaxed">
          <li>
            Đăng nhập vào trang quản trị lập trình viên Zalo: <b className="text-washi">developers.zalo.me</b>.
          </li>
          <li>
            Tạo một ứng dụng (App) và liên kết ứng dụng với <b>Zalo Official Account (OA)</b> đã được xác thực của nhà hàng.
          </li>
          <li>
            Copy <b>App ID</b> và <b>Secret Key</b> dán vào các ô tương ứng phía trên.
          </li>
          <li>
            Để gửi tin <b>ZNS</b> theo số điện thoại (tỷ lệ nhận 100%), truy cập <b>zca.zalo.me</b>, tạo mẫu tin thông báo giao dịch (Xác nhận đặt bàn / Xác nhận đơn hàng) và dán <b>Template ID</b> vào đây.
          </li>
          <li>
            Hệ thống đã tích hợp sẵn cơ chế <b>Auto-Refresh Token 24/7</b>, bạn chỉ cần điền <i>Refresh Token</i> ban đầu, hệ thống sẽ tự động duy trì kết nối vĩnh viễn!
          </li>
        </ol>
      </Card>
    </div>
  );
}
