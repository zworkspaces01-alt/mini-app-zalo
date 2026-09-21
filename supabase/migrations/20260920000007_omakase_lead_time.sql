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
