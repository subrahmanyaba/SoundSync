document.getElementById('override').addEventListener('click', async () => {
    // Disable controller (stored in local storage)
    await chrome.storage.local.set({ volumeControlEnabled: false });
  
    // Get all tabs
    const tabs = await chrome.tabs.query({ audible: true });
  
    // Restore original volume to each
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const media = document.querySelectorAll('audio, video');
          media.forEach(el => el.volume = 1); // Or keep a backup volume value
        }
      }).catch(err => console.error('Error restoring volume:', err));
    }
  });
  