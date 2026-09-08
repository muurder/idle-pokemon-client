    // ===================================================================
    // 45-tipografia-sync.js — TIPOGRAFIA: casca do Electron ↔ webviews
    // ===================================================================
    // O seletor de fonte mora na aba Config do painel v2, que roda DENTRO da
    // webview do jogo (scripts/06b-tipografia.js). A casca é outro documento,
    // com outro localStorage, então ela não "vê" essa escolha sozinha.
    //
    // Este módulo faz a ponte, sem inventar um segundo lugar de verdade:
    //   • a tabela de presets vive SÓ no userscript (06b). A casca pergunta os
    //     valores prontos com window.__getTipografiaCSS() e aplica;
    //   • a leitura é da webview ATIVA — foi nela que o usuário mexeu;
    //   • quando o preset muda, a casca reaplica em si mesma e empurra o mesmo
    //     preset para as outras contas (cada conta tem partição isolada, logo
    //     localStorage separado — sem esse empurrão, cada aba ficaria com uma
    //     fonte diferente);
    //   • em `dom-ready` de cada webview o preset vigente é reenviado, porque um
    //     reload volta ao valor da própria partição.
    //
    // Por que polling e não IPC: é o mesmo padrão de espelho já usado no
    // mini-dashboard e nos toggles (13-, 09-) — uma chamada leve a cada 3s na
    // aba ativa. Não vale abrir um canal novo no preload só para isto.
    // ===================================================================

    (function () {
      'use strict';

      var CHAVE = 'idleSuiteTipografiaCSS';   // objeto completo, não só o id
      var vigente = null;                     // { id, ui, num, variant }

      function aplicarNaCasca(css) {
        if (!css || !css.ui) return;
        var raiz = document.documentElement;
        raiz.style.setProperty('--app-font-ui', css.ui);
        raiz.style.setProperty('--app-font-num', css.num);
        raiz.style.setProperty('--app-font-num-variant', css.variant || 'normal');
        raiz.setAttribute('data-app-font', css.id || '');
        vigente = css;
        try { localStorage.setItem(CHAVE, JSON.stringify(css)); } catch (e) { }
      }

      // Boot: usa o último preset conhecido para a casca não piscar com a fonte
      // padrão até a primeira leitura da webview responder.
      try {
        var salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
        if (salvo && salvo.ui) aplicarNaCasca(salvo);
      } catch (e) { }

      function listaWebviews() {
        try {
          if (typeof webviews !== 'undefined' && Array.isArray(webviews)) return webviews.filter(Boolean);
        } catch (e) { }
        return Array.prototype.slice.call(document.querySelectorAll('webview'));
      }

      function webviewAtiva() {
        try {
          if (typeof webviews !== 'undefined' && Array.isArray(webviews) && webviews[currentTab]) return webviews[currentTab];
        } catch (e) { }
        return document.querySelector('webview');
      }

      function empurrarPara(wv, id) {
        if (!wv || typeof wv.executeJavaScript !== 'function' || !id) return;
        try {
          wv.executeJavaScript(
            'if (typeof window.__setTipografia === "function") window.__setTipografia(' + JSON.stringify(id) + ');'
          ).catch(function () { });
        } catch (e) { }
      }

      function propagar(id, exceto) {
        listaWebviews().forEach(function (wv) {
          if (wv !== exceto) empurrarPara(wv, id);
        });
      }

      // Reaplica o preset vigente numa webview que acabou de (re)carregar.
      function registrarDomReady() {
        listaWebviews().forEach(function (wv) {
          if (wv.__tipografiaSyncOn) return;
          wv.__tipografiaSyncOn = true;
          wv.addEventListener('dom-ready', function () {
            if (vigente && vigente.id) setTimeout(function () { empurrarPara(wv, vigente.id); }, 1500);
          });
        });
      }

      async function ciclo() {
        registrarDomReady();
        var wv = webviewAtiva();
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        try {
          var res = await wv.executeJavaScript(
            'typeof window.__getTipografiaCSS === "function" ? JSON.stringify(window.__getTipografiaCSS()) : null'
          );
          if (!res) return;                       // userscript ainda não carregou
          var css = JSON.parse(res);
          if (vigente && vigente.id === css.id) return;   // nada mudou
          aplicarNaCasca(css);
          propagar(css.id, wv);
          console.log('[Tipografia] preset ativo:', css.id, '—', css.nome);
        } catch (e) { }
      }

      setInterval(ciclo, 3000);
      setTimeout(ciclo, 2500);
    })();

// ===== client-assets/98-atalhos-alt-conta.js =====

// =====================================================================
// 98-atalhos-alt-conta.js -- ALT+1..9 TROCA DE CONTA
// =====================================================================
// SO NO CLIENTE, de proposito. O dev ja tem Ctrl+G, Ctrl+D, Ctrl+M, Ctrl+T
// e Esc registrados; nao vale plantar um atalho global novo la sem pedido.
// Pra promover isto pro dev depois, e mover o arquivo pra shell/48-... e
// tirar daqui -- build_shell.py pega sozinho.
//
// Alt e nao Ctrl porque Ctrl+1..9 e atalho de aba do proprio Chromium
// dentro da webview: o jogo receberia o evento antes de nos.
//
// Vai ate 9 e nao ate 3: o cliente tem contas dinamicas (botao "Nova
// Conta"), entao amarrar em 3 seria amarrar no numero errado. Tecla acima
// do numero de contas nao faz nada.
// =====================================================================
(function () {
  'use strict';

  // Digitando em campo de texto, Alt+numero pode ser acento morto ou
  // caractere de layout -- nao roubamos a tecla de quem esta escrevendo.
  function digitando(alvo) {
    if (!alvo) return false;
    const tag = (alvo.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
  }

  document.addEventListener('keydown', function (ev) {
    if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    if (digitando(ev.target)) return;

    // ev.code em vez de ev.key: com Alt pressionado o layout ABNT2 entrega
    // ev.key como caractere morto, mas o code segue Digit1..Digit9.
    const m = /^Digit([1-9])$/.exec(ev.code || '');
    if (!m) return;

    const idx = parseInt(m[1], 10) - 1;
    if (typeof totalContas !== 'number' || idx >= totalContas) return;
    if (typeof selectTab !== 'function') return;

    ev.preventDefault();
    selectTab(idx);

    if (typeof mostrarToast === 'function') {
      const nome = (typeof nomesAbas !== 'undefined' && nomesAbas[idx]) || ('Conta ' + (idx + 1));
      mostrarToast(nome, '⚡', 'normal', 1200);
    }
  });
})();

// ===== client-assets/99-stubs.js =====

// =====================================================================
// 99-stubs.js -- TOCOS PARA AS CHAMADAS QUE A PODA DEIXOU PENDURADAS
// =====================================================================
// ESTE ARQUIVO SO EXISTE NO CLIENTE. Ele e colado no fim de
// shell.gerado.js por build_client.py.
//
// Por que precisa existir: o shell do dev e UM ESCOPO PLANO -- os modulos
// se chamam livremente, sem import. Quando a allowlist do cliente corta um
// modulo, o codigo que FICOU continua chamando funcoes que sumiram. Sem
// toco, cada uma dessas chamadas e um ReferenceError que derruba a funcao
// inteira que a continha (nao so a linha).
//
// Como manter: NAO escreva toco de cabeca. Rode
//     python scripts_orfaos.py
// depois de cada build; ele lista exatamente o que ficou pendurado. Toco a
// mais e peso morto; toco a menos e tela quebrada na mao do cliente.
//
// Regra pros tocos: cada um imita o CONTRATO do original -- o que o
// chamador faz com o retorno. `rotacionarProxyConta` devolve null porque o
// chamador guarda o retorno e testa. Os de render nao devolvem nada porque
// ninguem olha.
// =====================================================================
(function () {

  // --- UI da Central de Trade -----------------------------------------
  // Chamados de dentro de carregarInventariosTradeHub(), que o cliente USA
  // (e o coletor de inventario do Avaliador Meta). O coletor termina
  // redesenhando a tela do trade hub, que aqui nao existe.
  function tradeLog() {}
  function tradeSetProgress() {}
  function atualizarStatsContas() {}
  function renderizarGradeInventario() {}
  function renderizarGradePokes() {}
  function renderizarOfertasQueue() {}
  function fecharTradeHubModal() {}

  // --- Widget de Auto Toggles (Hunt/Catch/Sell/Buy) --------------------
  // O widget e do Idle Suite e nao vem pro cliente, mas o watchdog e o
  // sistema de itens fixaveis chamam essas tres no ciclo normal.
  function renderizarWidgetAutoTogglesSidebar() {}
  function syncSidebarAutoToggles() {}
  function toggleWidgetAutoTogglesSidebarVisibilidade() {}

  // --- Proxy -----------------------------------------------------------
  // O cliente nao gerencia proxy. O watchdog e o mini dashboard chamam isto
  // ao reconectar uma conta; devolver null e o mesmo que o original faz
  // quando o pool esta vazio, entao o chamador ja sabe lidar.
  function rotacionarProxyConta() { return null; }

  // --- Ações de Hunt na Dashboard -------------------------------------
  function iniciarTodasHunts() {}
  function pausarTodasHunts() {}
  function toggleHuntConta() {}

  // Publica no escopo global: o shell.gerado.js roda em escopo plano e as
  // chamadas pendentes procuram estes nomes ali.
  var tocos = {
    tradeLog: tradeLog,
    tradeSetProgress: tradeSetProgress,
    atualizarStatsContas: atualizarStatsContas,
    renderizarGradeInventario: renderizarGradeInventario,
    renderizarGradePokes: renderizarGradePokes,
    renderizarOfertasQueue: renderizarOfertasQueue,
    fecharTradeHubModal: fecharTradeHubModal,
    renderizarWidgetAutoTogglesSidebar: renderizarWidgetAutoTogglesSidebar,
    syncSidebarAutoToggles: syncSidebarAutoToggles,
    toggleWidgetAutoTogglesSidebarVisibilidade: toggleWidgetAutoTogglesSidebarVisibilidade,
    rotacionarProxyConta: rotacionarProxyConta,
    iniciarTodasHunts: iniciarTodasHunts,
    pausarTodasHunts: pausarTodasHunts,
    toggleHuntConta: toggleHuntConta
  };
  for (var nome in tocos) {
    if (typeof window[nome] === 'undefined') window[nome] = tocos[nome];
  }
})();
