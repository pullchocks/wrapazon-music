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

const SPLASH_TEXT = "Wrapazon Music by pullchocks";
const SPLASH_FONT =
  '"AmazonEmber-Regular", "Amazon Ember", "EmberModernDisplayStd-Regular", "Ember", sans-serif';

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
      padding: 32px;
      background: #101414;
      color: #f4f7f7;
      text-align: center;
      font-family: ${SPLASH_FONT};
      font-size: 28px;
      font-weight: 400;
      line-height: 1.3;
      letter-spacing: 0;
      cursor: pointer;
    }
  `;

  const splash = document.createElement("div");
  splash.id = "wrapazon-splash";
  splash.textContent = SPLASH_TEXT;

  let removed = false;
  const dismiss = () => {
    if (removed) return;
    removed = true;
    splash.remove();
    style.remove();
  };

  splash.addEventListener("click", dismiss);
  const timer = window.setTimeout(dismiss, 2000);
  splash.addEventListener(
    "click",
    () => {
      window.clearTimeout(timer);
    },
    { once: true }
  );

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
