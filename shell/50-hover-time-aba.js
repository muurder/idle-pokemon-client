    // ================================================================
    //  🐾 HOVER DA ABA: O TIME DA CONTA (os 6 do Time & Box)
    // ================================================================
    // A aba mostrava só o pokémon ATIVO (sprite + nome). Com 11 contas, saber
    // quem está com qual time exigia entrar em cada uma e abrir o Time & Box —
    // 11 trocas de aba pra responder "quem tem o Dragonite?".
    //
    // Aqui o time inteiro aparece no hover da aba, sem clique e sem trocar de
    // conta. O dado NÃO custa uma travessia de processo nova: ele veio junto do
    // `__getTabInfo` que o loop de ping (shell/19) já pedia a cada 3,5 s, e
    // mora em `pokemonAtivoCache[i].time`.
    //
    // ── POR QUE UM <div> NO BODY, E NÃO `title` NEM `::after` ──
    // Os dois caminhos baratos estão fechados, pelo mesmo motivo já anotado no
    // tooltip do ping (css/02, shell/19):
    //   • `title` nativo: o Chromium suprime tooltip nativo em descendente de
    //     elemento `draggable="true"` — e `.tab-btn` é arrastável (reordenar).
    //   • `::after` preso à aba: `.tab-btn` tem `overflow:hidden` (degradê da
    //     borda), então o balão sairia cortado.
    // Sobra um único elemento fixo no `<body>`, posicionado por JS.
    //
    // ── ESTE CARD É O ÚNICO TOOLTIP DA ABA ──
    // A aba tinha um `title` nativo (treinador, partição, pokémon ativo, dicas
    // de uso) e o ponto de ping tinha um balão flutuante próprio. Os dois
    // nasciam EM CIMA da aba, que é exatamente onde este card abre — o balão
    // com menos informação cobria os sprites do que tinha mais. Os dois foram
    // removidos (shell/11, shell/19) e o conteúdo deles está aqui: identidade
    // e partição no cabeçalho, ping na linha de estado, dicas no rodapé.

    let _hoverTimeEl = null;
    let _hoverTimeIdx = -1;      // aba cujo balão está aberto (-1 = fechado)
    let _hoverTimeTimer = null;  // atraso de abertura

    // Atraso pra atravessar a lista de abas sem acender 11 balões pelo caminho.
    const HOVER_TIME_ATRASO = 220;

    function _hoverTimeGarantirEl() {
        if (_hoverTimeEl) return _hoverTimeEl;
        _hoverTimeEl = document.createElement('div');
        _hoverTimeEl.className = 'hover-time-aba';
        document.body.appendChild(_hoverTimeEl);
        return _hoverTimeEl;
    }

    function _hoverTimeEsc(t) {
        return String(t == null ? '' : t).replace(/[&<>"]/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function _hoverTimeNum(n) {
        const v = Number(n) || 0;
        return v >= 1000 ? v.toLocaleString('pt-BR') : String(v);
    }

    // Um slot por vaga do time. O sprite é o mesmo caminho absoluto da aba
    // (`urlSpriteAba`, shell/11) — a casca não está na origem do jogo, então
    // caminho relativo não resolve aqui.
    function _hoverTimeSlot(p) {
        if (!p) return '<div class="hta-slot vazio"><span class="hta-vazio-ic">＋</span></div>';
        const nome = p.n || '?';
        const url = (typeof urlSpriteAba === 'function') ? urlSpriteAba(nome) : '';
        const img = url
            ? `<img class="hta-sprite" src="${_hoverTimeEsc(url)}" alt="" loading="lazy" onerror="this.remove()">`
            : '';
        // Shiny é ✨ e não sprite dourado: o acervo do jogo só tem a arte
        // `normal`, então um caminho `shiny` daria imagem quebrada.
        const shiny = p.s ? '<span class="hta-shiny" title="Shiny">✨</span>' : '';
        const tier = p.t ? `<span class="hta-tier">${_hoverTimeEsc(p.t)}</span>` : '';
        return `<div class="hta-slot${p.a ? ' ativo' : ''}">
            <div class="hta-sprite-box">${img}${shiny}</div>
            <div class="hta-nome" title="${_hoverTimeEsc(nome)}">${_hoverTimeEsc(nome)}</div>
            <div class="hta-linha2">
                <span class="hta-lv">Nv ${p.l | 0}</span>
                ${p.p ? `<span class="hta-power">⚡${_hoverTimeNum(p.p)}</span>` : ''}
                ${tier}
            </div>
        </div>`;
    }

    // As dicas de uso vinham do `title` da aba, que sumiu. Sem time pra
    // resumir, o rodapé fica só com elas — mas fica: é o único lugar que ainda
    // conta que a aba se arrasta e que o duplo clique gerencia a conta.
    function _hoverTimeDica() {
        return `<div class="hta-rodape">
            <span class="hta-dica">Arraste para reordenar • Clique duplo para gerenciar</span>
        </div>`;
    }

    function _hoverTimeHtml(index) {
        const nome = (typeof nomesAbas !== 'undefined' && nomesAbas[index]) || `Conta ${index + 1}`;
        let d = null;
        try { d = (typeof pokemonAtivoCache !== 'undefined') ? pokemonAtivoCache[index] : null; } catch (e) { }
        const treinador = (d && d.trainer) ? d.trainer : '';
        const time = (d && Array.isArray(d.time)) ? d.time : null;

        const cor = (typeof corDaAba === 'function') ? corDaAba(index) : '#10b981';
        const particao = (typeof listaParticoes !== 'undefined' && listaParticoes[index])
            || `persist:acc${index + 1}`;

        // Ping: o mesmo texto que estava no balão do ponto ("Conexão boa /
        // proxy estável — 118 ms"), com o pontinho da mesma cor da aba pra
        // amarrar visualmente ao que está na lista.
        let ping = null;
        try { ping = (typeof pingPorConta !== 'undefined') ? pingPorConta[index] : null; } catch (e) { }

        // Pokémon ativo com nome e nível: era a linha `🎮 Pokémon:` do `title`.
        // Fica no cabeçalho e não só no slot marcado da grade porque a conta
        // pode estar com o time carregado e o ativo ainda não lido.
        const ativoTxt = (d && d.poke)
            ? `${d.poke}${d.lv ? ` Nv ${d.lv}` : ''}`
            : '—';

        let html = `<div class="hta-topo" style="--cor-aba:${_hoverTimeEsc(cor)}">
            <div class="hta-topo-l1">
                <span class="hta-conta">${_hoverTimeEsc(nome)}</span>
                ${treinador ? `<span class="hta-treinador">🧑 ${_hoverTimeEsc(treinador)}</span>` : ''}
            </div>
            <div class="hta-topo-l2">
                <span class="hta-particao" title="${_hoverTimeEsc(particao)}">${_hoverTimeEsc(particao)}</span>
                <span class="hta-ping">
                    <i class="hta-ping-dot ${_hoverTimeEsc(ping ? (ping.classe || '') : '')}"></i>
                    ${_hoverTimeEsc(ping ? ping.texto : 'Latência não medida ainda')}
                </span>
            </div>
            <div class="hta-topo-l3">🎮 ${_hoverTimeEsc(ativoTxt)}</div>
        </div>`;

        if (!time) {
            // Sem dado ainda ≠ time vazio. Dizer qual dos dois é evita a
            // conclusão errada de que a conta está sem pokémon.
            html += `<div class="hta-aviso">Time ainda não lido desta conta.<br>
                <i>Chega na próxima varredura (até 3,5 s), se a conta estiver logada.</i></div>`;
            return html + _hoverTimeDica();
        }
        if (!time.length) {
            html += `<div class="hta-aviso">Nenhum pokémon no time.</div>`;
            return html + _hoverTimeDica();
        }

        html += '<div class="hta-grade">';
        for (let i = 0; i < 6; i++) html += _hoverTimeSlot(time[i] || null);
        html += '</div>';
        const somaPower = time.reduce((a, p) => a + (Number(p.p) || 0), 0);
        html += `<div class="hta-rodape">
            <span>${time.length}/6 no time · ⚡ soma ${_hoverTimeNum(somaPower)}</span>
            <span class="hta-dica">Arraste para reordenar • Clique duplo para gerenciar</span>
        </div>`;
        return html;
    }

    // Colado na aba, à direita da sidebar. Se não couber à direita (sidebar
    // fixada + janela estreita), vai pra esquerda; e nunca passa do topo nem do
    // rodapé da janela.
    function _hoverTimePosicionar(btn) {
        const el = _hoverTimeEl;
        if (!el || !btn) return;
        const r = btn.getBoundingClientRect();
        const cx = el.getBoundingClientRect();
        const margem = 10;

        let esq = r.right + margem;
        if (esq + cx.width > window.innerWidth - 8) {
            esq = r.left - margem - cx.width;
            if (esq < 8) esq = Math.max(8, window.innerWidth - cx.width - 8);
        }
        let topo = r.top + r.height / 2 - cx.height / 2;
        topo = Math.max(8, Math.min(topo, window.innerHeight - cx.height - 8));

        el.style.left = `${Math.round(esq)}px`;
        el.style.top = `${Math.round(topo)}px`;
    }

    function _hoverTimeMostrar(index) {
        const btn = document.getElementById(`tab-${index}`);
        if (!btn) return;
        const el = _hoverTimeGarantirEl();
        el.innerHTML = _hoverTimeHtml(index);
        el.classList.add('visivel');
        _hoverTimeIdx = index;
        // Posiciona depois de o conteúdo existir: a altura do balão muda com o
        // aviso ("time ainda não lido") em vez da grade de 6.
        _hoverTimePosicionar(btn);
    }

    function fecharHoverTimeAba() {
        if (_hoverTimeTimer) { clearTimeout(_hoverTimeTimer); _hoverTimeTimer = null; }
        _hoverTimeIdx = -1;
        if (_hoverTimeEl) _hoverTimeEl.classList.remove('visivel');
    }

    // Chamada pelo loop de ping (shell/19) a cada varredura: se o balão aberto
    // é o desta conta, ele se redesenha com o dado novo em vez de congelar o
    // time de 3 segundos atrás enquanto o mouse continua parado ali.
    function atualizarHoverTimeAba(index) {
        if (_hoverTimeIdx !== index || !_hoverTimeEl) return;
        _hoverTimeEl.innerHTML = _hoverTimeHtml(index);
        _hoverTimePosicionar(document.getElementById(`tab-${index}`));
    }

    // Delegado no document, e não em cada `.tab-btn`: `renderizarAbasClient`
    // recria os botões a cada render (cor, reordenação, conta nova), e listener
    // preso ao botão morreria junto com ele.
    document.addEventListener('mouseover', (e) => {
        const btn = e.target.closest && e.target.closest('.tab-btn');
        if (!btn) return;
        const m = /^tab-(\d+)$/.exec(btn.id || '');   // o `tab-dash` não entra
        if (!m) return;
        const idx = parseInt(m[1], 10);
        if (idx === _hoverTimeIdx) return;
        if (_hoverTimeTimer) clearTimeout(_hoverTimeTimer);
        _hoverTimeTimer = setTimeout(() => _hoverTimeMostrar(idx), HOVER_TIME_ATRASO);
    });

    document.addEventListener('mouseout', (e) => {
        const btn = e.target.closest && e.target.closest('.tab-btn');
        if (!btn) return;
        // `mouseout` dispara ao andar entre os filhos do próprio botão (sprite,
        // título, ponto de ping); só fecha quando o ponteiro saiu do botão.
        if (e.relatedTarget && btn.contains(e.relatedTarget)) return;
        fecharHoverTimeAba();
    });

    // O balão é `pointer-events:none`, então ele nunca rouba o hover — mas
    // arrastar, clicar e rolar a lista devem apagá-lo na hora.
    document.addEventListener('dragstart', fecharHoverTimeAba, true);
    document.addEventListener('mousedown', fecharHoverTimeAba, true);
    window.addEventListener('blur', fecharHoverTimeAba);
    document.addEventListener('scroll', fecharHoverTimeAba, true);
