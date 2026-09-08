    function mostrarToast(mensagem, icone = 'ℹ️', tipo = 'normal', duracaoMs = 4000) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast-item ${tipo === 'toast-success' ? 'toast-success' : ''}`;
      toast.innerHTML = `<span>${icone}</span><span>${mensagem}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
      }, duracaoMs);
    }

    // Áudio Chime do Shiny no Desktop Client
    function tocarDesktopShinyChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notas = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
        notas.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.36);
        });
      } catch(e) {}
    }

    // === SISTEMA DE NOTIFICAÇÕES (JANELA ATUAL vs TODAS AS ABAS) ===
    const SHINY_MUTE_GLOBAL_KEY = 'electronShinyNotificationsMutedGlobal';
    const SHINY_MUTE_ACCOUNTS_KEY = 'electronShinyNotificationsMutedAccounts';
    const SHINY_MUTE_LEGACY_KEY = 'electronShinyNotificationsMuted';

    function obterContasSilenciadas() {
      try {
        const raw = localStorage.getItem(SHINY_MUTE_ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    function salvarContasSilenciadas(obj) {
      try {
        localStorage.setItem(SHINY_MUTE_ACCOUNTS_KEY, JSON.stringify(obj || {}));
      } catch (e) {}
    }

    function isSilenciadoGlobal() {
      try {
        const g = localStorage.getItem(SHINY_MUTE_GLOBAL_KEY);
        if (g !== null) return g === '1';
        return localStorage.getItem(SHINY_MUTE_LEGACY_KEY) === '1';
      } catch (e) {
        return false;
      }
    }

    function isContaSilenciada(index) {
      if (isSilenciadoGlobal()) return true;
      const contas = obterContasSilenciadas();
      return !!contas[index];
    }

    function isTodasAbasSilenciadas() {
      if (isSilenciadoGlobal()) return true;
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = obterContasSilenciadas();
      for (let i = 0; i < total; i++) {
        if (!contas[i]) return false;
      }
      return true;
    }

    function sincronizarSilencioComWebview(index, silenciado) {
      try {
        const lista = (typeof webviews !== 'undefined' && Array.isArray(webviews)) ? webviews : [];
        const wv = lista[index];
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        const habilitado = !silenciado;
        wv.executeJavaScript(`
          try {
            if (typeof window.__setNotifyBrowser === 'function') window.__setNotifyBrowser(${habilitado});
            if (typeof window.__setSomShiny === 'function') window.__setSomShiny(${habilitado});
          } catch (e) {}
        `).catch(() => {});
      } catch (e) {}
    }

    function sincronizarSilencioTodasWebviews() {
      try {
        const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
        for (let i = 0; i < total; i++) {
          sincronizarSilencioComWebview(i, isContaSilenciada(i));
        }
      } catch (e) {}
    }

    function alternarSilenciarNotificacoesAbaAtual() {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idx = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const contas = obterContasSilenciadas();
      const silenciadoAgora = isContaSilenciada(idx);
      const novo = !silenciadoAgora;

      if (isSilenciadoGlobal() && !novo) {
        try {
          localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, '0');
          localStorage.setItem(SHINY_MUTE_LEGACY_KEY, '0');
        } catch (e) {}
        for (let i = 0; i < total; i++) {
          contas[i] = (i !== idx);
        }
      } else {
        contas[idx] = novo;
      }

      salvarContasSilenciadas(contas);
      sincronizarSilencioComWebview(idx, novo);
      atualizarBadgesNotificacoes();

      const nomeConta = (typeof nomesAbas !== 'undefined' && nomesAbas[idx]) ? nomesAbas[idx] : `Conta ${idx + 1}`;
      if (typeof mostrarToast === 'function') {
        mostrarToast(
          novo
            ? `Notificações, popups e som silenciados na ${nomeConta} (Janela Atual)`
            : `Notificações, popups e som reativados na ${nomeConta} (Janela Atual)`,
          novo ? '🔕' : '🔔',
          novo ? 'info' : 'toast-success',
          3000
        );
      }
    }

    function alternarSilenciarNotificacoesTodasAbas() {
      const todasSilenciadas = isTodasAbasSilenciadas();
      const novo = !todasSilenciadas;

      try {
        localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, novo ? '1' : '0');
        localStorage.setItem(SHINY_MUTE_LEGACY_KEY, novo ? '1' : '0');
      } catch (e) {}

      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = {};
      for (let i = 0; i < total; i++) {
        contas[i] = novo;
      }
      salvarContasSilenciadas(contas);
      sincronizarSilencioTodasWebviews();
      atualizarBadgesNotificacoes();

      if (typeof mostrarToast === 'function') {
        mostrarToast(
          novo
            ? 'Notificações, popups e sons silenciados em TODAS as abas'
            : 'Notificações, popups e sons ativados em TODAS as abas',
          novo ? '🔇' : '📢',
          novo ? 'info' : 'toast-success',
          3000
        );
      }
    }

    function definirSilencioContaIndividual(idx, novoEstado) {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = obterContasSilenciadas();

      if (isSilenciadoGlobal() && !novoEstado) {
        try {
          localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, '0');
          localStorage.setItem(SHINY_MUTE_LEGACY_KEY, '0');
        } catch (e) {}
        for (let i = 0; i < total; i++) {
          contas[i] = (i !== idx);
        }
      } else {
        contas[idx] = !!novoEstado;
      }

      salvarContasSilenciadas(contas);
      sincronizarSilencioComWebview(idx, !!novoEstado);
      atualizarBadgesNotificacoes();
    }

    function atualizarBadgesNotificacoes() {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idx = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const atualSilenciado = isContaSilenciada(idx);

      const badgeAtual = document.getElementById('shiny-mute-atual-badge');
      if (badgeAtual) {
        badgeAtual.textContent = atualSilenciado ? 'MUTED' : 'SOM';
        badgeAtual.style.color = atualSilenciado ? '#f87171' : '#4ade80';
        badgeAtual.style.background = atualSilenciado ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)';
        badgeAtual.style.borderColor = atualSilenciado ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)';
      }

      const badgeTodas = document.getElementById('shiny-mute-todas-badge');
      if (badgeTodas) {
        const globalSilenciado = isSilenciadoGlobal();
        let silenciadas = 0;
        for (let i = 0; i < total; i++) {
          if (isContaSilenciada(i)) silenciadas++;
        }
        const todasSil = globalSilenciado || (silenciadas === total);
        const nenhumaSil = (silenciadas === 0 && !globalSilenciado);

        const texto = todasSil ? 'MUTED' : (nenhumaSil ? 'SOM' : 'MISTO');
        const cor = todasSil ? '#f87171' : (nenhumaSil ? '#4ade80' : '#facc15');
        const bg = todasSil ? 'rgba(239,68,68,0.18)' : (nenhumaSil ? 'rgba(34,197,94,0.18)' : 'rgba(250,204,21,0.18)');
        const border = todasSil ? 'rgba(239,68,68,0.35)' : (nenhumaSil ? 'rgba(34,197,94,0.35)' : 'rgba(250,204,21,0.35)');

        badgeTodas.textContent = texto;
        badgeTodas.style.color = cor;
        badgeTodas.style.background = bg;
        badgeTodas.style.borderColor = border;
      }

      const badgeLegado = document.getElementById('shiny-mute-badge');
      if (badgeLegado) {
        const silenciado = isTodasAbasSilenciadas();
        badgeLegado.textContent = silenciado ? 'MUTED' : 'SOM';
        badgeLegado.style.color = silenciado ? '#f87171' : '#4ade80';
        badgeLegado.style.background = silenciado ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)';
        badgeLegado.style.borderColor = silenciado ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)';
      }

      atualizarConteudoModalNotificacoesSeAberto();
    }

    // Modal Central de Notificações
    function abrirModalConfigNotificacoes() {
      let modal = document.getElementById('modal-config-notificacoes');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-config-notificacoes';
        modal.style.cssText = 'position:fixed; inset:0; z-index:100000; background:rgba(4,7,18,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; font-family:inherit;';
        modal.onclick = (e) => { if (e.target === modal) fecharModalConfigNotificacoes(); };
        document.body.appendChild(modal);
      }
      modal.style.display = 'flex';
      atualizarConteudoModalNotificacoesSeAberto();
    }

    function fecharModalConfigNotificacoes() {
      const modal = document.getElementById('modal-config-notificacoes');
      if (modal) modal.style.display = 'none';
    }

    function atualizarConteudoModalNotificacoesSeAberto() {
      const modal = document.getElementById('modal-config-notificacoes');
      if (!modal || modal.style.display === 'none') return;

      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idxAtiva = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const nomeAtiva = (typeof nomesAbas !== 'undefined' && nomesAbas[idxAtiva]) ? nomesAbas[idxAtiva] : `Conta ${idxAtiva + 1}`;
      const silenciadaAtiva = isContaSilenciada(idxAtiva);
      const todasSilenciadas = isTodasAbasSilenciadas();

      let cardsContasHtml = '';
      for (let i = 0; i < total; i++) {
        const nome = (typeof nomesAbas !== 'undefined' && nomesAbas[i]) ? nomesAbas[i] : `Conta ${i + 1}`;
        const sil = isContaSilenciada(i);
        const ehAtiva = (i === idxAtiva);

        cardsContasHtml += `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:10px; background:${ehAtiva ? 'rgba(56,189,248,0.08)' : 'rgba(15,23,42,0.45)'}; border:1px solid ${ehAtiva ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.12)'};">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:16px;">${ehAtiva ? '👑' : '🎮'}</span>
              <div>
                <div style="font-size:12px; font-weight:800; color:${ehAtiva ? '#38bdf8' : '#e2e8f0'}; display:flex; align-items:center; gap:6px;">
                  <span>Conta ${i + 1}: ${nome}</span>
                  ${ehAtiva ? '<span style="font-size:9px; background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 6px; border-radius:8px; border:1px solid rgba(56,189,248,0.4);">ATIVA</span>' : ''}
                </div>
                <div style="font-size:10px; color:${sil ? '#f87171' : '#4ade80'}; font-weight:700;">
                  ${sil ? '🔕 Silenciado (som e popups desligados)' : '🔔 Ativo (som, popups e notificações ligados)'}
                </div>
              </div>
            </div>
            <button onclick="definirSilencioContaIndividual(${i}, ${!sil})" style="padding:5px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; border:1px solid ${sil ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}; background:${sil ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)'}; color:${sil ? '#4ade80' : '#f87171'}; transition:all 0.15s ease;">
              ${sil ? '🔔 Reativar' : '🔕 Silenciar'}
            </button>
          </div>
        `;
      }

      modal.innerHTML = `
        <div style="width:100%; max-width:540px; max-height:90vh; overflow-y:auto; background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,15,30,0.99) 100%); border:1px solid rgba(56,189,248,0.32); border-radius:18px; box-shadow:0 24px 60px rgba(0,0,0,0.85); padding:22px; color:#e2e8f0; display:flex; flex-direction:column; gap:16px;">
          <!-- Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(148,163,184,0.12); padding-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px;">🔔</span>
              <div>
                <div style="font-size:15px; font-weight:900; color:#facc15; letter-spacing:0.3px;">Central de Notificações &amp; Popups</div>
                <div style="font-size:10.5px; color:#94a3b8;">Gerencie alertas visuais, sons e popups do Windows e Electron</div>
              </div>
            </div>
            <button onclick="fecharModalConfigNotificacoes()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; width:28px; height:28px; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>

          <!-- Explicação -->
          <div style="font-size:10.5px; line-height:1.45; color:#cbd5e1; background:rgba(30,41,59,0.5); border:1px solid rgba(148,163,184,0.15); border-radius:10px; padding:10px 12px;">
            ℹ️ <b>Como funciona:</b> Silenciar desliga o som (chime), os popups flutuantes na tela do Electron e os avisos do Windows (SO). Os registros na <b>Sala de Troféus de Shinies</b> continuam sendo gravados normalmente em segundo plano.
          </div>

          <!-- Painéis Rápidos: Janela Atual vs Todas as Abas -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <!-- Janela Atual -->
            <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:11.5px; font-weight:900; color:#38bdf8;">🪟 Janela Atual</span>
                  <span style="font-size:9px; font-weight:900; color:${silenciadaAtiva ? '#f87171' : '#4ade80'}; background:${silenciadaAtiva ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}; padding:2px 6px; border-radius:8px; border:1px solid ${silenciadaAtiva ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'};">
                    ${silenciadaAtiva ? 'MUTED' : 'SOM'}
                  </span>
                </div>
                <div style="font-size:10px; color:#94a3b8;">Aba em foco: <b style="color:#e2e8f0">${nomeAtiva}</b></div>
              </div>
              <button onclick="alternarSilenciarNotificacoesAbaAtual()" style="width:100%; padding:8px 10px; border-radius:8px; font-size:11px; font-weight:900; cursor:pointer; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.14); color:#38bdf8;">
                ${silenciadaAtiva ? '🔔 Ativar Nesta Janela' : '🔕 Silenciar Esta Janela'}
              </button>
            </div>

            <!-- Todas as Abas -->
            <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(234,179,8,0.25); border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:11.5px; font-weight:900; color:#facc15;">🌐 Todas as Abas</span>
                  <span style="font-size:9px; font-weight:900; color:${todasSilenciadas ? '#f87171' : '#4ade80'}; background:${todasSilenciadas ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}; padding:2px 6px; border-radius:8px; border:1px solid ${todasSilenciadas ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'};">
                    ${todasSilenciadas ? 'MUTED' : 'SOM'}
                  </span>
                </div>
                <div style="font-size:10px; color:#94a3b8;">Controle global de todas as contas</div>
              </div>
              <button onclick="alternarSilenciarNotificacoesTodasAbas()" style="width:100%; padding:8px 10px; border-radius:8px; font-size:11px; font-weight:900; cursor:pointer; border:1px solid rgba(234,179,8,0.4); background:rgba(234,179,8,0.14); color:#facc15;">
                ${todasSilenciadas ? '🔔 Ativar Todas as Abas' : '🔇 Silenciar Todas as Abas'}
              </button>
            </div>
          </div>

          <!-- Lista por Conta -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Status Individual por Conta:</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:180px; overflow-y:auto; padding-right:4px;">
              ${cardsContasHtml}
            </div>
          </div>

          <!-- Rodapé com Testes -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid rgba(148,163,184,0.12); padding-top:14px;">
            <div style="display:flex; gap:8px;">
              <button onclick="tocarDesktopShinyChime()" style="padding:7px 12px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; border:1px solid rgba(234,179,8,0.35); background:rgba(234,179,8,0.12); color:#fde047;">
                🔊 Testar Som
              </button>
              <button onclick="dispararToastShiny(${idxAtiva}, '${nomeAtiva}', 'Treinador', 'Pikachu (Teste)')" style="padding:7px 12px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; border:1px solid rgba(56,189,248,0.35); background:rgba(56,189,248,0.12); color:#38bdf8;">
                ✨ Testar Alerta
              </button>
            </div>
            <button onclick="fecharModalConfigNotificacoes()" style="padding:7px 18px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; border:1px solid rgba(148,163,184,0.25); background:rgba(148,163,184,0.1); color:#e2e8f0;">
              Concluído
            </button>
          </div>
        </div>
      `;
    }

    window.isSilenciadoGlobal = isSilenciadoGlobal;
    window.isContaSilenciada = isContaSilenciada;
    window.isTodasAbasSilenciadas = isTodasAbasSilenciadas;
    window.sincronizarSilencioComWebview = sincronizarSilencioComWebview;
    window.sincronizarSilencioTodasWebviews = sincronizarSilencioTodasWebviews;
    window.alternarSilenciarNotificacoesAbaAtual = alternarSilenciarNotificacoesAbaAtual;
    window.alternarSilenciarNotificacoesTodasAbas = alternarSilenciarNotificacoesTodasAbas;
    window.definirSilencioContaIndividual = definirSilencioContaIndividual;
    window.atualizarBadgesNotificacoes = atualizarBadgesNotificacoes;
    window.atualizarBadgeShinyMute = atualizarBadgesNotificacoes;
    window.abrirModalConfigNotificacoes = abrirModalConfigNotificacoes;
    window.fecharModalConfigNotificacoes = fecharModalConfigNotificacoes;
    window.shinyNotificacoesSilenciadas = () => isContaSilenciada((typeof currentTab !== 'undefined' && currentTab >= 0) ? currentTab : 0);
    window.alternarSilenciarNotificacoesShiny = alternarSilenciarNotificacoesTodasAbas;

    // Toast de Shiny Interativo com Nome do Personagem / Aba e Clique Direto
    function dispararToastShiny(index, nomeAba, charName, pokeName) {
      // Salva sempre no histórico de Troféus de Shinies
      try { adicionarHistoricoShiny(index, nomeAba, charName, pokeName); } catch (e) {}

      // Se estiver silenciado para esta conta (individual ou global), não emite som nem popups visuais
      if (isContaSilenciada(index)) {
        console.log(`[SHINY SILENCIADO] Conta ${index + 1} (${nomeAba}): ${pokeName || 'Pokémon'} Shiny registrado em silêncio.`);
        return;
      }

      tocarDesktopShinyChime();
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast-item toast-shiny';
      toast.setAttribute('title', 'Clique para ir direto para esta conta!');

      const charDisplay = charName && charName !== nomeAba ? ` (${charName})` : '';

      toast.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:8px">
          <span style="font-size:12.5px; font-weight:900; color:#fde047; display:flex; align-items:center; gap:5px">
            <span>✨</span> <span>SHINY ENCONTRADO!</span>
          </span>
          <span style="font-size:9.5px; background:linear-gradient(135deg,#facc15,#eab308); color:#090d16; font-weight:900; padding:2px 7px; border-radius:10px; box-shadow:0 0 8px rgba(250,204,21,0.6)">IR PARA ABA ➔</span>
        </div>
        <div style="font-size:11.5px; color:#e2e8f0; line-height:1.3">
          Conta <b style="color:#38bdf8">${nomeAba}</b><span style="color:#a5b4fc">${charDisplay}</span>
        </div>
        <div style="font-size:13.5px; font-weight:900; color:#facc15; text-shadow:0 0 10px rgba(250,204,21,0.5)">
          🌟 ${pokeName || 'Pokémon'} Shiny!
        </div>
        <div style="font-size:9.5px; color:#94a3b8; font-weight:600">
          👆 Clique aqui para visualizar a conta em tela cheia!
        </div>
      `;

      // Ao clicar na notificação, vai direto para a aba correspondente
      toast.onclick = (e) => {
        e.stopPropagation();
        fecharTradeHubModal();
        if (isGridMode) {
          toggleGridMode(); // Sai do grid para focar na tela completa da conta
        }
        selectTab(index);

        if (webviews[index]) {
          try { webviews[index].focus(); } catch(err) {}
        }

        // Efeito de destaque na aba selecionada
        const btnTab = tabButtons[index];
        if (btnTab) {
          btnTab.classList.add('shiny-flash');
          setTimeout(() => btnTab.classList.remove('shiny-flash'), 6000);
        }

        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
      };

      container.appendChild(toast);

      // Dispara o alerta flutuante na Tela Principal em setups multi-monitores
      try {
        ipcRenderer.send('show-primary-screen-shiny-alert', { index, nomeAba, charName, pokeName });
      } catch(e) {}

      // Piscar a aba no topo mesmo antes do clique
      const btnTab = tabButtons[index];
      if (btnTab) {
        btnTab.classList.add('shiny-flash');
        setTimeout(() => btnTab.classList.remove('shiny-flash'), 10000);
      }

      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 350);
        }
      }, 12000);
    }

    // Listener para focar aba quando o alerta da tela principal for clicado
    ipcRenderer.on('focus-tab', (event, targetIndex) => {
      fecharTradeHubModal();
      if (isGridMode) {
        toggleGridMode();
      }
      selectTab(targetIndex || 0);
      if (webviews[targetIndex]) {
        try { webviews[targetIndex].focus(); } catch(err) {}
      }
    });

    // ================================================================
