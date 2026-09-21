import { useEffect, useState } from "react";

import { slugify } from "@/lib/format";
import { supabase, type Category } from "@/lib/supabase";

import { IconPlus, IconTrash } from "./icons";
import {
  Button,
  Card,
  ConfirmModal,
  ErrorBar,
  Field,
  Input,
  Modal,
  Toggle,
} from "./ui";

interface Draft {
  id: string;
  name: string;
  jp: string;
  romaji: string;
  is_active: boolean;
  isNew: boolean;
}

/**
 * Thêm, sửa, xoá nhóm món.
 *
 * Nhóm đang có món thì không xoá được — khoá ngoại của CSDL chặn lại, và đó
 * là điều đúng: xoá nhóm mà mất luôn 20 món thì tai hại hơn nhiều.
 */
export default function CategoryManager({
  open,
  onClose,
  onChanged,
  dishCounts,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  dishCounts: Record<string, number>;
}) {
  const [rows, setRows] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) setError(error.message);
    setRows(data ?? []);
  };

  useEffect(() => {
    if (open) {
      setError(null);
      load();
    }
  }, [open]);

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Nhóm phải có tên.");
      return;
    }
    setSaving(true);
    setError(null);
    const id = draft.isNew ? draft.id.trim() || slugify(name) : draft.id;
    const { error } = await supabase.from("categories").upsert({
      id,
      name,
      jp: draft.jp.trim() || null,
      romaji: draft.romaji.trim() || null,
      is_active: draft.is_active,
      sort_order: draft.isNew ? rows.length : undefined,
    });
    setSaving(false);
    if (error) {
      setError(
        error.code === "23505" ? `Mã nhóm "${id}" đã tồn tại.` : error.message
      );
      return;
    }
    setDraft(null);
    await load();
    onChanged();
  };

  const remove = async (c: Category) => {
    setError(null);
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    setConfirmDelete(null);
    if (error) {
      setError(
        error.code === "23503"
          ? `Nhóm "${c.name}" còn món bên trong nên không xoá được. Chuyển các món sang nhóm khác trước, hoặc chỉ cần tắt hiển thị.`
          : error.message
      );
      return;
    }
    await load();
    onChanged();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    await Promise.all(
      next.map((c, i) =>
        supabase.from("categories").update({ sort_order: i }).eq("id", c.id)
      )
    );
    onChanged();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Nhóm món"
        footer={
          <div className="flex justify-between gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setDraft({
                  id: "",
                  name: "",
                  jp: "",
                  romaji: "",
                  is_active: true,
                  isNew: true,
                })
              }
            >
              <IconPlus size={15} /> Thêm nhóm
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Xong
            </Button>
          </div>
        }
      >
        <ErrorBar error={error} />
        <p className="mb-3 text-[12px] leading-relaxed text-faint">
          Thứ tự ở đây chính là thứ tự các nhóm hiện trong mini app.
        </p>
        <Card className="divide-y divide-line">
          {rows.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Lên"
                  className="px-1 text-[11px] leading-tight text-muted hover:text-washi disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Xuống"
                  className="px-1 text-[11px] leading-tight text-muted hover:text-washi disabled:opacity-25"
                >
                  ▼
                </button>
              </div>
              <button
                onClick={() =>
                  setDraft({
                    id: c.id,
                    name: c.name,
                    jp: c.jp ?? "",
                    romaji: c.romaji ?? "",
                    is_active: c.is_active,
                    isNew: false,
                  })
                }
                className="min-w-0 flex-1 text-left"
              >
                <div
                  className={`text-[14px] font-medium ${
                    c.is_active ? "" : "text-faint line-through"
                  }`}
                >
                  {c.name}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {c.jp} · {dishCounts[c.id] ?? 0} món
                </div>
              </button>
              <button
                onClick={() => setConfirmDelete(c)}
                aria-label={`Xoá ${c.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))}
        </Card>
      </Modal>

      {/* Soạn nhóm */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.isNew ? "Thêm nhóm món" : `Sửa ${draft?.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Thôi
            </Button>
            <Button loading={saving} onClick={save}>
              Lưu
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Tên nhóm" required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Khai vị"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tiếng Nhật">
                <Input
                  value={draft.jp}
                  onChange={(e) => setDraft({ ...draft, jp: e.target.value })}
                  placeholder="付き出し"
                />
              </Field>
              <Field label="Romaji">
                <Input
                  value={draft.romaji}
                  onChange={(e) => setDraft({ ...draft, romaji: e.target.value })}
                  placeholder="Tsukidashi"
                />
              </Field>
            </div>
            {draft.isNew && (
              <Field label="Mã nhóm" hint="Bỏ trống thì tự tạo từ tên">
                <Input
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  placeholder={slugify(draft.name) || "khai-vi"}
                />
              </Field>
            )}
            <Field label="Hiển thị trong mini app">
              <div className="flex h-[38px] items-center gap-3">
                <Toggle
                  checked={draft.is_active}
                  onChange={(v) => setDraft({ ...draft, is_active: v })}
                />
                <span className="text-[13px] text-muted">
                  {draft.is_active ? "Khách nhìn thấy nhóm này" : "Đang ẩn"}
                </span>
              </div>
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Xoá nhóm món"
        danger
        confirmLabel="Xoá"
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        body={
          <>
            Xoá nhóm “{confirmDelete?.name}”.
            {(dishCounts[confirmDelete?.id ?? ""] ?? 0) > 0 && (
              <>
                {" "}
                Nhóm này còn {dishCounts[confirmDelete?.id ?? ""]} món nên nhiều
                khả năng sẽ không xoá được — hãy chuyển món sang nhóm khác, hoặc
                chỉ tắt hiển thị.
              </>
            )}
          </>
        }
      />
    </>
  );
}
