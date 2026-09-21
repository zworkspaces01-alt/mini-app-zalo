-- ============================================================
-- Miyako — dữ liệu khởi tạo
-- TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG. Đừng sửa tay.
-- Nguồn: src/data/*.ts  ·  Sinh lại: node supabase/seed/generate-seed.mjs
-- ============================================================

begin;

-- Cấu hình nhà hàng. Cột null = dữ kiện chưa được nhà hàng xác nhận.
insert into public.restaurant_settings
  (id, name, tagline, address, hotline, oa_id, city, counter_seats,
   deposit_rate, vat_rate, service_charge_rate, price_includes_vat, menu_price_note,
   booking_lead_days, omakase_lead_hours)
values
  (1, 'MIYAKO', 'The Art of Sushi & Wagyu', '28 Đào Tấn, Hà Nội',
   '0965630828', null, 'Hà Nội', 12,
   0.5, null, null, false, 'Đơn vị tính: 1.000đ · Giá chưa bao gồm VAT',
   30, 24)
on conflict (id) do nothing;

-- Chỉ tạo sẵn quầy itamae vì đây là con số đã xác nhận (12 ghế).
-- Bàn thường và phòng riêng do nhà hàng tự thêm trong CMS.
insert into public.restaurant_tables (id, label, zone, seats, sort_order) values
  ('QUAY', 'Quầy itamae', 'counter', 12, 0)
on conflict (id) do nothing;

-- TẠM TÍNH — nhà hàng phải sửa lại trong CMS trước khi phát hành.
-- Mini app có ghi chú rõ cho khách rằng khung giờ còn chờ xác nhận.
insert into public.opening_hours (weekday, service, open_time, close_time, slot_minutes) values
  (0, 'lunch',  '11:30', '13:00', 30),
  (0, 'dinner', '17:30', '20:00', 30),
  (1, 'lunch',  '11:30', '13:00', 30),
  (1, 'dinner', '17:30', '20:00', 30),
  (2, 'lunch',  '11:30', '13:00', 30),
  (2, 'dinner', '17:30', '20:00', 30),
  (3, 'lunch',  '11:30', '13:00', 30),
  (3, 'dinner', '17:30', '20:00', 30),
  (4, 'lunch',  '11:30', '13:00', 30),
  (4, 'dinner', '17:30', '20:00', 30),
  (5, 'lunch',  '11:30', '13:00', 30),
  (5, 'dinner', '17:30', '20:00', 30),
  (6, 'lunch',  '11:30', '13:00', 30),
  (6, 'dinner', '17:30', '20:00', 30)
on conflict (weekday, service) do nothing;

-- Nhóm món
insert into public.categories (id, name, jp, romaji, sort_order) values
  ('khai-vi', 'Khai vị', '付き出し', 'Tsukidashi', 0),
  ('salad', 'Salad', 'サラダ', 'Sarada', 1),
  ('sashimi', 'Sashimi', '刺身', 'Sashimi', 2),
  ('sushi', 'Sushi', '寿司', 'Sushi', 3),
  ('maki', 'Maki', '巻き寿司', 'Makizushi', 4),
  ('wagyu', 'Wagyu & Bò nướng', '和牛', 'Wagyu', 5),
  ('lau', 'Lẩu', '鍋', 'Nabe', 6),
  ('nuong', 'Món nướng', '焼き物', 'Yakimono', 7),
  ('chien', 'Món chiên', '揚げ物', 'Agemono', 8),
  ('mi', 'Mì & Ramen', '麺', 'Men', 9),
  ('com', 'Cơm', 'ご飯', 'Gohan', 10),
  ('trang-mieng', 'Tráng miệng', 'デザート', 'Dezāto', 11)
on conflict (id) do nothing;

-- 149 món, số hoá từ bộ menu in 39 trang (M1–M39)
insert into public.dishes
  (id, category_id, name, romaji, jp, price, compare_at_price, unit, description,
   includes, gifts, badges, image_path, source_page, sort_order)
values
  ('kani-miso-yaki', 'khai-vi', 'Mai cua nướng', 'Kani Miso Yaki', 'カニ味噌焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M1', 0),
  ('kimchi', 'khai-vi', 'Kimchi', 'Kimuchi', 'キムチ', 59000, null, null, null, '{}', '{}', '{}', null, 'M1', 1),
  ('ginnan-shioyaki', 'khai-vi', 'Bạch quả nướng muối', 'Ginnan Shioyaki', '銀杏塩焼き', 79000, null, null, null, '{}', '{}', '{}', null, 'M1', 2),
  ('natto', 'khai-vi', 'Đậu tương lên men', 'Natto', '納豆', 59000, null, null, null, '{}', '{}', '{}', null, 'M1', 3),
  ('ika-natto', 'khai-vi', 'Đậu tương lên men trộn mực', 'Ika Nattō', 'いか納豆', 99000, null, null, null, '{}', '{}', '{}', null, 'M1', 4),
  ('agedashi-tofu', 'khai-vi', 'Đậu phụ chiên sốt dashi', 'Agedashi Tofu', '揚げ出し豆腐', 79000, null, null, null, '{}', '{}', '{}', null, 'M2', 5),
  ('edamame', 'khai-vi', 'Đậu nành luộc', 'Edamame', '枝豆', 59000, null, null, null, '{}', '{}', '{}', null, 'M2', 6),
  ('hiyayakko', 'khai-vi', 'Đậu phụ lạnh Nhật', 'Hiyayakko', '冷奴', 59000, null, null, null, '{}', '{}', '{}', null, 'M2', 7),
  ('eihire-aburi', 'khai-vi', 'Vây cá đuối nướng', 'Eihire Aburi', 'エイヒレ炙り', 99000, null, null, null, '{}', '{}', '{}', null, 'M2', 8),
  ('takowasabi', 'khai-vi', 'Bạch tuộc ngâm wasabi', 'Takowasabi', 'たこわさび', 99000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M2', 9),
  ('miso-shiru', 'khai-vi', 'Xúp miso', 'Miso-shiru', '味噌汁', 39000, null, null, null, '{}', '{}', '{}', null, 'M2', 10),
  ('samon-abokado-sarada', 'salad', 'Salad cá hồi bơ', 'Samon Abokado Sarada', 'サーモンアボカドサラダ', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M3', 0),
  ('wagyu-sarada', 'salad', 'Salad thịt bò wagyu', 'Wagyu Sarada', '和牛サラダ', 199000, null, null, null, '{}', '{}', '{}', null, 'M3', 1),
  ('kaiso-sarada', 'salad', 'Salad rong biển', 'Kaisō Sarada', '海藻サラダ', 99000, null, null, null, '{}', '{}', '{}', null, 'M3', 2),
  ('kaisen-sarada', 'salad', 'Salad hải sản', 'Kaisen Sarada', '海鮮サラダ', 199000, null, null, null, '{}', '{}', '{}', null, 'M4', 3),
  ('mikkusu-sarada', 'salad', 'Salad rau xanh tổng hợp', 'Mikkusu Sarada', 'ミックスサラダ', 79000, null, null, null, '{}', '{}', '{}', null, 'M4', 4),
  ('tofu-goma-sarada', 'salad', 'Salad đậu phụ Nhật sốt mè rang', 'Tofu Goma Sarada', '豆腐胡麻サラダ', 139000, null, null, null, '{}', '{}', '{}', null, 'M4', 5),
  ('poteto-sarada', 'salad', 'Salad khoai tây', 'Poteto Sarada', 'ポテトサラダ', 79000, null, null, null, '{}', '{}', '{}', null, 'M4', 6),
  ('salmon-zuke', 'sashimi', 'Cá hồi ngâm tương', 'Salmon Zuke', 'サーモン漬け', 189000, null, null, null, '{}', '{}', '{}', null, 'M5', 0),
  ('toro-salmon', 'sashimi', 'Sashimi bụng cá hồi', 'Toro Salmon', 'サーモントロ', 159000, null, null, null, '{}', '{}', '{}', null, 'M5', 1),
  ('salmon-sashimi', 'sashimi', 'Sashimi cá hồi', 'Salmon Sashimi', 'サーモン刺身', 159000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M5', 2),
  ('nishin-sashimi', 'sashimi', 'Sashimi cá trích ép trứng', 'Nishin Sashimi', 'にしん刺身', 179000, null, null, null, '{}', '{}', '{}', null, 'M5', 3),
  ('hokkigai-sashimi', 'sashimi', 'Sashimi sò đỏ', 'Hokkigai Sashimi', 'ホッキ貝刺身', 159000, null, null, null, '{}', '{}', '{}', null, 'M6', 4),
  ('hokkaido-hotate', 'sashimi', 'Sashimi sò điệp Hokkaido', 'Hokkaido Hotate', '北海道ホタテ', 299000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M6', 5),
  ('tako-sashimi', 'sashimi', 'Sashimi bạch tuộc', 'Tako Sashimi', 'タコ刺身', 199000, null, null, null, '{}', '{}', '{}', null, 'M6', 6),
  ('uni-sashimi', 'sashimi', 'Nhum biển Nhật', 'Uni Sashimi', 'ウニ', 599000, null, null, 'Uni được mệnh danh là “vàng đen” của đại dương và luôn nằm trong top những món sashimi xa xỉ, kén người ăn nhưng một khi đã thử là gây nghiện.', '{}', '{}', array['must-try']::text[], null, 'M7', 7),
  ('awabi-sashimi', 'sashimi', 'Sashimi bào ngư', 'Awabi Sashimi', 'アワビの刺身', 249000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M7', 8),
  ('nama-kaki', 'sashimi', 'Sashimi hàu Nhật', 'Nama Kaki', '牡蠣の刺身', 170000, null, null, null, '{}', '{}', '{}', null, 'M7', 9),
  ('amaebi-sashimi', 'sashimi', 'Sashimi tôm ngọt', 'Amaebi Sashimi', '甘エビ刺身', 399000, null, null, null, '{}', '{}', '{}', null, 'M8', 10),
  ('kanpachi-sashimi', 'sashimi', 'Sashimi cá cam', 'Kanpachi Sashimi', 'カンパチ刺身', 280000, null, null, null, '{}', '{}', '{}', null, 'M8', 11),
  ('miyabi-tai-sashimi', 'sashimi', 'Sashimi cá tráp', 'Miyabi Tai Sashimi', 'みやび鯛', 269000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M8', 12),
  ('sashimi-moriawase-ume', 'sashimi', 'Set sashimi Ume', 'Sashimi Moriawase “Ume”', '刺身盛り合わせ「梅」', 359000, null, null, null, '{}', '{}', '{}', null, 'M9', 13),
  ('sashimi-moriawase-take', 'sashimi', 'Set sashimi Take', 'Sashimi Moriawase “Take”', '刺身盛り合わせ「竹」', 499000, null, null, null, '{}', '{}', '{}', null, 'M9', 14),
  ('sashimi-moriawase-matsu', 'sashimi', 'Set sashimi Matsu', 'Sashimi Moriawase “Matsu”', '刺身盛り合わせ「松」', 699000, null, null, 'Gói trọn những lát cắt tinh hoa và xa xỉ bậc nhất từ đại dương sâu thẳm, được đích thân bếp trưởng tuyển chọn kỹ lưỡng trong ngày.', '{}', '{}', array['best-seller', 'signature']::text[], 'hero-omakase', 'M10', 15),
  ('hon-maguro-moriawase', 'sashimi', 'Sashimi cá ngừ vây xanh', 'Hon Maguro Moriawase', '本マグロ盛り合わせ', 599000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M11', 16),
  ('otoro-sashimi', 'sashimi', 'Sashimi otoro cá ngừ vây xanh', 'Otoro', '大トロ', 499000, null, null, null, '{}', '{}', '{}', null, 'M11', 17),
  ('chutoro-sashimi', 'sashimi', 'Sashimi bụng cá ngừ vây xanh', 'Chutoro', '中トロ', 399000, null, null, null, '{}', '{}', '{}', null, 'M11', 18),
  ('akami-sashimi', 'sashimi', 'Sashimi thăn lưng cá ngừ vây xanh', 'Akami', '赤身', 299000, null, null, null, '{}', '{}', '{}', null, 'M11', 19),
  ('maguro-ponzu-sashimi', 'sashimi', 'Sashimi cá ngừ sốt ponzu', 'Maguro no Ponzu Sashimi', 'マグロのポン酢刺身', 399000, null, null, null, '{}', '{}', '{}', null, 'M11', 20),
  ('miyabi-tai-nigiri', 'sushi', 'Sushi cá tráp', 'Miyabi Tai Nigiri', 'ミヤビ鯛握り', 89000, null, null, null, '{}', '{}', '{}', null, 'M12', 0),
  ('kanpachi-nigiri', 'sushi', 'Sushi cá cam', 'Kanpachi Nigiri', 'カンパチ握り', 119000, null, null, null, '{}', '{}', '{}', null, 'M12', 1),
  ('hokkigai-nigiri', 'sushi', 'Sushi sò đỏ', 'Hokkigai Nigiri', 'ホッキ貝握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 2),
  ('salmon-nigiri', 'sushi', 'Sushi cá hồi', 'Salmon Nigiri', 'サーモン握り', 79000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M12', 3),
  ('amaebi-nigiri', 'sushi', 'Sushi tôm ngọt', 'Amaebi Nigiri', '甘エビ握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 4),
  ('unagi-nigiri', 'sushi', 'Sushi lươn Nhật', 'Unagi Nigiri', 'うなぎ握り', 99000, null, null, null, '{}', '{}', '{}', null, 'M12', 5),
  ('hotate-nigiri', 'sushi', 'Sushi sò điệp', 'Hotate Nigiri', 'ホタテ握り', 90000, null, null, null, '{}', '{}', '{}', null, 'M12', 6),
  ('tako-nigiri', 'sushi', 'Sushi bạch tuộc', 'Tako Nigiri', 'タコ握り', 90000, null, null, null, '{}', '{}', '{}', null, 'M12', 7),
  ('kazunoko-nishin', 'sushi', 'Sushi cá trích ép trứng', 'Kazunoko Nishin', '数の子にしん', 79000, null, null, null, '{}', '{}', '{}', null, 'M12', 8),
  ('ikura-gunkan', 'sushi', 'Sushi trứng cá hồi', 'Ikura Gunkan', 'いくら軍艦', 109000, null, null, null, '{}', '{}', '{}', null, 'M12', 9),
  ('tobiko-gunkan', 'sushi', 'Sushi trứng tôm', 'Tobiko Gunkan', 'とびこ軍艦', 69000, null, null, null, '{}', '{}', '{}', null, 'M12', 10),
  ('negitoro-gunkan', 'sushi', 'Sushi cá ngừ', 'Negitoro Gunkan', 'ネギトロ軍艦巻き', 69000, null, null, null, '{}', '{}', '{}', null, 'M12', 11),
  ('sushi-moriawase-matsu', 'sushi', 'Sushi tổng hợp Matsu', 'Sushi Moriawase “Matsu”', '寿司盛り合わせ「松」', 599000, null, null, null, '{}', '{}', array['best-seller']::text[], 'hero-sushi', 'M13', 12),
  ('sushi-moriawase-take', 'sushi', 'Sushi tổng hợp Take', 'Sushi Moriawase “Take”', '寿司盛り合わせ「竹」', 415000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M14', 13),
  ('sushi-moriawase-ume', 'sushi', 'Sushi tổng hợp Ume', 'Sushi Moriawase “Ume”', '寿司盛り合わせ「梅」', 249000, null, null, null, '{}', '{}', '{}', null, 'M14', 14),
  ('maguro-zanmai', 'sushi', 'Sushi cá ngừ Nhật 3 loại', 'Maguro Zanmai', 'マグロ三昧', 299000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M15', 15),
  ('renge-sushi', 'sushi', 'Sushi mix', 'Renge Sushi', 'れんげ寿司', 299000, null, null, null, '{}', '{}', '{}', null, 'M15', 16),
  ('chutoro-nigiri', 'sushi', 'Sushi bụng cá ngừ thượng hạng', 'Chutoro Nigiri', '中トロ握り', 179000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M15', 17),
  ('honmaguro-akami-nigiri', 'sushi', 'Sushi cá ngừ thịt đỏ', 'Honmaguro Akami', '本鮪赤身', 119000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M15', 18),
  ('otoro-nigiri', 'sushi', 'Sushi bụng cá ngừ vây xanh', 'Otoro Nigiri', '大トロ握り', 229000, null, null, null, '{}', '{}', '{}', null, 'M15', 19),
  ('akami-ikura-tsutsumi', 'sushi', 'Cá ngừ đỏ với trứng cá hồi', 'Akami – Ikura Tsutsumi', '赤身・いくら包み', 189000, null, null, null, '{}', '{}', '{}', null, 'M16', 20),
  ('wagyu-uni-caviar-tsutsumi', 'sushi', 'Wagyu – nhum biển – trứng cá tầm', 'Wagyu – Uni – Caviar Tsutsumi', '和牛・うに・キャビア包み', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M16', 21),
  ('uni-ikura-tsutsumi', 'sushi', 'Gói nhum biển & trứng cá hồi', 'Uni Ikura Tsutsumi', 'うにといくらの包み', 199000, null, null, null, '{}', '{}', '{}', null, 'M16', 22),
  ('otoro-uni-caviar-tsutsumi', 'sushi', 'Bụng cá ngừ – nhum – trứng cá tầm', 'Otoro – Uni – Caviar Tsutsumi', 'トロ・うに・キャビア包み', 199000, null, null, null, '{}', '{}', '{}', null, 'M16', 23),
  ('unagi-kabayaki-tsutsumi', 'sushi', 'Gói lươn nướng kabayaki', 'Unagi Kabayaki Tsutsumi', '鰻蒲焼き包み', 129000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M16', 24),
  ('unagi-chizu-roru', 'maki', 'Maki lươn cuộn phô mai', 'Unagi Chīzu Rōru', 'うなぎチーズロール', 199000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M17', 0),
  ('salmon-kariforunia-roru', 'maki', 'Maki California cá hồi', 'Salmon Kariforunia Rōru', 'サーモンカリフォルニアロール', 199000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M17', 1),
  ('unagi-kariforunia-roru', 'maki', 'Maki lươn California', 'Unagi Kariforunia Rōru', 'うなぎカリフォルニアロール', 199000, null, null, null, '{}', '{}', '{}', null, 'M17', 2),
  ('tokusei-samon-roru', 'maki', 'Maki cá hồi đặc biệt', 'Tokusei Sāmon Rōru', '特製サーモンロール', 219000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M17', 3),
  ('unagi-abokado-roru', 'maki', 'Maki lươn cuộn bơ', 'Unagi Abokado Rōru', 'うなぎアボカドロール', 229000, null, null, null, '{}', '{}', array['signature']::text[], null, 'M18', 4),
  ('wagyu-roru', 'maki', 'Maki bò wagyu', 'Wagyu Rōru', '和牛ロール', 229000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M18', 5),
  ('hotate-roru', 'maki', 'Maki sò điệp', 'Hotate Rōru', 'ホタテロール', 229000, null, null, null, '{}', '{}', '{}', null, 'M18', 6),
  ('ebi-abokado-roru', 'maki', 'Maki tôm chiên phủ bơ', 'Ebi Abokado Rōru', 'えびアボカドロール', 199000, null, null, null, '{}', '{}', '{}', null, 'M18', 7),
  ('aburi-samon-yukke-roru', 'maki', 'Maki cá hồi khò chín xốt yukke', 'Aburi Sāmon Yukke Rōru', '炙りサーモンユッケロール', 189000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M18', 8),
  ('wagyu-yukke', 'wagyu', 'Gỏi bò wagyu A5', 'Wagyu Yukke', '和牛ユッケ', 299000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M20', 0),
  ('wagyu-yukke-to-uni', 'wagyu', 'Gỏi bò wagyu & nhum biển', 'Wagyu Yukke to Uni', '和牛ユッケとうに', 499000, null, null, null, '{}', '{}', array['must-try']::text[], null, 'M20', 1),
  ('miyako-iki', 'wagyu', 'Miyako Iki', null, '粋', 999000, 1299000, '2 khách · 250gr', 'Các phần thịt có thể thay đổi theo ngày.', array['Thăn ngoại bò wagyu A5 (A5 Wagyu Sirloin)', 'Thăn vai bò wagyu A5 (A5 Wagyu Chuck Roll)', 'Sườn bò Mỹ rút xương (Short Ribs Boneless)']::text[], array['Kimchi', 'Rau cuốn thịt nướng']::text[], '{}', 'hero-wagyu', 'M21', 2),
  ('miyako-takumi', 'wagyu', 'Miyako Takumi', null, '匠', 1999000, 2299000, '2–3 khách · 450gr', 'Các phần thịt có thể thay đổi theo ngày. Có thể gọi nửa phần.', array['Thăn nội bò wagyu A5 (Tenderloin)', 'Thăn ngoại bò wagyu A5 (Sirloin)', 'Thăn vai bò wagyu A5 (Ribeye)', 'Dẻ sườn bò Mỹ (USDA Ribs Finger)', 'Sườn bò Mỹ rút xương (Short Ribs Boneless)']::text[], array['Chọn 1 trong 2: Canh sườn bò Hàn Quốc hoặc Mỳ lạnh Hàn Quốc', 'Kimchi', 'Rau cuốn thịt nướng']::text[], array['must-try']::text[], null, 'M22', 3),
  ('miyako-kiwami', 'wagyu', 'Miyako Kiwami', null, '極', 2999000, 3299000, '3–4 khách · 650gr', 'Các phần thịt có thể thay đổi theo ngày. Có thể gọi nửa phần.', array['Thăn nội bò wagyu A5 (Tenderloin)', 'Thăn ngoại bò wagyu A5 (Sirloin)', 'Thăn lưng bò wagyu A5 (Ribeye)', 'Thăn vai bò wagyu A5 (Chuck Roll)', 'Sườn bò Mỹ rút xương', 'Dẻ sườn bò Mỹ', 'Lưỡi bò Mỹ (Gyutan)']::text[], array['Chọn 1 trong 2: Canh sườn bò Hàn Quốc hoặc Mỳ lạnh Hàn Quốc', 'Kimchi', 'Rau cuốn thịt nướng']::text[], array['best-seller']::text[], null, 'M23', 4),
  ('a5-tenderloin', 'wagyu', 'Thăn nội bò wagyu A5', 'A5 Wagyu Tenderloin (Hire)', 'A5 ヒレ', 749000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 5),
  ('a5-sirloin', 'wagyu', 'Thăn ngoại bò wagyu A5', 'A5 Wagyu Sirloin (Saroin)', 'A5 サーロイン', 699000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 6),
  ('a5-akami-daily', 'wagyu', 'Phần thịt đỏ wagyu A5 theo ngày', 'Honjitsu no A5 Wagyu Akami', '本日のA5和牛赤身', 399000, null, '100gr', null, '{}', '{}', array['best-seller']::text[], null, 'M24', 7),
  ('a5-chuck-roll', 'wagyu', 'Thăn vai bò wagyu A5', 'A5 Wagyu Chuck Roll (KataRosu)', 'A5 肩ロース', 499000, null, '100gr', null, '{}', '{}', '{}', null, 'M24', 8),
  ('jo-tan', 'wagyu', 'Lưỡi bò cao cấp', 'Jō Tan', '上タン', 299000, null, null, 'Phần lưỡi mềm nhất nên nướng sẽ ngon nhất. Là phần quý hiếm, mỗi con bò 300kg chỉ lấy được 300g.', '{}', '{}', '{}', null, 'M25', 9),
  ('yuzu-hana-tan', 'wagyu', 'Lưỡi bò hoa xốt yuzu', 'Yuzu Hana Tan', '柚子花タン', 179000, null, null, null, '{}', '{}', '{}', null, 'M25', 10),
  ('negi-shio-tan', 'wagyu', 'Lưỡi bò xốt muối hành', 'Negi Shio Tan', 'ねぎ塩タン', 179000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M25', 11),
  ('us-outside-skirt', 'wagyu', 'Diềm thăn bò Mỹ', 'US Outside Skirt', '米国産ハラミ', 225000, null, '150gr', null, '{}', '{}', '{}', null, 'M26', 12),
  ('us-boneless-short-ribs', 'wagyu', 'Sườn bò Mỹ rút xương', 'US Boneless Short Ribs', '米国産特上カルビ', 290000, null, '120gr', null, '{}', '{}', array['best-seller']::text[], null, 'M26', 13),
  ('us-ribs-finger', 'wagyu', 'Dẻ sườn bò Mỹ', 'US Ribs Finger', 'USDA産カルビ', 185000, null, '120gr', null, '{}', '{}', '{}', null, 'M26', 14),
  ('us-beef-trio', 'wagyu', 'Combo 3 loại bò Mỹ thượng hạng', 'US Beef Trio Combo', 'USビーフ 3種盛り', 599000, null, '350gr', null, '{}', '{}', array['must-try']::text[], null, 'M26', 15),
  ('motsu-nabe', 'lau', 'Lẩu lòng bò', 'Motsu-nabe', 'もつ鍋', null, null, null, null, '{}', '{}', array['best-seller']::text[], 'hero-hotpot', 'M27', 0),
  ('wagyu-sukiyaki', 'lau', 'Wagyu Sukiyaki', 'Wagyu Beef Sukiyaki', '和牛すき焼き', null, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M28', 1),
  ('us-sukiyaki', 'lau', 'US Sukiyaki', 'US Beef Sukiyaki', '黒アンガス牛すき焼き', null, null, null, null, '{}', '{}', '{}', null, 'M28', 2),
  ('wagyu-shabu', 'lau', 'Wagyu Shabu-shabu', 'Wagyu Beef Shabu-Shabu Hotpot', '和牛しゃぶしゃぶ', null, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M29', 3),
  ('us-shabu', 'lau', 'US Shabu-shabu', 'US Beef Shabu-Shabu Hotpot', '黒アンガス牛しゃぶしゃぶ', null, null, null, null, '{}', '{}', '{}', null, 'M29', 4),
  ('us-short-plate', 'lau', 'Ba chỉ bò Mỹ', 'US Beef Short Plate', '牛バラ肉', 99000, null, '150gr', null, '{}', '{}', '{}', null, 'M30', 5),
  ('slided-black-angus', 'lau', 'Bò Mỹ nhúng lẩu', 'Slided Black Angus', 'アメリカ産牛ロース', 159000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 6),
  ('slided-a5-chuck-roll', 'lau', 'Thăn vai bò wagyu A5 nhúng lẩu', 'Slided A5 Wagyu Chuck Roll', 'A5 肩ロース', 499000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 7),
  ('slided-a5-lean', 'lau', 'Phần thịt đỏ wagyu A5 nhúng lẩu', 'Slided A5 Wagyu Lean Cut', '本日のA5和牛赤身', 399000, null, '100gr', null, '{}', '{}', '{}', null, 'M30', 8),
  ('beef-offal-nabe', 'lau', 'Lòng bò nhúng lẩu', 'Beef Offal', '牛モツ', 99000, null, '200gr', null, '{}', '{}', '{}', null, 'M30', 9),
  ('nabe-vegetables', 'lau', 'Set rau nhúng lẩu', 'Assorted Vegetables for Hot Pot', '鍋用野菜', 89000, null, null, null, '{}', '{}', '{}', null, 'M30', 10),
  ('nabe-noodles', 'lau', 'Mì udon/soba nhúng lẩu', 'Udon / Soba Noodles for Hot Pot', 'うどん / そば', 40000, null, '50gr', null, '{}', '{}', '{}', null, 'M30', 11),
  ('hokke-yaki', 'nuong', 'Cá hokke nướng', 'Hokke Yaki', 'ホッケ焼き', 229000, null, null, null, '{}', '{}', '{}', null, 'M31', 0),
  ('surumeika-shioyaki', 'nuong', 'Mực ống nướng muối', 'Surumeika Shioyaki', 'するめいか塩焼き', 299000, null, null, null, '{}', '{}', '{}', null, 'M31', 1),
  ('saba-shioyaki', 'nuong', 'Cá thu nướng muối', 'Saba no Shioyaki', '鯖の塩焼き', 149000, null, null, null, '{}', '{}', '{}', null, 'M31', 2),
  ('sanma-shioyaki', 'nuong', 'Cá thu đao nướng muối', 'Sanma no Shioyaki', '秋刀魚の塩焼き', 149000, null, null, null, '{}', '{}', '{}', null, 'M31', 3),
  ('shishamo-shioyaki', 'nuong', 'Cá trứng nướng muối', 'Shishamo no Shioyaki', 'ししゃもの塩焼き', 109000, null, null, null, '{}', '{}', '{}', null, 'M31', 4),
  ('ayu-shioyaki', 'nuong', 'Cá ayu nướng muối', 'Ayu no Shioyaki', '鮎の塩焼き', 209000, null, null, null, '{}', '{}', '{}', null, 'M32', 5),
  ('unagi-kabayaki', 'nuong', 'Lươn Nhật sốt kabayaki', 'Unagi no Kabayaki', '鰻の蒲焼き', 189000, null, null, null, '{}', '{}', '{}', null, 'M32', 6),
  ('samon-shioyaki', 'nuong', 'Cá hồi nướng muối', 'Sāmon Shioyaki', 'サーモン塩焼き', 239000, null, null, null, '{}', '{}', '{}', null, 'M32', 7),
  ('samon-teriyaki', 'nuong', 'Cá hồi nướng teriyaki', 'Sāmon Teriyaki', 'サーモン照り焼き', 239000, null, null, null, '{}', '{}', '{}', null, 'M32', 8),
  ('yakitori', 'nuong', 'Gà nướng xiên que', 'Yakitori', '焼き鳥', 105000, null, null, null, '{}', '{}', '{}', null, 'M32', 9),
  ('buri-kama-shioyaki', 'nuong', 'Má cá buri nướng muối', 'Buri Kama Shioyaki', 'ブリカマ塩焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M33', 10),
  ('buri-kama-teriyaki', 'nuong', 'Má cá buri nướng teriyaki', 'Buri Kama Teriyaki', 'ブリカマ照り焼き', 199000, null, null, null, '{}', '{}', '{}', null, 'M33', 11),
  ('salmon-kabuto-shio', 'nuong', 'Đầu cá hồi nướng muối', 'Salmon Kabuto-yaki – Shio', 'サーモン兜焼き（塩）', 159000, null, null, null, '{}', '{}', '{}', null, 'M33', 12),
  ('salmon-kabuto-tare', 'nuong', 'Đầu cá hồi nướng sốt teriyaki', 'Salmon Kabuto-yaki – Tare', 'サーモン兜焼き（たれ）', 159000, null, null, null, '{}', '{}', '{}', null, 'M33', 13),
  ('kaisen-chawanmushi', 'nuong', 'Trứng hấp hải sản', 'Kaisen Chawanmushi', '海鮮茶碗蒸し', 179000, null, null, null, '{}', '{}', '{}', null, 'M33', 14),
  ('chawanmushi', 'nuong', 'Trứng hấp', 'Chawanmushi', '茶碗蒸し', 89000, null, null, null, '{}', '{}', '{}', null, 'M33', 15),
  ('uni-kaisen-chawanmushi', 'nuong', 'Trứng hấp hải sản & nhum biển', 'Uni Kaisen Chawanmushi', 'うに海鮮茶碗蒸し', 299000, null, null, null, '{}', '{}', '{}', null, 'M33', 16),
  ('gyukatsu', 'chien', 'Bò wagyu chiên xù kiểu Nhật', 'Gyukatsu', '牛カツ', 359000, null, null, null, '{}', '{}', '{}', null, 'M34', 0),
  ('ika-furai', 'chien', 'Mực chiên xù', 'Ika Furai', 'イカフライ', 159000, null, null, null, '{}', '{}', '{}', null, 'M34', 1),
  ('ebi-furai', 'chien', 'Tôm chiên xù', 'Ebi Furai', '海老フライ', 139000, null, null, null, '{}', '{}', '{}', null, 'M34', 2),
  ('karaage', 'chien', 'Gà chiên', 'Karaage', 'から揚げ', 89000, null, null, null, '{}', '{}', '{}', null, 'M34', 3),
  ('poteto-furai', 'chien', 'Khoai tây chiên', 'Poteto Furai', 'ポテトフライ', 49000, null, null, null, '{}', '{}', '{}', null, 'M34', 4),
  ('yasai-tempura', 'chien', 'Tempura rau củ tổng hợp', 'Yasai Tempura Moriawase', '野菜天ぷら盛り合わせ', 99000, null, null, null, '{}', '{}', '{}', null, 'M34', 5),
  ('ebi-yasai-tempura', 'chien', 'Tempura tôm & rau củ tổng hợp', 'Ebi – Yasai Tempura Moriawase', '海老・野菜天ぷら盛り合わせ', 129000, null, null, null, '{}', '{}', '{}', null, 'M34', 6),
  ('kare-udon', 'mi', 'Mỳ udon xốt cà ri', 'Kare Udon', 'カレーうどん', 149000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M35', 0),
  ('udon-tempura', 'mi', 'Mỳ udon tempura', 'Udon Tempura', '天ぷらうどん', 199000, null, null, null, '{}', '{}', '{}', null, 'M35', 1),
  ('kake-udon', 'mi', 'Mỳ udon nóng', 'Kake Udon', 'かけうどん', 99000, null, null, null, '{}', '{}', '{}', null, 'M35', 2),
  ('kake-soba', 'mi', 'Mỳ soba nóng', 'Kake Soba', 'かけそば', 99000, null, null, null, '{}', '{}', '{}', null, 'M35', 3),
  ('soba-tempura', 'mi', 'Mì soba tempura', 'Soba Tempura', '天ぷらそば', 199000, null, null, null, '{}', '{}', '{}', null, 'M35', 4),
  ('unagi-carbonara', 'mi', 'Mỳ Ý carbonara lươn Nhật', 'Unagi Karubonāra', 'うなぎカルボナーラ', 249000, null, null, null, '{}', '{}', '{}', null, 'M36', 5),
  ('mentaiko-pasuta', 'mi', 'Mỳ Ý xốt trứng cá tuyết cay', 'Mentaiko Pasuta', '明太子パスタ', 199000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M36', 6),
  ('miso-ramen', 'mi', 'Miso ramen', 'Miso Ramen', '味噌ラーメン', 189000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M36', 7),
  ('tonkotsu-ramen', 'mi', 'Tonkotsu ramen', 'Tonkotsu Ramen', '豚骨ラーメン', 189000, null, null, null, '{}', '{}', '{}', null, 'M36', 8),
  ('tantanmen', 'mi', 'Tantanmen', 'Tantanmen', '担々麺', 189000, null, null, null, '{}', '{}', '{}', null, 'M36', 9),
  ('unagi-don', 'com', 'Cơm lươn Nhật', 'Unagi Don', 'うな重', 269000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M37', 0),
  ('tendon', 'com', 'Cơm tempura thập cẩm', 'Tendon', '天丼', 249000, null, null, null, '{}', '{}', '{}', null, 'M37', 1),
  ('katsudon', 'com', 'Cơm thịt heo chiên xù trứng', 'Katsudon', 'かつ丼', 159000, null, null, null, '{}', '{}', '{}', null, 'M37', 2),
  ('oyakodon', 'com', 'Cơm bát mẹ con', 'Oyakodon', '親子丼', 139000, null, null, null, '{}', '{}', '{}', null, 'M37', 3),
  ('katsu-kare-don', 'com', 'Cơm cà ri thịt heo chiên xù', 'Katsu Kare', 'カツカレー', 159000, null, null, null, '{}', '{}', '{}', null, 'M37', 4),
  ('kare-raisu', 'com', 'Cơm cà ri Nhật', 'Kare Raisu', 'カレーライス', 99000, null, null, null, '{}', '{}', '{}', null, 'M37', 5),
  ('wagyu-don', 'com', 'Cơm bò wagyu', 'Wagyu Don', '和牛丼', 499000, null, null, null, '{}', '{}', array['must-try']::text[], 'hero-don', 'M38', 6),
  ('tokujo-kaisen-don', 'com', 'Cơm hải sản thượng hạng', 'Tokujō Kaisen-don Misoshiru Tsuki', '特上海鮮丼', 569000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M38', 7),
  ('salmon-don', 'com', 'Cơm cá hồi', 'Salmon Don', 'サーモン丼', 280000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M38', 8),
  ('kinako-ice-cream', 'trang-mieng', 'Kem kinako sốt đường đen', 'Kinako Ice Cream', '黒蜜きなこアイス', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 0),
  ('matcha-ice-cream', 'trang-mieng', 'Kem matcha', 'Matcha Ice Cream', '抹茶アイスクリーム', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 1),
  ('yuzu-sorbet', 'trang-mieng', 'Kem sorbet chanh yuzu', 'Yuzu Sorbet', '柚子シャーベット', 59000, null, null, null, '{}', '{}', array['best-seller']::text[], null, 'M39', 2),
  ('vanilla-ice-cream', 'trang-mieng', 'Kem vani Nhật', 'Vanilla Ice Cream', 'バニラアイス', 59000, null, null, null, '{}', '{}', '{}', null, 'M39', 3),
  ('seasonal-fruits', 'trang-mieng', 'Đĩa trái cây theo mùa', 'Seasonal Mixed Fruits', '季節のフルーツ盛り合わせ', 129000, null, null, null, '{}', '{}', '{}', null, 'M39', 4)
on conflict (id) do nothing;

-- Món bán theo phần (lẩu, sukiyaki, shabu)
insert into public.dish_variants (dish_id, code, label, price, note, sort_order) values
  ('motsu-nabe', 'm', 'Medium', 259000, '200gr', 0),
  ('motsu-nabe', 'l', 'Large', 399000, '300gr', 1),
  ('wagyu-sukiyaki', 'm', 'Medium', 559000, '100gr', 0),
  ('wagyu-sukiyaki', 'l', 'Large', 999000, '200gr', 1),
  ('us-sukiyaki', 'm', 'Medium', 299000, '200gr', 0),
  ('us-sukiyaki', 'l', 'Large', 399000, '300gr', 1),
  ('wagyu-shabu', 'm', 'Medium', 559000, '100gr', 0),
  ('wagyu-shabu', 'l', 'Large', 999000, '200gr', 1),
  ('us-shabu', 'm', 'Medium', 299000, '200gr', 0),
  ('us-shabu', 'l', 'Large', 399000, '300gr', 1)
on conflict (dish_id, code) do nothing;

-- Suất omakase
insert into public.omakase_sets
  (id, name, jp, subtitle, price, service, tier, description, image_path,
   menu_pending, sort_order)
values
  ('omakase-lunch', 'Omakase trưa', '昼のおまかせ', null, 500000, 'lunch', 1, null, null, true, 0),
  ('omakase-dinner-1', 'Set tối — mức 1', '夜のおまかせ 壱', null, 1000000, 'dinner', 2, null, null, true, 1),
  ('omakase-dinner-2', 'Set tối — mức 2', '夜のおまかせ 弐', null, 2000000, 'dinner', 3, null, null, true, 2),
  ('kaze', 'Kaze Omakase', '夏風', 'Kaze — Làn gió mùa hè', 3000000, 'dinner', 4, 'Lấy cảm hứng từ những làn gió mát lành giữa mùa hè Nhật Bản, Kaze Omakase mang đến một hành trình vị giác nhẹ nhàng, tinh tế và đầy cân bằng.

Từng món ăn được sắp đặt như một nhịp gió: khi thanh mát từ hải vị, khi sâu lắng bởi vị ngọt tự nhiên của nguyên liệu, khi để lại dư vị ấm áp và sang trọng nơi đầu lưỡi.

Kaze không hướng đến sự phô trương, mà là vẻ đẹp của sự tiết chế — nơi đầu bếp gửi gắm tinh thần mùa hè qua từng lát cắt, từng sắc vị và từng khoảnh khắc thưởng thức.', 'hero-omakase', false, 3)
on conflict (id) do nothing;

-- Trình tự món của từng suất
insert into public.omakase_courses (set_id, section, items, sort_order) values
  ('kaze', 'Khai vị', array['Tảo nâu Mozuku']::text[], 0),
  ('kaze', 'Sashimi', array['Sò điệp', 'Bụng cá ngừ']::text[], 1),
  ('kaze', 'Sushi & món chính', array['Cá Cam', 'Madai', 'Mansaba', 'Chanwamusi', 'Handroll', 'Otoro', 'Chutoro', 'Nigitoro', 'Wagyu Onsen']::text[], 2),
  ('kaze', 'Tráng miệng', array['Mochi']::text[], 3);

-- 12 ghế quầy. Toạ độ dùng để dựng mô hình 3D trong mini app.
insert into public.seats (id, label, zone, pos_x, pos_z, rotation, is_premium, note, sort_order) values
  ('Q1', 'Q1', 'counter', -2.52, -0.65, 90, false, null, 0),
  ('Q2', 'Q2', 'counter', -2.52, -0.05, 90, false, null, 1),
  ('Q3', 'Q3', 'counter', -2.52, 0.55, 90, false, null, 2),
  ('Q4', 'Q4', 'counter', -2.52, 1.15, 90, false, null, 3),
  ('Q5', 'Q5', 'counter', -1.5, 1.78, 0, false, null, 4),
  ('Q6', 'Q6', 'counter', -0.75, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 5),
  ('Q7', 'Q7', 'counter', 0, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 6),
  ('Q8', 'Q8', 'counter', 0.75, 1.78, 0, true, 'Nhìn thẳng tay bếp trưởng', 7),
  ('Q9', 'Q9', 'counter', 1.5, 1.78, 0, false, null, 8),
  ('Q10', 'Q10', 'counter', 2.52, 0.95, 270, false, null, 9),
  ('Q11', 'Q11', 'counter', 2.52, 0.25, 270, false, null, 10),
  ('Q12', 'Q12', 'counter', 2.52, -0.45, 270, false, null, 11)
on conflict (id) do nothing;

commit;
