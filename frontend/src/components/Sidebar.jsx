import { AnimatePresence, motion } from "framer-motion";
import { History, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { overlayVariants, slideInLeft, staggerContainer } from "../animations/motionVariants";
import { HistoryItem } from "./HistoryItem";

export function Sidebar({ open, onClose, history, selectedId, onSelectItem }) {
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return undefined;
    }

    const timer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [open]);

  const filteredHistory = history.filter((item) =>
    (item.domain || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="sidebar-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="sidebar-overlay lg:hidden"
            aria-label="Close history sidebar"
          />

          <motion.aside
            key="sidebar-panel"
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[calc(100vw-1.5rem)] flex-col border-r pt-16"
            style={{
              background: "rgba(var(--bg-secondary), 0.9)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderColor: "rgb(var(--border))",
            }}
          >
            <div className="border-b px-4 py-4" style={{ borderColor: "rgb(var(--border-subtle))" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="brand-mark h-8 w-8 rounded-xl">
                    <History size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-skin-base">Analysis History</p>
                    <p className="text-xs text-skin-muted">
                      {history.length ? `${history.length} saved analyses` : "No saved analyses yet"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close sidebar"
                  className="icon-button h-9 w-9"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="relative mt-4">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-skin-muted"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search domains"
                  className="input-field pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {filteredHistory.length ? (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {filteredHistory.map((item) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      isActive={selectedId === item.id}
                      onClick={() => {
                        onSelectItem(item);
                        onClose();
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="brand-mark h-12 w-12 rounded-2xl">
                    <History size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-skin-base">
                      {search ? "No matching domains" : "No history yet"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-skin-muted">
                      {search
                        ? "Try a shorter search term or clear the search field."
                        : "Run an analysis and it will appear here for one-click access."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t px-4 py-3 text-xs text-skin-muted" style={{ borderColor: "rgb(var(--border-subtle))" }}>
              <span className="shortcut-pill">Ctrl+K</span>
              <span className="ml-2">opens or closes history</span>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
