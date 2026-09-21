-- ============================================================
-- Migration: Storage Bucket miyako-assets
-- Cho phép upload & truy cập công khai ảnh món ăn, banner, quà
-- ============================================================

insert into storage.buckets (id, name, public)
values ('miyako-assets', 'miyako-assets', true)
on conflict (id) do update set public = true;

-- Policy xem ảnh public
drop policy if exists "Public Access miyako-assets" on storage.objects;
create policy "Public Access miyako-assets"
on storage.objects for select
using (bucket_id = 'miyako-assets');

-- Policy upload ảnh
drop policy if exists "Authenticated users can upload to miyako-assets" on storage.objects;
create policy "Authenticated users can upload to miyako-assets"
on storage.objects for insert
with check (bucket_id = 'miyako-assets');

-- Policy cập nhật ảnh
drop policy if exists "Authenticated users can update miyako-assets" on storage.objects;
create policy "Authenticated users can update miyako-assets"
on storage.objects for update
using (bucket_id = 'miyako-assets');

-- Policy xoá ảnh
drop policy if exists "Authenticated users can delete miyako-assets" on storage.objects;
create policy "Authenticated users can delete miyako-assets"
on storage.objects for delete
using (bucket_id = 'miyako-assets');
