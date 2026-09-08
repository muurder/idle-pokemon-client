        // =====================================================================
        // 28d-berry-card-treinador.js — RELÓGIO E FILA DE BERRYS NO CARD
        // =====================================================================
        // Uma berry (consumível de item segurado) é GASTA na hora e corre no
        // relógio de parede — some mesmo com o jogo fechado. Só que o prazo
        // dela só aparece em UM lugar: o modal "Item segurado", três cliques
        // longe. Quem está caçando não abre esse modal, então a berry vencia
        // sem ninguém ver.
        //
        // Aqui o prazo vira uma tira dentro do #player-panel, logo abaixo da
        // linha de ouro/diamante/pontos (.pp-cash). Fica no card OFICIAL, e não
        // numa doca nossa, pelo mesmo motivo dos selos de ETA (28-auto-hunt-
        // precos.js): no modo 2x2 cada webview carrega o próprio card, então
        // cada conta mostra a própria berry. Uma doca só enxergaria a aba ativa.
        //
        // A tira também é a porta da FILA: o "+" abre o painel onde se marca
        // quais berrys podem ser estouradas sozinhas e em que ordem. Ver
        // "Fila automática" mais abaixo.
        //
        // === De onde vem o dado ==============================================
        // Duas fontes, porque nenhuma sozinha basta:
        //
        //   K.team[] (o state que o jogo já mantém) tem `heldC`, `heldCNome`,
        //   `heldCTxt`, `heldCTier` e `heldCMin` — MINUTOS restantes. É de graça
        //   (nenhuma requisição) e atualiza sozinho, mas em minuto cheio não dá
        //   pra escrever "faltam 59min 58s" nem pra desenhar a barra: o total
        //   em horas da berry não está no state.
        //
        //   /api/helds traz `heldCResta` (MILISSEGUNDOS restantes),
        //   `heldCFicha.horas` (a duração total) e a mochila de consumíveis com
        //   o estoque por tier — o que falta. Mas é uma requisição, e pedir de
        //   segundo em segundo seria absurdo.
        //
        // Então: o K diz QUAIS berrys existem (a cada tick, de graça), e o
        // /api/helds é chamado só quando esse conjunto MUDA — berry nova,
        // berry que acabou, troca de time. Entre uma chamada e outra o prazo
        // corre no relógio local, ancorado no instante da última sincronia.
        // Numa hora de berry isso dá 2 requisições, não 3600.
        //
        // O formato do tempo ("59min 58s", "1h 30min") é o mesmo do modal do
        // jogo, copiado da função de formatação dele — o card e o modal têm que
        // dizer a mesma coisa, senão parecem dois relógios discordando.
        //
        // Desligar a tira: localStorage.setItem('idleSuiteBerryNoCard', '0').
        // =====================================================================

        // Prazo ancorado por berry. Chave: pokeId|item|tier — muda a chave,
        // muda a berry, e o prazo velho não pode vazar pro novo.
        const _berryPrazos = new Map();   // chave -> { fim, totalMs, desc, icone, nome }
        let _berryChavesVistas = '';      // assinatura do conjunto atual
        let _berrySincronizando = false;
        let _berryProximaSync = 0;        // ts da próxima sincronia de segurança

        // Rede de segurança: mesmo sem o conjunto mudar, re-ancora de tempos em
        // tempos. Cobre o caso do PC dormir e voltar com o relógio local adiantado
        // em relação ao servidor.
        const BERRY_SYNC_MS = 10 * 60 * 1000;

        function berryLigada() {
            try { return localStorage.getItem('idleSuiteBerryNoCard') !== '0'; } catch (e) { return true; }
        }

        // K é `let` de topo do game.js: entra no escopo léxico global, NÃO vira
        // propriedade do window (mesma pegadinha documentada em
        // 35-doca-inventario.js). Por isso o `typeof` antes — identificador não
        // declarado lança ReferenceError, não devolve undefined.
        function berryEstadoJogo() {
            try { if (typeof K !== 'undefined' && K) return K; } catch (e) { }
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (w.K) return w.K;
            } catch (e) { }
            return null;
        }

        function berryToken() {
            try { if (typeof q !== 'undefined' && q) return String(q); } catch (e) { }
            try {
                const ss = sessionStorage.getItem('pmi_tab_token');
                if (ss && ss.length >= 10) return ss;
            } catch (e) { }
            try {
                const ls = localStorage.getItem('pmi_token');
                if (ls && ls.length >= 10) return ls;
            } catch (e) { }
            return '';
        }

        // Mesmo formato do modal de item segurado do jogo: "1h 05min",
        // "59min 58s", "42s".
        function berryFmtTempo(ms) {
            const seg = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
            const h = Math.floor(seg / 3600);
            const m = Math.floor((seg % 3600) / 60);
            if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'min';
            if (m > 0) return m + 'min ' + String(seg % 60).padStart(2, '0') + 's';
            return seg + 's';
        }

        function berryChave(p) {
            return String(p.id || '') + '|' + String(p.heldC || '') + '|' + String(p.heldCTier || '');
        }

        function berryEsc(t) {
            return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        }

        function berryPokeAtivo() {
            const st = berryEstadoJogo();
            if (!st) return null;
            const time = Array.isArray(st.team) ? st.team : [];
            const idAtivo = st.activeId || (st.active && st.active.id) || null;
            if (!idAtivo) return null;
            for (const p of time) if (p && p.id === idAtivo) return p;
            return null;
        }

        // As berrys do time, lidas do state do jogo. `heldCMin` é o que separa
        // "berry rodando" de "slot livre": quando o prazo acaba o servidor zera
        // o `heldC` e acende `heldCVencido`, então não existe berry fantasma.
        function berryAtivasDoState() {
            const st = berryEstadoJogo();
            if (!st) return [];
            const time = Array.isArray(st.team) ? st.team : [];
            const idAtivo = st.activeId || (st.active && st.active.id) || null;
            const fora = [];
            for (const p of time) {
                if (!p || !p.heldC) continue;
                if (!(Number(p.heldCMin) > 0)) continue;
                fora.push({
                    chave: berryChave(p),
                    pokeId: p.id || '',
                    pokeNome: p.name || '',
                    ativo: !!(idAtivo && p.id === idAtivo),
                    nome: p.heldCNome || p.heldC || 'consumível',
                    tier: Number(p.heldCTier) || 0,
                    txt: p.heldCTxt || '',
                    min: Number(p.heldCMin) || 0
                });
            }
            // Pokémon ativo primeiro: é a berry que está agindo na caçada agora.
            fora.sort((a, b) => (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0));
            return fora;
        }

        // =====================================================================
        // FILA AUTOMÁTICA
        // =====================================================================
        // `heldConsumir` é IRREVERSÍVEL: a berry sai da mochila na hora e o
        // prazo começa a correr, mesmo com o jogo fechado. Então a fila:
        //
        //   - nasce DESLIGADA e só usa o que estiver explicitamente marcado;
        //   - só dispara quando o slot do pokémon ativo está VAZIO — nunca
        //     por cima de uma berry correndo, que jogaria fora o prazo que
        //     sobrava (é o que o próprio jogo avisa ao descartar);
        //   - antes de gastar, CONFIRMA com o servidor (/api/helds) que o slot
        //     está mesmo vazio. O K local pode estar alguns segundos atrás, e
        //     um K velho seria exatamente o jeito de estourar duas berrys.
        //
        // A ordem da fila é a ordem em que os tiers foram marcados: a primeira
        // marcada é a primeira a ser usada, e quem está sem estoque é pulado.
        // =====================================================================
        const BERRY_FILA_KEY = 'idleSuiteBerryFila';
        // Depois de gastar uma, silêncio: dá tempo do servidor responder e do K
        // chegar com o slot já ocupado, antes de qualquer nova tentativa.
        const BERRY_USO_DEBOUNCE_MS = 20000;

        // A berry de UTILIDADE é a que mais se usa em caçada, então é ela que a
        // fila já vem sugerindo — mas como uma SUGESTÃO, não como uma regra:
        //
        //   - só é aplicada uma vez, na primeira sincronia em que a mochila
        //     chega, e só se o usuário nunca tiver mexido na fila. Depois disso
        //     `padrao` fica marcado e ninguém escreve na lista de novo. Quem
        //     desmarcou tudo de propósito não vê a sugestão voltar sozinha no
        //     próximo tick, que seria a forma mais irritante possível de errar;
        //   - a fila continua nascendo DESLIGADA. Ter a berry sugerida não
        //     gasta nada: sem ligar o "repor sozinho", nada sai da mochila.
        //
        // O nome do item vem do servidor, não do client, então casamos por
        // pedaço de texto normalizado (sem acento, minúsculo) no nome e na
        // função. Se o servidor renomear o item e nada casar, a fila fica vazia
        // e o painel pede pra marcar à mão — nunca chuta outro item no lugar.
        const BERRY_PADRAO_TERMOS = ['utilidad', 'utilitar'];

        let _berryFila = { ligado: false, itens: [], padrao: false };   // itens: [{chave, tier}]
        let _berryMochila = [];                          // consumíveis, do /api/helds
        let _berryPainel = null;                         // popover aberto
        // Quais itens estão com a descrição aberta. A lista nasce toda
        // recolhida: com seis consumíveis a descrição de cada um jogava os
        // chips pra fora da área visível, e os chips são a razão do painel.
        const _berryAbertos = new Set();
        let _berryUltimoUso = 0;
        let _berryUsando = false;
        let _berryAviso = '';                            // última falha, mostrada no painel

        function berryFilaCarregar() {
            try {
                const cru = localStorage.getItem(BERRY_FILA_KEY);
                if (!cru) return;
                const o = JSON.parse(cru);
                if (!o || typeof o !== 'object') return;
                _berryFila = {
                    ligado: !!o.ligado,
                    padrao: !!o.padrao,
                    itens: (Array.isArray(o.itens) ? o.itens : [])
                        .filter(i => i && i.chave)
                        .map(i => ({ chave: String(i.chave), tier: Number(i.tier) || 1 }))
                };
            } catch (e) { }
        }

        function berryNorm(t) {
            return String(t == null ? '' : t)
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .trim();
        }

        function berryEhUtilidade(it) {
            const alvo = berryNorm([it.nome, it.funcao, it.tipo, it.pt].join(' '));
            return BERRY_PADRAO_TERMOS.some(t => alvo.indexOf(t) >= 0);
        }

        // Os itens que a sugestão marcaria, na ordem em que marcaria. Existe
        // separado de quem aplica porque a tela precisa NOMEAR o que vai
        // acontecer: "berry de utilidade" não é o nome de nada que o jogador vê
        // na mochila, e uma mensagem falando de uma categoria abstrata enquanto
        // a lista logo abaixo mostra nomes próprios só confunde.
        function berrySugestao() {
            const escolhidos = [];
            for (const it of _berryMochila) {
                if (!berryEhUtilidade(it)) continue;
                // Do tier mais alto pro mais baixo: gastar primeiro o melhor é
                // o que o jogador faria à mão numa caçada.
                Object.keys(it.porTier || {})
                    .map(Number).filter(t => t > 0 && Number(it.porTier[t]) > 0)
                    .sort((a, b) => b - a)
                    .forEach(t => escolhidos.push({ chave: it.chave, tier: t, nome: it.nome || it.chave }));
            }
            return escolhidos;
        }

        // Os nomes distintos que a sugestão pegaria, pra escrever na tela.
        function berrySugestaoNomes() {
            const vistos = [];
            for (const s of berrySugestao()) {
                if (vistos.indexOf(s.nome) < 0) vistos.push(s.nome);
            }
            return vistos;
        }

        // Chamada só depois de a mochila chegar do servidor: antes disso não há
        // como saber quais itens existem, e marcar no escuro daria fila com
        // chave inventada.
        function berryAplicarPadrao() {
            if (_berryFila.padrao) return;
            if (!_berryMochila.length) return;
            _berryFila.padrao = true;          // a sugestão é de uma vez só
            if (_berryFila.itens.length) { berryFilaSalvar(); return; }

            const escolhidos = berrySugestao().map(s => ({ chave: s.chave, tier: s.tier }));
            if (escolhidos.length) _berryFila.itens = escolhidos;
            berryFilaSalvar();
        }

        function berryFilaSalvar() {
            try { localStorage.setItem(BERRY_FILA_KEY, JSON.stringify(_berryFila)); } catch (e) { }
        }

        function berryFilaTem(chave, tier) {
            return _berryFila.itens.some(i => i.chave === chave && i.tier === tier);
        }

        function berryFilaAlternar(chave, tier) {
            const i = _berryFila.itens.findIndex(x => x.chave === chave && x.tier === tier);
            if (i >= 0) _berryFila.itens.splice(i, 1);
            else _berryFila.itens.push({ chave, tier });
            berryFilaSalvar();
            berryPintarPainel();
            atualizarTiraBerry();
        }

        function berryEstoque(chave, tier) {
            const it = _berryMochila.filter(m => m.chave === chave)[0];
            if (!it) return 0;
            return Number((it.porTier || {})[tier]) || 0;
        }

        // Primeiro da fila que ainda tem estoque. Sem `_berryMochila` (nunca
        // sincronizou) devolve null em vez de chutar: gastar item por chute é
        // o único erro daqui que não dá pra desfazer.
        function berryProximaDaFila() {
            if (!_berryMochila.length) return null;
            for (const i of _berryFila.itens) {
                if (berryEstoque(i.chave, i.tier) > 0) {
                    const ficha = _berryMochila.filter(m => m.chave === i.chave)[0] || {};
                    return { chave: i.chave, tier: i.tier, nome: ficha.nome || i.chave, icone: ficha.icone || 0 };
                }
            }
            return null;
        }

        // Uma chamada ao /api/helds, pra ancorar o prazo e ler o estoque.
        // `equipados` é a lista do time (mesma que o modal do jogo desenha);
        // `heldCResta` vem em ms e `heldCFicha.horas` é a duração total — sem
        // ela não dá pra saber que fatia da barra já correu.
        async function berrySincronizarPrazos() {
            if (_berrySincronizando) return null;
            const tok = berryToken();
            if (!tok) return null;
            _berrySincronizando = true;
            try {
                const r = await fetch('/api/helds?token=' + encodeURIComponent(tok));
                if (!r.ok) return null;
                const j = await r.json();
                const equipados = (j && Array.isArray(j.equipados)) ? j.equipados : [];
                const agora = Date.now();
                const vivas = new Set();
                for (const p of equipados) {
                    if (!p || !p.heldC || !(Number(p.heldCResta) > 0)) continue;
                    const chave = berryChave(p);
                    const ficha = p.heldCFicha || {};
                    vivas.add(chave);
                    _berryPrazos.set(chave, {
                        fim: agora + Number(p.heldCResta),
                        totalMs: 3600000 * (Number(ficha.horas) || 1),
                        desc: (p.heldCResumo && p.heldCResumo.rotulo) || ficha.desc || '',
                        icone: ficha.icone || 0,
                        nome: ficha.nome || ''
                    });
                }
                // Some o que o servidor não lista mais: berry descartada ou
                // vencida deixaria um prazo fantasma correndo aqui pra sempre.
                for (const chave of Array.from(_berryPrazos.keys())) {
                    if (!vivas.has(chave)) _berryPrazos.delete(chave);
                }
                // Só a aba "consumível" da mochila interessa: item fixo (luva)
                // não tem prazo e não entra em fila nenhuma.
                _berryMochila = ((j && Array.isArray(j.mochila)) ? j.mochila : [])
                    .filter(it => it && (it.slot || 'fixo') === 'consumivel');
                _berryProximaSync = agora + BERRY_SYNC_MS;
                berryAplicarPadrao();
                berryPintarPainel();
                return { equipados };
            } catch (e) {
                // Servidor antigo sem a rota, ou rede fora: a tira continua
                // desenhando com o minuto cheio do state.
                _berryProximaSync = Date.now() + BERRY_SYNC_MS;
                return null;
            } finally {
                _berrySincronizando = false;
            }
        }

        // O motor. Roda no mesmo tick de 1s da tira, mas quase todo tick sai
        // pelas guardas de cima — a parte que fala com a rede só acontece
        // quando o slot está realmente vazio e existe fila com estoque.
        async function berryMotorFila() {
            if (!_berryFila.ligado || _berryUsando) return;
            if (Date.now() - _berryUltimoUso < BERRY_USO_DEBOUNCE_MS) return;

            const poke = berryPokeAtivo();
            if (!poke) return;
            // Slot ocupado: não se estoura berry por cima de berry. O prazo que
            // sobrava seria perdido.
            if (poke.heldC && Number(poke.heldCMin) > 0) return;

            const alvo = berryProximaDaFila();
            if (!alvo) return;

            const tok = berryToken();
            if (!tok) return;

            _berryUsando = true;
            // O relógio começa a contar AQUI, e não só depois do POST: daqui
            // pra baixo toda saída fala com a rede pelo menos uma vez. Marcando
            // só no fim, uma confirmação que recusasse (slot ainda ocupado no
            // servidor, estoque que sumiu) devolveria o motor pro começo sem
            // intervalo nenhum — e ele bateria no /api/helds a cada segundo.
            _berryUltimoUso = Date.now();
            try {
                // Confirmação com o servidor ANTES de gastar: o K local pode
                // estar atrás, e um K velho é exatamente o jeito de estourar
                // duas berrys seguidas.
                const fresco = await berrySincronizarPrazos();
                if (!fresco) return;
                const equip = (fresco.equipados || []).filter(p => p && p.id === poke.id)[0];
                if (equip && equip.heldC && Number(equip.heldCResta) > 0) return;
                // O estoque pode ter mudado na mesma sincronia (venda, uso em
                // outra aba): reescolhe em cima do que acabou de chegar.
                const alvo2 = berryProximaDaFila();
                if (!alvo2) return;

                const r = await fetch('/api/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: tok,
                        action: 'heldConsumir',
                        pokeId: poke.id,
                        item: alvo2.chave,
                        tier: alvo2.tier
                    })
                });
                const j = await r.json().catch(() => ({}));
                _berryUltimoUso = Date.now();
                if (j && j.err) {
                    _berryAviso = String(j.err);
                } else {
                    _berryAviso = '';
                    if (typeof showStatusToast === 'function') {
                        try { showStatusToast('🍓 ' + alvo2.nome + ' T' + alvo2.tier + ' estourada em ' + (poke.name || 'seu pokémon')); } catch (e) { }
                    }
                }
                // Força a próxima leitura a bater no servidor: prazo novo e
                // estoque novo entram na tira no tick seguinte.
                _berryChavesVistas = '';
                _berryProximaSync = 0;
            } catch (e) {
                _berryUltimoUso = Date.now();
                _berryAviso = 'Não deu pra falar com o servidor.';
            } finally {
                _berryUsando = false;
            }
        }

        // =====================================================================
        // PAINEL DA FILA (popover ancorado no card)
        // =====================================================================
        function berryFecharPainel() {
            if (_berryPainel) {
                _berryPainel.remove();
                _berryPainel = null;
            }
            document.removeEventListener('mousedown', berryCliqueFora, true);
        }

        function berryCliqueFora(ev) {
            if (!_berryPainel) return;
            if (_berryPainel.contains(ev.target)) return;
            if (ev.target && ev.target.closest && ev.target.closest('#idle-berry-add')) return;
            berryFecharPainel();
        }

        function berryAbrirPainel() {
            if (_berryPainel) { berryFecharPainel(); return; }

            const p = document.createElement('div');
            p.id = 'idle-berry-painel';
            p.style.cssText = 'position:fixed; z-index:9500; width:286px; max-height:min(62vh,520px);'
                + ' overflow:auto; background:rgba(10,20,26,.97); border:1px solid rgba(63,127,110,.75);'
                + ' border-radius:12px; box-shadow:0 18px 48px -14px rgba(0,0,0,.85); padding:10px 11px 11px;'
                + ' color:#cdeee6; font:12px/1.4 system-ui,Segoe UI,Roboto,sans-serif;';
            document.body.appendChild(p);
            _berryPainel = p;
            berryPosicionarPainel();
            berryPintarPainel();
            // Estoque na hora de escolher: a lista da mochila pode estar velha
            // de até 10 minutos, e escolher em cima de estoque velho frustra.
            _berryProximaSync = 0;
            berrySincronizarPrazos();
            // `true` (captura): o jogo tem handler de mousedown no canvas que
            // engole o evento; sem capturar, o clique fora nunca chegaria aqui.
            document.addEventListener('mousedown', berryCliqueFora, true);
        }

        function berryPosicionarPainel() {
            if (!_berryPainel) return;
            const card = document.getElementById('player-panel');
            if (!card) return;
            const r = card.getBoundingClientRect();
            const larg = 286;
            // À direita do card por padrão; se não couber, embaixo dele.
            let esq = r.right + 10;
            let topo = r.top;
            if (esq + larg > window.innerWidth - 8) {
                esq = Math.max(8, Math.min(r.left, window.innerWidth - larg - 8));
                topo = r.bottom + 8;
            }
            _berryPainel.style.left = Math.round(esq) + 'px';
            _berryPainel.style.top = Math.round(Math.max(8, topo)) + 'px';
        }

        // =====================================================================
        // A LINHA DE ETA
        // =====================================================================
        // O ETA já existia no card, mas emendado no fim de linhas que não eram
        // dele (28-auto-hunt-precos.js: um selo colado na tag de Lv. do
        // pokémon, outro no fim de "EXP 68% · 0.8x stage"). Nos 244px úteis do
        // card isso cortava o número no meio — "≈537x" virava "≈537" e sumia —
        // e misturava duas contas diferentes na mesma linha.
        //
        // Aqui viram duas linhas próprias, em colunas alinhadas: quem sobe, em
        // quanto tempo, e em quantos pokémons. O ETA do pokémon e o do treinador
        // ficam um debaixo do outro, então dá pra comparar sem ler texto.
        //
        // O dado é o mesmo `window.__idleSuiteXpStatus` que o XP Tracker já
        // publica — no dev vem de 28-auto-hunt-precos.js, no client de
        // 28c-xp-status-client.js. Recalcular ETA aqui seria uma terceira conta
        // discordando das outras duas.
        const ETA_LINHA_KEY = 'idleSuiteEtaLinha';

        function berryEtaLinhaLigada() {
            try { return localStorage.getItem(ETA_LINHA_KEY) !== '0'; } catch (e) { return true; }
        }

        // A linha nova e os selos antigos mostram a MESMA conta. Deixar os dois
        // ligados enche o card de duplicata, então quem liga um desliga o outro.
        // `idleSuiteEtaNoCard` é a chave que 28/28c já liam pra decidir se
        // pintam os selos — escrever nela aqui é usar o interruptor que já
        // existe, não inventar um segundo.
        function berryEtaDefinir(ligado) {
            try {
                localStorage.setItem(ETA_LINHA_KEY, ligado ? '1' : '0');
                localStorage.setItem('idleSuiteEtaNoCard', '0');
            } catch (e) { }
        }

        // Migração de uma vez só, no primeiro carregamento depois desta versão:
        // sem isto o card apareceria com a linha nova E os selos velhos até
        // alguém achar o toggle.
        function berryEtaMigrar() {
            try {
                if (localStorage.getItem(ETA_LINHA_KEY) == null) berryEtaDefinir(true);
            } catch (e) { }
        }

        function berryFmtEta(seg) {
            if (!Number.isFinite(seg) || seg <= 0) return '—';
            seg = Math.round(seg);
            if (seg > 86400 * 3) return '> 72h';
            const d = Math.floor(seg / 86400);
            const h = Math.floor((seg % 86400) / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = seg % 60;
            if (d > 0) return d + 'd ' + h + 'h';
            if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
            if (m > 0) return m + 'm ' + String(s).padStart(2, '0') + 's';
            return s + 's';
        }

        // `falta` chega pronto do XP Tracker como "≈ 537 pokes p/ subir". No
        // card cabe só o número, e refazer a conta aqui daria um terceiro
        // estimador — o problema que 01b-taxa-eta.js existe pra ter acabado.
        function berryKillsDeFalta(txt) {
            const m = /≈\s*~?\s*([\d.,]+\s*[KMB]?)/i.exec(String(txt || ''));
            return m ? m[1].replace(/\s+/g, '') : '';
        }

        // Uma linha de ajuste: rótulo à esquerda, chavinha à direita. O <span>
        // inteiro é clicável, então não há alvo de 12px pra acertar.
        function berryLinhaAjusteHtml(id, rotulo, ligado, ajuda) {
            return '<div id="' + id + '" role="button" tabindex="0" title="' + berryEsc(ajuda) + '"'
                + ' style="cursor:pointer; display:flex; align-items:center; gap:8px; padding:5px 0">'
                + '<span style="flex:1; min-width:0; font-size:11px; color:'
                + (ligado ? '#cdeee6' : '#8fb3ab') + '">' + berryEsc(rotulo) + '</span>'
                + '<span style="flex:none; width:26px; height:15px; border-radius:999px; position:relative;'
                + ' background:' + (ligado ? '#34d399' : 'rgba(148,163,184,.35)') + '">'
                + '<span style="position:absolute; top:2px; left:' + (ligado ? '13' : '2') + 'px;'
                + ' width:11px; height:11px; border-radius:50%; background:#0a141a; transition:left .15s"></span>'
                + '</span></div>';
        }

        function berryPintarPainel() {
            const p = _berryPainel;
            if (!p) return;

            const prox = berryProximaDaFila();
            const sugeridos = berrySugestaoNomes();
            const algumAberto = _berryMochila.some(it => _berryAbertos.has(it.chave));
            const linhas = _berryMochila.map(it => {
                const aberto = _berryAbertos.has(it.chave);
                const tiers = Object.keys(it.porTier || {})
                    .map(Number).filter(t => t > 0).sort((a, b) => b - a);
                const chips = tiers.map(t => {
                    const n = Number(it.porTier[t]) || 0;
                    const on = berryFilaTem(it.chave, t);
                    const ordem = on ? (_berryFila.itens.findIndex(x => x.chave === it.chave && x.tier === t) + 1) : 0;
                    return '<span class="idle-berry-chip" data-chave="' + berryEsc(it.chave) + '" data-tier="' + t + '"'
                        + ' role="button" tabindex="0"'
                        + ' title="' + berryEsc(on ? 'Tirar da fila' : 'Pôr na fila') + '"'
                        + ' style="cursor:pointer; user-select:none; font-size:10px; font-weight:700;'
                        + ' padding:2px 7px; border-radius:999px; white-space:nowrap;'
                        + (on
                            ? ' background:rgba(52,211,153,.22); border:1px solid #34d399; color:#a7f3d0;'
                            : ' background:rgba(148,163,184,.10); border:1px solid rgba(148,163,184,.35); color:#94a3b8;')
                        + '">' + (ordem ? ordem + '· ' : '') + 'T' + t + ' ×' + n + '</span>';
                }).join('');
                if (!chips) return '';
                const naFila = _berryFila.itens.some(x => x.chave === it.chave);
                // Recolhido mostra o essencial pra decidir: nome, quanto tem e
                // se já está na fila. A descrição do efeito é o que ocupa três
                // linhas cada, então é ela que fica atrás do clique.
                return '<div style="border-top:1px solid rgba(148,163,184,.13)">'
                    + '<div class="idle-berry-cab" data-chave="' + berryEsc(it.chave) + '" role="button" tabindex="0"'
                    + ' title="' + berryEsc(aberto ? 'Recolher' : 'Ver o efeito') + '"'
                    + ' style="cursor:pointer; display:flex; gap:8px; align-items:center; padding:7px 0 5px">'
                    + '<img src="sprites/item_' + (Number(it.icone) || 0) + '.png" width="22" height="22"'
                    + ' style="width:22px;height:22px;image-rendering:pixelated;flex:none"'
                    + ' onerror="this.style.visibility=\'hidden\'" alt="">'
                    + '<span style="flex:1; min-width:0; font-size:11.5px; font-weight:700; color:'
                    + (naFila ? '#a7f3d0' : '#cdeee6') + '; overflow:hidden; text-overflow:ellipsis;'
                    + ' white-space:nowrap">' + berryEsc(it.nome) + '</span>'
                    + '<span style="flex:none; font-size:9.5px; color:#7d97a0">'
                    + (Number(it.horas) ? it.horas + 'h' : '') + '</span>'
                    + '<span style="flex:none; font-size:9px; color:#7d97a0; width:9px; text-align:center;'
                    + ' transform:rotate(' + (aberto ? '90' : '0') + 'deg); transition:transform .12s">▶</span>'
                    + '</div>'
                    + (aberto
                        ? '<div style="font-size:10px; color:#8fb3ab; margin:0 0 6px 30px; line-height:1.4">'
                        + berryEsc(it.desc || 'Sem descrição.') + '</div>'
                        : '')
                    + '<div style="display:flex; flex-wrap:wrap; gap:4px; margin:0 0 7px 30px">' + chips + '</div>'
                    + '</div>';
            }).join('');

            p.innerHTML = ''
                + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px">'
                + '<span style="font-size:13px">🍓</span>'
                + '<b style="flex:1; font-size:12.5px; color:#e2f5ef">Fila de berrys</b>'
                + '<span id="idle-berry-fechar" role="button" tabindex="0" title="Fechar"'
                + ' style="cursor:pointer; color:#8fb3ab; font-size:14px; line-height:1; padding:2px 4px">✕</span>'
                + '</div>'

                + '<div id="idle-berry-toggle" role="button" tabindex="0"'
                + ' style="cursor:pointer; display:flex; align-items:center; gap:8px; padding:8px 9px;'
                + ' border-radius:9px; border:1px solid ' + (_berryFila.ligado ? '#34d399' : 'rgba(148,163,184,.3)') + ';'
                + ' background:' + (_berryFila.ligado ? 'rgba(52,211,153,.14)' : 'rgba(148,163,184,.06)') + '">'
                + '<span style="flex:none; width:30px; height:17px; border-radius:999px; position:relative;'
                + ' background:' + (_berryFila.ligado ? '#34d399' : 'rgba(148,163,184,.35)') + '">'
                + '<span style="position:absolute; top:2px; left:' + (_berryFila.ligado ? '15' : '2') + 'px;'
                + ' width:13px; height:13px; border-radius:50%; background:#0a141a; transition:left .15s"></span></span>'
                + '<span style="flex:1; min-width:0">'
                + '<span style="display:block; font-size:11.5px; font-weight:700; color:'
                + (_berryFila.ligado ? '#a7f3d0' : '#cbd5e1') + '">Repor sozinho quando acabar</span>'
                + '<span style="display:block; font-size:9.5px; color:#8fb3ab; margin-top:1px">'
                + 'estoura no pokémon ativo, só o que estiver marcado</span>'
                + '</span></div>'

                + '<div style="margin:8px 0 2px; font-size:10px; color:#8fb3ab">'
                + (prox
                    ? 'Próxima: <b style="color:#a7f3d0">' + berryEsc(prox.nome) + ' T' + prox.tier + '</b>'
                    : (_berryFila.itens.length
                        ? '<span style="color:#fbbf24">Nada em estoque do que está marcado.</span>'
                        : 'Marque abaixo os tiers que podem ser usados. A ordem é a ordem em que você marcar.'))
                + '</div>'

                + (_berryAviso
                    ? '<div style="margin:6px 0; padding:6px 8px; border-radius:8px; font-size:10px;'
                    + ' background:rgba(248,113,113,.12); border:1px solid rgba(248,113,113,.4); color:#fca5a5">'
                    + '⚠️ ' + berryEsc(_berryAviso) + '</div>'
                    : '')

                + '<div style="margin-top:10px; display:flex; align-items:center; gap:8px">'
                + '<span style="flex:1; min-width:0; font-size:10px; font-weight:700; color:#8fb3ab">'
                + 'Na mochila' + (_berryMochila.length ? ' (' + _berryMochila.length + ')' : '') + '</span>'
                + (_berryMochila.length
                    ? '<span id="idle-berry-expandir" role="button" tabindex="0"'
                    + ' title="' + (algumAberto ? 'Recolher todas' : 'Ver o efeito de todas') + '"'
                    + ' style="flex:none; cursor:pointer; user-select:none; font-size:9.5px; color:#7fd4c4;'
                    + ' border:1px solid rgba(127,212,196,.4); border-radius:7px; padding:3px 7px; white-space:nowrap">'
                    + (algumAberto ? 'recolher tudo' : 'expandir tudo') + '</span>'
                    : '')
                + '</div>'

                + '<div style="margin-top:2px">'
                + (linhas || '<div style="padding:14px 0; text-align:center; font-size:11px; color:#8fb3ab">'
                    + (_berryMochila.length ? 'Nenhum consumível com estoque.' : 'Carregando a mochila...') + '</div>')
                + '</div>'

                + '<div style="margin-top:9px; padding-top:8px; border-top:1px solid rgba(148,163,184,.13);'
                + ' display:flex; align-items:flex-start; gap:8px">'
                + '<span style="flex:1; min-width:0; font-size:9.5px; color:#7d97a0; line-height:1.4">'
                + 'A berry é gasta na hora e não volta pra mochila. A fila só dispara com o slot vazio — '
                + 'nunca por cima de uma que ainda está correndo.</span>'
                + (sugeridos.length
                    ? '<span id="idle-berry-padrao" role="button" tabindex="0"'
                    + ' title="' + berryEsc('Marca ' + sugeridos.join(', ') + ', do maior tier pro menor.') + '"'
                    + ' style="flex:none; cursor:pointer; user-select:none; font-size:9.5px; color:#7fd4c4;'
                    + ' border:1px solid rgba(127,212,196,.4); border-radius:7px; padding:3px 7px; white-space:nowrap">'
                    + 'marcar ' + berryEsc(sugeridos[0]) + (sugeridos.length > 1 ? ' +' + (sugeridos.length - 1) : '')
                    + '</span>'
                    : '')
                + '</div>'

                // Ajustes do card moram aqui, e não numa aba de configuração,
                // porque este painel é a ÚNICA superfície nossa que existe
                // dentro da página do jogo nos dois builds. O client não leva as
                // abas do Idle Suite, então um checkbox lá seria um ajuste que
                // só o dev enxerga.
                + '<div style="margin-top:9px; padding-top:8px; border-top:1px solid rgba(148,163,184,.13)">'
                + '<div style="font-size:10px; font-weight:700; color:#8fb3ab; margin-bottom:6px">Ajustes do card</div>'
                + berryLinhaAjusteHtml('idle-berry-cfg-mapa', 'Botão 🗺️ de mostrar minimapa', mapaVisivel(),
                    'O botão "Mostrar minimapa" do jogo fica cravado em cima do card. Ligado, ele volta — '
                    + 'mas ancorado logo abaixo do card, sem tapar nada. Desligado com o minimapa escondido, '
                    + 'o caminho de volta pro minimapa é ligar isto aqui de novo.')
                + berryLinhaAjusteHtml('idle-berry-cfg-eta', 'ETA do XP no card', berryEtaLinhaLigada(),
                    'O tempo e o nº de pokémons estimados pro próximo nível do pokémon e do treinador.')
                + '</div>';

            const fechar = p.querySelector('#idle-berry-fechar');
            if (fechar) fechar.onclick = berryFecharPainel;

            const cfgMapa = p.querySelector('#idle-berry-cfg-mapa');
            if (cfgMapa) cfgMapa.onclick = function () {
                mapaDefinirVisivel(!mapaVisivel());
                berryPintarPainel();
            };

            const cfgEta = p.querySelector('#idle-berry-cfg-eta');
            if (cfgEta) cfgEta.onclick = function () {
                berryEtaDefinir(!berryEtaLinhaLigada());
                berryPintarPainel();
                atualizarTiraBerry();
            };

            const padrao = p.querySelector('#idle-berry-padrao');
            if (padrao) padrao.onclick = function () {
                _berryFila.itens = [];
                _berryFila.padrao = false;
                berryAplicarPadrao();
                berryPintarPainel();
                atualizarTiraBerry();
            };

            const toggle = p.querySelector('#idle-berry-toggle');
            if (toggle) toggle.onclick = function () {
                _berryFila.ligado = !_berryFila.ligado;
                _berryAviso = '';
                berryFilaSalvar();
                berryPintarPainel();
                atualizarTiraBerry();
            };

            p.querySelectorAll('.idle-berry-chip').forEach(chip => {
                chip.onclick = function () {
                    berryFilaAlternar(chip.getAttribute('data-chave'), Number(chip.getAttribute('data-tier')) || 1);
                };
            });

            p.querySelectorAll('.idle-berry-cab').forEach(cab => {
                cab.onclick = function () {
                    const c = cab.getAttribute('data-chave');
                    if (_berryAbertos.has(c)) _berryAbertos.delete(c);
                    else _berryAbertos.add(c);
                    berryPintarPainel();
                };
            });

            const expandir = p.querySelector('#idle-berry-expandir');
            if (expandir) expandir.onclick = function () {
                // "Recolher tudo" quando QUALQUER um está aberto: com a lista
                // meio aberta, o que se quer é limpar, não abrir o resto.
                if (algumAberto) _berryAbertos.clear();
                else _berryMochila.forEach(it => _berryAbertos.add(it.chave));
                berryPintarPainel();
            };
        }

        // =====================================================================
        // A TIRA
        // =====================================================================
        // Mora DENTRO do #player-panel, logo depois da linha de ouro/diamante/
        // pontos. Recriada a cada tick se sumir — mesmo cuidado do seloCard() de
        // 28-auto-hunt-precos.js: se o jogo redesenhar o card, ela volta sozinha
        // no tick seguinte.
        function garantirTiraBerry() {
            const painel = document.getElementById('player-panel');
            if (!painel) return null;

            const existente = document.getElementById('idle-berry-tira');
            if (existente && existente.isConnected) return existente;

            const tira = document.createElement('div');
            tira.id = 'idle-berry-tira';
            tira.style.cssText = 'margin-top:8px; display:none; flex-direction:column; gap:5px;';

            const cash = painel.querySelector('.pp-cash');
            if (cash && cash.parentNode === painel) {
                painel.insertBefore(tira, cash.nextSibling);
            } else {
                // Card sem .pp-cash (versão diferente do jogo): antes do botão
                // de bônus, que é o último filho, ou no fim.
                const bonus = document.getElementById('btn-bonus');
                if (bonus && bonus.parentNode === painel) painel.insertBefore(tira, bonus);
                else painel.appendChild(tira);
            }
            return tira;
        }

        // O "+" é o mesmo em todos os estados da tira, então nasce de um lugar
        // só: muda a cor quando a fila está ligada, e é o único jeito de abrir
        // o painel.
        function berryBotaoAddHtml() {
            const on = _berryFila.ligado;
            return '<span id="idle-berry-add" role="button" tabindex="0"'
                + ' title="' + (on ? 'Fila automática ligada — clique para configurar' : 'Fila de berrys e ajustes do card') + '"'
                + ' style="flex:none; cursor:pointer; user-select:none; width:17px; height:17px;'
                + ' display:flex; align-items:center; justify-content:center; border-radius:50%;'
                + (on
                    ? ' background:rgba(52,211,153,.22); border:1px solid #34d399; color:#a7f3d0;'
                    : ' background:rgba(148,163,184,.12); border:1px solid rgba(148,163,184,.38); color:#94a3b8;')
                // "+" como TEXTO nunca fica no centro: a fonte reserva espaço
                // abaixo da linha de base pros descendentes (p, g, y), e o
                // glifo sobe. Dava pra empurrar com padding, mas o valor certo
                // muda com a fonte do sistema. Desenhado, o cruzamento cai no
                // centro geométrico do círculo e fica igual em toda máquina.
                + '"><svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"'
                + ' style="display:block; overflow:visible">'
                + '<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
                + '</svg></span>';
        }

        function berryEtaSubLinhaHtml(id, emoji, cor) {
            return '<div style="display:flex; align-items:center; gap:6px">'
                + '<span style="flex:none; font-size:10px; line-height:1">' + emoji + '</span>'
                + '<span id="' + id + '-alvo" style="flex:1; min-width:0; font-size:9.5px; color:#8fb3ab;'
                + ' overflow:hidden; text-overflow:ellipsis; white-space:nowrap"></span>'
                + '<span id="' + id + '-t" style="flex:none; font-size:10.5px; font-weight:700; color:' + cor + ';'
                + ' font-variant-numeric:tabular-nums; white-space:nowrap"></span>'
                + '<span id="' + id + '-k" style="flex:none; font-size:9px; color:#7d97a0;'
                + ' font-variant-numeric:tabular-nums; white-space:nowrap; min-width:34px; text-align:right"></span>'
                + '</div>';
        }

        function berryEtaLinhaHtml() {
            return '<div style="border:1px solid rgba(148,163,184,.22); background:rgba(148,163,184,.06);'
                + ' border-radius:9px; padding:5px 8px 6px; display:flex; flex-direction:column; gap:3px">'
                + berryEtaSubLinhaHtml('idle-eta-l-poke', '🐾', '#4ade80')
                + berryEtaSubLinhaHtml('idle-eta-l-jog', '🧑', '#fbbf24')
                + '</div>';
        }

        function berryPintarEtaLinha() {
            const s = window.__idleSuiteXpStatus;
            if (!s) return;

            function preencher(id, dado, rotuloNivel) {
                if (!dado) return;
                const elAlvo = document.getElementById(id + '-alvo');
                const elT = document.getElementById(id + '-t');
                const elK = document.getElementById(id + '-k');
                if (!elAlvo || !elT || !elK) return;

                const lv = Number(dado.level);
                const alvo = dado.xpCap
                    ? (dado.name || '')
                    : ((dado.name ? dado.name + ' · ' : '') + rotuloNivel + (Number.isFinite(lv) ? (lv + 1) : '--'));
                if (elAlvo.textContent !== alvo) elAlvo.textContent = alvo;
                elAlvo.title = dado.xpCap
                    ? (dado.name || '') + ' está no nível máximo'
                    : 'Falta ' + (dado.falta || '—') + ' para ' + rotuloNivel + (Number.isFinite(lv) ? (lv + 1) : '--');

                let tempo, kills = '';
                if (dado.xpCap) {
                    tempo = '⭐ MAX';
                } else if (dado.pausado) {
                    tempo = '⏸️';
                } else {
                    tempo = berryFmtEta(Number(dado.segs));
                    if (tempo === '—') tempo = 'calculando';
                    const k = berryKillsDeFalta(dado.falta);
                    if (k) kills = '≈' + k;
                }
                if (elT.textContent !== tempo) elT.textContent = tempo;
                if (elK.textContent !== kills) elK.textContent = kills;
            }

            preencher('idle-eta-l-poke', s.poke, 'Lv.');
            preencher('idle-eta-l-jog', s.jog, 'Nv.');
        }

        function berryLinhaHtml(id) {
            return ''
                + '<div id="' + id + '" style="border:1px solid rgba(63,127,110,.85); background:rgba(111,227,216,.09);'
                + ' border-radius:9px; padding:6px 8px 7px">'
                + '<div style="display:flex; align-items:center; gap:6px">'
                + '<span id="' + id + '-ic" style="flex:none; width:16px; height:16px; display:flex; align-items:center;'
                + ' justify-content:center; font-size:14px; line-height:1">🍓</span>'
                + '<span id="' + id + '-nome" style="flex:1; min-width:0; font-size:11px; font-weight:700; color:#cdeee6;'
                + ' overflow:hidden; text-overflow:ellipsis; white-space:nowrap"></span>'
                + '<span id="' + id + '-tempo" style="flex:none; font-size:10px; font-weight:700; color:#7fd4c4;'
                + ' font-variant-numeric:tabular-nums; white-space:nowrap"></span>'
                + '</div>'
                + '<div style="margin-top:5px; height:5px; border-radius:3px; background:#16232a; overflow:hidden">'
                + '<div id="' + id + '-barra" style="height:100%; width:0%; border-radius:3px;'
                + ' background:linear-gradient(90deg,#34d399,#22d3ee); transition:width .6s linear"></div>'
                + '</div>'
                + '<div style="display:flex; align-items:center; gap:6px; margin-top:4px">'
                + '<span id="' + id + '-desc" style="flex:1; min-width:0; font-size:9.5px; color:#8fb3ab;'
                + ' line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap"></span>'
                + '<span id="' + id + '-add"></span>'
                + '</div>'
                + '</div>';
        }

        // Sem berry rodando a tira não some: vira uma linha tracejada, que é ao
        // mesmo tempo o estado vazio e a porta da fila. Uma linha de 26px é bem
        // menos poluição do que um botão solto flutuando no card, e é o mesmo
        // desenho que o modal do jogo usa pro slot vazio.
        function berryLinhaVaziaHtml() {
            const prox = _berryFila.ligado ? berryProximaDaFila() : null;
            const txt = _berryFila.ligado
                ? (prox ? 'auto: ' + prox.nome + ' T' + prox.tier : 'auto: sem estoque na fila')
                : 'sem berry ativa';
            const cor = _berryFila.ligado ? (prox ? '#7fd4c4' : '#fbbf24') : '#7d97a0';
            return '<div style="display:flex; align-items:center; gap:6px; padding:4px 8px;'
                + ' border:1px dashed rgba(148,163,184,.28); border-radius:9px">'
                + '<span style="flex:none; font-size:12px; line-height:1; opacity:.75">🍓</span>'
                + '<span style="flex:1; min-width:0; font-size:9.5px; color:' + cor + ';'
                + ' overflow:hidden; text-overflow:ellipsis; white-space:nowrap">' + berryEsc(txt) + '</span>'
                + berryBotaoAddHtml()
                + '</div>';
        }

        // Sprite real do item, o MESMO caminho que a mochila e o modal de item
        // segurado usam (sprites/item_<cid>.png) — arte nova aparece aqui sem
        // uma segunda lista pra manter. Sem cid (nunca sincronizou), fica o 🍓.
        function berryPintarIcone(el, icone) {
            if (!el) return;
            const cid = Number(icone) || 0;
            if (!cid) {
                if (el.getAttribute('data-cid') !== '0') {
                    el.setAttribute('data-cid', '0');
                    el.textContent = '🍓';
                }
                return;
            }
            if (el.getAttribute('data-cid') === String(cid)) return;
            el.setAttribute('data-cid', String(cid));
            el.textContent = '';
            const img = document.createElement('img');
            img.src = 'sprites/item_' + cid + '.png';
            img.width = 16;
            img.height = 16;
            img.style.cssText = 'width:16px; height:16px; image-rendering:pixelated; display:block';
            img.onerror = function () { el.setAttribute('data-cid', '0'); el.textContent = '🍓'; };
            el.appendChild(img);
        }

        function berryLigarBotaoAdd() {
            const b = document.getElementById('idle-berry-add');
            if (!b || b.getAttribute('data-lig') === '1') return;
            b.setAttribute('data-lig', '1');
            b.onclick = function (ev) { ev.stopPropagation(); berryAbrirPainel(); };
        }

        function atualizarTiraBerry() {
            const tira = garantirTiraBerry();
            if (!tira) return;

            // `idleSuiteBerryNoCard='0'` desliga a tira inteira — inclusive a
            // linha de ETA, que mora dentro dela. É o interruptor geral, e quem
            // o usa quer o card oficial sem nada nosso.
            if (!berryLigada()) {
                tira.style.display = 'none';
                tira.innerHTML = '';
                tira.removeAttribute('data-chaves');
                berryFecharPainel();
                return;
            }

            const berrys = berryAtivasDoState();
            const agora = Date.now();

            // Conjunto mudou (berry nova, berry que acabou, troca de time) ou o
            // prazo de segurança venceu: é a única hora em que se fala com a rede.
            // Com a fila ligada a sincronia periódica continua valendo mesmo sem
            // berry nenhuma — é dela que sai o estoque que o motor consulta.
            const assinatura = berrys.map(b => b.chave).join(',');
            if (assinatura !== _berryChavesVistas
                || ((berrys.length || _berryFila.ligado) && agora >= _berryProximaSync)) {
                _berryChavesVistas = assinatura;
                berrySincronizarPrazos();
            }

            tira.style.display = 'flex';

            // Só reconstrói o HTML quando a lista de berrys muda; o tick normal
            // mexe em textContent e width, que não custam layout do card inteiro.
            const comEta = berryEtaLinhaLigada();
            const marca = assinatura + '#' + (_berryFila.ligado ? '1' : '0') + (comEta ? 'e' : '');
            if (tira.getAttribute('data-chaves') !== marca) {
                tira.setAttribute('data-chaves', marca);
                tira.innerHTML = (comEta ? berryEtaLinhaHtml() : '')
                    + (berrys.length
                        ? berrys.map((b, i) => berryLinhaHtml('idle-berry-l' + i)).join('')
                        : berryLinhaVaziaHtml());
                // O "+" acompanha a última berry da lista, pra não repetir seis vezes.
                if (berrys.length) {
                    const slot = document.getElementById('idle-berry-l' + (berrys.length - 1) + '-add');
                    if (slot) slot.innerHTML = berryBotaoAddHtml();
                }
                berryLigarBotaoAdd();
            }

            berrys.forEach((b, i) => {
                const id = 'idle-berry-l' + i;
                const linha = document.getElementById(id);
                if (!linha) return;
                const ancora = _berryPrazos.get(b.chave) || null;

                // Ancorado: milissegundo a milissegundo. Sem âncora (primeira
                // volta, ou /api/helds fora do ar): o minuto cheio do state, e
                // aí a barra não tem denominador — some em vez de mentir.
                const restaMs = ancora ? Math.max(0, ancora.fim - agora) : (b.min * 60000);
                const totalMs = ancora ? ancora.totalMs : 0;

                const elIc = document.getElementById(id + '-ic');
                const elNome = document.getElementById(id + '-nome');
                const elTempo = document.getElementById(id + '-tempo');
                const elBarra = document.getElementById(id + '-barra');
                const elDesc = document.getElementById(id + '-desc');

                berryPintarIcone(elIc, ancora && ancora.icone);

                const nome = b.nome + (b.tier ? ' T' + b.tier : '');
                if (elNome && elNome.textContent !== nome) elNome.textContent = nome;

                const tempo = restaMs > 0
                    ? berryFmtTempo(restaMs)
                    : (ancora ? 'acabou' : '≈ ' + b.min + 'min');
                if (elTempo) {
                    if (elTempo.textContent !== tempo) elTempo.textContent = tempo;
                    // Últimos 5 min em âmbar: a berry vai vencer e ainda dá
                    // tempo de decidir se vale usar outra.
                    elTempo.style.color = (restaMs > 0 && restaMs <= 300000) ? '#fbbf24' : '#7fd4c4';
                }

                if (elBarra) {
                    if (totalMs > 0) {
                        const pct = Math.max(0, Math.min(100, restaMs / totalMs * 100));
                        elBarra.parentNode.style.display = '';
                        elBarra.style.width = pct + '%';
                        elBarra.style.background = (restaMs <= 300000)
                            ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                            : 'linear-gradient(90deg,#34d399,#22d3ee)';
                    } else {
                        elBarra.parentNode.style.display = 'none';
                    }
                }

                // O efeito da berry é o que interessa; de quem ela é só importa
                // quando NÃO é do pokémon que está caçando.
                const efeito = (ancora && ancora.desc) || b.txt || '';
                const dono = b.ativo ? '' : (b.pokeNome ? ' · ' + b.pokeNome : '');
                const desc = (efeito + dono).trim();
                if (elDesc && elDesc.textContent !== desc) elDesc.textContent = desc;
                if (linha.title !== (desc || nome)) linha.title = (desc || nome);
                linha.style.opacity = b.ativo ? '1' : '.78';
            });

            berryLigarBotaoAdd();
            if (comEta) berryPintarEtaLinha();
            if (_berryPainel) berryPosicionarPainel();
            berryMotorFila();
        }

        berryFilaCarregar();
        berryEtaMigrar();
        atualizarTiraBerry();
        setInterval(atualizarTiraBerry, 1000);
