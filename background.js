let activeTabId = null;

// Helper: Smoothly set volume of all media in a tab
function setVolumeSmooth(targetVolume) {
  const mediaElements = document.querySelectorAll("audio, video");
  mediaElements.forEach((el) => {
    const step = (targetVolume - el.volume) / 10;
    let currentStep = 0;

    const fade = setInterval(() => {
      el.volume = parseFloat((el.volume + step).toFixed(3));
      currentStep++;
      if (currentStep >= 10) {
        el.volume = targetVolume;
        clearInterval(fade);
      }
    }, 50); // 10 steps over 500ms
  });
}

// Main logic to update tab volumes
async function updateTabVolumes() {
  try {
    const { volumeControlEnabled } = await chrome.storage.local.get("volumeControlEnabled");

    if (volumeControlEnabled === false) {
      console.log("Volume control is disabled (override active).");
      return;
    }

    const tabs = await chrome.tabs.query({ audible: true });

    tabs.forEach((tab) => {
      if (!tab.id || tab.mutedInfo?.muted) return;

      const targetVolume = tab.id === activeTabId ? 1.0 : 0.25;

      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: setVolumeSmooth,
          args: [targetVolume]
        }).catch((error) => {
          console.error(`Error executing script on tab ${tab.id}:`, error);
        });
      }, 500); // Delay before volume change
    });
  } catch (error) {
    console.error("Error in updateTabVolumes:", error);
  }
}

// Listener: track tab focus
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  await updateTabVolumes();
});

// Listener: track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    activeTabId = tab.id;
    await updateTabVolumes();
  }
});

// Listener: when audible tabs start/stops
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.audible !== undefined) {
    await updateTabVolumes();
  }
});

// On startup: enable volume control by default
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ volumeControlEnabled: true });
});

//Listen for override button message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "overrideVolumes") {
    chrome.tabs.query({ audible: true }).then((tabs) => {
      tabs.forEach((tab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.querySelectorAll("audio, video").forEach(el => el.volume = 1.0);
          }
        });
      });
    });
  }
});
