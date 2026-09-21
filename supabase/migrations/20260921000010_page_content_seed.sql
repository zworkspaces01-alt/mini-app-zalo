-- ============================================================
-- Nội dung mặc định cho các trang mini app
--
-- TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG. Đừng sửa tay.
-- Nguồn: src/data/page-content.ts
-- Sinh lại: node supabase/seed/generate-content-seed.mjs
--
-- Chỉ điền chỗ còn trống, không ghi đè thứ nhà hàng đã sửa trong CMS.
-- Chạy lại được nhiều lần.
-- ============================================================

-- Banner home_hero: chỉ thêm khi vị trí này chưa có banner nào.
insert into public.banners
  (placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent,
   is_active, sort_order, i18n)
select v.placement, v.title, v.subtitle, v.tag, v.jp_text, v.image_url, v.cta_text,
       v.cta_link, v.accent, true, v.sort_order, v.i18n
from (values
  ('home_hero', 'Tiệc Bếp Trưởng Omakase', 'Trải nghiệm ẩm thực Kaiseki đỉnh cao tại quầy Bar riêng tư 12 ghế', 'OMAKASE VIP', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-omakase.jpg', 'Xem suất tiệc', '/omakase', null, 0, '{"en":{"title":"Master Chef Omakase Feast","subtitle":"Exquisite Kaiseki dining at an exclusive private 12-seat counter","tag":"VIP OMAKASE","cta_text":"Explore sets"},"ja":{"title":"総料理長 おまかせコース","subtitle":"限定12席の檜カウンターで味わう至高の会席・江戸前料理","tag":"VIPおまかせ","cta_text":"コースを見る"}}'::jsonb),
  ('home_hero', 'Thịt Bò Wagyu A5 Tươi', 'Sơ chế cắt theo yêu cầu: Steak, Lẩu Shabu, Nướng Yakiniku', 'MIYAKO BUTCHER', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-wagyu.jpg', 'Mua mang về', '/butcher', '#881008', 1, '{"en":{"title":"Fresh Japanese A5 Wagyu","subtitle":"Custom-cut to order: Steak, Shabu Hotpot, Yakiniku Grill","tag":"MIYAKO BUTCHER","cta_text":"Shop meats"},"ja":{"title":"切り立て A5ランク黒毛和牛","subtitle":"ステーキ・しゃぶしゃぶ・焼肉用にお好みの厚さでカット","tag":"宮古 精肉店","cta_text":"精肉を見る"}}'::jsonb),
  ('home_hero', 'Lẩu Shabu & Sukiyaki', 'Tặng kèm nước dùng hầm 12h, rau nấm và sốt mè rang Nhật Bản', 'SET LẨU TẠI GIA', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-hotpot.jpg', 'Đặt giao ngay', '/menu', null, 2, '{"en":{"title":"Shabu & Sukiyaki Sets","subtitle":"Free 12h slow-simmered broth, fresh greens, and sesame sauce","tag":"HOME HOTPOT SET","cta_text":"Order delivery"},"ja":{"title":"特選しゃぶしゃぶ＆すき焼き","subtitle":"12時間煮込み特製出汁・旬の野菜・特製胡麻だれ付き","tag":"おうち鍋セット","cta_text":"今すぐ注文"}}'::jsonb),
  ('home_hero', 'Sashimi Tươi Sống Mỗi Ngày', 'Cá ngừ đại dương Hon Maguro & bụng cá hồi Na Uy thượng hạng', 'TOYOSU DAILY', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-sushi.jpg', 'Khám phá menu', '/menu', null, 3, '{"en":{"title":"Fresh Daily Sashimi","subtitle":"Prime Pacific bluefin Hon-Maguro & fresh Norwegian salmon belly","tag":"TOYOSU DAILY","cta_text":"Explore menu"},"ja":{"title":"朝獲れ 鮮魚のお造り","subtitle":"本鮪大トロとノルウェー産最高級サーモンの贅沢盛り合わせ","tag":"豊洲市場より毎日空輸","cta_text":"メニューを見る"}}'::jsonb)
) as v(placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent, sort_order, i18n)
where not exists (select 1 from public.banners where placement = 'home_hero');

-- Banner omakase_hero: chỉ thêm khi vị trí này chưa có banner nào.
insert into public.banners
  (placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent,
   is_active, sort_order, i18n)
select v.placement, v.title, v.subtitle, v.tag, v.jp_text, v.image_url, v.cta_text,
       v.cta_link, v.accent, true, v.sort_order, v.i18n
from (values
  ('omakase_hero', 'Không Gian Quầy Bar Bếp Trưởng', 'Không gian 12 ghế gỗ Hinoki độc quyền, nơi thực khách trực diện chiêm ngưỡng từng thao tác dao và nghệ thuật nắn sushi đỉnh cao.', 'Quầy Itamae 12 Ghế Bếp Trưởng', '板前カウンター · 12 SEATS', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-counter-mood.jpg', null, null, null, 0, '{"en":{"title":"Master Chef Counter Bar","subtitle":"Exclusive 12 Hinoki seats where guests directly appreciate knife skills and the apex of sushi crafting.","tag":"12-Seat Master Itamae Bar"},"ja":{"title":"板前カウンターの空間","subtitle":"厳選された檜の一枚板カウンター12席。職人の繊細な包丁さばきと美しい握りの技を間近で堪能。","tag":"板前カウンター12席"}}'::jsonb),
  ('omakase_hero', 'Kỹ Nghệ Nắn Sushi Đỉnh Cao', 'Chiêm ngưỡng Bếp trưởng nắn Nigiri, điểm xuyết Uni tươi, Otoro và vảy vàng 24k phục vụ ngay trong tích tắc chuẩn nhiệt độ.', 'Nghệ Thuật Trình Diễn Tại Chỗ', '職人技 · MASTER CHEF CRAFT', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-chef-prep.jpg', null, null, null, 1, '{"en":{"title":"Pinnacle of Sushi Craftsmanship","subtitle":"Witness the Head Chef sculpt Nigiri with fresh Uni, rich Otoro and 24K gold leaf, served in an instant at perfect warmth.","tag":"Live Culinary Artistry"},"ja":{"title":"至高の江戸前寿司の技","subtitle":"新鮮な雲丹、大トロ、純金箔を散りばめた握りたてのひと貫。温度と鮮度を極めた至福の口福。","tag":"目の前で魅せる職人技"}}'::jsonb),
  ('omakase_hero', 'Không Gian Omakase VIP Riêng Tư', 'Phòng riêng biệt lập từ 4-10 khách với bàn Horigotatsu chìm ấm cúng cho tiệc ngoại giao và họp mặt gia đình trang trọng.', 'Phòng VIP Tatami Riêng Tư', '個室畳 · PRIVATE TATAMI ROOM', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-tatami.jpg', null, null, null, 2, '{"en":{"title":"Private VIP Omakase Setting","subtitle":"Secluded suite for 4-10 guests with sunken Horigotatsu table, ideal for diplomatic dinners and intimate family milestones.","tag":"Private Tatami VIP Suite"},"ja":{"title":"格調高いVIP個室空間","subtitle":"4〜10名様用の静謐な個室。足を楽にできる掘りごたつで、大切な接待やご家族の記念日を特別に演出。","tag":"完全個室 畳掘りごたつ"}}'::jsonb),
  ('omakase_hero', 'Bò Wagyu A5 Nướng Đá Núi Lửa', 'Vân mỡ cẩm thạch béo ngậy tan chảy trên đầu lưỡi, nướng xèo xèo đánh thức mọi giác quan của thực khách sành ăn.', 'Miyazaki Wagyu A5 · Núi Lửa Phú Sĩ', '宮崎牛 · WAGYU A5 PERFECTION', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-wagyu.jpg', null, null, null, 3, '{"en":{"title":"A5 Wagyu on Volcano Stone","subtitle":"Delicate marbling melting effortlessly on the palate, sizzling on volcanic stone to awaken all senses.","tag":"Miyazaki A5 Wagyu · Fuji Stone"},"ja":{"title":"A5ランク和牛の溶岩石焼き","subtitle":"極上の霜降りが舌の上ですっととろける芳醇な旨み。熱々の溶岩プレートが五感を心地よく刺激します。","tag":"宮崎牛A5 · 富士山溶岩焼き"}}'::jsonb),
  ('omakase_hero', 'Otoro Vảy Vàng & Nhím Biển Uni', 'Bụng cá ngừ Hon-Maguro béo đậm dát vàng 24k kết hợp cùng trứng cá tầm Caviar hoàng đế.', '100% Nhập Khẩu Hàng Không', '江戸前寿司 · EDOMAE CRAFTSMANSHIP', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-sushi.jpg', null, null, null, 4, '{"en":{"title":"Gold-Leaf Otoro & Fresh Sea Urchin","subtitle":"Decadent bluefin tuna Otoro leafed in 24k gold, complemented by imperial sturgeon caviar.","tag":"100% Air-Flown Fresh Daily"},"ja":{"title":"金箔大トロと極上生うに","subtitle":"本鮪大トロに純度24Kの金箔と最高峰キャビアを贅沢に添えた、宮古を象徴するスペシャリテ。","tag":"豊洲より毎朝100%空輸"}}'::jsonb)
) as v(placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent, sort_order, i18n)
where not exists (select 1 from public.banners where placement = 'omakase_hero');

-- Banner butcher_hero: chỉ thêm khi vị trí này chưa có banner nào.
insert into public.banners
  (placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent,
   is_active, sort_order, i18n)
select v.placement, v.title, v.subtitle, v.tag, v.jp_text, v.image_url, v.cta_text,
       v.cta_link, v.accent, true, v.sort_order, v.i18n
from (values
  ('butcher_hero', 'Vân Mỡ Cẩm Thạch BMS 10-12', 'Nhập khẩu nguyên con từ Miyazaki, cắt lát theo yêu cầu Steak / Nướng / Lẩu', 'WAGYU A5 NHẬT BẢN', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-wagyu.jpg', 'Khám phá Wagyu A5', '/butcher?tab=wagyu', '#7b0808', 0, '{"en":{"title":"Marble Fat Score BMS 10-12","subtitle":"Directly imported from Miyazaki, custom sliced for Steak, Grill, or Shabu","tag":"JAPANESE A5 WAGYU","cta_text":"Explore A5 Wagyu"},"ja":{"title":"最高峰 BMS 10-12 の極上霜降り","subtitle":"宮崎県より産地直送。ステーキ・焼肉・しゃぶしゃぶ用に無料カット","tag":"日本産 A5ランク和牛","cta_text":"A5和牛を見る"}}'::jsonb),
  ('butcher_hero', 'Thịt Nướng BBQ & Lẩu Shabu', 'Tặng kèm nước dùng hầm 12h, rau củ và sốt chấm mè rang chuẩn vị', 'SET TIỆC TẠI GIA', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-hotpot.jpg', 'Xem Set Nướng / Lẩu', '/butcher?tab=box', '#2e1704', 1, '{"en":{"title":"BBQ Grill & Shabu Hotpot Box","subtitle":"Free 12h simmered Dashi broth, fresh vegetables, and roasted sesame sauce","tag":"HOME FEAST SET","cta_text":"View Grill / Shabu Sets"},"ja":{"title":"特選 焼肉＆しゃぶしゃぶセット","subtitle":"12時間煮込んだ特製出汁、季節の野菜、胡麻だれを無料でお届け","tag":"おうち贅沢セット","cta_text":"セットを見る"}}'::jsonb),
  ('butcher_hero', 'Bò Mỹ Prime Cao Cấp', 'Thăn lưng & dẻ sườn mềm mọng, ngọt đậm cho bữa tiệc gia đình', 'US PRIME BEEF', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-don.jpg', 'Xem Bò Mỹ Prime', '/butcher?tab=us', null, 2, '{"en":{"title":"Premium US Prime Beef","subtitle":"Ribeye & short ribs juicy, rich flavor for family gatherings","tag":"US PRIME BEEF","cta_text":"View US Prime Beef"},"ja":{"title":"厳選 USプライムビーフ","subtitle":"リブアイや骨付きカルビなど、ご家庭でのごちそうに最適な旨味","tag":"US プライムビーフ","cta_text":"USプライムを見る"}}'::jsonb),
  ('butcher_hero', 'Đóng Khay Khí Trơ & Đá Gel', 'Giữ trọn vẹn độ tươi ngon và nhiệt độ lạnh sâu tới tận tay khách hàng', 'GIAO HỎA TỐC 2H', null, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/space.jpg', 'Đặt mua giao ngay', '/butcher', '#0d1f38', 3, '{"en":{"title":"Thermal Gel & Vacuum Tray","subtitle":"Maintaining peak chill freshness straight to your kitchen table","tag":"2-HOUR EXPRESS","cta_text":"Order Delivery"},"ja":{"title":"保冷剤入り真空パック包装","subtitle":"新鮮な美味しさと冷温を損なわずご家庭の食卓まで直送","tag":"市内2時間スピード配達","cta_text":"今すぐ注文する"}}'::jsonb)
) as v(placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent, sort_order, i18n)
where not exists (select 1 from public.banners where placement = 'butcher_hero');

-- home_search: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('home_search', null, 'Tìm Bò Wagyu A5 nướng than hoa...', null, null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Search Charcoal Grilled A5 Wagyu..."},"ja":{"title":"炭火焼きA5和牛を探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Sashimi Cá Hồi Na Uy tươi sống...', null, null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Search Fresh Norwegian Salmon..."},"ja":{"title":"新鮮な生サーモン刺身を探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Tiệc Bếp Trưởng Omakase 12 ghế...', null, null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Search Master Chef Omakase 12 seats..."},"ja":{"title":"板前おまかせコース12席を探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Set Lẩu Shabu Shabu & Sukiyaki...', null, null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Search Shabu Shabu & Sukiyaki Boxes..."},"ja":{"title":"しゃぶしゃぶ＆すき焼きセットを探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Cơm Lươn Nhật sốt Kabayaki...', null, null, null, null, null, null, '{}'::jsonb, 4, '{"en":{"title":"Search Japanese Eel Donburi..."},"ja":{"title":"特製うな重・蒲焼きを探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Thịt Bò Tươi Butcher cắt lát...', null, null, null, null, null, null, '{}'::jsonb, 5, '{"en":{"title":"Search Butcher Fresh Sliced Beef..."},"ja":{"title":"切り立て和牛精肉を探す..."}}'::jsonb),
  ('home_search', null, 'Tìm Sushi bụng cá ngừ Otoro béo ngậy...', null, null, null, null, null, null, '{}'::jsonb, 6, '{"en":{"title":"Search Melting Otoro Bluefin Tuna..."},"ja":{"title":"とろける本鮪大トロを探す..."}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'home_search');

-- menu_search: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('menu_search', null, 'Tìm Bò Wagyu A5 nướng than hoa...', null, null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Search Charcoal Grilled A5 Wagyu..."},"ja":{"title":"炭火焼きA5和牛を探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Sashimi Cá Hồi Na Uy tươi sống...', null, null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Search Fresh Norwegian Salmon..."},"ja":{"title":"新鮮な生サーモン刺身を探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Tiệc Bếp Trưởng Omakase 12 ghế...', null, null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Search Master Chef Omakase 12 seats..."},"ja":{"title":"板前おまかせコース12席を探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Set Lẩu Shabu Shabu & Sukiyaki...', null, null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Search Shabu Shabu & Sukiyaki Boxes..."},"ja":{"title":"しゃぶしゃぶ＆すき焼きセットを探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Cơm Lươn Nhật sốt Kabayaki...', null, null, null, null, null, null, '{}'::jsonb, 4, '{"en":{"title":"Search Japanese Eel Donburi..."},"ja":{"title":"特製うな重・蒲焼きを探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Thịt Bò Tươi Butcher cắt lát...', null, null, null, null, null, null, '{}'::jsonb, 5, '{"en":{"title":"Search Butcher Fresh Sliced Beef..."},"ja":{"title":"切り立て和牛精肉を探す..."}}'::jsonb),
  ('menu_search', null, 'Tìm Sushi bụng cá ngừ Otoro béo ngậy...', null, null, null, null, null, null, '{}'::jsonb, 6, '{"en":{"title":"Search Melting Otoro Bluefin Tuna..."},"ja":{"title":"とろける本鮪大トロを探す..."}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'menu_search');

-- butcher_search: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('butcher_search', null, 'Tìm Bò Wagyu A5 nướng than...', null, null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Search Charcoal Grilled A5 Wagyu..."},"ja":{"title":"備長炭焼きA5和牛を探す..."}}'::jsonb),
  ('butcher_search', null, 'Tìm Bò Mỹ Prime cắt Steak...', null, null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Search US Prime Steak Cut..."},"ja":{"title":"USプライム ステーキカットを探す..."}}'::jsonb),
  ('butcher_search', null, 'Tìm Set thịt nướng BBQ tại gia...', null, null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Search Home BBQ Meat Box..."},"ja":{"title":"おうち焼肉・BBQセットを探す..."}}'::jsonb),
  ('butcher_search', null, 'Tìm Sốt ướp Yakiniku đặc biệt...', null, null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Search Specialty Yakiniku Sauce..."},"ja":{"title":"宮古特製焼肉のタレを探す..."}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'butcher_search');

-- home_tab: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('home_tab', 'fire', 'Gợi ý hôm nay', null, null, null, null, null, null, '{"categories":[]}'::jsonb, 0, '{"en":{"title":"Chef''s Picks"},"ja":{"title":"本日のおすすめ"}}'::jsonb),
  ('home_tab', 'sushi', 'Sashimi & Sushi', null, null, null, null, null, null, '{"categories":["sashimi","sushi","maki"]}'::jsonb, 1, '{"en":{"title":"Sashimi & Sushi"},"ja":{"title":"刺身・寿司"}}'::jsonb),
  ('home_tab', 'meat', 'Wagyu Thượng Hạng', null, null, null, null, null, null, '{"categories":["wagyu","nuong"]}'::jsonb, 2, '{"en":{"title":"Premium Wagyu"},"ja":{"title":"特選和牛"}}'::jsonb),
  ('home_tab', 'hotpot', 'Lẩu & Món Nóng', null, null, null, null, null, null, '{"categories":["lau"]}'::jsonb, 3, '{"en":{"title":"Hotpot & Warm"},"ja":{"title":"鍋・温物"}}'::jsonb),
  ('home_tab', 'takeaway', 'Thịt Bò Mang Về', null, null, null, null, null, null, '{"categories":["butcher"]}'::jsonb, 4, '{"en":{"title":"Takeaway Meats"},"ja":{"title":"精肉テイクアウト"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'home_tab');

-- home_promo: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('home_promo', 'butcher', 'Thịt Bò Wagyu Nhật A5 Cắt Theo Yêu Cầu', 'Giao nhanh 45p', 'Thịt tươi hút chân không kèm đá gel giữ nhiệt. Tùy chọn cắt lát Lẩu (1.5mm), Nướng (3.5mm), Steak (2cm).', 'MIYAKO BUTCHER', null, null, '/butcher', '{}'::jsonb, 0, '{"en":{"title":"Custom-Cut Japanese A5 Wagyu Beef","subtitle":"45-min delivery","body":"Vacuum packed with thermal ice gel. Custom slicing for Shabu (1.5mm), Yakiniku (3.5mm), Steak (2cm).","tag":"MIYAKO BUTCHER"},"ja":{"title":"ご希望に合わせてカットする日本産A5和牛","subtitle":"45分スピード配達","body":"保冷剤入り真空パック包装。しゃぶしゃぶ(1.5mm)、焼肉(3.5mm)、ステーキ(2cm)など無料カット。","tag":"MIYAKO BUTCHER"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'home_promo');

-- home_highlight: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('home_highlight', 'shield', '100% Chính Ngạch', 'Wagyu A5 & Bò Mỹ', null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"100% Certified","subtitle":"A5 Wagyu & US Beef"},"ja":{"title":"100%正規輸入","subtitle":"A5和牛・US牛"}}'::jsonb),
  ('home_highlight', 'snowflake', 'Đóng Thùng Gel', 'Giữ lạnh tuyệt đối', null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Thermal Gel Pack","subtitle":"Deep chill fresh"},"ja":{"title":"保冷パック包装","subtitle":"冷温と鮮度を保持"}}'::jsonb),
  ('home_highlight', 'lightning', 'Giao 45 Phút', 'Nội thành hỏa tốc', null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"45-Min Express","subtitle":"Inner city rapid"},"ja":{"title":"45分スピード配達","subtitle":"市内迅速にお届け"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'home_highlight');

-- home_offer: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('home_offer', null, 'Giảm 100.000đ', 'Áp dụng hóa đơn từ 1.000.000đ', 'HSD: 31/12/2026', null, null, null, '/menu', '{}'::jsonb, 0, '{"en":{"title":"100,000₫ Discount","subtitle":"For orders from 1,000,000₫","body":"EXP: 31/12/2026"},"ja":{"title":"100,000₫ 割引","subtitle":"1,000,000₫以上のお会計で利用可能","body":"有効期限: 2026/12/31"}}'::jsonb),
  ('home_offer', null, 'Giảm 15% Set Bò Wagyu', 'Thịt bò tươi cắt trong ngày', null, 'WAGYU15', null, null, '/butcher', '{}'::jsonb, 1, '{"en":{"title":"15% Off Wagyu Sets","subtitle":"Fresh meats cut daily","tag":"WAGYU15"},"ja":{"title":"和牛セット 15% OFF","subtitle":"当日切り立て新鮮和牛精肉","tag":"WAGYU15"}}'::jsonb),
  ('home_offer', null, 'Tặng 1 Đĩa Sashimi', 'Khi đặt bàn trước 18h hàng ngày', null, 'FREEOMAKASE', null, null, '/booking', '{}'::jsonb, 2, '{"en":{"title":"Free Salmon Sashimi Plate","subtitle":"For bookings before 6:00 PM daily","tag":"FREEOMAKASE"},"ja":{"title":"特選刺身一皿プレゼント","subtitle":"毎日18時までのご予約限定","tag":"FREEOMAKASE"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'home_offer');

-- omakase_step: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('omakase_step', null, 'Khai vị tinh tế', null, 'Đánh thức vị giác với nguyên liệu theo mùa tươi mát', null, 'Sakizuke', null, null, '{}'::jsonb, 0, '{"en":{"title":"Delicate Appetizer","body":"Awakens palate with fresh seasonal ingredients"},"ja":{"title":"先付け（前菜）","body":"旬の味覚で五感を優しく目覚めさせる最初の一品"}}'::jsonb),
  ('omakase_step', null, 'Sashimi hải vị', null, 'Hải sản tươi sống vận chuyển bằng đường hàng không', null, 'Otsukuri', null, null, '{}'::jsonb, 1, '{"en":{"title":"Seasonal Sashimi","body":"Prime seafood air-flown daily from Toyosu Market"},"ja":{"title":"お造り（刺身）","body":"豊洲から直送された鮮魚の洗練されたお造り"}}'::jsonb),
  ('omakase_step', null, 'Món nướng than hoa', null, 'Bò Wagyu hoặc Lươn nướng thơm lừng chuẩn vị', null, 'Yakimono', null, null, '{}'::jsonb, 2, '{"en":{"title":"Charcoal Grilled Course","body":"Fragrant grilled Wagyu or glazed Unagi"},"ja":{"title":"焼き物","body":"備長炭の香ばしさを纏わせた和牛や旬魚の焼き物"}}'::jsonb),
  ('omakase_step', null, 'Sushi thủ công', null, 'Nghệ thuật nắn cơm giấm ấm và hải vị quý hiếm', null, 'Nigiri Edo', null, null, '{}'::jsonb, 3, '{"en":{"title":"Artisan Edomae Sushi","body":"Craftsmanship of warm shari and rare seafood treasures"},"ja":{"title":"江戸前握り寿司","body":"赤酢シャリと極上ネタをその場で握る伝統の技"}}'::jsonb),
  ('omakase_step', null, 'Bò đá núi lửa', null, 'Vị béo ngậy tan chảy của Wagyu A5 Miyazaki', null, 'Wagyu A5', null, null, '{}'::jsonb, 4, '{"en":{"title":"Volcano Stone Wagyu","body":"Melting richness of certified Miyazaki A5 Wagyu"},"ja":{"title":"極上A5和牛","body":"口どけ豊かな宮崎牛A5の上質な脂と赤身の調和"}}'::jsonb),
  ('omakase_step', null, 'Canh thanh vị', null, 'Nước dùng Dashi ấm bụng kết thúc món chính', null, 'Tome-wan', null, null, '{}'::jsonb, 5, '{"en":{"title":"Finishing Soup","body":"Warm rich Dashi broth gently closing the savory journey"},"ja":{"title":"止椀（お椀）","body":"丁寧に引いた出汁でホッとする締めのお吸い物"}}'::jsonb),
  ('omakase_step', null, 'Wagashi & Matcha', null, 'Tráng miệng thanh tao khép lại trọn vẹn hành trình', null, 'Mizumono', null, null, '{}'::jsonb, 6, '{"en":{"title":"Wagashi & Ceremonial Tea","body":"Refreshing traditional dessert rounding off the feast"},"ja":{"title":"水物・甘味","body":"季節の和菓子と香り高い抹茶で締めくくる余韻"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'omakase_step');

-- omakase_gallery: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('omakase_gallery', 'space', 'Quầy Bar Itamae 12 Chỗ', null, '12 chỗ ngồi độc quyền bao quanh quầy chế tác gỗ Hinoki, nơi thực khách trực diện thưởng lãm nghệ thuật ẩm thực từ Bếp Trưởng.', 'Không gian Omakase', '板前カウンター · 12 SEATS', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-counter-mood.jpg', null, '{"seating":"counter","aspect":"3/4"}'::jsonb, 0, '{"en":{"title":"12-Seat Itamae Counter","body":"Exclusive 12 seats surrounding the natural Hinoki counter, offering direct view of master culinary craftsmanship.","tag":"Omakase Space"},"ja":{"title":"板前カウンター12席","body":"樹齢数百年の檜カウンターを囲む限定12席。総料理長の鮮やかな手捌きを特等席でお愉しみいただけます。","tag":"空間・個室"}}'::jsonb),
  ('omakase_gallery', 'dish', 'Chế Tác Otoro & Uni Vàng 24K', null, 'Bếp trưởng nắn từng khối cơm giấm ấm, đặt lát cá ngừ Hon-Maguro béo đậm, nhím biển Hokkaido và dát vảy vàng 24k ngay trước mắt thực khách.', 'Món ăn tại quầy', '大トロ雲丹 · CHEF''S CRAFT', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-chef-prep.jpg', null, '{"seating":"counter","aspect":"3/4"}'::jsonb, 1, '{"en":{"title":"Crafting Otoro & 24K Uni","body":"The chef handcrafts warm Edomae shari, topped with rich Hon-Maguro Otoro, Hokkaido Uni, and delicate 24K gold flakes.","tag":"Counter Dish"},"ja":{"title":"大トロ雲丹・24K金箔のにぎり","body":"温かい赤酢のシャリに極上本鮪大トロ、北海道産雲丹をのせ、純金箔をあしらって握りたてをお出しします。","tag":"板前料理"}}'::jsonb),
  ('omakase_gallery', 'dish', 'Miyazaki Wagyu A5 Nướng Đá', null, 'Thịt bò Miyazaki Wagyu A5 vân mỡ hoa cẩm thạch béo ngậy tan chảy trên phiến đá núi lửa Phú Sĩ, ngập tràn hương vị đậm đà.', 'Món ăn tại quầy', '宮崎牛 A5 · VOLCANO STONE', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-wagyu.jpg', null, '{"aspect":"1/1"}'::jsonb, 2, '{"en":{"title":"Volcano Stone Miyazaki Wagyu A5","body":"Miyazaki A5 Wagyu with intricate marble fat melting on Fuji volcanic stone, bursting with unforgettable rich umami.","tag":"Counter Dish"},"ja":{"title":"宮崎牛 A5 溶岩石焼き","body":"富士山溶岩プレートの上でジュワッと焼き上げる宮崎牛A5。口に入れた瞬間に上質な脂の甘みがとろけます。","tag":"板前料理"}}'::jsonb),
  ('omakase_gallery', 'space', 'Phòng VIP Tatami Omakase', null, 'Phòng tiệc riêng tư 4-10 khách phong cách Nhật Bản với sàn chiếu Tatami, bàn chìm chân Horigotatsu và cửa trượt Shoji cách âm.', 'Không gian Omakase', '個室掘りごたつ · PRIVATE ROOM', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-tatami.jpg', null, '{"seating":"private","aspect":"4/5"}'::jsonb, 3, '{"en":{"title":"VIP Tatami Private Room","body":"Japanese style private room for 4-10 guests featuring authentic Tatami mats, sunken Horigotatsu table and Shoji screens.","tag":"Omakase Space"},"ja":{"title":"完全個室 畳掘りごたつ席","body":"4〜10名様対応の完全個室。伝統の畳敷きと足を伸ばせる掘りごたつ、防音障子戸で大切なご会食を優雅に演出。","tag":"空間・個室"}}'::jsonb),
  ('omakase_gallery', 'dish', 'Otoro & Trứng Cá Tầm Caviar', null, 'Sashimi và Nigiri bụng cá ngừ vây xanh hảo hạng kết hợp cùng trứng cá tầm Caviar hoàng gia và vảy vàng lấp lánh.', 'Món ăn tại quầy', '本鮪大トロ · CAVIAR NIGIRI', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-sushi.jpg', null, '{"aspect":"1/1"}'::jsonb, 4, '{"en":{"title":"Otoro & Royal Caviar","body":"Prime bluefin tuna Otoro sashimi and nigiri crowned with royal sturgeon caviar and glistening gold leaf.","tag":"Counter Dish"},"ja":{"title":"本鮪大トロ キャビアのせ","body":"脂ののった極上本鮪大トロに、贅沢な最高級キャビアと金箔を添えた珠玉のひと品。","tag":"板前料理"}}'::jsonb),
  ('omakase_gallery', 'space', 'Gỗ Bách Hinoki & Gốm Thủ Công', null, 'Đường nét tinh tế của phiến gỗ Hinoki nguyên khối cùng bộ chén đĩa gốm mộc tráng men tạo nên cảm giác ấm áp và tĩnh tại chuẩn phong vị Nhật Bản.', 'Không gian Omakase', '檜木目の美 · HINOKI DETAIL', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/omakase-counter.jpg', null, '{"seating":"counter","aspect":"4/3"}'::jsonb, 5, '{"en":{"title":"Hinoki Wood & Artisanal Ceramics","body":"Refined grain of solid Hinoki cypress paired with handcrafted glazed pottery brings authentic warmth and zen tranquility.","tag":"Omakase Space"},"ja":{"title":"檜カウンターと和食器の美","body":"樹齢を重ねた無垢の檜の木目と、職人が焼き上げた温もりある和陶器が心地よい静寂と安らぎをもたらします。","tag":"空間・個室"}}'::jsonb),
  ('omakase_gallery', 'dish', 'Tuyệt Tác Hải Sản Omakase', null, '100% hải sản được nhập khẩu tươi sống bằng đường hàng không mỗi sáng từ chợ Toyosu Tokyo, phục vụ chuẩn nhiệt độ.', 'Món ăn tại quầy', 'おまかせ海鮮 · EDOMAE ART', 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-omakase.jpg', null, '{"aspect":"4/3"}'::jsonb, 6, '{"en":{"title":"Edomae Seafood Masterpieces","body":"100% live seafood air-flown every morning directly from Toyosu Market Tokyo, served at perfect serving temperature.","tag":"Counter Dish"},"ja":{"title":"豊洲直送 旬の海鮮おまかせ","body":"東京豊洲市場から毎朝空輸される活鮮魚。魚種ごとに最適な熟成と温度管理で最高の状態でお届けします。","tag":"板前料理"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'omakase_gallery');

-- about_spec: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('about_spec', null, 'Nhiệt độ', '−2°C – 2°C', null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Temperature","subtitle":"−2°C – 2°C"},"ja":{"title":"温度","subtitle":"−2°C – 2°C"}}'::jsonb),
  ('about_spec', null, 'Độ ẩm', '70% – 80%', null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Humidity","subtitle":"70% – 80%"},"ja":{"title":"湿度","subtitle":"70% – 80%"}}'::jsonb),
  ('about_spec', null, 'Tốc độ gió', '0,5 – 2 m/s', null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Airflow","subtitle":"0,5 – 2 m/s"},"ja":{"title":"風速","subtitle":"0,5 – 2 m/s"}}'::jsonb),
  ('about_spec', null, 'Thời gian ủ', '21 ngày', null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Aging time","subtitle":"21 days"},"ja":{"title":"熟成期間","subtitle":"21日間"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'about_spec');

-- butcher_tab: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('butcher_tab', 'wagyu', 'Wagyu Nhật A5', null, null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"A5 Wagyu"},"ja":{"title":"A5和牛"}}'::jsonb),
  ('butcher_tab', 'us', 'Bò Mỹ Prime', null, null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"US Prime"},"ja":{"title":"USプライム"}}'::jsonb),
  ('butcher_tab', 'box', 'Set Nướng & Lẩu', null, null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Home Boxes"},"ja":{"title":"セット"}}'::jsonb),
  ('butcher_tab', 'sauce', 'Sốt & Gia vị', null, null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Sauces"},"ja":{"title":"特製タレ"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'butcher_tab');

-- butcher_cut: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('butcher_cut', null, 'Steak 2.5cm', null, null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Steak 2.5cm"},"ja":{"title":"Steak 2.5cm"}}'::jsonb),
  ('butcher_cut', null, 'Yakiniku 3-4mm', null, null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Yakiniku 3-4mm"},"ja":{"title":"Yakiniku 3-4mm"}}'::jsonb),
  ('butcher_cut', null, 'Lẩu Shabu 1.5mm', null, null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Shabu 1.5mm"},"ja":{"title":"しゃぶしゃぶ 1.5mm"}}'::jsonb),
  ('butcher_cut', null, 'Nguyên tảng', null, null, null, null, null, null, '{}'::jsonb, 3, '{"en":{"title":"Whole Block"},"ja":{"title":"ブロック肉"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'butcher_cut');

-- butcher_promise: chỉ thêm khi section này chưa có dòng nào.
insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values
  ('butcher_promise', 'snowflake', 'Giữ lạnh 48h', 'Đá gel tiệt trùng', null, null, null, null, null, '{}'::jsonb, 0, '{"en":{"title":"Cold-chain 48h","subtitle":"Sterile Gel Packs"},"ja":{"title":"48時間保冷","subtitle":"保冷剤入りパック"}}'::jsonb),
  ('butcher_promise', 'knife', 'Cắt theo món', 'Steak/Nướng/Lẩu', null, null, null, null, null, '{}'::jsonb, 1, '{"en":{"title":"Custom Cut","subtitle":"Steak/Grill/Shabu"},"ja":{"title":"オーダーカット","subtitle":"ステーキ・焼肉・鍋"}}'::jsonb),
  ('butcher_promise', 'delivery', 'Giao tận nơi', 'Hoặc lấy tại quán', null, null, null, null, null, '{}'::jsonb, 2, '{"en":{"title":"Doorstep Delivery","subtitle":"Or store pickup"},"ja":{"title":"スピード配達","subtitle":"店頭受け取り対応"}}'::jsonb)
) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = 'butcher_promise');

-- Hạng thành viên. Mốc điểm và tỷ lệ trùng với luật cũ viết trong hàm SQL.
insert into public.loyalty_tiers (code, name, min_points, earn_rate, color, perks, sort_order, i18n)
values
  ('bronze', 'Hạng Đồng', 0, 0.03, '#b08d57', array['Tích luỹ 3% trên mọi hoá đơn', 'Quyền đổi quà và voucher từ kho điểm thưởng']::text[], 0, '{"en":{"name":"Bronze","perks":["Earn 3% points on every bill","Redeem gifts and vouchers from the points store"]},"ja":{"name":"ブロンズ会員","perks":["すべてのお会計で3%ポイント還元","ポイント交換所で特典と交換"]}}'::jsonb),
  ('silver', 'Hạng Bạc', 300, 0.05, '#aab4be', array['Tích luỹ 5% trên mọi hoá đơn ăn tại quán hoặc Butcher', 'Tặng voucher 100.000đ trong tuần sinh nhật', 'Quyền đổi quà và voucher từ kho điểm thưởng']::text[], 1, '{"en":{"name":"Silver","perks":["Accumulate 5% points on all dine-in and Butcher orders","Gift a 100,000₫ voucher during birthday week","Right to redeem gifts and vouchers from points store"]},"ja":{"name":"シルバー会員","perks":["店内飲食・精肉注文のすべてで5%ポイント還元","お誕生週に100,000₫クーポンをプレゼント","ポイント交換所での限定アイテム交換権利"]}}'::jsonb),
  ('gold', 'Hạng Vàng', 800, 0.08, '#c9a96a', array['Tích luỹ 8% giá trị mọi hoá đơn (ăn tại chỗ & mang về)', 'Tặng 1 đĩa Sashimi Cá Hồi thượng hạng tháng sinh nhật', 'Ưu tiên xếp bàn phòng riêng Tatami sang trọng', 'Trải nghiệm trước các món mới trong mùa Omakase']::text[], 2, '{"en":{"name":"Gold","perks":["Accumulate 8% points on all orders (dine-in & take-away)","Free Premium Salmon Sashimi during birthday month","Priority seating in luxury Tatami VIP private rooms","Early tasting privileges for seasonal Omakase creations"]},"ja":{"name":"ゴールド会員","perks":["店内飲食・テイクアウトのすべてで8%ポイント還元","お誕生月に特選生サーモン刺身を一皿プレゼント","高級個室・畳席の優先リザーブ","季節のおまかせ新作メニューをいち早くテイスティング"]}}'::jsonb),
  ('diamond', 'Hạng Kim Cương', 2000, 0.12, '#67c7e8', array['Tích luỹ tối đa 12% giá trị trên mọi hoá đơn', 'Miễn phí 100% phụ phí phòng VIP & Tatami riêng tư', 'Tặng 1 chai Sake vảy vàng 720ml vào ngày sinh nhật', 'Đầu bếp trưởng Omakase thiết kế thực đơn riêng']::text[], 3, '{"en":{"name":"Diamond","perks":["Maximum 12% loyalty return on every transaction","100% waiver of VIP room & private Tatami room surcharges","Gift 1 bottle of 24K Gold Flake Sake 720ml on birthday","Exclusive custom-designed menu crafted by Head Chef"]},"ja":{"name":"ダイヤモンド会員","perks":["最大12%の最高還元率をすべての伝票に適用","VIP個室および畳席の利用料が100%完全無料","お誕生日に金箔入り特撰日本酒 720ml を1本進呈","総料理長によるオーダーメイド専用コースの設計"]}}'::jsonb)
on conflict (code) do nothing;

-- Nhiệm vụ nhận điểm. Điểm thưởng trùng với luật cũ viết trong hàm SQL.
insert into public.loyalty_quests (id, title, description, points, icon, sort_order, i18n)
values
  ('daily_checkin', 'Điểm danh mỗi ngày', 'Mở Zalo Mini App để nhận điểm tích luỹ hàng ngày', 15, '📅', 0, '{"en":{"title":"Daily Check-in","description":"Open Zalo Mini App to claim daily loyalty points"},"ja":{"title":"毎日ログイン","description":"アプリを開いて毎日の来店ポイントを獲得"}}'::jsonb),
  ('table_qr', 'Check-in dùng bữa tại nhà hàng', 'Quét QR tại bàn ăn hoặc hoá đơn thanh toán', 30, '🥢', 1, '{"en":{"title":"Dine-in Check-in","description":"Scan QR code at your dining table or invoice"},"ja":{"title":"店舗でチェックイン","description":"お席のQRコードまたは伝票をスキャン"}}'::jsonb),
  ('review', 'Đánh giá dịch vụ 5 sao', 'Để lại cảm nhận và hình ảnh trải nghiệm ẩm thực', 50, '⭐', 2, '{"en":{"title":"Leave 5-Star Review","description":"Share photos and feedback about your dining experience"},"ja":{"title":"5つ星レビューを投稿","description":"お料理の写真と感想を投稿してシェア"}}'::jsonb),
  ('share', 'Chia sẻ Miyako cho bạn bè', 'Mời bạn bè cùng gia nhập Miyako VIP Club', 100, '🎁', 3, '{"en":{"title":"Share with Friends","description":"Invite friends to join the Miyako VIP Club"},"ja":{"title":"お友達にシェア","description":"お友達を宮古VIPクラブにご招待"}}'::jsonb)
on conflict (id) do nothing;

-- Bản dịch cho các quà có sẵn — chỉ khi quà chưa có bản dịch và tên chưa bị sửa.
update public.reward_gifts set i18n = '{"en":{"title":"50,000₫ Cash Voucher","description":"Direct discount on dine-in or Butcher meat orders","worth_text":"Worth 50,000₫","badge":"Easiest"},"ja":{"title":"50,000₫ お食事券","description":"店内飲食または精肉のご購入時にご利用可能","worth_text":"50,000₫ 相当","badge":"交換しやすい"}}'::jsonb
where id = 'gift-v50' and i18n = '{}'::jsonb and title = 'Voucher Giảm 50.000đ';
update public.reward_gifts set i18n = '{"en":{"title":"100,000₫ Cash Voucher","description":"Applicable for orders from 500,000₫ across all locations","worth_text":"Worth 100,000₫","badge":"Popular"},"ja":{"title":"100,000₫ お食事券","description":"500,000₫以上のお会計で全店共通利用可能","worth_text":"100,000₫ 相当","badge":"人気"}}'::jsonb
where id = 'gift-v100' and i18n = '{}'::jsonb and title = 'Voucher Giảm 100.000đ';
update public.reward_gifts set i18n = '{"en":{"title":"200,000₫ Cash Voucher","description":"Applicable for all dining meals or Wagyu Butcher orders","worth_text":"Worth 200,000₫","badge":"Big Value"},"ja":{"title":"200,000₫ お食事券","description":"すべてのお食事または和牛精肉のご注文で利用可能","worth_text":"200,000₫ 相当","badge":"お得"}}'::jsonb
where id = 'gift-v200' and i18n = '{}'::jsonb and title = 'Voucher Giảm 200.000đ';
update public.reward_gifts set i18n = '{"en":{"title":"Fresh Norwegian Salmon Sashimi","description":"Complimentary premium fresh Norwegian salmon sashimi plate","worth_text":"Worth 185,000₫","badge":"Chef''s Pick"},"ja":{"title":"特選ノルウェー産生サーモン刺身","description":"極上ノルウェー産生サーモン刺身を一皿プレゼント","worth_text":"185,000₫ 相当","badge":"料理長おすすめ"}}'::jsonb
where id = 'gift-sashimi' and i18n = '{}'::jsonb and title = 'Sashimi Cá Hồi Na Uy Tươi';
update public.reward_gifts set i18n = '{"en":{"title":"A5 Wagyu on Volcano Stone","description":"Complimentary sizzling melt-in-mouth A5 Wagyu portion","worth_text":"Worth 360,000₫","badge":"Wagyu A5"},"ja":{"title":"A5和牛 溶岩石焼き","description":"芳醇な香りととろける旨味のA5和牛を1人前進呈","worth_text":"360,000₫ 相当","badge":"A5和牛"}}'::jsonb
where id = 'gift-wagyu' and i18n = '{}'::jsonb and title = 'Bò Wagyu A5 Nướng Đá Núi Lửa';
update public.reward_gifts set i18n = '{"en":{"title":"Gold Flake Sake Bottle 720ml","description":"Premium Japanese sake infused with pure 24k gold flakes","worth_text":"Worth 790,000₫","badge":"VIP Gift"},"ja":{"title":"金箔入り特撰日本酒 720ml","description":"純度24Kの金箔が舞う贅沢な日本産特撰酒","worth_text":"790,000₫ 相当","badge":"VIP限定"}}'::jsonb
where id = 'gift-sake' and i18n = '{}'::jsonb and title = 'Chai Rượu Sake Vảy Vàng 720ml';
update public.reward_gifts set i18n = '{"en":{"title":"1 Premium Omakase Ticket","description":"Full 12-course dining experience crafted by the Head Chef","worth_text":"Worth 1,500,000₫","badge":"Special"},"ja":{"title":"極上おまかせ食事券 1名様分","description":"総料理長が目の前で振る舞う全12品のコース体験","worth_text":"1,500,000₫ 相当","badge":"特別"}}'::jsonb
where id = 'gift-omakase' and i18n = '{}'::jsonb and title = '1 Vé Omakase Thượng Hạng';

-- Câu chữ và ảnh thương hiệu: chỉ điền cột còn trống.
update public.restaurant_settings set
  hours_text = coalesce(hours_text, 'Trưa 10:30 - 14:00 · Tối 17:30 - 22:30'),
  hotline_hours = coalesce(hotline_hours, '10:00 - 22:30'),
  hotline_note = coalesce(hotline_note, 'Liên hệ trực tiếp lễ tân để được hỗ trợ đặt bàn Omakase, giữ phòng riêng Tatami VIP hoặc giải đáp mọi thắc mắc.'),
  location_note = coalesce(location_note, 'Phố ẩm thực Đào Tấn, cách ngã tư Liễu Giai & Lotte Center ~300m.'),
  parking_note = coalesce(parking_note, 'Có nhân viên bảo vệ hỗ trợ hướng dẫn đỗ xe ô tô và xe máy tận nơi.'),
  about_counter_text = coalesce(about_counter_text, 'Quầy itamae có 12 ghế. Khách ngồi đối diện bếp, mỗi phần được dọn ngay khi vừa hoàn thiện, theo trình tự bếp trưởng đã định cho ngày hôm đó.'),
  about_wagyu_text = coalesce(about_wagyu_text, 'Miyako chỉ dùng wagyu A5 chính hãng, có chứng nhận xuất xứ đi kèm từng lô.'),
  private_room_note = coalesce(private_room_note, 'Phòng riêng sẽ được nhà hàng xác nhận lại theo số khách.'),
  butcher_title = coalesce(butcher_title, 'Miyako Wagyu Butcher Shop'),
  butcher_subtitle = coalesce(butcher_subtitle, 'Thịt tươi sơ chế theo yêu cầu'),
  butcher_intro = coalesce(butcher_intro, 'Thịt bò Wagyu Nhật Bản A5 & Bò Mỹ Prime cắt tươi trong ngày. Đóng khay hút chân không tiệt trùng kèm đá gel giữ nhiệt chuẩn tươi ngon.'),
  butcher_badge = coalesce(butcher_badge, 'A5 Wagyu Specialist'),
  butcher_guarantee = coalesce(butcher_guarantee, '✨ Miyako bảo đảm 100% thịt bò Wagyu nhập khẩu chính ngạch Nhật Bản'),
  delivery_eta_text = coalesce(delivery_eta_text, 'Giao ngay trong 1 giờ'),
  logo_url = coalesce(logo_url, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/logo.png'),
  logo_dark_url = coalesce(logo_dark_url, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/logo-dark.png'),
  logo_wide_url = coalesce(logo_wide_url, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/Light_4x-scaled.png'),
  logo_wide_dark_url = coalesce(logo_wide_dark_url, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/logo-horizontal-dark.png'),
  cover_image_url = coalesce(cover_image_url, 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/space.jpg')
where id = 1;

-- Bản dịch của các câu chữ trên. Bản dịch nhà hàng đã có thì giữ nguyên.
update public.restaurant_settings
set i18n = (i18n - 'en' - 'ja')
  || jsonb_build_object(
       'en', '{"hours_text":"Lunch 10:30 - 14:00 · Dinner 17:30 - 22:30","hotline_hours":"10:00 - 22:30","hotline_note":"Contact our reception directly for Omakase consultation, VIP room reservations, or express delivery.","location_note":"Dao Tan culinary street, ~300m from Lotte Center Hanoi.","parking_note":"Valet security staff available for both cars and motorbikes.","about_counter_text":"The itamae counter seats 12. Guests sit facing the chef, and each course is served the moment it is finished, in the order the head chef has set for the day.","about_wagyu_text":"Miyako serves only genuine A5 wagyu, with a certificate of origin for every lot.","private_room_note":"The restaurant will confirm the private room based on your party size.","butcher_title":"Miyako Wagyu Butcher Shop","butcher_subtitle":"Custom-cut fresh gourmet meats","butcher_intro":"Japanese A5 Wagyu & US Prime beef cut fresh daily. Vacuum-sealed with thermal gel ice packs for guaranteed freshness.","butcher_badge":"A5 Wagyu Specialist","butcher_guarantee":"✨ Miyako guarantees 100% officially imported authentic Japanese Wagyu","delivery_eta_text":"Delivered within 1 hour"}'::jsonb || coalesce(i18n -> 'en', '{}'::jsonb),
       'ja', '{"hours_text":"昼 10:30 - 14:00 · 夜 17:30 - 22:30","hotline_hours":"10:00 - 22:30","hotline_note":"おまかせコースのご相談、VIP個室の優先予約、テイクアウト注文を承ります。","location_note":"ダオタン日本食街、ロッテセンターハノイより徒歩約3分 (~300m)。","parking_note":"専属警備員が自動車・バイクの駐車をご案内いたします。","about_counter_text":"板前カウンターは12席。料理長の目の前で、その日の流れに沿って仕上がったばかりの一品をお出しします。","about_wagyu_text":"宮古では、ロットごとに産地証明書が付いた正規のA5和牛のみを使用しています。","private_room_note":"個室はご人数に合わせて店舗より改めてご連絡いたします。","butcher_title":"Miyako Wagyu Butcher Shop","butcher_subtitle":"ご希望に合わせてカットする極上精肉","butcher_intro":"厳選されたA5ランク日本産黒毛和牛とUSプライムビーフを毎日切り立てでご提供。保冷剤入り真空パックでお届け。","butcher_badge":"A5和牛専門店","butcher_guarantee":"✨ 宮古は日本産黒毛和牛100%正規輸入品であることを保証いたします","delivery_eta_text":"1時間以内にお届け"}'::jsonb || coalesce(i18n -> 'ja', '{}'::jsonb)
     )
where id = 1;

-- Nhãn, ảnh và suất chọn sẵn của các suất omakase, khớp theo giá.
update public.omakase_sets
set badge = 'VIP Nhất · Hoàng Gia',
    i18n = (i18n - 'en' - 'ja') || jsonb_build_object(
      'en', coalesce(i18n -> 'en', '{}'::jsonb) || '{"badge":"Royal VIP Tier"}'::jsonb,
      'ja', coalesce(i18n -> 'ja', '{}'::jsonb) || '{"badge":"最高峰・極み"}'::jsonb
    )
where price = 3000000 and badge is null;
update public.omakase_sets set image_path = 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-omakase.jpg'
where price = 3000000 and image_path is null;
update public.omakase_sets
set badge = 'Được Chọn Nhiều Nhất',
    i18n = (i18n - 'en' - 'ja') || jsonb_build_object(
      'en', coalesce(i18n -> 'en', '{}'::jsonb) || '{"badge":"Most Popular Choice"}'::jsonb,
      'ja', coalesce(i18n -> 'ja', '{}'::jsonb) || '{"badge":"一番人気"}'::jsonb
    )
where price = 2000000 and badge is null;
update public.omakase_sets set image_path = 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-wagyu.jpg'
where price = 2000000 and image_path is null;
update public.omakase_sets
set badge = 'Khởi Đầu Tinh Hoa',
    i18n = (i18n - 'en' - 'ja') || jsonb_build_object(
      'en', coalesce(i18n -> 'en', '{}'::jsonb) || '{"badge":"Essential Signature"}'::jsonb,
      'ja', coalesce(i18n -> 'ja', '{}'::jsonb) || '{"badge":"精選入門"}'::jsonb
    )
where price = 1000000 and badge is null;
update public.omakase_sets set image_path = 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-sushi.jpg'
where price = 1000000 and image_path is null;
update public.omakase_sets
set badge = 'Khởi Đầu Tinh Hoa',
    i18n = (i18n - 'en' - 'ja') || jsonb_build_object(
      'en', coalesce(i18n -> 'en', '{}'::jsonb) || '{"badge":"Essential Signature"}'::jsonb,
      'ja', coalesce(i18n -> 'ja', '{}'::jsonb) || '{"badge":"精選入門"}'::jsonb
    )
where price = 500000 and badge is null;
update public.omakase_sets set image_path = 'https://res.cloudinary.com/dn2qfbkbu/image/upload/f_auto,q_auto/v1789998866/miyako/static/hero-sushi.jpg'
where price = 500000 and image_path is null;
update public.omakase_sets set is_featured = true
where id = (select id from public.omakase_sets where price = 2000000 and is_active
            order by sort_order limit 1)
  and not exists (select 1 from public.omakase_sets where is_featured);

-- Nhãn lọc cho các món Butcher có sẵn.
update public.dishes set tags = array['wagyu']::text[] where id = 'butcher-a5-tenderloin' and tags = '{}';
update public.dishes set tags = array['wagyu']::text[] where id = 'butcher-a5-sirloin' and tags = '{}';
update public.dishes set tags = array['wagyu']::text[] where id = 'butcher-a5-chuck-roll' and tags = '{}';
update public.dishes set tags = array['us']::text[] where id = 'butcher-us-short-ribs' and tags = '{}';
update public.dishes set tags = array['box']::text[] where id = 'butcher-set-shabu-box' and tags = '{}';
update public.dishes set tags = array['box']::text[] where id = 'butcher-set-yakiniku-box' and tags = '{}';
update public.dishes set tags = array['sauce']::text[] where id = 'butcher-tare-sauce' and tags = '{}';
update public.dishes set tags = array['sauce']::text[] where id = 'butcher-ponzu-sauce' and tags = '{}';

-- Bản dịch vừa thêm viết tay, khớp bản gốc — không cần AI dịch lại.
update public.banners        set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.content_items  set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.loyalty_tiers  set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.loyalty_quests set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.reward_gifts   set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';

-- Cấu hình và suất omakase: trigger đã đánh dấu khớp khi bản dịch đổi.
-- Nhưng nếu còn trường tiếng Việt nào chưa có bản dịch (ví dụ tagline cũ
-- chưa từng dịch) thì phải để CMS báo "cần dịch".
update public.restaurant_settings r set i18n_hash = null
where exists (
  select 1
  from unnest(array['tagline', 'menu_price_note', 'cancellation_policy', 'hours_text', 'hotline_hours', 'hotline_note', 'location_note', 'parking_note', 'about_counter_text', 'about_wagyu_text', 'private_room_note', 'butcher_title', 'butcher_subtitle', 'butcher_intro', 'butcher_badge', 'butcher_guarantee', 'delivery_eta_text']) k
  where coalesce(to_jsonb(r) ->> k, '') <> ''
    and not (coalesce(r.i18n -> 'en', '{}'::jsonb) ? k and coalesce(r.i18n -> 'ja', '{}'::jsonb) ? k)
);

update public.omakase_sets s set i18n_hash = null
where exists (
  select 1
  from unnest(array['name', 'subtitle', 'description', 'badge']) k
  where coalesce(to_jsonb(s) ->> k, '') <> ''
    and not (coalesce(s.i18n -> 'en', '{}'::jsonb) ? k and coalesce(s.i18n -> 'ja', '{}'::jsonb) ? k)
);
