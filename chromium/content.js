// ==UserScript==
// @name         uSozluk - block & tweaks for ekşi sözlük
// @namespace    https://github.com/berkaygediz/uSozluk
// @version      2.0.0.0
// @description  block users, topics & entries on ekşi sözlük. features auto-expand, image previews and interface customization.
// @author       berkaygediz
// @match        *://eksisozluk.com/*
// @match        *://*.eksisozluk.com/*
// @match        *://eksisozluk.net/*
// @match        *://eksisozluk.org/*
// @match        *://eksisozluk2023.com/*
// @match        *://eksisozluk2024.com/*
// @match        *://eksisozluk2025.com/*
// @match        *://eksisozluk1923.com/*
// @match        *://eksi.is/*
// @match        *://eksi.so/*
// @match        *://soz.lk/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      *
// @license      Apache-2.0
// @homepageURL  https://github.com/berkaygediz/uSozluk
// @supportURL  https://github.com/berkaygediz/uSozluk/issues
// ==/UserScript==

(function () {
  "use strict";

  function i18n(key, substitutions) {
    if (typeof chrome !== "undefined" && chrome.i18n) {
      return chrome.i18n.getMessage(key, substitutions) || key;
    }
    return key;
  }

  function normalizeData(str) {
    return str?.toLowerCase().trim() || "";
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; background-color: #333; color: #fff;
      padding: 12px 24px; border-radius: 4px; z-index: 2147483647; font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = "1"));
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  }

  async function getBlockedUsers() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedUsers", "remoteSubscriptions"],
        (result) => {
          try {
            const local = result.blockedUsers || [];
            const subs = (result.remoteSubscriptions || []).filter(
              (s) => s.type === "users" && Array.isArray(s.data),
            );
            const remote = subs.flatMap((s) => s.data);
            resolve(new Set([...local, ...remote]));
          } catch (e) {
            console.error("uSozluk:", e);
            resolve(new Set(result.blockedUsers || []));
          }
        },
      );
    });
  }

  async function getBlockedEntries() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedEntries", "remoteSubscriptions"],
        (result) => {
          try {
            const local = result.blockedEntries || [];
            const subs = (result.remoteSubscriptions || []).filter(
              (s) => s.type === "entries" && Array.isArray(s.data),
            );
            const remote = subs.flatMap((s) => s.data);
            resolve(new Set([...local, ...remote]));
          } catch (e) {
            console.error("uSozluk:", e);
            resolve(new Set(result.blockedEntries || []));
          }
        },
      );
    });
  }

  async function getBlockedTopics() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["blockedTopics", "remoteSubscriptions"],
        (result) => {
          try {
            const local = result.blockedTopics || [];
            const subs = (result.remoteSubscriptions || []).filter(
              (s) => s.type === "topics" && Array.isArray(s.data),
            );
            const remote = subs.flatMap((s) => s.data);
            resolve(new Set([...local, ...remote]));
          } catch (e) {
            console.error("uSozluk:", e);
            resolve(new Set(result.blockedTopics || []));
          }
        },
      );
    });
  }

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        {
          enabled: true,
          hideBlockButtons: false,
          autoExpand: false,
          autoImages: false,
        },
        (result) => resolve(result),
      );
    });
  }

  async function blockUser(username) {
    try {
      const { blockedUsers = [] } =
        await chrome.storage.local.get("blockedUsers");
      if (!blockedUsers.includes(username)) {
        blockedUsers.push(username);
        await chrome.storage.local.set({ blockedUsers });
      }
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  async function unblockUser(username) {
    try {
      const { blockedUsers = [] } =
        await chrome.storage.local.get("blockedUsers");
      const filtered = blockedUsers.filter((u) => u !== username);
      await chrome.storage.local.set({ blockedUsers: filtered });
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  async function blockEntry(id) {
    try {
      const { blockedEntries = [] } =
        await chrome.storage.local.get("blockedEntries");
      if (!blockedEntries.includes(id)) {
        blockedEntries.push(id);
        await chrome.storage.local.set({ blockedEntries });
      }
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  async function blockTopic(title) {
    try {
      const { blockedTopics = [] } =
        await chrome.storage.local.get("blockedTopics");
      if (!blockedTopics.includes(title)) {
        blockedTopics.push(title);
        await chrome.storage.local.set({ blockedTopics });
      }
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  const tldList = [
    "com",
    "net",
    "org",
    "info",
    "biz",
    "io",
    "ai",
    "co",
    "tv",
    "me",
    "us",
    "xyz",
    "online",
    "site",
    "app",
    "dev",
    "cloud",
    "tech",
    "store",
    "shop",
    "blog",
    "gg",
    "ggpht",
    "uk",
    "de",
    "fr",
    "tr",
    "ru",
    "jp",
    "cn",
    "in",
    "br",
    "ca",
    "au",
    "es",
    "it",
    "nl",
    "pl",
    "kr",
    "se",
    "ch",
    "mx",
    "za",
    "be",
    "at",
    "dk",
    "no",
    "fi",
    "hu",
    "gr",
    "cz",
    "ro",
    "pt",
    "ie",
    "ar",
    "cl",
    "co",
    "ua",
    "id",
    "my",
    "sg",
    "ph",
    "vn",
    "th",
    "hk",
    "tw",
    "il",
    "sa",
    "ae",
    "eg",
    "ng",
    "ke",
    "co.uk",
    "org.uk",
    "me.uk",
    "ac.uk",
    "gov.uk",
    "sch.uk",
    "com.tr",
    "net.tr",
    "org.tr",
    "gov.tr",
    "edu.tr",
    "web.tr",
    "gen.tr",
    "info.tr",
    "av.tr",
    "dr.tr",
    "bel.tr",
    "pol.tr",
    "mil.tr",
    "bbs.tr",
    "k12.tr",
    "name.tr",
    "com.au",
    "net.au",
    "org.au",
    "edu.au",
    "gov.au",
    "asn.au",
    "id.au",
    "co.jp",
    "ac.jp",
    "go.jp",
    "or.jp",
    "ne.jp",
    "gr.jp",
    "ed.jp",
    "lg.jp",
    "co.in",
    "net.in",
    "org.in",
    "gen.in",
    "ind.in",
    "ac.in",
    "edu.in",
    "res.in",
    "gov.in",
    "com.cn",
    "net.cn",
    "org.cn",
    "edu.cn",
    "gov.cn",
    "mil.cn",
    "ac.cn",
    "co.kr",
    "or.kr",
    "go.kr",
    "ne.kr",
    "re.kr",
    "pe.kr",
    "com.br",
    "net.br",
    "org.br",
    "gov.br",
    "mil.br",
    "edu.br",
    "art.br",
    "blog.br",
    "co.nz",
    "net.nz",
    "org.nz",
    "ac.nz",
    "govt.nz",
    "school.nz",
    "geek.nz",
    "kiwi.nz",
    "com.pl",
    "net.pl",
    "org.pl",
    "gov.pl",
    "edu.pl",
    "co.za",
    "org.za",
    "gov.za",
    "ac.za",
    "edu.za",
    "com.hk",
    "ixorg.hk",
    "edu.hk",
    "gov.hk",
    "idv.hk",
    "co.il",
    "org.il",
    "net.il",
    "ac.il",
    "gov.il",
    "k12.il",
    "muni.il",
    "com.sg",
    "org.sg",
    "edu.sg",
    "gov.sg",
    "net.sg",
    "per.sg",
    "com.my",
    "org.my",
    "gov.my",
    "edu.my",
    "net.my",
    "com.mx",
    "org.mx",
    "net.mx",
    "edu.mx",
    "gob.mx",
    "com.ua",
    "net.ua",
    "org.ua",
    "gov.ua",
    "edu.ua",
    "co.th",
    "or.th",
    "go.th",
    "ac.th",
    "net.th",
    "in.th",
    "com.tw",
    "org.tw",
    "net.tw",
    "edu.tw",
    "gov.tw",
    "mil.tw",
    "co.id",
    "or.id",
    "go.id",
    "ac.id",
    "sch.id",
    "web.id",
    "com.ph",
    "net.ph",
    "org.ph",
    "gov.ph",
    "edu.ph",
    "co.vn",
    "com.vn",
    "net.vn",
    "org.vn",
    "edu.vn",
    "gov.vn",
    "int.vn",
    "ac.vn",
    "biz.vn",
    "info.vn",
    "name.vn",
    "pro.vn",
    "health.vn",
  ];
  const tldSet = new Set(tldList);

  function getMainDomain(url) {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      if (parts.length >= 3 && tldSet.has(parts.slice(-2).join("."))) {
        return parts.slice(-3).join(".");
      }
      return parts.slice(-2).join(".");
    } catch (e) {
      return "link";
    }
  }

  function getCloseIconSVG() {
    return `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>`;
  }

  function getUnblockIconSVG() {
    return `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>`;
  }

  const styles = `
    .block-x-btn {
        cursor: pointer;
        color: #999;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width:16px;
        height:16px;
        margin-left: 12px;
        vertical-align: middle;
        transition: color 0.2s;
        user-select: none;
        flex-shrink: 0;
    }
    .block-x-btn:hover { color: #d32f2f; }

    .block-x-btn svg {
        width: 100%;
        height: 100%;
        fill: currentColor;
        display: block;
    }

    .profile-block-status {
        display: inline-flex;
        align-items: center;
        margin-left: 10px;
        color: #fff;
        font-weight: bold;
        font-size: 11px;
        background: #e53935;
        padding: 3px 8px;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(229, 57, 53, 0.3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .unblock-profile-btn {
        margin-left: 8px;
        cursor: pointer;
        color: #ffccbc;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        background: rgba(0,0,0,0.2);
        border-radius: 50%;
        padding: 2px;
        transition: background 0.2s;
    }
    .unblock-profile-btn:hover { background: rgba(0,0,0,0.4); color: #fff; }
    .unblock-profile-btn svg { width: 100%; height: 100%; fill: currentColor; display: block; }

    .profile-block-btn {
        display: inline-flex;
        align-items: center;
        margin-left: 10px;
        color: #fff;
        font-weight: bold;
        font-size: 11px;
        background: #333;
        padding: 3px 8px;
        border-radius: 12px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: background 0.2s;
    }
    .profile-block-btn:hover { background: #e53935; }

    .topic-list > li {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100% !important;
    }

    .topic-list li.blocked-item,
    #entry-item-list li.blocked-item {
        display: none !important;
    }

    .topic-list > li > a {
        flex-grow: 1;
        margin-right: 10px;
        white-space: normal;
    }

    .topic-list > li .topic-block-btn { margin-left: 0; font-size: 16px; width: 20px; height: 20px; }
    
    .feedback .block-x-btn { margin-left: 10px; }
    #entry-nick-container .block-x-btn { margin-left: 5px; }

    .entry-gallery-top {
        margin-bottom: 15px;
        padding: 10px;
        background: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .entry-images-container {
        display: flex;
        overflow-x: auto;
        gap: 8px;
        width: 100%;
        padding-bottom: 5px;
    }
    .entry-images-container::-webkit-scrollbar { height: 6px; background: #e0e0e0; border-radius: 4px; }
    .entry-images-container:hover::-webkit-scrollbar { background: #d0d0d0; }

    .gallery-thumb {
        flex-shrink: 0;
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 4px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color 0.2s;
        background: #eee;
    }
    .gallery-thumb:hover { border-color: #81c784; }

    .entry-link-strip {
        display: flex;
        overflow-x: auto;
        gap: 8px;
        width: 100%;
        padding-bottom: 5px;
    }
    .entry-link-strip::-webkit-scrollbar { height: 8px; background: #e0e0e0; border-radius: 4px; }
    .entry-link-strip:hover::-webkit-scrollbar { background: #d0d0d0; }

    .link-chip {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        background: #e0e0e0;
        color: #333;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        white-space: nowrap;
        text-decoration: none !important;
        font-weight: 500;
        border: 1px solid #d6d6d6;
        transition: background 0.2s, border-color 0.2s;
    }
    .link-chip:hover {
        background: #e0e7ff;
        color: #4338ca;
        border-color: #c7d2fe;
    }

    #eksi-lightbox {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0; top: 0;
        width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.9);
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: default;
    }

    #lightbox-content {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    #lightbox-img {
        max-width: 95%;
        max-height: 90%;
        object-fit: contain;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        background: #000;
    }

    .lightbox-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255,255,255,0.2);
        color: white;
        border: none;
        font-size: 40px;
        padding: 20px 30px;
        cursor: pointer;
        user-select: none;
        transition: background 0.3s;
    }
    .lightbox-nav:hover { background: rgba(255,255,255,0.4); }
    .lightbox-prev { left: 10px; }
    .lightbox-next { right: 10px; }

    .lightbox-close {
        position: absolute;
        top: 20px;
        right: 30px;
        color: #f1f1f1;
        font-size: 40px;
        font-weight: bold;
        cursor: pointer;
    }

    .lightbox-counter {
        position: absolute;
        bottom: 20px;
        color: #ccc;
        font-size: 16px;
    }
  `;

  let currentImages = [];
  let currentIndex = 0;
  let lightboxEl = null;

  function initLightbox() {
    if (document.getElementById("eksi-lightbox")) return;

    lightboxEl = document.createElement("div");
    lightboxEl.id = "eksi-lightbox";
    lightboxEl.innerHTML = `
        <div class="lightbox-close">&times;</div>
        <div id="lightbox-content">
            <button class="lightbox-nav lightbox-prev">&#10094;</button>
            <img id="lightbox-img" src="">
            <button class="lightbox-nav lightbox-next">&#10095;</button>
        </div>
        <div class="lightbox-counter"></div>
    `;
    document.body.appendChild(lightboxEl);

    lightboxEl.querySelector(".lightbox-close").onclick = closeLightbox;
    lightboxEl.querySelector(".lightbox-prev").onclick = (e) => {
      e.stopPropagation();
      navigateLightbox(-1);
    };
    lightboxEl.querySelector(".lightbox-next").onclick = (e) => {
      e.stopPropagation();
      navigateLightbox(1);
    };
    lightboxEl.onclick = (e) => {
      if (e.target === lightboxEl || e.target.id === "lightbox-content")
        closeLightbox();
    };

    document.addEventListener("keydown", (e) => {
      if (lightboxEl.style.display === "flex") {
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft")
          lightboxEl.querySelector(".lightbox-prev").click();
        if (e.key === "ArrowRight")
          lightboxEl.querySelector(".lightbox-next").click();
      }
    });
  }

  function openLightbox(images, startIndex = 0) {
    currentImages = images;
    currentIndex = startIndex;
    updateLightboxImage();
    lightboxEl.style.display = "flex";
  }

  function closeLightbox() {
    lightboxEl.style.display = "none";
    currentImages = [];
  }

  function navigateLightbox(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = currentImages.length - 1;
    if (currentIndex >= currentImages.length) currentIndex = 0;
    updateLightboxImage();
  }

  function updateLightboxImage() {
    if (currentImages.length === 0) return;
    const img = document.getElementById("lightbox-img");
    const counter = document.querySelector(".lightbox-counter");
    img.style.opacity = "0.5";
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = currentImages[currentIndex];
      img.style.opacity = "1";
    };
    tempImg.src = currentImages[currentIndex];
    counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  function handleImageLink(originalLink, callback) {
    const href = originalLink.href;
    if (href.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      callback(href);
    } else if (href.includes("soz.lk")) {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage(
          { action: "fetchUrl", url: href },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("uSozluk:", chrome.runtime.lastError);
              callback(null);
              return;
            }
            callback(response?.imageUrl || null);
          },
        );
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  }

  function processEntryImages(entry) {
    if (entry.classList.contains("gallery-processed")) return;
    entry.classList.add("gallery-processed");

    const contentDiv = entry.querySelector(".content");
    if (!contentDiv) return;

    const links = Array.from(contentDiv.querySelectorAll("a.url"));
    const imageLinks = [];
    const externalLinks = [];

    links.forEach((link) => {
      if (
        link.href.match(/\.(jpeg|jpg|gif|png|webp)$/i) ||
        link.href.includes("soz.lk")
      ) {
        imageLinks.push(link);
      } else {
        if (!link.dataset.galleryProcessed) {
          externalLinks.push(link);
        }
      }
    });

    if (imageLinks.length > 0 || externalLinks.length > 0) {
      const galleryContainer = document.createElement("div");
      galleryContainer.className = "entry-gallery-top";
      contentDiv.prepend(galleryContainer);

      const entryImages = [];

      const imageContainer = document.createElement("div");
      imageContainer.className = "entry-images-container";

      imageLinks.forEach((link) => {
        if (link.dataset.galleryProcessed === "true") return;
        link.dataset.galleryProcessed = "true";

        handleImageLink(link, (realImgUrl) => {
          if (!document.body.contains(link)) return;
          if (realImgUrl) {
            entryImages.push(realImgUrl);
            const img = document.createElement("img");
            img.src = realImgUrl;
            img.className = "gallery-thumb";
            img.onclick = () =>
              openLightbox(entryImages, entryImages.indexOf(realImgUrl));
            imageContainer.appendChild(img);
          }
        });
      });

      if (imageLinks.length > 0) galleryContainer.appendChild(imageContainer);

      if (externalLinks.length > 0) {
        const linkStrip = document.createElement("div");
        linkStrip.className = "entry-link-strip";

        externalLinks.forEach((link) => {
          link.target = "_blank";
          const chip = document.createElement("a");
          chip.href = link.href;
          chip.target = "_blank";
          chip.className = "link-chip";
          chip.innerText = getMainDomain(link.href);
          linkStrip.appendChild(chip);
          link.dataset.galleryProcessed = "true";
        });
        galleryContainer.appendChild(linkStrip);
      }
    }
  }

  async function processTopic(li) {
    try {
      if (!li) return;
      if (li.querySelector(".topic-block-btn")) return;

      const link = li.querySelector("a");
      if (!link) return;

      const smallTag = link.querySelector("small");
      let topicTitle = link.innerText.trim();
      if (smallTag) {
        topicTitle = topicTitle.replace(smallTag.innerText, "").trim();
      }

      const blockedTopics = await getBlockedTopics();

      if (blockedTopics.has(topicTitle)) {
        li.classList.add("blocked-item");
      } else {
        li.classList.remove("blocked-item");
      }

      const settings = await getSettings();
      if (settings.hideBlockButtons) return;

      const btn = document.createElement("span");
      btn.className = "topic-block-btn block-x-btn";
      btn.innerHTML = getCloseIconSVG();
      btn.title = i18n("btn_block_topic");
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        blockTopic(topicTitle);
        li.classList.add("blocked-item");
        showToast(`${i18n("alert_topic_blocked")}: ${topicTitle}`);
      };
      li.appendChild(btn);
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  async function processEntry(entry) {
    try {
      if (!entry) return;

      const entryId = entry.getAttribute("data-id");
      const author = entry.getAttribute("data-author");

      const blockedEntries = await getBlockedEntries();
      const blockedUsers = await getBlockedUsers();
      const settings = await getSettings();

      if (blockedEntries.has(entryId) || blockedUsers.has(author)) {
        entry.classList.add("blocked-item");
        return;
      } else {
        entry.classList.remove("blocked-item");
      }

      if (!settings.hideBlockButtons) {
        const feedbackDiv = entry.querySelector(".feedback");
        const otherDiv = entry.querySelector(".other");

        if (feedbackDiv && !feedbackDiv.querySelector(".entry-block-btn")) {
          const entryBtn = document.createElement("span");
          entryBtn.className = "entry-block-btn block-x-btn";
          entryBtn.innerHTML = getCloseIconSVG();
          entryBtn.title = i18n("btn_block_entry");
          entryBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            blockEntry(entryId);
            entry.classList.add("blocked-item");
            showToast(i18n("alert_entry_blocked"));
          };

          if (otherDiv && otherDiv.nextSibling) {
            feedbackDiv.insertBefore(entryBtn, otherDiv.nextSibling);
          } else {
            feedbackDiv.appendChild(entryBtn);
          }
        }

        const nickContainer = entry.querySelector("#entry-nick-container");
        if (nickContainer && !nickContainer.querySelector(".user-block-btn")) {
          const userBtn = document.createElement("span");
          userBtn.className = "user-block-btn block-x-btn";
          userBtn.innerHTML = getCloseIconSVG();
          userBtn.title = i18n("btn_block_user");
          userBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            blockUser(author);
            showToast(`${i18n("alert_user_blocked")}: ${author}`);
            document
              .querySelectorAll(`li[data-author="${author}"]`)
              .forEach((el) => el.classList.add("blocked-item"));
            processProfilePage();
          };
          nickContainer.appendChild(userBtn);
        }
      }

      if (settings.autoImages) {
        processEntryImages(entry);
      }
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  async function processProfilePage() {
    try {
      const profileTitle = document.getElementById("user-profile-title");
      if (!profileTitle) return;

      const nick = profileTitle.getAttribute("data-nick");
      const parentDiv = profileTitle.parentElement;

      const blockedUsers = await getBlockedUsers();

      const isBlocked = blockedUsers.has(nick);

      const existingStatus = document.getElementById(
        "eksi-profile-block-status",
      );
      const existingBtn = document.getElementById("eksi-profile-block-btn");

      if (isBlocked) {
        if (existingBtn) existingBtn.remove();
        if (existingStatus) return;

        const statusDiv = document.createElement("div");
        statusDiv.id = "eksi-profile-block-status";
        statusDiv.className = "profile-block-status";
        statusDiv.innerHTML = `
          ${i18n("status_blocked")}
          <div class="unblock-profile-btn" title="${i18n("btn_unblock")}">
            ${getUnblockIconSVG()}
          </div>
        `;

        statusDiv.querySelector(".unblock-profile-btn").onclick = async () => {
          await unblockUser(nick);
          showToast(`${i18n("alert_user_unblocked")}: ${nick}`);
          document
            .querySelectorAll(`li[data-author="${nick}"]`)
            .forEach((el) => el.classList.remove("blocked-item"));
          document
            .querySelectorAll("li#entry-item")
            .forEach((entry) => processEntry(entry));
          processProfilePage();
        };

        parentDiv.appendChild(statusDiv);
      } else {
        if (existingStatus) existingStatus.remove();
        if (existingBtn) return;

        const blockBtn = document.createElement("div");
        blockBtn.id = "eksi-profile-block-btn";
        blockBtn.className = "profile-block-btn";
        blockBtn.textContent = i18n("btn_block");
        blockBtn.onclick = async () => {
          await blockUser(nick);
          showToast(`${i18n("alert_user_blocked")}: ${nick}`);
          document
            .querySelectorAll(`li[data-author="${nick}"]`)
            .forEach((el) => el.classList.add("blocked-item"));
          processProfilePage();
        };
        parentDiv.appendChild(blockBtn);
      }
    } catch (e) {
      console.error("uSozluk:", e);
    }
  }

  function clickReadMoreButtonsInScope(node) {
    const buttons = node.querySelectorAll
      ? node.querySelectorAll(".read-more-link-wrapper a")
      : [];
    buttons.forEach((btn) => btn.click());

    if (node.classList && node.classList.contains("read-more-link-wrapper")) {
      const a = node.querySelector("a");
      if (a) a.click();
    }
  }

  function clickReadMoreButtons() {
    const buttons = document.querySelectorAll(".read-more-link-wrapper a");
    buttons.forEach((btn) => btn.click());
  }

  let observer = null;

  async function startProcessing() {
    const settings = await getSettings();
    if (!settings.enabled) return;

    const listItems = document.querySelectorAll(".topic-list > li");
    listItems.forEach((li) => processTopic(li));

    const entries = document.querySelectorAll("li#entry-item");
    entries.forEach((entry) => processEntry(entry));

    if (settings.autoExpand) clickReadMoreButtons();

    processProfilePage();
  }

  function startObserver() {
    if (observer) return;

    observer = new MutationObserver(async (mutations) => {
      const settings = await getSettings();
      if (!settings.enabled) return;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;

          if (node.matches && node.matches("ul.topic-list")) {
            node.querySelectorAll("li").forEach((li) => processTopic(li));
          } else if (node.matches && node.matches(".topic-list > li")) {
            processTopic(node);
          } else if (
            node.querySelector &&
            node.querySelector(".topic-list > li")
          ) {
            node
              .querySelectorAll(".topic-list > li")
              .forEach((li) => processTopic(li));
          }

          if (node.matches && node.matches("li#entry-item")) {
            processEntry(node);
          } else if (
            node.querySelector &&
            node.querySelector("li#entry-item")
          ) {
            node
              .querySelectorAll("li#entry-item")
              .forEach((entry) => processEntry(entry));
          }

          if (settings.autoExpand) {
            if (node.matches && node.matches(".read-more-link-wrapper a")) {
              node.click();
            } else if (
              node.querySelector &&
              node.querySelector(".read-more-link-wrapper a")
            ) {
              clickReadMoreButtonsInScope(node);
            }
          }
        }
      }
      processProfilePage();
    });

    const indexSection = document.getElementById("partial-index");
    if (indexSection) {
      observer.observe(indexSection, { childList: true, subtree: true });
    }

    const mainContent = document.getElementById("entry-item-list");
    if (mainContent) {
      observer.observe(mainContent, { childList: true, subtree: true });
    }

    const profileContent = document.getElementById(
      "profile-stats-section-content",
    );
    if (profileContent) {
      observer.observe(profileContent, { childList: true, subtree: true });
    }

    if (!indexSection && !mainContent && !profileContent) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  (async () => {
    try {
      const styleEl = document.createElement("style");
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);

      initLightbox();

      const settings = await getSettings();
      if (settings.enabled) {
        await startProcessing();
        startObserver();
      }

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local") {
          if ("enabled" in changes) {
            const newValue = changes.enabled.newValue;
            if (newValue) {
              startProcessing();
              startObserver();
            } else {
              stopObserver();
              document
                .querySelectorAll(".blocked-item")
                .forEach((el) => el.classList.remove("blocked-item"));
            }
          }
          if ("hideBlockButtons" in changes || "autoImages" in changes) {
            startProcessing();
          }
          if ("autoExpand" in changes && changes.autoExpand.newValue === true) {
            clickReadMoreButtons();
          }
        }
      });
    } catch (e) {
      console.error("uSozluk:", e);
    }
  })();
})();
