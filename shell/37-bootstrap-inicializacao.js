    (async () => {
      renderizarAbasClient();
      renderizarWebviewsClient();
      renderizarNomesAbas();
      selectTab(0);
      // Desenha as linhas dos dois dropdowns a partir de MENU_ITEMS (shell/04).
      // Precisa vir ANTES de renderizarEstadoAudio(): e ele quem escreve em
      // #menu-audio-icon/#menu-audio-text, que so passam a existir aqui.
      renderizarMenusDeFerramentas();
      renderizarEstadoAudio();
      carregarScriptTamper();
      renderizarGaleriaShiniesDashboard();
      iniciarLoopMonitoramentoPing();
    })();
