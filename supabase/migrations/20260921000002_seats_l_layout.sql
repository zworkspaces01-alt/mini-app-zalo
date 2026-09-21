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
