import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { Skeleton } from "./ui";

interface SeatRow {
  seat_id: string;
  label: string;
  rotation: number;
  is_premium: boolean;
  taken: boolean;
}

/**
 * Chọn ghế bằng lưới chip.
 *
 * Nhân viên xếp chỗ qua điện thoại, cần thao tác nhanh hơn là đẹp — nên ở
 * đây dùng lưới phẳng thay vì mô hình 3D như bên mini app. Mỗi cạnh quầy một
 * hàng chip, để nhìn vào là biết ghế nào ngồi cạnh ghế nào.
 */
export default function SeatChips({
  date,
  time,
  guests,
  value,
  onChange,
  excludeReservation,
}: {
  date: string;
  time: string;
  guests: number;
  value: string[];
  onChange: (ids: string[]) => void;
  excludeReservation?: string;
}) {
  const [rows, setRows] = useState<SeatRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    supabase
      .rpc("get_seat_availability", {
        p_date: date,
        p_time: time,
        p_exclude_reservation: excludeReservation,
      })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        setRows((data as SeatRow[] | null) ?? []);
      });
    return () => {
      alive = false;
    };
  }, [date, time, excludeReservation]);

  if (error) return <p className="text-[12px] text-shu">{error}</p>;
  if (!rows) return <Skeleton className="h-20 w-full rounded-lg" />;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((s) => s !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // Ghế cùng hướng ngồi nằm cùng một cạnh quầy. Hàm trả ghế theo sort_order
  // nên chỉ cần tách mỗi khi hướng ngồi đổi.
  const lines: SeatRow[][] = [];
  for (const s of rows) {
    const last = lines[lines.length - 1];
    if (last && Number(last[0].rotation) === Number(s.rotation)) last.push(s);
    else lines.push([s]);
  }

  return (
    <div>
      <div className="space-y-1.5">
        {lines.map((line) => (
          <div key={line[0].seat_id} className="flex flex-wrap gap-1.5">
            {line.map((s) => {
              const on = value.includes(s.seat_id);
              return (
                <button
                  key={s.seat_id}
                  type="button"
                  disabled={s.taken && !on}
                  onClick={() => toggle(s.seat_id)}
                  title={s.is_premium ? "Nhìn thẳng bếp trưởng" : undefined}
                  className={`h-9 min-w-[42px] rounded-lg border px-2 text-[13px] transition ${
                    on
                      ? "border-shu bg-shu font-semibold text-white"
                      : s.taken
                      ? "cursor-not-allowed border-line bg-surface2 text-faint line-through"
                      : s.is_premium
                      ? "border-gold/60 bg-surface2 text-washi hover:bg-surface3"
                      : "border-line bg-surface2 text-muted hover:text-washi"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p
        className={`mt-2 text-[12px] ${
          value.length === guests ? "text-muted" : "text-gold"
        }`}
      >
        Đã chọn {value.length}/{guests} ghế
        {value.length !== guests && " — số ghế phải khớp số khách"}
      </p>
    </div>
  );
}
