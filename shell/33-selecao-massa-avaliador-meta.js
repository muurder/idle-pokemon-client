    const pokesSelecionadosMeta = new Set();

    function aoTogglePokeSelecionado(key, checked) {
      if (checked) pokesSelecionadosMeta.add(key);
      else pokesSelecionadosMeta.delete(key);
      atualizarSumarioSelecaoMeta();
    }

    function obterPokesVisiveisFiltrados() {
      const fConta = document.getElementById('eval-filter-conta')?.value || 'all';
      const fOrigem = document.getElementById('eval-filter-origem')?.value || 'all';
      const fTier = document.getElementById('eval-filter-tier')?.value || 'all';
      const fOrdem = document.getElementById('eval-filter-ordem')?.value || 'score_desc';
      const busca = (document.getElementById('eval-search-input')?.value || '').toLowerCase().trim();

      let lista = [...avaliadorPokesCache];

      if (fConta !== 'all') {
        const cIdx = parseInt(fConta);
        lista = lista.filter(p => p.contaIdx === cIdx);
      }

      if (fOrigem === 'team') lista = lista.filter(p => p.isTeam);
      else if (fOrigem === 'box') lista = lista.filter(p => !p.isTeam);

      if (fTier === 'best_copies') lista = lista.filter(p => p.isMelhorCopia || p.totalCopias === 1);
      else if (fTier === 'inferior_copies') lista = lista.filter(p => p.isDuplicataInferior);
      // 'S+' não existe na escala do jogo (S/A/B/C). O valor antigo continua
      // aceito porque pode estar salvo no <select>; cai em S.
      else if (fTier === 's_plus' || fTier === 's') lista = lista.filter(p => p.tier === 'S');
      else if (fTier === 'a') lista = lista.filter(p => p.tier === 'A');
      else if (fTier === 'b') lista = lista.filter(p => p.tier === 'B');
      else if (fTier === 'c') lista = lista.filter(p => p.tier === 'C');
      else if (fTier === 'descarte') lista = lista.filter(p => p.score < 60 || p.isDuplicataInferior);
      else if (fTier === 'duplicates') lista = lista.filter(p => p.totalCopias > 1);
      else if (fTier === 'shiny') lista = lista.filter(p => p.shiny);
      else if (fTier === 'legendary') lista = lista.filter(p => p.legendary);

      if (busca) {
        lista = lista.filter(p => p.name.toLowerCase().includes(busca) || (p.meta && p.meta.role.toLowerCase().includes(busca)));
      }

      if (fOrdem === 'score_desc') lista.sort((a, b) => b.score - a.score || b.power - a.power);
      else if (fOrdem === 'score_asc') lista.sort((a, b) => a.score - b.score || a.power - b.power);
      // 'iv_desc' ordenava por growthTotal — o rótulo dizia IV mas o campo era
      // outro. Agora existem as duas ordens, separadas, mais poder/dps.
      else if (fOrdem === 'iv_desc') lista.sort((a, b) => (b.iv || 0) - (a.iv || 0) || b.score - a.score);
      else if (fOrdem === 'growth_desc') lista.sort((a, b) => (b.growthPct || 0) - (a.growthPct || 0) || b.score - a.score);
      else if (fOrdem === 'dps_desc') lista.sort((a, b) => (b.dps || 0) - (a.dps || 0) || (b.power || 0) - (a.power || 0));
      else if (fOrdem === 'power_desc') lista.sort((a, b) => (b.power || 0) - (a.power || 0) || (b.dps || 0) - (a.dps || 0));
      else if (fOrdem === 'level_desc') lista.sort((a, b) => b.level - a.level || b.score - a.score);
      else if (fOrdem === 'level_asc') lista.sort((a, b) => a.level - b.level || a.score - b.score);
      else if (fOrdem === 'sell_desc') lista.sort((a, b) => (b.sell || 0) - (a.sell || 0) || b.score - a.score);
      else if (fOrdem === 'name_asc') lista.sort((a, b) => a.name.localeCompare(b.name));

      return lista;
    }

    function atualizarSumarioSelecaoMeta() {
      const summaryEl = document.getElementById('eval-selected-summary');
      const allChk = document.getElementById('eval-select-all-chk');
      const visiveis = obterPokesVisiveisFiltrados();
      
      let totalGold = 0;
      let count = 0;
      avaliadorPokesCache.forEach(p => {
        const key = `${p.contaIdx}_${p.id}`;
        if (pokesSelecionadosMeta.has(key)) {
          count++;
          totalGold += (p.sell || 0);
        }
      });

      const resumoTxt = count > 0 ? `${count} selecionados · 💰 $${totalGold.toLocaleString('pt-BR')}` : '0 selecionados';
      if (summaryEl) summaryEl.textContent = resumoTxt;
      const summaryEl2 = document.getElementById('v2-eval-selected-summary');
      if (summaryEl2) summaryEl2.textContent = resumoTxt;

      if (allChk && visiveis.length > 0) {
        const todosVisiveisSelected = visiveis.every(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
        allChk.checked = todosVisiveisSelected;
        const allChk2 = document.getElementById('v2-eval-select-all-chk');
        if (allChk2) allChk2.checked = todosVisiveisSelected;
      }

      // Sincronizar painel lateral se aberto (v1 e v2)
      const sidePanel = document.getElementById('eval-side-panel');
      if (sidePanel && sidePanel.classList.contains('open')) {
        renderizarEvalSidePanel();
      }
      const sidePanel2 = document.getElementById('v2-eval-side-panel');
      if (sidePanel2 && sidePanel2.classList.contains('open') && typeof renderizarEvalSidePanel === 'function') {
        renderizarEvalSidePanel();
      }
    }

    function aoAlternarSelecionarTodos(checked) {
      const visiveis = obterPokesVisiveisFiltrados();
      visiveis.forEach(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        if (checked) pokesSelecionadosMeta.add(key);
        else pokesSelecionadosMeta.delete(key);
      });
      renderizarAvaliadorMeta();
    }

    function selecionarPorCriterio(criterio) {
      const visiveis = obterPokesVisiveisFiltrados();
      visiveis.forEach(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        if (criterio === 'inferior_copies' && pk.isDuplicataInferior) {
          pokesSelecionadosMeta.add(key);
        } else if (criterio === 'tier_c' && (pk.score < 60 || pk.tier === 'C')) {
          pokesSelecionadosMeta.add(key);
        }
      });
      renderizarAvaliadorMeta();
    }

    function selecionarPorThreshold() {
      const threshold = parseInt(document.getElementById('eval-threshold-select')?.value) || 50;
      const visiveis = obterPokesVisiveisFiltrados();
      let count = 0;
      visiveis.forEach(pk => {
        if (pk.score <= threshold) {
          const key = `${pk.contaIdx}_${pk.id}`;
          pokesSelecionadosMeta.add(key);
          count++;
        }
      });
      renderizarAvaliadorMeta();
      mostrarToast(`🎯 ${count} Pokémon com Score ≤ ${threshold}% selecionados`, '🎯', 'toast-success', 2500);
      abrirEvalSidePanel();
    }

    // === PAINEL LATERAL DE SELEÇÃO ===
