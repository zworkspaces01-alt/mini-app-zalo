import type { Dict } from "@/i18n/vi";
import { OmakaseSet, ServiceSlot } from "@/types";

/**
 * Các suất omakase.
 *
 * Giá lấy từ hồ sơ dữ kiện thương hiệu (đã xác nhận).
 * Thực đơn chi tiết hiện mới có của KAZE (card in 21×21).
 * Ba suất còn lại để `menuPending: true` — UI hiển thị "đang cập nhật",
 * không bịa món.
 */
export const OMAKASE_SETS: OmakaseSet[] = [
  {
    id: "omakase-1m",
    name: "Yuki Omakase",
    jp: "雪",
    subtitle: "Yuki — Tuyết Mùa Tinh Khôi",
    price: 1000000,
    service: "both",
    tier: 1,
    image: "hero-sushi",
    description:
      "Khởi đầu hành trình Omakase tao nhã lấy cảm hứng từ nét đẹp thuần khiết của tuyết trắng Nhật Bản. Từng món ăn tôn vinh sự tươi mới tự nhiên của hải vị theo ngày kết hợp cùng kỹ nghệ sushi truyền thống Edo-mae.",
    courses: [
      {
        section: "Khai vị (Sakizuke)",
        items: ["Tảo nâu Mozuku giấm Sanbaisu", "Đậu nành Edamame muối biển tuyết"],
      },
      {
        section: "Sashimi tươi sống",
        items: ["Sashimi Cá Hồi Na Uy hảo hạng", "Sashimi Cá Cam Hamachi đảo Shikoku"],
      },
      {
        section: "Sushi & Món nóng",
        items: [
          "Nigiri Cá Tráp Đỏ Madai chấm muối hồng",
          "Nigiri Cá Ngừ Akami ngâm tương Shoyu ủ 24h",
          "Nigiri Lươn Nhật nướng sốt Kabayaki",
          "Chawanmushi trứng hấp nấm Truffle đen",
          "Canh Súp Miso đỏ nấu rong biển Wakame",
        ],
      },
      {
        section: "Tráng miệng (Mizumono)",
        items: ["Mochi nghệ nhân đậu đỏ Kyoto"],
      },
    ],
    menuPending: false,
  },
  {
    id: "omakase-2m",
    name: "Hana Omakase",
    jp: "花",
    subtitle: "Hana — Tuyệt Tác Hải Vị & Bò Wagyu",
    price: 2000000,
    service: "both",
    tier: 2,
    image: "hero-wagyu",
    description:
      "Hành trình ẩm thực nở rộ như đóa hoa anh đào rực rỡ, kết hợp hoàn mỹ giữa hải sản quý hiếm nhập khẩu đường hàng không và thịt bò Wagyu thượng hạng được chế biến cầu kỳ ngay tại quầy Itamae.",
    courses: [
      {
        section: "Khai vị cao cấp (Zensai)",
        items: ["Hàu sữa Nhật sốt Ponzu cay thanh", "Chawanmushi trứng cá hồi Ikura"],
      },
      {
        section: "Sashimi hải vị thượng hạng",
        items: [
          "Sò điệp Hokkaido Hotate áp chảo nhẹ",
          "Cá Ngừ Vây Xanh Chutoro béo thanh",
          "Mực lá Aori Ika cắt hoa tinh xảo",
        ],
      },
      {
        section: "Món nướng & Bò Wagyu",
        items: [
          "Bò Wagyu A5 áp chảo sốt tiêu đen nấm rừng",
          "Lươn Nhật nướng than hoa Unagi Kabayaki",
        ],
      },
      {
        section: "Sushi thủ công Bếp Trưởng",
        items: [
          "Nigiri Chutoro khò tái dầu nấm Truffle",
          "Nigiri Cá Bơn vây En-gawa giòn béo",
          "Handroll Tôm ngọt Amaebi sốt nhím biển",
          "Canh nghêu Asari Dashi thanh ngọt đầu lưỡi",
        ],
      },
      {
        section: "Tráng miệng",
        items: ["Kem trà xanh Matcha Uji & Trái cây Nhật"],
      },
    ],
    menuPending: false,
  },
  {
    id: "kaze",
    name: "Kaze Omakase",
    jp: "夏風",
    subtitle: "Kaze — Đỉnh Cao Nghệ Thuật Bếp Trưởng",
    price: 3000000,
    service: "dinner",
    tier: 3,
    image: "hero-omakase",
    description:
      "Tuyệt tác Omakase đẳng cấp tột bậc dành cho những thực khách sành ăn nhất. Tinh hoa ẩm thực hội tụ từ Bụng cá ngừ béo Otoro, Nhím biển Uni Hokkaido, Trứng cá tầm Caviar hoàng gia và Bò Wagyu A5 Miyazaki nướng đá núi lửa nguyên bản.",
    courses: [
      {
        section: "Khai vị Hoàng Gia",
        items: [
          "Tảo Mozuku sâm biển",
          "Gan ngỗng béo Foie Gras áp chảo sốt rượu Sake mận",
        ],
      },
      {
        section: "Sashimi Ngũ Quý Biển Sâu",
        items: [
          "Bụng cá ngừ siêu béo Otoro Hon-Maguro",
          "Sò điệp khổng lồ Hokkaido",
          "Nhím biển tươi Uni vùng Hokkaido",
        ],
      },
      {
        section: "Tuyệt đỉnh Wagyu & Món chính",
        items: [
          "Thăn nội bò Wagyu A5 Miyazaki nướng đá núi lửa Phú Sĩ",
          "Tôm hùm nướng sốt bơ tỏi đen Miso",
        ],
      },
      {
        section: "Nghệ thuật Sushi Itamae",
        items: [
          "Otoro Nigiri dát vảy vàng nguyên chất 24k",
          "Chutoro hun khói gỗ sồi Sakura",
          "Madai cá tráp biển chấm muối hồng dãy Himalaya",
          "Handroll trứng cá tầm Caviar hoàng đế",
          "Uni Gunkan nhím biển ngọt đậm",
          "Tamagoyaki trứng cuộn mật ong mật lươn",
        ],
      },
      {
        section: "Canh ấm thượng hạng",
        items: ["Súp vi cá bào ngư nước dùng Dashi bí truyền"],
      },
      {
        section: "Tráng miệng Nghệ Nhân",
        items: ["Bánh Wagashi nghệ thuật thủ công & Trà đạo Matcha Uji"],
      },
    ],
    menuPending: false,
  },
];

export const OMAKASE_BY_ID: Record<string, OmakaseSet> = Object.fromEntries(
  OMAKASE_SETS.map((s) => [s.id, s])
);

/** Các ca mà một suất thật sự được dọn. */
export function servicesOf(set: OmakaseSet): ServiceSlot[] {
  return set.service === "both" ? ["lunch", "dinner"] : [set.service];
}

/** true khi suất có bán ở ca này. */
export function servesAt(set: OmakaseSet, slot: ServiceSlot): boolean {
  return set.service === "both" || set.service === slot;
}

/** Nhãn ngắn cho chip/hint: "Trưa", "Tối", "Trưa & tối". */
export function serviceLabel(service: OmakaseSet["service"], t: Dict): string {
  if (service === "lunch") return t.service.lunch;
  if (service === "dinner") return t.service.dinner;
  return t.service.both;
}

/** Nhãn dài cho thẻ và trang chi tiết. */
export function serviceLabelLong(service: OmakaseSet["service"], t: Dict): string {
  if (service === "lunch") return t.service.lunchLong;
  if (service === "dinner") return t.service.dinnerLong;
  return t.service.bothLong;
}

/** Tổng số món của một suất — dùng cho dòng "N món". */
export function courseCount(set: OmakaseSet): number {
  return set.courses.reduce((n, c) => n + c.items.length, 0);
}
