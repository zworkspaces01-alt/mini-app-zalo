import { useEffect, useState } from "react";

import { Button, Note } from "@/components/ui";
import { IconCheck, IconPhone } from "@/components/ui/icons";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT } from "@/i18n";
import { getReservationByCode } from "@/services/api";
import { callHotline } from "@/services/zalo";
import { Reservation } from "@/types";
import { sepayQrUrl } from "@/utils/banks";
import { vnd } from "@/utils/format";

/** Bao lâu hỏi lại máy chủ một lần, và hỏi trong bao lâu thì thôi. */
const POLL_MS = 4000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

/**
 * Mã QR chuyển cọc.
 *
 * Khách quét là điền sẵn số tiền và nội dung, nên không gõ nhầm mã. Sau khi
 * chuyển, SePay báo về máy chủ trong vài giây; màn hình này hỏi lại định kỳ
 * và tự chuyển sang trạng thái đã nhận.
 *
 * Việc hỏi lại dừng sau 10 phút để khỏi chạy nền vô hạn — khách vẫn xem được
 * tình trạng ở mục "Đặt bàn của tôi".
 */
export default function DepositQR({
  reservation,
  onPaid,
}: {
  reservation: Reservation;
  onPaid: (r: Reservation) => void;
}) {
  const restaurant = useRestaurant();
  const t = useT();
  const lang = useLang();
  const [checking, setChecking] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  const { paymentEnabled, bankAccountNumber, bankCode, bankAccountName, hotline } =
    restaurant;

  // Nội dung chuyển khoản bỏ dấu gạch nối: ngân hàng hay lược ký tự lạ.
  const transferContent = reservation.code.replace(/-/g, "");

  useEffect(() => {
    if (reservation.depositPaid) return;
    const startedAt = Date.now();
    let alive = true;

    const tick = async () => {
      if (!alive) return;
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setGaveUp(true);
        return;
      }
      const fresh = await getReservationByCode(reservation.code);
      if (!alive) return;
      if (fresh?.depositPaid) {
        onPaid(fresh);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };

    let timer = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [reservation.code, reservation.depositPaid, onPaid]);

  const checkNow = async () => {
    setChecking(true);
    const fresh = await getReservationByCode(reservation.code);
    setChecking(false);
    if (fresh?.depositPaid) onPaid(fresh);
    else setGaveUp(false);
  };

  if (reservation.depositPaid) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--jade)] bg-[rgba(95,158,122,0.1)] p-4">
        <IconCheck size={20} className="shrink-0 text-[var(--jade)]" />
        <div>
          <div className="text-[14px] font-medium text-[var(--jade)]">
            {t.deposit.received}
          </div>
          <div className="mt-0.5 text-[13px] text-[var(--muted)]">
            {t.deposit.receivedHint}
          </div>
        </div>
      </div>
    );
  }

  /* Nhà hàng chưa bật nhận cọc tự động — hướng dẫn gọi điện. */
  if (!paymentEnabled || !bankAccountNumber || !bankCode) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--gold-dim)] bg-[var(--gold-dim)] p-4">
        <div className="text-[14px] font-medium text-[var(--gold)]">
          {t.deposit.pendingTitle}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
          {t.deposit.pendingHint(vnd(reservation.depositAmount, lang))}
        </p>
        <Button
          full
          variant="gold"
          className="mt-3.5"
          onClick={() => callHotline(hotline)}
        >
          <IconPhone size={17} /> {t.deposit.call(hotline)}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--gold-dim)] bg-[var(--gold-dim)] p-4">
      <div className="text-[14px] font-medium text-[var(--gold)]">
        {t.deposit.qrTitle}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
        {t.deposit.qrHint}
      </p>

      <div className="mt-4 flex justify-center">
        <img
          src={sepayQrUrl({
            account: bankAccountNumber,
            bank: bankCode,
            amount: reservation.depositAmount,
            description: transferContent,
          })}
          alt={t.deposit.qrAlt(vnd(reservation.depositAmount, lang))}
          className="h-[232px] w-[232px] rounded-xl bg-white p-2"
        />
      </div>

      <dl className="mt-4 space-y-2.5 text-[13px]">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">{t.deposit.amount}</dt>
          <dd className="font-semibold tabular-nums text-[var(--gold)]">
            {vnd(reservation.depositAmount, lang)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">{t.deposit.bank}</dt>
          <dd>{bankCode}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">{t.deposit.account}</dt>
          <dd className="tabular-nums">{bankAccountNumber}</dd>
        </div>
        {bankAccountName && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">{t.deposit.accountName}</dt>
            <dd className="text-right">{bankAccountName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">{t.deposit.content}</dt>
          <dd className="font-mono tracking-wide">{transferContent}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <Note>{t.deposit.contentNote(transferContent)}</Note>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          loading={checking}
          onClick={checkNow}
        >
          {t.deposit.paidButton}
        </Button>
        <Button variant="ghost" onClick={() => callHotline(hotline)}>
          <IconPhone size={16} /> {t.deposit.callShort}
        </Button>
      </div>

      {gaveUp && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--faint)]">
          {t.deposit.notSeenYet}
        </p>
      )}
    </div>
  );
}
