const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/, "");

async function parseResponseBody(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw_text: raw };
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });
  } catch (error) {
    const isLikelyProdLocalhost =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1" &&
      API_BASE.includes("localhost");

    const hint = isLikelyProdLocalhost
      ? ` The app is currently pointing to ${API_BASE}. Set VITE_API_BASE to your deployed backend URL.`
      : " Check backend URL, CORS, and network availability.";

    throw new Error(`Network error while calling ${API_BASE}${path}.${hint}`);
  }

  const data = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(data?.detail || data?.raw_text || `Request failed (${response.status})`);
  }
  return data;
}

export function analyzeWebsite({ domain, url, text }) {
  return request("/analyze", {
    method: "POST",
    body: JSON.stringify({ domain: domain || null, url: url || null, text: text || null })
  });
}

export function fetchHistory(limit = 50) {
  return request(`/history?limit=${limit}`);
}
