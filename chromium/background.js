let syncIntervalTimer = null;

chrome.storage.local.get(["syncIntervalMinutes"], (data) => {
  const interval = data.syncIntervalMinutes || 1440;
  setupSyncInterval(interval);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "fetchUrl") {
      const url = request.url;
      fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "User-Agent": navigator.userAgent,
        },
      })
        .then(async (response) => {
          const finalUrl = response.url;
          const contentType = response.headers.get("content-type");
          if (contentType?.startsWith("image/")) return { imageUrl: finalUrl };
          if (contentType?.includes("text/html")) {
            const text = await response.text();
            const ogMatch = text.match(
              /<meta\s+property="og:image"\s+content="([^"]+)"/i,
            );
            if (ogMatch?.[1]) return { imageUrl: ogMatch[1] };
            const linkMatch = text.match(
              /<link\s+rel="image_src"\s+href="([^"]+)"/i,
            );
            if (linkMatch?.[1]) return { imageUrl: linkMatch[1] };
          }
          if (finalUrl !== url && /\.(jpeg|jpg|gif|png|webp)$/i.test(finalUrl))
            return { imageUrl: finalUrl };
          return { imageUrl: null };
        })
        .then(sendResponse)
        .catch((error) => {
          console.error("Background fetch error:", error);
          sendResponse({ imageUrl: null });
        });
      return true;
    }

    if (request.action === "syncUrl") {
      syncSingleList(request.url)
        .then((result) => sendResponse({ success: result }))
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (request.action === "syncAll") {
      syncAllLists()
        .then((result) => sendResponse(result))
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (request.action === "setSyncInterval") {
      setupSyncInterval(request.intervalMinutes);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === "getNextSyncTime") {
      if (syncIntervalTimer) {
        const now = Date.now();
        const intervalMs = getCurrentIntervalMs();
        sendResponse({ nextSync: now + intervalMs });
      } else {
        sendResponse({ nextSync: null });
      }
      return true;
    }
  } catch (e) {
    console.error("Background Message Error:", e);
    sendResponse({ success: false, imageUrl: null });
  }
});

function setupSyncInterval(intervalMinutes) {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }

  chrome.alarms.clear("syncRemoteLists");

  const intervalMs = intervalMinutes * 60 * 1000;

  if (intervalMinutes < 1) {
    syncIntervalTimer = setInterval(() => {
      syncAllLists();
    }, intervalMs);

    setTimeout(() => syncAllLists(), 5000);
  } else {
    chrome.alarms.create("syncRemoteLists", {
      periodInMinutes: Math.ceil(intervalMinutes),
      delayInMinutes: Math.ceil(intervalMinutes),
    });
  }

  chrome.storage.local.set({
    lastIntervalSet: Date.now(),
    syncIntervalMinutes: intervalMinutes,
  });
}

function getCurrentIntervalMs() {
  return 60000; 
}

async function syncSingleList(targetUrl) {
  const { remoteSubscriptions } = await chrome.storage.local.get(
    "remoteSubscriptions",
  );
  const subs = remoteSubscriptions || [];
  const subIndex = subs.findIndex((s) => s.url === targetUrl);
  if (subIndex === -1) return false;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("JSON bir dizi değil (array)");

    subs[subIndex].data = data;
    subs[subIndex].lastSync = Date.now();
    subs[subIndex].count = data.length;
    await chrome.storage.local.set({ remoteSubscriptions: subs });

    return true;
  } catch (e) {
    return false;
  }
}
async function syncAllLists() {
  const { remoteSubscriptions } = await chrome.storage.local.get(
    "remoteSubscriptions",
  );

  if (!remoteSubscriptions || remoteSubscriptions.length === 0) {
    return {
      success: true,
      message: "Boş liste",
      total: 0,
      successCount: 0,
      failCount: 0,
    };
  }

  let successCount = 0;
  let failCount = 0;

  for (const sub of remoteSubscriptions) {
    try {
      const result = await syncSingleList(sub.url);
      if (result) successCount++;
      else failCount++;
    } catch (err) {
      console.error(`ERROR: ${sub.url}`, err);
      failCount++;
    }
  }

  await chrome.storage.local.set({ lastIntervalSet: Date.now() });

  return {
    success: true,
    message: `${successCount}/${remoteSubscriptions.length} liste güncellendi`,
    total: remoteSubscriptions.length,
    successCount,
    failCount,
  };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncRemoteLists") {
    syncAllLists();
  }
});
