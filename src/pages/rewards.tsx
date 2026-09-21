import { useAtom, useAtomValue } from "jotai";
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
import { haptic, scanTableQR } from "@/services/zalo";
import {
  MembershipTier,
  PointsHistoryItem,
  pointsHistoryAtom,
  redeemGiftAtom,
  tableIdAtom,
  userAtom,
  userPointsAtom,
  userTierAtom,
} from "@/state/atoms";
import { formatNumber, vnd } from "@/utils/format";

/* ─── Danh mục quà tặng đổi điểm ─── */
type GiftCategory = "all" | "voucher" | "dish" | "drink";

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

const REWARD_GIFTS: RewardGift[] = [
  {
    id: "gift-v50",
    category: "voucher",
    title: "Voucher Giảm 50.000đ",
    desc: "Trừ trực tiếp trên hoá đơn dùng bữa hoặc mua thịt Butcher",
    worthText: "Trị giá 50.000đ",
    pointsCost: 50,
    badge: "Dễ đổi nhất",
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-v100",
    category: "voucher",
    title: "Voucher Giảm 100.000đ",
    desc: "Áp dụng cho hoá đơn từ 500.000đ tại toàn hệ thống",
    worthText: "Trị giá 100.000đ",
    pointsCost: 100,
    badge: "Phổ biến",
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-v200",
    category: "voucher",
    title: "Voucher Giảm 200.000đ",
    desc: "Áp dụng cho mọi bữa ăn hoặc đơn hàng Wagyu Butcher",
    worthText: "Trị giá 200.000đ",
    pointsCost: 200,
    badge: "Ưu đãi lớn",
    icon: <Icon3DVoucher size={36} />,
  },
  {
    id: "gift-sashimi",
    category: "dish",
    title: "Sashimi Cá Hồi Na Uy Tươi",
    desc: "Tặng 1 đĩa Sashimi cá hồi nhập khẩu Na Uy hảo hạng",
    worthText: "Trị giá 185.000đ",
    pointsCost: 250,
    badge: "Món Bếp Trưởng",
    icon: <Icon3DSushi size={36} />,
  },
  {
    id: "gift-wagyu",
    category: "dish",
    title: "Bò Wagyu A5 Nướng Đá Núi Lửa",
    desc: "Tặng 1 phần Wagyu A5 nướng đá thơm lừng béo ngậy",
    worthText: "Trị giá 360.000đ",
    pointsCost: 450,
    badge: "Wagyu A5",
    icon: <Icon3DMeat size={36} />,
  },
  {
    id: "gift-sake",
    category: "drink",
    title: "Chai Rượu Sake Vảy Vàng 720ml",
    desc: "Rượu Sake thượng hạng chứa vảy vàng 24k tinh khiết Nhật Bản",
    worthText: "Trị giá 790.000đ",
    pointsCost: 800,
    badge: "VIP Gift",
    icon: <Icon3DPoints size={36} />,
  },
  {
    id: "gift-omakase",
    category: "dish",
    title: "1 Vé Omakase Thượng Hạng",
    desc: "Trải nghiệm trọn vẹn set menu 12 món do Bếp trưởng phục vụ",
    worthText: "Trị giá 1.500.000đ",
    pointsCost: 1500,
    badge: "Đặc biệt",
    icon: <Icon3DFire size={36} />,
  },
];

/* ─── Nhiệm vụ kiếm thêm điểm ─── */
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

  // Quests state (mô phỏng check-in/nhiệm vụ)
  const [quests, setQuests] = useState<Quest[]>([
    {
      id: "q-checkin",
      title: "Điểm danh mỗi ngày",
      desc: "Mở Zalo Mini App để nhận điểm tích luỹ hàng ngày",
      points: 15,
      icon: "📅",
      actionText: "Điểm danh",
    },
    {
      id: "q-dinein",
      title: "Check-in dùng bữa tại nhà hàng",
      desc: "Quét QR tại bàn ăn hoặc hoá đơn thanh toán",
      points: 30,
      icon: "🥢",
      actionText: "Quét QR",
    },
    {
      id: "q-review",
      title: "Đánh giá dịch vụ 5 sao",
      desc: "Để lại cảm nhận và hình ảnh trải nghiệm ẩm thực",
      points: 50,
      icon: "⭐",
      actionText: "Đánh giá",
    },
    {
      id: "q-share",
      title: "Chia sẻ Miyako cho bạn bè",
      desc: "Mời bạn bè cùng gia nhập Miyako VIP Club",
      points: 100,
      icon: "🎁",
      actionText: "Chia sẻ",
    },
  ]);

  // Quét QR
  const handleScan = async () => {
    const content = await scanTableQR();
    if (!content) return;
    const match = content.match(/table=([A-Za-z0-9-]+)/);
    setTableId(match?.[1] ?? content.slice(0, 12));
    // Tự động thưởng 30 điểm khi quét QR bàn
    haptic("medium");
    setPoints((p) => p + 30);
    setHistory((prev) => [
      {
        id: "p-" + Date.now(),
        title: "Tích điểm quét QR tại bàn",
        desc: `Thưởng quét QR bàn ${match?.[1] ?? content.slice(0, 8)}`,
        date: "Vừa xong",
        points: 30,
        type: "order",
      },
      ...prev,
    ]);
  };

  // Tiến trình hạng thành viên
  const tierInfo = useMemo(() => {
    switch (tier) {
      case "silver":
        return {
          name: "Silver Member",
          title: "Hạng Bạc",
          rateText: "Tích 5% hoá đơn",
          nextTier: "Hạng Vàng",
          needed: 1000 - points,
          progress: Math.min(100, Math.round((points / 1000) * 100)),
          color: "from-zinc-400 to-slate-200",
          cardBg: "from-[#22272b] via-[#161a1d] to-[#0c0e10]",
          badgeBg: "bg-slate-400/20 text-slate-300 border-slate-400/30",
        };
      case "platinum":
        return {
          name: "Platinum Member",
          title: "Hạng Bạch Kim",
          rateText: "Tích 12% hoá đơn",
          nextTier: "Hạng Tối Thượng",
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
          title: "Hạng Vàng",
          rateText: "Tích 8% hoá đơn",
          nextTier: "Hạng Bạch Kim",
          needed: Math.max(0, 2000 - points),
          progress: Math.min(100, Math.round((points / 2000) * 100)),
          color: "from-amber-300 via-yellow-400 to-amber-600",
          cardBg: "from-[#2c2009] via-[#1c1404] to-[#0c0902]",
          badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/30",
        };
    }
  }, [tier, points]);

  // Lọc quà
  const filteredGifts = useMemo(() => {
    if (giftCategory === "all") return REWARD_GIFTS;
    return REWARD_GIFTS.filter((g) => g.category === giftCategory);
  }, [giftCategory]);

  // Xử lý đổi quà
  const handleConfirmRedeem = () => {
    if (!selectedGift) return;
    if (points < selectedGift.pointsCost) {
      haptic("light");
      return;
    }

    haptic("medium");
    const success = redeemGift({
      id: selectedGift.id,
      title: selectedGift.title,
      pointsCost: selectedGift.pointsCost,
    });

    if (success) {
      const randomCode =
        "MYK-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      setRedeemedCode(randomCode);
      setRedeemSuccess(true);
    }
  };

  // Hoàn thành nhiệm vụ
  const handleCompleteQuest = (q: Quest) => {
    if (q.completed) return;
    haptic("medium");
    setPoints((p) => p + q.points);
    setQuests((prev) =>
      prev.map((item) => (item.id === q.id ? { ...item, completed: true } : item))
    );
    setHistory((prev) => [
      {
        id: "p-" + Date.now(),
        title: `Nhiệm vụ: ${q.title}`,
        desc: "Thưởng hoàn thành nhiệm vụ tích luỹ",
        date: "Vừa xong",
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
          paddingTop: "calc(max(var(--sat), env(safe-area-inset-top, 0px)) + 26px)",
        }}
      >
        <div className="flex h-9 items-center justify-between gap-2">
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
            🎁 Đổi Quà & Voucher
          </Chip>
          <Chip
            active={activeTab === "tiers"}
            onClick={() => {
              haptic("light");
              setActiveTab("tiers");
            }}
          >
            👑 Đặc Quyền Hạng
          </Chip>
          <Chip
            active={activeTab === "quests"}
            onClick={() => {
              haptic("light");
              setActiveTab("quests");
            }}
          >
            🎯 Nhiệm Vụ Kiếm Điểm
          </Chip>
          <Chip
            active={activeTab === "history"}
            onClick={() => {
              haptic("light");
              setActiveTab("history");
            }}
          >
            📜 Lịch Sử Điểm
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
                  Miyako Club
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tierInfo.badgeBg}`}
                >
                  {tierInfo.title}
                </span>
              </div>
              <h2 className="mt-1 font-display text-[17px] font-bold tracking-wide">
                {user?.name ?? "Quý Khách Hàng"}
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
            <div className="text-[11px] text-[var(--faint)]">Số điểm tích luỹ</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-extrabold tracking-tight text-[var(--gold)]">
                {formatNumber(points)}
              </span>
              <span className="text-[13px] font-medium text-[var(--washi)]">
                điểm thưởng
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
                  ? `Còn ${tierInfo.needed} điểm để lên ${tierInfo.nextTier}`
                  : "Hạng cao nhất"}
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
              <span>Mở Mã Tích Điểm Tại Quầy</span>
            </button>
            <button
              onClick={handleScan}
              className="flex items-center justify-center gap-1 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/15 active:scale-98 transition-transform"
            >
              <span>Quét Bàn</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: ĐỔI QUÀ & VOUCHER ─── */}
        {activeTab === "gifts" && (
          <div className="space-y-3">
            {/* Bộ lọc loại quà */}
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
                Ưu Đãi & Quà Tặng Đổi Điểm
              </h3>
              <span className="text-[11.5px] text-[var(--muted)]">
                {filteredGifts.length} phần quà
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
                Tất cả
              </button>
              <button
                onClick={() => setGiftCategory("voucher")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "voucher"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                Voucher Tiền Mặt
              </button>
              <button
                onClick={() => setGiftCategory("dish")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "dish"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                Món Thượng Hạng
              </button>
              <button
                onClick={() => setGiftCategory("drink")}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  giftCategory === "drink"
                    ? "bg-[var(--shu)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
                }`}
              >
                Rượu Sake & Đồ Uống
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
                            {formatNumber(gift.pointsCost)} điểm
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
                      {canAfford ? "Đổi ngay" : "Chưa đủ"}
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
              Quyền Lợi Theo Từng Hạng Hội Viên
            </h3>

            {/* Bạc */}
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🥉</span>
                  <div>
                    <h4 className="font-display text-[15px] font-bold text-slate-300">
                      Hạng Bạc (Silver)
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      Từ 0 đến 999 điểm tích luỹ
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-bold text-slate-300 border border-slate-500/30">
                  Tích 5%
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--muted)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Tích luỹ 5% trên mọi hoá đơn ăn tại quán hoặc Butcher</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Tặng voucher 100.000đ trong tuần sinh nhật</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Quyền đổi quà và voucher từ kho điểm thưởng</span>
                </li>
              </ul>
            </div>

            {/* Vàng (Hiện tại) */}
            <div className="rounded-2xl border-2 border-[var(--gold)] bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface)] p-4 shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bg-[var(--gold)] text-black text-[9.5px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                Hạng Của Bạn
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🥈</span>
                  <div>
                    <h4 className="font-display text-[15px] font-bold text-[var(--gold)]">
                      Hạng Vàng (Gold Member)
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      Từ 1.000 đến 1.999 điểm
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-[var(--gold)] border border-[var(--gold)]/30">
                  Tích 8%
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--washi)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>Tích luỹ 8% giá trị mọi hoá đơn (ăn tại chỗ & mang về)</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>Tặng 1 đĩa Sashimi Cá Hồi thượng hạng tháng sinh nhật</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>Ưu tiên xếp bàn phòng riêng Tatami sang trọng</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-[var(--gold)] shrink-0" />
                  <span>Trải nghiệm trước các món mới trong mùa Omakase</span>
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
                      Hạng Bạch Kim (Platinum)
                    </h4>
                    <span className="text-[11px] text-[var(--faint)]">
                      Từ 2.000 điểm trở lên
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/30">
                  Tích 12%
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--muted)] border-t border-[var(--line)] pt-3">
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>Tích luỹ tối đa 12% giá trị trên mọi hoá đơn</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>Miễn phí 100% phụ phí phòng VIP & Tatami riêng tư</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>Tặng 1 chai Sake vảy vàng 720ml vào ngày sinh nhật</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck size={14} className="text-cyan-400 shrink-0" />
                  <span>Đầu bếp trưởng Omakase thiết kế thực đơn riêng</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ─── TAB 3: NHIỆM VỤ NHẬN ĐIỂM ─── */}
        {activeTab === "quests" && (
          <div className="space-y-3">
            <h3 className="font-display text-[15px] font-bold text-[var(--washi)]">
              Nhiệm Vụ Kiếm Thêm Điểm Thưởng
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
                          +{q.points}đ
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
                    {q.completed ? "Đã nhận" : q.actionText}
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
              Lịch Sử Biến Động Điểm
            </h3>

            {history.length === 0 ? (
              <EmptyState
                kanji="点"
                title="Chưa có giao dịch điểm"
                hint="Hãy dùng bữa tại Miyako hoặc mua thịt Butcher để bắt đầu tích luỹ điểm thưởng nhé."
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
                        {isPositive ? `+${item.points}` : `${item.points}`}đ
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
        title="Mã Tích Điểm Tại Quầy"
      >
        <div className="p-4 text-center space-y-4">
          <div className="text-[12.5px] text-[var(--muted)]">
            Đưa mã này cho nhân viên thu ngân khi thanh toán để được tích{" "}
            <b className="text-[var(--gold)]">{tierInfo.rateText}</b> vào tài khoản.
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
            Thành viên: <b className="text-[var(--washi)]">{user?.name ?? "Quý Khách"}</b> · Điểm hiện có:{" "}
            <b className="text-[var(--gold)]">{formatNumber(points)} điểm</b>
          </div>

          <button
            onClick={() => setQrSheetOpen(false)}
            className="w-full h-11 rounded-full bg-[var(--surface-3)] font-bold text-[13px] text-[var(--washi)] active:scale-98 transition-transform border border-[var(--line)]"
          >
            Đóng
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
        title={redeemSuccess ? "Đổi Quà Thành Công!" : "Xác Nhận Đổi Quà"}
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
                    <span className="text-[var(--muted)]">Điểm cần dùng:</span>
                    <b className="text-[var(--gold)] font-display text-[14px]">
                      {formatNumber(selectedGift.pointsCost)} điểm
                    </b>
                  </div>
                  <div className="flex justify-between py-1 border-t border-[var(--line)]">
                    <span className="text-[var(--muted)]">Điểm sau khi đổi:</span>
                    <b className="text-[var(--washi)]">
                      {formatNumber(Math.max(0, points - selectedGift.pointsCost))} điểm
                    </b>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedGift(null)}
                    className="flex-1 h-10 rounded-full border border-[var(--line)] bg-[var(--surface-2)] font-semibold text-[13px] text-[var(--muted)] active:scale-95"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleConfirmRedeem}
                    className="flex-1 h-10 rounded-full bg-[var(--shu)] font-bold text-[13px] text-white shadow-md active:scale-95 hover:brightness-110"
                  >
                    Xác nhận đổi
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
                    Chúc mừng bạn đã đổi thành công!
                  </h3>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    Mã ưu đãi đã được lưu vào ví voucher của bạn.
                  </p>
                </div>

                {/* Mã Voucher */}
                <div className="rounded-xl border-2 border-dashed border-[var(--gold)] bg-[var(--surface-2)] p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--faint)]">
                    Mã Sử Dụng
                  </div>
                  <div className="font-mono text-[20px] font-extrabold tracking-widest text-[var(--gold)] mt-0.5">
                    {redeemedCode}
                  </div>
                  <div className="text-[10.5px] text-[var(--muted)] mt-1">
                    Đưa mã này cho nhân viên hoặc nhập khi đặt hàng
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
                  Sử dụng ngay tại Thực Đơn
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </Screen>
  );
}
