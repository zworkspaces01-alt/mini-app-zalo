import { useAtomValue } from "jotai";
import { useMemo } from "react";

import { useTr } from "@/i18n";
import {
  bannersAtom,
  contentItemsAtom,
  loyaltyQuestsAtom,
  loyaltyTiersAtom,
  openingHoursAtom,
  rewardGiftsAtom,
} from "@/state/content";
import type {
  BannerPlacement,
  ContentSection,
  LoyaltyTier,
  MembershipTier,
  OpeningShift,
} from "@/types";
import { img } from "@/utils/images";

/**
 * Nội dung trang do nhà hàng sửa trong CMS, đã đổi sang ngôn ngữ khách
 * đang chọn. Chưa dịch thì lùi về tiếng Việt, như mọi nội dung khác.
 */

export interface LocalBanner {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  jp?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  accent?: string;
}

/** Banner của một vị trí, theo thứ tự nhà hàng xếp. */
export function useBanners(placement: BannerPlacement): LocalBanner[] {
  const all = useAtomValue(bannersAtom);
  const tr = useTr();
  return useMemo(
    () =>
      all
        .filter((b) => b.placement === placement)
        .map((b) => ({
          id: b.id,
          title: tr.text(b, "title", b.title),
          subtitle: tr.text(b, "subtitle", b.subtitle),
          tag: tr.text(b, "tag", b.tag),
          jp: b.jp,
          image: img(b.image) ?? b.image,
          ctaText: tr.text(b, "cta_text", b.ctaText),
          ctaLink: b.ctaLink,
          accent: b.accent,
        })),
    [all, placement, tr]
  );
}

export interface LocalItem {
  id: string;
  key?: string;
  title: string;
  subtitle?: string;
  body?: string;
  tag?: string;
  jp?: string;
  image?: string;
  link?: string;
  meta: Record<string, unknown>;
}

/** Các dòng của một section, theo thứ tự nhà hàng xếp. */
export function useContentItems(section: ContentSection): LocalItem[] {
  const all = useAtomValue(contentItemsAtom);
  const tr = useTr();
  return useMemo(
    () =>
      all
        .filter((c) => c.section === section)
        .map((c) => ({
          id: c.id,
          key: c.key,
          title: tr.text(c, "title", c.title),
          subtitle: tr.text(c, "subtitle", c.subtitle),
          body: tr.text(c, "body", c.body),
          tag: tr.text(c, "tag", c.tag),
          jp: c.jp,
          image: img(c.image) ?? c.image,
          link: c.link,
          meta: c.meta,
        })),
    [all, section, tr]
  );
}

/** Mảng chuỗi trong `meta`, ví dụ `meta.categories`. Sai kiểu thì trả rỗng. */
export function metaList(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Chuỗi trong `meta`. Sai kiểu thì trả undefined. */
export function metaText(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/* ════════════════════════════════════════════════════════════
   Giờ mở cửa
   ════════════════════════════════════════════════════════════ */

/** Các ca nhận khách từ bảng opening_hours. Rỗng khi chưa tải được. */
export function useOpeningHours(): OpeningShift[] {
  return useAtomValue(openingHoursAtom);
}

/** Ngày trong tuần (0 = CN) có ít nhất một ca mở. `null` = chưa biết. */
export function openWeekdays(shifts: OpeningShift[]): Set<number> | null {
  if (!shifts.length) return null;
  return new Set(shifts.filter((s) => !s.closed).map((s) => s.weekday));
}

/* ════════════════════════════════════════════════════════════
   Tích điểm
   ════════════════════════════════════════════════════════════ */

export interface LocalTier extends Omit<LoyaltyTier, "i18n"> {}

export interface LocalQuest {
  id: string;
  title: string;
  description?: string;
  points: number;
  icon?: string;
}

/**
 * Hạng, nhiệm vụ và quà đổi điểm do nhà hàng đặt trong CMS.
 *
 * `tierFor` và `nextTier` tính đúng như hàm `tier_for_points` trên máy chủ:
 * hạng có mốc cao nhất mà số điểm đã đạt.
 */
export function useLoyalty() {
  const tiersRaw = useAtomValue(loyaltyTiersAtom);
  const questsRaw = useAtomValue(loyaltyQuestsAtom);
  const giftsRaw = useAtomValue(rewardGiftsAtom);
  const tr = useTr();

  return useMemo(() => {
    const tiers: LocalTier[] = [...tiersRaw]
      .sort((a, b) => a.minPoints - b.minPoints)
      .map((t) => ({
        code: t.code,
        name: tr.text(t, "name", t.name),
        minPoints: t.minPoints,
        earnRate: t.earnRate,
        color: t.color,
        perks: tr.list(t, "perks", t.perks) ?? t.perks,
      }));

    const quests: LocalQuest[] = questsRaw.map((q) => ({
      id: q.id,
      title: tr.text(q, "title", q.title),
      description: tr.text(q, "description", q.description),
      points: q.points,
      icon: q.icon,
    }));

    const gifts = giftsRaw.map((g) => ({
      ...g,
      title: tr.text(g, "title", g.title),
      desc: tr.text(g, "description", g.desc),
      worthText: tr.text(g, "worth_text", g.worthText),
      badge: tr.text(g, "badge", g.badge),
      imageUrl: img(g.imageUrl) ?? g.imageUrl,
    }));

    const tierFor = (points: number): LocalTier | undefined => {
      let found: LocalTier | undefined = tiers[0];
      for (const t of tiers) if (points >= t.minPoints) found = t;
      return found;
    };

    const byCode = (code: MembershipTier | string | undefined) =>
      tiers.find((t) => t.code === code);

    /** Hạng kế tiếp sau `code`; undefined = đã ở hạng cao nhất. */
    const nextTier = (code: MembershipTier | string | undefined) => {
      const i = tiers.findIndex((t) => t.code === code);
      return i >= 0 ? tiers[i + 1] : undefined;
    };

    return { tiers, quests, gifts, tierFor, byCode, nextTier };
  }, [tiersRaw, questsRaw, giftsRaw, tr]);
}
