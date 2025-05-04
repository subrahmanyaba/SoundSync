// background.js
const originalVolumes = {};    // tabId → original volume
let controllerEnabled = true;

console.log("[SoundSync] background started");

// Helper: grab current page volume
async function fetchVolume(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const m = document.querySelector("video, audio");
      return m ? m.volume : null;
    }
  });
  return res?.result;
}

// Store a tab’s original volume if not yet known
async function ensureOriginal(tabId) {
  if (originalVolumes[tabId] === undefined) {
    const vol = await fetchVolume(tabId);
    originalVolumes[tabId] = (vol != null ? vol : 1.0);
    console.log(`[SoundSync] stored originalVolumes[${tabId}] =`, originalVolumes[tabId]);
  }
}

// Core: dim others to 25% of focused tab’s own volume
async function updateVolumes(activeTabId) {
  if (!controllerEnabled) return;

  // only proceed if that tab is actually audible/playing
  const activeTab = await chrome.tabs.get(activeTabId);
  if (!activeTab.audible) {
    console.log(`[SoundSync] tab ${activeTabId} not audible → skip`);
    return;
  }

  await ensureOriginal(activeTabId);
  const base = originalVolumes[activeTabId];
  console.log(`[SoundSync] base volume for ${activeTabId} =`, base);

  // get every audible tab
  const tabs = await chrome.tabs.query({ audible: true });
  for (const t of tabs) {
    // ensure we have an original for each too
    await ensureOriginal(t.id);

    const v = (t.id === activeTabId) ? base : base * 0.25;
    chrome.scripting.executeScript({
      target: { tabId: t.id },
      func: vol => {
        document.querySelectorAll("video,audio")
                .forEach(m => m.volume = vol);
      },
      args: [v]
    });
    console.log(`[SoundSync] set tab ${t.id} → volume ${v}`);
  }
}

// Listen: tab switch
chrome.tabs.onActivated.addListener(({ tabId }) => {
  setTimeout(() => updateVolumes(tabId), 500);
});

// Listen: new audio starts
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.audible && controllerEnabled) {
    setTimeout(async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active && active.audible) await updateVolumes(active.id);
    }, 500);
  }
});

// Listen: override & userVolume messages
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "override") {
    controllerEnabled = false;
    console.log("[SoundSync] override → restoring all");
    for (const [tid, vol] of Object.entries(originalVolumes)) {
      const id = Number(tid);
      chrome.scripting.executeScript({
        target: { tabId: id },
        func: v => {
          document.querySelectorAll("video,audio")
                  .forEach(m => m.volume = v);
        },
        args: [vol]
      });
      console.log(`[SoundSync] restored tab ${id} → volume ${vol}`);
    }
  }

  if (msg.action === "enable") {
    controllerEnabled = true;
    console.log("[SoundSync] controller re-enabled");
  }

  if (msg.action === "userVolume" && sender.tab?.id != null) {
    originalVolumes[sender.tab.id] = msg.volume;
    console.log(`[SoundSync] userVolume: tab ${sender.tab.id} →`, msg.volume);
  }
});
