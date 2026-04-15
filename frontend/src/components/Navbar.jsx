import { motion } from "framer-motion";
import { ExternalLink, Menu, Shield, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const INSTALL_GUIDE_URL =
  import.meta.env.VITE_EXTENSION_INSTRUCTIONS_URL ||
  "https://github.com/Aazhs/ToS-Analyser/blob/main/README.md";

export function Navbar({ sidebarOpen, onSidebarToggle, isDark, onThemeToggle }) {
  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed inset-x-0 top-0 z-50 border-b px-4"
      style={{
        background: "rgba(var(--bg-secondary), 0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderColor: "rgb(var(--border-subtle))",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onSidebarToggle}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            data-tooltip={sidebarOpen ? "Close history" : "Open history (Ctrl+K)"}
            className="icon-button"
          >
            <motion.div animate={{ rotate: sidebarOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </motion.div>
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-skin-base">ToS Analyzer</p>
              <p className="text-[11px] uppercase tracking-[0.24em] text-skin-muted">
                Risk Dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-skin-muted sm:flex">
            <span className="status-indicator" />
            Smooth legal review workspace
          </div>

          <motion.a
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="header-link-button"
            aria-label="Open extension install instructions on GitHub"
          >
            <span className="header-link-dot" aria-hidden="true" />
            Install Browser Extension
            <ExternalLink size={14} />
          </motion.a>

          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        </div>
      </div>
    </motion.header>
  );
}
