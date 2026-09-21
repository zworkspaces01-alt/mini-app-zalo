#!/usr/bin/env bash
#
# Chuyển toàn bộ hệ thống từ Supabase chạy máy sang project thật.
#
# Cần các biến sau — đặt trong scripts/.env.production rồi chạy:
#
#   bash scripts/go-live.sh
#
#   SUPABASE_PROJECT_REF   Mã project, phần đầu của URL  (abcdxyz...)
#   SUPABASE_DB_PASSWORD   Mật khẩu CSDL, lấy lúc tạo project
#   SUPABASE_ACCESS_TOKEN  Personal access token của tài khoản Supabase
#   SUPABASE_ANON_KEY      Khoá công khai, sẽ nằm trong mã chạy ở máy khách
#   SUPABASE_SERVICE_KEY   Khoá bí mật, chỉ dùng ở máy này để tạo tài khoản
#   SEPAY_WEBHOOK_API_KEY  Khoá webhook đặt bên sepay.vn
#   OWNER_EMAIL            Email đăng nhập CMS đầu tiên
#   OWNER_PASSWORD         Mật khẩu ban đầu, từ 8 ký tự
#   OWNER_NAME             Họ tên hiển thị
#
# Script chạy lại được nhiều lần: đẩy lược đồ, nạp dữ liệu, triển khai hàm,
# tạo tài khoản quản trị, rồi ghi hai file .env.

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="scripts/.env.production"
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

need() {
  if [ -z "${!1:-}" ]; then
    echo "✗ Thiếu biến $1 — điền vào $ENV_FILE" >&2
    exit 1
  fi
}
for v in SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD SUPABASE_ACCESS_TOKEN \
         SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY OWNER_EMAIL OWNER_PASSWORD OWNER_NAME; do
  need "$v"
done

URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
export SUPABASE_ACCESS_TOKEN

echo "▸ 1/6  Liên kết project ${SUPABASE_PROJECT_REF}"
npx --yes supabase link --project-ref "$SUPABASE_PROJECT_REF" \
  --password "$SUPABASE_DB_PASSWORD" >/dev/null

echo "▸ 2/6  Đẩy lược đồ (migrations)"
npx --yes supabase db push --password "$SUPABASE_DB_PASSWORD"

echo "▸ 3/6  Nạp dữ liệu khởi tạo (149 món, omakase, 12 ghế)"
# Chỉ nạp khi bảng dishes còn trống, tránh ghi đè dữ liệu nhà hàng đã sửa.
COUNT=$(curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Prefer: count=exact" -I "$URL/rest/v1/dishes?select=id&limit=1" \
  | tr -d '\r' | awk -F/ '/[Cc]ontent-[Rr]ange/{print $2}')
if [ "${COUNT:-0}" = "0" ]; then
  node supabase/seed/generate-seed.mjs
  PGPASSWORD="$SUPABASE_DB_PASSWORD" npx --yes supabase db execute \
    --file supabase/seed.sql --linked 2>/dev/null \
    || echo "  ⚠ Không chạy được tự động. Mở Supabase SQL Editor và dán supabase/seed.sql."
else
  echo "  đã có $COUNT món, bỏ qua để không ghi đè"
fi

echo "▸ 4/6  Triển khai Edge Functions"
npx --yes supabase functions deploy staff-admin --project-ref "$SUPABASE_PROJECT_REF"
npx --yes supabase functions deploy sepay-webhook --project-ref "$SUPABASE_PROJECT_REF"
if [ -n "${SEPAY_WEBHOOK_API_KEY:-}" ]; then
  npx --yes supabase secrets set "SEPAY_WEBHOOK_API_KEY=$SEPAY_WEBHOOK_API_KEY" \
    --project-ref "$SUPABASE_PROJECT_REF" >/dev/null
  echo "  đã đặt SEPAY_WEBHOOK_API_KEY"
else
  echo "  ⚠ Chưa có SEPAY_WEBHOOK_API_KEY — webhash SePay sẽ từ chối mọi lời gọi"
fi

echo "▸ 5/6  Tạo tài khoản quản trị đầu tiên"
SUPABASE_URL="$URL" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_KEY" \
  node supabase/seed/create-staff.mjs "$OWNER_EMAIL" "$OWNER_PASSWORD" "$OWNER_NAME" owner

echo "▸ 6/6  Ghi cấu hình cho mini app và CMS"
python3 - "$URL" "$SUPABASE_ANON_KEY" <<'PY'
import io, re, sys
url, anon = sys.argv[1], sys.argv[2]
for path in [".env", "admin/.env"]:
    try:
        s = io.open(path, encoding="utf-8").read()
    except FileNotFoundError:
        s = ""
    for key, val in [("VITE_SUPABASE_URL", url), ("VITE_SUPABASE_ANON_KEY", anon)]:
        if re.search(rf"^{key}=.*$", s, re.M):
            s = re.sub(rf"^{key}=.*$", f"{key}={val}", s, flags=re.M)
        else:
            s = s.rstrip("\n") + f"\n{key}={val}\n"
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  {path} đã trỏ sang {url}")
PY

cat <<MSG

✓ Xong. Việc còn lại làm bằng tay:

  1. Supabase Dashboard › Authentication › Providers → TẮT đăng ký tự do,
     để người ngoài không tự tạo tài khoản vào CMS.

  2. sepay.vn › Cấu hình › Webhooks → thêm webhook:
       URL   ${URL}/functions/v1/sepay-webhook
       Kiểu  API Key
       Khoá  đúng chuỗi SEPAY_WEBHOOK_API_KEY ở trên

  3. Mở CMS → Cấu hình: điền số tài khoản ngân hàng, giờ mở cửa, bàn,
     OA ID, VAT, chính sách huỷ.

  4. Đổi mật khẩu quản trị nếu mật khẩu ban đầu chỉ dùng tạm.

MSG
