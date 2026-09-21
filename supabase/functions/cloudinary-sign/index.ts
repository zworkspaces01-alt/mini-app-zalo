/**
 * Ký lượt tải ảnh lên Cloudinary.
 *
 * Cloudinary chỉ nhận ảnh có chữ ký tạo bằng API secret. Trước đây trang
 * quản trị tự ký ngay trên trình duyệt, nên secret nằm trong mã JS — ai mở
 * trang đăng nhập cũng đọc được và toàn quyền với tài khoản Cloudinary. Giờ
 * secret chỉ nằm ở đây; trình duyệt xin chữ ký rồi tự gửi ảnh thẳng lên
 * Cloudinary, nên ảnh không phải đi vòng qua hàm này.
 *
 * Chữ ký chỉ đúng cho một thư mục và một mốc giờ, Cloudinary từ chối sau một
 * giờ. Gọi được hàm này chỉ có nhân viên đang hoạt động — cùng nhóm được sửa
 * món, banner và quà trong CMS.
 *
 * Không dùng thư viện ngoài: gọi thẳng REST API, giống `staff-admin`.
 */

const FOLDERS = ["dishes", "omakase", "banners", "categories", "rewards"];

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

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";

async function sha1(str: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Chưa cấu hình Cloudinary thì báo rõ, trang quản trị sẽ lùi về Supabase Storage.
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return json({ error: "Máy chủ chưa cấu hình Cloudinary" }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Thiếu thông tin đăng nhập" }, 401);

  /* ── 1. Người gọi là ai ── */
  const meRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: authHeader },
  });
  if (!meRes.ok) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);
  const me = await meRes.json();
  if (!me?.id) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

  /* ── 2. Người gọi có phải nhân viên đang hoạt động không ── */
  const staffRes = await fetch(
    `${URL_BASE}/rest/v1/staff?user_id=eq.${me.id}&select=is_active`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } }
  );
  const [caller] = await staffRes.json();
  if (!caller?.is_active) {
    return json({ error: "Chỉ nhân viên mới được tải ảnh lên" }, 403);
  }

  /* ── 3. Ký ── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dữ liệu gửi lên không đọc được" }, 400);
  }

  const sub = String(body.folder ?? "");
  if (!FOLDERS.includes(sub)) {
    return json({ error: `Thư mục không hợp lệ: ${sub}` }, 400);
  }

  const folder = `miyako/${sub}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // Tham số xếp theo thứ tự chữ cái, nối bằng &, rồi ghép secret vào cuối.
  const signature = await sha1(
    `folder=${folder}&timestamp=${timestamp}${API_SECRET}`
  );

  return json({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    folder,
    timestamp,
    signature,
  });
});
