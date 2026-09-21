import { useCallback, useEffect, useState } from "react";

import { IconPlus, IconTrash } from "@/components/icons";
import ImageUpload from "@/components/image-upload";
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
  Toggle,
} from "@/components/ui";
import {
  TranslationEditor,
  fromI18nDraft,
  toI18nDraft,
  type I18nDraft,
  type TransField,
} from "@/components/translations";
import { slugify, vnd } from "@/lib/format";
import {
  supabase,
  type OmakaseCourse,
  type OmakaseSet,
} from "@/lib/supabase";

interface CourseDraft {
  section: string;
  items: string;
}

/** Ca phục vụ; "both" = suất bán cả trưa lẫn tối. */
type Service = "lunch" | "dinner" | "both";

const SERVICE_LABEL: Record<Service, string> = {
  lunch: "Suất trưa",
  dinner: "Suất tối",
  both: "Suất trưa & tối",
};

/** Suất omakase: khách đọc tên, phụ đề và phần giới thiệu. */
const SET_TRANS: TransField[] = [
  { key: "name", label: "Tên suất" },
  { key: "subtitle", label: "Phụ đề" },
  { key: "description", label: "Giới thiệu", multiline: true },
];

interface Draft {
  id: string;
  name: string;
  jp: string;
  subtitle: string;
  price: string;
  service: Service;
  description: string;
  image_path: string | null;
  menu_pending: boolean;
  is_active: boolean;
  courses: CourseDraft[];
  i18n: I18nDraft;
}

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  jp: "",
  subtitle: "",
  price: "",
  service: "dinner",
  description: "",
  image_path: null,
  menu_pending: true,
  is_active: true,
  courses: [],
  i18n: toI18nDraft(null, SET_TRANS),
});

const toLines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

export default function OmakasePage() {
  const [sets, setSets] = useState<OmakaseSet[] | null>(null);
  const [courses, setCourses] = useState<Record<string, OmakaseCourse[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const [s, c] = await Promise.all([
      supabase.from("omakase_sets").select("*").order("sort_order"),
      supabase.from("omakase_courses").select("*").order("sort_order"),
    ]);
    if (s.error || c.error) setError((s.error || c.error)!.message);
    setSets(s.data ?? []);
    const grouped: Record<string, OmakaseCourse[]> = {};
    for (const row of c.data ?? []) (grouped[row.set_id] ??= []).push(row);
    setCourses(grouped);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (s: OmakaseSet) => {
    setDraft({
      id: s.id,
      name: s.name,
      jp: s.jp ?? "",
      subtitle: s.subtitle ?? "",
      price: String(s.price),
      service: s.service as Service,
      description: s.description ?? "",
      image_path: s.image_path ?? null,
      menu_pending: s.menu_pending,
      is_active: s.is_active,
      courses: (courses[s.id] ?? []).map((c) => ({
        section: c.section,
        items: (c.items ?? []).join("\n"),
      })),
      i18n: toI18nDraft(s.i18n, SET_TRANS),
    });
    setIsNew(false);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Suất phải có tên.");
      return;
    }
    const price = Number(draft.price.replace(/\D/g, ""));
    if (!price) {
      setError("Suất phải có giá.");
      return;
    }

    setSaving(true);
    setError(null);
    const id = isNew ? draft.id.trim() || slugify(draft.name) : draft.id;

    const { error: setErr } = await supabase.from("omakase_sets").upsert({
      id,
      name: draft.name.trim(),
      jp: draft.jp.trim() || null,
      subtitle: draft.subtitle.trim() || null,
      price,
      service: draft.service,
      description: draft.description.trim() || null,
      image_path: draft.image_path?.trim() || null,
      menu_pending: draft.menu_pending,
      is_active: draft.is_active,
      i18n: fromI18nDraft(draft.i18n, SET_TRANS),
    });
    if (setErr) {
      setSaving(false);
      setError(
        setErr.code === "23505" ? `Mã suất "${id}" đã tồn tại.` : setErr.message
      );
      return;
    }

    await supabase.from("omakase_courses").delete().eq("set_id", id);
    const rows = draft.courses
      .filter((c) => c.section.trim() && toLines(c.items).length)
      .map((c, i) => ({
        set_id: id,
        section: c.section.trim(),
        items: toLines(c.items),
        sort_order: i,
      }));
    if (rows.length) {
      const { error: insErr } = await supabase.from("omakase_courses").insert(rows);
      if (insErr) {
        setSaving(false);
        setError(insErr.message);
        return;
      }
    }

    setSaving(false);
    setDraft(null);
    load();
  };

  const remove = async () => {
    if (!draft) return;
    setDeleting(true);
    const { error } = await supabase.from("omakase_sets").delete().eq("id", draft.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "Suất này đã có khách đặt nên không xoá được. Hãy tắt “Đang phục vụ” thay vì xoá."
          : error.message
      );
      return;
    }
    setDraft(null);
    load();
  };

  const patchDraft = (v: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...v } : d));

  return (
    <>
      <SectionHeading
        title="Omakase"
        subtitle={sets ? `${sets.length} suất` : "Đang tải…"}
        action={
          <Button
            size="sm"
            onClick={() => {
              setDraft(emptyDraft());
              setIsNew(true);
            }}
          >
            <IconPlus size={15} /> Thêm suất
          </Button>
        }
      />

      <ErrorBar error={error} />

      {sets === null ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-xl" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <Card>
          <EmptyState kanji="無" title="Chưa có suất omakase nào" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sets.map((s) => {
            const cs = courses[s.id] ?? [];
            const dishCount = cs.reduce((n, c) => n + (c.items?.length ?? 0), 0);
            return (
              <button
                key={s.id}
                onClick={() => openEdit(s)}
                className="data-row flex w-full items-center gap-4 rounded-xl border border-line bg-surface p-4 text-left transition"
              >
                {s.image_path ? (
                  <img
                    src={s.image_path}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover border border-line"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-surface2 text-[12px] text-faint">
                    Omakase
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[17px]">{s.name}</span>
                    {s.jp && <span className="text-[13px] text-gold">{s.jp}</span>}
                    {!s.is_active && <Pill tone="faint">Ngừng phục vụ</Pill>}
                    {s.menu_pending && <Pill tone="gold">Thực đơn chờ cập nhật</Pill>}
                  </div>
                  <div className="mt-1 text-[13px] text-muted">
                    {SERVICE_LABEL[s.service as Service] ?? s.service}
                    {dishCount > 0 ? ` · ${dishCount} món` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-[17px] tabular-nums text-gold">
                    {vnd(s.price)}
                  </div>
                  <div className="text-[11px] text-faint">/ khách</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        title={isNew ? "Thêm suất omakase" : draft?.name || "Sửa suất"}
        footer={
          <div className="flex items-center justify-between gap-2">
            {!isNew ? (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                <IconTrash size={15} /> Xoá
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Thôi
              </Button>
              <Button loading={saving} onClick={save}>
                Lưu
              </Button>
            </div>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên suất" required>
                <Input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Kaze Omakase"
                />
              </Field>
              <Field label="Tiếng Nhật">
                <Input
                  value={draft.jp}
                  onChange={(e) => patchDraft({ jp: e.target.value })}
                  placeholder="夏風"
                />
              </Field>
              <Field label="Phụ đề">
                <Input
                  value={draft.subtitle}
                  onChange={(e) => patchDraft({ subtitle: e.target.value })}
                  placeholder="Kaze — Làn gió mùa hè"
                />
              </Field>
              <Field label="Ca phục vụ" required>
                <Select
                  value={draft.service}
                  onChange={(e) =>
                    patchDraft({ service: e.target.value as Service })
                  }
                >
                  <option value="lunch">Trưa</option>
                  <option value="dinner">Tối</option>
                  <option value="both">Cả trưa và tối</option>
                </Select>
              </Field>
              <Field label="Giá mỗi khách (VND)" required>
                <Input
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => patchDraft({ price: e.target.value })}
                  placeholder="3000000"
                />
              </Field>
              {isNew && (
                <Field label="Mã suất" hint="Bỏ trống thì tự tạo từ tên">
                  <Input
                    value={draft.id}
                    onChange={(e) => patchDraft({ id: e.target.value })}
                    placeholder={slugify(draft.name) || "kaze"}
                  />
                </Field>
              )}
            </div>

            <ImageUpload
              value={draft.image_path}
              onChange={(url) => patchDraft({ image_path: url })}
              folder="omakase"
              label="Ảnh suất Omakase (Supabase Storage)"
            />

            <Field label="Giới thiệu" hint="Cách nhau một dòng trống để tách đoạn">
              <Textarea
                value={draft.description}
                onChange={(e) => patchDraft({ description: e.target.value })}
                className="min-h-[130px]"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Đang phục vụ">
                <div className="flex h-[38px] items-center gap-3">
                  <Toggle
                    checked={draft.is_active}
                    onChange={(v) => patchDraft({ is_active: v })}
                  />
                  <span className="text-[13px] text-muted">
                    {draft.is_active ? "Khách đặt được" : "Ẩn khỏi mini app"}
                  </span>
                </div>
              </Field>
              <Field
                label="Thực đơn chờ cập nhật"
                hint="Bật khi bếp chưa chốt món. Mini app sẽ ghi “đang cập nhật” thay vì hiện danh sách trống."
              >
                <div className="flex h-[38px] items-center gap-3">
                  <Toggle
                    checked={draft.menu_pending}
                    onChange={(v) => patchDraft({ menu_pending: v })}
                  />
                  <span className="text-[13px] text-muted">
                    {draft.menu_pending ? "Đang ẩn trình tự món" : "Hiện trình tự món"}
                  </span>
                </div>
              </Field>
            </div>

            {/* Trình tự món */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
                  Trình tự món
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    patchDraft({
                      courses: [...draft.courses, { section: "", items: "" }],
                    })
                  }
                >
                  <IconPlus size={14} /> Thêm phần
                </Button>
              </div>

              {draft.courses.length === 0 ? (
                <p className="text-[12px] text-faint">
                  Chưa có phần nào. Ví dụ: Khai vị · Sashimi · Sushi &amp; món chính ·
                  Tráng miệng.
                </p>
              ) : (
                <div className="space-y-3">
                  {draft.courses.map((c, i) => (
                    <Card key={i} className="p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          value={c.section}
                          onChange={(e) => {
                            const next = [...draft.courses];
                            next[i] = { ...c, section: e.target.value };
                            patchDraft({ courses: next });
                          }}
                          placeholder="Tên phần, ví dụ Sashimi"
                          className="flex-1"
                        />
                        <button
                          onClick={() =>
                            patchDraft({
                              courses: draft.courses.filter((_, j) => j !== i),
                            })
                          }
                          aria-label="Xoá phần"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                      <Textarea
                        value={c.items}
                        onChange={(e) => {
                          const next = [...draft.courses];
                          next[i] = { ...c, items: e.target.value };
                          patchDraft({ courses: next });
                        }}
                        placeholder={"Mỗi dòng một món\nSò điệp\nBụng cá ngừ"}
                        className="min-h-[76px]"
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <TranslationEditor
              fields={SET_TRANS}
              draft={draft.i18n}
              onChange={(i18n) => patchDraft({ i18n })}
              entity="omakase_sets"
              id={isNew ? undefined : draft.id}
              stale={
                !isNew &&
                (sets ?? []).some(
                  (x) => x.id === draft.id && x.i18n_hash !== x.i18n_src_hash
                )
              }
              onTranslated={async () => {
                const fresh = (
                  await supabase
                    .from("omakase_sets")
                    .select("i18n")
                    .eq("id", draft.id)
                    .single()
                ).data;
                if (fresh) patchDraft({ i18n: toI18nDraft(fresh.i18n, SET_TRANS) });
                load();
              }}
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xoá suất omakase"
        danger
        confirmLabel="Xoá"
        loading={deleting}
        onConfirm={remove}
        body={
          <>
            Xoá hẳn “{draft?.name}”. Nếu chỉ muốn tạm ngừng, hãy tắt “Đang phục vụ”
            để giữ lại lịch sử đặt bàn.
          </>
        }
      />
    </>
  );
}
