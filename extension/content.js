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

let overlayState = {
  left: null,
  top: null,
  minimized: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  lastPayload: null
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
  if (element.closest("#ai-tos-overlay")) return false;

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

  const unique = [...new Set(buttons)]
    .filter((el) => el && el.isConnected && isActionElementVisible(el) && !el.closest("#ai-tos-overlay"))
    .slice(0, 20);
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

function parseColorToRgb(input) {
  if (!input) return null;
  const value = String(input).trim().toLowerCase();
  if (!value || value === "transparent") return null;

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => Number(part.trim()));
    if (parts.length >= 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2])) {
      return {
        r: Math.max(0, Math.min(255, Math.round(parts[0]))),
        g: Math.max(0, Math.min(255, Math.round(parts[1]))),
        b: Math.max(0, Math.min(255, Math.round(parts[2]))),
        a: parts.length >= 4 && Number.isFinite(parts[3]) ? Math.max(0, Math.min(1, parts[3])) : 1
      };
    }
  }

  const hex = value.replace("#", "");
  if (hex.length === 3) {
    return {
      r: parseInt(`${hex[0]}${hex[0]}`, 16),
      g: parseInt(`${hex[1]}${hex[1]}`, 16),
      b: parseInt(`${hex[2]}${hex[2]}`, 16),
      a: 1
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }

  return null;
}

function rgbToString(color, alpha = null) {
  if (!color) return "";
  if (alpha === null) {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function blendColors(base, mix, ratio) {
  const t = Math.max(0, Math.min(1, ratio));
  return {
    r: Math.round(base.r + (mix.r - base.r) * t),
    g: Math.round(base.g + (mix.g - base.g) * t),
    b: Math.round(base.b + (mix.b - base.b) * t),
    a: 1
  };
}

function colorBrightness(color) {
  if (!color) return 255;
  return color.r * 0.299 + color.g * 0.587 + color.b * 0.114;
}

function relativeLuminance(color) {
  const convert = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = convert(color.r);
  const g = convert(color.g);
  const b = convert(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableText(baseText, background) {
  const darkCandidate = { r: 17, g: 24, b: 39, a: 1 };
  const lightCandidate = { r: 248, g: 250, b: 252, a: 1 };
  const baseContrast = contrastRatio(baseText, background);
  if (baseContrast >= 4.8) {
    return baseText;
  }

  const darkContrast = contrastRatio(darkCandidate, background);
  const lightContrast = contrastRatio(lightCandidate, background);
  return darkContrast >= lightContrast ? darkCandidate : lightCandidate;
}

function colorSaturation(color) {
  if (!color) return 0;
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max - min;
}

function pickSiteAccent() {
  const candidates = [];
  const selectors = [
    "button",
    "a[href]",
    "[role='button']",
    "input[type='submit']",
    "input[type='button']",
    "[class*='btn']",
    "[class*='button']"
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (candidates.length > 42) return;
      const style = window.getComputedStyle(element);
      const bg = parseColorToRgb(style.backgroundColor);
      const fg = parseColorToRgb(style.color);
      const border = parseColorToRgb(style.borderColor);
      [bg, fg, border].forEach((color) => {
        if (color && color.a > 0.2) candidates.push(color);
      });
    });
  });

  const link = document.querySelector("a[href]");
  if (link) {
    const linkColor = parseColorToRgb(window.getComputedStyle(link).color);
    if (linkColor) candidates.unshift(linkColor);
  }

  const vivid = candidates.find((color) => colorSaturation(color) > 35);
  return vivid || candidates[0] || { r: 99, g: 102, b: 241, a: 1 };
}

function detectDominantSurfaceColor() {
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const selectors = ["main", "[role='main']", "section", "article", "div", "body", "html"];
  const scored = [];
  let inspected = 0;

  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    for (const element of nodes) {
      if (inspected > 180) break;
      inspected += 1;

      const rect = element.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const style = window.getComputedStyle(element);
      const color = parseColorToRgb(style.backgroundColor);
      if (!color || color.a < 0.85) continue;

      const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      if (visibleWidth <= 0 || visibleHeight <= 0) continue;

      const areaRatio = (visibleWidth * visibleHeight) / viewportArea;
      const weight = areaRatio * (1 + Math.max(0, 45 - colorSaturation(color)) / 120);
      scored.push({ color, weight });
    }
    if (inspected > 180) break;
  }

  if (!scored.length) return null;
  scored.sort((a, b) => b.weight - a.weight);
  return scored[0].color;
}

function detectSiteTheme(tone) {
  const htmlStyle = window.getComputedStyle(document.documentElement);
  const bodyStyle = window.getComputedStyle(document.body || document.documentElement);

  const htmlBg = parseColorToRgb(htmlStyle.backgroundColor);
  const bodyBg = parseColorToRgb(bodyStyle.backgroundColor);
  const sampledBg = detectDominantSurfaceColor();
  const bg =
    sampledBg ||
    (bodyBg && bodyBg.a > 0.01 ? bodyBg : null) ||
    htmlBg ||
    { r: 248, g: 250, b: 252, a: 1 };

  const bodyText = parseColorToRgb(bodyStyle.color) || parseColorToRgb(htmlStyle.color) || { r: 17, g: 24, b: 39, a: 1 };
  const prefersDark =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const darkMode = colorBrightness(bg) < 145 || (prefersDark && colorBrightness(bg) < 175);

  const siteAccent = pickSiteAccent();
  const toneMap = {
    safe: { r: 34, g: 197, b: 94, a: 1 },
    warning: { r: 245, g: 158, b: 11, a: 1 },
    danger: { r: 239, g: 68, b: 68, a: 1 },
    neutral: siteAccent
  };
  const toneColor = toneMap[tone] || siteAccent;
  const accent = blendColors(siteAccent, toneColor, tone === "neutral" ? 0 : 0.28);

  const panel = darkMode ? blendColors(bg, { r: 255, g: 255, b: 255, a: 1 }, 0.06) : blendColors(bg, { r: 15, g: 23, b: 42, a: 1 }, 0.05);
  const panelStrong = darkMode ? blendColors(bg, { r: 255, g: 255, b: 255, a: 1 }, 0.1) : blendColors(bg, { r: 15, g: 23, b: 42, a: 1 }, 0.1);
  const textSeed = darkMode
    ? blendColors(bodyText, { r: 255, g: 255, b: 255, a: 1 }, 0.18)
    : blendColors(bodyText, { r: 0, g: 0, b: 0, a: 1 }, 0.04);
  const text = ensureReadableText(textSeed, panelStrong);
  const mutedSeed = darkMode ? blendColors(text, bg, 0.42) : blendColors(text, bg, 0.34);
  const muted = ensureReadableText(mutedSeed, panelStrong);
  const border = darkMode ? blendColors(panelStrong, { r: 255, g: 255, b: 255, a: 1 }, 0.22) : blendColors(panelStrong, { r: 0, g: 0, b: 0, a: 1 }, 0.16);

  return {
    accent,
    accentSoft: rgbToString(accent, darkMode ? 0.22 : 0.18),
    accentStrong: rgbToString(accent, darkMode ? 0.34 : 0.26),
    panel: rgbToString(panel, darkMode ? 0.94 : 0.97),
    panelStrong: rgbToString(panelStrong, darkMode ? 0.95 : 0.98),
    text: rgbToString(text),
    muted: rgbToString(muted),
    border: rgbToString(border, darkMode ? 0.55 : 0.45),
    buttonSurface: rgbToString(blendColors(panel, accent, darkMode ? 0.1 : 0.06), darkMode ? 0.8 : 0.85),
    shadow: darkMode ? "0 20px 44px rgba(0,0,0,0.42)" : "0 18px 40px rgba(15,23,42,0.18)",
    darkMode
  };
}

function applyOverlayTheme(root, tone) {
  const theme = detectSiteTheme(tone);
  const chipSurface = theme.darkMode ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const panelSoft = theme.darkMode ? "rgba(15,23,42,0.64)" : "rgba(255,255,255,0.92)";
  const borderSoft = theme.darkMode ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.12)";
  const warningTone = { r: 245, g: 158, b: 11, a: 1 };
  const successTone = { r: 34, g: 197, b: 94, a: 1 };
  const errorTone = { r: 239, g: 68, b: 68, a: 1 };
  const noteWarningBg = theme.darkMode ? rgbToString(warningTone, 0.2) : rgbToString(warningTone, 0.16);
  const noteWarningBorder = theme.darkMode ? rgbToString(warningTone, 0.34) : rgbToString(warningTone, 0.3);
  const noteWarningText = theme.darkMode ? "rgb(254, 240, 200)" : "rgb(146, 64, 14)";
  const noteSuccessBg = theme.darkMode ? rgbToString(successTone, 0.2) : rgbToString(successTone, 0.16);
  const noteSuccessBorder = theme.darkMode ? rgbToString(successTone, 0.34) : rgbToString(successTone, 0.3);
  const noteSuccessText = theme.darkMode ? "rgb(220, 252, 231)" : "rgb(22, 101, 52)";
  const noteErrorBg = theme.darkMode ? rgbToString(errorTone, 0.2) : rgbToString(errorTone, 0.16);
  const noteErrorBorder = theme.darkMode ? rgbToString(errorTone, 0.34) : rgbToString(errorTone, 0.3);
  const noteErrorText = theme.darkMode ? "rgb(254, 226, 226)" : "rgb(153, 27, 27)";

  root.style.setProperty("--tos-accent", rgbToString(theme.accent));
  root.style.setProperty("--tos-accent-soft", theme.accentSoft);
  root.style.setProperty("--tos-accent-strong", theme.accentStrong);
  root.style.setProperty("--tos-site-panel", theme.panel);
  root.style.setProperty("--tos-site-panel-strong", theme.panelStrong);
  root.style.setProperty("--tos-site-panel-soft", panelSoft);
  root.style.setProperty("--tos-site-text", theme.text);
  root.style.setProperty("--tos-site-muted", theme.muted);
  root.style.setProperty("--tos-site-border", theme.border);
  root.style.setProperty("--tos-site-border-soft", borderSoft);
  root.style.setProperty("--tos-site-button-surface", theme.buttonSurface);
  root.style.setProperty("--tos-site-chip-surface", chipSurface);
  root.style.setProperty("--tos-site-shadow", theme.shadow);
  root.style.setProperty("--tos-note-warning-bg", noteWarningBg);
  root.style.setProperty("--tos-note-warning-border", noteWarningBorder);
  root.style.setProperty("--tos-note-warning-text", noteWarningText);
  root.style.setProperty("--tos-note-success-bg", noteSuccessBg);
  root.style.setProperty("--tos-note-success-border", noteSuccessBorder);
  root.style.setProperty("--tos-note-success-text", noteSuccessText);
  root.style.setProperty("--tos-note-error-bg", noteErrorBg);
  root.style.setProperty("--tos-note-error-border", noteErrorBorder);
  root.style.setProperty("--tos-note-error-text", noteErrorText);
}

function overlayScoreFromRating(rating) {
  if (!rating) return null;
  const map = { A: 92, B: 80, C: 62, D: 36, E: 18 };
  return map[String(rating).toUpperCase()] ?? null;
}

function overlayRiskMeta({ rating, riskSummary, error }) {
  if (error) {
    return { tone: "danger", label: "Attention", score: 28 };
  }

  const score = overlayScoreFromRating(rating);
  const summary = cleanText(riskSummary || "").toLowerCase();

  if (score !== null) {
    if (score >= 78) return { tone: "safe", label: "Safe", score };
    if (score >= 50) return { tone: "warning", label: "Warning", score };
    return { tone: "danger", label: "Danger", score };
  }

  if (/(high|risky|extensive|broad|profiling|tracking|share|ads|cross-service)/.test(summary)) {
    return { tone: "warning", label: "Warning", score: 55 };
  }

  return { tone: "neutral", label: "Review", score: 48 };
}

function overlaySourceLabel(source) {
  if (!source) return "";
  return source === "AI" ? "Gemini AI" : source;
}

function overlayIconSvg(tone) {
  if (tone === "safe") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M20 6 9 17l-5-5' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  }

  if (tone === "danger") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M12 8v4m0 4h.01M10.3 3.8 2.9 17a2 2 0 0 0 1.74 3h14.72A2 2 0 0 0 21.1 17L13.7 3.8a2 2 0 0 0-3.4 0Z' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  }

  if (tone === "warning") {
    return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M12 9v4m0 4h.01M12 3l9 16H3L12 3Z' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>";
  }

  return "<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'><path d='M12 3 5 6v6c0 4.4 2.7 8.44 7 10 4.3-1.56 7-5.6 7-10V6l-7-3Z' stroke='currentColor' stroke-width='1.7' stroke-linejoin='round'/><path d='m9.5 12 1.7 1.7 3.3-3.4' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'/></svg>";
}

function defaultOverlayPosition() {
  const width = Math.min(380, Math.max(280, window.innerWidth - 24));
  return {
    left: Math.max(12, window.innerWidth - width - 18),
    top: 18
  };
}

function clampOverlayPosition() {
  if (!overlayRoot) return;

  const rect = overlayRoot.getBoundingClientRect();
  const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
  const maxTop = Math.max(12, window.innerHeight - rect.height - 12);

  overlayState.left = Math.min(Math.max(overlayState.left ?? 12, 12), maxLeft);
  overlayState.top = Math.min(Math.max(overlayState.top ?? 12, 12), maxTop);
}

function applyOverlayPosition() {
  if (!overlayRoot) return;
  clampOverlayPosition();
  overlayRoot.style.left = `${overlayState.left}px`;
  overlayRoot.style.top = `${overlayState.top}px`;
}

function ensureOverlay() {
  if (overlayRoot && document.body.contains(overlayRoot)) {
    return overlayRoot;
  }

  overlayRoot = document.createElement("div");
  overlayRoot.id = "ai-tos-overlay";
  overlayRoot.className = "tos-overlay-root";

  if (overlayState.left === null || overlayState.top === null) {
    const initialPosition = defaultOverlayPosition();
    overlayState.left = initialPosition.left;
    overlayState.top = initialPosition.top;
  }

  document.body.appendChild(overlayRoot);
  applyOverlayPosition();
  return overlayRoot;
}

function closeOverlay() {
  stopOverlayDrag();
  overlayState.minimized = false;
  if (overlayRoot?.isConnected) {
    overlayRoot.remove();
  }
  overlayRoot = null;
}

function stopOverlayDrag() {
  document.removeEventListener("mousemove", onOverlayDrag);
  document.removeEventListener("mouseup", stopOverlayDrag);
}

function onOverlayDrag(event) {
  overlayState.left = event.clientX - overlayState.dragOffsetX;
  overlayState.top = event.clientY - overlayState.dragOffsetY;
  applyOverlayPosition();
}

function startOverlayDrag(event) {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("button")) return;

  const root = ensureOverlay();
  const rect = root.getBoundingClientRect();
  overlayState.dragOffsetX = event.clientX - rect.left;
  overlayState.dragOffsetY = event.clientY - rect.top;

  document.addEventListener("mousemove", onOverlayDrag);
  document.addEventListener("mouseup", stopOverlayDrag);
}

function syncOverlayStateClasses(root) {
  root.classList.toggle("is-minimized", overlayState.minimized);
}

function handleAcknowledge() {
  currentSession.acknowledged = true;
  unblockActionButtons();
  if (overlayState.lastPayload) {
    renderOverlay({
      ...overlayState.lastPayload,
      title: `${overlayState.lastPayload.title.replace(/ \(Reviewed\)$/, "")} (Reviewed)`,
      requireAck: false,
      riskSummary:
        overlayState.lastPayload.riskSummary || "Review complete. Signup and continue controls are now unlocked."
    });
  }
}

function renderOverlay({ title, subtitle, source, rating, riskSummary, keyPoints, error, requireAck }) {
  const root = ensureOverlay();
  const showAck = Boolean(requireAck && !currentSession.acknowledged);
  const riskMeta = overlayRiskMeta({ rating, riskSummary, error });
  const score = riskMeta.score ?? 48;
  const toneClass = `risk-${riskMeta.tone}`;
  const keyPointsHtml = (keyPoints || [])
    .map((point) => `<li class="tos-overlay-point">${escapeHtml(point)}</li>`)
    .join("");

  overlayState.lastPayload = { title, subtitle, source, rating, riskSummary, keyPoints, error, requireAck };

  if (showAck) {
    overlayState.minimized = false;
  }

  root.className = `tos-overlay-root ${toneClass}`;
  applyOverlayTheme(root, riskMeta.tone);
  syncOverlayStateClasses(root);

  root.innerHTML = `
    <div class="tos-overlay-card">
      <div class="tos-overlay-header" id="ai-tos-drag-handle">
        <div class="tos-overlay-brand">
          <div class="tos-overlay-icon">${overlayIconSvg(riskMeta.tone)}</div>
          <div class="tos-overlay-heading">
            <div class="tos-overlay-eyebrow">AI ToS Analyzer</div>
            <div id="ai-tos-header-title" class="tos-overlay-title">${escapeHtml(title)}</div>
            <div class="tos-overlay-subtitle">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <div class="tos-overlay-actions">
          <button id="ai-tos-minimize" class="tos-icon-button" type="button" aria-label="Minimize analyzer">
            <span class="tos-icon-line"></span>
          </button>
          ${
            showAck
              ? ""
              : "<button id='ai-tos-close' class='tos-icon-button' type='button' aria-label='Close analyzer'><span class='tos-close-icon'></span></button>"
          }
        </div>
      </div>

      <div class="tos-overlay-body">
        <div class="tos-overlay-topline">
          <span class="tos-overlay-badge">${escapeHtml(riskMeta.label)}</span>
          ${rating ? `<span class="tos-overlay-chip">Rating ${escapeHtml(rating)}</span>` : ""}
          ${source ? `<span class="tos-overlay-chip">${escapeHtml(overlaySourceLabel(source))}</span>` : ""}
          <span class="tos-overlay-score">Risk score ${escapeHtml(score)}/100</span>
        </div>

        ${
          error
            ? `<div class="tos-overlay-note is-error">${escapeHtml(error)}</div>`
            : `<div class="tos-overlay-summary">${escapeHtml(riskSummary || "Summary is being prepared.")}</div>`
        }

        ${
          keyPoints?.length
            ? `<div class="tos-overlay-section"><div class="tos-overlay-section-title">Key points</div><ul class="tos-overlay-points">${keyPointsHtml}</ul></div>`
            : ""
        }

        <div id="ai-tos-unlock-note" class="tos-overlay-note ${showAck ? "is-warning" : "is-success"}">
          ${
            showAck
              ? "Signup and continue controls are paused until you review this summary."
              : "You can drag, minimize, or dismiss this card while browsing."
          }
        </div>

        <div class="tos-overlay-footer">
          ${
            showAck
              ? "<button id='ai-tos-ack' class='tos-button is-primary' type='button'>I understand, continue</button>"
              : "<button id='ai-tos-close-secondary' class='tos-button is-secondary' type='button'>Dismiss</button>"
          }
          <button id="ai-tos-minimize-secondary" class="tos-button is-ghost" type="button">
            ${overlayState.minimized ? "Expand" : "Minimize"}
          </button>
        </div>
      </div>
    </div>
  `;

  applyOverlayPosition();

  const dragHandle = root.querySelector("#ai-tos-drag-handle");
  dragHandle?.addEventListener("mousedown", startOverlayDrag);

  const minimize = () => {
    overlayState.minimized = !overlayState.minimized;
    syncOverlayStateClasses(root);
    applyOverlayPosition();
    const secondaryLabel = root.querySelector("#ai-tos-minimize-secondary");
    if (secondaryLabel) {
      secondaryLabel.textContent = overlayState.minimized ? "Expand" : "Minimize";
    }
  };

  root.querySelector("#ai-tos-minimize")?.addEventListener("click", minimize);
  root.querySelector("#ai-tos-minimize-secondary")?.addEventListener("click", minimize);
  root.querySelector("#ai-tos-close")?.addEventListener("click", closeOverlay);
  root.querySelector("#ai-tos-close-secondary")?.addEventListener("click", closeOverlay);
  root.querySelector("#ai-tos-ack")?.addEventListener("click", handleAcknowledge);
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
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("#ai-tos-ack")) return;

      event.preventDefault();
      event.stopPropagation();
      handleAcknowledge();
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!currentSession.requireAck || currentSession.acknowledged) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#ai-tos-overlay")) return;

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
      if (form.closest("#ai-tos-overlay")) return;

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
  window.addEventListener("resize", applyOverlayPosition);
}

window.addEventListener("beforeunload", () => {
  stopOverlayDrag();
  unblockActionButtons();
});
