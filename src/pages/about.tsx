import { BrandLogo, Button, SectionTitle } from "@/components/ui";
import { IconChat, IconPhone, IconPin } from "@/components/ui/icons";
import { BackHeader, Screen } from "@/components/ui/screen";
import { useRestaurant } from "@/hooks/use-restaurant";
import { useT } from "@/i18n";
import { callHotline, chatWithOA, openMap } from "@/services/zalo";
import { logoSrc, spaceSrc } from "@/utils/images";

/**
 * Trang giới thiệu.
 *
 * Chỉ nêu những dữ kiện đã xác nhận: quầy 12 ghế, wagyu A5 có chứng nhận,
 * thông số ủ wet-aging in trên menu. Không thêm tính từ, không thêm số liệu.
 */
export default function AboutPage() {
  const restaurant = useRestaurant();
  const t = useT();

  return (
    <Screen name="about" pad={false}>
      <div className="page-pad">
        <BackHeader title={t.about.title} />
      </div>

      <div className="page-pad">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo className="mb-3 h-[86px] w-auto" />
          <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {restaurant.tagline}
          </p>
        </div>

        <img
          src={spaceSrc}
          alt={t.home.spaceAlt}
          className="mb-7 w-full rounded-2xl object-cover shadow-sm"
        />

        <section className="mb-8">
          <SectionTitle jp={t.about.counterJp} title={t.about.counter} />
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">
            {t.about.counterBlurb(restaurant.counterSeats)}
          </p>
        </section>

        <section className="mb-8">
          <SectionTitle jp={t.about.wagyuJp} title={t.about.wagyu} />
          <p className="text-[14px] leading-relaxed text-[var(--muted)]">
            {t.about.wagyuBlurb}
          </p>
          <div className="card mt-4 p-4 rounded-2xl border border-[var(--line)] shadow-sm">
            <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--gold)]">
              {t.about.wetAging}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div>
                <dt className="text-[var(--faint)]">{t.about.temperature}</dt>
                <dd className="tabular-nums">−2°C – 2°C</dd>
              </div>
              <div>
                <dt className="text-[var(--faint)]">{t.about.humidity}</dt>
                <dd className="tabular-nums">70% – 80%</dd>
              </div>
              <div>
                <dt className="text-[var(--faint)]">{t.about.airflow}</dt>
                <dd className="tabular-nums">0,5 – 2 m/s</dd>
              </div>
              <div>
                <dt className="text-[var(--faint)]">{t.about.duration}</dt>
                <dd className="tabular-nums">{t.about.days(21)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mb-8">
          <SectionTitle jp={t.common.contactJp} title={t.common.contact} />
          <div className="space-y-2.5">
            <Button
              full
              variant="secondary"
              onClick={() => callHotline(restaurant.hotline)}
            >
              <IconPhone size={17} /> {restaurant.hotline}
            </Button>
            {restaurant.oaId && (
              <Button
                full
                variant="secondary"
                onClick={() => chatWithOA(restaurant.oaId)}
              >
                <IconChat size={17} /> {t.about.messageOA}
              </Button>
            )}
            <Button
              full
              variant="secondary"
              onClick={() => openMap(`Miyako ${restaurant.address}`)}
            >
              <IconPin size={17} /> {restaurant.address}
            </Button>
          </div>

        </section>

        <div className="pb-8 text-center">
          <div className="jp text-[13px] tracking-[0.4em] text-[var(--surface-3)]">
            都
          </div>
        </div>
      </div>
    </Screen>
  );
}
