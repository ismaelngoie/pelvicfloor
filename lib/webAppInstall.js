// Manual setup stays available even when a browser does not offer an install
// event. These are browser actions, so nothing opens until the member asks.
export const INSTALL_GUIDES = {
  apple: {
    title: "Safari on iPhone or iPad",
    steps: [
      "Open pelvi.health/app in Safari.",
      "Tap Share. On iPhone, Share may be inside the Page Menu. On iPad, tap More in the share menu if needed.",
      "Choose Add to Home Screen. If it is missing on iPhone, look under Edit Actions.",
      "Turn on Open as Web App if shown, then tap Add.",
    ],
    source: "Apple’s setup guide",
    url: "https://support.apple.com/guide/iphone/iphea86e5236/ios",
  },
  android: {
    title: "Chrome on Android",
    steps: [
      "Open pelvi.health/app in Chrome.",
      "Open the three-dot menu beside the address bar.",
      "Choose Install and create shortcut, then Install. Older Chrome versions may say Add to Home screen.",
      "Confirm the browser’s setup instructions, then look for Pelvi on your Home Screen.",
    ],
    source: "Google’s setup guide",
    url: "https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid",
  },
  desktop: {
    title: "Chrome on your computer",
    steps: [
      "Open pelvi.health/app in Chrome.",
      "Open the three-dot menu, then Cast, save, and share.",
      "Choose Install page as app, then follow the browser’s instructions. An Install icon may also appear in the address bar.",
    ],
    source: "Google’s setup guide",
    url: "https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DDesktop",
  },
};

export function webAppInstallEnvironment({ userAgent = "", platform = "", maxTouchPoints = 0, standalone = false, displayMode = false } = {}) {
  const appleMobile = /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  const android = /Android/i.test(userAgent);
  const safari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(userAgent);
  const chrome = /Chrome\//i.test(userAgent) && !/Edg|OPR|SamsungBrowser/i.test(userAgent);
  return {
    guide: appleMobile ? "apple" : android ? "android" : "desktop",
    standalone: Boolean(standalone || displayMode),
    browserHint: appleMobile && !safari ? "For home-screen setup on this device, open Pelvi in Safari first." : android && !chrome ? "For these Android steps, open Pelvi in Chrome first." : null,
  };
}

// A deferred browser event is single-use, including after dismissal or failure.
// Capture is deliberately passive: only prompt() can open browser install UI.
export function createInstallPromptController(onChange = () => {}) {
  let deferred = null;
  let busy = false;
  let installed = false;
  const snapshot = () => ({ available: Boolean(deferred) && !busy && !installed, busy, installed });
  const publish = () => onChange(snapshot());
  return {
    snapshot,
    capture(event) {
      if (installed || typeof event?.prompt !== "function") return false;
      event.preventDefault?.();
      deferred = event;
      publish();
      return true;
    },
    markInstalled() {
      installed = true;
      deferred = null;
      publish();
    },
    async prompt() {
      if (!deferred || busy || installed) return "unavailable";
      const event = deferred;
      deferred = null;
      busy = true;
      publish();
      try {
        const result = await event.prompt();
        const choice = event.userChoice ? await event.userChoice : result;
        return choice?.outcome === "accepted" ? "accepted" : "dismissed";
      } catch {
        return "error";
      } finally {
        busy = false;
        publish();
      }
    },
  };
}

const INITIAL_INSTALL_STATE = Object.freeze({ available: false, busy: false, installed: false, environment: null, outcome: null });

// The member layout owns this store. Tab sheets only subscribe, so navigating
// away from You cannot discard an event or detach the browser listeners.
export function createWebAppInstallStore() {
  let state = INITIAL_INSTALL_STATE;
  const subscribers = new Set();
  const update = (patch) => {
    state = { ...state, ...patch };
    for (const subscriber of subscribers) subscriber();
  };
  const controller = createInstallPromptController(update);
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => INITIAL_INSTALL_STATE,
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
    connect(browser) {
      const media = browser.matchMedia?.("(display-mode: standalone)");
      const environment = webAppInstallEnvironment({
        userAgent: browser.navigator?.userAgent,
        platform: browser.navigator?.platform,
        maxTouchPoints: browser.navigator?.maxTouchPoints,
        standalone: browser.navigator?.standalone,
        displayMode: media?.matches,
      });
      update({ environment });
      if (environment.standalone) controller.markInstalled();
      const onPrompt = (event) => {
        if (controller.capture(event)) update({ outcome: null });
      };
      const onInstalled = () => controller.markInstalled();
      const onDisplayMode = (event) => { if (event.matches) controller.markInstalled(); };
      browser.addEventListener("beforeinstallprompt", onPrompt);
      browser.addEventListener("appinstalled", onInstalled);
      media?.addEventListener?.("change", onDisplayMode);
      return () => {
        browser.removeEventListener("beforeinstallprompt", onPrompt);
        browser.removeEventListener("appinstalled", onInstalled);
        media?.removeEventListener?.("change", onDisplayMode);
      };
    },
    async requestInstall() {
      const outcome = await controller.prompt();
      if (outcome !== "unavailable") update({ outcome });
      return outcome;
    },
  };
}
