const KEYWORDS = ["terms", "privacy", "agree", "consent", "cookie", "policy"];
const MAX_TEXT_LENGTH = 16000;
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

const AUTH_URL_HINTS = ["login", "log-in", "signin", "sign-in", "signup", "sign-up", "register", "join", "create-account", "auth"];
const AUTH_BUTTON_HINTS = [
  "continue",
  "next",
  "sign in",
  "signin",
  "log in",
  "login",
  "sign up",
  "signup",
  "register",
  "create account",
  "join",
  "proceed",
  "continue with"
];
const AUTH_PROVIDER_HINTS = ["google", "facebook", "apple", "microsoft", "github", "linkedin", "x", "twitter"];
const OAUTH_HOST_HINTS = [
  "accounts.google.com",
  "appleid.apple.com",
  "facebook.com",
  "fbsbx.com",
  "login.live.com",
  "microsoftonline.com",
  "github.com/login/oauth",
  "linkedin.com/oauth",
  "twitter.com/i/oauth2",
  "x.com/i/oauth2"
];

const COMMON_SITE_PRESETS = {
  "google.com": {
    source: "Preset",
    rating: "C",
    risk_summary: "Google policies are broad; account activity can be used to personalize ads and services.",
    key_points: [
      "Data from many Google services can be combined.",
      "Personalization settings exist but defaults are often data-forward.",
      "Policy updates can be rolled out with notice in account channels."
    ]
  },
  "facebook.com": {
    source: "Preset",
    rating: "D",
    risk_summary: "Meta policies often allow extensive profiling and cross-service data use.",
    key_points: [
      "Behavior and interaction data may drive ad targeting.",
      "Settings exist, but many controls require manual opt-out.",
      "Policy language can be broad for future feature use."
    ]
  },
  "instagram.com": {
    source: "Preset",
    rating: "D",
    risk_summary: "Instagram data may be shared within Meta systems and used for ad personalization.",
    key_points: [
      "Engagement and content signals can inform ad targeting.",
      "Cross-service sharing with Meta ecosystem is common.",
      "Account privacy controls exist but require active tuning."
    ]
  },
  "x.com": {
    source: "Preset",
    rating: "C",
    risk_summary: "X/Twitter terms can change over time and include broad platform rights over user content operations.",
    key_points: [
      "Platform may process content for safety, recommendation, and ads.",
      "Certain dispute and enforcement terms can limit recourse speed.",
      "Policy changes may be posted without direct per-user negotiation."
    ]
  },
  "twitter.com": {
    source: "Preset",
    rating: "C",
    risk_summary: "X/Twitter terms can change over time and include broad platform rights over user content operations.",
    key_points: [
      "Platform may process content for safety, recommendation, and ads.",
      "Certain dispute and enforcement terms can limit recourse speed.",
      "Policy changes may be posted without direct per-user negotiation."
    ]
  },
  "amazon.com": {
    source: "Preset",
    rating: "C",
    risk_summary: "Amazon policies allow extensive transactional and behavioral data processing across services.",
    key_points: [
      "Purchase and browsing data may be used for recommendations and ads.",
      "Account and marketplace terms can differ by product/service line.",
      "Recurring services can auto-renew unless canceled in settings."
    ]
  },
  "microsoft.com": {
    source: "Preset",
    rating: "B",
    risk_summary: "Microsoft generally provides clearer controls, but telemetry and service integration remain substantial.",
    key_points: [
      "Telemetry and diagnostics may be enabled by default in products.",
      "Enterprise and consumer terms differ; verify your account type.",
      "Privacy dashboard and export/delete tools are available."
    ]
  },
  "apple.com": {
    source: "Preset",
    rating: "B",
    risk_summary: "Apple emphasizes privacy but still processes account, payment, and device usage data.",
    key_points: [
      "Data is used for service delivery, fraud prevention, and personalization.",
      "Some personalization controls can be disabled per feature.",
      "Subscription billing and renewals require active management."
    ]
  },
  "linkedin.com": {
    source: "Preset",
    rating: "C",
    risk_summary: "LinkedIn may use profile and activity data for recommendations, outreach, and ads.",
    key_points: [
      "Professional and engagement data can affect ranking/visibility.",
      "Visibility controls exist but defaults may expose more profile info.",
      "Recruiting and ad products can involve extended data processing."
    ]
  },
  "github.com": {
    source: "Preset",
    rating: "B",
    risk_summary: "GitHub terms are usually developer-friendly, but hosted/public content has broad platform handling rights.",
    key_points: [
      "Public repositories are inherently visible and indexable.",
      "Security scanning and abuse detection process repository metadata.",
      "Private repo controls exist, but org policies may override defaults."
    ]
  }
};

let overlayRoot = null;
let blockedButtons = [];
let autoScanDebounceTimer = null;
let autoTriggeredPageKey = "";
let lastBlockedInteractionAt = 0;

let currentSession = {
  requireAck: false,
  acknowledged: false,
  domain: "",
  lastFingerprint: "",
  analysisInFlight: false
};

function canRunOnPage() {
  return SUPPORTED_PROTOCOLS.has(window.location.protocol);
}

function normalizeDomain(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

function currentPageKey() {
  return `${normalizeDomain(window.location.hostname)}${window.location.pathname}`;
}

function cleanText(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim();
}

function includesAny(text, hints) {
  return hints.some((hint) => text.includes(hint));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function elementLabel(element) {
  return cleanText(
    element.innerText || element.textContent || element.value || element.getAttribute("aria-label") || element.getAttribute("title") || ""
  ).toLowerCase();
}

function elementTokens(element) {
  return cleanText(
    [
      element.id,
      element.className,
      element.getAttribute("name"),
      element.getAttribute("type"),
      element.getAttribute("role"),
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label")
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

function elementLinks(element) {
  return cleanText(
    [
      element.getAttribute("href"),
      element.getAttribute("src"),
      element.getAttribute("action"),
      element.getAttribute("data-href"),
      element.getAttribute("data-url")
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

function isOAuthHostLink(text) {
  return includesAny(text, OAUTH_HOST_HINTS);
}

function hasProviderAndAuthIntent(text) {
  const hasProvider = includesAny(text, AUTH_PROVIDER_HINTS);
  const hasAuthIntent =
    includesAny(text, AUTH_BUTTON_HINTS) ||
    text.includes("oauth") ||
    text.includes("sso") ||
    text.includes("single sign") ||
    text.includes("continue with") ||
    text.includes("sign in with") ||
    text.includes("log in with");
  return hasProvider && hasAuthIntent;
}

function isLikelyAuthActionElement(element) {
  if (!(element instanceof Element)) return false;

  const label = elementLabel(element);
  const tokens = elementTokens(element);
  const links = elementLinks(element);
  const combined = `${label} ${tokens} ${links}`;

  const hintMatch = includesAny(combined, AUTH_BUTTON_HINTS);
  const providerAuthMatch = hasProviderAndAuthIntent(combined);
  const oauthHostMatch = isOAuthHostLink(links) || combined.includes("oauth") || combined.includes("sso");

  const form = element.closest("form");
  const formHasAuthField = Boolean(
    form &&
      form.querySelector(
        "input[type='password'], input[type='email'], input[name*='email' i], input[name*='user' i], input[name*='login' i], input[id*='email' i], input[id*='user' i]"
      )
  );

  const submitLike =
    element.matches("button") ||
    element.matches("input[type='submit']") ||
    element.matches("input[type='button']") ||
    element.matches("[role='button']") ||
    (element.matches("a") && (tokens.includes("button") || hintMatch || oauthHostMatch));

  return hintMatch || providerAuthMatch || oauthHostMatch || (submitLike && formHasAuthField);
}

function getAuthForms() {
  return [...document.querySelectorAll("form")].filter((form) =>
    Boolean(
      form.querySelector(
        "input[type='password'], input[type='email'], input[name*='email' i], input[name*='user' i], input[name*='login' i], input[id*='email' i], input[id*='user' i]"
      )
    )
  );
}

function findAuthButtons() {
  const selectors = [
    "button",
    "input[type='submit']",
    "input[type='button']",
    "[role='button']",
    "div[role='button']",
    "span[role='button']",
    "[tabindex='0']",
    "a[role='button']",
    "a.btn",
    "a.button",
    "[data-testid*='sign' i]",
    "[data-testid*='login' i]",
    "[data-provider]",
    "[class*='oauth' i]",
    "[id*='oauth' i]"
  ];
  const all = new Set();

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => all.add(el));
  });

  const candidates = [...all].filter((el) => isLikelyAuthActionElement(el));

  if (candidates.length > 0) {
    return [...new Set(candidates)];
  }

  const fallback = [];
  getAuthForms().forEach((form) => {
    form.querySelectorAll("button, input[type='submit'], input[type='button']").forEach((el) => fallback.push(el));
  });

  return [...new Set(fallback)];
}

function findOAuthFrames() {
  return [...document.querySelectorAll("iframe")].filter((frame) => {
    const src = cleanText(frame.getAttribute("src") || "").toLowerCase();
    const title = cleanText(frame.getAttribute("title") || "").toLowerCase();
    const name = cleanText(frame.getAttribute("name") || "").toLowerCase();
    const combined = `${src} ${title} ${name}`;
    return isOAuthHostLink(combined) || hasProviderAndAuthIntent(combined);
  });
}

function detectAuthContext() {
  const urlText = `${window.location.pathname} ${window.location.href}`.toLowerCase();
  const hasAuthUrlHint = AUTH_URL_HINTS.some((hint) => urlText.includes(hint));

  const hasPassword = Boolean(document.querySelector("input[type='password']"));
  const hasEmail = Boolean(document.querySelector("input[type='email'], input[name*='email' i], input[id*='email' i]"));
  const buttons = findAuthButtons();
  const oauthFrames = findOAuthFrames();
  const actions = [...new Set([...buttons, ...oauthFrames])];

  const isAuthPage = hasAuthUrlHint || hasPassword || (hasEmail && actions.length > 0) || oauthFrames.length > 0;
  return { isAuthPage, hasPassword, hasEmail, buttons, oauthFrames, actions };
}

function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 200 && rect.height > 30;
}

function isActionElementVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 36 && rect.height > 16;
}

function blockActionButtons(buttons) {
  unblockActionButtons();

  const unique = [...new Set(buttons)].filter((el) => el && el.isConnected && isActionElementVisible(el)).slice(0, 20);
  unique.forEach((element) => {
    const state = {
      element,
      disabledBefore: "disabled" in element ? element.disabled : undefined,
      pointerEventsBefore: element.style.pointerEvents,
      opacityBefore: element.style.opacity,
      cursorBefore: element.style.cursor,
      ariaDisabledBefore: element.getAttribute("aria-disabled"),
      titleBefore: element.getAttribute("title")
    };

    if ("disabled" in element) {
      element.disabled = true;
    }

    element.style.pointerEvents = "none";
    element.style.opacity = "0.55";
    element.style.cursor = "not-allowed";
    element.setAttribute("aria-disabled", "true");
    element.setAttribute("data-tos-analyzer-blocked", "1");
    element.setAttribute("title", "Review ToS Analyzer summary first");

    blockedButtons.push(state);
  });
}

function unblockActionButtons() {
  blockedButtons.forEach((state) => {
    const element = state.element;
    if (!element || !element.isConnected) return;

    if ("disabled" in element && typeof state.disabledBefore === "boolean") {
      element.disabled = state.disabledBefore;
    }

    element.style.pointerEvents = state.pointerEventsBefore;
    element.style.opacity = state.opacityBefore;
    element.style.cursor = state.cursorBefore;

    if (state.ariaDisabledBefore === null) {
      element.removeAttribute("aria-disabled");
    } else {
      element.setAttribute("aria-disabled", state.ariaDisabledBefore);
    }

    if (state.titleBefore === null) {
      element.removeAttribute("title");
    } else {
      element.setAttribute("title", state.titleBefore);
    }

    element.removeAttribute("data-tos-analyzer-blocked");
  });

  blockedButtons = [];
}

function refreshBlockingIfNeeded() {
  if (!currentSession.requireAck || currentSession.acknowledged) return;

  const authContext = detectAuthContext();
  if (authContext.actions.length > 0) {
    blockActionButtons(authContext.actions);
  }
}

function findPreset(domain) {
  const keys = Object.keys(COMMON_SITE_PRESETS);
  for (const key of keys) {
    if (domain === key || domain.endsWith(`.${key}`)) {
      return COMMON_SITE_PRESETS[key];
    }
  }
  return null;
}

function scoreElement(element) {
  if (!isVisible(element)) return 0;

  const text = cleanText(element.innerText || "");
  if (text.length < 60) return 0;

  const lower = text.toLowerCase();
  const keywordCount = KEYWORDS.reduce((acc, keyword) => acc + (lower.includes(keyword) ? 1 : 0), 0);
  if (keywordCount === 0) return 0;

  const style = window.getComputedStyle(element);
  const fixedBoost = style.position === "fixed" || style.position === "sticky" ? 60 : 0;
  return text.length * 0.02 + keywordCount * 25 + fixedBoost;
}

function findBestPopupElement() {
  const selectors = [
    "dialog",
    "[role='dialog']",
    "[aria-modal='true']",
    "[class*='modal']",
    "[class*='popup']",
    "[class*='consent']",
    "[class*='cookie']",
    "[class*='privacy']",
    "[id*='modal']",
    "[id*='privacy']",
    "[id*='cookie']"
  ];

  const candidates = new Set();
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => candidates.add(el));
  });

  if (candidates.size === 0) {
    document.querySelectorAll("body *").forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") candidates.add(el);
    });
  }

  let best = null;
  let bestScore = 0;

  candidates.forEach((element) => {
    const score = scoreElement(element);
    if (score > bestScore) {
      best = element;
      bestScore = score;
    }
  });

  return best;
}

function extractFallbackPageText() {
  const bodyText = cleanText(document.body?.innerText || "");
  if (!bodyText) return "";

  const sentences = bodyText.split(/(?<=[.!?])\s+/);
  const policySentences = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return KEYWORDS.some((keyword) => lower.includes(keyword));
  });

  if (policySentences.length > 0) {
    return policySentences.join(" ").slice(0, MAX_TEXT_LENGTH);
  }

  return bodyText.slice(0, MAX_TEXT_LENGTH);
}

function extractPolicyText() {
  const popupElement = findBestPopupElement();
  if (popupElement) {
    const text = cleanText(popupElement.innerText || "");
    if (text.length > 30) {
      return text.slice(0, MAX_TEXT_LENGTH);
    }
  }

  return extractFallbackPageText();
}

function ensureOverlay() {
  if (overlayRoot && document.body.contains(overlayRoot)) {
    return overlayRoot;
  }

  overlayRoot = document.createElement("div");
  overlayRoot.id = "ai-tos-overlay";
  overlayRoot.style.position = "fixed";
  overlayRoot.style.right = "16px";
  overlayRoot.style.bottom = "16px";
  overlayRoot.style.width = "360px";
  overlayRoot.style.maxHeight = "70vh";
  overlayRoot.style.overflow = "auto";
  overlayRoot.style.background = "#ffffff";
  overlayRoot.style.border = "1px solid #d1d5db";
  overlayRoot.style.borderRadius = "14px";
  overlayRoot.style.boxShadow = "0 14px 40px rgba(0,0,0,0.2)";
  overlayRoot.style.zIndex = "2147483647";
  overlayRoot.style.fontFamily = "ui-sans-serif, system-ui, -apple-system";
  overlayRoot.style.color = "#111827";

  document.body.appendChild(overlayRoot);
  return overlayRoot;
}

function handleAcknowledge() {
  currentSession.acknowledged = true;
  unblockActionButtons();

  const root = ensureOverlay();
  const unlockNote = root.querySelector("#ai-tos-unlock-note");
  const ackBtn = root.querySelector("#ai-tos-ack");

  if (ackBtn) {
    ackBtn.remove();
  }

  if (unlockNote) {
    unlockNote.textContent = "Signup/continue controls are unlocked.";
    unlockNote.style.color = "#065f46";
  }

  const header = root.querySelector("#ai-tos-header-title");
  if (header) {
    header.textContent = `${header.textContent} (Reviewed)`;
  }
}

function renderOverlay({ title, subtitle, source, rating, riskSummary, keyPoints, error, requireAck }) {
  const root = ensureOverlay();

  const keyPointsHtml = (keyPoints || []).map((point) => `<li style='margin-bottom:6px;'>${escapeHtml(point)}</li>`).join("");

  const showAck = Boolean(requireAck && !currentSession.acknowledged);
  const closeButton = showAck
    ? ""
    : "<button id='ai-tos-close' style='border:none;background:#f3f4f6;border-radius:8px;padding:4px 8px;cursor:pointer;'>Close</button>";

  root.innerHTML = `
    <div style="padding: 12px 14px 4px 14px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div id="ai-tos-header-title" style="font-weight: 700; font-size: 14px;">${escapeHtml(title)}</div>
        <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${escapeHtml(subtitle)}</div>
      </div>
      ${closeButton}
    </div>
    <div style="padding: 12px 14px 14px 14px; font-size: 13px; line-height: 1.45;">
      ${error ? `<div style='color:#b91c1c; margin-bottom:10px;'>${escapeHtml(error)}</div>` : ""}
      ${source ? `<div style='margin-bottom: 8px;'><strong>Source:</strong> ${escapeHtml(source)}${rating ? ` (Rating: ${escapeHtml(rating)})` : ""}</div>` : ""}
      ${riskSummary ? `<div style='margin-bottom: 10px;'><strong>Risk summary:</strong> ${escapeHtml(riskSummary)}</div>` : ""}
      ${keyPoints?.length ? `<div><strong>Key points</strong><ul style='margin: 8px 0 0 18px;'>${keyPointsHtml}</ul></div>` : ""}
      ${
        showAck
          ? "<div id='ai-tos-unlock-note' style='margin-top:10px;color:#7c2d12;'>Continue/signup controls are paused until reviewed.</div>"
          : ""
      }
      ${
        showAck
          ? "<button id='ai-tos-ack' style='margin-top:12px;border:0;border-radius:10px;padding:9px 12px;background:#111827;color:#fff;cursor:pointer;font-weight:600;'>I understand, continue</button>"
          : ""
      }
    </div>
  `;

  const closeBtn = root.querySelector("#ai-tos-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      root.remove();
    });
  }

  const ackBtn = root.querySelector("#ai-tos-ack");
  if (ackBtn) {
    ackBtn.addEventListener("click", handleAcknowledge);
  }
}

function submitForAnalysis(extractedText, requireAck) {
  currentSession.analysisInFlight = true;

  chrome.runtime.sendMessage(
    {
      type: "ANALYZE_TOS",
      payload: {
        domain: window.location.hostname,
        url: window.location.href,
        text: extractedText
      }
    },
    () => {
      if (chrome.runtime.lastError) {
        currentSession.analysisInFlight = false;
        renderOverlay({
          title: "ToS Analyzer",
          subtitle: window.location.hostname,
          error: `Extension error: ${chrome.runtime.lastError.message}`,
          requireAck
        });
      }
    }
  );
}

function runScan(trigger = "manual") {
  if (!canRunOnPage()) return;
  if (trigger === "auto" && currentSession.analysisInFlight) return;

  const domain = normalizeDomain(window.location.hostname);
  const authContext = detectAuthContext();

  if (trigger === "auto" && !authContext.isAuthPage) {
    return;
  }

  if (authContext.isAuthPage) {
    currentSession.requireAck = true;
    currentSession.acknowledged = false;
    currentSession.domain = domain;

    if (authContext.actions.length > 0) {
      blockActionButtons(authContext.actions);
    }
  } else {
    currentSession.requireAck = false;
    currentSession.acknowledged = false;
    currentSession.domain = domain;
    unblockActionButtons();
  }

  const preset = findPreset(domain);
  if (preset) {
    renderOverlay({
      title: authContext.isAuthPage ? "Signup/Login ToS Summary" : "Website ToS Summary",
      subtitle: domain,
      source: preset.source,
      rating: preset.rating,
      riskSummary: preset.risk_summary,
      keyPoints: preset.key_points,
      requireAck: authContext.isAuthPage
    });
    return;
  }

  const extractedText = extractPolicyText();
  if (!extractedText) {
    renderOverlay({
      title: "ToS Analyzer",
      subtitle: domain,
      error: "Could not find policy text on this page. Try a signup/login page with visible terms.",
      requireAck: authContext.isAuthPage
    });
    return;
  }

  const fingerprint = `${domain}:${extractedText.slice(0, 700)}`;
  if (trigger === "auto" && fingerprint === currentSession.lastFingerprint) {
    return;
  }
  currentSession.lastFingerprint = fingerprint;

  renderOverlay({
    title: authContext.isAuthPage ? "Checking terms before signup..." : "Analyzing policy text...",
    subtitle: domain,
    riskSummary: authContext.isAuthPage
      ? "Signup/continue controls are paused until this summary is reviewed."
      : "Detected policy text, requesting summary.",
    requireAck: authContext.isAuthPage
  });

  submitForAnalysis(extractedText, authContext.isAuthPage);
}

function maybeAutoScan() {
  if (!canRunOnPage()) return;

  const authContext = detectAuthContext();
  if (!authContext.isAuthPage) {
    if (currentSession.requireAck && !currentSession.acknowledged) {
      unblockActionButtons();
      currentSession.requireAck = false;
    }
    return;
  }

  const pageKey = currentPageKey();

  if (autoTriggeredPageKey === pageKey) {
    refreshBlockingIfNeeded();
    return;
  }

  autoTriggeredPageKey = pageKey;
  runScan("auto");
}

function blockInteractionNotice() {
  const now = Date.now();
  if (now - lastBlockedInteractionAt < 800) return;
  lastBlockedInteractionAt = now;

  renderOverlay({
    title: "ToS Review Required",
    subtitle: currentSession.domain || normalizeDomain(window.location.hostname),
    riskSummary: "Read and acknowledge the summary first to continue.",
    requireAck: true,
    keyPoints: []
  });
}

function guardBlockedInteractions() {
  document.addEventListener(
    "click",
    (event) => {
      if (!currentSession.requireAck || currentSession.acknowledged) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const blocked = target.closest("[data-tos-analyzer-blocked='1']");
      const clickableCandidate = target.closest(
        "button, input[type='submit'], input[type='button'], a, [role='button'], [tabindex], iframe"
      );
      const likelyAuthAction = clickableCandidate && isLikelyAuthActionElement(clickableCandidate);
      const likelyOAuthFrame = clickableCandidate?.matches("iframe") && findOAuthFrames().includes(clickableCandidate);
      if (!blocked && !likelyAuthAction && !likelyOAuthFrame) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      blockInteractionNotice();
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (!currentSession.requireAck || currentSession.acknowledged) return;
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const hasBlocked = Boolean(form.querySelector("[data-tos-analyzer-blocked='1']"));
      if (!hasBlocked) {
        const submitter = event.submitter;
        if (!submitter || !isLikelyAuthActionElement(submitter)) return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      blockInteractionNotice();
    },
    true
  );
}

function wireAutoDetection() {
  maybeAutoScan();
  window.setTimeout(maybeAutoScan, 900);
  window.setTimeout(maybeAutoScan, 2200);

  const observer = new MutationObserver(() => {
    if (autoScanDebounceTimer) {
      window.clearTimeout(autoScanDebounceTimer);
    }
    autoScanDebounceTimer = window.setTimeout(() => {
      maybeAutoScan();
    }, 450);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false
  });

  const routeChanged = () => {
    autoTriggeredPageKey = "";
    currentSession.lastFingerprint = "";
    window.setTimeout(maybeAutoScan, 250);
  };

  const originalPushState = history.pushState;
  history.pushState = function pushStateWrapper(...args) {
    const result = originalPushState.apply(this, args);
    routeChanged();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceStateWrapper(...args) {
    const result = originalReplaceState.apply(this, args);
    routeChanged();
    return result;
  };

  window.addEventListener("popstate", routeChanged);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MANUAL_SCAN") {
    runScan("manual");
    return;
  }

  if (message?.type === "ANALYZE_RESULT") {
    currentSession.analysisInFlight = false;

    const result = message.result || {};
    renderOverlay({
      title: currentSession.requireAck ? "Signup/Login ToS Summary" : "ToS Summary",
      subtitle: result.domain || currentSession.domain || window.location.hostname,
      source: result.source,
      rating: result.rating,
      riskSummary: result.risk_summary,
      keyPoints: result.key_points || [],
      requireAck: currentSession.requireAck
    });
    return;
  }

  if (message?.type === "ANALYZE_ERROR") {
    currentSession.analysisInFlight = false;

    renderOverlay({
      title: "ToS Analyzer",
      subtitle: currentSession.domain || window.location.hostname,
      error: message.error || "Analysis failed.",
      requireAck: currentSession.requireAck
    });
  }
});

if (canRunOnPage()) {
  guardBlockedInteractions();
  wireAutoDetection();
}

window.addEventListener("beforeunload", () => {
  unblockActionButtons();
});
