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
