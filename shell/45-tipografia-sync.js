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
