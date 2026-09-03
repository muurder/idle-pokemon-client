    // ================================================================
    //  📊 MINI DASHBOARD — CONTAS ATIVAS (coleta + render)
    // ================================================================
    // A janela (abrir/fechar/arrastar/modo lista) vive em
    // shell/40-mini-dashboard.js. Aqui fica só a coleta por webview e a
    // montagem do HTML dos cards.
    //
    // Havia duas versões da mesma tela (v1 `.md-*` + v2 `.md2-*`) alimentadas
    // nesta mesma passada. A v1 foi removida: sobrou só o layout v2.
    // ================================================================
    let mdDiagPrev = {};

    function fmtNum(n) {
      n = Number(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    }

    const BALL_ICONS = {
      pokeball: '🔴', 'poke ball': '🔴', great: '🔵', super: '🟣', ultra: '🟡',
      'ultra ball': '🟡', premier: '⚪', master: '🟠', safari: '🟢', net: '🕸️',
      nest: '🥚', dive: '🌊', luxury: '💠', repeat: '🔁', timer: '⏱️', quick: '⚡',
      heal: '💚', lure: '🎣', dusk: '🌑', fast: '💨', beast: '🟣', dream: '💤',
      park: '🏞️', cherish: '💖'
    };
    function ballLabel(k) {
      return (k || '').replace(/\s*ball\s*/i, '').replace(/^\w/, c => c.toUpperCase()) || 'Bola';
    }

    async function atualizarMiniDashboard() {
      const cardsEl = document.getElementById('mini-dash-cards');
      if (!cardsEl || !miniDashAberto) return;

      let totalGold = 0, totalDiam = 0, totalBalls = 0, contasOk = 0;
      const cards = [];

      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        let st = null, auto = null, balls = 0, ballsObj = {};
        // Defaults — se o try falhar, o card ainda renderiza
        let hbRate = 0, vis = 'hidden', visIcon = '🔴', awake = false;
        if (wv && typeof wv.executeJavaScript === 'function') {
          try {
            const res = await wv.executeJavaScript(`(function(){
              try {
                var out = { status: null, auto: null, balls: 0, ballsObj: {} };
                if (typeof window.__obterDashboardStatus === 'function') out.status = window.__obterDashboardStatus();
                if (typeof window.__getIdleAuto === 'function') out.auto = window.__getIdleAuto();
                var w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                var b = (w.gameState && w.gameState.balls) || (w.K && w.K.balls) || {};
                for (var k in b) { out.balls += Number(b[k] || 0); out.ballsObj[k] = Number(b[k] || 0); }
                var diag = { vis: (document.visibilityState || (document.hidden ? 'hidden' : 'visible')), hidden: !!document.hidden };
                try {
                  if (!window.__mdHb) { window.__mdHb = 0; window.__mdHbT = setInterval(function(){ window.__mdHb++; }, 200); window.__mdRaf = 0; (function lp(){ window.__mdRaf++; requestAnimationFrame(lp); })(); }
                  diag.hb = window.__mdHb || 0; diag.raf = window.__mdRaf || 0;
                } catch(e3) {}
                out.diag = diag;
                return out;
              } catch(e2) { return { error: String(e2) }; }
            })()`);
            if (res && !res.error) { st = res.status; auto = res.auto; balls = res.balls; ballsObj = res.ballsObj || {}; }
            const d = (res && res.diag) || {};
            const prevD = mdDiagPrev[i] || { hb: d.hb || 0, t: Date.now() };
            const dtSec = Math.max(0.2, (Date.now() - prevD.t) / 1000);
            hbRate = Math.max(0, Math.round(((d.hb || 0) - prevD.hb) / dtSec));
            mdDiagPrev[i] = { hb: d.hb || 0, t: Date.now() };
            vis = d.vis || (st ? 'visible' : 'hidden');
            visIcon = vis === 'visible' ? '🟢' : (vis === 'hidden' ? '🟡' : '🔴');
            awake = hbRate >= 3;
          } catch (e2) {}
        }

        const nome = (st && st.trainer) || nomesAbas[i] || ('Conta ' + (i + 1));
        const trainerLv = (st && st.level) || '?';
        const act = (st && st.active) || null;
        const pokeNome = act && act.name ? act.name : '—';
        const pokeLv = act ? act.level : '?';
        const gold = (st && st.gold) || 0;
        const diam = (st && st.diamonds) || 0;
        const bolas = balls || (st && st.inventory && st.inventory.ultraBalls) || 0;

        // ETA vem pronto de __obterDashboardStatus (scripts/37c-dashboard-status-api.js):
        // XP que falta pro próximo nível ÷ taxa de XP/s medida na caçada.
        const etaTreinador = (st && st.trainerEta) || '—';
        const pctTreinador = st && st.xpPct != null ? Math.max(0, Math.min(100, st.xpPct)) : 0;
        const etaPoke = (act && act.expEta) || '—';
        const pctPoke = act && act.expPct != null ? Math.max(0, Math.min(100, act.expPct)) : 0;

        if (st) {
          totalGold += Number(gold || 0);
          totalDiam += Number(diam || 0);
          totalBalls += Number(bolas || 0);
          contasOk++;
        }

        const a = auto || {};
        const tg = (mode, icon, on) => `<div class="md2-tg ${on ? 'on' : ''}" onclick="toggleIdleAuto(${i}, '${mode}', event)">${icon}</div>`;
        const chips = Object.keys(ballsObj || {})
          .filter(k => Number(ballsObj[k]) > 0)
          .sort((x, y) => Number(ballsObj[y]) - Number(ballsObj[x]))
          .slice(0, 5)
          .map(k => `<span class="md2-ball" title="${ballLabel(k)}">${BALL_ICONS[(k || '').toLowerCase()] || '⚪'} ${fmtNum(ballsObj[k])}</span>`)
          .join('') || '<span class="md2-ball">sem bolas</span>';

        // Linha de progresso + ETA. `--` (sem caçada rodando) fica apagado pra
        // não parecer dado carregando.
        const linhaEta = (icon, rotulo, pct, eta, cor) => `
          <div class="md2-eta">
            <div class="md2-eta-top">
              <span class="md2-eta-lb">${icon} ${rotulo}</span>
              <span class="md2-eta-val ${eta === '—' ? 'off' : ''}">⏳ ${eta}</span>
            </div>
            <div class="md2-eta-bar"><i style="width:${pct}%; background:${cor}"></i></div>
          </div>`;

        cards.push(`
          <div class="md2-card ${i === currentTab ? 'active' : ''}" onclick="selectTab(${i})" title="Ir para ${nome}">
            <div class="md2-top">
              <span class="md2-dot ${awake ? 'on' : 'off'}" title="${awake ? 'Acordada (rodando em 2º plano)' : 'Em descanso / throttle'}"></span>
              <div style="min-width:0">
                <div class="md2-name">${nome}</div>
                <div class="md2-sub">Treinador Nv ${trainerLv}</div>
              </div>
              <span class="md2-hb">${visIcon} ${hbRate}/s</span>
            </div>
            <div class="md2-poke"><span>🔥 ${pokeNome}</span><span>Nv ${pokeLv}</span></div>
            ${linhaEta('🧑', 'Treinador ' + pctTreinador + '%', pctTreinador, etaTreinador, '#38bdf8')}
            ${linhaEta('🐾', 'Pokémon ' + pctPoke + '%', pctPoke, etaPoke, '#4ade80')}
            <div class="md2-stats">
              <div class="md2-stat"><div class="v" style="color:#f5a623">${fmtNum(gold)}</div><div class="l">Gold</div></div>
              <div class="md2-stat"><div class="v" style="color:#38bdf8">${fmtNum(diam)}</div><div class="l">Diam</div></div>
              <div class="md2-stat"><div class="v" style="color:#fbbf24">${fmtNum(bolas)}</div><div class="l">Bolas</div></div>
            </div>
            <div class="md2-balls">${chips}</div>
          </div>
        `);
      }

      cardsEl.innerHTML = cards.join('');
      const summaryEl = document.getElementById('mini-dash-summary');
      if (summaryEl) summaryEl.innerHTML = `
        <div class="md2-sum"><div class="l">Ouro Total</div><div class="v" style="color:#f5a623">${fmtNum(totalGold)}</div></div>
        <div class="md2-sum"><div class="l">Diamantes</div><div class="v" style="color:#38bdf8">${fmtNum(totalDiam)}</div></div>
        <div class="md2-sum"><div class="l">Pokébolas</div><div class="v" style="color:#fbbf24">${fmtNum(totalBalls)}</div></div>
        <div class="md2-sum"><div class="l">Online</div><div class="v" style="color:#c4b5fd">${contasOk}/${totalContas}</div></div>
      `;
    }

    async function toggleIdleAuto(i, mode, ev) {
      if (ev) { ev.stopPropagation(); ev.preventDefault(); }
      const wv = webviews[i];
      if (!wv || typeof wv.executeJavaScript !== 'function') return;
      let atual = false;
      try {
        const a = await wv.executeJavaScript("typeof window.__getIdleAuto==='function'?window.__getIdleAuto():null");
        if (a) atual = !!(a[mode]);
      } catch (e2) {}
      try {
        await wv.executeJavaScript("window.__setIdleAuto('" + mode + "', " + (!atual) + ")");
      } catch (e2) {}
      atualizarMiniDashboard();
    }

    function confirmarRenomear() {
      const input = document.getElementById('modal-rename-input');
      const novoNome = (input.value || '').trim();
      if (novoNome) {
        nomesAbas[editandoAbaIndex] = novoNome;
        try {
          localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        } catch(e) {}
        renderizarNomesAbas();
        renderizarAbasClient();
      }
      fecharModalRenomear();
    }

    function forcarRefreshPeloModal() {
      const idx = editandoAbaIndex;
      if (idx < 0 || idx >= totalContas) return;
      fecharModalRenomear();
      if (contasAutoProxyRefresh && contasAutoProxyRefresh[idx]) {
        rotacionarProxyConta(idx);
      }
      mostrarToast(`🔄 Forçando refresh na Conta ${idx + 1} (${nomesAbas[idx] || 'Conta ' + (idx + 1)})...`, '🔄', 'normal', 3000);
      try {
        const wv = webviews[idx];
        if (wv) {
          wv.webContents.session.clearCache().then(() => {
            wv.webContents.session.clearStorageData({ storages: ['cookies', 'sessionstorage', 'localstorage'] }).then(() => {
              wv.reload();
              mostrarToast(`✅ Cache limpo e reload executado na Conta ${idx + 1}!`, '✅', 'toast-success', 3000);
            }).catch(() => { wv.reload(); });
          }).catch(() => { wv.reload(); });
        }
      } catch(e) {
        mostrarToast(`❌ Erro ao fazer refresh: ${e.message}`, '❌', 'normal', 3000);
      }
    }

    // ================================================================
