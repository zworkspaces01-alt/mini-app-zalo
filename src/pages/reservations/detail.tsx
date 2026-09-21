import { useEffect, useState } from "react";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import DepositQR from "@/components/booking/deposit-qr";
import { Button, EmptyState, Note, Skeleton } from "@/components/ui";
import { IconPhone } from "@/components/ui/icons";
import { BackHeader, Screen } from "@/components/ui/screen";
import {
  cancelReservationByCode,
  fetchReservationSeats,
  getReservationByCode,
} from "@/services/api";
import { backendError } from "@/services/supabase";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT } from "@/i18n";
import { callHotline } from "@/services/zalo";
import { Reservation } from "@/types";
import { formatDateLabel, formatDateTime, vnd } from "@/utils/format";

import { StatusPill } from "./index";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <span className="shrink-0 text-[13px] text-[var(--muted)]">{label}</span>
      <span className="text-right text-[14px]">{value}</span>
    </div>
  );
}

export default function ReservationDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const restaurant = useRestaurant();
  const t = useT();
  const lang = useLang();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [seats, setSeats] = useState<string[]>([]);

  useEffect(() => {
    if (!code) return;
    getReservationByCode(code)
      .then(setReservation)
      .finally(() => setLoading(false));
    fetchReservationSeats(code).then(setSeats);
  }, [code]);

  const cancel = async () => {
    if (!code) return;
    setCancelling(true);
    try {
      const updated = await cancelReservationByCode(code);
      setReservation(updated);
      openSnackbar({ text: t.reservations.cancelled, type: "success" });
    } catch (e) {
      openSnackbar({
        text: backendError(e, t.reservations.cancelFailed, { lang, t }),
        type: "error",
        duration: 3200,
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Screen name="reservation-detail">
        <BackHeader title={t.reservations.detailTitle} />
        <Skeleton className="h-64 w-full rounded-card" />
      </Screen>
    );
  }

  if (!reservation) {
    return (
      <Screen name="reservation-detail">
        <BackHeader title={t.reservations.detailTitle} />
        <EmptyState
          kanji="無"
          title={t.reservations.detailNotFound}
          action={
            <Button onClick={() => navigate("/reservations")}>
              {t.reservations.backToList}
            </Button>
          }
        />
      </Screen>
    );
  }

  const active =
    reservation.status !== "cancelled" && reservation.status !== "completed";

  return (
    <Screen name="reservation-detail">
      <BackHeader title={t.reservations.detailTitle} />

      <div className="flex flex-col items-center rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-6 py-6 text-center shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--faint)]">
          {t.reservations.code}
        </div>
        <div className="mt-1.5 font-display text-[28px] tracking-[0.12em]">
          {reservation.code}
        </div>
        <div className="mt-3">
          <StatusPill status={reservation.status} />
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--faint)]">
          {t.reservations.showCode}
        </p>
      </div>

      <div className="card mt-4 divide-y divide-[var(--line)] px-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <Row
          label={t.reservations.time}
          value={`${reservation.time} · ${
            reservation.date ? formatDateLabel(reservation.date, lang) : ""
          }`}
        />
        <Row
          label={t.reservations.guests}
          value={t.common.guests(reservation.guests)}
        />
        <Row
          label={t.reservations.seating}
          value={t.seating[reservation.seating]}
        />
        <Row label={t.reservations.name} value={reservation.name} />
        <Row label={t.reservations.phone} value={reservation.phone} />
        <Row label={t.reservations.dietary} value={reservation.dietary} />
        <Row label={t.reservations.note} value={reservation.note} />
        <Row
          label={t.reservations.createdAt}
          value={formatDateTime(reservation.createdAt, lang)}
        />
      </div>

      {reservation.depositAmount > 0 && (
        <div className="card mt-4 px-4">
          <Row
            label={t.reservations.depositAmount}
            value={
              <span className="tabular-nums text-[var(--gold)]">
                {vnd(reservation.depositAmount, lang)}
              </span>
            }
          />
          <Row
            label={t.reservations.depositStatus}
            value={
              reservation.depositPaid ? (
                <span className="text-[var(--jade)]">
                  {t.reservations.paid}
                </span>
              ) : (
                <span className="text-[var(--muted)]">
                  {t.reservations.unpaid}
                </span>
              )
            }
          />
        </div>
      )}

      {reservation.depositAmount > 0 && active && (
        <DepositQR reservation={reservation} onPaid={setReservation} />
      )}

      <div className="mt-6 space-y-2.5 pb-8">
        <Button
          full
          variant="secondary"
          onClick={() => callHotline(restaurant.hotline)}
        >
          <IconPhone size={17} />{" "}
          {t.reservations.callRestaurant(restaurant.hotline ?? "")}
        </Button>
        {active && (
          <>
            <Button
              full
              variant="ghost"
              loading={cancelling}
              onClick={cancel}
              className="!text-[var(--shu)]"
            >
              {t.reservations.cancel}
            </Button>
            <Note>
              {restaurant.cancellationPolicy ?? t.reservations.policyFallback}
            </Note>
          </>
        )}
      </div>
    </Screen>
  );
}
