import { useCallback, useEffect, useState } from "react";

import { IconPlus, IconRefresh, IconTrash } from "@/components/icons";
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
  Select,
} from "@/components/ui";
import { supabase, type Banner } from "@/lib/supabase";

export default function BannerPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Banner | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("sort_order");
    if (error) setError(error.message);
    setBanners((data as Banner[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.image_url) {
      setError("Vui lòng nhập tiêu đề và chọn ảnh cho banner.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      placement: draft.placement,
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      tag: draft.tag?.trim() || null,
      jp_text: draft.jp_text?.trim() || null,
      image_url: draft.image_url,
      cta_text: draft.cta_text?.trim() || null,
      cta_link: draft.cta_link?.trim() || null,
      is_active: draft.is_active,
      sort_order: draft.sort_order || 0,
      updated_at: new Date().toISOString(),
    };

    let upErr;
    if (draft.id) {
      const res = await supabase.from("banners").update(payload).eq("id", draft.id);
      upErr = res.error;
    } else {
      const res = await supabase.from("banners").insert(payload);
      upErr = res.error;
    }

    setSaving(false);
    if (upErr) {
      setError(upErr.message);
    } else {
      setDraft(null);
      await load();
    }
  };

  const remove = async (b: Banner) => {
    const { error: delErr } = await supabase.from("banners").delete().eq("id", b.id);
    setDeleteItem(null);
    if (delErr) {
      setError(delErr.message);
    } else {
      setBanners((prev) => prev.filter((x) => x.id !== b.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-[17px] text-washi">
            Banner chiến dịch & Trình chiếu Mini App
          </h3>
          <p className="text-[12.5px] text-muted">
            Quản lý slider hình ảnh trên Trang chủ, Trang Omakase và Trang Butcher thịt tươi
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={load}>
            <IconRefresh size={15} /> Làm mới
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setDraft({
                id: "",
                placement: "home_hero",
                title: "",
                subtitle: "",
                tag: "Ưu đãi",
                jp_text: "",
                image_url: "",
                cta_text: "Xem ngay",
                cta_link: "/menu",
                is_active: true,
                sort_order: banners.length + 1,
                created_at: "",
                updated_at: "",
              })
            }
          >
            <IconPlus size={15} /> Thêm Banner
          </Button>
        </div>
      </div>

      <ErrorBar error={error} />

      {banners.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            kanji="画"
            title="Chưa có banner nào"
            hint="Bấm Thêm Banner để tải lên hình ảnh chiến dịch hoặc sự kiện mới."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative h-36 w-full bg-surface2">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      Chưa có ảnh
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] text-gold font-medium">
                    {b.placement === "omakase_hero"
                      ? "Omakase Hero"
                      : b.placement === "butcher_hero"
                      ? "Butcher Hero"
                      : "Trang chủ"}
                  </span>
                  <span
                    className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                      b.is_active ? "bg-emerald-500/80 text-white" : "bg-black/60 text-muted"
                    }`}
                  >
                    {b.is_active ? "Bật" : "Tắt"}
                  </span>
                </div>

                <div className="p-3.5 space-y-1">
                  <div className="font-semibold text-washi text-[15px]">{b.title}</div>
                  {b.subtitle && (
                    <div className="text-[12px] text-muted line-clamp-2">
                      {b.subtitle}
                    </div>
                  )}
                  {b.cta_link && (
                    <div className="text-[11.5px] text-gold font-mono truncate">
                      Link: {b.cta_link}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line p-3 flex justify-between items-center text-[12.5px]">
                <span className="text-faint">Thứ tự: {b.sort_order}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setDraft(b)}>
                    Sửa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteItem(b)}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal soạn Banner */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Sửa Banner" : "Thêm Banner mới"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Huỷ
            </Button>
            <Button loading={saving} onClick={save}>
              Lưu Banner
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vị trí hiển thị">
                <Select
                  value={draft.placement}
                  onChange={(e) =>
                    setDraft({ ...draft, placement: e.target.value as any })
                  }
                >
                  <option value="home_hero">Trang chủ (Home Hero)</option>
                  <option value="omakase_hero">Trang Omakase</option>
                  <option value="butcher_hero">Trang Butcher thịt tươi</option>
                  <option value="popup">Popup thông báo</option>
                </Select>
              </Field>

              <Field label="Thứ tự ưu tiên (sort order)">
                <Input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>

            <Field label="Tiêu đề chính" required>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Nghệ thuật Omakase đỉnh cao..."
              />
            </Field>

            <Field label="Mô tả phụ">
              <Input
                value={draft.subtitle || ""}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                placeholder="Trải nghiệm tinh hoa ẩm thực Tokyo..."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Thẻ nhãn (Tag)">
                <Input
                  value={draft.tag || ""}
                  onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
                  placeholder="Omakase, Wagyu A5..."
                />
              </Field>
              <Field label="Chữ Nhật (JP Text)">
                <Input
                  value={draft.jp_text || ""}
                  onChange={(e) => setDraft({ ...draft, jp_text: e.target.value })}
                  placeholder="おまかせ"
                />
              </Field>
            </div>

            <ImageUpload
              value={draft.image_url}
              onChange={(url) => setDraft({ ...draft, image_url: url })}
              folder="banners"
              label="Ảnh banner (Supabase Storage)"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nút bấm (CTA Text)">
                <Input
                  value={draft.cta_text || ""}
                  onChange={(e) => setDraft({ ...draft, cta_text: e.target.value })}
                  placeholder="Đặt bàn ngay"
                />
              </Field>
              <Field label="Đường dẫn nút (CTA Link)">
                <Input
                  value={draft.cta_link || ""}
                  onChange={(e) => setDraft({ ...draft, cta_link: e.target.value })}
                  placeholder="/booking, /butcher, /menu"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-[13.5px] text-washi cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="rounded border-line"
              />
              Bật hiển thị banner này
            </label>
          </div>
        )}
      </Modal>

      {/* Xác nhận xoá banner */}
      <ConfirmModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Xoá Banner"
        danger
        confirmLabel="Xoá"
        onConfirm={() => deleteItem && remove(deleteItem)}
        body={`Bạn có chắc muốn xoá banner "${deleteItem?.title}"?`}
      />
    </div>
  );
}
