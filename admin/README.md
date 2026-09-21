# Miyako — CMS

Trang quản trị cho nhà hàng: đặt bàn, đơn gọi món, thực đơn, omakase, cấu hình.

React + TypeScript + Vite + Tailwind + Supabase.

## Chạy

```bash
npm install
cp .env.example .env   # rồi điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5280
npm run typecheck
npm run build
```

Backend phải chạy trước — xem `../supabase/README.md`.

## Màn hình

| Trang | Đường dẫn | Nghiệp vụ quản lý |
|---|---|---|
| **Tổng quan** | `/` | Bàn hôm nay, việc cần xử lý, bàn sắp tới cần xử lý, đơn đang mở, tiền món trong ngày, cảnh báo dữ kiện còn thiếu |
| **Sơ đồ bàn (Live Floor Plan)** | `/floor-plan` | Mặt bằng nhà hàng thời gian thực: Quầy Itamae 12 ghế, Bàn chung, Phòng riêng VIP. Theo dõi bàn trống, có khách, đã cọc; Chuyển bàn, gộp bàn, in tạm tính và thanh toán |
| **Màn hình bếp (KDS)** | `/kds` | Màn hình cảm ứng full-screen chuyên dụng cho bếp: chuông báo vé mới realtime, bộ đếm thời gian chế biến, gạch từng món đã xong, 1 chạm chuyển trạng thái |
| **Đặt bàn** | `/reservations` | Xem lịch hẹn theo ngày / ca, thêm bàn gọi điện, xếp bàn & xếp ghế quầy 3D, cảnh báo dị ứng màu đỏ, nhận cọc SePay, check-in đón khách |
| **Đơn món & Butcher** | `/orders` | Đơn tại bàn, đơn đặt trước, và **đơn giao hàng/mang về thịt Wagyu Butcher** (người nhận, SĐT, địa chỉ, giờ hẹn, phí ship, COD). In phiếu báo bếp KOT, in hoá đơn tạm tính, in phiếu giao hàng |
| **Khách hàng CRM** | `/customers` | Hồ sơ khách hàng đồng bộ từ Zalo Mini App, phân hạng thành viên (Đồng, Bạc, Vàng, Kim Cương), số dư điểm, cộng/trừ điểm thủ công, lịch sử ăn uống & sở thích khẩu vị |
| **Ưu đãi & Voucher** | `/rewards` | Danh mục quà tặng tích điểm, tạo mã voucher khuyến mãi, công cụ tra cứu & duyệt mã voucher tại quầy |
| **Thanh toán** | `/payments` | Đối soát chuyển khoản SePay tự động qua mã VietQR `MY-XXXXX`, gán tay khoản sai cú pháp, thanh toán tiền mặt & quẹt thẻ POS |
| **Thực đơn 149 món** | `/menu` | Thêm/sửa/xoá 149 món và size; thêm/sửa/xoá nhóm món; **upload ảnh món ăn trực tiếp lên Supabase Storage**; công tắc bật/tắt "còn phục vụ" 1-click |
| **Omakase** | `/omakase` | Quản lý suất Omakase, timeline trình tự món theo phân đoạn, upload ảnh suất, bật/tắt chờ cập nhật |
| **Báo cáo doanh thu** | `/reports` | Báo cáo doanh thu đa chiều theo ngày/tháng, cơ cấu nguồn thu (Omakase vs Alacarte vs Butcher), top 10 món bán chạy, đối soát chốt ca cuối ngày, xuất file Excel CSV |
| **Cấu hình** | `/settings` | Thông tin nhà hàng · thanh toán tự động · **banner chiến dịch & media** · giờ mở cửa theo ca · bàn · ghế quầy 3D · nhân sự (phân quyền 4 vai trò: owner, manager, staff, kitchen) · ngôn ngữ AI |

Mọi đối tượng trong CMS đều thêm, sửa và xoá được.


### Ngôn ngữ

Mini app chạy ba thứ tiếng: Việt, Anh, Nhật. Nội dung nhập trong CMS luôn là
**tiếng Việt** — đó là bản gốc, và không thao tác nào ở đây đụng tới nó.

**Cấu hình › Ngôn ngữ** cho biết còn bao nhiêu mục chưa có bản dịch và có nút
dịch cả loạt bằng AI. Việc chạy thành nhiều lượt, cứ để yên cho tới khi báo
xong.

Từng món và từng suất omakase còn có khối **Bản dịch** ngay trong biểu mẫu
sửa: đọc lại bản máy dịch, sửa chỗ nào sai, hoặc bấm dịch lại riêng mục đó.
Ô nào để trống thì khách xem tiếng Anh hay tiếng Nhật vẫn thấy tiếng Việt của
ô ấy — chưa dịch xong cũng không làm hỏng màn hình nào.

Sửa tên hay mô tả tiếng Việt xong, món đó hiện nhãn **Chưa dịch**: bản dịch
cũ không còn khớp bản gốc nữa. Bấm dịch lại là hết nhãn.

> Máy dịch hay sai nhất ở tên món Nhật. Tên tiếng Nhật được lấy thẳng từ ô
> "Tiếng Nhật" trên menu giấy nên luôn đúng, nhưng phần mô tả và tên tiếng
> Anh thì nên đọc lại một lượt trước khi mở cho khách.

### Xoá mềm và xoá hẳn

Hai việc khác nhau, cố ý tách riêng:

- **Huỷ / tắt hiển thị** — giữ lại dữ liệu, chỉ đổi trạng thái. Dùng cho hầu
  hết trường hợp: món tạm hết, bàn khách báo huỷ, nhân viên nghỉ việc.
- **Xoá hẳn** — biến mất khỏi CSDL. CMS luôn hỏi lại trước khi xoá, và nêu rõ
  cách giữ lại lịch sử nếu đó là điều bạn thực sự muốn.

Dữ liệu đã dùng ở nơi khác thì CSDL sẽ chặn xoá và CMS giải thích lý do —
ví dụ nhóm món còn món bên trong, hoặc bàn đã gắn với đơn cũ.

## Quyền

Đăng nhập được chưa đủ: tài khoản phải có dòng trong bảng `staff`.

| Vai trò | Được làm gì |
|---|---|
| `owner`, `manager` | Toàn quyền, kể cả thực đơn, cấu hình và nhân sự |
| `staff`, `kitchen` | Xử lý đặt bàn và đơn gọi món |

Tài khoản nhân viên được tạo ngay trong CMS (Cấu hình › Nhân sự). Thao tác đó
gọi Edge Function `staff-admin` vì tạo và xoá người dùng cần service_role key —
thứ không bao giờ được nằm trong mã chạy ở trình duyệt. Sửa tên, vai trò và
trạng thái thì ghi thẳng vào bảng qua RLS.

Tài khoản đầu tiên phải tạo bằng dòng lệnh: xem `../supabase/README.md`.

## Triển khai

Build ra tĩnh, đưa lên Vercel / Netlify / Cloudflare Pages.
Nhớ đặt hai biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

Chỉ dùng **anon key**. Service_role key không bao giờ được xuất hiện trong mã
chạy ở trình duyệt.
