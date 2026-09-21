/**
 * Nguồn sự thật duy nhất cho mọi dữ kiện nhà hàng hiển thị trong app.
 *
 * QUY TẮC: không có ở đây = không được hiển thị ra UI.
 * Ô nào là `null` nghĩa là CHƯA XÁC NHẬN — UI phải tự ẩn phần đó đi,
 * không được đoán, không được lấp bằng chữ chung chung.
 *
 * Xem danh sách còn thiếu ở cuối file.
 */

export interface OpeningHours {
  /** 0 = Chủ nhật … 6 = Thứ bảy */
  weekday: number;
  /** "HH:mm" */
  open: string;
  close: string;
}

export const RESTAURANT = {
  name: "MIYAKO",
  tagline: "The Art of Sushi & Wagyu",
  kanji: "都",
  city: "Hà Nội",

  /** ⚠️ CẦN XÁC NHẬN: số nhà/phường/quận đầy đủ. Lấy từ ghi chú nội bộ trước đó. */
  address: "28 Đào Tấn, Hà Nội",
  addressNeedsConfirm: true,

  hotline: "0965630828",

  /** Mã OA để followOA / openChat. Điền OA ID thật trước khi phát hành. */
  oaId: null as string | null,

  /** Giờ mở cửa — CHƯA XÁC NHẬN. Để null thì UI ẩn khối giờ mở cửa. */
  openingHours: null as OpeningHours[] | null,

  /** Số ghế quầy itamae — đã xác nhận. */
  counterSeats: 12,

  /** Thời gian phản hồi tin nhắn OA — đã xác nhận. */
  inboxResponseMinutes: 1,

  /** Cọc 50% khi đặt bàn — đã xác nhận. */
  depositRate: 0.5,

  /**
   * Suất omakase phải đặt trước ít nhất bao nhiêu giờ — bếp cần thời gian
   * đặt cá. Giá trị thật lấy từ CMS; đây chỉ là mặc định khi chưa tải được
   * cấu hình. Đặt 0 để bỏ ràng buộc.
   */
  omakaseLeadHours: 24,

  /** Cho đặt trước tối đa bao nhiêu ngày — CMS chỉnh được. */
  bookingLeadDays: 30,

  /**
   * Giá trên menu chưa gồm VAT (in rõ trên menu giấy).
   * CHƯA XÁC NHẬN thuế suất và phí phục vụ → app chỉ hiển thị "tạm tính"
   * và ghi chú, tuyệt đối không tự tính một con số VAT.
   */
  priceIncludesVat: false,
  vatRate: null as number | null,
  serviceChargeRate: null as number | null,

  /** Đơn vị giá in trên menu giấy: nghìn đồng. */
  menuPriceUnitNote: "Đơn vị tính: 1.000đ · Giá chưa bao gồm VAT",
} as const;

/**
 * CÁC Ô CÒN THIẾU — cần chủ nhà hàng xác nhận trước khi phát hành:
 *
 * 1. Địa chỉ đầy đủ (số nhà, phường, quận) + link Google Maps
 * 2. Giờ mở cửa từng ngày trong tuần, ngày nghỉ
 * 3. OA ID của Zalo Official Account
 * 4. Thuế suất VAT và phí phục vụ (nếu có)
 * 5. Chính sách huỷ bàn (huỷ trước bao lâu thì hoàn cọc)
 * 6. Số bàn thường / phòng riêng và sức chứa từng phòng
 * 7. Thực đơn chi tiết của Omakase trưa 500k, Set tối 1.000k và 2.000k
 * 8. Menu đồ uống (chưa có trong bộ menu in đã số hoá)
 * 9. Cổng thanh toán cọc: Zalo Mini App Payment (merchant) hay chuyển khoản VietQR
 * 10. Suất omakase cần đặt trước bao nhiêu giờ — đang tạm để 24h, nhà hàng
 *     chỉnh lại trong CMS (Cấu hình → "Omakase phải đặt trước")
 */
