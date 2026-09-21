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
