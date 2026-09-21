import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useNavigate } from "zmp-ui";

import { BrandLogo, SectionTitle, Skeleton } from "@/components/ui";
import { IconChevronRight } from "@/components/ui/icons";
import {
  Icon3DBooking,
  Icon3DChat,
  Icon3DFavorite,
  Icon3DGlobe,
  Icon3DHotline,
  Icon3DInfo,
  Icon3DMapPin,
  Icon3DPoints,
  Icon3DTheme,
} from "@/components/ui/icons-3d";
import { LangButton, LangSheet } from "@/components/ui/lang-switch";
import { ThemeSheet } from "@/components/ui/theme-switch";
import { Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useTheme } from "@/hooks/use-theme";
import { LANGS, useLang, useT, useTr } from "@/i18n";
import { listOrders } from "@/services/api";
import { supabase } from "@/services/supabase";
import { callHotline, chatWithOA, fetchZaloProfile, haptic, openMap } from "@/services/zalo";
import { favoritesAtom, userAtom, userPointsAtom } from "@/state/atoms";
import { dishesByIdAtom } from "@/state/content";
import { Order } from "@/types";
import { formatDateTime, formatNumber, vnd } from "@/utils/format";
import { logoSrc } from "@/utils/images";

function LinkRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3.5 text-left"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      <span className="flex-1 text-[14px]">{label}</span>
      {value && <span className="text-[13px] text-[var(--muted)]">{value}</span>}
      <IconChevronRight size={17} className="text-[var(--faint)]" />
    </button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useAtom(userAtom);
  const points = useAtomValue(userPointsAtom);
  const favorites = useAtomValue(favoritesAtom);
  const dishesById = useAtomValue(dishesByIdAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { themePref } = useTheme();

  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  const themeLabel =
    themePref === "system"
      ? lang === "vi"
        ? "Hệ thống"
        : lang === "ja"
        ? "自動"
        : "System"
      : themePref === "light"
      ? lang === "vi"
        ? "Sáng"
        : lang === "ja"
        ? "ライト"
        : "Light"
      : lang === "vi"
      ? "Tối"
      : lang === "ja"
      ? "ダーク"
      : "Dark";

  useEffect(() => {
    if (!user) fetchZaloProfile().then((p) => p && setUser(p));
  }, [user, setUser]);

  useEffect(() => {
    listOrders().then(setOrders);

    if (!supabase) return;
    const channel = supabase
      .channel("customer-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          listOrders().then(setOrders);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  return (
    <Screen name="profile" pad={false}>
      <div className="sticky-head px-4">
        {/* Hàng trên: Logo nằm ngang cạnh cụm nút Zalo */}
        <div className="zalo-nav-row">
          <BrandLogo
            variant="horizontal"
            className="h-[28px] w-auto object-contain select-none"
          />
        </div>

        {/* Hàng dưới: Tiêu đề Trang cá nhân */}
        <div className="flex h-12 items-center justify-between pb-1.5 pt-0.5">
          <div className="flex-1 min-w-0 pr-2">
            <div className="jp text-[10px] leading-none tracking-[0.25em] text-[var(--faint)] mb-1">
              {t.profile.jp}
            </div>
            <h1 className="font-display text-[20px] font-semibold leading-none whitespace-nowrap overflow-hidden text-ellipsis">
              {t.profile.title}
            </h1>
          </div>
          <LangButton />
        </div>
      </div>

      <div className="page-pad pt-5">
        {/* ── Người dùng ── */}
        <div className="card mb-6 flex items-center gap-3.5 p-4 rounded-2xl border border-[var(--line)] shadow-sm">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="jp flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[20px] text-[var(--faint)]">
              {restaurant.kanji}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-medium">
              {user?.name ?? t.profile.guest}
            </div>
            <div className="text-[12px] text-[var(--muted)]">
              {user ? t.profile.signedIn : t.profile.signedOut}
            </div>
          </div>
        </div>

        {/* ── Thẻ hội viên Miyako VIP Club & Tích điểm ── */}
        <div
          onClick={() => {
            haptic("light");
            navigate("/rewards");
          }}
          className="mb-6 cursor-pointer rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br from-[#2c2009] via-[#1c1404] to-[#0c0902] p-4 text-white shadow-lg shadow-[var(--gold)]/10 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon3DPoints size={34} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold)]">
                    Miyako Club
                  </span>
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 uppercase">
                    {lang === "ja" ? "ゴールド会員" : lang === "en" ? "Gold Tier" : "Hạng Vàng"}
                  </span>
                </div>
                <div className="text-[11.5px] text-[var(--faint)] mt-0.5">
                  {lang === "ja"
                    ? "8%還元 · 優先予約特典"
                    : lang === "en"
                    ? "Earn 8% back · Priority seating"
                    : "Tích luỹ 8% hoá đơn · Ưu tiên đặt bàn"}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-display text-[20px] font-extrabold text-[var(--gold)] leading-none">
                {formatNumber(points)}
              </div>
              <div className="text-[10px] text-[var(--faint)] mt-0.5">{t.rewards.pointsUnit}</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[11.5px]">
            <span className="text-[var(--faint)]">
              {lang === "ja"
                ? "プラチナ会員まであと750pt"
                : lang === "en"
                ? "750 pts to Platinum Tier"
                : "Còn 750 điểm để lên Hạng Bạch Kim"}
            </span>
            <div className="flex items-center gap-0.5 font-bold text-[var(--gold)]">
              <span>{lang === "ja" ? "特典と交換" : lang === "en" ? "Redeem rewards" : "Đổi quà & Ưu đãi"}</span>
              <IconChevronRight size={13} />
            </div>
          </div>
        </div>

        {/* ── Lối tắt ── */}
        <div className="card mb-7 divide-y divide-[var(--line)] px-4 rounded-2xl border border-[var(--line)] shadow-sm">
          <LinkRow
            icon={<Icon3DPoints size={22} />}
            label={lang === "ja" ? "ポイント＆会員特典" : lang === "en" ? "Loyalty Points & Benefits" : "Tích điểm & Đặc quyền hội viên"}
            value={`${formatNumber(points)} ${t.rewards.pts}`}
            onClick={() => navigate("/rewards")}
          />
          <LinkRow
            icon={<Icon3DBooking size={22} />}
            label={t.profile.myReservations}
            onClick={() => navigate("/reservations")}
          />
          <LinkRow
            icon={<Icon3DFavorite size={22} />}
            label={t.profile.favorites}
            value={favorites.length ? String(favorites.length) : undefined}
            onClick={() => navigate("/favorites")}
          />
          <LinkRow
            icon={<Icon3DGlobe size={22} />}
            label={t.lang.title}
            value={currentLang.label}
            onClick={() => setLangOpen(true)}
          />
          <LinkRow
            icon={<Icon3DTheme size={22} />}
            label={
              lang === "vi" ? "Giao diện" : lang === "ja" ? "外観・テーマ" : "Theme"
            }
            value={themeLabel}
            onClick={() => setThemeOpen(true)}
          />
          <LinkRow
            icon={<Icon3DInfo size={22} />}
            label={t.profile.about}
            onClick={() => navigate("/about")}
          />
        </div>

        {/* ── Đơn đã gọi ── */}
        <section className="mb-7">
          <SectionTitle jp={t.profile.ordersJp} title={t.profile.orders} />
          {orders === null ? (
            <Skeleton className="h-20 w-full rounded-card" />
          ) : orders.length === 0 ? (
            <div className="card p-4 text-[13px] text-[var(--muted)]">
              {t.profile.noOrders}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[15px] tracking-wide">
                      {o.code}
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums">
                      {vnd(o.subtotal, lang)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--muted)]">
                    <span>
                      {o.mode === "dine-in"
                        ? t.profile.atTable(o.tableId ?? "")
                        : o.mode === "takeout"
                        ? (lang === "ja" ? "🏪 テイクアウト" : lang === "en" ? "🏪 Takeout" : "🏪 Mang về")
                        : o.mode === "delivery"
                        ? (lang === "ja" ? "🛵 スピード配達" : lang === "en" ? "🛵 Delivery" : "🛵 Giao tận nơi")
                        : t.profile.preOrder}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(o.createdAt, lang)}</span>
                    <span
                      className={`ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide ${
                        o.status === "completed" || o.status === "served"
                          ? "bg-[var(--jade-dim)] text-[var(--jade)]"
                          : o.status === "delivering"
                          ? "bg-sky-500/15 text-sky-700 [html.theme-dark_&]:text-sky-300"
                          : o.status === "cancelled"
                          ? "bg-[var(--shu-dim)] text-[var(--shu)]"
                          : "bg-[var(--gold-dim)] text-[var(--gold)]"
                      }`}
                    >
                      {o.status === "completed" || o.status === "served"
                        ? (lang === "ja" ? "完了" : lang === "en" ? "Completed" : "Hoàn tất")
                        : o.status === "delivering"
                        ? (lang === "ja" ? "配達中" : lang === "en" ? "Delivering" : "Đang giao")
                        : o.status === "preparing"
                        ? (lang === "ja" ? "調理中" : lang === "en" ? "Preparing" : "Đang làm")
                        : o.status === "cancelled"
                        ? (lang === "ja" ? "キャンセル" : lang === "en" ? "Cancelled" : "Đã huỷ")
                        : (lang === "ja" ? "確認中" : lang === "en" ? "Pending" : "Chờ xác nhận")}
                    </span>
                  </div>
                  {o.deliveryAddress && (
                    <div className="mt-1 truncate text-[11.5px] text-[var(--muted)]">
                      📍 {o.deliveryAddress}
                    </div>
                  )}
                  <div className="mt-2 text-[13px] text-[var(--muted)]">
                    {o.lines
                      .map((l) => {
                        const dish = dishesById[l.dishId];
                        return `${l.qty}× ${tr.text(
                          dish,
                          "name",
                          dish?.name ?? l.name
                        )}${l.variantLabel ? ` (${l.variantLabel})` : ""}`;
                      })
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Liên hệ ── */}
        <section className="mb-7">
          <SectionTitle jp={t.common.contactJp} title={t.common.contact} />
          <div className="card divide-y divide-[var(--line)] px-4 rounded-2xl border border-[var(--line)] shadow-sm">
            <LinkRow
              icon={<Icon3DHotline size={22} />}
              label={t.profile.call}
              value={restaurant.hotline ?? undefined}
              onClick={() => callHotline(restaurant.hotline)}
            />
            {restaurant.oaId && (
              <LinkRow
                icon={<Icon3DChat size={22} />}
                label={t.profile.messageOA}
                onClick={() => chatWithOA(restaurant.oaId)}
              />
            )}
            <LinkRow
              icon={<Icon3DMapPin size={22} />}
              label={t.profile.directions}
              value={restaurant.address ?? undefined}
              onClick={() => openMap(`Miyako ${restaurant.address}`)}
            />
          </div>
        </section>

        <div className="flex flex-col items-center pb-6 pt-2">
          <BrandLogo className="mb-2 h-12 w-auto opacity-40" />
          <p className="text-[11px] text-[var(--faint)]">
            {restaurant.tagline}
          </p>
        </div>
      </div>

      <LangSheet open={langOpen} onClose={() => setLangOpen(false)} />
      <ThemeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />
    </Screen>
  );
}
