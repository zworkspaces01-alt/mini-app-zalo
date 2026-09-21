/**
 * Bộ dựng hình 3D tối giản, vẽ bằng canvas 2D.
 *
 * Vì sao không dùng three.js: nó thêm khoảng 200KB gzip vào mini app, gần gấp
 * đôi kích thước hiện tại, và cần WebGL — thứ không phải webview Zalo nào
 * trên máy Android tầm trung cũng chạy mượt. Cảnh ở đây chỉ gồm vài chục khối
 * hộp, thuật toán hoạ sĩ là quá đủ và chạy được ở mọi nơi.
 *
 * Giới hạn đã biết: sắp xếp theo độ sâu trọng tâm nên hai mặt cắt nhau có thể
 * vẽ sai thứ tự. Cảnh này các khối tách rời nhau nên không gặp.
 */

export type Vec3 = [number, number, number];

export interface Face {
  /** Các đỉnh theo chiều kim đồng hồ khi nhìn từ ngoài vào */
  points: Vec3[];
  color: string;
  /** Bấm trúng mặt này thì trả về id — dùng để chọn ghế */
  pickId?: string;
  /** Bỏ qua tô bóng, dùng cho nguồn sáng và mặt phát sáng */
  unlit?: boolean;
  /** Vẽ viền quanh mặt */
  stroke?: string;
  /** 0–1, mặc định 1 */
  opacity?: number;
}

export interface Camera {
  /** Tâm xoay */
  target: Vec3;
  /** Góc phương vị, radian. 0 = nhìn từ phía cửa vào bếp */
  azimuth: number;
  /** Góc ngẩng, radian */
  elevation: number;
  distance: number;
  /** Góc mở ống kính, radian */
  fov: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Hướng ánh sáng chính — chếch từ trên xuống, hơi lệch trái, giống đèn quầy. */
const LIGHT = norm([-0.35, 0.9, 0.25]);

function cameraPosition(cam: Camera): Vec3 {
  const { target, azimuth, elevation, distance } = cam;
  return [
    target[0] + distance * Math.cos(elevation) * Math.sin(azimuth),
    target[1] + distance * Math.sin(elevation),
    target[2] + distance * Math.cos(elevation) * Math.cos(azimuth),
  ];
}

/** Ba trục của hệ toạ độ camera. */
function cameraBasis(cam: Camera) {
  const eye = cameraPosition(cam);
  const forward = norm(sub(cam.target, eye));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { eye, forward, right, up };
}

/** Tách riêng màu ra ba kênh để nhân với hệ số sáng. */
function shade(hex: string, factor: number, opacity = 1): string {
  const v = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((v >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((v >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((v & 255) * factor));
  return opacity >= 1
    ? `rgb(${r},${g},${b})`
    : `rgba(${r},${g},${b},${opacity})`;
}

interface Projected {
  screen: { x: number; y: number }[];
  depth: number;
  face: Face;
  fill: string;
}

/**
 * Chiếu và sắp xếp các mặt. Trả về danh sách đã sắp từ xa tới gần, kèm toạ độ
 * màn hình để vừa vẽ vừa dò điểm chạm.
 */
export function project(
  faces: Face[],
  cam: Camera,
  width: number,
  height: number
): Projected[] {
  const { eye, forward, right, up } = cameraBasis(cam);
  const focal = height / 2 / Math.tan(cam.fov / 2);
  const out: Projected[] = [];

  for (const face of faces) {
    const screen: { x: number; y: number }[] = [];
    let depthSum = 0;
    let visible = true;

    for (const p of face.points) {
      const d = sub(p, eye);
      const z = dot(d, forward);
      // Mặt có đỉnh sau lưng camera thì bỏ qua, tránh chiếu ngược ra sau.
      if (z <= 0.05) {
        visible = false;
        break;
      }
      screen.push({
        x: width / 2 + (dot(d, right) * focal) / z,
        y: height / 2 - (dot(d, up) * focal) / z,
      });
      depthSum += z;
    }
    if (!visible || screen.length < 3) continue;

    let fill: string;
    if (face.unlit) {
      fill =
        face.opacity !== undefined && face.opacity < 1
          ? shade(face.color, 1, face.opacity)
          : face.color;
    } else {
      const n = norm(
        cross(sub(face.points[1], face.points[0]), sub(face.points[2], face.points[0]))
      );
      // Lấy trị tuyệt đối: mặt quay hướng nào cũng nhận sáng, nhờ vậy không
      // phải bận tâm thứ tự đỉnh khi dựng hình.
      const lambert = Math.abs(dot(n, LIGHT));
      fill = shade(face.color, 0.45 + 0.55 * lambert, face.opacity ?? 1);
    }

    out.push({ screen, depth: depthSum / face.points.length, face, fill });
  }

  // Xa vẽ trước, gần vẽ sau.
  out.sort((a, b) => b.depth - a.depth);
  return out;
}

/** Chiếu một điểm ra toạ độ màn hình. Trả về null nếu điểm ở sau camera. */
export function projectPoint(
  p: Vec3,
  cam: Camera,
  width: number,
  height: number
): { x: number; y: number; depth: number } | null {
  const { eye, forward, right, up } = cameraBasis(cam);
  const focal = height / 2 / Math.tan(cam.fov / 2);
  const d = sub(p, eye);
  const z = dot(d, forward);
  if (z <= 0.05) return null;
  return {
    x: width / 2 + (dot(d, right) * focal) / z,
    y: height / 2 - (dot(d, up) * focal) / z,
    depth: z,
  };
}

export function draw(
  ctx: CanvasRenderingContext2D,
  projected: Projected[],
  width: number,
  height: number,
  background: string
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  for (const { screen, fill, face } of projected) {
    ctx.beginPath();
    ctx.moveTo(screen[0].x, screen[0].y);
    for (let i = 1; i < screen.length; i++) ctx.lineTo(screen[i].x, screen[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (face.stroke) {
      ctx.strokeStyle = face.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function inside(poly: { x: number; y: number }[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      hit = !hit;
    }
  }
  return hit;
}

/** Mặt gần nhất có pickId nằm dưới điểm chạm. */
export function pick(
  projected: Projected[],
  x: number,
  y: number
): string | null {
  for (let i = projected.length - 1; i >= 0; i--) {
    const p = projected[i];
    if (!p.face.pickId) continue;
    if (inside(p.screen, x, y)) return p.face.pickId;
  }
  return null;
}

/* ─────────────── Dựng khối ─────────────── */

/** Hộp chữ nhật, cho tâm đáy và kích thước. */
export function box(
  cx: number,
  by: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  color: string,
  opts: { pickId?: string; unlit?: boolean; rotation?: number } = {}
): Face[] {
  const hw = w / 2;
  const hd = d / 2;
  const rot = ((opts.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const at = (dx: number, dy: number, dz: number): Vec3 => [
    cx + dx * cos + dz * sin,
    by + dy,
    cz - dx * sin + dz * cos,
  ];

  const p = [
    at(-hw, 0, -hd), at(hw, 0, -hd), at(hw, 0, hd), at(-hw, 0, hd),
    at(-hw, h, -hd), at(hw, h, -hd), at(hw, h, hd), at(-hw, h, hd),
  ];

  const f = (a: number, b: number, c: number, d2: number): Face => ({
    points: [p[a], p[b], p[c], p[d2]],
    color,
    pickId: opts.pickId,
    unlit: opts.unlit,
  });

  return [
    f(4, 5, 6, 7), // trên
    f(0, 3, 2, 1), // dưới
    f(0, 1, 5, 4), // sau
    f(2, 3, 7, 6), // trước
    f(1, 2, 6, 5), // phải
    f(3, 0, 4, 7), // trái
  ];
}

/** Lăng trụ đứng, dùng cho chân ghế và mặt ngồi tròn. */
export function cylinder(
  cx: number,
  by: number,
  cz: number,
  radius: number,
  h: number,
  color: string,
  sides = 10,
  opts: { pickId?: string; unlit?: boolean } = {}
): Face[] {
  const ring = (y: number): Vec3[] =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2;
      return [cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius] as Vec3;
    });

  const low = ring(by);
  const high = ring(by + h);
  const faces: Face[] = [
    { points: high, color, pickId: opts.pickId, unlit: opts.unlit },
  ];

  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push({
      points: [low[i], low[j], high[j], high[i]],
      color,
      pickId: opts.pickId,
      unlit: opts.unlit,
    });
  }
  return faces;
}

/** Mặt phẳng nằm ngang, ví dụ sàn. */
export function plane(
  cx: number,
  y: number,
  cz: number,
  w: number,
  d: number,
  color: string,
  opts: { unlit?: boolean } = {}
): Face {
  const hw = w / 2;
  const hd = d / 2;
  return {
    points: [
      [cx - hw, y, cz - hd],
      [cx + hw, y, cz - hd],
      [cx + hw, y, cz + hd],
      [cx - hw, y, cz + hd],
    ],
    color,
    unlit: opts.unlit,
  };
}

/** Mặt phẳng đứng vuông góc trục z. */
export function wallZ(
  cx: number,
  by: number,
  z: number,
  w: number,
  h: number,
  color: string,
  opts: { unlit?: boolean } = {}
): Face {
  const hw = w / 2;
  return {
    points: [
      [cx - hw, by, z],
      [cx + hw, by, z],
      [cx + hw, by + h, z],
      [cx - hw, by + h, z],
    ],
    color,
    unlit: opts.unlit,
  };
}

/** Mặt phẳng đứng vuông góc trục x. */
export function wallX(
  x: number,
  by: number,
  cz: number,
  d: number,
  h: number,
  color: string,
  opts: { unlit?: boolean } = {}
): Face {
  const hd = d / 2;
  return {
    points: [
      [x, by, cz - hd],
      [x, by, cz + hd],
      [x, by + h, cz + hd],
      [x, by + h, cz - hd],
    ],
    color,
    unlit: opts.unlit,
  };
}
