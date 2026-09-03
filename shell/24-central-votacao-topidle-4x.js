    // === CENTRAL DE VOTAÇÃO TOPIDLE 4X (COM PLAYER IDENTIFIER) ===
    // =====================================================
    function fecharDashboardCentral() {
      // Volta pra aba de jogo de onde a Dashboard foi aberta (selectTab guarda
      // isso em abaAntesDaDashboard); cai na Conta 1 so se nao houver historico.
      const alvo = (typeof abaAntesDaDashboard === 'number' && abaAntesDaDashboard >= 0 && abaAntesDaDashboard < totalContas)
        ? abaAntesDaDashboard : 0;
      selectTab(alvo);
    }

    // Esc fecha a Dashboard Central quando ela e a tela ativa. Antes o unico
    // jeito de sair era achar o botao no meio da toolbar que quebra em varias
    // linhas — em telas cheias de conta ele saia do campo de visao.
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      if (typeof currentTab === 'undefined' || currentTab !== totalContas) return;
      // Nao rouba o Esc de nenhum modal aberto por cima da Dashboard.
      if (document.querySelector('.modal-backdrop.active')) return;
      const miniAberto = document.getElementById('mini-dashboard');
      if (miniAberto && miniAberto.style.display !== 'none') return;
      fecharDashboardCentral();
    });

