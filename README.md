# Read me file is from chatGPT btw

# SoundSync 🔊

**SoundSync** is a Chrome extension that intelligently manages media volume across browser tabs. The active (focused) tab retains its original volume, while all other audible tabs are smoothly dimmed to avoid distractions.

✨ Includes a draggable override button that lets you take full control instantly!

---

## 🚀 Features

- 🎧 Only the active tab plays at full volume — others are dimmed to 25%.
- 🔄 Volume levels restore correctly when switching back.
- 🧠 Remembers user-changed volume per tab.
- 🟡 Override mode to disable auto volume control and reset all tabs.
- 🌈 Draggable floating overlay button with glow effect.
- ⚡ Built with native JavaScript and Chrome APIs.

---

## 📦 Installation

1. Clone or download this repository.

2. Open [chrome://extensions](chrome://extensions) in your browser.

3. Enable **Developer Mode** (top right).

4. Click **Load unpacked**.

5. Select the `SoundSync/` folder (the folder that contains `manifest.json`).

6. You should now see the SoundSync extension loaded and active.

---

## 🧪 Usage

- Just open tabs that play audio or video (YouTube, Spotify Web, etc.).
- The currently active tab will stay loud; others are dimmed.
- Drag the floating **S** button anywhere on the screen.
- Click the button to **override** and reset volumes back to the original.
- Click again to **re-enable** SoundSync.

---

## 🛠️ Development Notes

- Uses `background.js` for tab tracking and messaging.
- `content.js` watches for user volume changes.
- `overlay.js` manages the draggable override button and communicates with the background script.
- Assets like icons are stored in `/icons`.

---

## 🧠 Contributing

Feel free to suggest improvements by submitting a pull request to the master branch.  
We / I welcome feedback!

---

## 📃 License

Open source coz I'm broke and also the code is just crap lol.

---

> Built with ❤️ to make your tabs play in harmony.
