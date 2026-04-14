import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeWebsite, fetchHistory } from "./api";

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function scoreFromRating(rating) {
  if (!rating) return null;
  const map = { A: 92, B: 80, C: 62, D: 36, E: 18 };
  return map[String(rating).toUpperCase()] ?? null;
}

function getRiskMeta(item = {}) {
  const score = scoreFromRating(item.rating);
  const summary = `${item.risk_summary || ""} ${item.risks || ""}`.toLowerCase();

  if (score !== null) {
    if (score >= 78) {
      return {
        label: "Safe",
        tone: "safe",
        score,
        badgeClass: "border-success-500/25 bg-success-500/12 text-emerald-200",
        pillClass: "bg-success-500/15 text-emerald-200 ring-1 ring-success-500/25"
      };
    }

    if (score >= 50) {
      return {
        label: "Warning",
        tone: "warning",
        score,
        badgeClass: "border-warning-500/25 bg-warning-500/12 text-amber-200",
        pillClass: "bg-warning-500/15 text-amber-200 ring-1 ring-warning-500/25"
      };
    }

    return {
      label: "Dangerous",
      tone: "danger",
      score,
      badgeClass: "border-danger-500/25 bg-danger-500/12 text-rose-200",
      pillClass: "bg-danger-500/15 text-rose-200 ring-1 ring-danger-500/25"
    };
  }

  if (/(high|risky|extensive|broad|profiling|tracking|share|ads|cross-service)/.test(summary)) {
    return {
      label: "Warning",
      tone: "warning",
      score: 55,
      badgeClass: "border-warning-500/25 bg-warning-500/12 text-amber-200",
      pillClass: "bg-warning-500/15 text-amber-200 ring-1 ring-warning-500/25"
    };
  }

  return {
    label: "Review",
    tone: "neutral",
    score: 48,
    badgeClass: "border-white/15 bg-white/6 text-slate-200",
    pillClass: "bg-white/8 text-slate-200 ring-1 ring-white/10"
  };
}

function getSourceLabel(source) {
  if (!source) return "Unknown";
  if (source === "AI") return "Gemini AI";
  return source;
}

function sortHistory(items, sortBy) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortBy === "oldest") {
      return new Date(left.created_at || 0) - new Date(right.created_at || 0);
    }

    if (sortBy === "risk") {
      return (getRiskMeta(right).score || 0) - (getRiskMeta(left).score || 0);
    }

    if (sortBy === "safest") {
      return (getRiskMeta(left).score || 0) - (getRiskMeta(right).score || 0);
    }

    return new Date(right.created_at || 0) - new Date(left.created_at || 0);
  });

  return sorted;
}

export default function App() {
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const analyzeRef = useRef(null);
  const historyRef = useRef(null);
  const domainInputRef = useRef(null);

  useEffect(() => {
    fetchHistory(100)
      .then((res) => {
        const items = res.items || [];
        setHistory(items);
        setSelected(items[0] || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setHistoryLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const total = history.length;
    const highRisk = history.filter((item) => getRiskMeta(item).tone === "danger").length;
    const safeSites = history.filter((item) => getRiskMeta(item).tone === "safe").length;
    const aiUsage = history.filter((item) => item.source === "AI").length;
    return { total, highRisk, safeSites, aiUsage };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = history.filter((item) => {
      const risk = getRiskMeta(item).tone;
      const matchesRisk = riskFilter === "all" || risk === riskFilter;
      const haystack = `${item.domain || ""} ${item.source || ""} ${item.risk_summary || ""}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesRisk && matchesQuery;
    });

    return sortHistory(filtered, sortBy);
  }, [history, query, riskFilter, sortBy]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await analyzeWebsite({ domain, url, text });
      const enriched = {
        ...result,
        id: result.id ?? Date.now(),
        created_at: result.created_at ?? new Date().toISOString()
      };

      setHistory((prev) => [enriched, ...prev]);
      setSelected(enriched);
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function scrollToAnalyze() {
    analyzeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => domainInputRef.current?.focus(), 350);
  }

  function scrollToHistory() {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6rem] top-16 h-72 w-72 rounded-full bg-brand-500/18 blur-3xl" />
        <div className="absolute right-[-5rem] top-0 h-80 w-80 rounded-full bg-sky-500/18 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <HeroSection
          metrics={metrics}
          onAnalyzeClick={scrollToAnalyze}
          onHistoryClick={scrollToHistory}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<ShieldIcon />}
            label="Total Analyses"
            value={metrics.total}
            detail="All dashboard and extension scans"
          />
          <MetricCard
            icon={<AlertIcon />}
            label="High Risk Alerts"
            value={metrics.highRisk}
            detail="Danger-level policies flagged"
            tone="danger"
          />
          <MetricCard
            icon={<CheckIcon />}
            label="Safe Sites"
            value={metrics.safeSites}
            detail="Lower-risk ratings with healthier terms"
            tone="safe"
          />
          <MetricCard
            icon={<SparkIcon />}
            label="AI Usage"
            value={metrics.aiUsage}
            detail="Gemini fallback summaries generated"
            tone="brand"
          />
        </section>

        <section
          id="analyze"
          ref={analyzeRef}
          className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]"
        >
          <AnalyzerCard
            domain={domain}
            url={url}
            text={text}
            error={error}
            loading={loading}
            onDomainChange={setDomain}
            onUrlChange={setUrl}
            onTextChange={setText}
            onSubmit={handleAnalyze}
            domainInputRef={domainInputRef}
          />

          <LivePreviewCard selected={selected} loading={loading} />
        </section>

        <section
          id="history"
          ref={historyRef}
          className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]"
        >
          <HistoryCard
            history={filteredHistory}
            historyLoading={historyLoading}
            selected={selected}
            query={query}
            riskFilter={riskFilter}
            sortBy={sortBy}
            onQueryChange={setQuery}
            onRiskFilterChange={setRiskFilter}
            onSortChange={setSortBy}
            onSelect={setSelected}
          />

          <ResultPanel item={selected} loading={historyLoading && !selected} />
        </section>
      </main>
    </div>
  );
}

function HeroSection({ metrics, onAnalyzeClick, onHistoryClick }) {
  return (
    <section className="glass-panel relative overflow-hidden px-6 py-7 md:px-8 md:py-9">
      <div className="absolute inset-0 bg-hero-mesh opacity-95" />
      <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-white/12 bg-white/10 blur-2xl md:block" />
      <div className="relative grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="animate-slide-up">
          <span className="section-chip">
            <ShieldIcon className="h-4 w-4 text-sky-300" />
            Trusted AI Policy Scanner
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Know the risk behind every signup before your users click continue.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            A polished trust layer for Terms of Service, privacy notices, and cookie banners.
            Review risky clauses faster, surface safer choices, and demo the product like a real SaaS platform.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onAnalyzeClick}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-indigo-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5"
            >
              Start an Analysis
              <ArrowIcon />
            </button>
            <button
              onClick={onHistoryClick}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-slate-100 transition duration-300 hover:border-white/30 hover:bg-white/12"
            >
              View Analysis History
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <TrustPill title="Policy detection" text="ToS, privacy, and cookie language recognition" />
            <TrustPill title="Risk controls" text="Auth gating until acknowledgement is complete" />
            <TrustPill title="Hybrid engine" text="ToS;DR coverage with AI fallback when needed" />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="glass-card animate-float p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Security posture snapshot</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Use the dashboard to compare policy health at a glance and show how the extension keeps users informed at the point of decision.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3 text-sky-300">
                <FingerprintIcon />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Tracked sites" value={metrics.total} />
              <MiniStat label="Alerts raised" value={metrics.highRisk} />
              <MiniStat label="AI assists" value={metrics.aiUsage} />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-500/12 p-3 text-indigo-200 ring-1 ring-brand-400/20">
                <PulseIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Demo-ready workflow</p>
                <p className="text-sm text-slate-400">Analyze, review, acknowledge, continue.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <FeatureRow
                icon={<SearchIcon className="h-4 w-4" />}
                title="Scan any domain manually"
                text="Search policies directly from the dashboard with an upgraded input flow."
              />
              <FeatureRow
                icon={<SparkIcon className="h-4 w-4" />}
                title="Generate clean AI summaries"
                text="Fallback analysis keeps the experience alive even when ToS;DR has no direct entry."
              />
              <FeatureRow
                icon={<LockIcon className="h-4 w-4" />}
                title="Pause risky signup actions"
                text="Extension prompts users with a clearer warning before account creation or login."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, detail, tone = "default" }) {
  const toneClasses = {
    default: "from-white/14 via-white/6 to-white/4 text-slate-100",
    danger: "from-danger-500/20 via-white/6 to-white/4 text-white",
    safe: "from-success-500/18 via-white/6 to-white/4 text-white",
    brand: "from-brand-500/20 via-white/6 to-white/4 text-white"
  };

  return (
    <div className={`metric-shell bg-gradient-to-br ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-white/12 bg-slate-950/60 p-3 text-slate-100">
          {icon}
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Live
        </span>
      </div>
      <div className="mt-6 text-sm font-semibold text-slate-300">{label}</div>
      <div className="mt-2 text-4xl font-black text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function AnalyzerCard({
  domain,
  url,
  text,
  error,
  loading,
  onDomainChange,
  onUrlChange,
  onTextChange,
  onSubmit,
  domainInputRef
}) {
  return (
    <section className="glass-card p-6 md:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="section-chip">Manual Analysis</span>
          <h2 className="mt-4 text-2xl font-bold text-white">Analyze a website or policy snippet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Paste a domain, a policy URL, or captured consent text from the extension. The workflow stays unchanged, but the input experience is now cleaner and easier to demo.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-3 text-sm text-indigo-100">
          ToS;DR first, AI fallback when coverage is missing
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <InputField
            label="Domain"
            value={domain}
            onChange={onDomainChange}
            placeholder="example.com"
            icon={<GlobeIcon className="h-5 w-5" />}
            inputRef={domainInputRef}
          />
          <InputField
            label="Policy URL"
            value={url}
            onChange={onUrlChange}
            placeholder="https://example.com/privacy"
            icon={<LinkIcon className="h-5 w-5" />}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-slate-200">Policy Text Fallback</label>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Optional</span>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-1 shadow-inner shadow-slate-950/40 transition duration-300 focus-within:border-brand-300/60 focus-within:shadow-[0_0_0_4px_rgba(99,102,241,0.16)]">
            <textarea
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              rows={8}
              placeholder="Paste visible terms, cookie notice, or privacy language to support AI analysis when a site is not in the database."
              className="min-h-[180px] w-full resize-y rounded-[1.3rem] border-0 bg-transparent px-4 py-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            Designed for fast demos on desktop and mobile
          </div>

          <button
            type="submit"
            disabled={loading || (!domain && !url)}
            className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-indigo-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner />
                Analyzing
              </>
            ) : (
              <>
                Analyze Terms
                <ArrowIcon />
              </>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-2xl border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </section>
  );
}

function LivePreviewCard({ selected, loading }) {
  const meta = getRiskMeta(selected || {});
  const score = selected ? meta.score : 0;

  return (
    <section className="glass-card overflow-hidden p-6 md:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="section-chip">Selected Summary</span>
          <h2 className="mt-4 text-2xl font-bold text-white">Risk briefing preview</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A cleaner executive summary card for live demos, investor walkthroughs, and extension-driven flows.
          </p>
        </div>
        <ScoreDial score={score} tone={meta.tone} />
      </div>

      <div className="mt-6 space-y-4">
        {loading && !selected ? (
          <div className="grid gap-3">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-20 w-full rounded-3xl" />
            <SkeletonBlock className="h-20 w-full rounded-3xl" />
          </div>
        ) : selected ? (
          <>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{selected.domain || "Unknown domain"}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {getSourceLabel(selected.source)} • {formatDate(selected.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <RiskPill meta={meta} />
                  {selected.rating ? (
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 ring-1 ring-white/10">
                      Rating {selected.rating}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                {selected.risk_summary || "No risk summary returned yet."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <PreviewStat
                title="Primary Risk"
                text={selected.risks || "Risk detail will appear here after analysis."}
              />
              <PreviewStat
                title="Data Usage"
                text={selected.data_usage || "Data usage detail will appear here after analysis."}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-dashed border-white/12 bg-slate-950/45 px-6 text-center text-sm leading-7 text-slate-500">
            Run a manual scan or select a result from history to show the redesigned summary view.
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryCard({
  history,
  historyLoading,
  selected,
  query,
  riskFilter,
  sortBy,
  onQueryChange,
  onRiskFilterChange,
  onSortChange,
  onSelect
}) {
  return (
    <section className="glass-card p-6 md:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="section-chip">Analysis History</span>
          <h2 className="mt-4 text-2xl font-bold text-white">Readable history with real risk scanning cues</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Filter by severity, search by domain, and sort for the riskiest or safest entries without changing the underlying backend behavior.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1.3fr,0.7fr,0.7fr]">
        <SearchField
          value={query}
          onChange={onQueryChange}
          placeholder="Search domains, sources, or summaries"
        />
        <SelectField
          label="Risk Filter"
          value={riskFilter}
          onChange={onRiskFilterChange}
          options={[
            { value: "all", label: "All risks" },
            { value: "safe", label: "Safe" },
            { value: "warning", label: "Warning" },
            { value: "danger", label: "Dangerous" },
            { value: "neutral", label: "Needs review" }
          ]}
        />
        <SelectField
          label="Sort By"
          value={sortBy}
          onChange={onSortChange}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "risk", label: "Highest risk" },
            { value: "safest", label: "Safest first" }
          ]}
        />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.75rem] border border-white/10 lg:block">
        <table className="min-w-full divide-y divide-white/8 text-left">
          <thead className="bg-white/6 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-5 py-4 font-semibold">Domain</th>
              <th className="px-5 py-4 font-semibold">Source</th>
              <th className="px-5 py-4 font-semibold">Risk</th>
              <th className="px-5 py-4 font-semibold">Rating</th>
              <th className="px-5 py-4 font-semibold">Analyzed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6 bg-slate-950/35 text-sm text-slate-200">
            {historyLoading
              ? Array.from({ length: 6 }).map((_, index) => <HistorySkeletonRow key={index} />)
              : history.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    selected={selected?.id === item.id}
                    onClick={() => onSelect(item)}
                  />
                ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 lg:hidden">
        {historyLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <SkeletonBlock className="h-5 w-1/2" />
              <SkeletonBlock className="mt-3 h-4 w-2/3" />
              <SkeletonBlock className="mt-4 h-12 w-full rounded-2xl" />
            </div>
          ))
        ) : history.length ? (
          history.map((item) => (
            <HistoryMobileCard
              key={item.id}
              item={item}
              selected={selected?.id === item.id}
              onClick={() => onSelect(item)}
            />
          ))
        ) : null}
      </div>

      {!historyLoading && !history.length ? (
        <div className="mt-5 rounded-[1.75rem] border border-dashed border-white/12 bg-slate-950/40 px-5 py-10 text-center text-sm text-slate-500">
          No analyses matched the current search and filter settings.
        </div>
      ) : null}
    </section>
  );
}

function ResultPanel({ item, loading }) {
  if (loading) {
    return (
      <section className="glass-card p-6 md:p-7">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="mt-4 h-28 w-full rounded-[1.75rem]" />
        <div className="mt-4 grid gap-4">
          <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
          <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
          <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
        </div>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="glass-card flex min-h-[520px] items-center justify-center p-6 md:p-7">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/12 text-indigo-200 ring-1 ring-brand-400/20">
            <ShieldIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">No analysis selected</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Choose an item from the history table or run a new analysis to open the redesigned risk report.
          </p>
        </div>
      </section>
    );
  }

  const meta = getRiskMeta(item);
  const score = meta.score ?? 48;
  const detailSections = [
    { title: "Key Points", value: item.key_points?.length ? item.key_points : null, list: true },
    { title: "Risks", value: item.risks },
    { title: "Data Usage", value: item.data_usage },
    { title: "Hidden Costs", value: item.hidden_costs },
    { title: "User Rights", value: item.user_rights }
  ];

  return (
    <section className="glass-card p-6 md:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <span className="section-chip">Detailed Report</span>
            <h2 className="mt-4 text-3xl font-bold text-white">{item.domain || "Unknown domain"}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {getSourceLabel(item.source)} • {formatDate(item.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RiskPill meta={meta} />
            {item.rating ? (
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 ring-1 ring-white/10">
                Rating {item.rating}
              </span>
            ) : null}
            <span className="rounded-full bg-brand-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100 ring-1 ring-brand-400/20">
              Risk score {score}/100
            </span>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/6 to-transparent p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Risk Summary</p>
              <p className="mt-3 text-sm leading-7 text-slate-200">
                {item.risk_summary || "No summary text returned from the analyzer."}
              </p>
            </div>
            <ScoreDial score={score} tone={meta.tone} compact />
          </div>
        </div>

        <div className="grid gap-4">
          {detailSections.map((section) => (
            <DetailSection key={section.title} title={section.title}>
              {section.list ? (
                section.value ? (
                  <ul className="space-y-3">
                    {section.value.map((point, index) => (
                      <li key={index} className="flex gap-3 text-sm leading-7 text-slate-300">
                        <span className="mt-2 h-2 w-2 rounded-full bg-sky-400" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-7 text-slate-400">No key points returned.</p>
                )
              ) : (
                <p className="text-sm leading-7 text-slate-300">
                  {section.value || "No specific detail returned for this section."}
                </p>
              )}
            </DetailSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function InputField({ label, value, onChange, placeholder, icon, inputRef }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-200">{label}</label>
      <div className="input-shell">
        <span className="text-slate-500">{icon}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-200">Search</label>
      <div className="input-shell">
        <SearchIcon className="h-5 w-5 text-slate-500" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-200">{label}</label>
      <div className="input-shell">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none border-0 bg-transparent text-sm text-slate-100 outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronIcon className="h-4 w-4 text-slate-500" />
      </div>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function HistoryRow({ item, selected, onClick }) {
  const meta = getRiskMeta(item);

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition duration-200 hover:bg-white/8 ${
        selected ? "bg-brand-500/12" : ""
      }`}
    >
      <td className="px-5 py-4 align-top">
        <div className="font-semibold text-white">{item.domain}</div>
        <div
          className="mt-1 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500"
          title={item.risk_summary || ""}
        >
          {item.risk_summary}
        </div>
      </td>
      <td className="px-5 py-4 align-top text-slate-300">{getSourceLabel(item.source)}</td>
      <td className="px-5 py-4 align-top">
        <RiskPill meta={meta} />
      </td>
      <td className="px-5 py-4 align-top text-slate-300">{item.rating || "N/A"}</td>
      <td className="px-5 py-4 align-top text-slate-400">{formatDate(item.created_at)}</td>
    </tr>
  );
}

function HistoryMobileCard({ item, selected, onClick }) {
  const meta = getRiskMeta(item);

  return (
    <button
      onClick={onClick}
      className={`rounded-[1.5rem] border p-4 text-left transition duration-200 ${
        selected
          ? "border-brand-400/30 bg-brand-500/12"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-bold text-white">{item.domain}</div>
        <RiskPill meta={meta} />
      </div>
      <div className="mt-2 text-sm text-slate-400">
        {getSourceLabel(item.source)} • {formatDate(item.created_at)}
      </div>
      <p
        className="mt-3 overflow-hidden text-sm leading-6 text-slate-300"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical"
        }}
      >
        {item.risk_summary}
      </p>
    </button>
  );
}

function HistorySkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
      </td>
      <td className="px-5 py-4">
        <SkeletonBlock className="h-4 w-20" />
      </td>
      <td className="px-5 py-4">
        <SkeletonBlock className="h-8 w-24 rounded-full" />
      </td>
      <td className="px-5 py-4">
        <SkeletonBlock className="h-4 w-10" />
      </td>
      <td className="px-5 py-4">
        <SkeletonBlock className="h-4 w-28" />
      </td>
    </tr>
  );
}

function PreviewStat({ title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
    </div>
  );
}

function TrustPill({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-md">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function FeatureRow({ icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
      <div className="mt-0.5 rounded-xl bg-white/8 p-2 text-sky-300">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function RiskPill({ meta }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${meta.pillClass}`}>
      {meta.label}
    </span>
  );
}

function ScoreDial({ score, tone, compact = false }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const color =
    tone === "danger"
      ? "#ef4444"
      : tone === "warning"
        ? "#f59e0b"
        : tone === "safe"
          ? "#22c55e"
          : "#818cf8";

  const size = compact ? 88 : 112;

  return (
    <div
      className="grid place-items-center rounded-full border border-white/10 bg-slate-950/70 shadow-inner shadow-slate-950/50"
      style={{
        width: size,
        height: size,
        backgroundImage: `conic-gradient(${color} ${clamped}%, rgba(148,163,184,0.18) ${clamped}% 100%)`
      }}
    >
      <div
        className="grid place-items-center rounded-full bg-slate-950 text-center"
        style={{ width: size - 14, height: size - 14 }}
      >
        <div>
          <div className="text-lg font-bold text-white">{clamped}</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Score</div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />;
}

function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton-line ${className}`} />;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M4.166 10h11.667m0 0-4.167-4.167M15.833 10l-4.167 4.167" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3 5 6v6c0 4.4 2.7 8.44 7 10 4.3-1.56 7-5.6 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9.5 12 1.7 1.7 3.3-3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 8v4m0 4h.01M10.3 3.8 2.9 17a2 2 0 0 0 1.74 3h14.72A2 2 0 0 0 21.1 17L13.7 3.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16ZM5 15l.7 1.3L7 17l-1.3.7L5 19l-.7-1.3L3 17l1.3-.7L5 15Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function FingerprintIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8.5 12.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5V15m-9-1.5V12a5.5 5.5 0 1 1 11 0v4.5M5 15.5V12a7 7 0 1 1 14 0v3m-12 3.5c1.5-1.1 2.5-2.96 2.5-5V12m8 8c-1.2-.93-2.07-2.5-2.4-4.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PulseIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 10V8a5 5 0 1 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M10 14 8.5 15.5a3 3 0 1 1-4.24-4.24L7 8.5A3 3 0 0 1 11.24 8m2.76 8L16.5 13.5a3 3 0 0 0-4.24-4.24L10 11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
