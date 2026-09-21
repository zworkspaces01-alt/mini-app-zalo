import React from "react";

interface Icon3DProps {
  size?: number;
  className?: string;
}

/**
 * ─── 1. ICON 3D: THỰC ĐƠN (3D Bento / Lacquer Menu Box) ───
 */
export function Icon3DMenu({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="menu3d-shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#92400e" floodOpacity="0.28" />
        </filter>
        {/* Gradients cho hộp sơn mài 3D */}
        <linearGradient id="menu3d-top" x1="16" y1="12" x2="48" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="menu3d-left" x1="10" y1="28" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="menu3d-right" x1="32" y1="28" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="menu3d-gold-band" x1="20" y1="22" x2="44" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="40%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="menu3d-chopsticks" x1="12" y1="46" x2="52" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Bóng đổ tiếp xúc mặt sàn */}
      <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" fillOpacity="0.25" />

      {/* Nhóm Hộp 3D Isometric */}
      <g filter="url(#menu3d-shadow)">
        {/* Mặt đáy bên trái */}
        <path d="M12 28L32 40V54L12 42V28Z" fill="url(#menu3d-left)" />
        {/* Mặt đáy bên phải (tối hơn tạo độ sâu) */}
        <path d="M32 40L52 28V42L32 54V40Z" fill="url(#menu3d-right)" />

        {/* Mặt nắp trên cùng */}
        <path d="M32 16L52 28L32 40L12 28L32 16Z" fill="url(#menu3d-top)" />

        {/* Viền sáng bóng nắp (Specular Highlight) */}
        <path d="M32 16.5L51.5 28.2L32 39.5L12.5 28.2L32 16.5Z" stroke="#fde68a" strokeWidth="1" strokeOpacity="0.75" />

        {/* Ruy băng vàng bọc chéo nắp */}
        <path d="M26 19.5L38 26.5L34 32.5L22 25.5Z" fill="url(#menu3d-gold-band)" fillOpacity="0.8" />
        {/* Nơ vàng 3D trên đỉnh */}
        <ellipse cx="30" cy="26" rx="3.5" ry="2.2" fill="#fffbeb" />
        <circle cx="30" cy="26" r="1.5" fill="#d97706" />

        {/* Đôi đũa vàng đặt chéo nắp */}
        <path d="M18 42L48 20" stroke="url(#menu3d-chopsticks)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M21 44L51 22" stroke="url(#menu3d-chopsticks)" strokeWidth="2.4" strokeLinecap="round" />
        {/* Bóng của đũa */}
        <path d="M18 43L48 21" stroke="#451a03" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.3" />
      </g>
    </svg>
  );
}

/**
 * ─── 2. ICON 3D: OMAKASE (3D Golden Cloche & Stars) ───
 */
export function Icon3DOmakase({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="omakase3d-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.35" />
        </filter>
        <radialGradient id="omakase3d-dome" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="25%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="90%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <linearGradient id="omakase3d-tray" x1="12" y1="46" x2="52" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="omakase3d-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      {/* Bóng đổ mặt sàn */}
      <ellipse cx="32" cy="54" rx="21" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#omakase3d-glow)">
        {/* Đĩa bạc mạ vàng bên dưới nắp cloche */}
        <ellipse cx="32" cy="47" rx="22" ry="5.5" fill="url(#omakase3d-tray)" />
        <ellipse cx="32" cy="46" rx="20" ry="4" fill="#fef08a" fillOpacity="0.7" />

        {/* Vòm Cloche 3D úp */}
        <path
          d="M15 45C15 31 22 22 32 22C42 22 49 31 49 45C49 46.5 47 47 32 47C17 47 15 46.5 15 45Z"
          fill="url(#omakase3d-dome)"
        />

        {/* Ánh phản chiếu hình lưỡi liềm trên đỉnh vòm (Glass specular) */}
        <path
          d="M21 40C20 32 25 25 31 24C26 26 23 32 23 40C23 41.5 22 41 21 40Z"
          fill="#ffffff"
          fillOpacity="0.7"
        />

        {/* Tay cầm tròn trên đỉnh nắp cloche */}
        <ellipse cx="32" cy="20" rx="4.5" ry="3.5" fill="url(#omakase3d-tray)" />
        <circle cx="31" cy="19" r="1.4" fill="#ffffff" fillOpacity="0.85" />

        {/* Ngôi sao lấp lánh Omakase VIP góc trên */}
        <path
          d="M48 10L50 15L55 17L50 19L48 24L46 19L41 17L46 15L48 10Z"
          fill="url(#omakase3d-star)"
        />
        <path
          d="M14 18L15 21L18 22L15 23L14 26L13 23L10 22L13 21L14 18Z"
          fill="url(#omakase3d-star)"
        />
      </g>
    </svg>
  );
}

/**
 * ─── 3. ICON 3D: THỊT TƯƠI BUTCHER (3D Wagyu Steak Cut) ───
 */
export function Icon3DButcher({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="wagyu3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#dc2626" floodOpacity="0.3" />
        </filter>
        <linearGradient id="wagyu3d-surface" x1="16" y1="16" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="wagyu3d-side" x1="18" y1="36" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
        <linearGradient id="wagyu3d-fat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff5f5" />
          <stop offset="100%" stopColor="#fecdd3" />
        </linearGradient>
        <linearGradient id="wagyu3d-bone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="55" rx="21" ry="4" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#wagyu3d-shadow)">
        {/* Khối độ dày 3D miếng thịt (Mặt cắt bên dưới) */}
        <path
          d="M13 36C13 46 22 51 34 51C47 51 52 44 52 38V30C52 36 47 43 34 43C22 43 13 38 13 30V36Z"
          fill="url(#wagyu3d-side)"
        />

        {/* Mặt trên miếng bít tết Wagyu vân cẩm thạch */}
        <path
          d="M13 30C13 22 22 17 34 17C46 17 52 23 52 30C52 37 46 43 34 43C22 43 13 37 13 30Z"
          fill="url(#wagyu3d-surface)"
        />

        {/* Viền mỡ ngoài (Fat Cap) bọc rìa trên */}
        <path
          d="M15 28C16 22 23 18 33 18C44 18 50 23 51 28C49 24 43 20 33 20C23 20 17 24 15 28Z"
          fill="url(#wagyu3d-fat)"
          fillOpacity="0.9"
        />

        {/* Các dải vân mỡ cẩm thạch Wagyu A5 uốn lượn 3D */}
        <path
          d="M22 26C25 24 29 27 32 25M35 28C38 27 41 29 44 27M20 32C24 30 27 34 32 32M33 35C37 34 40 36 45 33M24 37C28 36 30 38 33 37"
          stroke="url(#wagyu3d-fat)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Đốm mỡ li ti vân cẩm thạch */}
        <circle cx="28" cy="22" r="1.2" fill="#fff5f5" fillOpacity="0.9" />
        <circle cx="38" cy="23" r="1.1" fill="#fff5f5" fillOpacity="0.9" />
        <circle cx="25" cy="35" r="1" fill="#fff5f5" fillOpacity="0.9" />
        <circle cx="41" cy="31" r="1.2" fill="#fff5f5" fillOpacity="0.9" />

        {/* Khúc xương nhỏ hoặc con dấu vàng A5 */}
        <g transform="translate(42, 14)">
          <circle cx="6" cy="6" r="6" fill="url(#wagyu3d-bone)" />
          <path d="M4 6L5.5 8L8 4" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

/**
 * ─── 4. ICON 3D: ĐẶT BÀN VIP (3D Isometric Calendar & Pin) ───
 */
export function Icon3DBooking({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="booking3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#2563eb" floodOpacity="0.25" />
        </filter>
        <linearGradient id="book3d-header" x1="14" y1="16" x2="50" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="book3d-body" x1="14" y1="28" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="book3d-side" x1="12" y1="46" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="book3d-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="55" rx="19" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#booking3d-shadow)">
        {/* Khối đế dày 3D của cuốn lịch */}
        <path d="M14 48L14 52C14 54 16 55 18 55H46C48 55 50 54 50 52V48H14Z" fill="url(#book3d-side)" />

        {/* Thân lịch trắng bo góc */}
        <rect x="14" y="26" width="36" height="23" rx="3" fill="url(#book3d-body)" />

        {/* Thanh tiêu đề lịch màu xanh dương 3D */}
        <path d="M14 18C14 16 16 15 18 15H46C48 15 50 16 50 18V26H14V18Z" fill="url(#book3d-header)" />

        {/* Ánh phản chiếu trên thanh xanh */}
        <line x1="16" y1="17" x2="48" y2="17" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />

        {/* Các móc khuyên xoắn lò xo 3D */}
        <rect x="20" y="12" width="3.5" height="7" rx="1.75" fill="url(#book3d-ring)" />
        <rect x="30" y="12" width="3.5" height="7" rx="1.75" fill="url(#book3d-ring)" />
        <rect x="40" y="12" width="3.5" height="7" rx="1.75" fill="url(#book3d-ring)" />

        {/* Số ngày "VIP" / Huy hiệu bàn tiệc */}
        <circle cx="32" cy="37" r="7" fill="#eff6ff" />
        <path
          d="M29 37L31.5 39.5L36 34"
          stroke="#2563eb"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ngôi sao VIP nổi trên góc lịch */}
        <path
          d="M45 28L46.5 32L51 32.5L47.5 35.5L48.5 40L45 37.5L41.5 40L42.5 35.5L39 32.5L43.5 32L45 28Z"
          fill="#fbbf24"
        />
      </g>
    </svg>
  );
}

/**
 * ─── 5. ICON 3D: GIAO TẬN NƠI (3D Delivery Scooter & Thermal Box) ───
 */
export function Icon3DDelivery({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="deliv3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#059669" floodOpacity="0.25" />
        </filter>
        <linearGradient id="deliv3d-box" x1="14" y1="20" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="deliv3d-wheel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="deliv3d-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="deliv3d-speed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="33" cy="54" rx="20" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#deliv3d-shadow)">
        {/* Vệt tốc độ gió phía sau */}
        <line x1="6" y1="24" x2="14" y2="24" stroke="url(#deliv3d-speed)" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="29" x2="16" y2="29" stroke="url(#deliv3d-speed)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="34" x2="15" y2="34" stroke="url(#deliv3d-speed)" strokeWidth="2" strokeLinecap="round" />

        {/* Thùng giữ nhiệt đồ ăn Nhật 3D phía sau */}
        <rect x="15" y="20" width="18" height="17" rx="3.5" fill="url(#deliv3d-box)" />
        {/* Viền phản quang nắp thùng */}
        <rect x="15" y="20" width="18" height="4" rx="1.5" fill="#34d399" />
        {/* Logo Miyako / chữ trắng trên thùng */}
        <circle cx="24" cy="29" r="3.5" fill="#ffffff" fillOpacity="0.9" />
        <circle cx="24" cy="29" r="2" fill="#059669" />

        {/* Khung thân xe máy điện giao hàng */}
        <path
          d="M28 36L37 36L44 26H49"
          stroke="#f8fafc"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Đèn pha phía trước */}
        <circle cx="49" cy="26" r="3" fill="#fbbf24" />
        <ellipse cx="49" cy="26" rx="2" ry="1.5" fill="#fffbeb" />

        {/* Bánh xe sau 3D */}
        <circle cx="21" cy="46" r="7.5" fill="url(#deliv3d-wheel)" />
        <circle cx="21" cy="46" r="4.2" fill="url(#deliv3d-rim)" />
        <circle cx="21" cy="46" r="1.8" fill="#334155" />

        {/* Bánh xe trước 3D */}
        <circle cx="45" cy="46" r="7.5" fill="url(#deliv3d-wheel)" />
        <circle cx="45" cy="46" r="4.2" fill="url(#deliv3d-rim)" />
        <circle cx="45" cy="46" r="1.8" fill="#334155" />
      </g>
    </svg>
  );
}

/**
 * ─── 6. ICON 3D: HỘP QUÀ TẶNG (3D Luxury Gift Box & Silk Bow) ───
 */
export function Icon3DGift({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="gift3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#9333ea" floodOpacity="0.28" />
        </filter>
        <linearGradient id="gift3d-body" x1="16" y1="28" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id="gift3d-lid" x1="13" y1="20" x2="51" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
        <linearGradient id="gift3d-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="54" rx="19" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#gift3d-shadow)">
        {/* Thân hộp quà 3D */}
        <rect x="16" y="27" width="32" height="23" rx="3" fill="url(#gift3d-body)" />

        {/* Ruy băng vàng chạy dọc thân hộp */}
        <rect x="29" y="27" width="6" height="23" fill="url(#gift3d-ribbon)" />

        {/* Nắp hộp quà nhô ra hai bên tạo góc nhìn 3D */}
        <rect x="13" y="21" width="38" height="9" rx="2.5" fill="url(#gift3d-lid)" />
        {/* Ruy băng ngang nắp */}
        <rect x="29" y="21" width="6" height="9" fill="url(#gift3d-ribbon)" />

        {/* Nơ vàng 3D căng phồng */}
        <g transform="translate(32, 18)">
          {/* Cánh nơ trái */}
          <path
            d="M0 0C-4 -6 -11 -6 -10 0C-9 4 -3 1 0 0Z"
            fill="url(#gift3d-ribbon)"
          />
          {/* Cánh nơ phải */}
          <path
            d="M0 0C4 -6 11 -6 10 0C9 4 3 1 0 0Z"
            fill="url(#gift3d-ribbon)"
          />
          {/* Tâm nơ tròn nhô lên */}
          <circle cx="0" cy="0" r="2.8" fill="#fef08a" />
          <circle cx="0" cy="0" r="1.6" fill="#a16207" />
        </g>
      </g>
    </svg>
  );
}

/**
 * ─── 7. ICON 3D: YÊU THÍCH (3D Volumetric Glossy Ruby Heart) ───
 */
export function Icon3DFavorite({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="heart3d-glow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.35" />
        </filter>
        <radialGradient id="heart3d-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="30%" stopColor="#f43f5e" />
          <stop offset="70%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="54" rx="16" ry="3.5" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#heart3d-glow)">
        {/* Trái tim 3D căng mọng */}
        <path
          d="M32 49C32 49 14 38 14 25C14 18 19 13 25 13C29 13 31 16 32 17C33 16 35 13 39 13C45 13 50 18 50 25C50 38 32 49 32 49Z"
          fill="url(#heart3d-grad)"
        />

        {/* Ánh phản chiếu cong hình trăng khuyết ở gò tim trái (Specular reflection) */}
        <path
          d="M21 16C17 18 16 23 16 27C16 25 18 19 23 17C24 16.5 22 15.8 21 16Z"
          fill="#ffffff"
          fillOpacity="0.75"
        />

        {/* Điểm sáng tròn phụ trên bầu tim phải */}
        <circle cx="41" cy="20" r="2.2" fill="#ffffff" fillOpacity="0.65" />

        {/* Tia sáng nhỏ lấp lánh cạnh tim */}
        <path
          d="M48 12L49 14.5L51.5 15.5L49 16.5L48 19L47 16.5L44.5 15.5L47 14.5L48 12Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}

/**
 * ─── 8. ICON 3D: HOTLINE VIP (3D Golden Telephone & Soundwaves) ───
 */
export function Icon3DHotline({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="phone3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#0891b2" floodOpacity="0.25" />
        </filter>
        <linearGradient id="phone3d-tube" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="phone3d-ear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="phone3d-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="54" rx="18" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#phone3d-shadow)">
        {/* Ống nghe điện thoại cổ điển 3D uốn cong mềm mại */}
        <g transform="rotate(-25 32 32)">
          {/* Loa nghe trên */}
          <ellipse cx="22" cy="18" rx="8" ry="5" fill="url(#phone3d-ear)" />
          <ellipse cx="22" cy="18" rx="5.5" ry="3" fill="#0369a1" />

          {/* Cán cầm tay uốn cong 3D */}
          <path
            d="M22 22C24 28 26 36 22 42"
            stroke="url(#phone3d-tube)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Vạch sáng viền tay cầm */}
          <path
            d="M21 24C22.5 28.5 23.5 35 21 40"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />

          {/* Ống nói dưới */}
          <ellipse cx="22" cy="46" rx="8" ry="5" fill="url(#phone3d-ear)" />
          <ellipse cx="22" cy="46" rx="5.5" ry="3" fill="#0369a1" />
        </g>

        {/* Các vòng sóng âm VIP phát ra */}
        <path
          d="M44 23C47 26 47 36 44 39"
          stroke="url(#phone3d-gold)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M50 18C55 23 55 40 50 45"
          stroke="url(#phone3d-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
      </g>
    </svg>
  );
}

/**
 * ─── 9. ICON 3D: NGỌN LỬA / BÁN CHẠY (3D Fire Flame) ───
 */
export function Icon3DFire({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="fire3d-outer" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </radialGradient>
        <radialGradient id="fire3d-inner" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
      </defs>
      {/* Cánh lửa ngoài 3D */}
      <path
        d="M16 2C16 2 20 8 20 12C20 13.5 19.5 14.8 18.7 15.8C20.8 15 23 16.5 24 19C25.5 22.8 23 27.5 18 29.5C11 32.3 5 26.5 6 19.5C6.5 15.5 9 12 12 9C12 11.5 13.5 13.5 15 14C15 9 16 2 16 2Z"
        fill="url(#fire3d-outer)"
      />
      {/* Lõi lửa vàng sáng 3D bên trong */}
      <path
        d="M16 16C16 16 18 19 18 21C18 23.2 16.2 25 14 25C11.8 25 10 23.2 10 21C10 18.5 12.5 16 14 15C14.5 16.2 15.2 16.5 16 16Z"
        fill="url(#fire3d-inner)"
      />
      {/* Tia sáng phản quang */}
      <circle cx="17" cy="7" r="1" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
}

/**
 * ─── 10. ICON 3D: SASHIMI & SUSHI (3D Nigiri Salmon) ───
 */
export function Icon3DSushi({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sushi3d-salmon" x1="4" y1="10" x2="28" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="sushi3d-rice" x1="6" y1="18" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      {/* Vắt cơm trắng 3D */}
      <rect x="7" y="17" width="18" height="9" rx="4.5" fill="url(#sushi3d-rice)" />
      {/* Lát cá hồi cam tươi 3D */}
      <path
        d="M5 16C5 12 9 9 16 9C23 9 27 12 27 16C27 19 23 20 16 20C9 20 5 19 5 16Z"
        fill="url(#sushi3d-salmon)"
      />
      {/* Vân trắng cá hồi */}
      <path d="M10 11C11 13 11 17 10 18" stroke="#ffedd5" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M15 10C16 13 16 17 15 19" stroke="#ffedd5" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M20 11C21 13 21 17 20 18" stroke="#ffedd5" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
      {/* Đai rong biển Nori 3D thắt ngang */}
      <rect x="14" y="9" width="4" height="17" rx="1.5" fill="#1e293b" />
      <line x1="15" y1="10" x2="15" y2="25" stroke="#475569" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * ─── 11. ICON 3D: KHỐI THỊT WAGYU (3D Meat Slab) ───
 */
export function Icon3DMeat({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="meat3d-top" x1="6" y1="8" x2="26" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="meat3d-side" x1="6" y1="18" x2="26" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
      </defs>
      {/* Độ dày 3D */}
      <path d="M6 18C6 23 11 26 17 26C23 26 26 23 26 18V14C26 19 23 22 17 22C11 22 6 19 6 14V18Z" fill="url(#meat3d-side)" />
      {/* Mặt cắt trên */}
      <ellipse cx="16" cy="14" rx="10" ry="6" fill="url(#meat3d-top)" />
      {/* Lớp mỡ trắng ngà */}
      <path d="M8 12C9 10 13 9 17 9C21 9 24 10 25 12C24 10.5 21 10 17 10C13 10 9 10.5 8 12Z" fill="#fff5f5" fillOpacity="0.85" />
      {/* Vân mỡ cẩm thạch */}
      <path d="M12 13C14 12 16 15 18 14M14 16C16 15 18 17 20 16" stroke="#fff5f5" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8" />
    </svg>
  );
}

/**
 * ─── 12. ICON 3D: NỒI LẨU NABE (3D Hotpot) ───
 */
export function Icon3DHotpot({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="pot3d-body" x1="6" y1="15" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="pot3d-soup" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      {/* Làn khói 3D bốc lên */}
      <path d="M12 8C11 6 13 4 12 2" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M16 9C15 6 17 4 16 3" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M20 8C19 6 21 4 20 2" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
      {/* Thân nồi gang 3D */}
      <path d="M5 16C5 24 10 27 16 27C22 27 27 24 27 16C27 14 5 14 5 16Z" fill="url(#pot3d-body)" />
      {/* Quai nồi hai bên */}
      <path d="M3 15C3 12 6 12 6 15" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29 15C29 12 26 12 26 15" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
      {/* Mặt nước dùng sôi vàng óng */}
      <ellipse cx="16" cy="15" rx="10.5" ry="4.5" fill="url(#pot3d-soup)" />
      {/* Lát nấm / rau củ nổi */}
      <circle cx="13" cy="15" r="1.5" fill="#fef08a" />
      <circle cx="18" cy="16" r="1.2" fill="#22c55e" />
    </svg>
  );
}

/**
 * ─── 13. ICON 3D: HỘP MANG VỀ (3D Takeaway Bento Box) ───
 */
export function Icon3DTakeaway({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="take3d-box" x1="6" y1="12" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Thân hộp quà/bento 3D */}
      <rect x="6" y="14" width="20" height="13" rx="2.5" fill="url(#take3d-box)" />
      {/* Nắp hộp nhô ra */}
      <rect x="4" y="10" width="24" height="6" rx="2" fill="#fbbf24" />
      {/* Ruy băng đỏ thắt */}
      <rect x="14" y="10" width="4" height="17" fill="#dc2626" />
      {/* Nơ đỏ 3D trên đỉnh */}
      <ellipse cx="13" cy="9" rx="2.5" ry="1.5" fill="#ef4444" />
      <ellipse cx="19" cy="9" rx="2.5" ry="1.5" fill="#ef4444" />
      <circle cx="16" cy="9" r="1.2" fill="#b91c1c" />
    </svg>
  );
}

/**
 * ─── 14. ICON 3D: NGÔI SAO VÀNG RATING (3D Gold Star) ───
 */
export function Icon3DStar({ size = 14, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="star3d-gold" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="80%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      {/* Cánh sao 3D có độ vát và bóng */}
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill="url(#star3d-gold)"
      />
      {/* Mặt vát sáng phản chiếu nửa bên trái */}
      <path
        d="M12 2L8.91 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77V2Z"
        fill="#ffffff"
        fillOpacity="0.35"
      />
    </svg>
  );
}

/**
 * ─── 15. ICON 3D: KHIÊN BẢO CHỨNG 100% (3D Gold Shield) ───
 */
export function Icon3DShield({ size = 26, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="shield3d-gold" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path
        d="M16 3L6 7V15C6 22 10.5 27.5 16 29C21.5 27.5 26 22 26 15V7L16 3Z"
        fill="url(#shield3d-gold)"
      />
      {/* Vát sáng 3D nửa trái */}
      <path
        d="M16 3L6 7V15C6 22 10.5 27.5 16 29V3Z"
        fill="#ffffff"
        fillOpacity="0.25"
      />
      {/* Dấu tích trắng ngọc 3D */}
      <path
        d="M11 15L14.5 18.5L21 12"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ─── 16. ICON 3D: BÔNG TUYẾT GIỮ LẠNH (3D Ice Snowflake) ───
 */
export function Icon3DSnowflake({ size = 26, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="snow3d-ice" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#bae6fd" />
          <stop offset="80%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#snow3d-ice)" />
      {/* Tinh thể tuyết 3D */}
      <path d="M16 6V26M6 16H26" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 9L23 23M23 9L9 23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      {/* Điểm sáng trung tâm */}
      <circle cx="16" cy="16" r="3" fill="#ffffff" />
    </svg>
  );
}

/**
 * ─── 17. ICON 3D: TIA CHỚP TỐC HÀNH 45P (3D Lightning Speed) ───
 */
export function Icon3DLightning({ size = 26, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="lightn3d-grad" x1="8" y1="2" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="30%" stopColor="#fde047" />
          <stop offset="70%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      {/* Tia chớp vàng 3D */}
      <path
        d="M18 2L7 16H16L14 30L25 15H16L18 2Z"
        fill="url(#lightn3d-grad)"
      />
      {/* Cạnh vát bóng sáng */}
      <path
        d="M18 2L7 16H16L15 22L18 2Z"
        fill="#ffffff"
        fillOpacity="0.45"
      />
    </svg>
  );
}

/**
 * ─── 18. ICON 3D: GHIM BẢN ĐỒ (3D Map Pin) ───
 */
export function Icon3DMapPin({ size = 18, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="pin3d-head" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
      </defs>
      <ellipse cx="12" cy="21" rx="5" ry="1.8" fill="#000000" fillOpacity="0.25" />
      <path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 21 12 21C12 21 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill="url(#pin3d-head)"
      />
      <circle cx="12" cy="9" r="3.2" fill="#ffffff" />
      <circle cx="11.5" cy="8.5" r="1.2" fill="#ef4444" />
    </svg>
  );
}

/**
 * ─── 19. ICON 3D: TIN NHẮN CHAT (3D Chat Bubble) ───
 */
export function Icon3DChat({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="chat3d-grad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <path
        d="M14 4C8.48 4 4 8.03 4 13C4 15.8 5.4 18.27 7.6 19.86L6.5 24L11.2 21.8C12.1 22.06 13.04 22.2 14 22.2C19.52 22.2 24 18.17 24 13.2C24 8.03 19.52 4 14 4Z"
        fill="url(#chat3d-grad)"
      />
      {/* 3 chấm hội thoại 3D */}
      <circle cx="9.5" cy="13" r="1.6" fill="#ffffff" />
      <circle cx="14" cy="13" r="1.6" fill="#ffffff" />
      <circle cx="18.5" cy="13" r="1.6" fill="#ffffff" />
    </svg>
  );
}

/**
 * ─── 20. ICON 3D: ĐỊA CẦU / NGÔN NGỮ (3D Globe) ───
 */
export function Icon3DGlobe({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="globe3d-sphere" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="14" r="11" fill="url(#globe3d-sphere)" />
      {/* Kinh tuyến vĩ tuyến 3D */}
      <ellipse cx="14" cy="14" rx="6" ry="11" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.75" />
      <line x1="3" y1="14" x2="25" y2="14" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.75" />
      <line x1="5" y1="8.5" x2="23" y2="8.5" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.6" />
      <line x1="5" y1="19.5" x2="23" y2="19.5" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.6" />
    </svg>
  );
}

/**
 * ─── 21. ICON 3D: GIAO DIỆN THEME (3D Sun & Moon Palette) ───
 */
export function Icon3DTheme({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="theme3d-half" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="theme3d-dark" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
      </defs>
      {/* Nửa mặt trời sáng */}
      <path d="M14 3C7.92 3 3 7.92 3 14C3 20.08 7.92 25 14 25V3Z" fill="url(#theme3d-half)" />
      {/* Nửa vầng trăng tối */}
      <path d="M14 3V25C20.08 25 25 20.08 25 14C25 7.92 20.08 3 14 3Z" fill="url(#theme3d-dark)" />
      {/* Ngôi sao nhỏ nửa đêm */}
      <circle cx="19" cy="10" r="1.2" fill="#fef08a" />
      <circle cx="18" cy="18" r="1" fill="#fef08a" />
      {/* Vòng viền chia đôi 3D */}
      <circle cx="14" cy="14" r="11" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
  );
}

/**
 * ─── 22. ICON 3D: GIỚI THIỆU ABOUT (3D Jade Info Badge) ───
 */
export function Icon3DInfo({ size = 20, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="info3d-jade" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="14" r="11" fill="url(#info3d-jade)" />
      <circle cx="14" cy="9.5" r="1.8" fill="#ffffff" />
      <rect x="12.4" y="13" width="3.2" height="7.5" rx="1.6" fill="#ffffff" />
    </svg>
  );
}

/**
 * ─── 23. ICON 3D: TÍCH ĐIỂM (3D VIP Gold Coins & Crown) ───
 */
export function Icon3DPoints({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="points3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#f59e0b" floodOpacity="0.32" />
        </filter>
        <linearGradient id="coin3d-face" x1="14" y1="12" x2="50" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="coin3d-side" x1="14" y1="36" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="coin3d-back" x1="12" y1="20" x2="40" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="55" rx="20" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#points3d-shadow)">
        {/* Đồng xu phụ phía sau bên trái */}
        <g transform="translate(-4, 3)">
          <path d="M12 36C12 43 18 47 27 47C36 47 42 43 42 36V30C42 37 36 41 27 41C18 41 12 37 12 30V36Z" fill="url(#coin3d-side)" />
          <ellipse cx="27" cy="30" rx="15" ry="11" fill="url(#coin3d-back)" />
        </g>

        {/* Đồng xu chính nổi bật phía trước */}
        {/* Độ dày 3D đồng xu */}
        <path
          d="M17 38C17 46 24 51 35 51C46 51 53 46 53 38V30C53 38 46 43 35 43C24 43 17 38 17 30V38Z"
          fill="url(#coin3d-side)"
        />

        {/* Mặt trên đồng xu vàng 3D */}
        <ellipse cx="35" cy="30" rx="18" ry="13" fill="url(#coin3d-face)" />

        {/* Vòng viền dập nổi trong đồng xu */}
        <ellipse cx="35" cy="30" rx="15" ry="10.5" stroke="#fde68a" strokeWidth="1.2" strokeDasharray="3 2" />

        {/* Ngôi sao / Vương miện VIP 3D chính giữa đồng xu */}
        <path
          d="M35 22L37.5 27L43 27.5L39 31L40.2 36.5L35 33.5L29.8 36.5L31 31L27 27.5L32.5 27L35 22Z"
          fill="#ffffff"
        />

        {/* Điểm lấp lánh vàng xung quanh */}
        <path d="M16 16L17.5 19.5L21 21L17.5 22.5L16 26L14.5 22.5L11 21L14.5 19.5L16 16Z" fill="#fbbf24" />
        <circle cx="50" cy="18" r="1.5" fill="#fde68a" />
      </g>
    </svg>
  );
}

/**
 * ─── 24. ICON 3D: VOUCHER (3D Luxury Discount Coupon) ───
 */
export function Icon3DVoucher({ size = 44, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="voucher3d-shadow" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#e11d48" floodOpacity="0.28" />
        </filter>
        <linearGradient id="vouch3d-body" x1="12" y1="18" x2="52" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="35%" stopColor="#f43f5e" />
          <stop offset="75%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="vouch3d-side" x1="14" y1="42" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#881337" />
          <stop offset="100%" stopColor="#4c0519" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="32" cy="55" rx="19" ry="3.8" fill="#000000" fillOpacity="0.25" />

      <g filter="url(#voucher3d-shadow)">
        {/* Khối dày 3D của vé voucher */}
        <path
          d="M13 42L13 46C13 48 15 49 17 49H47C49 49 51 48 51 46V42H13Z"
          fill="url(#vouch3d-side)"
        />

        {/* Thân thẻ voucher 3D góc nghiêng */}
        <g transform="rotate(-6 32 32)">
          {/* Tấm vé chính */}
          <path
            d="M12 20C12 18 14 16 16 16H48C50 16 52 18 52 20V29C49.5 29 47.5 31 47.5 33.5C47.5 36 49.5 38 52 38V44C52 46 50 48 48 48H16C14 48 12 46 12 44V38C14.5 38 16.5 36 16.5 33.5C16.5 31 14.5 29 12 29V20Z"
            fill="url(#vouch3d-body)"
          />

          {/* Viền sáng trên cùng */}
          <path
            d="M16 16.5H48"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />

          {/* Đường xé vé răng cưa đứt nét */}
          <line
            x1="26"
            y1="18"
            x2="26"
            y2="46"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeDasharray="2.5 2.5"
            strokeOpacity="0.6"
          />

          {/* Biểu tượng phần trăm % vàng 3D nổi bật */}
          <g transform="translate(33, 24)">
            {/* Vòng tròn % trên */}
            <circle cx="4" cy="4" r="2.4" stroke="#fef08a" strokeWidth="1.5" />
            {/* Gạch chéo */}
            <line x1="12" y1="3" x2="3" y2="15" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            {/* Vòng tròn % dưới */}
            <circle cx="11" cy="14" r="2.4" stroke="#fef08a" strokeWidth="1.5" />
          </g>

          {/* Huy hiệu SALE / Ngôi sao nhỏ bên trái */}
          <circle cx="19" cy="33.5" r="3" fill="#fef08a" />
          <path d="M19 31.5L19.8 33L21.5 33.2L20.2 34.3L20.6 36L19 35L17.4 36L17.8 34.3L16.5 33.2L18.2 33L19 31.5Z" fill="#b45309" />
        </g>
      </g>
    </svg>
  );
}

/**
 * ─── 24. ICON 3D: DAO BẾP CẮT THỊT NHẬT BẢN HOCHOU (3D Japanese Chef Knife) ───
 */
export function Icon3DKnife({ size = 32, className = "" }: Icon3DProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="knife3d-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.25" />
        </filter>
        {/* Lưỡi thép rèn Nhật Bản */}
        <linearGradient id="knife3d-blade" x1="16" y1="6" x2="38" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#f1f5f9" />
          <stop offset="65%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        {/* Cạnh vát sắc bén */}
        <linearGradient id="knife3d-edge" x1="18" y1="20" x2="38" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        {/* Cán gỗ Rosewood */}
        <linearGradient id="knife3d-handle" x1="6" y1="34" x2="16" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        {/* Khâu dao bằng đồng thau */}
        <linearGradient id="knife3d-bolster" x1="14" y1="26" x2="18" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
      </defs>

      {/* Bóng sàn */}
      <ellipse cx="23" cy="40" rx="14" ry="2.5" fill="#000000" fillOpacity="0.18" />

      <g filter="url(#knife3d-shadow)">
        {/* Thân lưỡi dao Santoku */}
        <path
          d="M17 25L37 7C40 9 42 14 39 19L20 31L17 25Z"
          fill="url(#knife3d-blade)"
        />
        {/* Mép vát cắt bén bóng loáng */}
        <path
          d="M20 31L39 19C41 23 37 27 33 28L18 31.5L20 31Z"
          fill="url(#knife3d-edge)"
        />
        {/* Sống dao ánh sáng kim loại */}
        <path d="M18 24.5L36.5 6.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.95" />
        
        {/* Khâu nối dao đồng vàng */}
        <rect x="14" y="24" width="4.5" height="8.5" rx="1.5" transform="rotate(-38 14 24)" fill="url(#knife3d-bolster)" />
        
        {/* Cán dao gỗ mộc cầm tay */}
        <rect x="8" y="28.5" width="7" height="15" rx="3" transform="rotate(-38 8 28.5)" fill="url(#knife3d-handle)" />
        
        {/* 2 đinh tán đồng trên cán */}
        <circle cx="11" cy="35" r="1.1" fill="#fef08a" />
        <circle cx="7" cy="40" r="1.1" fill="#fef08a" />
      </g>
    </svg>
  );
}



