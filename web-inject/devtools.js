// FILE: devtools.js
// PATH: /web-inject/devtools.js
// DESC: In-page devtools HUD (console + tab system scaffold)

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
                <div id="devbrowser-hud-tabs">
                    <button class="devbrowser-hud-tab active" data-tab="console">Console</button>
                    <button class="devbrowser-hud-tab" data-tab="network">Network</button>
                    <button class="devbrowser-hud-tab" data-tab="events">Events</button>
                    <button class="devbrowser-hud-tab" data-tab="player">Player</button>
                    <button class="devbrowser-hud-tab" data-tab="info">Info</button>
                </div>
                <div id="devbrowser-hud-controls">
                    <button class="devbrowser-hud-btn" data-action="clear">Clear</button>
                    <button class="devbrowser-hud-btn" data-action="close">Close</button>
                </div>
            </div>

            <div id="devbrowser-hud-body">
                <div class="devbrowser-panel" data-panel="console"></div>
                <div class="devbrowser-panel" data-panel="network" style="display:none"></div>
                <div class="devbrowser-panel" data-panel="events" style="display:none"></div>
                <div class="devbrowser-panel" data-panel="player" style="display:none"></div>
                <div class="devbrowser-panel" data-panel="info" style="display:none"></div>
            </div>
        `;

        document.body.appendChild(root);

        const tabs = root.querySelectorAll(".devbrowser-hud-tab");
        const panels = root.querySelectorAll(".devbrowser-panel");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const target = tab.getAttribute("data-tab");

                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");

                panels.forEach(p => {
                    p.style.display = p.getAttribute("data-panel") === target ? "block" : "none";
                });
            });
        });

        const controls = root.querySelector("#devbrowser-hud-controls");
        const panelConsole = root.querySelector('[data-panel="console"]');

        controls.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const action = btn.getAttribute("data-action");
            if (action === "clear") {
                panelConsole.innerHTML = "";
            } else if (action === "close") {
                root.remove();
            }
        });

        return { root, panelConsole };
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

    function installConsoleHook(panelConsole) {
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
            panelConsole.appendChild(line);
            panelConsole.scrollTop = panelConsole.scrollHeight;
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

        installConsoleHook(hud.panelConsole);
        console.log("[DevBrowser] Devtools HUD initialized");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
