/**
 * Các khối nội dung dạng danh sách của mini app — bảng `content_items`.
 *
 * Mỗi section dùng một phần các cột của bảng. File này nói section nào dùng
 * cột nào, đặt tên từng ô cho nhân viên đọc, và cột nào cần bản dịch. Trang
 * "Nội dung app" dựng biểu mẫu từ đây, nên thêm section mới chỉ cần khai báo
 * ở đây (và ở ràng buộc `content_items_section_check` trong CSDL, và nơi
 * mini app đọc nó).
 *
 * Ý nghĩa các cột phía mini app: xem `src/data/page-content.ts`.
 */

export type ContentColumn =
  | "title"
  | "subtitle"
  | "body"
  | "tag"
  | "jp"
  | "key"
  | "image_url"
  | "link";

/** Cột được dịch sang Anh/Nhật. Trùng với hàm băm i18n_src_content_items. */
export const TRANSLATED_COLUMNS: ContentColumn[] = ["title", "subtitle", "body", "tag"];

export interface FieldSpec {
  label: string;
  hint?: string;
  placeholder?: string;
  /** Nhiều dòng */
  multiline?: boolean;
  required?: boolean;
  /** Chọn từ danh sách thay vì gõ tự do. */
  options?: { value: string; label: string }[];
}

/** Ô lưu trong cột `meta` (jsonb). */
export interface MetaFieldSpec {
  key: string;
  label: string;
  hint?: string;
  /** "categories" = chọn nhiều nhóm món, lưu thành mảng mã nhóm. */
  type: "select" | "categories";
  options?: { value: string; label: string }[];
}

export interface SectionSpec {
  key: string;
  /** Trang của mini app mà section này xuất hiện. */
  page: "Trang chủ" | "Thực đơn" | "Omakase" | "Giới thiệu" | "Butcher";
  label: string;
  description: string;
  fields: Partial<Record<ContentColumn, FieldSpec>>;
  meta?: MetaFieldSpec[];
  /** Cột hiện làm tiêu đề phụ trong danh sách. */
  preview?: ContentColumn;
}

/**
 * Biểu tượng chọn được. Tên phải trùng với `src/components/ui/icon-by-key.tsx`
 * của mini app.
 */
export const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "shield", label: "Khiên — cam kết, chính hãng" },
  { value: "snowflake", label: "Bông tuyết — giữ lạnh" },
  { value: "lightning", label: "Tia chớp — giao nhanh" },
  { value: "delivery", label: "Xe giao hàng" },
  { value: "takeaway", label: "Túi mang về" },
  { value: "knife", label: "Dao — cắt theo yêu cầu" },
  { value: "butcher", label: "Tiệm thịt" },
  { value: "meat", label: "Thịt" },
  { value: "sushi", label: "Sushi" },
  { value: "hotpot", label: "Lẩu" },
  { value: "fire", label: "Ngọn lửa — nổi bật" },
  { value: "omakase", label: "Omakase" },
  { value: "menu", label: "Thực đơn" },
  { value: "booking", label: "Đặt bàn" },
  { value: "gift", label: "Quà" },
  { value: "voucher", label: "Voucher" },
  { value: "points", label: "Điểm thưởng" },
  { value: "star", label: "Ngôi sao" },
  { value: "favorite", label: "Trái tim" },
  { value: "hotline", label: "Điện thoại" },
  { value: "chat", label: "Tin nhắn" },
  { value: "map", label: "Bản đồ" },
  { value: "info", label: "Thông tin" },
];

/** Trang trong mini app mà banner, ưu đãi… có thể dẫn tới. */
export const LINK_OPTIONS: { value: string; label: string }[] = [
  { value: "/menu", label: "Thực đơn" },
  { value: "/omakase", label: "Omakase" },
  { value: "/booking", label: "Đặt bàn" },
  { value: "/butcher", label: "Butcher — tất cả" },
  { value: "/rewards", label: "Tích điểm & đổi quà" },
  { value: "/about", label: "Giới thiệu" },
];

const searchSection = (
  key: string,
  page: SectionSpec["page"],
  where: string
): SectionSpec => ({
  key,
  page,
  label: "Gợi ý trong ô tìm kiếm",
  description: `Các câu chạy lần lượt trong ô tìm kiếm ${where}. Khách bấm tìm khi ô còn trống thì app tìm theo câu đang hiện.`,
  fields: {
    title: { label: "Câu gợi ý", required: true, placeholder: "Tìm Bò Wagyu A5 nướng than hoa..." },
  },
});

export const SECTIONS: SectionSpec[] = [
  /* ── Trang chủ ── */
  searchSection("home_search", "Trang chủ", "ở trang chủ"),
  {
    key: "home_tab",
    page: "Trang chủ",
    label: "Tab món đề xuất",
    description:
      "Các tab phía trên lưới món ở trang chủ. Mỗi tab hiện món của những nhóm được chọn; không chọn nhóm nào thì hiện mọi món.",
    fields: {
      title: { label: "Tên tab", required: true },
      key: { label: "Biểu tượng", options: ICON_OPTIONS },
    },
    meta: [
      {
        key: "categories",
        label: "Nhóm món",
        hint: "Bỏ trống = mọi món",
        type: "categories",
      },
    ],
  },
  {
    key: "home_promo",
    page: "Trang chủ",
    label: "Thẻ quảng bá",
    description:
      "Thẻ lớn giữa trang chủ, hiện đang giới thiệu Butcher. Thẻ dẫn tới Butcher thì tự hiện giá thấp nhất của hàng Butcher.",
    fields: {
      tag: { label: "Nhãn nhỏ", placeholder: "MIYAKO BUTCHER" },
      subtitle: { label: "Dòng phụ cạnh nhãn", placeholder: "Giao nhanh 45p" },
      title: { label: "Tiêu đề", required: true },
      body: { label: "Mô tả", multiline: true },
      link: { label: "Mở trang", options: LINK_OPTIONS },
      key: { label: "Biểu tượng", options: ICON_OPTIONS },
    },
    preview: "tag",
  },
  {
    key: "home_offer",
    page: "Trang chủ",
    label: "Ưu đãi",
    description:
      "Danh sách ưu đãi khi khách bấm nút Voucher ở trang chủ. Chỉ để hiển thị: muốn khách nhập được mã khi đặt món thì tạo mã cùng tên ở trang Ưu đãi & Voucher.",
    fields: {
      title: { label: "Tên ưu đãi", required: true, placeholder: "Giảm 100.000đ" },
      subtitle: { label: "Điều kiện", placeholder: "Áp dụng hóa đơn từ 1.000.000đ" },
      body: { label: "Hạn dùng", placeholder: "HSD: 31/12/2026" },
      tag: {
        label: "Mã ưu đãi",
        hint: "Để trống nếu không có mã",
        placeholder: "WAGYU15",
      },
      link: { label: "Nút “Dùng ngay” mở trang", options: LINK_OPTIONS },
    },
    preview: "subtitle",
  },
  {
    key: "home_highlight",
    page: "Trang chủ",
    label: "Cam kết cuối trang",
    description: "Ba ô cam kết nhỏ ở cuối trang chủ.",
    fields: {
      title: { label: "Tiêu đề", required: true },
      subtitle: { label: "Dòng phụ" },
      key: { label: "Biểu tượng", options: ICON_OPTIONS },
    },
    preview: "subtitle",
  },

  /* ── Thực đơn ── */
  searchSection("menu_search", "Thực đơn", "ở trang thực đơn"),

  /* ── Omakase ── */
  {
    key: "omakase_step",
    page: "Omakase",
    label: "Trình tự phục vụ",
    description:
      "Các bước của một bữa omakase, hiện dạng dòng thời gian ở trang Omakase. Đây là giới thiệu chung; thực đơn từng suất sửa ở trang Omakase của CMS.",
    fields: {
      jp: { label: "Tên gốc (romaji)", placeholder: "Sakizuke", hint: "Không dịch" },
      title: { label: "Tên bước", required: true, placeholder: "Khai vị tinh tế" },
      body: { label: "Mô tả", multiline: true },
    },
    preview: "jp",
  },
  {
    key: "omakase_gallery",
    page: "Omakase",
    label: "Ảnh trưng bày",
    description:
      "Lưới ảnh không gian và món ăn ở trang Omakase. Bấm vào ảnh, khách xem ảnh lớn kèm mô tả.",
    fields: {
      image_url: { label: "Ảnh", required: true },
      title: { label: "Tiêu đề", required: true },
      jp: { label: "Dòng chữ Nhật", hint: "Không dịch", placeholder: "板前カウンター · 12 SEATS" },
      tag: { label: "Nhãn", placeholder: "Không gian Omakase" },
      body: { label: "Mô tả", multiline: true },
      key: {
        label: "Loại ảnh",
        hint: "Dùng cho bộ lọc Không gian / Món ăn",
        options: [
          { value: "space", label: "Không gian" },
          { value: "dish", label: "Món ăn" },
        ],
      },
    },
    meta: [
      {
        key: "seating",
        label: "Khu vực",
        type: "select",
        options: [
          { value: "", label: "Không ghi" },
          { value: "counter", label: "Quầy itamae" },
          { value: "private", label: "Phòng riêng" },
        ],
      },
      {
        key: "aspect",
        label: "Khung ảnh",
        type: "select",
        options: [
          { value: "3/4", label: "Dọc 3:4" },
          { value: "4/5", label: "Dọc 4:5" },
          { value: "1/1", label: "Vuông" },
          { value: "4/3", label: "Ngang 4:3" },
        ],
      },
    ],
    preview: "tag",
  },

  /* ── Giới thiệu ── */
  {
    key: "about_spec",
    page: "Giới thiệu",
    label: "Thông số ủ wet-aging",
    description: "Bảng thông số trong khối Wagyu của trang Giới thiệu.",
    fields: {
      title: { label: "Tên thông số", required: true, placeholder: "Nhiệt độ" },
      subtitle: { label: "Giá trị", required: true, placeholder: "−2°C – 2°C" },
    },
    preview: "subtitle",
  },

  /* ── Butcher ── */
  searchSection("butcher_search", "Butcher", "ở trang Butcher"),
  {
    key: "butcher_tab",
    page: "Butcher",
    label: "Tab lọc sản phẩm",
    description:
      "Các tab lọc ở trang Butcher (tab “Tất cả” luôn có sẵn). Món hiện trong tab khi món mang nhãn lọc trùng mã của tab — gắn nhãn cho món ở trang Thực đơn.",
    fields: {
      title: { label: "Tên tab", required: true, placeholder: "Wagyu Nhật A5" },
      key: {
        label: "Mã lọc",
        required: true,
        hint: "Chữ thường, không dấu, ví dụ wagyu",
        placeholder: "wagyu",
      },
    },
    preview: "key",
  },
  {
    key: "butcher_cut",
    page: "Butcher",
    label: "Kiểu cắt thịt",
    description: "Các nhãn kiểu cắt trong khối giới thiệu Butcher.",
    fields: {
      title: { label: "Kiểu cắt", required: true, placeholder: "Steak 2.5cm" },
    },
  },
  {
    key: "butcher_promise",
    page: "Butcher",
    label: "Cam kết dịch vụ",
    description: "Ba ô cam kết trong khối giới thiệu Butcher.",
    fields: {
      title: { label: "Tiêu đề", required: true },
      subtitle: { label: "Dòng phụ" },
      key: { label: "Biểu tượng", options: ICON_OPTIONS },
    },
    preview: "subtitle",
  },
];

export const SECTION_BY_KEY: Record<string, SectionSpec> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s])
);

/** Vị trí banner, dùng chung cho trang Nội dung app. */
export const BANNER_PLACEMENTS: { value: string; label: string; hint: string }[] = [
  {
    value: "home_hero",
    label: "Trang chủ — ảnh trượt đầu trang",
    hint: "Nên có nút bấm dẫn tới một trang.",
  },
  {
    value: "omakase_hero",
    label: "Omakase — ảnh trượt đầu trang",
    hint: "Dòng chữ Nhật hiện nhỏ phía trên tiêu đề. Không cần nút bấm.",
  },
  {
    value: "butcher_hero",
    label: "Butcher — ảnh trượt đầu trang",
    hint: "Nút bấm dẫn tới /butcher?tab=<mã lọc> để mở đúng tab.",
  },
];
