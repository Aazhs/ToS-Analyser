import { startTransition, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { analyzeWebsite, fetchHistory as fetchBackendHistory } from "./api";
import { fadeInUp, staggerContainer } from "./animations/motionVariants";
import { AnalyzeForm } from "./components/AnalyzeForm";
import { EmptyState } from "./components/EmptyState";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { Navbar } from "./components/Navbar";
import { ResultCard } from "./components/ResultCard";
import { Sidebar } from "./components/Sidebar";
import { StatsCards } from "./components/StatsCards";
import { useSupabase } from "./hooks/useSupabase";
import { useTheme } from "./hooks/useTheme";

const HISTORY_LIMIT = 100;

function makeHistoryFingerprint(item) {
  return [
    item.domain || "",
    item.source || "",
    item.rating || "",
    item.created_at || "",
    item.risk_summary || "",
  ].join("|");
}

function normalizeHistoryItem(item, origin) {
  const rawId = item?.id ?? item?._supabase_id ?? item?.created_at ?? Date.now();

  return {
    ...item,
    id: `${origin}:${rawId}`,
    _origin: origin,
  };
}

function mergeHistoryLists(...lists) {
  const seen = new Set();
  const merged = [];

  for (const list of lists) {
    for (const item of list) {
      const fingerprint = makeHistoryFingerprint(item);
      if (seen.has(fingerprint)) {
        continue;
      }

      seen.add(fingerprint);
      merged.push(item);
    }
  }

  return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function buildMetrics(history) {
  return {
    total: history.length,
    tosdr: history.filter((item) => item.source === "ToS;DR").length,
    ai: history.filter((item) => item.source === "AI").length,
    rated: history.filter((item) => Boolean(item.rating)).length,
  };
}

export default function App() {
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");

  const { isDark, toggleTheme } = useTheme();
  const { fetchHistory, saveAnalysis, supabaseEnabled } = useSupabase();

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setHistoryNotice("");

      const [supabaseResult, backendResult] = await Promise.allSettled([
        fetchHistory(HISTORY_LIMIT),
        fetchBackendHistory(HISTORY_LIMIT),
      ]);

      if (!mounted) {
        return;
      }

      const supabaseHistory =
        supabaseResult.status === "fulfilled"
          ? supabaseResult.value.map((item) => normalizeHistoryItem(item, "supabase"))
          : [];
      const backendHistory =
        backendResult.status === "fulfilled"
          ? (backendResult.value.items || []).map((item) => normalizeHistoryItem(item, "backend"))
          : [];

      const mergedHistory = mergeHistoryLists(supabaseHistory, backendHistory);

      setHistory(mergedHistory);
      setSelected((current) => {
        if (!current) {
          return mergedHistory[0] || null;
        }

        return mergedHistory.find((item) => item.id === current.id) || mergedHistory[0] || null;
      });
      setHistoryLoaded(true);

      if (supabaseResult.status === "rejected" && backendResult.status === "rejected") {
        setHistoryNotice("History could not be loaded right now.");
      } else if (!supabaseEnabled) {
        setHistoryNotice("Supabase is not configured yet. Showing backend history only.");
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [fetchHistory, supabaseEnabled]);

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) {
        return;
      }

      event.preventDefault();
      setSidebarOpen((open) => !open);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const metrics = useMemo(() => buildMetrics(history), [history]);

  async function handleAnalyze() {
    setError("");
    setLoading(true);

    try {
      const result = await analyzeWebsite({ domain, url, text });
      const localEntry = normalizeHistoryItem(
        {
          ...result,
          created_at: result.created_at || new Date().toISOString(),
        },
        "session"
      );

      setHistory((current) => mergeHistoryLists([localEntry], current));
      setSelected(localEntry);
      setSidebarOpen(false);
      setText("");

      startTransition(() => {
        saveAnalysis(result);
      });
    } catch (err) {
      setError(err.message || "Something went wrong while analyzing the website.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app text-skin-base transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient ambient-amber" />
        <div className="ambient ambient-cyan" />
        <div className="ambient ambient-grid" />
      </div>

      <Navbar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen((open) => !open)}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        selectedId={selected?.id}
        onSelectItem={setSelected}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 lg:grid-cols-[1.35fr,0.95fr]"
        >
          <motion.div variants={fadeInUp} className="hero-card">
            <div className="badge-pill">
              <Sparkles size={14} />
              Trusted policy intelligence for faster decisions
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Terms of Service Analyzer
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-skin-muted sm:text-base">
              Review policies like a polished SaaS control center. Search a domain, paste
              extracted legal text, and get a concise, color-coded risk snapshot with history you
              can revisit anytime.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-skin-muted">
              <span className="chip">ToS;DR first</span>
              <span className="chip">AI fallback</span>
              <span className="chip">Supabase history</span>
              <span className="chip">Ctrl+K quick history</span>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Workspace</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Policy monitoring cockpit
                </h2>
              </div>
              <div className="status-dot">
                <span className="status-indicator" />
                Ready
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-skin-muted">
              The dashboard stays connected to your FastAPI analyzer, layers in persistent history,
              and keeps previous verdicts one click away in the sidebar.
            </p>

            {historyNotice ? (
              <div className="notice-card mt-5">{historyNotice}</div>
            ) : null}
          </motion.div>
        </motion.section>

        <section className="mt-6">
          <StatsCards metrics={metrics} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[380px,1fr]">
          <AnalyzeForm
            domain={domain}
            setDomain={setDomain}
            url={url}
            setUrl={setUrl}
            text={text}
            setText={setText}
            loading={loading}
            onSubmit={handleAnalyze}
            error={error}
          />

          <motion.section
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="glass-card min-h-[520px] p-5 sm:p-6"
          >
            {!historyLoaded && !selected ? (
              <LoadingOverlay visible />
            ) : loading ? (
              <LoadingOverlay visible />
            ) : selected ? (
              <ResultCard item={selected} />
            ) : (
              <EmptyState />
            )}
          </motion.section>
        </section>
      </main>
    </div>
  );
}
