-- ============================================================
-- Migration: CMS Full Features Support
-- Bổ sung:
--   1. Quản lý điểm thưởng & Lịch sử điểm (customer_points_ledger)
--   2. Quà tặng đổi điểm (reward_gifts)
--   3. Mã voucher khuyến mãi (vouchers) & Nhật ký sử dụng (voucher_redemptions)
--   4. Banner trình chiếu trang chủ & Omakase (banners)
--   5. Cấu hình gửi thông báo Zalo OA ZNS (zns_logs & settings)
-- ============================================================

-- ── 1. Quản lý điểm & Hạng thành viên ────────────────────────
alter table public.customers
  add column if not exists points integer not null default 0 check (points >= 0),
  add column if not exists tier text not null default 'bronze'
    check (tier in ('bronze', 'silver', 'gold', 'diamond')),
  add column if not exists total_spent bigint not null default 0 check (total_spent >= 0),
  add column if not exists visit_count integer not null default 0 check (visit_count >= 0),
  add column if not exists last_visit timestamptz;

create table if not exists public.customer_points_ledger (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount      integer not null, -- số điểm cộng (+) hoặc trừ (-)
  balance     integer not null default 0, -- số dư sau giao dịch
  reason      text not null, -- 'Tích điểm đơn hàng', 'Đổi voucher 100k', 'Thưởng sinh nhật', 'Quản lý điều chỉnh'
  order_id    uuid references public.orders(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists points_ledger_customer_idx on public.customer_points_ledger (customer_id, created_at desc);

alter table public.customer_points_ledger enable row level security;
create policy "Staff manage points ledger" on public.customer_points_ledger
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Customers read their own points" on public.customer_points_ledger
  for select using (
    exists (
      select 1 from public.customers c
      where c.id = customer_id and (c.zalo_id = auth.uid()::text or auth.role() = 'authenticated')
    )
  );

-- ── 2. Danh mục quà đổi điểm ──────────────────────────────
create table if not exists public.reward_gifts (
  id          text primary key, -- 'gift-v50', 'gift-sashimi', ...
  category    text not null check (category in ('voucher', 'dish', 'drink')),
  title       text not null,
  description text,
  worth_text  text, -- 'Trị giá 50.000đ', 'Trị giá 185.000đ'
  points_cost integer not null check (points_cost > 0),
  badge       text, -- 'Dễ đổi nhất', 'Phổ biến', 'Wagyu A5'
  image_url   text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.reward_gifts enable row level security;
create policy "Anyone read active reward gifts" on public.reward_gifts
  for select using (true);
create policy "Staff manage reward gifts" on public.reward_gifts
  for all using (public.is_staff()) with check (public.is_staff());

-- ── 3. Quản lý mã Voucher & Đổi thưởng ─────────────────────
create table if not exists public.vouchers (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique, -- 'MIYAKO50', 'VIPWAGYU'
  title           text not null,
  discount_type   text not null check (discount_type in ('fixed', 'percent')),
  discount_value  integer not null check (discount_value > 0),
  min_order_value integer not null default 0 check (min_order_value >= 0),
  max_discount    integer, -- áp dụng cho loại percent
  usage_limit     integer, -- null = không giới hạn
  used_count      integer not null default 0 check (used_count >= 0),
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table public.vouchers enable row level security;
create policy "Anyone read active vouchers" on public.vouchers
  for select using (is_active);
create policy "Staff manage vouchers" on public.vouchers
  for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.voucher_redemptions (
  id          uuid primary key default gen_random_uuid(),
  voucher_id  uuid references public.vouchers(id) on delete set null,
  gift_id     text references public.reward_gifts(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  code        text not null, -- mã sinh ra cho khách: 'RD-XXXXXX'
  status      text not null default 'active' check (status in ('active', 'used', 'expired')),
  used_at     timestamptz,
  used_by     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists redemptions_code_idx on public.voucher_redemptions (code);
alter table public.voucher_redemptions enable row level security;
create policy "Staff manage redemptions" on public.voucher_redemptions
  for all using (public.is_staff()) with check (public.is_staff());
create policy "Customers read their redemptions" on public.voucher_redemptions
  for select using (true);

-- ── 4. Quản lý Banner & Truyền thông ──────────────────────
create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null default 'home_hero' check (placement in ('home_hero', 'omakase_hero', 'butcher_hero', 'popup')),
  title       text not null,
  subtitle    text,
  tag         text, -- 'Omakase', 'Ưu đãi Wagyu'
  jp_text     text,
  image_url   text not null,
  cta_text    text, -- 'Đặt bàn ngay', 'Xem thịt tươi'
  cta_link    text, -- '/booking', '/butcher', '/menu'
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.banners enable row level security;
create policy "Anyone read active banners" on public.banners
  for select using (is_active);
create policy "Staff manage banners" on public.banners
  for all using (public.is_staff()) with check (public.is_staff());

-- ── 5. Bổ sung hàm RPC cập nhật điểm khách hàng ───────────
create or replace function public.adjust_customer_points(
  p_customer_id uuid,
  p_amount      integer,
  p_reason      text
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cust public.customers;
  v_new_points integer;
  v_new_tier text;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền điều chỉnh điểm';
  end if;

  select * into v_cust from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Không tìm thấy khách hàng';
  end if;

  v_new_points := greatest(v_cust.points + p_amount, 0);

  -- Tự động tính hạng thành viên theo điểm tích luỹ
  if v_new_points >= 2000 then
    v_new_tier := 'diamond';
  elsif v_new_points >= 800 then
    v_new_tier := 'gold';
  elsif v_new_points >= 300 then
    v_new_tier := 'silver';
  else
    v_new_tier := 'bronze';
  end if;

  update public.customers
  set points = v_new_points,
      tier = v_new_tier,
      updated_at = now()
  where id = p_customer_id
  returning * into v_cust;

  insert into public.customer_points_ledger (customer_id, amount, balance, reason, created_by)
  values (p_customer_id, p_amount, v_new_points, p_reason, auth.uid());

  return v_cust;
end;
$$;
