import { AnimatePresence, motion } from "framer-motion";
import { ScanSearch } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  "Querying ToS;DR records",
  "Parsing policy details",
  "Running AI fallback if needed",
  "Scoring risk factors",
  "Preparing the final summary",
];

export function LoadingOverlay({ visible }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % STEPS.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex h-full min-h-[360px] flex-col items-center justify-center gap-6"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="brand-mark h-16 w-16 rounded-[1.75rem]"
            >
              <ScanSearch size={28} />
            </motion.div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.45, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-amber))] shadow-[0_0_12px_rgba(245,158,11,0.55)]" />
            </motion.div>
          </div>

          <div className="text-center">
            <h3 className="text-lg font-black tracking-tight text-skin-base">Analyzing terms</h3>
            <div className="mt-2 h-5 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={STEPS[stepIndex]}
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.28 }}
                  className="text-sm text-skin-muted"
                >
                  {STEPS[stepIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="h-1.5 w-52 overflow-hidden rounded-full bg-[rgb(var(--bg-tertiary))]">
            <motion.div
              className="h-full w-2/5 rounded-full bg-[rgb(var(--accent-amber))]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
