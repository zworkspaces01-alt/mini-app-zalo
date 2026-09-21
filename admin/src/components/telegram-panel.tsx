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
    notify_loyalty: true,
    topic_order: "",
    topic_reservation: "",
    topic_omakase: "",
    topic_loyalty: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTarget, setTestingTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
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

  const handleTest = async (topicId?: string, label?: string) => {
    setError(null);
    setTestingTarget(label || "main");
    setTestSuccessMessage(null);
    try {
      const res = await testTelegramBot(settings.bot_token, settings.chat_id, topicId);
      if (!res.success) {
        setError(res.error || "Gửi tin thử nghiệm không thành công");
      } else {
        const dest = label ? `vào topic [${label}]` : topicId ? `vào Topic #${topicId}` : "đến kênh chính";
        setTestSuccessMessage(`Tin nhắn thử nghiệm đã được gửi thành công ${dest}!`);
        setTimeout(() => setTestSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError("Lỗi gửi thử nghiệm: " + err.message);
    } finally {
      setTestingTarget(null);
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
        subtitle="Tự động phát chuông và phân luồng thông báo đơn hàng, đặt bàn, tích điểm vào các Topic chuyên biệt."
      />

      {error && <ErrorBar error={error} />}

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-sm text-emerald-400">
          <IconCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Đã lưu cấu hình Telegram thành công!</span>
        </div>
      )}

      {testSuccessMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 border border-sky-500/30 p-3.5 text-sm text-sky-400">
          <IconCheck className="h-4 w-4 shrink-0 text-sky-400" />
          <span>{testSuccessMessage}</span>
        </div>
      )}

      {/* Cấu hình kết nối cơ bản */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="font-semibold text-washi text-[15px]">
              Kích hoạt hệ thống thông báo Telegram
            </div>
            <div className="text-xs text-muted mt-0.5">
              Tạm dừng hoặc tiếp tục nhận thông báo tự động từ Miyako Zalo Mini App
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

          <Field label="Chat ID Nhóm (ID Telegram Supergroup)" required>
            <Input
              type="text"
              placeholder="Ví dụ: -1001234567890 (có dấu trừ phía trước)"
              value={settings.chat_id}
              onChange={(e) => setSettings({ ...settings, chat_id: e.target.value })}
              className="font-mono text-[13px]"
            />
          </Field>
        </div>

        {/* ── Phân luồng theo từng Topic (Forum Threads) ── */}
        <div className="space-y-3 pt-4 border-t border-line">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-washi flex items-center gap-1.5">
                <span>💬 Phân Luồng Topic (Chủ Đề Nhóm Diễn Đàn)</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Forum Topics
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Nhập <b>Topic ID</b> (số nguyên) cho từng nhóm nghiệp vụ. Để trống nếu muốn gửi về kênh Chung (General).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {/* 1. Topic Đơn Hàng */}
            <div className="p-3 rounded-xl bg-surface/70 border border-line/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-washi flex items-center gap-1.5">
                  🥢 <span>Topic Đơn Hàng</span>
                </span>
                <button
                  type="button"
                  disabled={!settings.topic_order.trim() || !settings.bot_token || !settings.chat_id}
                  onClick={() => handleTest(settings.topic_order, "Đơn Hàng")}
                  className="text-[11px] text-shu hover:underline disabled:opacity-30 disabled:no-underline"
                >
                  {testingTarget === "Đơn Hàng" ? "Đang gửi..." : "Gửi thử"}
                </button>
              </div>
              <p className="text-[11px] text-muted line-clamp-1">
                Gọi món tại bàn, mang về, giao hàng
              </p>
              <Input
                type="text"
                placeholder="Ví dụ: 2"
                value={settings.topic_order}
                onChange={(e) => setSettings({ ...settings, topic_order: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            {/* 2. Topic Đặt Bàn Thường */}
            <div className="p-3 rounded-xl bg-surface/70 border border-line/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-washi flex items-center gap-1.5">
                  🪑 <span>Topic Đặt Bàn Thường</span>
                </span>
                <button
                  type="button"
                  disabled={!settings.topic_reservation.trim() || !settings.bot_token || !settings.chat_id}
                  onClick={() => handleTest(settings.topic_reservation, "Đặt Bàn Thường")}
                  className="text-[11px] text-shu hover:underline disabled:opacity-30 disabled:no-underline"
                >
                  {testingTarget === "Đặt Bàn Thường" ? "Đang gửi..." : "Gửi thử"}
                </button>
              </div>
              <p className="text-[11px] text-muted line-clamp-1">
                Đặt bàn Ala Carte, bàn tiệc chung
              </p>
              <Input
                type="text"
                placeholder="Ví dụ: 4"
                value={settings.topic_reservation}
                onChange={(e) => setSettings({ ...settings, topic_reservation: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            {/* 3. Topic Đặt Bàn Omakase */}
            <div className="p-3 rounded-xl bg-surface/70 border border-line/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-washi flex items-center gap-1.5">
                  🍣 <span>Topic Đặt Bàn Omakase</span>
                </span>
                <button
                  type="button"
                  disabled={!settings.topic_omakase.trim() || !settings.bot_token || !settings.chat_id}
                  onClick={() => handleTest(settings.topic_omakase, "Đặt Bàn Omakase")}
                  className="text-[11px] text-shu hover:underline disabled:opacity-30 disabled:no-underline"
                >
                  {testingTarget === "Đặt Bàn Omakase" ? "Đang gửi..." : "Gửi thử"}
                </button>
              </div>
              <p className="text-[11px] text-muted line-clamp-1">
                Tiệc Bếp Trưởng, suất Omakase & ghế bar
              </p>
              <Input
                type="text"
                placeholder="Ví dụ: 7"
                value={settings.topic_omakase}
                onChange={(e) => setSettings({ ...settings, topic_omakase: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>

            {/* 4. Topic Tích Điểm & Hội Viên */}
            <div className="p-3 rounded-xl bg-surface/70 border border-line/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-washi flex items-center gap-1.5">
                  👑 <span>Topic Khách Tích Điểm</span>
                </span>
                <button
                  type="button"
                  disabled={!settings.topic_loyalty.trim() || !settings.bot_token || !settings.chat_id}
                  onClick={() => handleTest(settings.topic_loyalty, "Tích Điểm & Hội Viên")}
                  className="text-[11px] text-shu hover:underline disabled:opacity-30 disabled:no-underline"
                >
                  {testingTarget === "Tích Điểm & Hội Viên" ? "Đang gửi..." : "Gửi thử"}
                </button>
              </div>
              <p className="text-[11px] text-muted line-clamp-1">
                Đổi quà voucher, cộng điểm, hạng VIP
              </p>
              <Input
                type="text"
                placeholder="Ví dụ: 10"
                value={settings.topic_loyalty}
                onChange={(e) => setSettings({ ...settings, topic_loyalty: e.target.value })}
                className="font-mono text-xs h-8"
              />
            </div>
          </div>
        </div>

        {/* Các tuỳ chọn bật tắt loại thông báo */}
        <div className="space-y-3 pt-4 border-t border-line">
          <div className="text-xs font-semibold text-faint uppercase tracking-wider">
            Sự kiện bật thông báo
          </div>

          <div className="flex items-center justify-between py-1.5">
            <div>
              <div className="text-sm font-medium text-washi">
                🍣 Thông báo khi có khách Đặt bàn mới
              </div>
              <div className="text-xs text-muted">
                Áp dụng cho cả Đặt bàn thường và tiệc Omakase (phân luồng theo topic tương ứng)
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
                Chi tiết món, bàn số hoặc địa chỉ giao hàng và tổng tiền
              </div>
            </div>
            <Toggle
              checked={settings.notify_order}
              onChange={(checked) => setSettings({ ...settings, notify_order: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-1.5 border-t border-line/50">
            <div>
              <div className="text-sm font-medium text-washi">
                👑 Thông báo khi Khách tích điểm & Đổi thưởng
              </div>
              <div className="text-xs text-muted">
                Khi khách hàng đổi voucher bằng điểm hoặc hoàn tất đơn tích điểm
              </div>
            </div>
            <Toggle
              checked={settings.notify_loyalty}
              onChange={(checked) => setSettings({ ...settings, notify_loyalty: checked })}
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-line">
          <Button
            variant="secondary"
            onClick={() => handleTest()}
            disabled={!!testingTarget || !settings.bot_token.trim() || !settings.chat_id.trim()}
          >
            {testingTarget === "main" ? "Đang gửi thử..." : "🔔 Gửi thử kênh chính (General)"}
          </Button>

          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cấu hình Telegram"}
          </Button>
        </div>
      </Card>

      {/* Hướng dẫn thiết lập Telegram Forum & Lấy Topic ID */}
      <Card className="p-5 bg-surface/50 border border-line">
        <div className="font-semibold text-washi text-sm mb-2 flex items-center gap-2">
          <span>📘 Cách bật Topic trên Telegram và lấy Topic ID</span>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-xs text-muted leading-relaxed">
          <li>
            <b>Bật tính năng Topics:</b> Trong Telegram, mở Nhóm quản lý nhà hàng -&gt; Bấm vào tên nhóm -&gt; <b>Edit (Chỉnh sửa)</b> -&gt; Bật mục <b>Topics (Chủ đề / Diễn đàn)</b> -&gt; Lưu lại.
          </li>
          <li>
            <b>Tạo các Topic:</b> Tạo 4 Topic mới tương ứng:
            <span className="text-washi font-medium"> Đơn hàng</span>,
            <span className="text-washi font-medium"> Đặt bàn thường</span>,
            <span className="text-washi font-medium"> Đặt bàn Omakase</span>, và
            <span className="text-washi font-medium"> Khách tích điểm</span>.
          </li>
          <li>
            <b>Lấy Topic ID:</b>
            <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-faint">
              <li>Trên máy tính hoặc điện thoại: Nhấn chuột phải (hoặc nhấn giữ) vào Topic hoặc 1 tin nhắn bất kỳ trong topic -&gt; Chọn <b className="text-washi">Copy Link (Sao chép liên kết)</b>.</li>
              <li>Link sẽ có dạng: <code className="bg-surface-2 px-1 rounded text-washi font-mono">https://t.me/c/2145678901/45</code> hoặc <code className="bg-surface-2 px-1 rounded text-washi font-mono">.../45/123</code>.</li>
              <li>Con số ngay sau ID nhóm (ví dụ số <b className="text-amber-400 font-mono">45</b>) chính là <b>Topic ID</b>.</li>
            </ul>
          </li>
          <li>
            Điền các con số Topic ID vào các ô ở trên, sau đó nhấn <b>"Gửi thử"</b> để kiểm tra tin nhắn có bay vào đúng Topic không!
          </li>
        </ol>
      </Card>
    </div>
  );
}
