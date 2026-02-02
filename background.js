// background.js
const originalVolumes = {};  // Stores the user's intended volume for each tab
const volumeMultipliers = {}; // Tracks current multiplier applied (1.0 = full, 0.25 = dimmed)
let controllerEnabled = true;

console.log("[SoundSync] background started");

// Fetch current volume, accounting for any multiplier we've applied
async function fetchVolume(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const m = document.querySelector("video, audio");
      return m ? m.volume : null;
    }
  });
  const currentVol = (res && res.result != null) ? res.result : 1.0;
  
  // If we've applied a multiplier, reverse it to get the original
  const multiplier = volumeMultipliers[tabId] ?? 1.0;
  if (multiplier > 0) {
    return currentVol / multiplier;
  }
  return currentVol;
}

// Store original if needed
async function ensureOriginal(tabId) {
  if (originalVolumes[tabId] === undefined) {
    // When first capturing, assume no multiplier applied yet
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const m = document.querySelector("video, audio");
        return m ? m.volume : null;
      }
    }).catch(() => [{ result: null }]);
    
    const currentVol = (res && res.result != null) ? res.result : 1.0;
    // Reverse any existing multiplier to get true original
    const multiplier = volumeMultipliers[tabId] ?? 1.0;
    originalVolumes[tabId] = multiplier > 0 ? currentVol / multiplier : currentVol;
    volumeMultipliers[tabId] = 1.0; // Initialize multiplier
    console.log(`[SoundSync] stored originalVolumes[${tabId}] =`, originalVolumes[tabId]);
  }
}

// Inject volume with multiplier tracking
function injectSetVolume(tabId, volume, multiplier) {
  volumeMultipliers[tabId] = multiplier;
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

// Dim other tabs - active tab gets full volume, others get 25% of active tab's volume
async function dimOthers(activeTabId) {
  if (!controllerEnabled) return true;
  
  let activeTab;
  try {
    activeTab = await chrome.tabs.get(activeTabId);
  } catch (e) {
    // Tab might have been closed
    return true;
  }
  
  if (!activeTab.audible) return true;

  await ensureOriginal(activeTabId);
  const activeOriginalVol = originalVolumes[activeTabId] ?? 1.0;

  const tabs = await chrome.tabs.query({ audible: true });
  for (const t of tabs) {
    await ensureOriginal(t.id);
    
    if (t.id === activeTabId) {
      // Active tab: restore to original volume (multiplier = 1.0)
      injectSetVolume(t.id, activeOriginalVol, 1.0);
    } else {
      // Other tabs: dim to 25% of active tab's volume
      const dimmedVol = activeOriginalVol * 0.25;
      const tabOriginalVol = originalVolumes[t.id] ?? 1.0;
      // Calculate effective multiplier relative to this tab's original
      const effectiveMultiplier = tabOriginalVol > 0 ? dimmedVol / tabOriginalVol : 0.25;
      injectSetVolume(t.id, dimmedVol, effectiveMultiplier);
    }
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
      },()=>{});
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
// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete originalVolumes[tabId];
  delete volumeMultipliers[tabId];
});

// Messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getOverrideState") {
    sendResponse({ controllerEnabled });
    return true;
  }
  if (msg.action === "userVolume" && sender.tab?.id != null) {
    // User changed volume manually - update original and account for current multiplier
    const multiplier = volumeMultipliers[sender.tab.id] ?? 1.0;
    // The reported volume is after our multiplier, so reverse it to get intended original
    originalVolumes[sender.tab.id] = multiplier > 0 ? msg.volume / multiplier : msg.volume;
    console.log(`[SoundSync] userVolume: tab ${sender.tab.id} → original:`, originalVolumes[sender.tab.id]);
    return true;
  }
  if (msg.action === "override") {
    controllerEnabled = false;
    console.log("[SoundSync] override → restoring originals");
    for (const [tid, vol] of Object.entries(originalVolumes)) {
      injectSetVolume(Number(tid), vol, 1.0); // Restore all to full volume
    }
    broadcastState();
    return true;
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
    return true
  }
  
  // Broadcast overlay visibility changes to all other tabs
  if (msg.action === "overlayVisibilityChanged") {
    chrome.tabs.query({}, tabs => {
      for (const t of tabs) {
        if (t.id !== sender.tab?.id) {
          chrome.tabs.sendMessage(t.id, msg, () => {});
        }
      }
    });
    return true;
  }
});
