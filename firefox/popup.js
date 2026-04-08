document.getElementById("openOptionsBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const translations = {
      filteringLabel: chrome.i18n.getMessage("popup_filtering"),
      usersLabel: chrome.i18n.getMessage("popup_users"),
      topicsLabel: chrome.i18n.getMessage("popup_topics"),
      entriesLabel: chrome.i18n.getMessage("popup_entries"),
      openOptionsBtn: chrome.i18n.getMessage("popup_open_options"),
      customizationTitle: chrome.i18n.getMessage("options_customization"),
      autoExpandLabel: chrome.i18n.getMessage("tweak_auto_expand"),
      autoImagesLabel: chrome.i18n.getMessage("tweak_auto_images"),
    };

    for (const [id, text] of Object.entries(translations)) {
      const el = document.getElementById(id);
      if (el && text) {
        const bold = el.querySelector("b");
        if (bold) bold.textContent = text;
        else el.textContent = text;
      }
    }

    const data = await chrome.storage.local.get([
      "blockedUsers",
      "blockedTopics",
      "blockedEntries",
      "remoteSubscriptions",
    ]);

    const localUsers = data.blockedUsers || [];
    const localTopics = data.blockedTopics || [];
    const localEntries = data.blockedEntries || [];
    const subs = data.remoteSubscriptions || [];

    let remoteUsers = [],
      remoteTopics = [],
      remoteEntries = [];
    try {
      remoteUsers = subs
        .filter((s) => s.type === "users" && Array.isArray(s.data))
        .flatMap((s) => s.data);
      remoteTopics = subs
        .filter((s) => s.type === "topics" && Array.isArray(s.data))
        .flatMap((s) => s.data);
      remoteEntries = subs
        .filter((s) => s.type === "entries" && Array.isArray(s.data))
        .flatMap((s) => s.data);
    } catch (e) {
      console.error("Popup remote list parse error:", e);
    }

    document.getElementById("userCount").textContent = new Set([
      ...localUsers,
      ...remoteUsers,
    ]).size;
    document.getElementById("topicCount").textContent = new Set([
      ...localTopics,
      ...remoteTopics,
    ]).size;
    document.getElementById("entryCount").textContent = new Set([
      ...localEntries,
      ...remoteEntries,
    ]).size;

    const enabledData = await chrome.storage.local.get("enabled");
    const switchInput = document.getElementById("enableSwitch");
    switchInput.checked = enabledData.enabled ?? true;
    switchInput.addEventListener("change", async () => {
      await chrome.storage.local.set({ enabled: switchInput.checked });
    });

    const autoExpandToggle = document.getElementById("autoExpandToggle");
    const autoExpandData = await chrome.storage.local.get("autoExpand");
    autoExpandToggle.checked = autoExpandData.autoExpand ?? false;
    autoExpandToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({ autoExpand: autoExpandToggle.checked });
    });

    const autoImagesToggle = document.getElementById("autoImagesToggle");
    const autoImagesData = await chrome.storage.local.get("autoImages");
    autoImagesToggle.checked = autoImagesData.autoImages ?? false;
    autoImagesToggle.addEventListener("change", async () => {
      await chrome.storage.local.set({ autoImages: autoImagesToggle.checked });
    });

    const promo = document.getElementById("bgEcosystemPromo");
    const btn = document.getElementById("bgPromoClose");
    chrome.storage.local.get("hideBgPromo", ({ hideBgPromo }) => {
      if (hideBgPromo === true && promo) promo.style.display = "none";
    });
    if (btn && promo) {
      btn.addEventListener("click", () => {
        promo.style.display = "none";
        chrome.storage.local.set({ hideBgPromo: true });
      });
    }
  } catch (e) {
    console.error("Popup Init Error:", e);
  }
});
