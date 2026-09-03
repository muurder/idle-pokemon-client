    // === NAVEGADOR DE POPUP INTERNO NO CLIENT ===
    // =====================================================
    let currentPopupUrl = '';

    function abrirPopupInterno(url) {
      if (!url || url === 'about:blank') return;
      
      // Se for URL de login do Google ou OAuth, roteia para o popup nativo da partição ativa
      if (/google\.com|accounts\.google|oauth|auth\/google|login/i.test(url)) {
        ipcRenderer.send('open-auth-popup', { url, accountIndex: currentTab });
        return;
      }

      currentPopupUrl = url;

      const modal = document.getElementById('modal-internal-popup');
      const titleEl = document.getElementById('internal-popup-title');
      const wv = document.getElementById('internal-popup-webview');

      if (titleEl) {
        try {
          const u = new URL(url);
          titleEl.textContent = `🌐 ${u.hostname} — ${url}`;
        } catch(e) {
          titleEl.textContent = `🌐 ${url}`;
        }
      }

      if (modal) modal.classList.add('active');
      if (wv) {
        wv.src = url;
        wv.addEventListener('page-title-updated', (e) => {
          if (titleEl && e.title) titleEl.textContent = `🌐 ${e.title}`;
        });
      }
    }

    function fecharPopupInterno() {
      const modal = document.getElementById('modal-internal-popup');
      const wv = document.getElementById('internal-popup-webview');
      if (modal) modal.classList.remove('active');
      if (wv) wv.src = 'about:blank';
    }

    function recarregarPopupInterno() {
      const wv = document.getElementById('internal-popup-webview');
      if (wv && currentPopupUrl) wv.reload();
    }

    function abrirPopupNoNavegadorExterno() {
      if (currentPopupUrl) {
        ipcRenderer.send('open-external-url', currentPopupUrl);
        mostrarToast('Link aberto no seu navegador padrão!', '↗️', 'normal', 3000);
      }
    }

    // =====================================================
