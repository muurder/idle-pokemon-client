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
