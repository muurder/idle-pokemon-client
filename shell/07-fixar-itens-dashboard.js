    const DASH_ITEMS = {
      'atualizar-tudo': { icon: '🔄', label: 'Atualizar Tudo', color: '#7dd3fc', action: 'atualizarDashboardCompleta()' },
      'iniciar-hunts':  { icon: '⚔️', label: 'Iniciar Hunts', color: '#86efac', action: 'iniciarTodasHunts()' },
      'pausar-hunts':   { icon: '⏸', label: 'Pausar Hunts', color: '#fef08a', action: 'pausarTodasHunts()' },
      'curar-contas':   { icon: '💊', label: 'Curar Contas', color: '#f9a8d4', action: 'curarTodasContas()' },
      'avaliador-meta': { icon: '🧬', label: 'Avaliador Meta', color: '#e2e8f0', action: 'abrirModalAvaliadorMeta()' }
    };

    function obterItensFixadosDash() {
      try { return JSON.parse(localStorage.getItem('idlePokemonPinnedDash') || '[]'); } catch(e) { return []; }
    }

    function salvarItensFixadosDash(lista) {
      try { localStorage.setItem('idlePokemonPinnedDash', JSON.stringify(lista)); } catch(e) {}
    }

    function toggleFixarDash(dashId) {
      const fixados = obterItensFixadosDash();
      const idx = fixados.indexOf(dashId);
      if (idx >= 0) {
        fixados.splice(idx, 1);
      } else {
        fixados.push(dashId);
      }
      salvarItensFixadosDash(fixados);
      // Atualiza visual dos pin buttons na dashboard
      document.querySelectorAll('[data-dash-id]').forEach(row => {
        const id = row.getAttribute('data-dash-id');
        const btn = row.querySelector('.menu-pin-btn');
        if (btn) {
          const isPinned = fixados.includes(id);
          btn.classList.toggle('pinned', isPinned);
          btn.textContent = isPinned ? '✅' : '📌';
        }
      });
      // Re-renderiza fixados na sidebar (combinando menu + dash)
      renderizarFixadosSidebar();
      renderizarWidgetAutoTogglesSidebar();
    }

    // === SISTEMA DE COLAPSO DA SIDEBAR ===
