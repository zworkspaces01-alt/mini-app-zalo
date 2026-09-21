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
