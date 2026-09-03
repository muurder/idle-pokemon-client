const { app, BrowserWindow, ipcMain, session, globalShortcut, Menu, screen, net, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

// =====================================================================
// ONDE E QUE DA PRA ESCREVER
// =====================================================================
// Empacotado (.exe), __dirname aponta pra dentro do app.asar, que e
// SOMENTE LEITURA. Todo fs.writeFileSync/mkdirSync deste arquivo esta
// dentro de try/catch vazio, entao a escrita falha em SILENCIO: o app
// abre normal e simplesmente perde posicao de janela, log de auto hunt,
// log e memoria compartilhada do ginasio -- sem uma linha de erro.
//
// Fora do pacote (npm start) continua sendo __dirname, igual sempre, pra
// nao mudar o fluxo de trabalho do dev nem mover log de lugar no meio de
// uma investigacao.
const PASTA_DADOS = app.isPackaged ? app.getPath('userData') : __dirname;

// =====================================================
// SISTEMA CENTRAL DE LOGS DE DIAGNÓSTICO E PROXY
// =====================================================
const globalDebugLogs = [];
const proxyAuthMap = {};
const accountProxyStatusMap = {};
const DEBUG_LOG_PATH = path.join(PASTA_DADOS, 'debug-startup.log');

// Escreve header do log no início
function iniciarDebugLog() {
    const header = [
        '═══════════════════════════════════════════════════════════════',
        `  IDLE POKÉMON DEV CLIENT — DEBUG LOG`,
        `  Início: ${new Date().toISOString()}`,
        `  Node: ${process.version} | Electron: ${process.versions.electron || 'N/A'}`,
        `  Platform: ${process.platform} ${process.arch}`,
        `  argv: ${process.argv.join(' ')}`,
        '═══════════════════════════════════════════════════════════════',
        ''
    ].join('\n');
    try { fs.writeFileSync(DEBUG_LOG_PATH, header, 'utf8'); } catch(e) {}
}

// =====================================================================
// LOG DE DEBUG — buffer + escrita assíncrona + rotação
// =====================================================================
// ⚠️ ISTO ERA UM `fs.appendFileSync` POR LINHA, NO PROCESSO PRINCIPAL.
// O main é quem coordena as 11 webviews; uma escrita SÍNCRONA em disco
// bloqueia o event loop dele a cada linha registrada. E `console.log` está
// interceptado logo abaixo, então todo log do main virava um seek+write.
// Com 11 contas conversando por IPC o tempo todo, isso vira engasgo visível.
//
// O arquivo também crescia sem teto: estava em 3,4 MB e só aumentava, o que
// piora o custo de cada append e enche o disco em sessões longas.
//
// Agora: as linhas entram num buffer, um flush assíncrono acontece a cada 2 s
// (ou quando o buffer passa de 200 linhas), e o arquivo é rotacionado ao passar
// de 5 MB — guarda-se UM anterior (`.1`), que é o suficiente pra investigar um
// problema recente sem virar arquivo eterno.
const DEBUG_LOG_MAX_BYTES = 5 * 1024 * 1024;
const DEBUG_LOG_FLUSH_MS = 2000;
let _debugBuffer = [];
let _debugFlushAgendado = null;
let _debugEscrevendo = false;

function rotacionarLogDebugSePreciso() {
    try {
        const st = fs.statSync(DEBUG_LOG_PATH);
        if (st.size < DEBUG_LOG_MAX_BYTES) return;
        try { fs.unlinkSync(DEBUG_LOG_PATH + '.1'); } catch (e) { }
        fs.renameSync(DEBUG_LOG_PATH, DEBUG_LOG_PATH + '.1');
    } catch (e) { /* arquivo ainda não existe: nada a rotacionar */ }
}

function descarregarLogDebug() {
    _debugFlushAgendado = null;
    if (_debugEscrevendo || !_debugBuffer.length) return;
    const pedaco = _debugBuffer.join('\n') + '\n';
    _debugBuffer = [];
    _debugEscrevendo = true;
    rotacionarLogDebugSePreciso();
    fs.appendFile(DEBUG_LOG_PATH, pedaco, 'utf8', () => {
        _debugEscrevendo = false;
        // Chegou coisa nova enquanto escrevia: agenda o próximo.
        if (_debugBuffer.length) agendarFlushLogDebug();
    });
}

function agendarFlushLogDebug() {
    if (_debugFlushAgendado) return;
    _debugFlushAgendado = setTimeout(descarregarLogDebug, DEBUG_LOG_FLUSH_MS);
    // `unref` pra o timer do log nunca segurar o processo aberto no encerramento.
    if (_debugFlushAgendado.unref) _debugFlushAgendado.unref();
}

function registrarLogDebug(tipo, mensagem) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const linha = `[${timestamp}] [${tipo}] ${mensagem}`;
    globalDebugLogs.push(linha);
    // Evita que logs de rotina de várias contas acumulem memória no processo principal.
    if (globalDebugLogs.length > 500) globalDebugLogs.shift();
    _debugBuffer.push(linha);
    if (_debugBuffer.length >= 200) descarregarLogDebug();
    else agendarFlushLogDebug();
}

// Intercepta logs nativos do processo Node.js / Main do Electron
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;

console.log = function(...args) {
    _origLog.apply(console, args);
    try {
        registrarLogDebug('MAIN', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    } catch(e) {}
};

console.warn = function(...args) {
    _origWarn.apply(console, args);
    try {
        registrarLogDebug('MAIN-WARN', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    } catch(e) {}
};

console.error = function(...args) {
    _origError.apply(console, args);
    try {
        registrarLogDebug('MAIN-ERR', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    } catch(e) {}
};

// Otimização de Performance e Carregamento Rápido
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('renderer-process-limit', '4');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'BlockThirdPartyCookies,SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure');
// Mantém as contas em segundo plano (abas não ativas) executando normalmente:
// sem isso o Chromium "background" os renderers e pausa os timers/rAF (ex.: Auto Hunt do Idle Suite)
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// User-Agent padrão idêntico ao Chrome oficial em todo o runtime do Electron
app.userAgentFallback = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

let mainWindow = null;
let currentDisplayInfo = null;

const partitionsConfiguradas = new Set();

// === BANDWIDTH MONITOR ===
const bandwidthMap = {}; // { partitionName: { sent: bytes, received: bytes, requests: count, lastUpdate: timestamp } }
function getBandwidthKey(partitionName) { return partitionName || 'default'; }
function trackBandwidthSent(partitionName, bytes) {
    const key = getBandwidthKey(partitionName);
    if (!bandwidthMap[key]) bandwidthMap[key] = { sent: 0, received: 0, requests: 0, lastUpdate: Date.now() };
    bandwidthMap[key].sent += bytes;
    bandwidthMap[key].requests++;
    bandwidthMap[key].lastUpdate = Date.now();
}
function trackBandwidthReceived(partitionName, bytes) {
    const key = getBandwidthKey(partitionName);
    if (!bandwidthMap[key]) bandwidthMap[key] = { sent: 0, received: 0, requests: 0, lastUpdate: Date.now() };
    bandwidthMap[key].received += bytes;
    bandwidthMap[key].lastUpdate = Date.now();
}

function configurarParticaoConta(partitionName, index) {
    if (partitionsConfiguradas.has(partitionName)) return;
    partitionsConfiguradas.add(partitionName);

    const ses = partitionName === 'default' ? session.defaultSession : session.fromPartition(partitionName);

    // Gera um hash de 16 caracteres hexadecimais único e exclusivo para cada conta
    const uniqueDevId = crypto.createHash('sha256')
        .update(partitionName + '_unique_hw_device_v2026_' + (index || 0))
        .digest('hex')
        .slice(0, 16);

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = { ...details.requestHeaders };
        // Bandwidth: conta bytes enviados (headers ~200-500 bytes por request)
        trackBandwidthSent(partitionName, 500);
        // Injeta o ID de dispositivo único SOMENTE em requisições do jogo idlepokemoon.com.br
        if (details.url.includes('idlepokemoon.com.br')) {
            for (const key of Object.keys(headers)) {
                if (key.toLowerCase() === 'x-dev') {
                    delete headers[key];
                }
            }
            headers['X-Dev'] = uniqueDevId;
        }

        callback({ requestHeaders: headers });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        // Bandwidth: conta bytes recebidos via Content-Length
        const cl = responseHeaders['content-length'];
        if (cl) {
            const bytes = parseInt(Array.isArray(cl) ? cl[0] : cl, 10);
            if (!isNaN(bytes)) trackBandwidthReceived(partitionName, bytes);
        }
        // NÃO modifica CSP do jogo — o client funciona sem modificar.
        // executeJavaScript() ignora CSP nativamente, então não precisamos
        // relaxar o CSP para injetar o script. Manter CSP original do jogo
        // é essencial para o Cloudflare Turnstile e a renderização do canvas.
        // Permite cookies e iframes de terceiros para o Turnstile
        if (details.url.includes('challenges.cloudflare.com') || details.url.includes('topidle.com')) {
            if (responseHeaders['set-cookie']) {
                responseHeaders['set-cookie'] = responseHeaders['set-cookie'].map(c => {
                    if (!c.toLowerCase().includes('samesite')) {
                        return c + '; SameSite=None; Secure';
                    }
                    return c;
                });
            }
        }
        callback({ responseHeaders });
    });

    // Captura erros de rede específicos por partição (falhas de proxy, SSL, timeout, etc.)
    ses.webRequest.onErrorOccurred((details) => {
        if (details.error && details.error !== 'net::ERR_ABORTED' && details.error !== 'net::ERR_BLOCKED_BY_CLIENT') {
            const shortUrl = details.url.length > 80 ? details.url.slice(0, 80) + '...' : details.url;
            registrarLogDebug('NET-ERR', `[${partitionName}] ${details.error} ao acessar ${shortUrl}`);
        }
    });

    console.log(`[Dispositivo] Sessão (${partitionName}) configurada com X-Dev exclusivo.`);
}

// Configura identidade de máquina (X-Dev) única para cada conta (apenas para o domínio do jogo)
function configurarIsolamentoDispositivos() {
    configurarParticaoConta('default', 0);
    configurarParticaoConta('persist:global_popup', 99);
    for (let i = 1; i <= 16; i++) {
        configurarParticaoConta(`persist:acc${i}`, i);
    }
}

const windowStateFile = path.join(PASTA_DADOS, 'window-state.json');

function getSavedWindowState() {
    try {
        if (fs.existsSync(windowStateFile)) {
            const data = JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
            return data;
        }
    } catch(e) {}
    return null;
}

function saveWindowState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const isMaximized = mainWindow.isMaximized();
        const bounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(bounds);
        const state = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            displayId: String(display.id),
            displayBounds: display.bounds,
            isMaximized: isMaximized
        };
        fs.writeFileSync(windowStateFile, JSON.stringify(state, null, 2), 'utf8');
        console.log('[WindowState] Salvo no monitor:', display.id, 'Maximized:', isMaximized);
    } catch(e) {}
}

function broadcastCurrentDisplay() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        const bounds = mainWindow.getBounds();
        const display = screen.getDisplayMatching(bounds);
        if (display) {
            currentDisplayInfo = {
                id: String(display.id),
                width: display.bounds.width,
                height: display.bounds.height,
                scale: display.scaleFactor
            };
            mainWindow.webContents.send('display-changed', currentDisplayInfo);
        }
    } catch(e) {}
}

function createWindow() {
    configurarIsolamentoDispositivos();
    const savedState = getSavedWindowState();
    
    let winOptions = {
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'Idle Pokémon Electron Client - Multi-Contas',
        backgroundColor: '#090d16',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            backgroundThrottling: false
        }
    };

    if (savedState) {
        const allDisplays = screen.getAllDisplays();
        const targetDisplay = allDisplays.find(d => String(d.id) === String(savedState.displayId)) ||
                              allDisplays.find(d => d.bounds.x === savedState.displayBounds?.x && d.bounds.y === savedState.displayBounds?.y);

        if (targetDisplay) {
            winOptions.x = targetDisplay.bounds.x + 30;
            winOptions.y = targetDisplay.bounds.y + 30;
            winOptions.width = Math.min(savedState.width || 1400, targetDisplay.bounds.width - 60);
            winOptions.height = Math.min(savedState.height || 900, targetDisplay.bounds.height - 60);
        } else if (savedState.x !== undefined && savedState.y !== undefined) {
            winOptions.x = savedState.x;
            winOptions.y = savedState.y;
            winOptions.width = savedState.width || 1400;
            winOptions.height = savedState.height || 900;
        }
    }

    mainWindow = new BrowserWindow(winOptions);

    if (savedState && savedState.isMaximized) {
        mainWindow.maximize();
    } else if (!savedState) {
        mainWindow.maximize();
    }

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Atalhos de teclado globais da janela
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if (input.control && input.key.toLowerCase() === 'g') {
                mainWindow.webContents.send('toggle-grid');
                event.preventDefault();
            } else if (input.control && input.alt && input.key.toLowerCase() === 'r') {
                saveWindowState();
                app.relaunch();
                app.exit(0);
                event.preventDefault();
            } else if (input.control && input.shift && input.key.toLowerCase() === 'r') {
                mainWindow.webContents.send('reload-all');
                event.preventDefault();
            } else if (input.key === 'F5') {
                mainWindow.webContents.send('reload-active');
                event.preventDefault();
            } else if (input.key === 'F12') {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
                event.preventDefault();
            }
        }
    });

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));

    mainWindow.on('moved', () => {
        broadcastCurrentDisplay();
        saveWindowState();
    });

    mainWindow.on('resize', () => {
        broadcastCurrentDisplay();
        saveWindowState();
    });

    mainWindow.on('close', saveWindowState);

    mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(broadcastCurrentDisplay, 400);
        setTimeout(broadcastCurrentDisplay, 1200);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    
    // Log de memória a cada 30 segundos
    const memInterval = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const mem = process.memoryUsage();
            registrarLogDebug('MEMORY', `Tick - RSS: ${(mem.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(mem.heapUsed / (1024*1024)).toFixed(1)}MB`);
        }
    }, 30000);
    mainWindow.on('closed', () => clearInterval(memInterval));
}

// Configura handlers nativos em todas as webviews e janelas criadas
app.on('web-contents-created', (event, contents) => {
    // Log de memória quando webview é criada
    const mem = process.memoryUsage();
    registrarLogDebug('MEMORY', `Webview criada - RSS: ${(mem.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(mem.heapUsed / (1024*1024)).toFixed(1)}MB`);
    
    // ⚡ NUNCA permite que Chromium colique qualquer aba/webview em descanso.
    // Sem isso, Auto Hunt/Catch/Sell/Buy e timers rAF pausam quando a aba não está ativa.
    try {
        contents.setBackgroundThrottling(false);
        if (typeof contents.setThrottleWhenBackgrounded === 'function') {
            contents.setThrottleWhenBackgrounded(false);
        }
    } catch(e) {}
    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        if (errorCode !== -3) { // Ignora cancelamento normal
            registrarLogDebug('WEB-FAIL', `Falha ao carregar [${errorCode}] ${errorDescription} em ${validatedURL}`);
        }
    });

    contents.on('console-message', (e, level, message, line, sourceId) => {
        // Logs informativos do jogo são muito frequentes; só persistimos avisos e erros.
        if (level < 2) return;
        const lvStr = level === 3 ? 'WV-ERR' : level === 2 ? 'WV-WARN' : 'WV-LOG';
        const src = sourceId ? path.basename(sourceId) : 'inline';
        registrarLogDebug(lvStr, `${message} (${src}:${line})`);
    });

    contents.on('before-input-event', (e, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            contents.openDevTools({ mode: 'detach' });
            e.preventDefault();
        }
    });

    // Re-aplica o anti-throttle sempre que a webview recarrega (navegação, etc.)
    contents.on('did-navigate', () => {
        try {
            contents.setBackgroundThrottling(false);
        } catch(e) {}
    });

    contents.on('did-navigate-in-page', () => {
        try {
            contents.setBackgroundThrottling(false);
        } catch(e) {}
    });

    contents.setWindowOpenHandler(({ url }) => {
        // Permite que todos os popups (Votação TopIdle, Google OAuth, etc.) abram como janela popup nativa do Electron,
        // herdando a partição e o cache/cookies individuais de cada conta (persist:acc1..4) com stealth ativo
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                width: 850,
                height: 720,
                autoHideMenuBar: true,
                backgroundColor: '#0f172a',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    backgroundThrottling: false
                }
            }
        };
    });
});

// IPC para retornar todos os logs coletados de todas as janelas
ipcMain.on('get-global-debug-logs', (event) => {
    event.returnValue = globalDebugLogs.join('\n');
});

// IPC para o renderer escrever logs no arquivo
// O buffer do log so vira arquivo no flush assincrono; ao fechar, o processo
// morre antes. Aqui, e SO aqui, a escrita sincrona se justifica.
app.on('before-quit', () => {
    try {
        if (_debugBuffer.length) fs.appendFileSync(DEBUG_LOG_PATH, _debugBuffer.join('\n') + '\n', 'utf8');
        _debugBuffer = [];
    } catch (e) { }
});

ipcMain.on('write-debug-log', (event, { tipo, mensagem }) => {
    registrarLogDebug(tipo || 'RENDERER', mensagem || '');
});

// IPC para abrir DevTools da janela/frame que solicitou
ipcMain.on('open-devtools-active', (event) => {
    try {
        if (event && event.sender) {
            event.sender.openDevTools({ mode: 'detach' });
        }
    } catch(e) {}
});

// IPC para abrir login OAuth diretamente
ipcMain.on('open-auth-popup', (event, { url, accountIndex }) => {
    openNativeAuthPopup(url, accountIndex || 0);
});

// IPC para abrir URL no navegador padrão externo se o usuário desejar
ipcMain.on('open-external-url', (event, url) => {
    if (url) {
        try {
            require('electron').shell.openExternal(url);
        } catch(e){}
    }
});

// IPC para forçar background throttling OFF em uma webview específica (chamado pelo renderer)
ipcMain.handle('disable-webview-throttling', async (event, webContentsId) => {
    try {
        const wc = webContents.fromId(webContentsId);
        if (wc && !wc.isDestroyed()) {
            wc.setBackgroundThrottling(false);
            if (typeof wc.setThrottleWhenBackgrounded === 'function') {
                wc.setThrottleWhenBackgrounded(false);
            }
        }
        return { ok: true };
    } catch(e) {
        return { ok: false, error: e.message };
    }
});

// IPC para disparar alerta visual de Shiny na TELA PRINCIPAL (Primary Screen) em setups multi-monitores
let activeShinyAlertWin = null;

function showPrimaryScreenShinyAlert(index, nomeAba, charName, pokeName) {
    try {
        const primary = screen.getPrimaryDisplay();
        const { x, y, width } = primary.workArea;

        // 1. Notificação nativa do Windows (sempre vai para a tela principal do Windows)
        if (Notification.isSupported()) {
            const notif = new Notification({
                title: `✨ SHINY ENCONTRADO! (${nomeAba})`,
                body: `🌟 ${pokeName || 'Pokémon'} Shiny apareceu na conta ${charName || nomeAba}! Clique para abrir.`,
                silent: false,
                urgency: 'critical'
            });
            notif.on('click', () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                    mainWindow.webContents.send('focus-tab', index);
                }
            });
            notif.show();
        }

        // 2. Cria popup flutuante dedicado na TELA PRINCIPAL
        if (activeShinyAlertWin && !activeShinyAlertWin.isDestroyed()) {
            activeShinyAlertWin.close();
        }

        activeShinyAlertWin = new BrowserWindow({
            width: 360,
            height: 110,
            x: x + width - 380,
            y: y + 24,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        const charDisplay = charName && charName !== nomeAba ? ` (${charName})` : '';
        const alertHtml = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            <style>
                body {
                    margin: 0; padding: 0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: transparent; user-select: none;
                }
                .card {
                    background: linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(88, 28, 135, 0.96));
                    border: 2px solid #facc15;
                    border-radius: 12px;
                    padding: 10px 14px;
                    color: #fff;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(250, 204, 21, 0.6);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    animation: pulse 1.2s infinite alternate;
                }
                @keyframes pulse {
                    from { box-shadow: 0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(250,204,21,0.4); }
                    to { box-shadow: 0 8px 30px rgba(0,0,0,0.8), 0 0 30px rgba(250,204,21,0.8), 0 0 18px rgba(236,72,153,0.6); }
                }
            </style>
            </head>
            <body>
            <div class="card" id="card">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:12.5px; font-weight:900; color:#fde047; display:flex; align-items:center; gap:5px">
                        <span>✨</span> <span>SHINY ENCONTRADO!</span>
                    </span>
                    <span style="font-size:9.5px; background:linear-gradient(135deg,#facc15,#eab308); color:#090d16; font-weight:900; padding:2px 7px; border-radius:10px">VER ABA ➔</span>
                </div>
                <div style="font-size:11px; color:#e2e8f0">Conta <b style="color:#38bdf8">${nomeAba}</b><span style="color:#a5b4fc">${charDisplay}</span></div>
                <div style="font-size:13px; font-weight:900; color:#facc15">🌟 ${pokeName || 'Pokémon'} Shiny!</div>
            </div>
            <script>
                const { ipcRenderer } = require('electron');
                document.getElementById('card').onclick = () => {
                    ipcRenderer.send('shiny-primary-alert-clicked', ${index});
                };
            </script>
            </body>
            </html>
        `;

        activeShinyAlertWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(alertHtml)}`);

        setTimeout(() => {
            if (activeShinyAlertWin && !activeShinyAlertWin.isDestroyed()) {
                activeShinyAlertWin.close();
                activeShinyAlertWin = null;
            }
        }, 9000);
    } catch(e) {}
}

ipcMain.on('show-primary-screen-shiny-alert', (event, { index, nomeAba, charName, pokeName }) => {
    showPrimaryScreenShinyAlert(index, nomeAba, charName, pokeName);
});

ipcMain.on('shiny-primary-alert-clicked', (event, accountIndex) => {
    if (activeShinyAlertWin && !activeShinyAlertWin.isDestroyed()) {
        activeShinyAlertWin.close();
        activeShinyAlertWin = null;
    }
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('focus-tab', accountIndex);
    }
});

// IPC para reiniciar o aplicativo completamente
ipcMain.on('restart-app', () => {
    saveWindowState();
    app.relaunch();
    app.exit(0);
});

// IPC para fornecer o script de injeção (gerado de scripts/*.js) às webviews
ipcMain.handle('get-tamper-script', async () => {
    try {
        const p = path.join(__dirname, 'scripts', 'dist', 'game-injector.js');
        if (fs.existsSync(p)) {
            const size = fs.statSync(p).size;
            registrarLogDebug('SCRIPT', `Script carregado: ${p} (${size} bytes)`);
            return fs.readFileSync(p, 'utf8');
        }
        registrarLogDebug('SCRIPT-ERR', 'Nenhum arquivo de script encontrado!');
        return '';
    } catch (err) {
        console.error('Erro ao ler script de injeção:', err);
        return '';
    }
});



app.whenReady().then(async () => {
    iniciarDebugLog();
    
    // Log de memória no início
    const memInicial = process.memoryUsage();
    registrarLogDebug('MEMORY', `INÍCIO - RSS: ${(memInicial.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(memInicial.heapUsed / (1024*1024)).toFixed(1)}/${(memInicial.heapTotal / (1024*1024)).toFixed(1)}MB | External: ${(memInicial.external / (1024*1024)).toFixed(1)}MB`);
    registrarLogDebug('MEMORY', `Uptime: ${(process.uptime()).toFixed(1)}s`);
    
    registrarLogDebug('STARTUP', `App inicializado. Electron: ${process.versions.electron || 'N/A'}, Node: ${process.version}`);
    registrarLogDebug('STARTUP', `UserData: ${app.getPath('userData')}`);
    registrarLogDebug('STARTUP', `Dirname: ${__dirname}`);
    registrarLogDebug('STARTUP', `Argv: ${JSON.stringify(process.argv)}`);

    // Limpa sessões se --clear-sessions estiver no comando
    if (process.argv.includes('--clear-sessions')) {
        console.log('[MAIN] Limpando todas as sessões/partições...');
        const partitions = ['default', 'persist:acc1', 'persist:acc2', 'persist:acc3', 'persist:acc4', 'persist:acc5', 'persist:acc6', 'persist:acc7', 'persist:acc8', 'persist:acc9', 'persist:acc10', 'persist:acc11', 'persist:acc12', 'persist:acc13', 'persist:acc14', 'persist:acc15', 'persist:acc16'];
        for (const part of partitions) {
            try {
                const ses = part === 'default' ? session.defaultSession : session.fromPartition(part);
                await ses.clearStorageData();
                await ses.clearCache();
                console.log(`[MAIN] Sessão ${part} limpa com sucesso.`);
            } catch(e) {}
        }
        // Limpa dados do IndexedDB e LocalStorage do Electron
        try {
            const userDataPath = app.getPath('userData');
            const partitionsDir = path.join(userDataPath, 'Partitions');
            if (fs.existsSync(partitionsDir)) {
                fs.rmSync(partitionsDir, { recursive: true, force: true });
                console.log('[MAIN] Pasta Partitions removida:', partitionsDir);
            }
        } catch(e) { console.error('[MAIN] Erro ao limpar Partitions:', e); }
        console.log('[MAIN] Limpeza concluída! Reiniciando...');
        app.relaunch();
        app.exit(0);
        return;
    }

    configurarIsolamentoDispositivos();
    
    const memPreWindow = process.memoryUsage();
    registrarLogDebug('MEMORY', `Pré-Window - RSS: ${(memPreWindow.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(memPreWindow.heapUsed / (1024*1024)).toFixed(1)}MB`);
    
    createWindow();

    // Auto-update: verifica no GitHub Releases do repo (package.json ->
    // build.publish) se tem versao mais nova, baixa em segundo plano e
    // avisa quando estiver pronta pra instalar no proximo restart. So
    // funciona empacotado (app.isPackaged) -- rodando via `npm start` o
    // electron-updater nao acha feed nenhum e so loga um aviso, sem quebrar.
    if (app.isPackaged) {
        try {
            autoUpdater.logger = { info: (m) => registrarLogDebug('UPDATER', m), warn: (m) => registrarLogDebug('UPDATER-WARN', m), error: (m) => registrarLogDebug('UPDATER-ERR', m) };
            autoUpdater.on('update-available', (info) => registrarLogDebug('UPDATER', `Atualizacao disponivel: v${info.version}`));
            autoUpdater.on('update-downloaded', (info) => {
                registrarLogDebug('UPDATER', `Atualizacao v${info.version} baixada -- sera aplicada ao reiniciar.`);
                if (mainWindow) mainWindow.webContents.send('update-downloaded', info.version);
            });
            autoUpdater.on('error', (err) => registrarLogDebug('UPDATER-ERR', String(err && err.message || err)));
            autoUpdater.checkForUpdatesAndNotify();
        } catch (e) { registrarLogDebug('UPDATER-ERR', String(e && e.message || e)); }
    }

    const memPosWindow = process.memoryUsage();
    registrarLogDebug('MEMORY', `Pós-Window - RSS: ${(memPosWindow.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(memPosWindow.heapUsed / (1024*1024)).toFixed(1)}MB`);
    registrarLogDebug('STARTUP', `Window criada em ${(process.uptime()).toFixed(1)}s`);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
