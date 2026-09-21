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
