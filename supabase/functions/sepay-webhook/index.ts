/**
 * Webhook nhận biến động số dư từ SePay.
 *
 * SePay theo dõi tài khoản ngân hàng của nhà hàng và gọi hàm này mỗi khi có
 * tiền vào. Ở đây chỉ ghi lại giao dịch rồi để CSDL đối soát với mã đặt bàn.
 *
 * Ba điều quan trọng:
 *
 *  1. SePay sẽ GỬI LẠI nếu không nhận được HTTP 200/201 kèm {"success": true}
 *     trong 30 giây. Vì vậy phải chống ghi trùng — khoá duy nhất trên
 *     `sepay_id` lo việc đó, và gửi lại lần hai không tạo bản ghi mới.
 *
 *  2. Chuyển khoản sai nội dung vẫn phải được ghi nhận. Không dò ra mã đặt
 *     bàn thì vẫn trả về thành công và để giao dịch ở trạng thái chờ đối
 *     soát cho nhân viên gán tay. Trả lỗi ở đây chỉ khiến SePay gửi lại mãi.
 *
 *  3. Chỉ trả lỗi khi thực sự chưa lưu được, để SePay còn gửi lại.
 *
 * Xác thực: header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`.
 * Đặt khoá bằng: supabase secrets set SEPAY_WEBHOOK_API_KEY=...
 */

const URL_BASE = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("SEPAY_WEBHOOK_API_KEY") ?? "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

/** So sánh không phụ thuộc thời gian, tránh rò rỉ khoá qua thời gian phản hồi. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface SePayPayload {
  id: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string;
  code?: string | null;
  content?: string;
  transferType?: string;
  description?: string;
  transferAmount?: number;
  accumulated?: number;
  referenceCode?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ success: false, error: "Chỉ nhận POST" }, 405);
  }

  /* ── Xác thực ── */
  if (!API_KEY) {
    // Thà từ chối còn hơn nhận bừa: chưa đặt khoá thì ai cũng gọi được.
    console.error("Chưa đặt SEPAY_WEBHOOK_API_KEY");
    return json({ success: false, error: "Webhook chưa được cấu hình" }, 500);
  }

  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Apikey\s+/i, "").trim();
  if (!safeEqual(token, API_KEY)) {
    return json({ success: false, error: "Sai khoá" }, 401);
  }

  /* ── Đọc dữ liệu ── */
  let body: SePayPayload;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Không đọc được dữ liệu" }, 400);
  }

  if (typeof body.id !== "number") {
    return json({ success: false, error: "Thiếu id giao dịch" }, 400);
  }

  const transferType = body.transferType === "out" ? "out" : "in";

  const row = {
    sepay_id: body.id,
    gateway: body.gateway ?? null,
    account_number: body.accountNumber ?? null,
    sub_account: body.subAccount || null,
    reference_code: body.referenceCode ?? null,
    // SePay gửi "2024-07-02 11:08:33" theo giờ Việt Nam.
    transaction_date: body.transactionDate
      ? `${body.transactionDate.replace(" ", "T")}+07:00`
      : null,
    amount: Math.max(0, Math.round(body.transferAmount ?? 0)),
    transfer_type: transferType,
    sepay_code: body.code ?? null,
    content: body.content ?? null,
    description: body.description ?? null,
  };

  /* ── Ghi lại, bỏ qua nếu đã có ── */
  const insert = await svc(
    "/rest/v1/payments?on_conflict=sepay_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    }
  );

  if (!insert.ok) {
    const err = await insert.text();
    console.error("Không lưu được giao dịch:", err);
    // Trả lỗi để SePay gửi lại — tiền đã vào tài khoản, không được đánh rơi.
    return json({ success: false, error: "Chưa lưu được, gửi lại giúp" }, 500);
  }

  const inserted = await insert.json();

  // Mảng rỗng nghĩa là SePay gửi lại giao dịch đã xử lý trước đó.
  if (!Array.isArray(inserted) || inserted.length === 0) {
    return json({ success: true, duplicate: true });
  }

  /* ── Đối soát với mã đặt bàn ── */
  const payment = inserted[0];
  if (transferType === "in") {
    const res = await svc("/rest/v1/rpc/process_payment", {
      method: "POST",
      body: JSON.stringify({ p_payment_id: payment.id }),
    });
    if (!res.ok) {
      // Đã lưu được tiền rồi, chỉ là chưa ghép được. Không bắt SePay gửi lại,
      // giao dịch nằm ở trạng thái chờ đối soát cho nhân viên xử lý.
      console.error("Đối soát lỗi:", await res.text());
      return json({ success: true, matched: false });
    }
    const processed = await res.json();
    return json({
      success: true,
      matched: processed?.status === "matched",
      reservation: processed?.matched_code ?? null,
    });
  }

  return json({ success: true });
});
