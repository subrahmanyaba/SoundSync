// content.js

function createOverrideButton() {
  if (document.getElementById("soundSyncOverrideBtn")) return;

  const button = document.createElement("button");
  button.id = "soundSyncOverrideBtn";
  button.innerText = "Override";

  // Style the button
  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "99999",
    backgroundColor: "#0e76a8",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    cursor: "pointer",
    opacity: "0.4",
    transition: "opacity 0.3s ease, transform 0.2s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  });

  button.onmouseenter = () => {
    button.style.opacity = "1";
    button.style.transform = "scale(1.05)";
  };

  button.onmouseleave = () => {
    button.style.opacity = "0.4";
    button.style.transform = "scale(1)";
  };

  button.onclick = async () => {
    console.log("Override button clicked");
    await chrome.storage.local.set({ volumeControlEnabled: false });

    chrome.runtime.sendMessage({ action: "overrideVolumes" }, (response) => {
      console.log("Override message sent");
    });
  };

  document.body.appendChild(button);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createOverrideButton);
} else {
  createOverrideButton();
}
