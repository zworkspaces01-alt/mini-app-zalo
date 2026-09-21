-- ============================================================
-- Miyako — lược đồ cơ sở dữ liệu
--
-- Quy ước:
--   · Giá lưu bằng số nguyên VND (199000), không dùng số thực.
--   · Trạng thái lưu bằng text + CHECK, dễ thêm giá trị hơn enum của Postgres.
--   · id dạng text (slug) cho dữ liệu nội dung để khớp mã trong mini app
--     và để nhân viên đọc hiểu được; id dạng uuid cho dữ liệu phát sinh.
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Hàm dùng chung ──────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. NHÂN SỰ
-- ============================================================
create table public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'staff'
             check (role in ('owner', 'manager', 'staff', 'kitchen')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.staff is
  'Tài khoản nhân viên. Mọi quyền ghi vào CMS đều dựa trên bảng này.';

-- Ai đang đăng nhập có phải nhân viên đang hoạt động không.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and is_active
  );
$$;

-- Nhân viên có quyền quản lý (sửa menu, cấu hình, nhân sự).
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and is_active and role in ('owner', 'manager')
  );
$$;

-- ============================================================
-- 2. CẤU HÌNH NHÀ HÀNG
-- ============================================================
create table public.restaurant_settings (
  id                   smallint primary key default 1 check (id = 1),
  name                 text not null default 'MIYAKO',
  tagline              text,
  address              text,
  maps_url             text,
  hotline              text,
  oa_id                text,
  city                 text default 'Hà Nội',
  counter_seats        integer not null default 12 check (counter_seats >= 0),
  deposit_rate         numeric(4,3) not null default 0.5
                       check (deposit_rate >= 0 and deposit_rate <= 1),
  -- Để null nghĩa là CHƯA XÁC NHẬN: mini app sẽ ẩn phần đó đi thay vì đoán.
  vat_rate             numeric(4,3) check (vat_rate >= 0 and vat_rate <= 1),
  service_charge_rate  numeric(4,3) check (service_charge_rate >= 0 and service_charge_rate <= 1),
  price_includes_vat   boolean not null default false,
  menu_price_note      text default 'Đơn vị tính: 1.000đ · Giá chưa bao gồm VAT',
  cancellation_policy  text,
  booking_lead_days    integer not null default 30 check (booking_lead_days > 0),
  updated_at           timestamptz not null default now()
);

comment on table public.restaurant_settings is
  'Chỉ có đúng một dòng (id = 1). Cột null = dữ kiện chưa được xác nhận.';

create trigger restaurant_settings_touch
  before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();

-- ── Giờ mở cửa theo ca ──────────────────────────────────────
create table public.opening_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6), -- 0 = Chủ nhật
  service    text not null check (service in ('lunch', 'dinner')),
  open_time  time not null,
  close_time time not null,
  -- Khoảng cách giữa các khung giờ nhận khách, tính bằng phút.
  slot_minutes integer not null default 30 check (slot_minutes > 0),
  -- Sức chứa mỗi khung giờ; null = lấy theo sức chứa khu vực.
  slot_capacity integer check (slot_capacity > 0),
  is_closed  boolean not null default false,
  unique (weekday, service)
);

comment on table public.opening_hours is
  'Nguồn sinh khung giờ đặt bàn. Không có dòng nào cho một ngày nghĩa là ngày đó nghỉ.';

-- ── Bàn ─────────────────────────────────────────────────────
create table public.restaurant_tables (
  id         text primary key,                    -- 'A3', 'Q1', 'VIP2'
  label      text not null,
  zone       text not null check (zone in ('counter', 'table', 'private')),
  seats      integer not null check (seats > 0),
  is_active  boolean not null default true,
  sort_order integer not null default 0
);

-- ============================================================
-- 3. NỘI DUNG — THỰC ĐƠN
-- ============================================================
create table public.categories (
  id         text primary key,                    -- 'khai-vi'
  name       text not null,
  jp         text,
  romaji     text,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table public.dishes (
  id               text primary key,              -- 'kani-miso-yaki'
  category_id      text not null references public.categories(id) on update cascade,
  name             text not null,
  romaji           text,
  jp               text,
  -- null khi món chỉ bán theo phần (xem dish_variants).
  price            integer check (price >= 0),
  compare_at_price integer check (compare_at_price >= 0),
  unit             text,                          -- '100gr', '2 khách · 250gr'
  description      text,
  includes         text[] not null default '{}',  -- các phần thịt trong combo
  gifts            text[] not null default '{}',  -- set tặng kèm
  badges           text[] not null default '{}',
  image_path       text,                          -- đường dẫn trong storage
  source_page      text,                          -- trang menu giấy gốc: 'M21'
  is_available     boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint dishes_badges_valid check (
    badges <@ array['signature', 'best-seller', 'must-try']::text[]
  )
);

comment on column public.dishes.source_page is
  'Trang trong bộ menu in gốc — giữ lại để đối chiếu khi nhà hàng đổi giá.';
comment on column public.dishes.is_available is
  'Tắt khi hết nguyên liệu. Món vẫn nằm trong CMS nhưng mini app không cho gọi.';

create index dishes_category_idx on public.dishes (category_id, sort_order);
create index dishes_available_idx on public.dishes (is_available) where is_available;

create trigger dishes_touch
  before update on public.dishes
  for each row execute function public.touch_updated_at();

create table public.dish_variants (
  id         uuid primary key default gen_random_uuid(),
  dish_id    text not null references public.dishes(id) on delete cascade on update cascade,
  code       text not null,                       -- 'm', 'l'
  label      text not null,                       -- 'Medium'
  price      integer not null check (price >= 0),
  note       text,                                -- '200gr'
  sort_order integer not null default 0,
  unique (dish_id, code)
);

-- Món phải có giá, hoặc có ít nhất một phần để chọn.
create or replace function public.dish_has_price(p_dish_id text)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.dishes where id = p_dish_id and price is not null)
      or exists (select 1 from public.dish_variants where dish_id = p_dish_id);
$$;

-- ============================================================
-- 4. NỘI DUNG — OMAKASE
-- ============================================================
create table public.omakase_sets (
  id           text primary key,                  -- 'kaze'
  name         text not null,
  jp           text,
  subtitle     text,
  price        integer not null check (price >= 0),
  service      text not null check (service in ('lunch', 'dinner')),
  tier         smallint not null default 1 check (tier between 1 and 9),
  description  text,
  image_path   text,
  -- true khi thực đơn chi tiết chưa được bếp xác nhận: mini app hiển thị
  -- "đang cập nhật" thay vì bịa món.
  menu_pending boolean not null default true,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger omakase_sets_touch
  before update on public.omakase_sets
  for each row execute function public.touch_updated_at();

create table public.omakase_courses (
  id         uuid primary key default gen_random_uuid(),
  set_id     text not null references public.omakase_sets(id) on delete cascade on update cascade,
  section    text not null,                       -- 'Khai vị', 'Sashimi'
  items      text[] not null default '{}',
  sort_order integer not null default 0
);

create index omakase_courses_set_idx on public.omakase_courses (set_id, sort_order);

-- ============================================================
-- 5. KHÁCH
-- ============================================================
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  zalo_id    text unique,
  name       text,
  phone      text,
  avatar_url text,
  note       text,                                -- ghi chú nội bộ về khách quen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_phone_idx on public.customers (phone);

create trigger customers_touch
  before update on public.customers
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 6. ĐẶT BÀN
-- ============================================================
create table public.reservations (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,           -- 'MY-4F7K2'
  customer_id     uuid references public.customers(id) on delete set null,
  zalo_id         text,

  purpose         text not null check (purpose in ('omakase', 'alacarte')),
  omakase_set_id  text references public.omakase_sets(id) on update cascade,

  reserved_date   date not null,
  reserved_time   time not null,
  guests          integer not null check (guests > 0),
  seating         text not null check (seating in ('counter', 'table', 'private')),

  guest_name      text not null,
  guest_phone     text not null,
  dietary         text,                           -- dị ứng / chế độ ăn, bếp cần biết trước
  note            text,

  status          text not null default 'pending'
                  check (status in ('pending', 'awaiting-deposit', 'confirmed',
                                    'cancelled', 'completed', 'no-show')),
  deposit_amount  integer not null default 0 check (deposit_amount >= 0),
  deposit_paid    boolean not null default false,
  deposit_method  text,                           -- 'zalopay', 'transfer', 'cash'

  table_id        text references public.restaurant_tables(id) on update cascade,
  staff_note      text,                           -- ghi chú nội bộ, khách không thấy
  cancelled_reason text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Suất omakase bắt buộc phải chọn set.
  constraint reservations_omakase_needs_set check (
    purpose <> 'omakase' or omakase_set_id is not null
  )
);

create index reservations_date_idx   on public.reservations (reserved_date, reserved_time);
create index reservations_status_idx on public.reservations (status);
create index reservations_zalo_idx   on public.reservations (zalo_id);
create index reservations_phone_idx  on public.reservations (guest_phone);

create trigger reservations_touch
  before update on public.reservations
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 7. ĐƠN GỌI MÓN
-- ============================================================
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,            -- 'OD-8K2PQ'
  reservation_id uuid references public.reservations(id) on delete set null,
  table_id       text references public.restaurant_tables(id) on update cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  zalo_id        text,

  mode           text not null check (mode in ('dine-in', 'pre-order')),
  status         text not null default 'sent'
                 check (status in ('sent', 'preparing', 'served', 'cancelled')),
  subtotal       integer not null default 0 check (subtotal >= 0),
  note           text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Đơn tại bàn phải biết bàn nào; đơn đặt trước phải gắn với một lượt đặt bàn.
  constraint orders_target_present check (
    (mode = 'dine-in'   and table_id is not null) or
    (mode = 'pre-order' and reservation_id is not null)
  )
);

create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_lines (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  dish_id       text references public.dishes(id) on update cascade,
  -- Chép lại tên và giá tại thời điểm gọi: đổi giá sau này không làm sai đơn cũ.
  name          text not null,
  variant_label text,
  unit_price    integer not null check (unit_price >= 0),
  qty           integer not null check (qty > 0),
  note          text
);

create index order_lines_order_idx on public.order_lines (order_id);

comment on column public.order_lines.name is
  'Bản chụp tên món lúc gọi, không join ngược về dishes khi in phiếu.';
