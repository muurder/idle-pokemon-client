
// ===== 00-header-ipc-pin-debug.js =====
    const { ipcRenderer } = require('electron');

    // === MENU HAMBÚRGUER FLUTUANTE DA TOPBAR ===

// ===== 01-menu-hamburguer-topbar.js =====
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

// ===== 04-fixar-desfixar-menu-lateral.js =====
    // =====================================================================
    // REGISTRO UNICO DAS FERRAMENTAS (fonte de verdade dos dois dropdowns)
    // =====================================================================
    // Antes cada ferramenta era declarada TRES vezes: aqui (pra o item fixado
    // na sidebar saber icone/rotulo/acao), na marcacao escrita a mao do
    // `index.html` (repetindo icone, rotulo, acao e o `toggleFixarMenu('id')`)
    // e no atalho de teclado do `main.js`. Adicionar ferramenta custava tres
    // edicoes e a divergencia era so questao de tempo — em 2026-09-02 tres de
    // vinte rotulos ja nao batiam entre este arquivo e o index.html
    // ("Scripts: Debug Logs" x "Copiar Logs de Debug", entre outros).
    //
    // Agora as linhas dos dois menus sao RENDERIZADAS daqui por
    // `renderizarMenusDeFerramentas()`. O index.html guarda so a moldura (os
    // seletores de zoom/colunas) e dois containers vazios.
    //
    // Campos:
    //   icon, label, color   — identidade (usados tambem no item fixado)
    //   action               — codigo do onclick (string, igual era antes)
    //   menu                 — 'geral' (hamburguer) ou 'gametools'
    //   grupo                — titulo da secao; muda de grupo = novo cabecalho
    //   desc                 — tooltip; o hotkey e anexado sozinho
    //   hotkey               — so texto, o atalho de verdade vive no main.js
    //   btnId/iconId/labelId — ids para quem atualiza o item ao vivo
    //                          (audio, grid e XP mexem no icone/rotulo)
    //   badgeHtml            — elemento extra entre o botao e o pin
    //   bold                 — rotulo em destaque, como era no HTML antigo
    // =====================================================================
    const MENU_ITEMS = {
      // ---------------------------------------------------- MENU (hamburguer)
      'dashboard': {
        icon: '📊', label: 'Dashboard Central', color: '#7dd3fc',
        action: 'fecharHamburgerMenu(); selectTab(totalContas)',
        menu: 'geral', grupo: 'Visualização & Telas', hotkey: 'Ctrl+D',
        desc: 'Painel Central Multi-Contas em Tempo Real'
      },
      'grid-multi': {
        icon: '🪟', label: 'Grid Multi-Contas', color: '#a5b4fc',
        action: 'fecharHamburgerMenu(); toggleGridMode()',
        menu: 'geral', grupo: 'Visualização & Telas', hotkey: 'Ctrl+G',
        desc: 'Alternar entre visualização por Abas e Grid Multi-Contas',
        btnId: 'btn-grid-toggle-menu', iconId: 'grid-icon-menu', labelId: 'grid-txt-menu'
      },
      'xp-display': {
        icon: '📈', label: 'XP Tracker ao Vivo', color: '#86efac',
        action: 'toggleXpMiniView()',
        menu: 'geral', grupo: 'Visualização & Telas',
        desc: 'Mostrar ou ocultar XP Tracker da conta ativa',
        badgeHtml: '<span id="xp-mini-badge" style="font-size:9px; font-weight:900; color:#64748b; background:rgba(100,116,139,0.15); padding:2px 6px; border-radius:10px; border:1px solid rgba(100,116,139,0.3); margin-right:4px">OFF</span>'
      },
      'mini-dashboard': {
        icon: '📊', label: 'Mini Dashboard', color: '#7dd3fc',
        action: 'fecharHamburgerMenu(); toggleMiniDashboard()',
        menu: 'geral', grupo: 'Ferramentas & Recursos', bold: true,
        desc: 'Ouro, Diamantes, Bolas, ETA de nível (treinador e Pokémon) e Auto Hunt/Catch/Sell/Buy'
      },
      'avaliador-meta-v2': {
        icon: '⚡', label: 'Avaliador Meta v2', color: '#f5a623',
        action: 'fecharHamburgerMenu(); abrirModalAvaliadorMetaV2()',
        menu: 'geral', grupo: 'Ferramentas & Recursos', bold: true,
        desc: 'Beta — mesmo dado do v1, visual em vidro'
      },
      'audio-toggle': {
        icon: '🔊', label: 'Áudio Global', color: '#cbd5e1',
        action: 'fecharHamburgerMenu(); toggleGlobalAudio()',
        menu: 'geral', grupo: 'Controle & Sistema',
        desc: 'Ativar ou desativar áudio em todas as contas',
        iconId: 'menu-audio-icon', labelId: 'menu-audio-text'
      },
      'recarregar-ativa': {
        icon: '🔄', label: 'Recarregar Conta Ativa', color: '#cbd5e1',
        action: 'fecharHamburgerMenu(); reloadActiveWebview()',
        menu: 'geral', grupo: 'Controle & Sistema', hotkey: 'F5',
        desc: 'Recarregar apenas a conta selecionada'
      },
      'recarregar-todas': {
        icon: '⚡', label: 'Recarregar Todas as Contas', color: '#7dd3fc',
        action: 'fecharHamburgerMenu(); recarregarEAplicarTudo()',
        menu: 'geral', grupo: 'Controle & Sistema', hotkey: 'Ctrl+Shift+R',
        desc: 'Reaplicar scripts e recarregar todas as contas simultaneamente'
      },
      'reiniciar-app': {
        icon: '🔁', label: 'Reiniciar Aplicativo', color: '#fca5a5',
        action: 'fecharHamburgerMenu(); reiniciarAplicativo()',
        menu: 'geral', grupo: 'Controle & Sistema', hotkey: 'Ctrl+Alt+R',
        desc: 'Fechar e reabrir o aplicativo completamente'
      },
    };

    // Categorias hierárquicas do Game Tools (desenham o leque com flyout à direita)
    const GAMETOOLS_CATEGORIAS = [
      { id: 'abas', icon: '📑', label: 'Abas da Suite', sub: 'Home, Rotas, Ginásios, Custo e Configs' },
      { id: 'auto', icon: '⚙️', label: 'Automação & Farm', sub: 'Correio Automático e Toggles da Sidebar' },
      { id: 'estrategia', icon: '⚔️', label: 'Estratégia & Trade', sub: 'Alto Comando, Forja, Trade e Proxies' },
      { id: 'audio', icon: '🔔', label: 'Áudio & Notificações', sub: 'Painel Central e Mute de Shinies' },
      { id: 'sistema', icon: '⚡', label: 'Desempenho & Sistema', sub: 'Monitor de Recursos, FPS, Ping e Logs' },
    ];

    function escAtributo(v) {
      return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function criarLinhaItemMenu(id, it) {
      const titulo = escAtributo((it.desc || it.label) + (it.hotkey ? ` (${it.hotkey})` : ''));
      const estilo = it.bold ? ` style="color:${it.color}; font-weight:800"` : '';
      return `<div class="menu-item-row" data-menu-id="${id}">
        <button class="menu-item-btn menu-item-btn-main"${it.btnId ? ` id="${it.btnId}"` : ''} onclick="${escAtributo(it.action)}" title="${titulo}">
          <span${it.iconId ? ` id="${it.iconId}"` : ''}>${it.icon}</span> <span${it.labelId ? ` id="${it.labelId}"` : ''}${estilo}>${it.label}</span>
          ${it.hotkey ? `<span class="menu-item-hotkey">${it.hotkey}</span>` : ''}
        </button>
        ${it.badgeHtml || ''}
        <button class="menu-pin-btn" onclick="event.stopPropagation(); toggleFixarMenu('${id}')" title="Fixar no menu lateral">📌</button>
      </div>`;
    }

    // Desenha as linhas dos dois dropdowns a partir do MENU_ITEMS. Chamada no
    // bootstrap e toda vez que um menu abre — assim uma entrada nova aparece
    // sem ninguem precisar mexer no index.html.
    function renderizarMenusDeFerramentas() {
      // 1. MENU GERAL (hambúrguer)
      const boxGeral = document.getElementById('menu-itens-geral');
      if (boxGeral) {
        let html = '';
        let grupoAtual = null;
        for (const [id, it] of Object.entries(MENU_ITEMS)) {
          if ((it.menu || 'geral') !== 'geral') continue;
          if (it.grupo && it.grupo !== grupoAtual) {
            grupoAtual = it.grupo;
            html += `<div class="sidebar-menu-cat-title">${it.grupo}</div>`;
          }
          html += criarLinhaItemMenu(id, it);
        }
        boxGeral.innerHTML = html;
      }

      // 2. GAME TOOLS (hierárquico com flyout à direita e busca rápida)
      const boxGameTools = document.getElementById('menu-itens-gametools');
      if (boxGameTools) {
        const inpExistente = document.getElementById('gametools-search-input');
        const termoSalvo = inpExistente ? inpExistente.value : '';

        let html = '';
        // Campo de busca rápida
        html += `<div class="gametools-search-wrap">
          <div class="gametools-search-box">
            <input type="text" id="gametools-search-input" class="gametools-search-input" placeholder="🔍 Buscar ferramenta..." oninput="window.filtrarGameTools(this.value)" autocomplete="off" value="${escAtributo(termoSalvo)}">
            <button type="button" id="gametools-search-clear" class="gametools-search-clear" onclick="window.limparBuscaGameTools()" title="Limpar busca"${termoSalvo ? ' style="display:block"' : ''}>✕</button>
          </div>
        </div>`;

        // Categorias principais
        html += `<div id="gametools-cats-list" class="gametools-cats-list"${termoSalvo ? ' style="display:none"' : ''}>`;
        for (const cat of GAMETOOLS_CATEGORIAS) {
          const itensCat = Object.entries(MENU_ITEMS).filter(([_, it]) => it.menu === 'gametools' && (it.categoria === cat.id));
          let itensHtml = '';
          for (const [id, it] of itensCat) {
            itensHtml += criarLinhaItemMenu(id, it);
          }
          html += `<div class="gametools-cat-row" data-cat-id="${cat.id}">
            <button type="button" class="gametools-cat-btn" onclick="window.abrirFlyoutGameTools('${cat.id}', event)" title="${cat.label} — ${cat.sub}">
              <div class="gametools-cat-main">
                <span class="gametools-cat-icon">${cat.icon}</span>
                <div class="gametools-cat-info">
                  <span class="gametools-cat-title">${cat.label}</span>
                  <span class="gametools-cat-sub">${cat.sub}</span>
                </div>
              </div>
              <span class="gametools-cat-arrow">›</span>
            </button>
            <div class="gametools-flyout" id="gametools-flyout-${cat.id}">
              <div class="gametools-flyout-head">
                <span>${cat.icon} ${cat.label}</span>
                <span style="font-size:9px; color:#94a3b8; font-weight:700">${itensCat.length} itens</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px">
                ${itensHtml}
              </div>
            </div>
          </div>`;
        }
        html += `</div>`;

        // Resultados da busca
        html += `<div id="gametools-search-results" class="gametools-search-results"${termoSalvo ? ' style="display:flex"' : ''}></div>`;

        boxGameTools.innerHTML = html;

        if (termoSalvo) {
          window.filtrarGameTools(termoSalvo);
        }
      }

      atualizarEstadoPinButtons();
      // Atualizações dinâmicas de estado
      try { if (typeof renderizarEstadoAudio === 'function') renderizarEstadoAudio(); } catch (e) { }
      try { if (typeof atualizarBadgeXpTrackerMenu === 'function') atualizarBadgeXpTrackerMenu(); } catch (e) { }
      try { if (typeof atualizarBadgeCorreio === 'function') atualizarBadgeCorreio(); } catch (e) { }
      try { if (typeof atualizarBadgeShinyMute === 'function') atualizarBadgeShinyMute(); } catch (e) { }
      try {
        if (typeof isGridMode !== 'undefined') {
          const t = document.getElementById('grid-txt-menu');
          const i = document.getElementById('grid-icon-menu');
          if (t) t.textContent = isGridMode ? 'Modo Abas' : 'Grid Multi-Contas';
          if (i) i.textContent = isGridMode ? '🗂️' : '🪟';
        }
      } catch (e) { }
    }

    // Filtragem em tempo real das ferramentas
    window.filtrarGameTools = function(termo) {
      const q = String(termo || '').trim().toLowerCase();
      const catsList = document.getElementById('gametools-cats-list');
      const resultsBox = document.getElementById('gametools-search-results');
      const clearBtn = document.getElementById('gametools-search-clear');
      if (!catsList || !resultsBox) return;

      if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

      if (!q) {
        catsList.style.display = 'flex';
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        return;
      }

      catsList.style.display = 'none';
      resultsBox.style.display = 'flex';

      const matches = [];
      for (const [id, it] of Object.entries(MENU_ITEMS)) {
        if (it.menu !== 'gametools') continue;
        const matchLabel = (it.label || '').toLowerCase().includes(q);
        const matchDesc = (it.desc || '').toLowerCase().includes(q);
        const matchHotkey = (it.hotkey || '').toLowerCase().includes(q);
        const matchGrupo = (it.grupo || '').toLowerCase().includes(q);
        if (matchLabel || matchDesc || matchHotkey || matchGrupo) {
          matches.push({ id, it });
        }
      }

      if (matches.length === 0) {
        resultsBox.innerHTML = `<div class="gametools-no-results">
          <span style="font-size:16px; display:block; margin-bottom:4px">🔍</span>
          Nenhuma ferramenta encontrada para "<b>${escAtributo(q)}</b>"
        </div>`;
        return;
      }

      let html = `<div class="sidebar-menu-cat-title" style="color:#38bdf8; font-size:9px; padding:2px 6px">RESULTADOS (${matches.length})</div>`;
      for (const { id, it } of matches) {
        html += criarLinhaItemMenu(id, it);
      }
      resultsBox.innerHTML = html;
      atualizarEstadoPinButtons();
    };

    window.limparBuscaGameTools = function() {
      const inp = document.getElementById('gametools-search-input');
      if (inp) {
        inp.value = '';
        window.filtrarGameTools('');
        inp.focus();
      }
    };

    window.abrirFlyoutGameTools = function(catId, ev) {
      if (ev) ev.stopPropagation();
      const rows = document.querySelectorAll('.gametools-cat-row');
      rows.forEach(r => {
        if (r.getAttribute('data-cat-id') === catId) {
          r.classList.toggle('active');
        } else {
          r.classList.remove('active');
        }
      });
    };

    // Fechar flyouts ativos ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.gametools-cat-row')) {
        document.querySelectorAll('.gametools-cat-row.active').forEach(r => r.classList.remove('active'));
      }
    });

    // IDs que sumiram do MENU_ITEMS mas podem estar salvos no localStorage de
    // quem ja usava o app. Sem isso o item fixado vira uma linha morta na
    // sidebar (renderizarFixadosSidebar nao acha a config e ignora).
    const MENU_ITEMS_LEGADO = {
      'mini-dashboard-v2': 'mini-dashboard',   // v2 virou A tela do Mini Dashboard
      'silenciar-shinies': 'silenciar-shinies-todas'
    };

    function obterItensFixados() {
      let lista;
      try { lista = JSON.parse(localStorage.getItem('idlePokemonPinnedMenu') || '[]'); } catch(e) { return []; }
      if (!Array.isArray(lista)) return [];
      // Migra IDs antigos e remove duplicata caso o novo ID ja esteja fixado.
      const migrada = [];
      let mudou = false;
      lista.forEach(id => {
        const alvo = MENU_ITEMS_LEGADO[id] || id;
        if (alvo !== id) mudou = true;
        if (!migrada.includes(alvo)) migrada.push(alvo); else mudou = true;
      });
      if (mudou) salvarItensFixados(migrada);
      return migrada;
    }

    function salvarItensFixados(lista) {
      try { localStorage.setItem('idlePokemonPinnedMenu', JSON.stringify(lista)); } catch(e) {}
    }

    function toggleFixarMenu(menuId) {
      const fixados = obterItensFixados();
      const idx = fixados.indexOf(menuId);
      if (idx >= 0) {
        fixados.splice(idx, 1);
      } else {
        fixados.push(menuId);
      }
      salvarItensFixados(fixados);
      atualizarEstadoPinButtons();
      renderizarFixadosSidebar();
      renderizarWidgetAutoTogglesSidebar();
    }

    function atualizarEstadoPinButtons() {
      const fixados = obterItensFixados();
      document.querySelectorAll('.menu-item-row[data-menu-id]').forEach(row => {
        const id = row.getAttribute('data-menu-id');
        const btn = row.querySelector('.menu-pin-btn');
        if (btn) {
          const isPinned = fixados.includes(id);
          btn.classList.toggle('pinned', isPinned);
          btn.textContent = '📌';
          btn.title = isPinned ? 'Desafixar do menu lateral' : 'Fixar no menu lateral';
        }
      });
    }

    function renderizarFixadosSidebar() {
      const fixadosMenu = obterItensFixados();
      const fixadosDash = obterItensFixadosDash();
      const todosFixados = [...fixadosMenu.map(id => ({ id, src: 'menu' })), ...fixadosDash.map(id => ({ id, src: 'dash' }))];
      const section = document.getElementById('sidebar-pinned-section');
      const container = document.getElementById('sidebar-pinned-items');
      if (!section || !container) return;

      if (todosFixados.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = '';
      container.innerHTML = todosFixados.map(({ id, src }, idx) => {
        const item = src === 'menu' ? MENU_ITEMS[id] : DASH_ITEMS[id];
        if (!item) return '';
        const unpinFn = src === 'menu' ? `toggleFixarMenu('${id}')` : `toggleFixarDash('${id}')`;
        return `<div class="sidebar-pinned-item" data-pinned-id="${id}" data-pinned-src="${src}" data-pinned-idx="${idx}" draggable="true" onclick="${item.action}" title="${item.label}">
          <span style="width:18px; text-align:center; font-size:13px; flex-shrink:0">${item.icon}</span>
          <span class="nav-btn-title" style="color:${item.color}; font-weight:700; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${item.label}</span>
          <span class="pinned-unpin" onclick="event.stopPropagation(); ${unpinFn}" title="Remover fixação">✕</span>
        </div>`;
      }).join('');

      inicializarDragDropItensFixados();
    }

    // Drag & drop interno dos itens fixados
    function inicializarDragDropItensFixados() {
      const container = document.getElementById('sidebar-pinned-items');
      if (!container) return;
      const items = container.querySelectorAll('.sidebar-pinned-item');

      items.forEach(el => {
        el.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/pinned-id', el.getAttribute('data-pinned-id') || '');
          e.dataTransfer.setData('text/pinned-src', el.getAttribute('data-pinned-src') || '');
          el.classList.add('dragging-item');
        });

        el.addEventListener('dragend', () => {
          el.classList.remove('dragging-item');
          items.forEach(i => i.classList.remove('drag-over-item'));
        });

        el.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.classList.add('drag-over-item');
        });

        el.addEventListener('dragleave', () => {
          el.classList.remove('drag-over-item');
        });

        el.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.classList.remove('drag-over-item');
          const srcId = e.dataTransfer.getData('text/pinned-id');
          const srcType = e.dataTransfer.getData('text/pinned-src');
          const destId = el.getAttribute('data-pinned-id');
          const destType = el.getAttribute('data-pinned-src');

          if (srcId && destId && (srcId !== destId || srcType !== destType)) {
            reordenarItensFixados(srcId, srcType, destId, destType);
          }
        });
      });
    }

    function reordenarItensFixados(srcId, srcType, destId, destType) {
      if (srcType === 'menu' && destType === 'menu') {
        const lista = obterItensFixados();
        const from = lista.indexOf(srcId);
        const to = lista.indexOf(destId);
        if (from >= 0 && to >= 0) {
          const [mov] = lista.splice(from, 1);
          lista.splice(to, 0, mov);
          salvarItensFixados(lista);
        }
      } else if (srcType === 'dash' && destType === 'dash') {
        const lista = obterItensFixadosDash();
        const from = lista.indexOf(srcId);
        const to = lista.indexOf(destId);
        if (from >= 0 && to >= 0) {
          const [mov] = lista.splice(from, 1);
          lista.splice(to, 0, mov);
          salvarItensFixadosDash(lista);
        }
      }
      renderizarFixadosSidebar();
      renderizarWidgetAutoTogglesSidebar();
    }

    // === REORDENAÇÃO & ARRASTO DE BLOCOS MODULARES NA SIDEBAR ===

// ===== 05-reordenacao-arrasto-blocos-sidebar.js =====
    // =====================================================================
    // 05-reordenacao-arrasto-blocos-sidebar.js — ORDEM DOS BLOCOS DA SIDEBAR
    // =====================================================================
    // Por que foi reescrito:
    //   1. O bloco INTEIRO tinha `draggable="true"`, então qualquer arrasto
    //      dentro dele (clicar numa aba de conta, rolar a lista) virava um
    //      arrasto de bloco. O guarda de `dragstart` só olhava a classe do
    //      e.target, o que não pega elementos aninhados.
    //   2. A alça `⠿` existia SÓ no bloco de contas e era decorativa — não
    //      iniciava nada. Os outros dois blocos não tinham nada visível.
    //   3. Não havia indicação de onde o bloco ia cair, e o `dragleave`
    //      disparava nos filhos, fazendo a borda piscar.
    // Agora: uma barrinha de controle injetada em TODO bloco, com a alça
    // (único ponto que inicia arrasto) e botões ▲/▼ — que funcionam sempre,
    // sem depender de arrasto, que é chato em janela com webview.
    // =====================================================================

    const SIDEBAR_BLOCOS_KEY = 'idlePokemonSidebarBlocksOrder';
    // Só blocos que existem de fato dentro do container. O 'pinned' antigo
    // apontava para uma seção que mora FORA dele e nunca era reordenada.
    const SIDEBAR_BLOCOS_PADRAO = ['accounts', 'xp-tracker', 'widget-auto-toggles'];
    const SIDEBAR_BLOCOS_ROTULO = {
      'accounts': '🎮 Contas',
      'xp-tracker': '📊 XP Tracker',
      'widget-auto-toggles': '⚡ Automações'
    };

    function obterOrdemBlocosSidebar() {
      let salva = [];
      try {
        const raw = JSON.parse(localStorage.getItem(SIDEBAR_BLOCOS_KEY) || '[]');
        if (Array.isArray(raw)) salva = raw;
      } catch (e) { }
      // Mantém só ids conhecidos e acrescenta os que faltarem (ex.: bloco novo
      // numa versão futura, ou o 'pinned' salvo por uma versão antiga).
      const ordem = salva.filter(id => SIDEBAR_BLOCOS_PADRAO.includes(id));
      SIDEBAR_BLOCOS_PADRAO.forEach(id => { if (!ordem.includes(id)) ordem.push(id); });
      return ordem;
    }

    function salvarOrdemBlocosSidebar(ordem) {
      try { localStorage.setItem(SIDEBAR_BLOCOS_KEY, JSON.stringify(ordem)); } catch (e) { }
    }

    function aplicarOrdemBlocosSidebar(ordemCustom) {
      const container = document.getElementById('sidebar-blocks-container');
      if (!container) return;
      const ordem = ordemCustom || obterOrdemBlocosSidebar();
      ordem.forEach(id => {
        const el = document.getElementById(`block-${id}`);
        if (el && el.parentElement === container) container.appendChild(el);
      });
      atualizarBotoesMoverSidebar();
    }

    // Move um bloco uma posição pra cima/baixo. É o caminho confiável: sem
    // arrasto, sem depender de onde o ponteiro está.
    function moverBlocoSidebar(blocoId, direcao) {
      const ordem = obterOrdemBlocosSidebar();
      const i = ordem.indexOf(blocoId);
      if (i < 0) return;
      const j = i + (direcao === 'up' ? -1 : 1);
      if (j < 0 || j >= ordem.length) return;
      ordem[i] = ordem[j];
      ordem[j] = blocoId;
      salvarOrdemBlocosSidebar(ordem);
      aplicarOrdemBlocosSidebar(ordem);
      const el = document.getElementById(`block-${blocoId}`);
      if (el) {
        // Pisca o bloco movido pra deixar claro o que aconteceu.
        el.classList.remove('bloco-movido');
        void el.offsetWidth;
        el.classList.add('bloco-movido');
        setTimeout(() => el.classList.remove('bloco-movido'), 600);
      }
      if (typeof mostrarToast === 'function') {
        mostrarToast(`${SIDEBAR_BLOCOS_ROTULO[blocoId] || blocoId} movido ${direcao === 'up' ? 'para cima' : 'para baixo'}`, '↕️', 'toast-success', 1600);
      }
    }

    // Desabilita ▲ no primeiro e ▼ no último — sem isso o clique não faz nada
    // e parece que a UI travou.
    function atualizarBotoesMoverSidebar() {
      const ordem = obterOrdemBlocosSidebar();
      ordem.forEach((id, i) => {
        const up = document.querySelector(`#block-${id} .sidebar-bloco-up`);
        const down = document.querySelector(`#block-${id} .sidebar-bloco-down`);
        if (up) up.disabled = (i === 0);
        if (down) down.disabled = (i === ordem.length - 1);
      });
    }

    // Acha o cabeçalho que o bloco JÁ tem. O de contas usa a classe
    // `.sidebar-block-header`; o XP Tracker e o Auto Toggles montam o deles
    // dinamicamente e só têm o ícone `.sidebar-block-drag-icon` dentro do grupo
    // da esquerda — daí `parentElement.parentElement`. Sem reconhecer esses
    // dois, uma segunda barra de título era injetada e o bloco ficava com
    // título duplicado.
    function acharCabecalhoBloco(block) {
      const porClasse = block.querySelector('.sidebar-block-header');
      if (porClasse) return { header: porClasse, alca: porClasse.querySelector('.sidebar-block-drag-icon') };
      const icone = block.querySelector('.sidebar-block-drag-icon');
      if (icone && icone.parentElement && icone.parentElement.parentElement) {
        return { header: icone.parentElement.parentElement, alca: icone };
      }
      return null;
    }

    function criarBotoesMover(id) {
      const botoes = document.createElement('span');
      botoes.className = 'sidebar-bloco-acoes';
      botoes.innerHTML = `
        <button class="sidebar-bloco-btn sidebar-bloco-up" title="Mover bloco para cima">▲</button>
        <button class="sidebar-bloco-btn sidebar-bloco-down" title="Mover bloco para baixo">▼</button>
      `;
      botoes.querySelector('.sidebar-bloco-up').onclick = (e) => { e.stopPropagation(); moverBlocoSidebar(id, 'up'); };
      botoes.querySelector('.sidebar-bloco-down').onclick = (e) => { e.stopPropagation(); moverBlocoSidebar(id, 'down'); };
      return botoes;
    }

    // O bloco só fica arrastável enquanto o ponteiro está na alça — é o que
    // impede o arrasto acidental ao clicar numa aba de conta ou rolar a lista.
    function ligarAlcaBloco(block, alca) {
      if (!alca || alca.dataset.alcaOk) return;
      alca.dataset.alcaOk = '1';
      alca.style.cursor = 'grab';
      alca.title = 'Arraste para reordenar';
      alca.addEventListener('mousedown', () => { block.draggable = true; });
      alca.addEventListener('mouseup', () => { block.draggable = false; });
    }

    // Idempotente e re-executável: o conteúdo do XP Tracker e do Auto Toggles é
    // renderizado depois (e re-renderizado ao fixar/desafixar), então isso roda
    // de novo a cada mudança no container.
    function montarControlesBlocosSidebar() {
      const container = document.getElementById('sidebar-blocks-container');
      if (!container) return;
      container.querySelectorAll('.sidebar-modular-block').forEach(block => {
        const id = block.getAttribute('data-block-id') || '';
        if (!id) return;

        const cab = acharCabecalhoBloco(block);

        if (cab) {
          // Tem cabeçalho próprio: a barra que eu havia injetado antes (quando o
          // conteúdo ainda não existia) sai, senão fica título em cima de título.
          const barraMinha = block.querySelector(':scope > .sidebar-bloco-ctrl');
          if (barraMinha) barraMinha.remove();

          // ⚠️ ERA AQUI QUE NASCIA O "BOTAOZINHO" DO LADO DO ▼.
          // O encaixe pegava `header.lastElementChild` e inseria os ▲▼ DENTRO
          // dele. Enquanto o cabecalho tinha um <div> agrupando as acoes a
          // direita isso funcionava; depois que ele virou uma linha plana, o
          // ultimo filho passou a ser um BOTAO — e os ▲▼ foram parar dentro do
          // botao de recolher, que renderizava espremido ao lado.
          // Agora e sempre append no proprio cabecalho.
          if (!cab.header.querySelector('.sidebar-bloco-acoes')) {
            const botoes = criarBotoesMover(id);
            if (botoes) cab.header.appendChild(botoes);
          }
          ligarAlcaBloco(block, cab.alca);
        } else if (!block.querySelector(':scope > .sidebar-bloco-ctrl')) {
          // Sem cabeçalho: aí sim vale uma barrinha própria.
          const barra = document.createElement('div');
          barra.className = 'sidebar-bloco-ctrl';
          barra.innerHTML = `
            <span class="sidebar-bloco-alca" title="Arraste para reordenar">⠿</span>
            <span class="sidebar-bloco-nome">${SIDEBAR_BLOCOS_ROTULO[id] || id}</span>
          `;
          barra.appendChild(criarBotoesMover(id));
          block.insertBefore(barra, block.firstChild);
          ligarAlcaBloco(block, barra.querySelector('.sidebar-bloco-alca'));
        }

        if (!block.dataset.dragendOk) {
          block.dataset.dragendOk = '1';
          block.addEventListener('dragend', () => { block.draggable = false; });
        }
      });
      atualizarBotoesMoverSidebar();
    }

    // Os widgets renderizam o próprio cabeçalho depois do boot, então observamos
    // o container e remontamos os controles quando isso acontece.
    let _obsBlocosSidebar = null;
    function observarBlocosSidebar() {
      if (_obsBlocosSidebar) return;
      const container = document.getElementById('sidebar-blocks-container');
      if (!container || typeof MutationObserver !== 'function') return;
      let agendado = null;
      _obsBlocosSidebar = new MutationObserver(() => {
        if (agendado) return;
        agendado = setTimeout(() => { agendado = null; montarControlesBlocosSidebar(); }, 120);
      });
      _obsBlocosSidebar.observe(container, { childList: true, subtree: true });
    }

    function limparIndicadoresSidebar() {
      document.querySelectorAll('.sidebar-modular-block').forEach(b => {
        b.classList.remove('drop-antes', 'drop-depois', 'dragging-block');
      });
    }

    function inicializarDragDropBlocosSidebar() {
      const container = document.getElementById('sidebar-blocks-container');
      if (!container) return;
      montarControlesBlocosSidebar();
      observarBlocosSidebar();

      container.querySelectorAll('.sidebar-modular-block').forEach(block => {
        // O atributo do HTML é removido: quem liga/desliga agora é a alça.
        block.draggable = false;

        block.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/block-id', block.getAttribute('data-block-id') || '');
          block.classList.add('dragging-block');
        });

        block.addEventListener('dragend', () => limparIndicadoresSidebar());

        block.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (block.classList.contains('dragging-block')) return;
          // Antes ou depois, pelo meio do bloco — assim a linha mostra onde
          // o bloco vai realmente cair.
          const r = block.getBoundingClientRect();
          const antes = (e.clientY - r.top) < r.height / 2;
          block.classList.toggle('drop-antes', antes);
          block.classList.toggle('drop-depois', !antes);
        });

        block.addEventListener('dragleave', (e) => {
          // Sem esta checagem o evento dispara ao passar por qualquer filho e
          // a linha fica piscando.
          if (block.contains(e.relatedTarget)) return;
          block.classList.remove('drop-antes', 'drop-depois');
        });

        block.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const antes = block.classList.contains('drop-antes');
          limparIndicadoresSidebar();
          const arrastado = e.dataTransfer.getData('text/block-id');
          const alvo = block.getAttribute('data-block-id');
          if (!arrastado || !alvo || arrastado === alvo) return;
          reordenarBlocosSidebar(arrastado, alvo, antes);
        });
      });
    }

    function reordenarBlocosSidebar(arrastadoId, alvoId, inserirAntes) {
      const ordem = obterOrdemBlocosSidebar();
      const de = ordem.indexOf(arrastadoId);
      if (de < 0) return;
      ordem.splice(de, 1);
      // O índice do alvo é recalculado DEPOIS da remoção — calcular antes
      // deslocava o destino em uma posição nos movimentos para baixo.
      let para = ordem.indexOf(alvoId);
      if (para < 0) return;
      if (!inserirAntes) para += 1;
      ordem.splice(para, 0, arrastadoId);
      salvarOrdemBlocosSidebar(ordem);
      aplicarOrdemBlocosSidebar(ordem);
      if (typeof mostrarToast === 'function') {
        mostrarToast('Ordem da barra lateral salva!', '✨', 'toast-success', 1800);
      }
    }

    // === COLAPSO / RECOLHIMENTO DE SEÇÕES DA SIDEBAR ===

// ===== 06-colapso-secoes-sidebar.js =====
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

// ===== 07-fixar-itens-dashboard.js =====
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

// ===== 08-colapso-sidebar.js =====
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

// ===== 09-widget-auto-toggles-sidebar.js =====
    let currentTab = 0;
    let isGridMode = false;
    let isMuted = localStorage.getItem('idlePokemonGlobalMuted') === '1';
    let tamperScriptCache = '';
    let editandoAbaIndex = 0;

    // ================================================================

// ===== 10-proxy-pool-webshare.js =====
    // Quantidade dinâmica de contas ativas (padrão: 4 contas)
    let totalContas = 4;
    try {
      const savedTotal = parseInt(localStorage.getItem('idlePokemonTotalContas'), 10);
      if (!isNaN(savedTotal) && savedTotal >= 1 && savedTotal <= 16) totalContas = savedTotal;
    } catch(e) {}

    // Nomes personalizados das abas
    let nomesAbas = ['JesusCrizto', 'JudasPriest', 'DarkMatter', 'Nebulosa'];
    try {
      const savedNames = localStorage.getItem('idlePokemonCustomTabNames');
      if (savedNames) {
        const parsed = JSON.parse(savedNames);
        if (Array.isArray(parsed)) nomesAbas = parsed;
      }
    } catch(e) {}
    while (nomesAbas.length < totalContas) {
      nomesAbas.push(`Conta ${nomesAbas.length + 1}`);
    }

    // ⚠️ PARTICAO POR POSICAO, nao por indice.
    // A particao (`persist:accN`) e a identidade REAL da conta: e ela que
    // guarda cookies e sessao do jogo. Antes ela era DERIVADA do indice
    // (`persist:acc${i+1}`), o que amarrava "posicao na lista" a "qual conta e"
    // — por isso reordenar as abas so trocava os rotulos de lugar enquanto as
    // sessoes ficavam paradas. Agora a particao e um dado proprio, guardado e
    // reordenado junto com nome e proxy, e a posicao passa a ser so posicao.
    let listaParticoes = [];
    try {
      const salvo = localStorage.getItem('idlePokemonTabPartitions');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed)) listaParticoes = parsed.filter(x => typeof x === 'string' && x);
      }
    } catch (e) { }

    // Devolve a menor particao `persist:accN` ainda nao usada — abrir e fechar
    // contas nao pode fazer duas posicoes apontarem pra mesma sessao.
    function particaoLivre() {
      const usadas = new Set(listaParticoes);
      for (let n = 1; n <= 64; n++) {
        const cand = 'persist:acc' + n;
        if (!usadas.has(cand)) return cand;
      }
      return 'persist:acc' + Date.now();
    }

    // Instalacao antiga (ou primeira execucao): a posicao i sempre foi acc(i+1).
    while (listaParticoes.length < totalContas) {
      const padrao = 'persist:acc' + (listaParticoes.length + 1);
      listaParticoes.push(listaParticoes.includes(padrao) ? particaoLivre() : padrao);
    }

    function salvarParticoes() {
      try { localStorage.setItem('idlePokemonTabPartitions', JSON.stringify(listaParticoes)); } catch (e) { }
    }

    // Proxies atribuídos a cada conta
    let listaProxies = [];
    while (listaProxies.length < totalContas) {
      listaProxies.push('');
    }

    // Configuração de auto-rotação de proxy no Refresh por conta
    let contasAutoProxyRefresh = [];
    try {
      const savedAutoRotate = localStorage.getItem('idlePokemonAutoRotateRefresh');
      if (savedAutoRotate) {
        const parsed = JSON.parse(savedAutoRotate);
        if (Array.isArray(parsed)) contasAutoProxyRefresh = parsed;
      }
    } catch(e) {}
    while (contasAutoProxyRefresh.length < totalContas) {
      contasAutoProxyRefresh.push(false);
    }

    let autoProxyPoolPointer = 0;
    try {
      const savedPtr = parseInt(localStorage.getItem('idlePokemonAutoProxyPointer'), 10);
      if (!isNaN(savedPtr)) autoProxyPoolPointer = savedPtr;
    } catch(e) {}

    // Credenciais de login
    let listaCredenciais = [];
    try {
      const savedCreds = localStorage.getItem('idlePokemonCustomCredentials');
      if (savedCreds) {
        const parsed = JSON.parse(savedCreds);
        if (Array.isArray(parsed)) listaCredenciais = parsed;
      }
    } catch(e) {}
    while (listaCredenciais.length < totalContas) {
      const i = listaCredenciais.length;
      listaCredenciais.push({ user: nomesAbas[i] || `Conta ${i + 1}`, pass: '', autoLogin: true });
    }

    // Arrays de referências do DOM (atualizados dinamicamente)
    let webviews = [];
    let wrappers = [];
    let tabButtons = [];

    // ================================================================

// ===== 11-renderizador-abas-webviews-dragdrop.js =====
    //  🛠️ RENDERIZADOR DINÂMICO DE ABAS E WEBVIEWS COM DRAG & DROP
    // ================================================================
    // Cor da aba: era só a posição no array (i % 8), então duas contas podiam
    // nascer com a mesma cor e não dava pra escolher. Agora a escolha é do
    // usuário, por conta, e fica no localStorage; sem escolha, cai na cor
    // padrão da posição (comportamento antigo).
    const CORES_ABA = [
      ['#ef4444', 'Vermelho'], ['#f97316', 'Laranja'], ['#eab308', 'Amarelo'],
      ['#22c55e', 'Verde'],    ['#10b981', 'Esmeralda'], ['#06b6d4', 'Ciano'],
      ['#3b82f6', 'Azul'],     ['#6366f1', 'Índigo'],  ['#a855f7', 'Roxo'],
      ['#ec4899', 'Rosa'],     ['#f43f5e', 'Rubi'],    ['#94a3b8', 'Cinza']
    ];
    const CORES_ABA_KEY = 'idlePokemonTabColors';

    function obterCoresAbas() {
      try {
        const o = JSON.parse(localStorage.getItem(CORES_ABA_KEY) || '{}');
        if (o && typeof o === 'object') return o;
      } catch (e) { }
      return {};
    }
    function salvarCoresAbas(mapa) {
      try { localStorage.setItem(CORES_ABA_KEY, JSON.stringify(mapa)); } catch (e) { }
    }
    function corDaAba(i) {
      const mapa = obterCoresAbas();
      if (mapa[i]) return mapa[i];
      return CORES_ABA[i % CORES_ABA.length][0];
    }
    function definirCorAba(i, cor) {
      const mapa = obterCoresAbas();
      if (cor) mapa[i] = cor; else delete mapa[i];
      salvarCoresAbas(mapa);
      renderizarAbasClient();
    }

    // =====================================================================
    // SPRITE DO POKEMON NA ABA
    // =====================================================================
    // As 11 abas tinham a MESMA pokebola; a cor da conta era a unica distincao,
    // e com 11 contas isso vira um teste de memoria. O sprite do pokemon ativo
    // resolve de relance — e o dado ja existe em `pokemonAtivoCache`, alimentado
    // pelo loop de ping.
    //
    // O caminho e o do proprio jogo (visto em scripts/05-core-api.js): slug em
    // minusculo, sem apostrofo e ponto, espaco vira hifen. Aqui e URL ABSOLUTA
    // porque a sidebar roda no shell, que nao esta na origem do jogo.
    const SPRITE_ALIAS_ABA = {
        "farfetch'd": 'farfetchd', 'mr.mime': 'mr-mime',
        'nidoran female': 'nidoran-f', 'nidoran male': 'nidoran-m'
    };
    // Prefixos de forma que o acervo do jogo nao tem separados — "Alolan
    // Exeggutor" e desenhado com o sprite do Exeggutor.
    const PREFIXOS_FORMA = ['alolan ', 'ancient ', 'crystal ', 'elder ', 'champion ',
                            'brave ', 'shiny ', 'mega ', 'dark ', 'war ', 'octopus '];

    function slugSpriteAba(nome) {
        let t = String(nome || '').toLowerCase().trim();
        if (!t) return '';
        if (SPRITE_ALIAS_ABA[t]) return SPRITE_ALIAS_ABA[t];
        for (const pre of PREFIXOS_FORMA) {
            if (t.startsWith(pre)) { t = t.slice(pre.length); break; }
        }
        if (SPRITE_ALIAS_ABA[t]) return SPRITE_ALIAS_ABA[t];
        return t.replace(/['.]/g, '').replace(/\s+/g, '-');
    }

    function urlSpriteAba(nome) {
        const slug = slugSpriteAba(nome);
        return slug ? `https://idlepokemoon.com.br/sprites/gymfight/bw/front/normal/${slug}.gif` : '';
    }

    // Desenha (ou apaga) o sprite da aba. Sem pokemon conhecido, fica a pokebola
    // de sempre — nunca um buraco.
    function pintarSpriteAba(index, nomePoke) {
        const cx = document.getElementById(`tab-sprite-${index}`);
        if (!cx) return;
        const url = urlSpriteAba(nomePoke);
        if (!url) { cx.classList.remove('tem-sprite'); return; }
        let img = cx.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'tab-sprite-img';
            img.alt = '';
            img.loading = 'lazy';
            // Sprite que nao existe volta pra pokebola em vez de deixar o
            // quadrado quebrado do navegador.
            img.onerror = () => { cx.classList.remove('tem-sprite'); img.remove(); };
            img.onload = () => cx.classList.add('tem-sprite');
            cx.appendChild(img);
        }
        if (img.getAttribute('src') !== url) img.setAttribute('src', url);
    }

    function renderizarAbasClient() {
      const tabsWrapper = document.getElementById('account-tabs-wrapper');
      if (!tabsWrapper) return;
      tabsWrapper.innerHTML = '';
      tabButtons = [];

      const badgeCount = document.getElementById('sidebar-accounts-count');
      if (badgeCount) badgeCount.textContent = totalContas;


      for (let i = 0; i < totalContas; i++) {
        const nome = nomesAbas[i] || `Conta ${i + 1}`;
        const btn = document.createElement('button');
        btn.className = `tab-btn ${i === currentTab ? 'active' : ''}`;
        btn.id = `tab-${i}`;
        // Sem `title`: o balao nativo do Chromium abria por cima do card do
        // time (shell/50) com menos informacao do que ele. Nome, particao,
        // pokemon ativo, ping e as dicas de uso sao todos do card agora.
        btn.setAttribute('draggable', 'true');
        btn.onclick = () => selectTab(i);
        btn.ondblclick = (e) => abrirModalRenomear(i, e);
        btn.oncontextmenu = (e) => { abrirModalRenomear(i, e); return false; };

        // Suporte Drag & Drop nativo
        btn.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', String(i));
          e.dataTransfer.effectAllowed = 'move';
          btn.classList.add('dragging');
        });
        btn.addEventListener('dragend', () => {
          btn.classList.remove('dragging');
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('drag-over'));
        });
        // O alvo do arrasto era a aba INTEIRA e o destino era sempre o indice
        // dela, entao nao havia como dizer "quero cair ANTES" ou "DEPOIS" —
        // arrastar pra baixo largava a conta uma posicao acima do esperado e
        // parecia que nao tinha funcionado. Agora a metade de cima do botao
        // significa "antes desta" e a de baixo "depois desta", com uma linha
        // mostrando onde vai cair.
        btn.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const r = btn.getBoundingClientRect();
          const depois = (e.clientY - r.top) > r.height / 2;
          btn.classList.add('drag-over');
          btn.classList.toggle('drop-depois', depois);
          btn.classList.toggle('drop-antes', !depois);
        });
        btn.addEventListener('dragleave', () => {
          btn.classList.remove('drag-over', 'drop-antes', 'drop-depois');
        });
        btn.addEventListener('drop', (e) => {
          e.preventDefault();
          const depois = btn.classList.contains('drop-depois');
          btn.classList.remove('drag-over', 'drop-antes', 'drop-depois');
          const origemIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (isNaN(origemIdx) || origemIdx === i) return;
          // `splice` remove a origem ANTES de inserir; quando ela esta acima do
          // alvo, todo mundo abaixo sobe um. Sem descontar isso, soltar "depois
          // da conta 5" vindo da 2 acabava colocando na 5, nao na 6.
          let destino = depois ? i + 1 : i;
          if (origemIdx < destino) destino--;
          if (destino !== origemIdx) reordenarContas(origemIdx, destino);
        });

        const corTop = corDaAba(i);
        // A cor também tinge a borda da aba, senão só o topinho da pokébola
        // muda e fica difícil distinguir 11 contas de relance.
        btn.style.setProperty('--cor-aba', corTop);
        btn.innerHTML = `
          <span class="tab-pokeball-icon" id="tab-sprite-${i}">
            <svg class="tab-pokeball-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="1.8" fill="#1e293b"/>
              <path d="M2.2 11C2.8 6.5 6.9 3 12 3C17.1 3 21.2 6.5 21.8 11H2.2Z" fill="${corTop}"/>
              <path d="M2 12H7.5M16.5 12H22" stroke="#0f172a" stroke-width="2"/>
              <circle cx="12" cy="12" r="3.8" fill="#0f172a" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="1.6" fill="#ffffff"/>
            </svg>
          </span>
          <div style="flex:1; min-width:0; margin-left:8px; overflow:hidden">
            <span class="tab-title" id="tab-title-${i}" style="display:block; color:#f1f5f9; font-weight:700; font-size:12px; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${nome}</span>
            <span id="tab-poke-${i}" style="display:block; font-size:9px; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%">…</span>
          </div>
          <span class="tab-ping-dot" id="tab-ping-${i}" title="Latência de conexão"></span>
        `;
        tabsWrapper.appendChild(btn);
        tabButtons.push(btn);
      }

      // O innerHTML acima recriou os contêineres: repõe o sprite de quem já
      // está no cache, senão a aba volta pra pokébola a cada render.
      for (let i = 0; i < totalContas; i++) {
        try {
          const d = (typeof pokemonAtivoCache !== 'undefined') ? pokemonAtivoCache[i] : null;
          if (d && d.poke) pintarSpriteAba(i, d.poke);
        } catch (e) { }
      }

      // Adiciona botão da Dashboard ao array de tabButtons
      const dashBtn = document.getElementById('tab-dash');
      if (dashBtn) {
        tabButtons.push(dashBtn);
      }

      // Habilita scroll somente quando há contas suficientes para precisar
      const container = document.getElementById('tabs-container');
      if (container) {
        // Aguarda layout calcular antes de medir
        requestAnimationFrame(() => {
          const needsScroll = container.scrollHeight > container.clientHeight + 10;
          container.classList.toggle('scrollable', needsScroll);
        });
      }
    }

    // =====================================================================
    // REORDENAR CONTAS
    // =====================================================================
    // O bug (reportado em 2026-09-02: "tento ordenar e parece que so acontece
    // a troca do nome da aba"): esta funcao reordenava `nomesAbas`,
    // `listaProxies` e `listaCredenciais` e mais nada. A CONTA de verdade e o
    // elemento <webview>, cujo `partition` era derivado do indice
    // (`persist:acc${i+1}`) e e IMUTAVEL depois que o elemento e anexado.
    // Resultado: os rotulos trocavam de lugar e as sessoes ficavam paradas —
    // a aba 1 passava a se chamar "Ozzy" enquanto seguia logada no Judas.
    //
    // Duas coisas resolvem, e nenhuma delas e mover o no no DOM:
    //
    //   1. A particao virou DADO (`listaParticoes`, shell/10) e viaja junto
    //      com nome, proxy e credencial.
    //   2. Os elementos ficam ONDE ESTAO e sao RENUMERADOS. Mover um <webview>
    //      no DOM faria o Chromium desanexar e reanexar o guest, ou seja,
    //      RECARREGAR o jogo de todas as contas a cada arrasto. Renumerar o
    //      `id` basta porque tudo neste projeto acha a webview por
    //      `getElementById('wv-N')`, e a ordem VISUAL do modo Grid e resolvida
    //      com a propriedade `order` do CSS (no modo Abas nem isso importa: os
    //      wrappers sao `position:absolute` empilhados, so o `.active` aparece).
    //
    // Tambem viajam os caches indexados por conta — sem isso a aba mostraria o
    // ping e o pokemon ativo do vizinho ate a proxima varredura.
    function reordenarContas(origemIdx, destinoIdx) {
      if (origemIdx === destinoIdx) return;
      if (origemIdx < 0 || destinoIdx < 0) return;
      if (origemIdx >= totalContas || destinoIdx >= totalContas) return;

      const mover = (arr) => {
        if (!Array.isArray(arr)) return;
        const [x] = arr.splice(origemIdx, 1);
        arr.splice(destinoIdx, 0, x);
      };
      // Caches guardados como objeto {0:…, 1:…}: viram lista, movem, voltam.
      const moverMapa = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const tmp = [];
        for (let i = 0; i < totalContas; i++) tmp.push(obj[i]);
        const [x] = tmp.splice(origemIdx, 1);
        tmp.splice(destinoIdx, 0, x);
        for (let i = 0; i < totalContas; i++) {
          if (tmp[i] === undefined) delete obj[i]; else obj[i] = tmp[i];
        }
      };

      // 1. Identidade e dados da conta
      mover(nomesAbas);
      mover(listaProxies);
      mover(listaCredenciais);
      mover(listaParticoes);
      try { mover(inventariosContas); } catch (e) { }
      try { moverMapa(pokemonAtivoCache); } catch (e) { }
      try { moverMapa(pingPorConta); } catch (e) { }
      try { moverMapa(_injetadoPorConta); } catch (e) { }

      // 2. Os elementos: renumeracao no lugar, sem tocar na arvore.
      const nosNaOrdemAtual = [];
      for (let i = 0; i < totalContas; i++) nosNaOrdemAtual.push(document.getElementById(`wrap-${i}`));
      const [noMovido] = nosNaOrdemAtual.splice(origemIdx, 1);
      nosNaOrdemAtual.splice(destinoIdx, 0, noMovido);

      // Renumera em DUAS passadas: na primeira os ids saem do caminho, senao a
      // segunda colide (dois `wrap-2` ao mesmo tempo faz getElementById devolver
      // o errado no meio da operacao).
      nosNaOrdemAtual.forEach((w, i) => {
        if (!w) return;
        w.id = `tmp-wrap-${i}`;
        const h = w.querySelector('[id^="header-title-"]'); if (h) h.id = `tmp-header-${i}`;
        const v = w.querySelector('webview'); if (v) v.id = `tmp-wv-${i}`;
      });
      nosNaOrdemAtual.forEach((w, i) => {
        if (!w) return;
        w.id = `wrap-${i}`;
        w.style.order = String(i);   // ordem visual do modo Grid
        const h = w.querySelector(`#tmp-header-${i}`); if (h) h.id = `header-title-${i}`;
        const v = w.querySelector(`#tmp-wv-${i}`); if (v) v.id = `wv-${i}`;
        // Os botoes do cabecalho levam o indice cravado no onclick.
        w.querySelectorAll('.webview-header .ctrl-btn').forEach(b => {
          const acao = b.getAttribute('onclick') || '';
          b.setAttribute('onclick', acao.replace(/\((\s*)\d+/, `($1${i}`));
        });
        const nome = nomesAbas[i] || `Conta ${i + 1}`;
        const particao = listaParticoes[i] || `persist:acc${i + 1}`;
        const titulo = w.querySelector(`#header-title-${i}`);
        if (titulo) titulo.textContent = `🎮 ${nome} (${particao})`;
      });

      // 3. Quem estava selecionado continua selecionado.
      if (currentTab === origemIdx) {
        currentTab = destinoIdx;
      } else if (origemIdx < currentTab && destinoIdx >= currentTab) {
        currentTab--;
      } else if (origemIdx > currentTab && destinoIdx <= currentTab) {
        currentTab++;
      }

      try {
        localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        localStorage.setItem('idlePokemonCustomProxies', JSON.stringify(listaProxies));
        localStorage.setItem('idlePokemonAccountCredentials', JSON.stringify(listaCredenciais));
      } catch (e) { }
      salvarParticoes();

      // As cores fixadas sao guardadas por POSICAO (mapa indice -> cor), entao
      // precisam acompanhar o movimento, senao a aba muda de cor ao ser movida.
      try {
        const cores = obterCoresAbas();
        const lista = [];
        for (let i = 0; i < totalContas; i++) lista.push(cores[i]);
        const [c] = lista.splice(origemIdx, 1);
        lista.splice(destinoIdx, 0, c);
        const novo = {};
        lista.forEach((cor, i) => { if (cor) novo[i] = cor; });
        salvarCoresAbas(novo);
      } catch (e) { }

      renderizarAbasClient();
      renderizarWebviewsClient();   // so re-sincroniza os arrays webviews/wrappers
      selectTab(currentTab);
    }

    // Move a conta uma posicao pra cima/baixo. O arrasto e impreciso com muitas
    // contas na lista; estes dois sao o caminho garantido (usados no modal de
    // gerenciar aba).
    function moverContaUmaPosicao(index, direcao) {
      const destino = index + (direcao < 0 ? -1 : 1);
      if (destino < 0 || destino >= totalContas) return;
      reordenarContas(index, destino);
      if (typeof mostrarToast === 'function') {
        mostrarToast(`"${nomesAbas[destino] || ('Conta ' + (destino + 1))}" agora é a conta ${destino + 1}`, '↕️', 'info', 2200);
      }
    }

    function renderizarWebviewsClient() {
      const container = document.getElementById('webviews-dynamic-container');
      if (!container) return;
      
      for (let i = 0; i < totalContas; i++) {
        let wrap = document.getElementById(`wrap-${i}`);
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.className = `webview-wrapper ${i === currentTab ? 'active' : ''}`;
          wrap.id = `wrap-${i}`;

          const nome = nomesAbas[i] || `Conta ${i + 1}`;
          const particao = listaParticoes[i] || `persist:acc${i + 1}`;
          wrap.innerHTML = `
            <div class="webview-header">
              <span id="header-title-${i}">🎮 ${nome} (${particao})</span>
              <div style="display:flex; gap:4px">
                <button class="ctrl-btn" style="height:18px; padding:0 6px; font-size:9px" onclick="abrirModalRenomear(${i}, event)">⚙️ Gerenciar</button>
                <button class="ctrl-btn" style="height:18px; padding:0 6px; font-size:9px" onclick="reloadWebview(${i})">🔄 Recarregar</button>
              </div>
            </div>
            <webview id="wv-${i}" partition="${particao}" src="https://idlepokemoon.com.br/play" allowpopups></webview>
          `;
          container.appendChild(wrap);

          const wv = wrap.querySelector('webview');
          conectarEventosWebview(wv, i);
        }
      }

      // Remove webviews excedentes caso o total de contas tenha diminuído
      for (let i = totalContas; i < 16; i++) {
        const oldWrap = document.getElementById(`wrap-${i}`);
        if (oldWrap) oldWrap.remove();
      }

      // Atualiza arrays globais
      webviews = [];
      wrappers = [];
      for (let i = 0; i < totalContas; i++) {
        webviews.push(document.getElementById(`wv-${i}`));
        wrappers.push(document.getElementById(`wrap-${i}`));
      }

      // Adiciona o wrapper da Dashboard no final
      const dashWrap = document.getElementById('wrap-dash');
      if (dashWrap) wrappers.push(dashWrap);
    }

    // Adiciona uma nova conta dinâmica com partição isolada
    function adicionarNovaAba() {
      if (totalContas >= 16) {
        alert('Limite máximo de 16 contas simultâneas atingido.');
        return;
      }
      const novoIndex = totalContas;
      totalContas++;
      nomesAbas.push(`Conta ${totalContas}`);
      listaProxies.push('');
      // Sem `user` pre-definido: era daqui que saia o "Conta N" preenchido
      // sozinho no formulario de login (ver shell/19, injetarAutoLogin).
      listaCredenciais.push({ user: '', pass: '', autoLogin: true });
      // A particao nao pode ser `acc(totalContas)`: depois de remover contas do
      // meio esse numero pode ja pertencer a outra aba, e duas posicoes
      // apontando pra mesma sessao viram a MESMA conta aberta duas vezes.
      listaParticoes.push(particaoLivre());

      try {
        localStorage.setItem('idlePokemonTotalContas', totalContas);
        localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        localStorage.setItem('idlePokemonCustomProxies', JSON.stringify(listaProxies));
        localStorage.setItem('idlePokemonAccountCredentials', JSON.stringify(listaCredenciais));
      } catch(e) {}
      salvarParticoes();

      renderizarAbasClient();
      renderizarWebviewsClient();

      // Aplica proxy se configurado
      if (listaProxies[novoIndex]) {
        ipcRenderer.invoke('set-account-proxy', { accountIndex: novoIndex, proxyRule: listaProxies[novoIndex] }).catch(() => {});
      }

      selectTab(novoIndex);
      mostrarToast(`Conta ${totalContas} criada com sucesso! (persist:acc${totalContas})`, '✨', 'success', 3500);
      // Auto-detecta nome do personagem e Pokémon ativo após a webview carregar
      setTimeout(() => { checarNomePersonagemWebview(novoIndex); atualizarPokemonAtivoAba(novoIndex); }, 5000);
      setTimeout(() => { checarNomePersonagemWebview(novoIndex); atualizarPokemonAtivoAba(novoIndex); }, 10000);
    }

    // Remove uma conta dinâmica
    function removerAba(index) {
      if (totalContas <= 1) {
        alert('Você precisa ter pelo menos 1 conta aberta.');
        return;
      }
      const nome = nomesAbas[index] || `Conta ${index + 1}`;
      if (!confirm(`Tem certeza que deseja fechar e remover a conta "${nome}"?`)) return;

      cancelarReconexaoAutomatica(index);

      // ⚠️ Remove o wrapper DA CONTA ESCOLHIDA e renumera o resto. O codigo
      // antigo cortava os dados em `index` mas apagava sempre o ULTIMO wrapper
      // (`wrap-${totalContas}`) — fechar uma conta do meio deixava os dados
      // deslocados em relacao as sessoes, exatamente o mesmo desencontro que
      // fazia a reordenacao so trocar rotulos.
      const restantes = [];
      for (let i = 0; i < totalContas; i++) {
        const w = document.getElementById(`wrap-${i}`);
        if (i === index) { if (w) w.remove(); }
        else if (w) restantes.push(w);
      }

      totalContas--;
      nomesAbas.splice(index, 1);
      listaProxies.splice(index, 1);
      listaCredenciais.splice(index, 1);
      listaParticoes.splice(index, 1);
      try { inventariosContas.splice(index, 1); } catch(e) {}

      restantes.forEach((w, i) => {
        w.id = `wrap-${i}`;
        w.style.order = String(i);
        const h = w.querySelector('[id^="header-title-"]'); if (h) h.id = `header-title-${i}`;
        const v = w.querySelector('webview'); if (v) v.id = `wv-${i}`;
        w.querySelectorAll('.webview-header .ctrl-btn').forEach(b => {
          const acao = b.getAttribute('onclick') || '';
          b.setAttribute('onclick', acao.replace(/\((\s*)\d+/, `($1${i}`));
        });
        const titulo = w.querySelector(`#header-title-${i}`);
        if (titulo) titulo.textContent = `🎮 ${nomesAbas[i] || ('Conta ' + (i + 1))} (${listaParticoes[i] || ('persist:acc' + (i + 1))})`;
      });

      try {
        localStorage.setItem('idlePokemonTotalContas', totalContas);
        localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        localStorage.setItem('idlePokemonCustomProxies', JSON.stringify(listaProxies));
        localStorage.setItem('idlePokemonAccountCredentials', JSON.stringify(listaCredenciais));
      } catch(e) {}
      salvarParticoes();

      renderizarAbasClient();
      renderizarWebviewsClient();
      selectTab(Math.max(0, index - 1));
      mostrarToast(`Conta ${nome} fechada.`, '🗑️', 'info', 2500);
    }

    // Excluir conta a partir do modal de gerenciamento
    function excluirContaPeloModal() {
      const idx = editandoAbaIndex;
      fecharModalRenomear();
      removerAba(idx);
    }

    // Atualiza os títulos no DOM
    function renderizarNomesAbas() {
      nomesAbas.forEach((nome, i) => {
        const elTitle = document.getElementById(`tab-title-${i}`);
        if (elTitle) elTitle.textContent = nome;
        const elHeader = document.getElementById(`header-title-${i}`);
        if (elHeader) elHeader.textContent = `🎮 ${nome} (persist:acc${i + 1})`;
      });
    }

    // Modal de renomeação / gerenciamento
    function abrirModalRenomear(index, event) {
      if (event) event.stopPropagation();
      editandoAbaIndex = index;
      const modal = document.getElementById('modal-rename');
      const box = modal.querySelector('.modal-box');
      if (box) { box.style.position = ''; box.style.left = ''; box.style.top = ''; box.style.margin = ''; }
      const input = document.getElementById('modal-rename-input');
      const header = document.getElementById('modal-rename-header');
      const btnDelete = document.getElementById('btn-modal-delete-acc');

      const nome = nomesAbas[index] || `Conta ${index + 1}`;
      header.textContent = nome;
      input.value = nome;

      // Subtítulo com o pokémon ativo (mesmo cache da sidebar) e a sessão.
      const sub = document.getElementById('modal-conta-sub');
      if (sub) {
        let pk = '';
        try {
          const d = (typeof pokemonAtivoCache !== 'undefined') ? pokemonAtivoCache[index] : null;
          if (d && d.poke) pk = `${d.poke}${d.lv ? ' Lv.' + d.lv : ''}`;
        } catch (e) { }
        // A sessao nao e mais deduzida do indice: depois de reordenar, a conta
        // na posicao 1 pode estar em `persist:acc4`. Mostrar a particao real e
        // o que permite conferir de qual conta se esta falando.
        sub.textContent = (pk ? `${pk} · ` : '') + `sessão ${listaParticoes[index] || ('persist:acc' + (index + 1))}`;
      }

      const pos = document.getElementById('modal-conta-pos');
      if (pos) pos.textContent = `${index + 1} de ${totalContas}`;
      const btnSubir = document.getElementById('btn-conta-subir');
      const btnDescer = document.getElementById('btn-conta-descer');
      if (btnSubir) btnSubir.disabled = (index === 0);
      if (btnDescer) btnDescer.disabled = (index >= totalContas - 1);

      const ball = document.getElementById('modal-conta-ball');
      if (ball) ball.style.background = corDaAba(index);

      montarPaletaCoresAba(index);

      if (btnDelete) {
        btnDelete.style.display = (totalContas > 1) ? 'inline-block' : 'none';
      }

      modal.classList.add('active');
      setTimeout(() => { input.focus(); input.select(); }, 50);
    }

    function montarPaletaCoresAba(index) {
      const box = document.getElementById('modal-conta-cores');
      if (!box) return;
      const atual = corDaAba(index);
      box.innerHTML = CORES_ABA.map(([cor, nome]) =>
        `<button class="modal-cor-opt${cor.toLowerCase() === String(atual).toLowerCase() ? ' ativa' : ''}"
                 data-cor="${cor}" title="${nome}" style="background:${cor}"></button>`
      ).join('') + `<button class="modal-cor-reset" data-cor="" title="Voltar à cor padrão">↺</button>`;

      box.querySelectorAll('[data-cor]').forEach(b => {
        b.onclick = () => {
          definirCorAba(index, b.dataset.cor || null);
          const ball = document.getElementById('modal-conta-ball');
          if (ball) ball.style.background = corDaAba(index);
          montarPaletaCoresAba(index);
        };
      });
    }

    // Move a conta aberta no modal e mantem o modal apontando pra ELA (o indice
    // muda; reabrir na posicao antiga estaria editando a conta vizinha).
    function moverContaPeloModal(direcao) {
      if (editandoAbaIndex == null) return;
      const destino = editandoAbaIndex + (direcao < 0 ? -1 : 1);
      if (destino < 0 || destino >= totalContas) return;
      reordenarContas(editandoAbaIndex, destino);
      abrirModalRenomear(destino);
    }

    function fecharModalRenomear() {
      const modal = document.getElementById('modal-rename');
      modal.classList.remove('active');
    }

    // ================================================================

// ===== 12-arrasto-janela-renomear.js =====
    //  🪟 ARRASTO DA JANELA DE RENOMEAR (aba do personagem)
    // ================================================================
    function iniciarArrastoModalRenomear(e) {
      const box = document.querySelector('#modal-rename .modal-box');
      if (!box) return;
      const r = box.getBoundingClientRect();
      box.style.position = 'fixed';
      box.style.margin = '0';
      box.style.left = r.left + 'px';
      box.style.top = r.top + 'px';
      const sx = e.clientX, sy = e.clientY, ox = r.left, oy = r.top;
      function mv(ev) {
        box.style.left = (ox + ev.clientX - sx) + 'px';
        box.style.top = (oy + ev.clientY - sy) + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    }

    // ================================================================

// ===== 13-mini-dashboard-contas-ativas.js =====
    // ================================================================
    //  📊 MINI DASHBOARD — CONTAS ATIVAS (coleta + render)
    // ================================================================
    // A janela (abrir/fechar/arrastar/modo lista) vive em
    // shell/40-mini-dashboard.js. Aqui fica só a coleta por webview e a
    // montagem do HTML dos cards.
    //
    // Havia duas versões da mesma tela (v1 `.md-*` + v2 `.md2-*`) alimentadas
    // nesta mesma passada. A v1 foi removida: sobrou só o layout v2.
    // ================================================================
    let mdDiagPrev = {};

    function fmtNum(n) {
      n = Number(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    }

    const BALL_ICONS = {
      pokeball: '🔴', 'poke ball': '🔴', great: '🔵', super: '🟣', ultra: '🟡',
      'ultra ball': '🟡', premier: '⚪', master: '🟠', safari: '🟢', net: '🕸️',
      nest: '🥚', dive: '🌊', luxury: '💠', repeat: '🔁', timer: '⏱️', quick: '⚡',
      heal: '💚', lure: '🎣', dusk: '🌑', fast: '💨', beast: '🟣', dream: '💤',
      park: '🏞️', cherish: '💖'
    };
    function ballLabel(k) {
      return (k || '').replace(/\s*ball\s*/i, '').replace(/^\w/, c => c.toUpperCase()) || 'Bola';
    }

    async function atualizarMiniDashboard() {
      const cardsEl = document.getElementById('mini-dash-cards');
      if (!cardsEl || !miniDashAberto) return;

      let totalGold = 0, totalDiam = 0, totalBalls = 0, contasOk = 0;
      const cards = [];

      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        let st = null, auto = null, balls = 0, ballsObj = {};
        // Defaults — se o try falhar, o card ainda renderiza
        let hbRate = 0, vis = 'hidden', visIcon = '🔴', awake = false;
        if (wv && typeof wv.executeJavaScript === 'function') {
          try {
            const res = await wv.executeJavaScript(`(function(){
              try {
                var out = { status: null, auto: null, balls: 0, ballsObj: {} };
                if (typeof window.__obterDashboardStatus === 'function') out.status = window.__obterDashboardStatus();
                if (typeof window.__getIdleAuto === 'function') out.auto = window.__getIdleAuto();
                var w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                var b = (w.gameState && w.gameState.balls) || (w.K && w.K.balls) || {};
                for (var k in b) { out.balls += Number(b[k] || 0); out.ballsObj[k] = Number(b[k] || 0); }
                var diag = { vis: (document.visibilityState || (document.hidden ? 'hidden' : 'visible')), hidden: !!document.hidden };
                try {
                  if (!window.__mdHb) { window.__mdHb = 0; window.__mdHbT = setInterval(function(){ window.__mdHb++; }, 200); window.__mdRaf = 0; (function lp(){ window.__mdRaf++; requestAnimationFrame(lp); })(); }
                  diag.hb = window.__mdHb || 0; diag.raf = window.__mdRaf || 0;
                } catch(e3) {}
                out.diag = diag;
                return out;
              } catch(e2) { return { error: String(e2) }; }
            })()`);
            if (res && !res.error) { st = res.status; auto = res.auto; balls = res.balls; ballsObj = res.ballsObj || {}; }
            const d = (res && res.diag) || {};
            const prevD = mdDiagPrev[i] || { hb: d.hb || 0, t: Date.now() };
            const dtSec = Math.max(0.2, (Date.now() - prevD.t) / 1000);
            hbRate = Math.max(0, Math.round(((d.hb || 0) - prevD.hb) / dtSec));
            mdDiagPrev[i] = { hb: d.hb || 0, t: Date.now() };
            vis = d.vis || (st ? 'visible' : 'hidden');
            visIcon = vis === 'visible' ? '🟢' : (vis === 'hidden' ? '🟡' : '🔴');
            awake = hbRate >= 3;
          } catch (e2) {}
        }

        const nome = (st && st.trainer) || nomesAbas[i] || ('Conta ' + (i + 1));
        const trainerLv = (st && st.level) || '?';
        const act = (st && st.active) || null;
        const pokeNome = act && act.name ? act.name : '—';
        const pokeLv = act ? act.level : '?';
        const gold = (st && st.gold) || 0;
        const diam = (st && st.diamonds) || 0;
        const bolas = balls || (st && st.inventory && st.inventory.ultraBalls) || 0;

        // ETA vem pronto de __obterDashboardStatus (scripts/37c-dashboard-status-api.js):
        // XP que falta pro próximo nível ÷ taxa de XP/s medida na caçada.
        const etaTreinador = (st && st.trainerEta) || '—';
        const pctTreinador = st && st.xpPct != null ? Math.max(0, Math.min(100, st.xpPct)) : 0;
        const etaPoke = (act && act.expEta) || '—';
        const pctPoke = act && act.expPct != null ? Math.max(0, Math.min(100, act.expPct)) : 0;

        if (st) {
          totalGold += Number(gold || 0);
          totalDiam += Number(diam || 0);
          totalBalls += Number(bolas || 0);
          contasOk++;
        }

        const a = auto || {};
        const tg = (mode, icon, on) => `<div class="md2-tg ${on ? 'on' : ''}" onclick="toggleIdleAuto(${i}, '${mode}', event)">${icon}</div>`;
        const chips = Object.keys(ballsObj || {})
          .filter(k => Number(ballsObj[k]) > 0)
          .sort((x, y) => Number(ballsObj[y]) - Number(ballsObj[x]))
          .slice(0, 5)
          .map(k => `<span class="md2-ball" title="${ballLabel(k)}">${BALL_ICONS[(k || '').toLowerCase()] || '⚪'} ${fmtNum(ballsObj[k])}</span>`)
          .join('') || '<span class="md2-ball">sem bolas</span>';

        // Linha de progresso + ETA. `--` (sem caçada rodando) fica apagado pra
        // não parecer dado carregando.
        const linhaEta = (icon, rotulo, pct, eta, cor) => `
          <div class="md2-eta">
            <div class="md2-eta-top">
              <span class="md2-eta-lb">${icon} ${rotulo}</span>
              <span class="md2-eta-val ${eta === '—' ? 'off' : ''}">⏳ ${eta}</span>
            </div>
            <div class="md2-eta-bar"><i style="width:${pct}%; background:${cor}"></i></div>
          </div>`;

        cards.push(`
          <div class="md2-card ${i === currentTab ? 'active' : ''}" onclick="selectTab(${i})" title="Ir para ${nome}">
            <div class="md2-top">
              <span class="md2-dot ${awake ? 'on' : 'off'}" title="${awake ? 'Acordada (rodando em 2º plano)' : 'Em descanso / throttle'}"></span>
              <div style="min-width:0">
                <div class="md2-name">${nome}</div>
                <div class="md2-sub">Treinador Nv ${trainerLv}</div>
              </div>
              <span class="md2-hb">${visIcon} ${hbRate}/s</span>
            </div>
            <div class="md2-poke"><span>🔥 ${pokeNome}</span><span>Nv ${pokeLv}</span></div>
            ${linhaEta('🧑', 'Treinador ' + pctTreinador + '%', pctTreinador, etaTreinador, '#38bdf8')}
            ${linhaEta('🐾', 'Pokémon ' + pctPoke + '%', pctPoke, etaPoke, '#4ade80')}
            <div class="md2-stats">
              <div class="md2-stat"><div class="v" style="color:#f5a623">${fmtNum(gold)}</div><div class="l">Gold</div></div>
              <div class="md2-stat"><div class="v" style="color:#38bdf8">${fmtNum(diam)}</div><div class="l">Diam</div></div>
              <div class="md2-stat"><div class="v" style="color:#fbbf24">${fmtNum(bolas)}</div><div class="l">Bolas</div></div>
            </div>
            <div class="md2-balls">${chips}</div>
          </div>
        `);
      }

      cardsEl.innerHTML = cards.join('');
      const summaryEl = document.getElementById('mini-dash-summary');
      if (summaryEl) summaryEl.innerHTML = `
        <div class="md2-sum"><div class="l">Ouro Total</div><div class="v" style="color:#f5a623">${fmtNum(totalGold)}</div></div>
        <div class="md2-sum"><div class="l">Diamantes</div><div class="v" style="color:#38bdf8">${fmtNum(totalDiam)}</div></div>
        <div class="md2-sum"><div class="l">Pokébolas</div><div class="v" style="color:#fbbf24">${fmtNum(totalBalls)}</div></div>
        <div class="md2-sum"><div class="l">Online</div><div class="v" style="color:#c4b5fd">${contasOk}/${totalContas}</div></div>
      `;
    }

    async function toggleIdleAuto(i, mode, ev) {
      if (ev) { ev.stopPropagation(); ev.preventDefault(); }
      const wv = webviews[i];
      if (!wv || typeof wv.executeJavaScript !== 'function') return;
      let atual = false;
      try {
        const a = await wv.executeJavaScript("typeof window.__getIdleAuto==='function'?window.__getIdleAuto():null");
        if (a) atual = !!(a[mode]);
      } catch (e2) {}
      try {
        await wv.executeJavaScript("window.__setIdleAuto('" + mode + "', " + (!atual) + ")");
      } catch (e2) {}
      atualizarMiniDashboard();
    }

    function confirmarRenomear() {
      const input = document.getElementById('modal-rename-input');
      const novoNome = (input.value || '').trim();
      if (novoNome) {
        nomesAbas[editandoAbaIndex] = novoNome;
        try {
          localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        } catch(e) {}
        renderizarNomesAbas();
        renderizarAbasClient();
      }
      fecharModalRenomear();
    }

    function forcarRefreshPeloModal() {
      const idx = editandoAbaIndex;
      if (idx < 0 || idx >= totalContas) return;
      fecharModalRenomear();
      if (contasAutoProxyRefresh && contasAutoProxyRefresh[idx]) {
        rotacionarProxyConta(idx);
      }
      mostrarToast(`🔄 Forçando refresh na Conta ${idx + 1} (${nomesAbas[idx] || 'Conta ' + (idx + 1)})...`, '🔄', 'normal', 3000);
      try {
        const wv = webviews[idx];
        if (wv) {
          wv.webContents.session.clearCache().then(() => {
            wv.webContents.session.clearStorageData({ storages: ['cookies', 'sessionstorage', 'localstorage'] }).then(() => {
              wv.reload();
              mostrarToast(`✅ Cache limpo e reload executado na Conta ${idx + 1}!`, '✅', 'toast-success', 3000);
            }).catch(() => { wv.reload(); });
          }).catch(() => { wv.reload(); });
        }
      } catch(e) {
        mostrarToast(`❌ Erro ao fazer refresh: ${e.message}`, '❌', 'normal', 3000);
      }
    }

    // ================================================================

// ===== 18-verificador-ip-real-proxies.js =====

    function fecharModalSeFora(event, modalId) {
      if (event.target && event.target.id === modalId) {
        document.getElementById(modalId).classList.remove('active');
      }
    }

    // Listener para teclas no input do modal de renomeação
    document.getElementById('modal-rename-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmarRenomear();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        fecharModalRenomear();
        e.preventDefault();
      }
    });

    // Listener para teclas no input de quantidade do Trade

// ===== 19-monitor-latencia-ping.js =====
    //  ⚡ MONITOR DE LATÊNCIA (PING MS) POR CONTA / PROXY
    // ================================================================
    let pingMonitoringTimer = null;

    // O ponto de ping NAO tem mais tooltip proprio.
    //
    // Ele tinha um: um `<div>` flutuante no body, porque `title` nativo nao
    // aparece em descendente de elemento `draggable` (a aba). O problema e que
    // esse balao nascia colado ao ponto, ou seja, EM CIMA da aba — e o card do
    // time (shell/50) abre ali tambem. Os dois se sobrepunham, e o de cima era
    // justamente o que tinha menos informacao.
    //
    // A latencia agora e uma linha DENTRO do card. O ponto colorido continua
    // sendo o aviso de relance ("bem / ruim / caiu"); o numero em ms mora no
    // card, junto do resto do que se quer saber da conta.

    // Ultima leitura de ping por conta, para o card do time. Indexado por
    // conta, entao viaja junto na reordenacao de abas (`moverMapa`, shell/11).
    const pingPorConta = {};

    // Busca o Pokémon ativo de cada conta e atualiza a aba na sidebar
    const pokemonAtivoCache = {};
    // ⚠️ UMA TRAVESSIA DE PROCESSO POR CONTA, NAO TRES.
    // Cada `executeJavaScript` e um ida-e-volta pro processo daquela conta. O
    // loop chamava tres por conta (ping, info do pokemon, nick) a cada 3,5 s —
    // com 11 contas davam 9,4 travessias por segundo, sem parar. Agora o loop
    // usa `varrerContaEmLote`, que pergunta as duas coisas de uma vez so: 3,1/s.
    //
    // ⚠️ Isto NAO mexe em background throttling. As contas continuam todas
    // rodando a todo vapor (`backgroundThrottling:false` no main.js + os
    // switches de linha de comando + `manterWebviewAcorda`). O que diminuiu foi
    // o custo de FICAR PERGUNTANDO, nao o que a conta faz.

    // Pinta na aba o que veio do jogo. Separado do fetch porque os dois
    // caminhos (varredura em lote e chamada avulsa) escrevem a mesma coisa.
    function aplicarInfoPokeAba(index, d) {
      if (!d) return;
      try {
        // O cache e gravado ANTES de qualquer condicao de pokemon ativo: o
        // hover do time (shell/50) le daqui, e uma conta parada — sem pokemon
        // ativo, mas com time montado — mostrava um balao vazio quando isto
        // ficava dentro do `if (d.poke)`.
        pokemonAtivoCache[index] = d;
        if (typeof atualizarHoverTimeAba === 'function') atualizarHoverTimeAba(index);
        // O sprite da aba sai daqui: e o unico ponto onde o nome do pokemon
        // ativo chega, e ele muda sozinho quando o Auto Hunt troca de bicho.
        if (d.poke && typeof pintarSpriteAba === 'function') pintarSpriteAba(index, d.poke);
        const pokeEl = document.getElementById(`tab-poke-${index}`);
        const btnEl = document.getElementById(`tab-${index}`);
        const nome = nomesAbas[index] || `Conta ${index + 1}`;
        if (pokeEl && d.poke) {
          const lvStr = d.lv ? ` Lv.${d.lv}` : '';
          pokeEl.textContent = `${d.poke}${lvStr}`;
          pokeEl.style.color = '#94a3b8';
        } else if (pokeEl) {
          pokeEl.textContent = '…';
          pokeEl.style.color = '#475569';
        }
        // O `title` nativo da aba foi REMOVIDO. Ele trazia treinador,
        // particao, pokemon ativo e as dicas de uso — e o balao do Chromium
        // nascia por cima do card do time, escondendo os sprites atras de um
        // texto que o card ja diz melhor. Tudo isso agora e o cabecalho e o
        // rodape do card (shell/50).
        if (btnEl) btnEl.removeAttribute('title');
      } catch(e) {}
    }

    async function atualizarPokemonAtivoAba(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const info = await wv.executeJavaScript(
          'typeof window.__getTabInfo==="function"?window.__getTabInfo():"{}"'
        );
        if (info) aplicarInfoPokeAba(index, JSON.parse(info));
      } catch(e) {}
    }

    // Ping + info do pokemon numa chamada so.
    async function varrerContaEmLote(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const r = await wv.executeJavaScript(`
          (async function() {
            const saida = { ping: -1, info: null };
            try {
              const t0 = performance.now();
              await fetch('/api/state?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
              saida.ping = Math.round(performance.now() - t0);
            } catch(e) {}
            try {
              if (typeof window.__getTabInfo === 'function') saida.info = window.__getTabInfo();
            } catch(e) {}
            return saida;
          })()
        `);
        if (!r) { atualizarBadgePingAba(index, -1); return; }
        atualizarBadgePingAba(index, r.ping);
        if (r.info) {
          try { aplicarInfoPokeAba(index, JSON.parse(r.info)); } catch (e) { }
        }
      } catch(e) {
        atualizarBadgePingAba(index, -1);
      }
    }

    async function medirPingConta(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const pingMs = await wv.executeJavaScript(`
          (async function() {
            try {
              const t0 = performance.now();
              await fetch('/api/state?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
              return Math.round(performance.now() - t0);
            } catch(e) {
              return -1;
            }
          })()
        `);
        atualizarBadgePingAba(index, pingMs);
      } catch(e) {
        atualizarBadgePingAba(index, -1);
      }
    }

    function atualizarBadgePingAba(index, pingMs) {
      const dot = document.getElementById(`tab-ping-${index}`);
      if (!dot) return;

      // ⚠️ ERA UM BADGE COM O NÚMERO ("104ms"). Com o sprite do Pokémon entrando
      // na aba, o número passou a disputar a mesma linha do nome — e o valor
      // exato do ping quase nunca é o que se quer saber: o que importa é
      // "está bem / está ruim / caiu". Virou um ponto colorido, e o número
      // completo ficou no tooltip pra quem precisar.
      dot.classList.remove('bom', 'medio', 'ruim', 'morto');
      let texto;
      if (pingMs <= 0 || pingMs === -1) {
        dot.classList.add('morto');
        texto = 'Sem resposta do servidor';
      } else if (pingMs < 90) {
        dot.classList.add('bom');
        texto = `Conexão excelente — ${pingMs} ms`;
      } else if (pingMs < 200) {
        dot.classList.add('medio');
        texto = `Conexão boa / proxy estável — ${pingMs} ms`;
      } else {
        dot.classList.add('ruim');
        texto = `Latência alta — ${pingMs} ms`;
      }
      // Sem `title` e sem `data-tip` no ponto: o nativo nunca aparecia (ponto
      // e descendente de elemento arrastavel) e o flutuante brigava com o card.
      // O texto vai pro card do time.
      pingPorConta[index] = { ms: pingMs, texto: texto, classe: dot.className.replace('tab-ping-dot', '').trim() };
      if (typeof atualizarHoverTimeAba === 'function') atualizarHoverTimeAba(index);
    }

    // Detecção Automática do Nome do Personagem ao Logar
    //
    // Antes so tentava ler globais da pagina (`K.player.name`, `gameState...`)
    // e um seletor `#stat-jog-name` que NAO EXISTE no jogo (0 ocorrencias em
    // play.html/app-1.js/game.js) — por isso a aba nova nunca era renomeada
    // depois do login/cadastro. A fonte confiavel e a mesma que o proprio
    // Idle Suite usa: GET /api/state -> state.player.name. O token fica em
    // sessionStorage.pmi_tab_token / localStorage.pmi_token, que sao lidos
    // igual em qualquer mundo de execucao (ao contrario dos globais da pagina,
    // invisiveis quando o executeJavaScript cai em mundo isolado).
    async function checarNomePersonagemWebview(index) {
      const wv = webviews[index];
      if (!wv) return;

      // ⚠️ PORTÃO DE CUSTO — regressão introduzida em 2026-09-02 nesta mesma
      // função. Ao consertar o auto-nick eu troquei a leitura de globais (de
      // graça) por um `fetch('/api/state?token=')`. Só que o loop de ping chama
      // isto para TODA conta a cada 3,5 s: com 11 contas viraram ~3 requisições
      // HTTP por segundo ao servidor, para sempre — inclusive para abas que já
      // têm o nome do personagem e nunca mais seriam renomeadas.
      //
      // A renomeação só acontece enquanto o nome ainda é o padrão ("Conta N").
      // Então a checagem cara só precisa rodar nesse caso. Uma aba já nomeada
      // sai do circuito e não custa mais nada.
      const nomeAtualRapido = (nomesAbas[index] || '').trim();
      if (nomeAtualRapido && !/^Conta\s*\d+$/i.test(nomeAtualRapido)) return;

      try {
        const nick = await wv.executeJavaScript(`
          (async function() {
            function limpar(v) {
              if (!v || typeof v !== 'string') return null;
              const t = v.replace(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/gu, '')
                         .replace(/Treinador/gi, '').trim();
              return t.length >= 2 ? t : null;
            }
            try {
              // 1. Ponte do proprio Idle Suite, quando ja injetado.
              if (typeof window.__obterDashboardStatus === 'function') {
                const d = window.__obterDashboardStatus();
                const n = limpar(d && d.player && d.player.trainer);
                if (n) return n;
              }
            } catch(e) {}
            try {
              // 2. Globais da pagina (so funcionam no mundo principal).
              const w = window;
              const cand = (w.K && w.K.player && w.K.player.name)
                        || (w.S && w.S.player && w.S.player.name)
                        || (w.gameState && w.gameState.player && w.gameState.player.name)
                        || (w.__gameState && w.__gameState.player && w.__gameState.player.name);
              const n = limpar(cand);
              if (n) return n;
            } catch(e) {}
            try {
              // 3. Fonte de verdade: /api/state.
              let tok = '';
              try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e) {}
              if (!tok || tok.length < 10) { try { tok = localStorage.getItem('pmi_token') || ''; } catch(e) {} }
              if ((!tok || tok.length < 10) && typeof window.q === 'string') tok = window.q;
              if (tok && tok.length >= 10) {
                const r = await fetch('/api/state?token=' + encodeURIComponent(tok)).then(x => x.json()).catch(() => null);
                const n = limpar(r && r.state && r.state.player && r.state.player.name);
                if (n) return n;
              }
            } catch(e) {}
            try {
              // 4. Ultimo recurso: painel do jogador no DOM (#pp-name).
              const el = document.getElementById('pp-name')
                      || document.querySelector('.trainer-name')
                      || document.getElementById('player-name');
              const n = limpar(el && el.textContent);
              if (n) return n;
            } catch(e) {}
            return null;
          })()
        `);

        if (!nick || typeof nick !== 'string') return;
        if (nick.length < 2 || nick === 'Carregando...' || /^conta\s*\d+$/i.test(nick)) return;

        const nomeAtual = (nomesAbas[index] || '').trim();
        // So renomeia enquanto a aba ainda tem nome padrao — nome escolhido
        // pelo usuario no modal de renomear continua mandando.
        const ehNomePadrao = !nomeAtual || /^Conta\s*\d+$/i.test(nomeAtual);
        if (!ehNomePadrao || nomeAtual === nick) return;

        console.log(`[Auto-Nick] Conta ${index + 1}: personagem '${nick}' detectado — renomeando aba.`);
        nomesAbas[index] = nick;
        try {
          localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        } catch(e) {}

        // Credencial guardada da conta tambem acompanha o nick, senao o modal
        // de gerenciar continua mostrando "Conta N".
        try {
          if (Array.isArray(listaCredenciais) && listaCredenciais[index]) {
            const cu = (listaCredenciais[index].user || '').trim();
            if (!cu || /^Conta\s*\d+$/i.test(cu)) {
              listaCredenciais[index].user = nick;
              localStorage.setItem('idlePokemonAccountCredentials', JSON.stringify(listaCredenciais));
            }
          }
        } catch(e) {}

        const titleEl = document.getElementById(`tab-title-${index}`);
        if (titleEl) titleEl.textContent = nick;

        const headerEl = document.getElementById(`header-title-${index}`);
        if (headerEl) headerEl.textContent = `🎮 ${nick} (persist:acc${index + 1})`;

        // Nada de `title` na aba (ver acima): nome, particao e dicas de uso
        // sao do card do time agora, e o balao nativo cobriria o card.

        if (typeof mostrarToast === 'function') {
          mostrarToast(`Aba ${index + 1} renomeada para "${nick}"`, '🏷️', 'success', 2600);
        }
      } catch(e) {}
    }

    function iniciarLoopMonitoramentoPing() {
      if (pingMonitoringTimer) clearInterval(pingMonitoringTimer);
      pingMonitoringTimer = setInterval(() => {
        for (let i = 0; i < totalContas; i++) {
          varrerContaEmLote(i);
          // Fica de fora do lote de proposito: com o portao de custo abaixo ela
          // custa ZERO em aba ja nomeada, e so faz a chamada cara enquanto o
          // nome ainda e "Conta N".
          checarNomePersonagemWebview(i);
        }
      }, 3500);
      setTimeout(() => {
        for (let i = 0; i < totalContas; i++) {
          varrerContaEmLote(i);
          checarNomePersonagemWebview(i);
        }
      }, 1500);
    }

    // Memorizador de Login Inteligente na Webview (Salva e Preenche Direto na Tela do Jogo)
    //
    // Tres bugs corrigidos aqui (reportados em 2026-09-02):
    //
    // 1. Aba nova ja nascia com o campo de usuario preenchido. Causa: o fill
    //    usava `localStorage.getItem('idle_saved_user') || "<nome da aba>"`,
    //    ou seja, SEM credencial salva ele escrevia "Conta 5" no campo. Agora
    //    o fallback nao existe: sem credencial salva, campo vazio.
    //
    // 2. Apagar o campo nao adiantava — o texto voltava sozinho. Causa: o
    //    `setInterval(instalarLembrarLogin, 800)` reexecutava o fill a cada
    //    800ms e a unica guarda era `!uInput.value`; assim que o usuario
    //    esvaziava, o proximo tick reescrevia. Agora o preenchimento e feito
    //    UMA vez por carregamento de pagina e qualquer digitacao/apagamento do
    //    usuario marca o formulario como "tocado", travando o fill de vez.
    //
    // 3. Preenchia tambem o CADASTRO. Causa: o jogo reaproveita os MESMOS
    //    inputs (#li-name/#li-pass) nas duas abas — so troca a classe .active
    //    entre #li-tab-login e #li-tab-register e revela #li-pass2. O fill nao
    //    olhava isso. Agora, em modo cadastro, nao preenche nada e ainda limpa
    //    o que tenha sido preenchido antes da troca de aba.
    function injetarAutoLogin(wv, index) {
      wv.executeJavaScript(`
        (function() {
          if (window.__idleLoginAddon) return;
          window.__idleLoginAddon = true;

          // Limpeza do estrago da versao anterior: ela chegava a SALVAR
          // "Conta N" como usuario (bastava dar Enter no formulario com o
          // campo pre-preenchido). Sem isso, a particao ja contaminada
          // continuaria preenchendo sozinha mesmo com o bug corrigido.
          try {
            var _su = localStorage.getItem('idle_saved_user') || '';
            if (/^Conta\\s*\\d+$/i.test(_su)) localStorage.removeItem('idle_saved_user');
          } catch(e) {}

          var preenchido = false;   // ja preencheu nesta carga de pagina
          var tocado = false;       // usuario digitou/apagou -> nunca mais preenche

          function campos() {
            var u = document.getElementById('li-name');
            var p = document.getElementById('li-pass');
            if (!u) u = document.querySelector('input[name="username"]');
            if (!p) p = document.querySelector('input[type="password"]');
            return (u && p) ? { u: u, p: p } : null;
          }

          // O jogo usa os mesmos inputs pra Entrar e pra Criar conta.
          // #li-tab-register.active (ou #li-pass2 visivel) = modo cadastro.
          function modoCadastro() {
            var tabReg = document.getElementById('li-tab-register');
            if (tabReg && tabReg.classList.contains('active')) return true;
            var p2 = document.getElementById('li-pass2');
            if (p2 && p2.offsetParent !== null) return true;
            return false;
          }

          function lembrarLigado() {
            try { return localStorage.getItem('idle_remember_login') !== '0'; } catch(e) { return true; }
          }

          function marcarTocado() { tocado = true; }

          function preencher(c) {
            if (tocado || preenchido) return;
            if (modoCadastro()) return;
            if (!lembrarLigado()) return;
            var su = '', sp = '';
            try {
              su = localStorage.getItem('idle_saved_user') || '';
              sp = localStorage.getItem('idle_saved_pass') || '';
            } catch(e) {}
            // Sem credencial salva nao inventa nada (era daqui que saia o
            // "Conta N" pre-preenchido numa aba recem-criada).
            if (!su && !sp) return;
            if (su && !c.u.value) {
              c.u.value = su;
              c.u.dispatchEvent(new Event('input', { bubbles: true }));
              c.u.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (sp && !c.p.value) {
              c.p.value = sp;
              c.p.dispatchEvent(new Event('input', { bubbles: true }));
              c.p.dispatchEvent(new Event('change', { bubbles: true }));
            }
            preenchido = true;
          }

          function salvarCredenciais(c) {
            var chk = document.getElementById('chk-remember-login-input');
            var lem = chk ? chk.checked : true;
            try {
              localStorage.setItem('idle_remember_login', lem ? '1' : '0');
              if (lem) {
                if (c.u.value) localStorage.setItem('idle_saved_user', c.u.value);
                if (c.p.value) localStorage.setItem('idle_saved_pass', c.p.value);
              } else {
                localStorage.removeItem('idle_saved_user');
                localStorage.removeItem('idle_saved_pass');
              }
            } catch(e) {}
          }

          function instalarAddon(c) {
            if (document.getElementById('chk-remember-login-addon')) return true;

            var container = document.createElement('div');
            container.id = 'chk-remember-login-addon';
            container.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:6px; margin:8px 0 4px 0; font-size:11.5px; color:#cbd5e1; font-weight:bold; cursor:pointer; user-select:none; font-family:sans-serif';
            var isChecked = lembrarLigado();
            container.innerHTML = '<label style="display:flex; align-items:center; gap:6px; cursor:pointer"><input type="checkbox" id="chk-remember-login-input" ' + (isChecked ? 'checked' : '') + ' style="accent-color:#eab308; width:15px; height:15px; cursor:pointer" /> <span>Lembrar login e senha</span></label>';

            var btnLogin = document.getElementById('btn-login')
              || document.querySelector('#login button.btn-primary')
              || document.querySelector('#login button[type="submit"]')
              || document.querySelector('.login-btn');
            if (btnLogin && btnLogin.parentNode) {
              btnLogin.parentNode.insertBefore(container, btnLogin);
              btnLogin.addEventListener('click', function() { salvarCredenciais(c); });
            } else if (c.p.parentNode) {
              c.p.parentNode.appendChild(container);
            }

            // Desmarcar "lembrar" apaga o que estava guardado na hora, senao o
            // usuario desmarca, recarrega e o texto volta assim mesmo.
            var chk = document.getElementById('chk-remember-login-input');
            if (chk) {
              chk.addEventListener('change', function() {
                marcarTocado();
                salvarCredenciais(c);
              });
            }

            // Qualquer edicao do usuario (inclusive apagar) desliga o fill.
            ['input', 'keydown', 'paste', 'cut'].forEach(function(ev) {
              c.u.addEventListener(ev, marcarTocado);
              c.p.addEventListener(ev, marcarTocado);
            });
            c.u.addEventListener('keydown', function(e) { if (e.key === 'Enter') salvarCredenciais(c); });
            c.p.addEventListener('keydown', function(e) { if (e.key === 'Enter') salvarCredenciais(c); });

            // Trocar pra aba "Criar conta" limpa o que o fill tinha colocado.
            var tabReg = document.getElementById('li-tab-register');
            if (tabReg) {
              tabReg.addEventListener('click', function() {
                if (!tocado && preenchido) { c.u.value = ''; c.p.value = ''; }
                tocado = true;
              });
            }
            return true;
          }

          // O formulario de login pode ainda nao existir quando o script roda.
          // Espera ele aparecer, instala UMA vez e para o watchdog — o loop
          // eterno de 800ms era justamente o que ressuscitava o texto apagado.
          var tentativas = 0;
          var t = setInterval(function() {
            var c = campos();
            if (c) {
              instalarAddon(c);
              preencher(c);
              clearInterval(t);
              return;
            }
            if (++tentativas > 75) clearInterval(t);   // ~60s
          }, 800);
        })();
      `).catch(() => {});
    }

    // Carrega o script do tampermonkey da memória
    async function carregarScriptTamper() {
      try {
        tamperScriptCache = await ipcRenderer.invoke('get-tamper-script');
        console.log('[IdleSuite] Script Suite carregado:', tamperScriptCache ? tamperScriptCache.length : 0, 'bytes');
      } catch(e) {
        console.error('[IdleSuite] Erro ao carregar script suite:', e);
      }
    }

    let activeDisplayInfo = null;

    // Injeta os scripts em uma webview de forma segura
    // ⚠️ NÃO injeta o script principal até o jogo estar logado (#topbar)
    // para evitar bloquear o Cloudflare Turnstile e o botão ENTRAR.
    const _injetadoPorConta = {};  // controla injeção por conta
    function injetarScriptNaWebview(wv, index) {
      // Auto-preenchimento / Auto-Login (pode rodar na tela de login)
      injetarAutoLogin(wv, index);

      // Se já injetamos o script principal para esta conta, não repete
      if (_injetadoPorConta[index]) return;

      if (!tamperScriptCache) {
        const warnMsg = `[Conta ${index + 1}] tamperScriptCache vazio!`;
        console.warn(warnMsg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-WARN', mensagem: warnMsg });
        return;
      }

      // Verifica se o jogo já logou (presença de #topbar)
      wv.executeJavaScript('!!document.getElementById("topbar")').then(loggedIn => {
        if (loggedIn) {
          // Jogo logado — injeta direto
          _injetarScriptPrincipal(wv, index);
        } else {
          // Tela de login — espera o login com polling (máx 5 min)
          const msg = `[Conta ${index + 1}] Aguardando login para injetar script...`;
          console.log(msg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: msg });
          let tentativas = 0;
          const checkLogin = setInterval(() => {
            tentativas++;
            if (tentativas > 300) { clearInterval(checkLogin); return; } // 5 min timeout
            wv.executeJavaScript('!!document.getElementById("topbar")').then(ok => {
              if (ok) {
                clearInterval(checkLogin);
                _injetarScriptPrincipal(wv, index);
              }
            }).catch(() => {}); // webview pode ter recarregado
          }, 1000);
          // Salva referência para cancelar se navegar
          if (!wv.__loginPollTimers) wv.__loginPollTimers = [];
          wv.__loginPollTimers.push(checkLogin);
        }
      }).catch(() => {}); // webview fechada ou erro
    }

    function _injetarScriptPrincipal(wv, index) {
      if (_injetadoPorConta[index]) return;
      _injetadoPorConta[index] = true;
      // Cancela polls anteriores
      if (wv.__loginPollTimers) {
        wv.__loginPollTimers.forEach(t => clearInterval(t));
        wv.__loginPollTimers = [];
      }
      const scriptSize = tamperScriptCache.length;
      ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: `[Conta ${index + 1}] Jogo logado! Injetando script (${scriptSize} bytes)...` });
      wv.executeJavaScript(tamperScriptCache)
        .then(() => {
          const okMsg = `[Conta ${index + 1}] Script injetado OK (${scriptSize} bytes)`;
          console.log(okMsg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: okMsg });
          if (activeDisplayInfo) {
            wv.executeJavaScript(`
              if (typeof window.__setMonitorInfo === 'function') {
                window.__setMonitorInfo(${JSON.stringify(activeDisplayInfo)});
              }
              `).catch(() => {});
          }
        })
        .catch(err => {
          _injetadoPorConta[index] = false; // permite retry
          const errMsg = `[Conta ${index + 1}] ERRO ao injetar suite: ${err.message}`;
          console.error(errMsg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-ERR', mensagem: errMsg });
        });
    }

    // Mantém a webview "acorda" (sem throttle de timers/rAF) mesmo quando a aba não está
    // visível, para que Auto Hunt / Auto Catch / Auto Sell / Auto Buy rodem em segundo plano
    // continuamente. O backgroundThrottling:false da BrowserWindow NÃO alcança as <webview> filhas.
    function manterWebviewAcorda(wv) {
      // Estratégia 1: IPC para o main process (mais confiável no Electron 30+)
      try {
        const wcId = wv.getWebContentsId && wv.getWebContentsId();
        if (wcId) ipcRenderer.invoke('disable-webview-throttling', wcId).catch(() => {});
      } catch(e) {}
      // Estratégia 2: Acesso direto ao webContents (fallback para versões mais antigas)
      try {
        const wc = (wv.webContents) || (typeof wv.getWebContents === 'function' && wv.getWebContents());
        if (wc && typeof wc.setBackgroundThrottling === 'function') wc.setBackgroundThrottling(false);
      } catch (e) {}
    }


    // === WATCHDOG & AUTO-RECONEXÃO INTELIGENTE (5 SEGUNDOS) ===

// ===== 20-watchdog-auto-reconexao.js =====
    const reconexaoTimers = {};
    const reconexaoContadores = {};

    function iniciarReconexaoAutomatica(index, motivo = 'Erro de Conexão') {
      if (reconexaoTimers[index]) return; // Já está em contagem regressiva ativa

      const nomeAba = nomesAbas[index] || `Conta ${index + 1}`;
      console.warn(`[Watchdog] Queda detectada na Conta ${index + 1} (${nomeAba}): ${motivo}. Reconectando em 5s...`);
      
      const tabEl = document.querySelector(`.tab-item[data-tab="${index}"]`);
      if (tabEl) tabEl.classList.add('tab-reconnecting');

      reconexaoContadores[index] = 5;
      mostrarToast(`⚠️ <b>${nomeAba}</b> desconectada (${motivo}). Reconectando em <b>5s</b>...`, '🔄', 'normal', 5000);

      reconexaoTimers[index] = setInterval(() => {
        reconexaoContadores[index]--;
        const seg = reconexaoContadores[index];
        
        if (tabEl) {
          const titleEl = tabEl.querySelector('.tab-title');
          if (titleEl) titleEl.textContent = `⚠️ Reconectando (${seg}s)...`;
        }

        if (seg <= 0) {
          clearInterval(reconexaoTimers[index]);
          delete reconexaoTimers[index];
          delete reconexaoContadores[index];
          console.log(`[Watchdog] Executando reload automático na Conta ${index + 1}...`);
          try {
            const wv = webviews[index];
            if (wv) {
              wv.loadURL('https://idlepokemoon.com.br/play');
            }
          } catch(e) {
            try { if (webviews[index]) webviews[index].reload(); } catch(e2) {}
          }
        }
      }, 1000);
    }

    function cancelarReconexaoAutomatica(index) {
      if (reconexaoTimers[index]) {
        clearInterval(reconexaoTimers[index]);
        reconexaoTimers[index] = null;
      }
      reconexaoContadores[index] = 0;
      const tabEl = document.querySelector(`.tab-item[data-tab="${index}"]`);
      if (tabEl) {
        tabEl.classList.remove('tab-reconnecting');
        const titleEl = tabEl.querySelector('.tab-title');
        if (titleEl) titleEl.textContent = nomesAbas[index] || `Conta ${index + 1}`;
      }
    }

    // Configura eventos de cada webview dinamicamente
    function conectarEventosWebview(wv, indiceInicial) {
      if (!wv || wv.__conectado) return;
      wv.__conectado = true;

      // ⚠️ A ABA PODE MUDAR DE LUGAR. Reordenar arrastando MOVE o <webview> no
      // DOM em vez de recriar o elemento — e e isso que faz a SESSAO do jogo
      // viajar junto com a aba (o `partition` e imutavel depois que o elemento
      // e anexado, entao recriar significaria trocar de conta). Consequencia:
      // um indice capturado no closure envelhece na primeira reordenacao, e os
      // eventos passariam a falar da conta errada — log da conta errada,
      // reconexao na conta errada, script injetado na conta errada.
      // Por isso todo handler le a posicao ATUAL do elemento; `indiceInicial`
      // fica so como rede pro instante em que a webview ainda nao entrou em
      // `webviews`.
      const idxAtual = () => {
        const i = webviews.indexOf(wv);
        return i >= 0 ? i : indiceInicial;
      };

      try { wv.addEventListener('did-attach', () => manterWebviewAcorda(wv)); } catch(e) {}

      // Reseta flag de injeção quando a webview recarrega
      wv.addEventListener('did-start-loading', () => {
        _injetadoPorConta[idxAtual()] = false;
        if (wv.__loginPollTimers) {
          wv.__loginPollTimers.forEach(t => clearInterval(t));
          wv.__loginPollTimers = [];
        }
      });

      wv.addEventListener('dom-ready', () => {
        cancelarReconexaoAutomatica(idxAtual());
        const msg = `[Conta ${idxAtual() + 1}] DOM Ready. URL: ${wv.getURL()}`;
        console.log(msg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV', mensagem: msg });
        manterWebviewAcorda(wv);
        try {
          if (typeof wv.setAudioMuted === 'function') {
            wv.setAudioMuted(isMuted);
          }
          wv.setZoomFactor(zoomAlvoAtual());
        } catch(e) {}
        injetarScriptNaWebview(wv, idxAtual());
        // O zoom acima às vezes é sobrescrito pelo próprio carregamento da
        // página um instante depois do dom-ready (a página ainda está de pé,
        // algo nela mexe no viewport) — sintoma: reabrir em modo Grid mostra
        // 100% até trocar pra Abas e voltar pro Grid manualmente. Reaplicando
        // mais duas vezes, depois que a página já assentou, sem custo real
        // (setZoomFactor é idempotente).
        setTimeout(() => { try { wv.setZoomFactor(zoomAlvoAtual()); } catch(e) {} }, 800);
        setTimeout(() => { try { wv.setZoomFactor(zoomAlvoAtual()); } catch(e) {} }, 2500);
        setTimeout(() => notificarAjusteGrid(isGridMode), 800);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 2000);
        setTimeout(() => {
          try {
            if (typeof sincronizarSilencioComWebview === 'function' && typeof isContaSilenciada === 'function') {
              sincronizarSilencioComWebview(idxAtual(), isContaSilenciada(idxAtual()));
            }
          } catch (e) {}
        }, 3000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 5000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 10000);
      });

      wv.addEventListener('did-fail-load', (e) => {
        const errDesc = e.errorDescription || `Erro ${e.errorCode}`;
        const msg = `[Conta ${idxAtual() + 1}] did-fail-load: ${errDesc} (code: ${e.errorCode})`;
        console.error(msg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-ERR', mensagem: msg });
        if (e.errorCode !== -3) {
          iniciarReconexaoAutomatica(idxAtual(), errDesc);
        }
      });

      wv.addEventListener('did-navigate', (e) => {
        const navMsg = `[Conta ${idxAtual() + 1}] Navegou: ${e.url}`;
        console.log(navMsg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-NAV', mensagem: navMsg });
        manterWebviewAcorda(wv);
        // Reset flag de injeção — navegação pode ser novo login
        _injetadoPorConta[idxAtual()] = false;
        setTimeout(() => {
          injetarScriptNaWebview(wv, idxAtual());
          notificarAjusteGrid(isGridMode);
          checarNomePersonagemWebview(idxAtual());
        }, 1000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 3000);
      });

      wv.addEventListener('did-navigate-in-page', () => {
        manterWebviewAcorda(wv);
        _injetadoPorConta[idxAtual()] = false;
        setTimeout(() => {
          injetarScriptNaWebview(wv, idxAtual());
          notificarAjusteGrid(isGridMode);
          checarNomePersonagemWebview(idxAtual());
        }, 1000);
        setTimeout(() => checarNomePersonagemWebview(idxAtual()), 3000);
      });

      wv.addEventListener('console-message', (e) => {
        const msg = e.message || '';
        if (msg.includes('[SHINY_FOUND]') || msg.includes('[BOSS_FOUND]') || msg.includes('[MYTHIC_FOUND]') || msg.includes('[LEGENDARY_FOUND]')) {
          console.log(`[TROFÉU] Conta ${idxAtual() + 1}: ${msg}`);
        }
        if (msg.includes('[SHINY_FOUND]')) {
          try {
            const jsonPart = msg.split('[SHINY_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            dispararToastShiny(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon');
          } catch(err) {
            console.warn('[TROFÉU] Erro ao parsear SHINY_FOUND:', err);
            dispararToastShiny(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, '', 'Pokémon');
          }
        }
        // Detecção de Boss e Mítico
        if (msg.includes('[BOSS_FOUND]')) {
          try {
            const jsonPart = msg.split('[BOSS_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'boss');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear BOSS_FOUND:', err); }
        }
        if (msg.includes('[MYTHIC_FOUND]')) {
          try {
            const jsonPart = msg.split('[MYTHIC_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'mythic');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear MYTHIC_FOUND:', err); }
        }
        if (msg.includes('[LEGENDARY_FOUND]')) {
          try {
            const jsonPart = msg.split('[LEGENDARY_FOUND]')[1].trim();
            const data = JSON.parse(jsonPart);
            adicionarHistoricoTrofeu(idxAtual(), nomesAbas[idxAtual()] || `Conta ${idxAtual() + 1}`, data.trainer || '', data.pokemon || 'Pokémon', 'legendary');
          } catch(err) { console.warn('[TROFÉU] Erro ao parsear LEGENDARY_FOUND:', err); }
        }
        if (msg.includes('[BUG SUITE]')) {
          console.log(`%c[${nomesAbas[idxAtual()] || ('Conta ' + (idxAtual() + 1))}] ${msg}`, 'color: #38bdf8; font-weight: bold;');
        }
        if (msg.includes('[HUNT_RESET_ALL]')) {
          console.log(`[Hunt Analyse] Reset global disparado pela Conta ${idxAtual() + 1} via console-message`);
          reiniciarHuntAnalyseTodasAbas(idxAtual());
        }
      });

      // Fallback nativo via page-title-updated caso console-message não seja interceptado
      wv.addEventListener('page-title-updated', (e) => {
        const t = e.title || '';
        if (t.startsWith('__HUNT_RESET_ALL__')) {
          console.log(`[Hunt Analyse] Reset global detectado pela Conta ${idxAtual() + 1} via page-title-updated`);
          reiniciarHuntAnalyseTodasAbas(idxAtual());
        }
      });
    }

    let _ultimoHuntResetGlobalTs = 0;
    function reiniciarHuntAnalyseTodasAbas(origemIdx = -1) {
      const agora = Date.now();
      if (agora - _ultimoHuntResetGlobalTs < 800) return;
      _ultimoHuntResetGlobalTs = agora;

      const todasWvs = new Set();
      if (typeof webviews !== 'undefined' && Array.isArray(webviews)) {
        webviews.forEach(wv => { if (wv) todasWvs.add(wv); });
      }
      document.querySelectorAll('webview').forEach(wv => { if (wv) todasWvs.add(wv); });

      const totalAlvo = todasWvs.size;
      const logMsg = `[Hunt Analyse] Propagando reset para ${totalAlvo} webviews (Origem: Conta ${origemIdx + 1})`;
      console.log(logMsg);
      try {
        if (typeof ipcRenderer !== 'undefined' && ipcRenderer.send) {
          ipcRenderer.send('write-debug-log', { tipo: 'HUNT-RESET-ALL', mensagem: logMsg });
        }
      } catch (e) {}

      const scriptReset = `
        (async () => {
          try {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            if (typeof w.__haExecutarResetHunt === 'function') {
              return await w.__haExecutarResetHunt('global');
            }
            if (typeof window.__haExecutarResetHunt === 'function') {
              return await window.__haExecutarResetHunt('global');
            }

            // Fallback completo e autocontido
            try {
              if (w.K && w.K.hunt) {
                w.K.hunt.secs = 0;
                w.K.hunt.t0 = Date.now();
                w.K.hunt.gold = 0;
                w.K.hunt.soldGold = 0;
                w.K.hunt.lootGold = 0;
                w.K.hunt.loot = [];
                w.K.hunt.xp = 0;
                w.K.hunt.kills = 0;
                w.K.hunt.catches = 0;
              }
              if (w.gameState && w.gameState._lastHunt) {
                w.gameState._lastHunt = (w.K && w.K.hunt) ? w.K.hunt : { secs: 0, t0: Date.now(), gold: 0, soldGold: 0, lootGold: 0, loot: [], xp: 0, kills: 0 };
              }
            } catch(e) {}

            try {
              if (typeof w.Y === 'function') {
                await w.Y('huntReset');
              } else if (typeof apiTest === 'function') {
                await apiTest('huntReset');
              } else {
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
                if (!tok || tok.length < 10) {
                  try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
                }
                if (!tok || tok.length < 10) tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
                if (tok) {
                  await fetch('/api/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tok, action: 'huntReset' })
                  }).catch(() => {});
                }
              }
            } catch(e) {}

            try {
              const huntObj = (w.K && w.K.hunt) || (w.gameState && w.gameState._lastHunt) || { secs: 0, t0: Date.now(), gold: 0, soldGold: 0, lootGold: 0, loot: [], xp: 0, kills: 0 };
              if (typeof w.updateMiniHunt === 'function') {
                w.updateMiniHunt(huntObj);
              }
            } catch(e) {}

            try {
              if (typeof logEvent === 'function') {
                logEvent('🔄 <b>Hunt Analyse reiniciada</b> (todas as abas)', '#38bdf8');
              }
            } catch(e) {}
          } catch (err) {
            console.warn('[HUNT_RESET] Erro ao executar reset na webview:', err);
          }
        })();
      `;

      todasWvs.forEach((wv) => {
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        wv.executeJavaScript(scriptReset).catch(() => {});
      });

      if (typeof mostrarToast === 'function') {
        mostrarToast('🌐 Hunt Analyse reiniciada em todas as abas!', '🌐', 'toast-success', 2500);
      }
    }
    window.reiniciarHuntAnalyseTodasAbas = reiniciarHuntAnalyseTodasAbas;

    // Escala do modo Grid: acompanha quantas contas cabem por linha. Menos
    // colunas = card maior = dá pra render o jogo maior sem cortar nada.
    // O seletor "Escala Visual" NÃO manda aqui — ele é do modo Abas; no Grid
    // quem manda é o seletor de colunas, senão os dois brigariam pelo zoom.
    const GRID_ZOOM_POR_COLUNAS = { 2: 1.0, 3: 0.85, 4: 0.75, 5: 0.62, 6: 0.55 };

    // Zoom que as webviews DEVEM ter agora, dado o modo atual.
    // Ponto único de verdade — antes cada chamador refazia essa conta.
    function zoomAlvoAtual() {
      if (isGridMode) return GRID_ZOOM_POR_COLUNAS[obterColunasGrid()] || 0.75;
      const sel = document.getElementById('select-zoom');
      const val = sel ? sel.value : 'auto';
      return val === 'auto' ? 1.0 : (parseFloat(val) || 1.0);
    }

    function aplicarZoomAlvo() {
      aplicarZoomTodas(zoomAlvoAtual());
    }

    // --- Colunas do modo Grid --------------------------------------------
    // O CSS decide o formato a partir de --grid-cols (css/06): a altura da
    // linha sai da largura da coluna via aspect-ratio, então mexer só nesta
    // variável muda quantas contas cabem por linha sem tocar em mais nada.
    const GRID_COLS_PADRAO = 4;

    function obterColunasGrid() {
      const n = parseInt(localStorage.getItem('idlePokemonGridCols'), 10);
      return (n >= 2 && n <= 6) ? n : GRID_COLS_PADRAO;
    }

    function aplicarColunasGrid(n) {
      const container = document.getElementById('views-container');
      if (container) container.style.setProperty('--grid-cols', n);
      const sel = document.getElementById('select-grid-cols');
      if (sel) sel.value = String(n);
      // Outra largura de coluna = outra altura de linha.
      if (typeof medirAlturaLinhaGrid === 'function') medirAlturaLinhaGrid();
    }

    function alterarColunasGrid(valor) {
      const n = Math.min(6, Math.max(2, parseInt(valor, 10) || GRID_COLS_PADRAO));
      try { localStorage.setItem('idlePokemonGridCols', String(n)); } catch (e) {}
      aplicarColunasGrid(n);
      // Card maior/menor muda o zoom que o jogo precisa pra caber legível.
      if (isGridMode) aplicarZoomAlvo();
    }

    // Altura da linha do Grid, em pixels, escrita em `--grid-row-h` (css/06).
    // Por que medir em JS em vez de deixar o `aspect-ratio` do card resolver:
    // com `grid-auto-rows: auto` o Chromium dimensiona a linha pela contribuição
    // de CONTEÚDO do card e ignora o aspect-ratio nessa conta. A linha saía com
    // ~193px (18px do header + a altura intrínseca padrão de uma <webview>)
    // enquanto o card era desenhado com os 715px do 16/10 — cada card
    // transbordava a linha e cobria o de cima, e só a última linha, sem nada por
    // cima, aparecia inteira. Medindo a largura real da coluna e fixando a
    // altura da linha, linha e card passam a ter o mesmo tamanho.
    function medirAlturaLinhaGrid() {
      const container = document.getElementById('views-container');
      if (!container || !container.classList.contains('mode-grid')) return;
      const cs = getComputedStyle(container);
      const cols = parseInt(cs.getPropertyValue('--grid-cols'), 10) || GRID_COLS_PADRAO;
      const gap = parseFloat(cs.columnGap) || 0;
      const padH = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const aspecto = (cs.getPropertyValue('--grid-aspect') || '16/10').split('/');
      const razao = (parseFloat(aspecto[1]) || 10) / (parseFloat(aspecto[0]) || 16);
      // clientWidth já desconta a barra de rolagem vertical, então a conta
      // continua certa quando ela aparece ou some.
      const larguraCol = (container.clientWidth - padH - (cols - 1) * gap) / cols;
      if (!(larguraCol > 0)) return;
      const altura = (larguraCol * razao).toFixed(2) + 'px';
      // A escrita muda o layout e pode reentrar pelo ResizeObserver; sair quando
      // o valor não mudou é o que fecha esse laço.
      if (container.style.getPropertyValue('--grid-row-h') === altura) return;
      container.style.setProperty('--grid-row-h', altura);
    }

    // Remede quando a área muda de tamanho: janela redimensionada, sidebar
    // recolhida/fixada, ou a própria barra de rolagem entrando e saindo.
    try {
      const alvoObs = document.getElementById('views-container');
      if (alvoObs && typeof ResizeObserver === 'function') {
        new ResizeObserver(() => medirAlturaLinhaGrid()).observe(alvoObs);
      }
    } catch (e) {}

    aplicarColunasGrid(obterColunasGrid());

    function aplicarZoomTodas(factor) {
      webviews.forEach(wv => {
        try {
          if (wv && typeof wv.setZoomFactor === 'function') {
            wv.setZoomFactor(factor);
          }
        } catch(e) {}
      });
    }

    function alterarZoomManual() {
      aplicarZoomAlvo();
    }

    function notificarAjusteGrid(isGrid) {
      webviews.forEach(wv => {
        try {
          wv.executeJavaScript(`
            if (typeof window.__ajustarParaGrid === 'function') {
              window.__ajustarParaGrid(${isGrid});
            }
          `).catch(() => {});
        } catch(e) {}
      });
    }

    // Seleção de aba
    // Guarda a aba de jogo que estava aberta antes de entrar na Dashboard, pra
    // que "Fechar Dashboard" volte pra ela em vez de jogar sempre na Conta 1.
    let abaAntesDaDashboard = 0;

    function selectTab(index, force) {
      if (index < 0 || index > totalContas) return;
      if (!force && index === currentTab && !isGridMode && wrappers[index] && wrappers[index].classList.contains('active')) {
        try { if (webviews[index]) webviews[index].focus(); } catch (e) {}
        return;
      }
      const prevTab = currentTab;
      const tInicioTroca = performance.now();
      if (index === totalContas && currentTab !== totalContas) abaAntesDaDashboard = currentTab;
      currentTab = index;
      const isDashboardTab = (index === totalContas);

      // O destaque da aba na sidebar vale nos DOIS modos.
      tabButtons.forEach((btn, i) => {
        if (btn) {
          if (i === index) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });

      if (isGridMode) {
        if (isDashboardTab) toggleGridMode(); // Sai do grid se abrir a dashboard
        else {
          wrappers.forEach((w, i) => {
            if (w) {
              if (i === index) w.classList.add('focused');
              else w.classList.remove('focused');
            }
          });
        }
      } else {
        wrappers.forEach((wrap, i) => {
          if (wrap) {
            if (i === index) wrap.classList.add('active');
            else wrap.classList.remove('active');
          }
        });
      }

      if (isDashboardTab) {
        atualizarDashboardCompleta();
        iniciarLoopAutoAtualizacaoDashboard();
      } else {
        if (dashboardAutoRefreshTimer) {
          clearInterval(dashboardAutoRefreshTimer);
          dashboardAutoRefreshTimer = null;
        }
        // Frame 0: Garante renderização visual instantânea via troca de classes/GPU
        requestAnimationFrame(() => {
          if (currentTab !== index || isGridMode) return;
          const duracaoVisual = +(performance.now() - tInicioTroca).toFixed(1);
          window._perfUltimaTrocaAba = {
            de: prevTab,
            para: index,
            ms: duracaoVisual,
            em: Date.now()
          };
          if (!window._perfTrocasAba) window._perfTrocasAba = [];
          window._perfTrocasAba.push(window._perfUltimaTrocaAba);
          if (window._perfTrocasAba.length > 20) window._perfTrocasAba.shift();
          // Evita recalcular zoom se o fator já for o mesmo (evita reflow síncrono no Chromium da webview)
          try {
            const wvSel = webviews[index];
            if (wvSel && typeof wvSel.setZoomFactor === 'function') {
              const zAlvo = zoomAlvoAtual();
              if (wvSel.__lastZoomFactor !== zAlvo) {
                wvSel.__lastZoomFactor = zAlvo;
                wvSel.setZoomFactor(zAlvo);
              }
            }
          } catch (e) {}

          // Frame subsequente (~40ms): Adia foco e IPCs auxiliares para não disputar tempo com o compositor
          setTimeout(() => {
            if (currentTab !== index || isGridMode) return;
            try { if (webviews[index]) webviews[index].focus(); } catch (e) {}
            if (xpMiniViewVisible) atualizarXpTrackerContaAtiva();
            syncSidebarAutoToggles();
            try { if (typeof atualizarBadgesNotificacoes === 'function') atualizarBadgesNotificacoes(); } catch (e) {}
          }, 40);
        });
      }
    }

    // Loop de auto-atualização contínua a cada 1 segundo em tempo real
    let dashboardAutoRefreshTimer = null;
    function iniciarLoopAutoAtualizacaoDashboard() {
      if (dashboardAutoRefreshTimer) clearInterval(dashboardAutoRefreshTimer);
      dashboardAutoRefreshTimer = setInterval(() => {
        const dashWrap = document.getElementById('wrap-4') || document.getElementById('wrap-dash');
        const estaVisivel = (currentTab === totalContas) || (dashWrap && dashWrap.classList.contains('active'));
        if (estaVisivel) {
          atualizarDashboardCompleta();
        }
      }, 1000);
    }
    // O loop só existe enquanto a Dashboard estiver aberta; não consulta as
    // contas em segundo plano quando o usuário está jogando em uma aba.

    // Alternar modo Grid
    function toggleGridMode() {
      isGridMode = !isGridMode;
      const container = document.getElementById('views-container');
      // Só existem os elementos "-menu" (o botão da topbar antiga sumiu no
      // redesign). btn-grid-toggle/grid-txt/grid-icon vinham SEM guarda no ramo
      // de saída do Grid e estouravam TypeError em `null.classList`, matando
      // tudo que vinha depois: selectTab, reset de zoom e notificarAjusteGrid.
      const gridTxtMenu = document.getElementById('grid-txt-menu');
      const gridIconMenu = document.getElementById('grid-icon-menu');

      if (isGridMode) {
        if (currentTab === totalContas) currentTab = 0;
        container.className = 'mode-grid';
        if (gridTxtMenu) gridTxtMenu.textContent = 'Modo Abas';
        if (gridIconMenu) gridIconMenu.textContent = '🗂️';
        wrappers.forEach((w, i) => {
          if (w) {
            if (i === totalContas) {
              w.classList.remove('active', 'focused');
            } else if (i === currentTab) {
              w.classList.add('focused');
            } else {
              w.classList.remove('focused');
            }
          }
        });
        tabButtons.forEach((btn, i) => {
          if (btn) {
            if (i === currentTab) btn.classList.add('active');
            else btn.classList.remove('active');
          }
        });
        // O ResizeObserver não dispara aqui (o container não muda de tamanho ao
        // trocar de classe), então a primeira medição da linha é manual.
        medirAlturaLinhaGrid();
        aplicarZoomAlvo();
        notificarAjusteGrid(true);
      } else {
        container.className = 'mode-tabs';
        if (gridTxtMenu) gridTxtMenu.textContent = 'Grid Multi-Contas';
        if (gridIconMenu) gridIconMenu.textContent = '🪟';
        wrappers.forEach(w => w.classList.remove('focused'));
        selectTab(currentTab);
        // Volta ao zoom do seletor (100% quando está em "auto"). Reaplicado
        // também depois do relayout: setZoomFactor logo após trocar o container
        // de grid pra abas às vezes é engolido pelo resize da webview.
        aplicarZoomAlvo();
        setTimeout(aplicarZoomAlvo, 250);
        notificarAjusteGrid(false);
      }
    }

    // Recarregar webview ativa
    function reloadActiveWebview() {
      reloadWebview(currentTab);
    }

    // Recarregar todas e reaplicar ajustes de forma suave e rápida
    async function recarregarEAplicarTudo() {
      console.log('[IdleSuite] Recarregando e aplicando todas as contas...');
      await carregarScriptTamper();
      for (let i = 0; i < webviews.length; i++) {
        const wv = webviews[i];
        if (wv) {
          if (contasAutoProxyRefresh && contasAutoProxyRefresh[i]) {
            rotacionarProxyConta(i);
          }
          setTimeout(() => {
            try {
              wv.loadURL('https://idlepokemoon.com.br/play');
            } catch(e) {
              try { wv.reload(); } catch(e2) {}
            }
          }, i * 150);
        }
      }
    }

    async function reloadWebview(index) {
      if (webviews[index]) {
        if (contasAutoProxyRefresh && contasAutoProxyRefresh[index]) {
          const p = rotacionarProxyConta(index);
          if (p) {
            const ipOnly = p.split(':')[0].replace(/.*:\/\//, '');
            mostrarToast(`🔄 ${nomesAbas[index] || 'Conta ' + (index + 1)}: Novo proxy aplicado (${ipOnly})!`, '🌐', 'toast-success', 2500);
            await new Promise(r => setTimeout(r, 60));
          }
        }
        console.log(`[Conta ${index + 1}] Recarregando...`);
        try {
          webviews[index].loadURL('https://idlepokemoon.com.br/play');
        } catch(e) {
          try {
            webviews[index].reload();
          } catch(e2) {}
        }
      }
    }

    // Reiniciar aplicativo
    function reiniciarAplicativo() {
      console.log('[IdleSuite] Reiniciando aplicativo...');
      ipcRenderer.send('restart-app');
    }

    // Alternar áudio global com persistência no localStorage
    function renderizarEstadoAudio() {
      const audioIcon = document.getElementById('audio-icon');
      const audioBtn = document.getElementById('btn-audio-toggle');
      if (isMuted) {
        if (audioIcon) audioIcon.textContent = '🔇';
        if (audioBtn) audioBtn.classList.add('active');
      } else {
        if (audioIcon) audioIcon.textContent = '🔊';
        if (audioBtn) audioBtn.classList.remove('active');
      }
      webviews.forEach(wv => {
        if (wv && typeof wv.setAudioMuted === 'function') {
          wv.setAudioMuted(isMuted);
        }
      });
    }

    function toggleGlobalAudio() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('idlePokemonGlobalMuted', isMuted ? '1' : '0');
      } catch(e) {}
      renderizarEstadoAudio();
    }

    // === MINI XP VIEW (POKÉMON + TREINADOR) — DRAGGABLE ===

// ===== 21-mini-xp-view-draggable.js =====
    let xpMiniViewVisible = false;
    let xpMiniPinnedToSidebar = false;
    try {
      if (localStorage.getItem('idlePokemonXpMiniPinned') === '1') xpMiniPinnedToSidebar = true;
    } catch(e) {}

    let xpMiniViewEl = null;
    let _xpMiniDrag = { active: false, startX: 0, startY: 0, origX: 0, origY: 0 };

    function toggleXpMiniView() {
      xpMiniViewVisible = !xpMiniViewVisible;
      try {
        localStorage.setItem('idlePokemonXpMiniView', xpMiniViewVisible ? '1' : '0');
      } catch(e) {}

      atualizarBadgeXpTrackerMenu();

      if (xpMiniViewVisible) criarXpMiniView();
      else destruirXpMiniView();
    }

    function atualizarBadgeXpTrackerMenu() {
      const badge = document.getElementById('xp-mini-badge');
      if (badge) {
        badge.textContent = xpMiniViewVisible ? 'ON' : 'OFF';
        badge.style.color = xpMiniViewVisible ? '#4ade80' : '#64748b';
        badge.style.background = xpMiniViewVisible ? 'rgba(34,197,94,0.18)' : 'rgba(100,116,139,0.15)';
        badge.style.borderColor = xpMiniViewVisible ? 'rgba(34,197,94,0.35)' : 'rgba(100,116,139,0.3)';
      }
    }

    function toggleXpMiniPinSidebar() {
      xpMiniPinnedToSidebar = !xpMiniPinnedToSidebar;
      try {
        localStorage.setItem('idlePokemonXpMiniPinned', xpMiniPinnedToSidebar ? '1' : '0');
      } catch(e) {}

      destruirXpMiniView();
      if (xpMiniViewVisible) {
        criarXpMiniView();
      }
      mostrarToast(
        xpMiniPinnedToSidebar ? '📌 XP Tracker fixado na barra lateral esquerda!' : '↗️ XP Tracker no modo flutuante arrastável!',
        '📈',
        'toast-success',
        2500
      );
    }

    function criarXpMiniView() {
      if (xpMiniViewEl) return;

      const containerSidebar = document.getElementById('sidebar-xp-tracker-container');

      xpMiniViewEl = document.createElement('div');
      xpMiniViewEl.id = 'xp-mini-view';

      if (xpMiniPinnedToSidebar && containerSidebar) {
        // === MODO FIXADO NA SIDEBAR ===
        containerSidebar.style.display = 'block';
        xpMiniViewEl.style.cssText = `
          position: relative;
          width: 100%;
          box-sizing: border-box;
          background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98));
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(16,185,129,0.1);
          z-index: 10;
          display: flex; flex-direction: column;
          font-family: 'Segoe UI', system-ui, sans-serif;
          user-select: none;
          margin-bottom: 2px;
          animation: xpMiniSlideIn 0.25s cubic-bezier(0.16,1,0.3,1);
        `;
      } else {
        // === MODO FLUTUANTE ARRASTÁVEL ===
        if (containerSidebar) containerSidebar.style.display = 'none';
        let posX = 300, posY = 120;
        try {
          const saved = JSON.parse(localStorage.getItem('idlePokemonXpMiniPos') || '{}');
          if (saved.x != null && saved.y != null) { posX = saved.x; posY = saved.y; }
        } catch(e) {}

        xpMiniViewEl.style.cssText = `
          position: fixed; top: ${posY}px; left: ${posX}px;
          width: 330px;
          background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98));
          backdrop-filter: blur(16px);
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 10px;
          box-shadow: 0 6px 25px rgba(0,0,0,0.7), 0 0 15px rgba(16,185,129,0.15);
          z-index: 99998;
          display: flex; flex-direction: column;
          font-family: 'Segoe UI', system-ui, sans-serif;
          user-select: none;
          animation: xpMiniSlideIn 0.25s cubic-bezier(0.16,1,0.3,1);
        `;
      }

      const pinIcon = xpMiniPinnedToSidebar ? '↗️' : '📌';
      const pinTitle = xpMiniPinnedToSidebar ? 'Desafixar para modo flutuante' : 'Fixar na barra lateral esquerda';
      const dragCursor = xpMiniPinnedToSidebar ? 'default' : 'grab';

      xpMiniViewEl.innerHTML = `
        <!-- BARRA DE TITULO ENXUTA.
             Antes: gradiente verde de fundo, borda inferior, emoji 📈, o texto
             "XP TRACKER" em caixa-alta e QUATRO botoes (recolher, mover cima,
             mover baixo, fixar, fechar). Numa faixa de 236px isso era mais
             moldura que conteudo — e o bloco ja se identifica pelas duas barras
             de XP com nome de Pokemon e de treinador.
             Ficaram: a alca de arrasto e as duas acoes que so existem aqui
             (fixar/soltar e fechar). Sem fundo e sem borda. -->
        <!-- A classe sidebar-block-header NAO E DECORATIVA: acharCabecalhoBloco
             (shell/05) procura por ela pra saber onde encaixar os botoes de
             mover. Sem ela o localizador subia dois parentElement e devolvia o
             BLOCO INTEIRO como cabecalho — os botoes iam parar no fim do bloco,
             soltos embaixo das barras de XP.
             (sem crases aqui: este HTML mora dentro de um template literal, e
              crase em "comentario" fecha a string — ver a guarda em build.py) -->
        <div id="xpmini-drag-handle" class="xpmini-head sidebar-block-header" style="cursor:${dragCursor}">
          <span class="sidebar-block-drag-icon xpmini-detail-hide" title="Arraste para reordenar">⠿</span>
          <span class="xpmini-title-text sidebar-block-titulo">XP Tracker</span>
          <span style="flex:1"></span>
          <div class="xpmini-actions-group">
            <button id="xpmini-toggle-collapse" class="sidebar-block-toggle-btn" onclick="toggleBlockCollapse('xp-tracker', event)" title="Recolher/expandir detalhes">▾</button>
            <button id="xpmini-pin" class="sidebar-block-toggle-btn" title="${pinTitle}">${pinIcon}</button>
            <button id="xpmini-close" class="sidebar-block-toggle-btn" title="Fechar XP Tracker">✕</button>
          </div>
        </div>
        <!-- CONTENT -->
        <div id="xp-mini-view-content" style="padding:7px 8px; display:flex; flex-direction:column; gap:6px">
          <!-- POKEMON XP -->
          <div class="xpmini-poke-block" style="display:flex; flex-direction:column; gap:3px">
            <div class="xpmini-row-header" style="display:flex; align-items:center; justify-content:space-between">
              <div class="xpmini-detail-hide" style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">
                <span style="font-size:11px; flex-shrink:0">🐾</span>
                <span id="xpmini-poke-name" style="font-size:10.5px; font-weight:800; color:#86efac; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">Pokémon</span>
                <span id="xpmini-poke-lv" style="font-size:9px; background:rgba(34,197,94,0.18); border:1px solid rgba(34,197,94,0.3); color:#4ade80; padding:0 4px; border-radius:4px; font-weight:800; font-family:'SF Mono',monospace; flex-shrink:0">Lv.--</span>
              </div>
              <span id="xpmini-poke-pct" style="font-size:10.5px; font-weight:900; color:#4ade80; font-family:'SF Mono',monospace; flex-shrink:0">0%</span>
            </div>
            <div style="width:100%; height:5px; background:rgba(15,23,42,0.9); border-radius:3px; overflow:hidden; border:1px solid rgba(34,197,94,0.25)">
              <div id="xpmini-poke-fill" style="width:0%; height:100%; border-radius:3px; background:linear-gradient(90deg,#16a34a,#22c55e,#4ade80); box-shadow:0 0 6px rgba(34,197,94,0.4); transition:width 0.3s"></div>
            </div>
            <div class="xpmini-detail-hide" style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; margin-top:1px">
              <span id="xpmini-poke-falta" style="color:#e2e8f0; font-weight:600; font-family:'SF Mono',monospace">≈ -- pokes</span>
              <span id="xpmini-poke-eta" style="color:#fde047; font-weight:800; font-family:'SF Mono',monospace">⏳ --</span>
            </div>
          </div>

          <!-- TRAINER XP -->
          <div class="xpmini-jog-block" style="display:flex; flex-direction:column; gap:3px">
            <div class="xpmini-row-header" style="display:flex; align-items:center; justify-content:space-between">
              <div class="xpmini-detail-hide" style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">
                <span style="font-size:11px; flex-shrink:0">🧑</span>
                <span id="xpmini-jog-name" style="font-size:10.5px; font-weight:800; color:#fcd34d; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">Treinador</span>
                <span id="xpmini-jog-lv" style="font-size:9px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; padding:0 4px; border-radius:4px; font-weight:800; font-family:'SF Mono',monospace; flex-shrink:0">Lv.--</span>
              </div>
              <span id="xpmini-jog-pct" style="font-size:10.5px; font-weight:900; color:#fbbf24; font-family:'SF Mono',monospace; flex-shrink:0">0%</span>
            </div>
            <div style="width:100%; height:5px; background:rgba(15,23,42,0.9); border-radius:3px; overflow:hidden; border:1px solid rgba(245,158,11,0.25)">
              <div id="xpmini-jog-fill" style="width:0%; height:100%; border-radius:3px; background:linear-gradient(90deg,#b45309,#f59e0b,#fbbf24); box-shadow:0 0 6px rgba(245,158,11,0.4); transition:width 0.3s"></div>
            </div>
            <div class="xpmini-detail-hide" style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; margin-top:1px">
              <span id="xpmini-jog-falta" style="color:#e2e8f0; font-weight:600; font-family:'SF Mono',monospace">≈ -- pokes</span>
              <span id="xpmini-jog-eta" style="color:#fde047; font-weight:800; font-family:'SF Mono',monospace">⏳ --</span>
            </div>
          </div>
        </div>
      `;

      if (xpMiniPinnedToSidebar && containerSidebar) {
        containerSidebar.appendChild(xpMiniViewEl);
      } else {
        document.body.appendChild(xpMiniViewEl);
      }

      // Close button
      const btnClose = document.getElementById('xpmini-close');
      if (btnClose) btnClose.onclick = () => toggleXpMiniView();

      // Pin button
      const btnPin = document.getElementById('xpmini-pin');
      if (btnPin) btnPin.onclick = () => toggleXpMiniPinSidebar();

      aplicarEstadoColapsoBlocos();

      // Drag logic (apenas no modo flutuante)
      if (!xpMiniPinnedToSidebar) {
        const handle = document.getElementById('xpmini-drag-handle');
        if (handle) {
          handle.addEventListener('mousedown', (e) => {
            if (e.target.id === 'xpmini-close' || e.target.id === 'xpmini-pin' || e.target.id === 'xpmini-toggle-collapse') return;
            _xpMiniDrag.active = true;
            _xpMiniDrag.startX = e.clientX;
            _xpMiniDrag.startY = e.clientY;
            const rect = xpMiniViewEl.getBoundingClientRect();
            _xpMiniDrag.origX = rect.left;
            _xpMiniDrag.origY = rect.top;
            handle.style.cursor = 'grabbing';
            e.preventDefault();
          });
        }
      }

      iniciarXpMiniViewPolling();
    }

    document.addEventListener('mousemove', (e) => {
      if (!_xpMiniDrag.active || !xpMiniViewEl || xpMiniPinnedToSidebar) return;
      const dx = e.clientX - _xpMiniDrag.startX;
      const dy = e.clientY - _xpMiniDrag.startY;
      const newX = _xpMiniDrag.origX + dx;
      const newY = _xpMiniDrag.origY + dy;
      xpMiniViewEl.style.left = Math.max(0, Math.min(window.innerWidth - 100, newX)) + 'px';
      xpMiniViewEl.style.top = Math.max(0, Math.min(window.innerHeight - 50, newY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!_xpMiniDrag.active) return;
      _xpMiniDrag.active = false;
      const handle = document.getElementById('xpmini-drag-handle');
      if (handle) handle.style.cursor = 'grab';
      // Salva posição do modo flutuante
      try {
        if (xpMiniViewEl && !xpMiniPinnedToSidebar) {
          const rect = xpMiniViewEl.getBoundingClientRect();
          localStorage.setItem('idlePokemonXpMiniPos', JSON.stringify({ x: rect.left, y: rect.top }));
        }
      } catch(e) {}
    });

    function destruirXpMiniView() {
      const containerSidebar = document.getElementById('sidebar-xp-tracker-container');
      if (containerSidebar) containerSidebar.style.display = 'none';
      if (xpMiniViewEl) { xpMiniViewEl.remove(); xpMiniViewEl = null; }
      if (window._xpMiniPollInterval) { clearInterval(window._xpMiniPollInterval); window._xpMiniPollInterval = null; }
    }

    function iniciarXpMiniViewPolling() {
      if (window._xpMiniPollInterval) clearInterval(window._xpMiniPollInterval);
      window._xpMiniPollInterval = setInterval(() => {
        if (xpMiniViewVisible && xpMiniViewEl) {
          atualizarXpTrackerContaAtiva();
        }
      }, 1000);
      atualizarXpTrackerContaAtiva();
    }

    async function atualizarXpTrackerContaAtiva() {
      if (!xpMiniViewVisible || !xpMiniViewEl) return;
      try {
        // Encontra o webview da conta que está selecionada atualmente no aplicativo
        const idx = (currentTab >= 0 && currentTab < totalContas) ? currentTab : 0;
        const wv = document.querySelector(`#wrap-${idx} webview`);
        if (!wv) return;

        const dataJson = await wv.executeJavaScript(`(function() {
          try {
            // 1. Prioridade: Se o Idle Suite já calculou os dados exatos da conta
            if (window.__idleSuiteXpStatus && typeof window.__idleSuiteXpStatus === 'object') {
              return JSON.stringify(window.__idleSuiteXpStatus);
            }

            // 2. Fallback de cálculo e leitura inteligente do DOM nativo do jogo
            let domPokePct = null;
            let domJogPct = null;

            const domPokeTxt = document.getElementById('pp-poke-xptxt');
            if (domPokeTxt && domPokeTxt.textContent) {
              const m = domPokeTxt.textContent.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
              if (m) domPokePct = parseFloat(m[1]);
            }
            const domPlTxt = document.getElementById('pp-exp-pct');
            if (domPlTxt && domPlTxt.textContent) {
              const p = parseFloat(domPlTxt.textContent);
              if (!isNaN(p)) domJogPct = p;
            }

            if (domPokePct === null || domJogPct === null) {
              try {
                const targetArea = document.getElementById('player-panel') || document.getElementById('bottom-bar') || document.body;
                const relevantEls = targetArea.querySelectorAll('.exp-text, .xp-text, [class*="exp"], [class*="xp"]');
                for (let i = 0; i < relevantEls.length; i++) {
                  const txt = (relevantEls[i].textContent || '').trim();
                  if (!txt || txt.length > 50) continue;
                  if (domPokePct === null && /%\s*XP/i.test(txt)) {
                    const m = txt.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
                    if (m) domPokePct = parseFloat(m[1]);
                  }
                  if (domJogPct === null && /EXP\s*\d+/i.test(txt)) {
                    const m = txt.match(/EXP\s*(\d+(?:\.\d+)?)\s*%/i);
                    if (m) domJogPct = parseFloat(m[1]);
                  }
                  if (domPokePct !== null && domJogPct !== null) break;
                }
              } catch(e) {}
            }

            const K = window.K || {};
            const player = K.player || {};
            const active = K.active || (K.team && K.team.find(t => t.id === K.activeId)) || (K.team && K.team[0]) || {};
            const hunt = K.hunt || {};

            const kills = (hunt.kills > 0) ? Number(hunt.kills) : 0;
            const xpPoke = (hunt.xp > 0) ? Number(hunt.xp) : 0;
            const xpMedioPoke = (xpPoke > 0 && kills > 0) ? (xpPoke / kills) : 0;
            const xpRestantePoke = (active.xpNext || 0) - (active.xp || 0);
            const faltaPoke = (xpRestantePoke > 0 && xpMedioPoke > 0) ? Math.ceil(xpRestantePoke / xpMedioPoke) : 0;

            const xpJog = (hunt.pxp > 0) ? Number(hunt.pxp) : 0;
            const xpMedioJog = (xpJog > 0 && kills > 0) ? (xpJog / kills) : 0;
            const xpRestanteJog = (player.xpNext || 0) - (player.xp || 0);
            const faltaJog = (xpRestanteJog > 0 && xpMedioJog > 0) ? Math.ceil(xpRestanteJog / xpMedioJog) : 0;

            const secs = (hunt.secs > 0) ? Number(hunt.secs) : 1;
            const taxaPoke = (xpPoke > 0 && secs > 0) ? (xpPoke / secs) : 0;
            const taxaJog = (xpJog > 0 && secs > 0) ? (xpJog / secs) : 0;

            const fmtTempo = (s) => {
              if (!Number.isFinite(s) || s <= 0 || s > 8640000) return '--';
              const sec = Math.ceil(s);
              const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), seg = sec % 60;
              if (h > 0) return h + 'h ' + m + 'm';
              if (m > 0) return m + 'm ' + seg + 's';
              return seg + 's';
            };

            const fmtFalta = (restante, k) => {
              if (restante <= 0 && (active.xpNext || player.xpNext)) return '✅ 100%';
              if (k > 0) return '⚔️ ' + k.toLocaleString('pt-BR') + ' pokes';
              if (restante > 0) return 'falta ' + restante.toLocaleString('pt-BR') + ' XP';
              return '—';
            };

            const finalPokePct = domPokePct !== null ? domPokePct : (active.xp && active.xpNext ? Math.round((active.xp / active.xpNext) * 100) : 0);
            const finalJogPct = domJogPct !== null ? domJogPct : (player.xpPct != null ? parseFloat(player.xpPct) : (player.xp && player.xpNext ? Math.round((player.xp / player.xpNext) * 100) : 0));

            return JSON.stringify({
              poke: {
                name: active.name || 'Pokémon',
                level: active.level || '--',
                shiny: !!(active.shiny || active.isShiny),
                pct: finalPokePct,
                pctText: Math.round(finalPokePct) + '%',
                falta: fmtFalta(xpRestantePoke, faltaPoke),
                eta: '⏳ ' + fmtTempo(taxaPoke > 0 ? xpRestantePoke / taxaPoke : Infinity)
              },
              jog: {
                name: player.name || 'Treinador',
                level: player.level || '--',
                pct: finalJogPct,
                pctText: Math.round(finalJogPct) + '%',
                falta: fmtFalta(xpRestanteJog, faltaJog),
                eta: '⏳ ' + fmtTempo(taxaJog > 0 ? xpRestanteJog / taxaJog : Infinity)
              }
            });
          } catch(e) { return '{}'; }
        })()`).catch(() => '{}');

        const s = JSON.parse(dataJson);
        if (s && (s.poke || s.jog)) {
          renderizarDadosXpMiniView(s);
        }
      } catch(e) {}
    }

    function renderizarDadosXpMiniView(s) {
      if (!s) return;
      const poke = s.poke || {};
      const jog = s.jog || {};

      // Pokémon XP
      const pokeName = document.getElementById('xpmini-poke-name');
      const pokeLv = document.getElementById('xpmini-poke-lv');
      const pokePct = document.getElementById('xpmini-poke-pct');
      const pokeFill = document.getElementById('xpmini-poke-fill');
      const pokeFalta = document.getElementById('xpmini-poke-falta');
      const pokeEta = document.getElementById('xpmini-poke-eta');

      if (pokeName && poke.name) {
        pokeName.textContent = (poke.shiny ? '✨ ' : '') + poke.name;
        if (pokeLv) pokeLv.textContent = 'Lv.' + (poke.level || '--');
        const pctNum = Math.max(0, Math.min(100, Math.round(Number(poke.pct) || 0)));
        if (pokePct) pokePct.textContent = poke.pctText || (pctNum + '%');
        if (pokeFill) pokeFill.style.width = pctNum + '%';
        if (pokeFalta) pokeFalta.textContent = poke.falta || '—';
        if (pokeEta) pokeEta.textContent = (poke.eta && !poke.eta.includes('⏳')) ? '⏳ ' + poke.eta : (poke.eta || '⏳ --');
      }

      // Treinador XP
      const jogName = document.getElementById('xpmini-jog-name');
      const jogLv = document.getElementById('xpmini-jog-lv');
      const jogPct = document.getElementById('xpmini-jog-pct');
      const jogFill = document.getElementById('xpmini-jog-fill');
      const jogFalta = document.getElementById('xpmini-jog-falta');
      const jogEta = document.getElementById('xpmini-jog-eta');

      if (jogName && jog.name) {
        jogName.textContent = jog.name;
        if (jogLv) jogLv.textContent = 'Lv.' + (jog.level || '--');
        const pctNumJog = Math.max(0, Math.min(100, Math.round(Number(jog.pct) || 0)));
        if (jogPct) jogPct.textContent = jog.pctText || (pctNumJog + '%');
        if (jogFill) jogFill.style.width = pctNumJog + '%';
        if (jogFalta) jogFalta.textContent = jog.falta || '—';
        if (jogEta) jogEta.textContent = (jog.eta && !jog.eta.includes('⏳')) ? '⏳ ' + jog.eta : (jog.eta || '⏳ --');
      }

      // Tooltip informativo completo para quando o card/sidebar estiver recolhido
      if (xpMiniViewEl) {
        const pDesc = `🐾 ${poke.name || 'Pokémon'} Lv.${poke.level || '--'} (${poke.pctText || '0%'}) | ${poke.falta || ''} | ${poke.eta || ''}`;
        const jDesc = `🧑 ${jog.name || 'Treinador'} Lv.${jog.level || '--'} (${jog.pctText || '0%'}) | ${jog.falta || ''} | ${jog.eta || ''}`;
        xpMiniViewEl.setAttribute('title', `📈 XP TRACKER:\n${pDesc}\n${jDesc}`);
      }
    }

    // Restore XP mini view state
    try {
      if (localStorage.getItem('idlePokemonXpMiniView') === '1') {
        xpMiniViewVisible = true;
        setTimeout(() => {
          criarXpMiniView();
          const badge = document.getElementById('xp-mini-badge');
          if (badge) {
            badge.textContent = 'ON';
            badge.style.color = '#4ade80';
            badge.style.background = 'rgba(34,197,94,0.18)';
            badge.style.borderColor = 'rgba(34,197,94,0.35)';
          }
        }, 500);
      }
    } catch(e) {}

    // === FUNÇÕES DO EDITOR DE SCRIPTS ===

// ===== 23-navegador-popup-interno.js =====
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

// ===== 24-central-votacao-topidle-4x.js =====
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


// ===== 25-central-trade-4x-coordenacao.js =====
    // === CENTRAL DE TRADE 4X DIRETO & COORDENAÇÃO DE CONTAS ===
    // =====================================================
    let tradeMainTarget = parseInt(localStorage.getItem('idlePokemonTradeMainTarget') || '0');
    let inventariosContas = [null, null, null, null];
    let tradeOrigemIndex = 1;
    let tradeDestinoIndex = 0;
    let tradeCategoriaAtiva1 = 'all';
    let tradeCategoriaAtiva2 = 'all';
    let tradeOferta1 = { items: {}, pokes: [], gold: 0 };
    let tradeOferta2 = { items: {}, pokes: [], gold: 0 };

    const STONES_HELDS_KEYWORDS = ['stone', 'band', 'specs', 'scarf', 'sash', 'orb', 'eviolite', 'share', 'egg', 'bell', 'brace', 'weight', 'belt', 'lens', 'anklet', 'miracle', 'charcoal', 'mystic', 'magnet', 'hard_stone', 'sharp_beak', 'poison_barb', 'soft_sand', 'silk', 'silver', 'spell_tag', 'metal_coat', 'dragon_scale', 'king_rock', 'upgrade', 'disc', 'prism', 'reaper', 'protector', 'electirizer', 'magmarizer', 'dubious', 'oval', 'leaf', 'fire', 'water', 'thunder', 'moon', 'sun', 'shiny', 'dusk', 'dawn', 'ice'];
    const BALLS_POTIONS_KEYWORDS = ['ball', 'potion', 'revive', 'ether', 'elixir', 'small', 'great', 'hyper', 'ultra', 'premier', 'master', 'moon'];
    async function executarAcaoTradeNoWebview(wv, action, params = {}) {
      if (!wv) return { ok: false, error: 'Webview não encontrada' };
      try {
        const execPromise = wv.executeJavaScript(`
          (async function() {
            try {
              let tok = '';
              try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
              if (!tok || tok.length < 10) {
                try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
              }
              if (!tok || tok.length < 10) {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
              }
              if (!tok) return { ok: false, error: 'Token de autenticação não encontrado nesta aba' };

              const body = { token: tok, action: ${JSON.stringify(action)}, ...${JSON.stringify(params)} };
              const r = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const j = await r.json().catch(() => ({}));
              if (!r.ok || j.err || j.error) {
                return { ok: false, error: j.err || j.error || ('HTTP ' + r.status), data: j };
              }
              if (j.state) {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w.handleStateUpdate === 'function') {
                  try { w.handleStateUpdate(j.state); } catch(e){}
                }
                w.K = j.state;
                w.__gameState = j.state;
              }
              return { ok: true, state: j.state, data: j };
            } catch(err) {
              return { ok: false, error: err.message };
            }
          })()
        `);

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'Timeout de comunicação com o jogo (6s)' }), 6000));
        const res = await Promise.race([execPromise, timeoutPromise]);
        return res || { ok: false, error: 'Sem resposta' };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    async function carregarInventariosTradeHub() {
      tradeLog(`🔄 Lendo dados e inventários de ${totalContas} contas via API /api/state...`, '#38bdf8');
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        try {
          const inv = await wv.executeJavaScript(`
            (async function() {
              try {
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
                if (!tok || tok.length < 10) {
                  try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
                }
                if (!tok || tok.length < 10) {
                  const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                  tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
                }

                let s = null;
                if (tok) {
                  try {
                    const res = await fetch('/api/state?token=' + encodeURIComponent(tok)).then(r => r.json()).catch(() => null);
                    if (res && res.state) {
                      s = res.state;
                      const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                      w.K = s;
                      w.__gameState = s;
                    }
                  } catch(e){}
                }

                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (!s) {
                  s = (w.gameState && (w.gameState.player || w.gameState.bag || w.gameState.box)) ? w.gameState : ((w.K && (w.K.player || w.K.bag || w.K.box)) ? w.K : (w.qState || w.state || {}));
                }
                const p = (s && s.player) || (w.K && w.K.player) || (w.gameState && w.gameState.player) || s || {};

                const bagList = [];
                const bagMap = new Map();

                // 1. Itens da Mochila (s.bag)
                const rawBag = (s && s.bag) || (w.K && w.K.bag) || (p && p.bag) || [];
                if (Array.isArray(rawBag)) {
                  rawBag.forEach(it => {
                    if (it && it.name) {
                      const count = Number(it.count || it.qty || it.amount || 1);
                      const bound = Number(it.bound || 0);
                      const freeCount = count - bound;
                      if (freeCount > 0) {
                        const nLower = it.name.toLowerCase();
                        const cat = nLower.includes('stone') ? 'stone' : (nLower.includes('ball') ? 'ball' : 'item');
                        bagMap.set(it.name, {
                          name: it.name,
                          key: it.name,
                          cat: cat,
                          count: freeCount,
                          bound: bound,
                          price: Number(it.price || 0),
                          type: it.type || cat
                        });
                      }
                    }
                  });
                }

                // 2. Pokéballs (s.balls)
                const rawBalls = (s && s.balls) || (w.K && w.K.balls) || (p && p.balls) || {};
                if (rawBalls && typeof rawBalls === 'object') {
                  Object.keys(rawBalls).forEach(bKey => {
                    const count = Number(rawBalls[bKey]);
                    if (count > 0) {
                      let ballName = bKey.trim();
                      if (!ballName.toLowerCase().includes('ball')) ballName = ballName + ' ball';
                      ballName = ballName.charAt(0).toUpperCase() + ballName.slice(1);
                      if (!bagMap.has(ballName)) {
                        bagMap.set(ballName, {
                          name: ballName,
                          key: bKey,
                          cat: 'ball',
                          count: count,
                          bound: 0,
                          price: 0,
                          type: 'ball'
                        });
                      }
                    }
                  });
                }

                // 3. Poções (s.potions)
                const rawPots = (s && s.potions) || (w.K && w.K.potions) || (p && p.potions) || {};
                if (rawPots && typeof rawPots === 'object') {
                  Object.keys(rawPots).forEach(pKey => {
                    const count = Number(rawPots[pKey]);
                    if (count > 0) {
                      let potName = pKey.trim();
                      potName = potName.charAt(0).toUpperCase() + potName.slice(1);
                      if (!bagMap.has(potName)) {
                        bagMap.set(potName, {
                          name: potName,
                          key: pKey,
                          cat: 'potion',
                          count: count,
                          bound: 0,
                          price: 0,
                          type: 'potion'
                        });
                      }
                    }
                  });
                }

                bagMap.forEach(v => bagList.push(v));

                // 4. Pokémon (Box + Time)
                const pokesList = [];
                const pokeIdSeen = new Set();

                function extrairDadosCompletosPoke(pk, isTeam) {
                  if (!pk || (!pk.id && !pk._id && !pk.uid && !pk.name)) return null;
                  const pid = pk.id || pk._id || pk.uid || (pk.name + '_' + (pk.level || 1));
                  if (pokeIdSeen.has(String(pid))) return null;
                  pokeIdSeen.add(String(pid));

                  return {
                    id: String(pid),
                    name: pk.name || pk.n || 'Pokémon',
                    level: Number(pk.level || pk.lv || 1),
                    power: Number(pk.power || pk.pwr || 0),
                    shiny: !!pk.shiny,
                    legendary: !!pk.legendary,
                    isTeam: !!isTeam,
                    lookType: pk.lookType,
                    rarity: pk.rarity || 'Comum',
                    iv: Number(pk.iv || 1.0),
                    // tier da ESPÉCIE, vindo do próprio jogo ("poder da espécie
                    // medido no alvo neutro" — ver tierTagHTML em app-1.js).
                    // Escala real do jogo: S / A / B / C. Não existe "S+".
                    tierJogo: pk.tier || null,
                    boost: Number(pk.boost || 0),
                    boostMax: Number(pk.boostMax || 100),
                    growth: pk.growth || null,
                    growthTotal: (pk.growthTotal != null) ? Number(pk.growthTotal) : null,
                    growthTotalMax: Number(pk.growthTotalMax || 192),
                    growthMax: Number(pk.growthMax || 32),
                    growthPct: (pk.growthPct != null) ? Number(pk.growthPct) : null,
                    // O campo é 'nat' (objeto {id,s,d,txt}), nao 'nature'/'natureName'
                    // — por isso a natureza vinha sempre vazia.
                    nature: (pk.nat && (pk.nat.id || pk.nat.txt)) || pk.nature || '',
                    natureTxt: (pk.nat && pk.nat.txt) || '',
                    natureUp: (pk.nat && pk.nat.s) || '',
                    natureDown: (pk.nat && pk.nat.d) || '',
                    hab: pk.hab || null,
                    stats: pk.stats || null,
                    hp: Number(pk.hp || 0),
                    maxHp: Number(pk.maxHp || pk.hp || 0),
                    xp: Number(pk.xp || 0),
                    xpNext: Number(pk.xpNext || 0),
                    speed: Number(pk.speed || 0),
                    dps: Number(pk.dps || 0),
                    moves: Array.isArray(pk.moves) ? pk.moves : [],
                    // 'wm' = moveset recomendado pelo jogo. So vem no card cheio
                    // (time/ativo); o card leve da box não traz (lightenCard).
                    wm: Array.isArray(pk.wm) ? pk.wm : [],
                    held: pk.held || null,
                    heldNome: pk.heldNome || null,
                    heldTier: (pk.heldTier != null) ? Number(pk.heldTier) : null,
                    locked: !!pk.locked,
                    sell: Number(pk.sell || 0),
                    aura: pk.aura || null,
                    // O jogo usa type1/type2 (string), nao 'type'/'types'.
                    type1: pk.type1 || '',
                    type2: (pk.type2 && pk.type2 !== 'none') ? pk.type2 : '',
                    catchInfo: pk.catchInfo || (pk.owner ? ('Catch: ' + pk.owner) : ''),
                    isDitto: !!pk.isDitto
                  };
                }

                const rawBox = (p && p.box && Array.isArray(p.box)) ? p.box : ((s && s.box && Array.isArray(s.box)) ? s.box : ((w.K && Array.isArray(w.K.box)) ? w.K.box : []));
                rawBox.forEach(pk => {
                  const pObj = extrairDadosCompletosPoke(pk, false);
                  if (pObj) pokesList.push(pObj);
                });

                const rawTeam = (p && p.team && Array.isArray(p.team)) ? p.team : ((s && s.team && Array.isArray(s.team)) ? s.team : ((w.K && Array.isArray(w.K.team)) ? w.K.team : []));
                rawTeam.forEach(pk => {
                  const pObj = extrairDadosCompletosPoke(pk, true);
                  if (pObj) pokesList.push(pObj);
                });

                // 5. Gold
                let goldVal = 0;
                if (p && p.gold != null) goldVal = Number(p.gold);
                else if (s && s.gold != null) goldVal = Number(s.gold);
                else if (w.K && w.K.gold != null) goldVal = Number(w.K.gold);
                else if (p && p.wallet && p.wallet.gold != null) goldVal = Number(p.wallet.gold);
                else if (p && p.money != null) goldVal = Number(p.money);

                if (!goldVal || isNaN(goldVal)) {
                  const elG = document.getElementById('stat-carteira-gold') ||
                              document.getElementById('mini-saldo-carteira') ||
                              document.getElementById('bag-gold') ||
                              document.querySelector('#gold, .gold, .wallet-gold, [data-gold]');
                  if (elG && elG.textContent) {
                    const num = parseInt(elG.textContent.replace(/[^0-9]/g, ''));
                    if (!isNaN(num)) goldVal = num;
                  }
                }

                const nomeTreinador = (p && p.name) || (w.K && w.K.player && w.K.player.name) || (document.getElementById('profile-name') ? document.getElementById('profile-name').textContent.trim() : (typeof getPlayerCharacterName === 'function' ? getPlayerCharacterName() : 'Treinador'));

                return {
                  trainer: nomeTreinador,
                  gold: goldVal || 0,
                  bag: bagList,
                  pokes: pokesList,
                  trade: (s && s.trade) || (w.K && w.K.trade) || null
                };
              } catch(err) {
                return null;
              }
            })()
          `);
          if (inv) {
            inventariosContas[i] = inv;
            tradeLog(`[C${i + 1}: ${nomesAbas[i] || inv.trainer}] Gold: $${(inv.gold || 0).toLocaleString('pt-BR')} | Itens: ${(inv.bag || []).length} | Box/Time: ${(inv.pokes || []).length}`, '#94a3b8');
          }
        } catch(e) {}
      }

      atualizarStatsContas(1);
      atualizarStatsContas(2);
      renderizarGradeInventario(1);
      renderizarGradeInventario(2);
      renderizarGradePokes(1);
      renderizarGradePokes(2);
      renderizarOfertasQueue();
      tradeLog('✔ Dados de inventário e Pokémon sincronizados!', '#86efac');
    }

    function classificarItem(nome) {
      if (!nome) return 'loot';
      const n = (nome || '').toLowerCase().trim();
      if (n.includes('diamond') || n.includes('diamante') || n.includes('gem')) return 'diamond';
      if (n.includes('stone') || n.includes('pedra')) return 'stones';
      if (n.includes('ball') || n.includes('potion') || n.includes('revive') || n.includes('ether') || n.includes('elixir')) return 'balls';
      if (n.includes('tm_') || n.includes('tm ') || n.includes('held') || n.includes('orb') || n.includes('scale') || n.includes('leftovers') || n.includes('band') || n.includes('lens') || n.includes('rock') || n.includes('vest') || n.includes('belt') || n.includes('scarf') || n.includes('sash') || n.includes('specs')) return 'stones';
      return 'loot';
    }

    function obterIconeItem(nome) {
      const n = (nome || '').toLowerCase().trim();
      const isStone = n.includes('stone') || n.includes('pedra') || n.includes('crystal stone') || n.includes('orb');
      const isTM = n.includes('tm_') || n.includes('tm ');
      const isHeld = n.includes('band') || n.includes('belt') || n.includes('scarf') || n.includes('specs') || n.includes('lens') || n.includes('sash') || n.includes('leftovers') || n.includes('vest') || n.includes('bell') || n.includes('scale');
      const isBall = n.includes('ball');
      const isPotion = n.includes('potion') || n.includes('revive') || n.includes('ether') || n.includes('elixir');
      const isDiamond = n.includes('diamond') || n.includes('diamante') || n.includes('gem');

      if (n.includes('fire stone')) return { icon: '🔥', border: 'rgba(239,68,68,0.5)', bg: 'rgba(239,68,68,0.18)', label: 'Fire Stone', isStone: true };
      if (n.includes('water stone')) return { icon: '💧', border: 'rgba(59,130,246,0.5)', bg: 'rgba(59,130,246,0.18)', label: 'Water Stone', isStone: true };
      if (n.includes('thunder stone')) return { icon: '⚡', border: 'rgba(234,179,8,0.5)', bg: 'rgba(234,179,8,0.18)', label: 'Thunder Stone', isStone: true };
      if (n.includes('leaf stone')) return { icon: '🍃', border: 'rgba(34,197,94,0.5)', bg: 'rgba(34,197,94,0.18)', label: 'Leaf Stone', isStone: true };
      if (n.includes('moon stone')) return { icon: '🌙', border: 'rgba(192,132,252,0.5)', bg: 'rgba(192,132,252,0.18)', label: 'Moon Stone', isStone: true };
      if (n.includes('sun stone')) return { icon: '☀️', border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.18)', label: 'Sun Stone', isStone: true };
      if (n.includes('shiny stone')) return { icon: '✨', border: 'rgba(253,224,71,0.5)', bg: 'rgba(253,224,71,0.18)', label: 'Shiny Stone', isStone: true };
      if (n.includes('dusk stone') || n.includes('dark stone')) return { icon: '🌑', border: 'rgba(100,116,139,0.5)', bg: 'rgba(100,116,139,0.18)', label: 'Dusk Stone', isStone: true };
      if (n.includes('dawn stone')) return { icon: '🌅', border: 'rgba(6,182,212,0.5)', bg: 'rgba(6,182,212,0.18)', label: 'Dawn Stone', isStone: true };
      if (n.includes('ice stone')) return { icon: '❄️', border: 'rgba(103,232,249,0.5)', bg: 'rgba(103,232,249,0.18)', label: 'Ice Stone', isStone: true };
      if (n.includes('earth stone')) return { icon: '🌍', border: 'rgba(161,98,7,0.5)', bg: 'rgba(161,98,7,0.18)', label: 'Earth Stone', isStone: true };
      if (n.includes('rock stone')) return { icon: '🪨', border: 'rgba(120,113,108,0.5)', bg: 'rgba(120,113,108,0.18)', label: 'Rock Stone', isStone: true };
      if (n.includes('metal stone') || n.includes('metal coat')) return { icon: '⚙️', border: 'rgba(148,163,184,0.5)', bg: 'rgba(148,163,184,0.18)', label: 'Metal Stone', isStone: true };
      if (n.includes('venom stone')) return { icon: '☠️', border: 'rgba(168,85,247,0.5)', bg: 'rgba(168,85,247,0.18)', label: 'Venom Stone', isStone: true };
      if (n.includes('cocoon stone')) return { icon: '🐛', border: 'rgba(132,204,22,0.5)', bg: 'rgba(132,204,22,0.18)', label: 'Cocoon Stone', isStone: true };
      if (n.includes('feather stone')) return { icon: '🪶', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Feather Stone', isStone: true };
      if (n.includes('heart stone')) return { icon: '💖', border: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.18)', label: 'Heart Stone', isStone: true };
      if (n.includes('enigma stone')) return { icon: '🔮', border: 'rgba(139,92,246,0.5)', bg: 'rgba(139,92,246,0.18)', label: 'Enigma Stone', isStone: true };
      if (n.includes('crystal stone')) return { icon: '💎', border: 'rgba(6,182,212,0.6)', bg: 'rgba(6,182,212,0.22)', label: 'Crystal Stone', isStone: true };
      if (n.includes('future orb') || n.includes('orb')) return { icon: '🔮', border: 'rgba(147,51,234,0.5)', bg: 'rgba(147,51,234,0.18)', label: 'Orb', isStone: true };
      if (n.includes('leftovers')) return { icon: '🍎', border: 'rgba(132,204,22,0.5)', bg: 'rgba(132,204,22,0.18)', label: 'Leftovers', isHeld: true };
      if (n.includes('band') || n.includes('belt') || n.includes('scarf')) return { icon: '🎗️', border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.18)', label: 'Held', isHeld: true };
      if (n.includes('specs') || n.includes('lens')) return { icon: '👓', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Held', isHeld: true };
      if (n.includes('sash')) return { icon: '🥋', border: 'rgba(226,232,240,0.5)', bg: 'rgba(226,232,240,0.18)', label: 'Held', isHeld: true };
      if (n.includes('egg')) return { icon: '🥚', border: 'rgba(253,224,71,0.5)', bg: 'rgba(253,224,71,0.18)', label: 'Egg', isHeld: true };
      if (n.includes('bell')) return { icon: '🔔', border: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.18)', label: 'Bell', isHeld: true };
      if (n.includes('tm_') || n.includes('tm ')) return { icon: '💿', border: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.18)', label: 'TM', isTM: true };
      if (n.includes('ball')) return { icon: '⚾', border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.15)', label: 'Ball', isBall: true };
      if (n.includes('potion') || n.includes('revive')) return { icon: '🧪', border: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.15)', label: 'Potion', isPotion: true };
      if (n.includes('diamond') || n.includes('diamante') || n.includes('gem')) return { icon: '💎', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Diamond', isDiamond: true };
      return { icon: '🎒', border: 'rgba(148,163,184,0.25)', bg: 'rgba(148,163,184,0.1)', label: 'Loot', isStone, isHeld, isTM, isBall, isPotion, isDiamond };
    }

    function obterNomeTreinadorConta(idx) {
      if (inventariosContas[idx] && inventariosContas[idx].trainer && inventariosContas[idx].trainer !== 'Treinador') {
        return inventariosContas[idx].trainer;
      }
      const nomesFixos = ['JesusCrizto', 'JudasPriest', 'DarkMatter', 'Nebulosa'];
      if (nomesFixos[idx]) return nomesFixos[idx];
      if (nomesAbas[idx]) return nomesAbas[idx];
      return 'Conta ' + (idx + 1);
    }

// ===== 29-toast-notifications-deteccao-conexao.js =====
    function mostrarToast(mensagem, icone = 'ℹ️', tipo = 'normal', duracaoMs = 4000) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast-item ${tipo === 'toast-success' ? 'toast-success' : ''}`;
      toast.innerHTML = `<span>${icone}</span><span>${mensagem}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
      }, duracaoMs);
    }

    // Áudio Chime do Shiny no Desktop Client
    function tocarDesktopShinyChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notas = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
        notas.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.36);
        });
      } catch(e) {}
    }

    // === SISTEMA DE NOTIFICAÇÕES (JANELA ATUAL vs TODAS AS ABAS) ===
    const SHINY_MUTE_GLOBAL_KEY = 'electronShinyNotificationsMutedGlobal';
    const SHINY_MUTE_ACCOUNTS_KEY = 'electronShinyNotificationsMutedAccounts';
    const SHINY_MUTE_LEGACY_KEY = 'electronShinyNotificationsMuted';

    function obterContasSilenciadas() {
      try {
        const raw = localStorage.getItem(SHINY_MUTE_ACCOUNTS_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    function salvarContasSilenciadas(obj) {
      try {
        localStorage.setItem(SHINY_MUTE_ACCOUNTS_KEY, JSON.stringify(obj || {}));
      } catch (e) {}
    }

    function isSilenciadoGlobal() {
      try {
        const g = localStorage.getItem(SHINY_MUTE_GLOBAL_KEY);
        if (g !== null) return g === '1';
        return localStorage.getItem(SHINY_MUTE_LEGACY_KEY) === '1';
      } catch (e) {
        return false;
      }
    }

    function isContaSilenciada(index) {
      if (isSilenciadoGlobal()) return true;
      const contas = obterContasSilenciadas();
      return !!contas[index];
    }

    function isTodasAbasSilenciadas() {
      if (isSilenciadoGlobal()) return true;
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = obterContasSilenciadas();
      for (let i = 0; i < total; i++) {
        if (!contas[i]) return false;
      }
      return true;
    }

    function sincronizarSilencioComWebview(index, silenciado) {
      try {
        const lista = (typeof webviews !== 'undefined' && Array.isArray(webviews)) ? webviews : [];
        const wv = lista[index];
        if (!wv || typeof wv.executeJavaScript !== 'function') return;
        const habilitado = !silenciado;
        wv.executeJavaScript(`
          try {
            if (typeof window.__setNotifyBrowser === 'function') window.__setNotifyBrowser(${habilitado});
            if (typeof window.__setSomShiny === 'function') window.__setSomShiny(${habilitado});
          } catch (e) {}
        `).catch(() => {});
      } catch (e) {}
    }

    function sincronizarSilencioTodasWebviews() {
      try {
        const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
        for (let i = 0; i < total; i++) {
          sincronizarSilencioComWebview(i, isContaSilenciada(i));
        }
      } catch (e) {}
    }

    function alternarSilenciarNotificacoesAbaAtual() {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idx = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const contas = obterContasSilenciadas();
      const silenciadoAgora = isContaSilenciada(idx);
      const novo = !silenciadoAgora;

      if (isSilenciadoGlobal() && !novo) {
        try {
          localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, '0');
          localStorage.setItem(SHINY_MUTE_LEGACY_KEY, '0');
        } catch (e) {}
        for (let i = 0; i < total; i++) {
          contas[i] = (i !== idx);
        }
      } else {
        contas[idx] = novo;
      }

      salvarContasSilenciadas(contas);
      sincronizarSilencioComWebview(idx, novo);
      atualizarBadgesNotificacoes();

      const nomeConta = (typeof nomesAbas !== 'undefined' && nomesAbas[idx]) ? nomesAbas[idx] : `Conta ${idx + 1}`;
      if (typeof mostrarToast === 'function') {
        mostrarToast(
          novo
            ? `Notificações, popups e som silenciados na ${nomeConta} (Janela Atual)`
            : `Notificações, popups e som reativados na ${nomeConta} (Janela Atual)`,
          novo ? '🔕' : '🔔',
          novo ? 'info' : 'toast-success',
          3000
        );
      }
    }

    function alternarSilenciarNotificacoesTodasAbas() {
      const todasSilenciadas = isTodasAbasSilenciadas();
      const novo = !todasSilenciadas;

      try {
        localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, novo ? '1' : '0');
        localStorage.setItem(SHINY_MUTE_LEGACY_KEY, novo ? '1' : '0');
      } catch (e) {}

      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = {};
      for (let i = 0; i < total; i++) {
        contas[i] = novo;
      }
      salvarContasSilenciadas(contas);
      sincronizarSilencioTodasWebviews();
      atualizarBadgesNotificacoes();

      if (typeof mostrarToast === 'function') {
        mostrarToast(
          novo
            ? 'Notificações, popups e sons silenciados em TODAS as abas'
            : 'Notificações, popups e sons ativados em TODAS as abas',
          novo ? '🔇' : '📢',
          novo ? 'info' : 'toast-success',
          3000
        );
      }
    }

    function definirSilencioContaIndividual(idx, novoEstado) {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const contas = obterContasSilenciadas();

      if (isSilenciadoGlobal() && !novoEstado) {
        try {
          localStorage.setItem(SHINY_MUTE_GLOBAL_KEY, '0');
          localStorage.setItem(SHINY_MUTE_LEGACY_KEY, '0');
        } catch (e) {}
        for (let i = 0; i < total; i++) {
          contas[i] = (i !== idx);
        }
      } else {
        contas[idx] = !!novoEstado;
      }

      salvarContasSilenciadas(contas);
      sincronizarSilencioComWebview(idx, !!novoEstado);
      atualizarBadgesNotificacoes();
    }

    function atualizarBadgesNotificacoes() {
      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idx = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const atualSilenciado = isContaSilenciada(idx);

      const badgeAtual = document.getElementById('shiny-mute-atual-badge');
      if (badgeAtual) {
        badgeAtual.textContent = atualSilenciado ? 'MUTED' : 'SOM';
        badgeAtual.style.color = atualSilenciado ? '#f87171' : '#4ade80';
        badgeAtual.style.background = atualSilenciado ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)';
        badgeAtual.style.borderColor = atualSilenciado ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)';
      }

      const badgeTodas = document.getElementById('shiny-mute-todas-badge');
      if (badgeTodas) {
        const globalSilenciado = isSilenciadoGlobal();
        let silenciadas = 0;
        for (let i = 0; i < total; i++) {
          if (isContaSilenciada(i)) silenciadas++;
        }
        const todasSil = globalSilenciado || (silenciadas === total);
        const nenhumaSil = (silenciadas === 0 && !globalSilenciado);

        const texto = todasSil ? 'MUTED' : (nenhumaSil ? 'SOM' : 'MISTO');
        const cor = todasSil ? '#f87171' : (nenhumaSil ? '#4ade80' : '#facc15');
        const bg = todasSil ? 'rgba(239,68,68,0.18)' : (nenhumaSil ? 'rgba(34,197,94,0.18)' : 'rgba(250,204,21,0.18)');
        const border = todasSil ? 'rgba(239,68,68,0.35)' : (nenhumaSil ? 'rgba(34,197,94,0.35)' : 'rgba(250,204,21,0.35)');

        badgeTodas.textContent = texto;
        badgeTodas.style.color = cor;
        badgeTodas.style.background = bg;
        badgeTodas.style.borderColor = border;
      }

      const badgeLegado = document.getElementById('shiny-mute-badge');
      if (badgeLegado) {
        const silenciado = isTodasAbasSilenciadas();
        badgeLegado.textContent = silenciado ? 'MUTED' : 'SOM';
        badgeLegado.style.color = silenciado ? '#f87171' : '#4ade80';
        badgeLegado.style.background = silenciado ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)';
        badgeLegado.style.borderColor = silenciado ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)';
      }

      atualizarConteudoModalNotificacoesSeAberto();
    }

    // Modal Central de Notificações
    function abrirModalConfigNotificacoes() {
      let modal = document.getElementById('modal-config-notificacoes');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-config-notificacoes';
        modal.style.cssText = 'position:fixed; inset:0; z-index:100000; background:rgba(4,7,18,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; font-family:inherit;';
        modal.onclick = (e) => { if (e.target === modal) fecharModalConfigNotificacoes(); };
        document.body.appendChild(modal);
      }
      modal.style.display = 'flex';
      atualizarConteudoModalNotificacoesSeAberto();
    }

    function fecharModalConfigNotificacoes() {
      const modal = document.getElementById('modal-config-notificacoes');
      if (modal) modal.style.display = 'none';
    }

    function atualizarConteudoModalNotificacoesSeAberto() {
      const modal = document.getElementById('modal-config-notificacoes');
      if (!modal || modal.style.display === 'none') return;

      const total = (typeof totalContas !== 'undefined' && totalContas > 0) ? totalContas : 4;
      const idxAtiva = (typeof currentTab !== 'undefined' && currentTab >= 0 && currentTab < total) ? currentTab : 0;
      const nomeAtiva = (typeof nomesAbas !== 'undefined' && nomesAbas[idxAtiva]) ? nomesAbas[idxAtiva] : `Conta ${idxAtiva + 1}`;
      const silenciadaAtiva = isContaSilenciada(idxAtiva);
      const todasSilenciadas = isTodasAbasSilenciadas();

      let cardsContasHtml = '';
      for (let i = 0; i < total; i++) {
        const nome = (typeof nomesAbas !== 'undefined' && nomesAbas[i]) ? nomesAbas[i] : `Conta ${i + 1}`;
        const sil = isContaSilenciada(i);
        const ehAtiva = (i === idxAtiva);

        cardsContasHtml += `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:10px; background:${ehAtiva ? 'rgba(56,189,248,0.08)' : 'rgba(15,23,42,0.45)'}; border:1px solid ${ehAtiva ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.12)'};">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:16px;">${ehAtiva ? '👑' : '🎮'}</span>
              <div>
                <div style="font-size:12px; font-weight:800; color:${ehAtiva ? '#38bdf8' : '#e2e8f0'}; display:flex; align-items:center; gap:6px;">
                  <span>Conta ${i + 1}: ${nome}</span>
                  ${ehAtiva ? '<span style="font-size:9px; background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 6px; border-radius:8px; border:1px solid rgba(56,189,248,0.4);">ATIVA</span>' : ''}
                </div>
                <div style="font-size:10px; color:${sil ? '#f87171' : '#4ade80'}; font-weight:700;">
                  ${sil ? '🔕 Silenciado (som e popups desligados)' : '🔔 Ativo (som, popups e notificações ligados)'}
                </div>
              </div>
            </div>
            <button onclick="definirSilencioContaIndividual(${i}, ${!sil})" style="padding:5px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; border:1px solid ${sil ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}; background:${sil ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)'}; color:${sil ? '#4ade80' : '#f87171'}; transition:all 0.15s ease;">
              ${sil ? '🔔 Reativar' : '🔕 Silenciar'}
            </button>
          </div>
        `;
      }

      modal.innerHTML = `
        <div style="width:100%; max-width:540px; max-height:90vh; overflow-y:auto; background:linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,15,30,0.99) 100%); border:1px solid rgba(56,189,248,0.32); border-radius:18px; box-shadow:0 24px 60px rgba(0,0,0,0.85); padding:22px; color:#e2e8f0; display:flex; flex-direction:column; gap:16px;">
          <!-- Header -->
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(148,163,184,0.12); padding-bottom:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px;">🔔</span>
              <div>
                <div style="font-size:15px; font-weight:900; color:#facc15; letter-spacing:0.3px;">Central de Notificações &amp; Popups</div>
                <div style="font-size:10.5px; color:#94a3b8;">Gerencie alertas visuais, sons e popups do Windows e Electron</div>
              </div>
            </div>
            <button onclick="fecharModalConfigNotificacoes()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; width:28px; height:28px; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>

          <!-- Explicação -->
          <div style="font-size:10.5px; line-height:1.45; color:#cbd5e1; background:rgba(30,41,59,0.5); border:1px solid rgba(148,163,184,0.15); border-radius:10px; padding:10px 12px;">
            ℹ️ <b>Como funciona:</b> Silenciar desliga o som (chime), os popups flutuantes na tela do Electron e os avisos do Windows (SO). Os registros na <b>Sala de Troféus de Shinies</b> continuam sendo gravados normalmente em segundo plano.
          </div>

          <!-- Painéis Rápidos: Janela Atual vs Todas as Abas -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <!-- Janela Atual -->
            <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:11.5px; font-weight:900; color:#38bdf8;">🪟 Janela Atual</span>
                  <span style="font-size:9px; font-weight:900; color:${silenciadaAtiva ? '#f87171' : '#4ade80'}; background:${silenciadaAtiva ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}; padding:2px 6px; border-radius:8px; border:1px solid ${silenciadaAtiva ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'};">
                    ${silenciadaAtiva ? 'MUTED' : 'SOM'}
                  </span>
                </div>
                <div style="font-size:10px; color:#94a3b8;">Aba em foco: <b style="color:#e2e8f0">${nomeAtiva}</b></div>
              </div>
              <button onclick="alternarSilenciarNotificacoesAbaAtual()" style="width:100%; padding:8px 10px; border-radius:8px; font-size:11px; font-weight:900; cursor:pointer; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.14); color:#38bdf8;">
                ${silenciadaAtiva ? '🔔 Ativar Nesta Janela' : '🔕 Silenciar Esta Janela'}
              </button>
            </div>

            <!-- Todas as Abas -->
            <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(234,179,8,0.25); border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                  <span style="font-size:11.5px; font-weight:900; color:#facc15;">🌐 Todas as Abas</span>
                  <span style="font-size:9px; font-weight:900; color:${todasSilenciadas ? '#f87171' : '#4ade80'}; background:${todasSilenciadas ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}; padding:2px 6px; border-radius:8px; border:1px solid ${todasSilenciadas ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'};">
                    ${todasSilenciadas ? 'MUTED' : 'SOM'}
                  </span>
                </div>
                <div style="font-size:10px; color:#94a3b8;">Controle global de todas as contas</div>
              </div>
              <button onclick="alternarSilenciarNotificacoesTodasAbas()" style="width:100%; padding:8px 10px; border-radius:8px; font-size:11px; font-weight:900; cursor:pointer; border:1px solid rgba(234,179,8,0.4); background:rgba(234,179,8,0.14); color:#facc15;">
                ${todasSilenciadas ? '🔔 Ativar Todas as Abas' : '🔇 Silenciar Todas as Abas'}
              </button>
            </div>
          </div>

          <!-- Lista por Conta -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">Status Individual por Conta:</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:180px; overflow-y:auto; padding-right:4px;">
              ${cardsContasHtml}
            </div>
          </div>

          <!-- Rodapé com Testes -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid rgba(148,163,184,0.12); padding-top:14px;">
            <div style="display:flex; gap:8px;">
              <button onclick="tocarDesktopShinyChime()" style="padding:7px 12px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; border:1px solid rgba(234,179,8,0.35); background:rgba(234,179,8,0.12); color:#fde047;">
                🔊 Testar Som
              </button>
              <button onclick="dispararToastShiny(${idxAtiva}, '${nomeAtiva}', 'Treinador', 'Pikachu (Teste)')" style="padding:7px 12px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; border:1px solid rgba(56,189,248,0.35); background:rgba(56,189,248,0.12); color:#38bdf8;">
                ✨ Testar Alerta
              </button>
            </div>
            <button onclick="fecharModalConfigNotificacoes()" style="padding:7px 18px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; border:1px solid rgba(148,163,184,0.25); background:rgba(148,163,184,0.1); color:#e2e8f0;">
              Concluído
            </button>
          </div>
        </div>
      `;
    }

    window.isSilenciadoGlobal = isSilenciadoGlobal;
    window.isContaSilenciada = isContaSilenciada;
    window.isTodasAbasSilenciadas = isTodasAbasSilenciadas;
    window.sincronizarSilencioComWebview = sincronizarSilencioComWebview;
    window.sincronizarSilencioTodasWebviews = sincronizarSilencioTodasWebviews;
    window.alternarSilenciarNotificacoesAbaAtual = alternarSilenciarNotificacoesAbaAtual;
    window.alternarSilenciarNotificacoesTodasAbas = alternarSilenciarNotificacoesTodasAbas;
    window.definirSilencioContaIndividual = definirSilencioContaIndividual;
    window.atualizarBadgesNotificacoes = atualizarBadgesNotificacoes;
    window.atualizarBadgeShinyMute = atualizarBadgesNotificacoes;
    window.abrirModalConfigNotificacoes = abrirModalConfigNotificacoes;
    window.fecharModalConfigNotificacoes = fecharModalConfigNotificacoes;
    window.shinyNotificacoesSilenciadas = () => isContaSilenciada((typeof currentTab !== 'undefined' && currentTab >= 0) ? currentTab : 0);
    window.alternarSilenciarNotificacoesShiny = alternarSilenciarNotificacoesTodasAbas;

    // Toast de Shiny Interativo com Nome do Personagem / Aba e Clique Direto
    function dispararToastShiny(index, nomeAba, charName, pokeName) {
      // Salva sempre no histórico de Troféus de Shinies
      try { adicionarHistoricoShiny(index, nomeAba, charName, pokeName); } catch (e) {}

      // Se estiver silenciado para esta conta (individual ou global), não emite som nem popups visuais
      if (isContaSilenciada(index)) {
        console.log(`[SHINY SILENCIADO] Conta ${index + 1} (${nomeAba}): ${pokeName || 'Pokémon'} Shiny registrado em silêncio.`);
        return;
      }

      tocarDesktopShinyChime();
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast-item toast-shiny';
      toast.setAttribute('title', 'Clique para ir direto para esta conta!');

      const charDisplay = charName && charName !== nomeAba ? ` (${charName})` : '';

      toast.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:8px">
          <span style="font-size:12.5px; font-weight:900; color:#fde047; display:flex; align-items:center; gap:5px">
            <span>✨</span> <span>SHINY ENCONTRADO!</span>
          </span>
          <span style="font-size:9.5px; background:linear-gradient(135deg,#facc15,#eab308); color:#090d16; font-weight:900; padding:2px 7px; border-radius:10px; box-shadow:0 0 8px rgba(250,204,21,0.6)">IR PARA ABA ➔</span>
        </div>
        <div style="font-size:11.5px; color:#e2e8f0; line-height:1.3">
          Conta <b style="color:#38bdf8">${nomeAba}</b><span style="color:#a5b4fc">${charDisplay}</span>
        </div>
        <div style="font-size:13.5px; font-weight:900; color:#facc15; text-shadow:0 0 10px rgba(250,204,21,0.5)">
          🌟 ${pokeName || 'Pokémon'} Shiny!
        </div>
        <div style="font-size:9.5px; color:#94a3b8; font-weight:600">
          👆 Clique aqui para visualizar a conta em tela cheia!
        </div>
      `;

      // Ao clicar na notificação, vai direto para a aba correspondente
      toast.onclick = (e) => {
        e.stopPropagation();
        fecharTradeHubModal();
        if (isGridMode) {
          toggleGridMode(); // Sai do grid para focar na tela completa da conta
        }
        selectTab(index);

        if (webviews[index]) {
          try { webviews[index].focus(); } catch(err) {}
        }

        // Efeito de destaque na aba selecionada
        const btnTab = tabButtons[index];
        if (btnTab) {
          btnTab.classList.add('shiny-flash');
          setTimeout(() => btnTab.classList.remove('shiny-flash'), 6000);
        }

        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
      };

      container.appendChild(toast);

      // Dispara o alerta flutuante na Tela Principal em setups multi-monitores
      try {
        ipcRenderer.send('show-primary-screen-shiny-alert', { index, nomeAba, charName, pokeName });
      } catch(e) {}

      // Piscar a aba no topo mesmo antes do clique
      const btnTab = tabButtons[index];
      if (btnTab) {
        btnTab.classList.add('shiny-flash');
        setTimeout(() => btnTab.classList.remove('shiny-flash'), 10000);
      }

      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 350);
        }
      }, 12000);
    }

    // Listener para focar aba quando o alerta da tela principal for clicado
    ipcRenderer.on('focus-tab', (event, targetIndex) => {
      fecharTradeHubModal();
      if (isGridMode) {
        toggleGridMode();
      }
      selectTab(targetIndex || 0);
      if (webviews[targetIndex]) {
        try { webviews[targetIndex].focus(); } catch(err) {}
      }
    });

    // ================================================================

// ===== 30-dashboard-4x-command-center.js =====
    //  👑 DASHBOARD 4X COMMAND CENTER & SALA DE TROFÉUS SHINIES
    // ================================================================
    let dashboardData = Array.from({length: 16}, () => null);

    async function atualizarDashboardCompleta() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        try {
          const info = await wv.executeJavaScript(`
            (function() {
              try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                let data = null;
                if (typeof window.__obterDashboardStatus === 'function') {
                  try { data = window.__obterDashboardStatus(); } catch(e) {}
                }
                if (!data && typeof w.__obterDashboardStatus === 'function') {
                  try { data = w.__obterDashboardStatus(); } catch(e) {}
                }

                const kObj = (w.K && typeof w.K === 'object') ? w.K : ((window.K && typeof window.K === 'object') ? window.K : {});
                const gsObj = (w.gameState && typeof w.gameState === 'object') ? w.gameState : ((window.gameState && typeof window.gameState === 'object') ? window.gameState : {});
                const s = (kObj.player) ? kObj : ((gsObj.player) ? gsObj : (w.qState || w.state || {}));

                const p = s.player || kObj.player || gsObj.player || {};
                const balls = s.balls || kObj.balls || gsObj.balls || {};
                const pots = s.potions || kObj.potions || gsObj.potions || {};
                const team = Array.isArray(s.team) ? s.team : (Array.isArray(kObj.team) ? kObj.team : (Array.isArray(gsObj.team) ? gsObj.team : []));
                const act = s.active || kObj.active || team.find(x => x && x.active) || team[0] || gsObj.active || null;
                const rawBag = Array.isArray(s.bag) ? s.bag : (Array.isArray(kObj.bag) ? kObj.bag : (Array.isArray(gsObj.bag) ? gsObj.bag : []));

                if (!data || typeof data !== 'object') data = {};

                if (!data.trainer || !data.trainer.trim()) data.trainer = p.name || '';
                if (!data.level || data.level === 1) data.level = Number(p.level || data.level || 1);
                if (p.xp != null) data.xp = Number(p.xp);
                if (p.xpNext != null) data.xpNext = Number(p.xpNext);
                if (p.xpPct != null) data.xpPct = Math.round(Number(p.xpPct));
                if (p.kills != null && (data.kills == null || data.kills === 0)) data.kills = Number(p.kills);
                if (p.catches != null && (data.catches == null || data.catches === 0)) data.catches = Number(p.catches);
                
                // Gold & Diamonds
                if (p.gold != null) data.gold = Number(p.gold);
                if (p.diamonds != null) data.diamonds = Number(p.diamonds);

                // Inventory, Balls & Bag
                if (!data.inventory || typeof data.inventory !== 'object') data.inventory = {};
                const uBalls = Number(balls.ultra || balls['ultra ball'] || 0);
                if (uBalls > 0 || data.inventory.ultraBalls == null) data.inventory.ultraBalls = uBalls;

                const uPots = Number(pots.ultra || pots.hyper || pots['ultra potion'] || 0);
                if (uPots > 0 || data.inventory.ultraPotions == null) data.inventory.ultraPotions = uPots;

                if (!data.inventory.bag || !data.inventory.bag.length) {
                  data.inventory.bag = rawBag.map(it => ({
                    name: it.name || 'Item',
                    count: Number(it.count || it.qty || 1),
                    price: Number(it.price || 0),
                    type: it.type || 'loot'
                  }));
                }

                // Active Pokemon
                if ((!data.active || !data.active.name) && act && act.name) {
                  const pkExp = Number(act.exp || act.xp || 0);
                  const pkExpNext = Number(act.expNext || act.xpNext || 1);
                  const pkExpPct = act.expPct != null ? Number(act.expPct) : (pkExp && pkExpNext ? Math.min(100, Math.round((pkExp / pkExpNext) * 100)) : 0);

                  data.active = {
                    id: act.id,
                    name: act.name,
                    level: Number(act.level || 1),
                    shiny: !!act.shiny,
                    hp: Math.round(Number(act.hp || 0)),
                    maxHp: Math.round(Number(act.maxHp || 100)),
                    exp: pkExp,
                    expNext: pkExpNext,
                    expPct: Math.round(pkExpPct),
                    dps: Number(act.dps || 0),
                    power: Number(act.power || 0),
                    held: act.heldNome || act.held || null,
                    moves: act.moves || []
                  };
                }

                return data;
              } catch(err) {
                return { _err: String(err && err.message ? err.message : err) };
              }
            })()
          `);
          if (info && !info._err) {
            dashboardData[i] = info;
          }
        } catch(e) {
          console.warn(`[Dashboard] Erro ao obter dados da Conta ${i + 1}:`, e);
        }
      }

      renderizarCardsDashboard();
      renderizarGaleriaShiniesDashboard();
    }

    function renderizarCardsDashboard() {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;

      grid.innerHTML = Array.from({length: totalContas}, (_, i) => i).map(i => {
        const d = dashboardData[i] || {};
        const nomeAba = nomesAbas[i] || `Conta ${i + 1}`;
        const trainerDisplayName = d.trainer || obterNomeTreinadorConta(i) || nomeAba;
        const isMain = (i === 0);

        const act = d.active;
        const pokeNameClean = act ? act.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'pikachu';
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${pokeNameClean}.png`;
        const hpPct = (act && act.maxHp) ? Math.max(0, Math.min(100, Math.round((act.hp / act.maxHp) * 100))) : 100;
        const hpColor = hpPct > 50 ? '#22c55e' : (hpPct > 20 ? '#eab308' : '#ef4444');

        const huntActive = d.hunt ? d.hunt.active : true;
        const huntTarget = (d.hunt && d.hunt.target) ? d.hunt.target : 'Caçada Ativa';
        
        // Kills & Catches & Shinies
        const huntKills = (d.hunt && d.hunt.kills) ? d.hunt.kills.toLocaleString() : '0';
        const totalKills = (d.kills) ? d.kills.toLocaleString() : huntKills;
        const huntCatches = (d.hunt && d.hunt.catches) ? d.hunt.catches.toLocaleString() : '0';
        const totalCatches = (d.catches) ? d.catches.toLocaleString() : huntCatches;
        const huntShinies = (d.hunt && d.hunt.shinies != null) ? d.hunt.shinies : 0;
        const totalShinies = (d.totalShinies != null) ? d.totalShinies : huntShinies;

        const ultraBalls = (d.inventory && d.inventory.ultraBalls != null) ? d.inventory.ultraBalls.toLocaleString() : '0';
        const ultraPots = (d.inventory && d.inventory.ultraPotions != null) ? d.inventory.ultraPotions.toLocaleString() : '0';
        const bagItems = (d.inventory && Array.isArray(d.inventory.bag)) ? d.inventory.bag : [];
        const dex = d.pokedex || { total: 151, caught: (d.catches || 0), missing: Math.max(0, 151 - (d.catches || 0)), pct: 0 };
        const dexTotal = dex.total || 151;
        const dexCaught = dex.caught || 0;
        const dexMissing = (dex.missing != null) ? dex.missing : Math.max(0, dexTotal - dexCaught);
        const dexPct = (dex.pct != null) ? dex.pct : (dexTotal > 0 ? Math.round((dexCaught / dexTotal) * 100) : 0);

        const enc = d.encounter || {};
        const encName = enc.name || '';
        const encClean = encName ? encName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'substitute';
        const encSpriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${encClean}.png`;
        const encHpPct = (enc.maxHp) ? Math.max(0, Math.min(100, Math.round((enc.hp / enc.maxHp) * 100))) : 0;
        const ballsStats = d.ballsStats || {};

        return `
          <div class="dash-acc-card ${isMain ? 'is-main' : ''}">
            <!-- CABEÇALHO DO TREINADOR -->
            <div class="dash-acc-head">
              <div class="dash-acc-title">
                <span class="dash-acc-name">${trainerDisplayName}</span>
                <span class="dash-acc-badge ${isMain ? 'main' : 'farm'}">${isMain ? '👑 MAIN' : 'FARM'}</span>
                ${d.vip ? '<span style="font-size:8.5px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:900; padding:1px 5px; border-radius:4px">💎 VIP</span>' : ''}
                <span class="dash-level-badge">Lv.${d.level || 1}</span>
              </div>
              <div style="text-align:right">
                <div style="font-size:12px; font-weight:900; color:#4ade80">💰 $${(d.gold || 0).toLocaleString('pt-BR')}</div>
                ${(d.diamonds || 0) > 0 ? `<div style="font-size:10px; font-weight:800; color:#38bdf8">💎 ${d.diamonds}</div>` : ''}
              </div>
            </div>

            <!-- BARRA DE XP DO TREINADOR -->
            <div style="display:flex; flex-direction:column; gap:2px">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8">
                <span>XP Treinador: <b style="color:#e2e8f0">${(d.xp || 0).toLocaleString()}</b> / ${(d.xpNext || 0).toLocaleString()}</span>
                <div style="display:flex; align-items:center; gap:4px">
                  <span class="dash-eta-pill" title="Tempo estimado para o Treinador subir de nível">⏳ ${d.trainerEta || '—'}</span>
                  <span class="dash-pct-pill cyan">📈 ${d.xpPct || 0}%</span>
                </div>
              </div>
              <div class="dash-progress-track">
                <div class="dash-progress-fill trainer" style="width:${Math.max(0, Math.min(100, d.xpPct || 0))}%"></div>
              </div>
            </div>

            <!-- POKÉMON ATIVO COM EXP & DPS -->
            ${act ? `
              <div class="dash-poke-box">
                <img class="dash-poke-sprite" src="${spriteUrl}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; gap:3px">
                  <!-- NOME, LEVEL & DPS -->
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:11.5px; font-weight:900; color:${act.shiny ? '#fde047' : '#f8fafc'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                      ${act.shiny ? '⭐ ' : ''}${act.name}
                    </span>
                    <div style="display:flex; align-items:center; gap:4px">
                      <span class="dash-level-badge poke">Lv.${act.level}</span>
                      <span style="color:#f59e0b; font-weight:900; font-size:9.5px">⚡ ${(act.dps || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <!-- HP BAR -->
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:8.5px; color:#94a3b8; margin-bottom:1px">
                      <span>HP: <b style="color:#f1f5f9">${act.hp}/${act.maxHp}</b></span>
                      <span class="dash-pct-pill green">${hpPct}%</span>
                    </div>
                    <div class="dash-hp-bar">
                      <div class="dash-hp-fill" style="width:${hpPct}%; background:${hpColor}"></div>
                    </div>
                  </div>

                  <!-- XP / LEVEL UP BAR -->
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:8.5px; color:#94a3b8; margin-bottom:1px">
                      <span>XP: <b style="color:#e2e8f0">${(act.exp || 0).toLocaleString()}</b> / ${(act.expNext || 0).toLocaleString()}</span>
                      <div style="display:flex; align-items:center; gap:4px">
                        <span class="dash-eta-pill poke" title="Tempo estimado para o Pokémon ativo subir de nível">⏳ ${act.expEta || '—'}</span>
                        <span class="dash-pct-pill pink">🆙 ${act.expPct || 0}%</span>
                      </div>
                    </div>
                    <div class="dash-progress-track">
                      <div class="dash-progress-fill poke-xp" style="width:${Math.max(0, Math.min(100, act.expPct || 0))}%"></div>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="dash-poke-box" style="justify-content:center; color:#94a3b8; font-size:10.5px">
                <span>⚔️ Pokémon em Batalha Ativa</span>
              </div>
            `}

            <!-- INIMIGO ATACADO AGORA & KILLS NA POKÉDEX -->
            ${encName && encName !== 'Nenhum' ? `
              <div class="dash-enemy-box">
                <img class="dash-poke-sprite" style="width:34px; height:34px" src="${encSpriteUrl}" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
                <div style="flex:1; overflow:hidden; display:flex; flex-direction:column; gap:2px">
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span style="font-size:10.5px; font-weight:800; color:${enc.shiny ? '#fde047' : '#fca5a5'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                      ${enc.shiny ? '⭐ ' : '⚔️ '}${enc.name} <span style="color:#94a3b8; font-size:9px">Lv.${enc.level || 1}</span>
                    </span>
                    <span style="font-size:8.5px; font-weight:900; color:${enc.dexDone ? '#4ade80' : '#fde047'}">
                      ${enc.dexDone ? '✅ Pokelog Feito' : `🎯 ${enc.dexKills}/${enc.dexGoal} Kills`}
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:8px; color:#94a3b8">
                    <span>HP Alvo: ${enc.hp}/${enc.maxHp} (${encHpPct}%)</span>
                    <span>Dex Abates: <b>${enc.dexPct || 0}%</b></span>
                  </div>
                  <div class="dash-hp-bar" style="height:4px">
                    <div class="dash-hp-fill" style="width:${encHpPct}%; background:#ef4444"></div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- PROGRESSO DA POKÉDEX & FALTANDO -->
            <div class="dash-dex-section">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:9px">
                <span style="color:#94a3b8; font-weight:800; display:flex; align-items:center; gap:4px">
                  <span>📖 POKÉDEX:</span>
                  <b style="color:#38bdf8">${dexCaught} / ${dexTotal}</b>
                  <span style="color:#f87171; font-weight:700">(${dexMissing} faltando)</span>
                </span>
                <span class="dash-pct-pill emerald">🎯 ${dexPct}%</span>
              </div>
              <div class="dash-progress-track" style="margin-top:2px">
                <div class="dash-progress-fill poke-dex" style="width:${Math.max(0, Math.min(100, dexPct))}%"></div>
              </div>
            </div>

            <!-- ESTATÍSTICAS ACUMULADAS NO PERSONAGEM (BICHOS & SHINIES MORTOS) -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill" title="Total acumulado de Pokémon derrotados pelo personagem">
                <span class="dash-stat-label">💀 BICHOS MORTOS (CONTA):</span>
                <span class="dash-stat-val" style="color:#f87171; font-size:11px">
                  ${totalKills} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntKills})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de Pokémon Shinies derrotados ou registrados pelo personagem">
                <span class="dash-stat-label">⭐ SHINIES MORTOS (CONTA):</span>
                <span class="dash-stat-val" style="color:#fde047; font-size:11px">
                  ${totalShinies} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntShinies})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de capturas acumuladas no personagem">
                <span class="dash-stat-label">🎯 CAPTURAS TOTAIS (CONTA):</span>
                <span class="dash-stat-val" style="color:#38bdf8; font-size:11px">
                  ${totalCatches} <span style="font-size:8px; color:#94a3b8">(Sessão: ${huntCatches})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Alvo configurado na caçada automática">
                <span class="dash-stat-label">🎯 ALVO / HUNT:</span>
                <span class="dash-stat-val" style="color:#a855f7; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                  ${huntActive ? '⚔️ ' : '⏸ '}${huntTarget}
                </span>
              </div>
            </div>

            <!-- ESTOQUE DE BALLS & POÇÕES -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill">
                <span class="dash-stat-label">⚾ ULTRA BALLS (ESTOQUE):</span>
                <span class="dash-stat-val" style="color:#a855f7; font-size:11px">
                  ${ultraBalls} un
                </span>
              </div>
              <div class="dash-stat-pill">
                <span class="dash-stat-label">🧪 ULTRA POTS (ESTOQUE):</span>
                <span class="dash-stat-val" style="color:#ec4899; font-size:11px">
                  ${ultraPots} un
                </span>
              </div>
            </div>

            <!-- BALLS TACADAS (NORMAL & SHINY) -->
            <div class="dash-stats-row">
              <div class="dash-stat-pill" title="Total de bolas lançadas em Pokémon normais">
                <span class="dash-stat-label">⚾ BALLS NORMAIS TACADAS:</span>
                <span class="dash-stat-val" style="color:#fde047; font-size:11px">
                  ${(ballsStats.normalThrown || 0).toLocaleString()} <span style="font-size:8.5px; color:#94a3b8">(Alvo: ${ballsStats.targetNormal || 0})</span>
                </span>
              </div>
              <div class="dash-stat-pill" title="Total de bolas lançadas em Pokémon Shinies">
                <span class="dash-stat-label">✨ BALLS SHINIES TACADAS:</span>
                <span class="dash-stat-val" style="color:#c084fc; font-size:11px">
                  ${(ballsStats.shinyThrown || 0).toLocaleString()} <span style="font-size:8.5px; color:#94a3b8">(Alvo: ${ballsStats.targetShiny || 0})</span>
                </span>
              </div>
            </div>

            <!-- DROPS & ITENS DA MOCHILA -->
            <div class="dash-bag-section">
              <div class="dash-bag-head">
                <span style="font-size:9.5px; font-weight:800; color:#94a3b8; display:flex; align-items:center; gap:4px">
                  <span>🎒 DROPS & MOCHILA:</span>
                  <b style="color:#fde047">${bagItems.length} tipos</b>
                </span>
              </div>
              <div class="dash-bag-chips">
                ${bagItems.length > 0 ? bagItems.map(it => {
                  const ic = (typeof obterIconeItem === 'function') ? obterIconeItem(it.name) : { icon: '📦' };
                  return `
                    <div class="dash-bag-chip" title="${it.name} (${it.count} un) — Valor: $${(it.price * it.count).toLocaleString()}">
                      <span>${ic.icon}</span>
                      <span class="dash-bag-chip-name">${it.name}</span>
                      <span class="dash-bag-chip-qty">x${it.count}</span>
                    </div>
                  `;
                }).join('') : '<div style="font-size:9px; color:#64748b; font-style:italic; padding:2px">Mochila limpa</div>'}
              </div>
            </div>

            <!-- BOTÕES DE AÇÃO INDIVIDUAIS -->
            <div class="dash-card-actions">
              <button class="dash-btn ${huntActive ? 'dash-btn-yellow' : 'dash-btn-green'}" style="flex:1" onclick="toggleHuntConta(${i})">
                <span>${huntActive ? '⏸ Pausar' : '⚔️ Caçar'}</span>
              </button>
              <button class="dash-btn dash-btn-pink" style="flex:1" onclick="curarConta(${i})" title="Usar Poção">
                <span>💊 Curar</span>
              </button>
              <button class="dash-btn dash-btn-primary" style="padding:6px 8px" onclick="selectTab(${i})" title="Abrir em Tela Cheia">
                <span>👁️</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Ações Rápidas da Dashboard
    async function iniciarTodasHunts() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        wv.executeJavaScript(`
          try {
            if (window.gameState && window.gameState.auto) window.gameState.auto.hunt = true;
            const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
            if (btn && !btn.classList.contains('active')) btn.click();
          } catch(e) {}
        `).catch(() => {});
      }
      mostrarToast(`⚔️ Auto-Hunt INICIADO nas ${totalContas} contas simultaneamente!`, '🚀', 'toast-success', 4000);
      setTimeout(atualizarDashboardCompleta, 1000);
    }

    async function pausarTodasHunts() {
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        wv.executeJavaScript(`
          try {
            if (window.gameState && window.gameState.auto) window.gameState.auto.hunt = false;
            const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
            if (btn && btn.classList.contains('active')) btn.click();
          } catch(e) {}
        `).catch(() => {});
      }
      mostrarToast(`⏸ Auto-Hunt PAUSADO nas ${totalContas} contas.`, '⏸', 'normal', 3000);
      setTimeout(atualizarDashboardCompleta, 1000);
    }

    async function toggleHuntConta(idx) {
      const wv = webviews[idx];
      if (!wv) return;
      await wv.executeJavaScript(`
        try {
          if (window.gameState && window.gameState.auto) {
            window.gameState.auto.hunt = !window.gameState.auto.hunt;
          }
          const btn = document.getElementById('btn-auto-hunt') || document.querySelector('[data-action="auto-hunt"]');
          if (btn) btn.click();
        } catch(e) {}
      `).catch(() => {});
      setTimeout(atualizarDashboardCompleta, 600);
    }

    async function curarTodasContas() {
      for (let i = 0; i < totalContas; i++) {
        curarConta(i);
      }
      mostrarToast(`💊 Comando de cura enviado para todas as ${totalContas} contas!`, '✨', 'toast-success', 3500);
      setTimeout(atualizarDashboardCompleta, 1200);
    }

    async function curarConta(idx) {
      const wv = webviews[idx];
      if (!wv) return;
      await wv.executeJavaScript(`
        (async function() {
          try {
            if (typeof window.__executarAcaoTrade === 'function') {
              await window.__executarAcaoTrade('usePotion', { potion: 'ultra' });
            } else if (typeof Y === 'function') {
              await Y('usePotion', { potion: 'ultra' });
            }
          } catch(e) {}
        })()
      `).catch(() => {});
      setTimeout(atualizarDashboardCompleta, 800);
    }

    // ================================================================

// ===== 31-sala-trofeus-shinies-relatorios.js =====
    //  🌟 SALA DE TROFÉUS DE SHINIES & RELATÓRIOS (DISCORD / LOGS)
    // ================================================================
    function adicionarHistoricoShiny(index, nomeAba, charName, pokeName, tipo) {
      try {
        let historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
        const novo = {
          id: Date.now(),
          poke: pokeName || 'Pokémon',
          conta: nomeAba || `Conta ${index+1}`,
          trainer: charName || '',
          tipo: tipo || 'shiny',
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR'),
          timestamp: Date.now()
        };
        historico.unshift(novo);
        if (historico.length > 200) historico = historico.slice(0, 200);
        localStorage.setItem('idleSuiteShinyHistory', JSON.stringify(historico));
        renderizarGaleriaShiniesDashboard();
      } catch(e) {}
    }

    // Função para registrar troféus de bosses e míticos
    function adicionarHistoricoTrofeu(index, nomeAba, charName, pokeName, tipo) {
      adicionarHistoricoShiny(index, nomeAba, charName, pokeName, tipo);
    }

    function renderizarGaleriaShiniesDashboard() {
      const grid = document.getElementById('dashboard-shinies-grid');
      const badge = document.getElementById('dash-shiny-total-badge');
      if (!grid) return;

      let historico = [];
      try {
        historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
      } catch(e) {}

      // Contadores por tipo
      const contadores = { shiny: 0, boss: 0, mythic: 0, legendary: 0 };
      historico.forEach(s => { if (contadores[s.tipo] !== undefined) contadores[s.tipo]++; });

      if (badge) badge.textContent = `${historico.length} Troféus`;

      // Atualiza contadores no header
      const counterShiny = document.getElementById('trophy-counter-shiny');
      const counterBoss = document.getElementById('trophy-counter-boss');
      const counterMythic = document.getElementById('trophy-counter-mythic');
      const counterLegendary = document.getElementById('trophy-counter-legendary');
      if (counterShiny) counterShiny.textContent = `✨ ${contadores.shiny}`;
      if (counterBoss) counterBoss.textContent = `💀 ${contadores.boss}`;
      if (counterMythic) counterMythic.textContent = `🔮 ${contadores.mythic}`;
      if (counterLegendary) counterLegendary.textContent = `👑 ${contadores.legendary}`;

      if (!historico.length) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b; font-size:11.5px">
            🏆 Nenhum troféu registrado ainda nesta sessão. Assim que um Shiny, Boss ou Mítico for encontrado por qualquer conta, ele aparecerá aqui com foto e timestamp!
          </div>
        `;
        return;
      }

      const tipoConfig = {
        shiny:    { icon: '⭐', color: '#fde047', label: 'Shiny' },
        boss:     { icon: '💀', color: '#ef4444', label: 'Boss' },
        mythic:   { icon: '🔮', color: '#a78bfa', label: 'Mítico' },
        legendary:{ icon: '👑', color: '#fbbf24', label: 'Lendário' }
      };

      grid.innerHTML = historico.map(s => {
        const pokeClean = s.poke.toLowerCase().replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${pokeClean}.png`;
        const tc = tipoConfig[s.tipo] || tipoConfig.shiny;

        return `
          <div class="dash-shiny-card" style="border-left:3px solid ${tc.color}" title="[${tc.label}] ${s.poke} por ${s.trainer || s.conta} em ${s.data} às ${s.hora}">
            <img src="${spriteUrl}" style="width:36px; height:36px; object-fit:contain" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
            <div style="flex:1; overflow:hidden">
              <div style="font-size:11px; font-weight:900; color:${tc.color}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                ${tc.icon} ${s.poke}
              </div>
              <div style="font-size:9px; color:#38bdf8; font-weight:700">
                👤 ${s.trainer || s.conta}
              </div>
              <div style="font-size:8px; color:#94a3b8">
                🕒 ${s.data} ${s.hora} · <span style="color:${tc.color}">${tc.label}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function copiarRelatorioShiniesDiscord() {
      let historico = [];
      try {
        historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
      } catch(e) {}

      if (!historico.length) {
        mostrarToast('Nenhum troféu no histórico para copiar.', 'ℹ️', 'normal', 3000);
        return;
      }

      const tipoLabel = { shiny: '⭐ Shiny', boss: '💀 Boss', mythic: '🔮 Mítico', legendary: '👑 Lendário' };
      const tipoEmoji = { shiny: '⭐', boss: '💀', mythic: '🔮', legendary: '👑' };

      // Contadores
      const contadores = { shiny: 0, boss: 0, mythic: 0, legendary: 0 };
      historico.forEach(s => { if (contadores[s.tipo] !== undefined) contadores[s.tipo]++; });

      let relatorio = `🏆 **=== SALA DE TROFÉUS (IDLE POKÉMON 4X CLIENT) ===** 🏆\n`;
      relatorio += `📊 **Total:** ${historico.length} troféus\n`;
      if (contadores.shiny) relatorio += `  ⭐ Shinies: ${contadores.shiny}\n`;
      if (contadores.boss) relatorio += `  💀 Bosses: ${contadores.boss}\n`;
      if (contadores.mythic) relatorio += `  🔮 Míticos: ${contadores.mythic}\n`;
      if (contadores.legendary) relatorio += `  👑 Lendários: ${contadores.legendary}\n`;
      relatorio += `📅 **Gerado em:** ${new Date().toLocaleString('pt-BR')}\n\n`;

      historico.slice(0, 50).forEach((s, idx) => {
        const emoji = tipoEmoji[s.tipo] || '⭐';
        const label = tipoLabel[s.tipo] || 'Shiny';
        relatorio += `${idx + 1}. ${emoji} **${s.poke}** (${label}) | Treinador: **${s.trainer || s.conta}** | 🕒 ${s.data} ${s.hora}\n`;
      });

      navigator.clipboard.writeText(relatorio).then(() => {
        mostrarToast('📋 Relatório de Troféus copiado para o Clipboard (formato Discord)!', '🏆', 'toast-success', 4000);
      }).catch(() => {
        mostrarToast('Falha ao copiar para o clipboard.', '❌', 'normal', 3000);
      });
    }

    function limparHistoricoShinies() {
      if (confirm('Deseja limpar todo o histórico de Shinies registrados?')) {
        localStorage.removeItem('idleSuiteShinyHistory');
        renderizarGaleriaShiniesDashboard();
        mostrarToast('Histórico de Shinies limpo com sucesso.', '🧹', 'normal', 3000);
      }
    }

    const contasConectadas = [false, false, false, false];
    let todasConectadasNotificadas = false;
    let monitorTimer = null;

    async function monitorarConexaoContas() {
      let conectadasAgora = 0;
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        try {
          const inGame = await wv.executeJavaScript(`
            (function() {
              return Boolean(window.K && (window.K.player || window.K.connected) || (document.getElementById('topbar') && document.getElementById('topbar').offsetHeight > 0));
            })()
          `);
          if (inGame) {
            conectadasAgora++;
            if (!contasConectadas[i]) {
              contasConectadas[i] = true;
              mostrarToast(`Conta <b>${nomesAbas[i] || (i+1)}</b> conectou e está pronta!`, '🟢', 'normal', 3000);
            }
          }
        } catch(e) {}
      }

      if (conectadasAgora === 4 && !todasConectadasNotificadas) {
        todasConectadasNotificadas = true;
        mostrarToast('🎉 Todas as 4 Contas Conectadas e Operando a 100%!', '🚀', 'toast-success', 6000);
        if (monitorTimer) {
          clearInterval(monitorTimer);
          monitorTimer = null;
        }
      }
    }
    monitorTimer = setInterval(monitorarConexaoContas, 1500);

    // =====================================================
    // === BANCO DE DADOS & MOTOR DO AVALIADOR DE POKÉMON META ===

// ===== 32-banco-dados-avaliador-meta.js =====
    // =====================================================
    const META_POKEMON_DB = {
      'venusaur': {
        role: '🌾 Fast Farmer & Anti-Fada / Água',
        held: '🌿 Miracle Seed / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Venom Cascade (Lv 100)', stab: true, type: 'Venenoso', dps: '100.0/s' },
          { name: 'Thunderbolt [TM24]', stab: false, type: 'Elétrico', dps: '63.3/s' },
          { name: 'Petal Dance (Lv 86)', stab: true, type: 'Planta', dps: '60.0/s' },
          { name: 'Seed Bomb (Lv 45)', stab: true, type: 'Planta', dps: '53.3/s' }
        ]
      },
      'golurk': {
        role: '🤖 Nuke Físico de Boss & Caça',
        held: '🥋 Expert Belt / 🥊 Muscle Band',
        tierBase: 'S',
        moves: [
          { name: 'Earthquake (Lv 81)', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Dynamic Punch (Lv 70)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Hammer Arm (Lv 89)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Shadow Punch (Lv 30)', stab: true, type: 'Fantasma', dps: '40.0/s' }
        ]
      },
      'swampert': {
        role: '🐸 Bruiser Água/Terra Anti-Elétrico',
        held: '🌊 Mystic Water / 🍎 Leftovers',
        tierBase: 'S',
        moves: [
          { name: 'Earthquake [TM26]', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Waterfall [TM98]', stab: true, type: 'Água', dps: '53.3/s' },
          { name: 'Ice Beam [TM13]', stab: false, type: 'Gelo', dps: '60.0/s' },
          { name: 'Hammer Arm (Lv 69)', stab: false, type: 'Lutador', dps: '66.7/s' }
        ]
      },
      'regirock': {
        role: '🗿 Tanque Supremo de Boss & Gym',
        held: '🪨 Hard Stone / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Stone Edge (Lv 81)', stab: true, type: 'Pedra', dps: '66.7/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Hammer Arm (Lv 43)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Drain Punch [TM]', stab: false, type: 'Lutador', dps: '50.0/s' }
        ]
      },
      'chandelure': {
        role: '🔥 Nuke Especial Destruidor de Boss',
        held: '🔥 Charcoal / 👓 Choice Specs',
        tierBase: 'S+',
        moves: [
          { name: 'Shadow Ball [TM30]', stab: true, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Flamethrower [TM35]', stab: true, type: 'Fogo', dps: '60.0/s' },
          { name: 'Energy Ball [TM53]', stab: false, type: 'Planta', dps: '60.0/s' },
          { name: 'Psychic [TM29]', stab: false, type: 'Psíquico', dps: '60.0/s' }
        ]
      },
      'garchomp': {
        role: '🐉 Fast Sweeper Físico Meta',
        held: '🔥 Life Orb / 🥊 Muscle Band',
        tierBase: 'S+',
        moves: [
          { name: 'Outrage (Lv 82)', stab: true, type: 'Dragão', dps: '80.0/s' },
          { name: 'Earthquake (Lv 40)', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Stone Edge [TM71]', stab: false, type: 'Pedra', dps: '66.7/s' },
          { name: 'Fire Fang (Lv 1)', stab: false, type: 'Fogo', dps: '43.3/s' }
        ]
      },
      'hydreigon': {
        role: '🐲 Special Sweeper Levitate',
        held: '👓 Choice Specs / 🔥 Life Orb',
        tierBase: 'S+',
        moves: [
          { name: 'Dragon Pulse (Lv 55)', stab: true, type: 'Dragão', dps: '56.7/s' },
          { name: 'Dark Pulse [TM97]', stab: true, type: 'Sombrio', dps: '53.3/s' },
          { name: 'Flamethrower [TM35]', stab: false, type: 'Fogo', dps: '60.0/s' },
          { name: 'Earth Power [TM]', stab: false, type: 'Terra', dps: '60.0/s' }
        ]
      },
      'gengar': {
        role: '👻 Special Fast Sweeper',
        held: '👓 Choice Specs / 🔥 Life Orb',
        tierBase: 'S+',
        moves: [
          { name: 'Shadow Ball [TM30]', stab: true, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Sludge Bomb [TM36]', stab: true, type: 'Venenoso', dps: '60.0/s' },
          { name: 'Focus Blast [TM52]', stab: false, type: 'Lutador', dps: '80.0/s' },
          { name: 'Thunderbolt [TM24]', stab: false, type: 'Elétrico', dps: '63.3/s' }
        ]
      },
      'gyarados': {
        role: '🌊 Physical Dragon Bruiser',
        held: '🔥 Life Orb / 🥊 Muscle Band',
        tierBase: 'S',
        moves: [
          { name: 'Waterfall [TM98]', stab: true, type: 'Água', dps: '53.3/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Ice Fang (Lv 32)', stab: false, type: 'Gelo', dps: '43.3/s' },
          { name: 'Crunch (Lv 41)', stab: false, type: 'Sombrio', dps: '53.3/s' }
        ]
      },
      'alakazam': {
        role: '🔮 Special Nuker de Velocidade',
        held: '👓 Choice Specs / 🥋 Focus Sash',
        tierBase: 'S',
        moves: [
          { name: 'Psychic [TM29]', stab: true, type: 'Psíquico', dps: '60.0/s' },
          { name: 'Shadow Ball [TM30]', stab: false, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Focus Blast [TM52]', stab: false, type: 'Lutador', dps: '80.0/s' },
          { name: 'Energy Ball [TM53]', stab: false, type: 'Planta', dps: '60.0/s' }
        ]
      },
      'tyranitar': {
        role: '🦖 Tank & Sweeper Pesado',
        held: '🥋 Choice Band / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Stone Edge (Lv 73)', stab: true, type: 'Pedra', dps: '66.7/s' },
          { name: 'Crunch (Lv 47)', stab: true, type: 'Sombrio', dps: '53.3/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Fire Punch [TM]', stab: false, type: 'Fogo', dps: '50.0/s' }
        ]
      },
      'machamp': {
        role: '🥊 Physical Fighter Nuke',
        held: '🥊 Muscle Band / 🔥 Flame Orb',
        tierBase: 'S',
        moves: [
          { name: 'Dynamic Punch (Lv 51)', stab: true, type: 'Lutador', dps: '66.7/s' },
          { name: 'Stone Edge [TM71]', stab: false, type: 'Pedra', dps: '66.7/s' },
          { name: 'Knock Off [TM]', stab: false, type: 'Sombrio', dps: '43.3/s' },
          { name: 'Bullet Punch (Lv 1)', stab: false, type: 'Aço', dps: '26.7/s' }
        ]
      }
    };

    let avaliadorPokesCache = [];

    function atualizarSelectContasAvaliador() {
      const select = document.getElementById('eval-filter-conta');
      if (!select) return;

      const valorAtual = select.value;
      let html = `<option value="all">⭐ Todas as ${totalContas} Contas</option>`;
      for (let i = 0; i < totalContas; i++) {
        const nome = nomesAbas[i] || `Conta ${i + 1}`;
        html += `<option value="${i}">👑 Conta ${i + 1} (${nome})</option>`;
      }
      select.innerHTML = html;

      // Preserva o filtro selecionado se ainda for válido
      if (valorAtual === 'all' || (parseInt(valorAtual) >= 0 && parseInt(valorAtual) < totalContas)) {
        select.value = valorAtual;
      } else {
        select.value = 'all';
      }

      // Atualiza a badge do topo
      const badge = document.getElementById('eval-header-multicontas-badge');
      if (badge) {
        badge.textContent = `${totalContas}x MULTI-CONTAS`;
      }

      // Espelha pro select v2 (mesmas opções, mesmo valor)
      const select2 = document.getElementById('v2-eval-filter-conta');
      if (select2) {
        const valorAtual2 = select2.value;
        select2.innerHTML = html;
        select2.value = (valorAtual2 === 'all' || (parseInt(valorAtual2) >= 0 && parseInt(valorAtual2) < totalContas)) ? valorAtual2 : 'all';
      }
      const badge2 = document.getElementById('v2-eval-header-multicontas-badge');
      if (badge2) badge2.textContent = `${totalContas}x`;
    }

    function abrirModalAvaliadorMeta() {
      const m = document.getElementById('modal-avaliador-meta');
      if (!m) return;
      m.classList.add('active');
      atualizarSelectContasAvaliador();
      atualizarAvaliadorMeta(false);
    }

    function fecharModalAvaliadorMeta() {
      const m = document.getElementById('modal-avaliador-meta');
      if (m) m.classList.remove('active');
    }

    // =====================================================================
    // PONTUAÇÃO — alinhada com os números do próprio jogo
    // =====================================================================
    // Auditado contra idlepokemoon.com.br (api/state, api/tiers, app-1.js).
    // O jogo entrega, por Pokémon, TRÊS eixos de qualidade independentes:
    //
    //   1. `iv` (0 … 2.5)  → multiplicador de raridade. api/tiers.html mapeia
    //      a faixa pro nome: Fraca <1 · Comum <1.1 · Incomum <1.3 · Rara <1.5
    //      · Épica <1.7 · Lendária <2 · Mítica <2.5. É rolado na captura e
    //      NUNCA muda. Regressão em 112 Bulbasaurs Lv.1 do state real:
    //          power ≈ -43.6 + 91.56*iv + 0.0797*growthTotal   (erro médio 1.0)
    //      ou seja: o iv é o que manda no power.
    //   2. `growthTotal` / `growthTotalMax` (o jogo chama isso de "IV (Growth)")
    //      → 6 stats de 0 a `growthMax` (32), total 192. Também é rolado na
    //      captura. Pesa pouco em nível baixo e MUITO em nível alto (no
    //      Venusaur Lv.409 do state, `growthBonus.def` = 688 de 1745 de DEF).
    //   3. `tier` da ESPÉCIE (S/A/B/C) → vem pronto do servidor,
    //      "poder da espécie medido no alvo neutro" (tierTagHTML, app-1.js).
    //
    // E entrega o resultado já calculado: `power` e `dps`.
    //
    // A fórmula ANTERIOR usava só o growth (+ bônus fixos de shiny/lendário/
    // boost + um DB de 15 espécies escrito à mão) e ignorava iv, tier, power e
    // dps. Consequência medida no state real: um Bulbasaur Lv.1 de growth 87%
    // era pontuado "S 87%" enquanto um Chandelure Lv.220 saía abaixo — sendo
    // que o Chandelure faz 23.871 de DPS contra 30 do Bulbasaur.
    //
    // Agora existem DUAS notas, porque são duas perguntas diferentes:
    //   • `power` / `dps` → "quem bate mais AGORA". Número do jogo, sem modelo.
    //   • `score` (Ficha) → "de N cópias que eu cacei, qual vale criar".
    //     Independente de nível, feito só dos dois atributos rolados na captura.
    const IV_MAX_JOGO = 2.5;                 // api/tiers.html → "ivMax": 2.5
    const TIER_JOGO_PESO = { S: 100, A: 75, B: 50, C: 25 };

    // Peso entre os dois eixos rolados na captura.
    //
    // Calibrado contra os 56 Bulbasaur Lv.1 do state real (mesma espécie e
    // mesmo nível ⇒ `power` é a verdade absoluta). Correlação de postos entre
    // a nota e o `power` do jogo, variando o peso:
    //     100% growth (fórmula ANTIGA) → -0,109   ← pior que sorteio
    //      50/50                       → +0,436
    //      75/25  (escolhido)          → +0,87
    //      90/10                       → +0,971
    // O ótimo medido é ~90% IV, MAS isso vale pra Lv.1, onde o growth quase não
    // entra na conta. Em nível alto ele vira ~40% dos stats (Venusaur Lv.409 do
    // state: growthBonus.def 688 de 1745 de DEF), e não há no state amostra de
    // cópias variadas em nível alto pra medir esse extremo. 75/25 é o meio-termo
    // deliberado: quase ótimo hoje, sem zerar o eixo que cresce depois.
    //
    // Pra comparação EXATA entre cópias do mesmo nível, ordene por Power/DPS —
    // são números do próprio jogo e não passam por este peso.
    const PESO_IV = 0.75;
    const PESO_GROWTH = 0.25;

    // Quando a espécie não está no META_POKEMON_DB (15 de 151+), o fallback
    // antigo era um placeholder fixo ("Golpe Principal STAB", "Cobertura 1"…)
    // que não dizia nada. O jogo manda o moveset recomendado dele em `wm`
    // (só no card cheio — time/ativo; a box vem leve, sem esse campo).
    function montarMetaGenerica(pk, tier) {
      const tipos = [pk.type1, pk.type2].filter(t => t && t !== 'none');
      const wm = Array.isArray(pk.wm) ? pk.wm : [];
      const moves = wm.length
        ? wm.map((nome, i) => ({ name: String(nome).split(/\s+/).join(' '), stab: i === 0, type: 'Recomendado do jogo', dps: '—' }))
        : [{ name: 'Moveset só aparece no time (box vem sem)', stab: false, type: '—', dps: '—' }];
      return {
        role: tipos.length ? ('⚔️ ' + tipos.join(' / ')) : '⚔️ Combatente Padrão',
        held: pk.heldNome ? ('🧤 ' + pk.heldNome + ' T' + (pk.heldTier || 1)) : 'sem item segurado',
        tierBase: tier,
        moves: moves
      };
    }

    function calcularFichaPoke(pk) {
      const gTotal = (pk.growthTotal != null)
        ? Number(pk.growthTotal)
        : (pk.growth ? Object.values(pk.growth).reduce((a, b) => a + Number(b || 0), 0) : null);
      const gMax = Number(pk.growthTotalMax) || 192;
      // O jogo já manda growthPct pronto; só recalculamos se ele não veio.
      const gPct = (pk.growthPct != null)
        ? Number(pk.growthPct)
        : (gTotal != null ? Math.round((gTotal / gMax) * 100) : null);

      const iv = Number(pk.iv) || 0;
      const ivPct = Math.max(0, Math.min(100, Math.round((iv / IV_MAX_JOGO) * 100)));

      // Nota da ficha: só o que foi rolado na captura e não muda mais.
      // Sem clamp em 100 artificial — é média ponderada de dois 0..100, então
      // já nasce na faixa certa (a fórmula antiga estourava 100 e achatava
      // vários Pokémon distintos no mesmo "100%", justo no topo do ranking).
      const ficha = (gPct != null)
        ? Math.round(PESO_IV * ivPct + PESO_GROWTH * gPct)
        : ivPct;

      return { gTotal, gMax, gPct, iv, ivPct, ficha };
    }

    async function atualizarAvaliadorMeta(forceRefresh = false) {
      atualizarSelectContasAvaliador();
      if (forceRefresh || !inventariosContas.some(inv => inv && inv.pokes && inv.pokes.length)) {
        await carregarInventariosTradeHub();
      }

      const todosPokes = [];
      const contagemEspecies = {};

      for (let contaIdx = 0; contaIdx < totalContas; contaIdx++) {
        const inv = inventariosContas[contaIdx];
        if (!inv || !inv.pokes) continue;

        inv.pokes.forEach(pk => {
          const nomeClean = (pk.name || '').toLowerCase().trim();
          contagemEspecies[nomeClean] = (contagemEspecies[nomeClean] || 0) + 1;

          const { gTotal, gMax, gPct, iv, ivPct, ficha } = calcularFichaPoke(pk);

          let growthDesc = '';
          if (pk.growth && typeof pk.growth === 'object') {
            const g = pk.growth;
            growthDesc = `HP ${g.hp || 0} • Atk ${g.atk || 0} • Def ${g.def || 0} • SpA ${g.spa || 0} • SpD ${g.spd || 0} • Vel ${g.spe || g.vel || 0}`;
          }

          // O tier é o da ESPÉCIE, vindo do jogo (S/A/B/C). Se a ficha veio de
          // um build antigo do coletor (sem tierJogo), cai no DB local e, em
          // último caso, em 'C' — mas nunca mais inventamos "S+", que não
          // existe na escala do jogo.
          const metaInfo = META_POKEMON_DB[nomeClean];
          const tier = pk.tierJogo
            || (metaInfo && metaInfo.tierBase === 'S+' ? 'S' : (metaInfo && metaInfo.tierBase))
            || 'C';
          const scoreFinal = ficha;

          todosPokes.push({
            id: pk.id,
            name: pk.name,
            cleanName: nomeClean,
            level: pk.level || 1,
            shiny: !!pk.shiny,
            legendary: !!pk.legendary,
            boost: pk.boost || 0,
            rarity: pk.rarity || 'Comum',
            iv: iv,
            ivPct: ivPct,
            power: Number(pk.power || 0),
            dps: Number(pk.dps || 0),
            speed: Number(pk.speed || 0),
            boostMax: Number(pk.boostMax || 100),
            hab: pk.hab || null,
            type1: pk.type1 || '',
            type2: pk.type2 || '',
            held: pk.held || null,
            heldNome: pk.heldNome || null,
            heldTier: pk.heldTier != null ? pk.heldTier : null,
            wm: Array.isArray(pk.wm) ? pk.wm : [],
            growthTotal: gTotal,
            growthTotalMax: gMax,
            growthPct: gPct,
            growthDesc: growthDesc,
            growth: pk.growth || null,   // objeto cru {hp,atk,def,spa,spd,spe} pros chips por stat
            growthMax: Number(pk.growthMax || 32),  // teto por stat (shell/25 já traz do jogo)
            nature: pk.nature || '',
            natureTxt: pk.natureTxt || '',
            stats: pk.stats || null,
            moves: pk.moves || [],
            locked: !!pk.locked,
            sell: pk.sell || 0,
            aura: pk.aura || null,
            catchInfo: pk.catchInfo || '',
            // O servidor recusa Ditto em troca (o próprio jogo o esconde da
            // grade de oferta). O Alto Comando precisa saber disso pra não
            // planejar uma sessão de troca que já nasce recusada.
            isDitto: !!pk.isDitto,
            isTeam: !!pk.isTeam,
            contaIdx: contaIdx,
            contaNome: nomesAbas[contaIdx] || `Conta ${contaIdx + 1}`,
            score: scoreFinal,
            tier: tier,
            meta: metaInfo || montarMetaGenerica(pk, tier)
          });
        });
      }

      // Determina quais são as melhores cópias de cada espécie
      const melhorScorePorEspecie = {};
      todosPokes.forEach(p => {
        if (!melhorScorePorEspecie[p.cleanName] || p.score > melhorScorePorEspecie[p.cleanName].score || (p.score === melhorScorePorEspecie[p.cleanName].score && p.level > melhorScorePorEspecie[p.cleanName].level)) {
          melhorScorePorEspecie[p.cleanName] = p;
        }
      });

      todosPokes.forEach(p => {
        p.totalCopias = contagemEspecies[p.cleanName] || 1;
        p.isMelhorCopia = (p.totalCopias > 1 && melhorScorePorEspecie[p.cleanName] && melhorScorePorEspecie[p.cleanName].id === p.id);
        p.isDuplicataInferior = (p.totalCopias > 1 && !p.isMelhorCopia);
      });

      // RANKING — posição por score (desempate: growth, depois level). Dois
      // rankings, porque respondem perguntas diferentes:
      //   rankGeral   → onde este poke está no acervo inteiro das contas
      //   rankEspecie → qual cópia desta espécie ele é (o que decide o que vender)
      // Empate de ficha entre espécies diferentes: quem for de tier melhor
      // (poder de espécie, do jogo) vem antes; depois desempata por growth.
      const porScore = (a, b) =>
        (b.score - a.score)
        || ((TIER_JOGO_PESO[b.tier] || 0) - (TIER_JOGO_PESO[a.tier] || 0))
        || ((b.growthTotal || 0) - (a.growthTotal || 0))
        || ((b.level || 0) - (a.level || 0));

      todosPokes.slice().sort(porScore).forEach((p, i) => {
        p.rankGeral = i + 1;
        p.rankGeralTotal = todosPokes.length;
      });

      // Ranking "quem bate mais AGORA" — dps é número do próprio jogo, então
      // aqui não tem modelo nenhum no meio. É a resposta pra "qual eu boto pra
      // farmar hoje", enquanto o rankGeral responde "qual vale criar".
      todosPokes.slice()
        .sort((a, b) => (b.dps - a.dps) || (b.power - a.power) || (b.level - a.level))
        .forEach((p, i) => { p.rankDps = i + 1; });

      const porEspecie = {};
      todosPokes.forEach(p => { (porEspecie[p.cleanName] = porEspecie[p.cleanName] || []).push(p); });
      Object.values(porEspecie).forEach(lista => {
        lista.slice().sort(porScore).forEach((p, i) => {
          p.rankEspecie = i + 1;
          p.rankEspecieTotal = lista.length;
        });
      });

      avaliadorPokesCache = todosPokes;
      
      const totalEl = document.getElementById('eval-stat-total');
      if (totalEl) totalEl.textContent = `${todosPokes.length} Pokémon Analisados`;
      const totalEl2 = document.getElementById('v2-eval-stat-total');
      if (totalEl2) totalEl2.textContent = `${todosPokes.length} Pokémon`;

      renderizarAvaliadorMeta();
    }

    // === GERENCIAMENTO DE SELEÇÃO EM MASSA (AVALIADOR META) ===

// ===== 33-selecao-massa-avaliador-meta.js =====
    const pokesSelecionadosMeta = new Set();

    function aoTogglePokeSelecionado(key, checked) {
      if (checked) pokesSelecionadosMeta.add(key);
      else pokesSelecionadosMeta.delete(key);
      atualizarSumarioSelecaoMeta();
    }

    function obterPokesVisiveisFiltrados() {
      const fConta = document.getElementById('eval-filter-conta')?.value || 'all';
      const fOrigem = document.getElementById('eval-filter-origem')?.value || 'all';
      const fTier = document.getElementById('eval-filter-tier')?.value || 'all';
      const fOrdem = document.getElementById('eval-filter-ordem')?.value || 'score_desc';
      const busca = (document.getElementById('eval-search-input')?.value || '').toLowerCase().trim();

      let lista = [...avaliadorPokesCache];

      if (fConta !== 'all') {
        const cIdx = parseInt(fConta);
        lista = lista.filter(p => p.contaIdx === cIdx);
      }

      if (fOrigem === 'team') lista = lista.filter(p => p.isTeam);
      else if (fOrigem === 'box') lista = lista.filter(p => !p.isTeam);

      if (fTier === 'best_copies') lista = lista.filter(p => p.isMelhorCopia || p.totalCopias === 1);
      else if (fTier === 'inferior_copies') lista = lista.filter(p => p.isDuplicataInferior);
      // 'S+' não existe na escala do jogo (S/A/B/C). O valor antigo continua
      // aceito porque pode estar salvo no <select>; cai em S.
      else if (fTier === 's_plus' || fTier === 's') lista = lista.filter(p => p.tier === 'S');
      else if (fTier === 'a') lista = lista.filter(p => p.tier === 'A');
      else if (fTier === 'b') lista = lista.filter(p => p.tier === 'B');
      else if (fTier === 'c') lista = lista.filter(p => p.tier === 'C');
      else if (fTier === 'descarte') lista = lista.filter(p => p.score < 60 || p.isDuplicataInferior);
      else if (fTier === 'duplicates') lista = lista.filter(p => p.totalCopias > 1);
      else if (fTier === 'shiny') lista = lista.filter(p => p.shiny);
      else if (fTier === 'legendary') lista = lista.filter(p => p.legendary);

      if (busca) {
        lista = lista.filter(p => p.name.toLowerCase().includes(busca) || (p.meta && p.meta.role.toLowerCase().includes(busca)));
      }

      if (fOrdem === 'score_desc') lista.sort((a, b) => b.score - a.score || b.power - a.power);
      else if (fOrdem === 'score_asc') lista.sort((a, b) => a.score - b.score || a.power - b.power);
      // 'iv_desc' ordenava por growthTotal — o rótulo dizia IV mas o campo era
      // outro. Agora existem as duas ordens, separadas, mais poder/dps.
      else if (fOrdem === 'iv_desc') lista.sort((a, b) => (b.iv || 0) - (a.iv || 0) || b.score - a.score);
      else if (fOrdem === 'growth_desc') lista.sort((a, b) => (b.growthPct || 0) - (a.growthPct || 0) || b.score - a.score);
      else if (fOrdem === 'dps_desc') lista.sort((a, b) => (b.dps || 0) - (a.dps || 0) || (b.power || 0) - (a.power || 0));
      else if (fOrdem === 'power_desc') lista.sort((a, b) => (b.power || 0) - (a.power || 0) || (b.dps || 0) - (a.dps || 0));
      else if (fOrdem === 'level_desc') lista.sort((a, b) => b.level - a.level || b.score - a.score);
      else if (fOrdem === 'level_asc') lista.sort((a, b) => a.level - b.level || a.score - b.score);
      else if (fOrdem === 'sell_desc') lista.sort((a, b) => (b.sell || 0) - (a.sell || 0) || b.score - a.score);
      else if (fOrdem === 'name_asc') lista.sort((a, b) => a.name.localeCompare(b.name));

      return lista;
    }

    function atualizarSumarioSelecaoMeta() {
      const summaryEl = document.getElementById('eval-selected-summary');
      const allChk = document.getElementById('eval-select-all-chk');
      const visiveis = obterPokesVisiveisFiltrados();
      
      let totalGold = 0;
      let count = 0;
      avaliadorPokesCache.forEach(p => {
        const key = `${p.contaIdx}_${p.id}`;
        if (pokesSelecionadosMeta.has(key)) {
          count++;
          totalGold += (p.sell || 0);
        }
      });

      const resumoTxt = count > 0 ? `${count} selecionados · 💰 $${totalGold.toLocaleString('pt-BR')}` : '0 selecionados';
      if (summaryEl) summaryEl.textContent = resumoTxt;
      const summaryEl2 = document.getElementById('v2-eval-selected-summary');
      if (summaryEl2) summaryEl2.textContent = resumoTxt;

      if (allChk && visiveis.length > 0) {
        const todosVisiveisSelected = visiveis.every(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
        allChk.checked = todosVisiveisSelected;
        const allChk2 = document.getElementById('v2-eval-select-all-chk');
        if (allChk2) allChk2.checked = todosVisiveisSelected;
      }

      // Sincronizar painel lateral se aberto (v1 e v2)
      const sidePanel = document.getElementById('eval-side-panel');
      if (sidePanel && sidePanel.classList.contains('open')) {
        renderizarEvalSidePanel();
      }
      const sidePanel2 = document.getElementById('v2-eval-side-panel');
      if (sidePanel2 && sidePanel2.classList.contains('open') && typeof renderizarEvalSidePanel === 'function') {
        renderizarEvalSidePanel();
      }
    }

    function aoAlternarSelecionarTodos(checked) {
      const visiveis = obterPokesVisiveisFiltrados();
      visiveis.forEach(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        if (checked) pokesSelecionadosMeta.add(key);
        else pokesSelecionadosMeta.delete(key);
      });
      renderizarAvaliadorMeta();
    }

    function selecionarPorCriterio(criterio) {
      const visiveis = obterPokesVisiveisFiltrados();
      visiveis.forEach(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        if (criterio === 'inferior_copies' && pk.isDuplicataInferior) {
          pokesSelecionadosMeta.add(key);
        } else if (criterio === 'tier_c' && (pk.score < 60 || pk.tier === 'C')) {
          pokesSelecionadosMeta.add(key);
        }
      });
      renderizarAvaliadorMeta();
    }

    function selecionarPorThreshold() {
      const threshold = parseInt(document.getElementById('eval-threshold-select')?.value) || 50;
      const visiveis = obterPokesVisiveisFiltrados();
      let count = 0;
      visiveis.forEach(pk => {
        if (pk.score <= threshold) {
          const key = `${pk.contaIdx}_${pk.id}`;
          pokesSelecionadosMeta.add(key);
          count++;
        }
      });
      renderizarAvaliadorMeta();
      mostrarToast(`🎯 ${count} Pokémon com Score ≤ ${threshold}% selecionados`, '🎯', 'toast-success', 2500);
      abrirEvalSidePanel();
    }

    // === PAINEL LATERAL DE SELEÇÃO ===

// ===== 34-painel-lateral-selecao.js =====
    function toggleEvalSidePanel() {
      const panel = document.getElementById('eval-side-panel');
      if (!panel) return;
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        panel.style.display = 'none';
      } else {
        abrirEvalSidePanel();
      }
    }

    function abrirEvalSidePanel() {
      const panel = document.getElementById('eval-side-panel');
      if (!panel) return;
      panel.style.display = 'flex';
      requestAnimationFrame(() => {
        panel.classList.add('open');
      });
      renderizarEvalSidePanel();
    }

    function renderizarEvalSidePanel() {
      const listEl = document.getElementById('eval-side-panel-list');
      const countEl = document.getElementById('eval-side-panel-count');
      const statsEl = document.getElementById('eval-side-panel-stats');
      const listEl2 = document.getElementById('v2-eval-side-panel-list');
      const countEl2 = document.getElementById('v2-eval-side-panel-count');
      const statsEl2 = document.getElementById('v2-eval-side-panel-stats');
      if (!listEl && !listEl2) return;

      const selected = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (countEl) countEl.textContent = selected.length;
      if (countEl2) countEl2.textContent = selected.length;

      // Stats
      const totalScore = selected.reduce((s, p) => s + (p.score || 0), 0);
      const avgScore = selected.length ? Math.round(totalScore / selected.length) : 0;
      const rarities = {};
      selected.forEach(p => { const r = p.raridade || 'Comum'; rarities[r] = (rarities[r] || 0) + 1; });
      const statsHtml = `
        <span style="font-size:9px; color:#94a3b8; background:rgba(15,23,42,0.6); padding:2px 7px; border-radius:5px; border:1px solid rgba(148,163,184,0.15)">⚡ Média: <b style='color:${avgScore >= 60 ? '#4ade80' : avgScore >= 40 ? '#fbbf24' : '#f87171'}'>${avgScore}%</b></span>
        ${Object.entries(rarities).slice(0, 3).map(([r, c]) => `<span style="font-size:9px; color:#94a3b8; background:rgba(15,23,42,0.6); padding:2px 7px; border-radius:5px; border:1px solid rgba(148,163,184,0.15)">${r}: <b style='color:#c084fc'>${c}</b></span>`).join('')}
      `;
      if (statsEl) statsEl.innerHTML = statsHtml;
      if (statsEl2) statsEl2.innerHTML = statsHtml;

      if (!selected.length) {
        const vazio = '<div style="text-align:center; color:#64748b; padding:30px 10px; font-size:11px">Nenhum Pokémon selecionado.<br>Use os filtros acima para selecionar.</div>';
        if (listEl) listEl.innerHTML = vazio;
        if (listEl2) listEl2.innerHTML = vazio;
        return;
      }

      // Ordenar por score crescente (piores primeiro)
      selected.sort((a, b) => (a.score || 0) - (b.score || 0));

      const itemsHtml2 = listEl2 ? selected.map(pk => {
        const spriteUrl2 = pk.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.id}.png`;
        const tier2 = pk.tier || 'C';
        const scoreColor2 = pk.score >= 80 ? '#4ade80' : pk.score >= 60 ? '#fbbf24' : pk.score >= 40 ? '#f97316' : '#ef4444';
        return `
          <div class="v2eval-side-item">
            <img src="${spriteUrl2}" onerror="this.style.display='none'">
            <div style="flex:1; min-width:0;">
              <div class="n">${pk.shiny ? '✨ ' : ''}${pk.name || '???'}</div>
              <div class="m">Lv.${pk.level || 1} · ${tier2}</div>
            </div>
            <span class="sc" style="color:${scoreColor2}">${pk.score}%</span>
            <button onclick="removerDoSidePanel('${pk.contaIdx}_${pk.id}')">✕</button>
          </div>
        `;
      }).join('') : '';
      if (listEl2) listEl2.innerHTML = itemsHtml2;
      if (!listEl) return;

      listEl.innerHTML = selected.map(pk => {
        const spriteUrl = pk.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pk.id}.png`;
        const tier = pk.tier || 'C';
        const tierColors = { 'S+': '#f59e0b', S: '#a855f7', A: '#22c55e', B: '#3b82f6', C: '#6b7280' };
        const tc = tierColors[tier] || '#6b7280';
        const scoreColor = pk.score >= 80 ? '#4ade80' : pk.score >= 60 ? '#fbbf24' : pk.score >= 40 ? '#f97316' : '#ef4444';
        const growthPct = pk.growthTotal || 0;
        return `
          <div class="eval-side-panel-item" data-key="${pk.contaIdx}_${pk.id}">
            <img class="pokemon-sprite" src="${spriteUrl}" alt="" onerror="this.style.display='none'">
            <div style="flex:1; min-width:0">
              <div class="poke-name">${pk.shiny ? '✨ ' : ''}${pk.name || '???'}</div>
              <div class="poke-meta">Lv.${pk.level || 1} · ${pk.contaNome || pk.contaIdx} · <span style="color:${tc}; font-weight:800">${tier}</span></div>
              <div class="poke-meta">📈 ${growthPct}% · 🧬 ${pk.ivTotal || '?'}/192</div>
            </div>
            <div class="poke-score" style="background:rgba(${pk.score >= 60 ? '34,197,94' : pk.score >= 40 ? '245,158,11' : '239,68,68'},0.2); color:${scoreColor}; border:1px solid rgba(${pk.score >= 60 ? '34,197,94' : pk.score >= 40 ? '245,158,11' : '239,68,68'},0.4)">${pk.score}%</div>
            <button class="poke-remove" onclick="removerDoSidePanel('${pk.contaIdx}_${pk.id}')" title="Remover">✕</button>
          </div>
        `;
      }).join('');
    }

    function removerDoSidePanel(key) {
      pokesSelecionadosMeta.delete(key);
      renderizarAvaliadorMeta();
      renderizarEvalSidePanel();
    }

    async function executarAcaoEmMassaTrade(acao) {
      const alvos = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (!alvos.length) {
        mostrarToast('Nenhum Pokémon selecionado no painel.', '⚠️', 'normal', 2500);
        return;
      }
      if (acao === 'sell') {
        executarVendaEmMassa();
      } else if (acao === 'lock') {
        executarAcaoEmMassa('lock');
      }
      renderizarEvalSidePanel();
    }

    function limparSelecaoMeta() {
      pokesSelecionadosMeta.clear();
      renderizarAvaliadorMeta();
      const panel = document.getElementById('eval-side-panel');
      if (panel && panel.classList.contains('open')) {
        renderizarEvalSidePanel();
      }
    }

    async function executarAcaoEmMassa(acao) {
      if (!pokesSelecionadosMeta.size) {
        mostrarToast('Selecione pelo menos um Pokémon usando as checkboxes.', '⚠️', 'normal', 3000);
        return;
      }

      const alvos = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      if (!alvos.length) return;


      if (acao === 'lock' || acao === 'unlock') {
        const isLock = (acao === 'lock');
        mostrarToast(`${isLock ? '🔒 Bloqueando' : '🔓 Desbloqueando'} ${alvos.length} Pokémon...`, isLock ? '🔒' : '🔓', 'normal', 2500);

        for (const pk of alvos) {
          const wv = webviews[pk.contaIdx];
          if (wv) {
            await executarAcaoTradeNoWebview(wv, 'lockPoke', { pokeId: pk.id });
            pk.locked = isLock;
          }
        }
        mostrarToast(`${alvos.length} Pokémon ${isLock ? '🔒 Bloqueados' : '🔓 Desbloqueados'} com sucesso!`, isLock ? '🔒' : '🔓', 'toast-success', 3000);
        renderizarAvaliadorMeta();
      }
    }

    async function executarVendaEmMassa() {
      if (!pokesSelecionadosMeta.size) {
        mostrarToast('Selecione pelo menos um Pokémon para vender.', '⚠️', 'normal', 3000);
        return;
      }

      const selecionados = avaliadorPokesCache.filter(p => pokesSelecionadosMeta.has(`${p.contaIdx}_${p.id}`));
      const vendaveis = selecionados.filter(p => !p.locked);
      const bloqueados = selecionados.filter(p => p.locked);

      if (!vendaveis.length) {
        mostrarToast('Todos os Pokémon selecionados estão <b>🔒 Bloqueados</b>. Destrave-os para poder vender.', '🔒', 'normal', 3500);
        return;
      }

      const totalGold = vendaveis.reduce((sum, p) => sum + (p.sell || 0), 0);
      const avisoBloqueados = bloqueados.length ? `\n(⚠️ ${bloqueados.length} Pokémon travados serão ignorados)` : '';

      const confirmMsg = `💰 Deseja realmente VENDER ${vendaveis.length} Pokémon selecionados por um total de $${totalGold.toLocaleString('pt-BR')} Gold?${avisoBloqueados}`;
      if (!confirm(confirmMsg)) return;

      mostrarToast(`💰 Vendendo ${vendaveis.length} Pokémon selecionados...`, '💰', 'normal', 2500);

      let vendidosCount = 0;
      let goldRecebido = 0;

      for (const pk of vendaveis) {
        const wv = webviews[pk.contaIdx];
        if (wv) {
          if (pk.isTeam) {
            await executarAcaoTradeNoWebview(wv, 'moveToBox', { pokeId: pk.id });
          }
          const res = await executarAcaoTradeNoWebview(wv, 'sell', { pokeId: pk.id });
          if (res && res.ok) {
            vendidosCount++;
            goldRecebido += (pk.sell || 0);
            pokesSelecionadosMeta.delete(`${pk.contaIdx}_${pk.id}`);
            avaliadorPokesCache = avaliadorPokesCache.filter(x => !(String(x.id) === String(pk.id) && x.contaIdx === pk.contaIdx));
          }
        }
      }

      mostrarToast(`🎉 <b>${vendidosCount} Pokémon</b> vendidos com sucesso!<br>💰 Total recebido: <b>+$${goldRecebido.toLocaleString('pt-BR')}</b> Gold!`, '💰', 'toast-success', 4500);
      renderizarAvaliadorMeta();
      setTimeout(carregarInventariosTradeHub, 800);
    }

    let modoVisualizacaoAvaliador = localStorage.getItem('idlePokemonEvalViewMode') || 'cards';

    function alterarModoVisualizacaoAvaliador(modo) {
      modoVisualizacaoAvaliador = modo;
      localStorage.setItem('idlePokemonEvalViewMode', modo);
      const btnC = document.getElementById('btn-eval-view-cards');
      const btnL = document.getElementById('btn-eval-view-list');
      if (btnC) btnC.classList.toggle('active', modo === 'cards');
      if (btnL) btnL.classList.toggle('active', modo === 'list');
      const btnC2 = document.getElementById('v2-btn-eval-view-cards');
      const btnL2 = document.getElementById('v2-btn-eval-view-list');
      if (btnC2) btnC2.classList.toggle('active', modo === 'cards');
      if (btnL2) btnL2.classList.toggle('active', modo === 'list');
      renderizarAvaliadorMeta();
    }

    // Card v2 único que serve tanto pra "cards" quanto "lista" — o CSS
    // (.v2eval-grid.view-list) reorganiza os mesmos blocos numa linha densa em
    // vez de escondê-los, evita manter dois templates HTML sincronizados.
    //
    // O que o card destaca (pedido do usuário): tier + score, RANK (geral e
    // entre as cópias da espécie), growth total e o growth por stat (os "IVs"
    // do jogo), natureza e de qual conta é o Pokémon.
    const V2EVAL_STATS = [
      { k: 'hp', lb: 'HP' }, { k: 'atk', lb: 'Atk' }, { k: 'def', lb: 'Def' },
      { k: 'spa', lb: 'SpA' }, { k: 'spd', lb: 'SpD' }, { k: 'spe', lb: 'Vel', alt: 'vel' }
    ];
    // O teto por stat vem do próprio jogo (pk.growthMax, coletado em shell/25);
    // 32 é só o fallback. O chip pinta pelo quão perto do teto está, pra dar
    // pra bater o olho e ver onde o bicho é forte.
    function v2evalChipsStats(pk) {
      const g = pk.growth;
      if (!g || typeof g !== 'object') {
        return '<span class="v2eval-statchip vazio">growth não informado</span>';
      }
      const max = Number(pk.growthMax) || 32;
      return V2EVAL_STATS.map(({ k, lb, alt }) => {
        const v = Number(g[k] != null ? g[k] : (alt ? g[alt] : 0)) || 0;
        const pct = Math.max(0, Math.min(100, Math.round((v / max) * 100)));
        const nivel = pct >= 85 ? 'alto' : pct >= 60 ? 'medio' : pct >= 35 ? 'baixo' : 'ruim';
        return `<span class="v2eval-statchip ${nivel}" title="${lb}: ${v}/${max} (${pct}%)"><b>${lb}</b>${v}</span>`;
      }).join('');
    }

    function fmtCompacto(n) {
      n = Number(n || 0);
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.round(n));
    }

    function renderizarAvaliadorMetaV2(lista) {
      if (typeof avaliadorMetaV2Aberto === 'undefined' || !avaliadorMetaV2Aberto) return;
      const grid2 = document.getElementById('v2-eval-cards-grid');
      if (!grid2) return;
      grid2.classList.toggle('view-list', modoVisualizacaoAvaliador === 'list');
      grid2.classList.toggle('view-cards', modoVisualizacaoAvaliador !== 'list');

      if (!lista.length) {
        grid2.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:40px; font-size:11px">Nenhum Pokémon encontrado com os filtros selecionados.</div>';
        return;
      }

      const tierClassMap = { 'S+': 'tier-s-plus', S: 'tier-s', A: 'tier-a', B: 'tier-b' };
      grid2.innerHTML = lista.map(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        const isSelected = pokesSelecionadosMeta.has(key);
        const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
        const tierClass = tierClassMap[pk.tier] || 'tier-c';
        const growthPct = pk.growthPct != null ? pk.growthPct : pk.score;
        const growthAbs = (pk.growthTotal != null)
          ? `${pk.growthTotal}/${pk.growthTotalMax}`
          : '—';
        const dupTxt = pk.totalCopias > 1
          ? (pk.isMelhorCopia ? `👑 Melhor de ${pk.totalCopias}` : `🔄 Cópia ${pk.rankEspecie || '?'}ª de ${pk.totalCopias}`)
          : '';

        return `
          <div class="v2eval-card ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'selected' : ''}" style="--v2c-border:${pk.tier === 'S+' ? 'rgba(245,166,35,.35)' : pk.tier === 'S' ? 'rgba(168,85,247,.3)' : 'rgba(148,163,184,.14)'}">
            <div class="v2eval-card-head">
              <input type="checkbox" class="v2eval-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} />
              <img class="v2eval-sprite" src="${spriteUrl}" onerror="this.style.display='none'" />
              <div style="overflow:hidden; flex:1;">
                <div class="v2eval-name">${pk.shiny ? '✨ ' : ''}${pk.name}${pk.locked ? ' 🔒' : ''}</div>
                <div class="v2eval-sub2">Lv.${pk.level} · ${pk.contaNome}${pk.isTeam ? ' · ⚔️ Time' : ''}</div>
              </div>
              <span class="v2eval-tier ${tierClass}" title="Tier da ESPÉCIE, vindo do jogo — poder medido no alvo neutro">${pk.tier}</span>
              <span class="v2eval-ficha" title="Ficha: nota do que foi rolado na captura (IV ${(PESO_IV * 100).toFixed(0)}% + Growth ${(PESO_GROWTH * 100).toFixed(0)}%). Independe do nível.">${pk.score}%</span>
            </div>

            <div class="v2eval-metricas">
              <span class="v2eval-met dps" title="DPS que o jogo calcula pra este Pokémon AGORA (já inclui nível, IV, growth e item)">⚡ ${fmtCompacto(pk.dps)}</span>
              <span class="v2eval-met" title="Power do jogo — no mesmo nível e espécie, maior power = estritamente melhor">💪 ${fmtCompacto(pk.power)}</span>
              <span class="v2eval-met iv" title="Multiplicador de raridade rolado na captura (máx. 2.5). É o que mais mexe no power.">🎲 ${pk.rarity} ×${(pk.iv || 0).toFixed(2)}</span>
              ${pk.boost ? `<span class="v2eval-met" title="Boost aplicado">🚀 ${pk.boost}/${pk.boostMax || 100}</span>` : ''}
            </div>

            <div class="v2eval-ranks">
              <span class="v2eval-rank" title="Posição da ficha no acervo inteiro (todas as contas)">
                🏆 #${pk.rankGeral || '?'}<i>/${pk.rankGeralTotal || '?'}</i>
              </span>
              <span class="v2eval-rank ${pk.rankEspecie === 1 ? 'top' : ''}" title="Posição entre as cópias desta espécie — é este número que decide qual vender">
                🧬 #${pk.rankEspecie || 1}<i>/${pk.rankEspecieTotal || 1}</i>
              </span>
              <span class="v2eval-rank" title="Posição por DPS: quem bate mais AGORA, entre todos os Pokémon carregados">
                ⚡ #${pk.rankDps || '?'}
              </span>
              ${pk.natureTxt || pk.nature ? `<span class="v2eval-rank nature" title="Natureza">🌱 ${pk.natureTxt || pk.nature}</span>` : ''}
            </div>

            <div class="v2eval-growth-row"><span>Growth ${growthAbs}</span><span class="v2eval-growth-pct">${growthPct}%</span></div>
            <div class="v2eval-growth-bar"><div class="v2eval-growth-fill" style="width:${growthPct}%"></div></div>
            <div class="v2eval-stats">${v2evalChipsStats(pk)}</div>

            <div class="v2eval-build">
              <span class="v2eval-role">${pk.meta.role} · ${pk.meta.held}</span>
              <div class="v2eval-moves">
                ${pk.meta.moves.map(m => `<span class="v2eval-move ${m.stab ? 'stab' : ''}">${m.stab ? '⚡' : '💿'} ${m.name}</span>`).join('')}
              </div>
            </div>
            ${dupTxt ? `<div class="v2eval-dup" style="color:${pk.isMelhorCopia ? '#f5a623' : '#f87171'}">${dupTxt}</div>` : ''}
            <div class="v2eval-actions">
              <button class="v2eval-aicon" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar' : 'Travar venda'}">${pk.locked ? '🔒' : '🔓'}</button>
              <button class="v2eval-aicon" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar no Box' : 'Equipar no Time'}">${pk.isTeam ? '📦' : '⚔️'}</button>
              <button class="v2eval-aicon" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled' : ''} title="Vender por $${pk.sell.toLocaleString('pt-BR')}">💰</button>
              <button class="v2eval-aicon" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Aura">✨</button>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderizarAvaliadorMeta() {
      const grid = document.getElementById('eval-cards-grid');
      if (!grid) return;

      grid.className = 'eval-main-content ' + (modoVisualizacaoAvaliador === 'list' ? 'view-list' : 'view-cards');

      const btnC = document.getElementById('btn-eval-view-cards');
      const btnL = document.getElementById('btn-eval-view-list');
      if (btnC) btnC.classList.toggle('active', modoVisualizacaoAvaliador === 'cards');
      if (btnL) btnL.classList.toggle('active', modoVisualizacaoAvaliador === 'list');

      const lista = obterPokesVisiveisFiltrados();
      atualizarSumarioSelecaoMeta();
      renderizarAvaliadorMetaV2(lista);

      if (!lista.length) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:60px; font-size:12px">Nenhum Pokémon encontrado com os filtros selecionados.</div>';
        return;
      }

      // === RENDERIZAÇÃO: MODO 1 (TABELA / LISTA DETALHADA) ===
      if (modoVisualizacaoAvaliador === 'list') {
        grid.innerHTML = lista.map(pk => {
          const key = `${pk.contaIdx}_${pk.id}`;
          const isSelected = pokesSelecionadosMeta.has(key);
          const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
          const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
          
          let tierClass = 'tier-c';
          if (pk.tier === 'S+') tierClass = 'tier-s-plus';
          else if (pk.tier === 'S') tierClass = 'tier-s';
          else if (pk.tier === 'A') tierClass = 'tier-a';
          else if (pk.tier === 'B') tierClass = 'tier-b';

          const poderTxt = pk.power ? (pk.power >= 1000 ? (pk.power/1000).toFixed(1) + 'k' : pk.power) : '';

          return `
            <div class="eval-list-row ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'row-selected' : ''}">
              
              <!-- CHECKBOX DE SELEÇÃO EM MASSA -->
              <input type="checkbox" class="eval-poke-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} style="width:16px; height:16px; accent-color:#a855f7; cursor:pointer; flex-shrink:0" title="Selecionar para Venda / Bloqueio em Massa" />

              <!-- COLUNA 1: SPRITE & NOME & NÍVEL & PODER -->
              <div style="width:220px; display:flex; align-items:center; gap:8px; flex-shrink:0">
                <img src="${spriteUrl}" style="width:40px; height:40px; object-fit:contain" onerror="this.style.display='none'" />
                <div style="overflow:hidden">
                  <div style="font-size:12.5px; font-weight:900; color:${pk.shiny ? '#fde047' : '#f8fafc'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${pk.shiny ? '✨ ' : ''}${pk.name}</div>
                  <div style="font-size:10px; color:#38bdf8; font-weight:800">
                    Lv.${pk.level} ${poderTxt ? `• ⚡${poderTxt}` : ''} • <span style="color:#cbd5e1">${pk.contaNome}</span>
                  </div>
                </div>
              </div>

              <!-- COLUNA 2: TIER & SCORE & GROWTH (IVs) -->
              <div style="width:140px; display:flex; flex-direction:column; gap:2px; flex-shrink:0">
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <span class="eval-tier-badge ${tierClass}">Tier ${pk.tier} (${pk.score}%)</span>
                  ${pk.growthPct != null ? `<span style="font-size:9.5px; font-weight:800; color:#4ade80">🧬 ${pk.growthPct}%</span>` : ''}
                </div>
                <div style="height:4px; background:rgba(15,23,42,0.8); border-radius:3px; overflow:hidden">
                  <div style="height:100%; width:${pk.score}%; background:linear-gradient(90deg, #38bdf8, #a855f7)"></div>
                </div>
                ${pk.growthTotal != null ? `<div style="font-size:8.5px; color:#94a3b8; text-align:center">IV ${pk.growthTotal}/${pk.growthTotalMax}</div>` : ''}
              </div>

              <!-- COLUNA 3: RARIDADE & ORIGEM & IVs -->
              <div style="width:200px; flex-shrink:0; font-size:10.5px">
                <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap">
                  <span class="eval-rarity-badge" style="background:${(() => { const r = (pk.rarity||'').toLowerCase(); if (r==='mitico'||r==='mythic') return 'rgba(244,114,182,0.25);border-color:rgba(244,114,182,0.5);color:#f9a8d4'; if (r==='lendaria'||r==='legendary') return 'rgba(251,191,36,0.25);border-color:rgba(251,191,36,0.5);color:#fde047'; if (r==='epica'||r==='epic') return 'rgba(192,132,252,0.25);border-color:rgba(192,132,252,0.5);color:#d8b4fe'; if (r==='rara'||r==='rare') return 'rgba(96,165,250,0.2);border-color:rgba(96,165,250,0.4);color:#93c5fd'; if (r==='incomum'||r==='uncommon') return 'rgba(74,222,128,0.2);border-color:rgba(74,222,128,0.4);color:#86efac'; return 'rgba(148,163,184,0.15);border-color:rgba(148,163,184,0.3);color:#cbd5e1'; })()}" title="${pk.rarity} ×${(+pk.iv).toFixed(2)}">${pk.rarity} ×${(+pk.iv).toFixed(2)}</span>
                  ${pk.shiny ? '<span style="font-size:8px; font-weight:900; color:#fde047; background:rgba(253,224,71,0.15); border:1px solid rgba(253,224,71,0.4); padding:0 4px; border-radius:3px">✨ SHINY</span>' : ''}
                  <span style="color:${pk.isTeam ? '#4ade80' : '#c084fc'}; font-weight:800; font-size:9px">${pk.isTeam ? '⚔️ Time' : '📦 Box'}</span>
                </div>
                ${pk.growth ? `<div style="display:flex; gap:3px; margin-top:3px; flex-wrap:wrap">
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(74,222,128,0.12); color:#86efac" title="HP">HP ${pk.growth.hp||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(239,68,68,0.12); color:#fca5a5" title="Atk">Atk ${pk.growth.atk||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(56,189,248,0.12); color:#7dd3fc" title="Def">Def ${pk.growth.def||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(168,85,247,0.12); color:#d8b4fe" title="SpA">SpA ${pk.growth.spa||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(34,197,94,0.12); color:#86efac" title="SpD">SpD ${pk.growth.spd||0}</span>
                  <span style="font-size:7.5px; padding:0 3px; border-radius:2px; background:rgba(251,191,36,0.12); color:#fde047" title="Vel">Vel ${pk.growth.spe||pk.growth.vel||0}</span>
                </div>` : ''}
              </div>

              <!-- COLUNA 4: HELD ITEM RECOMENDADO -->
              <div style="width:160px; flex-shrink:0">
                <span class="eval-held-tag">${pk.meta.held}</span>
              </div>

              <!-- COLUNA 5: MOVES -->
              <div style="flex:1; display:flex; gap:4px; overflow:hidden; flex-wrap:wrap">
                ${pk.meta.moves.map(m => `
                  <div class="eval-move-pill ${m.stab ? 'stab' : ''}" style="padding:3px 6px; font-size:9px" title="${m.name} (${m.type}) - DPS: ${m.dps}">
                    <span>${m.stab ? '⚡' : '💿'}</span>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:105px">${m.name}</span>
                  </div>
                `).join('')}
              </div>

              <!-- COLUNA 6: STATUS DUPLICATA -->
              <div style="width:105px; text-align:center; flex-shrink:0">
                ${pk.totalCopias > 1 ? `<span style="font-size:9.5px; font-weight:900; color:${pk.isMelhorCopia ? '#fde047' : '#f87171'}">${pk.isMelhorCopia ? '👑 Melhor de ' + pk.totalCopias : '🔄 Cópia ' + pk.totalCopias + 'x'}</span>` : '<span style="color:#64748b; font-size:9px">Único</span>'}
              </div>

              <!-- COLUNA 7: GRUPO DE AÇÕES (TRAVAR, TIME/BOX, VENDER, AURA, TRADE) -->
              <div style="display:flex; gap:4px; align-items:center; flex-shrink:0">
                <button class="eval-btn-action eval-btn-lock ${pk.locked ? 'locked' : ''}" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar Venda' : 'Travar Venda (Protege de descarte)'}">
                  <span>${pk.locked ? '🔒' : '🔓'}</span>
                </button>
                <button class="eval-btn-action eval-btn-swap" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar Pokémon no Box' : 'Equipar Pokémon no Time Ativo'}">
                  <span>${pk.isTeam ? '📦' : '⚔️'}</span>
                </button>
                <button class="eval-btn-action eval-btn-sell" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled title="Destrave o Pokémon para poder vender"' : `title="${pk.isTeam ? 'Remover do time e vender por $' + pk.sell.toLocaleString('pt-BR') : 'Vender por $' + pk.sell.toLocaleString('pt-BR')}"`}>
                  <span>💰</span>
                </button>
                <button class="eval-btn-action eval-btn-aura" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Escolher / Trocar Aura">
                  <span>✨</span>
                </button>
              </div>

            </div>
          `;
        }).join('');
        return;
      }

      // === RENDERIZAÇÃO: MODO 2 (CARDS AMPLOS & COMPLETOS) ===
      grid.innerHTML = lista.map(pk => {
        const key = `${pk.contaIdx}_${pk.id}`;
        const isSelected = pokesSelecionadosMeta.has(key);
        const spriteName = pk.cleanName.replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${spriteName}.png`;
        
        let tierClass = 'tier-c';
        if (pk.tier === 'S+') tierClass = 'tier-s-plus';
        else if (pk.tier === 'S') tierClass = 'tier-s';
        else if (pk.tier === 'A') tierClass = 'tier-a';
        else if (pk.tier === 'B') tierClass = 'tier-b';

        const poderTxt = pk.power ? (pk.power >= 1000 ? (pk.power/1000).toFixed(1) + 'K' : pk.power) : '';

        return `
          <div class="eval-card ${pk.isMelhorCopia ? 'best-copy' : ''} ${isSelected ? 'card-selected' : ''}">
            
            <!-- CHECKBOX DE SELEÇÃO EM MASSA NO CARD -->
            <label style="position:absolute; top:12px; left:12px; display:flex; align-items:center; gap:4px; z-index:3; cursor:pointer" title="Selecionar Pokémon">
              <input type="checkbox" class="eval-poke-chk" data-key="${key}" onchange="aoTogglePokeSelecionado('${key}', this.checked)" ${isSelected ? 'checked' : ''} style="width:17px; height:17px; accent-color:#a855f7; cursor:pointer" />
            </label>

            <div class="eval-card-head" style="padding-left:26px">
              <div class="eval-sprite-frame">
                <img src="${spriteUrl}" class="eval-sprite" onerror="this.style.display='none'" />
              </div>
              <div style="flex:1; overflow:hidden">
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap">
                  <span style="font-size:14px; font-weight:900; color:${pk.shiny ? '#fde047' : '#f8fafc'}">${pk.shiny ? '✨ ' : ''}${pk.name}</span>
                  <span class="eval-tier-badge ${tierClass}">Tier ${pk.tier} (${pk.score}%)</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px; font-size:11px; flex-wrap:wrap">
                  <span style="color:#38bdf8; font-weight:800">Lv.${pk.level}</span>
                  ${poderTxt ? `<span style="color:#fde047; font-weight:800">• ⚡${poderTxt} Poder</span>` : ''}
                  <span class="eval-rarity-badge">${pk.rarity} ×${(+pk.iv).toFixed(2)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:2px; font-size:10px; color:#94a3b8">
                  <span style="color:${pk.isTeam ? '#4ade80' : '#c084fc'}; font-weight:800">${pk.isTeam ? '⚔️ Time Ativo' : '📦 Box'}</span>
                  <span>•</span>
                  <span style="color:#cbd5e1">${pk.contaNome}</span>
                </div>
              </div>
            </div>

            <!-- ANÁLISE DE GROWTH (IVs) & STATS -->
            <div class="eval-ivs-box">
              <div style="display:flex; justify-content:space-between; font-size:10.5px; font-weight:800">
                <span style="color:#94a3b8">🧬 Growth (IVs):</span>
                <span style="color:#4ade80">${pk.growthTotal != null ? `${pk.growthTotal}/${pk.growthTotalMax} (${pk.growthPct}%)` : `${pk.score}% Estimado`}</span>
              </div>
              <div style="height:6px; background:rgba(15,23,42,0.8); border-radius:4px; overflow:hidden">
                <div style="height:100%; width:${pk.growthPct != null ? pk.growthPct : pk.score}%; background:linear-gradient(90deg, #38bdf8, #818cf8, #a855f7); border-radius:4px"></div>
              </div>
              ${pk.growthDesc ? `<div style="font-size:9px; color:#cbd5e1; font-family:monospace; margin-top:2px">${pk.growthDesc}</div>` : ''}
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#cbd5e1; margin-top:2px">
                <span>Função: <b>${pk.meta.role}</b></span>
                ${pk.totalCopias > 1 ? `<span style="color:${pk.isMelhorCopia ? '#fde047' : '#f87171'}; font-weight:900">${pk.isMelhorCopia ? '👑 Melhor de ' + pk.totalCopias : '🔄 Cópia ' + pk.totalCopias + 'x'}</span>` : ''}
              </div>
            </div>

            <!-- BUILD RECOMENDADA (HELD ITEM + TOP 4 MOVES) -->
            <div class="eval-meta-build-box">
              <div style="display:flex; justify-content:space-between; align-items:center">
                <span style="font-size:11px; font-weight:900; color:#e2e8f0">Build Recomendada:</span>
                <span class="eval-held-tag">${pk.meta.held}</span>
              </div>
              <div class="eval-moves-grid">
                ${pk.meta.moves.map(m => `
                  <div class="eval-move-pill ${m.stab ? 'stab' : ''}" title="${m.name} (${m.type}) - DPS: ${m.dps}">
                    <span>${m.stab ? '⚡' : '💿'}</span>
                    <span style="overflow:hidden; text-overflow:ellipsis">${m.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- BOTÕES DE AÇÃO COMPLETOS (TRAVAR, TIME/BOX, VENDER, AURA, TRADE) -->
            <div class="eval-card-actions">
              <button class="eval-btn-action eval-btn-lock ${pk.locked ? 'locked' : ''}" onclick="alternarLockPoke('${pk.id}', ${pk.contaIdx})" title="${pk.locked ? 'Destravar Venda' : 'Travar Venda (Protege de descarte)'}">
                <span>${pk.locked ? '🔒' : '🔓'}</span>
              </button>
              <button class="eval-btn-action eval-btn-swap" onclick="alternarTeamBoxPoke('${pk.id}', ${pk.contaIdx}, ${pk.isTeam})" title="${pk.isTeam ? 'Guardar Pokémon no Box' : 'Equipar Pokémon no Time Ativo'}">
                <span>${pk.isTeam ? '📦 Box' : '⚔️ Time'}</span>
              </button>
              <button class="eval-btn-action eval-btn-sell" onclick="venderPokeConta('${pk.id}', ${pk.contaIdx}, '${pk.name}', ${pk.sell}, ${pk.isTeam})" ${pk.locked ? 'disabled title="Destrave o Pokémon para poder vender"' : ''} title="${pk.locked ? 'Destrave para poder vender' : (pk.isTeam ? `Remover do time e vender por $${pk.sell.toLocaleString('pt-BR')}` : `Vender por $${pk.sell.toLocaleString('pt-BR')}`)}">
                <span>💰 $${pk.sell.toLocaleString('pt-BR')}</span>
              </button>
              <button class="eval-btn-action eval-btn-aura" onclick="abrirAuraSelectPoke('${pk.id}', ${pk.contaIdx})" title="Escolher / Trocar Aura">
                <span>✨</span>
              </button>
            </div>

          </div>
        `;
      }).join('');
    }

    // === AÇÕES DE GERENCIAMENTO DE POKÉMON (TRAVAR, TIME/BOX, VENDER, TROCAR AURA) ===

// ===== 35-acoes-gerenciamento-pokemon.js =====
    async function alternarLockPoke(pokeId, contaIdx) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      const novoEstadoLock = pObj ? !pObj.locked : true;

      const res = await executarAcaoTradeNoWebview(wv, 'lockPoke', { pokeId: pokeId });
      if (res && res.ok) {
        if (pObj) pObj.locked = novoEstadoLock;
        mostrarToast(`Pokémon <b>${pObj ? pObj.name : ''}</b> ${novoEstadoLock ? '🔒 Travado com sucesso!' : '🔓 Destravado!'}`, novoEstadoLock ? '🔒' : '🔓', 'toast-success', 2500);
        renderizarAvaliadorMeta();
      } else {
        mostrarToast('Erro ao travar/destravar pokémon: ' + (res.error || 'Falha de comunicação'), '❌', 'normal', 3000);
      }
    }

    async function alternarTeamBoxPoke(pokeId, contaIdx, isTeam) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      const acao = isTeam ? 'moveToBox' : 'setActive';

      const res = await executarAcaoTradeNoWebview(wv, acao, { pokeId: pokeId });
      if (res && res.ok) {
        if (pObj) pObj.isTeam = !isTeam;
        mostrarToast(`Pokémon <b>${pObj ? pObj.name : ''}</b> ${isTeam ? '📦 guardado no Box!' : '⚔️ equipado no Time!'}`, isTeam ? '📦' : '⚔️', 'toast-success', 2500);
        renderizarAvaliadorMeta();
        setTimeout(carregarInventariosTradeHub, 800);
      } else {
        mostrarToast(`Erro ao ${isTeam ? 'guardar no box' : 'equipar no time'}: ` + (res.error || 'Falha de comunicação'), '❌', 'normal', 3500);
      }
    }

    async function venderPokeConta(pokeId, contaIdx, nome, valorSell, isTeam) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      const pObj = avaliadorPokesCache.find(p => String(p.id) === String(pokeId) && p.contaIdx === contaIdx);
      if (pObj && pObj.locked) {
        mostrarToast('O Pokémon está <b>🔒 Travado</b>. Destrave-o antes de vender.', '🔒', 'normal', 3000);
        return;
      }

      const msg = isTeam 
        ? `💰 ${nome} está no ⚔️ TIME ATIVO.\n\nDeseja desequipar do time e VENDER por $${valorSell.toLocaleString('pt-BR')} Gold?`
        : `💰 Deseja realmente VENDER ${nome} por $${valorSell.toLocaleString('pt-BR')} Gold?`;

      if (!confirm(msg)) return;

      // Se estiver no time, desequipa primeiro (moveToBox)
      if (isTeam) {
        mostrarToast(`Removendo <b>${nome}</b> do time ativo...`, '📦', 'normal', 1500);
        const resBox = await executarAcaoTradeNoWebview(wv, 'moveToBox', { pokeId: pokeId });
        if (!resBox || !resBox.ok) {
          mostrarToast('Não foi possível desequipar do time: ' + (resBox.error || 'Pokémon ativo na caçada'), '❌', 'normal', 3500);
          return;
        }
      }

      const res = await executarAcaoTradeNoWebview(wv, 'sell', { pokeId: pokeId });
      if (res && res.ok) {
        mostrarToast(`💰 <b>${nome}</b> vendido por <b>$${valorSell.toLocaleString('pt-BR')}</b> Gold!`, '💰', 'toast-success', 3500);
        avaliadorPokesCache = avaliadorPokesCache.filter(p => !(String(p.id) === String(pokeId) && p.contaIdx === contaIdx));
        renderizarAvaliadorMeta();
        setTimeout(carregarInventariosTradeHub, 800);
      } else {
        mostrarToast('Erro ao vender pokémon: ' + (res.error || 'Falha de comunicação'), '❌', 'normal', 3500);
      }
    }

    async function abrirAuraSelectPoke(pokeId, contaIdx) {
      const wv = webviews[contaIdx];
      if (!wv) return;

      try {
        await wv.executeJavaScript(`
          (function() {
            try {
              const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
              const s = w.K || w.gameState || {};
              const pokes = [...(s.team || []), ...(s.box || [])];
              const target = pokes.find(p => String(p.id) === ${JSON.stringify(String(pokeId))});
              if (target && typeof w.openAuraSelect === 'function') {
                w.openAuraSelect(target);
                return true;
              }
            } catch(e){}
            return false;
          })()
        `);
        selectTab(contaIdx);
        fecharModalAvaliadorMeta();
        mostrarToast('Painel de Auras aberto na conta selecionada!', '✨', 'normal', 3000);
      } catch(e) {
        mostrarToast('Erro ao abrir seletor de aura: ' + e.message, '❌', 'normal', 3000);
      }
    }


    function copiarInventarioPokes4ContasJSON() {
      if (!avaliadorPokesCache.length) {
        mostrarToast('Clique em 🔄 Atualizar Dados primeiro!', '⚠️', 'normal', 3000);
        return;
      }
      const dados = {
        total: avaliadorPokesCache.length,
        timestamp: new Date().toISOString(),
        pokemons: avaliadorPokesCache.map(p => ({
          id: p.id,
          name: p.name,
          level: p.level,
          shiny: p.shiny,
          contaNome: p.contaNome,
          contaIdx: p.contaIdx,
          isTeam: p.isTeam,
          locked: p.locked,
          power: p.power,
          rarity: p.rarity,
          iv: p.iv,
          growthTotal: p.growthTotal,
          growthPct: p.growthPct,
          growthDesc: p.growthDesc,
          sell: p.sell,
          tier: p.tier,
          score: p.score
        }))
      };
      const jsonTxt = JSON.stringify(dados, null, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(jsonTxt) : Promise.reject()).then(() => {
        mostrarToast(`📋 Dados dos <b>${avaliadorPokesCache.length} Pokémon</b> copiados! Cole aqui no chat para analisarmos.`, '📋', 'toast-success', 4000);
      }).catch(() => {
        const ta = document.createElement('textarea'); ta.value = jsonTxt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        mostrarToast(`📋 Dados dos <b>${avaliadorPokesCache.length} Pokémon</b> copiados! Cole aqui no chat para analisarmos.`, '📋', 'toast-success', 4000);
      });
    }

    // === CONTROLE DE ÁUDIO GLOBAL UNIFICADO ===

// ===== 36-controle-audio-global.js =====
    function toggleGlobalAudio() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('idlePokemonGlobalMuted', isMuted ? '1' : '0');
      } catch(e) {}
      webviews.forEach(wv => {
        try {
          if (wv && typeof wv.setAudioMuted === 'function') {
            wv.setAudioMuted(isMuted);
          }
        } catch(e) {}
      });
      renderizarEstadoAudio();
      mostrarToast(isMuted ? 'Áudio silenciado em todas as contas' : 'Áudio ativado em todas as contas', isMuted ? '🔇' : '🔊', 'info', 2500);
    }

    function renderizarEstadoAudio() {
      const icon = document.getElementById('menu-audio-icon');
      const text = document.getElementById('menu-audio-text');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      if (text) text.textContent = isMuted ? 'Áudio: Silenciado' : 'Áudio: Ativo';
    }

    // Inicialização do Electron Client

// ===== 37-bootstrap-inicializacao.js =====
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

// ===== 38-modal-monitor-desempenho.js =====
// =====================================================================
// 31-modal-monitor-desempenho.js — MONITOR DE RECURSOS & DESEMPENHO
// =====================================================================
// Painel visual interativo com telemetria ao vivo:
// - Memória RAM (Heap Node/Electron vs 1024MB, RSS, Memória Livre Windows)
// - Latência de Rede / Ping em ms para a API do jogo
// - FPS e Tempo de Quadro ao vivo de cada conta (via pmiFps)
// - Detecção de longtasks (travadas >50ms)
// - Exportação / Cópia de Relatório com 1 clique
// =====================================================================

(function () {
  'use strict';

  let _monitorTimer = null;
  let _monitorAutoRefresh = true;

  // Mede o tempo de resposta (ping) à API do jogo em ms
  async function medirPingApi() {
    const t0 = performance.now();
    try {
      // Usa a primeira webview ativa para testar a rota real
      const wv = (typeof webviews !== 'undefined' && webviews && webviews[0]) ? webviews[0] : null;
      if (wv && typeof wv.executeJavaScript === 'function') {
        const ok = await wv.executeJavaScript(`
          (async function() {
            try {
              const tok = (typeof obterToken === 'function' ? obterToken() : (typeof token !== 'undefined' ? token : '')) || '';
              const r = await fetch('/api/state?token=' + encodeURIComponent(tok), {
                method: 'GET',
                signal: AbortSignal.timeout(4000)
              });
              return r.status;
            } catch(e) { return 0; }
          })()
        `);
        const ms = Math.round(performance.now() - t0);
        return { ms, ok: ok === 200, status: ok };
      }
    } catch (e) { }
    const ms = Math.round(performance.now() - t0);
    return { ms, ok: false, status: 0 };
  }

  async function atualizarMonitorDesempenho() {
    const modal = document.getElementById('modal-monitor-desempenho');
    if (!modal || (!modal.classList.contains('active') && modal.style.display === 'none')) {
      pararMonitorAuto();
      return;
    }

    // 1. Coleta métricas do processo principal e SO
    let perfMetrics = null;
    try {
      const { ipcRenderer } = require('electron');
      perfMetrics = await ipcRenderer.invoke('get-performance-metrics');
    } catch (e) { }

    if (!perfMetrics) {
      try {
        const os = require('os');
        const mem = process.memoryUsage();
        perfMetrics = {
          mainMemory: {
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            rss: mem.rss,
            maxOldSpaceSizeMb: 1024
          },
          systemMemory: {
            totalMb: Math.round(os.totalmem() / (1024 * 1024)),
            freeMb: Math.round(os.freemem() / (1024 * 1024)),
            usedMb: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024))
          },
          os: { platform: os.platform(), arch: os.arch(), release: os.release() }
        };
      } catch (e) { }
    }

    // 1b. Coleta status do sentinela de RAM
    let sentinelaStatus = null;
    try {
      const { ipcRenderer } = require('electron');
      sentinelaStatus = await ipcRenderer.invoke('get-sentinela-ram-status');
    } catch (e) { }

    // 2. Mede ping de rede em ms
    const pingData = await medirPingApi();

    // 3. Coleta dados do shell e contas (se a ferramenta 49 estiver disponível)
    let diag = null;
    try {
      if (typeof diagnosticoDesempenho === 'function') {
        diag = await diagnosticoDesempenho();
      }
    } catch (e) {
      console.warn('[Monitor] Erro diagnosticoDesempenho:', e);
    }

    // Atualiza a UI
    renderizarDadosMonitor(perfMetrics, pingData, diag, sentinelaStatus);
  }

  function renderizarDadosMonitor(perf, ping, diag, sentinelaStatus) {
    // --- 1. MEMÓRIA RAM ---
    const mem = perf?.mainMemory;
    const heapUsedMb = mem ? (mem.heapUsed / (1024 * 1024)).toFixed(1) : '—';
    const heapTotalMb = mem ? (mem.heapTotal / (1024 * 1024)).toFixed(1) : '—';
    const maxHeapMb = mem?.maxOldSpaceSizeMb || 1024;
    const rssMb = mem ? (mem.rss / (1024 * 1024)).toFixed(0) : '—';
    const pctHeap = mem ? Math.min(100, Math.round((mem.heapUsed / (maxHeapMb * 1024 * 1024)) * 100)) : 0;

    const elRamUsed = document.getElementById('perf-ram-used');
    const elRamLimit = document.getElementById('perf-ram-limit');
    const elRamBar = document.getElementById('perf-ram-bar');
    const elRamRss = document.getElementById('perf-ram-rss');
    const elRamOs = document.getElementById('perf-ram-os');
    const elRamSent = document.getElementById('perf-ram-sentinela');
    const elBtnSent = document.getElementById('perf-txt-toggle-sentinela');

    if (elRamUsed) elRamUsed.textContent = heapUsedMb;
    if (elRamLimit) elRamLimit.textContent = `${heapTotalMb} MB alocado (${maxHeapMb} MB máx)`;
    if (elRamBar) {
      elRamBar.style.width = pctHeap + '%';
      elRamBar.className = 'perf-mon-bar-fill' + (pctHeap >= 80 ? ' warn' : '');
    }
    if (elRamRss) elRamRss.textContent = `${rssMb} MB`;
    if (elRamOs && perf?.osInfo) {
      const freeGb = (perf.osInfo.freeMem / (1024 * 1024 * 1024)).toFixed(1);
      const totGb = (perf.osInfo.totalMem / (1024 * 1024 * 1024)).toFixed(1);
      elRamOs.textContent = `${freeGb} GB livre / ${totGb} GB total`;
    }
    if (elRamSent) {
      if (sentinelaStatus && sentinelaStatus.ativo) {
        elRamSent.innerHTML = '<span style="color:#4ade80">🟢 Ativo (Auto >75%)</span>';
        if (elBtnSent) elBtnSent.textContent = 'Sentinela: Ativo';
      } else {
        elRamSent.innerHTML = '<span style="color:#94a3b8">⚪ Inativo / Pausado</span>';
        if (elBtnSent) elBtnSent.textContent = 'Sentinela: Pausado';
      }
    }

    // --- 2. LATÊNCIA / PING ---
    const elPingVal = document.getElementById('perf-ping-val');
    const elPingPill = document.getElementById('perf-ping-pill');
    if (elPingVal) elPingVal.textContent = ping.ok ? `${ping.ms} ms` : (ping.ms > 3000 ? 'Timeout' : 'Offline');
    if (elPingPill) {
      if (ping.ok) {
        if (ping.ms < 100) {
          elPingPill.className = 'perf-pill green';
          elPingPill.textContent = '🟢 Rápido';
        } else if (ping.ms < 250) {
          elPingPill.className = 'perf-pill yellow';
          elPingPill.textContent = '🟡 Médio';
        } else {
          elPingPill.className = 'perf-pill red';
          elPingPill.textContent = '🔴 Alto Lag';
        }
      } else {
        elPingPill.className = 'perf-pill red';
        elPingPill.textContent = '⚠️ Falhou';
      }
    }

    // --- 3. SHELL & FPS GERAL ---
    const sh = diag?.resumo?.shell;
    const elShellFps = document.getElementById('perf-shell-fps');
    const elShellQuadro = document.getElementById('perf-shell-quadro') || document.getElementById('perf-shell-p95');
    const elShellTravadas = document.getElementById('perf-shell-travadas') || document.getElementById('perf-shell-longtasks');
    const elShellContas = document.getElementById('perf-shell-contas');

    if (elShellFps) elShellFps.textContent = sh?.fps ? `${sh.fps} FPS` : '60 FPS';
    if (elShellQuadro) elShellQuadro.textContent = sh?.quadroMedianoMs ? `${sh.quadroMedianoMs} ms` : '16.7 ms';
    if (elShellTravadas) elShellTravadas.textContent = `${sh?.tarefasLongas60s || 0} no últ. minuto`;
    if (elShellContas) elShellContas.textContent = `${totalContas} contas ativas`;

    // --- 4. TABELA DE CONTAS ---
    const tbody = document.getElementById('perf-table-body');
    if (tbody && diag?.linhas) {
      tbody.innerHTML = diag.linhas.map(l => {
        const fpsColor = (l.fps && l.fps < 40) ? '#fca5a5' : '#86efac';
        const alivioBadge = l.alivio > 0 ? `<span class="perf-pill ${l.alivio >= 2 ? 'red' : 'yellow'}">FX_LOW ${l.alivio}</span>` : '<span class="perf-pill green">Normal</span>';
        const statusBadge = l.ativa ? '<span class="perf-pill green" style="margin-left:4px; font-size:9px">★ ATIVA</span>' : '';
        return `
          <tr>
            <td style="font-weight:700; color:#f8fafc">Conta ${l.conta}${statusBadge} <small style="color:#94a3b8">(${l.nome || ''})</small></td>
            <td style="font-weight:800; color:${fpsColor}">${l.fps != null ? l.fps + ' FPS' : '—'}</td>
            <td>${l.ms != null ? l.ms + ' ms' : '—'}</td>
            <td>${alivioBadge}</td>
            <td style="color:#94a3b8">${l.nos || '—'} nós</td>
            <td>${l.painel ? '<span style="color:#6ee7b7">Aberto</span>' : '<span style="color:#64748b">Fechado</span>'}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function iniciarMonitorAuto() {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = setInterval(() => {
      atualizarMonitorDesempenho();
    }, 2000);
  }

  function pararMonitorAuto() {
    if (_monitorTimer) {
      clearInterval(_monitorTimer);
      _monitorTimer = null;
    }
  }

  function abrirModalMonitorDesempenho() {
    let modal = document.getElementById('modal-monitor-desempenho');
    if (!modal) {
      montarHtmlModalMonitor();
      modal = document.getElementById('modal-monitor-desempenho');
    }
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      atualizarMonitorDesempenho();
      if (_monitorAutoRefresh) iniciarMonitorAuto();
    }
  }

  function fecharModalMonitorDesempenho() {
    const modal = document.getElementById('modal-monitor-desempenho');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    pararMonitorAuto();
  }

  function montarHtmlModalMonitor() {
    if (document.getElementById('modal-monitor-desempenho')) return;
    const el = document.createElement('div');
    el.id = 'modal-monitor-desempenho';
    el.className = 'modal-backdrop';
    el.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); display:none; align-items:center; justify-content:center; z-index:100010;';
    el.onclick = (e) => {
      if (typeof fecharModalSeFora === 'function') fecharModalSeFora(e, 'modal-monitor-desempenho');
      else if (e.target === el) fecharModalMonitorDesempenho();
    };

    el.innerHTML = `
      <div class="perf-mon-box" onclick="event.stopPropagation()">
        <!-- HEADER -->
        <div class="perf-mon-header">
          <div class="perf-mon-title-wrap">
            <span style="font-size:20px">📊</span>
            <div>
              <div class="perf-mon-title">MONITOR DE RECURSOS & TELEMETRIA</div>
              <div class="perf-mon-sub">Memória RAM, latência da API, FPS e estabilidade de renderização em tempo real</div>
            </div>
          </div>
          <button class="ac-btn-close" onclick="fecharModalMonitorDesempenho()" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer; font-weight:800">✕</button>
        </div>

        <!-- GRID DE CARDS PRINCIPAIS -->
        <div class="perf-mon-grid">
          <!-- CARD 1: MEMÓRIA HEAP / RAM -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>🧠 Memória Electron / Node</span>
              <span class="perf-pill green" id="perf-ram-pill">Normal</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-ram-used">--</span>
              <span class="perf-mon-val-unit">MB Heap</span>
            </div>
            <div class="perf-mon-bar-trilho">
              <div class="perf-mon-bar-fill" id="perf-ram-bar" style="width: 25%"></div>
            </div>
            <div class="perf-mon-stats-row">
              <span>Alocação Heap:</span>
              <b id="perf-ram-limit">-- MB</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Memória Física (RSS):</span>
              <b id="perf-ram-rss">-- MB</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Windows RAM Livre:</span>
              <b id="perf-ram-os">--</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Sentinela de RAM (2º Plano):</span>
              <b id="perf-ram-sentinela" style="color:#4ade80">🟢 Ativo (Auto >75%)</b>
            </div>
          </div>

          <!-- CARD 2: PING / LATÊNCIA DA REDE -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>📶 Latência API do Jogo</span>
              <span class="perf-pill green" id="perf-ping-pill">Testando...</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-ping-val">-- ms</span>
            </div>
            <div class="perf-mon-stats-row" style="margin-top:auto">
              <span>Endpoint:</span>
              <b>/api/state</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Protocolo:</span>
              <b>HTTP/1.1 HTTPS Keep-Alive</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Status Timeout:</span>
              <b>4.000 ms máx</b>
            </div>
          </div>

          <!-- CARD 3: SHELL & RENDERER -->
          <div class="perf-mon-card">
            <div class="perf-mon-card-head">
              <span>🖥️ Renderizador da Janela</span>
              <span class="perf-pill green">60 Hz</span>
            </div>
            <div class="perf-mon-val-huge">
              <span id="perf-shell-fps">-- FPS</span>
            </div>
            <div class="perf-mon-stats-row" style="margin-top:auto">
              <span>Tempo de Quadro:</span>
              <b id="perf-shell-quadro">-- ms</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Travadas (>50ms):</span>
              <b id="perf-shell-travadas">0</b>
            </div>
            <div class="perf-mon-stats-row">
              <span>Background Throttling:</span>
              <b style="color:#4ade80">Desabilitado</b>
            </div>
          </div>

          <!-- TABELA DE CONTAS E WEBVIEWS -->
          <div class="perf-mon-table-wrap">
            <div style="padding:8px 12px; background:rgba(30,41,59,0.8); font-size:10.5px; font-weight:800; color:#38bdf8; display:flex; justify-content:space-between; align-items:center;">
              <span>🎮 STATUS DAS CONTAS / WEBVIEWS ATIVAS</span>
              <span style="font-size:10px; color:#94a3b8">Leitura nativa de pmiFps() do jogo</span>
            </div>
            <table class="perf-mon-table">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>FPS Atual</th>
                  <th>Tempo Quadro</th>
                  <th>Auto-Alívio</th>
                  <th>Nós DOM</th>
                  <th>Painel v2</th>
                </tr>
              </thead>
              <tbody id="perf-table-body">
                <tr>
                  <td colspan="6" style="text-align:center; color:#94a3b8; padding:16px;">Carregando métricas das contas...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- FOOTER / AÇÕES -->
        <div class="perf-mon-footer">
          <div style="display:flex; align-items:center; gap:10px">
            <label style="font-size:11px; color:#cbd5e1; display:flex; align-items:center; gap:6px; cursor:pointer">
              <input type="checkbox" id="perf-chk-auto-refresh" checked style="accent-color:#10b981" />
              <span>Atualização ao vivo (2s)</span>
            </label>
          </div>
          <div class="perf-mon-actions">
            <button class="perf-btn perf-btn-sec" onclick="window.otimizarMemoriaRamUI()" style="border-color:rgba(52,211,153,0.4); color:#6ee7b7" title="Executa o otimizador Python (EmptyWorkingSet) para liberar memória física do sistema imediatamente">
              <span>🧹</span> <span>Limpar RAM Agora</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="window.alternarSentinelaRamUI()" id="perf-btn-toggle-sentinela" style="border-color:rgba(96,165,250,0.4); color:#93c5fd" title="Pausar ou Retomar o Sentinela automático em segundo plano">
              <span>🛡️</span> <span id="perf-txt-toggle-sentinela">Sentinela: Ativo</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="window.copiarRelatorioMonitor()" title="Gera o relatório de diagnóstico e copia para a área de transferência">
              <span>📋</span> <span>Copiar Relatório</span>
            </button>
            <button class="perf-btn perf-btn-primary" onclick="window.atualizarMonitorDesempenhoManualmente()" title="Atualizar dados imediatamente">
              <span>🔄</span> <span>Atualizar</span>
            </button>
            <button class="perf-btn perf-btn-sec" onclick="fecharModalMonitorDesempenho()">
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(el);

    const chk = document.getElementById('perf-chk-auto-refresh');
    if (chk) {
      chk.onchange = () => {
        _monitorAutoRefresh = chk.checked;
        if (_monitorAutoRefresh) iniciarMonitorAuto();
        else pararMonitorAuto();
      };
    }
  }

  async function otimizarMemoriaRamUI() {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Otimizando memória RAM via Python...', '⏳', 'info', 2000);
    }
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('trim-memory-now', { all: false });
      if (res && res.ok) {
        const mb = res.data?.economizado_processos_mb || 0;
        const livre = res.data?.ram_depois?.livre_mb || 0;
        if (typeof mostrarToast === 'function') {
          mostrarToast(`RAM Otimizada! ${mb} MB liberados nos processos (${livre} MB livres no Windows).`, '⚡', 'sucesso', 4500);
        }
        if (typeof atualizarMonitorDesempenho === 'function') {
          atualizarMonitorDesempenho();
        }
      } else {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Erro ao otimizar memória: ' + (res?.error || 'falha'), '⚠️', 'alerta', 4000);
        }
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Erro ao acionar otimizador: ' + e.message, '⚠️', 'alerta', 4000);
      }
    }
  }

  async function abrirSentinelaPowerShellUI() {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Abrindo janela do Sentinela de RAM...', '🛡️', 'info', 2500);
    }
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('abrir-sentinela-powershell', { loop: 60, threshold: 75 });
      if (res && res.ok) {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Sentinela ativado! Monitorando a cada 60s (auto-trim > 75%).', '🟢', 'sucesso', 4000);
        }
      } else {
        if (typeof mostrarToast === 'function') {
          mostrarToast('Erro ao abrir terminal: ' + (res?.error || 'falha'), '⚠️', 'alerta', 4000);
        }
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Falha ao acionar Sentinela: ' + e.message, '⚠️', 'alerta', 4000);
      }
    }
  }

  async function alternarSentinelaRamUI() {
    try {
      const { ipcRenderer } = require('electron');
      const res = await ipcRenderer.invoke('toggle-sentinela-ram');
      const badge = document.getElementById('sentinela-badge');
      const txtBtn = document.getElementById('perf-txt-toggle-sentinela');
      const elSt = document.getElementById('perf-ram-sentinela');
      if (res && res.ativo) {
        if (typeof mostrarToast === 'function') mostrarToast('Sentinela Automático de RAM ATIVADO (Auto-trim > 75%)', '🛡️', 'sucesso', 3500);
        if (badge) { badge.textContent = 'AUTO'; badge.style.color = '#4ade80'; }
        if (txtBtn) txtBtn.textContent = 'Sentinela: Ativo';
        if (elSt) elSt.innerHTML = '<span style="color:#4ade80">🟢 Ativo (Auto >75%)</span>';
      } else {
        if (typeof mostrarToast === 'function') mostrarToast('Sentinela de RAM pausado.', '⏸️', 'info', 3000);
        if (badge) { badge.textContent = 'PAUSA'; badge.style.color = '#94a3b8'; }
        if (txtBtn) txtBtn.textContent = 'Sentinela: Pausado';
        if (elSt) elSt.innerHTML = '<span style="color:#94a3b8">⚪ Inativo / Pausado</span>';
      }
    } catch (e) {
      if (typeof mostrarToast === 'function') mostrarToast('Erro ao alternar sentinela: ' + e.message, '⚠️', 'alerta', 4000);
    }
  }

  window.abrirModalMonitorDesempenho = abrirModalMonitorDesempenho;
  window.fecharModalMonitorDesempenho = fecharModalMonitorDesempenho;
  window.otimizarMemoriaRamUI = otimizarMemoriaRamUI;
  window.abrirSentinelaPowerShellUI = abrirSentinelaPowerShellUI;
  window.alternarSentinelaRamUI = alternarSentinelaRamUI;
  window.atualizarMonitorDesempenhoManualmente = () => atualizarMonitorDesempenho();
  window.copiarRelatorioMonitor = async () => {
    if (typeof relatorioDesempenho === 'function') {
      await relatorioDesempenho();
    } else {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Diagnóstico copiado com sucesso!', '📋', 'info', 3000);
      }
    }
  };
})();

// ===== 40-mini-dashboard.js =====
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

// ===== 41-avaliador-meta-v2.js =====
    // =====================================================================
    // 41-avaliador-meta-v2.js — AVALIADOR DE METAS v2 (Beta)
    // =====================================================================
    // Não recalcula scores/tiers nem refaz a lógica de meta — usa a MESMA
    // avaliadorPokesCache / pokesSelecionadosMeta / obterPokesVisiveisFiltrados()
    // de shell/32-35. As funções de renderização de lá (renderizarAvaliadorMeta,
    // atualizarSumarioSelecaoMeta, renderizarEvalSidePanel,
    // atualizarSelectContasAvaliador, alterarModoVisualizacaoAvaliador) foram
    // estendidas pra também escrever nos containers v2 quando esta janela
    // está aberta. As ações em massa (lock/sell/trade) e os botões do
    // toolbar chamam as MESMAS funções globais do v1, direto.
    // =====================================================================
    let avaliadorMetaV2Aberto = false;

    function abrirModalAvaliadorMetaV2() {
      const modal = document.getElementById('modal-avaliador-meta-v2');
      if (!modal) return;
      modal.classList.add('active');
      avaliadorMetaV2Aberto = true;
      atualizarSelectContasAvaliador();
      renderizarAvaliadorMeta();
      if (typeof avaliadorPokesCache === 'undefined' || !avaliadorPokesCache || !avaliadorPokesCache.length) {
        if (typeof atualizarAvaliadorMeta === 'function') atualizarAvaliadorMeta(true);
      }
    }

    function fecharModalAvaliadorMetaV2() {
      const modal = document.getElementById('modal-avaliador-meta-v2');
      if (modal) modal.classList.remove('active');
      avaliadorMetaV2Aberto = false;
    }

    // Filtros/busca/threshold do v2 escrevem no elemento REAL do v1 (que
    // continua no DOM mesmo com o modal v1 fechado) e chamam a mesma função
    // de render — evita duplicar a lógica de obterPokesVisiveisFiltrados().
    function v2AvaliadorSincronizarFiltro(idV1, idV2) {
      const a = document.getElementById(idV1), b = document.getElementById(idV2);
      if (!a || !b) return;
      a.value = b.value;
      renderizarAvaliadorMeta();
    }

    function toggleEvalSidePanelV2() {
      const panel = document.getElementById('v2-eval-side-panel');
      if (!panel) return;
      panel.classList.toggle('open');
      if (panel.classList.contains('open') && typeof renderizarEvalSidePanel === 'function') renderizarEvalSidePanel();
    }

// ===== 45-tipografia-sync.js =====
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
    rotacionarProxyConta: rotacionarProxyConta
  };
  for (var nome in tocos) {
    if (typeof window[nome] === 'undefined') window[nome] = tocos[nome];
  }
})();
