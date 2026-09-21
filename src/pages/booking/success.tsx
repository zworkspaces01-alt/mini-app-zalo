import { useEffect, useState } from "react";
import { useNavigate, useParams } from "zmp-ui";

import DepositQR from "@/components/booking/deposit-qr";
import { Button, EmptyState, Note, Skeleton } from "@/components/ui";
import { IconChat, IconCheck, IconPhone } from "@/components/ui/icons";
import { Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT } from "@/i18n";
import { fetchReservationSeats, getReservationByCode } from "@/services/api";
import { callHotline, chatWithOA, followRestaurantOA } from "@/services/zalo";
import { Reservation } from "@/types";
import { formatDateLabel, vnd } from "@/utils/format";

export default function BookingSuccessPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { hotline, oaId, depositRate } = useRestaurant();
  const t = useT();
  const lang = useLang();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState<string[]>([]);

  useEffect(() => {
    if (!code) return;
    getReservationByCode(code)
      .then(setReservation)
      .finally(() => setLoading(false));
    fetchReservationSeats(code).then(setSeats);
  }, [code]);

  useEffect(() => {
    // Mời theo dõi OA để khách nhận được thông báo khi bàn được xác nhận.
    followRestaurantOA(oaId);
  }, [oaId]);

  if (loading) {
    return (
      <Screen name="booking-success">
        <div className="pad-safe-top space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Screen>
    );
  }

  if (!reservation) {
    return (
      <Screen name="booking-success">
        <EmptyState
          kanji="無"
          title={t.success.notFound}
          action={
            <Button onClick={() => navigate("/")}>{t.success.home}</Button>
          }
        />
      </Screen>
    );
  }

  const needsDeposit = reservation.depositAmount > 0;

  return (
    <Screen name="booking-success">
      <div className="pad-safe-top flex flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--jade)] text-[var(--jade)]">
          <IconCheck size={30} />
        </div>
        <h1 className="font-display text-[23px] leading-tight">
          {t.success.title}
        </h1>
        <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--muted)]">
          {t.success.subtitle}
        </p>

        <div className="mt-6 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-6 py-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--faint)]">
            {t.success.code}
          </div>
          <div className="mt-1 font-display text-[26px] tracking-[0.12em]">
            {reservation.code}
          </div>
        </div>
      </div>

      <div className="card mt-8 divide-y divide-[var(--line)] px-4 rounded-2xl border border-[var(--line)] shadow-sm">
        {seats.length > 0 && (
          <div className="flex items-baseline justify-between py-3.5">
            <span className="text-[13px] text-[var(--muted)]">{t.seats.yourSeats}</span>
            <span className="text-[14px] font-medium tracking-wide">
              {seats.join(" · ")}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between py-3.5">
          <span className="text-[13px] text-[var(--muted)]">
            {t.success.time}
          </span>
          <span className="text-[14px]">
            {reservation.time} ·{" "}
            {reservation.date ? formatDateLabel(reservation.date, lang) : ""}
          </span>
        </div>
        <div className="flex items-baseline justify-between py-3.5">
          <span className="text-[13px] text-[var(--muted)]">
            {t.success.guests}
          </span>
          <span className="text-[14px]">
            {t.common.guests(reservation.guests)}
          </span>
        </div>
        {reservation.depositAmount > 0 && (
          <div className="flex items-baseline justify-between py-3.5">
            <span className="text-[13px] text-[var(--muted)]">
              {t.success.deposit}
            </span>
            <span className="text-[14px] tabular-nums text-[var(--gold)]">
              {vnd(reservation.depositAmount, lang)}
              {reservation.depositPaid && (
                <span className="ml-2 text-[12px] text-[var(--jade)]">
                  {t.success.depositPaid}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {needsDeposit && (
        <>
          <DepositQR reservation={reservation} onPaid={setReservation} />
          <div className="mt-3">
            <Note>{t.success.depositNote(Math.round(depositRate * 100))}</Note>
          </div>
        </>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => callHotline(hotline)}>
          <IconPhone size={17} /> {t.success.call}
        </Button>
        {oaId ? (
          <Button variant="secondary" onClick={() => chatWithOA(oaId)}>
            <IconChat size={17} /> {t.success.message}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate("/reservations")}>
            {t.success.myReservations}
          </Button>
        )}
      </div>

      <div className="mt-6 pb-8">
        <Note>{t.success.changeNote(hotline ?? "")}</Note>
        <Button
          full
          variant="ghost"
          className="mt-4"
          onClick={() => navigate("/", { replace: true })}
        >
          {t.success.home}
        </Button>
      </div>
    </Screen>
  );
}
