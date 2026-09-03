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
        btn.setAttribute('title', `${nome} (${listaParticoes[i] || ('persist:acc' + (i + 1))})\nPokémon: …\nArraste para reordenar • Clique duplo para gerenciar`);
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
