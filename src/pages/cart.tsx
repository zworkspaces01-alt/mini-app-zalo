import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSnackbar } from "zmp-ui";

import { Button, EmptyState, Field, Note, QtyStepper, Sheet, TextArea, TextInput } from "@/components/ui";
import { IconCheck, IconClose, IconQR } from "@/components/ui/icons";
import { Icon3DPoints, Icon3DVoucher } from "@/components/ui/icons-3d";
import { BackHeader, Screen } from "@/components/ui/screen";
import { createOrder, listReservations } from "@/services/api";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useLang, useT, useTr } from "@/i18n";
import { backendError } from "@/services/supabase";
import { haptic } from "@/services/zalo";
import {
  appliedVoucherAtom,
  cartAtom,
  cartSubtotalAtom,
  clearCartAtom,
  setLineQtyAtom,
  tableIdAtom,
  userAtom,
  userTierAtom,
  userVouchersAtom,
} from "@/state/atoms";
import { dishesByIdAtom } from "@/state/content";
import { Order, Reservation } from "@/types";
import { formatDateLabel, formatNumber, vnd } from "@/utils/format";


export default function CartPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const [cart] = useAtom(cartAtom);
  const subtotal = useAtomValue(cartSubtotalAtom);
  const setQty = useSetAtom(setLineQtyAtom);
  const clearCart = useSetAtom(clearCartAtom);
  const tableId = useAtomValue(tableIdAtom);
  const user = useAtomValue(userAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();
  const dishesById = useAtomValue(dishesByIdAtom);

  // Kiểm tra giỏ hàng có món thịt bò mang về không
  const hasButcherItem = useMemo(() => {
    return cart.some((l) => dishesById[l.dishId]?.categoryId === "butcher");
  }, [cart, dishesById]);

  // Hình thức nhận hàng
  const [mode, setMode] = useState<"dine-in" | "pre-order" | "takeout" | "delivery">(
    tableId ? "dine-in" : hasButcherItem ? "delivery" : "delivery"
  );

  // Thông tin người nhận hàng
  const [customerName, setCustomerName] = useState(user?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("Giao ngay trong 1 giờ");
  const [paymentMethod, setPaymentMethod] = useState<"vietqr" | "cod">("vietqr");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const [reservationId, setReservationId] = useState<string | undefined>();

  // Modal QR sau khi tạo đơn thành công
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Voucher & Điểm thưởng tích luỹ
  const [appliedVoucher, setAppliedVoucher] = useAtom(appliedVoucherAtom);
  const [vouchers] = useAtom(userVouchersAtom);
  const tier = useAtomValue(userTierAtom);
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false);

  // Tính số tiền giảm giá từ voucher
  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const text = (appliedVoucher.giftTitle + " " + (appliedVoucher.worthText || "")).toLowerCase();
    if (text.includes("200.000") || text.includes("200k")) return 200000;
    if (text.includes("100.000") || text.includes("100k")) return 100000;
    if (text.includes("50.000") || text.includes("50k")) return 50000;
    return 50000;
  }, [appliedVoucher]);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Tỷ lệ tích điểm theo phân hạng
  const tierRate = useMemo(() => {
    const t = tier === ("platinum" as any) ? "diamond" : tier;
    if (t === "diamond") return 0.12;
    if (t === "gold") return 0.08;
    if (t === "silver") return 0.05;
    return 0.03;
  }, [tier]);

  const estimatedPoints = Math.round((finalTotal * tierRate) / 1000);

  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.phone && !customerPhone) setCustomerPhone(user.phone);
  }, [user]);

  /* Gọi món trước thì gắn vào một bàn đã đặt */
  useEffect(() => {
    if (tableId) return;
    listReservations().then((all) =>
      setUpcoming(
        all.filter((r) => r.status !== "cancelled" && r.status !== "completed")
      )
    );
  }, [tableId]);

  const submit = async () => {
    // Validation
    if (mode === "takeout" || mode === "delivery") {
      if (!customerName.trim()) {
        openSnackbar({ text: "Vui lòng nhập tên người nhận.", type: "warning" });
        return;
      }
      if (!customerPhone.trim()) {
        openSnackbar({ text: "Vui lòng nhập số điện thoại người nhận.", type: "warning" });
        return;
      }
    }
    if (mode === "delivery" && !deliveryAddress.trim()) {
      openSnackbar({ text: "Vui lòng nhập địa chỉ giao hàng.", type: "warning" });
      return;
    }
    if (mode === "pre-order" && !reservationId) {
      openSnackbar({ text: "Vui lòng chọn một lượt đặt bàn.", type: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const finalNote = [
        appliedVoucher
          ? `[Voucher: ${appliedVoucher.code} - Giảm ${formatNumber(discountAmount)}đ]`
          : "",
        note.trim(),
      ]
        .filter(Boolean)
        .join(" · ");

      const order = await createOrder({
        lines: cart,
        mode,
        tableId: mode === "dine-in" ? tableId ?? undefined : undefined,
        reservationId: mode === "pre-order" ? reservationId : undefined,
        note: finalNote || undefined,
        zaloId: user?.id,
        customerName: mode === "takeout" || mode === "delivery" ? customerName.trim() : undefined,
        customerPhone: mode === "takeout" || mode === "delivery" ? customerPhone.trim() : undefined,
        deliveryAddress: mode === "delivery" ? deliveryAddress.trim() : undefined,
        deliveryTime: mode === "delivery" || mode === "takeout" ? deliveryTime.trim() : undefined,
        paymentMethod: mode === "takeout" || mode === "delivery" ? paymentMethod : "cod",
      });

      haptic("medium");
      clearCart();
      setAppliedVoucher(null);


      const successMsg =
        mode === "dine-in"
          ? t.cart.sentDineIn(order.code)
          : mode === "pre-order"
          ? t.cart.sentPreOrder(order.code)
          : mode === "takeout"
          ? t.cart.sentTakeout(order.code)
          : t.cart.sentDelivery(order.code);

      openSnackbar({
        text: successMsg,
        type: "success",
        duration: 2600,
      });

      if ((mode === "takeout" || mode === "delivery") && paymentMethod === "vietqr") {
        setCreatedOrder(order);
        setShowQRModal(true);
      } else {
        navigate("/profile", { replace: true });
      }
    } catch (e) {
      openSnackbar({
        text: backendError(e, t.cart.sendFailed, { lang, t }),
        type: "error",
        duration: 3200,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0 && !showQRModal) {
    return (
      <Screen name="cart">
        <BackHeader title={t.cart.title} />
        <EmptyState
          kanji="空"
          title={t.cart.emptyTitle}
          hint={t.cart.emptyHint}
          action={
            <Button onClick={() => navigate("/menu")}>{t.cart.openMenu}</Button>
          }
        />
      </Screen>
    );
  }

  // VietQR URL
  const bankCode = restaurant.bankCode || "VCB";
  const bankAccount = restaurant.bankAccountNumber || "0123456789";
  const bankAccountName = restaurant.bankAccountName || "MIYAKO RESTAURANT";
  const qrAmount = createdOrder ? createdOrder.subtotal : subtotal;
  const qrCodeStr = createdOrder ? createdOrder.code : "";
  const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${qrAmount}&addInfo=MIYAKO%20${qrCodeStr}&accountName=${encodeURIComponent(
    bankAccountName
  )}`;

  return (
    <Screen name="cart">
      <BackHeader
        title={t.cart.title}
        subtitle={t.common.dishes(cart.length)}
        right={
          <button
            onClick={clearCart}
            className="px-2 text-[13px] text-[var(--muted)]"
          >
            {t.cart.clear}
          </button>
        }
      />

      {/* ── Bảng chuyển đổi hình thức nhận hàng ── */}
      {!tableId ? (
        <div className="mb-4">
          <div className="flex rounded-full bg-[var(--surface-2)] p-1 border border-[var(--line)] shadow-sm">
            <button
              onClick={() => {
                haptic("light");
                setMode("delivery");
              }}
              className={`flex-1 rounded-full py-2 text-[12.5px] font-medium transition-all ${
                mode === "delivery"
                  ? "bg-[var(--shu)] text-white font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--washi)]"
              }`}
            >
              🛵 {t.cart.modeDelivery}
            </button>
            <button
              onClick={() => {
                haptic("light");
                setMode("takeout");
              }}
              className={`flex-1 rounded-full py-2 text-[12.5px] font-medium transition-all ${
                mode === "takeout"
                  ? "bg-[var(--shu)] text-white font-bold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--washi)]"
              }`}
            >
              🏪 {t.cart.modeTakeout}
            </button>
            {upcoming.length > 0 && (
              <button
                onClick={() => {
                  haptic("light");
                  setMode("pre-order");
                }}
                className={`flex-1 rounded-full py-2 text-[12.5px] font-medium transition-all ${
                  mode === "pre-order"
                    ? "bg-[var(--shu)] text-white font-bold shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--washi)]"
                }`}
              >
                🍽️ {t.cart.modePreOrder}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-full border border-[var(--shu)] bg-[var(--shu-dim)] px-4 py-2.5 text-[13px] shadow-sm">
          <IconQR size={17} className="text-[var(--shu)]" />
          <span>{t.cart.sendToKitchen(tableId)}</span>
        </div>
      )}

      {/* ── Danh sách món trong giỏ ── */}
      <div className="card divide-y divide-[var(--line)] px-4">
        {cart.map((line) => {
          const dish = dishesById[line.dishId];
          const variant = dish?.variants?.find((v) => v.id === line.variantId);
          return (
            <div key={line.key} className="flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-snug">
                  {tr.text(dish, "name", dish?.name ?? line.name)}
                </div>
                {line.variantLabel && (
                  <div className="text-[12px] text-[var(--gold)] font-medium mt-0.5">
                    {tr.text(variant, "label", line.variantLabel)}
                  </div>
                )}
                {line.note && (
                  <div className="mt-0.5 text-[12px] italic text-[var(--faint)]">
                    “{line.note}”
                  </div>
                )}
                <div className="mt-1 text-[13px] tabular-nums text-[var(--muted)]">
                  {vnd(line.unitPrice, lang)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[14px] font-semibold tabular-nums">
                  {vnd(line.unitPrice * line.qty, lang)}
                </span>
                <QtyStepper
                  size="sm"
                  qty={line.qty}
                  onChange={(n) => setQty({ key: line.key, qty: n })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Thông tin người nhận & Địa chỉ giao hàng ── */}
      {(mode === "delivery" || mode === "takeout") && (
        <div className="mt-5 space-y-3.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--gold)]">
            <span>{mode === "delivery" ? "🛵" : "🏪"}</span>
            <span>{t.cart.deliveryInfo}</span>
          </div>

          <Field label={t.cart.customerName} required>
            <TextInput
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.cart.customerNamePlaceholder}
            />
          </Field>

          <Field label={t.cart.customerPhone} required>
            <TextInput
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t.cart.customerPhonePlaceholder}
              type="tel"
            />
          </Field>

          {mode === "delivery" && (
            <Field label={t.cart.deliveryAddress} required>
              <TextInput
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder={t.cart.deliveryAddressPlaceholder}
              />
            </Field>
          )}

          <Field label={t.cart.deliveryTime}>
            <TextInput
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              placeholder={t.cart.deliveryTimePlaceholder}
            />
          </Field>

          {/* Phương thức thanh toán */}
          <div>
            <label className="mb-2 block text-[13px] text-[var(--muted)]">
              {t.cart.paymentMethod}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setPaymentMethod("vietqr");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                  paymentMethod === "vietqr"
                    ? "border-[var(--gold)] bg-[var(--gold-dim)] text-[var(--gold)] shadow-sm font-semibold"
                    : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                <span className="text-[15px]">📲</span>
                <span>{t.cart.paymentVietQR}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setPaymentMethod("cod");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border p-3.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                  paymentMethod === "cod"
                    ? "border-[var(--shu)] bg-[var(--shu-dim)] text-[var(--shu)] shadow-sm font-semibold"
                    : "border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
              >
                <span className="text-[15px]">💵</span>
                <span>{t.cart.paymentCOD}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gắn đơn vào bàn đã đặt (cho pre-order) ── */}
      {mode === "pre-order" && upcoming.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
            {t.cart.attachToReservation}
          </h2>
          <div className="space-y-2">
            {upcoming.map((r) => {
              const active = r.id === reservationId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    haptic("light");
                    setReservationId(active ? undefined : r.id);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                    active
                      ? "border-[var(--shu)] bg-[var(--shu-dim)] font-medium shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface-2)]",
                  ].join(" ")}
                >
                  <span className="text-[14px]">
                    {r.code}
                    <span className="ml-2 text-[12px] text-[var(--muted)]">
                      {r.time} · {r.date ? formatDateLabel(r.date, lang) : ""}
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--muted)]">
                    {t.common.guests(r.guests)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ghi chú bếp / Yêu cầu sơ chế cắt thịt ── */}
      <div className="mt-5">
        <h2 className="mb-2.5 text-[13px] uppercase tracking-wider text-[var(--faint)]">
          {mode === "delivery" || mode === "takeout"
            ? t.cart.butcherNote
            : t.cart.kitchenNote}
        </h2>
        <TextArea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            mode === "delivery" || mode === "takeout"
              ? t.cart.butcherNotePlaceholder
              : t.cart.kitchenNotePlaceholder
          }
          maxLength={300}
        />
      </div>

      {/* ── Ưu Đãi Voucher & Tích Điểm Hội Viên ── */}
      <div className="mt-5 space-y-2.5">
        {/* Hàng chọn Voucher */}
        <div
          onClick={() => {
            haptic("light");
            setVoucherSheetOpen(true);
          }}
          className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 cursor-pointer hover:border-[var(--gold)]/50 active:scale-[0.99] transition-all shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon3DVoucher size={26} />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[var(--washi)]">
                {appliedVoucher
                  ? appliedVoucher.giftTitle
                  : lang === "ja"
                  ? "優待券・クーポン割引"
                  : lang === "en"
                  ? "Vouchers & Discounts"
                  : "Ưu đãi & Voucher giảm giá"}
              </div>
              <div className="text-[11px] text-[var(--muted)] truncate">
                {appliedVoucher
                  ? `${lang === "ja" ? "コード: " : lang === "en" ? "Code: " : "Mã: "}${appliedVoucher.code} (-${vnd(discountAmount, lang)})`
                  : `${vouchers.filter((v) => v.status === "active").length} ${
                      lang === "ja"
                        ? "枚の利用可能クーポン"
                        : lang === "en"
                        ? "vouchers available"
                        : "voucher sẵn sàng trong ví"
                    }`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[12px] font-bold text-[var(--gold)]">
              {appliedVoucher
                ? `-${vnd(discountAmount, lang)}`
                : lang === "ja"
                ? "選択"
                : lang === "en"
                ? "Select"
                : "Chọn mã"}
            </span>
            <span className="text-[var(--faint)] text-[14px]">›</span>
          </div>
        </div>

        {/* Khối Hoàn Điểm Tích Luỹ */}
        <div className="flex items-center justify-between rounded-2xl border border-[var(--gold)]/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3 text-[12.5px]">
          <div className="flex items-center gap-2">
            <Icon3DPoints size={22} />
            <div>
              <span className="font-bold text-[var(--gold)]">
                +{estimatedPoints} {t.rewards.pts}
              </span>
              <span className="ml-1 text-[11px] text-[var(--muted)]">
                {lang === "ja"
                  ? `（完了後に${Math.round(tierRate * 100)}%還元）`
                  : lang === "en"
                  ? `(Earn ${Math.round(tierRate * 100)}% on completion)`
                  : `(Tích ${Math.round(tierRate * 100)}% sau khi hoàn tất)`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/rewards")}
            className="text-[11px] font-medium text-[var(--gold)] underline active:opacity-80"
          >
            {lang === "ja" ? "会員特権" : lang === "en" ? "Privileges" : "Đặc quyền"}
          </button>
        </div>
      </div>

      {/* ── Bảng tổng tính tiền ── */}
      <div className="card mt-4 divide-y divide-[var(--line)] px-4">
        <div className="flex items-baseline justify-between py-2.5 text-[13.5px]">
          <span className="text-[var(--muted)]">{t.cart.subtotal}</span>
          <span className="font-medium tabular-nums text-[var(--washi)]">
            {vnd(subtotal, lang)}
          </span>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-baseline justify-between py-2.5 text-[13.5px]">
            <span className="text-emerald-400">
              {lang === "ja" ? "クーポン割引" : lang === "en" ? "Voucher Discount" : "Giảm giá Voucher"}
            </span>
            <span className="font-semibold tabular-nums text-emerald-400">
              -{vnd(discountAmount, lang)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between py-3">
          <span className="font-bold text-[14.5px]">
            {lang === "ja" ? "お支払い合計" : lang === "en" ? "Total Payment" : "Tổng thanh toán"}
          </span>
          <span className="text-[20px] font-bold tabular-nums text-[var(--gold)]">
            {vnd(finalTotal, lang)}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <Note>{t.cart.priceNote(restaurant.menuPriceNote ?? "")}</Note>
      </div>

      {/* ── Nút xác nhận đặt đơn ── */}
      <div className="mt-6 pb-8">
        <Button full size="lg" loading={submitting} onClick={submit}>
          {mode === "dine-in"
            ? t.cart.submitDineIn
            : mode === "pre-order"
            ? t.cart.submitPreOrder
            : mode === "takeout"
            ? t.cart.submitTakeout
            : t.cart.submitDelivery}
        </Button>
      </div>

      {/* ── Sheet chọn Voucher từ ví ── */}
      <Sheet
        open={voucherSheetOpen}
        onClose={() => setVoucherSheetOpen(false)}
        title={lang === "ja" ? "適用するクーポンを選択" : lang === "en" ? "Select Voucher" : "Chọn Voucher Áp Dụng"}
      >
        <div className="p-4 space-y-3">
          <div className="text-[12px] text-[var(--muted)]">
            {lang === "ja"
              ? "保有しているクーポンから選択して割引を適用します："
              : lang === "en"
              ? "Select an active voucher from your wallet to apply discount:"
              : "Chọn mã ưu đãi từ ví voucher của bạn để giảm trừ trực tiếp trên đơn hàng:"}
          </div>

          {vouchers.filter((v) => v.status === "active").length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-[22px]">
                🎟️
              </div>
              <h4 className="mt-2 font-display text-[14px] font-bold text-[var(--washi)]">
                {lang === "ja" ? "利用可能なクーポンはありません" : lang === "en" ? "No vouchers in wallet" : "Ví voucher đang trống"}
              </h4>
              <p className="mt-1 text-[11.5px] text-[var(--muted)]">
                {lang === "ja"
                  ? "ポイント交換所でポイントを使ってクーポンを獲得できます。"
                  : lang === "en"
                  ? "Redeem your loyalty points to get more discount vouchers."
                  : "Hãy đổi điểm tại trang Tích Điểm để nhận thêm nhiều voucher hấp dẫn."}
              </p>
              <button
                onClick={() => {
                  setVoucherSheetOpen(false);
                  navigate("/rewards");
                }}
                className="mt-3 rounded-full bg-[var(--shu)] px-4 py-1.5 text-[12px] font-bold text-white shadow-sm"
              >
                {lang === "ja" ? "ポイントを交換する" : lang === "en" ? "Redeem now" : "Đổi quà ngay"}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {vouchers
                .filter((v) => v.status === "active")
                .map((v) => {
                  const isSelected = appliedVoucher?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        haptic("light");
                        setAppliedVoucher(isSelected ? null : v);
                        setVoucherSheetOpen(false);
                      }}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[var(--gold)] bg-[var(--gold-dim)] shadow-sm"
                          : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[12px] font-bold text-[var(--gold)]">
                            {v.code}
                          </span>
                          {isSelected && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                              Đang áp dụng
                            </span>
                          )}
                        </div>
                        <div className="font-display text-[13.5px] font-semibold text-[var(--washi)] mt-0.5 truncate">
                          {v.giftTitle}
                        </div>
                        {v.worthText && (
                          <div className="text-[11px] text-[var(--muted)] mt-0.2">
                            {v.worthText}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${
                          isSelected
                            ? "bg-[var(--gold)] text-black font-semibold"
                            : "bg-[var(--surface)] text-[var(--washi)] border border-[var(--line)]"
                        }`}
                      >
                        {isSelected ? "Bỏ chọn" : "Áp dụng"}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {appliedVoucher && (
            <button
              onClick={() => {
                setAppliedVoucher(null);
                setVoucherSheetOpen(false);
              }}
              className="w-full py-2.5 text-[12px] font-medium text-rose-400 hover:text-rose-300"
            >
              Không sử dụng voucher nào
            </button>
          )}

          <button
            onClick={() => setVoucherSheetOpen(false)}
            className="w-full h-11 rounded-full bg-[var(--surface-3)] font-bold text-[13px] text-[var(--washi)] border border-[var(--line)] active:scale-98 transition-transform"
          >
            Xong
          </button>
        </div>
      </Sheet>


      {/* ── Modal thanh toán VietQR ── */}
      {showQRModal && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-[360px] rounded-3xl border border-[var(--gold)]/40 bg-[var(--surface)] text-[var(--washi)] p-6 shadow-2xl">
            <button
              onClick={() => {
                setShowQRModal(false);
                navigate("/profile", { replace: true });
              }}
              className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--washi)]"
            >
              <IconClose size={20} />
            </button>

            <div className="text-center">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                {t.cart.qrTitle}
              </div>
              <h3 className="font-display text-[18px] text-[var(--washi)]">
                Mã đơn: {createdOrder.code}
              </h3>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {t.cart.qrScanHint}
              </p>
            </div>

            <div className="my-4 flex justify-center rounded-2xl bg-white p-3 shadow-inner">
              <img
                src={vietQrUrl}
                alt="VietQR"
                className="h-[210px] w-[210px] object-contain"
              />
            </div>

            <div className="space-y-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[13px]">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Số tiền:</span>
                <span className="font-bold text-[var(--washi)]">
                  {vnd(createdOrder.subtotal, lang)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Nội dung CK:</span>
                <span className="font-bold text-[var(--gold)]">
                  MIYAKO {createdOrder.code}
                </span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Chủ TK:</span>
                <span className="text-[var(--washi)]">{bankAccountName}</span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>STK:</span>
                <span className="font-mono text-[var(--washi)]">{bankAccount} ({bankCode})</span>
              </div>
            </div>

            <div className="mt-5">
              <Button
                full
                size="lg"
                variant="gold"
                onClick={() => {
                  haptic("medium");
                  setShowQRModal(false);
                  navigate("/profile", { replace: true });
                }}
              >
                <IconCheck size={18} /> {t.cart.qrDone}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
