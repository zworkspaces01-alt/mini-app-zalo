import { useNavigate } from "zmp-ui";

import { IconChevronRight } from "@/components/ui/icons";
import { courseCount, serviceLabelLong } from "@/data/omakase";
import { useLang, useT, useTr } from "@/i18n";
import { OmakaseSet } from "@/types";
import { vnd } from "@/utils/format";
import { img } from "@/utils/images";

export default function OmakaseCard({ set }: { set: OmakaseSet }) {
  const navigate = useNavigate();
  const photo = img(set.image);
  const n = courseCount(set);
  const t = useT();
  const tr = useTr();
  const lang = useLang();

  const name = tr.text(set, "name", set.name);
  const subtitle = tr.text(set, "subtitle", set.subtitle);

  return (
    <button
      onClick={() => navigate(`/omakase/${set.id}`)}
      className="card w-full overflow-hidden text-left rounded-2xl border border-[var(--line)] shadow-sm active:scale-[0.99] transition-all"
    >
      {photo && (
        <div className="relative h-36 w-full overflow-hidden hero-fade">
          <img
            src={photo}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {set.jp && (
              <div className="jp mb-1 text-[12px] tracking-[0.2em] text-[var(--gold)]">
                {set.jp}
              </div>
            )}
            <div className="font-display text-[18px] leading-tight">
              {name}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-[12px] italic text-[var(--muted)]">
                {subtitle}
              </div>
            )}
          </div>
          <IconChevronRight size={18} className="mt-1 text-[var(--faint)]" />
        </div>

        <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--muted)]">
          <span>{serviceLabelLong(set.service, t)}</span>
          {n > 0 && (
            <>
              <span className="text-[var(--surface-3)]">·</span>
              <span>{t.common.dishes(n)}</span>
            </>
          )}
          {set.menuPending && (
            <>
              <span className="text-[var(--surface-3)]">·</span>
              <span className="text-[var(--faint)]">
                {t.omakase.menuPendingShort}
              </span>
            </>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="font-display text-[20px] tabular-nums text-[var(--gold)]">
            {vnd(set.price, lang)}
          </span>
          <span className="text-[12px] text-[var(--faint)]">
            {t.common.perGuest}
          </span>
        </div>
      </div>
    </button>
  );
}
