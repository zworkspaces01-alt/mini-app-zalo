import type { ReservationStatus } from "./supabase";

type Tone = "neutral" | "gold" | "jade" | "shu" | "faint";

export const RESERVATION_STATUS: Record<
  ReservationStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Chờ xác nhận", tone: "neutral" },
  "awaiting-deposit": { label: "Chờ đặt cọc", tone: "gold" },
  confirmed: { label: "Đã xác nhận", tone: "jade" },
  cancelled: { label: "Đã huỷ", tone: "faint" },
  completed: { label: "Đã dùng bữa", tone: "faint" },
  "no-show": { label: "Khách không đến", tone: "shu" },
};

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  sent: { label: "Mới gửi", tone: "shu" },
  preparing: { label: "Đang chuẩn bị", tone: "gold" },
  delivering: { label: "Đang giao", tone: "gold" },
  served: { label: "Đã ra món / Hoàn tất", tone: "jade" },
  completed: { label: "Hoàn tất", tone: "jade" },
  cancelled: { label: "Đã huỷ", tone: "faint" },
};

export const SEATING_LABEL: Record<string, string> = {
  counter: "Quầy itamae",
  table: "Bàn khu chung",
  private: "Phòng riêng",
};

export const PURPOSE_LABEL: Record<string, string> = {
  omakase: "Omakase",
  alacarte: "Gọi món",
};

/** Các trạng thái còn giữ chỗ — dùng để đếm và để tính chỗ trống. */
export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "awaiting-deposit",
  "confirmed",
];
