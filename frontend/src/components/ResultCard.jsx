import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  CircleDollarSign,
  Database,
  Info,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { progressBar, staggerContainer, staggerItem } from "../animations/motionVariants";

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function scoreFromRating(rating) {
  if (!rating) {
    return null;
  }

  const map = { A: 92, B: 78, C: 58, D: 38, E: 18 };
  return map[rating.toUpperCase()] ?? null;
}

const ratingConfig = {
  A: {
    label: "Excellent",
    surface: "rgba(16, 185, 129, 0.12)",
    text: "#10b981",
    border: "rgba(16, 185, 129, 0.24)",
    bar: "#10b981",
    Icon: ShieldCheck,
  },
  B: {
    label: "Good",
    surface: "rgba(59, 130, 246, 0.12)",
    text: "#3b82f6",
    border: "rgba(59, 130, 246, 0.24)",
    bar: "#3b82f6",
    Icon: Shield,
  },
  C: {
    label: "Mixed",
    surface: "rgba(245, 158, 11, 0.12)",
    text: "#f59e0b",
    border: "rgba(245, 158, 11, 0.24)",
    bar: "#f59e0b",
    Icon: ShieldAlert,
  },
  D: {
    label: "Risky",
    surface: "rgba(249, 115, 22, 0.12)",
    text: "#f97316",
    border: "rgba(249, 115, 22, 0.24)",
    bar: "#f97316",
    Icon: ShieldAlert,
  },
  E: {
    label: "Severe risk",
    surface: "rgba(239, 68, 68, 0.12)",
    text: "#ef4444",
    border: "rgba(239, 68, 68, 0.24)",
    bar: "#ef4444",
    Icon: ShieldX,
  },
};

function classifyPoint(point) {
  const text = point.toLowerCase();
  const positive = ["delete", "request", "control", "opt-out", "notify", "consent", "rights"];
  const negative = ["share", "sell", "track", "retain", "monitor", "without notice", "waive"];

  const positiveScore = positive.filter((word) => text.includes(word)).length;
  const negativeScore = negative.filter((word) => text.includes(word)).length;

  if (positiveScore > negativeScore) {
    return "positive";
  }

  if (negativeScore > positiveScore) {
    return "negative";
  }

  return "neutral";
}

function RatingBadge({ rating }) {
  const config = ratingConfig[rating?.toUpperCase()];
  if (!config) {
    return null;
  }

  const Icon = config.Icon;

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold"
      style={{
        background: config.surface,
        color: config.text,
        borderColor: config.border,
      }}
    >
      <Icon size={13} />
      {rating.toUpperCase()} / {config.label}
    </span>
  );
}

function SourceBadge({ source }) {
  const isAI = source?.toLowerCase().includes("ai");

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
      style={{
        background: isAI ? "rgba(14, 165, 233, 0.12)" : "rgba(20, 184, 166, 0.12)",
        color: isAI ? "#0ea5e9" : "#14b8a6",
        borderColor: isAI ? "rgba(14, 165, 233, 0.24)" : "rgba(20, 184, 166, 0.24)",
      }}
    >
      {isAI ? <Sparkles size={12} /> : <BadgeCheck size={12} />}
      {source || "Unknown"}
    </span>
  );
}

function RiskMeter({ score, rating }) {
  const config = ratingConfig[rating?.toUpperCase()] || {
    bar: "#94a3b8",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-skin-muted">
          Risk Score
        </p>
        <p className="text-sm font-bold" style={{ color: config.bar }}>
          {score}/100
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--bg-tertiary))]">
        <motion.div
          variants={progressBar(score)}
          initial="hidden"
          animate="visible"
          className="h-full rounded-full"
          style={{ background: config.bar }}
        />
      </div>
    </div>
  );
}

function KeyPointsList({ points }) {
  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
      {points.map((point, index) => {
        const tone = classifyPoint(point);
        const Icon =
          tone === "positive" ? ThumbsUp : tone === "negative" ? ThumbsDown : Info;
        const styles =
          tone === "positive"
            ? {
                background: "rgba(16, 185, 129, 0.08)",
                borderColor: "rgba(16, 185, 129, 0.22)",
                color: "#10b981",
              }
            : tone === "negative"
            ? {
                background: "rgba(239, 68, 68, 0.08)",
                borderColor: "rgba(239, 68, 68, 0.22)",
                color: "#ef4444",
              }
            : {
                background: "rgba(var(--bg-tertiary), 0.92)",
                borderColor: "rgba(var(--border-subtle), 0.8)",
                color: "rgb(var(--text-muted))",
              };

        return (
          <motion.li
            key={`${point}-${index}`}
            variants={staggerItem}
            className="flex items-start gap-3 rounded-2xl border px-4 py-3"
            style={{
              background: styles.background,
              borderColor: styles.borderColor,
            }}
          >
            <div className="mt-0.5">
              <Icon size={15} style={{ color: styles.color }} />
            </div>
            <p className="text-sm leading-6 text-skin-base">{point}</p>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function DetailCard({ title, icon: Icon, iconColor, children }) {
  return (
    <motion.section variants={staggerItem} className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `${iconColor}22`, color: iconColor }}
        >
          <Icon size={15} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-skin-muted">
          {title}
        </p>
      </div>
      <p className="text-sm leading-6 text-skin-base">{children || "No details available."}</p>
    </motion.section>
  );
}

export function ResultCard({ item }) {
  const score = scoreFromRating(item.rating);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id || item.domain}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-4"
      >
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Selected Analysis</p>
              <h2 className="mt-2 truncate text-3xl font-black tracking-tight text-skin-base">
                {item.domain || "Unknown domain"}
              </h2>
              <p className="mt-2 text-sm text-skin-muted">Analyzed {formatDate(item.created_at)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item.rating ? <RatingBadge rating={item.rating} /> : null}
              {item.source ? <SourceBadge source={item.source} /> : null}
            </div>
          </div>

          {item.risk_summary ? (
            <p className="mt-4 text-sm leading-7 text-skin-muted">{item.risk_summary}</p>
          ) : null}

          {score !== null ? (
            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <RiskMeter score={score} rating={item.rating} />
            </div>
          ) : null}
        </section>

        {item.key_points?.length ? (
          <section className="glass-card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="brand-mark h-9 w-9 rounded-2xl">
                <Scale size={16} />
              </div>
              <div>
                <p className="eyebrow">Key Points</p>
                <p className="text-sm font-semibold text-skin-base">
                  Highlights worth reviewing first
                </p>
              </div>
            </div>
            <KeyPointsList points={item.key_points} />
          </section>
        ) : null}

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-3 lg:grid-cols-2"
        >
          <DetailCard title="Risks" icon={AlertTriangle} iconColor="#ef4444">
            {item.risks}
          </DetailCard>
          <DetailCard title="Data Usage" icon={Database} iconColor="#0ea5e9">
            {item.data_usage}
          </DetailCard>
          <DetailCard title="Hidden Costs" icon={CircleDollarSign} iconColor="#f59e0b">
            {item.hidden_costs}
          </DetailCard>
          <DetailCard title="User Rights" icon={Scale} iconColor="#14b8a6">
            {item.user_rights}
          </DetailCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
