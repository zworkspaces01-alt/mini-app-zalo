import { supabase } from "./supabase";

const BUCKET = "miyako-assets";

/**
 * Tải file ảnh lên Supabase Storage
 * Trả về public URL
 */
export async function uploadImage(
  file: File,
  folder: "dishes" | "omakase" | "banners" | "categories" = "dishes"
): Promise<{ url: string | null; error: string | null }> {
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
 * Xoá file ảnh khỏi Supabase Storage từ public URL
 */
export async function deleteImage(publicUrl: string): Promise<boolean> {
  try {
    const match = publicUrl.match(new RegExp(`${BUCKET}/(.+)`));
    if (!match?.[1]) return false;
    const path = decodeURIComponent(match[1]);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}
