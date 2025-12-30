// ============================================================
// FILE: devtools.js
// PATH: /web-inject/devtools.js
// DESC: Injected DevTools HUD for IOS Dev Browser. Creates a
//       floating overlay inside the target page iframe.
//       - Intercepts console.log/info/warn/error/debug
//       - Shows logs in a console panel
//       - Provides a simple eval input
//       - Listens to postMessage from the outer app to toggle
//         visibility without destroying DOM or logs.
//       - Two-row header: title + actions (row 1),
//         section tabs (row 2, future-ready).
// ============================================================

(function () {
    if (window.__devbrowser_hud_initialized) {
        return;
    }
    window.__devbrowser_hud_initialized = true;

    const STORAGE_KEY_VISIBLE = "devbrowser_hud_visible";

    let hudRoot = null;
    let consoleOutput = null;
    let consoleInput = null;
    let hudVisible = true;

    function readInitialVisibility() {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY_VISIBLE);
            if (stored === "0") return false;
            if (stored === "1") return true;
        } catch (e) {
            // ignore
        }
        return true;
    }

    function persistVisibility(visible) {
        try {
            sessionStorage.setItem(STORAGE_KEY_VISIBLE, visible ? "1" : "0");
        } catch (e) {
            // ignore
        }
    }

    function setVisibility(visible) {
        hudVisible = visible;
        if (!hudRoot) return;
        if (visible) {
            hudRoot.classList.remove("devbrowser-hidden");
        } else {
            hudRoot.classList.add("devbrowser-hidden");
        }
        persistVisibility(visible);
    }

    function createHud() {
        hudRoot = document.createElement("div");
        hudRoot.id = "devbrowser-hud-root";

        // HEADER (ROW 1)
        const header = document.createElement("div");
        header.id = "devbrowser-hud-header";

        const title = document.createElement("div");
        title.id = "devbrowser-hud-title";
        title.textContent = "IOS Dev Browser Devtools";

        const headerSpacer = document.createElement("div");
        headerSpacer.style.flex = "1";

        const copyBtn = document.createElement("button");
        copyBtn.className = "devbrowser-btn";
        copyBtn.textContent = "Copy";

        const clearBtn = document.createElement("button");
        clearBtn.className = "devbrowser-btn";
        clearBtn.textContent = "Clear";

        header.appendChild(title);
        header.appendChild(headerSpacer);
        header.appendChild(copyBtn);
        header.appendChild(clearBtn);

        // HEADER (ROW 2) — TABS
        const tabRow = document.createElement("div");
        tabRow.id = "devbrowser-hud-tabrow";

        const consoleTab = document.createElement("button");
        consoleTab.className = "devbrowser-tab devbrowser-active";
        consoleTab.textContent = "Console";

        tabRow.appendChild(consoleTab);

        // BODY + CONSOLE
        const body = document.createElement("div");
        body.id = "devbrowser-hud-body";

        const consolePanel = document.createElement("div");
        consolePanel.id = "devbrowser-panel-console";

        consoleOutput = document.createElement("div");
        consoleOutput.id = "devbrowser-console-output";

        const inputRow = document.createElement("div");
        inputRow.id = "devbrowser-console-input-row";

        consoleInput = document.createElement("input");
        consoleInput.id = "devbrowser-console-input";
        consoleInput.placeholder = "Type JavaScript and press Enter…";

        const runBtn = document.createElement("button");
        runBtn.id = "devbrowser-console-run";
        runBtn.textContent = "Run";

        inputRow.appendChild(consoleInput);
        inputRow.appendChild(runBtn);

        consolePanel.appendChild(consoleOutput);
        consolePanel.appendChild(inputRow);

        body.appendChild(consolePanel);

        hudRoot.appendChild(header);
        hudRoot.appendChild(tabRow);
        hudRoot.appendChild(body);

        document.body.appendChild(hudRoot);

        // Wire actions
        clearBtn.addEventListener("click", () => {
            if (consoleOutput) {
                consoleOutput.innerHTML = "";
            }
        });

        copyBtn.addEventListener("click", () => {
            if (!consoleOutput) return;
            const text = consoleOutput.innerText;
            try {
                navigator.clipboard.writeText(text);
            } catch (e) {
                // Clipboard may fail on some contexts; ignore silently
            }
        });

        consoleInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                runConsoleInput();
            }
        });

        runBtn.addEventListener("click", () => {
            runConsoleInput();
        });

        // Initial visibility from storage
        setVisibility(readInitialVisibility());
    }

    function appendLog(type, args) {
        if (!consoleOutput) return;

        const line = document.createElement("div");
        line.className = "devbrowser-log-line devbrowser-log-" + type;

        const prefix = document.createElement("span");
        prefix.className = "devbrowser-log-prefix";
        prefix.textContent = "[" + type + "]";

        const text = document.createElement("span");
        text.textContent = " " + args.map(safeStringify).join(" ");

        line.appendChild(prefix);
        line.appendChild(text);

        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    function safeStringify(value) {
        try {
            if (typeof value === "string") return value;
            return JSON.stringify(value);
        } catch (e) {
            try {
                return String(value);
            } catch (e2) {
                return "[Unserializable]";
            }
        }
    }

    function interceptConsole() {
        const original = {
            log: console.log.bind(console),
            info: console.info ? console.info.bind(console) : console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
            debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
        };

        console.log = function (...args) {
            appendLog("info", args);
            original.log(...args);
        };

        console.info = function (...args) {
            appendLog("info", args);
            original.info(...args);
        };

        console.warn = function (...args) {
            appendLog("warn", args);
            original.warn(...args);
        };

        console.error = function (...args) {
            appendLog("error", args);
            original.error(...args);
        };

        console.debug = function (...args) {
            appendLog("debug", args);
            original.debug(...args);
        };

        window.__devbrowser_console_original = original;
    }

    function runConsoleInput() {
        if (!consoleInput) return;
        const code = consoleInput.value.trim();
        if (!code) return;

        consoleInput.value = "";

        appendLog("info", ["▶ " + code]);

        try {
            // eslint-disable-next-line no-eval
            const result = eval(code);
            appendLog("info", ["◀", result]);
        } catch (e) {
            appendLog("error", [String(e)]);
        }
    }

    function setupPostMessageListener() {
        window.addEventListener("message", (event) => {
            const data = event.data;
            if (!data || typeof data !== "object") return;
            if (data.source !== "IOS_DEV_BROWSER") return;

            if (data.type === "DEVTOOLS_TOGGLE_VISIBILITY") {
                setVisibility(!hudVisible);
            }
        });
    }

    // Initialize HUD
    createHud();
    interceptConsole();
    setupPostMessageListener();

    console.log("LOG[DevBrowser] Devtools HUD initialized");
})();
