-- ============================================================
-- Đồng bộ mini app với CMS
--
-- Trước bản này, nhiều thứ khách nhìn thấy nằm cứng trong mã mini app:
-- banner, ảnh trưng bày omakase, lời giới thiệu, hạng thành viên, nhiệm vụ
-- tích điểm, phí giao hàng… CMS có sửa cũng không đổi được gì. Bản này đưa
-- chúng vào CSDL để nhà hàng tự sửa:
--
--   1. restaurant_settings — thêm các câu chữ, ảnh thương hiệu và luật
--      (số khách, giao hàng, tích điểm)
--   2. banners           — thêm bản dịch và màu nền
--   3. content_items     — bảng mới cho các khối nội dung dạng danh sách
--   4. omakase_sets      — nhãn nổi bật và suất chọn sẵn
--   5. dishes            — nhãn lọc (dùng cho các tab của Butcher)
--   6. loyalty_tiers, loyalty_quests — hạng và nhiệm vụ, trước nằm cứng trong
--      hàm SQL; reward_gifts thêm bản dịch và giá trị giảm
--   7. Các hàm tích điểm đọc luật từ bảng thay vì số viết cứng
--   8. create_order nhận mã giảm giá, tự tính phí giao hàng
--   9. create_reservation dùng tiền tố mã do CMS đặt — trước đây đổi tiền tố
--      trong CMS thì SePay không đối soát được bàn mới nào nữa
--  10. zalo_oa_settings — mẫu tin nhắn gửi khách
--  11. translation_status — thêm các bảng mới để dịch bằng AI
--
-- Chạy lại được nhiều lần. Nội dung mặc định nằm ở migration kế tiếp.
-- ============================================================


-- ============================================================
-- 1. restaurant_settings
-- ============================================================
alter table public.restaurant_settings
  -- Ảnh thương hiệu. Để trống thì mini app dùng ảnh đóng gói sẵn.
  add column if not exists logo_url            text,
  add column if not exists logo_dark_url       text,
  add column if not exists logo_wide_url       text,
  add column if not exists logo_wide_dark_url  text,
  add column if not exists cover_image_url     text,
  add column if not exists kanji               text default '都',

  -- Câu chữ khách đọc. Có bản dịch trong cột i18n.
  add column if not exists hours_text          text,
  add column if not exists hotline_hours       text,
  add column if not exists hotline_note        text,
  add column if not exists location_note       text,
  add column if not exists parking_note        text,
  add column if not exists about_counter_text  text,
  add column if not exists about_wagyu_text    text,
  add column if not exists private_room_note   text,
  add column if not exists butcher_title       text,
  add column if not exists butcher_subtitle    text,
  add column if not exists butcher_intro       text,
  add column if not exists butcher_badge       text,
  add column if not exists butcher_guarantee   text,
  add column if not exists delivery_eta_text   text,

  -- Đặt bàn. Hai luật cuối trước nằm cứng trong mini app: gọi món chỉ đặt
  -- được ca tối, và quầy itamae chỉ dành cho khách omakase.
  add column if not exists min_guests          integer not null default 1,
  add column if not exists max_guests          integer not null default 20,
  add column if not exists alacarte_services   text[] not null default '{dinner}',
  add column if not exists counter_omakase_only boolean not null default true,

  -- Mang về & giao hàng
  add column if not exists takeout_enabled     boolean not null default true,
  add column if not exists delivery_enabled    boolean not null default true,
  add column if not exists delivery_fee        integer not null default 0,
  add column if not exists free_delivery_min   integer,

  -- Tích điểm
  add column if not exists welcome_points      integer not null default 50,
  add column if not exists point_value         integer not null default 1000;

alter table public.restaurant_settings
  drop constraint if exists restaurant_settings_guests_check,
  drop constraint if exists restaurant_settings_delivery_check,
  drop constraint if exists restaurant_settings_points_check,
  drop constraint if exists restaurant_settings_prefix_check,
  drop constraint if exists restaurant_settings_alacarte_check;

alter table public.restaurant_settings
  add constraint restaurant_settings_guests_check
    check (min_guests >= 1 and max_guests >= min_guests and max_guests <= 100),
  add constraint restaurant_settings_delivery_check
    check (delivery_fee >= 0 and (free_delivery_min is null or free_delivery_min >= 0)),
  add constraint restaurant_settings_points_check
    check (welcome_points >= 0 and point_value > 0),
  add constraint restaurant_settings_alacarte_check
    check (alacarte_services <@ array['lunch', 'dinner']::text[]);

-- Tiền tố mã đặt bàn đi thẳng vào biểu thức chính quy khi đối soát SePay, nên
-- chỉ nhận chữ in hoa và số. Chuẩn hoá giá trị cũ trước khi đặt ràng buộc.
update public.restaurant_settings
set payment_prefix = coalesce(
  nullif(upper(regexp_replace(payment_prefix, '[^A-Za-z0-9]', '', 'g')), ''),
  'MY'
)
where payment_prefix !~ '^[A-Z0-9]{2,8}$';

alter table public.restaurant_settings
  add constraint restaurant_settings_prefix_check
    check (payment_prefix ~ '^[A-Z0-9]{2,8}$');

comment on column public.restaurant_settings.hours_text is
  'Giờ mở cửa hiển thị cho khách. Để trống thì mini app tự ghép từ opening_hours.';
comment on column public.restaurant_settings.point_value is
  'Bao nhiêu đồng tiêu dùng thì đổi được 1 điểm, trước khi nhân tỷ lệ của hạng.';

-- Băm bản gốc tiếng Việt: thêm các câu chữ mới vào.
--
-- Đổi hàm băm làm mọi bản dịch cũ trông như "bản gốc đã đổi". Ghi lại dòng
-- nào đang khớp trước khi đổi, để sau đó đánh dấu khớp lại — nếu không, CMS
-- sẽ báo cấu hình cần dịch lại dù chưa ai sửa gì.
create temporary table _settings_i18n_ok on commit drop as
  select id from public.restaurant_settings
  where i18n_hash is not distinct from i18n_src_hash;

create or replace function public.i18n_src_restaurant_settings(r public.restaurant_settings)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    coalesce(r.tagline, ''),
    coalesce(r.menu_price_note, ''),
    coalesce(r.cancellation_policy, ''),
    coalesce(r.hours_text, ''),
    coalesce(r.hotline_hours, ''),
    coalesce(r.hotline_note, ''),
    coalesce(r.location_note, ''),
    coalesce(r.parking_note, ''),
    coalesce(r.about_counter_text, ''),
    coalesce(r.about_wagyu_text, ''),
    coalesce(r.private_room_note, ''),
    coalesce(r.butcher_title, ''),
    coalesce(r.butcher_subtitle, ''),
    coalesce(r.butcher_intro, ''),
    coalesce(r.butcher_badge, ''),
    coalesce(r.butcher_guarantee, ''),
    coalesce(r.delivery_eta_text, '')
  ));
$$;

-- Tính lại băm. Trigger chạy trên mỗi update nên chỉ cần chạm vào dòng.
update public.restaurant_settings set id = id;
update public.restaurant_settings
set i18n_hash = i18n_src_hash
where id in (select id from _settings_i18n_ok);


-- ============================================================
-- Khuôn trigger băm bản dịch cho các bảng mới
--
-- Giống hệt trigger của 20260920000008_i18n.sql, chỉ khác hàm băm. Viết một
-- lần dưới dạng hàm chung nhận tên hàm băm qua đối số trigger.
-- ============================================================
create or replace function public.i18n_touch_generic()
returns trigger
language plpgsql
as $$
declare
  v_hash text;
begin
  execute format('select public.%I($1)', tg_argv[0]) into v_hash using new;
  new.i18n_src_hash := v_hash;

  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;


-- ============================================================
-- 2. banners — bản dịch và màu nền
-- ============================================================
alter table public.banners
  add column if not exists accent        text,
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

comment on column public.banners.accent is
  'Màu phủ lên ảnh để chữ dễ đọc, dạng #rrggbb. Để trống = đen.';
comment on column public.banners.cta_link is
  'Trang mở khi bấm, ví dụ /omakase, /menu, /butcher?tab=wagyu, /booking.';

alter table public.banners drop constraint if exists banners_accent_check;
alter table public.banners add constraint banners_accent_check
  check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$');

create or replace function public.i18n_src_banners(r public.banners)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.title,
    coalesce(r.subtitle, ''),
    coalesce(r.tag, ''),
    coalesce(r.cta_text, '')
  ));
$$;

drop trigger if exists banners_i18n on public.banners;
create trigger banners_i18n
  before insert or update on public.banners
  for each row execute function public.i18n_touch_generic('i18n_src_banners');

update public.banners set id = id where i18n_src_hash is null;


-- ============================================================
-- 3. content_items — khối nội dung dạng danh sách
--
-- Một bảng cho mọi danh sách nhỏ trên các trang: gợi ý tìm kiếm, tab món
-- trang chủ, cam kết dịch vụ, ưu đãi, trình tự omakase, ảnh trưng bày,
-- thông số ủ thịt, tab và cam kết của Butcher. Mỗi `section` dùng một phần
-- các cột; CMS đặt tên từng ô theo section.
--
--   key      mã máy: tên biểu tượng, mã lọc, loại ảnh — không dịch
--   jp       chữ Nhật hoặc romaji in sẵn — không dịch
--   meta     thông tin phụ theo section, ví dụ các nhóm món của một tab
-- ============================================================
create table if not exists public.content_items (
  id            uuid primary key default gen_random_uuid(),
  section       text not null,
  key           text,
  title         text not null default '',
  subtitle      text,
  body          text,
  tag           text,
  jp            text,
  image_url     text,
  link          text,
  meta          jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  i18n          jsonb not null default '{}'::jsonb,
  i18n_hash     text,
  i18n_src_hash text,
  i18n_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.content_items drop constraint if exists content_items_section_check;
alter table public.content_items add constraint content_items_section_check
  check (section in (
    'home_search', 'menu_search', 'butcher_search',
    'home_tab', 'home_promo', 'home_highlight', 'home_offer',
    'omakase_step', 'omakase_gallery',
    'about_spec',
    'butcher_tab', 'butcher_cut', 'butcher_promise'
  ));

alter table public.content_items drop constraint if exists content_items_meta_check;
alter table public.content_items add constraint content_items_meta_check
  check (jsonb_typeof(meta) = 'object');

create index if not exists content_items_section_idx
  on public.content_items (section, sort_order);

comment on table public.content_items is
  'Khối nội dung dạng danh sách trên các trang mini app. Xem migration 20260921000009.';

create or replace function public.i18n_src_content_items(r public.content_items)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.title,
    coalesce(r.subtitle, ''),
    coalesce(r.body, ''),
    coalesce(r.tag, '')
  ));
$$;

drop trigger if exists content_items_i18n on public.content_items;
create trigger content_items_i18n
  before insert or update on public.content_items
  for each row execute function public.i18n_touch_generic('i18n_src_content_items');

alter table public.content_items enable row level security;

drop policy if exists "content readable by everyone" on public.content_items;
create policy "content readable by everyone" on public.content_items
  for select using (true);

drop policy if exists "managers write content" on public.content_items;
create policy "managers write content" on public.content_items
  for all using (public.is_manager()) with check (public.is_manager());


-- ============================================================
-- 4. omakase_sets — nhãn nổi bật và suất chọn sẵn
-- ============================================================
alter table public.omakase_sets
  add column if not exists badge       text,
  add column if not exists is_featured boolean not null default false;

comment on column public.omakase_sets.badge is
  'Nhãn nhỏ trên thẻ suất, ví dụ "Được chọn nhiều nhất". Để trống = không hiện.';
comment on column public.omakase_sets.is_featured is
  'Suất được chọn sẵn khi khách mở trang Omakase.';

create temporary table _omakase_i18n_ok on commit drop as
  select id from public.omakase_sets
  where i18n_hash is not distinct from i18n_src_hash;

create or replace function public.i18n_src_omakase_sets(r public.omakase_sets)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.name,
    coalesce(r.jp, ''),
    coalesce(r.subtitle, ''),
    coalesce(r.description, ''),
    coalesce(r.badge, '')
  ));
$$;

-- Chưa có nhãn nào nên băm của các suất không đổi; vẫn tính lại cho chắc.
update public.omakase_sets set id = id;
update public.omakase_sets
set i18n_hash = i18n_src_hash
where id in (select id from _omakase_i18n_ok)
  and coalesce(badge, '') = '';


-- ============================================================
-- 5. dishes — nhãn lọc
--
-- Tab của trang Butcher trước đây đoán món thuộc tab nào bằng cách dò chuỗi
-- trong mã món ("a5", "us", "set"…). Mã món sinh từ tên và không sửa được,
-- nên món mới hay rơi sai tab. Giờ món mang nhãn, tab lọc theo nhãn.
-- ============================================================
alter table public.dishes
  add column if not exists tags text[] not null default '{}';

comment on column public.dishes.tags is
  'Nhãn lọc, ví dụ {wagyu} — khớp với mã của tab Butcher (content_items.key).';


-- ============================================================
-- 6. Tích điểm — hạng, nhiệm vụ, quà
-- ============================================================
create table if not exists public.loyalty_tiers (
  code          text primary key
                check (code in ('bronze', 'silver', 'gold', 'diamond')),
  name          text not null,
  min_points    integer not null default 0 check (min_points >= 0),
  earn_rate     numeric(5,4) not null default 0.03
                check (earn_rate >= 0 and earn_rate <= 1),
  color         text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  perks         text[] not null default '{}',
  sort_order    integer not null default 0,
  i18n          jsonb not null default '{}'::jsonb,
  i18n_hash     text,
  i18n_src_hash text,
  i18n_at       timestamptz,
  updated_at    timestamptz not null default now()
);

comment on table public.loyalty_tiers is
  'Bốn hạng cố định. Nhà hàng sửa tên, mốc điểm, tỷ lệ tích và quyền lợi.';

create or replace function public.i18n_src_loyalty_tiers(r public.loyalty_tiers)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.name, array_to_string(r.perks, E'\x1f')));
$$;

drop trigger if exists loyalty_tiers_i18n on public.loyalty_tiers;
create trigger loyalty_tiers_i18n
  before insert or update on public.loyalty_tiers
  for each row execute function public.i18n_touch_generic('i18n_src_loyalty_tiers');

create table if not exists public.loyalty_quests (
  id            text primary key,
  title         text not null,
  description   text,
  points        integer not null check (points > 0),
  icon          text,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  i18n          jsonb not null default '{}'::jsonb,
  i18n_hash     text,
  i18n_src_hash text,
  i18n_at       timestamptz,
  updated_at    timestamptz not null default now()
);

comment on table public.loyalty_quests is
  'Nhiệm vụ nhận điểm, mỗi nhiệm vụ nhận được một lần mỗi ngày.';

create or replace function public.i18n_src_loyalty_quests(r public.loyalty_quests)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.title, coalesce(r.description, '')));
$$;

drop trigger if exists loyalty_quests_i18n on public.loyalty_quests;
create trigger loyalty_quests_i18n
  before insert or update on public.loyalty_quests
  for each row execute function public.i18n_touch_generic('i18n_src_loyalty_quests');

alter table public.loyalty_tiers  enable row level security;
alter table public.loyalty_quests enable row level security;

drop policy if exists "content readable by everyone" on public.loyalty_tiers;
create policy "content readable by everyone" on public.loyalty_tiers
  for select using (true);
drop policy if exists "managers write content" on public.loyalty_tiers;
create policy "managers write content" on public.loyalty_tiers
  for all using (public.is_manager()) with check (public.is_manager());

drop policy if exists "content readable by everyone" on public.loyalty_quests;
create policy "content readable by everyone" on public.loyalty_quests
  for select using (true);
drop policy if exists "managers write content" on public.loyalty_quests;
create policy "managers write content" on public.loyalty_quests
  for all using (public.is_manager()) with check (public.is_manager());

-- Quà đổi điểm: bản dịch, và giá trị giảm cho quà loại voucher.
-- Trước đây giỏ hàng đoán số tiền giảm bằng cách đọc chữ "50k"/"100k" trong
-- tên quà; đổi tên quà là đổi luôn số tiền.
alter table public.reward_gifts
  add column if not exists discount_value  integer,
  add column if not exists min_order_value integer not null default 0,
  add column if not exists i18n            jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash       text,
  add column if not exists i18n_src_hash   text,
  add column if not exists i18n_at         timestamptz;

alter table public.reward_gifts drop constraint if exists reward_gifts_discount_check;
alter table public.reward_gifts add constraint reward_gifts_discount_check
  check ((discount_value is null or discount_value > 0) and min_order_value >= 0);

comment on column public.reward_gifts.discount_value is
  'Số tiền trừ vào đơn khi khách dùng mã đổi được. Chỉ dùng cho quà loại voucher.';

create or replace function public.i18n_src_reward_gifts(r public.reward_gifts)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.title,
    coalesce(r.description, ''),
    coalesce(r.worth_text, ''),
    coalesce(r.badge, '')
  ));
$$;

drop trigger if exists reward_gifts_i18n on public.reward_gifts;
create trigger reward_gifts_i18n
  before insert or update on public.reward_gifts
  for each row execute function public.i18n_touch_generic('i18n_src_reward_gifts');

update public.reward_gifts set id = id where i18n_src_hash is null;

-- Giá trị giảm của ba voucher có sẵn — đúng con số in trong tên của chúng.
update public.reward_gifts set discount_value = 50000
  where id = 'gift-v50' and discount_value is null;
update public.reward_gifts set discount_value = 100000, min_order_value = 500000
  where id = 'gift-v100' and discount_value is null;
update public.reward_gifts set discount_value = 200000
  where id = 'gift-v200' and discount_value is null;

-- Khách chỉ đọc quà đang bật. Policy cũ cho đọc cả quà đã tắt.
drop policy if exists "Anyone read active reward gifts" on public.reward_gifts;
create policy "Anyone read active reward gifts" on public.reward_gifts
  for select using (is_active or public.is_staff());


-- ============================================================
-- 7. Luật tích điểm đọc từ bảng
-- ============================================================

-- Hạng ứng với một số điểm: hạng có mốc cao nhất mà khách đã đạt.
create or replace function public.tier_for_points(p_points integer)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select code from public.loyalty_tiers
     where min_points <= greatest(coalesce(p_points, 0), 0)
     order by min_points desc
     limit 1),
    'bronze'
  );
$$;

create or replace function public.calc_tier_rate(p_tier text)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select earn_rate from public.loyalty_tiers
     where code = lower(case when p_tier = 'platinum' then 'diamond' else coalesce(p_tier, 'bronze') end)),
    0.03
  );
$$;

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
  v_cust    public.customers;
  v_welcome integer;
begin
  if p_zalo_id is null or trim(p_zalo_id) = '' then
    raise exception 'Zalo ID không được để trống';
  end if;

  select * into v_cust from public.customers where zalo_id = p_zalo_id;

  if not found then
    select coalesce(welcome_points, 0) into v_welcome
    from public.restaurant_settings where id = 1;
    v_welcome := coalesce(v_welcome, 0);

    insert into public.customers (
      zalo_id, name, phone, avatar_url, points, tier, total_spent, visit_count
    )
    values (
      p_zalo_id,
      coalesce(nullif(trim(p_name), ''), 'Quý Khách'),
      nullif(trim(p_phone), ''),
      p_avatar_url,
      v_welcome,
      public.tier_for_points(v_welcome),
      0,
      0
    )
    returning * into v_cust;

    if v_welcome > 0 then
      insert into public.customer_points_ledger (customer_id, amount, balance, reason)
      values (v_cust.id, v_welcome, v_welcome, 'Thưởng chào mừng thành viên mới');
    end if;
  else
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

grant execute on function public.get_or_create_customer(text, text, text, text) to anon, authenticated;

create or replace function public.adjust_customer_points(
  p_customer_id uuid,
  p_amount      integer,
  p_reason      text
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cust       public.customers;
  v_new_points integer;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới có quyền điều chỉnh điểm';
  end if;

  select * into v_cust from public.customers where id = p_customer_id for update;
  if not found then
    raise exception 'Không tìm thấy khách hàng';
  end if;

  v_new_points := greatest(v_cust.points + p_amount, 0);

  update public.customers
  set points = v_new_points,
      tier = public.tier_for_points(v_new_points),
      updated_at = now()
  where id = p_customer_id
  returning * into v_cust;

  insert into public.customer_points_ledger (customer_id, amount, balance, reason, created_by)
  values (p_customer_id, p_amount, v_new_points, p_reason, auth.uid());

  return v_cust;
end;
$$;

create or replace function public.complete_order_and_credit_points(
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      public.orders;
  v_cust       public.customers;
  v_points     integer;
  v_new_points integer;
  v_rate       numeric;
  v_value      integer;
  v_base       integer;
begin
  -- Hàm này cộng điểm và đánh dấu đã thu tiền, nên chỉ nhân viên được gọi.
  -- Bản cũ cấp quyền cho cả anon: ai có mã đơn cũng tự cộng điểm được.
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới hoàn tất được đơn';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy đơn hàng');
  end if;

  if v_order.customer_id is not null then
    select * into v_cust from public.customers where id = v_order.customer_id for update;
  elsif v_order.zalo_id is not null then
    select * into v_cust from public.customers where zalo_id = v_order.zalo_id for update;
  elsif v_order.customer_phone is not null then
    select * into v_cust from public.customers where phone = v_order.customer_phone for update;
  end if;

  if v_order.points_credited then
    update public.orders
    set status = 'completed', payment_status = 'paid', updated_at = now()
    where id = p_order_id;
    return jsonb_build_object(
      'success', true,
      'already_credited', true,
      'points_earned', v_order.points_earned
    );
  end if;

  -- Tích điểm trên số tiền món thực trả, sau khi trừ giảm giá.
  v_base := greatest(coalesce(v_order.subtotal, 0) - coalesce(v_order.discount_amount, 0), 0);

  if v_cust.id is not null and v_base > 0 then
    v_rate := public.calc_tier_rate(v_cust.tier);
    select coalesce(point_value, 1000) into v_value
    from public.restaurant_settings where id = 1;
    v_value := greatest(coalesce(v_value, 1000), 1);

    v_points := greatest(round((v_base * v_rate) / v_value)::integer, 1);
    v_new_points := v_cust.points + v_points;

    update public.customers
    set points = v_new_points,
        tier = public.tier_for_points(v_new_points),
        total_spent = total_spent + v_base,
        visit_count = visit_count + 1,
        last_visit = now(),
        updated_at = now()
    where id = v_cust.id;

    insert into public.customer_points_ledger (customer_id, amount, balance, reason, order_id)
    values (
      v_cust.id, v_points, v_new_points,
      'Tích ' || round(v_rate * 100, 1)::text || '% từ đơn ' || v_order.code,
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

revoke execute on function public.complete_order_and_credit_points(uuid) from public, anon;
grant execute on function public.complete_order_and_credit_points(uuid) to authenticated;

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
  v_cust       public.customers;
  v_quest      public.loyalty_quests;
  v_new_points integer;
begin
  select * into v_cust from public.customers where zalo_id = p_zalo_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Không tìm thấy hồ sơ thành viên');
  end if;

  select * into v_quest from public.loyalty_quests where id = p_quest_id and is_active;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Nhiệm vụ không tồn tại hoặc đã tạm dừng');
  end if;

  if exists (
    select 1 from public.customer_quests
    where customer_id = v_cust.id
      and quest_id = p_quest_id
      and quest_date = (public.restaurant_now())::date
  ) then
    return jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'error', 'Bạn đã nhận thưởng nhiệm vụ "' || v_quest.title || '" hôm nay rồi. Hãy quay lại vào ngày mai nhé!'
    );
  end if;

  insert into public.customer_quests (customer_id, quest_id, quest_date, points_reward, extra_info)
  values (v_cust.id, p_quest_id, (public.restaurant_now())::date, v_quest.points, p_extra_info);

  v_new_points := v_cust.points + v_quest.points;

  update public.customers
  set points = v_new_points,
      tier = public.tier_for_points(v_new_points),
      updated_at = now()
  where id = v_cust.id;

  insert into public.customer_points_ledger (customer_id, amount, balance, reason)
  values (v_cust.id, v_quest.points, v_new_points, 'Thưởng nhiệm vụ: ' || v_quest.title);

  return jsonb_build_object(
    'success', true,
    'points_reward', v_quest.points,
    'new_balance', v_new_points,
    'title', v_quest.title
  );
end;
$$;

grant execute on function public.claim_quest_reward(text, text, text) to anon, authenticated;

-- Nhiệm vụ khách đã nhận hôm nay, để mini app tô xám nút.
create or replace function public.get_customer_quests_today(p_zalo_id text)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(q.quest_id), '{}')
  from public.customer_quests q
  join public.customers c on c.id = q.customer_id
  where c.zalo_id = p_zalo_id
    and q.quest_date = (public.restaurant_now())::date;
$$;

grant execute on function public.get_customer_quests_today(text) to anon, authenticated;

-- Voucher của khách: trả thêm giá trị giảm để giỏ hàng khỏi đoán.
drop function if exists public.get_customer_vouchers(text);
create or replace function public.get_customer_vouchers(
  p_zalo_id text
)
returns table (
  id              uuid,
  code            text,
  gift_id         text,
  gift_title      text,
  gift_category   text,
  worth_text      text,
  discount_value  integer,
  min_order_value integer,
  status          text,
  created_at      timestamptz,
  used_at         timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    vr.id,
    vr.code,
    vr.gift_id,
    coalesce(rg.title, 'Ưu đãi đổi điểm'),
    coalesce(rg.category, 'voucher'),
    rg.worth_text,
    rg.discount_value,
    coalesce(rg.min_order_value, 0),
    vr.status,
    vr.created_at,
    vr.used_at
  from public.voucher_redemptions vr
  join public.customers c on c.id = vr.customer_id
  left join public.reward_gifts rg on rg.id = vr.gift_id
  where c.zalo_id = p_zalo_id
  order by vr.created_at desc;
$$;

grant execute on function public.get_customer_vouchers(text) to anon, authenticated;

-- Lịch sử điểm của khách. Mini app chạy bằng vai trò anon, mà bảng sổ cái
-- không cho anon đọc, nên trước đây trang Tích điểm luôn nhận về rỗng.
create or replace function public.get_customer_points_ledger(
  p_zalo_id text,
  p_limit   integer default 50
)
returns table (
  id         uuid,
  amount     integer,
  balance    integer,
  reason     text,
  order_id   uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.amount, l.balance, l.reason, l.order_id, l.created_at
  from public.customer_points_ledger l
  join public.customers c on c.id = l.customer_id
  where c.zalo_id = p_zalo_id
  order by l.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

grant execute on function public.get_customer_points_ledger(text, integer) to anon, authenticated;

-- Hai policy cũ mở toang cho anon:
--   customer_quests "Service manage quests" — ai cũng thêm, sửa, xoá được,
--     tức là tự ghi lượt nhận thưởng hoặc xoá để nhận lại.
--   voucher_redemptions "Customers read their redemptions" — ai cũng đọc được
--     mọi mã RD- của mọi khách rồi đem dùng.
-- Khách đi qua các hàm security definer ở trên nên không cần quyền trực tiếp.
drop policy if exists "Service manage quests" on public.customer_quests;
drop policy if exists "Customers read their quests" on public.customer_quests;
drop policy if exists "Staff read quests" on public.customer_quests;
create policy "Staff read quests" on public.customer_quests
  for select using (public.is_staff());

drop policy if exists "Customers read their redemptions" on public.voucher_redemptions;


-- ============================================================
-- 8. create_order — mã giảm giá và phí giao hàng
--
-- Hai thay đổi:
--   · p_voucher_code: mã đổi điểm của khách (RD-…) hoặc mã khuyến mãi tạo
--     trong CMS. Máy chủ tự kiểm tra và tính số tiền giảm.
--   · Phí giao hàng lấy từ cấu hình, không lấy số client gửi lên.
-- Bỏ bản 12 tham số để PostgREST không phải chọn giữa hai bản (PGRST203).
-- ============================================================
drop function if exists public.create_order(jsonb, text, text, uuid, text, text, text, text, text, text, text, integer);

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
  p_delivery_fee     integer default 0,
  p_voucher_code     text default null
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
  v_settings    public.restaurant_settings;
  v_fee         integer := 0;
  v_voucher     text := nullif(upper(trim(coalesce(p_voucher_code, ''))), '');
  v_discount    integer := 0;
  v_redemption  public.voucher_redemptions;
  v_gift        public.reward_gifts;
  v_promo       public.vouchers;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Đơn không có món nào';
  end if;
  if jsonb_array_length(p_lines) > 100 then
    raise exception 'Đơn quá nhiều dòng';
  end if;

  select * into v_settings from public.restaurant_settings where id = 1;

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
    if not coalesce(v_settings.takeout_enabled, true) then
      raise exception 'Nhà hàng đang tạm ngừng nhận đơn mang về';
    end if;
    if nullif(trim(p_customer_name), '') is null or nullif(trim(p_customer_phone), '') is null then
      raise exception 'Vui lòng cung cấp họ tên và số điện thoại người nhận';
    end if;
  elsif p_mode = 'delivery' then
    if not coalesce(v_settings.delivery_enabled, true) then
      raise exception 'Nhà hàng đang tạm ngừng giao hàng';
    end if;
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
    0,
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

  -- Phí giao hàng theo cấu hình; miễn phí khi đơn đạt ngưỡng. Nhân viên tạo
  -- đơn trong CMS thì được ghi phí tay (giao xa, giao gấp…), khách thì không.
  if p_mode = 'delivery' then
    if public.is_staff() then
      v_fee := greatest(coalesce(p_delivery_fee, 0), 0);
    else
      v_fee := coalesce(v_settings.delivery_fee, 0);
      if v_settings.free_delivery_min is not null and v_subtotal >= v_settings.free_delivery_min then
        v_fee := 0;
      end if;
    end if;
  end if;

  -- Mã giảm giá. Thử mã đổi điểm của chính khách trước, rồi tới mã khuyến mãi.
  if v_voucher is not null then
    select vr.* into v_redemption
    from public.voucher_redemptions vr
    where upper(vr.code) = v_voucher
    for update;

    if found then
      if v_redemption.status <> 'active' then
        raise exception 'Mã % đã được dùng hoặc đã hết hạn', v_voucher;
      end if;
      if v_customer_id is null or v_redemption.customer_id is distinct from v_customer_id then
        raise exception 'Mã % không thuộc tài khoản của bạn', v_voucher;
      end if;
      select * into v_gift from public.reward_gifts where id = v_redemption.gift_id;
      if v_gift.discount_value is null then
        raise exception 'Mã % là quà tặng tại quán, không trừ vào đơn được. Hãy đưa mã cho nhân viên.', v_voucher;
      end if;
      if v_subtotal < coalesce(v_gift.min_order_value, 0) then
        raise exception 'Mã % áp dụng cho đơn từ %đ', v_voucher, to_char(v_gift.min_order_value, 'FM999G999G999');
      end if;
      v_discount := least(v_gift.discount_value, v_subtotal);

      update public.voucher_redemptions
      set status = 'used', used_at = now(), order_id = v_order.id
      where id = v_redemption.id;
    else
      select * into v_promo
      from public.vouchers
      where upper(code) = v_voucher
      for update;

      if not found or not v_promo.is_active then
        raise exception 'Mã giảm giá % không hợp lệ', v_voucher;
      end if;
      if v_promo.expires_at is not null and v_promo.expires_at < now() then
        raise exception 'Mã % đã hết hạn', v_voucher;
      end if;
      if v_promo.usage_limit is not null and v_promo.used_count >= v_promo.usage_limit then
        raise exception 'Mã % đã hết lượt dùng', v_voucher;
      end if;
      if v_subtotal < coalesce(v_promo.min_order_value, 0) then
        raise exception 'Mã % áp dụng cho đơn từ %đ', v_voucher, to_char(v_promo.min_order_value, 'FM999G999G999');
      end if;

      if v_promo.discount_type = 'percent' then
        v_discount := floor(v_subtotal * v_promo.discount_value / 100.0)::integer;
        if v_promo.max_discount is not null then
          v_discount := least(v_discount, v_promo.max_discount);
        end if;
      else
        v_discount := v_promo.discount_value;
      end if;
      v_discount := least(v_discount, v_subtotal);

      update public.vouchers set used_count = used_count + 1 where id = v_promo.id;
    end if;
  end if;

  update public.orders
  set subtotal = v_subtotal,
      delivery_fee = v_fee,
      discount_amount = v_discount,
      voucher_code = v_voucher
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_order(jsonb, text, text, uuid, text, text, text, text, text, text, text, integer, text) to anon, authenticated;

-- Tra cứu đơn: trả thêm giảm giá để khách thấy đúng số tiền phải trả.
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
    'discount_amount', v_order.discount_amount,
    'voucher_code', v_order.voucher_code,
    'note', v_order.note,
    'customer_name', v_order.customer_name,
    'customer_phone', v_order.customer_phone,
    'delivery_address', v_order.delivery_address,
    'delivery_time', v_order.delivery_time,
    'delivery_fee', v_order.delivery_fee,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'points_earned', v_order.points_earned,
    'created_at', v_order.created_at,
    'lines', v_lines
  );
end;
$$;

grant execute on function public.get_order_by_code(text) to anon, authenticated;


-- ============================================================
-- 9. Đặt bàn — tiền tố mã và số khách theo cấu hình
-- ============================================================
create or replace function public.reservation_code_prefix()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select upper(payment_prefix) from public.restaurant_settings where id = 1),
    'MY'
  );
$$;

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
  v_settings     public.restaurant_settings;
  v_deposit_rate numeric;
  v_deposit      integer := 0;
  v_customer_id  uuid;
  v_code         text;
  v_prefix       text := public.reservation_code_prefix();
  v_row          public.reservations;
  v_now          timestamp := public.restaurant_now();
  v_lead_hours   integer;
  v_earliest     timestamp;
begin
  select * into v_settings from public.restaurant_settings where id = 1;

  if p_guests is null
     or p_guests < coalesce(v_settings.min_guests, 1)
     or p_guests > coalesce(v_settings.max_guests, 40) then
    raise exception 'Số khách phải từ % đến %. Đoàn đông hơn xin gọi hotline.',
      coalesce(v_settings.min_guests, 1), coalesce(v_settings.max_guests, 40);
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Thiếu tên hoặc số điện thoại';
  end if;
  if (p_date + p_time) < v_now then
    raise exception 'Không đặt bàn cho thời điểm đã qua';
  end if;

  v_deposit_rate := coalesce(v_settings.deposit_rate, 0.5);

  if p_purpose = 'omakase' then
    select * into v_set
    from public.omakase_sets
    where id = p_omakase_set_id and is_active;

    if not found then
      raise exception 'Suất omakase không tồn tại hoặc đã ngừng phục vụ';
    end if;

    v_lead_hours := coalesce(v_settings.omakase_lead_hours, 0);

    if v_lead_hours > 0 then
      v_earliest := v_now + make_interval(hours => v_lead_hours);
      if (p_date + p_time) < v_earliest then
        raise exception 'Suất omakase cần đặt trước ít nhất % giờ. Sớm nhất có thể đặt: % ngày %.',
          v_lead_hours,
          to_char(v_earliest, 'HH24:MI'),
          to_char(v_earliest, 'DD/MM');
      end if;
    end if;

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
    v_code := public.make_code(v_prefix);
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
  v_prefix       text := public.reservation_code_prefix();
  v_row          public.reservations;
begin
  if not public.is_staff() then
    raise exception 'Chỉ nhân viên mới tạo được đặt bàn ở đây';
  end if;

  -- Nhân viên nhận cả đoàn lớn qua điện thoại nên không bị giới hạn như khách.
  if p_guests is null or p_guests < 1 or p_guests > 200 then
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
    v_code := public.make_code(v_prefix);
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


-- ============================================================
-- 10. Mẫu tin nhắn Zalo OA gửi khách
--
-- Để trống thì Edge Function dùng mẫu mặc định. Các chỗ trống điền được:
--   đặt bàn: {name} {code} {date} {time} {guests} {set} {seats} {deposit} {hotline} {restaurant}
--   đơn món: {name} {code} {mode} {total} {hotline} {restaurant}
-- ============================================================
alter table public.zalo_oa_settings
  add column if not exists msg_reservation text,
  add column if not exists msg_order       text;


-- ============================================================
-- 11. Bảng theo dõi việc dịch
-- ============================================================
create or replace view public.translation_status
with (security_invoker = true) as
  select 'categories'      as entity, c.id::text as id, c.name     as label,
         c.i18n_hash is distinct from c.i18n_src_hash as stale,
         c.i18n ? 'en' as has_en, c.i18n ? 'ja' as has_ja
    from public.categories c
  union all
  select 'dishes', d.id::text, d.name,
         d.i18n_hash is distinct from d.i18n_src_hash, d.i18n ? 'en', d.i18n ? 'ja'
    from public.dishes d
  union all
  select 'dish_variants', v.id::text, v.label,
         v.i18n_hash is distinct from v.i18n_src_hash, v.i18n ? 'en', v.i18n ? 'ja'
    from public.dish_variants v
  union all
  select 'omakase_sets', s.id::text, s.name,
         s.i18n_hash is distinct from s.i18n_src_hash, s.i18n ? 'en', s.i18n ? 'ja'
    from public.omakase_sets s
  union all
  select 'omakase_courses', o.id::text, o.section,
         o.i18n_hash is distinct from o.i18n_src_hash, o.i18n ? 'en', o.i18n ? 'ja'
    from public.omakase_courses o
  union all
  select 'restaurant_settings', r.id::text, r.name,
         r.i18n_hash is distinct from r.i18n_src_hash, r.i18n ? 'en', r.i18n ? 'ja'
    from public.restaurant_settings r
  union all
  select 'banners', b.id::text, b.title,
         b.i18n_hash is distinct from b.i18n_src_hash, b.i18n ? 'en', b.i18n ? 'ja'
    from public.banners b
  union all
  select 'content_items', ci.id::text, ci.title,
         ci.i18n_hash is distinct from ci.i18n_src_hash, ci.i18n ? 'en', ci.i18n ? 'ja'
    from public.content_items ci
  union all
  select 'loyalty_tiers', lt.code, lt.name,
         lt.i18n_hash is distinct from lt.i18n_src_hash, lt.i18n ? 'en', lt.i18n ? 'ja'
    from public.loyalty_tiers lt
  union all
  select 'loyalty_quests', lq.id, lq.title,
         lq.i18n_hash is distinct from lq.i18n_src_hash, lq.i18n ? 'en', lq.i18n ? 'ja'
    from public.loyalty_quests lq
  union all
  select 'reward_gifts', rg.id, rg.title,
         rg.i18n_hash is distinct from rg.i18n_src_hash, rg.i18n ? 'en', rg.i18n ? 'ja'
    from public.reward_gifts rg;

grant select on public.translation_status to authenticated, service_role;
