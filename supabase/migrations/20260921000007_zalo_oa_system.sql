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

create policy "Staff read zalo notification logs" on public.zalo_notification_logs
  for select using (public.is_staff());

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
