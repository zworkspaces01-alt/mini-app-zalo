/**
 * Phòng omakase dựng bằng three.js.
 *
 * Khác bản canvas ở chỗ có ánh sáng thật, đổ bóng mềm và vật liệu nhám —
 * đó là những thứ làm nên chất ảnh mà tô phẳng từng mặt không cho được.
 *
 * Ghế được gắn `userData.seatId` để bắt tia chọn; đổi trạng thái ghế thì gọi
 * `applySeatStates` chứ không dựng lại cả cảnh.
 */
import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Scene,
  Color,
  type Texture,
} from "three";

import { ROOM } from "@/data/seats";

import { darkStone, herringboneFloor, lightWood, washi } from "./textures";
import type { SeatView } from "./scene";

const COLOR = {
  wall: 0x1e1e23,
  ceiling: 0x141418,
  counterBase: 0x211d19,
  slat: 0x3a3129,
  cabinet: 0xb08a52,
  cabinetLine: 0x7a5f38,
  blind: 0x7d6848,
  window: 0x6e8ea3,
  chefCloth: 0x1b1b21,
  chefSkin: 0xc79a79,
  cushion: 0xb03a30,
  cushionTaken: 0x4a4641,
  woodTaken: 0x53504a,
  selected: 0xe2231a,
  glow: 0xffc978,
  logoWhite: 0xf3f1ec,
  logoRed: 0xe2231a,
} as const;

export interface SeatHandles {
  group: Group;
  seatId: string;
  /** Các mesh đổi màu theo trạng thái */
  wood: Mesh[];
  cushion: Mesh[];
}

export interface RoomHandles {
  scene: Scene;
  seats: SeatHandles[];
  /** Mọi thứ bắt được tia chọn */
  pickTargets: Object3D[];
  dispose: () => void;
}

function std(opts: {
  color?: number;
  map?: Texture;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
}) {
  // Không đưa khoá undefined vào: three sẽ cảnh báo từng tham số một.
  const params: Record<string, unknown> = {
    color: opts.color ?? 0xffffff,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.02,
  };
  if (opts.map) params.map = opts.map;
  if (opts.emissive !== undefined) {
    params.emissive = new Color(opts.emissive);
    params.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  return new MeshStandardMaterial(params);
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  mat: MeshStandardMaterial | MeshBasicMaterial,
  x = 0,
  y = 0,
  z = 0
) {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Một chiếc ghế quầy: chân, mặt ngồi, đệm, tựa lưng nan. */
function buildStool(seat: SeatView, woodTex: Texture): SeatHandles {
  const group = new Group();
  group.position.set(seat.x, 0, seat.z);
  group.rotation.y = (-seat.rotation * Math.PI) / 180;

  const woodMat = std({ map: woodTex, roughness: 0.72 });
  const cushionMat = std({ color: COLOR.cushion, roughness: 0.95 });
  const wood: Mesh[] = [];
  const cushion: Mesh[] = [];

  const leg = new CylinderGeometry(0.022, 0.026, 0.62, 8);
  for (const [dx, dz] of [
    [-0.17, -0.17],
    [0.17, -0.17],
    [-0.17, 0.17],
    [0.17, 0.17],
  ]) {
    const m = new Mesh(leg, woodMat);
    m.position.set(dx, 0.31, dz);
    m.castShadow = true;
    group.add(m);
    wood.push(m);
  }

  const seatTop = new Mesh(new CylinderGeometry(0.235, 0.235, 0.05, 20), woodMat);
  seatTop.position.y = 0.645;
  seatTop.castShadow = true;
  seatTop.receiveShadow = true;
  group.add(seatTop);
  wood.push(seatTop);

  const pad = new Mesh(new CylinderGeometry(0.215, 0.225, 0.06, 20), cushionMat);
  pad.position.y = 0.7;
  pad.castShadow = true;
  group.add(pad);
  cushion.push(pad);

  // Tựa lưng: hai trụ đứng, năm nan dọc, một thanh ngang trên cùng
  const postGeo = new CylinderGeometry(0.018, 0.018, 0.56, 8);
  for (const dx of [-0.21, 0.21]) {
    const m = new Mesh(postGeo, woodMat);
    m.position.set(dx, 0.98, 0.2);
    m.castShadow = true;
    group.add(m);
    wood.push(m);
  }
  const spindle = new CylinderGeometry(0.011, 0.011, 0.48, 6);
  for (let i = 0; i < 5; i++) {
    const m = new Mesh(spindle, woodMat);
    m.position.set(-0.14 + i * 0.07, 0.95, 0.2);
    m.castShadow = true;
    group.add(m);
    wood.push(m);
  }
  const rail = new Mesh(new BoxGeometry(0.46, 0.05, 0.05), woodMat);
  rail.position.set(0, 1.25, 0.2);
  rail.castShadow = true;
  group.add(rail);
  wood.push(rail);

  for (const m of [...wood, ...cushion]) m.userData.seatId = seat.id;
  group.userData.seatId = seat.id;

  return { group, seatId: seat.id, wood, cushion };
}

export function buildRoom(seats: SeatView[]): RoomHandles {
  const scene = new Scene();
  scene.background = new Color(0x0b0b0c);
  // Sương nhẹ cùng tông nền: góc phòng chìm dần thay vì cắt phẳng.
  scene.fog = new Fog(0x0b0b0c, 7.5, 15);

  const { width: W, depth: D, height: H, counter, chef } = ROOM;

  const texFloor = herringboneFloor();
  const texWood = lightWood("#cbaa79");
  const texCounter = lightWood("#c2a179");
  const texStone = darkStone();
  const texWashi = washi();
  const textures = [texFloor, texWood, texCounter, texStone, texWashi];

  /* ── Sàn ── */
  const floor = new Mesh(
    new PlaneGeometry(W, D),
    std({ map: texFloor, roughness: 0.62 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ── Trần và tường ── */
  const ceiling = new Mesh(new PlaneGeometry(W, D), std({ color: COLOR.ceiling, roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  scene.add(ceiling);

  const backWall = new Mesh(
    new PlaneGeometry(W, H),
    std({ map: texStone, roughness: 0.94 })
  );
  backWall.position.set(0, H / 2, -D / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const sideMat = std({ color: COLOR.wall, roughness: 1 });
  const left = new Mesh(new PlaneGeometry(D, H), sideMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, H / 2, 0);
  left.receiveShadow = true;
  scene.add(left);

  const right = new Mesh(new PlaneGeometry(D, H), sideMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, H / 2, 0);
  right.receiveShadow = true;
  scene.add(right);

  /* ── Logo MIYAKO phát sáng ── */
  const logoBar = new Mesh(
    new PlaneGeometry(1.6, 0.3),
    new MeshBasicMaterial({ color: COLOR.logoWhite })
  );
  logoBar.position.set(-0.3, 1.78, -D / 2 + 0.03);
  scene.add(logoBar);

  const logoDot = new Mesh(
    new PlaneGeometry(0.34, 0.34),
    new MeshBasicMaterial({ color: COLOR.logoRed })
  );
  logoDot.position.set(0.76, 1.8, -D / 2 + 0.03);
  scene.add(logoDot);

  const logoGlow = new PointLight(0xffe0d0, 4, 3.0, 2);
  logoGlow.position.set(0, 1.85, -D / 2 + 0.6);
  scene.add(logoGlow);

  /* ── Cửa sổ và chớp gỗ bên trái ── */
  const win = new Mesh(
    new PlaneGeometry(2.6, 1.5),
    new MeshBasicMaterial({ color: COLOR.window })
  );
  win.rotation.y = Math.PI / 2;
  win.position.set(-W / 2 + 0.04, 1.75, -0.4);
  scene.add(win);

  const blindMat = std({ color: COLOR.blind, roughness: 0.8 });
  for (let i = 0; i < 11; i++) {
    const s = new Mesh(new BoxGeometry(0.02, 0.055, 2.6), blindMat);
    s.position.set(-W / 2 + 0.09, 1.08 + i * 0.135, -0.4);
    s.castShadow = true;
    scene.add(s);
  }
  const daylight = new PointLight(0xbcd8ea, 5.5, 5.5, 2);
  daylight.position.set(-W / 2 + 1.0, 1.9, -0.4);
  scene.add(daylight);

  /* ── Tủ gỗ cao bên phải ── */
  const cab = boxMesh(0.42, 2.72, 4.3, std({ map: texWood, color: COLOR.cabinet, roughness: 0.75 }), W / 2 - 0.23, 0, -0.2);
  scene.add(cab);
  const lineMat = std({ color: COLOR.cabinetLine, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const g = new Mesh(new BoxGeometry(0.02, 2.72, 0.025), lineMat);
    g.position.set(W / 2 - 0.44, 1.36, -2.05 + i * 0.73);
    scene.add(g);
  }

  /* ── Trần nan gỗ trên quầy ── */
  // Nan trần là chi tiết nền: để tối và nhám hẳn, nếu không chúng hứng trọn
  // ánh đèn quầy và biến thành nan quạt sáng chói chiếm hết khung hình.
  const slatMat = std({ color: 0x2a2018, roughness: 1, metalness: 0 });
  for (let i = 0; i < 14; i++) {
    const s = new Mesh(new BoxGeometry(0.05, 0.05, counter.depth + 1.5), slatMat);
    s.position.set(-2.15 + i * 0.33, H - 0.035, counter.z);
    scene.add(s);
  }

  /* ── Đèn washi sáu khoang ── */
  const lampY = 2.3;
  const lampW = 3.5;
  const lampD = 0.85;
  const frameMat = std({ map: texWood, color: 0x8a6c44, roughness: 0.7 });
  const shadeMat = new MeshStandardMaterial({
    map: texWashi,
    color: 0xe8cf9a,
    emissive: new Color(0xffb15e),
    emissiveIntensity: 1.9,
    roughness: 1,
    side: DoubleSide,
  });

  const lamp = new Group();
  for (let i = 0; i < 6; i++) {
    const px = -lampW / 2 + lampW / 12 + (i * lampW) / 6;
    const panel = new Mesh(new BoxGeometry(lampW / 6 - 0.045, 0.36, lampD), shadeMat);
    panel.position.set(px, lampY + 0.18, 0);
    lamp.add(panel);
  }
  const top = new Mesh(new BoxGeometry(lampW + 0.18, 0.07, lampD + 0.18), frameMat);
  top.position.set(0, lampY + 0.4, 0);
  top.castShadow = true;
  lamp.add(top);
  const bottom = new Mesh(new BoxGeometry(lampW + 0.12, 0.05, lampD + 0.12), frameMat);
  bottom.position.set(0, lampY - 0.02, 0);
  lamp.add(bottom);
  lamp.position.z = counter.z;
  scene.add(lamp);

  // Ba nguồn sáng rải theo chiều dài đèn, cho bóng đổ mềm trên quầy
  for (const px of [-1.15, 0, 1.15]) {
    const l = new PointLight(COLOR.glow, 17, 7.5, 2);
    l.position.set(px, lampY - 0.1, counter.z);
    l.castShadow = px === 0;
    if (l.castShadow) {
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.002;
    }
    scene.add(l);
  }

  /* ── Quầy ── */
  const baseMat = std({ color: COLOR.counterBase, roughness: 0.95 });
  const base = boxMesh(counter.width, counter.height - 0.09, counter.depth, baseMat, counter.x, 0, counter.z);
  scene.add(base);

  const slatFrontMat = std({ color: COLOR.slat, roughness: 0.85 });
  for (let i = 0; i < 27; i++) {
    const s = new Mesh(new BoxGeometry(0.055, 0.8, 0.03), slatFrontMat);
    s.position.set(-counter.width / 2 + 0.11 + i * 0.155, 0.46, counter.z + counter.depth / 2 + 0.015);
    scene.add(s);
  }

  const topMat = std({ map: texCounter, roughness: 0.45, metalness: 0.03 });
  const counterTop = boxMesh(
    counter.width + 0.2, 0.09, counter.depth + 0.2, topMat,
    counter.x, counter.height - 0.09, counter.z
  );
  scene.add(counterTop);

  // Dải sáng hắt dưới mép quầy
  const strip = new Mesh(
    new BoxGeometry(counter.width, 0.035, 0.02),
    new MeshBasicMaterial({ color: 0xffb765 })
  );
  strip.position.set(counter.x, counter.height - 0.16, counter.z + counter.depth / 2 + 0.03);
  scene.add(strip);
  const stripLight = new PointLight(0xff9b45, 5, 2.4, 2);
  stripLight.position.set(counter.x, counter.height - 0.3, counter.z + counter.depth / 2 + 0.25);
  scene.add(stripLight);

  /* ── Bếp trưởng ── */
  const clothMat = std({ color: COLOR.chefCloth, roughness: 0.95 });
  const chefGroup = new Group();
  chefGroup.position.set(chef.x, 0, chef.z);
  const torso = new Mesh(new CylinderGeometry(0.23, 0.27, 1.4, 12), clothMat);
  torso.position.y = 0.7;
  torso.castShadow = true;
  chefGroup.add(torso);
  for (const dx of [-0.27, 0.27]) {
    const arm = new Mesh(new BoxGeometry(0.11, 0.1, 0.5), clothMat);
    arm.position.set(dx, 1.03, 0.32);
    arm.rotation.x = -0.12;
    arm.castShadow = true;
    chefGroup.add(arm);
  }
  const head = new Mesh(new CylinderGeometry(0.115, 0.115, 0.23, 12), std({ color: COLOR.chefSkin, roughness: 0.75 }));
  head.position.y = 1.53;
  head.castShadow = true;
  chefGroup.add(head);
  const hat = new Mesh(new BoxGeometry(0.28, 0.12, 0.26), clothMat);
  hat.position.y = 1.7;
  hat.castShadow = true;
  chefGroup.add(hat);
  scene.add(chefGroup);

  /* ── Ghế ── */
  const seatHandles: SeatHandles[] = [];
  const pickTargets: Object3D[] = [];
  for (const seat of seats) {
    const h = buildStool(seat, texWood);
    scene.add(h.group);
    seatHandles.push(h);
    pickTargets.push(...h.wood, ...h.cushion);
  }

  /* ── Ánh sáng nền ── */
  // Nền tối, để đèn washi trên quầy làm nguồn sáng chính — đó là thứ tạo
  // không khí trong ảnh dựng của nhà hàng.
  scene.add(new AmbientLight(0xffe2c4, 0.3));

  const key = new DirectionalLight(0xfff0d8, 0.55);
  key.position.set(-2.6, 4.2, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const fill = new DirectionalLight(0x9fb6c9, 0.16);
  fill.position.set(3.4, 2.6, 2.4);
  scene.add(fill);

  return {
    scene,
    seats: seatHandles,
    pickTargets,
    dispose: () => {
      for (const t of textures) t.dispose();
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
    },
  };
}

/** Đổi màu ghế theo trạng thái, không dựng lại cảnh. */
export function applySeatStates(handles: SeatHandles[], seats: SeatView[]) {
  const byId = new Map(seats.map((s) => [s.id, s]));
  for (const h of handles) {
    const s = byId.get(h.seatId);
    if (!s) continue;

    const woodColor = s.selected ? COLOR.selected : s.taken ? COLOR.woodTaken : 0xffffff;
    const cushionColor = s.selected
      ? COLOR.selected
      : s.taken
      ? COLOR.cushionTaken
      : COLOR.cushion;

    for (const m of h.wood) {
      const mat = (m.material as MeshStandardMaterial).clone();
      mat.color.setHex(woodColor);
      mat.emissive.setHex(s.selected ? 0x3a0805 : 0x000000);
      m.material = mat;
    }
    for (const m of h.cushion) {
      const mat = (m.material as MeshStandardMaterial).clone();
      mat.color.setHex(cushionColor);
      mat.emissive.setHex(s.selected ? 0x4a0a06 : 0x000000);
      m.material = mat;
    }
  }
}
