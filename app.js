// FILE: app.js
// DESC: Core logic for IOS Dev Browser PWA

const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const frame = document.getElementById("browserFrame");
const debugBtn = document.getElementById("debugBtn");

// Load URL into iframe
goBtn.addEventListener("click", () => {
    let url = urlInput.value.trim();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    frame.src = url;
});

// Debug button (placeholder for Phase 2)
debugBtn.addEventListener("click", () => {
    alert("Debug tools coming in Phase 2!");
});

// Register service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
}
