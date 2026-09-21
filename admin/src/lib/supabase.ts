import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Sao chép .env.example thành .env rồi điền."
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/* Bí danh cho các kiểu dòng hay dùng */
type T = Database["public"]["Tables"];
export type Dish = T["dishes"]["Row"];
export type DishVariant = T["dish_variants"]["Row"];
export type Category = T["categories"]["Row"];
export type OmakaseSet = T["omakase_sets"]["Row"];
export type OmakaseCourse = T["omakase_courses"]["Row"];
export type Reservation = T["reservations"]["Row"];
export type Order = T["orders"]["Row"];
export type OrderLine = T["order_lines"]["Row"];
export type RestaurantTable = T["restaurant_tables"]["Row"];
export type OpeningHours = T["opening_hours"]["Row"];
export type Settings = T["restaurant_settings"]["Row"];
export type Staff = T["staff"]["Row"];
export type Payment = T["payments"]["Row"];
export type Seat = T["seats"]["Row"];
export type ContentItem = T["content_items"]["Row"];
export type LoyaltyTier = T["loyalty_tiers"]["Row"];
export type LoyaltyQuest = T["loyalty_quests"]["Row"];

export interface Customer {
  id: string;
  zalo_id: string | null;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  note: string | null;
  points: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  total_spent: number;
  visit_count: number;
  last_visit: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPointsLedger {
  id: string;
  customer_id: string;
  amount: number;
  balance: number;
  reason: string;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RewardGift {
  id: string;
  category: "voucher" | "dish" | "drink";
  title: string;
  description: string | null;
  worth_text: string | null;
  points_cost: number;
  badge: string | null;
  image_url: string | null;
  /** Số tiền trừ vào đơn khi khách dùng mã đổi được — chỉ quà loại voucher. */
  discount_value: number | null;
  min_order_value: number;
  is_active: boolean;
  sort_order: number;
  i18n: unknown;
  i18n_hash: string | null;
  i18n_src_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VoucherRedemption {
  id: string;
  voucher_id: string | null;
  gift_id: string | null;
  customer_id: string;
  order_id: string | null;
  code: string;
  status: "active" | "used" | "expired";
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  placement: "home_hero" | "omakase_hero" | "butcher_hero" | "popup";
  title: string;
  subtitle: string | null;
  tag: string | null;
  jp_text: string | null;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  /** Màu phủ lên ảnh, dạng #rrggbb. */
  accent: string | null;
  is_active: boolean;
  sort_order: number;
  i18n: unknown;
  i18n_hash: string | null;
  i18n_src_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = Reservation["status"];
export type OrderStatus = Order["status"];

