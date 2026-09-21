/**
 * Ngân hàng SePay hỗ trợ đối soát.
 *
 * `short_name` chính là giá trị truyền vào tham số `bank` khi tạo ảnh QR.
 * Danh sách gốc: https://qr.sepay.vn/banks.json
 */
export const SEPAY_BANKS = [
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Agribank",
  "Techcombank",
  "MBBank",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "VIB",
  "HDBank",
  "MSB",
  "SeABank",
  "OCB",
  "Eximbank",
  "BacABank",
  "ABBANK",
  "LienVietPostBank",
  "VietCapitalBank",
  "KienLongBank",
  "ShinhanBank",
  "PublicBank",
] as const;

/** Ảnh VietQR động của SePay — quét là điền sẵn số tiền và nội dung. */
export function sepayQrUrl(input: {
  account: string;
  bank: string;
  amount: number;
  description: string;
}): string {
  const p = new URLSearchParams({
    acc: input.account,
    bank: input.bank,
    amount: String(Math.round(input.amount)),
    des: input.description,
  });
  return `https://qr.sepay.vn/img?${p.toString()}`;
}
