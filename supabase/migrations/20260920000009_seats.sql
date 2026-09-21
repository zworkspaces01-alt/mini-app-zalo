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
