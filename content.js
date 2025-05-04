console.log("[SoundSync][content] loaded");

function reportVolumeChange(evt) {
  const vol = evt.target.volume;
  console.log("[SoundSync][content] volumechange →", vol);
  chrome.runtime.sendMessage({ action: "userVolume", volume: vol });
}

function hookAllMedia() {
  document.querySelectorAll("video,audio").forEach(m => {
    m.removeEventListener("volumechange", reportVolumeChange);
    m.addEventListener("volumechange", reportVolumeChange);
    // also capture play as a “fresh original” if needed
    m.removeEventListener("play", reportVolumeChange);
    m.addEventListener("play", reportVolumeChange);
  });
}

// run on load and on DOM mutations (in case players are injected later)
hookAllMedia();
new MutationObserver(hookAllMedia).observe(document.body, { childList: true, subtree: true });
