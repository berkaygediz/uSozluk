function normalize(str) {
  return str.trim().toLowerCase();
}

function createListItem(name, onRemove) {
  const li = document.createElement("li");
  li.textContent = name;

  const btn = document.createElement("button");
  btn.textContent = "X";
  btn.className = "delete-btn";
  btn.onclick = () => onRemove(name);

  li.appendChild(btn);
  return li;
}

async function getStorageData(key) {
  const data = await chrome.storage.local.get([key]);
  return data[key] || [];
}

async function setStorageData(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function loadBlockedUsers() {
  const users = await getStorageData("blockedUsers");
  const userList = document.getElementById("userList");
  const userTitle = document.getElementById("userTitle");

  const titleBase = chrome.i18n.getMessage("options_blocked_users");
  userTitle.textContent = `${titleBase} (${users.length})`;
  userList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  users.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = users.filter((c) => c !== toRemove);
      await setStorageData("blockedUsers", filtered);
      loadBlockedUsers();
    });
    fragment.appendChild(li);
  });
  userList.appendChild(fragment);

  loadUserSuggestions(users);
}

async function loadBlockedTopics() {
  const topics = await getStorageData("blockedTopics");
  const topicList = document.getElementById("topicList");
  const topicTitle = document.getElementById("topicTitle");

  const titleBase = chrome.i18n.getMessage("options_blocked_topics");
  topicTitle.textContent = `${titleBase} (${topics.length})`;
  topicList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  topics.forEach((name) => {
    const li = createListItem(name, async (toRemove) => {
      const filtered = topics.filter((c) => c !== toRemove);
      await setStorageData("blockedTopics", filtered);
      loadBlockedTopics();
    });
    fragment.appendChild(li);
  });
  topicList.appendChild(fragment);
}

async function loadBlockedEntries() {
  const entries = await getStorageData("blockedEntries");
  const entryList = document.getElementById("entryList");
  const entryTitle = document.getElementById("entryTitle");

  const titleBase = chrome.i18n.getMessage("options_blocked_entries");
  entryTitle.textContent = `${titleBase} (${entries.length})`;
  entryList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  entries.forEach((id) => {
    const li = createListItem(id, async (toRemove) => {
      const filtered = entries.filter((c) => c !== toRemove);
      await setStorageData("blockedEntries", filtered);
      loadBlockedEntries();
    });
    fragment.appendChild(li);
  });
  entryList.appendChild(fragment);
}

async function addItem(storageKey, inputId) {
  const input = document.getElementById(inputId);
  const newItem = input.value.trim();
  if (!newItem) return;

  const list = await getStorageData(storageKey);

  if (list.some((item) => normalize(item) === normalize(newItem))) {
    alert(chrome.i18n.getMessage("alert_duplicate_item"));
    input.value = "";
    return;
  }

  list.push(newItem);
  await setStorageData(storageKey, list);
  input.value = "";

  switch (storageKey) {
    case "blockedUsers":
      loadBlockedUsers();
      break;
    case "blockedTopics":
      loadBlockedTopics();
      break;
    case "blockedEntries":
      loadBlockedEntries();
      break;
  }
}

async function exportList(storageKey) {
  const list = await getStorageData(storageKey);
  const blob = new Blob([JSON.stringify(list, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${storageKey}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importList(storageKey) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedList = JSON.parse(text);
      if (!Array.isArray(importedList)) throw new Error("Invalid format");

      const currentList = await getStorageData(storageKey);
      const merged = [...new Set([...currentList, ...importedList])];
      await setStorageData(storageKey, merged);

      if (storageKey === "blockedUsers") loadBlockedUsers();
      else if (storageKey === "blockedTopics") loadBlockedTopics();
      else loadBlockedEntries();

      alert(chrome.i18n.getMessage("alert_import_success"));
    } catch (err) {
      alert(chrome.i18n.getMessage("alert_import_invalid"));
    }
  };
  input.click();
}

async function clearList(storageKey) {
  if (confirm(chrome.i18n.getMessage("confirm_clear"))) {
    await setStorageData(storageKey, []);
    if (storageKey === "blockedUsers") loadBlockedUsers();
    else if (storageKey === "blockedTopics") loadBlockedTopics();
    else loadBlockedEntries();
  }
}

function toggleUsersSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("usersControls").style.display = display;
  document.getElementById("userList").style.display = display;
  document.getElementById("userInput").style.display = display;
  document.getElementById("addUserBtn").style.display = display;
  document.getElementById("showUsersBtn").style.display = show
    ? "none"
    : "inline-block";

  if (show) loadBlockedUsers();
  else {
    const suggestionsEl = document.getElementById("userSuggestions");
    if (suggestionsEl) suggestionsEl.style.display = "none";
  }
}

function toggleTopicsSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("topicsControls").style.display = display;
  document.getElementById("topicList").style.display = display;
  document.getElementById("topicInput").style.display = display;
  document.getElementById("addTopicBtn").style.display = display;
  document.getElementById("showTopicsBtn").style.display = show
    ? "none"
    : "inline-block";
  if (show) loadBlockedTopics();
}

function toggleEntriesSection(show) {
  const display = show ? "block" : "none";
  document.getElementById("entriesControls").style.display = display;
  document.getElementById("entryList").style.display = display;
  document.getElementById("entryInput").style.display = display;
  document.getElementById("addEntryBtn").style.display = display;
  document.getElementById("showEntriesBtn").style.display = show
    ? "none"
    : "inline-block";
  if (show) loadBlockedEntries();
}

async function loadUserSuggestions(currentUsers) {
  try {
    const url = chrome.runtime.getURL(
      "lists/berkaygediz-universal-blocklist-eksi-sozluk.json",
    );
    const response = await fetch(url);
    const preloadedList = await response.json();

    const missingItems = preloadedList.filter(
      (item) => !currentUsers.includes(item),
    );

    const container = document.getElementById("userSuggestions");
    const infoSpan = document.getElementById("suggestionInfo");
    const addBtn = document.getElementById("addAllSuggestionsBtn");

    if (missingItems.length === 0) {
      container.style.display = "none";
      return;
    }

    const userListEl = document.getElementById("userList");
    if (userListEl.style.display !== "none") {
      container.style.display = "block";
    }

    infoSpan.textContent = `${i18n("suggestion_missing_items")} ${missingItems.length} ${i18n("suggestion_items_count")}`;

    addBtn.onclick = async () => {
      const list = await getStorageData("blockedUsers");
      const merged = [...new Set([...list, ...missingItems])];
      await setStorageData("blockedUsers", merged);
      loadBlockedUsers();
    };
  } catch (e) {
    console.error(i18n("error_loading_suggestions"), e);
  }
}

function timeAgo(timestamp) {
  if (!timestamp) return i18n("time_never");
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n("time_just_now");
  if (mins < 60) return i18n("time_minutes_ago", mins.toString());
  const hours = Math.floor(mins / 60);
  if (hours < 24) return i18n("time_hours_ago", hours.toString());
  const days = Math.floor(hours / 24);
  return i18n("time_days_ago", days.toString());
}

function i18n(key, substitutions) {
  if (typeof chrome !== "undefined" && chrome.i18n) {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }
  return key;
}

const openSvg = `<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>`;
const syncSvg = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;
const removeSvg = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

function renderSubscriptions() {
  chrome.storage.local.get(
    ["remoteSubscriptions", "syncIntervalMinutes"],
    (result) => {
      const subs = result.remoteSubscriptions || [];
      const syncIntervalSelect = document.getElementById("syncIntervalSelect");

      if (
        result.syncIntervalMinutes !== undefined &&
        result.syncIntervalMinutes !== null
      ) {
        syncIntervalSelect.value = result.syncIntervalMinutes;
      }

      const subListEl = document.getElementById("subList");
      subListEl.innerHTML = "";
      const fragment = document.createDocumentFragment();

      subs.forEach((sub) => {
        const li = document.createElement("li");

        const info = document.createElement("div");
        info.className = "sub-info";

        const urlSpan = document.createElement("span");
        urlSpan.className = "sub-url";
        urlSpan.textContent = sub.url;
        urlSpan.title = sub.url;

        const metaRow = document.createElement("div");
        metaRow.className = "sub-meta";
        metaRow.innerHTML = `<span>${i18n("meta_updated")} ${timeAgo(sub.lastSync)}</span><span>${i18n("meta_items")} ${sub.count || 0}</span>`;

        info.appendChild(urlSpan);
        info.appendChild(metaRow);

        const badge = document.createElement("span");
        badge.className = "sub-badge";
        badge.textContent = sub.type;

        const actions = document.createElement("div");
        actions.className = "sub-actions";

        const openBtn = document.createElement("button");
        openBtn.innerHTML = openSvg;
        openBtn.title = i18n("btn_open_url");
        openBtn.onclick = () => window.open(sub.url, "_blank");

        const syncBtn = document.createElement("button");
        syncBtn.innerHTML = syncSvg;
        syncBtn.title = i18n("btn_update_now");
        syncBtn.onclick = async () => {
          syncBtn.style.color = "#ffc503";
          chrome.runtime.sendMessage(
            { action: "syncUrl", url: sub.url },
            (res) => {
              syncBtn.style.color = res?.success ? "#8bc34a" : "#d9534f";
              renderSubscriptions();
            },
          );
        };

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.innerHTML = removeSvg;
        removeBtn.title = i18n("btn_remove");
        removeBtn.onclick = async () => {
          const updatedSubs = subs.filter((s) => s.url !== sub.url);
          await chrome.storage.local.set({ remoteSubscriptions: updatedSubs });
          renderSubscriptions();
        };

        actions.appendChild(openBtn);
        actions.appendChild(syncBtn);
        actions.appendChild(removeBtn);

        li.appendChild(info);
        li.appendChild(badge);
        li.appendChild(actions);

        fragment.appendChild(li);
      });

      subListEl.appendChild(fragment);
    },
  );
}

function setupEventListeners() {
  const translations = {
    userTitle: chrome.i18n.getMessage("options_blocked_users"),
    topicTitle: chrome.i18n.getMessage("options_blocked_topics"),
    entryTitle: chrome.i18n.getMessage("options_blocked_entries"),

    showUsersBtn: chrome.i18n.getMessage("options_show"),
    showTopicsBtn: chrome.i18n.getMessage("options_show"),
    showEntriesBtn: chrome.i18n.getMessage("options_show"),

    exportUsersBtn: chrome.i18n.getMessage("options_export"),
    importUsersBtn: chrome.i18n.getMessage("options_import"),
    clearUsersBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshUsersBtn: chrome.i18n.getMessage("options_refresh"),
    addUserBtn: chrome.i18n.getMessage("options_add_user"),

    exportTopicsBtn: chrome.i18n.getMessage("options_export"),
    importTopicsBtn: chrome.i18n.getMessage("options_import"),
    clearTopicsBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshTopicsBtn: chrome.i18n.getMessage("options_refresh"),
    addTopicBtn: chrome.i18n.getMessage("options_add_topic"),

    exportEntriesBtn: chrome.i18n.getMessage("options_export"),
    importEntriesBtn: chrome.i18n.getMessage("options_import"),
    clearEntriesBtn: chrome.i18n.getMessage("options_clear_all"),
    refreshEntriesBtn: chrome.i18n.getMessage("options_refresh"),
    addEntryBtn: chrome.i18n.getMessage("options_add_entry"),

    customizationTitle: chrome.i18n.getMessage("options_customization"),
    hideBlockButtonsLabel: chrome.i18n.getMessage("options_hide_block_buttons"),
    autoExpandLabel: chrome.i18n.getMessage("tweak_auto_expand"),
    autoImagesLabel: chrome.i18n.getMessage("tweak_auto_images"),

    userInput: chrome.i18n.getMessage("placeholder_user"),
    topicInput: chrome.i18n.getMessage("placeholder_topic"),
    entryInput: chrome.i18n.getMessage("placeholder_entry"),

    subTitle: chrome.i18n.getMessage("options_subscriptions"),
    subUrlInput: chrome.i18n.getMessage("placeholder_remote_url"),
    addSubBtnText: chrome.i18n.getMessage("options_sub_add"),
    intervalLabel: chrome.i18n.getMessage("options_sub_interval"),
    updateAllBtnText: chrome.i18n.getMessage("options_sub_update_all"),

    optUsers: chrome.i18n.getMessage("popup_users"),
    optTopics: chrome.i18n.getMessage("popup_topics"),
    optEntries: chrome.i18n.getMessage("popup_entries"),

    opt10s: chrome.i18n.getMessage("options_sub_10s"),
    opt6h: chrome.i18n.getMessage("options_sub_6h"),
    opt12h: chrome.i18n.getMessage("options_sub_12h"),
    opt1d: chrome.i18n.getMessage("options_sub_1d"),
    opt2d: chrome.i18n.getMessage("options_sub_2d"),
    opt1w: chrome.i18n.getMessage("options_sub_1w"),
    opt1m: chrome.i18n.getMessage("options_sub_1m"),
  };

  for (const [id, text] of Object.entries(translations)) {
    const el = document.getElementById(id);
    if (el && text) {
      if (el.tagName === "INPUT" || el.tagName === "SELECT") {
        if (el.tagName === "SELECT") {
          Array.from(el.options).forEach((opt) => {
            const optId = opt.id || opt.getAttribute("data-i18n-key");
            if (optId && translations[optId]) {
              opt.textContent = translations[optId];
            }
          });
        } else {
          el.placeholder = text;
        }
      } else {
        const bold = el.querySelector("b");
        if (bold) bold.textContent = text;
        else el.textContent = text;
      }
    }
  }

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = i18n(key);
    if (text !== key) el.textContent = text;
  });

  document
    .getElementById("showUsersBtn")
    .addEventListener("click", () => toggleUsersSection(true));
  document
    .getElementById("showTopicsBtn")
    .addEventListener("click", () => toggleTopicsSection(true));
  document
    .getElementById("showEntriesBtn")
    .addEventListener("click", () => toggleEntriesSection(true));

  document
    .getElementById("addUserBtn")
    .addEventListener("click", () => addItem("blockedUsers", "userInput"));
  document
    .getElementById("addTopicBtn")
    .addEventListener("click", () => addItem("blockedTopics", "topicInput"));
  document
    .getElementById("addEntryBtn")
    .addEventListener("click", () => addItem("blockedEntries", "entryInput"));

  document
    .getElementById("exportUsersBtn")
    .addEventListener("click", () => exportList("blockedUsers"));
  document
    .getElementById("importUsersBtn")
    .addEventListener("click", () => importList("blockedUsers"));
  document
    .getElementById("clearUsersBtn")
    .addEventListener("click", () => clearList("blockedUsers"));
  document
    .getElementById("refreshUsersBtn")
    .addEventListener("click", () => loadBlockedUsers());

  document
    .getElementById("exportTopicsBtn")
    .addEventListener("click", () => exportList("blockedTopics"));
  document
    .getElementById("importTopicsBtn")
    .addEventListener("click", () => importList("blockedTopics"));
  document
    .getElementById("clearTopicsBtn")
    .addEventListener("click", () => clearList("blockedTopics"));
  document
    .getElementById("refreshTopicsBtn")
    .addEventListener("click", () => loadBlockedTopics());

  document
    .getElementById("exportEntriesBtn")
    .addEventListener("click", () => exportList("blockedEntries"));
  document
    .getElementById("importEntriesBtn")
    .addEventListener("click", () => importList("blockedEntries"));
  document
    .getElementById("clearEntriesBtn")
    .addEventListener("click", () => clearList("blockedEntries"));
  document
    .getElementById("refreshEntriesBtn")
    .addEventListener("click", () => loadBlockedEntries());

  const subUrlInput = document.getElementById("subUrlInput");
  const subTypeSelect = document.getElementById("subTypeSelect");
  const syncIntervalSelect = document.getElementById("syncIntervalSelect");

  document.getElementById("addSubBtn").addEventListener("click", async () => {
    const url = subUrlInput.value.trim();
    const type = subTypeSelect.value;
    if (!url) return;

    try {
      const urlObj = new URL(url);
      const hasPermission = await chrome.permissions.contains({
        origins: [`${urlObj.origin}/*`],
      });

      if (!hasPermission) {
        const granted = await chrome.permissions.request({
          origins: [`${urlObj.origin}/*`],
        });

        if (!granted) {
          alert(i18n("alert_permission_denied"));
          return;
        }
      }
    } catch (err) {
      console.error("Permission error:", err);
      alert(i18n("alert_invalid_url"));
      return;
    }

    const { remoteSubscriptions } = await chrome.storage.local.get(
      "remoteSubscriptions",
    );
    const subs = remoteSubscriptions || [];

    if (subs.some((s) => s.url === url)) {
      alert(chrome.i18n.getMessage("alert_duplicate_url"));
      return;
    }

    subs.push({ url, type, lastSync: 0, count: 0, data: [] });
    await chrome.storage.local.set({ remoteSubscriptions: subs });
    subUrlInput.value = "";

    renderSubscriptions();

    chrome.runtime.sendMessage({ action: "syncUrl", url }, () =>
      renderSubscriptions(),
    );
  });

  syncIntervalSelect.addEventListener("change", async () => {
    const interval = parseFloat(syncIntervalSelect.value);
    await chrome.storage.local.set({ syncIntervalMinutes: interval });

    chrome.runtime.sendMessage(
      {
        action: "setSyncInterval",
        intervalMinutes: interval,
      },
      (res) => {
        if (res?.success) {
        }
      },
    );
  });

  const updateAllBtn = document.getElementById("updateAllBtn");
  const updateAllBtnText = document.getElementById("updateAllBtnText");

  updateAllBtn.addEventListener("click", async () => {
    const originalText = updateAllBtnText.textContent;

    updateAllBtnText.textContent = i18n("options_sub_updating");
    updateAllBtn.disabled = true;
    updateAllBtn.style.opacity = "0.6";

    try {
      const { remoteSubscriptions } = await chrome.storage.local.get(
        "remoteSubscriptions",
      );
      const subs = remoteSubscriptions || [];

      if (subs.length > 0) {
        const uniqueOrigins = [
          ...new Set(
            subs
              .map((s) => {
                try {
                  return new URL(s.url).origin + "/*";
                } catch {
                  return null;
                }
              })
              .filter(Boolean),
          ),
        ];

        const granted = await chrome.permissions.request({
          origins: uniqueOrigins,
        });
        if (!granted) throw new Error("Permission denied");
      }

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "syncAll" }, (res) => {
          if (chrome.runtime.lastError)
            reject(new Error(chrome.runtime.lastError.message));
          else resolve(res);
        });
      });

      if (response?.success) {
        updateAllBtnText.textContent = i18n("options_sub_updated");
        updateAllBtn.style.background = "#4CAF50";
        renderSubscriptions();

        setTimeout(() => {
          updateAllBtnText.textContent = originalText;
          updateAllBtn.style.background = "#ffc503";
          updateAllBtn.disabled = false;
          updateAllBtn.style.opacity = "1";
        }, 2000);
      } else {
        throw new Error("Sync failed");
      }
    } catch (err) {
      console.error("Batch sync error:", err);
      updateAllBtnText.textContent = i18n("options_sub_update_error");
      updateAllBtn.style.background = "#d9534f";

      setTimeout(() => {
        updateAllBtnText.textContent = originalText;
        updateAllBtn.style.background = "#ffc503";
        updateAllBtn.disabled = false;
        updateAllBtn.style.opacity = "1";
      }, 2000);
    }
  });

  renderSubscriptions();
}

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();

  function setupToggle(toggleId, storageKey, defaultValue = false) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      chrome.storage.local.get([storageKey], (data) => {
        toggle.checked = data[storageKey] ?? defaultValue;
      });

      toggle.addEventListener("change", async () => {
        await chrome.storage.local.set({ [storageKey]: toggle.checked });
      });
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.remoteSubscriptions) {
        renderSubscriptions();
      }
    });
  }

  setupToggle("hideBlockButtonsToggle", "hideBlockButtons", false);
  setupToggle("autoExpandToggle", "autoExpand", false);
  setupToggle("autoImagesToggle", "autoImages", false);
});
