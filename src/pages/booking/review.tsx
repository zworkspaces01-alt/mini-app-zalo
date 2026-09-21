import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate, useSnackbar } from "zmp-ui";

import { Button, Note } from "@/components/ui";
import { BackHeader, Screen } from "@/components/ui/screen";
import { RESTAURANT } from "@/config/restaurant";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT, useTr } from "@/i18n";
import { calcDeposit, createReservation } from "@/services/api";
import { backendError } from "@/services/supabase";
import { bookingAtom, userAtom } from "@/state/atoms";
import { omakaseByIdAtom, omakaseSetsAtom, restaurantAtom } from "@/state/content";
import { formatDateLabel, vnd } from "@/utils/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <span className="shrink-0 text-[13px] text-[var(--muted)]">{label}</span>
      <span className="text-right text-[14px]">{value}</span>
    </div>
  );
}

export default function BookingReviewPage() {
  const navigate = useNavigate();
  const booking = useAtomValue(bookingAtom);
  const user = useAtomValue(userAtom);
  const omakaseSets = useAtomValue(omakaseSetsAtom);
  const omakaseById = useAtomValue(omakaseByIdAtom);
  const restaurant = useAtomValue(restaurantAtom);
  const restaurantView = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();
  const { openSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);

  const set = booking.omakaseSetId ? omakaseById[booking.omakaseSetId] : null;
  const depositRate = restaurant?.depositRate ?? RESTAURANT.depositRate;
  const deposit = calcDeposit(booking, omakaseSets, depositRate);

  const confirm = async () => {
    setSubmitting(true);
    try {
      const reservation = await createReservation(booking, user?.id);
      navigate(`/booking/success/${reservation.code}`);
    } catch (e) {
      openSnackbar({
        text: backendError(e, t.review.failed, { lang, t }),
        type: "error",
        duration: 3200,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen name="booking-review">
      <BackHeader title={t.review.title} />

      <div className="card divide-y divide-[var(--line)] px-4 rounded-2xl border border-[var(--line)] shadow-sm">
        {set && <Row label={t.review.set} value={tr.text(set, "name", set.name)} />}
        {!set && <Row label={t.review.kind} value={t.review.alacarte} />}
        <Row
          label={t.review.time}
          value={
            <>
              {booking.time}
              <span className="text-[var(--muted)]">
                {" · "}
                {booking.date ? formatDateLabel(booking.date, lang) : ""}
              </span>
            </>
          }
        />
        <Row label={t.review.guests} value={t.common.guests(booking.guests)} />
        <Row label={t.review.seating} value={t.seating[booking.seating]} />
        <Row label={t.review.name} value={booking.name} />
        <Row label={t.review.phone} value={booking.phone} />
        {booking.dietary?.trim() && (
          <Row label={t.review.dietary} value={booking.dietary} />
        )}
        {booking.note?.trim() && (
          <Row label={t.review.note} value={booking.note} />
        )}
      </div>

      {/* ── Tiền ── */}
      <div className="card mt-4 px-4 rounded-2xl border border-[var(--line)] shadow-sm">
        {set && (
          <Row
            label={t.review.subtotal}
            value={
              <span className="tabular-nums">
                {vnd(set.price, lang)} × {booking.guests} ={" "}
                {vnd(set.price * booking.guests, lang)}
              </span>
            }
          />
        )}
        <div className="flex items-baseline justify-between border-t border-[var(--line)] py-3.5">
          <span className="text-[14px]">
            {deposit > 0
              ? t.review.deposit(Math.round(depositRate * 100))
              : t.review.noDeposit}
          </span>
          <span className="text-[19px] font-semibold tabular-nums text-[var(--gold)]">
            {deposit > 0 ? vnd(deposit, lang) : "—"}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <Note>{t.review.priceNote(restaurantView.menuPriceNote ?? "")}</Note>
        {deposit > 0 && <Note>{t.review.depositNote}</Note>}
      </div>

      <div className="mt-7 space-y-2.5 pb-6">
        <Button full size="lg" loading={submitting} onClick={confirm}>
          {t.review.submit}
        </Button>
        <Button full variant="ghost" onClick={() => navigate(-1)}>
          {t.review.edit}
        </Button>
      </div>
    </Screen>
  );
}
