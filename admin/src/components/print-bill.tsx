import { dateTimeLabel, vnd } from "@/lib/format";
import { printHtml } from "@/lib/print";
import type { Order, OrderLine, Settings } from "@/lib/supabase";

type OrderWithLines = Order & { order_lines: OrderLine[] };

/**
 * 1. In phiếu báo bếp (KOT - Kitchen Order Ticket)
 */
export function printKitchenTicket(order: OrderWithLines) {
  const modeLabel =
    order.mode === "takeout"
      ? "MANG VỀ"
      : order.mode === "delivery"
      ? "GIAO HÀNG"
      : order.table_id
      ? `BÀN ${order.table_id}`
      : "ĐẶT TRƯỚC";

  const linesHtml = order.order_lines
    .map(
      (l, idx) => `
      <tr>
        <td style="width: 24px; font-weight: bold;">${idx + 1}.</td>
        <td>
          <div style="font-size: 14px; font-weight: bold;">${l.name}</div>
          ${l.variant_label ? `<div style="font-size: 11px;">[${l.variant_label}]</div>` : ""}
          ${l.note ? `<div style="font-size: 12px; font-weight: bold; color: #d00;">* Ghi chú: ${l.note}</div>` : ""}
        </td>
        <td style="width: 38px; text-align: right; font-size: 15px; font-weight: bold;">
          x${l.qty}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <div class="text-center">
      <div class="text-xl font-bold">PHIẾU BÁO BẾP</div>
      <div class="text-sm">MIYAKO RESTAURANT</div>
    </div>
    <div class="divider"></div>
    <div class="flex text-sm">
      <span>Mã đơn: <b>${order.code}</b></span>
      <span>${dateTimeLabel(order.created_at)}</span>
    </div>
    <div class="flex text-lg font-bold" style="margin-top: 4px;">
      <span>KHU VỰC:</span>
      <span style="color: #000; background: #eee; padding: 0 6px;">${modeLabel}</span>
    </div>
    ${
      order.note
        ? `<div style="margin-top: 6px; padding: 4px; border: 1px solid #000; font-size: 12px; font-weight: bold;">
            Ghi chú tổng: ${order.note}
          </div>`
        : ""
    }
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Món</th>
          <th style="text-align: right;">SL</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="text-center text-xs" style="margin-top: 6px;">
      In lúc: ${dateTimeLabel(new Date().toISOString())}
    </div>
  `;

  printHtml(html);
}

/**
 * 2. In hoá đơn thanh toán / tạm tính cho khách tại bàn
 */
export function printGuestBill(order: OrderWithLines, settings?: Settings | null) {
  const vatRate = settings?.vat_rate ?? 0.08;
  const serviceRate = settings?.service_charge_rate ?? 0.05;

  const subtotal = order.subtotal;
  const serviceCharge = Math.round(subtotal * Number(serviceRate));
  const vat = Math.round((subtotal + serviceCharge) * Number(vatRate));
  const total = subtotal + serviceCharge + vat;

  const linesHtml = order.order_lines
    .map(
      (l) => `
      <tr>
        <td>
          <div style="font-weight: 500;">${l.name}</div>
          ${l.variant_label ? `<div style="font-size: 10px; color: #555;">${l.variant_label}</div>` : ""}
        </td>
        <td style="text-align: center;">${l.qty}</td>
        <td style="text-align: right;">${vnd(l.unit_price)}</td>
        <td style="text-align: right; font-weight: bold;">${vnd(l.unit_price * l.qty)}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <div class="text-center">
      <div class="text-xl font-bold" style="letter-spacing: 2px;">MIYAKO</div>
      <div class="text-xs">Omakase & Wagyu Dining</div>
      <div class="text-xs">${settings?.address || "28 Đào Tấn, Ba Đình, Hà Nội"}</div>
      <div class="text-xs">Hotline: ${settings?.hotline || "090 123 4567"}</div>
    </div>
    <div class="divider-solid"></div>
    <div class="text-center text-sm font-bold">PHIẾU TẠM TÍNH</div>
    <div class="flex text-xs" style="margin-top: 4px;">
      <span>Mã đơn: <b>${order.code}</b></span>
      <span>${dateTimeLabel(order.created_at)}</span>
    </div>
    <div class="flex text-xs">
      <span>Bàn / Khu vực: <b>${order.table_id || "Mang về"}</b></span>
      <span>Thu ngân: Staff</span>
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>Tên món</th>
          <th style="text-align: center;">SL</th>
          <th style="text-align: right;">Đơn giá</th>
          <th style="text-align: right;">T.Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="flex text-xs">
      <span>Tiền món:</span>
      <span>${vnd(subtotal)}</span>
    </div>
    ${
      serviceCharge > 0
        ? `<div class="flex text-xs">
            <span>Phí dịch vụ (${Number(serviceRate) * 100}%):</span>
            <span>${vnd(serviceCharge)}</span>
          </div>`
        : ""
    }
    ${
      vat > 0
        ? `<div class="flex text-xs">
            <span>Thuế VAT (${Number(vatRate) * 100}%):</span>
            <span>${vnd(vat)}</span>
          </div>`
        : ""
    }
    <div class="divider-solid"></div>
    <div class="flex text-lg font-bold">
      <span>TỔNG CỘNG:</span>
      <span>${vnd(total)}</span>
    </div>
    <div class="divider"></div>
    <div class="text-center" style="margin-top: 8px;">
      <div class="text-xs font-bold">Quét VietQR để chuyển khoản</div>
      ${
        settings?.bank_account_number
          ? `<img
              src="https://qr.sepay.vn/img?bank=${settings.bank_code || "Vietcombank"}&acc=${settings.bank_account_number}&template=compact&amount=${total}&des=${order.code}"
              style="width: 140px; height: 140px; margin: 4px auto; display: block;"
              alt="QR Code"
            />
            <div class="text-xs">${settings.bank_account_name || "MIYAKO RESTAURANT"}</div>
            <div class="text-xs font-bold">${settings.bank_code} - ${settings.bank_account_number}</div>`
          : ""
      }
      <div class="text-xs" style="margin-top: 6px; font-style: italic;">
        Xin cảm ơn và hẹn gặp lại Quý khách!
      </div>
    </div>
  `;

  printHtml(html);
}

/**
 * 3. In phiếu giao hàng Butcher (Shipping Label)
 */
export function printDeliveryLabel(order: OrderWithLines) {
  const linesHtml = order.order_lines
    .map(
      (l) => `
      <tr>
        <td>
          <b>${l.name}</b>
          ${l.variant_label ? ` [${l.variant_label}]` : ""}
        </td>
        <td style="text-align: center; font-weight: bold;">x${l.qty}</td>
        <td style="text-align: right;">${vnd(l.unit_price * l.qty)}</td>
      </tr>
    `
    )
    .join("");

  const grandTotal = (order.subtotal || 0) + (order.delivery_fee || 0);

  const html = `
    <div class="text-center">
      <div class="text-lg font-bold">MIYAKO BUTCHER & WAGYU</div>
      <div class="text-xs font-bold">PHIẾU GIAO HÀNG TẬN NƠI</div>
    </div>
    <div class="divider-solid"></div>
    <div class="flex text-sm">
      <span>Mã đơn: <b>${order.code}</b></span>
      <span>${dateTimeLabel(order.created_at)}</span>
    </div>
    <div class="divider"></div>
    <div style="font-size: 13px; line-height: 1.5;">
      <div>Khách nhận: <b style="font-size: 14px;">${order.customer_name || "Khách lẻ"}</b></div>
      <div>Số điện thoại: <b style="font-size: 15px;">${order.customer_phone || "—"}</b></div>
      <div>Địa chỉ: <b style="font-size: 13px;">${order.delivery_address || "Lấy tại quán"}</b></div>
      ${order.delivery_time ? `<div>Giờ hẹn giao: <b>${order.delivery_time}</b></div>` : ""}
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>Sản phẩm / Thịt tươi</th>
          <th style="text-align: center;">SL</th>
          <th style="text-align: right;">T.Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>
    <div class="divider"></div>
    <div class="flex text-xs">
      <span>Tiền hàng:</span>
      <span>${vnd(order.subtotal)}</span>
    </div>
    <div class="flex text-xs">
      <span>Phí vận chuyển:</span>
      <span>${vnd(order.delivery_fee)}</span>
    </div>
    <div class="divider-solid"></div>
    <div class="flex text-base font-bold">
      <span>CẦN THU (COD):</span>
      <span style="font-size: 18px; color: #d00;">
        ${order.payment_status === "paid" ? "ĐÃ THANH TOÁN (0đ)" : vnd(grandTotal)}
      </span>
    </div>
    <div class="flex text-xs" style="margin-top: 4px;">
      <span>Hình thức: ${order.payment_method?.toUpperCase()}</span>
      <span>Trạng thái: ${order.payment_status === "paid" ? "ĐÃ THU TIỀN" : "CHƯA THU TIỀN"}</span>
    </div>
    ${
      order.note
        ? `<div style="margin-top: 6px; padding: 4px; border: 1px dashed #000; font-size: 11px;">
            Ghi chú: ${order.note}
          </div>`
        : ""
    }
  `;

  printHtml(html);
}
