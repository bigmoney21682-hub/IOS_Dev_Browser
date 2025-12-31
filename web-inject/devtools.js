// ============================================================
// FILE: devtools.js
// PATH: /web-inject/devtools.js
// DESC: Injected DevTools HUD for IOS Dev Browser. Creates a
//       floating overlay inside the target page iframe.
//       - - Intercepts console.log/info/warn/error/debug
//       - Shows logs in a console panel
//       - Provides a simple eval input
//       - Network panel scaffold:
//           * Logs fetch + XHR
//           * Chrome-style request rows
//           * Safari-style inline inspector
//           * Status color coding (2xx/3xx/4xx/5xx)
//       - Copy button copies all data from active panel
//       - Listens to postMessage from the outer app to toggle
//         visibility without destroying DOM or logs.
//       - Integrates with MyTube debugBus.log(level, message)
//         by wrapping it and mirroring logs into the HUD.
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

    let networkPanel = null;
    let networkList = null;
    let networkEntries = [];

    let hudVisible = true;
    let activePanel = "console"; // "console" | "network"

    const panelRoots = {};

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

    function setActivePanel(panelName) {
        activePanel = panelName;

        const allTabs = document.querySelectorAll(".devbrowser-tab");
        allTabs.forEach((tab) => {
            tab.classList.remove("devbrowser-active");
        });

        const consoleTab = document.getElementById("devbrowser-tab-console");
        const networkTab = document.getElementById("devbrowser-tab-network");

        if (panelName === "console" && consoleTab) {
            consoleTab.classList.add("devbrowser-active");
        }
        if (panelName === "network" && networkTab) {
            networkTab.classList.add("devbrowser-active");
        }

        Object.keys(panelRoots).forEach((key) => {
            const panel = panelRoots[key];
            if (!panel) return;
            if (key === panelName) {
                panel.classList.add("devbrowser-panel-active");
            } else {
                panel.classList.remove("devbrowser-panel-active");
            }
        });
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
        consoleTab.id = "devbrowser-tab-console";
        consoleTab.className = "devbrowser-tab devbrowser-active";
        consoleTab.textContent = "Console";

        const networkTab = document.createElement("button");
        networkTab.id = "devbrowser-tab-network";
        networkTab.className = "devbrowser-tab";
        networkTab.textContent = "Network";

        tabRow.appendChild(consoleTab);
        tabRow.appendChild(networkTab);

        // BODY
        const body = document.createElement("div");
        body.id = "devbrowser-hud-body";

        // CONSOLE PANEL
        const consolePanel = document.createElement("div");
        consolePanel.id = "devbrowser-panel-console";
        consolePanel.className = "devbrowser-panel devbrowser-panel-active";

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

        // NETWORK PANEL
        networkPanel = document.createElement("div");
        networkPanel.id = "devbrowser-panel-network";
        networkPanel.className = "devbrowser-panel";

        networkList = document.createElement("div");
        networkList.id = "devbrowser-network-list";

        networkPanel.appendChild(networkList);

        // Register panels
        panelRoots["console"] = consolePanel;
        panelRoots["network"] = networkPanel;

        body.appendChild(consolePanel);
        body.appendChild(networkPanel);

        hudRoot.appendChild(header);
        hudRoot.appendChild(tabRow);
        hudRoot.appendChild(body);

        document.body.appendChild(hudRoot);

        // Wire header actions
        clearBtn.addEventListener("click", () => {
            if (activePanel === "console" && consoleOutput) {
                consoleOutput.innerHTML = "";
            } else if (activePanel === "network" && networkList) {
                networkList.innerHTML = "";
                networkEntries = [];
            }
        });

        copyBtn.addEventListener("click", () => {
            const root = panelRoots[activePanel];
            if (!root) return;
            const text = root.innerText;
            try {
                navigator.clipboard.writeText(text);
            } catch (e) {
                // Clipboard may fail; ignore silently
            }
        });

        // Wire tab switching
        consoleTab.addEventListener("click", () => {
            setActivePanel("console");
        });

        networkTab.addEventListener("click", () => {
            setActivePanel("network");
        });

        // Console input
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

    // ===== Network interception =====

    function interceptFetch() {
        if (typeof window.fetch !== "function") return;

        const originalFetch = window.fetch.bind(window);

        window.fetch = function (input, init) {
            const start = performance.now();
            let url = "";
            let method = "GET";
            let requestHeaders = {};

            try {
                if (typeof input === "string") {
                    url = input;
                } else if (input && input.url) {
                    url = input.url;
                }

                if (init && init.method) {
                    method = String(init.method).toUpperCase();
                } else if (input && input.method) {
                    method = String(input.method).toUpperCase();
                }

                if (init && init.headers) {
                    requestHeaders = normalizeHeaders(init.headers);
                }
            } catch (e) {
                // ignore
            }

            const entry = createNetworkEntry({
                type: "fetch",
                method,
                url,
                requestHeaders
            });

            return originalFetch(input, init)
                .then((response) => {
                    const end = performance.now();
                    entry.status = response.status;
                    entry.duration = Math.round(end - start);
                    entry.responseHeaders = {};
                    try {
                        response.headers.forEach((value, key) => {
                            entry.responseHeaders[key] = value;
                        });
                    } catch (e) {
                        // ignore
                    }

                    response.clone().text().then((text) => {
                        entry.preview = truncatePreview(text);
                        refreshNetworkList();
                    }).catch(() => {
                        refreshNetworkList();
                    });

                    refreshNetworkList();
                    return response;
                })
                .catch((error) => {
                    const end = performance.now();
                    entry.status = 0;
                    entry.duration = Math.round(end - start);
                    entry.error = String(error);
                    refreshNetworkList();
                    throw error;
                });
        };
    }

    function interceptXHR() {
        const OriginalXHR = window.XMLHttpRequest;
        if (!OriginalXHR) return;

        function WrappedXHR() {
            const xhr = new OriginalXHR();
            const entry = {
                id: createId(),
                type: "xhr",
                method: "GET",
                url: "",
                status: 0,
                duration: 0,
                startTime: 0,
                endTime: 0,
                requestHeaders: {},
                responseHeaders: {},
                preview: "",
                error: null,
                expanded: false
            };

            const originalOpen = xhr.open;
            xhr.open = function (method, url) {
                entry.method = String(method || "GET").toUpperCase();
                entry.url = String(url || "");
                originalOpen.apply(xhr, arguments);
            };

            const originalSetRequestHeader = xhr.setRequestHeader;
            xhr.setRequestHeader = function (name, value) {
                entry.requestHeaders[name] = value;
                originalSetRequestHeader.apply(xhr, arguments);
            };

            const originalSend = xhr.send;
            xhr.send = function (body) {
                entry.startTime = performance.now();
                originalSend.apply(xhr, arguments);
            };

            xhr.addEventListener("readystatechange", function () {
                if (xhr.readyState === 4) {
                    entry.endTime = performance.now();
                    entry.duration = Math.round(entry.endTime - entry.startTime);
                    entry.status = xhr.status;

                    try {
                        const rawHeaders = xhr.getAllResponseHeaders();
                        entry.responseHeaders = parseRawHeaders(rawHeaders);
                    } catch (e) {
                        // ignore
                    }

                    try {
                        entry.preview = truncatePreview(xhr.responseText || "");
                    } catch (e) {
                        // ignore
                    }

                    createNetworkEntry(entry, true);
                    refreshNetworkList();
                }
            });

            createNetworkEntry(entry, true);
            return xhr;
        }

        window.XMLHttpRequest = WrappedXHR;
    }

    function normalizeHeaders(headers) {
        const result = {};
        if (!headers) return result;

        if (headers.forEach) {
            headers.forEach((value, key) => {
                result[key] = value;
            });
        } else if (Array.isArray(headers)) {
            headers.forEach(([key, value]) => {
                result[key] = value;
            });
        } else if (typeof headers === "object") {
            Object.keys(headers).forEach((key) => {
                result[key] = headers[key];
            });
        }

        return result;
    }

    function parseRawHeaders(raw) {
        const headers = {};
        if (!raw) return headers;
        const lines = raw.split(/\r?\n/);
        lines.forEach((line) => {
            const idx = line.indexOf(":");
            if (idx > 0) {
                const key = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                if (key) headers[key] = value;
            }
        });
        return headers;
    }

    function truncatePreview(text) {
        if (!text) return "";
        if (text.length > 1000) {
            return text.slice(0, 1000) + "\n…(truncated)…";
        }
        return text;
    }

    function createId() {
        return "net_" + Math.random().toString(36).slice(2, 10);
    }

    function createNetworkEntry(base, reuse) {
        const entry = reuse ? base : {
            id: createId(),
            type: base.type || "fetch",
            method: base.method || "GET",
            url: base.url || "",
            status: base.status || 0,
            duration: base.duration || 0,
            startTime: base.startTime || performance.now(),
            endTime: base.endTime || 0,
            requestHeaders: base.requestHeaders || {},
            responseHeaders: base.responseHeaders || {},
            preview: base.preview || "",
            error: base.error || null,
            expanded: base.expanded || false
        };

        if (!reuse) {
            networkEntries.push(entry);
        } else if (!networkEntries.includes(entry)) {
            networkEntries.push(entry);
        }

        return entry;
    }

    function refreshNetworkList() {
        if (!networkList) return;

        networkList.innerHTML = "";

        networkEntries.forEach((entry) => {
            const row = document.createElement("div");
            row.className = "devbrowser-network-row";

            const main = document.createElement("div");
            main.className = "devbrowser-network-row-main";

            const methodEl = document.createElement("span");
            methodEl.className = "devbrowser-net-method";
            methodEl.textContent = entry.method || "GET";

            const urlEl = document.createElement("span");
            urlEl.className = "devbrowser-net-url";
            urlEl.textContent = entry.url || "";

            const statusEl = document.createElement("span");
            statusEl.className = "devbrowser-net-status";

            const status = Number(entry.status) || 0;
            statusEl.textContent = status ? String(status) : "-";

            if (status >= 200 && status < 300) {
                statusEl.classList.add("devbrowser-net-status-2xx");
            } else if (status >= 300 && status < 400) {
                statusEl.classList.add("devbrowser-net-status-3xx");
            } else if (status >= 400 && status < 500) {
                statusEl.classList.add("devbrowser-net-status-4xx");
            } else if (status >= 500) {
                statusEl.classList.add("devbrowser-net-status-5xx");
            }

            const durationEl = document.createElement("span");
            durationEl.className = "devbrowser-net-duration";
            durationEl.textContent = entry.duration ? entry.duration + "ms" : "";

            main.appendChild(methodEl);
            main.appendChild(urlEl);
            main.appendChild(statusEl);
            main.appendChild(durationEl);

            row.appendChild(main);

            const inspector = document.createElement("div");
            inspector.className = "devbrowser-network-inspector";
            if (!entry.expanded) {
                inspector.style.display = "none";
            }

            const reqSection = document.createElement("div");
            reqSection.className = "devbrowser-network-inspector-section";

            const reqLabel = document.createElement("div");
            reqLabel.className = "devbrowser-network-inspector-label";
            reqLabel.textContent = "Request Headers:";

            const reqBlock = document.createElement("div");
            reqBlock.className = "devbrowser-network-inspector-block";
            reqBlock.textContent = formatHeaders(entry.requestHeaders);

            reqSection.appendChild(reqLabel);
            reqSection.appendChild(reqBlock);

            const resSection = document.createElement("div");
            resSection.className = "devbrowser-network-inspector-section";

            const resLabel = document.createElement("div");
            resLabel.className = "devbrowser-network-inspector-label";
            resLabel.textContent = "Response Headers:";

            const resBlock = document.createElement("div");
            resBlock.className = "devbrowser-network-inspector-block";
            resBlock.textContent = formatHeaders(entry.responseHeaders);

            resSection.appendChild(resLabel);
            resSection.appendChild(resBlock);

            const prevSection = document.createElement("div");
            prevSection.className = "devbrowser-network-inspector-section";

            const prevLabel = document.createElement("div");
            prevLabel.className = "devbrowser-network-inspector-label";
            prevLabel.textContent = "Preview:";

            const prevBlock = document.createElement("div");
            prevBlock.className = "devbrowser-network-inspector-block";
            prevBlock.textContent = entry.preview || (entry.error ? ("Error: " + entry.error) : "");

            prevSection.appendChild(prevLabel);
            prevSection.appendChild(prevBlock);

            inspector.appendChild(reqSection);
            inspector.appendChild(resSection);
            inspector.appendChild(prevSection);

            row.appendChild(inspector);

            row.addEventListener("click", () => {
                entry.expanded = !entry.expanded;
                inspector.style.display = entry.expanded ? "block" : "none";
            });

            networkList.appendChild(row);
        });
    }

    function formatHeaders(headers) {
        if (!headers || Object.keys(headers).length === 0) {
            return "(none)";
        }
        return Object.keys(headers)
            .map((key) => key + ": " + headers[key])
            .join("\n");
    }

    function setupPostMessageListener() {
        window.addEventListener("message", (event) => {
            const data = event.data;
            if (!data || typeof data !== "object") return;

            if (data.source === "IOS_DEV_BROWSER" && data.type === "DEVTOOLS_TOGGLE_VISIBILITY") {
                setVisibility(!hudVisible);
                return;
            }

            // MyTube integration: receive mirrored logs from debugBus.log
            if (data.source === "MYTUBE" && data.type === "LOG") {
                appendLog("info", [`[MyTube:${data.level}]`, data.message]);
            }
        });
    }

    // ===== MyTube integration: wrap debugBus.log(level, message) =====

    function wrapMyTubeDebugBus() {
        try {
            if (!window.debugBus || typeof window.debugBus.log !== "function") return;

            const originalLog = window.debugBus.log.bind(window.debugBus);

            window.debugBus.log = function (level, message) {
                // Preserve MyTube internal behavior
                originalLog(level, message);

                // Mirror into parent (DevBrowser app)
                try {
                    window.parent.postMessage({
                        source: "MYTUBE",
                        type: "LOG",
                        level,
                        message
                    }, "*");
                } catch (e) {
                    // ignore
                }
            };
        } catch (e) {
            // ignore
        }
    }

    // Initialize HUD + interceptors
    createHud();
    interceptConsole();
    interceptFetch();
    interceptXHR();
    setupPostMessageListener();
    wrapMyTubeDebugBus();

    console.log("LOG[DevBrowser] Devtools HUD initialized");
})();
