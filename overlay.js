// overlay.js
(() => {
    console.log("[SoundSync][overlay] loaded");
  
    let overrideActive = false;
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = false;
  
    // 1) Create button
    const btn = document.createElement("div");
    btn.id = "soundsync-override-btn";
  
    // Correctly resolve path to your extension icon
    const iconUrl = chrome.runtime.getURL("icons/icons.png");
  
    Object.assign(btn.style, {
      position: "absolute",
      top: "100px",
      left: "100px",
      width: "48px",
      height: "48px",
      backgroundImage: `url("${iconUrl}")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "contain",
      borderRadius: "50%",
      border: "2px solid transparent",
      cursor: "grab",
      zIndex: 999999,
      transition: "box-shadow 0.3s ease, transform 0.2s ease",
      userSelect: "none",
      boxShadow: "0 0 12px 4px #0ff"  // glow when enabled
    });
  
    document.body.appendChild(btn);
  
    // 2) Load saved position
    chrome.storage.local.get("overlayPos", data => {
      if (data.overlayPos) {
        btn.style.left = data.overlayPos.left;
        btn.style.top  = data.overlayPos.top;
      }
    });
  
    // 3) Request initial state
    chrome.runtime.sendMessage({ action: "getOverrideState" }, resp => {
      overrideActive = !resp.controllerEnabled;
      btn.style.boxShadow = overrideActive
        ? "none"
        : "0 0 12px 4px #0ff";
    });
  
    // 4) Listen for state changes
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.action === "overrideToggled") {
        overrideActive = msg.overrideActive;
        btn.style.boxShadow = overrideActive
          ? "none"
          : "0 0 12px 4px #0ff";
      }
    });
  
    // 5) Drag logic
    btn.addEventListener("mousedown", e => {
      isDragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      startLeft = parseInt(btn.style.left); startTop = parseInt(btn.style.top);
      btn.style.cursor = "grabbing";
      e.preventDefault();
    });
  
    document.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      btn.style.left = `${startLeft + dx}px`;
      btn.style.top  = `${startTop  + dy}px`;
    });
  
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        btn.style.cursor = "grab";
        chrome.storage.local.set({
          overlayPos: { left: btn.style.left, top: btn.style.top }
        });
      }
    });
  
    // 6) Click toggles override (only if not dragging)
    btn.addEventListener("click", () => {
      if (moved) { moved = false; return; }
      overrideActive = !overrideActive;
      if (overrideActive) {
        btn.style.boxShadow = "none";
        chrome.runtime.sendMessage({ action: "override" });
      } else {
        btn.style.boxShadow = "0 0 12px 4px #0ff";
        chrome.runtime.sendMessage({ action: "enable" });
      }
      btn.style.transform = "scale(1.2)";
      setTimeout(() => btn.style.transform = "scale(1)", 200);
    });
  })();
  