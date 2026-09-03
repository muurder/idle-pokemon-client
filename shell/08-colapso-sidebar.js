    function toggleSidebarColapso() {
      const sidebar = document.getElementById('app-sidebar');
      if (!sidebar) return;
      const isCollapsed = sidebar.classList.toggle('collapsed');
      try { localStorage.setItem('idlePokemonSidebarCollapsed', isCollapsed ? '1' : '0'); } catch(e) {}
    }

    // Restaura estado da sidebar ao carregar
    (function restaurarSidebarColapso() {
      try {
        if (localStorage.getItem('idlePokemonSidebarCollapsed') === '1') {
          const sidebar = document.getElementById('app-sidebar');
          if (sidebar) sidebar.classList.add('collapsed');
        }
      } catch(e) {}
    })();

    // === WIDGET AUTO TOGGLES NA SIDEBAR (abaixo do XP Tracker) ===
