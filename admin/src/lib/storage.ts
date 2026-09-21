import { supabase } from "./supabase";

const BUCKET = "miyako-assets";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;

/**
 * Tính mã băm SHA-1 bằng Web Crypto API tiêu chuẩn của trình duyệt
 */
async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-1", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Tải file ảnh lên Cloudinary CDN hoặc Supabase Storage
 * Trả về đường dẫn ảnh công khai (secure_url / publicUrl)
 */
export async function uploadImage(
  file: File,
  folder: "dishes" | "omakase" | "banners" | "categories" | "rewards" = "dishes"
): Promise<{ url: string | null; error: string | null }> {
  // 1. Ưu tiên Cloudinary nếu có cấu hình
  if (CLOUD_NAME && API_KEY && API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const targetFolder = `miyako/${folder}`;
      const toSign = `folder=${targetFolder}&timestamp=${timestamp}${API_SECRET}`;
      const signature = await sha1(toSign);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", API_KEY);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", targetFolder);
      formData.append("signature", signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return { url: data.secure_url, error: null };
      }

      const errData = await res.json().catch(() => ({}));
      console.warn("Cloudinary upload failed, falling back to Supabase:", errData);
    } catch (err) {
      console.warn("Cloudinary error, fallback to Supabase:", err);
    }
  }

  // 2. Fallback sang Supabase Storage bucket miyako-assets
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return { url: data.publicUrl, error: null };
  } catch (err: unknown) {
    return { url: null, error: err instanceof Error ? err.message : "Lỗi tải ảnh" };
  }
}

/**
 * Xoá file ảnh khỏi Supabase Storage từ public URL (nếu dùng Supabase)
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
  try {
    if (!publicUrl.includes(BUCKET)) return true; // Nếu là ảnh Cloudinary hoặc bên ngoài thì bỏ qua
    const match = publicUrl.match(new RegExp(`${BUCKET}/(.+)`));
    if (!match?.[1]) return false;
    const path = decodeURIComponent(match[1]);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}
