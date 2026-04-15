import { motion } from "framer-motion";
import { Activity, Bot, Database, ShieldCheck } from "lucide-react";
import { staggerContainer, staggerItem } from "../animations/motionVariants";

const STATS = [
  {
    key: "total",
    label: "Analyzed",
    icon: Activity,
    accent: "amber",
    description: "Total websites",
  },
  {
    key: "tosdr",
    label: "ToS;DR",
    icon: Database,
    accent: "teal",
    description: "Database matches",
  },
  {
    key: "ai",
    label: "AI fallback",
    icon: Bot,
    accent: "sky",
    description: "Model-assisted checks",
  },
  {
    key: "rated",
    label: "Rated",
    icon: ShieldCheck,
    accent: "emerald",
    description: "With score bands",
  },
];

const accentMap = {
  amber: {
    surface: "rgba(245, 158, 11, 0.14)",
    text: "#f59e0b",
  },
  teal: {
    surface: "rgba(20, 184, 166, 0.14)",
    text: "#14b8a6",
  },
  sky: {
    surface: "rgba(14, 165, 233, 0.14)",
    text: "#0ea5e9",
  },
  emerald: {
    surface: "rgba(16, 185, 129, 0.14)",
    text: "#10b981",
  },
};

function StatCard({ label, value, icon: Icon, accent, description }) {
  const colors = accentMap[accent];

  return (
    <motion.article
      variants={staggerItem}
      whileHover={{ y: -4 }}
      className="glass-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ background: colors.surface, color: colors.text }}
        >
          <Icon size={18} />
        </div>
        <span className="text-[11px] uppercase tracking-[0.22em] text-skin-muted">
          {description}
        </span>
      </div>

      <div className="mt-6">
        <motion.p
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl font-black tracking-tight text-skin-base"
        >
          {value}
        </motion.p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-skin-muted">
          {label}
        </p>
      </div>
    </motion.article>
  );
}

export function StatsCards({ metrics }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
    >
      {STATS.map((stat) => (
        <StatCard
          key={stat.key}
          label={stat.label}
          value={metrics[stat.key] ?? 0}
          icon={stat.icon}
          accent={stat.accent}
          description={stat.description}
        />
      ))}
    </motion.div>
  );
}
