    function toggleHamburgerMenu(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('dropdown-hamburger-menu');
      if (!menu) return;
      const isOpen = menu.style.display === 'flex';
      menu.style.display = isOpen ? 'none' : 'flex';
      // As linhas vem de MENU_ITEMS (shell/04). Redesenhar na abertura mantem
      // pin, rotulo de audio e estado do grid sempre coerentes com o app.
      if (!isOpen && typeof renderizarMenusDeFerramentas === 'function') renderizarMenusDeFerramentas();
    }

    function fecharHamburgerMenu() {
      const menu = document.getElementById('dropdown-hamburger-menu');
      if (menu) menu.style.display = 'none';
    }

    // === MENU DROPDOWN IDLE SUITE DA SIDEBAR ===
