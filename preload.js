// Preload script para webviews e popups de votação - Stealth Cloudflare Turnstile & Isolamento
window.__voteDebugLogs = window.__voteDebugLogs || [];
const logCollector = (type, args) => {
    try {
        const str = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        window.__voteDebugLogs.push(`[${new Date().toISOString().slice(11, 19)}] [${type.toUpperCase()}] ${str}`);
    } catch(e) {}
};

try {
    const origLog = console.log, origWarn = console.warn, origError = console.error;
    console.log = function(...args) { logCollector('log', args); origLog.apply(console, args); };
    console.warn = function(...args) { logCollector('warn', args); origWarn.apply(console, args); };
    console.error = function(...args) { logCollector('error', args); origError.apply(console, args); };

    window.addEventListener('error', (e) => {
        logCollector('uncaught_error', [e.message, e.filename, e.lineno]);
    });
    window.addEventListener('unhandledrejection', (e) => {
        logCollector('unhandled_rejection', [String(e.reason)]);
    });

    // 1. Emula navigator.webdriver = false idêntico ao Chrome oficial (no prototype)
    try {
        Object.defineProperty(Navigator.prototype, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true
        });
    } catch(e) {}

    // 2. Mock completo de window.chrome oficial
    if (!window.chrome) {
        window.chrome = {};
    }
    window.chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'DISABLED', INSTALLED: 'INSTALLED', NOT_INSTALLED: 'NOT_INSTALLED' },
        RunningState: { CANNOT_RUN: 'CANNOT_RUN', READY_TO_RUN: 'READY_TO_RUN', RUNNING: 'RUNNING' }
    };
    window.chrome.runtime = {
        OnInstalledReason: {},
        OnRestartRequiredReason: {},
        PlatformArch: {},
        PlatformNaclArch: {},
        PlatformOs: {},
        RequestUpdateCheckStatus: {}
    };
    window.chrome.loadTimes = function() {};
    window.chrome.csi = function() {};

    // 3. Mock de plugins & mimeTypes do Chrome oficial
    if (!navigator.plugins || navigator.plugins.length === 0) {
        const fakePlugins = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ];
        Object.defineProperty(navigator, 'plugins', {
            get: () => fakePlugins,
            configurable: true
        });
    }

    // 4. Idiomas padrão do navegador
    Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en'],
        configurable: true
    });

    // 5. Mock de Permissions API para Turnstile
    if (navigator.permissions && navigator.permissions.query) {
        const origQuery = navigator.permissions.query;
        navigator.permissions.query = function(params) {
            if (params && params.name === 'notifications') {
                return Promise.resolve({ state: typeof Notification !== 'undefined' ? Notification.permission : 'default' });
            }
            return origQuery.apply(navigator.permissions, arguments);
        };
    }
} catch(e) {}

window.addEventListener('DOMContentLoaded', () => {
    const removeDevLimit = () => {
        const dl = document.getElementById('dev-limit');
        if (dl && dl.style.display !== 'none') {
            dl.style.display = 'none';
        }
    };
    removeDevLimit();
    setInterval(removeDevLimit, 1000);

    // Barra de ferramentas de debug para o popup do TopIdle
    try {
        if (window.location.hostname.includes('topidle.com') || window.location.href.includes('topidle')) {
            if (!document.getElementById('debug-vote-toolbar')) {
                const bar = document.createElement('div');
                bar.id = 'debug-vote-toolbar';
                bar.style.cssText = 'position:fixed; top:6px; right:6px; z-index:2147483647; display:flex; gap:6px; background:rgba(15,23,42,0.95); border:1px solid #38bdf8; border-radius:8px; padding:6px 10px; box-shadow:0 4px 20px rgba(0,0,0,0.8); font-family:system-ui,-apple-system,sans-serif; align-items:center; backdrop-filter:blur(6px);';
                bar.innerHTML = `
                    <span style="color:#7dd3fc; font-size:11px; font-weight:800">🛠️ Debug:</span>
                    <button id="btn-copy-vote-logs" style="background:#2563eb; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:bold; cursor:pointer">📋 Copiar Logs</button>
                    <button id="btn-open-devtools" style="background:#334155; color:#f8fafc; border:1px solid #64748b; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:bold; cursor:pointer">🔍 Inspecionar (F12)</button>
                    <button id="btn-open-external-vote" style="background:#16a34a; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:bold; cursor:pointer" title="Se Turnstile bloquear, abra esta aba diretamente no seu Chrome/Edge">↗️ Abrir no Chrome</button>
                `;
                document.body.appendChild(bar);

                document.getElementById('btn-copy-vote-logs')?.addEventListener('click', () => {
                    const logsText = (window.__voteDebugLogs || []).join('\n') || 'Nenhum log registrado ainda.';
                    const diagInfo = [
                        '=== DIAGNÓSTICO DO POPUP DE VOTAÇÃO ===',
                        'Data: ' + new Date().toLocaleString(),
                        'URL: ' + window.location.href,
                        'User-Agent: ' + navigator.userAgent,
                        'navigator.webdriver: ' + navigator.webdriver,
                        'window.chrome: ' + (window.chrome ? 'Presente' : 'Ausente'),
                        'Plugins length: ' + (navigator.plugins ? navigator.plugins.length : 0),
                        'Screen: ' + window.innerWidth + 'x' + window.innerHeight,
                        '=== LOGS CAPTURADOS (' + (window.__voteDebugLogs || []).length + ') ===',
                        logsText
                    ].join('\n');

                    navigator.clipboard.writeText(diagInfo).then(() => {
                        const btn = document.getElementById('btn-copy-vote-logs');
                        if (btn) { btn.textContent = '✅ Copiado!'; setTimeout(() => btn.textContent = '📋 Copiar Logs', 2000); }
                    }).catch(() => {
                        prompt('Copie os logs abaixo:', diagInfo);
                    });
                });

                document.getElementById('btn-open-devtools')?.addEventListener('click', () => {
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('open-devtools-active');
                    } catch(e) {}
                });

                document.getElementById('btn-open-external-vote')?.addEventListener('click', () => {
                    try {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('open-external-url', window.location.href);
                    } catch(e) {}
                });
            }
        }
    } catch(e) {}
});
