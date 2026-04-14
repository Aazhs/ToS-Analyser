const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

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
