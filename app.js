// FILE: app.js
// PATH: /app.js
// DESC: Core logic for IOS Dev Browser PWA (URL loading + devtools injector)

const urlInput = document.getElementById("urlInput");
const goBtn = document.getElementById("goBtn");
const frame = document.getElementById("browserFrame");
const debugBtn = document.getElementById("debugBtn");

// Hard-coded repo base for GitHub Pages deployment
const REPO_BASE = "/IOS_Dev_Browser/";
const DEVTOOLS_SCRIPT = REPO_BASE + "web-inject/devtools.js";

// Track whether devtools are enabled for the current session
let devtoolsEnabled = true;

// Load URL into iframe
goBtn.addEventListener("click", () => {
    let url = urlInput.value.trim();

    if (!url) return;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }

    frame.src = url;
});

// Toggle devtools (for now just a flag + toast)
debugBtn.addEventListener("click", () => {
    devtoolsEnabled = !devtoolsEnabled;
    showToast(devtoolsEnabled ? "Devtools enabled" : "Devtools disabled");
});

// When iframe finishes loading, attempt injection
frame.addEventListener("load", () => {
    if (!devtoolsEnabled) {
        showToast("Devtools disabled for this page");
        return;
    }

    injectDevtoolsIntoFrame();
});

// Attempt to inject devtools into the iframe
function injectDevtoolsIntoFrame() {
    const win = frame.contentWindow;

    if (!win) {
        showToast("No frame window available");
        return;
    }

    try {
        // Security: this will throw on cross-origin frames
        const doc = win.document;
        const origin = win.location.origin;

        if (origin !== window.location.origin) {
            console.warn("[DevBrowser] Cross-origin frame, cannot inject devtools:", origin);
            showToast("Cross-origin page: Devtools cannot attach");
            return;
        }

        // Check if already injected
        if (doc.getElementById("__devbrowser_devtools_script")) {
            console.log("[DevBrowser] Devtools already injected");
            showToast("Devtools already attached");
            return;
        }

        // Inject CSS
        const cssLink = doc.createElement("link");
        cssLink.id = "__devbrowser_devtools_css";
        cssLink.rel = "stylesheet";
        cssLink.href = REPO_BASE + "web-inject/devtools.css";
        doc.head.appendChild(cssLink);

        // Inject JS
        const script = doc.createElement("script");
        script.id = "__devbrowser_devtools_script";
        script.src = DEVTOOLS_SCRIPT;
        script.onload = () => {
            console.log("[DevBrowser] Devtools loaded");
            showToast("Devtools attached");
        };
        script.onerror = () => {
            console.warn("[DevBrowser] Failed to load devtools");
            showToast("Failed to load devtools");
        };
        doc.head.appendChild(script);
    } catch (e) {
        console.warn("[DevBrowser] Injection failed:", e);
        showToast("Injection failed (likely cross-origin)");
    }
}

// Simple toast for user feedback
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

// Register service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
}
