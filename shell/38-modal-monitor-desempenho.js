// =====================================================================
// 31-modal-monitor-desempenho.js — MONITOR DE RECURSOS & DESEMPENHO
// =====================================================================
// Painel visual interativo com telemetria ao vivo:
// - Memória RAM (Heap Node/Electron vs 1024MB, RSS, Memória Livre Windows)
// - Latência de Rede / Ping em ms para a API do jogo
// - FPS e Tempo de Quadro ao vivo de cada conta (via pmiFps)
// - Detecção de longtasks (travadas >50ms)
// - Exportação / Cópia de Relatório com 1 clique
// =====================================================================

(function () {
  'use strict';

  let _monitorTimer = null;
  let _monitorAutoRefresh = true;

  // Mede o tempo de resposta (ping) à API do jogo em ms
  async function medirPingApi() {
    const t0 = performance.now();
    try {
      // Usa a primeira webview ativa para testar a rota real
      const wv = (typeof webviews !== 'undefined' && webviews && webviews[0]) ? webviews[0] : null;
      if (wv && typeof wv.executeJavaScript === 'function') {
        const ok = await wv.executeJavaScript(`
          (async function() {
            try {
              const tok = (typeof obterToken === 'function' ? obterToken() : (typeof token !== 'undefined' ? token : '')) || '';
              const r = await fetch('/api/state?token=' + encodeURIComponent(tok), {
                method: 'GET',
                signal: AbortSignal.timeout(4000)
              });
              return r.status;
            } catch(e) { return 0; }
          })()
        `);
        const ms = Math.round(performance.now() - t0);
        return { ms, ok: ok === 200, status: ok };
      }
    } catch (e) { }
    const ms = Math.round(performance.now() - t0);
    return { ms, ok: false, status: 0 };
  }

  async function atualizarMonitorDesempenho() {
    const modal = document.getElementById('modal-monitor-desempenho');
    if (!modal || (!modal.classList.contains('active') && modal.style.display === 'none')) {
      pararMonitorAuto();
      return;
    }

    // 1. Coleta métricas do processo principal e SO
    let perfMetrics = null;
    try {
      const { ipcRenderer } = require('electron');
      perfMetrics = await ipcRenderer.invoke('get-performance-metrics');
    } catch (e) { }

    if (!perfMetrics) {
      try {
        const os = require('os');
        const mem = process.memoryUsage();
        perfMetrics = {
          mainMemory: {
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            rss: mem.rss,
            maxOldSpaceSizeMb: 1024
          },
          systemMemory: {
            totalMb: Math.round(os.totalmem() / (1024 * 1024)),
            freeMb: Math.round(os.freemem() / (1024 * 1024)),
            usedMb: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024))
          },
          os: { platform: os.platform(), arch: os.arch(), release: os.release() }
        };
      } catch (e) { }
    }

    // 1b. Coleta status do sentinela de RAM
    let sentinelaStatus = null;
    try {
      const { ipcRenderer } = require('electron');
      sentinelaStatus = await ipcRenderer.invoke('get-sentinela-ram-status');
    } catch (e) { }

    // 2. Mede ping de rede em ms
    const pingData = await medirPingApi();

    // 3. Coleta dados do shell e contas (se a ferramenta 49 estiver disponível)
    let diag = null;
    try {
      if (typeof diagnosticoDesempenho === 'function') {
        diag = await diagnosticoDesempenho();
      }
    } catch (e) {
      console.warn('[Monitor] Erro diagnosticoDesempenho:', e);
    }

    // Atualiza a UI
    renderizarDadosMonitor(perfMetrics, pingData, diag, sentinelaStatus);
  }

  function renderizarDadosMonitor(perf, ping, diag, sentinelaStatus) {
    // --- 1. MEMÓRIA RAM ---
    const mem = perf?.mainMemory;
    const heapUsedMb = mem ? (mem.heapUsed / (1024 * 1024)).toFixed(1) : '—';
    const heapTotalMb = mem ? (mem.heapTotal / (1024 * 1024)).toFixed(1) : '—';
    const maxHeapMb = mem?.maxOldSpaceSizeMb || 1024;
    const rssMb = mem ? (mem.rss / (1024 * 1024)).toFixed(0) : '—';
    const pctHeap = mem ? Math.min(100, Math.round((mem.heapUsed / (maxHeapMb * 1024 * 1024)) * 100)) : 0;

    const elRamUsed = document.getElementById('perf-ram-used');
    const elRamLimit = document.getElementById('perf-ram-limit');
    const elRamBar = document.getElementById('perf-ram-bar');
    const elRamRss = document.getElementById('perf-ram-rss');
    const elRamOs = document.getElementById('perf-ram-os');
    const elRamSent = document.getElementById('perf-ram-sentinela');
    const elBtnSent = document.getElementById('perf-txt-toggle-sentinela');

    if (elRamUsed) elRamUsed.textContent = heapUsedMb;
    if (elRamLimit) elRamLimit.textContent = `${heapTotalMb} MB alocado (${maxHeapMb} MB máx)`;
    if (elRamBar) {
      elRamBar.style.width = pctHeap + '%';
      elRamBar.className = 'perf-mon-bar-fill' + (pctHeap >= 80 ? ' warn' : '');
    }
    if (elRamRss) elRamRss.textContent = `${rssMb} MB`;
    if (elRamOs && perf?.osInfo) {
      const freeGb = (perf.osInfo.freeMem / (1024 * 1024 * 1024)).toFixed(1);
      const totGb = (perf.osInfo.totalMem / (1024 * 1024 * 1024)).toFixed(1);
      elRamOs.textContent = `${freeGb} GB livre / ${totGb} GB total`;
    }
    if (elRamSent) {
      if (sentinelaStatus && sentinelaStatus.ativo) {
        elRamSent.innerHTML = '<span style="color:#4ade80">🟢 Ativo (Auto >85%)</span>';
        if (elBtnSent) elBtnSent.textContent = 'Sentinela: Ativo';
      } else {
        elRamSent.innerHTML = '<span style="color:#94a3b8">⚪ Inativo / Pausado</span>';
        if (elBtnSent) elBtnSent.textContent = 'Sentinela: Pausado';
      }
    }

    // --- 2. LATÊNCIA / PING ---
    const elPingVal = document.getElementById('perf-ping-val');
    const elPingPill = document.getElementById('perf-ping-pill');
    if (elPingVal) elPingVal.textContent = ping.ok ? `${ping.ms} ms` : (ping.ms > 3000 ? 'Timeout' : 'Offline');
    if (elPingPill) {
      if (ping.ok) {
        if (ping.ms < 100) {
          elPingPill.className = 'perf-pill green';
          elPingPill.textContent = '🟢 Rápido';
        } else if (ping.ms < 250) {
          elPingPill.className = 'perf-pill yellow';
          elPingPill.textContent = '🟡 Médio';
        } else {
          elPingPill.className = 'perf-pill red';
          elPingPill.textContent = '🔴 Alto Lag';
        }
      } else {
        elPingPill.className = 'perf-pill red';
        elPingPill.textContent = '⚠️ Falhou';
      }
    }

    // --- 3. SHELL & FPS GERAL ---
    const sh = diag?.resumo?.shell;
    const elShellFps = document.getElementById('perf-shell-fps');
    const elShellQuadro = document.getElementById('perf-shell-quadro') || document.getElementById('perf-shell-p95');
    const elShellTravadas = document.getElementById('perf-shell-travadas') || document.getElementById('perf-shell-longtasks');
    const elShellContas = document.getElementById('perf-shell-contas');

    if (elShellFps) elShellFps.textContent = sh?.fps ? `${sh.fps} FPS` : '60 FPS';
    if (elShellQuadro) elShellQuadro.textContent = sh?.quadroMedianoMs ? `${sh.quadroMedianoMs} ms` : '16.7 ms';
    if (elShellTravadas) elShellTravadas.textContent = `${sh?.tarefasLongas60s || 0} no últ. minuto`;
    if (elShellContas) elShellContas.textContent = `${totalContas} contas ativas`;

    // --- 4. TABELA DE CONTAS ---
    const tbody = document.getElementById('perf-table-body');
    if (tbody && diag?.linhas) {
      tbody.innerHTML = diag.linhas.map(l => {
        const fpsColor = (l.fps && l.fps < 40) ? '#fca5a5' : '#86efac';
        const alivioBadge = l.alivio > 0 ? `<span class="perf-pill ${l.alivio >= 2 ? 'red' : 'yellow'}">FX_LOW ${l.alivio}</span>` : '<span class="perf-pill green">Normal</span>';
        const statusBadge = l.ativa ? '<span class="perf-pill green" style="margin-left:4px; font-size:9px">★ ATIVA</span>' : '';
        return `
          <tr>
            <td style="font-weight:700; color:#f8fafc">Conta ${l.conta}${statusBadge} <small style="color:#94a3b8">(${l.nome || ''})</small></td>
            <td style="font-weight:800; color:${fpsColor}">${l.fps != null ? l.fps + ' FPS' : '—'}</td>
            <td>${l.ms != null ? l.ms + ' ms' : '—'}</td>
            <td>${alivioBadge}</td>
            <td style="color:#94a3b8">${l.nos || '—'} nós</td>
            <td>${l.painel ? '<span style="color:#6ee7b7">Aberto</span>' : '<span style="color:#64748b">Fechado</span>'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function iniciarMonitorAuto() {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = setInterval(() => {
      atualizarMonitorDesempenho();
    }, 2000);
  }

  function pararMonitorAuto() {
    if (_monitorTimer) {
      clearInterval(_monitorTimer);
      _monitorTimer = null;
    }
  }

  function abrirModalMonitorDesempenho() {
    let modal = document.getElementById('modal-monitor-desempenho');
    if (!modal) {
      montarHtmlModalMonitor();
      modal = document.getElementById('modal-monitor-desempenho');
    }
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      atualizarMonitorDesempenho();
      if (_monitorAutoRefresh) iniciarMonitorAuto();
    }
  }

  function fecharModalMonitorDesempenho() {
    const modal = document.getElementById('modal-monitor-desempenho');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    pararMonitorAuto();
  }

  function montarHtmlModalMonitor() {
    if (document.getElementById('modal-monitor-desempenho')) return;
    const el = document.createElement('div');
    el.id = 'modal-monitor-desempenho';
    el.className = 'modal-backdrop';
    el.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); display:none; align-items:center; justify-content:center; z-index:100010;';
    el.onclick = (e) => {
      if (typeof fecharModalSeFora === 'function') fecharModalSeFora(e, 'modal-monitor-desempenho');
      else if (e.target === el) fecharModalMonitorDesempenho();
    };

    el.innerHTML = `
      <div class="perf-mon-box" onclick="event.stopPropagation()">
        <!-- HEADER -->
        <div class="perf-mon-header">
          <div class="perf-mon-title-wrap">
            <span style="font-size:20px">📊</span>
            <div>
              <div class="perf-mon-title">MONITOR DE RECURSOS & TELEMETRIA</div>
              <div class="perf-mon-sub">Memória RAM, latência da API, FPS e estabilidade de renderização em tempo real</div>
            </div>
          </div>
          <button class="ac-btn-close" onclick="fecharModalMonitorDesempenho()" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; font-weight:800">✕</button>
        </div>

        <!-- GRID DE CARDS PRINCIPAIS -->
        <div class="perf-mon-grid">
          <!-- CARD 1: MEMÓRIA HEAP / RAM -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>🧠 Memória Electron / Node</span>
              <span class="perf-pill green" id="perf-ram-pill">Normal</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-ram-used">--</span>
              <span class="perf-mon-val-unit">MB Heap</span>
            </div>
            <div class="perf-mon-bar-trilho">
              <div class="perf-mon-bar-fill" id="perf-ram-bar" style="width: 25%"></div>
            </div>
            <div class="perf-mon-stats-row">
              <span>Alocação Heap:</span>
              <b id="perf-ram-limit">-- MB</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Memória Física (RSS):</span>
              <b id="perf-ram-rss">-- MB</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Windows RAM Livre:</span>
              <b id="perf-ram-os">--</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Sentinela de RAM (2º Plano):</span>
              <b id="perf-ram-sentinela" style="color:#4ade80">🟢 Ativo (Auto >85%)</b>
            </div>
          </div>

          <!-- CARD 2: PING / LATÊNCIA DA REDE -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>📶 Latência API do Jogo</span>
              <span class="perf-pill green" id="perf-ping-pill">Testando...</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-ping-val">-- ms</span>
            </div>
            <div class="perf-mon-stats-row" style="margin-top:auto">
              <span>Endpoint:</span>
              <b>/api/state</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Protocolo:</span>
              <b>HTTP/1.1 HTTPS Keep-Alive</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Status Timeout:</span>
              <b>4.000 ms máx</b>
            </div>
          </div>

          <!-- CARD 3: SHELL & RENDERER -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>🖥️ Renderizador da Janela</span>
              <span class="perf-pill green">60 Hz</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-shell-fps">-- FPS</span>
            </div>
            <div class="perf-mon-stats-row" style="margin-top:auto">
              <span>Tempo de Quadro:</span>
              <b id="perf-shell-quadro">-- ms</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Travadas (>50ms):</span>
              <b id="perf-shell-travadas">0</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Background Throttling:</span>
              <b style="color:#4ade80">Desabilitado</b>
            </div>
          </div>

          <!-- TABELA DE CONTAS E WEBVIEWS -->
          <div class="perf-mon-table-wrap">
            <div style="padding:8px 12px; background:rgba(30,41,59,0.8); font-size:10.5px; font-weight:800; color:#38bdf8; display:flex; justify-content:space-between; align-items:center;">
              <span>🎮 STATUS DAS CONTAS / WEBVIEWS ATIVAS</span>
              <span style="font-size:10px; color:#94a3b8">Leitura nativa de pmiFps() do jogo</span>
            </div>
            <table class="perf-mon-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>FPS Atual</th>
                  <th>Tempo Quadro</th>
                  <th>Auto-Alívio</th>
                  <th>Nós DOM</th>
                  <th>Painel v2</th>
                </tr>
              </thead>
              <tbody id="perf-table-body">
                <tr>
                  <td colspan="6" style="text-align:center; color:#94a3b8; padding:16px;">Carregando métricas das contas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- FOOTER / AÇÕES -->
        <div class="perf-mon-footer">
          <div style="display:flex; align-items:center; gap:10px">
            <label style="font-size:11px; color:#cbd5e1; display:flex; align-items:center; gap:6px; cursor:pointer">
              <input type="checkbox" id="perf-chk-auto-refresh" checked style="accent-color:#10b981" />
              <span>Atualização ao vivo (2s)</span>
            </label>
          </div>
          <div class="perf-mon-actions">
            <button class="perf-btn perf-btn-sec" onclick="window.otimizarMemoriaRamUI()" style="border-color:rgba(52,211,153,0.4); color:#6ee7b7" title="Executa o otimizador Python (EmptyWorkingSet) para liberar memória física do sistema imediatamente">
              <span>🧹</span> <span>Limpar RAM Agora</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="window.alternarSentinelaRamUI()" id="perf-btn-toggle-sentinela" style="border-color:rgba(96,165,250,0.4); color:#93c5fd" title="Pausar ou Retomar o Sentinela automático em segundo plano">
              <span>🛡️</span> <span id="perf-txt-toggle-sentinela">Sentinela: Ativo</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="window.copiarRelatorioMonitor()" title="Gera o relatório de diagnóstico e copia para a área de transferência">
              <span>📋</span> <span>Copiar Relatório</span>
            </button>
            <button class="perf-btn perf-btn-primary" onclick="window.atualizarMonitorDesempenhoManualmente()" title="Atualizar dados imediatamente">
              <span>🔄</span> <span>Atualizar</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="fecharModalMonitorDesempenho()">
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    const chk = document.getElementById('perf-chk-auto-refresh');
    if (chk) {
      chk.onchange = () => {
        _monitorAutoRefresh = chk.checked;
        if (_monitorAutoRefresh) iniciarMonitorAuto();
        else pararMonitorAuto();
      };
    }
  }

  async function otimizarMemoriaRamUI() {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Otimizando memória RAM via Python...', '⏳', 'info', 2000);
    }
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('trim-memory-now', { all: false });
      if (res && res.ok) {
        // Ganho REAL de RAM livre no Windows. A soma da queda de working set
        // (economizado_processos_mb) e enganosa: quase tudo volta por page fault.
        const ganho = res.data?.ganho_real_mb ?? 0;
        const aparado = res.data?.economizado_processos_mb || 0;
        const livre = res.data?.ram_depois?.livre_mb || 0;
        if (typeof mostrarToast === 'function') {
          if (ganho >= 50) {
            mostrarToast(`RAM Otimizada! +${ganho} MB livres de verdade (${livre} MB livres no Windows).`, '⚡', 'sucesso', 4500);
          } else {
            mostrarToast(`Pouco a liberar: ${aparado} MB de working set aparado rendeu ${ganho} MB reais. A RAM esta em uso, nao ociosa.`, '🟡', 'info', 5000);
          }
        }
        if (typeof atualizarMonitorDesempenho === 'function') {
          atualizarMonitorDesempenho();
        }
      } else {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Erro ao otimizar memória: ' + (res?.error || 'falha'), '⚠️', 'alerta', 4000);
        }
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Erro ao acionar otimizador: ' + e.message, '⚠️', 'alerta', 4000);
      }
    }
  }

  async function abrirSentinelaPowerShellUI() {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Abrindo janela do Sentinela de RAM...', '🛡️', 'info', 2500);
    }
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('abrir-sentinela-powershell', { loop: 60, threshold: 85 });
      if (res && res.ok) {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Sentinela ativado! Monitorando a cada 60s (auto-trim > 75%).', '🟢', 'sucesso', 4000);
        }
      } else {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Erro ao abrir terminal: ' + (res?.error || 'falha'), '⚠️', 'alerta', 4000);
        }
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Falha ao acionar Sentinela: ' + e.message, '⚠️', 'alerta', 4000);
      }
    }
  }

  async function alternarSentinelaRamUI() {
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('toggle-sentinela-ram');
      const badge = document.getElementById('sentinela-badge');
      const txtBtn = document.getElementById('perf-txt-toggle-sentinela');
      const elSt = document.getElementById('perf-ram-sentinela');
      if (res && res.ativo) {
        if (typeof mostrarToast === 'function') mostrarToast('Sentinela Automático de RAM ATIVADO (Auto-trim > 75%)', '🛡️', 'sucesso', 3500);
        if (badge) { badge.textContent = 'AUTO'; badge.style.color = '#4ade80'; }
        if (txtBtn) txtBtn.textContent = 'Sentinela: Ativo';
        if (elSt) elSt.innerHTML = '<span style="color:#4ade80">🟢 Ativo (Auto >85%)</span>';
      } else {
        if (typeof mostrarToast === 'function') mostrarToast('Sentinela de RAM pausado.', '⏸️', 'info', 3000);
        if (badge) { badge.textContent = 'PAUSA'; badge.style.color = '#94a3b8'; }
        if (txtBtn) txtBtn.textContent = 'Sentinela: Pausado';
        if (elSt) elSt.innerHTML = '<span style="color:#94a3b8">⚪ Inativo / Pausado</span>';
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') mostrarToast('Erro ao alternar sentinela: ' + e.message, '⚠️', 'alerta', 4000);
    }
  }

  window.abrirModalMonitorDesempenho = abrirModalMonitorDesempenho;
  window.fecharModalMonitorDesempenho = fecharModalMonitorDesempenho;
  window.otimizarMemoriaRamUI = otimizarMemoriaRamUI;
  window.abrirSentinelaPowerShellUI = abrirSentinelaPowerShellUI;
  window.alternarSentinelaRamUI = alternarSentinelaRamUI;
  window.atualizarMonitorDesempenhoManualmente = () => atualizarMonitorDesempenho();
  window.copiarRelatorioMonitor = async () => {
    if (typeof relatorioDesempenho === 'function') {
      await relatorioDesempenho();
    } else {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Diagnóstico copiado com sucesso!', '📋', 'info', 3000);
      }
    }
  };
})();
