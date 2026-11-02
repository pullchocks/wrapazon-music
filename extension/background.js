const MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function isAmazon(domain) {
  const host = String(domain || "").replace(/^\./, "").toLowerCase();
  if (!host || host === "amazon" || host.includes("amazon-adsystem")) return false;
  return (
    host === "amazon.com" ||
    host.endsWith(".amazon.com") ||
    host.startsWith("amazon.") ||
    host.includes(".amazon.") ||
    host === "media-amazon.com" ||
    host.endsWith(".media-amazon.com")
  );
}

function sameSiteCandidates(cookie) {
  const values = [];
  if (cookie.sameSite && cookie.sameSite !== "unspecified") values.push(cookie.sameSite);
  values.push("lax", "no_restriction");
  return [...new Set(values)];
}

async function promote(cookie) {
  if (!cookie?.session || !isAmazon(cookie.domain)) return false;

  const host = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
  const path = cookie.path && cookie.path.startsWith("/") ? cookie.path : "/";
  const details = {
    url: `${cookie.secure ? "https" : "http"}://${host}${path}`,
    name: cookie.name,
    value: cookie.value,
    path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    expirationDate: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    storeId: cookie.storeId,
  };

  if (cookie.domain.startsWith(".") && !cookie.name.startsWith("__Host-")) {
    details.domain = cookie.domain;
  }
  if (cookie.partitionKey) details.partitionKey = cookie.partitionKey;

  for (const sameSite of sameSiteCandidates(cookie)) {
    try {
      const stored = await chrome.cookies.set({ ...details, sameSite });
      if (stored && !stored.session) return true;
    } catch {
      // Try the next SameSite mode. A few auth cookies reject the first one.
    }
  }

  if (details.partitionKey) {
    const retry = { ...details };
    delete retry.partitionKey;
    try {
      const stored = await chrome.cookies.set({ ...retry, sameSite: "lax" });
      return Boolean(stored && !stored.session);
    } catch {
      return false;
    }
  }
  return false;
}

async function sweep() {
  const cookies = await chrome.cookies.getAll({});
  await Promise.all(cookies.map((cookie) => promote(cookie)));
}

chrome.cookies.onChanged.addListener((info) => {
  if (info.removed || !info.cookie?.session) return;
  promote(info.cookie);
});

chrome.runtime.onInstalled.addListener(() => {
  sweep();
});

chrome.runtime.onStartup.addListener(() => {
  sweep();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "sweep") return;
  sweep()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});

chrome.alarms.create("wrapazon-session", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "wrapazon-session") sweep();
});
