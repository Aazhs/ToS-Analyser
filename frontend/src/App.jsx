import { useEffect, useMemo, useState } from "react";
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
  const map = { A: 92, B: 80, C: 65, D: 45, E: 25 };
  return map[rating.toUpperCase()] ?? null;
}

export default function App() {
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchHistory(100)
      .then((res) => {
        setHistory(res.items || []);
        setSelected((res.items || [])[0] || null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const metrics = useMemo(() => {
    const total = history.length;
    const tosdr = history.filter((h) => h.source === "ToS;DR").length;
    const ai = history.filter((h) => h.source === "AI").length;
    const rated = history.filter((h) => h.rating).length;
    return { total, tosdr, ai, rated };
  }, [history]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await analyzeWebsite({ domain, url, text });
      const enriched = {
        ...result,
        id: Date.now()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-teal-50 text-ink">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <section className="rounded-3xl border border-amber-200/60 bg-panel/95 p-6 shadow-soft md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Terms of Service Analyzer</h1>
              <p className="mt-2 max-w-2xl text-sm text-stone-600">
                Search domains, ingest popup text, and get quick risk insights powered by ToS;DR first and Gemini fallback.
              </p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              Live dashboard for extension + manual checks
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Analyzed Websites" value={metrics.total} />
            <StatCard label="From ToS;DR" value={metrics.tosdr} />
            <StatCard label="From AI" value={metrics.ai} />
            <StatCard label="Rated Policies" value={metrics.rated} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[420px,1fr]">
          <div className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-soft">
            <h2 className="text-xl font-bold">Analyze a Website</h2>
            <p className="mt-1 text-xs text-stone-500">
              Use domain or URL. For AI fallback, paste policy text if ToS;DR has no entry.
            </p>

            <form onSubmit={handleAnalyze} className="mt-4 space-y-3">
              <Input
                label="Domain"
                value={domain}
                onChange={setDomain}
                placeholder="example.com"
              />
              <Input
                label="URL"
                value={url}
                onChange={setUrl}
                placeholder="https://example.com/privacy"
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Policy Text (optional)</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder="Paste visible terms/privacy popup text for AI analysis fallback"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!domain && !url)}
                className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analyzing..." : "Analyze Terms"}
              </button>
            </form>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-stone-700">Recent Websites</h3>
            <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    selected?.id === item.id
                      ? "border-amber-300 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{item.domain}</span>
                    <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] uppercase">{item.source}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{formatDate(item.created_at)}</p>
                </button>
              ))}

              {!history.length && <p className="text-sm text-stone-500">No analyses yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-soft">
            {!selected ? (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-500">
                Analyze a website or select an item from history.
              </div>
            ) : (
              <ResultPanel item={selected} />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-stone-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-amber-200"
      />
    </div>
  );
}

function ResultPanel({ item }) {
  const score = scoreFromRating(item.rating);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{item.domain}</h2>
            <p className="text-xs text-stone-500">Source: {item.source} • {formatDate(item.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.rating && <Badge label={`Rating ${item.rating}`} tone="amber" />}
            {score !== null && <Badge label={`Risk Score ${score}/100`} tone="teal" />}
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-700">{item.risk_summary}</p>
      </header>

      <Section title="Key Points">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {item.key_points?.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Risks">
          <p className="text-sm">{item.risks}</p>
        </Section>
        <Section title="Data Usage">
          <p className="text-sm">{item.data_usage}</p>
        </Section>
        <Section title="Hidden Costs">
          <p className="text-sm">{item.hidden_costs}</p>
        </Section>
        <Section title="User Rights">
          <p className="text-sm">{item.user_rights}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-stone-700">{title}</h3>
      <div className="mt-2 text-stone-700">{children}</div>
    </section>
  );
}

function Badge({ label, tone }) {
  const className =
    tone === "teal"
      ? "border-teal-200 bg-teal-50 text-teal-900"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}
