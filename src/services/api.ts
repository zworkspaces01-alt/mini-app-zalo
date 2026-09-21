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
import {
  BookingDraft,
  CartLine,
  OmakaseSet,
  Order,
  Reservation,
  ReservationStatus,
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
  return toReservation(row);
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
  return toOrder(row, input.lines);
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
