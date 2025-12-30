// FILE: devtools.js
// PATH: /web-inject/devtools.js
// DESC: In-page devtools HUD for IOS Dev Browser (console hook, log overlay)

(function () {
    if (window.__devbrowser_devtools_initialized) return;
    window.__devbrowser_devtools_initialized = true;

    const HUD_ID = "devbrowser-hud-root";

    function createHud() {
        if (document.getElementById(HUD_ID)) return;

        const root = document.createElement("div");
        root.id = HUD_ID;

        root.innerHTML = `
            <div id="devbrowser-hud-header">
                <div id="devbrowser-hud-title">IOS Dev Browser · Console</div>
                <div id="devbrowser-hud-controls">
                    <button class="devbrowser-hud-btn active" data-tab="console">Console</button>
                    <button class="devbrowser-hud-btn" data-action="clear">Clear</button>
                    <button class="devbrowser-hud-btn" data-action="close">Close</button>
                </div>
            </div>
            <div id="devbrowser-hud-body">
                <div id="devbrowser-hud-log"></div>
            </div>
        `;

        document.body.appendChild(root);

        const controls = root.querySelector("#devbrowser-hud-controls");
        const logEl = root.querySelector("#devbrowser-hud-log");

        controls.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.getAttribute("data-action");
            if (action === "clear") {
                logEl.innerHTML = "";
            } else if (action === "close") {
                root.remove();
            }
        });

        return { root, logEl };
    }

    function formatArgs(args) {
        return args
            .map((arg) => {
                try {
                    if (typeof arg === "string") return arg;
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            })
            .join(" ");
    }

    function installConsoleHook(logEl) {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        function appendLine(level, args) {
            const line = document.createElement("div");
            line.className = "devbrowser-log-line";

            const badge = document.createElement("span");
            badge.className = `level ${level}`;
            badge.textContent = level.toUpperCase();

            const text = document.createElement("span");
            text.textContent = formatArgs(args);

            line.appendChild(badge);
            line.appendChild(text);
            logEl.appendChild(line);
            logEl.scrollTop = logEl.scrollHeight;
        }

        console.log = function (...args) {
            appendLine("log", args);
            originalLog.apply(console, args);
        };

        console.warn = function (...args) {
            appendLine("warn", args);
            originalWarn.apply(console, args);
        };

        console.error = function (...args) {
            appendLine("error", args);
            originalError.apply(console, args);
        };
    }

    function init() {
        const hud = createHud();
        if (!hud) return;

        installConsoleHook(hud.logEl);
        console.log("[DevBrowser] Devtools HUD initialized");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
