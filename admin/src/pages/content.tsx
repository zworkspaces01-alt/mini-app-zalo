import { useCallback, useEffect, useMemo, useState } from "react";

import BannerPanel from "@/components/banner-panel";
import {
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@/components/icons";
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
  SectionHeading,
  Select,
  Textarea,
} from "@/components/ui";
import {
  LINK_OPTIONS,
  SECTIONS,
  type SectionSpec,
} from "@/lib/content-sections";
import { supabase, type ContentItem } from "@/lib/supabase";
import { translateAll } from "@/lib/translate";

type PageTab = "Trang chủ" | "Thực đơn" | "Omakase" | "Giới thiệu" | "Butcher" | "Banner";

const PAGE_TABS: PageTab[] = [
  "Trang chủ",
  "Thực đơn",
  "Omakase",
  "Giới thiệu",
  "Butcher",
  "Banner",
];

interface DraftItem {
  id?: string;
  section: string;
  title: string;
  subtitle: string;
  body: string;
  tag: string;
  jp: string;
  key: string;
  image_url: string;
  link: string;
  meta: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

const emptyDraft = (section: string): DraftItem => ({
  section,
  title: "",
  subtitle: "",
  body: "",
  tag: "",
  jp: "",
  key: "",
  image_url: "",
  link: "",
  meta: {},
  is_active: true,
  sort_order: 0,
});

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("Trang chủ");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit / Add Modal state
  const [draft, setDraft] = useState<DraftItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);

  // AI translate state
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState<string | null>(null);

  // Lọc các section thuộc page hiện tại
  const availableSections = useMemo(
    () => SECTIONS.filter((s) => s.page === activeTab),
    [activeTab]
  );

  // Tự chọn section đầu tiên khi đổi tab
  useEffect(() => {
    if (activeTab === "Banner") {
      setSelectedSectionKey("");
      return;
    }
    if (availableSections.length > 0) {
      const match = availableSections.find((s) => s.key === selectedSectionKey);
      if (!match) {
        setSelectedSectionKey(availableSections[0].key);
      }
    } else {
      setSelectedSectionKey("");
    }
  }, [activeTab, availableSections, selectedSectionKey]);

  const currentSectionSpec: SectionSpec | undefined = useMemo(
    () => SECTIONS.find((s) => s.key === selectedSectionKey),
    [selectedSectionKey]
  );

  // Tải danh mục món ăn (dành cho meta field: categories)
  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  // Tải danh sách item của section đang chọn
  const loadItems = useCallback(async () => {
    if (!selectedSectionKey) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("content_items")
        .select("*")
        .eq("section", selectedSectionKey)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems((data as ContentItem[]) ?? []);
    } catch (e: any) {
      setError(e.message || "Không thể tải nội dung");
    } finally {
      setLoading(false);
    }
  }, [selectedSectionKey]);

  useEffect(() => {
    if (activeTab !== "Banner" && selectedSectionKey) {
      loadItems();
    }
  }, [activeTab, selectedSectionKey, loadItems]);

  // Lưu chỉnh sửa / thêm mới
  const handleSave = async () => {
    if (!draft) return;
    if (!draft.title.trim() && currentSectionSpec?.fields.title?.required) {
      setError("Vui lòng điền tiêu đề");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      section: draft.section,
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      body: draft.body?.trim() || null,
      tag: draft.tag?.trim() || null,
      jp: draft.jp?.trim() || null,
      key: draft.key?.trim() || null,
      image_url: draft.image_url?.trim() || null,
      link: draft.link?.trim() || null,
      meta: draft.meta || {},
      is_active: draft.is_active,
      sort_order: draft.sort_order || 0,
      updated_at: new Date().toISOString(),
    };

    try {
      if (draft.id) {
        const { error } = await supabase
          .from("content_items")
          .update(payload)
          .eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("content_items").insert(payload);
        if (error) throw error;
      }
      setDraft(null);
      await loadItems();
    } catch (e: any) {
      setError(e.message || "Không thể lưu nội dung");
    } finally {
      setSaving(false);
    }
  };

  // Bật/tắt trạng thái hiển thị nhanh
  const toggleActive = async (item: ContentItem) => {
    try {
      const { error } = await supabase
        .from("content_items")
        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_active: !it.is_active } : it))
      );
    } catch (e: any) {
      setError(e.message || "Lỗi cập nhật trạng thái");
    }
  };

  // Xóa item
  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const { error } = await supabase
        .from("content_items")
        .delete()
        .eq("id", deleteItem.id);
      if (error) throw error;
      setDeleteItem(null);
      await loadItems();
    } catch (e: any) {
      setError(e.message || "Lỗi xoá nội dung");
    }
  };

  // Gọi AI dịch nội dung trang
  const handleTranslate = async () => {
    setTranslating(true);
    setTranslateMsg(null);
    try {
      const res = await translateAll({ entities: ["content_items"] });
      setTranslateMsg(
        `Đã dịch thành công ${res.translated} nội dung (còn lại ${res.remaining} dòng).`
      );
      await loadItems();
    } catch (e: any) {
      setTranslateMsg(`Lỗi dịch: ${e.message || "Không thành công"}`);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Quản Lý Nội Dung App"
          subtitle="Tùy biến câu chữ, hình ảnh, banner và các khối thông tin hiển thị trên Zalo Mini App"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTranslate}
            loading={translating}
            title="Dịch tự động các nội dung mới sang tiếng Anh và tiếng Nhật"
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Dịch AI sang EN/JA
          </Button>
          {activeTab !== "Banner" && (
            <Button
              size="sm"
              onClick={() => setDraft(emptyDraft(selectedSectionKey))}
              disabled={!selectedSectionKey}
            >
              <IconPlus size={16} />
              Thêm khối mới
            </Button>
          )}
        </div>
      </div>

      {translateMsg && (
        <div className="rounded-lg bg-surface2 px-4 py-2.5 text-[13px] text-washi border border-line2 flex items-center justify-between">
          <span>{translateMsg}</span>
          <button
            onClick={() => setTranslateMsg(null)}
            className="text-muted hover:text-washi"
          >
            ✕
          </button>
        </div>
      )}

      <ErrorBar error={error} />

      {/* Tabs chuyển trang */}
      <div className="flex gap-2 border-b border-line2 pb-2 overflow-x-auto">
        {PAGE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-[14px] font-medium transition whitespace-nowrap ${
              activeTab === tab
                ? "bg-shu text-white shadow-sm"
                : "text-muted hover:text-washi hover:bg-surface2"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Banner" ? (
        <BannerPanel />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Cột trái: Danh sách các Section của trang */}
          <div className="space-y-2 lg:col-span-1">
            <div className="text-[12px] font-semibold text-muted uppercase tracking-wider mb-2 px-1">
              Khối chức năng ({availableSections.length})
            </div>
            {availableSections.map((sec) => (
              <button
                key={sec.key}
                onClick={() => setSelectedSectionKey(sec.key)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedSectionKey === sec.key
                    ? "bg-surface3 border-shu/50 text-white shadow-sm"
                    : "bg-surface border-line hover:bg-surface2 text-muted hover:text-washi"
                }`}
              >
                <div className="text-[14px] font-medium text-washi">{sec.label}</div>
                <div className="text-[12px] text-muted line-clamp-1 mt-0.5">
                  {sec.description}
                </div>
              </button>
            ))}
          </div>

          {/* Cột phải: Danh sách các Item trong Section đã chọn */}
          <div className="lg:col-span-3 space-y-4">
            {currentSectionSpec && (
              <Card className="p-4 bg-surface2/50 border-line flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    {currentSectionSpec.label}
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    {currentSectionSpec.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button variant="ghost" size="sm" onClick={loadItems} loading={loading}>
                    <IconRefresh size={15} />
                    Tải lại
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDraft(emptyDraft(currentSectionSpec.key))}
                  >
                    <IconPlus size={15} />
                    Thêm mục
                  </Button>
                </div>
              </Card>
            )}

            {items.length === 0 ? (
              <Card className="p-10 text-center">
                <EmptyState
                  title="Chưa có nội dung"
                  hint="Bấm 'Thêm mục' để tạo khối hiển thị đầu tiên cho phần này."
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <Card
                    key={item.id}
                    className={`p-4 border transition hover:border-line2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      !item.is_active ? "opacity-60 bg-surface/50" : "bg-surface"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <span className="text-[13px] font-mono text-muted/60 mt-0.5 select-none">
                        #{idx + 1}
                      </span>
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-14 h-14 object-cover rounded-lg border border-line shrink-0 bg-surface3"
                        />
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-white truncate">
                            {item.title || "—"}
                          </span>
                          {item.tag && (
                            <span className="px-2 py-0.5 rounded bg-surface3 text-[11px] font-medium text-gold border border-gold/20">
                              {item.tag}
                            </span>
                          )}
                          {item.jp && (
                            <span className="text-[12px] text-muted font-mono italic">
                              {item.jp}
                            </span>
                          )}
                          {!item.is_active && (
                            <span className="px-1.5 py-0.5 rounded bg-shu/10 text-shu text-[10px] uppercase font-semibold">
                              Tắt hiển thị
                            </span>
                          )}
                        </div>

                        {item.subtitle && (
                          <div className="text-[13px] text-washi/80 font-medium line-clamp-1">
                            {item.subtitle}
                          </div>
                        )}
                        {item.body && (
                          <div className="text-[12px] text-muted line-clamp-2 leading-relaxed">
                            {item.body}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-muted pt-1">
                          {item.key && <span>Icon / Loại: <b className="text-washi">{item.key}</b></span>}
                          {item.link && <span>Dẫn tới: <b className="text-washi">{item.link}</b></span>}
                          <span>Thứ tự: {item.sort_order}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(item)}
                        title={item.is_active ? "Tắt hiển thị" : "Bật hiển thị"}
                      >
                        {item.is_active ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[12px]">
                            <IconCheck size={14} /> Bật
                          </span>
                        ) : (
                          <span className="text-muted text-[12px]">Tắt</span>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setDraft({
                            id: item.id,
                            section: item.section,
                            title: item.title,
                            subtitle: item.subtitle ?? "",
                            body: item.body ?? "",
                            tag: item.tag ?? "",
                            jp: item.jp ?? "",
                            key: item.key ?? "",
                            image_url: item.image_url ?? "",
                            link: item.link ?? "",
                            meta: (item.meta as Record<string, any>) ?? {},
                            is_active: item.is_active,
                            sort_order: item.sort_order,
                          })
                        }
                      >
                        <IconEdit size={14} /> Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteItem(item)}
                        className="text-shu hover:bg-shu/10"
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa / Thêm Mới */}
      {draft && currentSectionSpec && (
        <Modal
          open={!!draft}
          onClose={() => setDraft(null)}
          title={draft.id ? "Sửa Khối Nội Dung" : "Thêm Khối Nội Dung Mới"}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
            {/* Tiêu đề */}
            {currentSectionSpec.fields.title && (
              <Field
                label={currentSectionSpec.fields.title.label}
                required={currentSectionSpec.fields.title.required}
                hint={currentSectionSpec.fields.title.hint}
              >
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder={currentSectionSpec.fields.title.placeholder}
                />
              </Field>
            )}

            {/* Phụ đề */}
            {currentSectionSpec.fields.subtitle && (
              <Field
                label={currentSectionSpec.fields.subtitle.label}
                hint={currentSectionSpec.fields.subtitle.hint}
              >
                <Input
                  value={draft.subtitle}
                  onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                  placeholder={currentSectionSpec.fields.subtitle.placeholder}
                />
              </Field>
            )}

            {/* Nhãn Tag */}
            {currentSectionSpec.fields.tag && (
              <Field
                label={currentSectionSpec.fields.tag.label}
                hint={currentSectionSpec.fields.tag.hint}
              >
                <Input
                  value={draft.tag}
                  onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
                  placeholder={currentSectionSpec.fields.tag.placeholder}
                />
              </Field>
            )}

            {/* Chữ Nhật / Kanji / Romaji */}
            {currentSectionSpec.fields.jp && (
              <Field
                label={currentSectionSpec.fields.jp.label}
                hint={currentSectionSpec.fields.jp.hint}
              >
                <Input
                  value={draft.jp}
                  onChange={(e) => setDraft({ ...draft, jp: e.target.value })}
                  placeholder={currentSectionSpec.fields.jp.placeholder}
                />
              </Field>
            )}

            {/* Nội dung chi tiết */}
            {currentSectionSpec.fields.body && (
              <Field
                label={currentSectionSpec.fields.body.label}
                hint={currentSectionSpec.fields.body.hint}
              >
                {currentSectionSpec.fields.body.multiline ? (
                  <Textarea
                    rows={4}
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    placeholder={currentSectionSpec.fields.body.placeholder}
                  />
                ) : (
                  <Input
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    placeholder={currentSectionSpec.fields.body.placeholder}
                  />
                )}
              </Field>
            )}

            {/* Biểu tượng hoặc Mã Loại */}
            {currentSectionSpec.fields.key && (
              <Field
                label={currentSectionSpec.fields.key.label}
                hint={currentSectionSpec.fields.key.hint}
              >
                {currentSectionSpec.fields.key.options ? (
                  <Select
                    value={draft.key}
                    onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                  >
                    <option value="">-- Chọn --</option>
                    {currentSectionSpec.fields.key.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={draft.key}
                    onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                    placeholder="ví dụ: wagyu, itamae..."
                  />
                )}
              </Field>
            )}

            {/* Link chuyển hướng */}
            {currentSectionSpec.fields.link && (
              <Field label={currentSectionSpec.fields.link.label}>
                <Select
                  value={draft.link}
                  onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                >
                  <option value="">-- Không điều hướng --</option>
                  {LINK_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label} ({l.value})
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {/* Upload Ảnh */}
            {currentSectionSpec.fields.image_url && (
              <Field
                label={currentSectionSpec.fields.image_url.label}
                required={currentSectionSpec.fields.image_url.required}
              >
                <ImageUpload
                  value={draft.image_url}
                  onChange={(url) => setDraft({ ...draft, image_url: url })}
                  folder="content"
                />
              </Field>
            )}

            {/* Meta fields riêng biệt */}
            {currentSectionSpec.meta?.map((m) => {
              if (m.type === "categories") {
                const selectedCats: string[] = Array.isArray(draft.meta?.categories)
                  ? draft.meta.categories
                  : [];
                return (
                  <Field key={m.key} label={m.label} hint={m.hint}>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-surface rounded border border-line">
                      {categories.map((c) => {
                        const checked = selectedCats.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 text-[13px] text-washi cursor-pointer hover:text-white"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selectedCats, c.id]
                                  : selectedCats.filter((id) => id !== c.id);
                                setDraft({
                                  ...draft,
                                  meta: { ...draft.meta, categories: next },
                                });
                              }}
                              className="rounded border-line bg-surface2 text-shu"
                            />
                            {c.name}
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                );
              }

              if (m.type === "select" && m.options) {
                return (
                  <Field key={m.key} label={m.label} hint={m.hint}>
                    <Select
                      value={draft.meta?.[m.key] ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          meta: { ...draft.meta, [m.key]: e.target.value },
                        })
                      }
                    >
                      {m.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                );
              }
              return null;
            })}

            {/* Thứ tự và Trạng thái */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-line2">
              <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn hiện trước">
                <Input
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </Field>

              <Field label="Trạng thái">
                <label className="flex items-center gap-2 h-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-shu border-line bg-surface2"
                  />
                  <span className="text-[14px] text-washi">Cho phép hiển thị trên App</span>
                </label>
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-line2 mt-4">
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {draft.id ? "Lưu thay đổi" : "Tạo mới"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận xoá */}
      <ConfirmModal
        open={!!deleteItem}
        title="Xoá khối nội dung?"
        body={`Bạn có chắc muốn xoá "${deleteItem?.title || "mục này"}"? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xoá hẳn"
        danger
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
