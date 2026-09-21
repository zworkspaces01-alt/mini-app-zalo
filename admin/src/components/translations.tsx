import { useState } from "react";

import { Button, Field, Input, Pill, Textarea } from "@/components/ui";
import { translateAll, type Entity } from "@/lib/translate";

/**
 * Ô nhập bản dịch Anh/Nhật cho một dòng nội dung.
 *
 * Tiếng Việt vẫn là bản gốc, nằm ở các ô phía trên trong cùng biểu mẫu. Ở
 * đây chỉ sửa bản dịch — bỏ trống thì mini app hiện lại tiếng Việt, nên
 * không điền cũng không hỏng gì.
 */

export type I18nDraft = Record<string, Record<string, string>>;

export interface TransField {
  key: string;
  label: string;
  /** Nhiều dòng: mô tả, chính sách. */
  multiline?: boolean;
  /** Danh sách mỗi dòng một mục — phải giữ đúng số dòng như bản tiếng Việt. */
  list?: boolean;
}

const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "Tiếng Anh" },
  { code: "ja", label: "Tiếng Nhật" },
];

/** Cột `i18n` từ CSDL → nháp để sửa trong biểu mẫu. */
export function toI18nDraft(value: unknown, fields: TransField[]): I18nDraft {
  const src =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, Record<string, unknown>>)
      : {};
  const out: I18nDraft = {};

  for (const { code } of LANGS) {
    const bag = src[code] ?? {};
    out[code] = {};
    for (const f of fields) {
      const v = bag[f.key];
      out[code][f.key] = Array.isArray(v)
        ? v.join("\n")
        : typeof v === "string"
        ? v
        : "";
    }
  }
  return out;
}

/** Nháp → giá trị ghi vào cột `i18n`. Ngôn ngữ trống thì không ghi khoá. */
export function fromI18nDraft(
  draft: I18nDraft,
  fields: TransField[]
): Record<string, Record<string, string | string[]>> {
  const out: Record<string, Record<string, string | string[]>> = {};

  for (const { code } of LANGS) {
    const bag: Record<string, string | string[]> = {};
    for (const f of fields) {
      const raw = (draft[code]?.[f.key] ?? "").trim();
      if (!raw) continue;
      bag[f.key] = f.list
        ? raw.split("\n").map((x) => x.trim()).filter(Boolean)
        : raw;
    }
    if (Object.keys(bag).length) out[code] = bag;
  }
  return out;
}

export function TranslationEditor({
  fields,
  draft,
  onChange,
  entity,
  id,
  stale,
  onTranslated,
}: {
  fields: TransField[];
  draft: I18nDraft;
  onChange: (next: I18nDraft) => void;
  /** Bảng và mã dòng — có thì hiện nút dịch riêng cho dòng này. */
  entity?: Entity;
  id?: string;
  /** true khi bản gốc đã sửa sau lần dịch gần nhất. */
  stale?: boolean;
  onTranslated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (code: string, key: string, value: string) =>
    onChange({ ...draft, [code]: { ...draft[code], [key]: value } });

  const translateThis = async () => {
    if (!entity || !id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await translateAll({ entities: [entity], ids: [id], force: true });
      if (res.failures?.length) setError(res.failures.join(" · "));
      onTranslated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface2 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
            Bản dịch
          </span>
          {stale && <Pill tone="gold">Bản gốc đã đổi</Pill>}
        </div>
        {entity && id && (
          <Button size="sm" variant="secondary" loading={busy} onClick={translateThis}>
            Dịch lại bằng AI
          </Button>
        )}
      </div>

      <p className="mb-3 text-[12px] text-faint">
        Bỏ trống ô nào thì mini app hiện lại tiếng Việt của ô đó. Dịch bằng AI
        xong nhớ đọc lại — tên món Nhật là chỗ máy hay sai nhất.
      </p>

      {error && (
        <p className="mb-3 text-[12px] text-shu">{error}</p>
      )}

      <div className="space-y-4">
        {LANGS.map((l) => (
          <div key={l.code}>
            <div className="mb-2 text-[12px] font-medium text-muted">
              {l.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  hint={f.list ? "Mỗi dòng một mục, đúng thứ tự bản tiếng Việt" : undefined}
                >
                  {f.multiline || f.list ? (
                    <Textarea
                      value={draft[l.code]?.[f.key] ?? ""}
                      onChange={(e) => patch(l.code, f.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={draft[l.code]?.[f.key] ?? ""}
                      onChange={(e) => patch(l.code, f.key, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
