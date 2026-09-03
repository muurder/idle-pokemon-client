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
            if (input.control && input.key >= '1' && input.key <= '9') {
                mainWindow.webContents.send('switch-tab', parseInt(input.key) - 1);
                event.preventDefault();
            } else if (input.control && (input.key.toLowerCase() === 'g' || input.key.toLowerCase() === 'm')) {
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
            } else if (input.control && input.key.toLowerCase() === 't') {
                mainWindow.webContents.send('toggle-trade-hub');
                event.preventDefault();
            } else if (input.control && input.key.toLowerCase() === 'm') {
                mainWindow.webContents.send('toggle-eval-meta');
                event.preventDefault();
            } else if (input.control && input.key.toLowerCase() === 'e') {
                mainWindow.webContents.send('toggle-editor');
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

// @client:off  -- autenticacao de proxy no evento login do webContents
    // Autenticação de proxy por webContents (Electron 30+)
    contents.on('login', (event, request, authInfo, callback) => {
        registrarLogDebug('PROXY-AUTH', `[WC login] isProxy=${authInfo.isProxy} host=${authInfo.host}:${authInfo.port} realm=${authInfo.realm || ''} scheme=${authInfo.scheme || ''}`);
        if (authInfo.isProxy) {
            event.preventDefault();
            handleProxyAuth(authInfo, callback);
        }
    });
// @client:on
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

// @client:off  -- logs de auto hunt, ginasio, memoria compartilhada, relatorio completo
// =====================================================================
// LOG DO AUTO HUNT — um arquivo por conta, em logs-auto-hunt/
// =====================================================================
// O Auto Hunt decide zona, alvo e teleporte a cada tick, e até agora a única
// forma de entender por que ele escolheu X era olhar a tela no momento certo.
// Aqui cada decisão é gravada em disco, com o motivo, pra dar pra reconstruir
// o que aconteceu depois do fato.
const AUTOHUNT_LOG_DIR = path.join(PASTA_DADOS, 'logs-auto-hunt');
const _ahLogSessao = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function caminhoLogAutoHunt(conta) {
    try {
        if (!fs.existsSync(AUTOHUNT_LOG_DIR)) fs.mkdirSync(AUTOHUNT_LOG_DIR, { recursive: true });
    } catch (e) { return null; }
    const n = String(conta == null ? 'x' : conta).replace(/[^\w-]/g, '');
    return path.join(AUTOHUNT_LOG_DIR, `autohunt_${_ahLogSessao}_conta${n}.log`);
}

ipcMain.on('autohunt-log', (event, payload) => {
    try {
        const { conta, linhas } = payload || {};
        if (!Array.isArray(linhas) || !linhas.length) return;
        const arq = caminhoLogAutoHunt(conta);
        if (!arq) return;
        // Assincrono: este handler dispara por EVENTO do jogo, nas 11 contas.
        // Sincrono aqui bloqueia o event loop do processo que coordena todas
        // as webviews — mesmo motivo do log de debug la em cima.
        fs.appendFile(arq, linhas.join('\n') + '\n', 'utf8', () => {});
    } catch (e) { /* log nunca pode derrubar o app */ }
});

ipcMain.handle('autohunt-log-dir', async () => {
    try {
        if (!fs.existsSync(AUTOHUNT_LOG_DIR)) fs.mkdirSync(AUTOHUNT_LOG_DIR, { recursive: true });
        const arquivos = fs.readdirSync(AUTOHUNT_LOG_DIR)
            .filter(f => f.endsWith('.log'))
            .map(f => {
                const st = fs.statSync(path.join(AUTOHUNT_LOG_DIR, f));
                return { arquivo: f, bytes: st.size, modificado: st.mtime.toISOString() };
            })
            .sort((a, b) => b.modificado.localeCompare(a.modificado));
        return { dir: AUTOHUNT_LOG_DIR, arquivos };
    } catch (e) {
        return { dir: AUTOHUNT_LOG_DIR, arquivos: [], erro: String(e && e.message || e) };
    }
});

// =====================================================================
// LOG DO GINÁSIO — um arquivo por conta, em logs-ginasio/
// =====================================================================
// Mesmo motivo do log do Auto Hunt: o log da batalha só vivia na caixa do
// painel e rotacionava em 500 linhas, então o que explicava a derrota sumia
// antes de dar pra analisar. Aqui cada batalha fica em disco inteira.
const GYM_LOG_DIR = path.join(PASTA_DADOS, 'logs-ginasio');
const _gymLogSessao = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

function caminhoLogGinasio(conta) {
    try {
        if (!fs.existsSync(GYM_LOG_DIR)) fs.mkdirSync(GYM_LOG_DIR, { recursive: true });
    } catch (e) { return null; }
    const n = String(conta == null ? 'x' : conta).replace(/[^\w-]/g, '');
    return path.join(GYM_LOG_DIR, `ginasio_${_gymLogSessao}_conta${n}.log`);
}

// Linhas acumuladas desde o fim da ultima batalha, por conta. E o que vira o
// ULTIMA-BATALHA_contaN.log quando a luta fecha.
const _gymBufferConta = {};

// Condensa o bloco «batalha-fim» numa linha de indice. Se o formato mudar, a
// linha sai com o que der em vez de sumir: o RESUMO nunca fica com buraco.
function gymLinhaResumo(conta, linha) {
    const p = (re, padrao) => { const m = linha.match(re); return m ? m[1] : padrao; };
    const hora = p(/^\[([0-9:.]+)\]/, '--:--:--');
    return [
        hora,
        'C' + String(conta).padStart(2, ' '),
        (p(/resultado=([a-z-]+)/, '?') + '        ').slice(0, 14),
        (p(/leader=([^\u00b7]+?)\s*\u00b7/, '?') + '              ').slice(0, 14),
        'T' + p(/turnos=(\d+)/, '?').padStart(3, ' '),
        'KO ' + p(/inimigosKO=(\d+)/, '?'),
        'mortos ' + p(/nossosMortos=(\d+)/, '?'),
        p(/placar=([^\u00b7]+?)\s*\u00b7/, '')
    ].join('  ');
}

ipcMain.on('gym-log', (event, payload) => {
    try {
        const { conta, linhas } = payload || {};
        if (!Array.isArray(linhas) || !linhas.length) return;
        const arq = caminhoLogGinasio(conta);
        if (!arq) return;
        // Assincrono: este handler dispara por EVENTO do jogo, nas 11 contas.
        // Sincrono aqui bloqueia o event loop do processo que coordena todas
        // as webviews — mesmo motivo do log de debug la em cima.
        fs.appendFile(arq, linhas.join('\n') + '\n', 'utf8', () => {});

        // ── visoes rapidas ──
        const chave = String(conta);
        const buf = _gymBufferConta[chave] || (_gymBufferConta[chave] = []);
        for (const linha of linhas) {
            buf.push(linha);
            if (String(linha).indexOf('\u00abbatalha-fim\u00bb') < 0) continue;
            try {
                // A batalha inteira, sozinha num arquivo: e o que se quer ler
                // logo depois de uma luta dar errado.
                const n = String(conta == null ? 'x' : conta).replace(/[^\w-]/g, '');
                fs.writeFileSync(
                    path.join(GYM_LOG_DIR, `ULTIMA-BATALHA_conta${n}.log`),
                    buf.join('\n') + '\n', 'utf8');
                // Indice de uma linha por batalha, todas as contas juntas.
                fs.appendFile(path.join(GYM_LOG_DIR, 'RESUMO.log'),
                    gymLinhaResumo(conta, linha) + '\n', 'utf8', () => {});
            } catch (e) { /* idem: log nao derruba o app */ }
            buf.length = 0;
        }
        // Teto de seguranca: uma sessao sem nenhuma batalha fechada nao pode
        // acumular o log inteiro em memoria.
        if (buf.length > 4000) buf.splice(0, buf.length - 2000);
    } catch (e) { /* log nunca pode derrubar o app */ }
});

ipcMain.handle('gym-log-dir', async () => {
    try {
        if (!fs.existsSync(GYM_LOG_DIR)) fs.mkdirSync(GYM_LOG_DIR, { recursive: true });
        const arquivos = fs.readdirSync(GYM_LOG_DIR)
            .filter(f => f.endsWith('.log'))
            .map(f => {
                const st = fs.statSync(path.join(GYM_LOG_DIR, f));
                return { arquivo: f, bytes: st.size, modificado: st.mtime.toISOString() };
            })
            .sort((a, b) => b.modificado.localeCompare(a.modificado));
        return { dir: GYM_LOG_DIR, arquivos };
    } catch (e) {
        return { dir: GYM_LOG_DIR, arquivos: [], erro: String(e && e.message || e) };
    }
});

// =====================================================================
// MEMÓRIA COMPARTILHADA DO GINÁSIO — dados-ginasio/memoria-compartilhada.json
// =====================================================================
// Os líderes são os mesmos para todas as contas, então o que uma aprende as
// outras deveriam saber. Cada conta grava a PRÓPRIA fatia e o agregado é
// calculado na leitura — assim sincronizar duas vezes não duplica nada.
const GYM_DADOS_DIR = path.join(PASTA_DADOS, 'dados-ginasio');
const GYM_MEM_ARQ = path.join(GYM_DADOS_DIR, 'memoria-compartilhada.json');

function gymMemCarregar() {
    try {
        if (!fs.existsSync(GYM_MEM_ARQ)) return { contas: {} };
        const o = JSON.parse(fs.readFileSync(GYM_MEM_ARQ, 'utf8'));
        return (o && typeof o === 'object' && o.contas) ? o : { contas: {} };
    } catch (e) { return { contas: {} }; }
}

// Soma as fatias numa visao por lider. Media de dano NAO entra: os times tem
// niveis muito diferentes (Nv203 a Nv787 nos logs) e o dano de uma conta nao
// prevê o da outra. Vai só o que é universal: placar e turnos de dano zero.
function gymMemAgregar(base) {
    const fora = {};
    for (const [conta, mem] of Object.entries(base.contas || {})) {
        for (const [lid, d] of Object.entries(mem || {})) {
            const a = fora[lid] || (fora[lid] = { tentativas: 0, vitorias: 0, derrotas: 0, contas: 0, imunes: {} });
            a.tentativas += (d && d.tentativas) || 0;
            a.vitorias += (d && d.vitorias) || 0;
            a.derrotas += (d && d.derrotas) || 0;
            a.contas++;
            for (const [golpe, m] of Object.entries((d && d.moves) || {})) {
                if (!m || !m.count) continue;
                const g = a.imunes[golpe] || (a.imunes[golpe] = { count: 0, zeros: 0, total: 0 });
                g.count += m.count; g.zeros += m.zeros || 0; g.total += m.total || 0;
            }
        }
    }
    return fora;
}

ipcMain.handle('gym-mem-sync', async (event, payload) => {
    try {
        const { conta, memoria } = payload || {};
        if (conta == null || !memoria) return null;
        const base = gymMemCarregar();
        base.contas[String(conta)] = memoria;   // sobrescreve a fatia: idempotente
        try {
            if (!fs.existsSync(GYM_DADOS_DIR)) fs.mkdirSync(GYM_DADOS_DIR, { recursive: true });
            fs.writeFileSync(GYM_MEM_ARQ, JSON.stringify(base), 'utf8');
        } catch (e) { /* disco cheio nao pode derrubar o app */ }
        return gymMemAgregar(base);
    } catch (e) {
        return null;
    }
});

// IPC para gerar relatório unificado de diagnóstico com dados de proxy, sistema e logs
ipcMain.handle('get-full-diagnostic-report', async (event, clientState) => {
    try {
        const mem = process.memoryUsage();
        const infoCabecalho = [
            '================================================================================',
            '          IDLE POKÉMON MULTI-CLIENT - RELATÓRIO COMPLETO DE DIAGNÓSTICO & PROXY',
            '================================================================================',
            `Timestamp: ${new Date().toLocaleString('pt-BR')} (${new Date().toISOString()})`,
            `Plataforma: ${process.platform} (${process.arch}) | Electron: ${process.versions.electron} | Chrome: ${process.versions.chrome} | Node: ${process.versions.node}`,
            `Memória Processo Main (RSS): ${(mem.rss / (1024 * 1024)).toFixed(1)} MB | Heap: ${(mem.heapUsed / (1024 * 1024)).toFixed(1)} / ${(mem.heapTotal / (1024 * 1024)).toFixed(1)} MB`,
            `Total de Contas Ativas no Renderer: ${clientState?.totalContas || 'N/A'}`,
            `Aba Selecionada Atual: ${clientState?.currentTab != null ? `Conta ${clientState.currentTab + 1}` : 'N/A'}`
        ].join('\n');

        const linhasProxy = [
            '\n--------------------------------------------------------------------------------',
            '                       ESTADO DAS CONTAS & CONFIGURAÇÕES DE PROXY',
            '--------------------------------------------------------------------------------'
        ];

        const proxies = clientState?.listaProxies || [];
        const nomes = clientState?.nomesAbas || [];
        const total = Math.max(proxies.length, clientState?.totalContas || 4);

        for (let i = 0; i < total; i++) {
            const partName = `persist:acc${i + 1}`;
            const rule = (proxies[i] || '').trim();
            const nome = nomes[i] || `Conta ${i + 1}`;
            
            let authInfoStr = 'Sem auth';
            const authEntry = proxyAuthMap[partName];
            if (authEntry && authEntry.username) {
                authInfoStr = `Auth: ${authEntry.username}:*** (${authEntry.host}:${authEntry.port})`;
            }

            let statusProxy = 'DIRETO (Sem Proxy)';
            if (rule && rule.toLowerCase() !== 'direct') {
                statusProxy = `PROXY: ${rule} [${authInfoStr}]`;
            }

            linhasProxy.push(`• Conta ${i + 1} (${nome}) [${partName}]: ${statusProxy}`);
        }

        const linhasAuthMap = [
            '\n--------------------------------------------------------------------------------',
            '                     CREDENCIAS DE PROXY REGISTRADAS EM MEMÓRIA',
            '--------------------------------------------------------------------------------'
        ];

        const chavesAuth = Object.keys(proxyAuthMap);
        if (chavesAuth.length === 0) {
            linhasAuthMap.push('Nenhuma credencial de proxy em memória no momento.');
        } else {
            for (const k of chavesAuth) {
                const cred = proxyAuthMap[k];
                linhasAuthMap.push(`• [Key: ${k}] -> Host: ${cred.host || '?'}, Port: ${cred.port || '?'}, User: ${cred.username || '?'}`);
            }
        }

        const linhasLogs = [
            '\n--------------------------------------------------------------------------------',
            `               HISTÓRICO DE LOGS (Últimos ${globalDebugLogs.length} eventos)`,
            '--------------------------------------------------------------------------------',
            globalDebugLogs.join('\n')
        ];

        return [infoCabecalho, linhasProxy.join('\n'), linhasAuthMap.join('\n'), linhasLogs.join('\n'), '================================================================================'].join('\n');
    } catch(err) {
        return `Erro ao gerar relatório de diagnóstico: ${err.stack || err.message}`;
    }
});

// @client:on
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

// IPC para fornecer o script bug-test-suite às webviews
ipcMain.handle('get-tamper-script', async () => {
    try {
        // 1) PRIORIDADE: arquivo pré-gerado (validado, funciona)
        const pathsToTry = [
            // O cliente empacota so as docas, com outro nome. Primeiro da
            // lista: no dev este arquivo nao existe e cai no seguinte.
            path.join(__dirname, 'bug-test-suite.client.js'),
            path.join(__dirname, 'bug-test-suite.gerado.tampermonkey.js'),
            path.join(__dirname, '..', 'bug-test-suite.gerado.tampermonkey.js'),
            path.join(__dirname, 'bug-test-suite.tampermonkey.js'),
            path.join(__dirname, '..', 'bug-test-suite.tampermonkey.js'),
            path.join(process.resourcesPath, 'bug-test-suite.tampermonkey.js')
        ];
        for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
                const size = fs.statSync(p).size;
                registrarLogDebug('SCRIPT', `Script carregado: ${p} (${size} bytes)`);
                return fs.readFileSync(p, 'utf8');
            }
        }
        registrarLogDebug('SCRIPT-ERR', 'Nenhum arquivo de script encontrado!');
        return '';
    } catch (err) {
        console.error('Erro ao ler script do tampermonkey:', err);
        return '';
    }
});



// @client:off  -- save-tamper-script (grava o userscript inteiro) + proxy + bandwidth + Tor
// IPC para salvar o script bug-test-suite no disco
ipcMain.handle('save-tamper-script', async (event, newCode) => {
    try {
        const targetPath = path.join(__dirname, '..', 'bug-test-suite.tampermonkey.js');
        fs.writeFileSync(targetPath, newCode, 'utf8');
        console.log('[Script Editor] bug-test-suite.tampermonkey.js atualizado com sucesso. Tamanho:', newCode.length, 'bytes.');
        return { success: true };
    } catch (err) {
        console.error('Erro ao salvar script do tampermonkey:', err);
        return { success: false, error: err.message };
    }
});

function handleProxyAuth(authInfo, callback) {
    if (!authInfo || !authInfo.isProxy) return;
    const host = (authInfo.host || '').toLowerCase().trim();
    const port = String(authInfo.port || '').trim();
    const hostPortKey = `${host}:${port}`;
    registrarLogDebug('PROXY-AUTH', `[handleProxyAuth] Buscando credenciais para ${hostPortKey}. Map keys: ${Object.keys(proxyAuthMap).join(', ')}`);

    // 1. Tenta buscar por host:porta exato
    if (proxyAuthMap[hostPortKey] && proxyAuthMap[hostPortKey].username) {
        const creds = proxyAuthMap[hostPortKey];
        console.log(`[Proxy Auth] Autenticado com sucesso para ${hostPortKey} (user: ${creds.username})`);
        callback(creds.username, creds.password || '');
        return;
    }

    // 2. Tenta buscar por host
    if (proxyAuthMap[host] && proxyAuthMap[host].username) {
        const creds = proxyAuthMap[host];
        console.log(`[Proxy Auth] Autenticado por host ${host} (user: ${creds.username})`);
        callback(creds.username, creds.password || '');
        return;
    }

    // 3. Tenta buscar em qualquer registro que contenha o host ou porta correspondente
    for (const [key, creds] of Object.entries(proxyAuthMap)) {
        if (creds && creds.username && (creds.host === host || String(creds.port) === port)) {
            console.log(`[Proxy Auth] Autenticado via registro ${key} para ${host}:${port}`);
            callback(creds.username, creds.password || '');
            return;
        }
    }

    // 4. Fallback: primeira credencial cadastrada válida
    for (const [key, creds] of Object.entries(proxyAuthMap)) {
        if (creds && creds.username) {
            console.log(`[Proxy Auth] Fallback de credenciais via ${key}`);
            callback(creds.username, creds.password || '');
            return;
        }
    }

    registrarLogDebug('PROXY-AUTH', `[handleProxyAuth] NENHUMA credencial encontrada para ${host}:${port}`);
    callback('', '');
}

// Login de proxy via contents.on('login') no web-contents-created (mais confiável para webviews)
// NÃO usar app.on('login') junto — causa 'callback called more than once'



// Extrai protocolo, host, porta e credenciais de uma URL de proxy
function extrairRegraProxy(rawRule, partitionName) {
    if (!rawRule || rawRule.trim() === '' || rawRule.trim().toLowerCase() === 'direct') {
        if (partitionName) delete proxyAuthMap[partitionName];
        return 'direct://';
    }
    let rule = rawRule.trim();

    // 1. Suporte ao formato popular IP:PORT:USER:PASS (ex: 203.0.113.10:6754:usuario:senha)
    const colons = rule.split(':');
    if (colons.length === 4 && !rule.includes('://') && !rule.includes('@')) {
        const [ip, port, user, pass] = colons;
        const host = ip.trim();
        const pNum = parseInt(port.trim(), 10);
        const creds = { username: user.trim(), password: pass.trim(), host, port: pNum };
        if (partitionName) proxyAuthMap[partitionName] = creds;
        proxyAuthMap[`${host}:${pNum}`.toLowerCase()] = creds;
        proxyAuthMap[host.toLowerCase()] = creds;
        proxyAuthMap[String(pNum)] = creds;
        return `http://${host}:${pNum}`;
    }

    try {
        let proto = 'http';
        if (rule.includes('://')) {
            const split = rule.split('://');
            proto = (split[0] || 'http').toLowerCase();
            rule = split[1] || '';
        }
        if (rule.includes('@')) {
            const [auth, hostPort] = rule.split('@');
            const [user, pass] = auth.split(':');
            const [host, port] = (hostPort || '').split(':');
            const pNum = port ? parseInt(port.trim(), 10) : (proto === 'https' ? 443 : 80);
            const creds = { username: decodeURIComponent(user || ''), password: decodeURIComponent(pass || ''), host: host ? host.trim() : '', port: pNum };
            if (partitionName) proxyAuthMap[partitionName] = creds;
            if (host) {
                proxyAuthMap[`${host.trim()}:${pNum}`.toLowerCase()] = creds;
                proxyAuthMap[host.trim().toLowerCase()] = creds;
            }
            if (proto.startsWith('socks')) {
                return `socks5://${hostPort.trim()}`;
            }
            return `http://${hostPort.trim()}`;
        }
        
        if (proto.startsWith('socks')) {
            return `socks5://${rule.trim()}`;
        }
        return `http://${rule.trim()}`;
    } catch(e) {
        return rawRule.trim();
    }
}

// IPC para aplicar configuração de proxy por partição de conta
ipcMain.handle('set-account-proxy', async (event, { accountIndex, proxyRule }) => {
    try {
        const partitionName = `persist:acc${accountIndex + 1}`;
        configurarParticaoConta(partitionName, accountIndex + 1);
        const ses = session.fromPartition(partitionName);
        const finalRule = extrairRegraProxy(proxyRule, partitionName);
        registrarLogDebug('PROXY', `Conta ${accountIndex + 1} (${partitionName}): Aplicando proxy -> ${finalRule}`);
        registrarLogDebug('PROXY', `[setProxy] Conta ${accountIndex + 1}: rule=${finalRule} bypass=<local>`);
        await ses.setProxy({ proxyRules: finalRule, proxyBypassRules: '<local>' });
        registrarLogDebug('PROXY', `Conta ${accountIndex + 1}: Proxy aplicado com sucesso`);
        return { success: true, finalRule };
    } catch (err) {
        registrarLogDebug('PROXY-ERR', `Conta ${accountIndex + 1}: ERRO ao aplicar proxy: ${err.message}`);
        return { success: false, error: err.message };
    }
});

// IPC para aplicar todos os proxies salvos na inicialização
ipcMain.handle('apply-all-proxies', async (event, proxyList) => {
    try {
        if (!Array.isArray(proxyList)) return { success: false };
        registrarLogDebug('PROXY', `Aplicando ${proxyList.length} proxies...`);
        let proxiesAtivos = 0;
        for (let i = 0; i < proxyList.length; i++) {
            const rule = (proxyList[i] || '').trim();
            const partitionName = `persist:acc${i + 1}`;
            configurarParticaoConta(partitionName, i + 1);
            const ses = session.fromPartition(partitionName);
            const finalRule = extrairRegraProxy(rule, partitionName);
            registrarLogDebug('PROXY', `[apply-all] Conta ${i + 1}: rule=${finalRule}`);
            await ses.setProxy({ proxyRules: finalRule, proxyBypassRules: '<local>' });
            if (finalRule !== 'direct://') {
                registrarLogDebug('PROXY', `Conta ${i + 1}: ${finalRule}`);
                proxiesAtivos++;
            }
        }
        registrarLogDebug('PROXY', `Resultado: ${proxiesAtivos} contas com proxy, ${proxyList.length - proxiesAtivos} diretas`);
        return { success: true };
    } catch (err) {
        registrarLogDebug('PROXY-ERR', `Erro ao inicializar proxies: ${err.message}`);
        return { success: false, error: err.message };
    }
});

// IPC para obter dados de consumo de banda por conta
ipcMain.handle('get-bandwidth-stats', async (event, accountIndex) => {
    try {
        if (accountIndex !== undefined && accountIndex !== null) {
            const partitionName = `persist:acc${accountIndex + 1}`;
            const key = getBandwidthKey(partitionName);
            const data = bandwidthMap[key] || { sent: 0, received: 0, requests: 0, lastUpdate: 0 };
            return { success: true, data };
        }
        // Retorna todas as contas
        const all = {};
        for (let i = 0; i < 16; i++) {
            const partitionName = `persist:acc${i + 1}`;
            const key = getBandwidthKey(partitionName);
            all[i] = bandwidthMap[key] || { sent: 0, received: 0, requests: 0, lastUpdate: 0 };
        }
        return { success: true, data: all };
    } catch(err) {
        return { success: false, error: err.message };
    }
});

// IPC para resetar contadores de banda
ipcMain.handle('reset-bandwidth-stats', async (event) => {
    for (const key of Object.keys(bandwidthMap)) {
        bandwidthMap[key] = { sent: 0, received: 0, requests: 0, lastUpdate: Date.now() };
    }
    return { success: true };
});

// IPC para testar em tempo real o IP de saída da partição da conta
ipcMain.handle('testar-ip-proxy-conta', async (event, accountIndex) => {
    try {
        const partitionName = `persist:acc${accountIndex + 1}`;
        const ses = session.fromPartition(partitionName);
        const start = Date.now();
        const response = await net.fetch('https://api.ipify.org?format=json', {
            session: ses
        });
        const data = await response.json();
        const lat = Date.now() - start;
        return { ok: true, ip: data.ip, lat };
    } catch (err) {
        return { ok: false, error: err.message || 'Falha ao conectar' };
    }
});

// =====================================================
// SISTEMA DE PROXY TOR (SOCKS5)
// =====================================================
let torProcess = null;
let torStatus = 'stopped'; // 'stopped' | 'starting' | 'running' | 'error'
let torError = null;
const TOR_BASE_SOCKS_PORT = 9050; // Conta 1=9050, Conta 2=9051, ..., Conta 10=9059
const TOR_CONTROL_PORT = 9151;     // Porta de controle separada
const MAX_TOR_ACCOUNTS = 10;
const torProxiedAccounts = new Set(); // contas usando Tor

function torPortForAccount(idx) { return TOR_BASE_SOCKS_PORT + idx; }

/** Caminhos possíveis onde o Tor pode estar instalado no Windows */
function encontrarTorBinary() {
    const candidates = [
        // Bundled com o projeto (pasta browser_pokemoon_dev/tor/)
        path.join(__dirname, 'tor', 'tor.exe'),
        // Acima do projeto (pasta dev/tor/)
        path.join(__dirname, '..', 'tor', 'tor.exe'),
        path.join(__dirname, '..', 'Tor', 'tor.exe'),
        // Tor Browser instalado
        path.join(process.env.PROGRAMFILES || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
        'C:\\Program Files\Tor Browser\Browser\TorBrowser\Tor\tor.exe',
        'C:\\Program Files (x86)\Tor Browser\Browser\TorBrowser\Tor\tor.exe',
        // Portable / userData
        path.join(app.getPath('userData'), 'tor', 'tor.exe'),
    ];
    // Allow override via env
    if (process.env.TOR_BINARY) candidates.unshift(process.env.TOR_BINARY);
    for (const c of candidates) {
        try {
            if (fs.existsSync(c)) return c;
        } catch(e) {}
    }
    return null;
}

/** Gera um torrc mínimo para SOCKS5 na porta 9050 */
function criarTorrcTemp() {
    const torrcPath = path.join(app.getPath('userData'), 'torrc.conf');
    const torDataDir = path.join(app.getPath('userData'), 'tor-data');
    // GeoIP data files (bundled with Tor Expert Bundle) — usar caminhos absolutos
    const torDir = path.join(__dirname, 'tor');
    const geoipPath = path.resolve(path.join(torDir, 'data', 'geoip'));
    const geoip6Path = path.resolve(path.join(torDir, 'data', 'geoip6'));
    const hasGeoip = fs.existsSync(geoipPath);

    // Uma SocksPort por conta (9050-9059), cada uma com SessionGroup único
    // Isso garante que cada conta usa um circuito Tor diferente (exit node diferente)
    const socksPorts = [];
    for (let i = 0; i < MAX_TOR_ACCOUNTS; i++) {
        socksPorts.push(`SocksPort ${TOR_BASE_SOCKS_PORT + i} SessionGroup=${i} IsolateDestPort IsolateDestAddr`);
    }

    const content = [
        ...socksPorts,
        `ControlPort ${TOR_CONTROL_PORT}`,
        `DataDirectory ${torDataDir}`,
        'Log notice stdout',
        'RunAsDaemon 0',
        // Exit nodes: prefer non-blacklisted countries
        'ExcludeExitNodes {cn},{ru},{ir},{kp}',
        'StrictNodes 0',
        // GeoIP data for country-level exit node selection
        ...(hasGeoip ? [`GeoIPFile ${geoipPath}`, `GeoIPv6File ${geoip6Path}`] : []),
    ].join('\n');
    try {
        fs.mkdirSync(torDataDir, { recursive: true });
    } catch(e) {}
    try {
        fs.writeFileSync(torrcPath, content, 'utf8');
    } catch(e) {}
    return torrcPath;
}

/** Inicia o processo Tor */
function iniciarTor() {
    return new Promise((resolve, reject) => {
        if (torProcess && torStatus === 'running') {
            return resolve(true);
        }
        const torBin = encontrarTorBinary();
        if (!torBin) {
            torStatus = 'error';
            torError = 'Tor não encontrado. Coloque tor.exe na pasta /tor/ do projeto ou instale o Tor Browser.';
            console.error(`[Tor] ${torError}`);
            return reject(new Error(torError));
        }

        torStatus = 'starting';
        torError = null;
        console.log(`[Tor] Iniciando Tor de: ${torBin}`);

        // Matar qualquer processo Tor anterior que possa estar usando as portas
        try {
            const { execSync } = require('child_process');
            execSync('taskkill /F /IM tor.exe', { stdio: 'ignore', windowsHide: true });
        } catch(e) {}

        const torrcPath = criarTorrcTemp();
        const torDir = path.join(__dirname, 'tor');
        console.log(`[Tor] torrc gerado em: ${torrcPath}`);
        console.log(`[Tor] Portas SOCKS: ${TOR_BASE_SOCKS_PORT}-${TOR_BASE_SOCKS_PORT + MAX_TOR_ACCOUNTS - 1}`);
        try {
            // NÃO usar --defaults-torrc para evitar conflitos com paths do Tor Browser
            const args = ['-f', torrcPath];
            torProcess = spawn(torBin, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false,
                windowsHide: true,
                cwd: torDir // tor needs to find geoip data relative to cwd
            });
        } catch(e) {
            torStatus = 'error';
            torError = `Falha ao executar Tor: ${e.message}`;
            console.error(`[Tor] ${torError}`);
            return reject(e);
        }

        let bootstrapped = false;
        const timeout = setTimeout(() => {
            if (!bootstrapped) {
                torStatus = 'error';
                torError = 'Timeout: Tor não conectou em 30s.';
                console.error(`[Tor] ${torError}`);
                if (torProcess) { try { torProcess.kill(); } catch(e) {} torProcess = null; }
                reject(new Error(torError));
            }
        }, 60000);

        torProcess.stdout.on('data', (data) => {
            const line = data.toString();
            if (line.includes('Bootstrapped 100%')) {
                bootstrapped = true;
                clearTimeout(timeout);
                torStatus = 'running';
                console.log(`[Tor] ✅ Bootstrap completo! Tor SOCKS5 ativo: portas ${TOR_BASE_SOCKS_PORT}-${TOR_BASE_SOCKS_PORT + MAX_TOR_ACCOUNTS - 1}`);
                resolve(true);
            } else if (line.includes('Bootstrapped ')) {
                const match = line.match(/Bootstrapped (\d+)%/);
                if (match) console.log(`[Tor] Bootstrap: ${match[1]}%`);
            }
        });

        torProcess.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) console.warn(`[Tor STDERR] ${msg}`);
        });

        torProcess.on('close', (code) => {
            console.log(`[Tor] Processo encerrado com código ${code}`);
            torStatus = 'stopped';
            torProcess = null;
            torProxiedAccounts.clear();
        });

        torProcess.on('error', (err) => {
            torStatus = 'error';
            torError = err.message;
            console.error(`[Tor] Erro no processo: ${err.message}`);
        });
    });
}

/** Para o processo Tor */
function pararTor() {
    return new Promise((resolve) => {
        if (!torProcess) {
            torStatus = 'stopped';
            torProxiedAccounts.clear();
            return resolve();
        }
        console.log('[Tor] Parando processo Tor...');
        torProcess.on('close', () => {
            torProcess = null;
            torStatus = 'stopped';
            torProxiedAccounts.clear();
            console.log('[Tor] Parado com sucesso.');
            resolve();
        });
        try {
            torProcess.kill('SIGTERM');
        } catch(e) {
            torProcess = null;
            torStatus = 'stopped';
            torProxiedAccounts.clear();
            resolve();
        }
        // Force kill after 5s
        setTimeout(() => {
            if (torProcess) {
                try { torProcess.kill('SIGKILL'); } catch(e) {}
                torProcess = null;
                torStatus = 'stopped';
                torProxiedAccounts.clear();
                resolve();
            }
        }, 5000);
    });
}

/** Aplica Tor SOCKS5 proxy em uma partição de conta */
/** Aplica Tor SOCKS5 proxy em uma partição de conta.
 *  Usa credenciais SOCKS5 únicas por conta para forçar circuitos (exit nodes) diferentes.
 *  Tor com IsolateSOCKSAuth=on cria um circuito separado para cada par user:pass.
 */
async function aplicarTorNaConta(accountIndex) {
    const partitionName = `persist:acc${accountIndex + 1}`;
    configurarParticaoConta(partitionName, accountIndex + 1);
    const ses = session.fromPartition(partitionName);
    // Cada conta usa porta SOCKS diferente (9050+idx), cada uma com SessionGroup único
    // Isso garante circuito Tor (exit node) diferente por conta
    const port = torPortForAccount(accountIndex);
    await ses.setProxy({
        proxyRules: `socks5://127.0.0.1:${port}`,
        proxyBypassRules: '<local>'
    });
    torProxiedAccounts.add(accountIndex);
    console.log(`[Tor] ✅ Conta ${accountIndex + 1} (${partitionName}): proxy SOCKS5 → 127.0.0.1:${port} (SessionGroup=${accountIndex})`);
}

/** Remove Tor de uma conta (volta para direto ou proxy manual) */
async function removerTorDaConta(accountIndex, proxyManual) {
    const partitionName = `persist:acc${accountIndex + 1}`;
    configurarParticaoConta(partitionName, accountIndex + 1);
    const ses = session.fromPartition(partitionName);
    const rule = proxyManual || 'direct://';
    await ses.setProxy({ proxyRules: rule, proxyBypassRules: '<local>' });
    torProxiedAccounts.delete(accountIndex);
    console.log(`[Tor] Conta ${accountIndex + 1}: Tor removido, proxy atual -> ${rule}`);
}

// --- IPC: Tor ---

ipcMain.handle('tor-check-installed', async () => {
    const bin = encontrarTorBinary();
    return { installed: !!bin, path: bin };
});

ipcMain.handle('tor-start', async () => {
    try {
        await iniciarTor();
        return { success: true, status: 'running', port: TOR_BASE_SOCKS_PORT };
    } catch(e) {
        return { success: false, status: 'error', error: e.message };
    }
});

ipcMain.handle('tor-stop', async () => {
    await pararTor();
    return { success: true, status: 'stopped' };
    // Re-apply original proxies after stopping Tor
});

ipcMain.handle('tor-status', async () => {
    // Ler torrc atual para debug
    let torrcContent = '';
    try {
        const torrcPath = path.join(app.getPath('userData'), 'torrc.conf');
        torrcContent = fs.readFileSync(torrcPath, 'utf8');
    } catch(e) {}
    return {
        status: torStatus,
        error: torError,
        port: TOR_BASE_SOCKS_PORT,
        maxAccounts: MAX_TOR_ACCOUNTS,
        basePort: TOR_BASE_SOCKS_PORT,
        controlPort: TOR_CONTROL_PORT,
        pid: torProcess ? torProcess.pid : null,
        proxiedAccounts: [...torProxiedAccounts],
        torrc: torrcContent
    };
});

/** Aplica Tor em uma ou mais contas */
ipcMain.handle('tor-enable-accounts', async (event, { accounts, proxyManual }) => {
    try {
        if (torStatus !== 'running') {
            await iniciarTor();
        }
        for (const idx of accounts) {
            await aplicarTorNaConta(idx);
        }
        return { success: true, proxiedAccounts: [...torProxiedAccounts] };
    } catch(e) {
        return { success: false, error: e.message };
    }
});

/** Remove Tor de contas e restaura proxy manual */
ipcMain.handle('tor-disable-accounts', async (event, { accounts, proxyManuals }) => {
    try {
        for (let i = 0; i < accounts.length; i++) {
            const manual = (proxyManuals && proxyManuals[i]) || '';
            await removerTorDaConta(accounts[i], manual || 'direct://');
        }
        return { success: true, proxiedAccounts: [...torProxiedAccounts] };
    } catch(e) {
        return { success: false, error: e.message };
    }
});

/** Aplica Tor em TODAS as contas de uma vez */
ipcMain.handle('tor-enable-all', async () => {
    try {
        if (torStatus !== 'running') await iniciarTor();
        for (let i = 0; i < 16; i++) {
            try { await aplicarTorNaConta(i); } catch(e) {}
        }
        return { success: true, proxiedAccounts: [...torProxiedAccounts] };
    } catch(e) {
        return { success: false, error: e.message };
    }
});

/** Remove Tor de todas as contas */
ipcMain.handle('tor-disable-all', async (event, { proxyManuals }) => {
    try {
        for (let i = 0; i < 16; i++) {
            const manual = (proxyManuals && proxyManuals[i]) || '';
            try { await removerTorDaConta(i, manual || 'direct://'); } catch(e) {}
        }
        return { success: true, proxiedAccounts: [] };
    } catch(e) {
        return { success: false, error: e.message };
    }
});

/** Testa IP de saída via Tor */
ipcMain.handle('tor-test-ip', async (event, accountIndex) => {
    try {
        const partitionName = `persist:acc${accountIndex + 1}`;
        const ses = session.fromPartition(partitionName);
        const start = Date.now();
        const response = await net.fetch('https://api.ipify.org?format=json', { session: ses });
        const data = await response.json();
        const lat = Date.now() - start;
        return { ok: true, ip: data.ip, lat, via: 'tor' };
    } catch(e) {
        return { ok: false, error: e.message };
    }
});

// @client:on
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

// @client:off  -- atalho de debug de pins (depende de scripts/20-cidade-utils.js)
    // Debug shortcut: Ctrl+Shift+P despeja a lista de pins fixados no log.
    // Usa window.__idlePins.list() (scripts/20-cidade-utils.js), que só existe
    // dentro da <webview> do jogo — daí iterar webContents.getAllWebContents()
    // em vez de consultar mainWindow.webContents (o shell index.html).
    try {
        globalShortcut.register('CommandOrControl+Shift+P', () => {
            webContents.getAllWebContents().forEach(wc => {
                if (wc.isDestroyed()) return;
                wc.executeJavaScript('typeof __idlePins!=="undefined"?JSON.stringify(__idlePins.list()):null')
                    .then(r => { if (r) registrarLogDebug('PIN-DBG', 'Pins fixados: ' + r); })
                    .catch(() => {});
            });
        });
    } catch(e) {}

// @client:on
    const memPosWindow = process.memoryUsage();
    registrarLogDebug('MEMORY', `Pós-Window - RSS: ${(memPosWindow.rss / (1024*1024)).toFixed(1)}MB | Heap: ${(memPosWindow.heapUsed / (1024*1024)).toFixed(1)}MB`);
    registrarLogDebug('STARTUP', `Window criada em ${(process.uptime()).toFixed(1)}s`);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // Encerra Tor gracefulmente ao fechar o app
    if (torProcess) {
        try { torProcess.kill('SIGTERM'); } catch(e) {}
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
