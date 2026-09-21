import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/i18n";

import {
  draw,
  pick,
  project,
  projectPoint,
  type Camera,
} from "./engine";
import { buildScene, type SeatView } from "./scene";

/**
 * Góc nhìn mặc định: ngang tầm mắt người đứng ở cửa, hơi chếch xuống — đúng
 * góc trong ảnh dựng của nhà hàng. Nhìn từ trên xuống thì thấy nhiều sàn mà
 * mất tường đá và logo phía sau bếp.
 */
const DEFAULT_CAMERA: Camera = {
  target: [0, 0.85, 0.1],
  azimuth: 0,
  elevation: 0.145,
  distance: 6.0,
  fov: (52 * Math.PI) / 180,
};

/** Giới hạn xoay để khách không lạc ra sau tường. */
const AZIMUTH_LIMIT = 0.62;
const ELEVATION_MIN = 0.04;
const ELEVATION_MAX = 0.5;

/** Kéo dưới ngần này coi như chạm chọn, không phải xoay. */
const TAP_SLOP = 8;

/** Bán kính bắt quanh số ghế, tính bằng px màn hình. */
const LABEL_TAP_RADIUS = 26;

export default function RoomView({
  seats,
  onPick,
  height = 300,
}: {
  seats: SeatView[];
  onPick: (seatId: string) => void;
  height?: number;
}) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [size, setSize] = useState({ w: 0, h: height });

  const faces = useMemo(() => buildScene(seats), [seats]);

  /* Giữ danh sách mặt đã chiếu của khung hình cuối để dò điểm chạm. */
  const projectedRef = useRef<ReturnType<typeof project>>([]);

  /*
   * Vị trí các số ghế trên màn hình.
   *
   * Ghế vẽ ở phối cảnh thì nhỏ và hay bị ghế khác che, bấm trúng rất khó trên
   * điện thoại. Vòng tròn đánh số mới là thứ khách nhắm vào, nên nếu chạm
   * không trúng thân ghế thì lấy số ghế gần nhất trong bán kính cho phép.
   */
  const labelsRef = useRef<{ id: string; x: number; y: number }[]>([]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const projected = project(faces, camera, size.w, size.h);
    projectedRef.current = projected;
    draw(ctx, projected, size.w, size.h, "#0b0b0c");

    /* Nhãn ghế vẽ đè lên trên, để số ghế luôn đọc được. */
    ctx.font = "600 11px -apple-system, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    labelsRef.current = [];
    for (const seat of seats) {
      const p = projectPoint([seat.x, 1.42, seat.z], camera, size.w, size.h);
      if (!p) continue;
      if (!seat.taken) labelsRef.current.push({ id: seat.id, x: p.x, y: p.y });

      const r = 9.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = seat.selected
        ? "#e2231a"
        : seat.taken
        ? "rgba(20,20,22,0.75)"
        : "rgba(243,241,236,0.92)";
      ctx.fill();

      if (seat.premium && !seat.taken && !seat.selected) {
        ctx.strokeStyle = "#c9a96a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.fillStyle = seat.selected
        ? "#ffffff"
        : seat.taken
        ? "#6b6862"
        : "#0b0b0c";
      ctx.fillText(seat.label.replace(/^Q/, ""), p.x, p.y + 0.5);
    }
  }, [faces, camera, size, seats]);

  useEffect(() => {
    render();
  }, [render]);

  /* Theo dõi bề rộng thật của khung chứa. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: height });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  /* ── Xoay và chạm ── */
  const drag = useRef<{
    x: number;
    y: number;
    az: number;
    el: number;
    moved: number;
  } | null>(null);

  const start = (x: number, y: number) => {
    drag.current = {
      x,
      y,
      az: camera.azimuth,
      el: camera.elevation,
      moved: 0,
    };
  };

  const move = (x: number, y: number) => {
    const d = drag.current;
    if (!d) return;
    const dx = x - d.x;
    const dy = y - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    setCamera((c) => ({
      ...c,
      azimuth: Math.max(
        -AZIMUTH_LIMIT,
        Math.min(AZIMUTH_LIMIT, d.az - dx * 0.006)
      ),
      elevation: Math.max(
        ELEVATION_MIN,
        Math.min(ELEVATION_MAX, d.el + dy * 0.004)
      ),
    }));
  };

  const end = (x: number, y: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved > TAP_SLOP) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = x - rect.left;
    const py = y - rect.top;

    const hit = pick(projectedRef.current, px, py);
    if (hit) {
      onPick(hit);
      return;
    }

    // Không trúng thân ghế thì bắt theo số ghế gần nhất.
    let best: { id: string; dist: number } | null = null;
    for (const l of labelsRef.current) {
      const dist = Math.hypot(l.x - px, l.y - py);
      if (dist <= LABEL_TAP_RADIUS && (!best || dist < best.dist)) {
        best = { id: l.id, dist };
      }
    }
    if (best) onPick(best.id);
  };

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height, display: "block", touchAction: "none" }}
        className="rounded-xl"
        onPointerDown={(e) => {
          try {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          } catch {
            /* con trỏ không bắt được thì vẫn xoay và chạm bình thường */
          }
          start(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerUp={(e) => end(e.clientX, e.clientY)}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />

      <button
        onClick={() => setCamera(DEFAULT_CAMERA)}
        className="absolute right-2 top-2 rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] text-[var(--washi)]"
      >
        {t.seats.resetView}
      </button>

      <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/45 px-2.5 py-1 text-[11px] text-[var(--muted)]">
        {t.seats.dragHint}
      </div>
    </div>
  );
}
