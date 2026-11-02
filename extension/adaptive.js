const root = document.documentElement;

function layoutName(width) {
  if (width < 480) return "narrow";
  if (width < 840) return "compact";
  if (width < 1280) return "medium";
  return "wide";
}

function applyLayout() {
  const width = window.innerWidth;
  const name = layoutName(width);
  if (root.dataset.wrapazon !== name) root.dataset.wrapazon = name;
  root.style.setProperty("--wrapazon-width", `${width}px`);
}

applyLayout();
window.addEventListener("resize", applyLayout, { passive: true });
chrome.runtime.sendMessage({ type: "sweep" }).catch(() => {});

const GET_APP = /^\s*get(?:\s+the)?\s+app\s*$/i;

function isGetApp(el) {
  const label =
    el.getAttribute("arialabeltext") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.textContent ||
    "";
  return GET_APP.test(label);
}

function hideGetApp(scope) {
  const root = scope && scope.nodeType === 1 ? scope : document;
  const found = [];
  if (root.matches && root.matches("music-button, a, button, [role='button']") && isGetApp(root)) {
    found.push(root);
  }
  if (root.querySelectorAll) {
    for (const el of root.querySelectorAll("music-button, a, button, [role='button']")) {
      if (isGetApp(el)) found.push(el);
    }
  }
  for (const el of found) {
    const item = el.closest("#music-navbar li") || el;
    item.dataset.wrapazonHidden = "get-app";
    item.style.setProperty("display", "none", "important");
  }
}

function releasePageCap() {
  const scope = document.getElementById("root") || document.body;
  if (!scope) return;
  for (const el of scope.querySelectorAll("*")) {
    if (
      el.style.getPropertyValue("max-width") === "100%" &&
      el.style.getPropertyValue("width") === "100%"
    ) {
      continue;
    }
    const max = parseFloat(getComputedStyle(el).maxWidth);
    if (max >= 1400 && max <= 1700) {
      el.style.setProperty("max-width", "100%", "important");
      el.style.setProperty("width", "100%", "important");
    }
  }
}

let hideScheduled = false;
function scheduleHideGetApp() {
  if (hideScheduled) return;
  hideScheduled = true;
  requestAnimationFrame(() => {
    hideScheduled = false;
    hideGetApp(document.getElementById("music-navbar") || document);
  });
}

let fitScheduled = false;
function scheduleFit() {
  if (fitScheduled) return;
  fitScheduled = true;
  requestAnimationFrame(() => {
    fitScheduled = false;
    releasePageCap();
  });
}

function anchorFromEvent(event) {
  for (const node of event.composedPath()) {
    if (node instanceof Element && node.localName === "a") return node;
  }
  return null;
}

let statusAnchor = null;
let activating = false;

function stripStatusHref(anchor) {
  if (!anchor || !anchor.hasAttribute("href")) return;
  if (statusAnchor && statusAnchor !== anchor) restoreStatusHref(statusAnchor);
  anchor.dataset.wrapazonHref = anchor.getAttribute("href");
  anchor.removeAttribute("href");
  statusAnchor = anchor;
}

function restoreStatusHref(anchor) {
  if (!anchor || !anchor.dataset.wrapazonHref) return;
  anchor.setAttribute("href", anchor.dataset.wrapazonHref);
  delete anchor.dataset.wrapazonHref;
  if (statusAnchor === anchor) statusAnchor = null;
}

function stillInside(anchor, node) {
  if (!node || !anchor) return false;
  if (node === anchor) return true;
  try {
    if (anchor.contains(node)) return true;
  } catch {
    return false;
  }
  const rootNode = node.getRootNode && node.getRootNode();
  return rootNode instanceof ShadowRoot && rootNode.host && stillInside(anchor, rootNode.host);
}

document.addEventListener(
  "mouseover",
  (event) => {
    const anchor = anchorFromEvent(event);
    if (statusAnchor && statusAnchor !== anchor) restoreStatusHref(statusAnchor);
    if (anchor) stripStatusHref(anchor);
  },
  true
);

document.addEventListener(
  "mouseout",
  (event) => {
    const anchor = anchorFromEvent(event);
    if (!anchor || anchor !== statusAnchor) return;
    if (stillInside(anchor, event.relatedTarget)) return;
    restoreStatusHref(anchor);
  },
  true
);

document.addEventListener(
  "focusin",
  (event) => {
    const anchor = anchorFromEvent(event);
    if (anchor) stripStatusHref(anchor);
  },
  true
);

document.addEventListener(
  "focusout",
  (event) => {
    const anchor = anchorFromEvent(event);
    if (!anchor) return;
    if (stillInside(anchor, event.relatedTarget)) return;
    restoreStatusHref(anchor);
  },
  true
);

function restoreForActivation(event) {
  const anchor = anchorFromEvent(event);
  if (!anchor) return null;
  activating = true;
  restoreStatusHref(anchor);
  return anchor;
}

function restriphover(anchor) {
  window.setTimeout(() => {
    activating = false;
    if (!anchor || !anchor.isConnected) return;
    const hovered = anchor.matches(":hover");
    const focused = document.activeElement === anchor || stillInside(anchor, document.activeElement);
    if (hovered || focused) stripStatusHref(anchor);
  }, 0);
}

document.addEventListener("pointerdown", restoreForActivation, true);
document.addEventListener("auxclick", restoreForActivation, true);
document.addEventListener("contextmenu", restoreForActivation, true);
document.addEventListener("dragstart", restoreForActivation, true);
document.addEventListener(
  "click",
  (event) => {
    restriphover(restoreForActivation(event));
  },
  true
);
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter" || event.key === " ") restoreForActivation(event);
  },
  true
);
document.addEventListener(
  "keyup",
  (event) => {
    if (event.key === "Enter" || event.key === " ") restriphover(anchorFromEvent(event));
  },
  true
);

const SPLASH_FONT =
  '"AmazonEmber-Regular", "Amazon Ember", "EmberModernDisplayStd-Regular", "Ember", sans-serif';
const SPLASH_HOLD_MS = 1400;
const SPLASH_FADE_MS = 320;

function pageFont() {
  const ember = [];
  if (document.fonts) {
    for (const face of document.fonts) {
      if (/ember/i.test(face.family) && !ember.includes(face.family)) ember.push(face.family);
    }
  }
  const regular =
    ember.find((family) => /amazonember-regular/i.test(family)) ||
    ember.find((family) => /regular/i.test(family) && !/bold/i.test(family)) ||
    ember[0];
  if (regular) return `"${regular}", sans-serif`;
  const sample = document.body || document.getElementById("root");
  const computed = sample ? getComputedStyle(sample).fontFamily : "";
  if (computed && !/times new roman/i.test(computed) && !/^(sans-serif|system-ui)$/i.test(computed.trim())) {
    return computed;
  }
  return SPLASH_FONT;
}

function showSplash() {
  try {
    if (sessionStorage.getItem("wrapazon-splash")) return;
    sessionStorage.setItem("wrapazon-splash", "1");
  } catch {
    // Show the splash anyway if storage is blocked.
  }
  if (document.getElementById("wrapazon-splash")) return;

  const style = document.createElement("style");
  style.id = "wrapazon-splash-style";
  style.textContent = `
    #wrapazon-splash {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      margin: 0;
      padding: 24px;
      background:
        radial-gradient(ellipse 70% 55% at 50% 42%, rgba(26, 210, 251, 0.18), transparent 62%),
        radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255, 153, 0, 0.08), transparent 55%),
        linear-gradient(165deg, #0a0e0e 0%, #101414 48%, #0d1214 100%);
      color: #f4f7f7;
      font-family: ${SPLASH_FONT};
      cursor: pointer;
      opacity: 1;
      transition: opacity ${SPLASH_FADE_MS}ms ease;
    }
    #wrapazon-splash.wrapazon-splash-out {
      opacity: 0;
      pointer-events: none;
    }
    #wrapazon-splash .wrapazon-splash-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      transform: translateY(6px) scale(0.96);
      opacity: 0;
      animation: wrapazon-splash-in 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    @keyframes wrapazon-splash-in {
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    #wrapazon-splash .wrapazon-splash-mark {
      width: 72px;
      height: 72px;
      filter: drop-shadow(0 0 18px rgba(26, 210, 251, 0.35));
    }
    #wrapazon-splash .wrapazon-splash-mark .ring {
      stroke-dasharray: 226;
      stroke-dashoffset: 226;
      animation: wrapazon-ring 480ms ease-out 40ms forwards;
    }
    @keyframes wrapazon-ring {
      to { stroke-dashoffset: 0; }
    }
    #wrapazon-splash .wrapazon-splash-title {
      margin: 0;
      font-size: clamp(22px, 3.6vw, 30px);
      font-weight: 400;
      letter-spacing: 0.02em;
      line-height: 1.15;
      text-align: center;
    }
    #wrapazon-splash .wrapazon-splash-title span {
      color: #1ad2fb;
    }
    #wrapazon-splash .wrapazon-splash-by {
      margin: -6px 0 0;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(244, 247, 247, 0.55);
    }
    #wrapazon-splash .wrapazon-eq {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 22px;
      margin-top: 2px;
    }
    #wrapazon-splash .wrapazon-eq i {
      display: block;
      width: 4px;
      border-radius: 2px;
      background: linear-gradient(180deg, #1ad2fb, #ff9900);
      transform-origin: bottom;
      animation: wrapazon-eq 520ms ease-in-out infinite alternate;
    }
    #wrapazon-splash .wrapazon-eq i:nth-child(1) { height: 8px; animation-delay: 0ms; }
    #wrapazon-splash .wrapazon-eq i:nth-child(2) { height: 16px; animation-delay: 70ms; }
    #wrapazon-splash .wrapazon-eq i:nth-child(3) { height: 22px; animation-delay: 140ms; }
    #wrapazon-splash .wrapazon-eq i:nth-child(4) { height: 12px; animation-delay: 210ms; }
    #wrapazon-splash .wrapazon-eq i:nth-child(5) { height: 18px; animation-delay: 280ms; }
    @keyframes wrapazon-eq {
      from { transform: scaleY(0.45); opacity: 0.7; }
      to { transform: scaleY(1); opacity: 1; }
    }
  `;

  const splash = document.createElement("div");
  splash.id = "wrapazon-splash";
  splash.setAttribute("role", "presentation");
  splash.innerHTML = `
    <div class="wrapazon-splash-inner">
      <svg class="wrapazon-splash-mark" viewBox="0 0 128 128" aria-hidden="true">
        <circle class="ring" cx="64" cy="66" r="36" fill="none" stroke="#1ad2fb" stroke-width="8"/>
        <circle cx="64" cy="66" r="7" fill="#1ad2fb"/>
        <path d="M78 28c8 6 14 16 16 28" fill="none" stroke="#f4f7f7" stroke-width="8" stroke-linecap="round"/>
        <path d="M92 24l8 16-18 2z" fill="#f4f7f7"/>
      </svg>
      <p class="wrapazon-splash-title">Wrapazon <span>Music</span></p>
      <p class="wrapazon-splash-by">by pullchocks</p>
      <div class="wrapazon-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
  `;

  let removed = false;
  let timer = 0;
  const dismiss = () => {
    if (removed) return;
    removed = true;
    window.clearTimeout(timer);
    splash.classList.add("wrapazon-splash-out");
    window.setTimeout(() => {
      splash.remove();
      style.remove();
    }, SPLASH_FADE_MS);
  };

  splash.addEventListener("click", dismiss);
  timer = window.setTimeout(dismiss, SPLASH_HOLD_MS);

  const applyFont = () => {
    splash.style.fontFamily = pageFont();
  };
  document.fonts?.ready?.then(applyFont).catch(() => {});
  document.fonts?.addEventListener?.("loadingdone", applyFont);

  root.appendChild(style);
  root.appendChild(splash);
  applyFont();
}

showSplash();
scheduleHideGetApp();
scheduleFit();
window.addEventListener("resize", scheduleFit, { passive: true });

new MutationObserver((records) => {
  let added = false;
  let capped = false;
  for (const record of records) {
    if (record.type === "childList" && record.addedNodes.length) added = true;
    if (record.type === "attributes" && record.attributeName === "href") {
      const anchor = record.target;
      if (!activating && anchor === statusAnchor && anchor.dataset.wrapazonHref && anchor.hasAttribute("href")) {
        anchor.removeAttribute("href");
      }
    }
    if (record.type === "attributes" && record.attributeName === "style") {
      const value = record.target.getAttribute?.("style") || "";
      if (value.includes("1600")) capped = true;
    }
  }
  if (added) {
    scheduleHideGetApp();
    scheduleFit();
  } else if (capped) {
    scheduleFit();
  }
}).observe(root, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["style", "href"],
});
