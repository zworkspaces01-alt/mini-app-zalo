# Miyako — Backend (Supabase)

Cơ sở dữ liệu, phân quyền và các hàm phục vụ mini app lẫn CMS.

---

## Chạy tại máy

Cần Docker đang bật.

```bash
npx supabase start        # dựng Postgres + API + Studio
npx supabase db reset     # áp migration và nạp dữ liệu khởi tạo
```

Lệnh `start` in ra API URL, anon key và service_role key. Dự án này đã đổi
sang dải cổng 5453x để không đụng các dự án Supabase khác đang chạy trên máy:

| Thành phần | Địa chỉ |
|---|---|
| API | http://127.0.0.1:54531 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54532/postgres |
| Studio | http://127.0.0.1:54533 |
| Hộp thư thử | http://127.0.0.1:54534 |

Tạo tài khoản đăng nhập CMS đầu tiên:

```bash
SUPABASE_URL=http://127.0.0.1:54531 \
SUPABASE_SERVICE_ROLE_KEY=<service_role key từ supabase start> \
node supabase/seed/create-staff.mjs owner@miyako.vn 'mật khẩu' 'Họ tên' owner
```

---

## Đưa lên môi trường thật

1. Tạo project ở [supabase.com](https://supabase.com) (chọn vùng Singapore cho
   độ trễ thấp nhất với khách ở Việt Nam).
2. Liên kết và đẩy lược đồ lên:
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. Nạp dữ liệu khởi tạo một lần (149 món, 4 suất omakase, cấu hình):
   ```bash
   psql "<connection string>" -f supabase/seed.sql
   ```
4. Tạo tài khoản quản trị bằng `create-staff.mjs` với URL và service_role key
   của project thật.
5. Triển khai các Edge Function:
   ```bash
   npx supabase functions deploy staff-admin
   npx supabase functions deploy sepay-webhook
   npx supabase functions deploy translate-content
   npx supabase secrets set SEPAY_WEBHOOK_API_KEY=<khoá đặt ở SePay>
   npx supabase secrets set GROQ_API_KEY=<khoá Groq>   # hoặc GEMINI_API_KEY
   ```
6. Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` vào `.env` của mini app
   và `admin/.env`.
7. Trong Supabase Dashboard › Authentication › Providers: **tắt đăng ký tự do**
   (Disable signup). Tài khoản nhân viên do quản lý tạo trong CMS, không cho
   người ngoài tự đăng ký.

---

## Lược đồ

| Bảng | Việc |
|---|---|
| `restaurant_settings` | Cấu hình nhà hàng, đúng một dòng (`id = 1`) |
| `opening_hours` | Giờ mở cửa theo thứ và theo ca — nguồn sinh khung giờ đặt bàn |
| `restaurant_tables` | Bàn và khu vực; tổng số ghế = sức chứa mặc định mỗi khung giờ |
| `categories`, `dishes`, `dish_variants` | Thực đơn à la carte |
| `omakase_sets`, `omakase_courses` | Các suất omakase và trình tự món |
| `customers` | Khách nhận diện qua `zalo_id` |
| `reservations` | Đặt bàn |
| `orders`, `order_lines` | Đơn gọi món |
| `seats`, `reservation_seats` | Từng ghế ở quầy omakase và ghế của mỗi lượt đặt bàn |
| `payments` | Giao dịch chuyển khoản SePay báo về, và việc ghép với đặt bàn |
| `staff` | Ai được vào CMS và với vai trò gì |

**Quy ước:** cột `null` nghĩa là dữ kiện *chưa được xác nhận*, không phải bằng
không. Mini app ẩn phần tương ứng thay vì đoán — ví dụ chưa điền `vat_rate`
thì chỉ ghi "tạm tính, chưa gồm VAT".

### Đa ngữ

Sáu bảng có nội dung khách đọc — `categories`, `dishes`, `dish_variants`,
`omakase_sets`, `omakase_courses`, `restaurant_settings` — mang thêm bốn cột:

| Cột | Việc |
|---|---|
| `i18n` | `{"en": {"name": "…"}, "ja": {"name": "…"}}` — bản dịch Anh/Nhật |
| `i18n_src_hash` | Băm các trường tiếng Việt, trigger tự tính lại mỗi lần sửa |
| `i18n_hash` | `i18n_src_hash` tại lúc sinh ra bản dịch đang lưu |
| `i18n_at` | Lần gần nhất `i18n` được ghi |

Tiếng Việt vẫn nằm ở các cột thường và là bản gốc duy nhất chắc chắn đúng.
`i18n_hash <> i18n_src_hash` nghĩa là nhà hàng đã sửa bản gốc sau khi dịch —
view `translation_status` liệt kê đúng những dòng đó cho CMS.

Băm luôn do Postgres tính, không bao giờ do Deno tính, để hai bên không thể
lệch nhau chỉ vì khác cách nối chuỗi.

---

## Mô hình bảo mật

Mini app chạy bằng anon key nằm trong mã tải về máy khách, nên phải giả định
ai cũng đọc được key đó.

**Khách (anon) chỉ được:**

- ĐỌC nội dung thực đơn, omakase, cấu hình, giờ mở cửa, bàn.
- GỌI các hàm `security definer` bên dưới.

Khách **không** đọc hay ghi trực tiếp vào `reservations`, `orders`,
`customers`. RLS chặn hoàn toàn, đã kiểm chứng bằng cách gọi thẳng REST API.

**Mọi thao tác ghi của khách đi qua hàm trên server:**

| Hàm | Việc |
|---|---|
| `get_availability(date, service)` | Khung giờ còn chỗ, tính từ `opening_hours` trừ đi số khách đã đặt. Không lọc theo hạn đặt trước — mini app lọc tiếp, `create_reservation` mới chặn thật |
| `create_reservation(...)` | Tạo đặt bàn. **Tiền cọc do server tính** từ giá suất trong CSDL. Từ chối mốc đã qua, và từ chối omakase đặt sát hơn `restaurant_settings.omakase_lead_hours` |
| `get_reservation_by_code(code)` | Tra cứu bằng mã |
| `cancel_reservation_by_code(code)` | Huỷ bàn |
| `create_order(lines, ...)` | Gửi đơn. **Giá từng dòng do server tra lại** từ `dishes` |
| `get_order_by_code(code)` | Tra cứu đơn |
| `get_seat_availability(date, time)` | Ghế nào còn trống ở khung giờ đó |
| `create_reservation_with_seats(...)` | Đặt bàn kèm giữ ghế, gói trong một giao dịch |
| `get_reservation_seats_by_code(code)` | Khách xem ghế của chính mình |

**Hàm chỉ nhân viên gọi được** (kiểm tra `is_staff()` bên trong):

| Hàm | Việc |
|---|---|
| `staff_create_reservation(...)` | Nhân viên nhận bàn qua điện thoại, tự đặt được trạng thái và xếp bàn |
| `recalc_reservation_deposit(id)` | Tính lại tiền cọc sau khi đổi suất hoặc số khách |
| `staff_create_order(...)` | Nhân viên nhập đơn khách gọi miệng |
| `set_order_lines(order_id, lines)` | Ghi lại toàn bộ dòng món của một đơn và tính lại tổng |

Trang quản trị không tự tính tiền ở phía trình duyệt. Số hiện trong lúc soạn
chỉ để nhân viên ước lượng; con số ghi vào CSDL luôn do các hàm trên tính.

Client không gửi lên bất kỳ con số tiền nào. Sửa giá ở phía trình duyệt không
ảnh hưởng gì tới đơn ghi vào CSDL.

**Nhân viên** đăng nhập bằng email/mật khẩu. Phải vừa có tài khoản auth, vừa có
dòng trong bảng `staff` với `is_active = true`. Vai trò `owner` và `manager`
mới sửa được thực đơn và cấu hình; `staff` và `kitchen` chỉ xử lý đặt bàn và
đơn hàng.

### Tra cứu bằng mã

Khách không có tài khoản, nên **mã đặt bàn chính là chìa khoá**: biết mã thì
xem được lượt đặt đó, giống số vé. Mini app lưu danh sách mã trong máy để dựng
lại mục "Đặt bàn của tôi".

Hệ quả: xoá dữ liệu app hoặc đổi máy thì mất danh sách, phải gọi nhà hàng.
Muốn bỏ hạn chế này thì cần bước nâng cấp bên dưới.

### Nâng cấp khi cần định danh khách chắc chắn

Viết một Edge Function nhận access token của Zalo, gọi Open API của Zalo để
xác minh, rồi phát hành JWT Supabase có claim `zalo_id`. Sau đó đổi RLS sang
`auth.jwt() ->> 'zalo_id' = reservations.zalo_id`. Việc này cần app secret của
Zalo và chỉ nên làm khi đã có nhu cầu thật (lịch sử đặt bàn xuyên thiết bị,
tích điểm khách quen).

---

## Chọn chỗ ngồi

Khách chọn đúng ghế mình muốn trên mô hình 3D của phòng omakase. Toạ độ từng
ghế nằm trong bảng `seats`, nên nhà hàng đổi bố cục quầy trong CMS là mô hình
đổi theo — không phải sửa mã.

Hai chốt chặn nằm ở server, client không lách được:

- **Số ghế phải khớp số khách.** `assign_seats` từ chối nếu lệch.
- **Không ai giành được ghế của người khác.** Hàm khoá các dòng liên quan rồi
  kiểm tra lại mới ghi. Hai khách bấm cùng lúc thì người sau nhận lỗi và chọn
  lại, chứ không có chuyện hai lượt cùng một ghế.

Giữ ghế tính theo khoảng thời gian, không theo đúng một mốc giờ: hai lượt
cách nhau 30 phút vẫn đè nhau nếu `seating_duration_minutes` là 120. Nhà hàng
sửa số phút này trong Cấu hình.

Nếu bước giữ ghế hỏng thì **cả lượt đặt bàn cũng không được tạo** — thà báo
lỗi để khách chọn lại, còn hơn có một lượt đặt bàn không có chỗ ngồi.

---

## Edge Function `sepay-webhook`

Nhận biến động số dư từ SePay và tự đánh dấu đã nhận cọc. Xem hướng dẫn cài
đặt đầy đủ ở [SEPAY.md](SEPAY.md).

```bash
npx supabase functions serve --env-file supabase/functions/.env
npx supabase functions deploy sepay-webhook
```

---

## Edge Function `staff-admin`

Tạo, đổi mật khẩu và xoá tài khoản nhân viên. Đây là những việc cần
service_role key nên phải chạy trên máy chủ.

Hàm tự kiểm tra người gọi là quản lý đang hoạt động trước khi làm bất cứ điều
gì, và chặn hai trường hợp nguy hiểm: tự xoá chính mình, và xoá người chủ nhà
hàng cuối cùng.

```bash
npx supabase functions serve staff-admin   # chạy tại máy
npx supabase functions deploy staff-admin  # đưa lên project thật
```

Hàm không dùng thư viện ngoài, chỉ gọi thẳng REST API — khởi động ngay và
không hỏng khi registry chặn mạng.

---

## Edge Function `translate-content`

Dịch nội dung thực đơn sang tiếng Anh và tiếng Nhật bằng AI, ghi vào cột
`i18n`. Không bao giờ đụng tới cột tiếng Việt.

Khoá API chỉ nằm ở đây, không có trong mã chạy ở trình duyệt; hàm cũng tự
kiểm tra người gọi là quản lý đang hoạt động.

| Biến môi trường | Mặc định | Việc |
|---|---|---|
| `GROQ_API_KEY` | — | Khoá Groq · console.groq.com/keys |
| `GEMINI_API_KEY` | — | Khoá Gemini · aistudio.google.com/apikey |
| `TRANSLATE_PROVIDERS` | `groq,gemini` | Thứ tự thử; hỏng cái đầu thì sang cái sau |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Đổi khi dùng cổng khác tương thích OpenAI |

Cần ít nhất một khoá. Chưa có khoá thì nút trong CMS báo đúng chuyện đó thay
vì im lặng.

```bash
npx supabase functions serve translate-content --env-file supabase/functions/.env
npx supabase functions deploy translate-content
```

**Hai việc hàm tự lo, không giao cho AI:**

- Tên tiếng Nhật của món, nhóm món và suất omakase lấy thẳng từ cột `jp` —
  đó là chữ in trên menu giấy, nhà hàng đã xác nhận. Dữ liệu người xác nhận
  luôn thắng dữ liệu máy đoán.
- Trường mảng (`includes`, `gifts`, `items`) chỉ được nhận khi bản dịch trả
  về đúng số phần tử. Lệch một dòng là bỏ cả trường, dùng lại tiếng Việt.

Mỗi lượt gọi chỉ xử lý 60 dòng rồi trả về `remaining`, để không chạm trần
thời gian. CMS lặp tới khi hết. Lượt "dịch lại toàn bộ" gửi kèm mốc `since`
— thiếu mốc đó thì lượt nào cũng làm đúng những dòng đầu bảng, chạy mãi
không hết.

---

## Đổi dữ liệu khởi tạo

`supabase/seed.sql` được **sinh tự động** từ `src/data/*.ts` của mini app:

```bash
node supabase/seed/generate-seed.mjs
```

Sau khi CMS đi vào vận hành, CSDL mới là nguồn sự thật. Lúc đó chỉ dùng script
này để dựng lại môi trường thử nghiệm, đừng dùng để ghi đè dữ liệu thật.

---

## Sinh lại kiểu TypeScript

Sau mỗi lần đổi lược đồ:

```bash
npx supabase gen types typescript --local > src/types/db.ts
cp src/types/db.ts admin/src/types/db.ts
```

Với project thật thì thay `--local` bằng `--project-id <ref>`.
