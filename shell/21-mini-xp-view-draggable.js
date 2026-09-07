    let xpMiniViewVisible = false;
    let xpMiniPinnedToSidebar = false;
    try {
      if (localStorage.getItem('idlePokemonXpMiniPinned') === '1') xpMiniPinnedToSidebar = true;
    } catch(e) {}

    let xpMiniViewEl = null;
    let _xpMiniDrag = { active: false, startX: 0, startY: 0, origX: 0, origY: 0 };

    function toggleXpMiniView() {
      xpMiniViewVisible = !xpMiniViewVisible;
      try {
        localStorage.setItem('idlePokemonXpMiniView', xpMiniViewVisible ? '1' : '0');
      } catch(e) {}

      atualizarBadgeXpTrackerMenu();

      if (xpMiniViewVisible) criarXpMiniView();
      else destruirXpMiniView();
    }

    function atualizarBadgeXpTrackerMenu() {
      const badge = document.getElementById('xp-mini-badge');
      if (badge) {
        badge.textContent = xpMiniViewVisible ? 'ON' : 'OFF';
        badge.style.color = xpMiniViewVisible ? '#4ade80' : '#64748b';
        badge.style.background = xpMiniViewVisible ? 'rgba(34,197,94,0.18)' : 'rgba(100,116,139,0.15)';
        badge.style.borderColor = xpMiniViewVisible ? 'rgba(34,197,94,0.35)' : 'rgba(100,116,139,0.3)';
      }
    }

    function toggleXpMiniPinSidebar() {
      xpMiniPinnedToSidebar = !xpMiniPinnedToSidebar;
      try {
        localStorage.setItem('idlePokemonXpMiniPinned', xpMiniPinnedToSidebar ? '1' : '0');
      } catch(e) {}

      destruirXpMiniView();
      if (xpMiniViewVisible) {
        criarXpMiniView();
      }
      mostrarToast(
        xpMiniPinnedToSidebar ? '📌 XP Tracker fixado na barra lateral esquerda!' : '↗️ XP Tracker no modo flutuante arrastável!',
        '📈',
        'toast-success',
        2500
      );
    }

    function criarXpMiniView() {
      if (xpMiniViewEl) return;

      const containerSidebar = document.getElementById('sidebar-xp-tracker-container');

      xpMiniViewEl = document.createElement('div');
      xpMiniViewEl.id = 'xp-mini-view';

      if (xpMiniPinnedToSidebar && containerSidebar) {
        // === MODO FIXADO NA SIDEBAR ===
        containerSidebar.style.display = 'block';
        xpMiniViewEl.style.cssText = `
          position: relative;
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98));
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(16,185,129,0.1);
          z-index: 10;
          display: flex; flex-direction: column;
          font-family: 'Segoe UI', system-ui, sans-serif;
          user-select: none;
          margin-bottom: 2px;
          animation: xpMiniSlideIn 0.25s cubic-bezier(0.16,1,0.3,1);
        `;
      } else {
        // === MODO FLUTUANTE ARRASTÁVEL ===
        if (containerSidebar) containerSidebar.style.display = 'none';
        let posX = 300, posY = 120;
        try {
          const saved = JSON.parse(localStorage.getItem('idlePokemonXpMiniPos') || '{}');
          if (saved.x != null && saved.y != null) { posX = saved.x; posY = saved.y; }
        } catch(e) {}

        xpMiniViewEl.style.cssText = `
          position: fixed; top: ${posY}px; left: ${posX}px;
          width: 330px;
          background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98));
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          box-shadow: 0 6px 25px rgba(0,0,0,0.7), 0 0 15px rgba(16,185,129,0.15);
          z-index: 99998;
          display: flex; flex-direction: column;
          font-family: 'Segoe UI', system-ui, sans-serif;
          user-select: none;
          animation: xpMiniSlideIn 0.25s cubic-bezier(0.16,1,0.3,1);
        `;
      }

      const pinIcon = xpMiniPinnedToSidebar ? '↗️' : '📌';
      const pinTitle = xpMiniPinnedToSidebar ? 'Desafixar para modo flutuante' : 'Fixar na barra lateral esquerda';
      const dragCursor = xpMiniPinnedToSidebar ? 'default' : 'grab';

      xpMiniViewEl.innerHTML = `
        <!-- BARRA DE TITULO ENXUTA.
             Antes: gradiente verde de fundo, borda inferior, emoji 📈, o texto
             "XP TRACKER" em caixa-alta e QUATRO botoes (recolher, mover cima,
             mover baixo, fixar, fechar). Numa faixa de 236px isso era mais
             moldura que conteudo — e o bloco ja se identifica pelas duas barras
             de XP com nome de Pokemon e de treinador.
             Ficaram: a alca de arrasto e as duas acoes que so existem aqui
             (fixar/soltar e fechar). Sem fundo e sem borda. -->
        <!-- A classe sidebar-block-header NAO E DECORATIVA: acharCabecalhoBloco
             (shell/05) procura por ela pra saber onde encaixar os botoes de
             mover. Sem ela o localizador subia dois parentElement e devolvia o
             BLOCO INTEIRO como cabecalho — os botoes iam parar no fim do bloco,
             soltos embaixo das barras de XP.
             (sem crases aqui: este HTML mora dentro de um template literal, e
              crase em "comentario" fecha a string — ver a guarda em build.py) -->
        <div id="xpmini-drag-handle" class="xpmini-head sidebar-block-header" style="cursor:${dragCursor}">
          <span class="sidebar-block-drag-icon xpmini-detail-hide" title="Arraste para reordenar">⠿</span>
          <span class="xpmini-title-text sidebar-block-titulo">XP Tracker</span>
          <span style="flex:1"></span>
          <div class="xpmini-actions-group">
            <button id="xpmini-toggle-collapse" class="sidebar-block-toggle-btn" onclick="toggleBlockCollapse('xp-tracker', event)" title="Recolher/expandir detalhes">▾</button>
            <button id="xpmini-pin" class="sidebar-block-toggle-btn" title="${pinTitle}">${pinIcon}</button>
            <button id="xpmini-close" class="sidebar-block-toggle-btn" title="Fechar XP Tracker">✕</button>
          </div>
        </div>
        <!-- CONTENT -->
        <div id="xp-mini-view-content" style="padding:7px 8px; display:flex; flex-direction:column; gap:6px">
          <!-- POKEMON XP -->
          <div class="xpmini-poke-block" style="display:flex; flex-direction:column; gap:3px">
            <div class="xpmini-row-header" style="display:flex; align-items:center; justify-content:space-between">
              <div class="xpmini-detail-hide" style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">
                <span style="font-size:11px; flex-shrink:0">🐾</span>
                <span id="xpmini-poke-name" style="font-size:10.5px; font-weight:800; color:#86efac; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">Pokémon</span>
                <span id="xpmini-poke-lv" style="font-size:9px; background:rgba(34,197,94,0.18); border:1px solid rgba(34,197,94,0.3); color:#4ade80; padding:0 4px; border-radius:4px; font-weight:800; font-family:'SF Mono',monospace; flex-shrink:0">Lv.--</span>
              </div>
              <span id="xpmini-poke-pct" style="font-size:10.5px; font-weight:900; color:#4ade80; font-family:'SF Mono',monospace; flex-shrink:0">0%</span>
            </div>
            <div style="width:100%; height:5px; background:rgba(15,23,42,0.9); border-radius:3px; overflow:hidden; border:1px solid rgba(34,197,94,0.25)">
              <div id="xpmini-poke-fill" style="width:0%; height:100%; border-radius:3px; background:linear-gradient(90deg,#16a34a,#22c55e,#4ade80); box-shadow:0 0 6px rgba(34,197,94,0.4); transition:width 0.3s"></div>
            </div>
            <div class="xpmini-detail-hide" style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; margin-top:1px">
              <span id="xpmini-poke-falta" style="color:#e2e8f0; font-weight:600; font-family:'SF Mono',monospace">≈ -- pokes</span>
              <span id="xpmini-poke-eta" style="color:#fde047; font-weight:800; font-family:'SF Mono',monospace">⏳ --</span>
            </div>
          </div>

          <!-- TRAINER XP -->
          <div class="xpmini-jog-block" style="display:flex; flex-direction:column; gap:3px">
            <div class="xpmini-row-header" style="display:flex; align-items:center; justify-content:space-between">
              <div class="xpmini-detail-hide" style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">
                <span style="font-size:11px; flex-shrink:0">🧑</span>
                <span id="xpmini-jog-name" style="font-size:10.5px; font-weight:800; color:#fcd34d; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">Treinador</span>
                <span id="xpmini-jog-lv" style="font-size:9px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; padding:0 4px; border-radius:4px; font-weight:800; font-family:'SF Mono',monospace; flex-shrink:0">Lv.--</span>
              </div>
              <span id="xpmini-jog-pct" style="font-size:10.5px; font-weight:900; color:#fbbf24; font-family:'SF Mono',monospace; flex-shrink:0">0%</span>
            </div>
            <div style="width:100%; height:5px; background:rgba(15,23,42,0.9); border-radius:3px; overflow:hidden; border:1px solid rgba(245,158,11,0.25)">
              <div id="xpmini-jog-fill" style="width:0%; height:100%; border-radius:3px; background:linear-gradient(90deg,#b45309,#f59e0b,#fbbf24); box-shadow:0 0 6px rgba(245,158,11,0.4); transition:width 0.3s"></div>
            </div>
            <div class="xpmini-detail-hide" style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; margin-top:1px">
              <span id="xpmini-jog-falta" style="color:#e2e8f0; font-weight:600; font-family:'SF Mono',monospace">≈ -- pokes</span>
              <span id="xpmini-jog-eta" style="color:#fde047; font-weight:800; font-family:'SF Mono',monospace">⏳ --</span>
            </div>
          </div>
        </div>
      `;

      if (xpMiniPinnedToSidebar && containerSidebar) {
        containerSidebar.appendChild(xpMiniViewEl);
      } else {
        document.body.appendChild(xpMiniViewEl);
      }

      // Close button
      const btnClose = document.getElementById('xpmini-close');
      if (btnClose) btnClose.onclick = () => toggleXpMiniView();

      // Pin button
      const btnPin = document.getElementById('xpmini-pin');
      if (btnPin) btnPin.onclick = () => toggleXpMiniPinSidebar();

      aplicarEstadoColapsoBlocos();

      // Drag logic (apenas no modo flutuante)
      if (!xpMiniPinnedToSidebar) {
        const handle = document.getElementById('xpmini-drag-handle');
        if (handle) {
          handle.addEventListener('mousedown', (e) => {
            if (e.target.id === 'xpmini-close' || e.target.id === 'xpmini-pin' || e.target.id === 'xpmini-toggle-collapse') return;
            _xpMiniDrag.active = true;
            _xpMiniDrag.startX = e.clientX;
            _xpMiniDrag.startY = e.clientY;
            const rect = xpMiniViewEl.getBoundingClientRect();
            _xpMiniDrag.origX = rect.left;
            _xpMiniDrag.origY = rect.top;
            handle.style.cursor = 'grabbing';
            e.preventDefault();
          });
        }
      }

      iniciarXpMiniViewPolling();
    }

    document.addEventListener('mousemove', (e) => {
      if (!_xpMiniDrag.active || !xpMiniViewEl || xpMiniPinnedToSidebar) return;
      const dx = e.clientX - _xpMiniDrag.startX;
      const dy = e.clientY - _xpMiniDrag.startY;
      const newX = _xpMiniDrag.origX + dx;
      const newY = _xpMiniDrag.origY + dy;
      xpMiniViewEl.style.left = Math.max(0, Math.min(window.innerWidth - 100, newX)) + 'px';
      xpMiniViewEl.style.top = Math.max(0, Math.min(window.innerHeight - 50, newY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!_xpMiniDrag.active) return;
      _xpMiniDrag.active = false;
      const handle = document.getElementById('xpmini-drag-handle');
      if (handle) handle.style.cursor = 'grab';
      // Salva posição do modo flutuante
      try {
        if (xpMiniViewEl && !xpMiniPinnedToSidebar) {
          const rect = xpMiniViewEl.getBoundingClientRect();
          localStorage.setItem('idlePokemonXpMiniPos', JSON.stringify({ x: rect.left, y: rect.top }));
        }
      } catch(e) {}
    });

    function destruirXpMiniView() {
      const containerSidebar = document.getElementById('sidebar-xp-tracker-container');
      if (containerSidebar) containerSidebar.style.display = 'none';
      if (xpMiniViewEl) { xpMiniViewEl.remove(); xpMiniViewEl = null; }
      if (window._xpMiniPollInterval) { clearInterval(window._xpMiniPollInterval); window._xpMiniPollInterval = null; }
    }

    function iniciarXpMiniViewPolling() {
      if (window._xpMiniPollInterval) clearInterval(window._xpMiniPollInterval);
      window._xpMiniPollInterval = setInterval(() => {
        if (xpMiniViewVisible && xpMiniViewEl) {
          atualizarXpTrackerContaAtiva();
        }
      }, 1000);
      atualizarXpTrackerContaAtiva();
    }

    async function atualizarXpTrackerContaAtiva() {
      if (!xpMiniViewVisible || !xpMiniViewEl) return;
      try {
        // Encontra o webview da conta que está selecionada atualmente no aplicativo
        const idx = (currentTab >= 0 && currentTab < totalContas) ? currentTab : 0;
        const wv = document.querySelector(`#wrap-${idx} webview`);
        if (!wv) return;

        const dataJson = await wv.executeJavaScript(`(function() {
          try {
            // 1. Prioridade: Se o Idle Suite já calculou os dados exatos da conta
            if (window.__idleSuiteXpStatus && typeof window.__idleSuiteXpStatus === 'object') {
              return JSON.stringify(window.__idleSuiteXpStatus);
            }

            // 2. Fallback de cálculo e leitura inteligente do DOM nativo do jogo
            let domPokePct = null;
            let domJogPct = null;
            let domPokeLv = null;
            let domJogLv = null;

            const elPokeLv = document.getElementById('pp-poke-lv');
            if (elPokeLv && elPokeLv.textContent) {
              const mLv = elPokeLv.textContent.match(/(\d+)/);
              if (mLv) domPokeLv = parseInt(mLv[1], 10);
            }

            const domPokeTxt = document.getElementById('pp-poke-xptxt');
            if (domPokeTxt && domPokeTxt.textContent) {
              const m = domPokeTxt.textContent.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
              if (m) domPokePct = parseFloat(m[1]);
            }
            const domPlTxt = document.getElementById('pp-exp-pct');
            if (domPlTxt && domPlTxt.textContent) {
              const p = parseFloat(domPlTxt.textContent);
              if (!isNaN(p)) domJogPct = p;
            }

            const targetArea = document.getElementById('player-panel') || document.getElementById('bottom-bar') || document.body;
            if (targetArea) {
              const txtAll = targetArea.textContent || '';
              if (domPokePct === null) {
                const m = txtAll.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
                if (m) domPokePct = parseFloat(m[1]);
              }
              if (domJogPct === null) {
                const m = txtAll.match(/EXP\s*(\d+(?:\.\d+)?)\s*%/i);
                if (m) domJogPct = parseFloat(m[1]);
              }
              if (domJogLv === null) {
                const m = txtAll.match(/N[ií]vel\s*(\d+)/i);
                if (m) domJogLv = parseInt(m[1], 10);
              }
            }

            const K = window.K || {};
            const player = K.player || {};
            const active = K.active || (K.team && K.team.find(t => t.id === K.activeId)) || (K.team && K.team[0]) || {};
            const hunt = K.hunt || {};

            const kills = (hunt.kills > 0) ? Number(hunt.kills) : 0;
            const xpPoke = (hunt.xp > 0) ? Number(hunt.xp) : 0;
            const xpMedioPoke = (xpPoke > 0 && kills > 0) ? (xpPoke / kills) : 0;
            const xpRestantePoke = (active.xpNext || 0) - (active.xp || 0);
            const faltaPoke = (xpRestantePoke > 0 && xpMedioPoke > 0) ? Math.ceil(xpRestantePoke / xpMedioPoke) : 0;

            const xpJog = (hunt.pxp > 0) ? Number(hunt.pxp) : 0;
            const xpMedioJog = (xpJog > 0 && kills > 0) ? (xpJog / kills) : 0;
            const xpRestanteJog = (player.xpNext || 0) - (player.xp || 0);
            const faltaJog = (xpRestanteJog > 0 && xpMedioJog > 0) ? Math.ceil(xpRestanteJog / xpMedioJog) : 0;

            const secs = (hunt.secs > 0) ? Number(hunt.secs) : 1;
            const taxaPoke = (xpPoke > 0 && secs > 0) ? (xpPoke / secs) : 0;
            const taxaJog = (xpJog > 0 && secs > 0) ? (xpJog / secs) : 0;

            const fmtTempo = (s) => {
              if (!Number.isFinite(s) || s <= 0 || s > 8640000) return '--';
              const sec = Math.ceil(s);
              const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), seg = sec % 60;
              if (h > 0) return h + 'h ' + m + 'm';
              if (m > 0) return m + 'm ' + seg + 's';
              return seg + 's';
            };

            const fmtFalta = (restante, k) => {
              if (restante <= 0 && (active.xpNext || player.xpNext)) return '✅ 100%';
              if (k > 0) return '⚔️ ' + k.toLocaleString('pt-BR') + ' pokes';
              if (restante > 0) return 'falta ' + restante.toLocaleString('pt-BR') + ' XP';
              return '—';
            };

            const finalPokePct = domPokePct !== null ? domPokePct : (active.xp && active.xpNext ? Math.round((active.xp / active.xpNext) * 100) : 0);
            const finalJogPct = domJogPct !== null ? domJogPct : (player.xpPct != null ? parseFloat(player.xpPct) : (player.xp && player.xpNext ? Math.round((player.xp / player.xpNext) * 100) : 0));

            return JSON.stringify({
              poke: {
                name: active.name || 'Pokémon',
                level: active.level || domPokeLv || '--',
                shiny: !!(active.shiny || active.isShiny),
                pct: finalPokePct,
                pctText: Math.round(finalPokePct) + '%',
                falta: fmtFalta(xpRestantePoke, faltaPoke),
                eta: '⏳ ' + fmtTempo(taxaPoke > 0 ? xpRestantePoke / taxaPoke : Infinity)
              },
              jog: {
                name: player.name || 'Treinador',
                level: player.level || domJogLv || '--',
                pct: finalJogPct,
                pctText: Math.round(finalJogPct) + '%',
                falta: fmtFalta(xpRestanteJog, faltaJog),
                eta: '⏳ ' + fmtTempo(taxaJog > 0 ? xpRestanteJog / taxaJog : Infinity)
              }
            });
          } catch(e) { return '{}'; }
        })()`).catch(() => '{}');

        const s = JSON.parse(dataJson);
        if (s && (s.poke || s.jog)) {
          renderizarDadosXpMiniView(s);
        }
      } catch(e) {}
    }

    function renderizarDadosXpMiniView(s) {
      if (!s) return;
      const poke = s.poke || {};
      const jog = s.jog || {};

      // Pokémon XP
      const pokeName = document.getElementById('xpmini-poke-name');
      const pokeLv = document.getElementById('xpmini-poke-lv');
      const pokePct = document.getElementById('xpmini-poke-pct');
      const pokeFill = document.getElementById('xpmini-poke-fill');
      const pokeFalta = document.getElementById('xpmini-poke-falta');
      const pokeEta = document.getElementById('xpmini-poke-eta');

      if (pokeName && poke.name) {
        pokeName.textContent = (poke.shiny ? '✨ ' : '') + poke.name;
        if (pokeLv) pokeLv.textContent = 'Lv.' + (poke.level || '--');
        const pctNum = Math.max(0, Math.min(100, Math.round(Number(poke.pct) || 0)));
        if (pokePct) pokePct.textContent = poke.pctText || (pctNum + '%');
        if (pokeFill) pokeFill.style.width = pctNum + '%';
        if (pokeFalta) pokeFalta.textContent = poke.falta || '—';
        if (pokeEta) pokeEta.textContent = (poke.eta && !poke.eta.includes('⏳')) ? '⏳ ' + poke.eta : (poke.eta || '⏳ --');
      }

      // Treinador XP
      const jogName = document.getElementById('xpmini-jog-name');
      const jogLv = document.getElementById('xpmini-jog-lv');
      const jogPct = document.getElementById('xpmini-jog-pct');
      const jogFill = document.getElementById('xpmini-jog-fill');
      const jogFalta = document.getElementById('xpmini-jog-falta');
      const jogEta = document.getElementById('xpmini-jog-eta');

      if (jogName && jog.name) {
        jogName.textContent = jog.name;
        if (jogLv) jogLv.textContent = 'Lv.' + (jog.level || '--');
        const pctNumJog = Math.max(0, Math.min(100, Math.round(Number(jog.pct) || 0)));
        if (jogPct) jogPct.textContent = jog.pctText || (pctNumJog + '%');
        if (jogFill) jogFill.style.width = pctNumJog + '%';
        if (jogFalta) jogFalta.textContent = jog.falta || '—';
        if (jogEta) jogEta.textContent = (jog.eta && !jog.eta.includes('⏳')) ? '⏳ ' + jog.eta : (jog.eta || '⏳ --');
      }

      // Tooltip informativo completo para quando o card/sidebar estiver recolhido
      if (xpMiniViewEl) {
        const pDesc = `🐾 ${poke.name || 'Pokémon'} Lv.${poke.level || '--'} (${poke.pctText || '0%'}) | ${poke.falta || ''} | ${poke.eta || ''}`;
        const jDesc = `🧑 ${jog.name || 'Treinador'} Lv.${jog.level || '--'} (${jog.pctText || '0%'}) | ${jog.falta || ''} | ${jog.eta || ''}`;
        xpMiniViewEl.setAttribute('title', `📈 XP TRACKER:\n${pDesc}\n${jDesc}`);
      }
    }

    // Restore XP mini view state
    try {
      if (localStorage.getItem('idlePokemonXpMiniView') === '1') {
        xpMiniViewVisible = true;
        setTimeout(() => {
          criarXpMiniView();
          const badge = document.getElementById('xp-mini-badge');
          if (badge) {
            badge.textContent = 'ON';
            badge.style.color = '#4ade80';
            badge.style.background = 'rgba(34,197,94,0.18)';
            badge.style.borderColor = 'rgba(34,197,94,0.35)';
          }
        }, 500);
      }
    } catch(e) {}

    // === FUNÇÕES DO EDITOR DE SCRIPTS ===
