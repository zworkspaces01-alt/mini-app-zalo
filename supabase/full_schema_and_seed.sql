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
-- ============================================================
-- Miyako — RLS và các hàm public
--
-- Nguyên tắc bảo mật:
--   · Mini app chạy bằng anon key, ai cũng đọc được → chỉ cho ĐỌC nội dung
--     thực đơn, không cho đọc/ghi trực tiếp đặt bàn và đơn hàng.
--   · Mọi thao tác của khách đi qua hàm security definer, nơi server tự tính
--     lại giá và tiền cọc từ bảng dishes/omakase_sets. Không bao giờ tin
--     con số do client gửi lên.
--   · Tra cứu đặt bàn phải có mã: biết mã mới xem được, như số vé.
-- ============================================================

alter table public.staff               enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.opening_hours       enable row level security;
alter table public.restaurant_tables   enable row level security;
alter table public.categories          enable row level security;
alter table public.dishes              enable row level security;
alter table public.dish_variants       enable row level security;
alter table public.omakase_sets        enable row level security;
alter table public.omakase_courses     enable row level security;
alter table public.customers           enable row level security;
alter table public.reservations        enable row level security;
alter table public.orders              enable row level security;
alter table public.order_lines         enable row level security;

-- ── Nội dung: ai cũng đọc được, chỉ quản lý mới sửa ────────
create policy "content readable by everyone" on public.categories
  for select using (true);
create policy "content readable by everyone" on public.dishes
  for select using (true);
create policy "content readable by everyone" on public.dish_variants
  for select using (true);
create policy "content readable by everyone" on public.omakase_sets
  for select using (true);
create policy "content readable by everyone" on public.omakase_courses
  for select using (true);
create policy "content readable by everyone" on public.restaurant_settings
  for select using (true);
create policy "content readable by everyone" on public.opening_hours
  for select using (true);
create policy "content readable by everyone" on public.restaurant_tables
  for select using (true);

create policy "managers write content" on public.categories
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.dishes
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.dish_variants
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.omakase_sets
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.omakase_courses
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.restaurant_settings
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.opening_hours
  for all using (public.is_manager()) with check (public.is_manager());
create policy "managers write content" on public.restaurant_tables
  for all using (public.is_manager()) with check (public.is_manager());

-- ── Nhân sự ────────────────────────────────────────────────
create policy "staff read own row" on public.staff
  for select using (user_id = auth.uid() or public.is_manager());
create policy "managers manage staff" on public.staff
  for all using (public.is_manager()) with check (public.is_manager());

-- ── Dữ liệu vận hành: chỉ nhân viên đăng nhập ──────────────
-- Khách không có policy nào ở đây, nên anon không đọc/ghi trực tiếp được.
create policy "staff manage customers" on public.customers
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage reservations" on public.reservations
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage orders" on public.orders
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage order lines" on public.order_lines
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- Sinh mã dễ đọc qua điện thoại (bỏ các ký tự dễ nhầm: 0/O, 1/I, B/8, Z/2)
-- ============================================================
create or replace function public.make_code(p_prefix text)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ACDEFGHJKLMNPQRSTUVWXY3456789';
  result text := '';
  i integer;
begin
  for i in 1..5 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return p_prefix || '-' || result;
end;
$$;

-- ============================================================
-- Khung giờ còn chỗ
-- ============================================================
create or replace function public.get_availability(
  p_date    date,
  p_service text
)
returns table (slot_time time, capacity integer, seats_left integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours  public.opening_hours%rowtype;
  v_default_capacity integer;
begin
  select * into v_hours
  from public.opening_hours
  where weekday = extract(dow from p_date)::smallint
    and service = p_service
    and not is_closed;

  if not found then
    return;                                   -- ngày đó không phục vụ ca này
  end if;

  -- Không đặt riêng sức chứa thì lấy tổng số ghế của các bàn đang hoạt động.
  select coalesce(v_hours.slot_capacity, sum(seats), 0)
    into v_default_capacity
  from public.restaurant_tables
  where is_active;

  return query
  with slots as (
    select generate_series(
             p_date + v_hours.open_time,
             p_date + v_hours.close_time,
             make_interval(mins => v_hours.slot_minutes)
           )::time as t
  ),
  booked as (
    select reserved_time, sum(guests)::integer as taken
    from public.reservations
    where reserved_date = p_date
      and status in ('pending', 'awaiting-deposit', 'confirmed')
    group by reserved_time
  )
  select s.t,
         v_default_capacity,
         greatest(v_default_capacity - coalesce(b.taken, 0), 0)::integer
  from slots s
  left join booked b on b.reserved_time = s.t
  order by s.t;
end;
$$;

grant execute on function public.get_availability(date, text) to anon, authenticated;

-- ============================================================
-- Khách tạo đặt bàn
-- Server tự tính tiền cọc từ giá suất trong CSDL.
-- ============================================================
create or replace function public.create_reservation(
  p_purpose        text,
  p_omakase_set_id text,
  p_date           date,
  p_time           time,
  p_guests         integer,
  p_seating        text,
  p_name           text,
  p_phone          text,
  p_dietary        text default null,
  p_note           text default null,
  p_zalo_id        text default null
)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_set          public.omakase_sets%rowtype;
  v_deposit_rate numeric;
  v_deposit      integer := 0;
  v_customer_id  uuid;
  v_code         text;
  v_row          public.reservations;
begin
  if p_guests is null or p_guests < 1 or p_guests > 40 then
    raise exception 'Số khách không hợp lệ';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Thiếu tên hoặc số điện thoại';
  end if;
  if p_date < current_date then
    raise exception 'Không đặt bàn cho ngày đã qua';
  end if;

  select deposit_rate into v_deposit_rate from public.restaurant_settings where id = 1;
  v_deposit_rate := coalesce(v_deposit_rate, 0.5);

  if p_purpose = 'omakase' then
    select * into v_set
    from public.omakase_sets
    where id = p_omakase_set_id and is_active;

    if not found then
      raise exception 'Suất omakase không tồn tại hoặc đã ngừng phục vụ';
    end if;

    -- Giá lấy từ CSDL, không lấy từ client.
    v_deposit := round(v_set.price * p_guests * v_deposit_rate);
  end if;

  if p_zalo_id is not null then
    insert into public.customers (zalo_id, name, phone)
    values (p_zalo_id, p_name, p_phone)
    on conflict (zalo_id) do update
      set name  = coalesce(excluded.name, public.customers.name),
          phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;
  end if;

  -- Rất hiếm khi trùng mã, nhưng vẫn thử lại cho chắc.
  for i in 1..8 loop
    v_code := public.make_code('MY');
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (
    code, customer_id, zalo_id, purpose, omakase_set_id,
    reserved_date, reserved_time, guests, seating,
    guest_name, guest_phone, dietary, note,
    status, deposit_amount
  ) values (
    v_code, v_customer_id, p_zalo_id, p_purpose,
    case when p_purpose = 'omakase' then p_omakase_set_id end,
    p_date, p_time, p_guests, p_seating,
    trim(p_name), trim(p_phone), nullif(trim(p_dietary), ''), nullif(trim(p_note), ''),
    case when v_deposit > 0 then 'awaiting-deposit' else 'pending' end,
    v_deposit
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_reservation(
  text, text, date, time, integer, text, text, text, text, text, text
) to anon, authenticated;

-- ============================================================
-- Khách tra cứu / huỷ đặt bàn bằng mã
-- ============================================================
create or replace function public.get_reservation_by_code(p_code text)
returns public.reservations
language sql
stable
security definer
set search_path = public
as $$
  select * from public.reservations where code = upper(trim(p_code));
$$;

grant execute on function public.get_reservation_by_code(text) to anon, authenticated;

create or replace function public.cancel_reservation_by_code(p_code text)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row public.reservations;
begin
  update public.reservations
     set status = 'cancelled'
   where code = upper(trim(p_code))
     and status in ('pending', 'awaiting-deposit', 'confirmed')
  returning * into v_row;

  if not found then
    raise exception 'Không tìm thấy đặt bàn còn hiệu lực với mã này';
  end if;

  return v_row;
end;
$$;

grant execute on function public.cancel_reservation_by_code(text) to anon, authenticated;

-- ============================================================
-- Khách gửi đơn gọi món
-- Giá từng dòng được tính lại từ bảng dishes / dish_variants.
-- p_lines: [{"dish_id":"kimchi","variant_code":null,"qty":2,"note":"ít cay"}]
-- ============================================================
create or replace function public.create_order(
  p_lines          jsonb,
  p_mode           text,
  p_table_id       text default null,
  p_reservation_id uuid default null,
  p_note           text default null,
  p_zalo_id        text default null
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_line      jsonb;
  v_dish      public.dishes%rowtype;
  v_variant   public.dish_variants%rowtype;
  v_price     integer;
  v_qty       integer;
  v_subtotal  integer := 0;
  v_code      text;
  v_order     public.orders;
  v_customer_id uuid;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn không có món nào';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Đơn quá nhiều dòng';
  end if;

  if p_mode = 'dine-in' then
    if not exists (select 1 from public.restaurant_tables where id = p_table_id and is_active) then
      raise exception 'Bàn không hợp lệ';
    end if;
  elsif p_mode = 'pre-order' then
    if not exists (
      select 1 from public.reservations
      where id = p_reservation_id and status in ('pending', 'awaiting-deposit', 'confirmed')
    ) then
      raise exception 'Lượt đặt bàn không hợp lệ';
    end if;
  else
    raise exception 'Hình thức gọi món không hợp lệ';
  end if;

  if p_zalo_id is not null then
    select id into v_customer_id from public.customers where zalo_id = p_zalo_id;
  end if;

  for i in 1..8 loop
    v_code := public.make_code('OD');
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (code, reservation_id, table_id, customer_id, zalo_id, mode, note)
  values (
    v_code,
    case when p_mode = 'pre-order' then p_reservation_id end,
    case when p_mode = 'dine-in'   then p_table_id end,
    v_customer_id, p_zalo_id, p_mode, nullif(trim(p_note), '')
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish
    from public.dishes
    where id = v_line ->> 'dish_id' and is_available;

    if not found then
      raise exception 'Món % không còn phục vụ', v_line ->> 'dish_id';
    end if;

    v_qty := greatest(coalesce((v_line ->> 'qty')::integer, 1), 1);
    if v_qty > 50 then
      raise exception 'Số lượng một món vượt mức cho phép';
    end if;

    if coalesce(v_line ->> 'variant_code', '') <> '' then
      select * into v_variant
      from public.dish_variants
      where dish_id = v_dish.id and code = v_line ->> 'variant_code';

      if not found then
        raise exception 'Phần đã chọn của món % không tồn tại', v_dish.name;
      end if;
      v_price := v_variant.price;
    else
      if v_dish.price is null then
        raise exception 'Món % phải chọn phần', v_dish.name;
      end if;
      v_price := v_dish.price;
      v_variant := null;
    end if;

    insert into public.order_lines (order_id, dish_id, name, variant_label, unit_price, qty, note)
    values (
      v_order.id, v_dish.id, v_dish.name, v_variant.label, v_price, v_qty,
      nullif(trim(v_line ->> 'note'), '')
    );

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  update public.orders set subtotal = v_subtotal where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_order(jsonb, text, text, uuid, text, text)
  to anon, authenticated;

create or replace function public.get_order_by_code(p_code text)
returns public.orders
language sql
stable
security definer
set search_path = public
as $$
  select * from public.orders where code = upper(trim(p_code));
$$;

grant execute on function public.get_order_by_code(text) to anon, authenticated;
-- ============================================================
-- Đưa các tham số tuỳ chọn của create_reservation xuống cuối.
--
-- Lý do: bộ sinh kiểu TypeScript của Supabase chỉ đánh dấu tham số là
-- không bắt buộc khi nó có giá trị mặc định. Postgres lại bắt buộc mọi
-- tham số đứng sau một tham số có mặc định cũng phải có mặc định, nên
-- p_omakase_set_id phải chuyển xuống sau nhóm bắt buộc.
-- ============================================================

drop function if exists public.create_reservation(
  text, text, date, time, integer, text, text, text, text, text, text
);

create or replace function public.create_reservation(
  p_purpose        text,
  p_date           date,
  p_time           time,
  p_guests         integer,
  p_seating        text,
  p_name           text,
  p_phone          text,
  p_omakase_set_id text default null,
  p_dietary        text default null,
  p_note           text default null,
  p_zalo_id        text default null
)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_set          public.omakase_sets%rowtype;
  v_deposit_rate numeric;
  v_deposit      integer := 0;
  v_customer_id  uuid;
  v_code         text;
  v_row          public.reservations;
begin
  if p_guests is null or p_guests < 1 or p_guests > 40 then
    raise exception 'Số khách không hợp lệ';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Thiếu tên hoặc số điện thoại';
  end if;
  if p_date < current_date then
    raise exception 'Không đặt bàn cho ngày đã qua';
  end if;

  select deposit_rate into v_deposit_rate from public.restaurant_settings where id = 1;
  v_deposit_rate := coalesce(v_deposit_rate, 0.5);

  if p_purpose = 'omakase' then
    select * into v_set
    from public.omakase_sets
    where id = p_omakase_set_id and is_active;

    if not found then
      raise exception 'Suất omakase không tồn tại hoặc đã ngừng phục vụ';
    end if;

    -- Giá lấy từ CSDL, không lấy từ client.
    v_deposit := round(v_set.price * p_guests * v_deposit_rate);
  end if;

  if p_zalo_id is not null then
    insert into public.customers (zalo_id, name, phone)
    values (p_zalo_id, p_name, p_phone)
    on conflict (zalo_id) do update
      set name  = coalesce(excluded.name, public.customers.name),
          phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;
  end if;

  for i in 1..8 loop
    v_code := public.make_code('MY');
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (
    code, customer_id, zalo_id, purpose, omakase_set_id,
    reserved_date, reserved_time, guests, seating,
    guest_name, guest_phone, dietary, note,
    status, deposit_amount
  ) values (
    v_code, v_customer_id, p_zalo_id, p_purpose,
    case when p_purpose = 'omakase' then p_omakase_set_id end,
    p_date, p_time, p_guests, p_seating,
    trim(p_name), trim(p_phone), nullif(trim(p_dietary), ''), nullif(trim(p_note), ''),
    case when v_deposit > 0 then 'awaiting-deposit' else 'pending' end,
    v_deposit
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_reservation(
  text, date, time, integer, text, text, text, text, text, text, text
) to anon, authenticated;
-- ============================================================
-- Hàm cho nhân viên: tạo và sửa đặt bàn, đơn gọi món.
--
-- Nhân viên đã có quyền ghi thẳng vào bảng qua RLS, nhưng việc sinh mã,
-- tính tiền cọc và tra giá món vẫn phải dùng chung một chỗ với luồng của
-- khách. Nếu để trang quản trị tự tính thì sớm muộn hai bên sẽ lệch nhau.
-- ============================================================

-- ── Nhân viên tạo đặt bàn (khách gọi điện, khách vãng lai) ──
create or replace function public.staff_create_reservation(
  p_purpose        text,
  p_date           date,
  p_time           time,
  p_guests         integer,
  p_seating        text,
  p_name           text,
  p_phone          text,
  p_omakase_set_id text default null,
  p_dietary        text default null,
  p_note           text default null,
  p_status         text default 'confirmed',
  p_table_id       text default null,
  p_deposit_paid   boolean default false,
  p_staff_note     text default null
)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_set          public.omakase_sets%rowtype;
  v_deposit_rate numeric;
  v_deposit      integer := 0;
  v_code         text;
  v_row          public.reservations;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới tạo được đặt bàn ở đây';
  end if;

  if p_guests is null or p_guests < 1 or p_guests > 40 then
    raise exception 'Số khách không hợp lệ';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Thiếu tên hoặc số điện thoại';
  end if;

  select deposit_rate into v_deposit_rate from public.restaurant_settings where id = 1;
  v_deposit_rate := coalesce(v_deposit_rate, 0.5);

  if p_purpose = 'omakase' then
    select * into v_set from public.omakase_sets where id = p_omakase_set_id;
    if not found then
      raise exception 'Suất omakase không tồn tại';
    end if;
    v_deposit := round(v_set.price * p_guests * v_deposit_rate);
  end if;

  for i in 1..8 loop
    v_code := public.make_code('MY');
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (
    code, purpose, omakase_set_id, reserved_date, reserved_time, guests, seating,
    guest_name, guest_phone, dietary, note, status, deposit_amount, deposit_paid,
    table_id, staff_note
  ) values (
    v_code, p_purpose,
    case when p_purpose = 'omakase' then p_omakase_set_id end,
    p_date, p_time, p_guests, p_seating,
    trim(p_name), trim(p_phone),
    nullif(trim(p_dietary), ''), nullif(trim(p_note), ''),
    p_status, v_deposit, p_deposit_paid,
    nullif(p_table_id, ''), nullif(trim(p_staff_note), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.staff_create_reservation(
  text, date, time, integer, text, text, text, text, text, text, text, text, boolean, text
) to authenticated;

-- ── Tính lại tiền cọc khi nhân viên đổi suất hoặc số khách ──
create or replace function public.recalc_reservation_deposit(p_id uuid)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_res     public.reservations%rowtype;
  v_price   integer;
  v_rate    numeric;
  v_deposit integer := 0;
begin
  if not public.is_staff() then
    raise exception 'Không có quyền';
  end if;

  select * into v_res from public.reservations where id = p_id;
  if not found then
    raise exception 'Không tìm thấy lượt đặt bàn';
  end if;

  select deposit_rate into v_rate from public.restaurant_settings where id = 1;
  v_rate := coalesce(v_rate, 0.5);

  if v_res.purpose = 'omakase' and v_res.omakase_set_id is not null then
    select price into v_price from public.omakase_sets where id = v_res.omakase_set_id;
    v_deposit := round(coalesce(v_price, 0) * v_res.guests * v_rate);
  end if;

  update public.reservations
     set deposit_amount = v_deposit
   where id = p_id
  returning * into v_res;

  return v_res;
end;
$$;

grant execute on function public.recalc_reservation_deposit(uuid) to authenticated;

-- ── Nhân viên tạo đơn gọi món (khách gọi miệng tại bàn) ──
create or replace function public.staff_create_order(
  p_lines          jsonb,
  p_mode           text,
  p_table_id       text default null,
  p_reservation_id uuid default null,
  p_note           text default null,
  p_status         text default 'sent'
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code  text;
  v_order public.orders;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới tạo được đơn ở đây';
  end if;

  for i in 1..8 loop
    v_code := public.make_code('OD');
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (code, table_id, reservation_id, mode, note, status)
  values (
    v_code,
    case when p_mode = 'dine-in' then nullif(p_table_id, '') end,
    case when p_mode = 'pre-order' then p_reservation_id end,
    p_mode, nullif(trim(p_note), ''), p_status
  )
  returning * into v_order;

  return public.set_order_lines(v_order.id, p_lines);
end;
$$;

grant execute on function public.staff_create_order(jsonb, text, text, uuid, text, text)
  to authenticated;

-- ── Ghi lại toàn bộ các dòng của một đơn và tính lại tổng ──
-- p_lines: [{"dish_id":"kimchi","variant_code":null,"qty":2,"note":"ít cay"}]
create or replace function public.set_order_lines(
  p_order_id uuid,
  p_lines    jsonb
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_line     jsonb;
  v_dish     public.dishes%rowtype;
  v_variant  public.dish_variants%rowtype;
  v_price    integer;
  v_qty      integer;
  v_subtotal integer := 0;
  v_order    public.orders;
begin
  if not public.is_staff() then
    raise exception 'Không có quyền';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn phải có ít nhất một món';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Đơn quá nhiều dòng';
  end if;

  delete from public.order_lines where order_id = p_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    -- Nhân viên vẫn gọi được món đang tạm hết, vì có thể bếp còn hàng.
    select * into v_dish from public.dishes where id = v_line ->> 'dish_id';
    if not found then
      raise exception 'Không tìm thấy món %', v_line ->> 'dish_id';
    end if;

    v_qty := greatest(coalesce((v_line ->> 'qty')::integer, 1), 1);
    if v_qty > 50 then
      raise exception 'Số lượng một món vượt mức cho phép';
    end if;

    if coalesce(v_line ->> 'variant_code', '') <> '' then
      select * into v_variant
      from public.dish_variants
      where dish_id = v_dish.id and code = v_line ->> 'variant_code';
      if not found then
        raise exception 'Phần đã chọn của món % không tồn tại', v_dish.name;
      end if;
      v_price := v_variant.price;
    else
      if v_dish.price is null then
        raise exception 'Món % phải chọn phần', v_dish.name;
      end if;
      v_price := v_dish.price;
      v_variant := null;
    end if;

    insert into public.order_lines (order_id, dish_id, name, variant_label, unit_price, qty, note)
    values (
      p_order_id, v_dish.id, v_dish.name, v_variant.label, v_price, v_qty,
      nullif(trim(v_line ->> 'note'), '')
    );

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  update public.orders set subtotal = v_subtotal where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.set_order_lines(uuid, jsonb) to authenticated;
-- ============================================================
-- Nhận thanh toán tự động qua SePay
--
-- Cách hoạt động: SePay theo dõi tài khoản ngân hàng của nhà hàng và gọi
-- webhook mỗi khi có tiền vào. App không giữ tiền, không xử lý thẻ — chỉ đối
-- chiếu nội dung chuyển khoản với mã đặt bàn rồi đánh dấu đã nhận cọc.
--
-- Hai điều bắt buộc phải đúng:
--   · Chống ghi trùng — SePay gửi lại webhook khi chưa nhận được phản hồi tốt.
--     Khoá duy nhất trên `sepay_id` lo việc này.
--   · Không đánh rơi tiền — chuyển khoản sai nội dung vẫn được ghi lại ở trạng
--     thái chờ đối soát để nhân viên gán tay, thay vì bị bỏ qua.
-- ============================================================

-- ── Cấu hình tài khoản nhận tiền ──
alter table public.restaurant_settings
  add column if not exists bank_account_number text,
  add column if not exists bank_code           text,   -- 'Vietcombank', 'ACB', …
  add column if not exists bank_account_name   text,
  add column if not exists payment_enabled     boolean not null default false,
  -- Tiền tố của mã đặt bàn, dùng để dò trong nội dung chuyển khoản.
  add column if not exists payment_prefix      text not null default 'MY';

comment on column public.restaurant_settings.bank_code is
  'Mã ngắn của ngân hàng theo danh sách qr.sepay.vn/banks.json, ví dụ Vietcombank.';
comment on column public.restaurant_settings.payment_enabled is
  'Tắt thì mini app không hiện mã QR, khách chuyển khoản theo hướng dẫn của nhân viên.';

-- ── Giao dịch nhận được từ SePay ──
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  -- Mã giao dịch của SePay. Khoá duy nhất ở đây chính là cơ chế chống ghi trùng.
  sepay_id         bigint not null unique,
  gateway          text,
  account_number   text,
  sub_account      text,
  reference_code   text,
  transaction_date timestamptz,
  amount           integer not null check (amount >= 0),
  transfer_type    text not null check (transfer_type in ('in', 'out')),
  -- Mã do SePay tự bóc tách (phụ thuộc cấu hình trên dashboard, có thể rỗng).
  sepay_code       text,
  content          text,
  description      text,
  -- Mã đặt bàn app tự dò được từ nội dung chuyển khoản.
  matched_code     text,
  reservation_id   uuid references public.reservations(id) on delete set null,
  status           text not null default 'unmatched'
                   check (status in ('matched', 'unmatched', 'ignored')),
  note             text,
  created_at       timestamptz not null default now()
);

create index if not exists payments_status_idx      on public.payments (status, created_at desc);
create index if not exists payments_reservation_idx on public.payments (reservation_id);
create index if not exists payments_created_idx     on public.payments (created_at desc);

alter table public.payments enable row level security;

-- Khách không đọc được lịch sử chuyển khoản của người khác.
-- Webhook ghi bằng service_role nên không cần policy riêng.
drop policy if exists "staff manage payments" on public.payments;
create policy "staff manage payments" on public.payments
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- Cập nhật tình trạng cọc của một lượt đặt bàn theo tổng tiền đã nhận
-- ============================================================
create or replace function public.refresh_reservation_payment(p_reservation_id uuid)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_res  public.reservations%rowtype;
  v_paid integer;
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where reservation_id = p_reservation_id
    and status = 'matched'
    and transfer_type = 'in';

  update public.reservations
     set deposit_paid = (v_res.deposit_amount > 0 and v_paid >= v_res.deposit_amount),
         deposit_method = case
           when v_paid > 0 then 'sepay'
           else deposit_method
         end,
         -- Đủ tiền thì bàn tự chuyển sang đã xác nhận. Không đụng tới bàn đã
         -- huỷ hay đã dùng bữa, vì nhân viên đã chốt trạng thái đó rồi.
         status = case
           when v_res.deposit_amount > 0
            and v_paid >= v_res.deposit_amount
            and v_res.status in ('pending', 'awaiting-deposit')
           then 'confirmed'
           else v_res.status
         end
   where id = p_reservation_id
  returning * into v_res;

  return v_res;
end;
$$;

-- ============================================================
-- Dò mã đặt bàn trong nội dung chuyển khoản
--
-- Ngân hàng hay bỏ dấu gạch nối và ký tự lạ, nên so khớp trên chuỗi đã chuẩn
-- hoá: viết hoa, bỏ mọi thứ không phải chữ hoặc số.
-- ============================================================
create or replace function public.find_reservation_code(p_text text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_clean  text;
  v_match  text;
begin
  if coalesce(p_text, '') = '' then
    return null;
  end if;

  select coalesce(payment_prefix, 'MY') into v_prefix
  from public.restaurant_settings where id = 1;
  v_prefix := coalesce(v_prefix, 'MY');

  v_clean := upper(regexp_replace(p_text, '[^a-zA-Z0-9]', '', 'g'));

  -- Mã sinh từ bảng chữ cái đã bỏ các ký tự dễ nhầm (0/O, 1/I, B/8, Z/2).
  v_match := substring(
    v_clean from upper(v_prefix) || '([ACDEFGHJKLMNPQRSTUVWXY3456789]{5})'
  );

  if v_match is null then
    return null;
  end if;
  return upper(v_prefix) || '-' || v_match;
end;
$$;

-- ============================================================
-- Đối soát một giao dịch đã ghi
-- ============================================================
create or replace function public.process_payment(p_payment_id uuid)
returns public.payments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pay  public.payments%rowtype;
  v_code text;
  v_res  public.reservations%rowtype;
begin
  select * into v_pay from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Không tìm thấy giao dịch';
  end if;

  -- Chỉ đối soát tiền vào, và chỉ khi chưa gán cho lượt nào.
  if v_pay.transfer_type <> 'in' or v_pay.reservation_id is not null then
    return v_pay;
  end if;

  v_code := public.find_reservation_code(
    coalesce(nullif(v_pay.sepay_code, ''), '') || ' ' || coalesce(v_pay.content, '')
  );

  if v_code is null then
    return v_pay;                       -- để nhân viên gán tay
  end if;

  select * into v_res from public.reservations where code = v_code;
  if not found then
    update public.payments set matched_code = v_code where id = p_payment_id
    returning * into v_pay;
    return v_pay;
  end if;

  update public.payments
     set matched_code   = v_code,
         reservation_id = v_res.id,
         status         = 'matched'
   where id = p_payment_id
  returning * into v_pay;

  perform public.refresh_reservation_payment(v_res.id);
  return v_pay;
end;
$$;

-- ============================================================
-- Nhân viên gán tay một giao dịch vào lượt đặt bàn, hoặc bỏ gán
-- ============================================================
-- p_reservation_id có mặc định null: không truyền nghĩa là gỡ giao dịch
-- khỏi bàn đang gán. Nhờ vậy bộ sinh kiểu TypeScript cũng đánh dấu tham số
-- này là không bắt buộc.
create or replace function public.link_payment(
  p_payment_id     uuid,
  p_reservation_id uuid default null
)
returns public.payments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pay uuid;
  v_old uuid;
  v_row public.payments;
begin
  if not public.is_staff() then
    raise exception 'Không có quyền';
  end if;

  select reservation_id into v_old from public.payments where id = p_payment_id;

  update public.payments
     set reservation_id = p_reservation_id,
         status = case when p_reservation_id is null then 'unmatched' else 'matched' end
   where id = p_payment_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Không tìm thấy giao dịch';
  end if;

  -- Cập nhật cả lượt cũ lẫn lượt mới để không sót bàn nào bị tính thừa tiền.
  if v_old is not null then
    perform public.refresh_reservation_payment(v_old);
  end if;
  if p_reservation_id is not null then
    perform public.refresh_reservation_payment(p_reservation_id);
  end if;

  v_pay := v_row.id;
  return v_row;
end;
$$;

grant execute on function public.link_payment(uuid, uuid) to authenticated;
grant execute on function public.refresh_reservation_payment(uuid) to authenticated;
grant execute on function public.find_reservation_code(text) to authenticated;

-- ============================================================
-- Đánh dấu bỏ qua một giao dịch không liên quan
-- ============================================================
create or replace function public.ignore_payment(p_payment_id uuid, p_note text default null)
returns public.payments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_old uuid;
  v_row public.payments;
begin
  if not public.is_staff() then
    raise exception 'Không có quyền';
  end if;

  select reservation_id into v_old from public.payments where id = p_payment_id;

  update public.payments
     set status = 'ignored', reservation_id = null, note = nullif(trim(p_note), '')
   where id = p_payment_id
  returning * into v_row;

  if v_old is not null then
    perform public.refresh_reservation_payment(v_old);
  end if;

  return v_row;
end;
$$;

grant execute on function public.ignore_payment(uuid, text) to authenticated;
-- ============================================================
-- Suất omakase phục vụ cả hai ca
--
-- Ban đầu mỗi suất chỉ gắn được một ca ('lunch' hoặc 'dinner').
-- Thực tế có suất bếp dọn cả trưa lẫn tối, nên thêm giá trị 'both'.
--
-- 'both' chỉ nói suất đó *có bán* ở cả hai ca; khung giờ còn trống
-- vẫn lấy từ opening_hours theo từng ca như cũ.
-- ============================================================

alter table public.omakase_sets
  drop constraint if exists omakase_sets_service_check;

alter table public.omakase_sets
  add constraint omakase_sets_service_check
  check (service in ('lunch', 'dinner', 'both'));

comment on column public.omakase_sets.service is
  'Ca phục vụ: lunch | dinner | both. opening_hours chỉ dùng lunch/dinner.';
-- ============================================================
-- Thời gian đặt trước tối thiểu cho suất omakase
--
-- Bếp cần biết trước để đặt cá và chuẩn bị nguyên liệu, nên khách
-- không thể đặt omakase sát giờ. Số giờ do nhà hàng tự đặt trong CMS;
-- để 0 nghĩa là không bắt buộc đặt trước.
--
-- Mini app cũng lọc sẵn ngày/giờ theo số giờ này, nhưng chốt chặn
-- thật nằm ở create_reservation — client không tự nới được.
-- ============================================================

alter table public.restaurant_settings
  add column if not exists omakase_lead_hours integer not null default 24
    check (omakase_lead_hours >= 0 and omakase_lead_hours <= 720);

comment on column public.restaurant_settings.omakase_lead_hours is
  'Khách đặt omakase phải đặt trước ít nhất bao nhiêu giờ. 0 = không bắt buộc.';

-- ------------------------------------------------------------
-- Giờ hiện tại theo múi giờ nhà hàng.
--
-- Cụm Postgres chạy UTC, còn reserved_date/reserved_time lưu giờ Việt
-- Nam. So sánh thẳng với now() sẽ lệch 7 tiếng.
-- ------------------------------------------------------------
create or replace function public.restaurant_now()
returns timestamp
language sql
stable
as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::timestamp;
$$;

comment on function public.restaurant_now() is
  'Thời điểm hiện tại theo giờ Việt Nam, khớp với reserved_date + reserved_time.';

-- ------------------------------------------------------------
-- create_reservation: thêm chặn đặt sát giờ.
--
-- Giữ nguyên chữ ký của 20260920000003 để không phải cấp quyền lại.
-- ------------------------------------------------------------
create or replace function public.create_reservation(
  p_purpose        text,
  p_date           date,
  p_time           time,
  p_guests         integer,
  p_seating        text,
  p_name           text,
  p_phone          text,
  p_omakase_set_id text default null,
  p_dietary        text default null,
  p_note           text default null,
  p_zalo_id        text default null
)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_set          public.omakase_sets%rowtype;
  v_deposit_rate numeric;
  v_deposit      integer := 0;
  v_customer_id  uuid;
  v_code         text;
  v_row          public.reservations;
  v_now          timestamp := public.restaurant_now();
  v_lead_hours   integer;
  v_earliest     timestamp;
begin
  if p_guests is null or p_guests < 1 or p_guests > 40 then
    raise exception 'Số khách không hợp lệ';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Thiếu tên hoặc số điện thoại';
  end if;
  -- Xét cả giờ, không chỉ ngày: 19h hôm nay không còn đặt được lúc 20h.
  if (p_date + p_time) < v_now then
    raise exception 'Không đặt bàn cho thời điểm đã qua';
  end if;

  select deposit_rate into v_deposit_rate from public.restaurant_settings where id = 1;
  v_deposit_rate := coalesce(v_deposit_rate, 0.5);

  if p_purpose = 'omakase' then
    select * into v_set
    from public.omakase_sets
    where id = p_omakase_set_id and is_active;

    if not found then
      raise exception 'Suất omakase không tồn tại hoặc đã ngừng phục vụ';
    end if;

    select omakase_lead_hours into v_lead_hours
    from public.restaurant_settings where id = 1;
    v_lead_hours := coalesce(v_lead_hours, 0);

    if v_lead_hours > 0 then
      v_earliest := v_now + make_interval(hours => v_lead_hours);
      if (p_date + p_time) < v_earliest then
        raise exception 'Suất omakase cần đặt trước ít nhất % giờ. Sớm nhất có thể đặt: % ngày %.',
          v_lead_hours,
          to_char(v_earliest, 'HH24:MI'),
          to_char(v_earliest, 'DD/MM');
      end if;
    end if;

    -- Giá lấy từ CSDL, không lấy từ client.
    v_deposit := round(v_set.price * p_guests * v_deposit_rate);
  end if;

  if p_zalo_id is not null then
    insert into public.customers (zalo_id, name, phone)
    values (p_zalo_id, p_name, p_phone)
    on conflict (zalo_id) do update
      set name  = coalesce(excluded.name, public.customers.name),
          phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;
  end if;

  for i in 1..8 loop
    v_code := public.make_code('MY');
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (
    code, customer_id, zalo_id, purpose, omakase_set_id,
    reserved_date, reserved_time, guests, seating,
    guest_name, guest_phone, dietary, note,
    status, deposit_amount
  ) values (
    v_code, v_customer_id, p_zalo_id, p_purpose,
    case when p_purpose = 'omakase' then p_omakase_set_id end,
    p_date, p_time, p_guests, p_seating,
    trim(p_name), trim(p_phone), nullif(trim(p_dietary), ''), nullif(trim(p_note), ''),
    case when v_deposit > 0 then 'awaiting-deposit' else 'pending' end,
    v_deposit
  )
  returning * into v_row;

  return v_row;
end;
$$;
-- ============================================================
-- ĐA NGỮ — Việt (gốc) · Anh · Nhật
--
-- Tiếng Việt vẫn nằm nguyên ở các cột cũ (`name`, `description`, …): đó là
-- bản gốc nhà hàng nhập tay, và là bản duy nhất chắc chắn đúng. Bản dịch
-- Anh/Nhật nằm trong cột `i18n`:
--
--   {"en": {"name": "Grilled crab miso", "description": "…"},
--    "ja": {"name": "カニ味噌焼き",        "description": "…"}}
--
-- Thiếu ngôn ngữ nào, thiếu trường nào thì mini app lùi về tiếng Việt. Không
-- bao giờ hiện ô trống, vì thà đọc tiếng Việt còn hơn không đọc được gì.
--
-- Hai cột băm cho biết bản dịch còn khớp bản gốc hay không:
--   i18n_src_hash — trigger tự tính lại mỗi lần sửa, từ các trường tiếng Việt
--   i18n_hash     — giá trị i18n_src_hash tại lúc sinh ra bản dịch đang lưu
--
-- Hai cột khác nhau ⇒ nhà hàng đã sửa bản gốc sau khi dịch ⇒ cần dịch lại.
-- Băm luôn do Postgres tính, không bao giờ do Deno tính, để hai bên không
-- thể lệch nhau vì khác cách nối chuỗi.
-- ============================================================

-- Ký tự phân tách (unit separator) — không xuất hiện trong văn bản thật, nên
-- ghép "a|b" và "a" + "|b" không thể ra cùng một băm.
-- Dùng E'\x1f' trực tiếp trong từng hàm bên dưới.

-- ── categories ──────────────────────────────────────────────
alter table public.categories
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_categories(r public.categories)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.name, coalesce(r.jp, ''), coalesce(r.romaji, '')));
$$;

create or replace function public.categories_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_categories(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_i18n on public.categories;
create trigger categories_i18n
  before insert or update on public.categories
  for each row execute function public.categories_i18n_touch();

-- ── dishes ──────────────────────────────────────────────────
alter table public.dishes
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_dishes(r public.dishes)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.name,
    coalesce(r.romaji, ''),
    coalesce(r.jp, ''),
    coalesce(r.description, ''),
    coalesce(r.unit, ''),
    array_to_string(r.includes, E'\x1f'),
    array_to_string(r.gifts, E'\x1f')
  ));
$$;

create or replace function public.dishes_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_dishes(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists dishes_i18n on public.dishes;
create trigger dishes_i18n
  before insert or update on public.dishes
  for each row execute function public.dishes_i18n_touch();

-- ── dish_variants ───────────────────────────────────────────
alter table public.dish_variants
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_dish_variants(r public.dish_variants)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.label, coalesce(r.note, '')));
$$;

create or replace function public.dish_variants_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_dish_variants(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists dish_variants_i18n on public.dish_variants;
create trigger dish_variants_i18n
  before insert or update on public.dish_variants
  for each row execute function public.dish_variants_i18n_touch();

-- ── omakase_sets ────────────────────────────────────────────
alter table public.omakase_sets
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_omakase_sets(r public.omakase_sets)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.name,
    coalesce(r.jp, ''),
    coalesce(r.subtitle, ''),
    coalesce(r.description, '')
  ));
$$;

create or replace function public.omakase_sets_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_omakase_sets(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists omakase_sets_i18n on public.omakase_sets;
create trigger omakase_sets_i18n
  before insert or update on public.omakase_sets
  for each row execute function public.omakase_sets_i18n_touch();

-- ── omakase_courses ─────────────────────────────────────────
alter table public.omakase_courses
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_omakase_courses(r public.omakase_courses)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.section, array_to_string(r.items, E'\x1f')));
$$;

create or replace function public.omakase_courses_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_omakase_courses(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists omakase_courses_i18n on public.omakase_courses;
create trigger omakase_courses_i18n
  before insert or update on public.omakase_courses
  for each row execute function public.omakase_courses_i18n_touch();

-- ── restaurant_settings ─────────────────────────────────────
-- Ba câu chữ khách đọc: tagline, ghi chú giá, chính sách huỷ bàn.
-- Địa chỉ giữ nguyên tiếng Việt — khách nước ngoài đưa cho tài xế đọc.
alter table public.restaurant_settings
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_restaurant_settings(r public.restaurant_settings)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    coalesce(r.tagline, ''),
    coalesce(r.menu_price_note, ''),
    coalesce(r.cancellation_policy, '')
  ));
$$;

create or replace function public.restaurant_settings_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_restaurant_settings(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_settings_i18n on public.restaurant_settings;
create trigger restaurant_settings_i18n
  before insert or update on public.restaurant_settings
  for each row execute function public.restaurant_settings_i18n_touch();

-- ── Điền băm cho dữ liệu đã có ──────────────────────────────
-- Trigger chỉ chạy từ lần sửa sau, nên tính tay một lượt cho các dòng cũ.
update public.categories          r set i18n_src_hash = public.i18n_src_categories(r)          where r.i18n_src_hash is null;
update public.dishes              r set i18n_src_hash = public.i18n_src_dishes(r)              where r.i18n_src_hash is null;
update public.dish_variants       r set i18n_src_hash = public.i18n_src_dish_variants(r)       where r.i18n_src_hash is null;
update public.omakase_sets        r set i18n_src_hash = public.i18n_src_omakase_sets(r)        where r.i18n_src_hash is null;
update public.omakase_courses     r set i18n_src_hash = public.i18n_src_omakase_courses(r)     where r.i18n_src_hash is null;
update public.restaurant_settings r set i18n_src_hash = public.i18n_src_restaurant_settings(r) where r.i18n_src_hash is null;

comment on column public.dishes.i18n is
  'Bản dịch Anh/Nhật. Tiếng Việt ở các cột thường — đó mới là bản gốc.';
comment on column public.dishes.i18n_hash is
  'i18n_src_hash tại lúc dịch. Khác i18n_src_hash nghĩa là bản gốc đã đổi.';

-- ── Bảng theo dõi việc dịch, cho CMS ────────────────────────
create or replace view public.translation_status
with (security_invoker = true) as
  select 'categories'      as entity, c.id::text as id, c.name     as label,
         c.i18n_hash is distinct from c.i18n_src_hash as stale,
         c.i18n ? 'en' as has_en, c.i18n ? 'ja' as has_ja
    from public.categories c
  union all
  select 'dishes', d.id::text, d.name,
         d.i18n_hash is distinct from d.i18n_src_hash, d.i18n ? 'en', d.i18n ? 'ja'
    from public.dishes d
  union all
  select 'dish_variants', v.id::text, v.label,
         v.i18n_hash is distinct from v.i18n_src_hash, v.i18n ? 'en', v.i18n ? 'ja'
    from public.dish_variants v
  union all
  select 'omakase_sets', s.id::text, s.name,
         s.i18n_hash is distinct from s.i18n_src_hash, s.i18n ? 'en', s.i18n ? 'ja'
    from public.omakase_sets s
  union all
  select 'omakase_courses', o.id::text, o.section,
         o.i18n_hash is distinct from o.i18n_src_hash, o.i18n ? 'en', o.i18n ? 'ja'
    from public.omakase_courses o
  union all
  select 'restaurant_settings', r.id::text, r.name,
         r.i18n_hash is distinct from r.i18n_src_hash, r.i18n ? 'en', r.i18n ? 'ja'
    from public.restaurant_settings r;

comment on view public.translation_status is
  'Mỗi dòng nội dung một hàng: đã có bản Anh/Nhật chưa, bản gốc đã đổi chưa.';

-- Chỉ CMS cần bảng này; khách không có việc gì với nó.
grant select on public.translation_status to authenticated, service_role;
-- ============================================================
-- Sơ đồ chỗ ngồi quầy omakase
--
-- Khách chọn đúng ghế mình muốn thay vì chỉ chọn "quầy". Toạ độ ghế lưu
-- ngay trong CSDL để mô hình 3D trong mini app dựng theo dữ liệu, nhà hàng
-- đổi bố cục thì không phải sửa mã.
--
-- Trục toạ độ, đơn vị mét, gốc ở giữa phòng:
--   x: trái (−) sang phải (+)
--   z: phía bếp (−) ra phía cửa (+)
-- ============================================================

create table if not exists public.seats (
  id         text primary key,                 -- 'Q1' … 'Q12'
  label      text not null,
  zone       text not null default 'counter'
             check (zone in ('counter', 'table', 'private')),
  -- Vị trí và hướng ngồi để dựng mô hình 3D.
  pos_x      numeric(5,2) not null,
  pos_z      numeric(5,2) not null,
  -- Góc quay của ghế, độ. 0 = nhìn về phía bếp.
  rotation   numeric(5,1) not null default 0,
  -- Ghế nhìn thẳng vào tay bếp trưởng — nhà hàng hay để dành cho khách quen.
  is_premium boolean not null default false,
  is_active  boolean not null default true,
  note       text,
  sort_order integer not null default 0
);

comment on table public.seats is
  'Từng ghế ở quầy omakase. Toạ độ dùng cho mô hình 3D trong mini app.';

alter table public.seats enable row level security;

create policy "seats readable by everyone" on public.seats
  for select using (true);
create policy "managers write seats" on public.seats
  for all using (public.is_manager()) with check (public.is_manager());

-- ── Ghế của từng lượt đặt bàn ──
create table if not exists public.reservation_seats (
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  seat_id        text not null references public.seats(id) on update cascade,
  primary key (reservation_id, seat_id)
);

create index if not exists reservation_seats_seat_idx on public.reservation_seats (seat_id);

alter table public.reservation_seats enable row level security;

create policy "staff manage reservation seats" on public.reservation_seats
  for all using (public.is_staff()) with check (public.is_staff());

-- Một bữa omakase kéo dài bao lâu, dùng để tính hai lượt có đè giờ nhau không.
alter table public.restaurant_settings
  add column if not exists seating_duration_minutes integer not null default 120
    check (seating_duration_minutes between 30 and 480);

-- ============================================================
-- Ghế nào còn trống vào một khung giờ
--
-- Hai lượt đè giờ nhau thì không dùng chung ghế được. Khoảng chiếm chỗ tính
-- từ giờ đặt, kéo dài bằng seating_duration_minutes.
-- ============================================================
create or replace function public.get_seat_availability(
  p_date date,
  p_time time,
  -- Bỏ qua chính lượt đang sửa, để nhân viên đổi ghế mà không tự chặn mình.
  p_exclude_reservation uuid default null
)
returns table (
  seat_id    text,
  label      text,
  pos_x      numeric,
  pos_z      numeric,
  rotation   numeric,
  is_premium boolean,
  taken      boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_minutes integer;
  v_start   timestamp;
  v_end     timestamp;
begin
  select coalesce(seating_duration_minutes, 120) into v_minutes
  from public.restaurant_settings where id = 1;
  v_minutes := coalesce(v_minutes, 120);

  v_start := p_date + p_time;
  v_end   := v_start + make_interval(mins => v_minutes);

  return query
  select s.id,
         s.label,
         s.pos_x,
         s.pos_z,
         s.rotation,
         s.is_premium,
         exists (
           select 1
           from public.reservation_seats rs
           join public.reservations r on r.id = rs.reservation_id
           where rs.seat_id = s.id
             and r.status in ('pending', 'awaiting-deposit', 'confirmed')
             and (p_exclude_reservation is null or r.id <> p_exclude_reservation)
             and r.reserved_date = p_date
             -- Hai khoảng thời gian giao nhau
             and (r.reserved_date + r.reserved_time) < v_end
             and (r.reserved_date + r.reserved_time
                  + make_interval(mins => v_minutes)) > v_start
         ) as taken
  from public.seats s
  where s.is_active and s.zone = 'counter'
  order by s.sort_order, s.id;
end;
$$;

grant execute on function public.get_seat_availability(date, time, uuid)
  to anon, authenticated;

-- ============================================================
-- Giữ ghế cho một lượt đặt bàn
--
-- Kiểm tra lại ở server: số ghế phải khớp số khách, và không ghế nào đã bị
-- lượt khác giữ. Client có sửa gì cũng không lách được.
-- ============================================================
create or replace function public.assign_seats(
  p_reservation_id uuid,
  p_seat_ids       text[]
)
returns setof public.reservation_seats
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_res     public.reservations%rowtype;
  v_seat    text;
  v_taken   integer;
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found then
    raise exception 'Không tìm thấy lượt đặt bàn';
  end if;

  if p_seat_ids is null or array_length(p_seat_ids, 1) is null then
    delete from public.reservation_seats where reservation_id = p_reservation_id;
    return;
  end if;

  if array_length(p_seat_ids, 1) <> v_res.guests then
    raise exception 'Chọn đúng % ghế cho % khách', v_res.guests, v_res.guests;
  end if;

  -- Khoá các dòng liên quan để hai khách bấm cùng lúc không cướp ghế của nhau.
  perform 1 from public.seats where id = any(p_seat_ids) for update;

  select count(*) into v_taken
  from public.get_seat_availability(v_res.reserved_date, v_res.reserved_time, p_reservation_id) a
  where a.seat_id = any(p_seat_ids) and a.taken;

  if v_taken > 0 then
    raise exception 'Có ghế vừa được khách khác giữ. Chọn lại giúp mình.';
  end if;

  delete from public.reservation_seats where reservation_id = p_reservation_id;

  foreach v_seat in array p_seat_ids loop
    insert into public.reservation_seats (reservation_id, seat_id)
    values (p_reservation_id, v_seat)
    on conflict do nothing;
  end loop;

  return query
    select * from public.reservation_seats where reservation_id = p_reservation_id;
end;
$$;

grant execute on function public.assign_seats(uuid, text[]) to anon, authenticated;

-- ============================================================
-- Khách đặt bàn kèm chọn ghế, gói trong một giao dịch
--
-- Tách riêng thay vì thêm tham số vào create_reservation để giữ nguyên chữ
-- ký hàm cũ — mini app bản cũ vẫn gọi được.
-- ============================================================
create or replace function public.create_reservation_with_seats(
  p_purpose        text,
  p_date           date,
  p_time           time,
  p_guests         integer,
  p_seating        text,
  p_name           text,
  p_phone          text,
  p_seat_ids       text[],
  p_omakase_set_id text default null,
  p_dietary        text default null,
  p_note           text default null,
  p_zalo_id        text default null
)
returns public.reservations
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
begin
  v_res := public.create_reservation(
    p_purpose, p_date, p_time, p_guests, p_seating, p_name, p_phone,
    p_omakase_set_id, p_dietary, p_note, p_zalo_id
  );

  if p_seat_ids is not null and array_length(p_seat_ids, 1) is not null then
    -- Ghế bị cướp mất thì cả lượt đặt bàn cũng không được tạo: thà báo lỗi
    -- để khách chọn lại, còn hơn giữ một lượt đặt bàn không có chỗ ngồi.
    perform public.assign_seats(v_res.id, p_seat_ids);
  end if;

  return v_res;
end;
$$;

grant execute on function public.create_reservation_with_seats(
  text, date, time, integer, text, text, text, text[], text, text, text, text
) to anon, authenticated;
-- ============================================================
-- Khách xem ghế của chính mình
--
-- Bảng reservation_seats chỉ nhân viên đọc được. Khách cầm mã đặt bàn thì
-- xem được ghế của lượt đó — cùng nguyên tắc với get_reservation_by_code:
-- biết mã mới xem được, như số vé.
-- ============================================================

create or replace function public.get_reservation_seats_by_code(p_code text)
returns table (seat_id text, label text, is_premium boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.label, s.is_premium
  from public.reservation_seats rs
  join public.reservations r on r.id = rs.reservation_id
  join public.seats s        on s.id = rs.seat_id
  where r.code = upper(trim(p_code))
  order by s.sort_order, s.id;
$$;

grant execute on function public.get_reservation_seats_by_code(text)
  to anon, authenticated;
-- ============================================================
-- Miyako — dữ liệu khởi tạo
-- TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG. Đừng sửa tay.
-- Nguồn: src/data/*.ts  ·  Sinh lại: node supabase/seed/generate-seed.mjs
-- ============================================================

begin;

-- Cấu hình nhà hàng. Cột null = dữ kiện chưa được nhà hàng xác nhận.
insert into public.restaurant_settings
  (id, name, tagline, address, hotline, oa_id, city, counter_seats,
   deposit_rate, vat_rate, service_charge_rate, price_includes_vat, menu_price_note,
   booking_lead_days, omakase_lead_hours)
values
  (1, 'MIYAKO', 'The Art of Sushi & Wagyu', '28 Đào Tấn, Hà Nội',
   '0965630828', null, 'Hà Nội', 12,
   0.5, null, null, false, 'Đơn vị tính: 1.000đ · Giá chưa bao gồm VAT',
   30, 24)
on conflict (id) do nothing;

-- Chỉ tạo sẵn quầy itamae vì đây là con số đã xác nhận (12 ghế).
-- Bàn thường và phòng riêng do nhà hàng tự thêm trong CMS.
insert into public.restaurant_tables (id, label, zone, seats, sort_order) values
  ('QUAY', 'Quầy itamae', 'counter', 12, 0)
on conflict (id) do nothing;

-- TẠM TÍNH — nhà hàng phải sửa lại trong CMS trước khi phát hành.
-- Mini app có ghi chú rõ cho khách rằng khung giờ còn chờ xác nhận.
insert into public.opening_hours (weekday, service, open_time, close_time, slot_minutes) values
  (0, 'lunch',  '11:30', '13:00', 30),
  (0, 'dinner', '17:30', '20:00', 30),
  (1, 'lunch',  '11:30', '13:00', 30),
  (1, 'dinner', '17:30', '20:00', 30),
  (2, 'lunch',  '11:30', '13:00', 30),
  (2, 'dinner', '17:30', '20:00', 30),
  (3, 'lunch',  '11:30', '13:00', 30),
  (3, 'dinner', '17:30', '20:00', 30),
  (4, 'lunch',  '11:30', '13:00', 30),
  (4, 'dinner', '17:30', '20:00', 30),
  (5, 'lunch',  '11:30', '13:00', 30),
  (5, 'dinner', '17:30', '20:00', 30),
  (6, 'lunch',  '11:30', '13:00', 30),
  (6, 'dinner', '17:30', '20:00', 30)
on conflict (weekday, service) do nothing;

-- Nhóm món
insert into public.categories (id, name, jp, romaji, sort_order) values
  ('khai-vi', 'Khai vị', '付き出し', 'Tsukidashi', 0),
  ('salad', 'Salad', 'サラダ', 'Sarada', 1),
  ('sashimi', 'Sashimi', '刺身', 'Sashimi', 2),
  ('sushi', 'Sushi', '寿司', 'Sushi', 3),
  ('maki', 'Maki', '巻き寿司', 'Makizushi', 4),
  ('wagyu', 'Wagyu & Bò nướng', '和牛', 'Wagyu', 5),
  ('lau', 'Lẩu', '鍋', 'Nabe', 6),
  ('nuong', 'Món nướng', '焼き物', 'Yakimono', 7),
  ('chien', 'Món chiên', '揚げ物', 'Agemono', 8),
  ('mi', 'Mì & Ramen', '麺', 'Men', 9),
  ('com', 'Cơm', 'ご飯', 'Gohan', 10),
  ('trang-mieng', 'Tráng miệng', 'デザート', 'Dezāto', 11)
on conflict (id) do nothing;

-- 149 món, số hoá từ bộ menu in 39 trang (M1–M39)
insert into public.dishes
  (id, category_id, name, romaji, jp, price, compare_at_price, unit, description,
   includes, gifts, badges, image_path, source_page, sort_order)
values
  ('kani-miso-yaki', 'khai-vi', 'Mai cua nướng', 'Kani Miso Yaki', 'カニ味噌焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M1', 0),
  ('kimchi', 'khai-vi', 'Kimchi', 'Kimuchi', 'キムチ', 59000, null, null, null, '{}', '{}', '{}', null, 'M1', 1),
  ('ginnan-shioyaki', 'khai-vi', 'Bạch quả nướng muối', 'Ginnan Shioyaki', '銀杏塩焼き', 79000, null, null, null, '{}', '{}', '{}', null, 'M1', 2),
  ('natto', 'khai-vi', 'Đậu tương lên men', 'Natto', '納豆', 59000, null, null, null, '{}', '{}', '{}', null, 'M1', 3),
  ('ika-natto', 'khai-vi', 'Đậu tương lên men trộn mực', 'Ika Nattō', 'いか納豆', 99000, null, null, null, '{}', '{}', '{}', null, 'M1', 4),
  ('agedashi-tofu', 'khai-vi', 'Đậu phụ chiên sốt dashi', 'Agedashi Tofu', '揚げ出し豆腐', 79000, null, null, null, '{}', '{}', '{}', null, 'M2', 5),
  ('edamame', 'khai-vi', 'Đậu nành luộc', 'Edamame', '枝豆', 59000, null, null, null, '{}', '{}', '{}', null, 'M2', 6),
  ('hiyayakko', 'khai-vi', 'Đậu phụ lạnh Nhật', 'Hiyayakko', '冷奴', 59000, null, null, null, '{}', '{}', '{}', null, 'M2', 7),
  ('eihire-aburi', 'khai-vi', 'Vây cá đuối nướng', 'Eihire Aburi', 'エイヒレ炙り', 99000, null, null, null, '{}', '{}', '{}', null, 'M2', 8),
  ('takowasabi', 'khai-vi', 'Bạch tuộc ngâm wasabi', 'Takowasabi', 'たこわさび', 99000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M2', 9),
  ('miso-shiru', 'khai-vi', 'Xúp miso', 'Miso-shiru', '味噌汁', 39000, null, null, null, '{}', '{}', '{}', null, 'M2', 10),
  ('samon-abokado-sarada', 'salad', 'Salad cá hồi bơ', 'Samon Abokado Sarada', 'サーモンアボカドサラダ', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M3', 0),
  ('wagyu-sarada', 'salad', 'Salad thịt bò wagyu', 'Wagyu Sarada', '和牛サラダ', 199000, null, null, null, '{}', '{}', '{}', null, 'M3', 1),
  ('kaiso-sarada', 'salad', 'Salad rong biển', 'Kaisō Sarada', '海藻サラダ', 99000, null, null, null, '{}', '{}', '{}', null, 'M3', 2),
  ('kaisen-sarada', 'salad', 'Salad hải sản', 'Kaisen Sarada', '海鮮サラダ', 199000, null, null, null, '{}', '{}', '{}', null, 'M4', 3),
  ('mikkusu-sarada', 'salad', 'Salad rau xanh tổng hợp', 'Mikkusu Sarada', 'ミックスサラダ', 79000, null, null, null, '{}', '{}', '{}', null, 'M4', 4),
  ('tofu-goma-sarada', 'salad', 'Salad đậu phụ Nhật sốt mè rang', 'Tofu Goma Sarada', '豆腐胡麻サラダ', 139000, null, null, null, '{}', '{}', '{}', null, 'M4', 5),
  ('poteto-sarada', 'salad', 'Salad khoai tây', 'Poteto Sarada', 'ポテトサラダ', 79000, null, null, null, '{}', '{}', '{}', null, 'M4', 6),
  ('salmon-zuke', 'sashimi', 'Cá hồi ngâm tương', 'Salmon Zuke', 'サーモン漬け', 189000, null, null, null, '{}', '{}', '{}', null, 'M5', 0),
  ('toro-salmon', 'sashimi', 'Sashimi bụng cá hồi', 'Toro Salmon', 'サーモントロ', 159000, null, null, null, '{}', '{}', '{}', null, 'M5', 1),
  ('salmon-sashimi', 'sashimi', 'Sashimi cá hồi', 'Salmon Sashimi', 'サーモン刺身', 159000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M5', 2),
  ('nishin-sashimi', 'sashimi', 'Sashimi cá trích ép trứng', 'Nishin Sashimi', 'にしん刺身', 179000, null, null, null, '{}', '{}', '{}', null, 'M5', 3),
  ('hokkigai-sashimi', 'sashimi', 'Sashimi sò đỏ', 'Hokkigai Sashimi', 'ホッキ貝刺身', 159000, null, null, null, '{}', '{}', '{}', null, 'M6', 4),
  ('hokkaido-hotate', 'sashimi', 'Sashimi sò điệp Hokkaido', 'Hokkaido Hotate', '北海道ホタテ', 299000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M6', 5),
  ('tako-sashimi', 'sashimi', 'Sashimi bạch tuộc', 'Tako Sashimi', 'タコ刺身', 199000, null, null, null, '{}', '{}', '{}', null, 'M6', 6),
  ('uni-sashimi', 'sashimi', 'Nhum biển Nhật', 'Uni Sashimi', 'ウニ', 599000, null, null, 'Uni được mệnh danh là “vàng đen” của đại dương và luôn nằm trong top những món sashimi xa xỉ, kén người ăn nhưng một khi đã thử là gây nghiện.', '{}', '{}', array['must-try']::text[], null, 'M7', 7),
  ('awabi-sashimi', 'sashimi', 'Sashimi bào ngư', 'Awabi Sashimi', 'アワビの刺身', 249000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M7', 8),
  ('nama-kaki', 'sashimi', 'Sashimi hàu Nhật', 'Nama Kaki', '牡蠣の刺身', 170000, null, null, null, '{}', '{}', '{}', null, 'M7', 9),
  ('amaebi-sashimi', 'sashimi', 'Sashimi tôm ngọt', 'Amaebi Sashimi', '甘エビ刺身', 399000, null, null, null, '{}', '{}', '{}', null, 'M8', 10),
  ('kanpachi-sashimi', 'sashimi', 'Sashimi cá cam', 'Kanpachi Sashimi', 'カンパチ刺身', 280000, null, null, null, '{}', '{}', '{}', null, 'M8', 11),
  ('miyabi-tai-sashimi', 'sashimi', 'Sashimi cá tráp', 'Miyabi Tai Sashimi', 'みやび鯛', 269000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M8', 12),
  ('sashimi-moriawase-ume', 'sashimi', 'Set sashimi Ume', 'Sashimi Moriawase “Ume”', '刺身盛り合わせ「梅」', 359000, null, null, null, '{}', '{}', '{}', null, 'M9', 13),
  ('sashimi-moriawase-take', 'sashimi', 'Set sashimi Take', 'Sashimi Moriawase “Take”', '刺身盛り合わせ「竹」', 499000, null, null, null, '{}', '{}', '{}', null, 'M9', 14),
  ('sashimi-moriawase-matsu', 'sashimi', 'Set sashimi Matsu', 'Sashimi Moriawase “Matsu”', '刺身盛り合わせ「松」', 699000, null, null, 'Gói trọn những lát cắt tinh hoa và xa xỉ bậc nhất từ đại dương sâu thẳm, được đích thân bếp trưởng tuyển chọn kỹ lưỡng trong ngày.', '{}', '{}', array['best-seller', 'signature']::text[], 'hero-omakase', 'M10', 15),
  ('hon-maguro-moriawase', 'sashimi', 'Sashimi cá ngừ vây xanh', 'Hon Maguro Moriawase', '本マグロ盛り合わせ', 599000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M11', 16),
  ('otoro-sashimi', 'sashimi', 'Sashimi otoro cá ngừ vây xanh', 'Otoro', '大トロ', 499000, null, null, null, '{}', '{}', '{}', null, 'M11', 17),
  ('chutoro-sashimi', 'sashimi', 'Sashimi bụng cá ngừ vây xanh', 'Chutoro', '中トロ', 399000, null, null, null, '{}', '{}', '{}', null, 'M11', 18),
  ('akami-sashimi', 'sashimi', 'Sashimi thăn lưng cá ngừ vây xanh', 'Akami', '赤身', 299000, null, null, null, '{}', '{}', '{}', null, 'M11', 19),
  ('maguro-ponzu-sashimi', 'sashimi', 'Sashimi cá ngừ sốt ponzu', 'Maguro no Ponzu Sashimi', 'マグロのポン酢刺身', 399000, null, null, null, '{}', '{}', '{}', null, 'M11', 20),
  ('miyabi-tai-nigiri', 'sushi', 'Sushi cá tráp', 'Miyabi Tai Nigiri', 'ミヤビ鯛握り', 89000, null, null, null, '{}', '{}', '{}', null, 'M12', 0),
  ('kanpachi-nigiri', 'sushi', 'Sushi cá cam', 'Kanpachi Nigiri', 'カンパチ握り', 119000, null, null, null, '{}', '{}', '{}', null, 'M12', 1),
  ('hokkigai-nigiri', 'sushi', 'Sushi sò đỏ', 'Hokkigai Nigiri', 'ホッキ貝握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 2),
  ('salmon-nigiri', 'sushi', 'Sushi cá hồi', 'Salmon Nigiri', 'サーモン握り', 79000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M12', 3),
  ('amaebi-nigiri', 'sushi', 'Sushi tôm ngọt', 'Amaebi Nigiri', '甘エビ握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 4),
  ('unagi-nigiri', 'sushi', 'Sushi lươn Nhật', 'Unagi Nigiri', 'うなぎ握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 5),
  ('hotate-nigiri', 'sushi', 'Sushi sò điệp', 'Hotate Nigiri', 'ホタテ握り', 90000, null, null, null, '{}', '{}', '{}', null, 'M12', 6),
  ('tako-nigiri', 'sushi', 'Sushi bạch tuộc', 'Tako Nigiri', 'タコ握り', 90000, null, null, null, '{}', '{}', '{}', null, 'M12', 7),
  ('kazunoko-nishin', 'sushi', 'Sushi cá trích ép trứng', 'Kazunoko Nishin', '数の子にしん', 79000, null, null, null, '{}', '{}', '{}', null, 'M12', 8),
  ('ikura-gunkan', 'sushi', 'Sushi trứng cá hồi', 'Ikura Gunkan', 'いくら軍艦', 109000, null, null, null, '{}', '{}', '{}', null, 'M12', 9),
  ('tobiko-gunkan', 'sushi', 'Sushi trứng tôm', 'Tobiko Gunkan', 'とびこ軍艦', 69000, null, null, null, '{}', '{}', '{}', null, 'M12', 10),
  ('negitoro-gunkan', 'sushi', 'Sushi cá ngừ', 'Negitoro Gunkan', 'ネギトロ軍艦巻き', 69000, null, null, null, '{}', '{}', '{}', null, 'M12', 11),
  ('sushi-moriawase-matsu', 'sushi', 'Sushi tổng hợp Matsu', 'Sushi Moriawase “Matsu”', '寿司盛り合わせ「松」', 599000, null, null, null, '{}', '{}', array['best-seller']::text[], 'hero-sushi', 'M13', 12),
  ('sushi-moriawase-take', 'sushi', 'Sushi tổng hợp Take', 'Sushi Moriawase “Take”', '寿司盛り合わせ「竹」', 415000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M14', 13),
  ('sushi-moriawase-ume', 'sushi', 'Sushi tổng hợp Ume', 'Sushi Moriawase “Ume”', '寿司盛り合わせ「梅」', 249000, null, null, null, '{}', '{}', '{}', null, 'M14', 14),
  ('maguro-zanmai', 'sushi', 'Sushi cá ngừ Nhật 3 loại', 'Maguro Zanmai', 'マグロ三昧', 299000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M15', 15),
  ('renge-sushi', 'sushi', 'Sushi mix', 'Renge Sushi', 'れんげ寿司', 299000, null, null, null, '{}', '{}', '{}', null, 'M15', 16),
  ('chutoro-nigiri', 'sushi', 'Sushi bụng cá ngừ thượng hạng', 'Chutoro Nigiri', '中トロ握り', 179000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M15', 17),
  ('honmaguro-akami-nigiri', 'sushi', 'Sushi cá ngừ thịt đỏ', 'Honmaguro Akami', '本鮪赤身', 119000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M15', 18),
  ('otoro-nigiri', 'sushi', 'Sushi bụng cá ngừ vây xanh', 'Otoro Nigiri', '大トロ握り', 229000, null, null, null, '{}', '{}', '{}', null, 'M15', 19),
  ('akami-ikura-tsutsumi', 'sushi', 'Cá ngừ đỏ với trứng cá hồi', 'Akami – Ikura Tsutsumi', '赤身・いくら包み', 189000, null, null, null, '{}', '{}', '{}', null, 'M16', 20),
  ('wagyu-uni-caviar-tsutsumi', 'sushi', 'Wagyu – nhum biển – trứng cá tầm', 'Wagyu – Uni – Caviar Tsutsumi', '和牛・うに・キャビア包み', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M16', 21),
  ('uni-ikura-tsutsumi', 'sushi', 'Gói nhum biển & trứng cá hồi', 'Uni Ikura Tsutsumi', 'うにといくらの包み', 199000, null, null, null, '{}', '{}', '{}', null, 'M16', 22),
  ('otoro-uni-caviar-tsutsumi', 'sushi', 'Bụng cá ngừ – nhum – trứng cá tầm', 'Otoro – Uni – Caviar Tsutsumi', 'トロ・うに・キャビア包み', 199000, null, null, null, '{}', '{}', '{}', null, 'M16', 23),
  ('unagi-kabayaki-tsutsumi', 'sushi', 'Gói lươn nướng kabayaki', 'Unagi Kabayaki Tsutsumi', '鰻蒲焼き包み', 129000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M16', 24),
  ('unagi-chizu-roru', 'maki', 'Maki lươn cuộn phô mai', 'Unagi Chīzu Rōru', 'うなぎチーズロール', 199000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M17', 0),
  ('salmon-kariforunia-roru', 'maki', 'Maki California cá hồi', 'Salmon Kariforunia Rōru', 'サーモンカリフォルニアロール', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M17', 1),
  ('unagi-kariforunia-roru', 'maki', 'Maki lươn California', 'Unagi Kariforunia Rōru', 'うなぎカリフォルニアロール', 199000, null, null, null, '{}', '{}', '{}', null, 'M17', 2),
  ('tokusei-samon-roru', 'maki', 'Maki cá hồi đặc biệt', 'Tokusei Sāmon Rōru', '特製サーモンロール', 219000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M17', 3),
  ('unagi-abokado-roru', 'maki', 'Maki lươn cuộn bơ', 'Unagi Abokado Rōru', 'うなぎアボカドロール', 229000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M18', 4),
  ('wagyu-roru', 'maki', 'Maki bò wagyu', 'Wagyu Rōru', '和牛ロール', 229000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M18', 5),
  ('hotate-roru', 'maki', 'Maki sò điệp', 'Hotate Rōru', 'ホタテロール', 229000, null, null, null, '{}', '{}', '{}', null, 'M18', 6),
  ('ebi-abokado-roru', 'maki', 'Maki tôm chiên phủ bơ', 'Ebi Abokado Rōru', 'えびアボカドロール', 199000, null, null, null, '{}', '{}', '{}', null, 'M18', 7),
  ('aburi-samon-yukke-roru', 'maki', 'Maki cá hồi khò chín xốt yukke', 'Aburi Sāmon Yukke Rōru', '炙りサーモンユッケロール', 189000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M18', 8),
  ('wagyu-yukke', 'wagyu', 'Gỏi bò wagyu A5', 'Wagyu Yukke', '和牛ユッケ', 299000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M20', 0),
  ('wagyu-yukke-to-uni', 'wagyu', 'Gỏi bò wagyu & nhum biển', 'Wagyu Yukke to Uni', '和牛ユッケとうに', 499000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M20', 1),
  ('miyako-iki', 'wagyu', 'Miyako Iki', null, '粋', 999000, 1299000, '2 khách · 250gr', 'Các phần thịt có thể thay đổi theo ngày.', array['Thăn ngoại bò wagyu A5 (A5 Wagyu Sirloin)', 'Thăn vai bò wagyu A5 (A5 Wagyu Chuck Roll)', 'Sườn bò Mỹ rút xương (Short Ribs Boneless)']::text[], array['Kimchi', 'Rau cuốn thịt nướng']::text[], '{}', 'hero-wagyu', 'M21', 2),
  ('miyako-takumi', 'wagyu', 'Miyako Takumi', null, '匠', 1999000, 2299000, '2–3 khách · 450gr', 'Các phần thịt có thể thay đổi theo ngày. Có thể gọi nửa phần.', array['Thăn nội bò wagyu A5 (Tenderloin)', 'Thăn ngoại bò wagyu A5 (Sirloin)', 'Thăn vai bò wagyu A5 (Ribeye)', 'Dẻ sườn bò Mỹ (USDA Ribs Finger)', 'Sườn bò Mỹ rút xương (Short Ribs Boneless)']::text[], array['Chọn 1 trong 2: Canh sườn bò Hàn Quốc hoặc Mỳ lạnh Hàn Quốc', 'Kimchi', 'Rau cuốn thịt nướng']::text[], array['must-try']::text[], null, 'M22', 3),
  ('miyako-kiwami', 'wagyu', 'Miyako Kiwami', null, '極', 2999000, 3299000, '3–4 khách · 650gr', 'Các phần thịt có thể thay đổi theo ngày. Có thể gọi nửa phần.', array['Thăn nội bò wagyu A5 (Tenderloin)', 'Thăn ngoại bò wagyu A5 (Sirloin)', 'Thăn lưng bò wagyu A5 (Ribeye)', 'Thăn vai bò wagyu A5 (Chuck Roll)', 'Sườn bò Mỹ rút xương', 'Dẻ sườn bò Mỹ', 'Lưỡi bò Mỹ (Gyutan)']::text[], array['Chọn 1 trong 2: Canh sườn bò Hàn Quốc hoặc Mỳ lạnh Hàn Quốc', 'Kimchi', 'Rau cuốn thịt nướng']::text[], array['best-seller']::text[], null, 'M23', 4),
  ('a5-tenderloin', 'wagyu', 'Thăn nội bò wagyu A5', 'A5 Wagyu Tenderloin (Hire)', 'A5 ヒレ', 749000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 5),
  ('a5-sirloin', 'wagyu', 'Thăn ngoại bò wagyu A5', 'A5 Wagyu Sirloin (Saroin)', 'A5 サーロイン', 699000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 6),
  ('a5-akami-daily', 'wagyu', 'Phần thịt đỏ wagyu A5 theo ngày', 'Honjitsu no A5 Wagyu Akami', '本日のA5和牛赤身', 399000, null, '100gr', null, '{}', '{}', array['best-seller']::text[], null, 'M24', 7),
  ('a5-chuck-roll', 'wagyu', 'Thăn vai bò wagyu A5', 'A5 Wagyu Chuck Roll (KataRosu)', 'A5 肩ロース', 499000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 8),
  ('jo-tan', 'wagyu', 'Lưỡi bò cao cấp', 'Jō Tan', '上タン', 299000, null, null, 'Phần lưỡi mềm nhất nên nướng sẽ ngon nhất. Là phần quý hiếm, mỗi con bò 300kg chỉ lấy được 300g.', '{}', '{}', '{}', null, 'M25', 9),
  ('yuzu-hana-tan', 'wagyu', 'Lưỡi bò hoa xốt yuzu', 'Yuzu Hana Tan', '柚子花タン', 179000, null, null, null, '{}', '{}', '{}', null, 'M25', 10),
  ('negi-shio-tan', 'wagyu', 'Lưỡi bò xốt muối hành', 'Negi Shio Tan', 'ねぎ塩タン', 179000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M25', 11),
  ('us-outside-skirt', 'wagyu', 'Diềm thăn bò Mỹ', 'US Outside Skirt', '米国産ハラミ', 225000, null, '150gr', null, '{}', '{}', '{}', null, 'M26', 12),
  ('us-boneless-short-ribs', 'wagyu', 'Sườn bò Mỹ rút xương', 'US Boneless Short Ribs', '米国産特上カルビ', 290000, null, '120gr', null, '{}', '{}', array['best-seller']::text[], null, 'M26', 13),
  ('us-ribs-finger', 'wagyu', 'Dẻ sườn bò Mỹ', 'US Ribs Finger', 'USDA産カルビ', 185000, null, '120gr', null, '{}', '{}', '{}', null, 'M26', 14),
  ('us-beef-trio', 'wagyu', 'Combo 3 loại bò Mỹ thượng hạng', 'US Beef Trio Combo', 'USビーフ 3種盛り', 599000, null, '350gr', null, '{}', '{}', array['must-try']::text[], null, 'M26', 15),
  ('motsu-nabe', 'lau', 'Lẩu lòng bò', 'Motsu-nabe', 'もつ鍋', null, null, null, null, '{}', '{}', array['best-seller']::text[], 'hero-hotpot', 'M27', 0),
  ('wagyu-sukiyaki', 'lau', 'Wagyu Sukiyaki', 'Wagyu Beef Sukiyaki', '和牛すき焼き', null, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M28', 1),
  ('us-sukiyaki', 'lau', 'US Sukiyaki', 'US Beef Sukiyaki', '黒アンガス牛すき焼き', null, null, null, null, '{}', '{}', '{}', null, 'M28', 2),
  ('wagyu-shabu', 'lau', 'Wagyu Shabu-shabu', 'Wagyu Beef Shabu-Shabu Hotpot', '和牛しゃぶしゃぶ', null, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M29', 3),
  ('us-shabu', 'lau', 'US Shabu-shabu', 'US Beef Shabu-Shabu Hotpot', '黒アンガス牛しゃぶしゃぶ', null, null, null, null, '{}', '{}', '{}', null, 'M29', 4),
  ('us-short-plate', 'lau', 'Ba chỉ bò Mỹ', 'US Beef Short Plate', '牛バラ肉', 99000, null, '150gr', null, '{}', '{}', '{}', null, 'M30', 5),
  ('slided-black-angus', 'lau', 'Bò Mỹ nhúng lẩu', 'Slided Black Angus', 'アメリカ産牛ロース', 159000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 6),
  ('slided-a5-chuck-roll', 'lau', 'Thăn vai bò wagyu A5 nhúng lẩu', 'Slided A5 Wagyu Chuck Roll', 'A5 肩ロース', 499000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 7),
  ('slided-a5-lean', 'lau', 'Phần thịt đỏ wagyu A5 nhúng lẩu', 'Slided A5 Wagyu Lean Cut', '本日のA5和牛赤身', 399000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 8),
  ('beef-offal-nabe', 'lau', 'Lòng bò nhúng lẩu', 'Beef Offal', '牛モツ', 99000, null, '200gr', null, '{}', '{}', '{}', null, 'M30', 9),
  ('nabe-vegetables', 'lau', 'Set rau nhúng lẩu', 'Assorted Vegetables for Hot Pot', '鍋用野菜', 89000, null, null, null, '{}', '{}', '{}', null, 'M30', 10),
  ('nabe-noodles', 'lau', 'Mì udon/soba nhúng lẩu', 'Udon / Soba Noodles for Hot Pot', 'うどん / そば', 40000, null, '50gr', null, '{}', '{}', '{}', null, 'M30', 11),
  ('hokke-yaki', 'nuong', 'Cá hokke nướng', 'Hokke Yaki', 'ホッケ焼き', 229000, null, null, null, '{}', '{}', '{}', null, 'M31', 0),
  ('surumeika-shioyaki', 'nuong', 'Mực ống nướng muối', 'Surumeika Shioyaki', 'するめいか塩焼き', 299000, null, null, null, '{}', '{}', '{}', null, 'M31', 1),
  ('saba-shioyaki', 'nuong', 'Cá thu nướng muối', 'Saba no Shioyaki', '鯖の塩焼き', 149000, null, null, null, '{}', '{}', '{}', null, 'M31', 2),
  ('sanma-shioyaki', 'nuong', 'Cá thu đao nướng muối', 'Sanma no Shioyaki', '秋刀魚の塩焼き', 149000, null, null, null, '{}', '{}', '{}', null, 'M31', 3),
  ('shishamo-shioyaki', 'nuong', 'Cá trứng nướng muối', 'Shishamo no Shioyaki', 'ししゃもの塩焼き', 109000, null, null, null, '{}', '{}', '{}', null, 'M31', 4),
  ('ayu-shioyaki', 'nuong', 'Cá ayu nướng muối', 'Ayu no Shioyaki', '鮎の塩焼き', 209000, null, null, null, '{}', '{}', '{}', null, 'M32', 5),
  ('unagi-kabayaki', 'nuong', 'Lươn Nhật sốt kabayaki', 'Unagi no Kabayaki', '鰻の蒲焼き', 189000, null, null, null, '{}', '{}', '{}', null, 'M32', 6),
  ('samon-shioyaki', 'nuong', 'Cá hồi nướng muối', 'Sāmon Shioyaki', 'サーモン塩焼き', 239000, null, null, null, '{}', '{}', '{}', null, 'M32', 7),
  ('samon-teriyaki', 'nuong', 'Cá hồi nướng teriyaki', 'Sāmon Teriyaki', 'サーモン照り焼き', 239000, null, null, null, '{}', '{}', '{}', null, 'M32', 8),
  ('yakitori', 'nuong', 'Gà nướng xiên que', 'Yakitori', '焼き鳥', 105000, null, null, null, '{}', '{}', '{}', null, 'M32', 9),
  ('buri-kama-shioyaki', 'nuong', 'Má cá buri nướng muối', 'Buri Kama Shioyaki', 'ブリカマ塩焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M33', 10),
  ('buri-kama-teriyaki', 'nuong', 'Má cá buri nướng teriyaki', 'Buri Kama Teriyaki', 'ブリカマ照り焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M33', 11),
  ('salmon-kabuto-shio', 'nuong', 'Đầu cá hồi nướng muối', 'Salmon Kabuto-yaki – Shio', 'サーモン兜焼き（塩）', 159000, null, null, null, '{}', '{}', '{}', null, 'M33', 12),
  ('salmon-kabuto-tare', 'nuong', 'Đầu cá hồi nướng sốt teriyaki', 'Salmon Kabuto-yaki – Tare', 'サーモン兜焼き（たれ）', 159000, null, null, null, '{}', '{}', '{}', null, 'M33', 13),
  ('kaisen-chawanmushi', 'nuong', 'Trứng hấp hải sản', 'Kaisen Chawanmushi', '海鮮茶碗蒸し', 179000, null, null, null, '{}', '{}', '{}', null, 'M33', 14),
  ('chawanmushi', 'nuong', 'Trứng hấp', 'Chawanmushi', '茶碗蒸し', 89000, null, null, null, '{}', '{}', '{}', null, 'M33', 15),
  ('uni-kaisen-chawanmushi', 'nuong', 'Trứng hấp hải sản & nhum biển', 'Uni Kaisen Chawanmushi', 'うに海鮮茶碗蒸し', 299000, null, null, null, '{}', '{}', '{}', null, 'M33', 16),
  ('gyukatsu', 'chien', 'Bò wagyu chiên xù kiểu Nhật', 'Gyukatsu', '牛カツ', 359000, null, null, null, '{}', '{}', '{}', null, 'M34', 0),
  ('ika-furai', 'chien', 'Mực chiên xù', 'Ika Furai', 'イカフライ', 159000, null, null, null, '{}', '{}', '{}', null, 'M34', 1),
  ('ebi-furai', 'chien', 'Tôm chiên xù', 'Ebi Furai', '海老フライ', 139000, null, null, null, '{}', '{}', '{}', null, 'M34', 2),
  ('karaage', 'chien', 'Gà chiên', 'Karaage', 'から揚げ', 89000, null, null, null, '{}', '{}', '{}', null, 'M34', 3),
  ('poteto-furai', 'chien', 'Khoai tây chiên', 'Poteto Furai', 'ポテトフライ', 49000, null, null, null, '{}', '{}', '{}', null, 'M34', 4),
  ('yasai-tempura', 'chien', 'Tempura rau củ tổng hợp', 'Yasai Tempura Moriawase', '野菜天ぷら盛り合わせ', 99000, null, null, null, '{}', '{}', '{}', null, 'M34', 5),
  ('ebi-yasai-tempura', 'chien', 'Tempura tôm & rau củ tổng hợp', 'Ebi – Yasai Tempura Moriawase', '海老・野菜天ぷら盛り合わせ', 129000, null, null, null, '{}', '{}', '{}', null, 'M34', 6),
  ('kare-udon', 'mi', 'Mỳ udon xốt cà ri', 'Kare Udon', 'カレーうどん', 149000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M35', 0),
  ('udon-tempura', 'mi', 'Mỳ udon tempura', 'Udon Tempura', '天ぷらうどん', 199000, null, null, null, '{}', '{}', '{}', null, 'M35', 1),
  ('kake-udon', 'mi', 'Mỳ udon nóng', 'Kake Udon', 'かけうどん', 99000, null, null, null, '{}', '{}', '{}', null, 'M35', 2),
  ('kake-soba', 'mi', 'Mỳ soba nóng', 'Kake Soba', 'かけそば', 99000, null, null, null, '{}', '{}', '{}', null, 'M35', 3),
  ('soba-tempura', 'mi', 'Mì soba tempura', 'Soba Tempura', '天ぷらそば', 199000, null, null, null, '{}', '{}', '{}', null, 'M35', 4),
  ('unagi-carbonara', 'mi', 'Mỳ Ý carbonara lươn Nhật', 'Unagi Karubonāra', 'うなぎカルボナーラ', 249000, null, null, null, '{}', '{}', '{}', null, 'M36', 5),
  ('mentaiko-pasuta', 'mi', 'Mỳ Ý xốt trứng cá tuyết cay', 'Mentaiko Pasuta', '明太子パスタ', 199000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M36', 6),
  ('miso-ramen', 'mi', 'Miso ramen', 'Miso Ramen', '味噌ラーメン', 189000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M36', 7),
  ('tonkotsu-ramen', 'mi', 'Tonkotsu ramen', 'Tonkotsu Ramen', '豚骨ラーメン', 189000, null, null, null, '{}', '{}', '{}', null, 'M36', 8),
  ('tantanmen', 'mi', 'Tantanmen', 'Tantanmen', '担々麺', 189000, null, null, null, '{}', '{}', '{}', null, 'M36', 9),
  ('unagi-don', 'com', 'Cơm lươn Nhật', 'Unagi Don', 'うな重', 269000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M37', 0),
  ('tendon', 'com', 'Cơm tempura thập cẩm', 'Tendon', '天丼', 249000, null, null, null, '{}', '{}', '{}', null, 'M37', 1),
  ('katsudon', 'com', 'Cơm thịt heo chiên xù trứng', 'Katsudon', 'かつ丼', 159000, null, null, null, '{}', '{}', '{}', null, 'M37', 2),
  ('oyakodon', 'com', 'Cơm bát mẹ con', 'Oyakodon', '親子丼', 139000, null, null, null, '{}', '{}', '{}', null, 'M37', 3),
  ('katsu-kare-don', 'com', 'Cơm cà ri thịt heo chiên xù', 'Katsu Kare', 'カツカレー', 159000, null, null, null, '{}', '{}', '{}', null, 'M37', 4),
  ('kare-raisu', 'com', 'Cơm cà ri Nhật', 'Kare Raisu', 'カレーライス', 99000, null, null, null, '{}', '{}', '{}', null, 'M37', 5),
  ('wagyu-don', 'com', 'Cơm bò wagyu', 'Wagyu Don', '和牛丼', 499000, null, null, null, '{}', '{}', array['must-try']::text[], 'hero-don', 'M38', 6),
  ('tokujo-kaisen-don', 'com', 'Cơm hải sản thượng hạng', 'Tokujō Kaisen-don Misoshiru Tsuki', '特上海鮮丼', 569000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M38', 7),
  ('salmon-don', 'com', 'Cơm cá hồi', 'Salmon Don', 'サーモン丼', 280000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M38', 8),
  ('kinako-ice-cream', 'trang-mieng', 'Kem kinako sốt đường đen', 'Kinako Ice Cream', '黒蜜きなこアイス', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 0),
  ('matcha-ice-cream', 'trang-mieng', 'Kem matcha', 'Matcha Ice Cream', '抹茶アイスクリーム', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 1),
  ('yuzu-sorbet', 'trang-mieng', 'Kem sorbet chanh yuzu', 'Yuzu Sorbet', '柚子シャーベット', 59000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M39', 2),
  ('vanilla-ice-cream', 'trang-mieng', 'Kem vani Nhật', 'Vanilla Ice Cream', 'バニラアイス', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 3),
  ('seasonal-fruits', 'trang-mieng', 'Đĩa trái cây theo mùa', 'Seasonal Mixed Fruits', '季節のフルーツ盛り合わせ', 129000, null, null, null, '{}', '{}', '{}', null, 'M39', 4)
on conflict (id) do nothing;

-- Món bán theo phần (lẩu, sukiyaki, shabu)
insert into public.dish_variants (dish_id, code, label, price, note, sort_order) values
  ('motsu-nabe', 'm', 'Medium', 259000, '200gr', 0),
  ('motsu-nabe', 'l', 'Large', 399000, '300gr', 1),
  ('wagyu-sukiyaki', 'm', 'Medium', 559000, '100gr', 0),
  ('wagyu-sukiyaki', 'l', 'Large', 999000, '200gr', 1),
  ('us-sukiyaki', 'm', 'Medium', 299000, '200gr', 0),
  ('us-sukiyaki', 'l', 'Large', 399000, '300gr', 1),
  ('wagyu-shabu', 'm', 'Medium', 559000, '100gr', 0),
  ('wagyu-shabu', 'l', 'Large', 999000, '200gr', 1),
  ('us-shabu', 'm', 'Medium', 299000, '200gr', 0),
  ('us-shabu', 'l', 'Large', 399000, '300gr', 1)
on conflict (dish_id, code) do nothing;

-- Suất omakase
insert into public.omakase_sets
  (id, name, jp, subtitle, price, service, tier, description, image_path,
   menu_pending, sort_order)
values
  ('omakase-lunch', 'Omakase trưa', '昼のおまかせ', null, 500000, 'lunch', 1, null, null, true, 0),
  ('omakase-dinner-1', 'Set tối — mức 1', '夜のおまかせ 壱', null, 1000000, 'dinner', 2, null, null, true, 1),
  ('omakase-dinner-2', 'Set tối — mức 2', '夜のおまかせ 弐', null, 2000000, 'dinner', 3, null, null, true, 2),
  ('kaze', 'Kaze Omakase', '夏風', 'Kaze — Làn gió mùa hè', 3000000, 'dinner', 4, 'Lấy cảm hứng từ những làn gió mát lành giữa mùa hè Nhật Bản, Kaze Omakase mang đến một hành trình vị giác nhẹ nhàng, tinh tế và đầy cân bằng.

Từng món ăn được sắp đặt như một nhịp gió: khi thanh mát từ hải vị, khi sâu lắng bởi vị ngọt tự nhiên của nguyên liệu, khi để lại dư vị ấm áp và sang trọng nơi đầu lưỡi.

Kaze không hướng đến sự phô trương, mà là vẻ đẹp của sự tiết chế — nơi đầu bếp gửi gắm tinh thần mùa hè qua từng lát cắt, từng sắc vị và từng khoảnh khắc thưởng thức.', 'hero-omakase', false, 3)
on conflict (id) do nothing;

-- Trình tự món của từng suất
insert into public.omakase_courses (set_id, section, items, sort_order) values
  ('kaze', 'Khai vị', array['Tảo nâu Mozuku']::text[], 0),
  ('kaze', 'Sashimi', array['Sò điệp', 'Bụng cá ngừ']::text[], 1),
  ('kaze', 'Sushi & món chính', array['Cá Cam', 'Madai', 'Mansaba', 'Chanwamusi', 'Handroll', 'Otoro', 'Chutoro', 'Nigitoro', 'Wagyu Onsen']::text[], 2),
  ('kaze', 'Tráng miệng', array['Mochi']::text[], 3);

-- 12 ghế quầy. Toạ độ dùng để dựng mô hình 3D trong mini app.
insert into public.seats (id, label, zone, pos_x, pos_z, rotation, is_premium, note, sort_order) values
  ('Q1', 'Q1', 'counter', -2.52, -0.65, 90, false, null, 0),
  ('Q2', 'Q2', 'counter', -2.52, -0.05, 90, false, null, 1),
  ('Q3', 'Q3', 'counter', -2.52, 0.55, 90, false, null, 2),
  ('Q4', 'Q4', 'counter', -2.52, 1.15, 90, false, null, 3),
  ('Q5', 'Q5', 'counter', -1.5, 1.78, 0, false, null, 4),
  ('Q6', 'Q6', 'counter', -0.75, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 5),
  ('Q7', 'Q7', 'counter', 0, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 6),
  ('Q8', 'Q8', 'counter', 0.75, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 7),
  ('Q9', 'Q9', 'counter', 1.5, 1.78, 0, false, null, 8),
  ('Q10', 'Q10', 'counter', 2.52, 0.95, 270, false, null, 9),
  ('Q11', 'Q11', 'counter', 2.52, 0.25, 270, false, null, 10),
  ('Q12', 'Q12', 'counter', 2.52, -0.45, 270, false, null, 11)
on conflict (id) do nothing;

commit;

-- ============================================================
-- MIGRATION: BÁN THỊT BÒ TƯƠI MANG VỀ (MIYAKO BUTCHER & TAKEOUT/DELIVERY)
-- ============================================================

-- 1. Bổ sung các cột thông tin giao hàng & người nhận vào bảng orders
alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists delivery_time text,
  add column if not exists delivery_fee integer not null default 0,
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_status text not null default 'unpaid';

-- 2. Cập nhật check constraint cho mode
alter table public.orders drop constraint if exists orders_mode_check;
alter table public.orders add constraint orders_mode_check
  check (mode in ('dine-in', 'pre-order', 'takeout', 'delivery'));

-- 3. Cập nhật check constraint cho status
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('sent', 'preparing', 'delivering', 'served', 'completed', 'cancelled'));

-- 4. Cập nhật check constraint cho payment_method
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('vietqr', 'cod', 'transfer'));

-- 5. Cập nhật check constraint cho payment_status
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'paid'));

-- 6. Nới lỏng constraint orders_target_present để chấp nhận đơn mang về / giao hàng
alter table public.orders drop constraint if exists orders_target_present;
alter table public.orders add constraint orders_target_present check (
  (mode = 'dine-in'   and table_id is not null) or
  (mode = 'pre-order' and reservation_id is not null) or
  (mode = 'takeout'   and customer_name is not null and customer_phone is not null) or
  (mode = 'delivery'  and customer_name is not null and customer_phone is not null and delivery_address is not null)
);

-- 7. Cập nhật hàm RPC create_order hỗ trợ đầy đủ tham số
create or replace function public.create_order(
  p_lines            jsonb,
  p_mode             text,
  p_table_id         text default null,
  p_reservation_id   uuid default null,
  p_note             text default null,
  p_zalo_id          text default null,
  p_customer_name    text default null,
  p_customer_phone   text default null,
  p_delivery_address text default null,
  p_delivery_time    text default null,
  p_payment_method   text default 'cod',
  p_delivery_fee     integer default 0
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_line        jsonb;
  v_dish        public.dishes%rowtype;
  v_variant     public.dish_variants%rowtype;
  v_price       integer;
  v_qty         integer;
  v_subtotal    integer := 0;
  v_code        text;
  v_order       public.orders;
  v_customer_id uuid;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn không có món nào';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Đơn quá nhiều dòng';
  end if;

  if p_mode = 'dine-in' then
    if not exists (select 1 from public.restaurant_tables where id = p_table_id and is_active) then
      raise exception 'Bàn không hợp lệ';
    end if;
  elsif p_mode = 'pre-order' then
    if not exists (
      select 1 from public.reservations
      where id = p_reservation_id and status in ('pending', 'awaiting-deposit', 'confirmed')
    ) then
      raise exception 'Lượt đặt bàn không hợp lệ';
    end if;
  elsif p_mode = 'takeout' then
    if nullif(trim(p_customer_name), '') is null or nullif(trim(p_customer_phone), '') is null then
      raise exception 'Vui lòng cung cấp họ tên và số điện thoại người nhận';
    end if;
  elsif p_mode = 'delivery' then
    if nullif(trim(p_customer_name), '') is null or nullif(trim(p_customer_phone), '') is null then
      raise exception 'Vui lòng cung cấp họ tên và số điện thoại người nhận';
    end if;
    if nullif(trim(p_delivery_address), '') is null then
      raise exception 'Vui lòng cung cấp địa chỉ nhận hàng chi tiết';
    end if;
  else
    raise exception 'Hình thức gọi món không hợp lệ';
  end if;

  if p_zalo_id is not null then
    select id into v_customer_id from public.customers where zalo_id = p_zalo_id;
  end if;

  for i in 1..8 loop
    v_code := case when p_mode in ('takeout', 'delivery') then public.make_code('BT') else public.make_code('OD') end;
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;

  insert into public.orders (
    code, reservation_id, table_id, customer_id, zalo_id, mode, note,
    customer_name, customer_phone, delivery_address, delivery_time,
    delivery_fee, payment_method, payment_status, status
  )
  values (
    v_code,
    case when p_mode = 'pre-order' then p_reservation_id end,
    case when p_mode = 'dine-in'   then p_table_id end,
    v_customer_id, p_zalo_id, p_mode, nullif(trim(p_note), ''),
    nullif(trim(p_customer_name), ''),
    nullif(trim(p_customer_phone), ''),
    nullif(trim(p_delivery_address), ''),
    nullif(trim(p_delivery_time), ''),
    greatest(coalesce(p_delivery_fee, 0), 0),
    coalesce(p_payment_method, 'cod'),
    'unpaid',
    'sent'
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish
    from public.dishes
    where id = v_line ->> 'dish_id' and is_available;

    if not found then
      raise exception 'Món % không còn phục vụ', v_line ->> 'dish_id';
    end if;

    v_qty := greatest(coalesce((v_line ->> 'qty')::integer, 1), 1);
    if v_qty > 50 then
      raise exception 'Số lượng một món vượt mức cho phép';
    end if;

    if coalesce(v_line ->> 'variant_code', '') <> '' then
      select * into v_variant
      from public.dish_variants
      where dish_id = v_dish.id and code = v_line ->> 'variant_code';

      if not found then
        raise exception 'Phần % của món % không tồn tại', v_line ->> 'variant_code', v_dish.name;
      end if;

      v_price := v_variant.price;
      insert into public.order_lines (order_id, dish_id, name, variant_label, unit_price, qty, note)
      values (v_order.id, v_dish.id, v_dish.name, v_variant.label, v_price, v_qty, nullif(trim(v_line ->> 'note'), ''));
    else
      if v_dish.price is null then
        raise exception 'Món % bắt buộc chọn phần', v_dish.name;
      end if;
      v_price := v_dish.price;
      insert into public.order_lines (order_id, dish_id, name, variant_label, unit_price, qty, note)
      values (v_order.id, v_dish.id, v_dish.name, null, v_price, v_qty, nullif(trim(v_line ->> 'note'), ''));
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  update public.orders
  set subtotal = v_subtotal
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- 8. Hàm tra cứu đơn hàng theo mã (dùng cho cả OD và BT)
create or replace function public.get_order_by_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_order record;
  v_lines jsonb;
begin
  select * into v_order
  from public.orders
  where code = upper(trim(p_code));

  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ol.id,
      'dish_id', ol.dish_id,
      'name', ol.name,
      'variant_label', ol.variant_label,
      'unit_price', ol.unit_price,
      'qty', ol.qty,
      'note', ol.note
    )
  ), '[]'::jsonb)
  into v_lines
  from public.order_lines ol
  where ol.order_id = v_order.id;

  return jsonb_build_object(
    'id', v_order.id,
    'code', v_order.code,
    'mode', v_order.mode,
    'status', v_order.status,
    'subtotal', v_order.subtotal,
    'note', v_order.note,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'delivery_address', v_order.delivery_address,
    'delivery_time', v_order.delivery_time,
    'delivery_fee', v_order.delivery_fee,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'created_at', v_order.created_at,
    'lines', v_lines
  );
end;
$$;

grant execute on function public.get_order_by_code(text) to anon, authenticated;
grant execute on function public.create_order(jsonb, text, text, uuid, text, text, text, text, text, text, text, integer) to anon, authenticated;

-- ============================================================
-- MIGRATION: XẾP LẠI GHẾ QUẦY OMAKASE
--
-- Q1–Q4 thành một hàng dọc cạnh trái, Q5–Q9 một hàng ở mặt trước, Q10–Q12
-- vẫn dọc cạnh phải. Trước đây Q4 nằm ở mặt trước và mặt trước có sáu ghế.
--
-- Quầy trong mô hình 3D sâu thêm 0,4 m về phía trước để cạnh trái đủ chỗ cho
-- bốn ghế, nên cả ba hàng đều dời toạ độ. Mặt trước còn năm ghế, ghế giữa Q7
-- nhìn thẳng bếp trưởng, Q6 và Q8 kề bên cũng tính là ghế đẹp.
--
-- Chỉ sửa toạ độ và ghế đẹp. Mã ghế giữ nguyên nên các lượt đặt đã giữ ghế
-- không bị ảnh hưởng.
-- ============================================================

update public.seats s
set pos_x      = v.pos_x,
    pos_z      = v.pos_z,
    rotation   = v.rotation,
    is_premium = v.is_premium,
    note       = v.note,
    sort_order = v.sort_order
from (values
  ('Q1',  -2.52, -0.65,  90::numeric, false, null::text,                  0),
  ('Q2',  -2.52, -0.05,  90,          false, null,                        1),
  ('Q3',  -2.52,  0.55,  90,          false, null,                        2),
  ('Q4',  -2.52,  1.15,  90,          false, null,                        3),
  ('Q5',  -1.50,  1.78,   0,          false, null,                        4),
  ('Q6',  -0.75,  1.78,   0,          true,  'Nhìn thẳng tay bếp trưởng', 5),
  ('Q7',   0.00,  1.78,   0,          true,  'Nhìn thẳng tay bếp trưởng', 6),
  ('Q8',   0.75,  1.78,   0,          true,  'Nhìn thẳng tay bếp trưởng', 7),
  ('Q9',   1.50,  1.78,   0,          false, null,                        8),
  ('Q10',  2.52,  0.95, 270,          false, null,                        9),
  ('Q11',  2.52,  0.25, 270,          false, null,                        10),
  ('Q12',  2.52, -0.45, 270,          false, null,                        11)
) as v(id, pos_x, pos_z, rotation, is_premium, note, sort_order)
where s.id = v.id;
