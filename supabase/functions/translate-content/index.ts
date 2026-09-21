/**
 * Dịch nội dung thực đơn sang tiếng Anh và tiếng Nhật bằng AI.
 *
 * Tiếng Việt là bản gốc; hàm này chỉ ghi vào cột `i18n`, không bao giờ đụng
 * tới cột tiếng Việt. Dịch sai thì sửa lại trong CMS hoặc bấm dịch lại — bản
 * gốc vẫn còn nguyên.
 *
 * Khoá API của Groq/Gemini chỉ nằm ở đây, không có trong mã chạy ở trình
 * duyệt. Gọi được hàm này chỉ có quản lý đã đăng nhập.
 *
 * Không dùng thư viện ngoài: gọi thẳng REST API, giống `staff-admin`. Hàm
 * khởi động ngay và không hỏng khi registry chặn mạng.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const svc = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

/* ════════════════════════════════════════════════════════════
   1. Bảng nào có gì để dịch
   ════════════════════════════════════════════════════════════ */

type Lang = "en" | "ja";

interface Spec {
  /** Trường chuỗi thường */
  text: string[];
  /** Trường mảng chuỗi — bản dịch phải giữ đúng số phần tử và thứ tự */
  list: string[];
  /** Trường gửi kèm cho AI hiểu ngữ cảnh, không dịch và không ghi lại */
  context: string[];
  /**
   * Trường tiếng Nhật đã in sẵn trên menu giấy. Có thì dùng thẳng, không hỏi
   * AI — dữ liệu nhà hàng xác nhận luôn thắng dữ liệu máy đoán.
   */
  jaFrom?: Record<string, string>;
  /** Cột khoá chính, để PATCH đúng dòng */
  key: string;
}

const SPECS: Record<string, Spec> = {
  categories: {
    key: "id",
    text: ["name"],
    list: [],
    context: ["jp", "romaji"],
    jaFrom: { name: "jp" },
  },
  dishes: {
    key: "id",
    text: ["name", "description", "unit"],
    list: ["includes", "gifts"],
    context: ["romaji", "jp"],
    jaFrom: { name: "jp" },
  },
  dish_variants: {
    key: "id",
    text: ["label", "note"],
    list: [],
    context: [],
  },
  omakase_sets: {
    key: "id",
    text: ["name", "subtitle", "description"],
    list: [],
    context: ["jp"],
    jaFrom: { name: "jp" },
  },
  omakase_courses: {
    key: "id",
    text: ["section"],
    list: ["items"],
    context: [],
  },
  restaurant_settings: {
    key: "id",
    text: ["tagline", "menu_price_note", "cancellation_policy"],
    list: [],
    context: [],
  },
};

const ENTITIES = Object.keys(SPECS);

/* ════════════════════════════════════════════════════════════
   2. Gọi AI
   ════════════════════════════════════════════════════════════ */

const LANG_NAME: Record<Lang, string> = {
  en: "English",
  ja: "Japanese (日本語)",
};

/**
 * Luật dịch. Viết bằng tiếng Anh vì cả Groq lẫn Gemini bám theo chỉ dẫn
 * tiếng Anh sát hơn, và vì nội dung mẫu trong luật phải là tiếng Nhật thật.
 */
function systemPrompt(lang: Lang): string {
  return [
    `You translate the menu of Miyako, a Japanese fine-dining restaurant in Hanoi, from Vietnamese into ${LANG_NAME[lang]}.`,
    "",
    "Rules:",
    "1. Reply with JSON only. No markdown fence, no commentary.",
    '2. Shape: {"items":[{"id":"<same id>", "<field>":"<translation>", ...}]}. Echo every id you were given, in the same order. Never invent ids.',
    "3. Translate only the fields present on each input item. Omit a field if its input value is empty or null.",
    "4. Array fields must come back as arrays with the same length and the same order.",
    "5. `romaji` and `jp` are context, not fields to translate — never echo them back.",
    lang === "ja"
      ? "6. Use the authentic Japanese name of the dish, the one a Tokyo izakaya would print. When `romaji` is given it is the real Japanese name written in Latin letters — convert it to proper kana/kanji rather than translating the Vietnamese literally. Example: Vietnamese 'Đậu phụ chiên sốt dashi' with romaji 'Agedashi Tofu' becomes 揚げ出し豆腐, not a literal rendering."
      : "6. Use the dish name an English menu would print: the romaji name when it is internationally known (Sashimi, Agedashi Tofu, Wagyu, Uni), otherwise a plain English description of the dish. When both help, write 'Romaji — English descriptor', e.g. 'Takowasabi — Octopus in Wasabi'.",
    "7. Keep untranslated: the brand name Miyako, wagyu grades (A5), Japanese place names (Hokkaido, Kyushu), units of measure (gr, ml, cm), and all numbers exactly as written.",
    lang === "ja"
      ? "8. Register: polite restaurant Japanese, no ですます in short menu labels. Use 名 for guest counts (2 khách → 2名)."
      : "8. Register: concise restaurant English, title case for names, sentence case for descriptions. Use 'pax' or 'guests' for khách.",
    "9. A Vietnamese description quotes the printed paper menu. Translate its meaning faithfully; do not add facts, do not drop facts, do not make it more flowery.",
  ].join("\n");
}

interface AiCall {
  system: string;
  user: string;
}

async function callGroq({ system, user }: AiCall): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("Chưa đặt GROQ_API_KEY");

  // Đổi được endpoint để dùng cổng khác tương thích OpenAI, hoặc để chạy thử.
  const base = (Deno.env.get("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1")
    .replace(/\/+$/, "");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Groq: ${body?.error?.message ?? res.status} ${res.statusText}`.trim()
    );
  }
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Groq trả về rỗng");
  return text;
}

async function callGemini({ system, user }: AiCall): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("Chưa đặt GEMINI_API_KEY");

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Gemini: ${body?.error?.message ?? res.status} ${res.statusText}`.trim()
    );
  }
  const text = body?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p?.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini trả về rỗng");
  return text;
}

const PROVIDERS: Record<string, (c: AiCall) => Promise<string>> = {
  groq: callGroq,
  gemini: callGemini,
};

/** Thứ tự nhà cung cấp; hỏng cái đầu thì thử cái sau. */
function providerChain(): string[] {
  const raw = Deno.env.get("TRANSLATE_PROVIDERS") ?? "groq,gemini";
  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s in PROVIDERS);
  // Chỉ giữ nhà cung cấp thật sự có khoá, để lỗi báo ra là lỗi thật.
  return names.filter((n) =>
    n === "groq" ? !!Deno.env.get("GROQ_API_KEY") : !!Deno.env.get("GEMINI_API_KEY")
  );
}

/** Gọi lần lượt từng nhà cung cấp cho tới khi có câu trả lời đọc được. */
async function askAi(call: AiCall, chain: string[]): Promise<unknown> {
  const errors: string[] = [];

  for (const name of chain) {
    try {
      const raw = await PROVIDERS[name](call);
      // Có model vẫn bọc JSON trong ```json dù đã bật chế độ JSON.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      return JSON.parse(cleaned);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(
    errors.length ? errors.join(" · ") : "Chưa cấu hình GROQ_API_KEY hay GEMINI_API_KEY"
  );
}

/* ════════════════════════════════════════════════════════════
   3. Dịch một lô
   ════════════════════════════════════════════════════════════ */

type Row = Record<string, unknown>;

/** Phần của một dòng cần gửi đi dịch. Rỗng nghĩa là không có gì để dịch. */
function payloadOf(row: Row, spec: Spec, lang: Lang): Row | null {
  const out: Row = { id: String(row[spec.key]) };
  let has = false;

  for (const f of spec.text) {
    const v = row[f];
    if (typeof v === "string" && v.trim()) {
      // Tên tiếng Nhật đã in trên menu thì không cần hỏi AI.
      if (lang === "ja" && spec.jaFrom?.[f] && typeof row[spec.jaFrom[f]] === "string" && (row[spec.jaFrom[f]] as string).trim()) {
        continue;
      }
      out[f] = v;
      has = true;
    }
  }

  for (const f of spec.list) {
    const v = row[f];
    if (Array.isArray(v) && v.length) {
      out[f] = v;
      has = true;
    }
  }

  for (const f of spec.context) {
    const v = row[f];
    if (typeof v === "string" && v.trim()) out[f] = v;
  }

  return has ? out : null;
}

/** Lọc câu trả lời của AI: chỉ giữ trường hợp lệ, đúng kiểu, đúng độ dài. */
function cleanAnswer(answer: Row, sent: Row, spec: Spec): Row {
  const out: Row = {};

  for (const f of spec.text) {
    if (!(f in sent)) continue;
    const v = answer[f];
    if (typeof v === "string" && v.trim()) out[f] = v.trim();
  }

  for (const f of spec.list) {
    if (!(f in sent)) continue;
    const v = answer[f];
    const src = sent[f] as unknown[];
    if (Array.isArray(v) && v.length === src.length && v.every((x) => typeof x === "string" && x.trim())) {
      out[f] = v.map((x) => (x as string).trim());
    }
  }

  return out;
}

/* ════════════════════════════════════════════════════════════
   4. Hàm chính
   ════════════════════════════════════════════════════════════ */

/** Số dòng gửi trong một lần gọi AI. Lớn quá thì model bỏ sót dòng cuối. */
const BATCH = 12;
/** Số dòng xử lý trong một lần gọi hàm, để không chạm trần thời gian. */
const DEFAULT_LIMIT = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Thiếu thông tin đăng nhập" }, 401);

  /* ── Người gọi có phải quản lý đang hoạt động không ── */
  const meRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: authHeader },
  });
  if (!meRes.ok) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);
  const me = await meRes.json();
  if (!me?.id) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

  const staffRes = await svc(
    `/rest/v1/staff?user_id=eq.${me.id}&select=role,is_active`
  );
  const [caller] = await staffRes.json();
  if (!caller?.is_active || !["owner", "manager"].includes(caller.role)) {
    return json({ error: "Chỉ quản lý mới được dịch nội dung" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = String(body.action ?? "translate");

  /* ── Còn bao nhiêu dòng chưa dịch ── */
  if (action === "status") {
    const res = await svc(
      "/rest/v1/translation_status?select=entity,stale,has_en,has_ja"
    );
    const rows = (await res.json()) as {
      entity: string;
      stale: boolean;
      has_en: boolean;
      has_ja: boolean;
    }[];

    const by: Record<string, { total: number; pending: number }> = {};
    for (const r of rows) {
      const b = (by[r.entity] ??= { total: 0, pending: 0 });
      b.total++;
      if (r.stale || !r.has_en || !r.has_ja) b.pending++;
    }
    return json({
      providers: providerChain(),
      total: rows.length,
      pending: Object.values(by).reduce((n, b) => n + b.pending, 0),
      by,
    });
  }

  if (action !== "translate") {
    return json({ error: `Thao tác không hợp lệ: ${action}` }, 400);
  }

  const chain = providerChain();
  if (!chain.length) {
    return json(
      {
        error:
          "Chưa cấu hình khoá AI. Đặt GROQ_API_KEY hoặc GEMINI_API_KEY cho Edge Function rồi thử lại.",
      },
      400
    );
  }

  const langs: Lang[] = Array.isArray(body.langs)
    ? (body.langs.filter((l) => l === "en" || l === "ja") as Lang[])
    : ["en", "ja"];
  if (!langs.length) return json({ error: "Không có ngôn ngữ nào để dịch" }, 400);

  const wanted: string[] = Array.isArray(body.entities)
    ? (body.entities as string[]).filter((e) => ENTITIES.includes(e))
    : ENTITIES;
  const onlyIds: string[] | null = Array.isArray(body.ids)
    ? (body.ids as unknown[]).map(String)
    : null;
  const force = body.force === true;
  const limit = Math.max(1, Math.min(200, Number(body.limit) || DEFAULT_LIMIT));

  /**
   * Mốc của lượt "dịch lại toàn bộ".
   *
   * Dịch lại chạy thành nhiều lượt gọi. Không có mốc này thì lượt nào cũng
   * thấy cả bảng là "cần dịch" và lại làm đúng những dòng đầu — chạy mãi
   * không hết. Có mốc thì dòng đã dịch trong lượt hiện tại được bỏ qua.
   */
  const since =
    typeof body.since === "string" && !Number.isNaN(Date.parse(body.since))
      ? Date.parse(body.since)
      : Date.now();

  let budget = limit;
  let translated = 0;
  let remaining = 0;
  const failures: string[] = [];

  for (const entity of wanted) {
    const spec = SPECS[entity];

    const cols = [
      spec.key,
      ...spec.text,
      ...spec.list,
      ...spec.context,
      "i18n",
      "i18n_hash",
      "i18n_src_hash",
      "i18n_at",
    ];
    const res = await svc(
      `/rest/v1/${entity}?select=${[...new Set(cols)].join(",")}`
    );
    if (!res.ok) {
      failures.push(`${entity}: không đọc được dữ liệu`);
      continue;
    }
    const rows = (await res.json()) as Row[];

    /* Dòng nào cần dịch: thiếu ngôn ngữ, hoặc bản gốc đã đổi sau khi dịch. */
    const todo = rows.filter((r) => {
      if (onlyIds && !onlyIds.includes(String(r[spec.key]))) return false;
      if (force) {
        // Đã dịch lại trong chính lượt này rồi thì thôi.
        const at = typeof r.i18n_at === "string" ? Date.parse(r.i18n_at) : 0;
        return !(at >= since);
      }
      if (r.i18n_hash !== r.i18n_src_hash) return true;
      const i18n = (r.i18n ?? {}) as Record<string, unknown>;
      return langs.some((l) => !i18n[l]);
    });

    if (budget <= 0) {
      remaining += todo.length;
      continue;
    }

    const slice = todo.slice(0, budget);
    remaining += todo.length - slice.length;
    budget -= slice.length;
    if (!slice.length) continue;

    /* ── Dịch từng ngôn ngữ, từng lô ── */
    const result = new Map<string, Partial<Record<Lang, Row>>>();

    for (const lang of langs) {
      const payloads = slice
        .map((r) => ({ row: r, p: payloadOf(r, spec, lang) }))
        .filter((x) => x.p) as { row: Row; p: Row }[];

      for (let i = 0; i < payloads.length; i += BATCH) {
        const chunk = payloads.slice(i, i + BATCH);
        let answers: Row[];

        try {
          const parsed = (await askAi(
            {
              system: systemPrompt(lang),
              user: JSON.stringify({ items: chunk.map((c) => c.p) }),
            },
            chain
          )) as { items?: Row[] };

          answers = Array.isArray(parsed?.items) ? parsed.items : [];
        } catch (e) {
          failures.push(
            `${entity}/${lang}: ${e instanceof Error ? e.message : String(e)}`
          );
          continue;
        }

        const byId = new Map(answers.map((a) => [String(a.id), a]));
        for (const c of chunk) {
          const a = byId.get(String(c.p.id));
          if (!a) continue;
          const fields = cleanAnswer(a, c.p, spec);
          if (!Object.keys(fields).length) continue;

          const id = String(c.row[spec.key]);
          const bag = result.get(id) ?? {};
          bag[lang] = { ...(bag[lang] ?? {}), ...fields };
          result.set(id, bag);
        }
      }
    }

    /* ── Ghi ngược vào CSDL ── */
    for (const row of slice) {
      const id = String(row[spec.key]);
      const got = result.get(id) ?? {};
      const existing = (row.i18n ?? {}) as Record<string, Row>;
      const merged: Record<string, Row> = { ...existing };

      for (const lang of langs) {
        const fields: Row = { ...(force ? {} : existing[lang] ?? {}), ...(got[lang] ?? {}) };

        // Tên tiếng Nhật in sẵn trên menu giấy — dùng thẳng, không qua AI.
        if (lang === "ja" && spec.jaFrom) {
          for (const [field, source] of Object.entries(spec.jaFrom)) {
            const v = row[source];
            if (typeof v === "string" && v.trim()) fields[field] = v.trim();
          }
        }

        if (Object.keys(fields).length) merged[lang] = fields;
      }

      if (!Object.keys(merged).length) {
        // Không dịch được gì (AI hỏng, hoặc dòng không có chữ nào để dịch).
        // Vẫn đánh dấu đã thử, để lượt sau đi tiếp thay vì vấp lại chỗ cũ.
        await svc(
          `/rest/v1/${entity}?${spec.key}=eq.${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ i18n_at: new Date().toISOString() }),
          }
        );
        continue;
      }

      // Chỉ đánh dấu "đã dịch xong" khi đủ mọi ngôn ngữ. Thiếu một thứ tiếng
      // thì để dòng đó nằm lại hàng chờ, lần sau bấm dịch là làm tiếp.
      const complete = (["en", "ja"] as Lang[]).every((l) => merged[l]);
      // i18n_at do chính hàm này đặt: bản dịch mới có thể trùng y hệt bản cũ,
      // và khi đó trigger không nhận ra là dòng vừa được xử lý.
      const patch: Row = { i18n: merged, i18n_at: new Date().toISOString() };
      if (complete) patch.i18n_hash = row.i18n_src_hash;

      const up = await svc(
        `/rest/v1/${entity}?${spec.key}=eq.${encodeURIComponent(id)}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      if (up.ok) translated++;
      else failures.push(`${entity}/${id}: không ghi được bản dịch`);
    }
  }

  return json({
    translated,
    remaining,
    providers: chain,
    ...(failures.length ? { failures: failures.slice(0, 10) } : {}),
  });
});
