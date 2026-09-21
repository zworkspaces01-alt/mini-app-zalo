import { useState, useEffect, useRef, useCallback } from "react";

interface UseScrollSearchBarOptions {
  /** Khoảng cách từ đỉnh trang (px) mà thanh search luôn luôn hiển thị */
  topThreshold?: number;
  /** Độ dịch chuyển cuộn tích luỹ tối thiểu (px) để kích hoạt ẩn/hiện */
  deltaThreshold?: number;
  /** Thời gian dừng cuộn (ms) để tự động hiện lại thanh tìm kiếm */
  idleDelay?: number;
  /** Từ khoá tìm kiếm (giữ tương thích tham số, không chặn ẩn khi cuộn) */
  activeQuery?: string;
  /** Giữ thanh search hiển thị khi có từ khoá (mặc định: false để luôn ẩn khi kéo xuống) */
  keepVisibleWhenQuery?: boolean;
}

/**
 * Hook điều khiển ẩn thanh tìm kiếm khi người dùng cuộn/kéo xuống,
 * và tự động hiện lại khi người dùng dừng lại hoặc cuộn ngược lên trên.
 * Áp dụng cơ chế khoá chống giật/nháy (layout-shift protection) triệt để.
 */
export function useScrollSearchBar({
  topThreshold = 25,
  deltaThreshold = 12,
  idleDelay = 300,
  activeQuery = "",
  keepVisibleWhenQuery = false,
}: UseScrollSearchBarOptions = {}) {
  const [isScrollVisible, setIsScrollVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cờ khoá chống nháy: khi thanh search đang trượt mở lại, bỏ qua các scroll event do đổi chiều cao header
  const isRevealingRef = useRef(false);
  const revealingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchingRef = useRef(false);

  // Tìm vị trí scrollTop thực tế của container đang cuộn (ZMP Page / zaui-page / window)
  const getScrollPosition = useCallback((target: EventTarget | null): number | null => {
    // 1. Nếu target là HTMLElement có cuộn dọc (như .zaui-page)
    if (target instanceof HTMLElement) {
      if (target.scrollHeight > target.clientHeight + 10) {
        return target.scrollTop;
      }
    }

    // 2. Kiểm tra phần tử .zaui-page hoặc .page-scroll chuẩn của ZMP
    const zauiPage = document.querySelector(".zaui-page") as HTMLElement | null;
    if (zauiPage && zauiPage.scrollHeight > zauiPage.clientHeight + 10) {
      return zauiPage.scrollTop;
    }

    const pageScroll = document.querySelector(".page-scroll") as HTMLElement | null;
    if (pageScroll && pageScroll.scrollHeight > pageScroll.clientHeight + 10) {
      return pageScroll.scrollTop;
    }

    // 3. Fallback cho Window / Document
    return (
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }, []);

  // Hàm mở lại thanh search có kèm cờ khoá chống layout-shift nháy nháy
  const startReveal = useCallback(() => {
    setIsScrollVisible((prev) => {
      if (!prev) {
        isRevealingRef.current = true;
        if (revealingTimerRef.current) {
          clearTimeout(revealingTimerRef.current);
        }
        revealingTimerRef.current = setTimeout(() => {
          const current = getScrollPosition(null);
          if (current !== null) {
            lastScrollY.current = Math.max(0, current);
          }
          isRevealingRef.current = false;
        }, 360);
        return true;
      }
      return prev;
    });
    accumulatedDelta.current = 0;
  }, [getScrollPosition]);

  const handleScroll = useCallback(
    (e?: Event | React.UIEvent<HTMLElement>) => {
      // Khi đang focus gõ phím vào input, không ẩn thanh search
      if (isFocused) {
        setIsScrollVisible(true);
        return;
      }

      const target = (e as any)?.nativeEvent?.target ?? (e as any)?.target ?? null;
      const currentScrollY = getScrollPosition(target);
      if (currentScrollY === null) return;

      // Nếu đang trong tiến trình mở rộng thanh search, bỏ qua để tránh vòng lặp layout-shift
      if (isRevealingRef.current) {
        lastScrollY.current = Math.max(0, currentScrollY);
        accumulatedDelta.current = 0;
        return;
      }

      // Xoá timer phát hiện dừng cuộn trước đó
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }

      // Ở gần đỉnh trang: luôn luôn hiển thị cố định
      if (currentScrollY <= topThreshold) {
        setIsScrollVisible(true);
        lastScrollY.current = Math.max(0, currentScrollY);
        accumulatedDelta.current = 0;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      // Bỏ qua nếu không có dịch chuyển
      if (diff === 0) return;

      // Reset tích luỹ nếu người dùng đổi chiều cuộn
      if (
        (diff > 0 && accumulatedDelta.current < 0) ||
        (diff < 0 && accumulatedDelta.current > 0)
      ) {
        accumulatedDelta.current = 0;
      }

      accumulatedDelta.current += diff;

      // Kéo/cuộn xuống (scrolling down) đủ ngưỡng -> ẩn thanh search
      if (accumulatedDelta.current >= deltaThreshold) {
        setIsScrollVisible(false);
        accumulatedDelta.current = 0;
      }
      // Cuộn ngược lên trên (scrolling up) đủ ngưỡng -> hiện lại thanh search ngay
      else if (accumulatedDelta.current <= -deltaThreshold) {
        setIsScrollVisible(true);
        accumulatedDelta.current = 0;
      }

      // Khi người dùng dừng lại (không phát sinh scroll sau idleDelay ms) -> tự động hiện lại
      idleTimer.current = setTimeout(() => {
        startReveal();
      }, idleDelay);
    },
    [getScrollPosition, isFocused, topThreshold, deltaThreshold, idleDelay, startReveal]
  );

  const handleScrollEnd = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    startReveal();
  }, [startReveal]);

  useEffect(() => {
    const onScrollCapture = (e: Event) => {
      handleScroll(e);
    };

    const onTouchStart = () => {
      isTouchingRef.current = true;
      // Người dùng chủ động chạm ngón tay vào màn hình -> giải phóng khoá để có thể ẩn ngay khi kéo
      isRevealingRef.current = false;
      if (revealingTimerRef.current) {
        clearTimeout(revealingTimerRef.current);
        revealingTimerRef.current = null;
      }
    };

    const onTouchEnd = () => {
      isTouchingRef.current = false;
    };

    window.addEventListener("scroll", onScrollCapture, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scrollend", handleScrollEnd, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchend", onTouchEnd, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchcancel", onTouchEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", onScrollCapture, { capture: true });
      window.removeEventListener("scrollend", handleScrollEnd, {
        capture: true,
      });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (revealingTimerRef.current) clearTimeout(revealingTimerRef.current);
    };
  }, [handleScroll, handleScrollEnd]);

  // Thanh search hiển thị khi: đang ở trạng thái hiện, hoặc input đang focus, hoặc tuỳ chọn keepVisibleWhenQuery
  const isSearchVisible =
    isScrollVisible ||
    isFocused ||
    (keepVisibleWhenQuery ? Boolean(activeQuery?.trim()) : false);

  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(false), []);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      handleScroll(e);
    },
    [handleScroll]
  );

  return {
    isSearchVisible,
    isFocused,
    setIsFocused,
    onScroll,
    inputProps: {
      onFocus,
      onBlur,
    },
    // Style hiệu ứng mượt mà chuẩn TMĐT cho container của thanh search
    searchContainerStyle: {
      maxHeight: isSearchVisible ? "48px" : "0px",
      marginTop: isSearchVisible ? "6px" : "0px",
      opacity: isSearchVisible ? 1 : 0,
      transform: isSearchVisible ? "translateY(0)" : "translateY(-6px)",
      overflow: isSearchVisible ? ("visible" as const) : ("hidden" as const),
      pointerEvents: isSearchVisible ? ("auto" as const) : ("none" as const),
      overflowAnchor: "none" as const,
      transition:
        "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, transform 0.26s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
      willChange: "max-height, opacity, transform",
    },
  };
}
