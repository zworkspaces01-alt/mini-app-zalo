-- ============================================================
-- Migration: Bổ sung cấu hình Topic (Forum Threads) Telegram
-- ============================================================

-- Thêm các cột lưu Topic ID cho từng luồng nghiệp vụ
alter table public.telegram_settings
  add column if not exists topic_order text default '',
  add column if not exists topic_reservation text default '',
  add column if not exists topic_omakase text default '',
  add column if not exists topic_loyalty text default '',
  add column if not exists notify_loyalty boolean not null default true;

-- Cập nhật RPC get_telegram_settings trả về các cột topic
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

-- Cập nhật RPC update_telegram_settings hỗ trợ lưu topic
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
