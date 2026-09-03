    function toggleBlockCollapse(blockId, event) {
      if (event) event.stopPropagation();
      const collapsedMap = obterBlocosColapsados();

      collapsedMap[blockId] = !collapsedMap[blockId];
      salvarBlocosColapsados(collapsedMap);
      aplicarEstadoColapsoBlocos();
    }

    function obterBlocosColapsados() {
      try { return JSON.parse(localStorage.getItem('idlePokemonSidebarBlocksCollapsed') || '{}'); } catch(e) { return {}; }
    }

    // ⚠️ ARMADILHA DE MIGRAÇÃO — 02/09/2026.
    // Os botões de recolher o BLOCO de contas e o de Auto Toggles foram
    // removidos (ficavam colados no ▼ e recolher a lista de contas a fazia
    // sumir e voltar). Quem tivesse deixado um deles recolhido abriria o app
    // com a lista de contas escondida e SEM botão pra trazê-la de volta.
    // Esta migração roda uma vez e desfaz o estado guardado.
    (function migrarBlocosSemBotaoDeRecolher() {
      try {
        const cru = localStorage.getItem('idlePokemonSidebarBlocksCollapsed');
        if (!cru) return;
        const mapa = JSON.parse(cru) || {};
        if (!mapa['accounts'] && !mapa['auto-toggles'] && !mapa['widget-auto-toggles']) return;
        delete mapa['accounts'];
        delete mapa['auto-toggles'];
        delete mapa['widget-auto-toggles'];
        localStorage.setItem('idlePokemonSidebarBlocksCollapsed', JSON.stringify(mapa));
      } catch (e) { }
    })();

    function salvarBlocosColapsados(map) {
      try { localStorage.setItem('idlePokemonSidebarBlocksCollapsed', JSON.stringify(map)); } catch(e) {}
    }

    function aplicarEstadoColapsoBlocos() {
      const collapsedMap = obterBlocosColapsados();

      // 1. Contas
      const accountsList = document.getElementById('tabs-container');
      const btnAccounts = document.getElementById('btn-toggle-block-accounts');
      const isAccCollapsed = !!collapsedMap['accounts'];
      if (accountsList) accountsList.style.display = isAccCollapsed ? 'none' : '';
      if (btnAccounts) btnAccounts.classList.toggle('collapsed-arrow', isAccCollapsed);

      // 2. Atalhos fixados
      const pinnedList = document.getElementById('sidebar-pinned-items');
      const btnPinned = document.getElementById('btn-toggle-block-pinned');
      const isPinCollapsed = !!collapsedMap['pinned'];
      if (pinnedList) pinnedList.style.display = isPinCollapsed ? 'none' : '';
      if (btnPinned) btnPinned.classList.toggle('collapsed-arrow', isPinCollapsed);

      // 3. XP Tracker
      const xpContent = document.getElementById('xp-mini-view-content');
      const btnXp = document.getElementById('xpmini-toggle-collapse');
      const isXpCollapsed = !!collapsedMap['xp-tracker'];
      if (xpContent) {
        if (isXpCollapsed) {
          xpContent.classList.add('xpmini-card-collapsed');
        } else {
          xpContent.classList.remove('xpmini-card-collapsed');
        }
      }
      if (btnXp) btnXp.classList.toggle('collapsed-arrow', isXpCollapsed);
    }

    // === SISTEMA DE FIXAR ITENS DA DASHBOARD ===
