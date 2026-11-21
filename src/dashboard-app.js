const { useCallback, useEffect, useMemo, useRef, useState, useId } = React;
const { createRoot } = ReactDOM;
function FormattedMessage({ content }) {
    const parts = String(content ?? "").split(/(\\*\\*[^*\\n]+?\\*\\*)/g);
    return React.createElement(React.Fragment, null, parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return React.createElement("strong", { key: index }, part.slice(2, -2));
        }
        return React.createElement(React.Fragment, { key: index }, part);
    }));
}
const TOKEN = document.querySelector('meta[name="h2o-token"]')?.content || "";
const api = async (url, data) => {
    const method = data?._method || (data ? "POST" : "GET");
    const payload = data ? { ...data } : undefined;
    if (payload)
        delete payload._method;
    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-H2O-Token": TOKEN },
        body: payload ? JSON.stringify(payload) : undefined
    });
    let result = {};
    try {
        result = await response.json();
    }
    catch { }
    if (!response.ok)
        throw new Error(result.error || "Request failed");
    return result;
};
const icons = {
    menu: "M4 6h16M4 12h16M4 18h16", overview: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
    chat: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
    files: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
    terminal: "m4 17 6-6-6-6M12 19h8", providers: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.2v3.6z",
    memory: "M12 3v18M5 7h14M5 17h14M7 3h10v18H7z", sessions: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.2v3.6z",
    sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13z", refresh: "M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3",
    plus: "M12 5v14M5 12h14", send: "M22 2 11 13M22 2l-7 20-4-9-9-4z", stop: "M6 6h12v12H6z", copy: "M8 8h12v12H8zM4 16V4h12",
    folder: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", check: "m5 12 4 4L19 6", arrow: "M5 12h14m-6-6 6 6-6 6",
    search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z",
    sliders: "M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6",
    globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    cpu: "M12 8v8m-4-4h8M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
    layers: "m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
    message: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-4A8.5 8.5 0 1 1 21 11.5z",
    repeat: "m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3",
    "panel-left": "M3 4h18v16H3zM9 4v16",
    keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01M18 14h.01M9 17h6",
    shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11zM9 12l2 2 4-4",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    "file-text": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
    database: "M12 3c5 0 9 1.3 9 3s-4 3-9 3-9-1.3-9-3 4-3 9-3zM3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6M3 12c0 1.7 4 3 9 3s9-1.3 9-3",
    flask: "M9 3h6m-5 0v7l-6 10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3M8 15h8",
    trash: "M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"
};
function readWebPref(key, fallback) { try {
    return JSON.parse(localStorage.getItem("h2o-web-settings") || "{}")[key] ?? fallback;
}
catch {
    return fallback;
} }
function Icon({ name, size = 16 }) { return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.65", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
    React.createElement("path", { d: icons[name] || icons.overview })); }
const copy = {
    en: {
        workspace: "Workspace", manage: "Manage", overview: "Overview", chat: "AI Chat", files: "Files", terminal: "Terminal", providers: "Providers & Models", memory: "Project Memory", sessions: "Sessions", settings: "Settings",
        ready: "Ready", refresh: "Refresh", good: "Your workspace, agents and tools in one place.", start: "Start a task", openProject: "Open project", workspaceMetric: "Workspace", messages: "Chat messages", terminalRuns: "Terminal runs", queue: "Queue", currentProject: "Current project directory", sessionMessages: "Current H2O session", recordedCommands: "Commands recorded", quickActions: "Quick actions", jump: "Jump into your workflow", liveActivity: "Live activity", listening: "Listening", ask: "Ask H2O", askDesc: "Chat, plan or build", explore: "Explore files", exploreDesc: "Browse and inspect source", runCommand: "Run command", runDesc: "Use project terminal", configure: "Configure AI", configureDesc: "Providers and models",
        aiWorkspace: "AI Workspace", shared: "Your CLI and Web dashboard share this same live session.", stop: "Stop task", newChat: "New chat", plan: "Plan", build: "Build", send: "Send", composerHint: "Enter to send · Shift+Enter for a new line", working: "Working…", projectFiles: "Project files", browse: "Browse your workspace and preview text files safely.", refreshFiles: "Refresh files", openFolder: "Open another local folder…", open: "Open", explorer: "Explorer", preview: "Preview", copy: "Copy", terminalTitle: "Terminal", terminalDesc: "Commands run in the active project directory. Risky commands may require approval in the CLI.", clearOutput: "Clear output", run: "Run", providersTitle: "Providers & models", providersDesc: "Connect hosted or local model providers. Credentials are stored through the OS credential manager.", configured: "Configured providers", addProvider: "Add or update provider", providerType: "Provider type", providerId: "Provider ID (blank = auto)", displayName: "Display name", baseUrl: "Base URL", defaultModel: "Default model (optional)", apiKey: "API key / token (optional for local models)", saveProvider: "Save provider", clearForm: "Clear form", noKey: "No key is requested on page load. Enter one only when you choose to configure it.", activeModel: "Active model", modelId: "Model ID", setModel: "Set model", loadModels: "Load available models", preferences: "Preferences", preferFree: "Prefer free models when suitable", memoryTitle: "Project Memory", memoryDesc: "Save project notes that H2O can retrieve as context for future tasks.", addNote: "Add a project note", saveNote: "Save note", searchMemory: "Search memory", searchPlaceholder: "Search saved project notes…", search: "Search", showAll: "Show all", savedNotes: "Saved notes", sessionsTitle: "Session history", sessionsDesc: "Messages and terminal activity recorded in this H2O session.", terminalActivity: "Terminal activity", settingsTitle: "Settings", settingsDesc: "Manage the local dashboard and current workspace.", currentWorkspace: "Current workspace path", changeWorkspace: "Change workspace", sessionStatus: "Session status", safety: "Safety & privacy", localSafety: "Dashboard binds to loopback (127.0.0.1), uses a per-process token and validates Host/Origin. API keys are handled by provider credential storage and are not displayed after saving.", connected: "Dashboard connected to your CLI process", noProviders: "No providers configured yet.", noFiles: "No matching files.", noMemory: "No matching project notes.", noHistory: "Nothing recorded yet.", emptyChat: "A clear space for your next build.", emptyChatDesc: "Ask H2O to inspect a codebase, plan a feature, or help you ship.", credentialReady: "Credential ready", keyNeeded: "Key needed on first use", optionalKey: "API key optional", noKeyNeeded: "No key required", use: "Use", test: "Test", edit: "Edit", remove: "Remove", delete: "Delete", active: "Active", saved: "Saved", copied: "Copied", failed: "Failed", newChatConfirm: "Start a new visible chat? Existing session history remains stored.", removeConfirm: "Remove this provider?", enterPath: "Enter a folder path.", workspaceChanged: "Workspace changed.", noteSaved: "Project note saved.", taskStarted: "Agent task started", taskDone: "Task completed", taskFailed: "Task failed", noProvider: "No provider", model: "Model", queued: "queued", noOutput: "H2O terminal ready.\nRun a command below to begin."
    },
    fa: {
        workspace: "فضای کاری", manage: "مدیریت", overview: "نمای کلی", chat: "گفت‌وگوی هوش مصنوعی", files: "فایل‌ها", terminal: "ترمینال", providers: "ارائه‌دهنده‌ها و مدل‌ها", memory: "حافظه پروژه", sessions: "جلسات", settings: "تنظیمات",
        ready: "آماده", refresh: "تازه‌سازی", good: "فضای کاری، عامل‌ها و ابزارها در یک مکان.", start: "شروع کار", openProject: "باز کردن پروژه", workspaceMetric: "فضای کاری", messages: "پیام‌های گفتگو", terminalRuns: "اجرای ترمینال", queue: "صف", currentProject: "مسیر پروژه فعلی", sessionMessages: "جلسه فعلی H2O", recordedCommands: "دستورهای ثبت‌شده", quickActions: "دسترسی سریع", jump: "شروع سریع جریان کاری", liveActivity: "فعالیت زنده", listening: "در حال گوش‌دادن", ask: "پرسش از H2O", askDesc: "گفتگو، برنامه‌ریزی یا ساخت", explore: "کاوش فایل‌ها", exploreDesc: "مرور و بررسی کدها", runCommand: "اجرای دستور", runDesc: "ترمینال پروژه", configure: "تنظیم هوش مصنوعی", configureDesc: "ارائه‌دهنده‌ها و مدل‌ها",
        aiWorkspace: "فضای کار هوش مصنوعی", shared: "CLI و داشبورد وب از همین جلسه زنده استفاده می‌کنند.", stop: "توقف کار", newChat: "گفتگوی جدید", plan: "برنامه‌ریزی", build: "ساخت", send: "ارسال", composerHint: "Enter برای ارسال · Shift+Enter برای خط جدید", working: "در حال انجام…", projectFiles: "فایل‌های پروژه", browse: "مرور امن فایل‌ها و پیش‌نمایش متن.", refreshFiles: "تازه‌سازی فایل‌ها", openFolder: "مسیر پوشه محلی دیگر…", open: "باز کردن", explorer: "کاوشگر", preview: "پیش‌نمایش", copy: "کپی", terminalTitle: "ترمینال", terminalDesc: "دستورها در مسیر پروژه فعال اجرا می‌شوند. دستورهای پرخطر ممکن است در CLI نیازمند تأیید باشند.", clearOutput: "پاک‌کردن خروجی", run: "اجرا", providersTitle: "ارائه‌دهنده‌ها و مدل‌ها", providersDesc: "اتصال به مدل‌های میزبانی‌شده یا محلی. اعتبارنامه‌ها با مدیر اعتبارنامه سیستم‌عامل ذخیره می‌شوند.", configured: "ارائه‌دهنده‌های تنظیم‌شده", addProvider: "افزودن یا ویرایش ارائه‌دهنده", providerType: "نوع ارائه‌دهنده", providerId: "شناسه ارائه‌دهنده (خالی = خودکار)", displayName: "نام نمایشی", baseUrl: "آدرس پایه", defaultModel: "مدل پیش‌فرض (اختیاری)", apiKey: "کلید API / توکن (برای مدل محلی اختیاری)", saveProvider: "ذخیره ارائه‌دهنده", clearForm: "پاک‌کردن فرم", noKey: "هنگام بارگذاری صفحه کلیدی درخواست نمی‌شود؛ فقط هنگام تنظیم وارد کنید.", activeModel: "مدل فعال", modelId: "شناسه مدل", setModel: "تنظیم مدل", loadModels: "بارگذاری مدل‌های موجود", preferences: "ترجیحات", preferFree: "در صورت مناسب‌بودن مدل رایگان ترجیح داده شود", memoryTitle: "حافظه پروژه", memoryDesc: "یادداشت‌هایی ذخیره کنید تا H2O در کارهای بعدی از آن‌ها استفاده کند.", addNote: "افزودن یادداشت پروژه", saveNote: "ذخیره یادداشت", searchMemory: "جستجوی حافظه", searchPlaceholder: "جستجو در یادداشت‌ها…", search: "جستجو", showAll: "نمایش همه", savedNotes: "یادداشت‌های ذخیره‌شده", sessionsTitle: "تاریخچه جلسه", sessionsDesc: "پیام‌ها و فعالیت ترمینال ثبت‌شده در این جلسه H2O.", terminalActivity: "فعالیت ترمینال", settingsTitle: "تنظیمات", settingsDesc: "مدیریت داشبورد محلی و فضای کاری فعلی.", currentWorkspace: "مسیر فضای کاری فعلی", changeWorkspace: "تغییر فضای کاری", sessionStatus: "وضعیت جلسه", safety: "امنیت و حریم خصوصی", localSafety: "داشبورد روی 127.0.0.1 اجرا می‌شود، از توکن اختصاصی فرایند استفاده می‌کند و Host/Origin را اعتبارسنجی می‌کند. کلیدهای API پس از ذخیره نمایش داده نمی‌شوند.", connected: "داشبورد به فرایند CLI متصل است", noProviders: "هنوز ارائه‌دهنده‌ای تنظیم نشده است.", noFiles: "فایلی مطابق جستجو نیست.", noMemory: "یادداشتی یافت نشد.", noHistory: "هنوز موردی ثبت نشده است.", emptyChat: "فضایی تازه برای ساخت بعدی شما.", emptyChatDesc: "از H2O بخواهید کد را بررسی کند، قابلیت برنامه‌ریزی کند یا در انتشار کمک کند.", credentialReady: "اعتبارنامه آماده", keyNeeded: "کلید در اولین استفاده لازم است", optionalKey: "کلید API اختیاری", noKeyNeeded: "نیازی به کلید نیست", use: "فعال‌سازی", test: "آزمایش", edit: "ویرایش", remove: "حذف", delete: "حذف", active: "فعال", saved: "ذخیره شد", copied: "کپی شد", failed: "ناموفق", newChatConfirm: "گفتگوی نمایشی جدید آغاز شود؟ تاریخچه فعلی حفظ می‌شود.", removeConfirm: "این ارائه‌دهنده حذف شود؟", enterPath: "مسیر پوشه را وارد کنید.", workspaceChanged: "فضای کاری تغییر کرد.", noteSaved: "یادداشت پروژه ذخیره شد.", taskStarted: "کار عامل آغاز شد", taskDone: "کار کامل شد", taskFailed: "کار ناموفق بود", noProvider: "بدون ارائه‌دهنده", model: "مدل", queued: "در صف", noOutput: "ترمینال H2O آماده است.\nبرای شروع دستور وارد کنید."
    }
};
const navGroups = [
    { label: "Chats", items: [["chat", "chat"], ["sessions", "sessions"]] },
    { label: "Workspace", items: [["files", "files"], ["memory", "memory"], ["terminal", "terminal"]] },
    { label: "Configure", items: [["settings", "settings"]] }
];
const pageMeta = {
    overview: ["CONTROL CENTER", "good"], chat: ["WORKSPACE / AI", "aiWorkspace"], files: ["WORKSPACE / EXPLORER", "projectFiles"], terminal: ["WORKSPACE / EXECUTION", "terminalTitle"],
    providers: ["CONFIGURATION / AI", "providersTitle"], memory: ["WORKSPACE / CONTEXT", "memoryTitle"], sessions: ["WORKSPACE / HISTORY", "sessionsTitle"], settings: ["CONFIGURATION / LOCAL", "settingsTitle"]
};
const providerKinds = [["openai", "OpenAI"], ["openai-compatible", "OpenAI-compatible / custom"], ["openrouter", "OpenRouter"], ["anthropic", "Anthropic"], ["gemini", "Google Gemini"], ["ollama", "Ollama (local)"], ["lm-studio", "LM Studio (local)"], ["github-copilot", "GitHub Copilot (official SDK)"]];
function App() {
    const [page, setPage] = useState(() => { try {
        const p = JSON.parse(localStorage.getItem("h2o-web-settings") || "{}");
        return ["overview", "chat", "files", "terminal"].includes(p.startPage) ? p.startPage : "chat";
    }
    catch {
        return "overview";
    } });
    const [theme, setTheme] = useState(() => { try {
        return localStorage.getItem("h2o-theme") || "dark";
    }
    catch {
        return "dark";
    } });
    const [lang, setLang] = useState(() => { try {
        return localStorage.getItem("h2o-language") || "en";
    }
    catch {
        return "en";
    } });
    const [collapsed, setCollapsed] = useState(() => { try {
        return localStorage.getItem("h2o-sidebar") === "collapsed";
    }
    catch {
        return false;
    } });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [status, setStatus] = useState({});
    const [mode, setMode] = useState("build");
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [queue, setQueue] = useState(0);
    const [activities, setActivities] = useState([{ title: "H2O is ready", detail: "Dashboard connected to your CLI process" }]);
    const [toast, setToast] = useState("");
    const [files, setFiles] = useState([]);
    const [fileSearch, setFileSearch] = useState("");
    const [selectedFile, setSelectedFile] = useState("");
    const [fileContent, setFileContent] = useState("");
    const [workspaceInput, setWorkspaceInput] = useState("");
    const [terminalInput, setTerminalInput] = useState("");
    const [terminalOutput, setTerminalOutput] = useState("H2O terminal ready.\nRun a command below to begin.");
    const [providers, setProviders] = useState([]);
    const [providerForm, setProviderForm] = useState({ kind: "openai", id: "", name: "", baseUrl: "", defaultModel: "", apiKey: "" });
    const [modelInput, setModelInput] = useState("");
    const [models, setModels] = useState([]);
    const [memory, setMemory] = useState([]);
    const [memoryInput, setMemoryInput] = useState("");
    const [memoryQuery, setMemoryQuery] = useState("");
    const [history, setHistory] = useState({ messages: [], terminal: [] });
    const [historyBusy, setHistoryBusy] = useState(false);
    const [terminalBusy, setTerminalBusy] = useState(false);
    const [fileBusy, setFileBusy] = useState(false);
    const feedRef = useRef(null), messageRef = useRef(null), toastRef = useRef(null), fileRequest = useRef(0);
    const t = (key) => copy[lang][key] || copy.en[key] || key;
    const notify = useCallback((text) => { setToast(text); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(""), 2800); }, []);
    const addActivity = useCallback((title, detail) => setActivities(prev => [{ title, detail }, ...prev].slice(0, 7)), []);
    const addMessage = useCallback((role, content, at = new Date().toISOString()) => setMessages(prev => [...prev, { role, content: String(content), at }]), []);
    const refreshStatus = useCallback(async () => { try {
        const s = await api("/api/status");
        setStatus(s);
        setMode(s.mode || "build");
        setQueue(s.queueLength || 0);
    }
    catch { } }, []);
    const loadHistory = useCallback(async () => { try {
        const h = await api("/api/history");
        setHistory(h);
        setMessages(h.messages || []);
        setTerminalOutput((h.terminal || []).map(x => "$ " + x.command + "\n" + x.output).join("\n\n") || t("noOutput"));
    }
    catch (e) {
        notify(e.message);
    } }, [lang, notify]);
    const loadFiles = useCallback(async () => { setFileBusy(true); try {
        const r = await api("/api/files");
        setFiles(r.files || []);
    }
    catch (e) {
        notify(e.message);
    }
    finally {
        setFileBusy(false);
    } }, [notify]);
    const loadProviders = useCallback(async () => { try {
        const r = await api("/api/providers");
        setProviders(r.providers || []);
    }
    catch (e) {
        notify(e.message);
    } }, [notify]);
    const loadMemory = useCallback(async (query = "") => { try {
        const r = await api("/api/memory" + (query ? "?q=" + encodeURIComponent(query) : ""));
        setMemory(r.items || []);
    }
    catch (e) {
        notify(e.message);
    } }, [notify]);
    const refreshAll = async () => { await refreshStatus(); if (page === "files")
        await loadFiles(); if (page === "providers")
        await loadProviders(); notify(t("refresh") + " complete"); };
    useEffect(() => { document.documentElement.dataset.theme = theme; try {
        localStorage.setItem("h2o-theme", theme);
    }
    catch { } }, [theme]);
    useEffect(() => { document.documentElement.lang = lang === "fa" ? "fa" : "en"; document.documentElement.dir = lang === "fa" ? "rtl" : "ltr"; try {
        localStorage.setItem("h2o-language", lang);
    }
    catch { } }, [lang]);
    useEffect(() => { try {
        localStorage.setItem("h2o-sidebar", collapsed ? "collapsed" : "expanded");
    }
    catch { } }, [collapsed]);
    useEffect(() => { const onKeyDown = e => { if (!(e.ctrlKey || e.metaKey) || e.altKey)
        return; const key = e.key.toLowerCase(); if (key === ",") {
        e.preventDefault();
        setPage("settings");
    }
    else if (key === "k") {
        e.preventDefault();
        setPage("settings");
        requestAnimationFrame(() => document.querySelector(".settings-search input")?.focus());
    }
    else if (key === "l" && e.shiftKey) {
        e.preventDefault();
        setTheme(v => v === "dark" ? "light" : "dark");
    } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [setTheme]);
    useEffect(() => { refreshStatus(); loadHistory(); loadProviders(); const timer = setInterval(refreshStatus, 5000); return () => clearInterval(timer); }, [refreshStatus, loadHistory, loadProviders]);
    useEffect(() => { if (feedRef.current)
        feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [messages, busy]);
    useEffect(() => { if (page === "files")
        loadFiles(); if (page === "providers" || page === "settings")
        loadProviders(); if (page === "memory")
        loadMemory(); if (page === "sessions") {
        setHistoryBusy(true);
        api("/api/history").then(setHistory).catch(e => notify(e.message)).finally(() => setHistoryBusy(false));
    } }, [page, loadFiles, loadProviders, loadMemory, notify]);
    useEffect(() => {
        const source = new EventSource("/api/events?token=" + encodeURIComponent(TOKEN));
        const names = ["task.started", "task.progress", "task.completed", "task.failed", "task.cancelled", "queue.updated", "provider.changed", "model.changed", "workspace.changed", "message.created"];
        names.forEach(name => source.addEventListener(name, e => {
            let d = {};
            try {
                d = JSON.parse(e.data);
            }
            catch { }
            if (name === "task.started") {
                setBusy(true);
                addActivity(copy[lang].taskStarted, "H2O is processing your request");
            }
            if (name === "task.progress")
                setBusy(true);
            if (name === "task.completed") {
                setBusy(false);
                addActivity(copy[lang].taskDone, "Agent finished the current task");
            }
            if (name === "task.failed") {
                setBusy(false);
                addActivity(copy[lang].taskFailed, d.error || "See chat for details");
            }
            if (name === "task.cancelled")
                setBusy(false);
            if (name === "queue.updated")
                setQueue(d.length || 0);
            if (name === "workspace.changed")
                refreshStatus();
            if (name === "message.created" && d.message && d.message.role !== "user")
                addMessage(d.message.role, d.message.content, d.message.at);
            if (name === "provider.changed" || name === "model.changed")
                loadProviders();
            refreshStatus();
        }));
        source.onerror = () => { };
        return () => source.close();
    }, [addActivity, addMessage, loadProviders, refreshStatus, lang]);
    const navigate = (next) => { setPage(next); setMobileOpen(false); if (next === "chat")
        setTimeout(() => messageRef.current?.focus(), 80); };
    const send = async () => { const value = message.trim(); if (!value || busy)
        return; setMessage(""); addMessage("user", value); setBusy(true); try {
        const r = await api("/api/chat", { message: value });
        if (typeof r.result === "string" && r.result.startsWith("Provider credentials are missing.")) {
            notify("Configure a provider credential in Providers & Models, then retry.");
            addMessage("system", r.result);
        }
        await refreshStatus();
    }
    catch (e) {
        addMessage("system", e.message);
        notify(e.message);
    }
    finally {
        setBusy(false);
    } };
    const setAgentMode = async (next) => { try {
        await api("/api/mode", { mode: next });
        setMode(next);
    }
    catch (e) {
        notify(e.message);
    } };
    const newChat = async () => { if (!confirm(t("newChatConfirm")))
        return; try {
        await api("/api/new", {});
        setMessages([]);
        notify(t("newChat"));
    }
    catch (e) {
        notify(e.message);
    } };
    const openFile = async (path) => { if (path.endsWith("/")) {
        setFileSearch(path);
        return;
    } const id = ++fileRequest.current; setSelectedFile(path); setFileContent("Loading…"); try {
        const r = await api("/api/file", { path });
        if (id === fileRequest.current)
            setFileContent(r.content);
    }
    catch (e) {
        if (id === fileRequest.current)
            setFileContent(e.message);
    } };
    const filteredFiles = useMemo(() => { const hidden = (value) => { const p = String(value || "").replaceAll("\\", "/").toLowerCase(); return p.split("/").some(part => part === "node_modules" || part === ".git" || part.startsWith("backup-") || part.startsWith("backup_") || part === ".cache") || p === "assets/bubb.txt" || p.endsWith("/bubb.txt") || p.includes("bubb-"); }; const visible = files.filter(file => !hidden(file)); const folders = new Set(); visible.forEach(file => { const parts = file.split("/"); for (let i = 1; i < parts.length; i++) {
        const folder = parts.slice(0, i).join("/") + "/";
        if (!hidden(folder))
            folders.add(folder);
    } }); return [...[...folders].map(path => ({ path, dir: true })), ...visible.map(path => ({ path, dir: false }))].filter(x => x.path.toLowerCase().includes(fileSearch.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path)); }, [files, fileSearch]);
    const runTerminal = async () => { const command = terminalInput.trim(); if (!command)
        return; setTerminalInput(""); setTerminalOutput(prev => prev + "$ " + command + "\n"); setTerminalBusy(true); try {
        const r = await api("/api/terminal", { command });
        setTerminalOutput(prev => prev + r.result + "\n");
        await refreshStatus();
    }
    catch (e) {
        setTerminalOutput(prev => prev + e.message + "\n");
    }
    finally {
        setTerminalBusy(false);
    } };
    const saveProvider = async () => { try {
        const data = { id: providerForm.id.trim() || undefined, kind: providerForm.kind, name: providerForm.name.trim(), baseUrl: providerForm.baseUrl.trim(), defaultModel: providerForm.defaultModel.trim(), apiKey: providerForm.apiKey || undefined };
        await api("/api/providers", data);
        setProviderForm(v => ({ ...v, apiKey: "" }));
        notify(t("saved"));
        await loadProviders();
    }
    catch (e) {
        notify(e.message);
    } };
    const providerAction = async (action, p) => { try {
        if (action === "remove" && !confirm(t("removeConfirm")))
            return;
        if (action === "edit") {
            setProviderForm({ kind: p.kind, id: p.id, name: p.name, baseUrl: p.baseUrl || "", defaultModel: p.defaultModel || "", apiKey: "" });
            return;
        }
        if (action === "use") {
            const r = await api("/api/providers/active", { id: p.id });
            notify("Active provider: " + r.active.name);
        }
        if (action === "test") {
            const r = await api("/api/providers/test", { id: p.id });
            notify("Connected · " + r.result.modelCount + " models");
        }
        if (action === "remove")
            await api("/api/providers/" + encodeURIComponent(p.id), { _method: "DELETE" });
        await loadProviders();
        await refreshStatus();
    }
    catch (e) {
        notify(e.message);
    } };
    const loadModels = async () => { try {
        const r = await api("/api/models");
        setModels((r.models || []).slice(0, 60));
    }
    catch (e) {
        notify(e.message);
    } };
    const loadMem = async () => loadMemory(memoryQuery.trim());
    const saveMemory = async () => { const content = memoryInput.trim(); if (!content)
        return; try {
        await api("/api/memory", { content });
        setMemoryInput("");
        notify(t("noteSaved"));
        await loadMemory();
    }
    catch (e) {
        notify(e.message);
    } };
    const pageTitle = t(pageMeta[page][1]);
    const subtitle = page === "overview" ? t("good") : page === "chat" ? t("shared") : page === "files" ? t("browse") : page === "terminal" ? t("terminalDesc") : page === "providers" ? t("providersDesc") : page === "memory" ? t("memoryDesc") : page === "sessions" ? t("sessionsDesc") : t("settingsDesc");
    return React.createElement("div", { className: "app-shell" + (collapsed ? " is-collapsed" : ""), dir: lang === "fa" ? "rtl" : "ltr" },
        React.createElement("header", { className: "topbar" },
            React.createElement("div", { className: "top-left" },
                React.createElement("button", { className: "icon-button", onClick: () => window.matchMedia("(max-width: 760px)").matches ? setMobileOpen(v => !v) : setCollapsed(v => !v), "aria-label": "Toggle navigation" },
                    React.createElement(Icon, { name: "menu", size: 18 })),
                React.createElement("div", { className: "brand" },
                    React.createElement("div", { className: "brand-mark" }, "H"),
                    React.createElement("div", null,
                        React.createElement("div", { className: "brand-name" }, "H2O"),
                        React.createElement("div", { className: "brand-caption" }, "LOCAL AI WORKSPACE")))),
            React.createElement("div", { className: "top-actions" },
                React.createElement("div", { className: "top-status" },
                    React.createElement("span", { className: "status-dot" }),
                    React.createElement("span", null, status.status || t("ready"))),
                React.createElement("button", { className: "icon-button", title: "Language", onClick: () => setLang(v => v === "en" ? "fa" : "en"), "aria-label": "Switch language" },
                    React.createElement("span", { style: { fontSize: 10, fontWeight: 800 } }, lang === "en" ? "FA" : "EN")),
                React.createElement("button", { className: "icon-button", title: "Toggle theme", onClick: () => setTheme(v => v === "dark" ? "light" : "dark"), "aria-label": "Toggle theme" },
                    React.createElement(Icon, { name: theme === "dark" ? "sun" : "moon" })),
                React.createElement("button", { className: "icon-button", title: t("refresh"), onClick: refreshAll, "aria-label": t("refresh") },
                    React.createElement(Icon, { name: "refresh" })),
                React.createElement("button", { className: "button small", onClick: async () => { try {
                        await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
                        localStorage.removeItem("h2o-user-name");
                        location.reload();
                    }
                    catch {
                        location.reload();
                    } } }, "Sign out"))),
        React.createElement("div", { className: "mobile-overlay" + (mobileOpen ? " show" : ""), onClick: () => setMobileOpen(false) }),
        React.createElement("aside", { className: "sidebar" + (mobileOpen ? " mobile-open" : "") },
            navGroups.map(group => React.createElement("div", { className: "sidebar-group", key: group.label },
                React.createElement("div", { className: "sidebar-label" }, t(group.label)),
                React.createElement("nav", { className: "nav-list" }, group.items.map(([id, icon]) => React.createElement("button", { key: id, className: "nav-item" + (page === id ? " active" : ""), onClick: () => navigate(id), title: collapsed ? t(id) : undefined },
                    React.createElement("span", { className: "nav-icon" },
                        React.createElement(Icon, { name: icon })),
                    React.createElement("span", { className: "nav-text" }, t(id))))))),
            React.createElement("div", { className: "sidebar-bottom" },
                React.createElement("div", { className: "sidebar-bottom-label" }, t("workspace").toUpperCase()),
                React.createElement("div", { className: "sidebar-bottom-path" }, status.workspace || "Loading…"),
                React.createElement("button", { className: "button small", style: { width: "100%" }, onClick: () => navigate("files") },
                    React.createElement(Icon, { name: "folder", size: 13 }),
                    !collapsed && t("explore")))),
        React.createElement("main", { className: "main" },
            React.createElement("div", { className: "page", key: page },
                React.createElement("div", { className: "page-header" },
                    React.createElement("div", null,
                        React.createElement("div", { className: "eyebrow" },
                            "H2O / ",
                            pageMeta[page][0]),
                        React.createElement("h1", { className: "page-title" }, page === "overview" ? (lang === "fa" ? "خوش آمدید." : "Good to see you.") : pageTitle),
                        React.createElement("p", { className: "page-description" }, subtitle)),
                    page === "overview" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button primary", onClick: () => navigate("chat") },
                            "\u2726 ",
                            t("start")),
                        React.createElement("button", { className: "button", onClick: () => navigate("files") }, t("openProject"))),
                    page === "chat" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button danger", onClick: async () => { try {
                                const r = await api("/api/cancel", {});
                                notify(r.result);
                            }
                            catch (e) {
                                notify(e.message);
                            } } },
                            React.createElement(Icon, { name: "stop", size: 13 }),
                            t("stop")),
                        React.createElement("button", { className: "button", onClick: newChat }, t("newChat"))),
                    page === "files" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button", onClick: loadFiles },
                            React.createElement(Icon, { name: "refresh", size: 13 }),
                            t("refreshFiles"))),
                    page === "sessions" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button", onClick: loadHistory },
                            React.createElement(Icon, { name: "refresh", size: 13 }),
                            t("refresh"))),
                    page === "providers" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button", onClick: loadProviders },
                            React.createElement(Icon, { name: "refresh", size: 13 }),
                            t("refresh"))),
                    page === "memory" && React.createElement("div", { className: "header-actions" },
                        React.createElement("button", { className: "button", onClick: () => loadMemory() },
                            React.createElement(Icon, { name: "refresh", size: 13 }),
                            t("refresh")))),
                page === "overview" && React.createElement(Overview, { status: status, activities: activities, t: t, navigate: navigate }),
                page === "chat" && React.createElement("section", { className: "chat-workspace" },
                    React.createElement("div", { className: "chat-topline" },
                        React.createElement("div", { className: "chat-mode" },
                            React.createElement("button", { className: mode === "plan" ? "active" : "", onClick: () => setAgentMode("plan") }, t("plan")),
                            React.createElement("button", { className: mode === "build" ? "active" : "", onClick: () => setAgentMode("build") }, t("build"))),
                        React.createElement("div", { className: "chat-top-actions" },
                            React.createElement("span", { className: "model-chip" },
                                status.provider || t("noProvider"),
                                " ",
                                React.createElement("span", null, "\u00B7"),
                                " ",
                                status.model || "auto"),
                            React.createElement("button", { className: "icon-button", title: "New chat", onClick: newChat },
                                React.createElement(Icon, { name: "plus" })))),
                    React.createElement("div", { className: "chat-stage", ref: feedRef },
                        !messages.length && !busy && React.createElement("div", { className: "welcome-block" },
                            React.createElement("div", { className: "welcome-orbit" },
                                React.createElement("span", null, "H")),
                            React.createElement("div", { className: "welcome-eyebrow" }, "YOUR LOCAL AI WORKSPACE"),
                            React.createElement("h1", null,
                                "Hello, ",
                                (() => { try {
                                    return (localStorage.getItem("h2o-user-name") || "there").split(/[ @]/)[0];
                                }
                                catch {
                                    return "there";
                                } })(),
                                "."),
                            React.createElement("p", null, "What can I help you with today?")),
                        messages.map((m, i) => React.createElement("div", { className: "message " + m.role, key: i },
                            React.createElement("div", { className: "message-avatar" }, m.role === "user" ? "Y" : m.role === "assistant" ? "H" : "·"),
                            React.createElement("div", null,
                                React.createElement("div", { className: "message-meta" },
                                    m.role === "user" ? "YOU" : m.role === "assistant" ? "H2O" : "SYSTEM",
                                    readWebPref("showTimestamps", true) ? " · " + (m.at ? new Date(m.at).toLocaleTimeString() : "Now") : ""),
                                React.createElement("div", { className: "message-body" },
                                    React.createElement(FormattedMessage, { content: m.content }))))),
                        busy && React.createElement("div", { className: "message assistant" },
                            React.createElement("div", { className: "message-avatar" }, "H"),
                            React.createElement("div", null,
                                React.createElement("div", { className: "message-meta" }, "H2O"),
                                React.createElement("div", { className: "message-body muted" }, "Working\u2026")))),
                    React.createElement("div", { className: "composer-dock" },
                        React.createElement("div", { className: "composer-card" },
                            React.createElement("textarea", { "aria-label": "Message H2O", ref: messageRef, value: message, onChange: e => setMessage(e.target.value), onKeyDown: e => { if (e.key === "Enter" && !e.shiftKey && readWebPref("chatEnter", true)) {
                                    e.preventDefault();
                                    send();
                                } }, placeholder: "How can I help you today?", rows: 3 }),
                            React.createElement("div", { className: "composer-controls" },
                                React.createElement("div", { className: "composer-tools" },
                                    React.createElement("button", { className: "tool-button", title: "Attach file", onClick: () => navigate("files") },
                                        React.createElement(Icon, { name: "plus" })),
                                    React.createElement("button", { className: "tool-button", title: "Tools and settings", onClick: () => navigate("settings") },
                                        React.createElement(Icon, { name: "sliders" })),
                                    React.createElement("span", { className: "composer-hint" }, mode === "plan" ? "Planning mode" : "H2O workspace")),
                                React.createElement("div", { className: "composer-submit" },
                                    React.createElement("span", { className: "model-select-label" }, status.model || "Auto model"),
                                    React.createElement("button", { className: "send-button", onClick: send, disabled: !message.trim() || busy, "aria-label": t("send") },
                                        React.createElement(Icon, { name: "send" }))))),
                        React.createElement("div", { className: "composer-foot" },
                            React.createElement("span", null, busy ? "H2O is working…" : "Enter to send · Shift + Enter for a new line"),
                            React.createElement("span", null,
                                queue,
                                " queued")))),
                page === "files" && React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "surface workspace-strip" },
                        React.createElement("span", { className: "path-text" }, status.workspace || "Loading workspace…"),
                        React.createElement("input", { className: "input", style: { maxWidth: 310 }, value: workspaceInput, onChange: e => setWorkspaceInput(e.target.value), placeholder: t("openFolder") }),
                        React.createElement("button", { className: "button primary", onClick: async () => { if (!workspaceInput.trim())
                                return notify(t("enterPath")); try {
                                await api("/api/workspace", { path: workspaceInput.trim() });
                                setWorkspaceInput("");
                                setSelectedFile("");
                                await refreshStatus();
                                await loadFiles();
                                notify(t("workspaceChanged"));
                            }
                            catch (e) {
                                notify(e.message);
                            } } }, t("open"))),
                    React.createElement("div", { className: "two-pane" },
                        React.createElement("section", { className: "surface" },
                            React.createElement("div", { className: "section-heading" },
                                t("explorer"),
                                " ",
                                React.createElement("small", null,
                                    filteredFiles.length,
                                    " items")),
                            React.createElement("input", { "aria-label": "Filter project files", className: "input", value: fileSearch, onChange: e => setFileSearch(e.target.value), placeholder: "Filter files\u2026" }),
                            React.createElement("div", { className: "file-list" }, fileBusy ? React.createElement("div", { className: "empty-state" }, "Loading files\u2026") : filteredFiles.length ? filteredFiles.map(f => React.createElement("button", { key: f.path, className: "file-row" + (selectedFile === f.path ? " active" : ""), onClick: () => openFile(f.path) },
                                React.createElement("span", null, f.dir ? "▸" : "·"),
                                React.createElement("span", { className: "file-name" }, f.path))) : React.createElement("div", { className: "empty-state" }, t("noFiles")))),
                        React.createElement("section", { className: "surface" },
                            React.createElement("div", { className: "section-heading" },
                                selectedFile || t("preview"),
                                React.createElement("button", { className: "button small", disabled: !selectedFile || !fileContent || fileContent === "Loading…", onClick: async () => { try {
                                        await navigator.clipboard.writeText(fileContent);
                                        notify(t("copied"));
                                    }
                                    catch {
                                        notify("Clipboard permission unavailable.");
                                    } } },
                                    React.createElement(Icon, { name: "copy", size: 12 }),
                                    t("copy"))),
                            React.createElement("pre", { className: "file-preview" }, fileContent || "Select a text file from the explorer to preview it here.")))),
                page === "terminal" && React.createElement("section", { className: "terminal" },
                    React.createElement("div", { className: "terminal-head" },
                        React.createElement("span", null, "\u25CF \u25CF \u25CF \u00A0 H2O TERMINAL"),
                        React.createElement("span", null, status.workspace || "Workspace shell")),
                    React.createElement("pre", { className: "terminal-output", id: "terminal-output", style: { whiteSpace: readWebPref("terminalWrap", true) ? "pre-wrap" : "pre", fontSize: readWebPref("terminalFont", "13") + "px" } }, terminalOutput),
                    React.createElement("div", { className: "terminal-input" },
                        React.createElement("input", { "aria-label": "Terminal command", className: "input", value: terminalInput, onChange: e => setTerminalInput(e.target.value), onKeyDown: e => { if (e.key === "Enter")
                                runTerminal(); }, placeholder: "e.g. npm test", autoComplete: "off" }),
                        React.createElement("button", { className: "button primary", disabled: terminalBusy || !terminalInput.trim(), onClick: runTerminal },
                            terminalBusy ? "…" : t("run"),
                            " \u21B5"),
                        React.createElement("button", { className: "button", onClick: () => setTerminalOutput("Terminal output cleared.\n") }, t("clearOutput")))),
                page === "providers" && React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "grid provider-grid" },
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" },
                                t("configured"),
                                React.createElement("small", null, providers.length)),
                            providers.length ? providers.map(p => React.createElement("div", { className: "provider-item", key: p.id },
                                React.createElement("div", { className: "provider-top" },
                                    React.createElement("div", { className: "provider-name" },
                                        p.active ? "● " : "",
                                        p.name),
                                    React.createElement("span", { className: "badge" }, p.kind)),
                                React.createElement("div", { className: "provider-meta" },
                                    p.id,
                                    " \u00B7 ",
                                    p.credentialConfigured ? t("credentialReady") : p.credentialRequired ? t("keyNeeded") : p.credentialOptional ? t("optionalKey") : t("noKeyNeeded")),
                                React.createElement("div", { className: "provider-actions" },
                                    React.createElement("button", { className: "button", onClick: () => providerAction("use", p) }, t("use")),
                                    React.createElement("button", { className: "button", onClick: () => providerAction("test", p) }, t("test")),
                                    React.createElement("button", { className: "button", onClick: () => providerAction("edit", p) }, t("edit")),
                                    React.createElement("button", { className: "button danger", onClick: () => providerAction("remove", p) }, t("remove"))))) : React.createElement("div", { className: "empty-state" }, t("noProviders"))),
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" }, t("addProvider")),
                            React.createElement("div", { className: "form-grid" },
                                React.createElement(Field, { label: t("providerType") },
                                    React.createElement("select", { className: "select", value: providerForm.kind, onChange: e => setProviderForm(v => ({ ...v, kind: e.target.value })) }, providerKinds.map(([v, l]) => React.createElement("option", { value: v, key: v }, l)))),
                                React.createElement(Field, { label: t("providerId") },
                                    React.createElement("input", { className: "input", value: providerForm.id, onChange: e => setProviderForm(v => ({ ...v, id: e.target.value })), placeholder: "my-provider" })),
                                React.createElement(Field, { label: t("displayName") },
                                    React.createElement("input", { className: "input", value: providerForm.name, onChange: e => setProviderForm(v => ({ ...v, name: e.target.value })), placeholder: "My AI provider" })),
                                React.createElement(Field, { label: t("baseUrl") },
                                    React.createElement("input", { className: "input", value: providerForm.baseUrl, onChange: e => setProviderForm(v => ({ ...v, baseUrl: e.target.value })), placeholder: "https://api.example.com/v1" })),
                                React.createElement(Field, { label: t("defaultModel"), span: true },
                                    React.createElement("input", { className: "input", value: providerForm.defaultModel, onChange: e => setProviderForm(v => ({ ...v, defaultModel: e.target.value })), placeholder: "model-id" })),
                                React.createElement(Field, { label: t("apiKey"), span: true },
                                    React.createElement("input", { className: "input", type: "password", autoComplete: "off", value: providerForm.apiKey, onChange: e => setProviderForm(v => ({ ...v, apiKey: e.target.value })), placeholder: "Requested only when needed" }))),
                            React.createElement("div", { className: "form-actions" },
                                React.createElement("button", { className: "button primary", onClick: saveProvider }, t("saveProvider")),
                                React.createElement("button", { className: "button", onClick: () => setProviderForm({ kind: "openai", id: "", name: "", baseUrl: "", defaultModel: "", apiKey: "" }) }, t("clearForm"))),
                            React.createElement("p", { className: "stat-foot" }, t("noKey")))),
                    React.createElement("div", { className: "grid split-grid", style: { marginTop: 14 } },
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" }, t("activeModel")),
                            React.createElement(Field, { label: t("modelId") },
                                React.createElement("input", { className: "input", value: modelInput, onChange: e => setModelInput(e.target.value), placeholder: "auto" })),
                            React.createElement("div", { className: "form-actions" },
                                React.createElement("button", { className: "button primary", onClick: async () => { try {
                                        const r = await api("/api/model", { model: modelInput });
                                        notify("Model set: " + r.model);
                                        refreshStatus();
                                    }
                                    catch (e) {
                                        notify(e.message);
                                    } } }, t("setModel")),
                                React.createElement("button", { className: "button", onClick: loadModels }, t("loadModels"))),
                            models.length > 0 && React.createElement("div", { className: "list-stack", style: { marginTop: 12 } }, models.map(m => React.createElement("button", { key: m.id, className: "button", style: { justifyContent: "space-between" }, onClick: () => setModelInput(m.id) },
                                m.id,
                                m.free && React.createElement("span", { className: "badge" }, "FREE"))))),
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" }, t("preferences")),
                            React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 9, fontSize: 12 } },
                                React.createElement("input", { type: "checkbox", checked: status.preferFreeModels !== false, onChange: async (e) => { try {
                                        await api("/api/preferences/free-models", { enabled: e.target.checked });
                                        setStatus(s => ({ ...s, preferFreeModels: e.target.checked }));
                                    }
                                    catch (err) {
                                        notify(err.message);
                                    } } }),
                                t("preferFree")),
                            React.createElement("p", { className: "stat-foot" }, "Auto routing uses provider metadata and task heuristics.")))),
                page === "memory" && React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "grid split-grid" },
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" }, t("addNote")),
                            React.createElement("textarea", { className: "textarea", value: memoryInput, onChange: e => setMemoryInput(e.target.value), placeholder: "Example: This project uses React, Vite and Tailwind. Keep components accessible." }),
                            React.createElement("div", { className: "form-actions" },
                                React.createElement("button", { className: "button primary", onClick: saveMemory, disabled: !memoryInput.trim() }, t("saveNote")))),
                        React.createElement("section", { className: "surface" },
                            React.createElement("h3", { className: "section-heading" }, t("searchMemory")),
                            React.createElement("input", { className: "input", value: memoryQuery, onChange: e => setMemoryQuery(e.target.value), placeholder: t("searchPlaceholder"), onKeyDown: e => e.key === "Enter" && loadMem() }),
                            React.createElement("div", { className: "form-actions" },
                                React.createElement("button", { className: "button primary", onClick: loadMem }, t("search")),
                                React.createElement("button", { className: "button", onClick: () => { setMemoryQuery(""); loadMemory(); } }, t("showAll"))),
                            React.createElement("p", { className: "stat-foot" }, "Memory is local to the current workspace."))),
                    React.createElement("section", { className: "surface", style: { marginTop: 14 } },
                        React.createElement("h3", { className: "section-heading" },
                            t("savedNotes"),
                            React.createElement("small", null, memory.length)),
                        React.createElement("div", { className: "list-stack" }, memory.length ? memory.map(m => React.createElement("div", { className: "list-item", key: m.id },
                            React.createElement("div", { className: "provider-top" },
                                React.createElement("b", { style: { fontSize: 11 } },
                                    "#",
                                    m.id,
                                    " \u00B7 ",
                                    m.kind || "project"),
                                React.createElement("button", { className: "button small danger", onClick: async () => { try {
                                        await api("/api/memory/remove", { id: m.id });
                                        await loadMemory(memoryQuery);
                                    }
                                    catch (e) {
                                        notify(e.message);
                                    } } },
                                    React.createElement(Icon, { name: "trash", size: 12 }),
                                    t("delete"))),
                            React.createElement("p", null, m.content))) : React.createElement("div", { className: "empty-state" }, t("noMemory"))))),
                page === "sessions" && React.createElement("div", { className: "grid split-grid" },
                    React.createElement("section", { className: "surface" },
                        React.createElement("h3", { className: "section-heading" },
                            t("messages"),
                            React.createElement("small", null, history.messages?.length || 0)),
                        historyBusy ? React.createElement("div", { className: "empty-state" }, "Loading\u2026") : history.messages?.length ? [...history.messages].reverse().slice(0, 50).map((m, i) => React.createElement(HistoryItem, { key: i, title: m.role + ": " + m.content, at: m.at })) : React.createElement("div", { className: "empty-state" }, t("noHistory"))),
                    React.createElement("section", { className: "surface" },
                        React.createElement("h3", { className: "section-heading" },
                            t("terminalActivity"),
                            React.createElement("small", null, history.terminal?.length || 0)),
                        history.terminal?.length ? [...history.terminal].reverse().slice(0, 50).map((m, i) => React.createElement(HistoryItem, { key: i, title: "$ " + m.command + "\n" + m.output, at: m.at })) : React.createElement("div", { className: "empty-state" }, t("noHistory")))),
                page === "settings" && React.createElement(SettingsPanel, { theme: theme, setTheme: setTheme, lang: lang, setLang: setLang, collapsed: collapsed, setCollapsed: setCollapsed, status: status, providers: providers, history: history, notify: notify, navigate: navigate, refreshStatus: refreshStatus, loadProviders: loadProviders }))),
        toast && React.createElement("div", { className: "toast", role: "status", "aria-live": "polite" }, toast));
}
const SETTINGS_SECTIONS = [
    ["general", "General", "عمومی", "sliders"], ["appearance", "Appearance", "ظاهر", "sun"], ["language", "Language & Region", "زبان و منطقه", "globe"], ["workspace", "Workspace", "فضای کاری", "folder"], ["provider", "Default Provider & Model", "ارائه‌دهنده و مدل", "cpu"], ["model", "Model-specific preferences", "ترجیحات مدل", "layers"], ["response", "Response behavior", "رفتار پاسخ", "message"], ["fallback", "Fallback model", "مدل جایگزین", "repeat"], ["chat", "Chat preferences", "ترجیحات گفتگو", "chat"], ["terminal", "Terminal preferences", "ترجیحات ترمینال", "terminal"], ["sidebar", "Sidebar customization", "نوار کناری", "panel-left"], ["shortcuts", "Keyboard shortcuts", "میانبرها", "keyboard"], ["privacy", "Privacy & Security", "حریم خصوصی و امنیت", "shield"], ["health", "System Health", "سلامت سیستم", "activity"], ["diagnostics", "Diagnostics & Logs", "عیب‌یابی و گزارش‌ها", "file-text"], ["backup", "Import / Export Settings", "ورود و خروجی تنظیمات", "database"], ["experimental", "Experimental Features", "قابلیت‌های آزمایشی", "flask"]
];
const PREF_DEFAULTS = { density: "comfortable", fontScale: "100", animations: true, locale: "auto", timezone: "local", startPage: "overview", chatEnter: true, showTimestamps: true, terminalWrap: true, terminalFont: "13", experimentalBadges: false, modelNotes: {} };
function SettingsPanel({ theme, setTheme, lang, setLang, collapsed, setCollapsed, status, providers, history, notify, navigate, refreshStatus, loadProviders }) {
    const [section, setSection] = useState("general"), [query, setQuery] = useState(""), [prefs, setPrefs] = useState(() => { try {
        return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem("h2o-web-settings") || "{}") };
    }
    catch {
        return { ...PREF_DEFAULTS };
    } }), [modelDraft, setModelDraft] = useState(""), [importError, setImportError] = useState(""), [healthBusy, setHealthBusy] = useState(false);
    const tr = (en, fa) => lang === "fa" ? fa : en;
    useEffect(() => { try {
        localStorage.setItem("h2o-web-settings", JSON.stringify(prefs));
    }
    catch {
        notify("Could not save Web preferences.");
    } document.documentElement.dataset.motion = prefs.animations ? "on" : "off"; }, [prefs]);
    const update = (k, v) => setPrefs(p => ({ ...p, [k]: v })), filtered = SETTINGS_SECTIONS.filter(x => (x[1] + " " + x[2]).toLowerCase().includes(query.toLowerCase())), current = SETTINGS_SECTIONS.find(x => x[0] === section) || SETTINGS_SECTIONS[0];
    const row = (name, desc, control) => React.createElement("div", { className: "settings-row" },
        React.createElement("div", null,
            React.createElement("b", null, name),
            React.createElement("small", null, desc)),
        React.createElement("div", { className: "settings-control" }, control));
    const select = (value, onChange, opts) => React.createElement("select", { className: "select settings-select", value: value, onChange: e => onChange(e.target.value) }, opts.map(([v, l]) => React.createElement("option", { value: v, key: v }, l)));
    const toggle = (checked, onChange, label) => React.createElement("label", { className: "settings-toggle" },
        React.createElement("input", { type: "checkbox", checked: !!checked, onChange: e => onChange(e.target.checked) }),
        React.createElement("span", null, label));
    const card = (title, desc, body) => React.createElement("section", { className: "surface settings-card" },
        React.createElement("div", { className: "settings-card-head" },
            React.createElement("h3", null, title),
            React.createElement("p", null, desc)),
        body);
    const exportSettings = () => { const data = { format: "h2o-web-settings", version: 1, exportedAt: new Date().toISOString(), preferences: prefs, appearance: { theme, language: lang, sidebarCollapsed: collapsed } }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = "h2o-web-settings.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify("Exported Web preferences. Secrets and tokens are excluded."); };
    const importSettings = async (file) => { if (!file)
        return; try {
        if (file.size > 1024 * 1024)
            throw Error("Settings file exceeds 1 MB.");
        const d = JSON.parse(await file.text());
        if (d.format !== "h2o-web-settings" || d.version !== 1 || !d.preferences || typeof d.preferences !== "object")
            throw Error("Unsupported settings file format.");
        const safe = { ...PREF_DEFAULTS };
        for (const k of Object.keys(PREF_DEFAULTS))
            if (Object.hasOwn(d.preferences, k))
                safe[k] = d.preferences[k];
        if (!["comfortable", "compact"].includes(safe.density))
            safe.density = "comfortable";
        if (!["100", "110", "120"].includes(String(safe.fontScale)))
            safe.fontScale = "100";
        if (!["12", "13", "14", "15"].includes(String(safe.terminalFont)))
            safe.terminalFont = "13";
        if (!["overview", "chat", "files", "terminal"].includes(safe.startPage))
            safe.startPage = "overview";
        if (!["auto", "en-US", "fa-IR"].includes(safe.locale))
            safe.locale = "auto";
        if (!["local", "utc"].includes(safe.timezone))
            safe.timezone = "local";
        for (const k of ["animations", "chatEnter", "showTimestamps", "terminalWrap", "experimentalBadges"])
            if (typeof safe[k] !== "boolean")
                safe[k] = PREF_DEFAULTS[k];
        if (!safe.modelNotes || typeof safe.modelNotes !== "object" || Array.isArray(safe.modelNotes))
            safe.modelNotes = {};
        else
            safe.modelNotes = Object.fromEntries(Object.entries(safe.modelNotes).filter(([k, v]) => typeof k === "string" && k.length <= 120 && typeof v === "string").slice(0, 100));
        setPrefs(safe);
        if (["dark", "light"].includes(d.appearance?.theme))
            setTheme(d.appearance.theme);
        if (["en", "fa"].includes(d.appearance?.language))
            setLang(d.appearance.language);
        if (typeof d.appearance?.sidebarCollapsed === "boolean")
            setCollapsed(d.appearance.sidebarCollapsed);
        setImportError("");
        notify("Web preferences imported.");
    }
    catch (e) {
        setImportError(e.message);
        notify("Import failed: " + e.message);
    } };
    const refreshHealth = async () => { setHealthBusy(true); try {
        await Promise.all([refreshStatus(), loadProviders()]);
        notify("Live dashboard status refreshed.");
    }
    finally {
        setHealthBusy(false);
    } };
    const active = providers.find(p => p.active), kv = (a, b) => React.createElement("div", { className: "settings-kv" },
        React.createElement("span", null, a),
        React.createElement("b", null, String(b ?? "—")));
    return React.createElement("div", { className: "settings-layout density-" + prefs.density, style: { fontSize: (Number(prefs.fontScale) || 100) / 100 * 12 + "px" } },
        React.createElement("aside", { className: "settings-nav surface" },
            React.createElement("div", { className: "settings-search" },
                React.createElement(Icon, { name: "search", size: 15 }),
                React.createElement("input", { "aria-label": "Search settings", value: query, onChange: e => setQuery(e.target.value), placeholder: tr("Search settings…", "جستجوی تنظیمات…") })),
            React.createElement("nav", { className: "settings-nav-list" },
                filtered.map(item => React.createElement("button", { key: item[0], className: section === item[0] ? "active" : "", onClick: () => setSection(item[0]) },
                    React.createElement("span", { className: "settings-nav-icon" },
                        React.createElement(Icon, { name: item[3] })),
                    React.createElement("span", null, tr(item[1], item[2])))),
                !filtered.length && React.createElement("div", { className: "empty-state" }, tr("No matching settings", "تنظیمی پیدا نشد"))),
            React.createElement("div", { className: "settings-nav-foot" }, "LOCAL WEB PREFERENCES")),
        React.createElement("div", { className: "settings-content" },
            React.createElement("div", { className: "settings-section-title" },
                React.createElement("div", null,
                    React.createElement("div", { className: "eyebrow" },
                        "SETTINGS / ",
                        current[0].toUpperCase()),
                    React.createElement("h2", null, tr(current[1], current[2]))),
                React.createElement("div", { className: "settings-title-badges" },
                    prefs.experimentalBadges && React.createElement("span", { className: "badge" }, "EXPERIMENTAL UI"),
                    React.createElement("span", { className: "badge" }, tr("Saved in this browser", "ذخیره در مرورگر")))),
            section === "general" && card(tr("General preferences", "تنظیمات عمومی"), tr("Control the Web dashboard experience without changing CLI behavior.", "تجربه داشبورد وب را بدون تغییر رفتار CLI مدیریت کنید."), React.createElement(React.Fragment, null,
                row(tr("Interface density", "تراکم رابط"), tr("Choose the spacing of settings controls.", "فاصله‌گذاری کنترل‌های تنظیمات را انتخاب کنید."), select(prefs.density, v => update("density", v), [["comfortable", "Comfortable"], ["compact", "Compact"]])),
                row(tr("Default landing page", "صفحه آغازین"), tr("Open this page when the dashboard starts.", "این صفحه هنگام شروع داشبورد باز می‌شود."), select(prefs.startPage, v => update("startPage", v), [["overview", "Overview"], ["chat", "AI Chat"], ["files", "Files"], ["terminal", "Terminal"]])),
                row(tr("Settings text scale", "اندازه متن تنظیمات"), tr("Adjust text size within this panel.", "اندازه متن این پنل را تنظیم کنید."), select(String(prefs.fontScale), v => update("fontScale", v), [["100", "100%"], ["110", "110%"], ["120", "120%"]])),
                row(tr("Motion", "حرکت رابط"), tr("Enable subtle transitions; OS reduced-motion is also respected.", "حرکت‌های ظریف را فعال کنید؛ تنظیم کاهش حرکت سیستم‌عامل نیز رعایت می‌شود."), toggle(prefs.animations, v => update("animations", v), tr("Enable motion", "فعال"))))),
            section === "appearance" && card(tr("Appearance", "ظاهر"), tr("A calm, high-contrast workspace theme.", "پوسته‌ای ساده با کنتراست مناسب."), React.createElement(React.Fragment, null,
                row(tr("Color theme", "پوسته رنگی"), tr("Applied immediately to the dashboard.", "بلافاصله روی داشبورد اعمال می‌شود."), select(theme, setTheme, [["dark", "Dark"], ["light", "Light"]])),
                row(tr("Density", "تراکم"), tr("Settings layout spacing.", "فاصله‌گذاری تنظیمات."), select(prefs.density, v => update("density", v), [["comfortable", "Comfortable"], ["compact", "Compact"]])),
                row(tr("Font scale", "مقیاس متن"), tr("Changes text size within Settings.", "اندازه متن تنظیمات را تغییر می‌دهد."), select(String(prefs.fontScale), v => update("fontScale", v), [["100", "100%"], ["110", "110%"], ["120", "120%"]])),
                row(tr("Motion", "حرکت"), tr("Enable subtle transitions.", "حرکت‌های ظریف رابط."), toggle(prefs.animations, v => update("animations", v), tr("Enable motion", "فعال"))))),
            section === "language" && card(tr("Language & Region", "زبان و منطقه"), tr("Language is shared across the Web dashboard. Region preferences are local.", "زبان در کل داشبورد وب اعمال می‌شود؛ تنظیمات منطقه‌ای محلی هستند."), React.createElement(React.Fragment, null,
                row(tr("Dashboard language", "زبان داشبورد"), tr("Available interface languages.", "زبان‌های در دسترس رابط."), select(lang, setLang, [["en", "English"], ["fa", "فارسی"]])),
                row(tr("Number and date locale", "قالب تاریخ و عدد"), tr("Formatting preference for future Web surfaces.", "ترجیح قالب‌بندی برای بخش‌های بعدی وب."), select(prefs.locale, v => update("locale", v), [["auto", "System default"], ["en-US", "English (US)"], ["fa-IR", "Persian (Iran)"]])),
                row(tr("Time zone", "منطقه زمانی"), tr("Use browser local time or UTC.", "زمان محلی مرورگر یا UTC."), select(prefs.timezone, v => update("timezone", v), [["local", "Local time zone"], ["utc", "UTC"]])),
                React.createElement("p", { className: "settings-note" },
                    tr("Browser time zone: ", "منطقه زمانی مرورگر: "),
                    Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable"))),
            section === "workspace" && card(tr("Workspace", "فضای کاری"), tr("The selected project folder is shared with the CLI and Agent.", "پوشه پروژه با CLI و Agent مشترک است."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "workspace-current" },
                    React.createElement("span", { className: "badge success" }, "Connected"),
                    React.createElement("code", null, status.workspace || "—")),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button primary", onClick: () => navigate("files") }, tr("Open workspace browser", "باز کردن مرورگر فضای کاری")),
                    React.createElement("button", { className: "button", onClick: refreshStatus }, tr("Refresh status", "تازه‌سازی وضعیت"))),
                React.createElement("p", { className: "settings-note" }, tr("Workspace changes are performed in Files using the existing API.", "تغییر فضای کاری از بخش فایل‌ها و با API فعلی انجام می‌شود.")))),
            section === "provider" && card(tr("Default Provider & Model", "ارائه‌دهنده و مدل پیش‌فرض"), tr("Uses the existing provider and model endpoints.", "از مسیرهای فعلی ارائه‌دهنده و مدل استفاده می‌کند."), React.createElement(React.Fragment, null,
                kv(tr("Active provider", "ارائه‌دهنده فعال"), active?.name || status.provider || "Not selected"),
                kv(tr("Active model", "مدل فعال"), status.model || "Automatic"),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button", onClick: () => navigate("providers") }, tr("Open provider and API key settings", "تنظیمات ارائه‌دهنده و کلید API"))),
                React.createElement("p", { className: "settings-note" }, tr("No new API route is introduced.", "هیچ مسیر API جدیدی اضافه نشده است.")))),
            section === "model" && card(tr("Model-specific preferences", "ترجیحات اختصاصی مدل"), tr("Local notes only. These do not change inference parameters.", "فقط یادداشت محلی؛ پارامترهای اجرای مدل را تغییر نمی‌دهد."), React.createElement(React.Fragment, null,
                React.createElement(Field, { label: "Model ID" },
                    React.createElement("input", { className: "input", value: modelDraft, onChange: e => setModelDraft(e.target.value), placeholder: "e.g. gpt-4.1" })),
                React.createElement(Field, { label: tr("Local preference note", "یادداشت محلی") },
                    React.createElement("textarea", { className: "textarea", id: "model-note", rows: 3, placeholder: tr("Reminder for this model…", "یادداشت برای این مدل…") })),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button primary", disabled: !modelDraft.trim(), onClick: () => { const note = document.getElementById("model-note")?.value || ""; update("modelNotes", { ...prefs.modelNotes, [modelDraft.trim()]: note }); setModelDraft(""); notify(tr("Local model note saved.", "یادداشت مدل ذخیره شد.")); } }, tr("Save local note", "ذخیره یادداشت"))),
                Object.entries(prefs.modelNotes || {}).map(([id, note]) => kv(id, note || "No note")))),
            section === "response" && card(tr("Response behavior", "رفتار پاسخ‌دهی"), tr("The current API does not expose response parameters.", "API فعلی پارامترهای پاسخ را در اختیار رابط وب قرار نمی‌دهد."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "settings-callout" }, tr("Read-only · Not configurable in this release", "فقط نمایشی · در این نسخه قابل تنظیم نیست")),
                React.createElement("p", { className: "settings-note" }, tr("Temperature, token limits, response style and streaming controls are not simulated.", "تنظیمات دما، محدودیت توکن، سبک پاسخ و جریان پاسخ به‌صورت نمایشی اضافه نشده‌اند.")),
                kv("Current mode", status.mode))),
            section === "fallback" && card(tr("Fallback model", "مدل جایگزین"), tr("Fallback routing is not configurable through the current Web API.", "مسیردهی مدل جایگزین از طریق API فعلی قابل تنظیم نیست."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "settings-callout" }, tr("Not available in the current API", "در API فعلی در دسترس نیست")),
                React.createElement("p", { className: "settings-note" }, tr("No runtime fallback setting is stored or simulated.", "هیچ تنظیم اجرایی جایگزین ذخیره یا شبیه‌سازی نمی‌شود.")),
                React.createElement("button", { className: "button", onClick: () => navigate("providers") }, tr("View providers", "مشاهده ارائه‌دهنده‌ها")))),
            section === "chat" && card(tr("Chat preferences", "ترجیحات گفتگو"), tr("These preferences affect Web presentation only.", "این ترجیحات فقط نمایش وب را تغییر می‌دهند."), React.createElement(React.Fragment, null,
                row(tr("Enter sends message", "ارسال با Enter"), tr("Use Shift+Enter for a new line.", "برای خط جدید از Shift+Enter استفاده کنید."), toggle(prefs.chatEnter, v => update("chatEnter", v), tr("Send on Enter", "ارسال با Enter"))),
                row(tr("Message timestamps", "زمان پیام‌ها"), tr("Show or hide timestamps in chat.", "نمایش یا پنهان‌کردن زمان پیام‌ها."), toggle(prefs.showTimestamps, v => update("showTimestamps", v), tr("Show timestamps", "نمایش زمان"))),
                React.createElement("p", { className: "settings-note" }, tr("Enter sends a message; Shift+Enter inserts a new line.", "Enter پیام را ارسال می‌کند و Shift+Enter خط جدید می‌سازد.")))),
            section === "terminal" && card(tr("Terminal preferences", "ترجیحات ترمینال"), tr("Presentation preferences for terminal output in Web.", "تنظیمات نمایشی خروجی ترمینال در وب."), React.createElement(React.Fragment, null,
                row(tr("Word wrapping", "شکستن خط"), tr("Wrap long output lines.", "خطوط طولانی خروجی را در چند خط نمایش بده."), toggle(prefs.terminalWrap, v => update("terminalWrap", v), tr("Wrap output", "شکستن خط"))),
                row(tr("Terminal font size", "اندازه فونت ترمینال"), tr("Choose output text size.", "اندازه متن خروجی را انتخاب کنید."), select(prefs.terminalFont, v => update("terminalFont", v), [["12", "12 px"], ["13", "13 px"], ["14", "14 px"], ["15", "15 px"]])),
                React.createElement("p", { className: "settings-note" }, tr("Shell execution and permissions remain controlled by the CLI.", "اجرای فرمان و مجوزها همچنان تحت کنترل CLI هستند.")))),
            section === "sidebar" && card(tr("Sidebar customization", "شخصی‌سازی نوار کناری"), tr("Customize the navigation footprint in this browser.", "نمایش نوار ناوبری را در این مرورگر تغییر دهید."), React.createElement(React.Fragment, null,
                row(tr("Sidebar width", "عرض نوار کناری"), tr("Switch between expanded and compact navigation.", "بین حالت باز و فشرده جابه‌جا شوید."), toggle(!collapsed, v => setCollapsed(!v), tr("Expanded sidebar", "نوار باز"))),
                React.createElement("p", { className: "settings-note" }, tr("Navigation order remains fixed in this release.", "ترتیب ناوبری در این نسخه ثابت است.")))),
            section === "shortcuts" && card(tr("Keyboard shortcuts", "میانبرهای صفحه‌کلید"), tr("Current Web dashboard bindings.", "میانبرهای فعلی داشبورد وب."), React.createElement("div", { className: "shortcut-list" },
                React.createElement("div", null,
                    React.createElement("span", null, tr("Open Settings", "باز کردن تنظیمات")),
                    React.createElement("kbd", null, "Ctrl + ,")),
                React.createElement("div", null,
                    React.createElement("span", null, tr("Focus settings search", "رفتن به جستجوی تنظیمات")),
                    React.createElement("kbd", null, "Ctrl + K")),
                React.createElement("div", null,
                    React.createElement("span", null, tr("Toggle color theme", "تغییر پوسته")),
                    React.createElement("kbd", null, "Ctrl + Shift + L")),
                React.createElement("div", null,
                    React.createElement("span", null, tr("Send chat message", "ارسال پیام گفتگو")),
                    React.createElement("kbd", null, "Enter")),
                React.createElement("div", null,
                    React.createElement("span", null, tr("New line in chat", "خط جدید در گفتگو")),
                    React.createElement("kbd", null, "Shift + Enter")),
                React.createElement("div", null,
                    React.createElement("span", null, tr("Run terminal command", "اجرای فرمان ترمینال")),
                    React.createElement("kbd", null, "Enter")),
                React.createElement("p", { className: "settings-note" }, tr("Shortcut remapping is not enabled yet.", "تغییر میانبرها هنوز فعال نیست.")))),
            section === "privacy" && card(tr("Privacy & Security", "حریم خصوصی و امنیت"), tr("Security controls are preserved and read-only here.", "کنترل‌های امنیتی حفظ شده‌اند و در اینجا فقط‌خواندنی هستند."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "settings-callout success" }, tr("Existing protections active", "محافظت‌های فعلی فعال هستند")),
                React.createElement("ul", { className: "settings-bullets" },
                    React.createElement("li", null, "Dashboard binds to loopback (127.0.0.1)."),
                    React.createElement("li", null, "Per-process dashboard token is required for API requests."),
                    React.createElement("li", null, "Host and Origin validation remain enforced."),
                    React.createElement("li", null, "Provider credentials use the existing OS credential manager."),
                    React.createElement("li", null, "Secrets and tokens are excluded from settings export.")),
                React.createElement("p", { className: "settings-note" }, tr("This panel does not reconfigure security behavior.", "این بخش رفتار امنیتی را تغییر نمی‌دهد.")))),
            section === "health" && card(tr("System Health", "سلامت سیستم"), tr("Live values from the existing dashboard status endpoint.", "اطلاعات زنده از مسیر وضعیت فعلی داشبورد."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "health-grid" }, [["Connection", status.status || "Unknown"], ["Agent", status.busy ? "Busy" : "Idle"], ["Mode", status.mode], ["Provider", status.provider], ["Model", status.model], ["Queue", status.queueLength ?? 0], ["Providers", providers.length], ["Workspace", status.workspace ? "Available" : "Unavailable"]].map(([k, v]) => React.createElement("div", { key: k },
                    React.createElement("small", null, k),
                    React.createElement("b", null, String(v ?? "—"))))),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button", onClick: refreshHealth, disabled: healthBusy }, healthBusy ? "Refreshing…" : tr("Refresh live status", "تازه‌سازی وضعیت زنده"))))),
            section === "diagnostics" && card(tr("Diagnostics & Logs", "عیب‌یابی و گزارش‌ها"), tr("Read-only summary of data already available to Web.", "خلاصه فقط‌خواندنی از اطلاعات در دسترس وب."), React.createElement(React.Fragment, null,
                React.createElement("div", { className: "health-grid" }, [["Chat messages", history.messages?.length || 0], ["Terminal records", history.terminal?.length || 0], ["Browser", navigator.userAgent], ["Platform", navigator.platform || "Unknown"]].map(([k, v]) => React.createElement("div", { key: k },
                    React.createElement("small", null, k),
                    React.createElement("b", null, String(v))))),
                React.createElement("p", { className: "settings-note" }, tr("The current API does not expose a server log download or diagnostic bundle.", "API فعلی امکان دریافت گزارش سرور یا بسته عیب‌یابی را ارائه نمی‌کند.")),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button", onClick: () => navigate("sessions") }, tr("Open session history", "باز کردن تاریخچه جلسه"))))),
            section === "backup" && card(tr("Import / Export Settings", "ورود و خروجی تنظیمات"), tr("Back up local Web preferences only.", "فقط از ترجیحات محلی وب پشتیبان بگیرید."), React.createElement(React.Fragment, null,
                React.createElement("p", { className: "settings-note" }, tr("Credentials, API keys, dashboard tokens, session history and workspace files are never included.", "اعتبارنامه‌ها، کلیدهای API، توکن داشبورد، تاریخچه جلسه و فایل‌های پروژه هرگز در خروجی قرار نمی‌گیرند.")),
                React.createElement("div", { className: "settings-actions" },
                    React.createElement("button", { className: "button primary", onClick: exportSettings }, tr("Export Web settings (.json)", "خروجی تنظیمات وب (.json)")),
                    React.createElement("label", { className: "button", htmlFor: "settings-import" }, tr("Import settings (.json)", "ورود تنظیمات (.json)")),
                    React.createElement("input", { id: "settings-import", type: "file", accept: "application/json,.json", hidden: true, onChange: e => importSettings(e.target.files?.[0]) })),
                importError && React.createElement("p", { className: "settings-error", role: "alert" }, importError),
                React.createElement("p", { className: "settings-note" }, tr("Import validates the version and accepts known Web preference fields only. It does not call the H2O API.", "ورود فایل نسخه آن را بررسی می‌کند و فقط فیلدهای شناخته‌شده وب را می‌پذیرد؛ هیچ فراخوانی API انجام نمی‌شود.")))),
            section === "experimental" && card(tr("Experimental Features", "قابلیت‌های آزمایشی"), tr("Opt in to small Web-only presentation experiments.", "فعال‌سازی آزمایش‌های کوچک و صرفاً نمایشی در وب."), React.createElement(React.Fragment, null,
                row(tr("Experimental labels", "برچسب آزمایشی"), tr("Show an experimental marker in the Settings header.", "نمایش برچسب آزمایشی در سربرگ تنظیمات."), toggle(prefs.experimentalBadges, v => update("experimentalBadges", v), tr("Enable label", "فعال‌سازی"))),
                React.createElement("p", { className: "settings-note" }, tr("This does not change Agent, Provider, terminal, CLI or API behavior.", "این گزینه رفتار Agent، ارائه‌دهنده، ترمینال، CLI یا API را تغییر نمی‌دهد."))))));
}
function Field({ label, children, span = false }) { const id = useId(); const isControl = React.isValidElement(children) && ["input", "select", "textarea"].includes(children.type); const control = isControl ? React.cloneElement(children, { id }) : children; return React.createElement("div", { className: "field" + (span ? " span-2" : "") },
    React.createElement("label", { htmlFor: isControl ? id : undefined }, label),
    control); }
function HistoryItem({ title, at }) { return React.createElement("div", { className: "history-item" },
    React.createElement("b", null, String(title).slice(0, 160)),
    React.createElement("small", null, at ? new Date(at).toLocaleString() : "Current session")); }
function Overview({ status, activities, t, navigate }) {
    const stats = [["workspaceMetric", (status.workspace || "—").split(/[\\/]/).filter(Boolean).slice(-2).join("/") || "—", "currentProject", "files"], ["messages", status.messageCount ?? 0, "sessionMessages", "chat"], ["terminalRuns", status.terminalCount ?? 0, "recordedCommands", "terminal"], ["queue", status.queueLength ?? 0, status.busy ? "Working" : "Ready", "chat"]];
    const quick = [["chat", "chat", "ask", "askDesc"], ["files", "files", "explore", "exploreDesc"], ["terminal", "terminal", "runCommand", "runDesc"], ["providers", "providers", "configure", "configureDesc"]];
    return React.createElement(React.Fragment, null,
        React.createElement("div", { className: "grid stats-grid" }, stats.map(([label, value, foot, go], i) => React.createElement("button", { className: "surface stat-card", key: label, onClick: () => navigate(go), style: { textAlign: "left", color: "var(--text)" } },
            React.createElement("div", { className: "stat-label" }, t(label)),
            React.createElement("div", { className: "stat-value", style: i === 0 ? { fontSize: 17, overflowWrap: "anywhere" } : {} }, value),
            React.createElement("div", { className: "stat-foot" }, typeof foot === "string" && copy.en[foot] ? t(foot) : foot),
            React.createElement("div", { className: "stat-mark" },
                React.createElement(Icon, { name: ["folder", "chat", "terminal", "sessions"][i], size: 19 }))))),
        React.createElement("div", { className: "grid split-grid" },
            React.createElement("section", { className: "surface" },
                React.createElement("h3", { className: "section-heading" },
                    t("quickActions"),
                    React.createElement("small", null, t("jump"))),
                React.createElement("div", { className: "quick-grid" }, quick.map(([id, icon, title, desc]) => React.createElement("button", { className: "quick-card", key: id, onClick: () => navigate(id) },
                    React.createElement("span", { className: "quick-icon" },
                        React.createElement(Icon, { name: icon, size: 17 })),
                    React.createElement("span", null,
                        React.createElement("b", null, t(title)),
                        React.createElement("small", null, t(desc))),
                    React.createElement("span", { style: { marginInlineStart: "auto", color: "var(--subtle)" } },
                        React.createElement(Icon, { name: "arrow", size: 14 })))))),
            React.createElement("section", { className: "surface" },
                React.createElement("h3", { className: "section-heading" },
                    t("liveActivity"),
                    React.createElement("small", null, t("listening"))),
                React.createElement("div", { className: "activity-list" }, activities.map((a, i) => React.createElement("div", { className: "activity-row", key: i },
                    React.createElement("span", { className: "activity-symbol" }, "\u25C9"),
                    React.createElement("div", null,
                        React.createElement("b", null, a.title),
                        React.createElement("small", null, a.detail))))))));
}
function AuthGate() {
    const [auth, setAuth] = useState({ loading: true, authenticated: false, configured: false, user: null });
    const [error, setError] = useState("");
    useEffect(() => { let live = true; fetch("/auth/status", { credentials: "same-origin", cache: "no-store" }).then(r => r.json()).then(v => { if (!live)
        return; setAuth({ ...v, loading: false }); if (v.user?.name) {
        try {
            localStorage.setItem("h2o-user-name", v.user.name);
        }
        catch { }
    } }).catch(() => live && setAuth(v => ({ ...v, loading: false }))); const params = new URLSearchParams(location.search); if (params.has("auth_error"))
        setError("Google sign-in was cancelled or could not be completed."); return () => { live = false; }; }, []);
    if (auth.loading)
        return React.createElement("div", { className: "auth-screen" },
            React.createElement("div", { className: "auth-card" },
                React.createElement("div", { className: "auth-mark" }, "H"),
                React.createElement("p", null, "H2O"),
                React.createElement("span", null, "Checking your session\u2026")));
    if (auth.authenticated)
        return React.createElement(App, null);
    return React.createElement("main", { className: "auth-screen" },
        React.createElement("section", { className: "auth-card" },
            React.createElement("div", { className: "auth-mark" }, "H"),
            React.createElement("div", { className: "auth-kicker" }, "YOUR LOCAL AI WORKSPACE"),
            React.createElement("h1", null, "Welcome to H2O"),
            React.createElement("p", { className: "auth-copy" }, "Sign in with your Google account to continue to your private workspace."),
            error && React.createElement("div", { className: "auth-error", role: "alert" }, error),
            !auth.configured && React.createElement("div", { className: "auth-error" },
                "Google sign-in is not configured yet. Add your Google OAuth client ID and secret to the local ",
                React.createElement("code", null, ".env"),
                " file, then restart H2O."),
            React.createElement("button", { className: "google-signin", disabled: !auth.configured, onClick: () => { location.href = "/auth/google/start"; } },
                React.createElement("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" },
                    React.createElement("path", { fill: "#EA4335", d: "M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z" }),
                    React.createElement("path", { fill: "#4285F4", d: "M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" }),
                    React.createElement("path", { fill: "#FBBC05", d: "M10.4 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.6 10.7l7.8-6.1z" }),
                    React.createElement("path", { fill: "#34A853", d: "M24 48c6.3 0 11.6-2.1 15.5-5.9L32 36.3c-2.1 1.4-4.7 2.2-8 2.2-6.4 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" })),
                React.createElement("span", null, "Continue with Google")),
            React.createElement("div", { className: "auth-foot" }, "Secure sign-in \u00B7 Google account required"),
            React.createElement("div", { className: "auth-brand" },
                "H2O ",
                React.createElement("span", null, "LOCAL FIRST"))));
}
createRoot(document.getElementById("root")).render(React.createElement(AuthGate, null));
