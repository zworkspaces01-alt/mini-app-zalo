import { useAtomValue } from "jotai";
import { useNavigate } from "zmp-ui";

import { IconCart, IconChevronRight } from "@/components/ui/icons";
import { useLang, useT } from "@/i18n";
import { haptic } from "@/services/zalo";
import { cartCountAtom, cartSubtotalAtom } from "@/state/atoms";
import { vnd } from "@/utils/format";

/** Thanh giỏ nổi — chỉ hiện khi đã chọn món. */
export default function CartBar() {
  const navigate = useNavigate();
  const count = useAtomValue(cartCountAtom);
  const subtotal = useAtomValue(cartSubtotalAtom);
  const t = useT();
  const lang = useLang();

  if (count === 0) return null;

  return (
    <div className="cart-bar rise">
      <button
        onClick={() => {
          haptic("light");
          navigate("/cart");
        }}
        className="flex w-full items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#b51810] via-[var(--shu)] to-[#e82c22] p-1.5 pl-2 pr-2.5 text-white shadow-[0_12px_28px_-4px_rgba(226,35,26,0.45),0_4px_12px_rgba(0,0,0,0.2)] border border-white/20 active:scale-[0.98] transition-all"
      >
        {/* Khối icon giỏ hàng tròn nổi bật */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-inner">
            <IconCart size={20} className="text-white drop-shadow-sm" />
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-[var(--shu)] shadow-md">
              {count > 99 ? "99+" : count}
            </span>
          </div>

          <div className="text-left min-w-0">
            <div className="text-[13.5px] font-bold text-white leading-tight">
              {t.cart.view}
            </div>
            <div className="text-[11px] text-white/80 font-medium leading-tight mt-0.5">
              {t.common.dishes(count)}
            </div>
          </div>
        </div>

        {/* Khối giá tiền & mũi tên dạng pill sang trọng */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/20 backdrop-blur-md px-3.5 py-1.5 border border-white/20 shadow-sm shrink-0">
          <span className="text-[14px] font-bold tabular-nums text-white">
            {vnd(subtotal, lang)}
          </span>
          <IconChevronRight size={14} className="text-white/80 shrink-0" />
        </div>
      </button>
    </div>
  );
}
