/**
 * Sơ đồ ghế quầy omakase — 12 ghế, đúng con số đã xác nhận với nhà hàng.
 *
 * Toạ độ tính bằng mét, gốc ở giữa phòng:
 *   x: trái (−) sang phải (+)
 *   z: phía bếp (−) ra phía cửa (+)
 *   rotation: hướng ghế nhìn, độ. 0 = nhìn thẳng vào bếp trưởng.
 *
 * Quầy là hình chữ nhật 4,2 × 2,1 m, bếp trưởng đứng phía trong. Khách ngồi
 * ba mặt: Q1–Q4 một hàng dọc cạnh trái, Q5–Q9 một hàng ở mặt trước, Q10–Q12
 * dọc cạnh phải. Quầy sâu hơn mặt trước cần để cạnh trái đủ chỗ cho bốn ghế.
 *
 * Đây chỉ là dữ liệu khởi tạo. Sau khi chạy thật, nhà hàng sửa trong CMS và
 * CSDL mới là nguồn sự thật.
 */
export interface SeatSpec {
  id: string;
  label: string;
  x: number;
  z: number;
  rotation: number;
  /** Ghế nhìn thẳng vào tay bếp trưởng */
  premium: boolean;
  note?: string;
}

export const COUNTER_SEATS: SeatSpec[] = [
  // Cạnh trái, từ trong ra ngoài
  { id: "Q1", label: "Q1", x: -2.52, z: -0.65, rotation: 90, premium: false },
  { id: "Q2", label: "Q2", x: -2.52, z: -0.05, rotation: 90, premium: false },
  { id: "Q3", label: "Q3", x: -2.52, z: 0.55, rotation: 90, premium: false },
  { id: "Q4", label: "Q4", x: -2.52, z: 1.15, rotation: 90, premium: false },

  // Mặt trước, trái sang phải
  { id: "Q5", label: "Q5", x: -1.5, z: 1.78, rotation: 0, premium: false },
  {
    id: "Q6", label: "Q6", x: -0.75, z: 1.78, rotation: 0, premium: true,
    note: "Nhìn thẳng tay bếp trưởng",
  },
  {
    id: "Q7", label: "Q7", x: 0, z: 1.78, rotation: 0, premium: true,
    note: "Nhìn thẳng tay bếp trưởng",
  },
  {
    id: "Q8", label: "Q8", x: 0.75, z: 1.78, rotation: 0, premium: true,
    note: "Nhìn thẳng tay bếp trưởng",
  },
  { id: "Q9", label: "Q9", x: 1.5, z: 1.78, rotation: 0, premium: false },

  // Cạnh phải, từ ngoài vào trong
  { id: "Q10", label: "Q10", x: 2.52, z: 0.95, rotation: 270, premium: false },
  { id: "Q11", label: "Q11", x: 2.52, z: 0.25, rotation: 270, premium: false },
  { id: "Q12", label: "Q12", x: 2.52, z: -0.45, rotation: 270, premium: false },
];

/** Kích thước phòng và quầy — mô hình 3D và CMS dùng chung. */
export const ROOM = {
  width: 7.0,
  depth: 6.4,
  height: 3.0,
  // Mép sau giữ ở z = −0,8 để bếp trưởng không phải lùi; phần sâu thêm
  // nằm ở phía trước.
  counter: { x: 0, z: 0.25, width: 4.2, depth: 2.1, height: 1.05 },
  /** Bếp trưởng đứng phía trong quầy */
  chef: { x: 0, z: -1.35 },
} as const;
