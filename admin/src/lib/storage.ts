import { supabase } from "./supabase";

const BUCKET = "miyako-assets";

interface CloudinarySignature {
  cloud_name: string;
  api_key: string;
  folder: string;
  timestamp: number;
  signature: string;
}

/**
 * Xin chữ ký tải ảnh từ Edge Function `cloudinary-sign`.
 *
 * API secret của Cloudinary chỉ nằm trên máy chủ, không bao giờ ở trình
 * duyệt. Hàm chưa deploy hoặc chưa cấu hình thì trả null để lùi về Supabase.
 */
async function signCloudinaryUpload(folder: string): Promise<CloudinarySignature | null> {
  const { data, error } = await supabase.functions.invoke("cloudinary-sign", {
    body: { folder },
  });
  if (error || !data?.signature) {
    console.warn("Không xin được chữ ký Cloudinary, dùng Supabase Storage:", error ?? data);
    return null;
  }
  return data as CloudinarySignature;
}

/**
 * Tải file ảnh lên Cloudinary CDN hoặc Supabase Storage
 * Trả về đường dẫn ảnh công khai (secure_url / publicUrl)
 */
export async function uploadImage(
  file: File,
  folder: "dishes" | "omakase" | "banners" | "categories" | "rewards" | "content" = "dishes"
): Promise<{ url: string | null; error: string | null }> {
  // 1. Ưu tiên Cloudinary nếu máy chủ ký được
  try {
    const signed = await signCloudinaryUpload(folder);
    if (signed) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signed.api_key);
      formData.append("timestamp", String(signed.timestamp));
      formData.append("folder", signed.folder);
      formData.append("signature", signed.signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`,
        { method: "POST", body: formData }
      );

      if (res.ok) {
        const data = await res.json();
        return { url: data.secure_url, error: null };
      }

      const errData = await res.json().catch(() => ({}));
      console.warn("Cloudinary upload failed, falling back to Supabase:", errData);
    }
  } catch (err) {
    console.warn("Cloudinary error, fallback to Supabase:", err);
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
