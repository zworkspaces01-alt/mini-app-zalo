# Nhận cọc tự động qua SePay

Nhà hàng không cần tài khoản cổng thanh toán. SePay theo dõi tài khoản ngân
hàng sẵn có và báo về mỗi khi có tiền vào; hệ thống đối chiếu nội dung chuyển
khoản với mã đặt bàn rồi tự đánh dấu đã nhận cọc.

**App không giữ tiền và không xử lý thẻ.** Tiền đi thẳng từ khách vào tài khoản
ngân hàng của nhà hàng.

---

## Luồng chạy

```
Khách đặt suất omakase
   → mini app hiện mã VietQR: số tiền và nội dung điền sẵn
   → khách quét bằng app ngân hàng, chuyển khoản
   → tiền vào tài khoản nhà hàng
   → SePay gọi webhook  POST /functions/v1/sepay-webhook
   → hệ thống ghi giao dịch, dò mã đặt bàn trong nội dung
   → đủ tiền cọc → bàn tự chuyển sang "đã xác nhận"
   → màn hình của khách tự cập nhật, CMS hiện giao dịch ngay
```

Nội dung chuyển khoản là mã đặt bàn **bỏ dấu gạch nối**: `MY-NETJH` → `MYNETJH`.
Ngân hàng hay lược ký tự lạ nên khi đối chiếu, hệ thống chuẩn hoá chuỗi (viết
hoa, bỏ mọi ký tự không phải chữ/số) rồi mới dò. Vì vậy `MY NETJH`,
`MY-NETJH`, `myNetjh` đều khớp.

---

## Cài đặt

### 1. Trên SePay

1. Đăng ký tại [sepay.vn](https://sepay.vn) và liên kết tài khoản ngân hàng
   của nhà hàng. Danh sách ngân hàng hỗ trợ: <https://qr.sepay.vn/banks.json>
2. Vào **Cấu hình › Webhooks**, thêm webhook:
   - **URL**: `https://<project-ref>.supabase.co/functions/v1/sepay-webhook`
   - **Kiểu xác thực**: API Key
   - **API Key**: tự sinh một chuỗi ngẫu nhiên đủ dài, lưu lại
   - **Sự kiện**: chỉ cần tiền vào (`transferType = in`)

### 2. Trên Supabase

```bash
supabase secrets set SEPAY_WEBHOOK_API_KEY=<đúng chuỗi vừa tạo ở SePay>
supabase functions deploy sepay-webhook
```

Khoá không khớp thì webhook trả 401. Chưa đặt khoá thì trả 500 và từ chối tất
cả — cố tình như vậy, thà không nhận còn hơn nhận bừa từ người lạ.

### 3. Trong CMS

**Cấu hình › Thanh toán**: chọn ngân hàng, điền số tài khoản và tên chủ tài
khoản, rồi bật *Hiển thị mã QR trong mini app*. Khối xem trước cho thấy đúng
thứ khách sẽ nhìn thấy.

### 4. Thử trước khi mở cho khách

Dùng **Test mode** của SePay để bắn một giao dịch giả, rồi mở mục **Thanh toán**
trong CMS xem đã về chưa. Hoặc gọi thẳng:

```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/sepay-webhook \
  -H "Authorization: Apikey $SEPAY_WEBHOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":999001,"gateway":"Vietcombank","transactionDate":"2026-01-01 10:00:00",
       "accountNumber":"1017588888","content":"MYABCDE chuyen tien",
       "transferType":"in","transferAmount":3000000,"referenceCode":"FT999"}'
```

Trả về `{"success":true,"matched":true,...}` là đã ghép được với đặt bàn
`MY-ABCDE`.

---

## Những chỗ dễ hỏng, và cách đã xử lý

**SePay gửi lại webhook.** Nếu không nhận được HTTP 200/201 kèm
`{"success": true}` trong 30 giây, SePay sẽ gọi lại. Khoá duy nhất trên cột
`payments.sepay_id` khiến lần gửi lại không tạo bản ghi mới, nên không bao giờ
cộng tiền hai lần.

**Khách ghi sai nội dung.** Chuyện này xảy ra thường xuyên. Giao dịch vẫn được
ghi lại ở trạng thái *chờ đối soát* và hiện trong mục Thanh toán để nhân viên
gán tay vào đúng bàn. Webhook vẫn trả thành công — trả lỗi chỉ khiến SePay gửi
lại mãi mà không giải quyết được gì.

**Khách chuyển thiếu.** Hệ thống cộng dồn mọi khoản đã khớp của cùng một bàn.
Chỉ khi tổng đạt mức cọc thì bàn mới chuyển sang đã xác nhận.

**Tiền chuyển ra.** Ghi lại để đối chiếu sổ sách nhưng không bao giờ đem đi
ghép với đặt bàn.

**Chỉ lưu được một nửa.** Nếu ghi giao dịch thất bại, webhook trả 500 để SePay
gửi lại — tiền đã vào tài khoản thật, không được đánh rơi. Còn nếu đã ghi được
mà chỉ bước ghép hỏng, webhook trả thành công và giao dịch nằm chờ đối soát.

---

## Bảng và hàm liên quan

| Tên | Việc |
|---|---|
| `payments` | Mọi giao dịch SePay báo về. `sepay_id` là khoá chống trùng |
| `find_reservation_code(text)` | Dò mã đặt bàn trong nội dung chuyển khoản |
| `process_payment(id)` | Ghép một giao dịch với đặt bàn |
| `refresh_reservation_payment(id)` | Cộng lại tổng đã nhận của một bàn và cập nhật trạng thái cọc |
| `link_payment(payment, reservation)` | Nhân viên gán tay; bỏ tham số thứ hai để gỡ gán |
| `ignore_payment(payment, note)` | Đánh dấu khoản không liên quan |

Khách (anon) không đọc được bảng `payments` và không gọi được `link_payment`
hay `ignore_payment` — đã kiểm chứng bằng cách gọi thẳng REST API.

---

## Mã QR

Ảnh sinh từ `https://qr.sepay.vn/img` với bốn tham số:

| Tham số | Nghĩa |
|---|---|
| `acc` | Số tài khoản nhận |
| `bank` | Tên ngắn ngân hàng, ví dụ `Vietcombank` |
| `amount` | Số tiền, đơn vị đồng |
| `des` | Nội dung chuyển khoản — ở đây là mã đặt bàn bỏ gạch nối |

Hàm dựng URL nằm ở `src/utils/banks.ts` (mini app) và `admin/src/lib/banks.ts`
(CMS).
