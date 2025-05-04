// overlay.js
(() => {
    console.log("[SoundSync][overlay] loaded");
  
    let overrideActive = false;
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = false;
  
    // 1) Create the round “S” button
    const btn = document.createElement("div");
    btn.id = "soundsync-override-btn";
    btn.textContent = "𝓢";  // or try others from below
    btn.style.fontFamily = "Georgia";
  
    Object.assign(btn.style, {
      position: "fixed",
      top: "100px",
      left: "100px",
      width: "48px",
      height: "48px",
      background: "#1e1e1e",
      color: "#0ff",
      fontSize: "24px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      border: "2px solid transparent",
      cursor: "grab",
      zIndex: 2147483647,
      transition: "box-shadow 0.3s, transform 0.2s",
      userSelect: "none",
      boxShadow: "0 0 12px 4px #0ff"
    });
  
    document.body.appendChild(btn);
  
    // 2) Restore saved position
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
    // chrome.runtime.sendMessage({ action: "getOverrideState" });
  
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
      if (!isDragging) return true;
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
      if (moved) { moved = false; return true; }
      overrideActive = !overrideActive;
      if (overrideActive) {
        btn.style.boxShadow = "none";
        chrome.runtime.sendMessage({ action: "override" },()=>{});
      } else {
        btn.style.boxShadow = "0 0 12px 4px #0ff";
        chrome.runtime.sendMessage({ action: "enable" },()=>{});
      }
      btn.style.transform = "scale(1.2)";
      setTimeout(() => btn.style.transform = "scale(1)", 200);
    });
  })();
  