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
