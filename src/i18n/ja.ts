import type { Dict } from "./vi";

/**
 * 日本語 — for Japanese guests, who are the ones most likely to read the
 * kanji already printed on the paper menu.
 *
 * Register: polite restaurant Japanese. Labels stay in noun form (「ご予約」
 * not 「ご予約します」); sentences use ですます. Counters matter: 名 for
 * guests, 品 for dishes, 席 for seats, 日 for days.
 */
export const ja: Dict = {
  common: {
    loading: "読み込み中",
    close: "閉じる",
    back: "戻る",
    all: "すべて見る",
    from: "〜",
    decrease: "減らす",
    increase: "増やす",
    guests: (n) => `${n}名`,
    dishes: (n) => `${n}品`,
    perGuest: "/ お一人様",
    perGuestPrice: (price) => `お一人様 ${price}`,
    contact: "お問い合わせ",
    contactJp: "ご案内",
  },

  nav: {
    label: "メインナビゲーション",
    home: "ホーム",
    omakase: "おまかせ",
    menu: "お品書き",
    booking: "ご予約",
    profile: "マイページ",
  },

  lang: {
    title: "言語",
    switch: "言語を変更",
  },

  badge: {
    signature: "シグネチャー",
    "best-seller": "人気",
    "must-try": "おすすめ",
  },

  service: {
    lunch: "昼",
    dinner: "夜",
    both: "昼・夜",
    lunchLong: "昼の部",
    dinnerLong: "夜の部",
    bothLong: "昼・夜ともに提供",
  },

  seating: {
    counter: "板前カウンター",
    table: "テーブル席",
    private: "個室",
  },

  status: {
    pending: "確認待ち",
    "awaiting-deposit": "内金待ち",
    confirmed: "確定",
    cancelled: "キャンセル済み",
    completed: "ご来店済み",
  },

  home: {
    spaceAlt: "都（MIYAKO）店内",
    tagline: (city, seats) =>
      `${city}でおまかせと和牛A5を。板前カウンター${seats}席。`,
    atTable: (table) => `${table}番テーブルにご着席中`,
    atTableHint: "そのままご注文いただけます",
    book: "ご予約",
    order: "ご注文",
    omakaseJp: "おまかせ",
    omakaseBlurb:
      "その日の仕入れから大将が素材を選びます。決まった順にお出しし、カウンターのお客様には仕上がったその瞬間に一品ずつお届けします。",
    bestSellersJp: "人気",
    bestSellers: "よく出る一品",
    signaturesJp: "特選",
    signatures: "都の特選料理",
    callToBook: "お電話でご予約",
    messageRestaurant: "メッセージを送る",
    replyWithin: (minutes) => `${minutes}分以内に返信`,
  },

  menu: {
    jp: "お品書き",
    title: "お品書き",
    searchPlaceholder: "料理を検索 — 大トロ、和牛、ラーメン",
    searchOpen: "料理を検索",
    searchClose: "検索を閉じる",
    scanTable: "テーブルのQRを読み取る",
    orderingAtTable: (table) => `${table}番テーブルからご注文中`,
    clearTable: "解除",
    results: (n, query) => `「${query}」の検索結果 ${n}件`,
    emptyTitle: "該当する料理がありません",
    emptyHint: "別のことばでお探しいただくか、分類からお選びください。",
  },

  dish: {
    add: (name) => `${name}を追加`,
    added: (qty, name) => `${name}を${qty}点追加しました`,
    addWithPrice: (price) => `追加 · ${price}`,
    save: "保存する",
    unsave: "保存を解除",
    includes: "内容",
    gifts: "サービス品",
    pickVariant: "サイズをお選びください",
    kitchenNote: "厨房への備考",
    kitchenNotePlaceholder: "わさび抜き、塩控えめ、甲殻類アレルギーなど",
  },

  cart: {
    title: "ご注文内容",
    view: "注文内容を見る",
    clear: "すべて削除",
    emptyTitle: "まだ何も選ばれていません",
    emptyHint: "お品書きからお好きな料理をお選びください。",
    openMenu: "お品書きを見る",
    sendToKitchen: (table) => `${table}番テーブルとして厨房へ直接お送りします`,
    attachToReservation: "ご予約に事前注文する",
    kitchenNote: "厨房への備考",
    kitchenNotePlaceholder: "順番にお出しください、わさび抜きでお願いします",
    subtotal: "小計",
    priceNote: (menuNote) =>
      `${menuNote}。消費税・サービス料は含まれておりません。最終のお会計は店内で承ります。`,
    submitDineIn: "厨房へ注文する",
    submitPreOrder: "事前注文を保存",
    submitTakeout: "テイクアウト注文",
    submitDelivery: "デリバリー注文",
    sentDineIn: (code) => `ご注文 ${code} を厨房へお送りしました`,
    sentPreOrder: (code) => `事前注文 ${code} を保存しました`,
    sentTakeout: (code) => `テイクアウト注文 ${code} を承りました`,
    sentDelivery: (code) => `デリバリー注文 ${code} を承りました`,
    sendFailed: "ご注文を送信できませんでした。もう一度お試しください。",
    modeDineIn: "店内",
    modePreOrder: "事前注文",
    modeDelivery: "お届け",
    modeTakeout: "テイクアウト",
    deliveryInfo: "お届け先・受取情報",
    customerName: "お名前",
    customerNamePlaceholder: "お名前を入力",
    customerPhone: "お電話番号",
    customerPhonePlaceholder: "お電話番号を入力",
    deliveryAddress: "お届け先住所",
    deliveryAddressPlaceholder: "住所を入力してください",
    deliveryTime: "ご希望時間",
    deliveryTimePlaceholder: "例: 1時間以内 / 本日 18:30",
    paymentMethod: "お支払い方法",
    paymentVietQR: "VietQR 銀行振込",
    paymentCOD: "代金引換 (COD)",
    butcherNote: "精肉カット・小分けのご要望",
    butcherNotePlaceholder: "しゃぶしゃぶ用1.5mm、焼肉用3-4mm、真空パック等",
    qrTitle: "VietQR 銀行振込",
    qrScanHint: "銀行アプリでQRコードを読み取ってお振込みください",
    qrDone: "振込を完了しました",
  },

  booking: {
    jp: "ご予約",
    title: "ご予約",
    purpose: "ご希望をお選びください",
    purposeOmakase: "おまかせ",
    purposeOmakaseHint: "大将におまかせ",
    purposeAlacarte: "アラカルト",
    purposeAlacarteHint: "お品書きから選ぶ",
    pickSet: "コースをお選びください",
    pickSetRequired: "コースをお選びください。",
    depositNotice: (percent: number) =>
      `おまかせのご予約には${percent}%のデポジットが必要です（お会計時に相殺）。`,
    date: "日付",
    today: "本日",
    monthShort: (m) => `${m}月`,
    leadHours: (hours) =>
      `おまかせは仕入れの都合上、${hours}時間前までにご予約をお願いしております。`,
    time: "時間",
    lunchShift: "昼の部",
    dinnerShift: "夜の部",
    full: "満席",
    seatsLeft: (n) => `残${n}`,
    slotsFailed:
      "空き時間を取得できませんでした。お電話にてご予約をお願いいたします。",
    tooSoon: (hours) =>
      `お時間が近すぎます。おまかせは${hours}時間前までのご予約をお願いしております。`,
    closedAllDay: "この日はお休みをいただいております。",
    closedShift: (shift) => `この日の${shift}はお休みをいただいております。`,
    pickAnotherDay: "別の日をお選びください。",
    pickTime: "時間をお選びください。",
    timeNote: "ご予約後、正確なお時間をお電話にて確認させていただきます。",
    guests: "人数",
    seating: "お席",
    seatingCounter: "カウンター",
    seatingCounterHint: (seats) => `${seats}席`,
    seatingTable: "テーブル",
    seatingTableHint: "ホール",
    seatingPrivate: "個室",
    seatingPrivateHint: "要確認",
    privateNote: "個室は人数に応じて店舗より改めてご確認いたします。",
    contact: "ご予約者様",
    name: "お名前",
    namePlaceholder: "ご予約者様のお名前",
    phone: "電話番号",
    phonePlaceholder: "0xxx xxx xxx",
    phoneRequired: "確認のご連絡のため電話番号をご入力ください。",
    phoneInvalid: "電話番号の形式が正しくありません。",
    dietary: "アレルギー・食事制限",
    dietaryHint: "食材を差し替えますので、事前にお知らせください。",
    dietaryPlaceholder: "甲殻類アレルギー、生ものが苦手 など",
    note: "備考",
    notePlaceholder: "記念日、お席のご希望、到着が遅れる可能性 など",
    depositLabel: "内金",
    noDeposit: "内金不要",
    continue: "次へ",
  },

  /* ─────────────── お席の選択 ─────────────── */
  seats: {
    title: "お席を選ぶ",
    intro:
      "実際のカウンターです。ドラッグで見回し、ご希望の席をタップしてください。",
    needDateTime: "先に日付と時間をお選びください。カウンター図が表示されます。",
    dragHint: "ドラッグで回転 · 席をタップで選択",
    resetView: "視点を戻す",
    legendFree: "空席",
    legendPremium: "板前の正面",
    legendMine: "選択中",
    legendTaken: "予約済み",
    chosen: (n: number, total: number) => `${total}席中 ${n}席を選択`,
    alreadyFull: (n: number) =>
      `${n}席すべて選択済みです。変更するには一度解除してください。`,
    notEnough: (free: number, guests: number) =>
      `この時間の空席は${free}席のみで、${guests}名様には足りません。別の時間をお選びいただくか、お電話でテーブル席をご相談ください。`,
    loadFailed: "座席表を読み込めませんでした。しばらくしてからお試しください。",
    holdNote:
      "お席はリクエスト送信後に確保されます。わずかな差で先約が入った場合は、選び直しをご案内します。",
    required: (n: number) => `カウンター図で${n}席をお選びください。`,
    seatTaken: "この席はたった今予約されました。別の席をお選びください。",
    yourSeats: "お席",
    offline:
      "空席状況を確認できませんでした。お選びいただけますが、ご予約受付時に店舗より改めてご確認いたします。",
  },

  review: {
    title: "ご予約内容の確認",
    set: "コース",
    kind: "ご利用",
    alacarte: "アラカルト",
    time: "日時",
    guests: "人数",
    seating: "お席",
    name: "ご予約者様",
    phone: "電話番号",
    dietary: "アレルギー・食事制限",
    note: "備考",
    subtotal: "概算",
    deposit: (percent) => `内金 ${percent}%`,
    noDeposit: "内金なし",
    priceNote: (menuNote) => `${menuNote}。最終のお会計は店内で承ります。`,
    depositNote:
      "内金はお会計から差し引かせていただきます。確認とお支払い方法のご案内のため、間もなく店舗よりお電話いたします。",
    submit: "予約を申し込む",
    edit: "内容を修正する",
    failed:
      "お申し込みを送信できませんでした。もう一度お試しいただくか、お電話ください。",
  },

  success: {
    notFound: "ご予約が見つかりません",
    home: "ホームへ戻る",
    title: "ご予約を承りました",
    subtitle:
      "確認のため店舗よりお電話いたします。お問い合わせの際は下記の番号をお伝えください。",
    code: "予約番号",
    time: "日時",
    guests: "人数",
    deposit: "内金",
    depositPaid: "お支払い済み",
    depositNote: (percent) =>
      `内金${percent}%はご来店時のお会計から差し引かせていただきます。`,
    call: "店舗へ電話",
    message: "メッセージ",
    myReservations: "予約一覧",
    changeNote: (hotline) =>
      `お時間の変更・キャンセルは「予約一覧」から、または ${hotline} までお電話ください。`,
  },

  omakase: {
    jp: "おまかせ",
    title: "おまかせ",
    blurb: (seats) =>
      `おまかせは、その日の献立を大将に委ねていただく形です。素材はその日の仕入れから選び、決まった順に、仕上がったその瞬間に一品ずつお出しします。板前カウンターは${seats}席のため、事前のご予約をお願いしております。`,
    dinnerJp: "夜",
    dinner: "夜のコース",
    lunchJp: "昼",
    lunch: "昼のコース",
    listNote: (percent) =>
      `料金はお一人様あたりです。おまかせのご予約には${percent}%の内金を申し受けます。アレルギーや食事制限がございましたら、ご予約の備考欄にご記入ください。`,
    notFound: "このコースは見つかりません",
    counterSeats: (seats) => `板前カウンター${seats}席`,
    coursesJp: "お品書き",
    courses: "お献立",
    menuPending: "このコースの詳しいお献立は只今更新中です。",
    menuPendingCall: (hotline) =>
      `${hotline} までお電話いただければ、ただ今のお献立を板前よりご説明いたします。`,
    menuPendingShort: "お献立は更新中",
    depositNote: (percent, perGuest) =>
      `ご予約時に${percent}%の内金を申し受けます — お一人様 ${perGuest}。素材はその日により変わり、より良いものが入った日には板前の判断で一品を差し替えることがございます。`,
    book: "このコースを予約する",
  },

  reservations: {
    title: "予約一覧",
    emptyTitle: "ご予約はまだございません",
    emptyHint: "おまかせのお席、またはアラカルトのテーブルをご予約ください。",
    book: "ご予約",
    deposit: (amount) => `内金 ${amount}`,
    depositPaid: " · お支払い済み",
    depositUnpaid: " · 未払い",

    detailTitle: "ご予約の詳細",
    detailNotFound: "ご予約が見つかりません",
    backToList: "一覧へ戻る",
    code: "予約番号",
    showCode: "ご来店の際、この番号をスタッフにお伝えください。",
    time: "日時",
    guests: "人数",
    seating: "お席",
    name: "ご予約者様",
    phone: "電話番号",
    dietary: "アレルギー・食事制限",
    note: "備考",
    createdAt: "お申し込み日時",
    depositAmount: "内金",
    depositStatus: "内金の状況",
    paid: "お支払い済み",
    unpaid: "未払い",
    callRestaurant: (hotline) => `店舗へ電話 · ${hotline}`,
    cancel: "予約を取り消す",
    cancelled: "ご予約を取り消しました",
    cancelFailed: "取り消せませんでした。お電話にてご連絡ください。",
    policyFallback:
      "キャンセルおよび内金の返金については、店舗よりお電話にてご案内いたします。",
  },

  favorites: {
    title: "保存した料理",
    emptyTitle: "保存した料理はまだございません",
    emptyHint: "お品書きで料理を開き、ハートに触れてください。",
    openMenu: "お品書きを見る",
  },

  profile: {
    jp: "マイページ",
    title: "マイページ",
    guest: "都のお客様",
    signedIn: "Zaloでログイン中",
    signedOut: "Zaloで開くとアカウントが同期されます",
    myReservations: "予約一覧",
    favorites: "保存した料理",
    about: "都について",
    ordersJp: "注文",
    orders: "ご注文履歴",
    noOrders:
      "ご注文はまだございません。店内でのご注文や事前注文はこちらに表示されます。",
    atTable: (table) => `${table}番テーブル`,
    preOrder: "事前注文",
    call: "店舗へ電話",
    messageOA: "Zaloでメッセージ",
    directions: "道順",
  },

  about: {
    title: "都について",
    counterJp: "おまかせ",
    counter: "おまかせカウンター",
    counterBlurb: (seats) =>
      `板前カウンターは${seats}席。厨房と向かい合ってお座りいただき、その日大将が組んだ順に、仕上がったその瞬間に一品ずつお出しします。`,
    wagyuJp: "和牛",
    wagyu: "和牛A5",
    wagyuBlurb:
      "都では、ロットごとに産地証明書の付いた正規の和牛A5のみを使用しております。",
    wetAging: "ウェットエイジング",
    temperature: "温度",
    humidity: "湿度",
    airflow: "風速",
    duration: "熟成期間",
    days: (n) => `${n}日`,
    messageOA: "Zaloでメッセージ",
  },

  deposit: {
    received: "内金を確認いたしました",
    receivedHint: "お席をお取りしております。ご来店をお待ちしております。",
    pendingTitle: "内金のお手続きが残っております",
    pendingHint: (amount) =>
      `お席の確保には${amount}の内金が必要です。お振込方法のご案内のため、間もなく店舗よりお電話いたします。`,
    call: (hotline) => `${hotline} へ電話`,
    callShort: "電話",
    qrTitle: "内金のお振込でお席を確保",
    qrHint:
      "銀行アプリで読み取ってください。金額と振込内容は入力済みです。お振込後、この画面は自動で更新されます。",
    qrAlt: (amount) => `${amount}のお振込用QRコード`,
    amount: "金額",
    bank: "銀行",
    account: "口座番号",
    accountName: "口座名義",
    content: "振込内容",
    contentNote: (content) =>
      `お振込の際は振込内容「${content}」をそのままご入力ください。異なる場合もご入金は届きますが、確認にお時間をいただきます。`,
    paidButton: "振込を完了しました",
    notSeenYet:
      "まだご入金を確認できておりません。お振込がお済みの場合は「振込を完了しました」を押すか、数分後に予約一覧をご確認ください。",
  },

  errors: {
    offline: "店舗に接続できませんでした。通信環境をご確認のうえ、もう一度お試しください。",
    noBackend: "店舗に接続できませんでした。お電話にてご予約をお願いいたします。",
    leadTime:
      "このおまかせはもう少し前のご予約が必要です。別の日をお選びください。",
    pastTime: "この時間はすでに過ぎております。別のお時間をお選びください。",
    dishUnavailable:
      "ご注文の中に品切れの料理がございます。ご注文内容をご確認ください。",
    dishVariant: "ご注文の中にサイズ未選択の料理がございます。",
    reservationNotFound: "この番号のご予約が見つかりません。",
    missingContact: "お名前と電話番号をご入力ください。",
    invalidGuests: "人数が正しくありません。",
    emptyOrder: "ご注文に料理がございません。",
  },

  restaurant: {
    menuPriceNote: "単位：1,000ドン · 表示価格に消費税は含まれておりません",
  },
};
