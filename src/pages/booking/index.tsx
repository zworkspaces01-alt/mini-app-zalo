import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "zmp-ui";

import DateStrip from "@/components/booking/date-strip";
import OptionGrid from "@/components/booking/option-grid";
import SeatPicker from "@/components/booking/seat-picker";
import { Button, Field, Note, QtyStepper, Skeleton, TextArea, TextInput } from "@/components/ui";
import { IconInfo } from "@/components/ui/icons";
import { LangButton } from "@/components/ui/lang-switch";
import { BackHeader, Screen } from "@/components/ui/screen";
import { RESTAURANT } from "@/config/restaurant";
import { serviceLabel, servicesOf } from "@/data/omakase";
import { useLang, useT, useTr } from "@/i18n";
import { calcDeposit, fetchAvailability } from "@/services/api";
import { fetchZaloProfile, haptic } from "@/services/zalo";
import { bookingAtom, patchBookingAtom, userAtom } from "@/state/atoms";
import { omakaseSetsAtom, restaurantAtom } from "@/state/content";
import { BookingPurpose, SeatingType, ServiceSlot } from "@/types";
import {
  atLocalTime,
  fromISODate,
  isValidVNPhone,
  toISODate,
  vnd,
} from "@/utils/format";

/** Khung giờ còn trống của một ca trong ngày đã chọn. */
interface SlotGroup {
  service: ServiceSlot;
  rows: { time: string; seatsLeft: number }[];
}

export default function BookingPage() {
  const navigate = useNavigate();
  const [booking] = useAtom(bookingAtom);
  const patch = useSetAtom(patchBookingAtom);
  const [user, setUser] = useAtom(userAtom);
  const omakaseSets = useAtomValue(omakaseSetsAtom);
  const restaurant = useAtomValue(restaurantAtom);
  const t = useT();
  const tr = useTr();
  const lang = useLang();

  const [groups, setGroups] = useState<SlotGroup[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const selectedSet = omakaseSets.find((s) => s.id === booking.omakaseSetId);
  /* Nếu đã chọn suất omakase: lấy theo ca của suất đó (lunch / dinner / both).
     Nếu gọi món (alacarte) hoặc chưa chọn suất: hiển thị cả 2 ca (trưa & tối)
     để khách chọn được bất kỳ khung giờ nào trong ngày. */
  const services: ServiceSlot[] = selectedSet
    ? servicesOf(selectedSet)
    : ["lunch", "dinner"];
  const serviceKey = services.join("+");

  const isAlacarte = booking.purpose === "alacarte";

  /* Khi chọn Alacarte thì không có chỗ ngồi ở quầy counter */
  useEffect(() => {
    if (isAlacarte && booking.seating === "counter") {
      patch({ seating: "table", seatIds: undefined });
    }
  }, [isAlacarte, booking.seating, patch]);

  const seatingOptions = useMemo(() => {
    const tableOption = {
      value: "table" as const,
      label: t.booking.seatingTable,
      hint: t.booking.seatingTableHint,
    };
    const privateOption = {
      value: "private" as const,
      label: t.booking.seatingPrivate,
      hint: t.booking.seatingPrivateHint,
    };
    if (isAlacarte) {
      return [tableOption, privateOption];
    }
    return [
      {
        value: "counter" as const,
        label: t.booking.seatingCounter,
        hint: t.booking.seatingCounterHint(
          restaurant?.counterSeats ?? RESTAURANT.counterSeats
        ),
      },
      tableOption,
      privateOption,
    ];
  }, [isAlacarte, t, restaurant]);

  /* ── Đặt trước tối thiểu ──
     Nhà hàng đặt số giờ trong CMS; suất omakase cần bếp có thời gian đặt cá.
     Đây chỉ là lớp lọc cho đẹp — create_reservation mới là chốt chặn thật. */
  const leadHours =
    booking.purpose === "omakase"
      ? restaurant?.omakaseLeadHours ?? RESTAURANT.omakaseLeadHours
      : 0;
  const maxDays = restaurant?.bookingLeadDays ?? RESTAURANT.bookingLeadDays;

  const earliest = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + leadHours);
    return d;
  }, [leadHours]);
  const minDate = toISODate(earliest);

  /* Ngày mặc định là hôm nay, còn omakase có thể phải đặt trước cả ngày.
     Đẩy lựa chọn tới ngày sớm nhất thay vì bỏ trống ô ngày. */
  useEffect(() => {
    if (booking.date && booking.date < minDate) {
      patch({ date: minDate, time: undefined });
    }
  }, [booking.date, minDate, patch]);

  /* Lấy tên từ Zalo một lần để khách khỏi gõ lại. */
  useEffect(() => {
    if (user || booking.name) return;
    fetchZaloProfile().then((p) => {
      if (!p) return;
      setUser(p);
      patch({ name: p.name });
    });
  }, [user, booking.name, setUser, patch]);

  /* Khung giờ theo ngày và theo (các) ca của suất đang chọn. */
  useEffect(() => {
    const date = booking.date;
    if (!date) return;
    let alive = true;
    setLoadingSlots(true);
    setSlotError(null);
    Promise.all(
      services.map((sv) =>
        fetchAvailability(date, sv).then((rows) => ({ service: sv, rows }))
      )
    )
      .then((gs) => {
        if (!alive) return;
        // Ca nhà hàng đóng cửa hôm đó trả về rỗng — không hiện mục trống.
        setGroups(gs.filter((g) => g.rows.length > 0));
      })
      .catch(() => {
        if (!alive) return;
        setGroups([]);
        setSlotError(t.booking.slotsFailed);
      })
      .finally(() => alive && setLoadingSlots(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.date, serviceKey]);

  /* Khung giờ còn đặt được: bỏ các mốc đã qua hoặc chưa đủ hạn đặt trước. */
  const openGroups = useMemo(() => {
    const date = booking.date;
    if (!date) return [];
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => atLocalTime(date, r.time) >= earliest),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, booking.date, earliest]);

  /* Giờ đang chọn rơi ra ngoài danh sách thì bỏ chọn. */
  useEffect(() => {
    if (loadingSlots || !booking.time) return;
    const stillThere = openGroups.some((g) =>
      g.rows.some((r) => r.time === booking.time)
    );
    if (!stillThere) patch({ time: undefined });
  }, [openGroups, booking.time, loadingSlots, patch]);

  /* Hôm đó có ca mở cửa nhưng mọi mốc đều quá sát giờ. */
  const allTooSoon = groups.length > 0 && openGroups.length === 0;

  /*
   * Tự nhảy sang ngày kế khi ngày đang chọn không còn mốc nào đặt được.
   *
   * `minDate` tính theo NGÀY (hôm nay + số giờ đặt trước), còn danh sách mốc
   * lọc theo GIỜ. Hai mức chi tiết khác nhau nên ngày được chọn tự động vẫn
   * có thể sạch mốc — ví dụ 20h hôm nay, hạn 24 giờ: ngày mai sớm nhất là
   * 20h, mà ca tối đóng lúc 20h. Không nhảy tiếp thì khách kẹt ở một ngày
   * chỉ hiện "quá sát giờ" và không hiểu phải làm gì.
   *
   * Chỉ nhảy khi chính hệ thống đã chọn hộ ngày đó, không đè lên ngày khách
   * tự bấm — và giới hạn số lần để không nhảy vô tận khi nhà hàng nghỉ dài.
   */
  const autoHops = useRef(0);
  useEffect(() => {
    if (loadingSlots || !booking.date) return;
    if (!allTooSoon) {
      autoHops.current = 0;
      return;
    }
    if (booking.date > minDate) return;   // khách tự chọn thì để yên
    if (autoHops.current >= 7) return;

    autoHops.current += 1;
    const next = new Date(fromISODate(booking.date));
    next.setDate(next.getDate() + 1);
    patch({ date: toISODate(next), time: undefined });
  }, [allTooSoon, loadingSlots, booking.date, minDate, patch]);

  const depositRate = restaurant?.depositRate ?? RESTAURANT.depositRate;
  const deposit = calcDeposit(booking, omakaseSets, depositRate);
  const phoneOk = !booking.phone || isValidVNPhone(booking.phone);
  // Ngồi quầy thì phải chọn đủ ghế — để khách khỏi tới nơi mới biết ngồi đâu.
  const seatsOk =
    booking.seating !== "counter" ||
    (booking.seatIds?.length ?? 0) === booking.guests;

  const canSubmit =
    !!booking.date &&
    !!booking.time &&
    seatsOk &&
    !!booking.name?.trim() &&
    !!booking.phone?.trim() &&
    phoneOk &&
    (booking.purpose !== "omakase" || !!booking.omakaseSetId);

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    haptic("medium");
    navigate("/booking/review");
  };

  return (
    <Screen name="booking" pad={false}>
      <BackHeader
        title={t.booking.title}
        subtitle={t.booking.jp}
        right={<LangButton />}
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        className="mx-0"
      />

      <div
        className="page-pad space-y-7 pt-2"
        style={{ paddingBottom: "calc(var(--sab) + 130px)" }}
      >
        {/* ── Suất ── */}
        <section>
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.purpose}
          </h2>
          <OptionGrid<BookingPurpose>
            value={booking.purpose}
            onChange={(v) =>
              patch({
                purpose: v,
                omakaseSetId: v === "omakase" ? booking.omakaseSetId : undefined,
                seating:
                  v === "alacarte" && booking.seating === "counter"
                    ? "table"
                    : booking.seating,
                seatIds: v === "alacarte" ? undefined : booking.seatIds,
              })
            }
            options={[
              {
                value: "omakase",
                label: t.booking.purposeOmakase,
                hint: t.booking.purposeOmakaseHint,
              },
              {
                value: "alacarte",
                label: t.booking.purposeAlacarte,
                hint: t.booking.purposeAlacarteHint,
              },
            ]}
          />
        </section>

        {/* ── Chọn suất omakase ── */}
        {booking.purpose === "omakase" && (
          <section>
            <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
              {t.booking.pickSet}
            </h2>
            <OptionGrid
              columns={1}
              value={booking.omakaseSetId}
              onChange={(v) => patch({ omakaseSetId: v, time: undefined })}
              options={omakaseSets.map((s) => ({
                value: s.id,
                label: tr.text(s, "name", s.name),
                hint: (
                  <span className="flex items-center justify-between gap-2">
                    <span>{serviceLabel(s.service, t)}</span>
                    <span className="tabular-nums text-[var(--gold)]">
                      {t.common.perGuestPrice(vnd(s.price, lang))}
                    </span>
                  </span>
                ),
              }))}
            />
            {depositRate > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[var(--gold)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)] shrink-0" />
                <span>
                  {t.booking.depositNotice(Math.round(depositRate * 100))}
                </span>
              </div>
            )}
            {touched && !booking.omakaseSetId && (
              <p className="mt-2 text-[12px] text-[var(--shu)]">
                {t.booking.pickSetRequired}
              </p>
            )}
          </section>
        )}

        {/* ── Ngày ── */}
        <section>
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.date}
          </h2>
          <DateStrip
            value={booking.date}
            onChange={(d) => patch({ date: d })}
            days={maxDays}
            minDate={minDate}
          />
          {leadHours > 0 && (
            <p className="mt-2 text-[12px] text-[var(--muted)]">
              {t.booking.leadHours(leadHours)}
            </p>
          )}
        </section>

        {/* ── Giờ ── */}
        <section>
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.time}
          </h2>
          {loadingSlots ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[52px]" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {openGroups.map((g) => (
                <div key={g.service}>
                  {/* Chỉ gắn nhãn ca khi suất phục vụ cả trưa lẫn tối. */}
                  {openGroups.length > 1 && (
                    <div className="mb-2 text-[12px] uppercase tracking-wider text-[var(--faint)]">
                      {g.service === "lunch"
                        ? t.booking.lunchShift
                        : t.booking.dinnerShift}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {g.rows.map((s) => {
                      const active = s.time === booking.time;
                      const full = s.seatsLeft === 0;
                      return (
                        <button
                          key={s.time}
                          disabled={full}
                          onClick={() => patch({ time: s.time })}
                          className={[
                            "flex h-[52px] flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-sm",
                            active
                              ? "border-[var(--shu)] bg-[var(--shu-dim)] shadow-md shadow-[var(--shu)]/10 font-semibold"
                              : "border-[var(--line)] bg-[var(--surface-2)]",
                            full ? "opacity-35 pointer-events-none" : "",
                          ].join(" ")}
                        >
                          <span className="text-[15px] font-medium tabular-nums">
                            {s.time}
                          </span>
                          <span className="text-[10px] text-[var(--faint)]">
                            {full
                              ? t.booking.full
                              : t.booking.seatsLeft(s.seatsLeft)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {slotError && (
            <p className="mt-2 text-[12px] text-[var(--shu)]">{slotError}</p>
          )}
          {!loadingSlots && !slotError && !!booking.date && openGroups.length === 0 && (
            <p className="mt-2 text-[13px] text-[var(--muted)]">
              {allTooSoon
                ? t.booking.tooSoon(leadHours)
                : services.length > 1
                ? t.booking.closedAllDay
                : t.booking.closedShift(
                    services[0] === "lunch"
                      ? t.service.lunch
                      : t.service.dinner
                  )}{" "}
              {t.booking.pickAnotherDay}
            </p>
          )}
          {touched && !booking.time && (
            <p className="mt-2 text-[12px] text-[var(--shu)]">
              {t.booking.pickTime}
            </p>
          )}
          <div className="mt-2.5 flex items-start gap-2">
            <IconInfo size={14} className="mt-[2px] shrink-0 text-[var(--faint)]" />
            <Note>{t.booking.timeNote}</Note>
          </div>
        </section>

        {/* ── Số khách ── */}
        <section>
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.guests}
          </h2>
          <div className="card flex items-center justify-between px-4 py-3">
            <span className="text-[15px]">{t.common.guests(booking.guests)}</span>
            <QtyStepper
              qty={booking.guests}
              min={1}
              max={20}
              onChange={(n) => patch({ guests: n })}
            />
          </div>
        </section>

        {/* ── Chỗ ngồi ── */}
        <section>
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.seating}
          </h2>
          <OptionGrid<SeatingType>
            columns={isAlacarte ? 2 : 3}
            value={booking.seating}
            onChange={(v) => patch({ seating: v })}
            options={seatingOptions}
          />
          {booking.seating === "private" && (
            <p className="mt-2 text-[12px] text-[var(--muted)]">
              {t.booking.privateNote}
            </p>
          )}
        </section>

        {/* ── Chọn chỗ ngồi ở quầy ── */}
        {booking.seating === "counter" && (
          <section>
            <h2 className="mb-1 text-[13px] uppercase tracking-wider text-[var(--faint)]">
              {t.seats.title}
            </h2>
            <p className="mb-3 text-[13px] leading-relaxed text-[var(--muted)]">
              {t.seats.intro}
            </p>
            {/*
              Phòng hiện ngay cả khi chưa chọn xong ngày giờ. Giấu mô hình cho
              tới lúc đó thì khách không biết là có tính năng này — nhất là khi
              ngày mặc định lại rơi vào hôm chưa đặt được.
            */}
            <SeatPicker
              date={booking.date}
              time={booking.time}
              guests={booking.guests}
              selected={booking.seatIds ?? []}
              onChange={(ids) => patch({ seatIds: ids })}
            />
          </section>
        )}

        {/* ── Liên hệ ── */}
        <section className="space-y-4">
          <h2 className="text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.booking.contact}
          </h2>
          <Field label={t.booking.name} required>
            <TextInput
              value={booking.name ?? ""}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={t.booking.namePlaceholder}
              invalid={touched && !booking.name?.trim()}
            />
          </Field>
          <Field
            label={t.booking.phone}
            required
            error={
              touched && !booking.phone?.trim()
                ? t.booking.phoneRequired
                : !phoneOk
                ? t.booking.phoneInvalid
                : undefined
            }
          >
            <TextInput
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={booking.phone ?? ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d+ ]/g, "");
                patch({ phone: val });
              }}
              placeholder={t.booking.phonePlaceholder}
              invalid={(touched && !booking.phone?.trim()) || !phoneOk}
            />
          </Field>
          <Field label={t.booking.dietary} hint={t.booking.dietaryHint}>
            <TextInput
              value={booking.dietary ?? ""}
              onChange={(e) => patch({ dietary: e.target.value })}
              placeholder={t.booking.dietaryPlaceholder}
            />
          </Field>
          <Field label={t.booking.note}>
            <TextArea
              value={booking.note ?? ""}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder={t.booking.notePlaceholder}
              maxLength={300}
            />
          </Field>
        </section>
      </div>

      {/* ── Thanh xác nhận ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--sumi)] px-4 pt-3 shadow-2xl shadow-black/10"
        style={{ paddingBottom: "calc(var(--sab) + 12px)" }}
      >
        {touched && !seatsOk && (
          <p className="mb-2 text-[12px] text-[var(--shu)]">
            {t.seats.required(booking.guests)}
          </p>
        )}
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[13px] text-[var(--muted)]">
            {deposit > 0 ? t.booking.depositLabel : t.booking.noDeposit}
          </span>
          {deposit > 0 && (
            <span className="text-[17px] font-semibold tabular-nums text-[var(--gold)]">
              {vnd(deposit, lang)}
            </span>
          )}
        </div>
        <Button full size="lg" onClick={submit} disabled={!canSubmit}>
          {t.booking.continue}
        </Button>
      </div>
    </Screen>
  );
}
