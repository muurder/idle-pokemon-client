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
      'central-notificacoes': {
        icon: '🔔', label: 'Painel de Notificações', color: '#38bdf8',
        action: 'fecharIdleSuiteMenu(); abrirModalConfigNotificacoes()',
        menu: 'gametools', categoria: 'audio', grupo: 'Áudio & Notificações', bold: true,
        desc: 'Gerenciar popups, notificações do SO e sons detalhadamente por conta ou globalmente, com testes'
      },
      'silenciar-shinies-atual': {
        icon: '🔕', label: 'Silenciar Janela Atual', color: '#f87171',
        action: 'alternarSilenciarNotificacoesAbaAtual()',
        menu: 'gametools', categoria: 'audio', grupo: 'Áudio & Notificações', bold: true,
        desc: 'Silencia som, popups do Electron e notificações do SO apenas na conta ativa (continua registrando na Sala de Troféus)',
        badgeHtml: '<span id="shiny-mute-atual-badge" style="font-size:9px; font-weight:900; color:#4ade80; background:rgba(34,197,94,0.18); padding:2px 6px; border-radius:10px; border:1px solid rgba(34,197,94,0.35); margin-right:4px">SOM</span>'
      },
      'silenciar-shinies-todas': {
        icon: '🔇', label: 'Silenciar Todas as Abas', color: '#ef4444',
        action: 'alternarSilenciarNotificacoesTodasAbas()',
        menu: 'gametools', categoria: 'audio', grupo: 'Áudio & Notificações', bold: true,
        desc: 'Silencia som, popups do Electron e notificações do SO em TODAS as contas abertas (continua registrando na Sala de Troféus)',
        badgeHtml: '<span id="shiny-mute-todas-badge" style="font-size:9px; font-weight:900; color:#4ade80; background:rgba(34,197,94,0.18); padding:2px 6px; border-radius:10px; border:1px solid rgba(34,197,94,0.35); margin-right:4px">SOM</span>'
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
          if (!itensCat.length) continue;
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
