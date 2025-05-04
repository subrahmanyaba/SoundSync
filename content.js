// content.js
console.log("[SoundSync][content] loaded");

// Report only *user‑initiated* volume changes
function reportVolumeChange(evt) {
  // If the page body has our “ignore” flag, skip (extension is adjusting)
  if (document.body.hasAttribute("data-ss-ignore")) {
    console.log("[SoundSync][content] skipped extension volumechange");
    return;
  }
  // Only trust genuine user actions
  if (!evt.isTrusted) return;

  const vol = evt.target.volume;
  console.log("[SoundSync][content] userVolume →", vol);
  chrome.runtime.sendMessage({ action: "userVolume", volume: vol });
}

// Attach our listener to all media elements
function hookMedia() {
  document.querySelectorAll("video, audio").forEach(m => {
    m.removeEventListener("volumechange", reportVolumeChange);
    m.addEventListener("volumechange", reportVolumeChange);
  });
}

// Initial hook + watch for dynamically injected players
hookMedia();
new MutationObserver(hookMedia).observe(document.body, {
  childList: true,
  subtree: true
});
