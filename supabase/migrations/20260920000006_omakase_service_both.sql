-- ============================================================
-- Suất omakase phục vụ cả hai ca
--
-- Ban đầu mỗi suất chỉ gắn được một ca ('lunch' hoặc 'dinner').
-- Thực tế có suất bếp dọn cả trưa lẫn tối, nên thêm giá trị 'both'.
--
-- 'both' chỉ nói suất đó *có bán* ở cả hai ca; khung giờ còn trống
-- vẫn lấy từ opening_hours theo từng ca như cũ.
-- ============================================================

alter table public.omakase_sets
  drop constraint if exists omakase_sets_service_check;

alter table public.omakase_sets
  add constraint omakase_sets_service_check
  check (service in ('lunch', 'dinner', 'both'));

comment on column public.omakase_sets.service is
  'Ca phục vụ: lunch | dinner | both. opening_hours chỉ dùng lunch/dinner.';
