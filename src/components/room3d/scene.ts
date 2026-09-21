/**
 * Dựng phòng omakase theo đúng bố cục thật: quầy chữ nhật, bếp trưởng đứng
 * giữa phía trong, đèn washi sáu khoang treo trên, tường đá sau lưng có logo,
 * cửa sổ chớp gỗ bên trái, tủ gỗ cao bên phải.
 *
 * Toạ độ ghế lấy từ CSDL nên nhà hàng đổi bố cục trong CMS là mô hình đổi theo.
 */
import { ROOM } from "@/data/seats";

import { box, cylinder, plane, wallX, wallZ, type Face } from "./engine";

export interface SeatView {
  id: string;
  label: string;
  x: number;
  z: number;
  rotation: number;
  premium: boolean;
  taken: boolean;
  selected: boolean;
}

const C = {
  floor: "#5d4430",
  floorAlt: "#6a4e37",
  wall: "#2b2b30",
  stone: "#3b3936",
  stoneAlt: "#353330",
  logoRed: "#e2231a",
  logoWhite: "#f3f1ec",
  counterTop: "#cfa878",
  counterEdge: "#b8905f",
  counterBase: "#2d2823",
  counterSlat: "#40372e",
  counterGlow: "#c98f4a",
  lampPanel: "#f7e2ac",
  lampFrame: "#8a6c44",
  ceiling: "#1d1d21",
  ceilingSlat: "#6b543a",
  cabinet: "#b9945c",
  cabinetLine: "#8e7145",
  window: "#8fb3c9",
  blind: "#a89170",
  chefBody: "#23232a",
  chefSkin: "#caa183",
  chefHat: "#2a2a31",
  seatWood: "#caa66d",
  seatCushion: "#b8433a",
  seatTakenWood: "#4a4741",
  seatTakenCushion: "#514c47",
  seatSelected: "#c9a96a",
  seatSelectedCushion: "#e2231a",
} as const;

/** Một chiếc ghế: chân, mặt ngồi, đệm, tựa lưng nan. */
function stool(seat: SeatView): Face[] {
  const { x, z, rotation } = seat;
  const wood = seat.selected
    ? C.seatSelected
    : seat.taken
    ? C.seatTakenWood
    : C.seatWood;
  const cushion = seat.selected
    ? C.seatSelectedCushion
    : seat.taken
    ? C.seatTakenCushion
    : C.seatCushion;

  const pick = seat.taken ? undefined : seat.id;
  const faces: Face[] = [];

  // Bốn chân
  const legOffsets = [
    [-0.17, -0.17],
    [0.17, -0.17],
    [-0.17, 0.17],
    [0.17, 0.17],
  ];
  for (const [dx, dz] of legOffsets) {
    faces.push(
      ...box(x + dx, 0, z + dz, 0.045, 0.62, 0.045, wood, { pickId: pick })
    );
  }

  // Mặt ngồi và đệm
  faces.push(...cylinder(x, 0.62, z, 0.24, 0.05, wood, 12, { pickId: pick }));
  faces.push(
    ...cylinder(x, 0.67, z, 0.215, 0.055, cushion, 12, { pickId: pick })
  );

  // Tựa lưng đặt phía sau lưng khách.
  //
  // Quy ước: rotation = 0 nghĩa là ngồi nhìn về phía bếp (−z), nên hướng mặt
  // là (sin θ, −cos θ) và lưng nằm ngược lại. Trước đây dấu của trục x bị
  // lật, khiến ba ghế mỗi bên quay lưng vào quầy thay vì ra ngoài.
  const rad = (rotation * Math.PI) / 180;
  const bx = x - Math.sin(rad) * 0.21;
  const bz = z + Math.cos(rad) * 0.21;

  faces.push(
    ...box(bx, 0.67, bz, 0.44, 0.52, 0.05, wood, {
      pickId: pick,
      rotation,
    })
  );
  // Thanh ngang trên cùng
  faces.push(
    ...box(bx, 1.19, bz, 0.46, 0.055, 0.06, wood, {
      pickId: pick,
      rotation,
    })
  );

  return faces;
}

export function buildScene(seats: SeatView[]): Face[] {
  const faces: Face[] = [];
  const { width: W, depth: D, height: H, counter, chef } = ROOM;

  /* ── Sàn gỗ, các dải ván xen kẽ cho thấy chất liệu ── */
  faces.push(plane(0, 0, 0, W, D, C.floor));
  for (let i = -6; i <= 6; i++) {
    faces.push(plane(i * 0.55, 0.002, 0, 0.26, D, C.floorAlt));
  }

  /* ── Trần và tường ── */
  faces.push(plane(0, H, 0, W, D, C.ceiling, { unlit: true }));
  /*
   * Tường đá chia thành dải dọc thay vì một mảng lớn.
   *
   * Thuật toán hoạ sĩ sắp xếp theo độ sâu trọng tâm. Một mảng tường rộng 7m
   * có trọng tâm ở giữa phòng, nên khi xoay camera sang bên, trọng tâm đó có
   * thể hoá ra gần hơn tấm logo chỉ nhô ra 2cm — và logo bị tường vẽ đè mất.
   * Chia nhỏ khiến trọng tâm mỗi dải nằm ngay sau phần nó che, nên thứ tự
   * luôn đúng ở mọi góc nhìn.
   */
  const STRIPS = 14;
  for (let i = 0; i < STRIPS; i++) {
    const sw = W / STRIPS;
    faces.push(
      wallZ(-W / 2 + sw / 2 + i * sw, 0, -D / 2, sw, H,
        i % 2 === 0 ? C.stone : C.stoneAlt)
    );
  }
  faces.push(wallX(-W / 2, 0, 0, D, H, C.wall));          // trái
  faces.push(wallX(W / 2, 0, 0, D, H, C.wall));           // phải

  /* ── Logo MIYAKO phát sáng trên tường đá ── */
  faces.push(
    wallZ(-0.3, 1.62, -D / 2 + 0.05, 1.65, 0.34, C.logoWhite, { unlit: true })
  );
  faces.push(
    wallZ(0.78, 1.66, -D / 2 + 0.05, 0.38, 0.38, C.logoRed, { unlit: true })
  );

  /* ── Cửa sổ và chớp gỗ bên trái ── */
  faces.push(wallX(-W / 2 + 0.03, 1.0, -0.4, 2.6, 1.5, C.window, { unlit: true }));
  for (let i = 0; i < 9; i++) {
    faces.push(
      wallX(-W / 2 + 0.06, 1.05 + i * 0.16, -0.4, 2.6, 0.075, C.blind)
    );
  }

  /* ── Tủ gỗ cao bên phải ── */
  faces.push(...box(W / 2 - 0.22, 0, -0.2, 0.4, 2.7, 4.2, C.cabinet));
  for (let i = 0; i < 6; i++) {
    faces.push(
      wallX(W / 2 - 0.44, 0, -2.0 + i * 0.72, 0.035, 2.7, C.cabinetLine)
    );
  }
  faces.push(wallX(W / 2 - 0.44, 1.34, -0.2, 4.2, 0.035, C.cabinetLine));

  /* ── Trần nan gỗ phía trên quầy ── */
  for (let i = 0; i < 12; i++) {
    faces.push(
      plane(-2.1 + i * 0.38, H - 0.1, counter.z, 0.14, counter.depth + 1.1, C.ceilingSlat)
    );
  }

  /* ── Đèn washi sáu khoang ── */
  const lampY = 2.32;
  const lampW = 3.5;
  const lampD = 0.82;
  faces.push(...box(0, lampY + 0.34, counter.z, lampW + 0.16, 0.07, lampD + 0.16, C.lampFrame));
  for (let i = 0; i < 6; i++) {
    const px = -lampW / 2 + lampW / 12 + (i * lampW) / 6;
    faces.push(
      ...box(px, lampY, counter.z, lampW / 6 - 0.05, 0.34, lampD, C.lampPanel, {
        unlit: true,
      })
    );
  }
  faces.push(...box(0, lampY - 0.05, counter.z, lampW + 0.1, 0.05, lampD + 0.1, C.lampFrame));

  /* ── Quầy ── */
  // Thân quầy tối, có nan dọc
  faces.push(
    ...box(counter.x, 0, counter.z, counter.width, counter.height - 0.08, counter.depth, C.counterBase)
  );
  for (let i = 0; i < 26; i++) {
    const px = -counter.width / 2 + 0.1 + i * 0.16;
    faces.push(
      wallZ(px, 0.1, counter.z + counter.depth / 2 + 0.01, 0.075, 0.82, C.counterSlat)
    );
  }
  // Dải sáng hắt dưới mặt quầy
  faces.push(
    wallZ(counter.x, counter.height - 0.16, counter.z + counter.depth / 2 + 0.02,
      counter.width, 0.06, C.counterGlow, { unlit: true })
  );
  // Mặt quầy gỗ sáng
  faces.push(
    ...box(counter.x, counter.height - 0.08, counter.z,
      counter.width + 0.18, 0.08, counter.depth + 0.18, C.counterTop)
  );
  // Khay làm việc lõm ở giữa
  faces.push(
    plane(counter.x, counter.height + 0.005, counter.z - 0.25, 2.2, 0.55, C.counterEdge)
  );

  /* ── Bếp trưởng ── */
  faces.push(...box(chef.x, 0, chef.z, 0.5, 1.42, 0.28, C.chefBody));
  // Hai tay đặt trên mặt quầy, đúng tư thế đang nắn cơm
  faces.push(...box(chef.x - 0.26, 1.0, chef.z + 0.3, 0.13, 0.11, 0.44, C.chefBody));
  faces.push(...box(chef.x + 0.26, 1.0, chef.z + 0.3, 0.13, 0.11, 0.44, C.chefBody));
  faces.push(...cylinder(chef.x, 1.42, chef.z, 0.12, 0.23, C.chefSkin, 10));
  faces.push(...box(chef.x, 1.65, chef.z, 0.28, 0.12, 0.26, C.chefHat));

  /* ── Ghế ── */
  for (const seat of seats) faces.push(...stool(seat));

  return faces;
}
