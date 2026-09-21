import { useCallback, useEffect, useState } from "react";

import RoomView from "@/components/room3d/room-view";
import RoomViewThree from "@/components/room3d/room-view-three";
import type { SeatView } from "@/components/room3d/scene";
import { Note, Skeleton } from "@/components/ui";
import { useT } from "@/i18n";
import { fetchSeatAvailability, fetchSeats } from "@/services/api";
import { haptic } from "@/services/zalo";

/**
 * Chọn chỗ ngồi ở quầy omakase.
 *
 * Khách thấy đúng căn phòng thật và chạm vào ghế mình muốn. Ghế đã có người
 * giữ thì xám và không chạm được. Ghế nhìn thẳng tay bếp trưởng có viền vàng.
 *
 * Đây chỉ là bước chọn cho dễ hình dung — server vẫn kiểm tra lại khi lưu,
 * phòng trường hợp hai khách bấm cùng lúc.
 */
export default function SeatPicker({
  date,
  time,
  guests,
  selected,
  onChange,
}: {
  /** Bỏ trống khi khách chưa chọn xong ngày giờ — khi đó chỉ xem phòng. */
  date?: string;
  time?: string;
  guests: number;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useT();
  const [seats, setSeats] = useState<Omit<SeatView, "selected">[] | null>(null);
  /** false = đang dùng sơ đồ đóng gói, chưa biết ghế nào đã có người. */
  const [live, setLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  /* Máy không chạy được WebGL thì lùi về bản dựng bằng canvas 2D. */
  const [noWebGL, setNoWebGL] = useState(false);

  /* Chưa chọn xong ngày giờ thì chỉ xem phòng, chưa chọn được ghế. */
  const preview = !date || !time;

  useEffect(() => {
    let alive = true;
    setSeats(null);
    setError(null);

    const load = preview
      ? fetchSeats()
      : fetchSeatAvailability(date as string, time as string);

    load
      .then(({ seats: rows, live: isLive }) => {
        if (!alive) return;
        setSeats(rows);
        setLive(isLive);
        if (preview || !isLive) return;
        // Ghế đang chọn vừa bị người khác giữ mất thì bỏ ra khỏi lựa chọn.
        const stillFree = new Set(rows.filter((r) => !r.taken).map((r) => r.id));
        const kept = selected.filter((id) => stillFree.has(id));
        if (kept.length !== selected.length) onChange(kept);
      })
      .catch(() => {
        if (alive) setError(t.seats.loadFailed);
      });
    return () => {
      alive = false;
    };
    // Chỉ tải lại khi đổi ngày giờ; `selected` đổi liên tục nên không đưa vào.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, preview]);

  const toggle = useCallback(
    (id: string) => {
      setHint(null);
      if (preview) {
        setHint(t.seats.needDateTime);
        return;
      }
      if (selected.includes(id)) {
        haptic("light");
        onChange(selected.filter((s) => s !== id));
        return;
      }
      if (selected.length >= guests) {
        setHint(t.seats.alreadyFull(guests));
        return;
      }
      haptic("light");
      onChange([...selected, id]);
    },
    [selected, guests, onChange, t, preview]
  );

  if (error) {
    return (
      <div className="card p-4">
        <Note>{error}</Note>
      </div>
    );
  }

  if (!seats) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  const view: SeatView[] = seats.map((s) => ({
    ...s,
    selected: selected.includes(s.id),
  }));

  const free = seats.filter((s) => !s.taken).length;
  const enough = free >= guests;

  return (
    <div>
      {noWebGL ? (
        <RoomView seats={view} onPick={toggle} />
      ) : (
        <RoomViewThree
          seats={view}
          onPick={toggle}
          onUnsupported={() => setNoWebGL(true)}
        />
      )}

      {preview && (
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]">
          {t.seats.needDateTime}
        </p>
      )}

      {!live && !preview && (
        <p className="mt-3 rounded-lg border border-[var(--gold-dim)] bg-[var(--gold-dim)] px-3 py-2 text-[12px] leading-relaxed text-[var(--gold)]">
          {t.seats.offline}
        </p>
      )}

      {/* Chú giải */}
      {!preview && (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full border border-[var(--line-strong)] bg-[#f3f1ec]" />
          <span className="text-[var(--muted)]">{t.seats.legendFree}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full border-2 border-[var(--gold)] bg-[#f3f1ec]" />
          <span className="text-[var(--muted)]">{t.seats.legendPremium}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full bg-[var(--shu)]" />
          <span className="text-[var(--muted)]">{t.seats.legendMine}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-full border border-[var(--line)] bg-[#3a3833]" />
          <span className="text-[var(--muted)]">{t.seats.legendTaken}</span>
        </span>
      </div>
      )}

      {/* Tình trạng chọn */}
      {!preview && (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3">
        <span className="text-[13px] text-[var(--muted)]">
          {t.seats.chosen(selected.length, guests)}
        </span>
        <span className="text-[14px] font-medium tracking-wide">
          {selected.length > 0
            ? [...selected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(" · ")
            : "—"}
        </span>
      </div>
      )}

      {hint && (
        <p className="mt-2 text-[12px] text-[var(--shu)]">{hint}</p>
      )}

      {!preview && !enough && (
        <p className="mt-2 text-[12px] text-[var(--shu)]">
          {t.seats.notEnough(free, guests)}
        </p>
      )}

      {!preview && (
        <div className="mt-2">
          <Note>{t.seats.holdNote}</Note>
        </div>
      )}
    </div>
  );
}
