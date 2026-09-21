/**
 * Bọc các API của zmp-sdk.
 *
 * Mọi hàm đều nuốt lỗi và trả về giá trị an toàn, vì app còn phải chạy
 * được trong trình duyệt khi dev (nơi không có cầu nối Zalo).
 */
import {
  followOA,
  getPhoneNumber,
  getRouteParams,
  getSystemInfo,
  getUserInfo,
  openChat,
  openOutApp,
  openPhone,
  openShareSheet,
  openWebview,
  scanQRCode,
  vibrate,
} from "zmp-sdk";

import { RESTAURANT } from "@/config/restaurant";
import { UserProfile } from "@/types";

export const inZalo = (): boolean => {
  try {
    const { platform } = getSystemInfo();
    return platform === "android" || platform === "iOS";
  } catch {
    return false;
  }
};

/**
 * Ngôn ngữ máy khách đang dùng, ví dụ "vi", "ja", "en-US".
 *
 * Zalo trả về ngôn ngữ người dùng đặt trong app; chạy ngoài Zalo thì lấy
 * của trình duyệt. Không đọc được thì trả mảng rỗng để bên gọi tự quyết.
 */
export function systemLanguages(): string[] {
  const tags: string[] = [];
  try {
    const info = getSystemInfo() as { language?: string };
    if (info?.language) tags.push(info.language);
  } catch {
    /* ngoài Zalo */
  }
  if (typeof navigator !== "undefined") {
    if (navigator.language) tags.push(navigator.language);
    for (const tag of navigator.languages ?? []) tags.push(tag);
  }
  return tags;
}

export async function fetchZaloProfile(): Promise<UserProfile | null> {
  try {
    const res: any = await getUserInfo({ autoRequestPermission: true });
    const u = res?.userInfo ?? res;
    if (!u) return null;
    return { id: u.id, name: u.name, avatar: u.avatar };
  } catch {
    return null;
  }
}

/**
 * Trả về token số điện thoại. Token này PHẢI được gửi lên backend để đổi
 * lấy số thật qua Open API của Zalo — không giải mã được ở phía client.
 */
export async function requestPhoneToken(): Promise<string | null> {
  try {
    const res: any = await getPhoneNumber();
    return res?.token ?? null;
  } catch {
    return null;
  }
}

export async function callHotline(phone?: string): Promise<boolean> {
  const number = phone || RESTAURANT.hotline;
  if (!number) return false;

  if (inZalo()) {
    try {
      await openPhone({ phoneNumber: number });
      return true;
    } catch {
      /* Fallback qua tel protocol nếu openPhone lỗi */
    }
  }

  if (typeof window !== "undefined") {
    try {
      const a = document.createElement("a");
      a.href = `tel:${number}`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      window.location.href = `tel:${number}`;
      return true;
    }
  }
  return false;
}

export async function chatWithOA(
  oaId?: string | null,
  message?: string
): Promise<boolean> {
  const id = oaId || RESTAURANT.oaId;
  if (!id) return false;
  try {
    await openChat({ type: "oa", id, message });
    return true;
  } catch {
    return false;
  }
}

export async function followRestaurantOA(
  oaId?: string | null
): Promise<boolean> {
  const id = oaId || RESTAURANT.oaId;
  if (!id) return false;
  try {
    await followOA({ id });
    return true;
  } catch {
    return false;
  }
}

export async function share(input: {
  path: string;
  title: string;
  description: string;
  /** Ảnh xem trước — Zalo bắt buộc với deep link. */
  thumbnail: string;
}) {
  try {
    await openShareSheet({
      type: "zmp_deep_link",
      data: {
        title: input.title,
        description: input.description,
        path: input.path,
        thumbnail: input.thumbnail,
      },
    });
  } catch {
    /* người dùng huỷ hoặc đang chạy ngoài Zalo */
  }
}

export async function openMap(query: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (inZalo()) {
    try {
      await openOutApp({ url });
      return;
    } catch {
      try {
        await openWebview({ url });
        return;
      } catch {
        /* Fallback tiếp tục */
      }
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function scanTableQR(): Promise<string | null> {
  try {
    const res: any = await scanQRCode();
    return res?.content ?? null;
  } catch {
    return null;
  }
}

/** Tham số deep link, ví dụ mở app từ QR trên bàn: ?table=A3 */
export function routeParams(): Record<string, string> {
  try {
    return getRouteParams() ?? {};
  } catch {
    return {};
  }
}

/** Rung phản hồi xúc giác nhẹ (Haptic feedback) cho các tương tác chạm quan trọng. */
export function haptic(type: "light" | "medium" | "heavy" = "light") {
  try {
    vibrate?.();
  } catch {
    /* Ngoài môi trường Zalo */
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(type === "light" ? 12 : 25);
    }
  }
}
