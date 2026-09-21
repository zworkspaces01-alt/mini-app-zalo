import { useCallback, useEffect, useMemo, useState } from "react";

import CategoryManager from "@/components/category-manager";
import { IconPlus, IconSearch, IconTrash } from "@/components/icons";
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
import { deaccent, slugify, vnd } from "@/lib/format";

import {
  supabase,
  type Category,
  type Dish,
  type DishVariant,
} from "@/lib/supabase";

const BADGES = [
  { key: "signature", label: "Signature" },
  { key: "best-seller", label: "Best seller" },
  { key: "must-try", label: "Must try" },
] as const;

/** Những gì khách đọc được trên mini app — chỉ dịch từng ấy. */
const DISH_TRANS: TransField[] = [
  { key: "name", label: "Tên món" },
  { key: "description", label: "Mô tả", multiline: true },
  { key: "unit", label: "Định lượng" },
  { key: "includes", label: "Gồm những gì", list: true },
  { key: "gifts", label: "Set tặng kèm", list: true },
];

const isStale = (d: Dish) => d.i18n_hash !== d.i18n_src_hash;

type VariantDraft = Pick<DishVariant, "code" | "label" | "price" | "note"> & {
  id?: string;
};

interface Draft {
  id: string;
  category_id: string;
  name: string;
  romaji: string;
  jp: string;
  price: string;
  compare_at_price: string;
  unit: string;
  description: string;
  includes: string;
  gifts: string;
  badges: string[];
  source_page: string;
  is_available: boolean;
  image_path: string | null;
  variants: VariantDraft[];
  i18n: I18nDraft;
}

const emptyDraft = (categoryId: string): Draft => ({
  id: "",
  category_id: categoryId,
  name: "",
  romaji: "",
  jp: "",
  price: "",
  compare_at_price: "",
  unit: "",
  description: "",
  includes: "",
  gifts: "",
  badges: [],
  source_page: "",
  is_available: true,
  image_path: null,
  variants: [],
  i18n: toI18nDraft(null, DISH_TRANS),
});

const toDraft = (d: Dish, variants: DishVariant[]): Draft => ({
  id: d.id,
  category_id: d.category_id,
  name: d.name,
  romaji: d.romaji ?? "",
  jp: d.jp ?? "",
  price: d.price === null ? "" : String(d.price),
  compare_at_price: d.compare_at_price === null ? "" : String(d.compare_at_price),
  unit: d.unit ?? "",
  description: d.description ?? "",
  includes: (d.includes ?? []).join("\n"),
  gifts: (d.gifts ?? []).join("\n"),
  badges: d.badges ?? [],
  source_page: d.source_page ?? "",
  is_available: d.is_available,
  image_path: d.image_path ?? null,
  variants: variants.map((v) => ({
    id: v.id,
    code: v.code,
    label: v.label,
    price: v.price,
    note: v.note,
  })),
  i18n: toI18nDraft(d.i18n, DISH_TRANS),
});


const toLines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const toInt = (s: string): number | null => {
  const t = s.replace(/[^\d]/g, "");
  return t === "" ? null : Number(t);
};

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [variants, setVariants] = useState<Record<string, DishVariant[]>>({});
  const [categoryId, setCategoryId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [categoryManager, setCategoryManager] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const [cats, ds, vs] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("dishes").select("*").order("sort_order"),
      supabase.from("dish_variants").select("*").order("sort_order"),
    ]);
    const err = cats.error || ds.error || vs.error;
    if (err) setError(err.message);

    setCategories(cats.data ?? []);
    setDishes(ds.data ?? []);

    const grouped: Record<string, DishVariant[]> = {};
    for (const v of vs.data ?? []) (grouped[v.dish_id] ??= []).push(v);
    setVariants(grouped);

    setCategoryId((c) => c || cats.data?.[0]?.id || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dishCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of dishes ?? []) c[d.category_id] = (c[d.category_id] ?? 0) + 1;
    return c;
  }, [dishes]);

  const visible = useMemo(() => {
    const all = dishes ?? [];
    const q = deaccent(query.trim());
    if (q) {
      return all.filter((d) =>
        [d.name, d.romaji, d.jp].some((s) => s && deaccent(s).includes(q))
      );
    }
    return all.filter((d) => d.category_id === categoryId);
  }, [dishes, categoryId, query]);

  const toggleAvailable = async (dish: Dish, value: boolean) => {
    setDishes((prev) =>
      (prev ?? []).map((d) => (d.id === dish.id ? { ...d, is_available: value } : d))
    );
    const { error } = await supabase
      .from("dishes")
      .update({ is_available: value })
      .eq("id", dish.id);
    if (error) {
      setError(error.message);
      load();
    }
  };

  const openNew = () => {
    setDraft(emptyDraft(categoryId || categories[0]?.id || ""));
    setIsNew(true);
  };

  const openEdit = (d: Dish) => {
    setDraft(toDraft(d, variants[d.id] ?? []));
    setIsNew(false);
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Món phải có tên.");
      return;
    }

    const price = toInt(draft.price);
    if (price === null && draft.variants.length === 0) {
      setError("Món phải có giá, hoặc phải có ít nhất một phần để khách chọn.");
      return;
    }

    setSaving(true);
    setError(null);

    const id = isNew ? draft.id.trim() || slugify(name) : draft.id;
    const payload = {
      id,
      category_id: draft.category_id,
      name,
      romaji: draft.romaji.trim() || null,
      jp: draft.jp.trim() || null,
      price,
      compare_at_price: toInt(draft.compare_at_price),
      unit: draft.unit.trim() || null,
      description: draft.description.trim() || null,
      includes: toLines(draft.includes),
      gifts: toLines(draft.gifts),
      badges: draft.badges,
      source_page: draft.source_page.trim() || null,
      is_available: draft.is_available,
      image_path: draft.image_path?.trim() || null,
      i18n: fromI18nDraft(draft.i18n, DISH_TRANS),
    };

    const { error: dishErr } = await supabase.from("dishes").upsert(payload);
    if (dishErr) {
      setSaving(false);
      setError(
        dishErr.code === "23505"
          ? `Mã món "${id}" đã tồn tại. Đổi mã khác.`
          : dishErr.message
      );
      return;
    }

    // Đồng bộ các phần: xoá hết rồi ghi lại cho khỏi lệch.
    const { error: delErr } = await supabase
      .from("dish_variants")
      .delete()
      .eq("dish_id", id);
    if (delErr) {
      setSaving(false);
      setError(delErr.message);
      return;
    }

    const rows = draft.variants
      .filter((v) => v.label.trim())
      .map((v, i) => ({
        dish_id: id,
        code: v.code.trim() || slugify(v.label) || `v${i + 1}`,
        label: v.label.trim(),
        price: Number(v.price) || 0,
        note: v.note?.trim() || null,
        sort_order: i,
      }));

    if (rows.length) {
      const { error: insErr } = await supabase.from("dish_variants").insert(rows);
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
    const { error } = await supabase.from("dishes").delete().eq("id", draft.id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      setError(
        error.code === "23503"
          ? "Món này đã nằm trong đơn cũ nên không xoá được. Hãy tắt “Còn phục vụ” thay vì xoá."
          : error.message
      );
      return;
    }
    setDraft(null);
    load();
  };

  const patchDraft = (v: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...v } : d));

  return (
    <>
      <SectionHeading
        title="Thực đơn"
        subtitle={dishes ? `${dishes.length} món` : "Đang tải…"}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCategoryManager(true)}
            >
              Nhóm món
            </Button>
            <Button size="sm" onClick={openNew}>
              <IconPlus size={15} /> Thêm món
            </Button>
          </div>
        }
      />

      <ErrorBar error={error} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm món trong toàn bộ thực đơn"
            className="!pl-9"
          />
        </div>
      </div>

      {!query && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const n = dishCounts[c.id] ?? 0;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition ${
                  categoryId === c.id
                    ? "bg-washi font-medium text-sumi"
                    : "border border-line bg-surface2 text-muted hover:text-washi"
                }`}
              >
                {c.name}
                <span className="ml-1.5 opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {dishes === null ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px] w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            kanji="無"
            title={query ? "Không tìm thấy món nào" : "Nhóm này chưa có món"}
            action={<Button onClick={openNew}>Thêm món</Button>}
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {visible.map((d) => {
            const vs = variants[d.id] ?? [];
            const price =
              d.price !== null
                ? vnd(d.price)
                : vs.length
                ? `từ ${vnd(Math.min(...vs.map((v) => v.price)))}`
                : "—";
            return (
              <div key={d.id} className="data-row flex items-center gap-3 px-4 py-3">
                {d.image_path ? (
                  <img
                    src={d.image_path}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover border border-line"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface2 text-[10px] text-faint">
                    No img
                  </div>
                )}
                <button
                  onClick={() => openEdit(d)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[14px] font-medium ${
                        d.is_available ? "" : "text-faint line-through"
                      }`}
                    >
                      {d.name}
                    </span>
                    {(d.badges ?? []).map((b) => (
                      <Pill key={b} tone={b === "best-seller" ? "gold" : "shu"}>
                        {BADGES.find((x) => x.key === b)?.label ?? b}
                      </Pill>
                    ))}
                    {isStale(d) && <Pill tone="gold">Chưa dịch</Pill>}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {d.romaji || d.id}
                    {d.unit ? ` · ${d.unit}` : ""}
                    {vs.length ? ` · ${vs.length} phần` : ""}
                  </div>
                </button>
                <div className="shrink-0 text-right text-[14px] tabular-nums">
                  {price}
                </div>
                <Toggle
                  checked={d.is_available}
                  onChange={(v) => toggleAvailable(d, v)}
                  label={`Còn phục vụ: ${d.name}`}
                />
              </div>
            );
          })}
        </Card>
      )}

      {/* Trình soạn món */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        title={isNew ? "Thêm món" : draft?.name || "Sửa món"}
        footer={
          <div className="flex items-center justify-between gap-2">
            {!isNew ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
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
              <Field label="Tên món (tiếng Việt)" required>
                <Input
                  value={draft.name}
                  onChange={(e) => patchDraft({ name: e.target.value })}
                  placeholder="Mai cua nướng"
                />
              </Field>
              <Field label="Nhóm món" required>
                <Select
                  value={draft.category_id}
                  onChange={(e) => patchDraft({ category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Romaji">
                <Input
                  value={draft.romaji}
                  onChange={(e) => patchDraft({ romaji: e.target.value })}
                  placeholder="Kani Miso Yaki"
                />
              </Field>
              <Field label="Tiếng Nhật">
                <Input
                  value={draft.jp}
                  onChange={(e) => patchDraft({ jp: e.target.value })}
                  placeholder="カニ味噌焼き"
                />
              </Field>
            </div>

            {isNew && (
              <Field
                label="Mã món"
                hint="Bỏ trống thì hệ thống tự tạo từ tên. Không đổi được sau khi lưu."
              >
                <Input
                  value={draft.id}
                  onChange={(e) => patchDraft({ id: e.target.value })}
                  placeholder={slugify(draft.name) || "kani-miso-yaki"}
                />
              </Field>
            )}

            <ImageUpload
              value={draft.image_path}
              onChange={(url) => patchDraft({ image_path: url })}
              folder="dishes"
              label="Ảnh món ăn (Supabase Storage)"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Giá (VND)"
                hint={
                  draft.variants.length
                    ? "Để trống vì món bán theo phần"
                    : "Ví dụ 199000"
                }
              >
                <Input
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => patchDraft({ price: e.target.value })}
                  placeholder="199000"
                  disabled={draft.variants.length > 0}
                />
              </Field>
              <Field label="Giá gạch ngang" hint="Dùng cho combo đang ưu đãi">
                <Input
                  inputMode="numeric"
                  value={draft.compare_at_price}
                  onChange={(e) => patchDraft({ compare_at_price: e.target.value })}
                  placeholder="1299000"
                />
              </Field>
              <Field label="Định lượng">
                <Input
                  value={draft.unit}
                  onChange={(e) => patchDraft({ unit: e.target.value })}
                  placeholder="100gr · 2 khách"
                />
              </Field>
            </div>

            <Field label="Nhãn">
              <div className="flex flex-wrap gap-2">
                {BADGES.map((b) => {
                  const on = draft.badges.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() =>
                        patchDraft({
                          badges: on
                            ? draft.badges.filter((x) => x !== b.key)
                            : [...draft.badges, b.key],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-[13px] transition ${
                        on
                          ? "bg-washi font-medium text-sumi"
                          : "border border-line bg-surface2 text-muted hover:text-washi"
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="Mô tả"
              hint="Chỉ chép lại mô tả có trên menu. Không tự viết thêm lời quảng cáo."
            >
              <Textarea
                value={draft.description}
                onChange={(e) => patchDraft({ description: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Gồm những gì" hint="Mỗi dòng một mục">
                <Textarea
                  value={draft.includes}
                  onChange={(e) => patchDraft({ includes: e.target.value })}
                  placeholder={"Thăn ngoại bò wagyu A5\nSườn bò Mỹ rút xương"}
                />
              </Field>
              <Field label="Set tặng kèm" hint="Mỗi dòng một mục">
                <Textarea
                  value={draft.gifts}
                  onChange={(e) => patchDraft({ gifts: e.target.value })}
                  placeholder={"Kimchi\nRau cuốn thịt nướng"}
                />
              </Field>
            </div>

            {/* Các phần */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
                  Bán theo phần
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    patchDraft({
                      variants: [
                        ...draft.variants,
                        { code: "", label: "", price: 0, note: "" },
                      ],
                    })
                  }
                >
                  <IconPlus size={14} /> Thêm phần
                </Button>
              </div>
              {draft.variants.length === 0 ? (
                <p className="text-[12px] text-faint">
                  Để trống nếu món chỉ có một giá. Thêm phần khi món có size M/L
                  hoặc bán theo 100gr.
                </p>
              ) : (
                <div className="space-y-2">
                  {draft.variants.map((v, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        value={v.label}
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...v, label: e.target.value };
                          patchDraft({ variants: next });
                        }}
                        placeholder="Medium"
                        className="min-w-[110px] flex-1"
                      />
                      <Input
                        inputMode="numeric"
                        value={String(v.price)}
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...v, price: Number(e.target.value.replace(/\D/g, "")) || 0 };
                          patchDraft({ variants: next });
                        }}
                        placeholder="259000"
                        className="w-[120px]"
                      />
                      <Input
                        value={v.note ?? ""}
                        onChange={(e) => {
                          const next = [...draft.variants];
                          next[i] = { ...v, note: e.target.value };
                          patchDraft({ variants: next });
                        }}
                        placeholder="200gr"
                        className="w-[110px]"
                      />
                      <button
                        onClick={() =>
                          patchDraft({
                            variants: draft.variants.filter((_, j) => j !== i),
                          })
                        }
                        aria-label="Xoá phần"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-shu"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Trang menu gốc"
                hint="Để đối chiếu khi đổi giá, ví dụ M21"
              >
                <Input
                  value={draft.source_page}
                  onChange={(e) => patchDraft({ source_page: e.target.value })}
                  placeholder="M21"
                />
              </Field>
              <Field label="Còn phục vụ">
                <div className="flex h-[38px] items-center gap-3">
                  <Toggle
                    checked={draft.is_available}
                    onChange={(v) => patchDraft({ is_available: v })}
                  />
                  <span className="text-[13px] text-muted">
                    {draft.is_available
                      ? "Khách gọi được món này"
                      : "Tạm ẩn khỏi mini app"}
                  </span>
                </div>
              </Field>
            </div>

            <TranslationEditor
              fields={DISH_TRANS}
              draft={draft.i18n}
              onChange={(i18n) => patchDraft({ i18n })}
              entity="dishes"
              id={isNew ? undefined : draft.id}
              stale={
                !isNew &&
                isStale((dishes ?? []).find((d) => d.id === draft.id) ?? ({} as Dish))
              }
              onTranslated={async () => {
                await load();
                const fresh = (
                  await supabase.from("dishes").select("i18n").eq("id", draft.id).single()
                ).data;
                if (fresh) patchDraft({ i18n: toI18nDraft(fresh.i18n, DISH_TRANS) });
              }}
            />
          </div>
        )}
      </Modal>

      <CategoryManager
        open={categoryManager}
        onClose={() => setCategoryManager(false)}
        onChanged={load}
        dishCounts={dishCounts}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Xoá món"
        danger
        confirmLabel="Xoá"
        loading={deleting}
        onConfirm={remove}
        body={
          <>
            Xoá hẳn “{draft?.name}” khỏi thực đơn. Nếu chỉ muốn tạm ngừng bán,
            hãy tắt “Còn phục vụ” — cách đó giữ lại lịch sử đơn cũ.
          </>
        }
      />
    </>
  );
}
