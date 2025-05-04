// background.js
const originalVolumes = {};   // tabId → original user volume
let controllerEnabled = true;

console.log("[SoundSync] background started");

// 1) Fetch the *current* volume from a tab
async function fetchVolume(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const m = document.querySelector("video, audio");
      return m ? m.volume : null;
    }
  });
  return (res && res.result != null) ? res.result : 1.0;
}

// 2) Ensure we’ve stored a tab’s original volume
async function ensureOriginal(tabId) {
  if (originalVolumes[tabId] === undefined) {
    originalVolumes[tabId] = await fetchVolume(tabId);
    console.log(`[SoundSync] stored originalVolumes[${tabId}] =`, originalVolumes[tabId]);
  }
}

// 3) Apply a volume to a tab *with* an ignore‑flag so content.js skips it
function injectSetVolume(tabId, volume) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (v) => {
      document.body.setAttribute("data-ss-ignore", "");
      document.querySelectorAll("video, audio")
              .forEach(m => m.volume = v);
      setTimeout(() => {
        document.body.removeAttribute("data-ss-ignore");
      }, 50);
    },
    args: [volume]
  }).catch(err => console.error("[SoundSync] injectSetVolume error", err));
}

// 4) Core dimming logic: active tab stays at its original, others at 25%
async function dimOthers(activeTabId) {
  if (!controllerEnabled) return;

  // Only proceed if that tab is actually playing
  const activeTab = await chrome.tabs.get(activeTabId);
  if (!activeTab.audible) {
    console.log(`[SoundSync] tab ${activeTabId} not playing → skip`);
    return;
  }

  // Ensure original volumes captured
  await ensureOriginal(activeTabId);

  const base = originalVolumes[activeTabId];
  console.log(`[SoundSync] baseVolume for ${activeTabId} =`, base);

  // Dimming all currently audible tabs
  const tabs = await chrome.tabs.query({ audible: true });
  for (const t of tabs) {
    await ensureOriginal(t.id);  // capture if first time
    const newVol = (t.id === activeTabId) ? base : base * 0.25;
    console.log(`[SoundSync] setting tab ${t.id} → volume ${newVol}`);
    injectSetVolume(t.id, newVol);
  }
}

// 5) Listeners

// On switching tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  setTimeout(() => dimOthers(tabId), 500);
});

// On any tab’s audible flag changing
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.audible && controllerEnabled) {
    setTimeout(async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active && active.audible) {
        await dimOthers(active.id);
      }
    }, 500);
  }
});

// 6) Messages from content or popup
chrome.runtime.onMessage.addListener((msg, sender) => {
  // User manually adjusted volume
  if (msg.action === "userVolume" && sender.tab?.id != null) {
    originalVolumes[sender.tab.id] = msg.volume;
    console.log(`[SoundSync] userVolume: tab ${sender.tab.id} →`, msg.volume);
    return;
  }

  // Override button clicked
  if (msg.action === "override") {
    controllerEnabled = false;
    console.log("[SoundSync] override → restoring all originals");
    for (const [tid, vol] of Object.entries(originalVolumes)) {
      injectSetVolume(Number(tid), vol);
      console.log(`[SoundSync] restored tab ${tid} → volume ${vol}`);
    }
    return;
  }

  // Re‑enable controller
  if (msg.action === "enable") {
    controllerEnabled = true;
    console.log("[SoundSync] controller re-enabled");
  }
});
