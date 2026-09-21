/**
 * Thư viện hỗ trợ in nhiệt (KOT & Hoá đơn) chuẩn khổ 80mm / 58mm
 */

export function printHtml(htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>In Hoá Đơn Miyako</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 8px 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: 80mm;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .divider-solid { border-top: 1px solid #000; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 12px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          th { text-align: left; font-size: 12px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
          td { padding: 4px 0; font-size: 12px; vertical-align: top; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}
