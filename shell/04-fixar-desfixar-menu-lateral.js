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

    function escAtributo(v) {
      return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    // Desenha as linhas dos dois dropdowns a partir do MENU_ITEMS. Chamada no
    // bootstrap e toda vez que um menu abre — assim uma entrada nova aparece
    // sem ninguem precisar mexer no index.html.
    function renderizarMenusDeFerramentas() {
      const destinos = { geral: 'menu-itens-geral', gametools: 'menu-itens-gametools' };
      for (const [menu, containerId] of Object.entries(destinos)) {
        const box = document.getElementById(containerId);
        if (!box) continue;
        let html = '';
        let grupoAtual = null;
        for (const [id, it] of Object.entries(MENU_ITEMS)) {
          if ((it.menu || 'geral') !== menu) continue;
          if (it.grupo && it.grupo !== grupoAtual) {
            grupoAtual = it.grupo;
            html += `<div class="sidebar-menu-cat-title">${it.grupo}</div>`;
          }
          const titulo = escAtributo((it.desc || it.label) + (it.hotkey ? ` (${it.hotkey})` : ''));
          const estilo = it.bold ? ` style="color:${it.color}; font-weight:800"` : '';
          html += `<div class="menu-item-row" data-menu-id="${id}">
            <button class="menu-item-btn menu-item-btn-main"${it.btnId ? ` id="${it.btnId}"` : ''} onclick="${escAtributo(it.action)}" title="${titulo}">
              <span${it.iconId ? ` id="${it.iconId}"` : ''}>${it.icon}</span> <span${it.labelId ? ` id="${it.labelId}"` : ''}${estilo}>${it.label}</span>
              ${it.hotkey ? `<span class="menu-item-hotkey">${it.hotkey}</span>` : ''}
            </button>
            ${it.badgeHtml || ''}
            <button class="menu-pin-btn" onclick="event.stopPropagation(); toggleFixarMenu('${id}')" title="Fixar no menu lateral">📌</button>
          </div>`;
        }
        box.innerHTML = html;
      }
      atualizarEstadoPinButtons();
      // Tres linhas tem rotulo/icone que mudam com o estado do app. Como o
      // innerHTML acima acabou de recriar esses elementos, eles voltam com o
      // valor ESTATICO do registro — sem repintar, o menu abriria dizendo
      // "Áudio Global" com o som mudo e "Grid Multi-Contas" já estando no grid.
      try { if (typeof renderizarEstadoAudio === 'function') renderizarEstadoAudio(); } catch (e) { }
      try { if (typeof atualizarBadgeXpTrackerMenu === 'function') atualizarBadgeXpTrackerMenu(); } catch (e) { }
      try { if (typeof atualizarBadgeCorreio === 'function') atualizarBadgeCorreio(); } catch (e) { }
      try {
        // O rotulo do Grid e escrito inline dentro de toggleGridMode(); nao ha
        // funcao pra reaproveitar, entao a regra fica aqui, em um lugar so.
        if (typeof isGridMode !== 'undefined') {
          const t = document.getElementById('grid-txt-menu');
          const i = document.getElementById('grid-icon-menu');
          if (t) t.textContent = isGridMode ? 'Modo Abas' : 'Grid Multi-Contas';
          if (i) i.textContent = isGridMode ? '🗂️' : '🪟';
        }
      } catch (e) { }
    }

    // IDs que sumiram do MENU_ITEMS mas podem estar salvos no localStorage de
    // quem ja usava o app. Sem isso o item fixado vira uma linha morta na
    // sidebar (renderizarFixadosSidebar nao acha a config e ignora).
    const MENU_ITEMS_LEGADO = {
      'mini-dashboard-v2': 'mini-dashboard'   // v2 virou A tela do Mini Dashboard
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
