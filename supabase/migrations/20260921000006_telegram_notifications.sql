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
