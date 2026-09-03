    const reconexaoTimers = {};
    const reconexaoContadores = {};

    function iniciarReconexaoAutomatica(index, motivo = 'Erro de Conexão') {
      if (reconexaoTimers[index]) return; // Já está em contagem regressiva ativa

      const nomeAba = nomesAbas[index] || `Conta ${index + 1}`;
      console.warn(`[Watchdog] Queda detectada na Conta ${index + 1} (${nomeAba}): ${motivo}. Reconectando em 5s...`);
      
      const tabEl = document.querySelector(`.tab-item[data-tab="${index}"]`);
      if (tabEl) tabEl.classList.add('tab-reconnecting');

      reconexaoContadores[index] = 5;
      mostrarToast(`⚠️ <b>${nomeAba}</b> desconectada (${motivo}). Reconectando em <b>5s</b>...`, '🔄', 'normal', 5000);

      reconexaoTimers[index] = setInterval(() => {
        reconexaoContadores[index]--;
        const seg = reconexaoContadores[index];
        
        if (tabEl) {
          const titleEl = tabEl.querySelector('.tab-title');
          if (titleEl) titleEl.textContent = `⚠️ Reconectando (${seg}s)...`;
        }

        if (seg <= 0) {
          clearInterval(reconexaoTimers[index]);
          delete reconexaoTimers[index];
          delete reconexaoContadores[index];
          console.log(`[Watchdog] Executando reload automático na Conta ${index + 1}...`);
          try {
            const wv = webviews[index];
            if (wv) {
              wv.loadURL('https://idlepokemoon.com.br/play');
            }
          } catch(e) {
            try { if (webviews[index]) webviews[index].reload(); } catch(e2) {}
          }
        }
      }, 1000);
    }

    function cancelarReconexaoAutomatica(index) {
      if (reconexaoTimers[index]) {
        clearInterval(reconexaoTimers[index]);
        reconexaoTimers[index] = null;
      }
      reconexaoContadores[index] = 0;
      const tabEl = document.querySelector(`.tab-item[data-tab="${index}"]`);
      if (tabEl) {
        tabEl.classList.remove('tab-reconnecting');
        const titleEl = tabEl.querySelector('.tab-title');
        if (titleEl) titleEl.textContent = nomesAbas[index] || `Conta ${index + 1}`;
      }
    }

    // Configura eventos de cada webview dinamicamente
    function conectarEventosWebview(wv, indiceInicial) {
      if (!wv || wv.__conectado) return;
      wv.__conectado = true;

      // ⚠️ A ABA PODE MUDAR DE LUGAR. Reordenar arrastando MOVE o <webview> no
      // DOM em vez de recriar o elemento — e e isso que faz a SESSAO do jogo
      // viajar junto com a aba (o `partition` e imutavel depois que o elemento
      // e anexado, entao recriar significaria trocar de conta). Consequencia:
      // um indice capturado no closure envelhece na primeira reordenacao, e os
      // eventos passariam a falar da conta errada — log da conta errada,
      // reconexao na conta errada, script injetado na conta errada.
      // Por isso todo handler le a posicao ATUAL do elemento; `indiceInicial`
      // fica so como rede pro instante em que a webview ainda nao entrou em
      // `webviews`.
      const idxAtual = () => {
        const i = webviews.indexOf(wv);
        return i >= 0 ? i : indiceInicial;
      };

      try { wv.addEventListener('did-attach', () => manterWebviewAcorda(wv)); } catch(e) {}

      // Reseta flag de injeção quando a webview recarrega
      wv.addEventListener('did-start-loading', () => {
        _injetadoPorConta[idxAtual()] = false;
        if (wv.__loginPollTimers) {
          wv.__loginPollTimers.forEach(t => clearInterval(t));
          wv.__loginPollTimers = [];
        }
      });

      wv.addEventListener('dom-ready', () => {
        cancelarReconexaoAutomatica(idxAtual());
        const msg = `[Conta ${idxAtual() + 1}] DOM Ready. URL: ${wv.getURL()}`;
        console.log(msg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV', mensagem: msg });
        manterWebviewAcorda(wv);
        try {
          if (typeof wv.setAudioMuted === 'function') {
            wv.setAudioMuted(isMuted);
          }
          wv.setZoomFactor(zoomAlvoAtual());
        } catch(e) {}
        injetarScriptNaWebview(wv, idxAtual());
        // O zoom acima às vezes é sobrescrito pelo próprio carregamento da
        // página um instante depois do dom-ready — sintoma: reabrir em modo
        // Grid mostra 100% até trocar pra Abas e voltar pro Grid manualmente.
        // Reaplicando mais duas vezes depois que a página já assentou.
        setTimeout(() => { try { wv.setZoomFactor(zoomAlvoAtual()); } catch(e) {} }, 800);
        setTimeout(() => { try { wv.setZoomFactor(zoomAlvoAtual()); } catch(e) {} }, 2500);
        setTimeout(() => notificarAjusteGrid(isGridMode), 800);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 2000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 5000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 10000);
      });

      wv.addEventListener('did-fail-load', (e) => {
        const errDesc = e.errorDescription || `Erro ${e.errorCode}`;
        const msg = `[Conta ${idxAtual() + 1}] did-fail-load: ${errDesc} (code: ${e.errorCode})`;
        console.error(msg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-ERR', mensagem: msg });
        if (e.errorCode !== -3) {
          iniciarReconexaoAutomatica(idxAtual(), errDesc);
        }
      });

      wv.addEventListener('did-navigate', (e) => {
        const navMsg = `[Conta ${idxAtual() + 1}] Navegou: ${e.url}`;
        console.log(navMsg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-NAV', mensagem: navMsg });
        manterWebviewAcorda(wv);
        // Reset flag de injeção — navegação pode ser novo login
        _injetadoPorConta[idxAtual()] = false;
        setTimeout(() => {
          injetarScriptNaWebview(wv, idxAtual());
          notificarAjusteGrid(isGridMode);
          checarNomePersonagemWebview(idxAtual());
        }, 1000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 3000);
      });

      wv.addEventListener('did-navigate-in-page', () => {
        manterWebviewAcorda(wv);
        _injetadoPorConta[idxAtual()] = false;
        setTimeout(() => {
          injetarScriptNaWebview(wv, idxAtual());
          notificarAjusteGrid(isGridMode);
          checarNomePersonagemWebview(idxAtual());
        }, 1000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 3000);
      });

      wv.addEventListener('console-message', (e) => {
        const msg = e.message || '';
        if (msg.includes('[SHINY_FOUND]') || msg.includes('[BOSS_FOUND]') || msg.includes('[MYTHIC_FOUND]') || msg.includes('[LEGENDARY_FOUND]')) {
          console.log(`[TROFÉU] Conta ${idxAtual() + 1}: ${msg}`);
        }
        if (msg.includes('[SHINY_FOUND]')) {
          try {
            const jsonPart = msg.split('[SHINY_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            dispararToastShiny(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon');
          } catch(err) {
            console.warn('[TROFÉU] Erro ao parsear SHINY_FOUND:', err);
            dispararToastShiny(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, '', 'Pokémon');
          }
        }
        // Detecção de Boss e Mítico
        if (msg.includes('[BOSS_FOUND]')) {
          try {
            const jsonPart = msg.split('[BOSS_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'boss');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear BOSS_FOUND:', err); }
        }
        if (msg.includes('[MYTHIC_FOUND]')) {
          try {
            const jsonPart = msg.split('[MYTHIC_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'mythic');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear MYTHIC_FOUND:', err); }
        }
        if (msg.includes('[LEGENDARY_FOUND]')) {
          try {
            const jsonPart = msg.split('[LEGENDARY_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'legendary');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear LEGENDARY_FOUND:', err); }
        }
        if (msg.includes('[BUG SUITE]')) {
          console.log(`%c[${nomesAbas[idxAtual()] || ('Conta ' + (idxAtual() + 1))}] ${msg}`, 'color: #38bdf8; font-weight: bold;');
        }
      });
    }

    // Escala do modo Grid: acompanha quantas contas cabem por linha. Menos
    // colunas = card maior = dá pra render o jogo maior sem cortar nada.
    // O seletor "Escala Visual" NÃO manda aqui — ele é do modo Abas; no Grid
    // quem manda é o seletor de colunas, senão os dois brigariam pelo zoom.
    const GRID_ZOOM_POR_COLUNAS = { 2: 1.0, 3: 0.85, 4: 0.75, 5: 0.62, 6: 0.55 };

    // Zoom que as webviews DEVEM ter agora, dado o modo atual.
    // Ponto único de verdade — antes cada chamador refazia essa conta.
    function zoomAlvoAtual() {
      if (isGridMode) return GRID_ZOOM_POR_COLUNAS[obterColunasGrid()] || 0.75;
      const sel = document.getElementById('select-zoom');
      const val = sel ? sel.value : 'auto';
      return val === 'auto' ? 1.0 : (parseFloat(val) || 1.0);
    }

    function aplicarZoomAlvo() {
      aplicarZoomTodas(zoomAlvoAtual());
    }

    // --- Colunas do modo Grid --------------------------------------------
    // O CSS decide o formato a partir de --grid-cols (css/06): a altura da
    // linha sai da largura da coluna via aspect-ratio, então mexer só nesta
    // variável muda quantas contas cabem por linha sem tocar em mais nada.
    const GRID_COLS_PADRAO = 4;

    function obterColunasGrid() {
      const n = parseInt(localStorage.getItem('idlePokemonGridCols'), 10);
      return (n >= 2 && n <= 6) ? n : GRID_COLS_PADRAO;
    }

    function aplicarColunasGrid(n) {
      const container = document.getElementById('views-container');
      if (container) container.style.setProperty('--grid-cols', n);
      const sel = document.getElementById('select-grid-cols');
      if (sel) sel.value = String(n);
    }

    function alterarColunasGrid(valor) {
      const n = Math.min(6, Math.max(2, parseInt(valor, 10) || GRID_COLS_PADRAO));
      try { localStorage.setItem('idlePokemonGridCols', String(n)); } catch (e) {}
      aplicarColunasGrid(n);
      // Card maior/menor muda o zoom que o jogo precisa pra caber legível.
      if (isGridMode) aplicarZoomAlvo();
    }

    aplicarColunasGrid(obterColunasGrid());

    function aplicarZoomTodas(factor) {
      webviews.forEach(wv => {
        try {
          if (wv && typeof wv.setZoomFactor === 'function') {
            wv.setZoomFactor(factor);
          }
        } catch(e) {}
      });
    }

    function alterarZoomManual() {
      aplicarZoomAlvo();
    }

    function notificarAjusteGrid(isGrid) {
      webviews.forEach(wv => {
        try {
          wv.executeJavaScript(`
            if (typeof window.__ajustarParaGrid === 'function') {
              window.__ajustarParaGrid(${isGrid});
            }
          `).catch(() => {});
        } catch(e) {}
      });
    }

    // Seleção de aba
    // Guarda a aba de jogo que estava aberta antes de entrar na Dashboard, pra
    // que "Fechar Dashboard" volte pra ela em vez de jogar sempre na Conta 1.
    let abaAntesDaDashboard = 0;

    function selectTab(index) {
      if (index < 0 || index > totalContas) return;
      if (index === totalContas && currentTab !== totalContas) abaAntesDaDashboard = currentTab;
      currentTab = index;
      const isDashboardTab = (index === totalContas);

      // O destaque da aba na sidebar vale nos DOIS modos. Antes esta pintura
      // morava dentro do `else` do modo Abas, entao no modo Grid a sidebar
      // ficava com o `.active` congelado na ultima aba usada antes de entrar no
      // grid — nao dava pra saber qual conta estava em foco.
      tabButtons.forEach((btn, i) => {
        if (btn) {
          if (i === index) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });

      if (isGridMode) {
        if (isDashboardTab) toggleGridMode(); // Sai do grid se abrir a dashboard
        else {
          wrappers.forEach((w, i) => {
            if (w) {
              if (i === index) w.classList.add('focused');
              else w.classList.remove('focused');
            }
          });
        }
      } else {
        wrappers.forEach((wrap, i) => {
          if (wrap) {
            if (i === index) wrap.classList.add('active');
            else wrap.classList.remove('active');
          }
        });
      }

      if (isDashboardTab) {
        atualizarDashboardCompleta();
        iniciarLoopAutoAtualizacaoDashboard();
      } else {
        // Primeiro apresenta a nova conta; consultas auxiliares à webview ficam
        // para o próximo frame, removendo o atraso sentido ao trocar de aba.
        if (dashboardAutoRefreshTimer) {
          clearInterval(dashboardAutoRefreshTimer);
          dashboardAutoRefreshTimer = null;
        }
        requestAnimationFrame(() => {
          if (currentTab !== index || isGridMode) return;
          try { if (webviews[index]) webviews[index].focus(); } catch (e) {}
          try {
            const wvSel = webviews[index];
            if (wvSel && typeof wvSel.setZoomFactor === 'function') wvSel.setZoomFactor(zoomAlvoAtual());
          } catch (e) {}
          if (xpMiniViewVisible) atualizarXpTrackerContaAtiva();
          syncSidebarAutoToggles();
        });
      }
    }

    // Loop de auto-atualização contínua a cada 1 segundo em tempo real
    let dashboardAutoRefreshTimer = null;
    function iniciarLoopAutoAtualizacaoDashboard() {
      if (dashboardAutoRefreshTimer) clearInterval(dashboardAutoRefreshTimer);
      dashboardAutoRefreshTimer = setInterval(() => {
        const dashWrap = document.getElementById('wrap-4') || document.getElementById('wrap-dash');
        const estaVisivel = (currentTab === totalContas) || (dashWrap && dashWrap.classList.contains('active'));
        if (estaVisivel) {
          atualizarDashboardCompleta();
        }
      }, 1000);
    }
    // O loop só existe enquanto a Dashboard estiver aberta; não consulta as
    // contas em segundo plano quando o usuário está jogando em uma aba.

    // Alternar modo Grid
    function toggleGridMode() {
      isGridMode = !isGridMode;
      const container = document.getElementById('views-container');
      // Só existem os elementos "-menu" (o botão da topbar antiga sumiu no
      // redesign). btn-grid-toggle/grid-txt/grid-icon vinham SEM guarda no ramo
      // de saída do Grid e estouravam TypeError em `null.classList`, matando
      // tudo que vinha depois: selectTab, reset de zoom e notificarAjusteGrid.
      const gridTxtMenu = document.getElementById('grid-txt-menu');
      const gridIconMenu = document.getElementById('grid-icon-menu');

      if (isGridMode) {
        if (currentTab === totalContas) currentTab = 0;
        container.className = 'mode-grid';
        if (gridTxtMenu) gridTxtMenu.textContent = 'Modo Abas';
        if (gridIconMenu) gridIconMenu.textContent = '🗂️';
        wrappers.forEach((w, i) => {
          if (w) {
            if (i === totalContas) {
              w.classList.remove('active', 'focused');
            } else if (i === currentTab) {
              w.classList.add('focused');
            } else {
              w.classList.remove('focused');
            }
          }
        });
        tabButtons.forEach((btn, i) => {
          if (btn) {
            if (i === currentTab) btn.classList.add('active');
            else btn.classList.remove('active');
          }
        });
        aplicarZoomAlvo();
        notificarAjusteGrid(true);
      } else {
        container.className = 'mode-tabs';
        if (gridTxtMenu) gridTxtMenu.textContent = 'Grid Multi-Contas';
        if (gridIconMenu) gridIconMenu.textContent = '🪟';
        wrappers.forEach(w => w.classList.remove('focused'));
        selectTab(currentTab);
        // Volta ao zoom do seletor (100% quando está em "auto"). Reaplicado
        // também depois do relayout: setZoomFactor logo após trocar o container
        // de grid pra abas às vezes é engolido pelo resize da webview.
        aplicarZoomAlvo();
        setTimeout(aplicarZoomAlvo, 250);
        notificarAjusteGrid(false);
      }
    }

    // Recarregar webview ativa
    function reloadActiveWebview() {
      reloadWebview(currentTab);
    }

    // Recarregar todas e reaplicar ajustes de forma suave e rápida
    async function recarregarEAplicarTudo() {
      console.log('[IdleSuite] Recarregando e aplicando todas as contas...');
      await carregarScriptTamper();
      for (let i = 0; i < webviews.length; i++) {
        const wv = webviews[i];
        if (wv) {
          if (contasAutoProxyRefresh && contasAutoProxyRefresh[i]) {
            rotacionarProxyConta(i);
          }
          setTimeout(() => {
            try {
              wv.loadURL('https://idlepokemoon.com.br/play');
            } catch(e) {
              try { wv.reload(); } catch(e2) {}
            }
          }, i * 150);
        }
      }
    }

    async function reloadWebview(index) {
      if (webviews[index]) {
        if (contasAutoProxyRefresh && contasAutoProxyRefresh[index]) {
          const p = rotacionarProxyConta(index);
          if (p) {
            const ipOnly = p.split(':')[0].replace(/.*:\/\//, '');
            mostrarToast(`🔄 ${nomesAbas[index] || 'Conta ' + (index + 1)}: Novo proxy aplicado (${ipOnly})!`, '🌐', 'toast-success', 2500);
            await new Promise(r => setTimeout(r, 60));
          }
        }
        console.log(`[Conta ${index + 1}] Recarregando...`);
        try {
          webviews[index].loadURL('https://idlepokemoon.com.br/play');
        } catch(e) {
          try {
            webviews[index].reload();
          } catch(e2) {}
        }
      }
    }

    // Reiniciar aplicativo
    function reiniciarAplicativo() {
      console.log('[IdleSuite] Reiniciando aplicativo...');
      ipcRenderer.send('restart-app');
    }

    // Alternar áudio global com persistência no localStorage
    function renderizarEstadoAudio() {
      const audioIcon = document.getElementById('audio-icon');
      const audioBtn = document.getElementById('btn-audio-toggle');
      if (isMuted) {
        if (audioIcon) audioIcon.textContent = '🔇';
        if (audioBtn) audioBtn.classList.add('active');
      } else {
        if (audioIcon) audioIcon.textContent = '🔊';
        if (audioBtn) audioBtn.classList.remove('active');
      }
      webviews.forEach(wv => {
        if (wv && typeof wv.setAudioMuted === 'function') {
          wv.setAudioMuted(isMuted);
        }
      });
    }

    function toggleGlobalAudio() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('idlePokemonGlobalMuted', isMuted ? '1' : '0');
      } catch(e) {}
      renderizarEstadoAudio();
    }

    // === MINI XP VIEW (POKÉMON + TREINADOR) — DRAGGABLE ===
