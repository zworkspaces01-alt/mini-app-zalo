import { useSetAtom } from "jotai";
import { useEffect } from "react";

import { fetchContent } from "@/services/content";
import { contentAtom, contentLiveAtom } from "@/state/content";

/**
 * Lấy nội dung mới nhất một lần khi mở app.
 *
 * Thất bại thì im lặng giữ nguyên dữ liệu đóng gói sẵn — khách không cần biết,
 * vì thứ họ đang xem vẫn là thực đơn đúng của lần cập nhật gần nhất.
 */
export function useContentSync() {
  const setContent = useSetAtom(contentAtom);
  const setLive = useSetAtom(contentLiveAtom);

  useEffect(() => {
    let alive = true;
    fetchContent()
      .then((content) => {
        if (!alive || !content) return;
        setContent(content);
        setLive(true);
      })
      .catch(() => {
        /* giữ nguyên dữ liệu đóng gói sẵn */
      });
    return () => {
      alive = false;
    };
  }, [setContent, setLive]);
}
