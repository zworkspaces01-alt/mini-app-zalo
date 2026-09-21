import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { useNavigate } from "zmp-ui";

import { BrandLogo, Chip, EmptyState, Modal, Sheet } from "@/components/ui";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconQR,
} from "@/components/ui/icons";
import {
  Icon3DButcher,
  Icon3DFire,
  Icon3DHotpot,
  Icon3DMeat,
  Icon3DPoints,
  Icon3DSushi,
  Icon3DVoucher,
} from "@/components/ui/icons-3d";
import { Screen } from "@/components/ui/screen";
import { useLang, useT } from "@/i18n";
import { redeemRewardGift } from "@/services/api";
import { haptic, scanTableQR } from "@/services/zalo";
import { notifyTelegram } from "@/services/telegram";
import {
  MembershipTier,
  PointsHistoryItem,
  pointsHistoryAtom,
  redeemGiftAtom,
  tableIdAtom,
  userAtom,
  userPointsAtom,
  userTierAtom,
  userVouchersAtom,
} from "@/state/atoms";
import { rewardGiftsAtom } from "@/state/content";
import { formatNumber, vnd } from "@/utils/format";

/* ─── Danh mục quà tặng đổi điểm hỗ trợ 3 ngôn ngữ ─── */
type GiftCategory = "all" | "voucher" | "dish" | "drink";

interface LocalizedString {
  vi: string;
  en: string;
  ja: string;
}

interface RawRewardGift {
  id: string;
  category: GiftCategory;
  title: LocalizedString;
  desc: LocalizedString;
  worthText: LocalizedString;
  pointsCost: number;
  badge?: LocalizedString;
  icon: React.ReactNode;
}

const RAW_REWARD_GIFTS: RawRewardGift[] = [
  {
    id: "gift-v50",
    category: "voucher",
    title: {
      vi: "Voucher Giảm 50.000đ",
      en: "50,000₫ Cash Voucher",
      ja: "50,000₫ お食事券",
    },
    desc: {
      vi: "Trừ trực tiếp trên hoá đơn dùng bữa hoặc mua thịt Butcher",
      en: "Direct discount on dine-in or Butcher meat orders",
      ja: "店内飲食または精肉のご購入時にご利用可能",
    },
    worthText: {
      vi: "Trị giá 50.000đ",
      en: "Worth 50,000₫",
      ja: "50,000₫ 相当",
    },
    pointsCost: 50,
    badge: {
      vi: "Dễ đổi nhất",
      en: "Easiest",
      ja: "交換しやすい",
    },
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-v100",
    category: "voucher",
    title: {
      vi: "Voucher Giảm 100.000đ",
      en: "100,000₫ Cash Voucher",
      ja: "100,000₫ お食事券",
    },
    desc: {
      vi: "Áp dụng cho hoá đơn từ 500.000đ tại toàn hệ thống",
      en: "Applicable for orders from 500,000₫ across all locations",
      ja: "500,000₫以上のお会計で全店共通利用可能",
    },
    worthText: {
      vi: "Trị giá 100.000đ",
      en: "Worth 100,000₫",
      ja: "100,000₫ 相当",
    },
    pointsCost: 100,
    badge: {
      vi: "Phổ biến",
      en: "Popular",
      ja: "人気",
    },
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-v200",
    category: "voucher",
    title: {
      vi: "Voucher Giảm 200.000đ",
      en: "200,000₫ Cash Voucher",
      ja: "200,000₫ お食事券",
    },
    desc: {
      vi: "Áp dụng cho mọi bữa ăn hoặc đơn hàng Wagyu Butcher",
      en: "Applicable for all dining meals or Wagyu Butcher orders",
      ja: "すべてのお食事または和牛精肉のご注文で利用可能",
    },
    worthText: {
      vi: "Trị giá 200.000đ",
      en: "Worth 200,000₫",
      ja: "200,000₫ 相当",
    },
    pointsCost: 200,
    badge: {
      vi: "Ưu đãi lớn",
      en: "Big Value",
      ja: "お得",
    },
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-sashimi",
    category: "dish",
    title: {
      vi: "Sashimi Cá Hồi Na Uy Tươi",
      en: "Fresh Norwegian Salmon Sashimi",
      ja: "特選ノルウェー産生サーモン刺身",
    },
    desc: {
      vi: "Tặng 1 đĩa Sashimi cá hồi nhập khẩu Na Uy hảo hạng",
      en: "Complimentary premium fresh Norwegian salmon sashimi plate",
      ja: "極上ノルウェー産生サーモン刺身を一皿プレゼント",
    },
    worthText: {
      vi: "Trị giá 185.000đ",
      en: "Worth 185,000₫",
      ja: "185,000₫ 相当",
    },
    pointsCost: 250,
    badge: {
      vi: "Món Bếp Trưởng",
      en: "Chef's Pick",
      ja: "料理長おすすめ",
    },
    icon: <Icon3DSushi size={36} />,
  },
  {
    id: "gift-wagyu",
    category: "dish",
    title: {
      vi: "Bò Wagyu A5 Nướng Đá Núi Lửa",
      en: "A5 Wagyu on Volcano Stone",
      ja: "A5和牛 溶岩石焼き",
    },
    desc: {
      vi: "Tặng 1 phần Wagyu A5 nướng đá thơm lừng béo ngậy",
      en: "Complimentary sizzling melt-in-mouth A5 Wagyu portion",
      ja: "芳醇な香りととろける旨味のA5和牛を1人前進呈",
    },
    worthText: {
      vi: "Trị giá 360.000đ",
      en: "Worth 360,000₫",
      ja: "360,000₫ 相当",
    },
    pointsCost: 450,
    badge: {
      vi: "Wagyu A5",
      en: "Wagyu A5",
      ja: "A5和牛",
    },
    icon: <Icon3DMeat size={36} />,
  },
  {
    id: "gift-sake",
    category: "drink",
    title: {
      vi: "Chai Rượu Sake Vảy Vàng 720ml",
      en: "Gold Flake Sake Bottle 720ml",
      ja: "金箔入り特撰日本酒 720ml",
    },
    desc: {
      vi: "Rượu Sake thượng hạng chứa vảy vàng 24k tinh khiết Nhật Bản",
      en: "Premium Japanese sake infused with pure 24k gold flakes",
      ja: "純度24Kの金箔が舞う贅沢な日本産特撰酒",
    },
    worthText: {
      vi: "Trị giá 790.000đ",
      en: "Worth 790,000₫",
      ja: "790,000₫ 相当",
    },
    pointsCost: 800,
    badge: {
      vi: "VIP Gift",
      en: "VIP Gift",
      ja: "VIP限定",
    },
    icon: <Icon3DPoints size={36} />,
  },
  {
    id: "gift-omakase",
    category: "dish",
    title: {
      vi: "1 Vé Omakase Thượng Hạng",
      en: "1 Premium Omakase Ticket",
      ja: "極上おまかせ食事券 1名様分",
    },
    desc: {
      vi: "Trải nghiệm trọn vẹn set menu 12 món do Bếp trưởng phục vụ",
      en: "Full 12-course dining experience crafted by the Head Chef",
      ja: "総料理長が目の前で振る舞う全12品のコース体験",
    },
    worthText: {
      vi: "Trị giá 1.500.000đ",
      en: "Worth 1,500,000₫",
      ja: "1,500,000₫ 相当",
    },
    pointsCost: 1500,
    badge: {
      vi: "Đặc biệt",
      en: "Special",
      ja: "特別",
    },
    icon: <Icon3DFire size={36} />,
  },
];

interface RewardGift {
  id: string;
  category: GiftCategory;
  title: string;
  desc: string;
  worthText: string;
  pointsCost: number;
  badge?: string;
  icon: React.ReactNode;
}

/* ─── Nhiệm vụ kiếm thêm điểm hỗ trợ 3 ngôn ngữ ─── */
interface RawQuest {
  id: string;
  title: LocalizedString;
  desc: LocalizedString;
  points: number;
  icon: string;
  actionText: LocalizedString;
}

const RAW_QUESTS: RawQuest[] = [
  {
    id: "q-checkin",
    title: {
      vi: "Điểm danh mỗi ngày",
      en: "Daily Check-in",
      ja: "毎日ログイン",
    },
    desc: {
      vi: "Mở Zalo Mini App để nhận điểm tích luỹ hàng ngày",
      en: "Open Zalo Mini App to claim daily loyalty points",
      ja: "アプリを開いて毎日の来店ポイントを獲得",
    },
    points: 15,
    icon: "📅",
    actionText: {
      vi: "Điểm danh",
      en: "Check in",
      ja: "獲得する",
    },
  },
  {
    id: "q-dinein",
    title: {
      vi: "Check-in dùng bữa tại nhà hàng",
      en: "Dine-in Check-in",
      ja: "店舗でチェックイン",
    },
    desc: {
      vi: "Quét QR tại bàn ăn hoặc hoá đơn thanh toán",
      en: "Scan QR code at your dining table or invoice",
      ja: "お席のQRコードまたは伝票をスキャン",
    },
    points: 30,
    icon: "🥢",
    actionText: {
      vi: "Quét QR",
      en: "Scan QR",
      ja: "QRスキャン",
    },
  },
  {
    id: "q-review",
    title: {
      vi: "Đánh giá dịch vụ 5 sao",
      en: "Leave 5-Star Review",
      ja: "5つ星レビューを投稿",
    },
    desc: {
      vi: "Để lại cảm nhận và hình ảnh trải nghiệm ẩm thực",
      en: "Share photos and feedback about your dining experience",
      ja: "お料理の写真と感想を投稿してシェア",
    },
    points: 50,
    icon: "⭐",
    actionText: {
      vi: "Đánh giá",
      en: "Review",
      ja: "評価する",
    },
  },
  {
    id: "q-share",
    title: {
      vi: "Chia sẻ Miyako cho bạn bè",
      en: "Share with Friends",
      ja: "お友達にシェア",
    },
    desc: {
      vi: "Mời bạn bè cùng gia nhập Miyako VIP Club",
      en: "Invite friends to join the Miyako VIP Club",
      ja: "お友達を宮古VIPクラブにご招待",
    },
    points: 100,
    icon: "🎁",
    actionText: {
      vi: "Chia sẻ",
      en: "Share",
      ja: "シェア",
    },
  },
];

interface Quest {
  id: string;
  title: string;
  desc: string;
  points: number;
  icon: string;
  actionText: string;
  completed?: boolean;
}

export default function RewardsPage() {
  const navigate = useNavigate();
  const user = useAtomValue(userAtom);
  const [points, setPoints] = useAtom(userPointsAtom);
  const [tier] = useAtom(userTierAtom);
  const [history, setHistory] = useAtom(pointsHistoryAtom);
  const [, redeemGift] = useAtom(redeemGiftAtom);
  const [, setTableId] = useAtom(tableIdAtom);
  const lang = useLang();
  const t = useT();

  // Tabs trang tích điểm
  const [activeTab, setActiveTab] = useState<"gifts" | "tiers" | "quests" | "history">("gifts");
  const [giftCategory, setGiftCategory] = useState<GiftCategory>("all");

  // Sheet mã QR tại quầy
  const [qrSheetOpen, setQrSheetOpen] = useState(false);

  // Modal đổi quà
  const [selectedGift, setSelectedGift] = useState<RewardGift | null>(null);
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [submittingRedeem, setSubmittingRedeem] = useState(false);
  const liveGifts = useAtomValue(rewardGiftsAtom);
  const setVouchers = useSetAtom(userVouchersAtom);

  // Danh sách quà tặng từ CMS với fallback an toàn
  const localizedGifts = useMemo<RewardGift[]>(() => {
    if (liveGifts && liveGifts.length > 0) {
      return liveGifts.map((g) => {
        let icon: React.ReactNode = <Icon3DPoints size={36} />;
        if (g.imageUrl) {
          icon = (
            <img
              src={g.imageUrl}
              alt={typeof g.title === "string" ? g.title : ""}
              className="w-9 h-9 object-cover rounded-lg border border-gold/30"
            />
          );
        } else if (g.category === "voucher") {
          icon = <Icon3DVoucher size={36} />;
        } else if (g.category === "dish") {
          icon = <Icon3DSushi size={36} />;
        } else if (g.category === "drink") {
          icon = <Icon3DHotpot size={36} />;
        }

        const title = typeof g.title === "string" ? g.title : (g.title as any)?.[lang] ?? (g.title as any)?.vi ?? "";
        const desc = typeof g.desc === "string" ? g.desc : (g.desc as any)?.[lang] ?? (g.desc as any)?.vi ?? "";
        const worthText = typeof g.worthText === "string" ? g.worthText : (g.worthText as any)?.[lang] ?? (g.worthText as any)?.vi ?? "";
        const badge = g.badge ? (typeof g.badge === "string" ? g.badge : (g.badge as any)?.[lang] ?? (g.badge as any)?.vi) : undefined;

        return {
          id: g.id,
          category: g.category as GiftCategory,
          title: title || "Quà tặng",
          desc: desc || "",
          worthText: worthText || "",
          pointsCost: g.pointsCost,
          badge,
          icon,
        };
      });
    }

    return RAW_REWARD_GIFTS.map((g) => ({
      id: g.id,
      category: g.category,
      title: g.title[lang] ?? g.title.vi,
      desc: g.desc[lang] ?? g.desc.vi,
      worthText: g.worthText[lang] ?? g.worthText.vi,
      pointsCost: g.pointsCost,
      badge: g.badge ? (g.badge[lang] ?? g.badge.vi) : undefined,
      icon: g.icon,
    }));
  }, [liveGifts, lang]);

  // Quests state đã hoàn thành
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);

  // Quests theo ngôn ngữ hiện tại
  const quests = useMemo<Quest[]>(() => {
    return RAW_QUESTS.map((q) => ({
      id: q.id,
      title: q.title[lang] ?? q.title.vi,
      desc: q.desc[lang] ?? q.desc.vi,
      points: q.points,
      icon: q.icon,
      actionText: q.actionText[lang] ?? q.actionText.vi,
      completed: completedQuestIds.includes(q.id),
    }));
  }, [lang, completedQuestIds]);

  // Quét QR
  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
    // Tự động thưởng 30 điểm khi quét QR bàn
    haptic("medium");
    setPoints((p) => p + 30);
    const bonusTitle =
      lang === "ja"
        ? "テーブルQR読み取りポイント"
        : lang === "en"
        ? "Table QR Scan Reward"
        : "Tích điểm quét QR tại bàn";
    const bonusDesc =
      lang === "ja"
        ? `テーブル ${match?.[1] ?? content.slice(0, 8)} のスキャン特典`
        : lang === "en"
        ? `Bonus for table ${match?.[1] ?? content.slice(0, 8)}`
        : `Thưởng quét QR bàn ${match?.[1] ?? content.slice(0, 8)}`;
    const nowText = lang === "ja" ? "たった今" : lang === "en" ? "Just now" : "Vừa xong";

    setHistory((prev) => [
      {
        id: "p-" + Date.now(),
        title: bonusTitle,
        desc: bonusDesc,
        date: nowText,
        points: 30,
        type: "order",
      },
      ...prev,
    ]);
  };

  // Tiến trình hạng thành viên hỗ trợ 3 ngôn ngữ
  const tierInfo = useMemo(() => {
    switch (tier) {
      case "silver":
        return {
          name: "Silver Member",
          title: lang === "ja" ? "シルバー会員" : lang === "en" ? "Silver Tier" : "Hạng Bạc",
          rateText: lang === "ja" ? "5%ポイント還元" : lang === "en" ? "5% points back" : "Tích 5% hoá đơn",
          nextTier: lang === "ja" ? "ゴールド会員" : lang === "en" ? "Gold Tier" : "Hạng Vàng",
          needed: 1000 - points,
          progress: Math.min(100, Math.round((points / 1000) * 100)),
          color: "from-zinc-400 to-slate-200",
          cardBg: "from-[#22272b] via-[#161a1d] to-[#0c0e10]",
          badgeBg: "bg-slate-400/20 text-slate-300 border-slate-400/30",
        };
      case "diamond":
        return {
          name: "Diamond Member",
          title: lang === "ja" ? "ダイヤモンド会員" : lang === "en" ? "Diamond Tier" : "Hạng Kim Cương",
          rateText: lang === "ja" ? "12%ポイント還元" : lang === "en" ? "12% points back" : "Tích 12% hoá đơn",
          nextTier: lang === "ja" ? "最高位" : lang === "en" ? "Highest Tier" : "Hạng Tối Thượng",
          needed: 0,
          progress: 100,
          color: "from-cyan-300 to-blue-500",
          cardBg: "from-[#0d1f2d] via-[#08151f] to-[#040a10]",
          badgeBg: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
        };
      case "gold":
      default:
        return {
          name: "Gold Member",
          title: lang === "ja" ? "ゴールド会員" : lang === "en" ? "Gold Tier" : "Hạng Vàng",
          rateText: lang === "ja" ? "8%ポイント還元" : lang === "en" ? "8% points back" : "Tích 8% hoá đơn",
          nextTier: lang === "ja" ? "プラチナ会員" : lang === "en" ? "Platinum Tier" : "Hạng Bạch Kim",
          needed: Math.max(0, 2000 - points),
          progress: Math.min(100, Math.round((points / 2000) * 100)),
          color: "from-amber-300 via-yellow-400 to-amber-600",
          cardBg: "from-[#2c2009] via-[#1c1404] to-[#0c0902]",
          badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/30",
        };
    }
  }, [tier, points, lang]);

  // Lọc quà
  const filteredGifts = useMemo(() => {
    if (giftCategory === "all") return localizedGifts;
    return localizedGifts.filter((g) => g.category === giftCategory);
  }, [localizedGifts, giftCategory]);

  // Xử lý đổi quà thực tế qua Supabase RPC và đồng bộ với CMS
  const handleConfirmRedeem = async () => {
    if (!selectedGift || submittingRedeem) return;
    if (points < selectedGift.pointsCost) {
      haptic("light");
      return;
    }

    setSubmittingRedeem(true);
    haptic("medium");

    try {
      // 1. Gọi backend Supabase tạo voucher redemption thật
      const res = await redeemRewardGift({
        zaloId: user?.id || "zalo-guest",
        giftId: selectedGift.id,
      });

      const actualCode =
        res.success && res.code
          ? res.code
          : "MYK-" + Math.random().toString(36).substring(2, 7).toUpperCase();

      if (res.newBalance !== undefined) {
        setPoints(res.newBalance);
      } else {
        setPoints((p) => Math.max(0, p - selectedGift.pointsCost));
      }

      // 2. Cập nhật state atom
      redeemGift({
        id: selectedGift.id,
        title: selectedGift.title,
        pointsCost: selectedGift.pointsCost,
      });

      setRedeemedCode(actualCode);
      setRedeemSuccess(true);

      // 3. Thêm vào ví voucher hiển thị
      const nowIso = new Date().toISOString();
      setVouchers((prev) => [
        {
          id: "v-" + Date.now(),
          giftId: selectedGift.id,
          giftTitle: selectedGift.title,
          giftCategory: selectedGift.category,
          worthText: selectedGift.worthText,
          code: actualCode,
          pointsCost: selectedGift.pointsCost,
          createdAt: nowIso,
          status: "active",
        },
        ...prev,
      ]);

      // 4. Gửi thông báo Telegram tức thì vào Topic Khách tích điểm / Đổi thưởng
      notifyTelegram({
        type: "loyalty",
        data: {
          action: "redeem",
          customer_name: user?.name || "Khách hàng Zalo",
          customer_phone: user?.phone || "",
          tier_name: tierInfo.name,
          gift_title: selectedGift.title,
          voucher_code: actualCode,
          points_change: selectedGift.pointsCost,
          current_points: res.newBalance ?? Math.max(0, points - selectedGift.pointsCost),
          note: `Khách đổi quà ${selectedGift.title} trên Zalo Mini App`,
        },
      }).catch((err) => console.warn("Telegram loyalty error:", err));
    } catch (e) {
      console.warn("Lỗi đổi quà:", e);
    } finally {
      setSubmittingRedeem(false);
    }
  };

  // Hoàn thành nhiệm vụ
  const handleCompleteQuest = (q: Quest) => {
    if (q.completed) return;
    haptic("medium");
    setPoints((p) => p + q.points);
    setCompletedQuestIds((prev) => [...prev, q.id]);

    const titleText =
      lang === "ja"
        ? `ミッション達成：${q.title}`
        : lang === "en"
        ? `Quest: ${q.title}`
        : `Nhiệm vụ: ${q.title}`;
    const descText =
      lang === "ja"
        ? "ミッション完了ボーナス"
        : lang === "en"
        ? "Quest completion reward"
        : "Thưởng hoàn thành nhiệm vụ tích luỹ";
    const nowText = lang === "ja" ? "たった今" : lang === "en" ? "Just now" : "Vừa xong";

    setHistory((prev) => [
      {
        id: "p-" + Date.now(),
        title: titleText,
        desc: descText,
        date: nowText,
        points: q.points,
        type: "reward",
      },
      ...prev,
    ]);
  };

  return (
    <Screen name="rewards" pad={false}>
      {/* ─── 1. THANH HEADER ĐỒNG BỘ ─── */}
      <header
        className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--line)] px-3 pb-2 shadow-sm transition-colors"
        style={{
          paddingTop: "calc(max(var(--sat), env(safe-area-inset-top, 0px)) + 4px)",
        }}
      >
        <div className="flex h-10 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              aria-label={t.common.back}
              onClick={() => {
                haptic("light");
                navigate(-1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--washi)] border border-[var(--line)] transition-all active:scale-95 shrink-0"
            >
              <IconChevronLeft size={16} />
            </button>
            <BrandLogo
              variant="horizontal"
              className="h-[25px] w-auto object-contain select-none"
            />
          </div>

          <div className="head-safe" />
        </div>

        {/* 4 Tabs chính của trang Tích Điểm */}
        <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-0.5">
          <Chip
            active={activeTab === "gifts"}
            onClick={() => {
              haptic("light");
              setActiveTab("gifts");
            }}
          >
            {t.rewards.tabGifts}
          </Chip>
          <Chip
            active={activeTab === "tiers"}
            onClick={() => {
              haptic("light");
              setActiveTab("tiers");
            }}
          >
            {t.rewards.tabTiers}
          </Chip>
          <Chip
            active={activeTab === "quests"}
            onClick={() => {
              haptic("light");
              setActiveTab("quests");
            }}
          >
            {t.rewards.tabQuests}
          </Chip>
          <Chip
            active={activeTab === "history"}
            onClick={() => {
              haptic("light");
              setActiveTab("history");
            }}
          >
            {t.rewards.tabHistory}
          </Chip>
        </div>
      </header>

      {/* ─── NỘI DUNG CHÍNH ─── */}
      <div className="page-pad pt-3 pb-24 space-y-4">
        {/* ─── THẺ THÀNH VIÊN VIP KIM LOẠI SANG TRỌNG ─── */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-[var(--gold)]/40 bg-gradient-to-br ${tierInfo.cardBg} p-4 text-white shadow-xl shadow-[var(--gold)]/10`}
        >
          {/* Hoạ tiết hoa văn nước Nhật chìm */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 select-none opacity-10 text-[110px] font-serif font-black">
            都
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] uppercase tracking-widest font-semibold text-[var(--gold)]">
                  {t.rewards.memberTitle}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierInfo.badgeBg}`}
                >
                  {tierInfo.title}
                </span>
              </div>
              <h2 className="mt-1 font-display text-[17px] font-bold tracking-wide">
                {user?.name ?? (lang === "ja" ? "お客様" : lang === "en" ? "Valued Guest" : "Quý Khách Hàng")}
              </h2>
              <div className="font-mono text-[11px] text-[var(--faint)]">
                #MYK-8899-VIP
              </div>
            </div>

            <div className="flex flex-col items-end">
              <Icon3DPoints size={40} />
            </div>
          </div>

          {/* Điểm hiện có */}
          <div className="mt-3.5 relative z-10">
            <div className="text-[11px] text-[var(--faint)]">{t.rewards.currentPoints}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-extrabold tracking-tight text-[var(--gold)]">
                {formatNumber(points)}
              </span>
              <span className="text-[13px] font-medium text-[var(--washi)]">
                {t.rewards.pointsUnit}
              </span>
              <span className="ml-auto text-[11.5px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                {tierInfo.rateText}
              </span>
            </div>
          </div>

          {/* Thanh tiến trình nâng hạng */}
          <div className="mt-3 relative z-10">
            <div className="flex justify-between text-[10.5px] text-[var(--faint)] mb-1">
              <span>{tierInfo.title}</span>
              <span>
                {tierInfo.needed > 0
                  ? t.rewards.needMore(tierInfo.needed, tierInfo.nextTier)
                  : t.rewards.maxTierReached}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierInfo.color} transition-all duration-500`}
                style={{ width: `${tierInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Nút mở mã tại quầy */}
          <div className="mt-3.5 flex items-center gap-2 border-t border-white/10 pt-3 relative z-10">
            <button
              onClick={() => {
                haptic("light");
                setQrSheetOpen(true);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--gold)] to-amber-600 px-3 py-2 text-[12px] font-bold text-black shadow-md active:scale-98 transition-transform"
            >
              <IconQR size={15} />
              <span>
                {lang === "ja"
                  ? "会員コードを表示"
                  : lang === "en"
                  ? "Show Counter QR / Barcode"
                  : "Mở Mã Tích Điểm Tại Quầy"}
              </span>
            </button>
            <button
              onClick={handleScan}
              className="flex items-center justify-center gap-1 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/15 active:scale-98 transition-transform"
            >
              <span>
                {lang === "ja" ? "QRスキャン" : lang === "en" ? "Scan Table" : "Quét Bàn"}
              </span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: ĐỔI QUÀ & VOUCHER ─── */}
        {activeTab === "gifts" && (
          <div className="space-y-3">
            {/* Bộ lọc loại quà */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
                {lang === "ja"
                  ? "ポイント交換特典・クーポン"
                  : lang === "en"
                  ? "Rewards & Vouchers"
                  : "Ưu Đãi & Quà Tặng Đổi Điểm"}
              </h3>
              <span className="text-[11.5px] text-[var(--muted)]">
                {filteredGifts.length}{" "}
                {lang === "ja" ? "件" : lang === "en" ? "rewards" : "phần quà"}
              </span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setGiftCategory("all")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "all"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                {t.rewards.catAll}
              </button>
              <button
                onClick={() => setGiftCategory("voucher")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "voucher"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                {t.rewards.catVoucher}
              </button>
              <button
                onClick={() => setGiftCategory("dish")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "dish"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                {t.rewards.catDish}
              </button>
              <button
                onClick={() => setGiftCategory("drink")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "drink"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                {t.rewards.catDrink}
              </button>
            </div>

            {/* Danh sách thẻ quà tặng */}
            <div className="space-y-2.5">
              {filteredGifts.map((gift) => {
                const canAfford = points >= gift.pointsCost;
                return (
                  <div
                    key={gift.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-sm transition-all hover:border-[var(--line-strong)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-inner">
                        {gift.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display text-[13.5px] font-bold text-[var(--washi)] truncate">
                            {gift.title}
                          </h4>
                          {gift.badge && (
                            <span className="shrink-0 rounded bg-[var(--shu)]/15 border border-[var(--shu)]/30 px-1.5 py-0.2 text-[9px] font-bold text-[var(--shu)]">
                              {gift.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">
                          {gift.desc}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-[var(--gold)]">
                            {formatNumber(gift.pointsCost)} {t.rewards.pts}
                          </span>
                          <span className="text-[var(--faint)]">·</span>
                          <span className="text-[var(--faint)]">{gift.worthText}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        haptic("light");
                        setSelectedGift(gift);
                      }}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all active:scale-95 ${
                        canAfford
                          ? "bg-[var(--shu)] text-white hover:brightness-110"
                          : "bg-[var(--surface-3)] text-[var(--faint)] border border-[var(--line)]"
                      }`}
                    >
                      {canAfford
                        ? (lang === "ja" ? "今すぐ交換" : lang === "en" ? "Redeem" : "Đổi ngay")
                        : (lang === "ja" ? "不足" : lang === "en" ? "Short" : "Chưa đủ")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 2: ĐẶC QUYỀN HỘI VIÊN ─── */}
        {activeTab === "tiers" && (
          <div className="space-y-3">
            <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
              {lang === "ja"
                ? "会員ランクごとの限定特典"
                : lang === "en"
                ? "Membership Tier Benefits"
                : "Quyền Lợi Theo Từng Hạng Hội Viên"}
            </h3>

            {/* Bạc */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🥉</span>
                  <div>
                    <h4 className="font-display text-[15px] font-bold text-slate-300">
                      {lang === "ja" ? "シルバー会員 (Silver)" : lang === "en" ? "Silver Member" : "Hạng Bạc (Silver)"}
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      {lang === "ja" ? "0 〜 999 ポイント" : lang === "en" ? "0 to 999 accumulated points" : "Từ 0 đến 999 điểm tích luỹ"}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-bold text-slate-300 border border-slate-500/30">
                  {lang === "ja" ? "5%還元" : lang === "en" ? "Earn 5%" : "Tích 5%"}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--muted)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "店内飲食・精肉注文のすべてで5%ポイント還元"
                      : lang === "en"
                      ? "Accumulate 5% points on all dine-in and Butcher orders"
                      : "Tích luỹ 5% trên mọi hoá đơn ăn tại quán hoặc Butcher"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "お誕生週に100,000₫クーポンをプレゼント"
                      : lang === "en"
                      ? "Gift a 100,000₫ voucher during birthday week"
                      : "Tặng voucher 100.000đ trong tuần sinh nhật"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "ポイント交換所での限定アイテム交換権利"
                      : lang === "en"
                      ? "Right to redeem gifts and vouchers from points store"
                      : "Quyền đổi quà và voucher từ kho điểm thưởng"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Vàng (Hiện tại) */}
            <div className="rounded-2xl border-2 border-[var(--gold)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] p-4 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bg-[var(--gold)] text-black text-[9.5px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                {lang === "ja" ? "現在のランク" : lang === "en" ? "Your Tier" : "Hạng Của Bạn"}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🥈</span>
                  <div>
                    <h4 className="font-display text-[15px] font-bold text-[var(--gold)]">
                      {lang === "ja" ? "ゴールド会員 (Gold Member)" : lang === "en" ? "Gold Member" : "Hạng Vàng (Gold Member)"}
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      {lang === "ja" ? "1,000 〜 1,999 ポイント" : lang === "en" ? "1,000 to 1,999 points" : "Từ 1.000 đến 1.999 điểm"}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-[var(--gold)] border border-[var(--gold)]/30">
                  {lang === "ja" ? "8%還元" : lang === "en" ? "Earn 8%" : "Tích 8%"}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--washi)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "店内飲食・テイクアウトのすべてで8%ポイント還元"
                      : lang === "en"
                      ? "Accumulate 8% points on all orders (dine-in & take-away)"
                      : "Tích luỹ 8% giá trị mọi hoá đơn (ăn tại chỗ & mang về)"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "お誕生月に特選生サーモン刺身を一皿プレゼント"
                      : lang === "en"
                      ? "Free Premium Salmon Sashimi during birthday month"
                      : "Tặng 1 đĩa Sashimi Cá Hồi thượng hạng tháng sinh nhật"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "高級個室・畳席の優先リザーブ"
                      : lang === "en"
                      ? "Priority seating in luxury Tatami VIP private rooms"
                      : "Ưu tiên xếp bàn phòng riêng Tatami sang trọng"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "季節のおまかせ新作メニューをいち早くテイスティング"
                      : lang === "en"
                      ? "Early tasting privileges for seasonal Omakase creations"
                      : "Trải nghiệm trước các món mới trong mùa Omakase"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Bạch Kim */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">💎</span>
                  <div>
                    <h4 className="font-display text-[15px] font-bold text-cyan-300">
                      {lang === "ja" ? "プラチナ会員 (Platinum)" : lang === "en" ? "Platinum Member" : "Hạng Bạch Kim (Platinum)"}
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      {lang === "ja" ? "2,000 ポイント以上" : lang === "en" ? "2,000 points and above" : "Từ 2.000 điểm trở lên"}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                  {lang === "ja" ? "12%還元" : lang === "en" ? "Earn 12%" : "Tích 12%"}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--muted)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "最大12%の最高還元率をすべての伝票に適用"
                      : lang === "en"
                      ? "Maximum 12% loyalty return on every transaction"
                      : "Tích luỹ tối đa 12% giá trị trên mọi hoá đơn"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "VIP個室および畳席の利用料が100%完全無料"
                      : lang === "en"
                      ? "100% waiver of VIP room & private Tatami room surcharges"
                      : "Miễn phí 100% phụ phí phòng VIP & Tatami riêng tư"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "お誕生日に金箔入り特撰日本酒 720ml を1本進呈"
                      : lang === "en"
                      ? "Gift 1 bottle of 24K Gold Flake Sake 720ml on birthday"
                      : "Tặng 1 chai Sake vảy vàng 720ml vào ngày sinh nhật"}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>
                    {lang === "ja"
                      ? "総料理長によるオーダーメイド専用コースの設計"
                      : lang === "en"
                      ? "Exclusive custom-designed menu crafted by Head Chef"
                      : "Đầu bếp trưởng Omakase thiết kế thực đơn riêng"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ─── TAB 3: NHIỆM VỤ NHẬN ĐIỂM ─── */}
        {activeTab === "quests" && (
          <div className="space-y-3">
            <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
              {lang === "ja"
                ? "ポイント獲得ミッション"
                : lang === "en"
                ? "Earn More Points"
                : "Nhiệm Vụ Kiếm Thêm Điểm Thưởng"}
            </h3>

            <div className="space-y-2.5">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[26px]">{q.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display text-[13.5px] font-bold text-[var(--washi)]">
                          {q.title}
                        </h4>
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-400">
                          +{q.points} {t.rewards.pts}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[var(--muted)] mt-0.5">
                        {q.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={q.completed}
                    onClick={() => handleCompleteQuest(q)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all active:scale-95 ${
                      q.completed
                        ? "bg-[var(--surface-3)] text-[var(--faint)] cursor-not-allowed"
                        : "bg-[var(--shu)] text-white shadow-sm hover:brightness-110"
                    }`}
                  >
                    {q.completed ? t.rewards.claimed : q.actionText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: LỊCH SỬ ĐIỂM ─── */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
              {t.rewards.historyTitle}
            </h3>

            {history.length === 0 ? (
              <EmptyState
                kanji="点"
                title={t.rewards.historyEmpty}
                hint={
                  lang === "ja"
                    ? "宮古でのお食事や精肉のご注文でポイントを獲得しましょう。"
                    : lang === "en"
                    ? "Dine at Miyako or buy Butcher meats to start accumulating points."
                    : "Hãy dùng bữa tại Miyako hoặc mua thịt Butcher để bắt đầu tích luỹ điểm thưởng nhé."
                }
              />
            ) : (
              <div className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] shadow-sm">
                {history.map((item) => {
                  const isPositive = item.points > 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-display text-[13.5px] font-semibold text-[var(--washi)]">
                          {item.title}
                        </div>
                        <div className="text-[11.5px] text-[var(--muted)] truncate mt-0.5">
                          {item.desc}
                        </div>
                        <div className="text-[10px] text-[var(--faint)] mt-0.5">
                          {item.date}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 font-display text-[15px] font-bold tabular-nums ${
                          isPositive ? "text-emerald-400" : "text-amber-500"
                        }`}
                      >
                        {isPositive ? `+${item.points}` : `${item.points}`} {t.rewards.pts}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── SHEET MÃ BARCODE & QR TÍCH ĐIỂM TẠI QUẦY ─── */}
      <Sheet
        open={qrSheetOpen}
        onClose={() => setQrSheetOpen(false)}
        title={lang === "ja" ? "お会計時QR・バーコード" : lang === "en" ? "Counter Loyalty Code" : "Mã Tích Điểm Tại Quầy"}
      >
        <div className="p-4 text-center space-y-4">
          <div className="text-[12.5px] text-[var(--muted)]">
            {lang === "ja"
              ? "お会計時にレジスタッフにご提示ください。"
              : lang === "en"
              ? "Present this code to the cashier at checkout to earn "
              : "Đưa mã này cho nhân viên thu ngân khi thanh toán để được tích "}
            <b className="text-[var(--gold)]">{tierInfo.rateText}</b>{" "}
            {lang === "ja" ? "が付与されます。" : lang === "en" ? "into your account." : "vào tài khoản."}
          </div>

          {/* Hộp mã QR & Barcode */}
          <div className="mx-auto max-w-[260px] rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl">
            {/* Giả lập Barcode sọc */}
            <div className="flex h-12 w-full items-stretch justify-between px-2 gap-[2px]">
              {Array.from({ length: 38 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-black rounded-xs"
                  style={{
                    width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1.5px",
                    opacity: i % 5 === 0 ? 0.7 : 1,
                  }}
                />
              ))}
            </div>
            <div className="mt-1 font-mono text-[13px] font-bold tracking-widest text-black">
              8899 2409 6868
            </div>

            {/* Mã QR minh hoạ */}
            <div className="mt-3 flex justify-center p-2 rounded-xl bg-slate-50 border border-slate-200">
              <IconQR size={130} className="text-black" />
            </div>
          </div>

          <div className="text-[11.5px] text-[var(--faint)]">
            {lang === "ja" ? "会員名: " : lang === "en" ? "Member: " : "Thành viên: "}
            <b className="text-[var(--washi)]">{user?.name ?? (lang === "ja" ? "お客様" : lang === "en" ? "Guest" : "Quý Khách")}</b> ·{" "}
            {lang === "ja" ? "保有ポイント: " : lang === "en" ? "Points: " : "Điểm hiện có: "}
            <b className="text-[var(--gold)]">
              {formatNumber(points)} {t.rewards.pts}
            </b>
          </div>

          <button
            onClick={() => setQrSheetOpen(false)}
            className="w-full h-11 rounded-full bg-[var(--surface-3)] font-bold text-[13px] text-[var(--washi)] active:scale-98 transition-transform border border-[var(--line)]"
          >
            {t.rewards.close}
          </button>
        </div>
      </Sheet>

      {/* ─── MODAL XÁC NHẬN ĐỔI QUÀ ─── */}
      <Modal
        open={Boolean(selectedGift)}
        onClose={() => {
          setSelectedGift(null);
          setRedeemSuccess(false);
          setRedeemedCode(null);
        }}
        title={redeemSuccess ? t.rewards.redeemSuccess : t.rewards.redeemTitle}
      >
        {selectedGift && (
          <div className="space-y-4 text-center">
            {!redeemSuccess ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-2)] border border-[var(--line)]">
                  {selectedGift.icon}
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-bold text-[var(--washi)]">
                    {selectedGift.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    {selectedGift.desc}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[12.5px]">
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--muted)]">
                      {lang === "ja" ? "必要ポイント:" : lang === "en" ? "Points required:" : "Điểm cần dùng:"}
                    </span>
                    <b className="text-[var(--gold)] font-display text-[14px]">
                      {formatNumber(selectedGift.pointsCost)} {t.rewards.pts}
                    </b>
                  </div>
                  <div className="flex justify-between py-1 border-t border-[var(--line)]">
                    <span className="text-[var(--muted)]">
                      {lang === "ja" ? "交換後の残高:" : lang === "en" ? "Balance after:" : "Điểm sau khi đổi:"}
                    </span>
                    <b className="text-[var(--washi)]">
                      {formatNumber(Math.max(0, points - selectedGift.pointsCost))} {t.rewards.pts}
                    </b>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedGift(null)}
                    className="flex-1 h-10 rounded-full border border-[var(--line)] bg-[var(--surface-2)] font-semibold text-[13px] text-[var(--muted)] active:scale-95"
                  >
                    {t.rewards.cancel}
                  </button>
                  <button
                    onClick={handleConfirmRedeem}
                    className="flex-1 h-10 rounded-full bg-[var(--shu)] font-bold text-[13px] text-white shadow-md active:scale-95 hover:brightness-110"
                  >
                    {t.rewards.confirmRedeem}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <IconCheck size={28} />
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-bold text-[var(--washi)]">
                    {t.rewards.redeemSuccess}
                  </h3>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    {lang === "ja"
                      ? "優待コードがウォレットに保存されました。"
                      : lang === "en"
                      ? "The voucher code has been added to your wallet."
                      : "Mã ưu đãi đã được lưu vào ví voucher của bạn."}
                  </p>
                </div>

                {/* Mã Voucher */}
                <div className="rounded-xl border-2 border-dashed border-[var(--gold)] bg-[var(--surface-2)] p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
                    {t.rewards.yourVoucherCode}
                  </div>
                  <div className="font-mono text-[20px] font-extrabold tracking-widest text-[var(--gold)] mt-0.5">
                    {redeemedCode}
                  </div>
                  <div className="text-[10.5px] text-[var(--muted)] mt-1">
                    {t.rewards.useCodeHint}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedGift(null);
                    setRedeemSuccess(false);
                    setRedeemedCode(null);
                    navigate("/menu");
                  }}
                  className="w-full h-11 rounded-full bg-[var(--shu)] font-bold text-[13px] text-white shadow-md active:scale-95"
                >
                  {t.rewards.useAtMenu}
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </Screen>
  );
}
