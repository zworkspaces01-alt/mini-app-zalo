import { useEffect, useState } from "react";

import { IconCheck } from "@/components/icons";
import { Button, Card, ErrorBar, Field, Input, SectionHeading, Toggle } from "@/components/ui";
import {
  fetchTelegramSettings,
  saveTelegramSettings,
  testTelegramBot,
  type TelegramSettings,
} from "@/lib/telegram";

export default function TelegramPanel() {
  const [settings, setSettings] = useState<TelegramSettings>({
    bot_token: "",
    chat_id: "",
    notify_order: true,
    notify_reservation: true,
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchTelegramSettings()
      .then((data) => setSettings(data))
      .catch((err) => setError("Không thể tải cấu hình Telegram: " + err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await saveTelegramSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError("Không thể lưu cấu hình: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setTesting(true);
    setTestSuccess(false);
    try {
      const res = await testTelegramBot(settings.bot_token, settings.chat_id);
      if (!res.success) {
        setError(res.error || "Gửi tin thử nghiệm không thành công");
      } else {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 4000);
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
        Đang tải cấu hình Telegram Bot...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionHeading
        title="Thông Báo Telegram Bot Tức Thì"
        subtitle="Tự động phát chuông và gửi chi tiết đơn hàng, lượt đặt bàn mới vào nhóm Telegram nội bộ của nhà hàng."
      />

      {error && <ErrorBar error={error} />}

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm text-emerald-400">
          <IconCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Đã lưu cấu hình Telegram thành công!</span>
        </div>
      )}

      {testSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-sm text-sky-400">
          <IconCheck className="h-4 w-4 shrink-0 text-sky-400" />
          <span>
            Tin nhắn thử nghiệm đã được gửi thành công đến nhóm Telegram của bạn!
          </span>
        </div>
      )}

      {/* Cấu hình kết nối */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="font-semibold text-washi text-[15px]">
              Kích hoạt hệ thống thông báo Telegram
            </div>
            <div className="text-xs text-muted mt-0.5">
              Tạm dừng hoặc tiếp tục nhận thông báo tự động từ Zalo Mini App
            </div>
          </div>
          <Toggle
            checked={settings.is_active}
            onChange={(checked) => setSettings({ ...settings, is_active: checked })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Field label="Bot Token (từ @BotFather)" required>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="Ví dụ: 7123456789:AAHxx..."
                value={settings.bot_token}
                onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
                className="pr-16 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-faint hover:text-washi px-1.5 py-0.5 rounded bg-surface-2"
              >
                {showToken ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </Field>

          <Field label="Chat ID Nhóm / Quản lý (ID Telegram)" required>
            <Input
              type="text"
              placeholder="Ví dụ: -1001234567890 (ID nhóm có dấu -)"
              value={settings.chat_id}
              onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })}
              className="font-mono text-[13px]"
            />
          </Field>
        </div>

        {/* Các tuỳ chọn loại thông báo */}
        <div className="space-y-3 pt-3 border-t border-line">
          <div className="text-xs font-semibold text-faint uppercase tracking-wider">
            Sự kiện gửi thông báo
          </div>

          <div className="flex items-center justify-between py-1.5">
            <div>
              <div className="text-sm font-medium text-washi">
                🍣 Thông báo khi có khách Đặt bàn mới
              </div>
              <div className="text-xs text-muted">
                Bao gồm mã đặt bàn, ngày giờ, số khách, suất Omakase, ghế chọn và tiền cọc
              </div>
            </div>
            <Toggle
              checked={settings.notify_reservation}
              onChange={(checked) =>
                setSettings({ ...settings, notify_reservation: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-line/50">
            <div>
              <div className="text-sm font-medium text-washi">
                🥢 Thông báo khi có Gọi món / Mua mang về / Giao hàng
              </div>
              <div className="text-xs text-muted">
                Bao gồm mã đơn, bàn số hoặc địa chỉ giao, danh sách món, số lượng và tổng tiền
              </div>
            </div>
            <Toggle
              checked={settings.notify_order}
              onChange={(checked) => setSettings({ ...settings, notify_order: checked })}
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={testing || !settings.bot_token.trim() || !settings.chat_id.trim()}
          >
            {testing ? "Đang gửi thử..." : "🔔 Gửi tin nhắn thử nghiệm"}
          </Button>

          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cấu hình Telegram"}
          </Button>
        </div>
      </Card>

      {/* Hướng dẫn kết nối Telegram Bot */}
      <Card className="p-5 bg-surface/50 border border-line">
        <div className="font-semibold text-washi text-sm mb-2 flex items-center gap-2">
          <span>📘 Hướng dẫn thiết lập Bot Telegram trong 2 phút</span>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-xs text-muted leading-relaxed">
          <li>
            Mở Telegram và tìm kiếm bot <b className="text-washi">@BotFather</b> (có tích xanh chính thức).
          </li>
          <li>
            Gửi lệnh <code className="bg-surface-2 px-1.5 py-0.5 rounded text-shu font-mono">/newbot</code>, đặt tên cho bot (ví dụ: <i>Miyako Notifier</i>) và username kết thúc bằng chữ <i>bot</i>.
          </li>
          <li>
            Copy đoạn mã <b className="text-washi">HTTP API Token</b> dán vào ô <i>Bot Token</i> ở trên.
          </li>
          <li>
            Tạo một nhóm chat Telegram cho nhà hàng, thêm Bot vừa tạo vào nhóm và set quyền <b>Admin</b> cho bot.
          </li>
          <li>
            Thêm bot <b className="text-washi">@userinfobot</b> hoặc <b className="text-washi">@RawDataBot</b> vào nhóm để lấy <b>Chat ID</b> của nhóm (thường bắt đầu bằng dấu trừ, ví dụ: <code className="bg-surface-2 px-1 rounded text-washi font-mono">-1002345678901</code>).
          </li>
          <li>
            Dán Chat ID vào ô trên, bấm <b>"Gửi tin nhắn thử nghiệm"</b> để kiểm tra chuông thông báo ngay trong nhóm!
          </li>
        </ol>
      </Card>
    </div>
  );
}
