import { useEffect, useState } from "react";
import { useNavigate } from "zmp-ui";

import { Button, EmptyState, Skeleton } from "@/components/ui";
import { IconChevronRight } from "@/components/ui/icons";
import { BackHeader, Screen } from "@/components/ui/screen";
import { useLang, useT } from "@/i18n";
import { listReservations } from "@/services/api";
import { Reservation, ReservationStatus } from "@/types";
import { formatDateLabel, vnd } from "@/utils/format";

export const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: "bg-[var(--surface-3)] text-[var(--washi)] border border-[var(--line)]",
  "awaiting-deposit": "bg-[var(--gold-dim)] text-[var(--gold)] border border-[var(--gold)]/25",
  confirmed: "bg-[var(--jade-dim)] text-[var(--jade)] border border-[var(--jade)]/25",
  cancelled: "bg-[var(--surface-2)] text-[var(--faint)] border border-[var(--line)]",
  completed: "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]",
};

export function StatusPill({ status }: { status: ReservationStatus }) {
  const t = useT();
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide ${STATUS_STYLE[status]}`}
    >
      {t.status[status]}
    </span>
  );
}

export default function ReservationsPage() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();
  const [items, setItems] = useState<Reservation[] | null>(null);

  useEffect(() => {
    listReservations().then(setItems);
  }, []);

  return (
    <Screen name="reservations">
      <BackHeader title={t.reservations.title} />

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          kanji="空"
          title={t.reservations.emptyTitle}
          hint={t.reservations.emptyHint}
          action={
            <Button onClick={() => navigate("/booking")}>
              {t.reservations.book}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reservations/${r.code}`)}
              className="card flex w-full items-center gap-3 p-4 text-left rounded-2xl border border-[var(--line)] shadow-sm active:scale-[0.99] transition-transform"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[16px] tracking-wide">
                    {r.code}
                  </span>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-1.5 text-[13px] text-[var(--muted)]">
                  {r.time} · {r.date ? formatDateLabel(r.date, lang) : ""} ·{" "}
                  {t.common.guests(r.guests)}
                </div>
                {r.depositAmount > 0 && (
                  <div className="mt-1 text-[12px] tabular-nums text-[var(--gold)]">
                    {t.reservations.deposit(vnd(r.depositAmount, lang))}
                    {r.depositPaid
                      ? t.reservations.depositPaid
                      : t.reservations.depositUnpaid}
                  </div>
                )}
              </div>
              <IconChevronRight size={18} className="text-[var(--faint)]" />
            </button>
          ))}
        </div>
      )}
    </Screen>
  );
}
