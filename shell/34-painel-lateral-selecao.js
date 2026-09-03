    function toggleEvalSidePanel() {
      const panel = document.getElementById('eval-side-panel');
      if (!panel) return;
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        panel.style.display = 'none';
      } else {
        abrirEvalSidePanel();
      }
    }

    function abrirEvalSidePanel() {
      const panel = document.getElementById('eval-side-panel');
      if (!panel) return;
      panel.style.display = 'flex';
      requestAnimationFrame(() => {
        panel.classList.add('open');
      });
      renderizarEvalSidePanel();
    }

    function renderizarEvalSidePanel() {
      const listEl = document.getElementById('eval-side-panel-list');
      const countEl = document.getElementById('eval-side-panel-count');
      const statsEl = document.getElementById('eval-side-panel-stats');
      const listEl2 = document.getElementById('v2-eval-side-panel-list');
      const countEl2 = document.getElementById('v2-eval-side-panel-count');
      const statsEl2 = document.getElementById('v2-eval-side-panel-stats');
      if (!listEl && !listEl2) return;

      const selected = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (countEl) countEl.textContent = selected.length;
      if (countEl2) countEl2.textContent = selected.length;

      // Stats
      const totalScore = selected.reduce((s, p) => s + (p.score || 0), 0);
      const avgScore = selected.length ? Math.round(totalScore / selected.length) : 0;
      const rarities = {};
      selected.forEach(p => { const r = p.raridade || 'Comum'; rarities[r] = (rarities[r] || 0) + 1; });
      const statsHtml = `
        <span style="font-size:9px; color:#94a3b8; background:rgba(15,23,42,0.6); padding:2px 7px; border-radius:5px; border:1px solid rgba(148,163,184,0.15)">⚡ Média: <b style='color:${avgScore >= 60 ? '#4ade80' : avgScore >= 40 ? '#fbbf24' : '#f87171'}'>${avgScore}%</b></span>
        ${Object.entries(rarities).slice(0, 3).map(([r, c]) => `<span style="font-size:9px; color:#94a3b8; background:rgba(15,23,42,0.6); padding:2px 7px; border-radius:5px; border:1px solid rgba(148,163,184,0.15)">${r}: <b style='color:#c084fc'>${c}</b></span>`).join('')}
      `;
      if (statsEl) statsEl.innerHTML = statsHtml;
      if (statsEl2) statsEl2.innerHTML = statsHtml;

      if (!selected.length) {
        const vazio = '<div style="text-align:center; color:#64748b; padding:30px 10px; font-size:11px">Nenhum Pokémon selecionado.<br>Use os filtros acima para selecionar.</div>';
        if (listEl) listEl.innerHTML = vazio;
        if (listEl2) listEl2.innerHTML = vazio;
        return;
      }

      // Ordenar por score crescente (piores primeiro)
      selected.sort((a, b) => (a.score || 0) - (b.score || 0));

      const itemsHtml2 = listEl2 ? selected.map(pk => {
        const spriteUrl2 = pk.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.id}.png`;
        const tier2 = pk.tier || 'C';
        const scoreColor2 = pk.score >= 80 ? '#4ade80' : pk.score >= 60 ? '#fbbf24' : pk.score >= 40 ? '#f97316' : '#ef4444';
        return `
          <div class="v2eval-side-item">
            <img src="${spriteUrl2}" onerror="this.style.display='none'">
            <div style="flex:1; min-width:0;">
              <div class="n">${pk.shiny ? '✨ ' : ''}${pk.name || '???'}</div>
              <div class="m">Lv.${pk.level || 1} · ${tier2}</div>
            </div>
            <span class="sc" style="color:${scoreColor2}">${pk.score}%</span>
            <button onclick="removerDoSidePanel('${pk.contaIdx}_${pk.id}')">✕</button>
          </div>
        `;
      }).join('') : '';
      if (listEl2) listEl2.innerHTML = itemsHtml2;
      if (!listEl) return;

      listEl.innerHTML = selected.map(pk => {
        const spriteUrl = pk.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.id}.png`;
        const tier = pk.tier || 'C';
        const tierColors = { 'S+': '#f59e0b', S: '#a855f7', A: '#22c55e', B: '#3b82f6', C: '#6b7280' };
        const tc = tierColors[tier] || '#6b7280';
        const scoreColor = pk.score >= 80 ? '#4ade80' : pk.score >= 60 ? '#fbbf24' : pk.score >= 40 ? '#f97316' : '#ef4444';
        const growthPct = pk.growthTotal || 0;
        return `
          <div class="eval-side-panel-item" data-key="${pk.contaIdx}_${pk.id}">
            <img class="pokemon-sprite" src="${spriteUrl}" alt="" onerror="this.style.display='none'">
            <div style="flex:1; min-width:0">
              <div class="poke-name">${pk.shiny ? '✨ ' : ''}${pk.name || '???'}</div>
              <div class="poke-meta">Lv.${pk.level || 1} · ${pk.contaNome || pk.contaIdx} · <span style="color:${tc}; font-weight:800">${tier}</span></div>
              <div class="poke-meta">📈 ${growthPct}% · 🧬 ${pk.ivTotal || '?'}/192</div>
            </div>
            <div class="poke-score" style="background:rgba(${pk.score >= 60 ? '34,197,94' : pk.score >= 40 ? '245,158,11' : '239,68,68'},0.2); color:${scoreColor}; border:1px solid rgba(${pk.score >= 60 ? '34,197,94' : pk.score >= 40 ? '245,158,11' : '239,68,68'},0.4)">${pk.score}%</div>
            <button class="poke-remove" onclick="removerDoSidePanel('${pk.contaIdx}_${pk.id}')" title="Remover">✕</button>
          </div>
        `;
      }).join('');
    }

    function removerDoSidePanel(key) {
      pokesSelecionadosMeta.delete(key);
      renderizarAvaliadorMeta();
      renderizarEvalSidePanel();
    }

    async function executarAcaoEmMassaTrade(acao) {
      const alvos = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (!alvos.length) {
        mostrarToast('Nenhum Pokémon selecionado no painel.', '⚠️', 'normal', 2500);
        return;
      }
      if (acao === 'sell') {
        executarVendaEmMassa();
      } else if (acao === 'lock') {
        executarAcaoEmMassa('lock');
      }
      renderizarEvalSidePanel();
    }

    function limparSelecaoMeta() {
      pokesSelecionadosMeta.clear();
      renderizarAvaliadorMeta();
      const panel = document.getElementById('eval-side-panel');
      if (panel && panel.classList.contains('open')) {
        renderizarEvalSidePanel();
      }
    }

    async function executarAcaoEmMassa(acao) {
      if (!pokesSelecionadosMeta.size) {
        mostrarToast('Selecione pelo menos um Pokémon usando as checkboxes.', '⚠️', 'normal', 3000);
        return;
      }

      const alvos = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (!alvos.length) return;


      if (acao === 'lock' || acao === 'unlock') {
        const isLock = (acao === 'lock');
        mostrarToast(`${isLock ? '🔒 Bloqueando' : '🔓 Desbloqueando'} ${alvos.length} Pokémon...`, isLock ? '🔒' : '🔓', 'normal', 2500);

        for (const pk of alvos) {
          const wv = webviews[pk.contaIdx];
          if (wv) {
            await executarAcaoTradeNoWebview(wv, 'lockPoke', { pokeId: pk.id });
            pk.locked = isLock;
          }
        }
        mostrarToast(`${alvos.length} Pokémon ${isLock ? '🔒 Bloqueados' : '🔓 Desbloqueados'} com sucesso!`, isLock ? '🔒' : '🔓', 'toast-success', 3000);
        renderizarAvaliadorMeta();
      }
    }

    async function executarVendaEmMassa() {
      if (!pokesSelecionadosMeta.size) {
        mostrarToast('Selecione pelo menos um Pokémon para vender.', '⚠️', 'normal', 3000);
        return;
      }

      const selecionados = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      const vendaveis = selecionados.filter(p => !p.locked);
      const bloqueados = selecionados.filter(p => p.locked);

      if (!vendaveis.length) {
        mostrarToast('Todos os Pokémon selecionados estão <b>🔒 Bloqueados</b>. Destrave-os para poder vender.', '🔒', 'normal', 3500);
        return;
      }

      const totalGold = vendaveis.reduce((sum, p) => sum + (p.sell || 0), 0);
      const avisoBloqueados = bloqueados.length ? `\n(⚠️ ${bloqueados.length} Pokémon travados serão ignorados)` : '';

      const confirmMsg = `💰 Deseja realmente VENDER ${vendaveis.length} Pokémon selecionados por um total de $${totalGold.toLocaleString('pt-BR')} Gold?${avisoBloqueados}`;
      if (!confirm(confirmMsg)) return;

      mostrarToast(`💰 Vendendo ${vendaveis.length} Pokémon selecionados...`, '💰', 'normal', 2500);

      let vendidosCount = 0;
      let goldRecebido = 0;

      for (const pk of vendaveis) {
        const wv = webviews[pk.contaIdx];
        if (wv) {
          if (pk.isTeam) {
            await executarAcaoTradeNoWebview(wv, 'moveToBox', { pokeId: pk.id });
          }
          const res = await executarAcaoTradeNoWebview(wv, 'sell', { pokeId: pk.id });
          if (res && res.ok) {
            vendidosCount++;
            goldRecebido += (pk.sell || 0);
            pokesSelecionadosMeta.delete(`${pk.contaIdx}_${pk.id}`);
            avaliadorPokesCache = avaliadorPokesCache.filter(x => !(String(x.id) === String(pk.id) && x.contaIdx === pk.contaIdx));
          }
        }
      }

      mostrarToast(`🎉 <b>${vendidosCount} Pokémon</b> vendidos com sucesso!<br>💰 Total recebido: <b>+$${goldRecebido.toLocaleString('pt-BR')}</b> Gold!`, '💰', 'toast-success', 4500);
      renderizarAvaliadorMeta();
      setTimeout(carregarInventariosTradeHub, 800);
    }

    let modoVisualizacaoAvaliador = localStorage.getItem('idlePokemonEvalViewMode') || 'cards';

    function alterarModoVisualizacaoAvaliador(modo) {
      modoVisualizacaoAvaliador = modo;
      localStorage.setItem('idlePokemonEvalViewMode', modo);
      const btnC = document.getElementById('btn-eval-view-cards');
      const btnL = document.getElementById('btn-eval-view-list');
      if (btnC) btnC.classList.toggle('active', modo === 'cards');
      if (btnL) btnL.classList.toggle('active', modo === 'list');
      const btnC2 = document.getElementById('v2-btn-eval-view-cards');
      const btnL2 = document.getElementById('v2-btn-eval-view-list');
      if (btnC2) btnC2.classList.toggle('active', modo === 'cards');
      if (btnL2) btnL2.classList.toggle('active', modo === 'list');
      renderizarAvaliadorMeta();
    }

    // Card v2 único que serve tanto pra "cards" quanto "lista" — o CSS
    // (.v2eval-grid.view-list) reorganiza os mesmos blocos numa linha densa em
    // vez de escondê-los, evita manter dois templates HTML sincronizados.
    //
    // O que o card destaca (pedido do usuário): tier + score, RANK (geral e
    // entre as cópias da espécie), growth total e o growth por stat (os "IVs"
    // do jogo), natureza e de qual conta é o Pokémon.
    const V2EVAL_STATS = [
      { k: 'hp', lb: 'HP' }, { k: 'atk', lb: 'Atk' }, { k: 'def', lb: 'Def' },
      { k: 'spa', lb: 'SpA' }, { k: 'spd', lb: 'SpD' }, { k: 'spe', lb: 'Vel', alt: 'vel' }
    ];
    // O teto por stat vem do próprio jogo (pk.growthMax, coletado em shell/25);
    // 32 é só o fallback. O chip pinta pelo quão perto do teto está, pra dar
    // pra bater o olho e ver onde o bicho é forte.
    function v2evalChipsStats(pk) {
      const g = pk.growth;
      if (!g || typeof g !== 'object') {
        return '<span class="v2eval-statchip vazio">growth não informado</span>';
      }
      const max = Number(pk.growthMax) || 32;
      return V2EVAL_STATS.map(({ k, lb, alt }) => {
        const v = Number(g[k] != null ? g[k] : (alt ? g[alt] : 0)) || 0;
        const pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
        const nivel = pct >= 85 ? 'alto' : pct >= 60 ? 'medio' : pct >= 35 ? 'baixo' : 'ruim';
        return `<span class="v2eval-statchip ${nivel}" title="${lb}: ${v}/${max} (${pct}%)"><b>${lb}</b>${v}</span>`;
      }).join('');
    }

    function fmtCompacto(n) {
      n = Number(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.round(n));
    }

    function renderizarAvaliadorMetaV2(lista) {
      if (typeof avaliadorMetaV2Aberto === 'undefined' || !avaliadorMetaV2Aberto) return;
      const grid2 = document.getElementById('v2-eval-cards-grid');
      if (!grid2) return;
      grid2.classList.toggle('view-list', modoVisualizacaoAvaliador === 'list');
      grid2.classList.toggle('view-cards', modoVisualizacaoAvaliador !== 'list');

      if (!lista.length) {
        grid2.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:40px; font-size:11px">Nenhum Pokémon encontrado com os filtros selecionados.</div>';
        return;
      }

      const tierClassMap = { 'S+': 'tier-s-plus', S: 'tier-s', A: 'tier-a', B: 'tier-b' };
      grid2.innerHTML = lista.map(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        const isSelected = pokesSelecionadosMeta.has(key);
        const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
        const tierClass = tierClassMap[pk.tier] || 'tier-c';
        const growthPct = pk.growthPct != null ? pk.growthPct : pk.score;
        const growthAbs = (pk.growthTotal != null)
          ? `${pk.growthTotal}/${pk.growthTotalMax}`
          : '—';
        const dupTxt = pk.totalCopias > 1
          ? (pk.isMelhorCopia ? `👑 Melhor de ${pk.totalCopias}` : `🔄 Cópia ${pk.rankEspecie || '?'}ª de ${pk.totalCopias}`)
          : '';

        return `
          <div class="v2eval-card ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'selected' : ''}" style="--v2c-border:${pk.tier === 'S+' ? 'rgba(245,166,35,.35)' : pk.tier === 'S' ? 'rgba(168,85,247,.3)' : 'rgba(148,163,184,.14)'}">
            <div class="v2eval-card-head">
              <input type="checkbox" class="v2eval-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} />
              <img class="v2eval-sprite" src="${spriteUrl}" onerror="this.style.display='none'" />
              <div style="overflow:hidden; flex:1;">
                <div class="v2eval-name">${pk.shiny ? '✨ ' : ''}${pk.name}${pk.locked ? ' 🔒' : ''}</div>
                <div class="v2eval-sub2">Lv.${pk.level} · ${pk.contaNome}${pk.isTeam ? ' · ⚔️ Time' : ''}</div>
              </div>
              <span class="v2eval-tier ${tierClass}" title="Tier da ESPÉCIE, vindo do jogo — poder medido no alvo neutro">${pk.tier}</span>
              <span class="v2eval-ficha" title="Ficha: nota do que foi rolado na captura (IV ${(PESO_IV * 100).toFixed(0)}% + Growth ${(PESO_GROWTH * 100).toFixed(0)}%). Independe do nível.">${pk.score}%</span>
            </div>

            <div class="v2eval-metricas">
              <span class="v2eval-met dps" title="DPS que o jogo calcula pra este Pokémon AGORA (já inclui nível, IV, growth e item)">⚡ ${fmtCompacto(pk.dps)}</span>
              <span class="v2eval-met" title="Power do jogo — no mesmo nível e espécie, maior power = estritamente melhor">💪 ${fmtCompacto(pk.power)}</span>
              <span class="v2eval-met iv" title="Multiplicador de raridade rolado na captura (máx. 2.5). É o que mais mexe no power.">🎲 ${pk.rarity} ×${(pk.iv || 0).toFixed(2)}</span>
              ${pk.boost ? `<span class="v2eval-met" title="Boost aplicado">🚀 ${pk.boost}/${pk.boostMax || 100}</span>` : ''}
            </div>

            <div class="v2eval-ranks">
              <span class="v2eval-rank" title="Posição da ficha no acervo inteiro (todas as contas)">
                🏆 #${pk.rankGeral || '?'}<i>/${pk.rankGeralTotal || '?'}</i>
              </span>
              <span class="v2eval-rank ${pk.rankEspecie === 1 ? 'top' : ''}" title="Posição entre as cópias desta espécie — é este número que decide qual vender">
                🧬 #${pk.rankEspecie || 1}<i>/${pk.rankEspecieTotal || 1}</i>
              </span>
              <span class="v2eval-rank" title="Posição por DPS: quem bate mais AGORA, entre todos os Pokémon carregados">
                ⚡ #${pk.rankDps || '?'}
              </span>
              ${pk.natureTxt || pk.nature ? `<span class="v2eval-rank nature" title="Natureza">🌱 ${pk.natureTxt || pk.nature}</span>` : ''}
            </div>

            <div class="v2eval-growth-row"><span>Growth ${growthAbs}</span><span class="v2eval-growth-pct">${growthPct}%</span></div>
            <div class="v2eval-growth-bar"><div class="v2eval-growth-fill" style="width:${growthPct}%"></div></div>
            <div class="v2eval-stats">${v2evalChipsStats(pk)}</div>

            <div class="v2eval-build">
              <span class="v2eval-role">${pk.meta.role} · ${pk.meta.held}</span>
              <div class="v2eval-moves">
                ${pk.meta.moves.map(m => `<span class="v2eval-move ${m.stab ? 'stab' : ''}">${m.stab ? '⚡' : '💿'} ${m.name}</span>`).join('')}
              </div>
            </div>
            ${dupTxt ? `<div class="v2eval-dup" style="color:${pk.isMelhorCopia ? '#f5a623' : '#f87171'}">${dupTxt}</div>` : ''}
            <div class="v2eval-actions">
              <button class="v2eval-aicon" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar' : 'Travar venda'}">${pk.locked ? '🔒' : '🔓'}</button>
              <button class="v2eval-aicon" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar no Box' : 'Equipar no Time'}">${pk.isTeam ? '📦' : '⚔️'}</button>
              <button class="v2eval-aicon" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled' : ''} title="Vender por $${pk.sell.toLocaleString('pt-BR')}">💰</button>
              <button class="v2eval-aicon" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Aura">✨</button>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderizarAvaliadorMeta() {
      const grid = document.getElementById('eval-cards-grid');
      if (!grid) return;

      grid.className = 'eval-main-content ' + (modoVisualizacaoAvaliador === 'list' ? 'view-list' : 'view-cards');

      const btnC = document.getElementById('btn-eval-view-cards');
      const btnL = document.getElementById('btn-eval-view-list');
      if (btnC) btnC.classList.toggle('active', modoVisualizacaoAvaliador === 'cards');
      if (btnL) btnL.classList.toggle('active', modoVisualizacaoAvaliador === 'list');

      const lista = obterPokesVisiveisFiltrados();
      atualizarSumarioSelecaoMeta();
      renderizarAvaliadorMetaV2(lista);

      if (!lista.length) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:60px; font-size:12px">Nenhum Pokémon encontrado com os filtros selecionados.</div>';
        return;
      }

      // === RENDERIZAÇÃO: MODO 1 (TABELA / LISTA DETALHADA) ===
      if (modoVisualizacaoAvaliador === 'list') {
        grid.innerHTML = lista.map(pk => {
          const key = `${pk.contaIdx}_${pk.id}`;
          const isSelected = pokesSelecionadosMeta.has(key);
          const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
          const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
          
          let tierClass = 'tier-c';
          if (pk.tier === 'S+') tierClass = 'tier-s-plus';
          else if (pk.tier === 'S') tierClass = 'tier-s';
          else if (pk.tier === 'A') tierClass = 'tier-a';
          else if (pk.tier === 'B') tierClass = 'tier-b';

          const poderTxt = pk.power ? (pk.power >= 1000 ? (pk.power/1000).toFixed(1) + 'k' : pk.power) : '';

          return `
            <div class="eval-list-row ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'row-selected' : ''}">
              
              <!-- CHECKBOX DE SELEÇÃO EM MASSA -->
              <input type="checkbox" class="eval-poke-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} style="width:16px; height:16px; accent-color:#a855f7; cursor:pointer; flex-shrink:0" title="Selecionar para Venda / Bloqueio em Massa" />

              <!-- COLUNA 1: SPRITE & NOME & NÍVEL & PODER -->
              <div style="width:220px; display:flex; align-items:center; gap:8px; flex-shrink:0">
                <img src="${spriteUrl}" style="width:40px; height:40px; object-fit:contain" onerror="this.style.display='none'" />
                <div style="overflow:hidden">
                  <div style="font-size:12.5px; font-weight:900; color:${pk.shiny ? '#fde047' : '#f8fafc'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${pk.shiny ? '✨ ' : ''}${pk.name}</div>
                  <div style="font-size:10px; color:#38bdf8; font-weight:800">
                    Lv.${pk.level} ${poderTxt ? `• ⚡${poderTxt}` : ''} • <span style="color:#cbd5e1">${pk.contaNome}</span>
                  </div>
                </div>
              </div>

              <!-- COLUNA 2: TIER & SCORE & GROWTH (IVs) -->
              <div style="width:140px; display:flex; flex-direction:column; gap:2px; flex-shrink:0">
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <span class="eval-tier-badge ${tierClass}">Tier ${pk.tier} (${pk.score}%)</span>
                  ${pk.growthPct != null ? `<span style="font-size:9.5px; font-weight:800; color:#4ade80">🧬 ${pk.growthPct}%</span>` : ''}
                </div>
                <div style="height:4px; background:rgba(15,23,42,0.8); border-radius:3px; overflow:hidden">
                  <div style="height:100%; width:${pk.score}%; background:linear-gradient(90deg, #38bdf8, #a855f7)"></div>
                </div>
                ${pk.growthTotal != null ? `<div style="font-size:8.5px; color:#94a3b8; text-align:center">IV ${pk.growthTotal}/${pk.growthTotalMax}</div>` : ''}
              </div>

              <!-- COLUNA 3: RARIDADE & ORIGEM & IVs -->
              <div style="width:200px; flex-shrink:0; font-size:10.5px">
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap">
                  <span class="eval-rarity-badge" style="background:${(() => { const r = (pk.rarity||'').toLowerCase(); if (r==='mitico'||r==='mythic') return 'rgba(244,114,182,0.25);border-color:rgba(244,114,182,0.5);color:#f9a8d4'; if (r==='lendaria'||r==='legendary') return 'rgba(251,191,36,0.25);border-color:rgba(251,191,36,0.5);color:#fde047'; if (r==='epica'||r==='epic') return 'rgba(192,132,252,0.25);border-color:rgba(192,132,252,0.5);color:#d8b4fe'; if (r==='rara'||r==='rare') return 'rgba(96,165,250,0.2);border-color:rgba(96,165,250,0.4);color:#93c5fd'; if (r==='incomum'||r==='uncommon') return 'rgba(74,222,128,0.2);border-color:rgba(74,222,128,0.4);color:#86efac'; return 'rgba(148,163,184,0.15);border-color:rgba(148,163,184,0.3);color:#cbd5e1'; })()}" title="${pk.rarity} ×${(+pk.iv).toFixed(2)}">${pk.rarity} ×${(+pk.iv).toFixed(2)}</span>
                  ${pk.shiny ? '<span style="font-size:8px; font-weight:900; color:#fde047; background:rgba(253,224,71,0.15); border:1px solid rgba(253,224,71,0.4); padding:0 4px; border-radius:3px">✨ SHINY</span>' : ''}
                  <span style="color:${pk.isTeam ? '#4ade80' : '#c084fc'}; font-weight:800; font-size:9px">${pk.isTeam ? '⚔️ Time' : '📦 Box'}</span>
                </div>
                ${pk.growth ? `<div style="display:flex; gap:3px; margin-top:3px; flex-wrap:wrap">
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(74,222,128,0.12); color:#86efac" title="HP">HP ${pk.growth.hp||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(239,68,68,0.12); color:#fca5a5" title="Atk">Atk ${pk.growth.atk||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(56,189,248,0.12); color:#7dd3fc" title="Def">Def ${pk.growth.def||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(168,85,247,0.12); color:#d8b4fe" title="SpA">SpA ${pk.growth.spa||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(34,197,94,0.12); color:#86efac" title="SpD">SpD ${pk.growth.spd||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(251,191,36,0.12); color:#fde047" title="Vel">Vel ${pk.growth.spe||pk.growth.vel||0}</span>
                </div>` : ''}
              </div>

              <!-- COLUNA 4: HELD ITEM RECOMENDADO -->
              <div style="width:160px; flex-shrink:0">
                <span class="eval-held-tag">${pk.meta.held}</span>
              </div>

              <!-- COLUNA 5: MOVES -->
              <div style="flex:1; display:flex; gap:4px; overflow:hidden; flex-wrap:wrap">
                ${pk.meta.moves.map(m => `
                  <div class="eval-move-pill ${m.stab ? 'stab' : ''}" style="padding:3px 6px; font-size:9px" title="${m.name} (${m.type}) - DPS: ${m.dps}">
                    <span>${m.stab ? '⚡' : '💿'}</span>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:105px">${m.name}</span>
                  </div>
                `).join('')}
              </div>

              <!-- COLUNA 6: STATUS DUPLICATA -->
              <div style="width:105px; text-align:center; flex-shrink:0">
                ${pk.totalCopias > 1 ? `<span style="font-size:9.5px; font-weight:900; color:${pk.isMelhorCopia ? '#fde047' : '#f87171'}">${pk.isMelhorCopia ? '👑 Melhor de ' + pk.totalCopias : '🔄 Cópia ' + pk.totalCopias + 'x'}</span>` : '<span style="color:#64748b; font-size:9px">Único</span>'}
              </div>

              <!-- COLUNA 7: GRUPO DE AÇÕES (TRAVAR, TIME/BOX, VENDER, AURA, TRADE) -->
              <div style="display:flex; gap:4px; align-items:center; flex-shrink:0">
                <button class="eval-btn-action eval-btn-lock ${pk.locked ? 'locked' : ''}" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar Venda' : 'Travar Venda (Protege de descarte)'}">
                  <span>${pk.locked ? '🔒' : '🔓'}</span>
                </button>
                <button class="eval-btn-action eval-btn-swap" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar Pokémon no Box' : 'Equipar Pokémon no Time Ativo'}">
                  <span>${pk.isTeam ? '📦' : '⚔️'}</span>
                </button>
                <button class="eval-btn-action eval-btn-sell" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled title="Destrave o Pokémon para poder vender"' : `title="${pk.isTeam ? 'Remover do time e vender por $' + pk.sell.toLocaleString('pt-BR') : 'Vender por $' + pk.sell.toLocaleString('pt-BR')}"`}>
                  <span>💰</span>
                </button>
                <button class="eval-btn-action eval-btn-aura" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Escolher / Trocar Aura">
                  <span>✨</span>
                </button>
              </div>

            </div>
          `;
        }).join('');
        return;
      }

      // === RENDERIZAÇÃO: MODO 2 (CARDS AMPLOS & COMPLETOS) ===
      grid.innerHTML = lista.map(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        const isSelected = pokesSelecionadosMeta.has(key);
        const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
        
        let tierClass = 'tier-c';
        if (pk.tier === 'S+') tierClass = 'tier-s-plus';
        else if (pk.tier === 'S') tierClass = 'tier-s';
        else if (pk.tier === 'A') tierClass = 'tier-a';
        else if (pk.tier === 'B') tierClass = 'tier-b';

        const poderTxt = pk.power ? (pk.power >= 1000 ? (pk.power/1000).toFixed(1) + 'K' : pk.power) : '';

        return `
          <div class="eval-card ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'card-selected' : ''}">
            
            <!-- CHECKBOX DE SELEÇÃO EM MASSA NO CARD -->
            <label style="position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:4px; z-index:3; cursor:pointer" title="Selecionar Pokémon">
              <input type="checkbox" class="eval-poke-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} style="width:17px; height:17px; accent-color:#a855f7; cursor:pointer" />
            </label>

            <div class="eval-card-head" style="padding-left:26px">
              <div class="eval-sprite-frame">
                <img src="${spriteUrl}" class="eval-sprite" onerror="this.style.display='none'" />
              </div>
              <div style="flex:1; overflow:hidden">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap">
                  <span style="font-size:14px; font-weight:900; color:${pk.shiny ? '#fde047' : '#f8fafc'}">${pk.shiny ? '✨ ' : ''}${pk.name}</span>
                  <span class="eval-tier-badge ${tierClass}">Tier ${pk.tier} (${pk.score}%)</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px; font-size:11px; flex-wrap:wrap">
                  <span style="color:#38bdf8; font-weight:800">Lv.${pk.level}</span>
                  ${poderTxt ? `<span style="color:#fde047; font-weight:800">• ⚡${poderTxt} Poder</span>` : ''}
                  <span class="eval-rarity-badge">${pk.rarity} ×${(+pk.iv).toFixed(2)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px; font-size:10px; color:#94a3b8">
                  <span style="color:${pk.isTeam ? '#4ade80' : '#c084fc'}; font-weight:800">${pk.isTeam ? '⚔️ Time Ativo' : '📦 Box'}</span>
                  <span>•</span>
                  <span style="color:#cbd5e1">${pk.contaNome}</span>
                </div>
              </div>
            </div>

            <!-- ANÁLISE DE GROWTH (IVs) & STATS -->
            <div class="eval-ivs-box">
              <div style="display:flex; justify-content:space-between; font-size:10.5px; font-weight:800">
                <span style="color:#94a3b8">🧬 Growth (IVs):</span>
                <span style="color:#4ade80">${pk.growthTotal != null ? `${pk.growthTotal}/${pk.growthTotalMax} (${pk.growthPct}%)` : `${pk.score}% Estimado`}</span>
              </div>
              <div style="height:6px; background:rgba(15,23,42,0.8); border-radius:4px; overflow:hidden">
                <div style="height:100%; width:${pk.growthPct != null ? pk.growthPct : pk.score}%; background:linear-gradient(90deg, #38bdf8, #818cf8, #a855f7); border-radius:4px"></div>
              </div>
              ${pk.growthDesc ? `<div style="font-size:9px; color:#cbd5e1; font-family:monospace; margin-top:2px">${pk.growthDesc}</div>` : ''}
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#cbd5e1; margin-top:2px">
                <span>Função: <b>${pk.meta.role}</b></span>
                ${pk.totalCopias > 1 ? `<span style="color:${pk.isMelhorCopia ? '#fde047' : '#f87171'}; font-weight:900">${pk.isMelhorCopia ? '👑 Melhor de ' + pk.totalCopias : '🔄 Cópia ' + pk.totalCopias + 'x'}</span>` : ''}
              </div>
            </div>

            <!-- BUILD RECOMENDADA (HELD ITEM + TOP 4 MOVES) -->
            <div class="eval-meta-build-box">
              <div style="display:flex; justify-content:space-between; align-items:center">
                <span style="font-size:11px; font-weight:900; color:#e2e8f0">Build Recomendada:</span>
                <span class="eval-held-tag">${pk.meta.held}</span>
              </div>
              <div class="eval-moves-grid">
                ${pk.meta.moves.map(m => `
                  <div class="eval-move-pill ${m.stab ? 'stab' : ''}" title="${m.name} (${m.type}) - DPS: ${m.dps}">
                    <span>${m.stab ? '⚡' : '💿'}</span>
                    <span style="overflow:hidden; text-overflow:ellipsis">${m.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- BOTÕES DE AÇÃO COMPLETOS (TRAVAR, TIME/BOX, VENDER, AURA, TRADE) -->
            <div class="eval-card-actions">
              <button class="eval-btn-action eval-btn-lock ${pk.locked ? 'locked' : ''}" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar Venda' : 'Travar Venda (Protege de descarte)'}">
                <span>${pk.locked ? '🔒' : '🔓'}</span>
              </button>
              <button class="eval-btn-action eval-btn-swap" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar Pokémon no Box' : 'Equipar Pokémon no Time Ativo'}">
                <span>${pk.isTeam ? '📦 Box' : '⚔️ Time'}</span>
              </button>
              <button class="eval-btn-action eval-btn-sell" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled title="Destrave o Pokémon para poder vender"' : ''} title="${pk.locked ? 'Destrave para poder vender' : (pk.isTeam ? `Remover do time e vender por $${pk.sell.toLocaleString('pt-BR')}` : `Vender por $${pk.sell.toLocaleString('pt-BR')}`)}">
                <span>💰 $${pk.sell.toLocaleString('pt-BR')}</span>
              </button>
              <button class="eval-btn-action eval-btn-aura" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Escolher / Trocar Aura">
                <span>✨</span>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    // === AÇÕES DE GERENCIAMENTO DE POKÉMON (TRAVAR, TIME/BOX, VENDER, TROCAR AURA) ===
