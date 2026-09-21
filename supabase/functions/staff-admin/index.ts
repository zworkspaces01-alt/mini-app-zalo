/**
 * Quản lý tài khoản nhân viên.
 *
 * Tạo, đổi mật khẩu và xoá người dùng phải dùng service_role key — thứ tuyệt
 * đối không được nằm trong mã chạy ở trình duyệt. Vì vậy ba việc đó đi qua
 * hàm này, nơi key chỉ tồn tại phía máy chủ.
 *
 * Sửa tên / vai trò / trạng thái không đụng tới hệ thống auth, nên trang quản
 * trị ghi thẳng vào bảng `staff` qua RLS, không cần gọi hàm này.
 *
 * Không dùng thư viện ngoài: chỉ gọi thẳng REST API. Nhờ vậy hàm khởi động
 * ngay, không phải tải gói lúc boot và không hỏng khi registry chặn mạng.
 */

const ROLES = ["owner", "manager", "staff", "kitchen"];

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Thiếu thông tin đăng nhập" }, 401);

  /* ── 1. Người gọi là ai ── */
  const meRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: ANON, Authorization: authHeader },
  });
  if (!meRes.ok) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);
  const me = await meRes.json();
  if (!me?.id) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

  /* ── 2. Người gọi có phải quản lý đang hoạt động không ── */
  const staffRes = await svc(
    `/rest/v1/staff?user_id=eq.${me.id}&select=role,is_active`
  );
  const [callerStaff] = await staffRes.json();

  if (
    !callerStaff?.is_active ||
    !["owner", "manager"].includes(callerStaff.role)
  ) {
    return json({ error: "Chỉ quản lý mới được thao tác với nhân sự" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dữ liệu gửi lên không đọc được" }, 400);
  }

  const action = String(body.action ?? "");

  /* ── Tạo tài khoản ── */
  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "staff");

    if (!email || !password || !fullName) {
      return json({ error: "Thiếu email, mật khẩu hoặc họ tên" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Mật khẩu phải từ 8 ký tự" }, 400);
    }
    if (!ROLES.includes(role)) {
      return json({ error: `Vai trò không hợp lệ: ${role}` }, 400);
    }

    const createRes = await svc("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const created = await createRes.json();

    if (!createRes.ok || !created?.id) {
      const msg = String(created?.msg ?? created?.message ?? "");
      return json(
        {
          error: /already|registered|exists/i.test(msg)
            ? "Email này đã có tài khoản."
            : msg || "Không tạo được tài khoản",
        },
        400
      );
    }

    const staffInsert = await svc("/rest/v1/staff", {
      method: "POST",
      body: JSON.stringify({
        user_id: created.id,
        full_name: fullName,
        role,
        is_active: true,
      }),
    });

    if (!staffInsert.ok) {
      // Cấp quyền hỏng thì xoá luôn người dùng vừa tạo, tránh tài khoản mồ côi.
      await svc(`/auth/v1/admin/users/${created.id}`, { method: "DELETE" });
      const err = await staffInsert.json().catch(() => ({}));
      return json({ error: err?.message ?? "Không cấp được quyền" }, 400);
    }

    return json({ user_id: created.id, email });
  }

  /* ── Đổi mật khẩu ── */
  if (action === "reset-password") {
    const userId = String(body.user_id ?? "");
    const password = String(body.password ?? "");
    if (!userId) return json({ error: "Thiếu user_id" }, 400);
    if (password.length < 8) {
      return json({ error: "Mật khẩu phải từ 8 ký tự" }, 400);
    }

    const res = await svc(`/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json({ error: err?.msg ?? "Không đổi được mật khẩu" }, 400);
    }
    return json({ ok: true });
  }

  /* ── Xoá tài khoản ── */
  if (action === "delete") {
    const userId = String(body.user_id ?? "");
    if (!userId) return json({ error: "Thiếu user_id" }, 400);
    if (userId === me.id) {
      return json({ error: "Không thể tự xoá tài khoản của chính mình" }, 400);
    }

    const targetRes = await svc(
      `/rest/v1/staff?user_id=eq.${userId}&select=role`
    );
    const [target] = await targetRes.json();

    // Chủ nhà hàng cuối cùng thì không cho xoá, kẻo không còn ai vào được CMS.
    if (target?.role === "owner") {
      const countRes = await svc(
        "/rest/v1/staff?role=eq.owner&is_active=eq.true&select=user_id"
      );
      const owners = await countRes.json();
      if (!Array.isArray(owners) || owners.length <= 1) {
        return json(
          {
            error:
              "Đây là chủ nhà hàng duy nhất. Cấp quyền cho người khác trước đã.",
          },
          400
        );
      }
    }

    await svc(`/rest/v1/staff?user_id=eq.${userId}`, { method: "DELETE" });
    const res = await svc(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json({ error: err?.msg ?? "Không xoá được tài khoản" }, 400);
    }
    return json({ ok: true });
  }

  return json({ error: `Thao tác không hợp lệ: ${action}` }, 400);
});
