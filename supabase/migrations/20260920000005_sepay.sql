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
