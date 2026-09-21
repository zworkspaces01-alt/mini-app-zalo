-- ============================================================
-- Miyako — bù các migration còn thiếu trên Supabase thật
--
-- Dán cả file vào Supabase Dashboard › SQL Editor rồi bấm Run.
--
-- Kiểm tra ngày 21/09/2026: server đã có 20260920000001–10, 20260921000003
-- và 20260921000004, còn thiếu các migration dưới đây. Chạy trong một giao
-- dịch: lỗi ở bất kỳ đâu thì không thay đổi gì, sửa xong chạy lại cả file.
--
-- Lưu ý: 20260921000001 ghi đè tên, giá của 8 món butcher và tạo lại các
-- phần cắt. Nếu đã sửa các món này trong CMS thì phần sửa đó mất.
--
-- File này chỉ là bản gom, không phải migration. Nguồn là các file trong
-- supabase/migrations/.
-- ============================================================

begin;

-- >>>>>>>>>> 20260921000001_butcher_and_takeout.sql

-- ============================================================
-- Migration: Bán thịt bò tươi mang về (Miyako Butcher & Takeout/Delivery)
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
-- Bỏ bản 6 tham số cũ. Để cả hai cùng tồn tại thì lời gọi chỉ truyền các tham
-- số cũ (mini app bản cũ) khớp cả hai bản, PostgREST không chọn được hàm nào
-- và báo lỗi PGRST203. Còn một bản thì tham số mới lấy giá trị mặc định.
drop function if exists public.create_order(jsonb, text, text, uuid, text, text);

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
-- Kiểu trả về đổi từ public.orders sang jsonb. `create or replace` không đổi
-- được kiểu trả về, nên phải xoá bản cũ trước.
drop function if exists public.get_order_by_code(text);

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

-- 9. Thêm Danh mục Thịt Bò Mang Về (Miyako Butcher)
insert into public.categories (id, name, jp, romaji, sort_order)
values ('butcher', 'Thịt bò mang về', '精肉・テイクアウト', 'Miyako Butcher', 5)
on conflict (id) do update set
  name = excluded.name,
  jp = excluded.jp,
  romaji = excluded.romaji;

-- 10. Seed các sản phẩm thịt bò mang về & Combo BBQ/Lẩu tại nhà
insert into public.dishes (
  id, category_id, name, romaji, jp, price, compare_at_price, unit, description,
  includes, gifts, badges, sort_order
) values
(
  'butcher-a5-tenderloin', 'butcher',
  'Thăn nội bò Wagyu A5 (Tenderloin)', 'A5 Wagyu Tenderloin', 'A5 ヒレ精肉',
  null, null, '200g - 500g',
  'Phần thịt mềm nhất của bò Wagyu A5, vân mỡ cẩm thạch mịn màng như bơ. Đóng gói hút chân không kèm đá gel giữ nhiệt.',
  array['Thịt bò Wagyu A5 nhập khẩu chính ngạch', 'Túi hút chân không tiệt trùng', 'Đá gel giữ nhiệt cao cấp']::text[],
  array['Tặng kèm xốt chấm Ponzu hoặc xốt Tare 50ml']::text[],
  array['signature', 'best-seller']::text[], 0
),
(
  'butcher-a5-sirloin', 'butcher',
  'Thăn ngoại bò Wagyu A5 (Sirloin)', 'A5 Wagyu Sirloin', 'A5 サーロイン精肉',
  null, null, '250g - 500g',
  'Phần thăn ngoại kinh điển với dải mỡ viền thơm ngậy, vị ngọt đậm đà đặc trưng. Cắt theo yêu cầu: Steak, nướng Yakiniku hoặc nhúng lẩu.',
  array['Thịt bò Wagyu A5 nhập khẩu', 'Túi hút chân không tiệt trùng']::text[],
  array['Tặng kèm muối hồng tiêu đen Himalaya']::text[],
  array['must-try']::text[], 1
),
(
  'butcher-a5-chuck-roll', 'butcher',
  'Thăn vai bò Wagyu A5 (Chuck Roll)', 'A5 Wagyu Chuck Roll', 'A5 肩ロース精肉',
  null, null, '300g - 500g',
  'Độ mềm và độ giòn cân bằng hoàn hảo, cực kỳ thích hợp cho các bữa tiệc nướng BBQ hoặc nhúng lẩu Shabu Shabu gia đình.',
  array['Thịt bò Wagyu A5 chuẩn nguồn gốc Nhật Bản']::text[],
  array['Tặng kèm sốt ướp Tare chuẩn vị']::text[],
  array['best-seller']::text[], 2
),
(
  'butcher-us-short-ribs', 'butcher',
  'Sườn bò Mỹ rút xương (USDA Prime)', 'US Boneless Short Ribs', '特上カルビ精肉',
  null, null, '150g - 300g',
  'Sườn bò Mỹ loại thượng hạng nhất (Prime), vân mỡ đều, mềm mọng nước khi nướng xém cạnh.',
  array['Thịt sườn bò Mỹ Prime đạt chuẩn USDA']::text[],
  array['Kimchi chuẩn vị Nhật tặng kèm']::text[],
  array['best-seller']::text[], 3
),
(
  'butcher-set-yakiniku-box', 'butcher',
  'Set Nướng Yakiniku Box Tại Nhà (500g)', 'Miyako Yakiniku Home Box', 'おうち焼肉セット',
  1690000, 1950000, 'Hộp 500g (2-3 người)',
  'Hộp nướng cao cấp trọn gói cho 2-3 người ăn tại nhà. Đầy đủ thịt bò cắt sẵn, sốt ướp, sốt chấm và rau ăn kèm.',
  array['200g Thăn vai bò Wagyu A5', '150g Sườn bò Mỹ rút xương Prime', '150g Dẻ sườn bò Mỹ', '1 chai sốt ướp Tare 100ml', 'Hộp Kimchi 150g']::text[],
  array['Túi giữ nhiệt Miyako sang trọng + 2 thanh đá gel']::text[],
  array['signature', 'must-try']::text[], 4
),
(
  'butcher-set-shabu-box', 'butcher',
  'Set Lẩu Wagyu Shabu-Shabu Tại Nhà (500g)', 'Miyako Shabu Shabu Home Box', 'おうちしゃぶしゃぶセット',
  1790000, 2050000, 'Hộp 500g (2-3 người)',
  'Set lẩu thượng hạng với thịt bò Wagyu bào mỏng 1.5mm tan trong miệng, kèm nước cốt lẩu Dashi nguyên chất hầm từ cá ngừ và tảo bẹ Kombu.',
  array['250g Thăn ngoại Wagyu A5 lát mỏng', '250g Thăn vai Wagyu A5 lát mỏng', 'Cốt nước dùng lẩu Dashi 500ml', '1 chai sốt chấm Ponzu 100ml']::text[],
  array['Túi giữ nhiệt Miyako sang trọng + 2 thanh đá gel']::text[],
  array['signature', 'best-seller']::text[], 5
),
(
  'butcher-tare-sauce', 'butcher',
  'Sốt nướng Tare bí truyền Miyako (Chai 250ml)', 'Miyako Signature Tare Sauce', '特製焼肉のタレ',
  125000, null, 'Chai 250ml',
  'Sốt ướp và chấm nướng công thức độc quyền từ bếp trưởng Miyako, ủ từ nước tương Shoyu hảo hạng và rượu Mirin.',
  '{}', '{}', '{}', 6
),
(
  'butcher-ponzu-sauce', 'butcher',
  'Sốt chấm Ponzu thanh mát (Chai 250ml)', 'Miyako Citrus Ponzu Sauce', '特製ポン酢',
  115000, null, 'Chai 250ml',
  'Sốt chấm lẩu và thịt nướng thanh tao với vị chua dịu từ nước cốt chanh Yuzu Nhật Bản.',
  '{}', '{}', '{}', 7
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  includes = excluded.includes,
  gifts = excluded.gifts,
  badges = excluded.badges,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  unit = excluded.unit;

-- 11. Thêm các biến thể cắt thịt (dish_variants) cho các món thịt bò mang về
delete from public.dish_variants where dish_id in (
  'butcher-a5-tenderloin', 'butcher-a5-sirloin', 'butcher-a5-chuck-roll', 'butcher-us-short-ribs'
);

insert into public.dish_variants (dish_id, code, label, price, note, sort_order) values
-- Thăn nội A5
('butcher-a5-tenderloin', 'steak-200', 'Cắt Steak 200g (Dày 2.5cm)', 1580000, '200g miếng dày bơ mềm', 0),
('butcher-a5-tenderloin', 'yaki-200',  'Cắt Nướng Yakiniku 200g (3-4mm)', 1580000, '200g lát nướng vừa ăn', 1),
('butcher-a5-tenderloin', 'shabu-200', 'Cắt Lẩu Shabu 200g (1.5mm)', 1580000, '200g lát mỏng nhúng lẩu', 2),
('butcher-a5-tenderloin', 'block-500', 'Nguyên tảng 500g hút chân không', 3950000, '500g khối nguyên', 3),

-- Thăn ngoại A5
('butcher-a5-sirloin', 'steak-250', 'Cắt Steak 250g (Dày 2.5cm)', 1800000, '250g miếng dày thơm ngậy', 0),
('butcher-a5-sirloin', 'yaki-250',  'Cắt Nướng Yakiniku 250g (3-4mm)', 1800000, '250g lát nướng vừa ăn', 1),
('butcher-a5-sirloin', 'shabu-250', 'Cắt Lẩu Shabu 250g (1.5mm)', 1800000, '250g lát mỏng nhúng lẩu', 2),
('butcher-a5-sirloin', 'block-500', 'Nguyên tảng 500g hút chân không', 3600000, '500g khối nguyên', 3),

-- Thăn vai A5
('butcher-a5-chuck-roll', 'yaki-300',  'Cắt Nướng Yakiniku 300g (3-4mm)', 1560000, '300g lát nướng mềm giòn', 0),
('butcher-a5-chuck-roll', 'shabu-300', 'Cắt Lẩu Shabu 300g (1.5mm)', 1560000, '300g lát mỏng nhúng lẩu', 1),
('butcher-a5-chuck-roll', 'block-500', 'Nguyên tảng 500g hút chân không', 2600000, '500g khối nguyên', 2),

-- Sườn bò Mỹ
('butcher-us-short-ribs', 'yaki-150', 'Cắt Nướng Yakiniku 150g', 320000, 'Khay 150g sườn rút xương', 0),
('butcher-us-short-ribs', 'yaki-300', 'Cắt Nướng Yakiniku 300g', 620000, 'Khay 300g sườn rút xương', 1);

-- >>>>>>>>>> 20260921000002_seats_l_layout.sql

-- ============================================================
-- Xếp lại ghế quầy omakase
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

-- >>>>>>>>>> 20260921000005_loyalty_system.sql

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

-- >>>>>>>>>> 20260921000006_telegram_notifications.sql

-- ============================================================
-- Migration: Telegram Notification Settings & Triggers
-- ============================================================

create table if not exists public.telegram_settings (
  id integer primary key default 1 check (id = 1),
  bot_token text,
  chat_id text,
  notify_order boolean not null default true,
  notify_reservation boolean not null default true,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Dòng mặc định duy nhất id = 1
insert into public.telegram_settings (id, bot_token, chat_id, notify_order, notify_reservation, is_active)
values (1, '', '', true, true, true)
on conflict (id) do nothing;

alter table public.telegram_settings enable row level security;

-- Chỉ nhân viên/quản lý mới có quyền đọc & chỉnh sửa cấu hình Telegram
drop policy if exists "Staff manage telegram settings" on public.telegram_settings;
create policy "Staff manage telegram settings" on public.telegram_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- Tạo RPC lấy cấu hình an toàn cho Staff
create or replace function public.get_telegram_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền xem cấu hình Telegram';
  end if;

  select * into v_rec from public.telegram_settings where id = 1;
  return jsonb_build_object(
    'bot_token', coalesce(v_rec.bot_token, ''),
    'chat_id', coalesce(v_rec.chat_id, ''),
    'notify_order', coalesce(v_rec.notify_order, true),
    'notify_reservation', coalesce(v_rec.notify_reservation, true),
    'is_active', coalesce(v_rec.is_active, true),
    'updated_at', v_rec.updated_at
  );
end;
$$;

create or replace function public.update_telegram_settings(
  p_bot_token text,
  p_chat_id text,
  p_notify_order boolean,
  p_notify_reservation boolean,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền cập nhật cấu hình Telegram';
  end if;

  insert into public.telegram_settings (id, bot_token, chat_id, notify_order, notify_reservation, is_active, updated_at)
  values (1, p_bot_token, p_chat_id, p_notify_order, p_notify_reservation, p_is_active, now())
  on conflict (id) do update set
    bot_token = excluded.bot_token,
    chat_id = excluded.chat_id,
    notify_order = excluded.notify_order,
    notify_reservation = excluded.notify_reservation,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_rec;

  return jsonb_build_object(
    'bot_token', coalesce(v_rec.bot_token, ''),
    'chat_id', coalesce(v_rec.chat_id, ''),
    'notify_order', v_rec.notify_order,
    'notify_reservation', v_rec.notify_reservation,
    'is_active', v_rec.is_active,
    'updated_at', v_rec.updated_at
  );
end;
$$;

grant execute on function public.get_telegram_settings() to authenticated;
grant execute on function public.update_telegram_settings(text, text, boolean, boolean, boolean) to authenticated;

-- >>>>>>>>>> 20260921000007_zalo_oa_system.sql

-- ============================================================
-- Migration: Zalo OA & ZNS Messaging System
-- ============================================================

create table if not exists public.zalo_oa_settings (
  id integer primary key default 1 check (id = 1),
  oa_id text,
  app_id text,
  secret_key text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  zns_template_reservation text,
  zns_template_order text,
  send_mode text not null default 'zns' check (send_mode in ('zns', 'oa_message', 'both')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Tạo bản ghi cấu hình mặc định id = 1
insert into public.zalo_oa_settings (
  id, oa_id, app_id, secret_key, access_token, refresh_token,
  zns_template_reservation, zns_template_order, send_mode, is_active
)
values (1, '', '', '', '', '', '', '', 'zns', true)
on conflict (id) do nothing;

alter table public.zalo_oa_settings enable row level security;

-- Chỉ nhân viên / quản lý được xem và chỉnh sửa cấu hình Zalo OA
drop policy if exists "Staff manage zalo oa settings" on public.zalo_oa_settings;
create policy "Staff manage zalo oa settings" on public.zalo_oa_settings
  for all using (public.is_staff()) with check (public.is_staff());

-- Bảng nhật ký gửi tin nhắn Zalo
create table if not exists public.zalo_notification_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text,
  recipient_zalo_id text,
  event_type text not null, -- 'reservation', 'order', 'test'
  reference_code text,      -- '#RES-XXXX', '#ORD-XXXX'
  send_mode text not null,   -- 'zns', 'oa_message'
  status text not null,      -- 'success', 'failed'
  error_message text,
  response_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists zalo_logs_created_at_idx on public.zalo_notification_logs (created_at desc);
create index if not exists zalo_logs_phone_idx on public.zalo_notification_logs (recipient_phone);

alter table public.zalo_notification_logs enable row level security;

drop policy if exists "Staff read zalo notification logs" on public.zalo_notification_logs;
create policy "Staff read zalo notification logs" on public.zalo_notification_logs
  for select using (public.is_staff());

drop policy if exists "Server insert zalo notification logs" on public.zalo_notification_logs;
create policy "Server insert zalo notification logs" on public.zalo_notification_logs
  for insert with check (true);

-- RPC Lấy cấu hình Zalo OA cho nhân viên
create or replace function public.get_zalo_oa_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền xem cấu hình Zalo OA';
  end if;

  select * into v_rec from public.zalo_oa_settings where id = 1;
  return jsonb_build_object(
    'oa_id', coalesce(v_rec.oa_id, ''),
    'app_id', coalesce(v_rec.app_id, ''),
    'secret_key', coalesce(v_rec.secret_key, ''),
    'access_token', coalesce(v_rec.access_token, ''),
    'refresh_token', coalesce(v_rec.refresh_token, ''),
    'token_expires_at', v_rec.token_expires_at,
    'zns_template_reservation', coalesce(v_rec.zns_template_reservation, ''),
    'zns_template_order', coalesce(v_rec.zns_template_order, ''),
    'send_mode', coalesce(v_rec.send_mode, 'zns'),
    'is_active', coalesce(v_rec.is_active, true),
    'updated_at', v_rec.updated_at
  );
end;
$$;

-- RPC Cập nhật cấu hình Zalo OA từ CMS
create or replace function public.update_zalo_oa_settings(
  p_oa_id text,
  p_app_id text,
  p_secret_key text,
  p_access_token text,
  p_refresh_token text,
  p_zns_template_reservation text,
  p_zns_template_order text,
  p_send_mode text default 'zns',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền cập nhật cấu hình Zalo OA';
  end if;

  insert into public.zalo_oa_settings (
    id, oa_id, app_id, secret_key, access_token, refresh_token,
    zns_template_reservation, zns_template_order, send_mode, is_active, updated_at
  )
  values (
    1, p_oa_id, p_app_id, p_secret_key, p_access_token, p_refresh_token,
    p_zns_template_reservation, p_zns_template_order, p_send_mode, p_is_active, now()
  )
  on conflict (id) do update set
    oa_id = excluded.oa_id,
    app_id = excluded.app_id,
    secret_key = excluded.secret_key,
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    zns_template_reservation = excluded.zns_template_reservation,
    zns_template_order = excluded.zns_template_order,
    send_mode = excluded.send_mode,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_rec;

  return jsonb_build_object(
    'oa_id', coalesce(v_rec.oa_id, ''),
    'app_id', coalesce(v_rec.app_id, ''),
    'secret_key', coalesce(v_rec.secret_key, ''),
    'access_token', coalesce(v_rec.access_token, ''),
    'refresh_token', coalesce(v_rec.refresh_token, ''),
    'token_expires_at', v_rec.token_expires_at,
    'zns_template_reservation', coalesce(v_rec.zns_template_reservation, ''),
    'zns_template_order', coalesce(v_rec.zns_template_order, ''),
    'send_mode', v_rec.send_mode,
    'is_active', v_rec.is_active,
    'updated_at', v_rec.updated_at
  );
end;
$$;

-- RPC Cập nhật Token khi Edge Function refresh tự động
create or replace function public.update_zalo_oa_tokens(
  p_access_token text,
  p_refresh_token text,
  p_expires_in integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.zalo_oa_settings
  set access_token = p_access_token,
      refresh_token = p_refresh_token,
      token_expires_at = now() + (p_expires_in || ' seconds')::interval,
      updated_at = now()
  where id = 1;
end;
$$;

grant execute on function public.get_zalo_oa_settings() to authenticated;
grant execute on function public.update_zalo_oa_settings(text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.update_zalo_oa_tokens(text, text, integer) to service_role, authenticated;

-- >>>>>>>>>> 20260921000011_storage_staff_only.sql

-- ============================================================
-- Chỉ nhân viên mới được tải, sửa, xoá ảnh trong bucket miyako-assets
--
-- Policy cũ tên là "Authenticated users…" nhưng không giới hạn gì ngoài tên
-- bucket, nên áp dụng cho cả vai trò anon. Anon key nằm công khai trong mini
-- app, tức là ai cũng tải file lên hoặc xoá sạch ảnh món ăn được.
--
-- Xem ảnh vẫn công khai như cũ.
-- ============================================================

drop policy if exists "Authenticated users can upload to miyako-assets" on storage.objects;
drop policy if exists "Staff upload miyako-assets" on storage.objects;
create policy "Staff upload miyako-assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'miyako-assets' and public.is_staff());

drop policy if exists "Authenticated users can update miyako-assets" on storage.objects;
drop policy if exists "Staff update miyako-assets" on storage.objects;
create policy "Staff update miyako-assets"
on storage.objects for update
to authenticated
using (bucket_id = 'miyako-assets' and public.is_staff())
with check (bucket_id = 'miyako-assets' and public.is_staff());

drop policy if exists "Authenticated users can delete miyako-assets" on storage.objects;
drop policy if exists "Staff delete miyako-assets" on storage.objects;
create policy "Staff delete miyako-assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'miyako-assets' and public.is_staff());

-- >>>>>>>>>> 20260921000008_telegram_topics.sql

alter table public.telegram_settings
  add column if not exists topic_order text default '',
  add column if not exists topic_reservation text default '',
  add column if not exists topic_omakase text default '',
  add column if not exists topic_loyalty text default '',
  add column if not exists notify_loyalty boolean not null default true;

create or replace function public.get_telegram_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền xem cấu hình Telegram';
  end if;

  select * into v_rec from public.telegram_settings where id = 1;
  return jsonb_build_object(
    'bot_token', coalesce(v_rec.bot_token, ''),
    'chat_id', coalesce(v_rec.chat_id, ''),
    'notify_order', coalesce(v_rec.notify_order, true),
    'notify_reservation', coalesce(v_rec.notify_reservation, true),
    'notify_loyalty', coalesce(v_rec.notify_loyalty, true),
    'topic_order', coalesce(v_rec.topic_order, ''),
    'topic_reservation', coalesce(v_rec.topic_reservation, ''),
    'topic_omakase', coalesce(v_rec.topic_omakase, ''),
    'topic_loyalty', coalesce(v_rec.topic_loyalty, ''),
    'is_active', coalesce(v_rec.is_active, true),
    'updated_at', v_rec.updated_at
  );
end;
$$;

create or replace function public.update_telegram_settings(
  p_bot_token text,
  p_chat_id text,
  p_notify_order boolean,
  p_notify_reservation boolean,
  p_is_active boolean default true,
  p_notify_loyalty boolean default true,
  p_topic_order text default '',
  p_topic_reservation text default '',
  p_topic_omakase text default '',
  p_topic_loyalty text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền cập nhật cấu hình Telegram';
  end if;

  insert into public.telegram_settings (
    id, bot_token, chat_id,
    notify_order, notify_reservation, notify_loyalty,
    topic_order, topic_reservation, topic_omakase, topic_loyalty,
    is_active, updated_at
  )
  values (
    1, p_bot_token, p_chat_id,
    p_notify_order, p_notify_reservation, coalesce(p_notify_loyalty, true),
    coalesce(p_topic_order, ''), coalesce(p_topic_reservation, ''),
    coalesce(p_topic_omakase, ''), coalesce(p_topic_loyalty, ''),
    p_is_active, now()
  )
  on conflict (id) do update set
    bot_token = excluded.bot_token,
    chat_id = excluded.chat_id,
    notify_order = excluded.notify_order,
    notify_reservation = excluded.notify_reservation,
    notify_loyalty = excluded.notify_loyalty,
    topic_order = excluded.topic_order,
    topic_reservation = excluded.topic_reservation,
    topic_omakase = excluded.topic_omakase,
    topic_loyalty = excluded.topic_loyalty,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_rec;

  return jsonb_build_object(
    'bot_token', coalesce(v_rec.bot_token, ''),
    'chat_id', coalesce(v_rec.chat_id, ''),
    'notify_order', v_rec.notify_order,
    'notify_reservation', v_rec.notify_reservation,
    'notify_loyalty', v_rec.notify_loyalty,
    'topic_order', coalesce(v_rec.topic_order, ''),
    'topic_reservation', coalesce(v_rec.topic_reservation, ''),
    'topic_omakase', coalesce(v_rec.topic_omakase, ''),
    'topic_loyalty', coalesce(v_rec.topic_loyalty, ''),
    'is_active', v_rec.is_active,
    'updated_at', v_rec.updated_at
  );
end;
$$;

grant execute on function public.get_telegram_settings() to authenticated;
grant execute on function public.update_telegram_settings(text, text, boolean, boolean, boolean, boolean, text, text, text, text) to authenticated;

commit;
