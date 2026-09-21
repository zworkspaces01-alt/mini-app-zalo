import { useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";

import BottomNav from "@/components/nav/bottom-nav";
import AboutPage from "@/pages/about";
import BookingPage from "@/pages/booking";
import BookingReviewPage from "@/pages/booking/review";
import BookingSuccessPage from "@/pages/booking/success";
import ButcherPage from "@/pages/butcher";
import CartPage from "@/pages/cart";
import FavoritesPage from "@/pages/favorites";
import HomePage from "@/pages/home";
import MenuPage from "@/pages/menu";
import OmakasePage from "@/pages/omakase";
import OmakaseDetailPage from "@/pages/omakase/detail";
import ProfilePage from "@/pages/profile";
import ReservationDetailPage from "@/pages/reservations/detail";
import ReservationsPage from "@/pages/reservations";
import RewardsPage from "@/pages/rewards";
import { useContentSync } from "@/hooks/use-content-sync";
import { routeParams } from "@/services/zalo";
import { pruneCartAtom, tableIdAtom } from "@/state/atoms";

/** Đọc deep link khi app mở từ QR trên bàn: ...&table=A3 */
function useTableFromDeepLink() {
  const setTableId = useSetAtom(tableIdAtom);
  useEffect(() => {
    const params = routeParams();
    const table = params.table ?? params.ban;
    if (table) setTableId(table);
  }, [setTableId]);
}

function useCartHousekeeping() {
  const prune = useSetAtom(pruneCartAtom);
  useEffect(() => {
    prune();
  }, [prune]);
}

function Shell() {
  useTableFromDeepLink();
  useCartHousekeeping();
  useContentSync();

  return (
    <>
      <AnimationRoutes>
        <Route path="/" element={<HomePage />} />
        <Route path="/omakase" element={<OmakasePage />} />
        <Route path="/omakase/:id" element={<OmakaseDetailPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/butcher" element={<ButcherPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/review" element={<BookingReviewPage />} />
        <Route path="/booking/success/:code" element={<BookingSuccessPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/reservations/:code" element={<ReservationDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/about" element={<AboutPage />} />
      </AnimationRoutes>
      <BottomNav />
    </>
  );
}

import { useTheme } from "@/hooks/use-theme";

/** App tự động chuyển đổi sáng / tối theo hệ thống thiết bị. */
export default function Layout() {
  const { theme } = useTheme();

  return (
    <App theme={theme}>
      <SnackbarProvider>
        <ZMPRouter>
          <Shell />
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
}
