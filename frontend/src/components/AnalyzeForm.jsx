import { motion } from "framer-motion";
import { Globe, Link2, Loader2, ScanSearch, StickyNote } from "lucide-react";
import { fadeInUp } from "../animations/motionVariants";

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="label">
        <span className="flex items-center gap-2 text-skin-muted">
          <Icon size={13} />
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}

export function AnalyzeForm({
  domain,
  setDomain,
  url,
  setUrl,
  text,
  setText,
  loading,
  onSubmit,
  error,
}) {
  const canSubmit = !loading && (domain.trim() || url.trim());

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    onSubmit();
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="glass-card p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Analyze</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-skin-base">
            Run a new policy check
          </h2>
        </div>
        <div className="brand-mark h-10 w-10 rounded-2xl">
          <ScanSearch size={18} />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-skin-muted">
        Use a root domain or direct policy URL. If the site is not in ToS;DR, paste policy text so
        the AI fallback can still generate a verdict.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Domain" icon={Globe}>
          <input
            type="text"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            className="input-field"
          />
        </Field>

        <Field label="URL" icon={Link2}>
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/privacy"
            className="input-field"
          />
        </Field>

        <Field label="Policy Text" icon={StickyNote}>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            placeholder="Paste visible terms or privacy text for AI fallback"
            className="input-field min-h-[170px] resize-none"
          />
        </Field>

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.985 } : {}}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing terms
            </>
          ) : (
            <>
              <ScanSearch size={16} />
              Analyze Terms
            </>
          )}
        </motion.button>
      </form>

      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {error}
        </motion.div>
      ) : null}
    </motion.section>
  );
}
