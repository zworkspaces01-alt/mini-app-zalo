/**
 * Tiếng Việt — bản gốc.
 *
 * Đây là từ điển chuẩn: `en.ts` và `ja.ts` phải khớp đúng hình dạng, thiếu
 * khoá nào TypeScript báo ngay. Chuỗi có biến thì viết thành hàm, không ghép
 * chuỗi ở chỗ gọi — mỗi thứ tiếng đặt biến ở một vị trí khác nhau trong câu.
 */
export const vi = {
  /* ─────────────── Chung ─────────────── */
  common: {
    loading: "Đang tải",
    close: "Đóng",
    back: "Quay lại",
    all: "Tất cả",
    from: "từ",
    decrease: "Giảm",
    increase: "Tăng",
    guests: (n: number) => `${n} khách`,
    dishes: (n: number) => `${n} món`,
    perGuest: "/ khách",
    perGuestPrice: (price: string) => `${price}/khách`,
    contact: "Liên hệ",
    contactJp: "ご案内",
  },

  /* ─────────────── Điều hướng ─────────────── */
  nav: {
    label: "Điều hướng chính",
    home: "Trang chủ",
    omakase: "Omakase",
    menu: "Thực đơn",
    booking: "Đặt bàn",
    profile: "Cá nhân",
  },

  /* ─────────────── Ngôn ngữ ─────────────── */
  lang: {
    title: "Ngôn ngữ",
    switch: "Đổi ngôn ngữ",
  },

  /* ─────────────── Nhãn món ─────────────── */
  badge: {
    signature: "Signature",
    "best-seller": "Best seller",
    "must-try": "Must try",
  },

  /* ─────────────── Ca phục vụ ─────────────── */
  service: {
    lunch: "Trưa",
    dinner: "Tối",
    both: "Trưa & tối",
    lunchLong: "Phục vụ trưa",
    dinnerLong: "Phục vụ tối",
    bothLong: "Phục vụ cả trưa và tối",
  },

  /* ─────────────── Chỗ ngồi ─────────────── */
  seating: {
    counter: "Quầy itamae",
    table: "Bàn khu chung",
    private: "Phòng riêng",
  },

  /* ─────────────── Trạng thái đặt bàn ─────────────── */
  status: {
    pending: "Chờ xác nhận",
    "awaiting-deposit": "Chờ đặt cọc",
    confirmed: "Đã xác nhận",
    cancelled: "Đã huỷ",
    completed: "Đã dùng bữa",
  },

  /* ─────────────── Trang chủ ─────────────── */
  home: {
    spaceAlt: "Không gian nhà hàng Miyako",
    tagline: (city: string, seats: number) =>
      `Omakase và wagyu A5 tại ${city}. Quầy itamae ${seats} ghế.`,
    atTable: (table: string) => `Bạn đang ở bàn ${table}`,
    atTableHint: "Gọi món trực tiếp, bếp nhận ngay",
    book: "Đặt bàn",
    order: "Gọi món",
    omakaseJp: "おまかせ",
    omakaseBlurb:
      "Bếp trưởng chọn nguyên liệu theo ngày. Thực đơn đi theo một trình tự cố định, khách ngồi quầy và dùng từng món ngay khi vừa hoàn thiện.",
    bestSellersJp: "人気",
    bestSellers: "Khách gọi nhiều",
    signaturesJp: "特選",
    signatures: "Món đặc trưng của Miyako",
    callToBook: "Gọi đặt bàn",
    messageRestaurant: "Nhắn tin cho nhà hàng",
    replyWithin: (minutes: number) => `Trả lời trong ${minutes} phút`,
  },

  /* ─────────────── Thực đơn ─────────────── */
  menu: {
    jp: "お品書き",
    title: "Thực đơn",
    searchPlaceholder: "Tìm món, ví dụ: otoro, wagyu, ramen",
    searchOpen: "Tìm món",
    searchClose: "Đóng tìm kiếm",
    scanTable: "Quét QR tại bàn",
    orderingAtTable: (table: string) => `Đang gọi món tại bàn ${table}`,
    clearTable: "Bỏ",
    results: (n: number, query: string) => `${n} kết quả cho “${query}”`,
    emptyTitle: "Không tìm thấy món nào",
    emptyHint: "Thử từ khoá khác, hoặc chọn theo nhóm món.",
  },

  /* ─────────────── Món ─────────────── */
  dish: {
    add: (name: string) => `Thêm ${name}`,
    added: (qty: number, name: string) => `Đã thêm ${qty} × ${name}`,
    addWithPrice: (price: string) => `Thêm · ${price}`,
    save: "Lưu món",
    unsave: "Bỏ lưu món",
    includes: "Gồm",
    gifts: "Set tặng kèm",
    pickVariant: "Chọn phần",
    kitchenNote: "Ghi chú cho bếp",
    kitchenNotePlaceholder: "Ví dụ: không wasabi, ít muối, dị ứng hải sản…",
  },

  /* ─────────────── Giỏ món ─────────────── */
  cart: {
    title: "Giỏ món",
    view: "Xem giỏ món",
    clear: "Xoá hết",
    emptyTitle: "Chưa chọn món nào",
    emptyHint: "Mở thực đơn và thêm món bạn muốn dùng.",
    openMenu: "Xem thực đơn",
    sendToKitchen: (table: string) => `Gửi thẳng xuống bếp cho bàn ${table}`,
    attachToReservation: "Đặt trước cho bàn",
    kitchenNote: "Ghi chú cho bếp",
    kitchenNotePlaceholder: "Ví dụ: ra món lần lượt, không dùng wasabi",
    subtotal: "Tạm tính",
    priceNote: (menuNote: string) =>
      `${menuNote}. Số tiền trên chưa gồm VAT và phí phục vụ nếu có — hoá đơn cuối cùng tính tại nhà hàng.`,
    submitDineIn: "Gửi đơn xuống bếp",
    submitPreOrder: "Lưu đơn đặt trước",
    submitTakeout: "Đặt lấy tại quán",
    submitDelivery: "Đặt giao hàng tận nơi",
    sentDineIn: (code: string) => `Đã gửi đơn ${code} xuống bếp`,
    sentPreOrder: (code: string) => `Đã lưu đơn đặt trước ${code}`,
    sentTakeout: (code: string) => `Đã tạo đơn mang về ${code}`,
    sentDelivery: (code: string) => `Đã tạo đơn giao hàng ${code}`,
    sendFailed: "Chưa gửi được đơn. Thử lại.",
    modeDineIn: "Tại bàn",
    modePreOrder: "Đặt trước",
    modeDelivery: "Giao tận nơi",
    modeTakeout: "Lấy tại quán",
    deliveryInfo: "Thông tin nhận hàng",
    customerName: "Họ và tên người nhận",
    customerNamePlaceholder: "Nhập họ và tên",
    customerPhone: "Số điện thoại",
    customerPhonePlaceholder: "Nhập số điện thoại",
    deliveryAddress: "Địa chỉ nhận hàng",
    deliveryAddressPlaceholder: "Số nhà, tên đường, phường/xã, quận...",
    deliveryTime: "Thời gian nhận",
    deliveryTimePlaceholder: "Ví dụ: Giao ngay trong 1h / 18:30 hôm nay",
    paymentMethod: "Phương thức thanh toán",
    paymentVietQR: "Chuyển khoản VietQR",
    paymentCOD: "Tiền mặt khi nhận (COD)",
    butcherNote: "Yêu cầu sơ chế & cắt thịt",
    butcherNotePlaceholder: "Ví dụ: Cắt lẩu 1.5mm, cắt nướng 3-4mm, chia 2 khay...",
    qrTitle: "Thanh toán chuyển khoản VietQR",
    qrScanHint: "Mở ứng dụng ngân hàng quét mã QR để chuyển khoản chính xác",
    qrDone: "Tôi đã chuyển khoản xong",
  },

  /* ─────────────── Đặt bàn ─────────────── */
  booking: {
    jp: "ご予約",
    title: "Đặt bàn",
    purpose: "Bạn muốn dùng gì",
    purposeOmakase: "Omakase",
    purposeOmakaseHint: "Bếp trưởng chọn món",
    purposeAlacarte: "Gọi món",
    purposeAlacarteHint: "Chọn theo thực đơn",
    pickSet: "Chọn suất",
    pickSetRequired: "Chọn một suất để tiếp tục.",
    depositNotice: (percent: number) =>
      `Yêu cầu cọc ${percent}% khi đặt suất Omakase (trừ trực tiếp vào hoá đơn).`,
    date: "Ngày",
    today: "Hôm nay",
    monthShort: (m: number) => `th${m}`,
    leadHours: (hours: number) =>
      `Suất omakase cần đặt trước ít nhất ${hours} giờ để bếp kịp chuẩn bị nguyên liệu.`,
    time: "Giờ",
    lunchShift: "Ca trưa",
    dinnerShift: "Ca tối",
    full: "hết chỗ",
    seatsLeft: (n: number) => `còn ${n}`,
    slotsFailed: "Chưa lấy được khung giờ còn trống. Gọi hotline để đặt trực tiếp.",
    tooSoon: (hours: number) =>
      `Ngày này đã quá sát giờ — suất omakase cần đặt trước ít nhất ${hours} giờ.`,
    closedAllDay: "Ngày này nhà hàng không nhận khách.",
    closedShift: (shift: string) =>
      `Ngày này nhà hàng không nhận khách ca ${shift}.`,
    pickAnotherDay: "Chọn ngày khác giúp mình.",
    pickTime: "Chọn giờ.",
    timeNote: "Nhà hàng sẽ gọi lại xác nhận giờ chính xác sau khi nhận đặt bàn.",
    guests: "Số khách",
    seating: "Chỗ ngồi",
    seatingCounter: "Quầy",
    seatingCounterHint: (seats: number) => `${seats} ghế`,
    seatingTable: "Bàn",
    seatingTableHint: "Khu chung",
    seatingPrivate: "Phòng riêng",
    seatingPrivateHint: "Cần xác nhận",
    privateNote: "Phòng riêng sẽ được nhà hàng xác nhận lại theo số khách.",
    contact: "Người đặt",
    name: "Tên",
    namePlaceholder: "Tên người đặt bàn",
    phone: "Số điện thoại",
    phonePlaceholder: "0xxx xxx xxx",
    phoneRequired: "Nhập số điện thoại để nhà hàng gọi xác nhận.",
    phoneInvalid: "Số điện thoại chưa đúng định dạng.",
    dietary: "Dị ứng / chế độ ăn",
    dietaryHint: "Bếp cần biết trước để thay nguyên liệu.",
    dietaryPlaceholder: "Ví dụ: dị ứng tôm cua, không ăn đồ sống",
    note: "Ghi chú",
    notePlaceholder: "Dịp đặc biệt, yêu cầu chỗ ngồi, giờ có thể đến muộn…",
    depositLabel: "Cọc trước",
    noDeposit: "Không cần cọc",
    continue: "Tiếp tục",
  },

  /* ─────────────── Chọn chỗ ngồi ─────────────── */
  seats: {
    title: "Chọn chỗ ngồi",
    intro:
      "Đây là quầy thật của Miyako. Kéo để xoay, chạm vào ghế bạn muốn ngồi.",
    needDateTime:
      "Chọn ngày và giờ trước, rồi bạn sẽ thấy sơ đồ quầy để chọn ghế.",
    dragHint: "Kéo để xoay · chạm vào ghế để chọn",
    resetView: "Về góc mặc định",
    legendFree: "Còn trống",
    legendPremium: "Nhìn thẳng bếp trưởng",
    legendMine: "Bạn chọn",
    legendTaken: "Đã có khách",
    chosen: (n: number, total: number) => `Đã chọn ${n}/${total} ghế`,
    alreadyFull: (n: number) =>
      `Đã chọn đủ ${n} ghế. Bỏ chọn một ghế trước khi đổi.`,
    notEnough: (free: number, guests: number) =>
      `Khung giờ này chỉ còn ${free} ghế trống, không đủ cho ${guests} khách. Chọn giờ khác hoặc gọi nhà hàng để xếp bàn thường.`,
    loadFailed: "Chưa xem được sơ đồ chỗ ngồi. Thử lại sau ít phút.",
    holdNote:
      "Chỗ ngồi chỉ được giữ chắc chắn sau khi gửi yêu cầu. Nếu có người đặt trước vài giây, hệ thống sẽ báo để bạn chọn lại.",
    required: (n: number) => `Chọn đủ ${n} ghế ở sơ đồ quầy.`,
    seatTaken: "Ghế vừa có người giữ. Chọn lại giúp mình.",
    yourSeats: "Ghế của bạn",
    offline:
      "Chưa kiểm tra được ghế nào còn trống. Bạn vẫn chọn được, nhà hàng sẽ xác nhận lại khi nhận đặt bàn.",
  },

  /* ─────────────── Xác nhận đặt bàn ─────────────── */
  review: {
    title: "Xác nhận đặt bàn",
    set: "Suất",
    kind: "Hình thức",
    alacarte: "Gọi món theo thực đơn",
    time: "Thời gian",
    guests: "Số khách",
    seating: "Chỗ ngồi",
    name: "Người đặt",
    phone: "Điện thoại",
    dietary: "Dị ứng / chế độ ăn",
    note: "Ghi chú",
    subtotal: "Tạm tính",
    deposit: (percent: number) => `Cọc ${percent}%`,
    noDeposit: "Đặt bàn không cọc",
    priceNote: (menuNote: string) =>
      `${menuNote}. Hoá đơn cuối cùng tính theo thực tế tại nhà hàng.`,
    depositNote:
      "Phần cọc được trừ trực tiếp vào hoá đơn. Nhà hàng sẽ gọi lại trong ít phút để xác nhận và hướng dẫn thanh toán cọc.",
    submit: "Gửi yêu cầu đặt bàn",
    edit: "Sửa lại thông tin",
    failed: "Chưa gửi được yêu cầu. Thử lại hoặc gọi hotline.",
  },

  /* ─────────────── Đặt bàn thành công ─────────────── */
  success: {
    notFound: "Không tìm thấy yêu cầu đặt bàn",
    home: "Về trang chủ",
    title: "Đã gửi yêu cầu đặt bàn",
    subtitle: "Nhà hàng sẽ gọi lại để xác nhận. Giữ mã dưới đây khi liên hệ.",
    code: "Mã đặt bàn",
    time: "Thời gian",
    guests: "Số khách",
    deposit: "Tiền cọc",
    depositPaid: "đã thanh toán",
    depositNote: (percent: number) =>
      `Cọc ${percent}% được trừ thẳng vào hoá đơn khi dùng bữa.`,
    call: "Gọi nhà hàng",
    message: "Nhắn tin",
    myReservations: "Đặt bàn của tôi",
    changeNote: (hotline: string) =>
      `Cần đổi giờ hoặc huỷ bàn, mở mục “Đặt bàn của tôi” hoặc gọi ${hotline}.`,
  },

  /* ─────────────── Omakase ─────────────── */
  omakase: {
    jp: "おまかせ",
    title: "Omakase",
    blurb: (seats: number) =>
      `Omakase nghĩa là giao lại cho bếp trưởng. Nguyên liệu chọn theo ngày, món ra theo một trình tự đã định, mỗi phần được dọn ngay khi vừa hoàn thiện. Quầy itamae có ${seats} ghế, nên mỗi suất cần đặt trước.`,
    dinnerJp: "夜",
    dinner: "Suất tối",
    lunchJp: "昼",
    lunch: "Suất trưa",
    listNote: (percent: number) =>
      `Giá tính theo từng khách. Đặt suất omakase cần cọc trước ${percent}%. Nếu có dị ứng hoặc chế độ ăn riêng, ghi vào phần ghi chú khi đặt bàn để bếp chuẩn bị.`,
    notFound: "Không tìm thấy suất này",
    counterSeats: (seats: number) => `Quầy itamae ${seats} ghế`,
    coursesJp: "お品書き",
    courses: "Trình tự món",
    menuPending: "Thực đơn chi tiết của suất này đang được cập nhật.",
    menuPendingCall: (hotline: string) =>
      `Gọi ${hotline} để nghe bếp mô tả thực đơn đang chạy.`,
    menuPendingShort: "Thực đơn đang cập nhật",
    depositNote: (percent: number, perGuest: string) =>
      `Cọc ${percent}% khi đặt — ${perGuest} mỗi khách. Nguyên liệu thay đổi theo ngày, một vài món trong thực đơn có thể được bếp đổi sang nguyên liệu tốt hơn trong ngày hôm đó.`,
    book: "Đặt suất này",
  },

  /* ─────────────── Đặt bàn của tôi ─────────────── */
  reservations: {
    title: "Đặt bàn của tôi",
    emptyTitle: "Chưa có đặt bàn nào",
    emptyHint: "Đặt một suất omakase hoặc một bàn gọi món.",
    book: "Đặt bàn",
    deposit: (amount: string) => `Cọc ${amount}`,
    depositPaid: " · đã thanh toán",
    depositUnpaid: " · chưa thanh toán",

    detailTitle: "Chi tiết đặt bàn",
    detailNotFound: "Không tìm thấy đặt bàn",
    backToList: "Về danh sách",
    code: "Mã đặt bàn",
    showCode: "Đọc mã này cho nhân viên khi tới nhà hàng.",
    time: "Thời gian",
    guests: "Số khách",
    seating: "Chỗ ngồi",
    name: "Người đặt",
    phone: "Điện thoại",
    dietary: "Dị ứng / chế độ ăn",
    note: "Ghi chú",
    createdAt: "Đặt lúc",
    depositAmount: "Tiền cọc",
    depositStatus: "Trạng thái cọc",
    paid: "Đã thanh toán",
    unpaid: "Chưa thanh toán",
    callRestaurant: (hotline: string) => `Gọi nhà hàng · ${hotline}`,
    cancel: "Huỷ bàn",
    cancelled: "Đã huỷ bàn",
    cancelFailed: "Chưa huỷ được. Gọi hotline giúp mình.",
    policyFallback:
      "Chính sách huỷ và hoàn cọc do nhà hàng xác nhận qua điện thoại.",
  },

  /* ─────────────── Món đã lưu ─────────────── */
  favorites: {
    title: "Món đã lưu",
    emptyTitle: "Chưa lưu món nào",
    emptyHint: "Mở một món trong thực đơn và chạm vào biểu tượng trái tim.",
    openMenu: "Xem thực đơn",
  },

  /* ─────────────── Cá nhân ─────────────── */
  profile: {
    jp: "マイページ",
    title: "Cá nhân",
    guest: "Khách của Miyako",
    signedIn: "Đăng nhập qua Zalo",
    signedOut: "Mở trong Zalo để đồng bộ tài khoản",
    myReservations: "Đặt bàn của tôi",
    favorites: "Món đã lưu",
    about: "Về Miyako",
    ordersJp: "注文",
    orders: "Đơn đã gọi",
    noOrders:
      "Chưa có đơn nào. Món bạn gọi tại bàn hoặc đặt trước sẽ hiện ở đây.",
    atTable: (table: string) => `Tại bàn ${table}`,
    preOrder: "Đặt trước",
    call: "Gọi nhà hàng",
    messageOA: "Nhắn tin Zalo OA",
    directions: "Chỉ đường",
  },

  /* ─────────────── Giới thiệu ─────────────── */
  about: {
    title: "Về Miyako",
    counterJp: "おまかせ",
    counter: "Quầy omakase",
    counterBlurb: (seats: number) =>
      `Quầy itamae có ${seats} ghế. Khách ngồi đối diện bếp, mỗi phần được dọn ngay khi vừa hoàn thiện, theo trình tự bếp trưởng đã định cho ngày hôm đó.`,
    wagyuJp: "和牛",
    wagyu: "Wagyu A5",
    wagyuBlurb:
      "Miyako chỉ dùng wagyu A5 chính hãng, có chứng nhận xuất xứ đi kèm từng lô.",
    wetAging: "Wet-aging",
    temperature: "Nhiệt độ",
    humidity: "Độ ẩm",
    airflow: "Tốc độ gió",
    duration: "Thời gian ủ",
    days: (n: number) => `${n} ngày`,
    messageOA: "Nhắn tin Zalo OA",
  },

  /* ─────────────── Đặt cọc ─────────────── */
  deposit: {
    received: "Đã nhận cọc",
    receivedHint: "Bàn của bạn đã được giữ. Hẹn gặp tại nhà hàng.",
    pendingTitle: "Còn bước đặt cọc",
    pendingHint: (amount: string) =>
      `Cần cọc ${amount} để giữ chỗ. Nhà hàng sẽ gọi trong ít phút để hướng dẫn chuyển khoản.`,
    call: (hotline: string) => `Gọi ${hotline}`,
    callShort: "Gọi",
    qrTitle: "Chuyển cọc để giữ chỗ",
    qrHint:
      "Quét mã bằng app ngân hàng — số tiền và nội dung đã điền sẵn. Chuyển xong, màn hình này tự cập nhật.",
    qrAlt: (amount: string) => `Mã QR chuyển ${amount}`,
    amount: "Số tiền",
    bank: "Ngân hàng",
    account: "Số tài khoản",
    accountName: "Chủ tài khoản",
    content: "Nội dung",
    contentNote: (content: string) =>
      `Giữ nguyên nội dung ${content} khi chuyển khoản. Ghi khác đi thì nhà hàng vẫn nhận được tiền, chỉ mất thêm ít phút để đối chiếu tay.`,
    paidButton: "Tôi đã chuyển",
    notSeenYet:
      "Chưa thấy khoản chuyển nào. Nếu bạn vừa chuyển xong, bấm “Tôi đã chuyển” hoặc xem lại ở mục Đặt bàn của tôi sau ít phút.",
  },

  /* ─────────────── Lỗi từ máy chủ ─────────────── */
  errors: {
    offline: "Không kết nối được tới nhà hàng. Kiểm tra mạng rồi thử lại.",
    noBackend: "Chưa kết nối được với nhà hàng. Gọi hotline để đặt trực tiếp.",
    leadTime: "Suất omakase này cần đặt trước sớm hơn. Chọn giúp mình một ngày khác.",
    pastTime: "Thời điểm này đã qua. Chọn giúp mình giờ khác.",
    dishUnavailable: "Có món trong đơn đã hết. Xem lại giỏ món giúp mình.",
    dishVariant: "Có món trong đơn chưa chọn phần.",
    reservationNotFound: "Không tìm thấy đặt bàn với mã này.",
    missingContact: "Nhập tên và số điện thoại giúp mình.",
    invalidGuests: "Số khách không hợp lệ.",
    emptyOrder: "Đơn chưa có món nào.",
  },

  /* ─────────────── Dữ kiện nhà hàng ─────────────── */
  restaurant: {
    menuPriceNote: "Đơn vị tính: 1.000đ · Giá chưa bao gồm VAT",
  },

  /* ─────────────── Tích điểm & Đổi quà ─────────────── */
  rewards: {
    title: "Tích điểm & Đổi thưởng",
    tabGifts: "Đổi Quà & Voucher",
    tabTiers: "Đặc Quyền Hạng",
    tabQuests: "Nhiệm Vụ Kiếm Điểm",
    tabHistory: "Lịch Sử Điểm",
    catAll: "Tất cả",
    catVoucher: "Voucher",
    catDish: "Món ăn",
    catDrink: "Đồ uống",
    memberTitle: "Miyako Club",
    currentPoints: "Điểm tích luỹ",
    pointsUnit: "điểm",
    pts: "điểm",
    needMore: (pts: number, nextTier: string) => `Cần thêm ${pts} điểm để lên ${nextTier}`,
    maxTierReached: "Bạn đang ở hạng thành viên cao quý nhất",
    redeemTitle: "Đổi quà tặng này?",
    redeemCost: (cost: number) => `Chi phí: ${cost} điểm`,
    balanceAfter: (bal: number) => `Số dư sau đổi: ${bal} điểm`,
    confirmRedeem: "Xác nhận đổi",
    cancel: "Huỷ",
    redeemSuccess: "Đổi quà thành công!",
    yourVoucherCode: "Mã ưu đãi của bạn",
    useAtMenu: "Sử dụng ngay tại Thực Đơn",
    useCodeHint: "Đưa mã này cho nhân viên hoặc nhập khi đặt hàng",
    notEnoughPoints: "Chưa đủ điểm tích luỹ",
    claimQuest: "Nhận",
    claimed: "Đã nhận",
    historyEmpty: "Chưa có biến động điểm nào",
    historyTitle: "Lịch sử tích luỹ & đổi điểm",
    memberBarcodeHint: "Giả lập Barcode sọc",
    memberQrHint: "Mã QR thành viên",
    close: "Đóng",
  },

  /* ─────────────── Wagyu Butcher ─────────────── */
  butcher: {
    title: "Wagyu Butcher",
    shopName: "Miyako Wagyu Butcher Shop",
    subtitle: "Thịt tươi sơ chế theo yêu cầu",
    desc: "Thịt bò Wagyu Nhật Bản A5 & Bò Mỹ Prime cắt tươi trong ngày. Đóng khay hút chân không tiệt trùng kèm đá gel giữ nhiệt chuẩn tươi ngon.",
    serviceTag: "A5 Wagyu Specialist",
    guarantee1Title: "Cắt Lát Theo Yêu Cầu",
    guarantee1Desc: "Thái Steak dày 2-3cm, nướng Yakiniku hoặc nhúng lẩu 1.5mm miễn phí",
    guarantee2Title: "Đóng Khay Khí Trơ & Đá Gel",
    guarantee2Desc: "Đóng gói hút chân không tiệt trùng, giữ trọn vẹn độ tươi ngon và nhiệt độ lạnh sâu",
    guarantee3Title: "Giao Nhanh Nội Thành 2h",
    guarantee3Desc: "Giao tận tay hỏa tốc, bảo quản chuẩn lạnh từ cửa hàng đến bàn ăn gia đình",
    guarantee4Title: "100% Nguồn Gốc Rõ Ràng",
    guarantee4Desc: "Bò Wagyu A5 Nhật nhập khẩu chính ngạch, có chứng thư xuất xứ từng lô",
  },
};

/** Hình dạng chuẩn mà `en.ts` và `ja.ts` phải khớp. */
export type Dict = typeof vi;
