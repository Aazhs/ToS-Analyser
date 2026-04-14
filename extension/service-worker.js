const API_BASE = "http://localhost:8000";

async function parseResponseBody(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw_text: raw };
  }
}

async function analyzePayload(payload) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await parseResponseBody(response);
  if (!response.ok) {
    const detail = data?.detail || data?.raw_text || `Backend request failed (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return data;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ANALYZE_TOS") {
    return false;
  }

  const tabId = sender?.tab?.id;
  if (typeof tabId !== "number") {
    sendResponse({ ok: false, error: "No active tab context" });
    return false;
  }

  analyzePayload(message.payload)
    .then((result) => {
      chrome.tabs.sendMessage(tabId, {
        type: "ANALYZE_RESULT",
        result
      });
      sendResponse({ ok: true });
    })
    .catch((error) => {
      chrome.tabs.sendMessage(tabId, {
        type: "ANALYZE_ERROR",
        error: error?.message || "Unknown error"
      });
      sendResponse({ ok: false, error: error?.message || "Unknown error" });
    })
    .finally(() => {
      // no-op: keep hook for future tab-level state
    });

  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "MANUAL_SCAN" }, () => {
    if (chrome.runtime.lastError) {
      console.debug("ToS Analyzer click ignored:", chrome.runtime.lastError.message);
    }
  });
});
