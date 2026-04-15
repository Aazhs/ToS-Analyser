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

async function fetchPolicyPage(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    credentials: "include"
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  const text = rawText.slice(0, 400000);

  if (!response.ok) {
    throw new Error(`Policy page fetch failed (${response.status})`);
  }

  return {
    ok: true,
    url: response.url || url,
    contentType,
    text
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ANALYZE_TOS") {
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
      });

    return true;
  }

  if (message?.type === "FETCH_POLICY_TEXT") {
    const url = String(message?.url || "").trim();
    if (!url) {
      sendResponse({ ok: false, error: "Missing policy URL" });
      return false;
    }

    fetchPolicyPage(url)
      .then((payload) => sendResponse(payload))
      .catch((error) => {
        sendResponse({ ok: false, error: error?.message || "Policy fetch failed" });
      });

    return true;
  }

  return false;
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "MANUAL_SCAN" }, () => {
    if (chrome.runtime.lastError) {
      console.debug("ToS Analyzer click ignored:", chrome.runtime.lastError.message);
    }
  });
});
