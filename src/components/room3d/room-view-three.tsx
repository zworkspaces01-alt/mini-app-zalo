import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { useT } from "@/i18n";

import { applySeatStates, buildRoom, type RoomHandles } from "./scene-three";
import type { SeatView } from "./scene";

/**
 * Góc nhìn mặc định.
 *
 * Tâm ngắm đặt ở hàng ghế chứ không ở giữa phòng: quầy và ghế phải nằm giữa
 * khung. Trước đây tâm cao hơn nên trần và đèn chiếm gần nửa trên, đẩy ghế
 * xuống đáy — mà đáy khung hay bị thanh đặt cọc che khi khách cuộn trang,
 * thành ra chỉ thấy quầy.
 */
const DEFAULT_VIEW = { azimuth: 0, elevation: 0.145, distance: 6.15 };
const TARGET = new Vector3(0, 0.82, 0.15);

const AZIMUTH_LIMIT = 0.62;
const ELEVATION_MIN = 0.03;
const ELEVATION_MAX = 0.52;
const TAP_SLOP = 8;
const LABEL_TAP_RADIUS = 26;

/** WebGL hỏng thì báo ra ngoài để lùi về bản canvas. */
export default function RoomViewThree({
  seats,
  onPick,
  height = 300,
  onUnsupported,
}: {
  seats: SeatView[];
  onPick: (seatId: string) => void;
  height?: number;
  onUnsupported: () => void;
}) {
  const t = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const roomRef = useRef<RoomHandles | null>(null);
  const viewRef = useRef({ ...DEFAULT_VIEW });
  const labelsRef = useRef<{ id: string; x: number; y: number }[]>([]);
  const seatsRef = useRef(seats);
  seatsRef.current = seats;

  const [ready, setReady] = useState(false);

  /** Đặt lại vị trí camera từ góc xoay hiện tại. */
  const placeCamera = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const { azimuth, elevation, distance } = viewRef.current;
    cam.position.set(
      TARGET.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      TARGET.y + distance * Math.sin(elevation),
      TARGET.z + distance * Math.cos(elevation) * Math.cos(azimuth)
    );
    cam.lookAt(TARGET);
  }, []);

  /** Vẽ số ghế lên lớp canvas 2D phủ trên, và ghi lại vị trí để bắt chạm. */
  const drawLabels = useCallback(() => {
    const overlay = overlayRef.current;
    const cam = cameraRef.current;
    const wrap = wrapRef.current;
    if (!overlay || !cam || !wrap) return;

    const w = wrap.clientWidth;
    const h = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (overlay.width !== w * dpr || overlay.height !== h * dpr) {
      overlay.width = w * dpr;
      overlay.height = h * dpr;
    }
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "600 11px -apple-system, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    /* Chiếu vị trí từng ghế ra màn hình. */
    const v = new Vector3();
    const marks: { seat: (typeof seatsRef.current)[number]; x: number; y: number }[] = [];
    for (const seat of seatsRef.current) {
      v.set(seat.x, 1.46, seat.z).project(cam);
      if (v.z > 1) continue;
      marks.push({
        seat,
        x: ((v.x + 1) / 2) * w,
        y: ((1 - v.y) / 2) * h,
      });
    }

    /*
     * Tách các số chồng nhau.
     *
     * Ghế hai bên quầy ở xa hơn nên trong phối cảnh chúng dồn sát lại, ba số
     * đè lên nhau thành một cục không đọc được. Đẩy nhẹ từng cặp ra xa nhau
     * vài vòng là đủ, không cần thuật toán phức tạp.
     */
    const R = 9.5;
    const MIN = R * 2 + 2;
    for (let pass = 0; pass < 12; pass++) {
      let moved = false;
      for (let i = 0; i < marks.length; i++) {
        for (let j = i + 1; j < marks.length; j++) {
          const a = marks[i];
          const b = marks[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.hypot(dx, dy);
          if (dist >= MIN) continue;
          if (dist < 0.001) {
            dx = 1;
            dy = 0;
            dist = 1;
          }
          const push = (MIN - dist) / 2;
          const ux = (dx / dist) * push;
          const uy = (dy / dist) * push;
          a.x -= ux;
          a.y -= uy;
          b.x += ux;
          b.y += uy;
          moved = true;
        }
      }
      if (!moved) break;
    }

    labelsRef.current = [];
    for (const { seat, x, y } of marks) {
      if (!seat.taken) labelsRef.current.push({ id: seat.id, x, y });

      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = seat.selected
        ? "#e2231a"
        : seat.taken
        ? "rgba(16,16,18,0.8)"
        : "rgba(243,241,236,0.95)";
      ctx.fill();
      if (seat.premium && !seat.taken && !seat.selected) {
        ctx.strokeStyle = "#c9a96a";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.fillStyle = seat.selected ? "#fff" : seat.taken ? "#6b6862" : "#0b0b0c";
      ctx.fillText(seat.label.replace(/^Q/, ""), x, y + 0.5);
    }
  }, [height]);

  const render = useCallback(() => {
    const r = rendererRef.current;
    const cam = cameraRef.current;
    const room = roomRef.current;
    if (!r || !cam || !room) return;
    r.render(room.scene, cam);
    drawLabels();
  }, [drawLabels]);

  /* ── Dựng cảnh một lần ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "default",
      });
    } catch {
      // Máy không dựng được ngữ cảnh WebGL — lùi về bản canvas 2D.
      onUnsupported();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.outputColorSpace = SRGBColorSpace;
    rendererRef.current = renderer;

    const camera = new PerspectiveCamera(52, 1, 0.1, 60);
    cameraRef.current = camera;

    const room = buildRoom(seatsRef.current);
    roomRef.current = room;
    applySeatStates(room.seats, seatsRef.current);

    const resize = () => {
      const w = wrap.clientWidth;
      if (w === 0) return;
      renderer.setSize(w, height, false);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      placeCamera();
      render();
    };
    resize();
    setReady(true);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      ro.disconnect();
      room.dispose();
      renderer.dispose();
      rendererRef.current = null;
      roomRef.current = null;
    };
    // Dựng một lần; trạng thái ghế cập nhật ở effect bên dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Đổi trạng thái ghế thì tô lại, không dựng lại ── */
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !ready) return;
    applySeatStates(room.seats, seats);
    render();
  }, [seats, ready, render]);

  /* ── Xoay và chạm ── */
  const drag = useRef<{ x: number; y: number; az: number; el: number; moved: number } | null>(null);

  const onDown = (x: number, y: number) => {
    drag.current = {
      x,
      y,
      az: viewRef.current.azimuth,
      el: viewRef.current.elevation,
      moved: 0,
    };
  };

  const onMove = (x: number, y: number) => {
    const d = drag.current;
    if (!d) return;
    const dx = x - d.x;
    const dy = y - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    viewRef.current.azimuth = Math.max(
      -AZIMUTH_LIMIT,
      Math.min(AZIMUTH_LIMIT, d.az - dx * 0.006)
    );
    viewRef.current.elevation = Math.max(
      ELEVATION_MIN,
      Math.min(ELEVATION_MAX, d.el + dy * 0.004)
    );
    placeCamera();
    render();
  };

  const onUp = (clientX: number, clientY: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved > TAP_SLOP) return;

    const wrap = wrapRef.current;
    const cam = cameraRef.current;
    const room = roomRef.current;
    if (!wrap || !cam || !room) return;

    const rect = wrap.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const ray = new Raycaster();
    ray.setFromCamera(
      new Vector2((px / rect.width) * 2 - 1, -(py / height) * 2 + 1),
      cam
    );
    const hits = ray.intersectObjects(room.pickTargets, false);
    const seatId = hits[0]?.object.userData.seatId as string | undefined;
    if (seatId) {
      const seat = seatsRef.current.find((s) => s.id === seatId);
      if (seat && !seat.taken) {
        onPick(seatId);
        return;
      }
    }

    // Trượt khỏi thân ghế thì bắt theo số ghế gần nhất — trên điện thoại
    // vòng tròn đánh số mới là thứ khách nhắm vào.
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
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full rounded-xl"
        style={{ touchAction: "none" }}
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ width: "100%", height }}
      />
      <div
        className="absolute inset-0"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          try {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          } catch {
            /* không bắt được con trỏ thì vẫn xoay và chạm bình thường */
          }
          onDown(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => onMove(e.clientX, e.clientY)}
        onPointerUp={(e) => onUp(e.clientX, e.clientY)}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />

      <button
        onClick={() => {
          viewRef.current = { ...DEFAULT_VIEW };
          placeCamera();
          render();
        }}
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
