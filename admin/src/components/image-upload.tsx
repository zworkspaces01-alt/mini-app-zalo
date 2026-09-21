import { useRef, useState } from "react";

import { IconCamera, IconClose, IconRefresh } from "@/components/icons";
import { uploadImage } from "@/lib/storage";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  folder?: "dishes" | "omakase" | "banners" | "categories" | "rewards" | "content";
  label?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder = "dishes",
  label = "Hình ảnh",
  className = "",
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Dung lượng ảnh tối đa 5MB");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await uploadImage(file, folder);
    setLoading(false);

    if (res.error || !res.url) {
      setError(res.error || "Tải ảnh thất bại");
    } else {
      onChange(res.url);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-[13px] font-medium text-washi">{label}</label>}

      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface2">
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              title="Xoá ảnh"
            >
              <IconClose size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-muted transition hover:border-line2 hover:bg-surface2 hover:text-washi"
          >
            {loading ? (
              <span className="spin inline-block h-5 w-5 rounded-full border-2 border-current/25 border-t-current" />
            ) : (
              <>
                <IconCamera size={24} />
                <span className="mt-1 text-[11px]">Tải ảnh</span>
              </>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface2 px-3 text-[13px] text-washi transition hover:bg-surface3"
            >
              {loading ? (
                <>
                  <IconRefresh size={14} className="spin" /> Đang tải...
                </>
              ) : (
                <>
                  <IconCamera size={14} /> {value ? "Đổi ảnh" : "Chọn tệp"}
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-faint">
            PNG, JPG, WEBP tối đa 5MB. Ảnh sẽ được lưu trữ tự động trên Supabase.
          </div>

          {error && <div className="text-[12px] text-shu">{error}</div>}
        </div>
      </div>
    </div>
  );
}
