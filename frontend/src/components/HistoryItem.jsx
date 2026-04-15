import { motion } from "framer-motion";
import { Clock3, ExternalLink } from "lucide-react";
import { staggerItem } from "../animations/motionVariants";

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

const ratingColors = {
  A: { bg: "rgba(16, 185, 129, 0.12)", text: "#10b981", border: "rgba(16, 185, 129, 0.24)" },
  B: { bg: "rgba(59, 130, 246, 0.12)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.24)" },
  C: { bg: "rgba(245, 158, 11, 0.12)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.24)" },
  D: { bg: "rgba(249, 115, 22, 0.12)", text: "#f97316", border: "rgba(249, 115, 22, 0.24)" },
  E: { bg: "rgba(239, 68, 68, 0.12)", text: "#ef4444", border: "rgba(239, 68, 68, 0.24)" },
};

export function HistoryItem({ item, isActive, onClick }) {
  const rating = item.rating?.toUpperCase();
  const ratingColor = ratingColors[rating];

  return (
    <motion.button
      type="button"
      variants={staggerItem}
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.985 }}
      className="group relative w-full overflow-hidden rounded-2xl border px-3 py-3 text-left"
      style={{
        background: isActive ? "rgba(var(--accent-amber), 0.1)" : "rgba(var(--bg-tertiary), 0.82)",
        borderColor: isActive ? "rgba(var(--accent-amber), 0.35)" : "rgba(var(--border-subtle), 0.7)",
      }}
    >
      {isActive ? (
        <motion.div
          layoutId="selected-history-item"
          className="absolute inset-y-2 left-0 w-1 rounded-full"
          style={{ background: "rgb(var(--accent-amber))" }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-skin-base">
            {item.domain || "Unknown domain"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-skin-muted">
            <Clock3 size={11} />
            <span>{formatDate(item.created_at)}</span>
            {item.source ? <span className="opacity-50">/</span> : null}
            {item.source ? (
              <span className="uppercase tracking-[0.18em]">{item.source}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {ratingColor ? (
            <span
              className="rounded-full border px-2 py-1 text-[10px] font-bold"
              style={{
                background: ratingColor.bg,
                color: ratingColor.text,
                borderColor: ratingColor.border,
              }}
            >
              {rating}
            </span>
          ) : null}
          <ExternalLink size={12} className="opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
      </div>
    </motion.button>
  );
}
