// ============================================================
// FILE: app.js
// PATH: /app.js
// DESC: Core logic for IOS Dev Browser PWA.
//       - Handles URL navigation into iframe
//       - Injects DevTools HUD into same-origin pages
//       - Uses bug button to toggle HUD visibility via postMessage
//         without resetting logs or DOM state.
// ============================================================

const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const frame = document.getElementById("browserFrame");
const debugBtn = document.getElementById("debugBtn");

const REPO_BASE = "/IOS_Dev_Browser/";
const DEVTOOLS_SCRIPT = REPO_BASE + "web-inject/devtools.js";

let hudVisible = true;

// Initial toast to confirm app boot
window.addEventListener("load", () => {
    showToast("Devtools ready");
});

// URL navigation
goBtn.addEventListener("click", () => {
    let url = urlInput.value.trim();
    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    frame.src = url;
});

// Bug button toggles HUD visibility without re-injecting
debugBtn.addEventListener("click", () => {
    hudVisible = !hudVisible;

    try {
        if (frame.contentWindow) {
            frame.contentWindow.postMessage(
                {
                    source: "IOS_DEV_BROWSER",
                    type: "DEVTOOLS_TOGGLE_VISIBILITY"
                },
                "*"
            );
        }
    } catch (e) {
        // Ignore, just in case of edge cross-origin errors
    }

    showToast(hudVisible ? "Devtools shown" : "Devtools hidden");
});

// Inject devtools when iframe loads a same-origin page
frame.addEventListener("load", () => {
    injectDevtoolsIntoFrame();
});

function injectDevtoolsIntoFrame() {
    const win = frame.contentWindow;

    if (!win) {
        showToast("No frame window available");
        return;
    }

    try {
        const doc = win.document;
        const origin = win.location.origin;

        // Only attach to same-origin pages (blank.html + any local pages)
        if (origin !== window.location.origin) {
            showToast("Cross-origin page: Devtools cannot attach");
            return;
        }

        // If HUD root already exists, don't re-attach
        if (doc.getElementById("devbrowser-hud-root")) {
            showToast("Devtools already attached");
            return;
        }

        // Inject CSS with cache-busting
        const cssLink = doc.createElement("link");
        cssLink.id = "__devbrowser_devtools_css";
        cssLink.rel = "stylesheet";
        cssLink.href = REPO_BASE + "web-inject/devtools.css?v=4&ts=" + Date.now();
        doc.head.appendChild(cssLink);

        // Inject script with cache-busting
        const script = doc.createElement("script");
        script.id = "__devbrowser_devtools_script";
        script.src = DEVTOOLS_SCRIPT + "?v=4&ts=" + Date.now();
        script.onload = () => showToast("Devtools HUD initialized");
        script.onerror = () => showToast("Failed to load devtools");
        doc.head.appendChild(script);

    } catch (e) {
        showToast("Injection failed (likely cross-origin)");
    }
}

// Simple toast system
function showToast(message) {
    let toast = document.getElementById("__devbrowser_toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "__devbrowser_toast";
        toast.style.position = "fixed";
        toast.style.bottom = "90px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.background = "rgba(0, 0, 0, 0.85)";
        toast.style.color = "#fff";
        toast.style.padding = "8px 14px";
        toast.style.borderRadius = "999px";
        toast.style.fontSize = "13px";
        toast.style.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
        toast.style.zIndex = "999999";
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.2s ease-out";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    clearTimeout(window.__devbrowser_toast_timeout);
    window.__devbrowser_toast_timeout = setTimeout(() => {
        toast.style.opacity = "0";
    }, 1800);
}

// Register service worker for PWA behavior
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
}
