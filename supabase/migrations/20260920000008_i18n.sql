-- ============================================================
-- ĐA NGỮ — Việt (gốc) · Anh · Nhật
--
-- Tiếng Việt vẫn nằm nguyên ở các cột cũ (`name`, `description`, …): đó là
-- bản gốc nhà hàng nhập tay, và là bản duy nhất chắc chắn đúng. Bản dịch
-- Anh/Nhật nằm trong cột `i18n`:
--
--   {"en": {"name": "Grilled crab miso", "description": "…"},
--    "ja": {"name": "カニ味噌焼き",        "description": "…"}}
--
-- Thiếu ngôn ngữ nào, thiếu trường nào thì mini app lùi về tiếng Việt. Không
-- bao giờ hiện ô trống, vì thà đọc tiếng Việt còn hơn không đọc được gì.
--
-- Hai cột băm cho biết bản dịch còn khớp bản gốc hay không:
--   i18n_src_hash — trigger tự tính lại mỗi lần sửa, từ các trường tiếng Việt
--   i18n_hash     — giá trị i18n_src_hash tại lúc sinh ra bản dịch đang lưu
--
-- Hai cột khác nhau ⇒ nhà hàng đã sửa bản gốc sau khi dịch ⇒ cần dịch lại.
-- Băm luôn do Postgres tính, không bao giờ do Deno tính, để hai bên không
-- thể lệch nhau vì khác cách nối chuỗi.
-- ============================================================

-- Ký tự phân tách (unit separator) — không xuất hiện trong văn bản thật, nên
-- ghép "a|b" và "a" + "|b" không thể ra cùng một băm.
-- Dùng E'\x1f' trực tiếp trong từng hàm bên dưới.

-- ── categories ──────────────────────────────────────────────
alter table public.categories
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_categories(r public.categories)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.name, coalesce(r.jp, ''), coalesce(r.romaji, '')));
$$;

create or replace function public.categories_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_categories(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_i18n on public.categories;
create trigger categories_i18n
  before insert or update on public.categories
  for each row execute function public.categories_i18n_touch();

-- ── dishes ──────────────────────────────────────────────────
alter table public.dishes
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_dishes(r public.dishes)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.name,
    coalesce(r.romaji, ''),
    coalesce(r.jp, ''),
    coalesce(r.description, ''),
    coalesce(r.unit, ''),
    array_to_string(r.includes, E'\x1f'),
    array_to_string(r.gifts, E'\x1f')
  ));
$$;

create or replace function public.dishes_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_dishes(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists dishes_i18n on public.dishes;
create trigger dishes_i18n
  before insert or update on public.dishes
  for each row execute function public.dishes_i18n_touch();

-- ── dish_variants ───────────────────────────────────────────
alter table public.dish_variants
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_dish_variants(r public.dish_variants)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.label, coalesce(r.note, '')));
$$;

create or replace function public.dish_variants_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_dish_variants(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists dish_variants_i18n on public.dish_variants;
create trigger dish_variants_i18n
  before insert or update on public.dish_variants
  for each row execute function public.dish_variants_i18n_touch();

-- ── omakase_sets ────────────────────────────────────────────
alter table public.omakase_sets
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_omakase_sets(r public.omakase_sets)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    r.name,
    coalesce(r.jp, ''),
    coalesce(r.subtitle, ''),
    coalesce(r.description, '')
  ));
$$;

create or replace function public.omakase_sets_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_omakase_sets(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists omakase_sets_i18n on public.omakase_sets;
create trigger omakase_sets_i18n
  before insert or update on public.omakase_sets
  for each row execute function public.omakase_sets_i18n_touch();

-- ── omakase_courses ─────────────────────────────────────────
alter table public.omakase_courses
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_omakase_courses(r public.omakase_courses)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f', r.section, array_to_string(r.items, E'\x1f')));
$$;

create or replace function public.omakase_courses_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_omakase_courses(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists omakase_courses_i18n on public.omakase_courses;
create trigger omakase_courses_i18n
  before insert or update on public.omakase_courses
  for each row execute function public.omakase_courses_i18n_touch();

-- ── restaurant_settings ─────────────────────────────────────
-- Ba câu chữ khách đọc: tagline, ghi chú giá, chính sách huỷ bàn.
-- Địa chỉ giữ nguyên tiếng Việt — khách nước ngoài đưa cho tài xế đọc.
alter table public.restaurant_settings
  add column if not exists i18n          jsonb not null default '{}'::jsonb,
  add column if not exists i18n_hash     text,
  add column if not exists i18n_src_hash text,
  add column if not exists i18n_at       timestamptz;

create or replace function public.i18n_src_restaurant_settings(r public.restaurant_settings)
returns text
language sql
immutable
as $$
  select md5(concat_ws(E'\x1f',
    coalesce(r.tagline, ''),
    coalesce(r.menu_price_note, ''),
    coalesce(r.cancellation_policy, '')
  ));
$$;

create or replace function public.restaurant_settings_i18n_touch()
returns trigger
language plpgsql
as $$
begin
  new.i18n_src_hash := public.i18n_src_restaurant_settings(new);

  -- Lần gần nhất bản dịch được ghi. "Dịch lại toàn bộ" chạy thành nhiều lượt
  -- gọi, và dấu thời gian này cho biết dòng nào đã làm trong lượt hiện tại —
  -- không có nó thì mỗi lượt lại làm đúng những dòng đầu bảng, chạy mãi không
  -- hết.
  --
  -- Edge Function tự đặt i18n_at, vì nó biết mình vừa ghi dòng này kể cả khi
  -- bản dịch mới trùng y hệt bản cũ. Ở đây chỉ đỡ cho lời gọi nào không đặt,
  -- tức là CMS lúc nhân viên sửa tay.
  if new.i18n_at is not distinct from old.i18n_at
     and (tg_op = 'INSERT' or new.i18n is distinct from old.i18n) then
    new.i18n_at := now();
  end if;

  -- Quản lý tự sửa bản dịch trong CMS thì bản dịch khớp bản gốc hiện tại,
  -- không phải "cần dịch lại" nữa. Edge Function thì tự đặt i18n_hash (và
  -- chỉ đặt khi đủ cả hai thứ tiếng), nên nhánh này không đụng tới nó.
  if tg_op = 'UPDATE'
     and new.i18n is distinct from old.i18n
     and new.i18n_hash is not distinct from old.i18n_hash then
    new.i18n_hash := new.i18n_src_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_settings_i18n on public.restaurant_settings;
create trigger restaurant_settings_i18n
  before insert or update on public.restaurant_settings
  for each row execute function public.restaurant_settings_i18n_touch();

-- ── Điền băm cho dữ liệu đã có ──────────────────────────────
-- Trigger chỉ chạy từ lần sửa sau, nên tính tay một lượt cho các dòng cũ.
update public.categories          r set i18n_src_hash = public.i18n_src_categories(r)          where r.i18n_src_hash is null;
update public.dishes              r set i18n_src_hash = public.i18n_src_dishes(r)              where r.i18n_src_hash is null;
update public.dish_variants       r set i18n_src_hash = public.i18n_src_dish_variants(r)       where r.i18n_src_hash is null;
update public.omakase_sets        r set i18n_src_hash = public.i18n_src_omakase_sets(r)        where r.i18n_src_hash is null;
update public.omakase_courses     r set i18n_src_hash = public.i18n_src_omakase_courses(r)     where r.i18n_src_hash is null;
update public.restaurant_settings r set i18n_src_hash = public.i18n_src_restaurant_settings(r) where r.i18n_src_hash is null;

comment on column public.dishes.i18n is
  'Bản dịch Anh/Nhật. Tiếng Việt ở các cột thường — đó mới là bản gốc.';
comment on column public.dishes.i18n_hash is
  'i18n_src_hash tại lúc dịch. Khác i18n_src_hash nghĩa là bản gốc đã đổi.';

-- ── Bảng theo dõi việc dịch, cho CMS ────────────────────────
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
    from public.restaurant_settings r;

comment on view public.translation_status is
  'Mỗi dòng nội dung một hàng: đã có bản Anh/Nhật chưa, bản gốc đã đổi chưa.';

-- Chỉ CMS cần bảng này; khách không có việc gì với nó.
grant select on public.translation_status to authenticated, service_role;
