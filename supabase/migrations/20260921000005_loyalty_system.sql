-- ============================================================
-- Migration: Hệ Thống Tích Điểm Toàn Diện (Loyalty System)
-- ============================================================

-- ── 1. Bổ sung cột tích điểm & giảm giá cho bảng orders ─────
alter table public.orders
  add column if not exists points_earned integer not null default 0 check (points_earned >= 0),
  add column if not exists points_credited boolean not null default false,
  add column if not exists discount_amount integer not null default 0 check (discount_amount >= 0),
  add column if not exists voucher_code text;

-- ── 2. Bảng quản lý nhiệm vụ & điểm danh hàng ngày ──────────
create table if not exists public.customer_quests (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  quest_id       text not null, -- 'daily_checkin', 'table_qr', 'review', 'share'
  quest_date     date not null default current_date,
  points_reward  integer not null check (points_reward > 0),
  extra_info     text,
  created_at     timestamptz not null default now(),
  constraint uq_customer_quest_daily unique (customer_id, quest_id, quest_date)
);

create index if not exists idx_customer_quests_lookup 
  on public.customer_quests (customer_id, quest_date);

alter table public.customer_quests enable row level security;

drop policy if exists "Customers read their quests" on public.customer_quests;
create policy "Customers read their quests" on public.customer_quests
  for select using (true);

drop policy if exists "Service manage quests" on public.customer_quests;
create policy "Service manage quests" on public.customer_quests
  for all using (true);

-- ── 3. Hàm tính tỷ lệ hoàn điểm theo phân hạng ──────────────
create or replace function public.calc_tier_rate(p_tier text)
returns numeric
language sql
immutable
as $$
  select case lower(coalesce(p_tier, 'bronze'))
    when 'diamond'  then 0.12 -- 12%
    when 'platinum' then 0.12 -- tương đương diamond
    when 'gold'     then 0.08 -- 8%
    when 'silver'   then 0.05 -- 5%
    else 0.03                 -- 3% (bronze/đồng)
  end;
$$;

-- ── 4. Hàm đồng bộ / tìm / tạo khách hàng từ Mini App ───────
create or replace function public.get_or_create_customer(
  p_zalo_id    text,
  p_name       text default null,
  p_phone      text default null,
  p_avatar_url text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cust public.customers;
  v_is_new boolean := false;
begin
  if p_zalo_id is null or trim(p_zalo_id) = '' then
    raise exception 'Zalo ID không được để trống';
  end if;

  select * into v_cust from public.customers where zalo_id = p_zalo_id;

  if not found then
    v_is_new := true;
    insert into public.customers (
      zalo_id, name, phone, avatar_url, points, tier, total_spent, visit_count
    )
    values (
      p_zalo_id,
      coalesce(nullif(trim(p_name), ''), 'Quý Khách'),
      nullif(trim(p_phone), ''),
      p_avatar_url,
      50, -- Tặng 50 điểm chào mừng thành viên mới!
      'bronze',
      0,
      0
    )
    returning * into v_cust;

    -- Ghi sổ cái điểm thưởng chào mừng
    insert into public.customer_points_ledger (
      customer_id, amount, balance, reason
    )
    values (
      v_cust.id, 50, 50, 'Thưởng chào mừng gia nhập Miyako VIP Club'
    );
  else
    -- Cập nhật thông tin nếu có thay đổi
    update public.customers
    set name = coalesce(nullif(trim(p_name), ''), name),
        phone = coalesce(nullif(trim(p_phone), ''), phone),
        avatar_url = coalesce(p_avatar_url, avatar_url),
        updated_at = now()
    where id = v_cust.id
    returning * into v_cust;
  end if;

  return v_cust;
end;
$$;

grant execute on function public.get_or_create_customer(text, text, text, text) to public, anon, authenticated;

-- ── 5. Hàm tự động tích điểm khi hoàn tất đơn hàng ─────────
create or replace function public.complete_order_and_credit_points(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_cust public.customers;
  v_points integer;
  v_new_points integer;
  v_new_tier text;
  v_rate numeric;
  v_percent integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy đơn hàng');
  end if;

  -- Tìm khách hàng qua customer_id hoặc zalo_id hoặc phone
  if v_order.customer_id is not null then
    select * into v_cust from public.customers where id = v_order.customer_id for update;
  elsif v_order.zalo_id is not null then
    select * into v_cust from public.customers where zalo_id = v_order.zalo_id for update;
  elsif v_order.customer_phone is not null then
    select * into v_cust from public.customers where phone = v_order.customer_phone for update;
  end if;

  -- Nếu đơn đã tích điểm rồi thì chỉ cập nhật trạng thái
  if v_order.points_credited then
    update public.orders
    set status = 'completed',
        payment_status = 'paid',
        updated_at = now()
    where id = p_order_id;
    return jsonb_build_object(
      'success', true,
      'already_credited', true,
      'points_earned', v_order.points_earned
    );
  end if;

  -- Tính số điểm tích luỹ
  if v_cust.id is not null and coalesce(v_order.subtotal, 0) > 0 then
    v_rate := public.calc_tier_rate(v_cust.tier);
    v_percent := round(v_rate * 100);
    -- 1 điểm = 1.000 VNĐ. Ví dụ 1.000.000đ * 8% = 80.000đ -> 80 điểm
    v_points := greatest(round((v_order.subtotal * v_rate) / 1000)::integer, 1);

    v_new_points := v_cust.points + v_points;

    -- Tự động tính lại hạng theo điểm tích luỹ mới
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
        total_spent = total_spent + v_order.subtotal,
        visit_count = visit_count + 1,
        last_visit = now(),
        updated_at = now()
    where id = v_cust.id;

    -- Ghi sổ cái
    insert into public.customer_points_ledger (
      customer_id, amount, balance, reason, order_id
    )
    values (
      v_cust.id,
      v_points,
      v_new_points,
      'Tích ' || v_percent || '% từ đơn hàng #' || v_order.code,
      p_order_id
    );
  else
    v_points := 0;
  end if;

  update public.orders
  set status = 'completed',
      payment_status = 'paid',
      points_earned = v_points,
      points_credited = true,
      customer_id = coalesce(v_order.customer_id, v_cust.id),
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'points_earned', v_points,
    'customer_name', v_cust.name,
    'new_balance', coalesce(v_new_points, 0)
  );
end;
$$;

grant execute on function public.complete_order_and_credit_points(uuid) to public, anon, authenticated;

-- ── 6. Hàm nhận thưởng nhiệm vụ (Điểm danh, Quét QR, Đánh giá, Chia sẻ) ──
create or replace function public.claim_quest_reward(
  p_zalo_id    text,
  p_quest_id   text,
  p_extra_info text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cust public.customers;
  v_reward integer;
  v_title text;
  v_new_points integer;
  v_new_tier text;
begin
  select * into v_cust from public.customers where zalo_id = p_zalo_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy hồ sơ thành viên');
  end if;

  -- Xác định điểm thưởng theo nhiệm vụ
  case p_quest_id
    when 'daily_checkin' then
      v_reward := 15;
      v_title := 'Điểm danh hàng ngày';
    when 'table_qr' then
      v_reward := 30;
      v_title := 'Quét mã QR tại bàn ăn';
    when 'review' then
      v_reward := 50;
      v_title := 'Đánh giá dịch vụ 5 sao';
    when 'share' then
      v_reward := 100;
      v_title := 'Chia sẻ Miyako Mini App cho bạn bè';
    else
      return jsonb_build_object('success', false, 'error', 'Nhiệm vụ không hợp lệ');
  end case;

  -- Kiểm tra xem hôm nay đã hoàn thành nhiệm vụ này chưa
  if exists (
    select 1 from public.customer_quests
    where customer_id = v_cust.id
      and quest_id = p_quest_id
      and quest_date = current_date
  ) then
    return jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'error', 'Bạn đã nhận thưởng nhiệm vụ "' || v_title || '" hôm nay rồi. Hãy quay lại vào ngày mai nhé!'
    );
  end if;

  -- Lưu lịch sử nhiệm vụ
  insert into public.customer_quests (
    customer_id, quest_id, quest_date, points_reward, extra_info
  )
  values (
    v_cust.id, p_quest_id, current_date, v_reward, p_extra_info
  );

  v_new_points := v_cust.points + v_reward;

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
  where id = v_cust.id;

  insert into public.customer_points_ledger (
    customer_id, amount, balance, reason
  )
  values (
    v_cust.id, v_reward, v_new_points, 'Thưởng nhiệm vụ: ' || v_title
  );

  return jsonb_build_object(
    'success', true,
    'points_reward', v_reward,
    'new_balance', v_new_points,
    'title', v_title
  );
end;
$$;

grant execute on function public.claim_quest_reward(text, text, text) to public, anon, authenticated;

-- ── 7. Hàm đổi quà & Sinh mã Voucher ────────────────────────
create or replace function public.redeem_reward_gift(
  p_zalo_id  text,
  p_gift_id  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cust public.customers;
  v_gift public.reward_gifts;
  v_code text;
  v_new_points integer;
  v_redemption public.voucher_redemptions;
begin
  select * into v_cust from public.customers where zalo_id = p_zalo_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy hồ sơ thành viên');
  end if;

  select * into v_gift from public.reward_gifts where id = p_gift_id and is_active;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Món quà không tồn tại hoặc đã tạm dừng');
  end if;

  if v_cust.points < v_gift.points_cost then
    return jsonb_build_object(
      'success', false,
      'error', 'Bạn chưa đủ điểm tích luỹ. Cần ' || v_gift.points_cost || ' điểm.'
    );
  end if;

  -- Sinh mã đổi thưởng độc nhất: 'RD-' + 6 ký tự ngẫu nhiên
  v_code := 'RD-' || upper(substr(md5(random()::text), 1, 6));

  -- Tạo lượt đổi thưởng
  insert into public.voucher_redemptions (
    gift_id, customer_id, code, status
  )
  values (
    v_gift.id, v_cust.id, v_code, 'active'
  )
  returning * into v_redemption;

  -- Trừ điểm của khách
  v_new_points := v_cust.points - v_gift.points_cost;

  update public.customers
  set points = v_new_points,
      updated_at = now()
  where id = v_cust.id;

  -- Ghi sổ cái giao dịch điểm
  insert into public.customer_points_ledger (
    customer_id, amount, balance, reason
  )
  values (
    v_cust.id,
    -v_gift.points_cost,
    v_new_points,
    'Đổi quà: ' || v_gift.title
  );

  return jsonb_build_object(
    'success', true,
    'code', v_code,
    'gift_title', v_gift.title,
    'points_cost', v_gift.points_cost,
    'new_balance', v_new_points
  );
end;
$$;

grant execute on function public.redeem_reward_gift(text, text) to public, anon, authenticated;

-- ── 8. Hàm lấy danh sách Voucher của khách hàng ──────────────
create or replace function public.get_customer_vouchers(
  p_zalo_id text
)
returns table (
  id uuid,
  code text,
  gift_id text,
  gift_title text,
  gift_category text,
  worth_text text,
  status text,
  created_at timestamptz,
  used_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select 
    vr.id,
    vr.code,
    vr.gift_id,
    coalesce(rg.title, 'Ưu đãi đổi điểm') as gift_title,
    coalesce(rg.category, 'voucher') as gift_category,
    rg.worth_text,
    vr.status,
    vr.created_at,
    vr.used_at
  from public.voucher_redemptions vr
  join public.customers c on c.id = vr.customer_id
  left join public.reward_gifts rg on rg.id = vr.gift_id
  where c.zalo_id = p_zalo_id
  order by vr.created_at desc;
$$;

grant execute on function public.get_customer_vouchers(text) to public, anon, authenticated;

-- ── 9. Dữ liệu hạt giống cho danh mục Quà Đổi Điểm ────────────
insert into public.reward_gifts (id, category, title, description, worth_text, points_cost, badge, sort_order, is_active)
values
  ('gift-v50', 'voucher', 'Voucher Giảm 50.000đ', 'Trừ trực tiếp trên hoá đơn dùng bữa hoặc mua thịt Butcher', 'Trị giá 50.000đ', 50, 'Dễ đổi nhất', 1, true),
  ('gift-v100', 'voucher', 'Voucher Giảm 100.000đ', 'Áp dụng cho hoá đơn từ 500.000đ tại toàn hệ thống', 'Trị giá 100.000đ', 100, 'Phổ biến', 2, true),
  ('gift-v200', 'voucher', 'Voucher Giảm 200.000đ', 'Áp dụng cho mọi bữa ăn hoặc đơn hàng Wagyu Butcher', 'Trị giá 200.000đ', 200, 'Ưu đãi lớn', 3, true),
  ('gift-sashimi', 'dish', 'Sashimi Cá Hồi Na Uy Tươi', 'Tặng 1 đĩa Sashimi cá hồi nhập khẩu Na Uy hảo hạng', 'Trị giá 185.000đ', 250, 'Món Bếp Trưởng', 4, true),
  ('gift-wagyu', 'dish', 'Bò Wagyu A5 Nướng Đá Núi Lửa', 'Tặng 1 phần Wagyu A5 nướng đá thơm lừng béo ngậy', 'Trị giá 360.000đ', 450, 'Wagyu A5', 5, true),
  ('gift-sake', 'drink', 'Chai Rượu Sake Vảy Vàng 720ml', 'Rượu Sake thượng hạng chứa vảy vàng 24k tinh khiết Nhật Bản', 'Trị giá 790.000đ', 800, 'VIP Gift', 6, true),
  ('gift-omakase', 'dish', '1 Vé Omakase Thượng Hạng', 'Trải nghiệm trọn vẹn set menu 12 món do Bếp trưởng phục vụ', 'Trị giá 1.500.000đ', 1500, 'Đặc biệt', 7, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  worth_text = excluded.worth_text,
  points_cost = excluded.points_cost,
  badge = excluded.badge,
  sort_order = excluded.sort_order;
