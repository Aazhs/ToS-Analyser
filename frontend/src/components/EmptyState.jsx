import { motion } from "framer-motion";
import { FileSearch } from "lucide-react";
import { scaleIn } from "../animations/motionVariants";

export function EmptyState() {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="flex h-full min-h-[360px] flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-dashed border-white/10 p-8 text-center"
    >
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="brand-mark h-16 w-16 rounded-[1.5rem]"
        >
          <FileSearch size={28} />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.45, 0, 0.45] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 0.2 }}
          className="absolute inset-0 rounded-[1.5rem] border border-amber-400/30"
        />
      </div>

      <div>
        <h3 className="text-xl font-black tracking-tight text-skin-base">No analysis selected</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-skin-muted">
          Start with the form on the left or open the history drawer to revisit a previous result.
        </p>
      </div>

      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-skin-muted">
        <span className="shortcut-pill">Ctrl+K</span>
        <span className="ml-2">to open history</span>
      </div>
    </motion.div>
  );
}
