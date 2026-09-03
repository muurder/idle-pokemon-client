    //  👑 DASHBOARD 4X COMMAND CENTER & SALA DE TROFÉUS SHINIES
    // ================================================================
    let dashboardData = Array.from({length: 16}, () => null);

    async function atualizarDashboardCompleta() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        try {
          const info = await wv.executeJavaScript(`
            (function() {
              try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                let data = null;
                if (typeof window.__obterDashboardStatus === 'function') {
                  try { data = window.__obterDashboardStatus(); } catch(e) {}
                }
                if (!data && typeof w.__obterDashboardStatus === 'function') {
                  try { data = w.__obterDashboardStatus(); } catch(e) {}
                }

                const kObj = (w.K && typeof w.K === 'object') ? w.K : ((window.K && typeof window.K === 'object') ? window.K : {});
                const gsObj = (w.gameState && typeof w.gameState === 'object') ? w.gameState : ((window.gameState && typeof window.gameState === 'object') ? window.gameState : {});
                const s = (kObj.player) ? kObj : ((gsObj.player) ? gsObj : (w.qState || w.state || {}));

                const p = s.player || kObj.player || gsObj.player || {};
                const balls = s.balls || kObj.balls || gsObj.balls || {};
                const pots = s.potions || kObj.potions || gsObj.potions || {};
                const team = Array.isArray(s.team) ? s.team : (Array.isArray(kObj.team) ? kObj.team : (Array.isArray(gsObj.team) ? gsObj.team : []));
                const act = s.active || kObj.active || team.find(x => x && x.active) || team[0] || gsObj.active || null;
                const rawBag = Array.isArray(s.bag) ? s.bag : (Array.isArray(kObj.bag) ? kObj.bag : (Array.isArray(gsObj.bag) ? gsObj.bag : []));

                if (!data || typeof data !== 'object') data = {};

                if (!data.trainer || !data.trainer.trim()) data.trainer = p.name || '';
                if (!data.level || data.level === 1) data.level = Number(p.level || data.level || 1);
                if (p.xp != null) data.xp = Number(p.xp);
                if (p.xpNext != null) data.xpNext = Number(p.xpNext);
                if (p.xpPct != null) data.xpPct = Math.round(Number(p.xpPct));
                if (p.kills != null && (data.kills == null || data.kills === 0)) data.kills = Number(p.kills);
                if (p.catches != null && (data.catches == null || data.catches === 0)) data.catches = Number(p.catches);
                
                // Gold & Diamonds
                if (p.gold != null) data.gold = Number(p.gold);
                if (p.diamonds != null) data.diamonds = Number(p.diamonds);

                // Inventory, Balls & Bag
                if (!data.inventory || typeof data.inventory !== 'object') data.inventory = {};
                const uBalls = Number(balls.ultra || balls['ultra ball'] || 0);
                if (uBalls > 0 || data.inventory.ultraBalls == null) data.inventory.ultraBalls = uBalls;

                const uPots = Number(pots.ultra || pots.hyper || pots['ultra potion'] || 0);
                if (uPots > 0 || data.inventory.ultraPotions == null) data.inventory.ultraPotions = uPots;

                if (!data.inventory.bag || !data.inventory.bag.length) {
                  data.inventory.bag = rawBag.map(it => ({
                    name: it.name || 'Item',
                    count: Number(it.count || it.qty || 1),
                    price: Number(it.price || 0),
                    type: it.type || 'loot'
                  }));
                }

                // Active Pokemon
                if ((!data.active || !data.active.name) && act && act.name) {
                  const pkExp = Number(act.exp || act.xp || 0);
                  const pkExpNext = Number(act.expNext || act.xpNext || 1);
                  const pkExpPct = act.expPct != null ? Number(act.expPct) : (pkExp && pkExpNext ? Math.min(100, Math.round((pkExp / pkExpNext) * 100)) : 0);

                  data.active = {
                    id: act.id,
                    name: act.name,
                    level: Number(act.level || 1),
                    shiny: !!act.shiny,
                    hp: Math.round(Number(act.hp || 0)),
                    maxHp: Math.round(Number(act.maxHp || 100)),
                    exp: pkExp,
                    expNext: pkExpNext,
                    expPct: Math.round(pkExpPct),
                    dps: Number(act.dps || 0),
                    power: Number(act.power || 0),
                    held: act.heldNome || act.held || null,
                    moves: act.moves || []
                  };
                }

                return data;
              } catch(err) {
                return { _err: String(err && err.message ? err.message : err) };
              }
            })()
          `);
          if (info && !info._err) {
            dashboardData[i] = info;
          }
        } catch(e) {
          console.warn(`[Dashboard] Erro ao obter dados da Conta ${i + 1}:`, e);
        }
      }

      renderizarCardsDashboard();
      renderizarGaleriaShiniesDashboard();
    }

    function renderizarCardsDashboard() {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;

      grid.innerHTML = Array.from({length: totalContas}, (_, i) => i).map(i => {
        const d = dashboardData[i] || {};
        const nomeAba = nomesAbas[i] || `Conta ${i + 1}`;
        const trainerDisplayName = d.trainer || obterNomeTreinadorConta(i) || nomeAba;
        const isMain = (i === 0);

        const act = d.active;
        const pokeNameClean = act ? act.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'pikachu';
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${pokeNameClean}.png`;
        const hpPct = (act && act.maxHp) ? Math.max(0, Math.min(100, Math.round((act.hp / act.maxHp) * 100))) : 100;
        const hpColor = hpPct > 50 ? '#22c55e' : (hpPct > 20 ? '#eab308' : '#ef4444');

        const huntActive = d.hunt ? d.hunt.active : true;
        const huntTarget = (d.hunt && d.hunt.target) ? d.hunt.target : 'Caçada Ativa';
        
        // Kills & Catches & Shinies
        const huntKills = (d.hunt && d.hunt.kills) ? d.hunt.kills.toLocaleString() : '0';
        const totalKills = (d.kills) ? d.kills.toLocaleString() : huntKills;
        const huntCatches = (d.hunt && d.hunt.catches) ? d.hunt.catches.toLocaleString() : '0';
        const totalCatches = (d.catches) ? d.catches.toLocaleString() : huntCatches;
        const huntShinies = (d.hunt && d.hunt.shinies != null) ? d.hunt.shinies : 0;
        const totalShinies = (d.totalShinies != null) ? d.totalShinies : huntShinies;

        const ultraBalls = (d.inventory && d.inventory.ultraBalls != null) ? d.inventory.ultraBalls.toLocaleString() : '0';
        const ultraPots = (d.inventory && d.inventory.ultraPotions != null) ? d.inventory.ultraPotions.toLocaleString() : '0';
        const bagItems = (d.inventory && Array.isArray(d.inventory.bag)) ? d.inventory.bag : [];
        const dex = d.pokedex || { total: 151, caught: (d.catches || 0), missing: Math.max(0, 151 - (d.catches || 0)), pct: 0 };
        const dexTotal = dex.total || 151;
        const dexCaught = dex.caught || 0;
        const dexMissing = (dex.missing != null) ? dex.missing : Math.max(0, dexTotal - dexCaught);
        const dexPct = (dex.pct != null) ? dex.pct : (dexTotal > 0 ? Math.round((dexCaught / dexTotal) * 100) : 0);

        const enc = d.encounter || {};
        const encName = enc.name || '';
        const encClean = encName ? encName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'substitute';
        const encSpriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${encClean}.png`;
        const encHpPct = (enc.maxHp) ? Math.max(0, Math.min(100, Math.round((enc.hp / enc.maxHp) * 100))) : 0;
        const ballsStats = d.ballsStats || {};

        return `
          <div class="dash-acc-card ${isMain ? 'is-main' : ''}">
            <!-- CABEÇALHO DO TREINADOR -->
            <div class="dash-acc-head">
              <div class="dash-acc-title">
                <span class="dash-acc-name">${trainerDisplayName}</span>
                <span class="dash-acc-badge ${isMain ? 'main' : 'farm'}">${isMain ? '👑 MAIN' : 'FARM'}</span>
                ${d.vip ? '<span style="font-size:8.5px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:900; padding:1px 5px; border-radius:4px">💎 VIP</span>' : ''}
                <span class="dash-level-badge">Lv.${d.level || 1}</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:12px; font-weight:900; color:#4ade80">💰 $${(d.gold || 0).toLocaleString('pt-BR')}</div>
                ${(d.diamonds || 0) > 0 ? `<div style="font-size:10px; font-weight:800; color:#38bdf8">💎 ${d.diamonds}</div>` : ''}
              </div>
            </div>

            <!-- BARRA DE XP DO TREINADOR -->
            <div style="display:flex; flex-direction:column; gap:2px">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8">
                <span>XP Treinador: <b style="color:#e2e8f0">${(d.xp || 0).toLocaleString()}</b> / ${(d.xpNext || 0).toLocaleString()}</span>
                <div style="display:flex; align-items:center; gap:4px">
                  <span class="dash-eta-pill" title="Tempo estimado para o Treinador subir de nível">⏳ ${d.trainerEta || '—'}</span>
                  <span class="dash-pct-pill cyan">📈 ${d.xpPct || 0}%</span>
                </div>
              </div>
              <div class="dash-progress-track">
                <div class="dash-progress-fill trainer" style="width:${Math.max(0, Math.min(100, d.xpPct || 0))}%"></div>
              </div>
            </div>

            <!-- POKÉMON ATIVO COM EXP & DPS -->
            ${act ? `
              <div class="dash-poke-box">
                <img class="dash-poke-sprite" src="${spriteUrl}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; gap:3px">
                  <!-- NOME, LEVEL & DPS -->
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:11.5px; font-weight:900; color:${act.shiny ? '#fde047' : '#f8fafc'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                      ${act.shiny ? '⭐ ' : ''}${act.name}
                    </span>
                    <div style="display:flex; align-items:center; gap:4px">
                      <span class="dash-level-badge poke">Lv.${act.level}</span>
                      <span style="color:#f59e0b; font-weight:900; font-size:9.5px">⚡ ${(act.dps || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <!-- HP BAR -->
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:8.5px; color:#94a3b8; margin-bottom:1px">
                      <span>HP: <b style="color:#f1f5f9">${act.hp}/${act.maxHp}</b></span>
                      <span class="dash-pct-pill green">${hpPct}%</span>
                    </div>
                    <div class="dash-hp-bar">
                      <div class="dash-hp-fill" style="width:${hpPct}%; background:${hpColor}"></div>
                    </div>
                  </div>

                  <!-- XP / LEVEL UP BAR -->
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; color:#94a3b8; margin-bottom:1px">
                      <span>XP: <b style="color:#e2e8f0">${(act.exp || 0).toLocaleString()}</b> / ${(act.expNext || 0).toLocaleString()}</span>
                      <div style="display:flex; align-items:center; gap:4px">
                        <span class="dash-eta-pill poke" title="Tempo estimado para o Pokémon ativo subir de nível">⏳ ${act.expEta || '—'}</span>
                        <span class="dash-pct-pill pink">🆙 ${act.expPct || 0}%</span>
                      </div>
                    </div>
                    <div class="dash-progress-track">
                      <div class="dash-progress-fill poke-xp" style="width:${Math.max(0, Math.min(100, act.expPct || 0))}%"></div>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="dash-poke-box" style="justify-content:center; color:#94a3b8; font-size:10.5px">
                <span>⚔️ Pokémon em Batalha Ativa</span>
              </div>
            `}

            <!-- INIMIGO ATACADO AGORA & KILLS NA POKÉDEX -->
            ${encName && encName !== 'Nenhum' ? `
              <div class="dash-enemy-box">
                <img class="dash-poke-sprite" style="width:34px; height:34px" src="${encSpriteUrl}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; gap:2px">
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:10.5px; font-weight:800; color:${enc.shiny ? '#fde047' : '#fca5a5'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                      ${enc.shiny ? '⭐ ' : '⚔️ '}${enc.name} <span style="color:#94a3b8; font-size:9px">Lv.${enc.level || 1}</span>
                    </span>
                    <span style="font-size:8.5px; font-weight:900; color:${enc.dexDone ? '#4ade80' : '#fde047'}">
                      ${enc.dexDone ? '✅ Pokelog Feito' : `🎯 ${enc.dexKills}/${enc.dexGoal} Kills`}
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:8px; color:#94a3b8">
                    <span>HP Alvo: ${enc.hp}/${enc.maxHp} (${encHpPct}%)</span>
                    <span>Dex Abates: <b>${enc.dexPct || 0}%</b></span>
                  </div>
                  <div class="dash-hp-bar" style="height:4px">
                    <div class="dash-hp-fill" style="width:${encHpPct}%; background:#ef4444"></div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- PROGRESSO DA POKÉDEX & FALTANDO -->
            <div class="dash-dex-section">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px">
                <span style="color:#94a3b8; font-weight:800; display:flex; align-items:center; gap:4px">
                  <span>📖 POKÉDEX:</span>
                  <b style="color:#38bdf8">${dexCaught} / ${dexTotal}</b>
                  <span style="color:#f87171; font-weight:700">(${dexMissing} faltando)</span>
                </span>
                <span class="dash-pct-pill emerald">🎯 ${dexPct}%</span>
              </div>
              <div class="dash-progress-track" style="margin-top:2px">
                <div class="dash-progress-fill poke-dex" style="width:${Math.max(0, Math.min(100, dexPct))}%"></div>
              </div>
            </div>

            <!-- ESTATÍSTICAS ACUMULADAS NO PERSONAGEM (BICHOS & SHINIES MORTOS) -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill" title="Total acumulado de Pokémon derrotados pelo personagem">
                <span class="dash-stat-label">💀 BICHOS MORTOS (CONTA):</span>
                <span class="dash-stat-val" style="color:#f87171; font-size:11px">
                  ${totalKills} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntKills})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de Pokémon Shinies derrotados ou registrados pelo personagem">
                <span class="dash-stat-label">⭐ SHINIES MORTOS (CONTA):</span>
                <span class="dash-stat-val" style="color:#fde047; font-size:11px">
                  ${totalShinies} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntShinies})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de capturas acumuladas no personagem">
                <span class="dash-stat-label">🎯 CAPTURAS TOTAIS (CONTA):</span>
                <span class="dash-stat-val" style="color:#38bdf8; font-size:11px">
                  ${totalCatches} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntCatches})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Alvo configurado na caçada automática">
                <span class="dash-stat-label">🎯 ALVO / HUNT:</span>
                <span class="dash-stat-val" style="color:#a855f7; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                  ${huntActive ? '⚔️ ' : '⏸ '}${huntTarget}
                </span>
              </div>
            </div>

            <!-- ESTOQUE DE BALLS & POÇÕES -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill">
                <span class="dash-stat-label">⚾ ULTRA BALLS (ESTOQUE):</span>
                <span class="dash-stat-val" style="color:#a855f7; font-size:11px">
                  ${ultraBalls} un
                </span>
              </div>
              <div class="dash-stat-pill">
                <span class="dash-stat-label">🧪 ULTRA POTS (ESTOQUE):</span>
                <span class="dash-stat-val" style="color:#ec4899; font-size:11px">
                  ${ultraPots} un
                </span>
              </div>
            </div>

            <!-- BALLS TACADAS (NORMAL & SHINY) -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill" title="Total de bolas lançadas em Pokémon normais">
                <span class="dash-stat-label">⚾ BALLS NORMAIS TACADAS:</span>
                <span class="dash-stat-val" style="color:#fde047; font-size:11px">
                  ${(ballsStats.normalThrown || 0).toLocaleString()} <span style="font-size:8.5px; color:#94a3b8">(Alvo: ${ballsStats.targetNormal || 0})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de bolas lançadas em Pokémon Shinies">
                <span class="dash-stat-label">✨ BALLS SHINIES TACADAS:</span>
                <span class="dash-stat-val" style="color:#c084fc; font-size:11px">
                  ${(ballsStats.shinyThrown || 0).toLocaleString()} <span style="font-size:8.5px; color:#94a3b8">(Alvo: ${ballsStats.targetShiny || 0})</span>
                </span>
              </div>
            </div>

            <!-- DROPS & ITENS DA MOCHILA -->
            <div class="dash-bag-section">
              <div class="dash-bag-head">
                <span style="font-size:9.5px; font-weight:800; color:#94a3b8; display:flex; align-items:center; gap:4px">
                  <span>🎒 DROPS & MOCHILA:</span>
                  <b style="color:#fde047">${bagItems.length} tipos</b>
                </span>
              </div>
              <div class="dash-bag-chips">
                ${bagItems.length > 0 ? bagItems.map(it => {
                  const ic = (typeof obterIconeItem === 'function') ? obterIconeItem(it.name) : { icon: '📦' };
                  return `
                    <div class="dash-bag-chip" title="${it.name} (${it.count} un) — Valor: $${(it.price * it.count).toLocaleString()}">
                      <span>${ic.icon}</span>
                      <span class="dash-bag-chip-name">${it.name}</span>
                      <span class="dash-bag-chip-qty">x${it.count}</span>
                    </div>
                  `;
                }).join('') : '<div style="font-size:9px; color:#64748b; font-style:italic; padding:2px">Mochila limpa</div>'}
              </div>
            </div>

            <!-- BOTÕES DE AÇÃO INDIVIDUAIS -->
            <div class="dash-card-actions">
              <button class="dash-btn ${huntActive ? 'dash-btn-yellow' : 'dash-btn-green'}" style="flex:1" onclick="toggleHuntConta(${i})">
                <span>${huntActive ? '⏸ Pausar' : '⚔️ Caçar'}</span>
              </button>
              <button class="dash-btn dash-btn-pink" style="flex:1" onclick="curarConta(${i})" title="Usar Poção">
                <span>💊 Curar</span>
              </button>
              <button class="dash-btn dash-btn-primary" style="padding:6px 8px" onclick="selectTab(${i})" title="Abrir em Tela Cheia">
                <span>👁️</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Ações Rápidas da Dashboard
    async function iniciarTodasHunts() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        wv.executeJavaScript(`
          try {
            if (window.gameState && window.gameState.auto) window.gameState.auto.hunt = true;
            const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
            if (btn && !btn.classList.contains('active')) btn.click();
          } catch(e) {}
        `).catch(() => {});
      }
      mostrarToast(`⚔️ Auto-Hunt INICIADO nas ${totalContas} contas simultaneamente!`, '🚀', 'toast-success', 4000);
      setTimeout(atualizarDashboardCompleta, 1000);
    }

    async function pausarTodasHunts() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        wv.executeJavaScript(`
          try {
            if (window.gameState && window.gameState.auto) window.gameState.auto.hunt = false;
            const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
            if (btn && btn.classList.contains('active')) btn.click();
          } catch(e) {}
        `).catch(() => {});
      }
      mostrarToast(`⏸ Auto-Hunt PAUSADO nas ${totalContas} contas.`, '⏸', 'normal', 3000);
      setTimeout(atualizarDashboardCompleta, 1000);
    }

    async function toggleHuntConta(idx) {
      const wv = webviews[idx];
      if (!wv) return;
      await wv.executeJavaScript(`
        try {
          if (window.gameState && window.gameState.auto) {
            window.gameState.auto.hunt = !window.gameState.auto.hunt;
          }
          const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
          if (btn) btn.click();
        } catch(e) {}
      `).catch(() => {});
      setTimeout(atualizarDashboardCompleta, 600);
    }

    async function curarTodasContas() {
      for (let i = 0; i < totalContas; i++) {
        curarConta(i);
      }
      mostrarToast(`💊 Comando de cura enviado para todas as ${totalContas} contas!`, '✨', 'toast-success', 3500);
      setTimeout(atualizarDashboardCompleta, 1200);
    }

    async function curarConta(idx) {
      const wv = webviews[idx];
      if (!wv) return;
      await wv.executeJavaScript(`
        (async function() {
          try {
            if (typeof window.__executarAcaoTrade === 'function') {
              await window.__executarAcaoTrade('usePotion', { potion: 'ultra' });
            } else if (typeof Y === 'function') {
              await Y('usePotion', { potion: 'ultra' });
            }
          } catch(e) {}
        })()
      `).catch(() => {});
      setTimeout(atualizarDashboardCompleta, 800);
    }

    // ================================================================
