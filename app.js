
/* ==========================================
   AG INKAM — APP.JS
   Frontend interactions + Telegram WebApp
========================================== */

"use strict";

const AG_CONFIG = {
  appName: "AG INKAM",

  supportTelegram: "https://t.me/ag_x_amane",
  supportEmail: "mails.official99@gmail.com",

  communityTelegram: "https://t.me/agxamane",

  // Add your real HTTPS backend URL later.
  // Example: https://your-backend.onrender.com
  apiBaseUrl: "",

  // Demo points are not real money.
  demoMode: true
};

const AG = {
  telegram: null,
  user: null,
  toastTimer: null,
  tasks: [],
  apiAvailable: false
};

/* ==========================================
   SELECTORS
========================================== */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

/* ==========================================
   NOTIFICATIONS
========================================== */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) {
    console.log("[AG INKAM]", message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(AG.toastTimer);

  AG.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

/* ==========================================
   TELEGRAM MINI APP
========================================== */

function initTelegram() {
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.info("AG INKAM is running in a normal browser.");
    return;
  }

  AG.telegram = window.Telegram.WebApp;

  AG.telegram.ready();
  AG.telegram.expand();

  if (typeof AG.telegram.setHeaderColor === "function") {
    try {
      AG.telegram.setHeaderColor("#070914");
    } catch (_) {}
  }

  if (typeof AG.telegram.setBackgroundColor === "function") {
    try {
      AG.telegram.setBackgroundColor("#070914");
    } catch (_) {}
  }

  AG.user = AG.telegram.initDataUnsafe
    ? AG.telegram.initDataUnsafe.user || null
    : null;

  renderProfile();

  console.info("Telegram Mini App initialized.");
}

/* ==========================================
   PROFILE
========================================== */

function renderProfile() {
  const nameElement = $("#profileName");
  const usernameElement = $("#profileUsername");

  if (!AG.user) {
    if (nameElement) {
      nameElement.textContent = "AG INKAM User";
    }

    if (usernameElement) {
      usernameElement.textContent = "Open through Telegram";
    }

    return;
  }

  const fullName = [
    AG.user.first_name,
    AG.user.last_name
  ].filter(Boolean).join(" ");

  if (nameElement) {
    nameElement.textContent = fullName || "Telegram User";
  }

  if (usernameElement) {
    usernameElement.textContent = AG.user.username
      ? "@" + AG.user.username
      : "Telegram user";
  }
}

/* ==========================================
   NAVIGATION
========================================== */

function navigateTo(sectionId) {
  const section = document.getElementById(sectionId);

  if (!section) {
    showToast("This section is not available.");
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  updateActiveNavigation(sectionId);
}

function updateActiveNavigation(sectionId) {
  const sectionToNav = {
    home: "home",
    dashboard: "home",
    tasks: "tasks",
    bonus: "bonus",
    refer: "refer",
    profile: "profile"
  };

  const activeTarget = sectionToNav[sectionId] || sectionId;

  $all(".nav-btn").forEach(button => {
    const active =
      button.dataset.target === activeTarget;

    button.classList.toggle("active", active);
  });
}

function initNavigation() {
  $all("[data-target]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;

      if (target) {
        navigateTo(target);
      }
    });
  });

  if (AG.telegram && AG.telegram.BackButton) {
    AG.telegram.BackButton.onClick(() => {
      navigateTo("home");
      AG.telegram.BackButton.hide();
    });
  }
}

/* ==========================================
   TASKS
========================================== */

function getDemoTasks() {
  return [
    {
      id: "community",
      title: "Explore AG Community",
      description: "Visit the official Telegram community.",
      reward: 5,
      action: "community",
      status: "available"
    },
    {
      id: "youtube",
      title: "Explore AG YouTube",
      description: "Visit the creator's YouTube channel.",
      reward: 5,
      action: "youtube",
      status: "available"
    },
    {
      id: "explore",
      title: "Discover AG INKAM",
      description: "Explore the Mini App features.",
      reward: 5,
      action: "explore",
      status: "available"
    }
  ];
}

function initTasks() {
  AG.tasks = getDemoTasks();

  // These are illustrative tasks only.
  // No reward is credited by this frontend.
  renderTaskInfo();
}

function renderTaskInfo() {
  const countElement = $("#taskCount");

  if (countElement) {
    countElement.textContent = String(AG.tasks.length);
  }
}

/* ==========================================
   TASK ACTIONS
========================================== */

function handleTaskAction(action) {
  switch (action) {
    case "community":
      openExternal(AG_CONFIG.communityTelegram);
      break;

    case "youtube":
      showToast(
        "Configure the official YouTube URL before publishing."
      );
      break;

    case "explore":
      showToast(
        "You are exploring AG INKAM. Demo only."
      );
      break;

    default:
      showToast("This task is not available yet.");
  }
}

/* ==========================================
   DAILY BONUS
========================================== */

function handleDailyBonus() {
  showToast(
    "Daily bonus is not active yet. No points were added."
  );
}

/* ==========================================
   REFERRAL
========================================== */

function createReferralLink() {
  const botUsername = "YOUR_BOT_USERNAME";

  if (
    !botUsername ||
    botUsername === "YOUR_BOT_USERNAME"
  ) {
    return "";
  }

  if (!AG.user || !AG.user.id) {
    return "";
  }

  return (
    "https://t.me/" +
    botUsername +
    "?startapp=ref_" +
    encodeURIComponent(String(AG.user.id))
  );
}

async function shareReferral() {
  const referralLink = createReferralLink();

  const shareText = referralLink
    ? "Explore AG INKAM: " + referralLink
    : "Explore AG INKAM: " + window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({
        title: AG_CONFIG.appName,
        text: shareText
      });

      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }
  }

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast("Share text copied.");
      return;
    } catch (_) {}
  }

  showToast(
    "Referral rewards are not active yet."
  );
}

/* ==========================================
   EXTERNAL LINKS
========================================== */

function openExternal(url) {
  if (!url) {
    showToast("Link is not configured.");
    return;
  }

  if (
    AG.telegram &&
    typeof AG.telegram.openTelegramLink === "function" &&
    url.startsWith("https://t.me/")
  ) {
    AG.telegram.openTelegramLink(url);
    return;
  }

  if (
    AG.telegram &&
    typeof AG.telegram.openLink === "function"
  ) {
    AG.telegram.openLink(url);
    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
}

/* ==========================================
   SUPPORT
========================================== */

function initSupport() {
  const telegramLink = $(
    '[data-support="telegram"]'
  );

  const emailLink = $(
    '[data-support="email"]'
  );

  if (telegramLink) {
    telegramLink.href = AG_CONFIG.supportTelegram;
  }

  if (emailLink) {
    emailLink.href =
      "mailto:" + AG_CONFIG.supportEmail;
  }
}

/* ==========================================
   PROFILE ACTION
========================================== */

function showProfileInfo() {
  if (!AG.user) {
    showToast(
      "Open AG INKAM inside Telegram to see your profile."
    );
    return;
  }

  const username = AG.user.username
    ? "@" + AG.user.username
    : "No public username";

  showToast("Telegram profile: " + username);
}

/* ==========================================
   BUTTON EVENTS
========================================== */

function initActionButtons() {
  $all("[data-action]").forEach(button => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;

      switch (action) {
        case "community":
        case "youtube":
        case "explore":
          handleTaskAction(action);
          break;

        case "daily":
          handleDailyBonus();
          break;

        case "refer":
          await shareReferral();
          break;

        case "profile":
          showProfileInfo();
          break;

        default:
          showToast("Feature coming soon.");
      }
    });
  });
}

/* ==========================================
   BACKEND API PREPARATION
========================================== */

async function apiRequest(path, options = {}) {
  if (!AG_CONFIG.apiBaseUrl) {
    throw new Error(
      "Backend URL has not been configured."
    );
  }

  const url =
    AG_CONFIG.apiBaseUrl.replace(/\/+$/, "") +
    "/" +
    path.replace(/^\/+/, "");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(
      "Backend request failed: " + response.status
    );
  }

  return response.json();
}

async function checkBackend() {
  if (!AG_CONFIG.apiBaseUrl) {
    AG.apiAvailable = false;
    return false;
  }

  try {
    await apiRequest("/health");
    AG.apiAvailable = true;
    return true;
  } catch (error) {
    AG.apiAvailable = false;
    console.warn("Backend is unavailable:", error.message);
    return false;
  }
}

/*
  IMPORTANT:
  Never trust Telegram initDataUnsafe.user.id for
  authentication or payments.

  When the backend is ready, send the original
  Telegram WebApp.initData to the backend over HTTPS.
  The backend must validate Telegram's HMAC signature,
  check its auth_date, and enforce permissions server-side.

  Never put a bot token, database password, or private
  API key in this JavaScript file.
*/

/* ==========================================
   FOOTER
========================================== */

function initFooter() {
  const yearElement = $("#year");

  if (yearElement) {
    yearElement.textContent =
      String(new Date().getFullYear());
  }
}

/* ==========================================
   START APP
========================================== */

function initAGInkam() {
  initTelegram();
  initNavigation();
  initTasks();
  initActionButtons();
  initSupport();
  initFooter();

  console.info("AG INKAM frontend initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initAGInkam,
    { once: true }
  );
} else {
  initAGInkam();
}
