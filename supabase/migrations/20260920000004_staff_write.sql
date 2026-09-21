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
