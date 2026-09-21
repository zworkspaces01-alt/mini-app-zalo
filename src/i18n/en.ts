import type { Dict } from "./vi";

/**
 * English — for guests who read neither Vietnamese nor Japanese.
 *
 * Register: restaurant English, short and plain. Japanese dish vocabulary
 * (omakase, itamae, wagyu, sashimi) stays untranslated — it is the name of
 * the thing, not a flourish.
 */
export const en: Dict = {
  common: {
    loading: "Loading",
    close: "Close",
    back: "Back",
    all: "See all",
    from: "from",
    decrease: "Decrease",
    increase: "Increase",
    guests: (n) => `${n} ${n === 1 ? "guest" : "guests"}`,
    dishes: (n) => `${n} ${n === 1 ? "dish" : "dishes"}`,
    perGuest: "/ guest",
    perGuestPrice: (price) => `${price}/guest`,
    contact: "Contact",
    contactJp: "ご案内",
  },

  nav: {
    label: "Main navigation",
    home: "Home",
    omakase: "Omakase",
    menu: "Menu",
    booking: "Book",
    profile: "Account",
  },

  lang: {
    title: "Language",
    switch: "Change language",
  },

  badge: {
    signature: "Signature",
    "best-seller": "Best seller",
    "must-try": "Must try",
  },

  service: {
    lunch: "Lunch",
    dinner: "Dinner",
    both: "Lunch & dinner",
    lunchLong: "Served at lunch",
    dinnerLong: "Served at dinner",
    bothLong: "Served at lunch and dinner",
  },

  seating: {
    counter: "Itamae counter",
    table: "Main dining room",
    private: "Private room",
  },

  status: {
    pending: "Awaiting confirmation",
    "awaiting-deposit": "Awaiting deposit",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
  },

  home: {
    spaceAlt: "Inside Miyako",
    tagline: (city, seats) =>
      `Omakase and A5 wagyu in ${city}. An itamae counter of ${seats} seats.`,
    atTable: (table) => `You are seated at table ${table}`,
    atTableHint: "Order straight from your table",
    book: "Book a table",
    order: "Order food",
    omakaseJp: "おまかせ",
    omakaseBlurb:
      "The chef picks the ingredients each morning. The courses follow a set order, and every plate is served the moment it is finished.",
    bestSellersJp: "人気",
    bestSellers: "Most ordered",
    signaturesJp: "特選",
    signatures: "Miyako signatures",
    callToBook: "Call to book",
    messageRestaurant: "Message the restaurant",
    replyWithin: (minutes) =>
      `Replies within ${minutes} ${minutes === 1 ? "minute" : "minutes"}`,
  },

  menu: {
    jp: "お品書き",
    title: "Menu",
    searchPlaceholder: "Search dishes — otoro, wagyu, ramen",
    searchOpen: "Search dishes",
    searchClose: "Close search",
    scanTable: "Scan table QR",
    orderingAtTable: (table) => `Ordering at table ${table}`,
    clearTable: "Clear",
    results: (n, query) =>
      `${n} ${n === 1 ? "result" : "results"} for “${query}”`,
    emptyTitle: "No dishes found",
    emptyHint: "Try another word, or browse by category.",
  },

  dish: {
    add: (name) => `Add ${name}`,
    added: (qty, name) => `Added ${qty} × ${name}`,
    addWithPrice: (price) => `Add · ${price}`,
    save: "Save dish",
    unsave: "Remove from saved",
    includes: "Includes",
    gifts: "Comes with",
    pickVariant: "Choose a size",
    kitchenNote: "Note for the kitchen",
    kitchenNotePlaceholder: "No wasabi, less salt, shellfish allergy…",
  },

  cart: {
    title: "Your order",
    view: "View order",
    clear: "Clear all",
    emptyTitle: "Nothing chosen yet",
    emptyHint: "Open the menu and add what you would like.",
    openMenu: "Open menu",
    sendToKitchen: (table) => `Sent straight to the kitchen for table ${table}`,
    attachToReservation: "Pre-order for a booking",
    kitchenNote: "Note for the kitchen",
    kitchenNotePlaceholder: "Serve course by course, no wasabi",
    subtotal: "Subtotal",
    priceNote: (menuNote) =>
      `${menuNote}. VAT and service charge, if any, are not included — the final bill is settled at the restaurant.`,
    submitDineIn: "Send to the kitchen",
    submitPreOrder: "Save pre-order",
    submitTakeout: "Place takeout order",
    submitDelivery: "Place delivery order",
    sentDineIn: (code) => `Order ${code} sent to the kitchen`,
    sentPreOrder: (code) => `Pre-order ${code} saved`,
    sentTakeout: (code) => `Takeout order ${code} placed`,
    sentDelivery: (code) => `Delivery order ${code} placed`,
    sendFailed: "The order did not go through. Please try again.",
    modeDineIn: "Dine-in",
    modePreOrder: "Pre-order",
    modeDelivery: "Delivery",
    modeTakeout: "Takeout",
    deliveryInfo: "Delivery details",
    customerName: "Recipient name",
    customerNamePlaceholder: "Full name",
    customerPhone: "Phone number",
    customerPhonePlaceholder: "Phone number",
    deliveryAddress: "Delivery address",
    deliveryAddressPlaceholder: "Street address, ward, district...",
    deliveryTime: "Preferred time",
    deliveryTimePlaceholder: "ASAP within 1 hour / 18:30 today",
    paymentMethod: "Payment method",
    paymentVietQR: "VietQR bank transfer",
    paymentCOD: "Cash on delivery (COD)",
    butcherNote: "Butchery & prep request",
    butcherNotePlaceholder: "Shabu slice 1.5mm, Yakiniku 3-4mm, vacuum pack...",
    qrTitle: "VietQR Payment",
    qrScanHint: "Scan the QR code with your banking app to pay",
    qrDone: "I have completed transfer",
  },

  booking: {
    jp: "ご予約",
    title: "Book a table",
    purpose: "What would you like",
    purposeOmakase: "Omakase",
    purposeOmakaseHint: "The chef chooses",
    purposeAlacarte: "À la carte",
    purposeAlacarteHint: "Order from the menu",
    pickSet: "Choose a course",
    pickSetRequired: "Choose a course to continue.",
    depositNotice: (percent: number) =>
      `A ${percent}% deposit is required for Omakase bookings (credited to your bill).`,
    date: "Date",
    today: "Today",
    monthShort: (m) =>
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1],
    leadHours: (hours) =>
      `Omakase must be booked at least ${hours} ${hours === 1 ? "hour" : "hours"} ahead so the kitchen can source the fish.`,
    time: "Time",
    lunchShift: "Lunch",
    dinnerShift: "Dinner",
    full: "full",
    seatsLeft: (n) => `${n} left`,
    slotsFailed:
      "Could not load the open times. Please call the restaurant to book.",
    tooSoon: (hours) =>
      `Too close to service — omakase must be booked at least ${hours} ${hours === 1 ? "hour" : "hours"} ahead.`,
    closedAllDay: "The restaurant is not taking guests on this day.",
    closedShift: (shift) => `No ${shift} service on this day.`,
    pickAnotherDay: "Please choose another day.",
    pickTime: "Choose a time.",
    timeNote:
      "The restaurant will call to confirm the exact time after receiving your booking.",
    guests: "Guests",
    seating: "Seating",
    seatingCounter: "Counter",
    seatingCounterHint: (seats) => `${seats} seats`,
    seatingTable: "Table",
    seatingTableHint: "Main room",
    seatingPrivate: "Private room",
    seatingPrivateHint: "On request",
    privateNote:
      "The restaurant will confirm the private room against your party size.",
    contact: "Your details",
    name: "Name",
    namePlaceholder: "Name for the booking",
    phone: "Phone number",
    phonePlaceholder: "0xxx xxx xxx",
    phoneRequired: "A phone number lets the restaurant confirm your booking.",
    phoneInvalid: "That phone number does not look right.",
    dietary: "Allergies / diet",
    dietaryHint: "The kitchen needs to know in advance to swap ingredients.",
    dietaryPlaceholder: "Shellfish allergy, no raw fish",
    note: "Notes",
    notePlaceholder: "Special occasion, seating request, running late…",
    depositLabel: "Deposit",
    noDeposit: "No deposit needed",
    continue: "Continue",
  },

  /* ─────────────── Seat selection ─────────────── */
  seats: {
    title: "Choose your seat",
    intro:
      "This is Miyako's actual counter. Drag to look around, tap the seat you want.",
    needDateTime:
      "Pick a date and time first, then the counter map will appear.",
    dragHint: "Drag to rotate · tap a seat to pick",
    resetView: "Reset view",
    legendFree: "Available",
    legendPremium: "Facing the itamae",
    legendMine: "Your pick",
    legendTaken: "Taken",
    chosen: (n: number, total: number) => `${n} of ${total} seats chosen`,
    alreadyFull: (n: number) =>
      `All ${n} seats are chosen. Deselect one to change your pick.`,
    notEnough: (free: number, guests: number) =>
      `Only ${free} seats are free at this time, not enough for ${guests} guests. Try another time, or call us about table seating.`,
    loadFailed: "Could not load the seating map. Please try again shortly.",
    holdNote:
      "Seats are only held once you send the request. If someone books seconds earlier, we will ask you to pick again.",
    required: (n: number) => `Choose ${n} seats on the counter map.`,
    seatTaken: "That seat was just taken. Please pick another.",
    yourSeats: "Your seats",
    offline:
      "We could not check which seats are free. You can still pick — the restaurant will confirm when they receive your booking.",
  },

  review: {
    title: "Confirm your booking",
    set: "Course",
    kind: "Dining",
    alacarte: "À la carte",
    time: "When",
    guests: "Guests",
    seating: "Seating",
    name: "Booked by",
    phone: "Phone",
    dietary: "Allergies / diet",
    note: "Notes",
    subtotal: "Estimate",
    deposit: (percent) => `${percent}% deposit`,
    noDeposit: "No deposit",
    priceNote: (menuNote) =>
      `${menuNote}. The final bill is settled at the restaurant.`,
    depositNote:
      "The deposit comes straight off your bill. The restaurant will call shortly to confirm and explain how to pay it.",
    submit: "Send booking request",
    edit: "Edit details",
    failed: "The request did not go through. Try again or call the restaurant.",
  },

  success: {
    notFound: "Booking request not found",
    home: "Back to home",
    title: "Booking request sent",
    subtitle:
      "The restaurant will call to confirm. Keep the code below when you get in touch.",
    code: "Booking code",
    time: "When",
    guests: "Guests",
    deposit: "Deposit",
    depositPaid: "paid",
    depositNote: (percent) =>
      `The ${percent}% deposit comes off your bill when you dine.`,
    call: "Call the restaurant",
    message: "Message",
    myReservations: "My bookings",
    changeNote: (hotline) =>
      `To change the time or cancel, open “My bookings” or call ${hotline}.`,
  },

  omakase: {
    jp: "おまかせ",
    title: "Omakase",
    blurb: (seats) =>
      `Omakase means leaving the choice to the chef. Ingredients are picked daily, the courses follow a set order, and each plate is served the moment it is ready. The itamae counter has ${seats} seats, so every seating is booked ahead.`,
    dinnerJp: "夜",
    dinner: "Dinner courses",
    lunchJp: "昼",
    lunch: "Lunch courses",
    listNote: (percent) =>
      `Prices are per guest. Omakase bookings take a ${percent}% deposit. Tell us about allergies or dietary needs in the booking notes so the kitchen can prepare.`,
    notFound: "Course not found",
    counterSeats: (seats) => `Itamae counter, ${seats} seats`,
    coursesJp: "お品書き",
    courses: "The courses",
    menuPending: "The full course list for this seating is being updated.",
    menuPendingCall: (hotline) =>
      `Call ${hotline} and the kitchen will describe what is being served now.`,
    menuPendingShort: "Course list being updated",
    depositNote: (percent, perGuest) =>
      `A ${percent}% deposit is taken at booking — ${perGuest} per guest. Ingredients change daily, and the chef may swap a course for something better that morning.`,
    book: "Book this course",
  },

  reservations: {
    title: "My bookings",
    emptyTitle: "No bookings yet",
    emptyHint: "Book an omakase seating or a table à la carte.",
    book: "Book a table",
    deposit: (amount) => `Deposit ${amount}`,
    depositPaid: " · paid",
    depositUnpaid: " · unpaid",

    detailTitle: "Booking details",
    detailNotFound: "Booking not found",
    backToList: "Back to list",
    code: "Booking code",
    showCode: "Show this code to the staff when you arrive.",
    time: "When",
    guests: "Guests",
    seating: "Seating",
    name: "Booked by",
    phone: "Phone",
    dietary: "Allergies / diet",
    note: "Notes",
    createdAt: "Booked on",
    depositAmount: "Deposit",
    depositStatus: "Deposit status",
    paid: "Paid",
    unpaid: "Not paid",
    callRestaurant: (hotline) => `Call the restaurant · ${hotline}`,
    cancel: "Cancel booking",
    cancelled: "Booking cancelled",
    cancelFailed: "Could not cancel. Please call the restaurant.",
    policyFallback:
      "The restaurant confirms its cancellation and refund terms by phone.",
  },

  favorites: {
    title: "Saved dishes",
    emptyTitle: "Nothing saved yet",
    emptyHint: "Open a dish on the menu and tap the heart.",
    openMenu: "Open menu",
  },

  profile: {
    jp: "マイページ",
    title: "Account",
    guest: "Guest of Miyako",
    signedIn: "Signed in with Zalo",
    signedOut: "Open in Zalo to sync your account",
    myReservations: "My bookings",
    favorites: "Saved dishes",
    about: "About Miyako",
    ordersJp: "注文",
    orders: "Past orders",
    noOrders:
      "No orders yet. Anything you order at the table or ahead of time shows up here.",
    atTable: (table) => `Table ${table}`,
    preOrder: "Pre-order",
    call: "Call the restaurant",
    messageOA: "Message on Zalo",
    directions: "Directions",
  },

  about: {
    title: "About Miyako",
    counterJp: "おまかせ",
    counter: "The omakase counter",
    counterBlurb: (seats) =>
      `The itamae counter seats ${seats}. Guests sit facing the kitchen, and each plate is served the moment it is finished, in the order the chef set for that day.`,
    wagyuJp: "和牛",
    wagyu: "A5 wagyu",
    wagyuBlurb:
      "Miyako serves only certified A5 wagyu, with a certificate of origin for every lot.",
    wetAging: "Wet-aging",
    temperature: "Temperature",
    humidity: "Humidity",
    airflow: "Airflow",
    duration: "Aged for",
    days: (n) => `${n} ${n === 1 ? "day" : "days"}`,
    messageOA: "Message on Zalo",
  },

  deposit: {
    received: "Deposit received",
    receivedHint: "Your table is held. We look forward to seeing you.",
    pendingTitle: "Deposit still to pay",
    pendingHint: (amount) =>
      `A deposit of ${amount} holds your table. The restaurant will call shortly with transfer details.`,
    call: (hotline) => `Call ${hotline}`,
    callShort: "Call",
    qrTitle: "Transfer the deposit to hold your table",
    qrHint:
      "Scan with your banking app — the amount and reference are filled in. This screen updates itself once the transfer lands.",
    qrAlt: (amount) => `QR code to transfer ${amount}`,
    amount: "Amount",
    bank: "Bank",
    account: "Account number",
    accountName: "Account name",
    content: "Reference",
    contentNote: (content) =>
      `Keep the reference ${content} on the transfer. Anything else still reaches the restaurant, it just takes a few minutes to match by hand.`,
    paidButton: "I have transferred",
    notSeenYet:
      "No transfer has come through yet. If you have just sent it, tap “I have transferred”, or check My bookings in a few minutes.",
  },

  errors: {
    offline: "Could not reach the restaurant. Check your connection and try again.",
    noBackend: "Could not reach the restaurant. Please call to book directly.",
    leadTime:
      "This omakase seating needs to be booked further ahead. Please choose another day.",
    pastTime: "That time has already passed. Please choose another.",
    dishUnavailable:
      "A dish in your order has run out. Please check your order again.",
    dishVariant: "A dish in your order still needs a size chosen.",
    reservationNotFound: "No booking found with that code.",
    missingContact: "Please enter your name and phone number.",
    invalidGuests: "That number of guests is not valid.",
    emptyOrder: "Your order is empty.",
  },

  restaurant: {
    menuPriceNote: "Prices in thousands of đồng · VAT not included",
  },
};
