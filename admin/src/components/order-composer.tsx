import { useEffect, useMemo, useState } from "react";

import { deaccent, vnd } from "@/lib/format";
import { supabase, type Category, type Dish, type DishVariant } from "@/lib/supabase";

import { IconPlus, IconSearch, IconTrash } from "./icons";
import { Card, Input, Select } from "./ui";

export interface ComposedLine {
  dish_id: string;
  variant_code: string | null;
  qty: number;
  note: string;
  /** Chỉ để hiển thị, không gửi lên máy chủ */
  name: string;
  unit_price: number;
  variant_label?: string | null;
}

/** Dạng gửi lên RPC — server tự tra lại giá nên không gửi tiền. */
export const toRpcLines = (lines: ComposedLine[]) =>
  lines.map((l) => ({
    dish_id: l.dish_id,
    variant_code: l.variant_code,
    qty: l.qty,
    note: l.note || null,
  }));

export const linesTotal = (lines: ComposedLine[]) =>
  lines.reduce((n, l) => n + l.unit_price * l.qty, 0);

/**
 * Chọn món cho một đơn.
 *
 * Giá hiển thị ở đây chỉ để nhân viên ước lượng. Con số chính thức do máy chủ
 * tính lại khi lưu, nên có lệch thì bản của máy chủ thắng.
 */
export default function OrderComposer({
  lines,
  onChange,
}: {
  lines: ComposedLine[];
  onChange: (lines: ComposedLine[]) => void;
}) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [variants, setVariants] = useState<DishVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("dishes").select("*").order("sort_order"),
      supabase.from("dish_variants").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]).then(([d, v, c]) => {
      setDishes(d.data ?? []);
      setVariants(v.data ?? []);
      setCategories(c.data ?? []);
      setCategoryId((x) => x || c.data?.[0]?.id || "");
    });
  }, []);

  const results = useMemo(() => {
    const q = deaccent(query.trim());
    const base = q
      ? dishes.filter((d) =>
          [d.name, d.romaji, d.jp].some((s) => s && deaccent(s).includes(q))
        )
      : dishes.filter((d) => d.category_id === categoryId);
    return base.slice(0, 60);
  }, [dishes, query, categoryId]);

  const add = (dish: Dish) => {
    const vs = variants.filter((v) => v.dish_id === dish.id);
    const variant = vs[0];
    const price = variant?.price ?? dish.price ?? 0;
    const key = `${dish.id}|${variant?.code ?? ""}`;

    const existing = lines.find(
      (l) => `${l.dish_id}|${l.variant_code ?? ""}` === key && !l.note
    );
    if (existing) {
      onChange(
        lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))
      );
      return;
    }
    onChange([
      ...lines,
      {
        dish_id: dish.id,
        variant_code: variant?.code ?? null,
        qty: 1,
        note: "",
        name: dish.name,
        unit_price: price,
        variant_label: variant?.label ?? null,
      },
    ]);
  };

  const patch = (i: number, v: Partial<ComposedLine>) =>
    onChange(lines.map((l, j) => (j === i ? { ...l, ...v } : l)));

  return (
    <div className="space-y-4">
      {/* Đã chọn */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wide text-muted">
            Đã chọn
          </span>
          {lines.length > 0 && (
            <span className="text-[13px] font-semibold tabular-nums">
              {vnd(linesTotal(lines))}
            </span>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-[12px] text-faint">
            Chưa chọn món nào. Tìm hoặc chọn theo nhóm ở dưới.
          </p>
        ) : (
          <Card className="divide-y divide-line">
            {lines.map((l, i) => {
              const vs = variants.filter((v) => v.dish_id === l.dish_id);
              return (
                <div key={i} className="space-y-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-[14px]">{l.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          l.qty > 1
                            ? patch(i, { qty: l.qty - 1 })
                            : onChange(lines.filter((_, j) => j !== i))
                        }
                        aria-label="Giảm"
                        className="h-8 w-8 rounded-lg border border-line2 text-washi"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-[14px] font-semibold tabular-nums">
                        {l.qty}
                      </span>
                      <button
                        onClick={() => patch(i, { qty: Math.min(l.qty + 1, 50) })}
                        aria-label="Tăng"
                        className="h-8 w-8 rounded-lg bg-shu text-white"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-[86px] shrink-0 text-right text-[13px] tabular-nums">
                      {vnd(l.unit_price * l.qty)}
                    </span>
                    <button
                      onClick={() => onChange(lines.filter((_, j) => j !== i))}
                      aria-label={`Bỏ ${l.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-shu"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {vs.length > 0 && (
                      <Select
                        value={l.variant_code ?? ""}
                        onChange={(e) => {
                          const v = vs.find((x) => x.code === e.target.value);
                          patch(i, {
                            variant_code: v?.code ?? null,
                            unit_price: v?.price ?? l.unit_price,
                            variant_label: v?.label ?? null,
                          });
                        }}
                        className="!h-8 !w-[150px] !py-0 !text-[13px]"
                      >
                        {vs.map((v) => (
                          <option key={v.code} value={v.code}>
                            {v.label} · {vnd(v.price)}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Input
                      value={l.note}
                      onChange={(e) => patch(i, { note: e.target.value })}
                      placeholder="Ghi chú cho bếp"
                      className="!h-8 min-w-[150px] flex-1 !py-0 !text-[13px]"
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {/* Chọn món */}
      <div>
        <div className="relative mb-2">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm món"
            className="!pl-9"
          />
        </div>

        {!query && (
          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] transition ${
                  categoryId === c.id
                    ? "bg-washi font-medium text-sumi"
                    : "border border-line bg-surface2 text-muted hover:text-washi"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <Card className="max-h-[260px] divide-y divide-line overflow-y-auto">
          {results.length === 0 && (
            <div className="px-3 py-5 text-center text-[13px] text-muted">
              Không có món nào.
            </div>
          )}
          {results.map((d) => {
            const vs = variants.filter((v) => v.dish_id === d.id);
            const price =
              d.price !== null
                ? vnd(d.price)
                : vs.length
                ? `từ ${vnd(Math.min(...vs.map((v) => v.price)))}`
                : "—";
            return (
              <button
                key={d.id}
                onClick={() => add(d)}
                className="data-row flex w-full items-center gap-2 px-3 py-2 text-left transition"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {d.name}
                    {!d.is_available && (
                      <span className="ml-1.5 text-[11px] text-shu">tạm hết</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted">
                  {price}
                </span>
                <IconPlus size={15} className="shrink-0 text-muted" />
              </button>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
