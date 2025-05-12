// overlay.js
(() => {
  console.log("[SoundSync][overlay] loaded");

  let overrideActive = false;
  let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = false, justShownFromHandle = false;

  const btn = document.createElement("div");
  btn.id = "soundsync-override-btn";
  btn.textContent = "𝓢";
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

  const handle = document.createElement("div");
  handle.id = "soundsync-handle";
  handle.textContent = "𝓢";
  handle.style.fontFamily = "Georgia";
  Object.assign(handle.style, {
    position: "fixed",
    top: "100px",
    left: "-6px",
    width: "6px",
    height: "48px",
    background: "rgba(0, 255, 255, 0.015)",
    borderTopRightRadius: "4px",
    borderBottomRightRadius: "4px",
    cursor: "pointer",
    display: "none",
    zIndex: 2147483646,
    transition: "background 0.3s, box-shadow 0.3s"
  });


  document.body.appendChild(handle);
  
  handle.addEventListener("mouseenter", () => {
    handle.style.background = "rgba(0, 255, 255, 0.3)";
    handle.style.boxShadow = "0 0 4px 1px rgba(0,255,255,0.2)";
  });
  
  handle.addEventListener("mouseleave", () => {
    handle.style.background = "rgba(0, 255, 255, 0.05)";
    handle.style.boxShadow = "none";
  });

  // Utility: Clamp to screen bounds
  const clampPosition = (left, top) => {
    const maxLeft = window.innerWidth - 48;
    const maxTop = window.innerHeight - 48;
    return {
      left: Math.max(0, Math.min(left, maxLeft)),
      top: Math.max(0, Math.min(top, maxTop))
    };
  };

  // 2) Restore saved position with clamp
  chrome.storage.local.get("overlayPos", data => {
    if (data.overlayPos) {
      const parsedLeft = parseInt(data.overlayPos.left);
      const parsedTop = parseInt(data.overlayPos.top);
      const clamped = clampPosition(parsedLeft, parsedTop);
      btn.style.left = `${clamped.left}px`;
      btn.style.top = `${clamped.top}px`;
    }
  });

  // 3) Request initial state
  chrome.runtime.sendMessage({ action: "getOverrideState" }, resp => {
    if (resp && typeof resp.controllerEnabled !== "undefined") {
      overrideActive = !resp.controllerEnabled;
      btn.style.boxShadow = overrideActive ? "none" : "0 0 12px 4px #0ff";
    }
  });

  // 4) Listen for state changes
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === "overrideToggled") {
      overrideActive = msg.overrideActive;
      btn.style.boxShadow = overrideActive ? "none" : "0 0 12px 4px #0ff";
    }
  });

  // 5) Drag logic
  btn.addEventListener("mousedown", e => {
    isDragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(btn.style.left);
    startTop = parseInt(btn.style.top);
    btn.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
  
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
  
    // Clamp real-time drag position
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    const clamped = clampPosition(newLeft, newTop);
  
    btn.style.left = `${clamped.left}px`;
    btn.style.top = `${clamped.top}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = "grab";

      const finalLeft = parseInt(btn.style.left);
      const finalTop = parseInt(btn.style.top);
      const clamped = clampPosition(finalLeft, finalTop);
      btn.style.left = `${clamped.left}px`;
      btn.style.top = `${clamped.top}px`;

      const dockThreshold = 10;

      if (clamped.left <= dockThreshold) {
        // Dock to left
        btn.style.display = "none";
        handle.style.display = "flex";
        handle.style.left = "0px";
        handle.style.top = `${clamped.top}px`;
      } else if (clamped.left >= window.innerWidth - 48 - dockThreshold) {
        // Dock to right
        btn.style.display = "none";
        handle.style.display = "flex";
        handle.style.left = `${window.innerWidth - 20}px`;
        handle.style.top = `${clamped.top}px`;
      } else {
        handle.style.display = "none";
      }

      chrome.storage.local.set({
        overlayPos: { left: `${clamped.left}px`, top: `${clamped.top}px` }
      });
    }
  });

  // 6) Click toggles override (only if not dragging)
  btn.addEventListener("click", () => {
    if (moved || justShownFromHandle) {
      moved = false;
      return;
    }
    overrideActive = !overrideActive;
    if (overrideActive) {
      btn.style.boxShadow = "none";
      chrome.runtime.sendMessage({ action: "override" }, () => {});
    } else {
      btn.style.boxShadow = "0 0 12px 4px #0ff";
      chrome.runtime.sendMessage({ action: "enable" }, () => {});
    }
    btn.style.transform = "scale(1.2)";
    setTimeout(() => btn.style.transform = "scale(1)", 200);
  });


  handle.addEventListener("click", () => {
  const handleLeft = parseInt(handle.style.left);
  const isLeft = handleLeft < window.innerWidth / 2;
  
  justShownFromHandle = true; // prevent immediate toggle
  setTimeout(() => justShownFromHandle = false, 200);

  btn.style.display = "flex";
  handle.style.display = "none";
  btn.style.left = isLeft ? "0px" : `${window.innerWidth - 48}px`;
});


})();
