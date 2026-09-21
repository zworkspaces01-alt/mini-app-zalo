/**
 * Sinh migration nội dung trang từ src/data/page-content.ts.
 *
 *   node supabase/seed/generate-content-seed.mjs
 *
 * Kết quả: supabase/migrations/20260921000010_page_content_seed.sql
 *
 * Migration này chỉ điền vào chỗ trống — không ghi đè thứ nhà hàng đã sửa
 * trong CMS:
 *   · banner / khối nội dung: chỉ thêm khi vị trí hoặc section đó chưa có dòng nào
 *   · hạng, nhiệm vụ: chỉ thêm mã chưa có
 *   · cấu hình: chỉ điền cột còn null
 *   · bản dịch quà, nhãn suất omakase, nhãn món Butcher: chỉ điền khi còn trống
 *
 * Câu chữ không cần dịch (ví dụ "Steak 2.5cm") được chép nguyên sang Anh và
 * Nhật, để mọi dòng vừa thêm đều có đủ bản dịch và CMS không báo "chưa dịch".
 */
import { build } from "esbuild";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const bundle = await build({
  stdin: {
    contents: `export * from "./src/data/page-content";`,
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
const {
  BANNERS,
  CONTENT_ITEMS,
  LOYALTY_TIERS,
  LOYALTY_QUESTS,
  REWARD_GIFTS,
  SETTINGS_TEXT,
  SETTINGS_IMAGES,
  OMAKASE_BADGES,
  BUTCHER_DISH_TAGS,
} = mod;

/* ── Trợ giúp sinh SQL ── */
const q = (v) =>
  v === undefined || v === null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const n = (v) => (v === undefined || v === null ? "null" : String(v));
const b = (v) => (v ? "true" : "false");
const arr = (v) =>
  !v || v.length === 0 ? "'{}'::text[]" : `array[${v.map((x) => q(x)).join(", ")}]::text[]`;
const jsonb = (v) => `${q(JSON.stringify(v ?? {}))}::jsonb`;

/**
 * Bản dịch đủ hai thứ tiếng cho các trường chữ của một dòng. Trường nào
 * không có bản dịch (câu không cần dịch) thì chép nguyên tiếng Việt.
 */
function fullI18n(row, fields) {
  const out = { en: {}, ja: {} };
  for (const lang of ["en", "ja"]) {
    for (const f of fields) {
      const vi = row[f];
      if (vi === undefined || vi === null || vi === "") continue;
      if (Array.isArray(vi) && vi.length === 0) continue;
      out[lang][f] = row.i18n?.[lang]?.[f] ?? vi;
    }
  }
  return out;
}

const out = [];
const say = (s = "") => out.push(s);

say("-- ============================================================");
say("-- Nội dung mặc định cho các trang mini app");
say("--");
say("-- TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG. Đừng sửa tay.");
say("-- Nguồn: src/data/page-content.ts");
say("-- Sinh lại: node supabase/seed/generate-content-seed.mjs");
say("--");
say("-- Chỉ điền chỗ còn trống, không ghi đè thứ nhà hàng đã sửa trong CMS.");
say("-- Chạy lại được nhiều lần.");
say("-- ============================================================");
say();

/* ── Banner ── */
const placements = [...new Set(BANNERS.map((x) => x.placement))];
for (const placement of placements) {
  const rows = BANNERS.filter((x) => x.placement === placement);
  say(`-- Banner ${placement}: chỉ thêm khi vị trí này chưa có banner nào.`);
  say(`insert into public.banners
  (placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent,
   is_active, sort_order, i18n)
select v.placement, v.title, v.subtitle, v.tag, v.jp_text, v.image_url, v.cta_text,
       v.cta_link, v.accent, true, v.sort_order, v.i18n
from (values`);
  say(
    rows
      .map((r, i) => {
        const i18n = fullI18n(
          { title: r.title, subtitle: r.subtitle, tag: r.tag, cta_text: r.ctaText, i18n: r.i18n },
          ["title", "subtitle", "tag", "cta_text"]
        );
        return `  (${q(placement)}, ${q(r.title)}, ${q(r.subtitle)}, ${q(r.tag)}, ${q(r.jp)}, ${q(
          r.image
        )}, ${q(r.ctaText)}, ${q(r.ctaLink)}, ${q(r.accent)}, ${i}, ${jsonb(i18n)})`;
      })
      .join(",\n")
  );
  say(`) as v(placement, title, subtitle, tag, jp_text, image_url, cta_text, cta_link, accent, sort_order, i18n)
where not exists (select 1 from public.banners where placement = ${q(placement)});`);
  say();
}

/* ── Khối nội dung ── */
const sections = [...new Set(CONTENT_ITEMS.map((x) => x.section))];
for (const section of sections) {
  const rows = CONTENT_ITEMS.filter((x) => x.section === section);
  say(`-- ${section}: chỉ thêm khi section này chưa có dòng nào.`);
  say(`insert into public.content_items
  (section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
select v.section, v.key, v.title, v.subtitle, v.body, v.tag, v.jp, v.image_url, v.link,
       v.meta, v.sort_order, v.i18n
from (values`);
  say(
    rows
      .map((r, i) => {
        const i18n = fullI18n(r, ["title", "subtitle", "body", "tag"]);
        return `  (${q(section)}, ${q(r.key)}, ${q(r.title)}, ${q(r.subtitle)}, ${q(r.body)}, ${q(
          r.tag
        )}, ${q(r.jp)}, ${q(r.image)}, ${q(r.link)}, ${jsonb(r.meta)}, ${i}, ${jsonb(i18n)})`;
      })
      .join(",\n")
  );
  say(`) as v(section, key, title, subtitle, body, tag, jp, image_url, link, meta, sort_order, i18n)
where not exists (select 1 from public.content_items where section = ${q(section)});`);
  say();
}

/* ── Hạng thành viên ── */
say("-- Hạng thành viên. Mốc điểm và tỷ lệ trùng với luật cũ viết trong hàm SQL.");
say(`insert into public.loyalty_tiers (code, name, min_points, earn_rate, color, perks, sort_order, i18n)
values`);
say(
  LOYALTY_TIERS.map(
    (t, i) =>
      `  (${q(t.code)}, ${q(t.name)}, ${n(t.minPoints)}, ${n(t.earnRate)}, ${q(t.color)}, ${arr(
        t.perks
      )}, ${i}, ${jsonb(fullI18n(t, ["name", "perks"]))})`
  ).join(",\n")
);
say("on conflict (code) do nothing;");
say();

/* ── Nhiệm vụ ── */
say("-- Nhiệm vụ nhận điểm. Điểm thưởng trùng với luật cũ viết trong hàm SQL.");
say(`insert into public.loyalty_quests (id, title, description, points, icon, sort_order, i18n)
values`);
say(
  LOYALTY_QUESTS.map(
    (x, i) =>
      `  (${q(x.id)}, ${q(x.title)}, ${q(x.description)}, ${n(x.points)}, ${q(x.icon)}, ${i}, ${jsonb(
        fullI18n(x, ["title", "description"])
      )})`
  ).join(",\n")
);
say("on conflict (id) do nothing;");
say();

/* ── Bản dịch quà đổi điểm ── */
say("-- Bản dịch cho các quà có sẵn — chỉ khi quà chưa có bản dịch và tên chưa bị sửa.");
for (const g of REWARD_GIFTS) {
  const i18n = fullI18n(
    { title: g.title, description: g.desc, worth_text: g.worthText, badge: g.badge, i18n: g.i18n },
    ["title", "description", "worth_text", "badge"]
  );
  say(`update public.reward_gifts set i18n = ${jsonb(i18n)}
where id = ${q(g.id)} and i18n = '{}'::jsonb and title = ${q(g.title)};`);
}
say();

/* ── Cấu hình ── */
const textCols = Object.keys(SETTINGS_TEXT.vi);
say("-- Câu chữ và ảnh thương hiệu: chỉ điền cột còn trống.");
say("update public.restaurant_settings set");
say(
  [
    ...textCols.map((c) => `  ${c} = coalesce(${c}, ${q(SETTINGS_TEXT.vi[c])})`),
    ...Object.entries(SETTINGS_IMAGES).map(([c, v]) => `  ${c} = coalesce(${c}, ${q(v)})`),
  ].join(",\n")
);
say("where id = 1;");
say();

const settingsI18n = fullI18n({ ...SETTINGS_TEXT.vi, i18n: SETTINGS_TEXT.i18n }, textCols);
say("-- Bản dịch của các câu chữ trên. Bản dịch nhà hàng đã có thì giữ nguyên.");
say(`update public.restaurant_settings
set i18n = (i18n - 'en' - 'ja')
  || jsonb_build_object(
       'en', ${jsonb(settingsI18n.en)} || coalesce(i18n -> 'en', '{}'::jsonb),
       'ja', ${jsonb(settingsI18n.ja)} || coalesce(i18n -> 'ja', '{}'::jsonb)
     )
where id = 1;`);
say();

/* ── Suất omakase ── */
say("-- Nhãn, ảnh và suất chọn sẵn của các suất omakase, khớp theo giá.");
for (const o of OMAKASE_BADGES) {
  say(`update public.omakase_sets
set badge = ${q(o.badge[0])},
    i18n = (i18n - 'en' - 'ja') || jsonb_build_object(
      'en', coalesce(i18n -> 'en', '{}'::jsonb) || ${jsonb({ badge: o.badge[1] })},
      'ja', coalesce(i18n -> 'ja', '{}'::jsonb) || ${jsonb({ badge: o.badge[2] })}
    )
where price = ${n(o.price)} and badge is null;`);
  say(`update public.omakase_sets set image_path = ${q(o.image)}
where price = ${n(o.price)} and image_path is null;`);
}
const featured = OMAKASE_BADGES.find((o) => o.featured);
if (featured) {
  say(`update public.omakase_sets set is_featured = true
where id = (select id from public.omakase_sets where price = ${n(featured.price)} and is_active
            order by sort_order limit 1)
  and not exists (select 1 from public.omakase_sets where is_featured);`);
}
say();

/* ── Nhãn lọc món Butcher ── */
say("-- Nhãn lọc cho các món Butcher có sẵn.");
for (const [id, tags] of Object.entries(BUTCHER_DISH_TAGS)) {
  say(`update public.dishes set tags = ${arr(tags)} where id = ${q(id)} and tags = '{}';`);
}
say();

/* ── Đánh dấu bản dịch vừa thêm là khớp bản gốc ── */
say("-- Bản dịch vừa thêm viết tay, khớp bản gốc — không cần AI dịch lại.");
say(`update public.banners        set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.content_items  set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.loyalty_tiers  set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.loyalty_quests set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';
update public.reward_gifts   set i18n_hash = i18n_src_hash where i18n_hash is null and i18n ? 'en' and i18n ? 'ja';`);
say();
say(`-- Cấu hình và suất omakase: trigger đã đánh dấu khớp khi bản dịch đổi.
-- Nhưng nếu còn trường tiếng Việt nào chưa có bản dịch (ví dụ tagline cũ
-- chưa từng dịch) thì phải để CMS báo "cần dịch".
update public.restaurant_settings r set i18n_hash = null
where exists (
  select 1
  from unnest(array[${[
    "tagline",
    "menu_price_note",
    "cancellation_policy",
    ...textCols,
  ]
    .map(q)
    .join(", ")}]) k
  where coalesce(to_jsonb(r) ->> k, '') <> ''
    and not (coalesce(r.i18n -> 'en', '{}'::jsonb) ? k and coalesce(r.i18n -> 'ja', '{}'::jsonb) ? k)
);

update public.omakase_sets s set i18n_hash = null
where exists (
  select 1
  from unnest(array['name', 'subtitle', 'description', 'badge']) k
  where coalesce(to_jsonb(s) ->> k, '') <> ''
    and not (coalesce(s.i18n -> 'en', '{}'::jsonb) ? k and coalesce(s.i18n -> 'ja', '{}'::jsonb) ? k)
);`);

const file = path.join(root, "supabase/migrations/20260921000010_page_content_seed.sql");
writeFileSync(file, out.join("\n") + "\n");
console.log(`Đã ghi ${path.relative(root, file)}`);
