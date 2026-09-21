/**
 * Tạo tài khoản đăng nhập CMS.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node supabase/seed/create-staff.mjs email@miyako.vn 'mật khẩu' 'Họ tên' owner
 *
 * Vai trò: owner | manager | staff | kitchen
 *
 * Cần service_role key vì thao tác này tạo người dùng trong hệ thống auth.
 * CHỈ chạy ở máy quản trị. Không bao giờ đưa key này vào mã chạy ở trình duyệt.
 */
const [email, password, fullName, role = "staff"] = process.argv.slice(2);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !password || !fullName) {
  console.error(
    "Dùng: node supabase/seed/create-staff.mjs <email> <mật khẩu> <họ tên> [vai trò]"
  );
  process.exit(1);
}
if (!["owner", "manager", "staff", "kitchen"].includes(role)) {
  console.error(`Vai trò không hợp lệ: ${role}`);
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

/* 1. Tạo người dùng trong hệ thống auth (bỏ qua bước xác minh email) */
let res = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
});
let body = await res.json();
let userId = body.id;

if (!res.ok) {
  // Đã có sẵn thì tìm lại id để vẫn cấp được quyền.
  const list = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers,
  }).then((r) => r.json());
  const found = (list.users ?? []).find((u) => u.email === email);
  if (!found) {
    console.error("Không tạo được người dùng:", body);
    process.exit(1);
  }
  userId = found.id;
  console.log(`Người dùng ${email} đã tồn tại, dùng lại id sẵn có.`);
}

/* 2. Cấp quyền vào CMS */
res = await fetch(`${url}/rest/v1/staff`, {
  method: "POST",
  headers: {
    ...headers,
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({
    user_id: userId,
    full_name: fullName,
    role,
    is_active: true,
  }),
});
body = await res.json();

if (!res.ok) {
  console.error("Không cấp được quyền nhân viên:", body);
  process.exit(1);
}

console.log(`✓ ${fullName} <${email}> — vai trò ${role}`);
console.log(`  user_id: ${userId}`);
