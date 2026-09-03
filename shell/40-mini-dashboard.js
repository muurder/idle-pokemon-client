    // =====================================================================
    // 40-mini-dashboard.js — JANELA DO MINI DASHBOARD
    // =====================================================================
    // Antes existiam duas telas: a v1 (`#mini-dashboard`, classes `.md-*`) e
    // esta v2 em vidro (`#mini-dashboard-v2`, classes `.md2-*`), com a v2 só
    // renderizando quando a v1 também estava aberta — por isso a v2 abria
    // vazia. A v1 foi removida; esta virou A tela, e `toggleMiniDashboard()`
    // aponta pra cá. Os nomes `...V2` seguem existindo como apelido porque
    // itens fixados no menu lateral podem ter sido salvos com eles.
    //
    // A coleta de dados (loop pelas webviews, __obterDashboardStatus /
    // __getIdleAuto) continua em shell/13-mini-dashboard-contas-ativas.js.
    // =====================================================================
    let miniDashAberto = false;
    let miniDashTimer = null;
    let mdClickOutside = null;
    let miniDashViewMode = localStorage.getItem('miniDashViewMode') || 'card';

    function aplicarMiniDashViewMode() {
      const body = document.querySelector('.mini-dash-cards');
      const btn = document.getElementById('btn-md-toggle-view');
      if (body) body.classList.toggle('mode-list', miniDashViewMode === 'list');
      if (btn) {
        btn.textContent = miniDashViewMode === 'list' ? '🃏' : '📋';
        btn.title = miniDashViewMode === 'list' ? 'Mostrar como Cards' : 'Mostrar como Lista';
      }
    }

    function toggleMiniDashViewMode() {
      miniDashViewMode = miniDashViewMode === 'card' ? 'list' : 'card';
      try { localStorage.setItem('miniDashViewMode', miniDashViewMode); } catch (e) { }
      aplicarMiniDashViewMode();
    }

    function toggleMiniDashPin() {
      toggleFixarMenu('mini-dashboard');
      atualizarPinStateMiniDash();
    }

    function atualizarPinStateMiniDash() {
      const btn = document.getElementById('btn-md-pin');
      if (!btn) return;
      const pinned = obterItensFixados().includes('mini-dashboard');
      btn.classList.toggle('pinned', pinned);
      btn.textContent = pinned ? '✅' : '📌';
      btn.title = pinned ? 'Desafixar do Menu Lateral' : 'Fixar no Menu Lateral';
    }

    function abrirMiniDashboard() {
      const overlay = document.getElementById('mini-dashboard');
      const win = document.getElementById('mini-dash-window');
      if (!overlay || !win) return;
      win.style.transform = 'translate(-50%, -50%)';
      win.style.left = '50%';
      win.style.top = '50%';
      overlay.style.display = 'block';
      miniDashAberto = true;
      aplicarMiniDashViewMode();
      atualizarPinStateMiniDash();
      atualizarMiniDashboard();
      if (miniDashTimer) clearInterval(miniDashTimer);
      miniDashTimer = setInterval(() => { if (miniDashAberto) atualizarMiniDashboard(); }, 3000);
      // Clique no fundo (fora da janela) fecha.
      if (mdClickOutside) overlay.removeEventListener('click', mdClickOutside);
      mdClickOutside = null;
      setTimeout(() => {
        mdClickOutside = (e) => { if (e.target === overlay) fecharMiniDashboard(); };
        overlay.addEventListener('click', mdClickOutside);
      }, 0);
    }

    function fecharMiniDashboard() {
      const overlay = document.getElementById('mini-dashboard');
      if (mdClickOutside && overlay) { overlay.removeEventListener('click', mdClickOutside); mdClickOutside = null; }
      if (overlay) overlay.style.display = 'none';
      miniDashAberto = false;
      if (miniDashTimer) { clearInterval(miniDashTimer); miniDashTimer = null; }
    }

    function toggleMiniDashboard() {
      if (miniDashAberto) fecharMiniDashboard();
      else abrirMiniDashboard();
    }

    function iniciarArrastoMiniDash(e) {
      const win = document.getElementById('mini-dash-window');
      if (!win) return;
      const r = win.getBoundingClientRect();
      win.style.transform = 'none';
      win.style.left = r.left + 'px';
      win.style.top = r.top + 'px';
      const sx = e.clientX, sy = e.clientY, ox = r.left, oy = r.top;
      function mv(ev) {
        win.style.left = (ox + ev.clientX - sx) + 'px';
        win.style.top = (oy + ev.clientY - sy) + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    }

    // Apelidos legados: itens fixados salvos como 'mini-dashboard-v2' guardam a
    // string de acao com o nome antigo, resolvida no escopo global — por isso
    // vao em `window` e nao como `const` (const de script classico nao vira
    // propriedade de window e a chamada inline quebraria).
    window.abrirMiniDashboardV2 = abrirMiniDashboard;
    window.fecharMiniDashboardV2 = fecharMiniDashboard;
    window.toggleMiniDashboardV2 = toggleMiniDashboard;
    window.toggleMiniDashViewModeV2 = toggleMiniDashViewMode;
    window.iniciarArrastoMiniDashV2 = iniciarArrastoMiniDash;
