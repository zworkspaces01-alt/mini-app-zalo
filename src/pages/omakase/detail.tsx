import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useParams } from "zmp-ui";

import { Button, EmptyState, Note } from "@/components/ui";
import { BackHeader, Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { courseCount, serviceLabelLong } from "@/data/omakase";
import { useLang, useT, useTr } from "@/i18n";
import { patchBookingAtom } from "@/state/atoms";
import { omakaseByIdAtom } from "@/state/content";
import { vnd } from "@/utils/format";
import { img } from "@/utils/images";

export default function OmakaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patchBooking = useSetAtom(patchBookingAtom);
  const omakaseById = useAtomValue(omakaseByIdAtom);
  const restaurant = useRestaurant();
  const t = useT();
  const tr = useTr();
  const lang = useLang();

  const set = id ? omakaseById[id] : undefined;

  if (!set) {
    return (
      <Screen name="omakase-detail">
        <BackHeader title={t.omakase.title} />
        <EmptyState kanji="無" title={t.omakase.notFound} />
      </Screen>
    );
  }

  const photo = img(set.image);
  const n = courseCount(set);
  const name = tr.text(set, "name", set.name);
  const subtitle = tr.text(set, "subtitle", set.subtitle);
  const description = tr.text(set, "description", set.description);

  const book = () => {
    patchBooking({
      purpose: "omakase",
      omakaseSetId: set.id,
      seating: "counter",
    });
    navigate("/booking");
  };

  return (
    <Screen name="omakase-detail" pad={false}>
      {photo ? (
        <div className="relative">
          <div className="relative h-[240px] overflow-hidden hero-fade">
            <img
              src={photo}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <BackHeader overlay />
        </div>
      ) : (
        <div className="page-pad">
          <BackHeader />
        </div>
      )}

      <div className="page-pad -mt-6">
        {set.jp && (
          <div className="jp mb-1.5 text-[13px] tracking-[0.25em] text-[var(--gold)]">
            {set.jp}
          </div>
        )}
        <h1 className="font-display text-[26px] leading-tight">{name}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] italic text-[var(--muted)]">
            {subtitle}
          </p>
        )}

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-[24px] tabular-nums text-[var(--gold)]">
            {vnd(set.price, lang)}
          </span>
          <span className="text-[13px] text-[var(--faint)]">
            {t.common.perGuest}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
          <span>{serviceLabelLong(set.service, t)}</span>
          {n > 0 && (
            <>
              <span className="text-[var(--surface-3)]">·</span>
              <span>{t.common.dishes(n)}</span>
            </>
          )}
          <span className="text-[var(--surface-3)]">·</span>
          <span>{t.omakase.counterSeats(restaurant.counterSeats)}</span>
        </div>

        {description && (
          <div className="mt-5 space-y-3">
            {description.split("\n\n").map((p, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-[var(--muted)]">
                {p}
              </p>
            ))}
          </div>
        )}

        {/* ── Trình tự món ── */}
        <section className="mt-8">
          <div className="jp mb-1 text-[11px] tracking-[0.3em] text-[var(--faint)]">
            {t.omakase.coursesJp}
          </div>
          <h2 className="mb-4 font-display text-[19px]">{t.omakase.courses}</h2>

          {set.menuPending ? (
            <div className="card p-4">
              <p className="text-[14px] text-[var(--muted)]">
                {t.omakase.menuPending}
              </p>
              <p className="mt-2 text-[13px] text-[var(--faint)]">
                {t.omakase.menuPendingCall(restaurant.hotline ?? "")}
              </p>
            </div>
          ) : (
            <div className="relative pl-5">
              <div className="absolute bottom-2 left-[5px] top-2 w-px bg-[var(--line)]" />
              {set.courses.map((course) => (
                <div key={course.section} className="mb-6 last:mb-0">
                  <div className="relative">
                    <span className="absolute -left-5 top-[7px] h-[9px] w-[9px] rounded-full border border-[var(--gold)] bg-[var(--sumi)]" />
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
                      {tr.text(course, "section", course.section)}
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {(tr.list(course, "items", course.items) ?? []).map((item) => (
                      <li key={item} className="text-[15px] leading-snug">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-7 card p-4">
          <Note>
            {t.omakase.depositNote(
              Math.round(restaurant.depositRate * 100),
              vnd(set.price * restaurant.depositRate, lang)
            )}
          </Note>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-[var(--line)] bg-[var(--sumi)] px-4 pb-4 pt-3"
             style={{ paddingBottom: "calc(var(--nav-h) + var(--sab) + 12px)" }}>
          <Button full size="lg" variant="gold" onClick={book}>
            {t.omakase.book}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
