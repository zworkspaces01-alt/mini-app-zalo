# Miyako

Hệ thống đặt bàn và gọi món cho nhà hàng Nhật Miyako (omakase & wagyu A5, Hà Nội).

Gồm ba phần trong cùng một kho mã:

| Thư mục | Phần | Nền tảng |
|---|---|---|
| `src/` | **Mini app** cho khách | Zalo Mini App · React 18 · TypeScript · Vite · Tailwind · zmp-ui · jotai |
| `admin/` | **CMS** cho nhà hàng | React · Vite · Tailwind · Supabase |
| `supabase/` | **Backend** | Postgres · RLS · hàm RPC · Edge Functions |

Tài liệu riêng: [`supabase/README.md`](supabase/README.md) ·
[`admin/README.md`](admin/README.md) ·
[`supabase/SEPAY.md`](supabase/SEPAY.md) (nhận cọc tự động)

---

## Chạy toàn bộ hệ thống

```bash
# 1. Backend (cần Docker)
npx supabase start
npx supabase db reset

# 2. Tài khoản quản trị đầu tiên
SUPABASE_URL=http://127.0.0.1:54531 \
SUPABASE_SERVICE_ROLE_KEY=<key từ supabase start> \
node supabase/seed/create-staff.mjs owner@miyako.vn 'mật khẩu' 'Họ tên' owner

# 3. CMS
cd admin && npm install && cp .env.example .env && npm run dev   # :5280

# 4. Mini app
npm install
npm run preview:check   # xem nhanh trên trình duyệt: localhost:5199
```

Muốn chạy bằng `npm start` (tức `zmp start`) thì phải cài Zalo Mini App CLI
trước — chưa cài thì lệnh báo `zmp: command not found`:

```bash
npm install -g zmp-cli
```

Hoặc dùng Zalo Mini App Extension trong VS Code. Để xem nhanh giao diện trong
lúc phát triển thì `npm run preview:check` là đủ và không cần CLI.

---

## Chạy riêng mini app

```bash
npm install

npm start          # zmp start — chạy trong Zalo DevTools (luồng chuẩn)
npm run typecheck  # kiểm tra kiểu
npm run build:check    # build thử ngoài zmp CLI
npm run preview:check  # dev server thường ở localhost:5199, tiện xem nhanh trên trình duyệt
npm run deploy     # zmp deploy
```

`vite.config.mts` là cấu hình zmp dùng khi deploy. `vite.check.mts` chỉ phục vụ
kiểm tra/xem nhanh ngoài zmp CLI — không ảnh hưởng bản phát hành.

Mini app đọc `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` từ `.env` ở thư
mục gốc. Chưa cấu hình thì app vẫn chạy bằng thực đơn đóng gói sẵn, chỉ không
đặt bàn và gọi món được.

---

## Tính năng đã có

### 1. Ba ngôn ngữ — Việt · Anh · Nhật

Mini app chạy đủ ba thứ tiếng. Lần đầu mở, app đoán theo ngôn ngữ máy khách
(Zalo, rồi tới trình duyệt); không đoán được thì tiếng Việt. Khách đổi lại ở
nút địa cầu trên header hoặc trong trang Cá nhân, và lựa chọn được ghi nhớ.

Ngày giờ và tiền cũng đổi theo: `Thứ bảy, 20/09` · `Sat, 20 Sep` · `9月20日(土)`.

**Tiếng Việt là bản gốc của mọi nội dung.** Bản dịch nằm riêng ở cột `i18n`
trong CSDL; ô nào chưa dịch thì mini app hiện lại tiếng Việt, nên dịch dở
dang không bao giờ để lại màn hình trống.

Tên tiếng Nhật của món lấy thẳng từ kanji in trên menu giấy, không qua máy
dịch — dữ liệu nhà hàng đã xác nhận luôn thắng dữ liệu máy đoán.

Nhà hàng bấm **Cấu hình › Ngôn ngữ** trong CMS để dịch cả loạt bằng AI
(Groq, dự phòng Gemini), rồi sửa lại từng chỗ trong biểu mẫu của món. Sửa bản
tiếng Việt xong thì món đó tự hiện nhãn "Chưa dịch".

### 2. Trang chủ
Ảnh không gian thật, hai hành động chính (Đặt bàn · Gọi món), khối Omakase,
hàng món khách gọi nhiều, danh sách món đặc trưng, khối liên hệ (gọi hotline,
nhắn OA, chỉ đường). Nhận biết khách đang ngồi tại bàn qua QR.

### 3. Omakase
- Danh sách 4 suất: trưa 500.000đ, tối 1.000.000đ / 2.000.000đ / 3.000.000đ.
- Trang chi tiết có trình tự món dạng timeline, mô tả, mức cọc 50%.
- Suất chưa có thực đơn chi tiết hiển thị “đang cập nhật” thay vì bịa món.
- Nút “Đặt suất này” đưa thẳng sang form đặt bàn với suất đã chọn sẵn.

### 4. Thực đơn & gọi món
- **149 món thật**, số hoá từ bộ menu in 39 trang (M1–M39): tên Việt, romaji,
  kanji, giá, nhãn Signature / Best seller / Must try, combo kèm phần thịt và
  set tặng, món nhiều size (lẩu, sukiyaki, shabu).
- 12 nhóm món, lọc theo nhóm, tìm kiếm không dấu (gõ “ca hoi” ra “Cá hồi”).
- Bottom sheet chi tiết món: chọn size, số lượng, ghi chú cho bếp, lưu món.
- Giỏ món lưu trong máy, thanh giỏ nổi, trang giỏ có sửa số lượng và ghi chú.
- Hai chế độ gửi đơn: **tại bàn** (quét QR → gửi thẳng bếp) và **đặt trước**
  (gắn đơn vào một bàn đã đặt).

### 5. Chọn chỗ ngồi trên mô hình 3D

Khách đặt suất omakase thấy **mô hình 3D phòng quầy**, dựng đúng theo bố cục
thật: quầy chữ nhật, bếp trưởng đứng giữa phía trong, đèn washi sáu khoang,
tường đá có logo, tủ gỗ và cửa sổ chớp hai bên. Kéo để xoay, chạm vào ghế
muốn ngồi. Ghế đã có khách thì xám và không chọn được; ghế nhìn thẳng tay bếp
trưởng có viền vàng.

Dựng bằng **three.js**: ánh sáng thật, đổ bóng mềm, vật liệu nhám, vân gỗ và
vân đá sinh bằng canvas ngay lúc chạy nên không kéo theo file ảnh nào.

**Máy không chạy được WebGL thì tự lùi** về bản dựng bằng canvas 2D
(`room-view.tsx` + `scene.ts`) — vẫn xoay và chọn ghế được, chỉ kém đẹp hơn.
Nhờ vậy không có máy nào rơi vào cảnh không đặt được bàn.

Chi phí: three.js sau khi rung cây còn 472KB thô / 118KB gzip, đưa bundle từ
204KB lên 341KB gzip. Giới hạn của Zalo Mini App là 10MB cho cả thư mục `www`
và 3MB mỗi file, nên vẫn còn rất rộng.

Toạ độ từng ghế nằm trong CSDL, nhà hàng đổi bố cục quầy trong CMS là mô hình
đổi theo. Số ghế phải khớp số khách, và hai khách bấm cùng lúc thì server
chặn người sau — kiểm tra nằm ở CSDL, không ở trình duyệt.

**Không gọi được máy chủ thì vẫn thấy phòng**: sơ đồ ghế có bản đóng gói sẵn
trong `src/data/seats.ts`, giống cách thực đơn vẫn hiện khi mất mạng. Lúc đó
app nói rõ là chưa kiểm tra được ghế nào còn trống. Đây là tình huống hay gặp
khi chạy trong Zalo Simulator: trang phục vụ qua HTTPS nên không gọi được
Supabase chạy ở `http://127.0.0.1` — muốn thử đủ luồng thì trỏ
`VITE_SUPABASE_URL` vào project Supabase thật (HTTPS).

### 6. Đặt cọc tự động

Khách đặt suất omakase thấy ngay mã VietQR với số tiền và nội dung điền sẵn.
Chuyển khoản xong, SePay báo về máy chủ trong vài giây, bàn tự chuyển sang đã
xác nhận và màn hình của khách tự cập nhật — không ai phải bấm gì.

Nhà hàng không cần tài khoản cổng thanh toán, tiền đi thẳng vào tài khoản ngân
hàng sẵn có. Chi tiết: [`supabase/SEPAY.md`](supabase/SEPAY.md).

### 7. Đặt bàn
Một form cuộn liền mạch: chọn suất → ngày (dải 30 ngày) → giờ (khung giờ còn
chỗ) → số khách → chỗ ngồi (quầy 12 ghế / bàn / phòng riêng) → tên, điện thoại,
dị ứng, ghi chú. Thanh dưới luôn hiện tiền cọc.
Sau đó: trang xác nhận → trang thành công có mã đặt bàn đọc được qua điện thoại
(`MY-XXXXX`) → bước đặt cọc.

### 8. Đặt bàn của tôi
Danh sách theo trạng thái (chờ xác nhận / chờ cọc / đã xác nhận / đã huỷ),
trang chi tiết có mã lớn để đọc cho nhân viên, nút gọi nhà hàng, nút huỷ bàn.

### 9. Cá nhân
Thông tin lấy từ Zalo, lối tắt tới đặt bàn, món đã lưu, trang giới thiệu,
lịch sử đơn đã gọi, khối liên hệ.

### 10. Giới thiệu
Logo, ảnh không gian, quầy omakase, wagyu A5 và thông số wet-aging in trên menu
(−2°C–2°C, 70–80%, 0,5–2 m/s, 21 ngày).

### 11. CMS cho nhà hàng (`admin/`)

- **Tổng quan** — bàn hôm nay, việc cần xử lý, đơn bếp đang làm, tiền món trong
  ngày, cảnh báo tiền cọc chưa thu và danh sách dữ kiện còn thiếu.
- **Đặt bàn** — thêm bàn khi khách gọi điện, sửa toàn bộ thông tin, xác nhận,
  đánh dấu đã nhận cọc, xếp bàn, ghi chú nội bộ, huỷ hoặc xoá hẳn. Dị ứng của
  khách hiện màu đỏ. Đổi suất hay số khách thì tiền cọc được máy chủ tính lại.
- **Đơn gọi món** — thêm đơn khách gọi miệng, sửa món trong đơn, chuyển trạng
  thái mới gửi → đang làm → đã ra món, huỷ hoặc xoá hẳn. Cập nhật realtime.
- **Thực đơn** — thêm/sửa/xoá 149 món và phần theo size; thêm/sửa/xoá và sắp
  xếp nhóm món; bật tắt "còn phục vụ" khi hết nguyên liệu.
- **Thanh toán** — tiền khách chuyển về hiện ngay trong vài giây; gán tay
  khoản ghi sai nội dung, bỏ qua khoản không liên quan.
- **Omakase** — thêm/sửa/xoá suất và trình tự món theo từng phần.
- **Cấu hình** — thông tin nhà hàng, thuế và cọc, giờ mở cửa (thêm/xoá từng
  ca), bàn, và nhân sự (thêm tài khoản, đổi vai trò, đổi mật khẩu, xoá).

Mọi đối tượng đều thêm, sửa và xoá được. CMS phân biệt rõ **huỷ / tắt hiển
thị** (giữ lịch sử) với **xoá hẳn** (mất khỏi CSDL), và luôn hỏi lại trước khi
xoá.

Chạy tốt trên điện thoại để nhân viên dùng ngay tại quán.

---

## Cấu trúc mã

```
src/                      Mini app cho khách
  config/restaurant.ts    Dữ kiện dự phòng khi chưa gọi được máy chủ
  data/                   Thực đơn đóng gói sẵn: 12 nhóm, 149 món, 4 suất omakase
  services/
    supabase.ts           Client; chưa cấu hình thì app vẫn chạy offline
    content.ts            Tải thực đơn từ CSDL, hỏng thì giữ bản đóng gói
    api.ts                Gọi các hàm RPC: đặt bàn, gọi món, tra cứu
    zalo.ts               Bọc zmp-sdk, luôn chạy được cả ngoài Zalo
  state/
    atoms.ts              Giỏ món, nháp đặt bàn, món đã lưu, bàn đang ngồi
    content.ts            Thực đơn và cấu hình đang hiển thị
  hooks/
    use-content-sync.ts   Lấy nội dung mới khi mở app
    use-restaurant.ts     Gộp cấu hình từ CSDL với bản dự phòng
  i18n/
    vi.ts en.ts ja.ts     Chuỗi giao diện; vi.ts là hình dạng chuẩn
    index.ts              Ngôn ngữ đang chọn, useT() và useTr()
  components/
    room3d/               Mô hình 3D phòng quầy: three.js + bản canvas dự phòng
    booking/ menu/ omakase/ ui/ nav/
  pages/ css/ static/img/

admin/                    CMS cho nhà hàng
  src/pages/              Tổng quan · Đặt bàn · Đơn gọi món · Thực đơn · Omakase · Cấu hình
  src/components/ui.tsx   Bộ thành phần dùng chung
  src/hooks/useAuth.tsx   Đăng nhập + kiểm tra quyền nhân viên

supabase/
  migrations/             Lược đồ, RLS, các hàm RPC, cột đa ngữ
  functions/
    sepay-webhook/        Nhận báo có của SePay
    staff-admin/          Tạo/xoá tài khoản nhân viên
    translate-content/    Dịch thực đơn sang Anh/Nhật bằng Groq hoặc Gemini
  seed.sql                Dữ liệu khởi tạo (sinh tự động)
  seed/                   Script sinh seed và tạo tài khoản nhân viên
```

### Nguyên tắc dữ liệu

CSDL là nguồn sự thật. Dữ liệu trong `src/data/` chỉ là bản đóng gói để app
hiển thị được ngay khi mở và khi mạng hỏng.

Ô `null` nghĩa là **chưa được xác nhận**, không phải bằng không — mini app ẩn
phần đó đi thay vì đoán. Trang Tổng quan của CMS liệt kê những ô còn trống.

Mỗi món giữ `source_page` trỏ về trang menu giấy gốc để đối chiếu khi đổi giá.

Tiếng Việt là bản gốc của nội dung, nằm ở các cột thường. Bản dịch Anh/Nhật
nằm ở cột `i18n` và chỉ là lớp phủ: thiếu chỗ nào, app lùi về tiếng Việt chỗ
ấy. Không có đường nào để một bản dịch ghi đè lên bản gốc.

---

## Thiết kế

Tông tối một màu (`#0b0b0c`), chữ washi, một điểm nhấn đỏ chu sa `#e2231a` lấy
từ logo và con dấu 都 trên menu giấy; vàng `#c9a96a` dành riêng cho omakase và
các set nướng.

**Không dùng font có chân ở bất kỳ đâu** — kể cả tiêu đề và chữ Nhật. Toàn bộ
dùng stack sans-serif của hệ thống (SF Pro / Roboto), chữ Nhật dùng Gothic
(Hiragino Kaku Gothic / Yu Gothic / Noto Sans JP). Tiêu đề tạo khác biệt bằng
độ đậm và giãn chữ, không bằng kiểu chữ.

Dòng món mượn bố cục menu giấy: kanji đỏ nhỏ, tên Việt, romaji nghiêng, giá
canh phải. Vùng chạm tối thiểu 44px, chừa safe area trên/dưới, có skeleton khi
tải, tôn trọng `prefers-reduced-motion`.

> Không dùng `backdrop-filter` cho header và thanh nav: chồng hai lớp blur làm
> Chrome vẽ lặp, và WebView Android cũ hỗ trợ kém.

### Chừa chỗ cho hai nút mặc định của Zalo

`actionBarHidden` đang bật, nên Zalo vẽ hai nút của nó — **quay lại** và
**đóng** — thành một viên thuốc nổi ở **góc phải trên**, ngay dưới thanh
trạng thái. Viên thuốc này nằm trên mọi thứ mini app vẽ ra và không bấm xuyên
qua được, nên góc đó là vùng cấm: không đặt nút, tiêu đề hay thông tin nào của
app vào đấy.

Vùng cấm khai báo trong `src/css/app.scss` (`--zbtn-w`, `--zbtn-h`,
`--zbtn-pr`, `--safe-top`) và dùng qua hai lớp:

| Lớp | Dùng khi |
|---|---|
| `head-safe` | hàng header ngang tầm hai nút — chừa `--zbtn-pr` bên phải |
| `pad-safe-top` | trang không có header — đẩy nội dung xuống dưới `--safe-top` |

Màn hình mới có header thì đặt `head-safe` lên hàng `flex h-14` của nó, hoặc
dùng sẵn `BackHeader` (đã có). Phần tử đặt tuyệt đối ở mép trên — như nút đổi
ngôn ngữ trên ảnh hero của trang chủ — thì để bên trái.

Xem nhanh có đụng nút hay không: chạy `npm run preview:check`, mở app trong
một khung 390×844 và vẽ đè một ô đỏ `right: 8px; top: calc(47px + 4px);
88×32` — không có gì của app được nằm dưới ô đó.

---

## Còn phải làm trước khi phát hành

### A. Dữ liệu nhà hàng tự điền trong CMS

Vào **Cấu hình**, trang Tổng quan cũng nhắc những ô còn trống:

1. **Địa chỉ đầy đủ** (số nhà, phường, quận) — hiện tạm dùng "28 Đào Tấn, Hà Nội".
2. **Giờ mở cửa** từng ngày, từng ca → tab Giờ mở cửa. Giá trị đang có là tạm tính.
3. **Bàn và phòng riêng** → tab Bàn. Mới chỉ có quầy itamae 12 ghế.
4. **OA ID** của Zalo Official Account → bật nút nhắn tin và mời theo dõi OA.
5. **VAT và phí phục vụ** → chưa điền thì app chỉ ghi "tạm tính, chưa gồm VAT".
6. **Chính sách huỷ bàn** và điều kiện hoàn cọc.
7. **Thực đơn chi tiết** của omakase trưa 500k, set tối 1.000k và 2.000k →
   trang Omakase, tắt "Thực đơn chờ cập nhật" sau khi điền.
8. **Menu đồ uống** — chưa có trong bộ menu in đã số hoá, cần thêm ở trang Thực đơn.
9. Đối chiếu hai điểm đọc từ menu giấy còn mờ: giá *Lưỡi bò hoa xốt yuzu*
   (đang để 179) và romaji trên card Kaze (*Chanwamusi*, *Nigitoro*, *Mansaba*
   — nhiều khả năng là Chawanmushi, Negitoro, Shimesaba).

### B. Việc còn lại của kỹ thuật

| Việc | Ghi chú |
|---|---|
| **Cấu hình SePay** | Khai báo tài khoản ngân hàng trong CMS, tạo webhook trên sepay.vn và đặt `SEPAY_WEBHOOK_API_KEY`. Xem [SEPAY.md](supabase/SEPAY.md) |
| **Số điện thoại từ Zalo** | `getPhoneNumber` trả về token, phải đổi ở backend qua Open API của Zalo. Hiện khách tự nhập số |
| **Thông báo qua OA** | Gửi tin cho khách khi bàn được xác nhận |
| **Khoá AI để dịch** | Đặt `GROQ_API_KEY` hoặc `GEMINI_API_KEY` cho Edge Function, rồi bấm Cấu hình › Ngôn ngữ › Dịch. Chưa có khoá thì app vẫn chạy, chỉ là khách nước ngoài đọc tiếng Việt |
| **Đọc lại bản máy dịch** | Nhất là mô tả món và tên tiếng Anh. Tên tiếng Nhật lấy từ menu giấy nên không cần soát |
| **Ảnh món** | Bỏ file vào `src/static/img/`, khai báo ở `utils/images.ts`, điền khoá vào trường ảnh của món. Chuyển sang Supabase Storage nếu muốn nhà hàng tự tải ảnh lên |
| **QR tại bàn** | Deep link kèm `?table=A3`; app đọc sẵn tham số. Cần in QR cho từng bàn sau khi khai báo bàn trong CMS |

### C. Trước khi mở cho khách

- Supabase Dashboard › Authentication › **tắt đăng ký tự do**.
- Đổi mật khẩu các tài khoản nhân viên tạo lúc thử nghiệm.
- Kiểm tra `.env` trên môi trường thật chỉ chứa **anon key**, không có
  service_role key.

## Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **1** | Mini app khách, chạy trên thực đơn thật | xong |
| **2** | Backend Supabase + CMS: đặt bàn, đơn gọi món, thực đơn, omakase, cấu hình | xong |
| **3** | Nhà hàng điền nốt dữ kiện, đưa lên môi trường thật, in QR bàn | đang chờ nhà hàng |
| **4** | Nhận cọc tự động qua SePay | xong |
| **5** | Ba ngôn ngữ Việt · Anh · Nhật, dịch nội dung tự động bằng AI | xong |
| **6** | Thông báo qua OA khi bàn được xác nhận, đổi token số điện thoại | |
| **7** | Nối POS/bếp in phiếu, báo cáo doanh thu theo ngày và theo món | |
| **8** | Tích điểm, hạng khách quen, voucher, mời khách cho suất omakase theo mùa | |

## Tài nguyên

- [Zalo Mini App](https://mini.zalo.me/) · [ZaUI](https://mini.zalo.me/documents/zaui/) · [ZMP SDK](https://mini.zalo.me/documents/api/)
