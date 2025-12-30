// ============================================================
// FILE: devtools.js
// PATH: /web-inject/devtools.js
// DESC: Injected DevTools HUD for IOS Dev Browser. Creates a
//       floating overlay inside the target page iframe.
//       - Intercepts console.log/warn/error
//       - Shows logs in a console panel
//       - Provides a simple eval input
//       - Listens to postMessage from the outer app to toggle
//         visibility without destroying DOM or logs.
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

        const header = document.createElement("div");
        header.id = "devbrowser-hud-header";

        const title = document.createElement("div");
        title.id = "devbrowser-hud-title";
        title.textContent = "IOS Dev Browser Devtools";

        const tabs = document.createElement("div");
        tabs.id = "devbrowser-hud-tabs";

        const consoleTab = document.createElement("button");
        consoleTab.className = "devbrowser-tab devbrowser-active";
        consoleTab.textContent = "Console";

        tabs.appendChild(consoleTab);

        const actions = document.createElement("div");
        actions.id = "devbrowser-hud-actions";

        const clearBtn = document.createElement("button");
        clearBtn.className = "devbrowser-btn";
        clearBtn.textContent = "Clear";

        const closeBtn = document.createElement("button");
        closeBtn.className = "devbrowser-btn devbrowser-btn-danger";
        closeBtn.textContent = "Close";

        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(tabs);
        header.appendChild(actions);

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
        hudRoot.appendChild(body);

        document.body.appendChild(hudRoot);

        // Wire actions
        clearBtn.addEventListener("click", () => {
            if (consoleOutput) {
                consoleOutput.innerHTML = "";
            }
        });

        closeBtn.addEventListener("click", () => {
            setVisibility(false);
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
        line.className = "devbrowser-log-line";

        if (type === "warn") {
            line.classList.add("devbrowser-log-warn");
        } else if (type === "error") {
            line.classList.add("devbrowser-log-error");
        }

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
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };

        console.log = function (...args) {
            appendLog("log", args);
            original.log(...args);
        };

        console.warn = function (...args) {
            appendLog("warn", args);
            original.warn(...args);
        };

        console.error = function (...args) {
            appendLog("error", args);
            original.error(...args);
        };

        // Hide reference if needed later
        window.__devbrowser_console_original = original;
    }

    function runConsoleInput() {
        if (!consoleInput) return;
        const code = consoleInput.value.trim();
        if (!code) return;

        consoleInput.value = "";

        appendLog("log", ["▶ " + code]);

        try {
            // eslint-disable-next-line no-eval
            const result = eval(code);
            appendLog("log", ["◀", result]);
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
