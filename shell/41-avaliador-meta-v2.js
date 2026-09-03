    // =====================================================================
    // 41-avaliador-meta-v2.js — AVALIADOR DE METAS v2 (Beta)
    // =====================================================================
    // Não recalcula scores/tiers nem refaz a lógica de meta — usa a MESMA
    // avaliadorPokesCache / pokesSelecionadosMeta / obterPokesVisiveisFiltrados()
    // de shell/32-35. As funções de renderização de lá (renderizarAvaliadorMeta,
    // atualizarSumarioSelecaoMeta, renderizarEvalSidePanel,
    // atualizarSelectContasAvaliador, alterarModoVisualizacaoAvaliador) foram
    // estendidas pra também escrever nos containers v2 quando esta janela
    // está aberta. As ações em massa (lock/sell/trade) e os botões do
    // toolbar chamam as MESMAS funções globais do v1, direto.
    // =====================================================================
    let avaliadorMetaV2Aberto = false;

    function abrirModalAvaliadorMetaV2() {
      const modal = document.getElementById('modal-avaliador-meta-v2');
      if (!modal) return;
      modal.classList.add('active');
      avaliadorMetaV2Aberto = true;
      atualizarSelectContasAvaliador();
      renderizarAvaliadorMeta();
      if (typeof avaliadorPokesCache === 'undefined' || !avaliadorPokesCache || !avaliadorPokesCache.length) {
        if (typeof atualizarAvaliadorMeta === 'function') atualizarAvaliadorMeta(true);
      }
    }

    function fecharModalAvaliadorMetaV2() {
      const modal = document.getElementById('modal-avaliador-meta-v2');
      if (modal) modal.classList.remove('active');
      avaliadorMetaV2Aberto = false;
    }

    // Filtros/busca/threshold do v2 escrevem no elemento REAL do v1 (que
    // continua no DOM mesmo com o modal v1 fechado) e chamam a mesma função
    // de render — evita duplicar a lógica de obterPokesVisiveisFiltrados().
    function v2AvaliadorSincronizarFiltro(idV1, idV2) {
      const a = document.getElementById(idV1), b = document.getElementById(idV2);
      if (!a || !b) return;
      a.value = b.value;
      renderizarAvaliadorMeta();
    }

    function toggleEvalSidePanelV2() {
      const panel = document.getElementById('v2-eval-side-panel');
      if (!panel) return;
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && typeof renderizarEvalSidePanel === 'function') renderizarEvalSidePanel();
    }
