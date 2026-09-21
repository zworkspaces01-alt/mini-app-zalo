import { useCallback, useEffect, useState } from "react";

import { Button, Card, ConfirmModal, Pill, Skeleton } from "@/components/ui";
import {
  ENTITY_LABEL,
  translateAll,
  translationStatus,
  type Entity,
  type TranslateStatus,
} from "@/lib/translate";

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
};

/**
 * Bảng theo dõi việc dịch nội dung sang tiếng Anh và tiếng Nhật.
 *
 * Tiếng Việt là bản gốc và không bao giờ bị đụng tới. Dịch xong, mini app
 * hiện bản dịch cho khách chọn ngôn ngữ đó; ô nào chưa dịch thì khách vẫn
 * thấy tiếng Việt, nên dịch dở dang cũng không làm hỏng màn hình nào.
 */
export default function LanguagePanel() {
  const [status, setStatus] = useState<TranslateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; left: number } | null>(
    null
  );
  const [confirmForce, setConfirmForce] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await translationStatus());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (force: boolean) => {
    setRunning(true);
    setError(null);
    setProgress({ done: 0, left: status?.pending ?? 0 });
    try {
      const res = await translateAll({ force }, (done, left) =>
        setProgress({ done, left })
      );
      if (res.failures?.length) setError(res.failures.join(" · "));
      else if (res.remaining > 0) {
        setError(
          `Còn ${res.remaining} mục chưa dịch được. Bấm lại để tiếp tục, hoặc kiểm tra khoá AI.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      refresh();
    }
  };

  if (!status && !error) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const providers = status?.providers ?? [];
  const pending = status?.pending ?? 0;

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">Dịch tự động</div>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
              Nội dung gốc là tiếng Việt. Máy dịch sang tiếng Anh và tiếng Nhật
              rồi lưu riêng — sửa lại chỗ nào cũng được, bản gốc không đổi.
            </p>
          </div>
          {providers.length > 0 ? (
            <Pill tone="jade">
              {providers.map((p) => PROVIDER_LABEL[p] ?? p).join(" → ")}
            </Pill>
          ) : (
            <Pill tone="shu">Chưa có khoá AI</Pill>
          )}
        </div>

        {providers.length === 0 && (
          <p className="rounded-lg bg-surface2 p-3 text-[12px] leading-relaxed text-faint">
            Đặt <code className="text-washi">GROQ_API_KEY</code> hoặc{" "}
            <code className="text-washi">GEMINI_API_KEY</code> cho Edge Function
            rồi tải lại trang. Khoá lấy ở console.groq.com/keys hoặc
            aistudio.google.com/apikey.
          </p>
        )}

        {status && (
          <div className="rounded-lg border border-line">
            {Object.entries(status.by)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([entity, b]) => (
                <div
                  key={entity}
                  className="flex items-center justify-between border-b border-line px-3.5 py-2.5 text-[13px] last:border-0"
                >
                  <span>{ENTITY_LABEL[entity as Entity] ?? entity}</span>
                  <span className="tabular-nums text-muted">
                    {b.pending === 0 ? (
                      <Pill tone="jade">Đã dịch đủ</Pill>
                    ) : (
                      <>
                        còn <b className="text-gold">{b.pending}</b> / {b.total}
                      </>
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}

        {progress && running && (
          <p className="text-[13px] text-muted">
            Đang dịch… đã xong {progress.done} mục, còn {progress.left}.
          </p>
        )}

        {error && <p className="text-[12px] leading-relaxed text-shu">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            loading={running}
            disabled={providers.length === 0 || pending === 0}
            onClick={() => run(false)}
          >
            {pending === 0
              ? "Không còn gì để dịch"
              : `Dịch ${pending} mục còn thiếu`}
          </Button>
          <Button
            variant="secondary"
            disabled={running || providers.length === 0}
            onClick={() => setConfirmForce(true)}
          >
            Dịch lại toàn bộ
          </Button>
          <Button variant="ghost" disabled={running} onClick={refresh}>
            Xem lại số liệu
          </Button>
        </div>
      </Card>

      <ConfirmModal
        open={confirmForce}
        onClose={() => setConfirmForce(false)}
        title="Dịch lại toàn bộ"
        confirmLabel="Dịch lại"
        onConfirm={() => {
          setConfirmForce(false);
          run(true);
        }}
        body={
          <>
            Máy sẽ dịch lại cả những mục đã có bản dịch, kể cả những chỗ nhân
            viên đã sửa tay — các sửa đổi đó sẽ bị ghi đè. Bản tiếng Việt không
            bị đụng tới.
          </>
        }
      />
    </div>
  );
}
