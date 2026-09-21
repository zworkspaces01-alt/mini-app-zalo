import { useState, useEffect, useRef, useCallback } from "react";

interface UseScrollSearchBarOptions {
  /** Khoảng cách từ đỉnh trang (px) mà thanh search luôn luôn hiển thị */
  topThreshold?: number;
  /** Độ dịch chuyển cuộn tối thiểu (px) để kích hoạt ẩn/hiện */
  deltaThreshold?: number;
  /** Thời gian dừng cuộn (ms) để tự động hiện lại thanh tìm kiếm */
  idleDelay?: number;
  /** Từ khoá tìm kiếm đang có trong ô search (nếu có thì không ẩn) */
  activeQuery?: string;
}

/**
 * Hook điều khiển ẩn thanh tìm kiếm khi người dùng cuộn/kéo xuống,
 * và tự động hiện lại khi người dùng dừng cuộn hoặc cuộn ngược lên trên.
 */
export function useScrollSearchBar({
  topThreshold = 35,
  deltaThreshold = 6,
  idleDelay = 260,
  activeQuery = "",
}: UseScrollSearchBarOptions = {}) {
  const [isScrollVisible, setIsScrollVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const lastScrollY = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tìm scrollTop của container đang cuộn
  const getScrollPosition = useCallback((target: EventTarget | null): number | null => {
    // 1. Nếu sự kiện đến từ Window hoặc Document
    if (
      target === window ||
      target === document ||
      target === document.documentElement ||
      target === document.body
    ) {
      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    }

    // 2. Nếu target là HTMLElement, kiểm tra xem có cuộn dọc không
    if (target instanceof HTMLElement) {
      // Bỏ qua các container chỉ cuộn ngang (như danh mục món, banner)
      if (target.scrollHeight > target.clientHeight + 10) {
        return target.scrollTop;
      }
    }

    // 3. Fallback: kiểm tra .zaui-page hoặc .page-scroll nếu target chưa rõ
    const zauiPage = document.querySelector(".zaui-page");
    if (zauiPage && zauiPage.scrollHeight > zauiPage.clientHeight + 10) {
      return zauiPage.scrollTop;
    }

    return null;
  }, []);

  const handleScroll = useCallback(
    (e: Event) => {
      const currentScrollY = getScrollPosition(e.target);
      if (currentScrollY === null) return;

      const delta = currentScrollY - lastScrollY.current;

      // Xoá timer phát hiện dừng cuộn trước đó
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }

      // Ở gần đỉnh trang: luôn luôn hiển thị
      if (currentScrollY <= topThreshold) {
        setIsScrollVisible(true);
      } else if (delta > deltaThreshold) {
        // Kéo/cuộn xuống (scrolling down) -> ẩn thanh search
        setIsScrollVisible(false);
      } else if (delta < -deltaThreshold) {
        // Cuộn ngược lên trên (scrolling up) -> hiện lại thanh search ngay
        setIsScrollVisible(true);
      }

      lastScrollY.current = Math.max(0, currentScrollY);

      // Khi người dùng dừng lại (không phát sinh scroll sau idleDelay ms) -> hiện lại
      idleTimer.current = setTimeout(() => {
        setIsScrollVisible(true);
      }, idleDelay);
    },
    [getScrollPosition, topThreshold, deltaThreshold, idleDelay]
  );

  const handleScrollEnd = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    setIsScrollVisible(true);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scrollend", handleScrollEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("scrollend", handleScrollEnd, {
        capture: true,
      });
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [handleScroll, handleScrollEnd]);

  // Giữ thanh search hiển thị nếu người dùng đang focus hoặc đang có chuỗi tìm kiếm
  const isSearchVisible =
    isScrollVisible || isFocused || Boolean(activeQuery?.trim());

  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => setIsFocused(false), []);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      handleScroll(e.nativeEvent);
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
    // Style tiện ích sẵn cho container của thanh search
    searchContainerStyle: {
      maxHeight: isSearchVisible ? "52px" : "0px",
      marginTop: isSearchVisible ? "6px" : "0px",
      opacity: isSearchVisible ? 1 : 0,
      transform: isSearchVisible ? "translateY(0)" : "translateY(-6px)",
      overflow: isSearchVisible ? ("visible" as const) : ("hidden" as const),
      pointerEvents: isSearchVisible ? ("auto" as const) : ("none" as const),
      transition:
        "max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease, transform 0.26s ease, margin-top 0.28s ease",
    },
  };
}
