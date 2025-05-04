// background.js
const originalVolumes = {};  
let controllerEnabled = true;

console.log("[SoundSync] background started");

// Fetch current volume
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

// Store original if needed
async function ensureOriginal(tabId) {
  if (originalVolumes[tabId] === undefined) {
    originalVolumes[tabId] = await fetchVolume(tabId);
    console.log(`[SoundSync] stored originalVolumes[${tabId}] =`, originalVolumes[tabId]);
  }
}

// Inject volume, skipping content reports
function injectSetVolume(tabId, volume) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: v => {
      document.body.setAttribute("data-ss-ignore", "");
      document.querySelectorAll("video, audio").forEach(m => m.volume = v);
      setTimeout(() => document.body.removeAttribute("data-ss-ignore"), 50);
    },
    args: [volume]
  }).catch(console.error);
}

// Dim other tabs
async function dimOthers(activeTabId) {
  if (!controllerEnabled) return;
  const activeTab = await chrome.tabs.get(activeTabId);
  if (!activeTab.audible) return;

  await ensureOriginal(activeTabId);
  const base = originalVolumes[activeTabId];

  const tabs = await chrome.tabs.query({ audible: true });
  for (const t of tabs) {
    await ensureOriginal(t.id);
    const vol = (t.id === activeTabId) ? base : base * 0.25;
    injectSetVolume(t.id, vol);
  }
}

// Broadcast override state to all tabs
function broadcastState() {
  const overrideActive = !controllerEnabled;
  chrome.tabs.query({}, tabs => {
    for (const t of tabs) {
      chrome.tabs.sendMessage(t.id, {
        action: "overrideToggled",
        overrideActive
      });
    }
  });
}

// Listeners
chrome.tabs.onActivated.addListener(({ tabId }) => {
  setTimeout(() => dimOthers(tabId), 500);
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.audible && controllerEnabled) {
    setTimeout(async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active?.audible) await dimOthers(active.id);
    }, 500);
  }
});

// Messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getOverrideState") {
    sendResponse({ controllerEnabled });
    return true;
  }
  if (msg.action === "userVolume" && sender.tab?.id != null) {
    originalVolumes[sender.tab.id] = msg.volume;
    console.log(`[SoundSync] userVolume: tab ${sender.tab.id} →`, msg.volume);
    return;
  }
  if (msg.action === "override") {
    controllerEnabled = false;
    console.log("[SoundSync] override → restoring originals");
    for (const [tid, vol] of Object.entries(originalVolumes)) {
      injectSetVolume(Number(tid), vol);
    }
    broadcastState();
    return;
  }
  if (msg.action === "enable") {
    controllerEnabled = true;
    console.log("[SoundSync] controller re-enabled");
    broadcastState();
  
    // Immediately re‑apply dimming based on the current active tab
    (async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active && active.audible) {
        // give it the usual delay
        setTimeout(() => dimOthers(active.id), 500);
      }
    })();
  }
});
