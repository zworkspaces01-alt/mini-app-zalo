/**
 * Lớp gọi máy chủ của mini app.
 *
 * Mọi thao tác ghi đều qua hàm RPC trên Postgres, nơi server tự tính lại giá
 * và tiền cọc. Client không gửi lên con số tiền nào.
 *
 * Khách không có tài khoản, nên mã đặt bàn chính là chìa khoá tra cứu: app
 * lưu danh sách mã trong máy, biết mã thì xem được lượt đặt đó.
 */
import { COUNTER_SEATS } from "@/data/seats";
import { supabase } from "@/services/supabase";
import { notifyTelegram } from "@/services/telegram";
import { notifyCustomerZalo } from "@/services/zalo-notify";
import {
  BookingDraft,
  CartLine,
  CustomerVoucher,
  MembershipTier,
  OmakaseSet,
  Order,
  PointsHistoryItem,
  Reservation,
  ReservationStatus,
  RewardGiftItem,
  SeatAvailability,
} from "@/types";
import type { Database } from "@/types/db";


type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

const KEY_CODES = "miyako.reservation-codes";
const KEY_ORDERS = "miyako.order-codes";

/* ─────────────── Mã lưu trong máy ─────────────── */
function readCodes(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberCode(key: string, code: string) {
  try {
    const all = readCodes(key).filter((c) => c !== code);
    localStorage.setItem(key, JSON.stringify([code, ...all].slice(0, 50)));
  } catch {
    /* chế độ riêng tư hoặc hết dung lượng */
  }
}

/* ─────────────── Chuyển đổi kiểu ─────────────── */
function toReservation(r: ReservationRow): Reservation {
  return {
    id: r.id,
    code: r.code,
    purpose: r.purpose as BookingDraft["purpose"],
    omakaseSetId: r.omakase_set_id ?? undefined,
    date: r.reserved_date,
    time: r.reserved_time.slice(0, 5),
    guests: r.guests,
    seating: r.seating as BookingDraft["seating"],
    name: r.guest_name,
    phone: r.guest_phone,
    dietary: r.dietary ?? undefined,
    note: r.note ?? undefined,
    status: r.status as ReservationStatus,
    createdAt: r.created_at,
    depositAmount: r.deposit_amount,
    depositPaid: r.deposit_paid,
  };
}

function toOrder(o: OrderRow & Record<string, any>, lines: CartLine[]): Order {
  return {
    id: o.id,
    code: o.code,
    createdAt: o.created_at,
    lines,
    subtotal: o.subtotal,
    mode: o.mode as Order["mode"],
    tableId: o.table_id ?? undefined,
    reservationId: o.reservation_id ?? undefined,
    note: o.note ?? undefined,
    status: o.status as Order["status"],
    customerName: o.customer_name ?? undefined,
    customerPhone: o.customer_phone ?? undefined,
    deliveryAddress: o.delivery_address ?? undefined,
    deliveryTime: o.delivery_time ?? undefined,
    deliveryFee: o.delivery_fee ?? 0,
    paymentMethod: (o.payment_method as Order["paymentMethod"]) ?? "cod",
    paymentStatus: (o.payment_status as Order["paymentStatus"]) ?? "unpaid",
  };
}

const offline = () =>
  new Error("Chưa kết nối được với nhà hàng. Gọi hotline để đặt trực tiếp.");

/* ─────────────── Tiền cọc (chỉ để xem trước) ───────────────
   Con số chính thức do máy chủ tính khi tạo đặt bàn. */
export function calcDeposit(
  draft: BookingDraft,
  sets: OmakaseSet[],
  depositRate: number
): number {
  if (draft.purpose !== "omakase" || !draft.omakaseSetId) return 0;
  const set = sets.find((s) => s.id === draft.omakaseSetId);
  if (!set) return 0;
  return Math.round(set.price * draft.guests * depositRate);
}

/* ─────────────── Khung giờ ─────────────── */
export async function fetchAvailability(
  date: string,
  service: "lunch" | "dinner"
): Promise<{ time: string; seatsLeft: number }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_availability", {
    p_date: date,
    p_service: service,
  });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    time: s.slot_time.slice(0, 5),
    seatsLeft: s.seats_left,
  }));
}

/* ─────────────── Sơ đồ chỗ ngồi ─────────────── */

/**
 * Ghế đóng gói sẵn trong app.
 *
 * Dùng khi chưa gọi được máy chủ. Không có bản này thì mô hình 3D dựng ra
 * một căn phòng trống không ghế — trông như hỏng, mà thật ra chỉ là mạng.
 */
const BUNDLED_SEATS: SeatAvailability[] = COUNTER_SEATS.map((s) => ({
  id: s.id,
  label: s.label,
  x: s.x,
  z: s.z,
  rotation: s.rotation,
  premium: s.premium,
  taken: false,
}));

/** Máy chủ im lặng quá lâu thì thôi, đừng bắt khách nhìn khung chờ mãi. */
const SEAT_TIMEOUT_MS = 3500;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export interface SeatMap {
  seats: SeatAvailability[];
  /** false nghĩa là đang dùng bản đóng gói, chưa biết ghế nào có người */
  live: boolean;
}

/** Sơ đồ ghế, chưa xét còn trống hay không. Dùng cho lúc xem trước phòng. */
export async function fetchSeats(): Promise<SeatMap> {
  if (!supabase) return { seats: BUNDLED_SEATS, live: false };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("seats")
        .select("*")
        .eq("is_active", true)
        .eq("zone", "counter")
        .order("sort_order"),
      SEAT_TIMEOUT_MS
    );
    if (error || !data?.length) return { seats: BUNDLED_SEATS, live: false };
    return {
      live: true,
      seats: data.map((s) => ({
        id: s.id,
        label: s.label,
        x: Number(s.pos_x),
        z: Number(s.pos_z),
        rotation: Number(s.rotation),
        premium: s.is_premium,
        taken: false,
      })),
    };
  } catch {
    return { seats: BUNDLED_SEATS, live: false };
  }
}

/**
 * Ghế nào còn trống ở một khung giờ.
 *
 * Không hỏi được máy chủ thì vẫn trả bản đóng gói kèm `live: false`, để khách
 * còn thấy căn phòng. Giao diện sẽ nói rõ là chưa kiểm tra được ghế trống —
 * thà vậy còn hơn hiện phòng trống hoặc khung chờ không bao giờ xong.
 */
export async function fetchSeatAvailability(
  date: string,
  time: string
): Promise<SeatMap> {
  if (!supabase) return { seats: BUNDLED_SEATS, live: false };
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("get_seat_availability", { p_date: date, p_time: time }),
      SEAT_TIMEOUT_MS
    );
    if (error || !data?.length) return { seats: BUNDLED_SEATS, live: false };
    return {
      live: true,
      seats: data.map((s) => ({
        id: s.seat_id,
        label: s.label,
        x: Number(s.pos_x),
        z: Number(s.pos_z),
        rotation: Number(s.rotation),
        premium: s.is_premium,
        taken: s.taken,
      })),
    };
  } catch {
    return { seats: BUNDLED_SEATS, live: false };
  }
}

/* ─────────────── Đặt bàn ─────────────── */
export async function createReservation(
  draft: BookingDraft,
  zaloId?: string
): Promise<Reservation> {
  if (!supabase) throw offline();

  // Tham số tuỳ chọn bỏ trống thì không gửi, để Postgres dùng mặc định.
  // Có chọn ghế thì dùng hàm gói cả hai việc trong một giao dịch: ghế bị
  // người khác giữ mất thì cả lượt đặt bàn cũng không được tạo.
  const { data, error } = await supabase.rpc("create_reservation_with_seats", {
    p_purpose: draft.purpose,
    p_date: draft.date!,
    p_time: draft.time!,
    p_guests: draft.guests,
    p_seating: draft.seating,
    p_name: draft.name!,
    p_phone: draft.phone!,
    // Mảng rỗng nghĩa là không chọn ghế; hàm trên server hiểu đúng như vậy.
    p_seat_ids: draft.seatIds ?? [],
    p_omakase_set_id: draft.omakaseSetId || undefined,
    p_dietary: draft.dietary || undefined,
    p_note: draft.note || undefined,
    p_zalo_id: zaloId || undefined,
  });
  if (error) throw error;

  const row = data as unknown as ReservationRow;
  rememberCode(KEY_CODES, row.code);
  const reservation = toReservation(row);

  // Gửi thông báo Telegram tức thì đến nhà hàng
  notifyTelegram({
    type: "reservation",
    data: {
      code: reservation.code,
      guest_name: reservation.name,
      guest_phone: reservation.phone,
      guests: reservation.guests,
      reserved_date: reservation.date,
      reserved_time: reservation.time,
      purpose: reservation.purpose,
      omakase_title: draft.omakaseSetId,
      seat_labels: draft.seatIds,
      deposit_amount: reservation.depositAmount,
      deposit_paid: reservation.depositPaid,
      dietary: reservation.dietary,
      note: reservation.note,
    },
  }).catch((err) => console.warn("Telegram notification error:", err));

  // Gửi tin nhắn Zalo OA / ZNS cho khách hàng
  notifyCustomerZalo({
    type: "reservation",
    phone: reservation.phone,
    zalo_id: zaloId,
    data: {
      code: reservation.code,
      guest_name: reservation.name,
      guest_phone: reservation.phone,
      guests: reservation.guests,
      reserved_date: reservation.date,
      reserved_time: reservation.time,
      purpose: reservation.purpose,
      omakase_title: draft.omakaseSetId,
      seat_labels: draft.seatIds,
      deposit_amount: reservation.depositAmount,
      zalo_id: zaloId,
    },
  }).catch((err) => console.warn("Zalo notification error:", err));

  return reservation;
}

export async function getReservationByCode(
  code: string
): Promise<Reservation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_reservation_by_code", {
    p_code: code,
  });
  if (error || !data) return null;
  return toReservation(data as unknown as ReservationRow);
}

/** Các lượt đặt bàn mà máy này còn giữ mã. */
export async function listReservations(): Promise<Reservation[]> {
  const codes = readCodes(KEY_CODES);
  if (!supabase || codes.length === 0) return [];
  const rows = await Promise.all(codes.map((c) => getReservationByCode(c)));
  return rows.filter((r): r is Reservation => r !== null);
}

export async function cancelReservationByCode(code: string): Promise<Reservation> {
  if (!supabase) throw offline();
  const { data, error } = await supabase.rpc("cancel_reservation_by_code", {
    p_code: code,
  });
  if (error) throw error;
  return toReservation(data as unknown as ReservationRow);
}

/** Ghế của một lượt đặt bàn. Cần mã đặt bàn mới xem được. */
export async function fetchReservationSeats(code: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_reservation_seats_by_code", {
    p_code: code,
  });
  if (error || !data) return [];
  return data.map((s) => s.label);
}

/* ─────────────── Gọi món & Mua mang về ─────────────── */
export async function createOrder(input: {
  lines: CartLine[];
  mode: Order["mode"];
  tableId?: string;
  reservationId?: string;
  note?: string;
  zaloId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  paymentMethod?: "vietqr" | "cod" | "transfer";
}): Promise<Order> {
  if (!supabase) throw offline();

  const { data, error } = await supabase.rpc("create_order", {
    p_lines: input.lines.map((l) => ({
      dish_id: l.dishId,
      variant_code: l.variantId ?? null,
      qty: l.qty,
      note: l.note ?? null,
    })),
    p_mode: input.mode,
    p_table_id: input.tableId || undefined,
    p_reservation_id: input.reservationId || undefined,
    p_note: input.note || undefined,
    p_zalo_id: input.zaloId || undefined,
    p_customer_name: input.customerName || undefined,
    p_customer_phone: input.customerPhone || undefined,
    p_delivery_address: input.deliveryAddress || undefined,
    p_delivery_time: input.deliveryTime || undefined,
    p_payment_method: input.paymentMethod || "cod",
    p_delivery_fee: input.deliveryFee || 0,
  });
  if (error) throw error;

  const row = data as unknown as OrderRow & Record<string, any>;
  rememberCode(KEY_ORDERS, row.code);
  const order = toOrder(row, input.lines);

  // Gửi thông báo Telegram tức thì đến nhà hàng
  notifyTelegram({
    type: "order",
    data: {
      code: order.code,
      mode: order.mode,
      table_id: order.tableId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      delivery_address: order.deliveryAddress,
      delivery_time: order.deliveryTime,
      delivery_fee: order.deliveryFee,
      lines: input.lines.map((l) => ({
        dishName: l.name || l.dishId,
        variantName: l.variantLabel,
        qty: l.qty,
        price: l.unitPrice,
        note: l.note,
      })),
      subtotal: order.subtotal,
      payment_method: order.paymentMethod,
      note: order.note,
    },
  }).catch((err) => console.warn("Telegram notification error:", err));

  // Gửi tin nhắn Zalo OA / ZNS cho khách hàng
  notifyCustomerZalo({
    type: "order",
    phone: order.customerPhone,
    zalo_id: input.zaloId,
    data: {
      code: order.code,
      mode: order.mode,
      table_id: order.tableId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      zalo_id: input.zaloId,
    },
  }).catch((err) => console.warn("Zalo notification error:", err));

  return order;
}

export async function listOrders(): Promise<Order[]> {
  const codes = readCodes(KEY_ORDERS);
  const db = supabase;
  if (!db || codes.length === 0) return [];

  const rows = await Promise.all(
    codes.map(async (code) => {
      const { data } = await db.rpc("get_order_by_code", { p_code: code });
      if (data) {
        const o = data as any;
        const lines: CartLine[] = (o.lines ?? []).map((l: any) => ({
          key: l.id || l.dish_id,
          dishId: l.dish_id ?? "",
          name: l.name,
          variantLabel: l.variant_label ?? undefined,
          unitPrice: l.unit_price,
          qty: l.qty,
          note: l.note ?? undefined,
        }));
        return {
          id: o.id,
          code: o.code,
          createdAt: o.created_at,
          lines,
          subtotal: o.subtotal,
          mode: o.mode,
          note: o.note ?? undefined,
          status: o.status,
          customerName: o.customer_name ?? undefined,
          customerPhone: o.customer_phone ?? undefined,
          deliveryAddress: o.delivery_address ?? undefined,
          deliveryTime: o.delivery_time ?? undefined,
          deliveryFee: o.delivery_fee ?? 0,
          paymentMethod: o.payment_method ?? "cod",
          paymentStatus: o.payment_status ?? "unpaid",
        } as Order;
      }
      return null;
    })
  );

  return rows.filter((r): r is Order => r !== null);
}

/* ─────────────── Tích Điểm, Hội Viên & Quà Tặng ─────────────── */

export interface CustomerLoyaltyData {
  id: string;
  zaloId: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  points: number;
  tier: MembershipTier;
  totalSpent: number;
  visitCount: number;
}

/** Đồng bộ hoặc tạo hồ sơ khách hàng trên Supabase */
export async function syncCustomerProfile(input: {
  zaloId: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<CustomerLoyaltyData | null> {
  if (!supabase || !input.zaloId) return null;
  try {
    const { data, error } = await (supabase.rpc as any)("get_or_create_customer", {
      p_zalo_id: input.zaloId,
      p_name: input.name || undefined,
      p_phone: input.phone || undefined,
      p_avatar_url: input.avatarUrl || undefined,
    });
    if (error || !data) return null;
    const c = data as any;
    return {
      id: c.id,
      zaloId: c.zalo_id,
      name: c.name ?? "Quý Khách",
      phone: c.phone ?? undefined,
      avatarUrl: c.avatar_url ?? undefined,
      points: c.points ?? 0,
      tier: (c.tier as MembershipTier) || "bronze",
      totalSpent: c.total_spent ?? 0,
      visitCount: c.visit_count ?? 0,
    };
  } catch {
    return null;
  }
}

/** Tải danh sách quà tặng đổi điểm từ Supabase */
export async function fetchRewardGifts(): Promise<RewardGiftItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await (supabase as any)
      .from("reward_gifts")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data.map((g: any) => ({
      id: g.id,
      category: g.category,
      title: g.title,
      desc: g.description ?? "",
      worthText: g.worth_text ?? "",
      pointsCost: g.points_cost,
      badge: g.badge ?? undefined,
      imageUrl: g.image_url ?? undefined,
      isActive: g.is_active,
    }));
  } catch {
    return [];
  }
}

/** Nhận thưởng nhiệm vụ (Điểm danh, Quét QR bàn, Đánh giá, Chia sẻ) */
export async function claimQuestReward(input: {
  zaloId: string;
  questId: "daily_checkin" | "table_qr" | "review" | "share";
  extraInfo?: string;
}): Promise<{
  success: boolean;
  pointsReward?: number;
  newBalance?: number;
  title?: string;
  error?: string;
  alreadyClaimed?: boolean;
}> {
  if (!supabase) {
    return { success: false, error: "Chưa kết nối máy chủ" };
  }
  try {
    const { data, error } = await (supabase.rpc as any)("claim_quest_reward", {
      p_zalo_id: input.zaloId,
      p_quest_id: input.questId,
      p_extra_info: input.extraInfo || undefined,
    });
    if (error) return { success: false, error: error.message };
    const res = data as any;
    if (!res.success) {
      return {
        success: false,
        error: res.error,
        alreadyClaimed: res.already_claimed,
      };
    }
    return {
      success: true,
      pointsReward: res.points_reward,
      newBalance: res.new_balance,
      title: res.title,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi nhận thưởng" };
  }
}

/** Đổi quà lấy mã Voucher */
export async function redeemRewardGift(input: {
  zaloId: string;
  giftId: string;
}): Promise<{
  success: boolean;
  code?: string;
  giftTitle?: string;
  pointsCost?: number;
  newBalance?: number;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: "Chưa kết nối máy chủ" };
  }
  try {
    const { data, error } = await (supabase.rpc as any)("redeem_reward_gift", {
      p_zalo_id: input.zaloId,
      p_gift_id: input.giftId,
    });
    if (error) return { success: false, error: error.message };
    const res = data as any;
    if (!res.success) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      code: res.code,
      giftTitle: res.gift_title,
      pointsCost: res.points_cost,
      newBalance: res.new_balance,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Lỗi đổi quà" };
  }
}

/** Lấy danh sách Voucher của khách hàng */
export async function fetchCustomerVouchers(
  zaloId: string
): Promise<CustomerVoucher[]> {
  if (!supabase || !zaloId) return [];
  try {
    const { data, error } = await (supabase.rpc as any)("get_customer_vouchers", {
      p_zalo_id: zaloId,
    });
    if (error || !data) return [];
    return (data as any[]).map((v) => ({
      id: v.id,
      code: v.code,
      giftId: v.gift_id ?? undefined,
      giftTitle: v.gift_title,
      giftCategory: v.gift_category,
      worthText: v.worth_text ?? undefined,
      status: v.status,
      createdAt: v.created_at,
      usedAt: v.used_at ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** Lấy lịch sử biến động điểm từ sổ cái */
export async function fetchCustomerPointsLedger(
  customerId: string
): Promise<PointsHistoryItem[]> {
  if (!supabase || !customerId) return [];
  try {
    const { data, error } = await (supabase as any)
      .from("customer_points_ledger")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data.map((row: any) => {
      const d = new Date(row.created_at);
      const dateStr = `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}`;
      const isPositive = row.amount > 0;
      return {
        id: row.id,
        title: isPositive ? "Tích luỹ điểm thưởng" : "Đổi quà ưu đãi",
        desc: row.reason,
        date: dateStr,
        points: row.amount,
        type: (isPositive ? (row.order_id ? "order" : "reward") : "redeem") as PointsHistoryItem["type"],
      };
    });
  } catch {
    return [];
  }
}

