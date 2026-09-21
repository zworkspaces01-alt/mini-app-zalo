/**
 * Sinh supabase/seed.sql từ chính dữ liệu đã số hoá trong mini app.
 *
 *   node supabase/seed/generate-seed.mjs
 *
 * Chạy lại mỗi khi sửa src/data/*.ts để dữ liệu hai bên không lệch nhau.
 * Sau khi CMS đi vào vận hành, CSDL mới là nguồn sự thật — lúc đó chỉ dùng
 * script này để dựng lại môi trường thử nghiệm.
 */
import { build } from "esbuild";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Gom dữ liệu TypeScript thành một module JS tạm để đọc được từ Node.
const bundle = await build({
  stdin: {
    contents: `
      export { CATEGORIES } from "./src/data/categories";
      export { DISHES } from "./src/data/menu";
      export { OMAKASE_SETS } from "./src/data/omakase";
      export { COUNTER_SEATS } from "./src/data/seats";
      export { RESTAURANT } from "./src/config/restaurant";
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  write: false,
  platform: "node",
  alias: { "@": path.join(root, "src") },
});

const mod = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const { CATEGORIES, DISHES, OMAKASE_SETS, RESTAURANT, COUNTER_SEATS } = mod;

/* ── Trợ giúp sinh SQL ── */
const q = (v) =>
  v === undefined || v === null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const n = (v) => (v === undefined || v === null ? "null" : String(v));
const arr = (v) =>
  !v || v.length === 0
    ? "'{}'"
    : `array[${v.map((x) => q(x)).join(", ")}]::text[]`;

const out = [];
const say = (s = "") => out.push(s);

say("-- ============================================================");
say("-- Miyako — dữ liệu khởi tạo");
say("-- TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG. Đừng sửa tay.");
say("-- Nguồn: src/data/*.ts  ·  Sinh lại: node supabase/seed/generate-seed.mjs");
say("-- ============================================================");
say();
say("begin;");
say();

/* ── Cấu hình ── */
say("-- Cấu hình nhà hàng. Cột null = dữ kiện chưa được nhà hàng xác nhận.");
say(`insert into public.restaurant_settings
  (id, name, tagline, address, hotline, oa_id, city, counter_seats,
   deposit_rate, vat_rate, service_charge_rate, price_includes_vat, menu_price_note,
   booking_lead_days, omakase_lead_hours)
values
  (1, ${q(RESTAURANT.name)}, ${q(RESTAURANT.tagline)}, ${q(RESTAURANT.address)},
   ${q(RESTAURANT.hotline)}, null, ${q(RESTAURANT.city)}, ${n(RESTAURANT.counterSeats)},
   ${n(RESTAURANT.depositRate)}, null, null, false, ${q(RESTAURANT.menuPriceUnitNote)},
   ${n(RESTAURANT.bookingLeadDays)}, ${n(RESTAURANT.omakaseLeadHours)})
on conflict (id) do nothing;`);
say();

/* ── Bàn ── */
say("-- Chỉ tạo sẵn quầy itamae vì đây là con số đã xác nhận (12 ghế).");
say("-- Bàn thường và phòng riêng do nhà hàng tự thêm trong CMS.");
say(`insert into public.restaurant_tables (id, label, zone, seats, sort_order) values
  ('QUAY', 'Quầy itamae', 'counter', ${n(RESTAURANT.counterSeats)}, 0)
on conflict (id) do nothing;`);
say();

/* ── Giờ mở cửa ── */
say("-- TẠM TÍNH — nhà hàng phải sửa lại trong CMS trước khi phát hành.");
say("-- Mini app có ghi chú rõ cho khách rằng khung giờ còn chờ xác nhận.");
say("insert into public.opening_hours (weekday, service, open_time, close_time, slot_minutes) values");
const hours = [];
for (let d = 0; d < 7; d++) {
  hours.push(`  (${d}, 'lunch',  '11:30', '13:00', 30)`);
  hours.push(`  (${d}, 'dinner', '17:30', '20:00', 30)`);
}
say(hours.join(",\n") + "\non conflict (weekday, service) do nothing;");
say();

/* ── Nhóm món ── */
say("-- Nhóm món");
say("insert into public.categories (id, name, jp, romaji, sort_order) values");
say(
  CATEGORIES.map(
    (c, i) => `  (${q(c.id)}, ${q(c.name)}, ${q(c.jp)}, ${q(c.romaji)}, ${i})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
say();

/* ── Món ── */
say(`-- ${DISHES.length} món, số hoá từ bộ menu in 39 trang (M1–M39)`);
say(`insert into public.dishes
  (id, category_id, name, romaji, jp, price, compare_at_price, unit, description,
   includes, gifts, badges, image_path, source_page, sort_order)
values`);
const orderInCategory = {};
say(
  DISHES.map((d) => {
    const i = (orderInCategory[d.categoryId] = (orderInCategory[d.categoryId] ?? -1) + 1);
    return `  (${q(d.id)}, ${q(d.categoryId)}, ${q(d.name)}, ${q(d.romaji)}, ${q(d.jp)}, ${n(
      d.price
    )}, ${n(d.compareAtPrice)}, ${q(d.unit)}, ${q(d.description)}, ${arr(d.includes)}, ${arr(
      d.gifts
    )}, ${arr(d.badges)}, ${q(d.image)}, ${q(d.sourcePage)}, ${i})`;
  }).join(",\n") + "\non conflict (id) do nothing;"
);
say();

/* ── Phần của món ── */
const variantRows = [];
for (const d of DISHES) {
  (d.variants ?? []).forEach((v, i) => {
    variantRows.push(
      `  (${q(d.id)}, ${q(v.id)}, ${q(v.label)}, ${n(v.price)}, ${q(v.note)}, ${i})`
    );
  });
}
say("-- Món bán theo phần (lẩu, sukiyaki, shabu)");
say("insert into public.dish_variants (dish_id, code, label, price, note, sort_order) values");
say(variantRows.join(",\n") + "\non conflict (dish_id, code) do nothing;");
say();

/* ── Omakase ── */
say("-- Suất omakase");
say(`insert into public.omakase_sets
  (id, name, jp, subtitle, price, service, tier, description, image_path,
   menu_pending, sort_order)
values`);
say(
  OMAKASE_SETS.map(
    (s, i) =>
      `  (${q(s.id)}, ${q(s.name)}, ${q(s.jp)}, ${q(s.subtitle)}, ${n(s.price)}, ${q(
        s.service
      )}, ${n(s.tier)}, ${q(s.description)}, ${q(s.image)}, ${s.menuPending}, ${i})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
say();

const courseRows = [];
for (const s of OMAKASE_SETS) {
  s.courses.forEach((c, i) => {
    courseRows.push(`  (${q(s.id)}, ${q(c.section)}, ${arr(c.items)}, ${i})`);
  });
}
if (courseRows.length) {
  say("-- Trình tự món của từng suất");
  say("insert into public.omakase_courses (set_id, section, items, sort_order) values");
  say(courseRows.join(",\n") + ";");
  say();
}

/* ── Ghế quầy omakase ── */
say(`-- ${COUNTER_SEATS.length} ghế quầy. Toạ độ dùng để dựng mô hình 3D trong mini app.`);
say("insert into public.seats (id, label, zone, pos_x, pos_z, rotation, is_premium, note, sort_order) values");
say(
  COUNTER_SEATS.map(
    (s, i) =>
      `  (${q(s.id)}, ${q(s.label)}, 'counter', ${n(s.x)}, ${n(s.z)}, ${n(
        s.rotation
      )}, ${s.premium}, ${q(s.note)}, ${i})`
  ).join(",\n") + "\non conflict (id) do nothing;"
);
say();

say("commit;");
say();

writeFileSync(path.join(root, "supabase/seed.sql"), out.join("\n"));
console.log(
  `seed.sql: ${CATEGORIES.length} nhóm, ${DISHES.length} món, ${variantRows.length} phần, ` +
    `${OMAKASE_SETS.length} suất omakase, ${courseRows.length} nhóm món omakase, ` +
    `${COUNTER_SEATS.length} ghế quầy`
);
