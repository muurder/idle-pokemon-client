// ==UserScript==
// @name         IdlePokemon - Bug Test Suite v2 (auto)
// @namespace    http://idlepokemoon.local
// @version      1.0
// @description  Injeta o Bug Test Suite v2 automaticamente no IdlePokemon
// @match        https://idlepokemoon.com.br/play
// @match        https://idlepokemoon.com.br/*
// @match        http://localhost:3000/*
// @grant        none
// @run-at       document-idle
// @inject-into  page
// @sandbox      raw
// @noframes
// ==/UserScript==

// =====================================================================
// ⚠️  PARA IA / DESENVOLVEDOR:
// =====================================================================
// ESTE ARQUIVO É GERADO POR build.py — NÃO EDITE DIRETAMENTE!
//
// FLUXO CORRETO:
//   1. Edite arquivos em scripts/*.js
//   2. Rode: python scripts/build.py
//   3. Reinicie o Electron
//
// DOCUMENTAÇÃO:
//   - scripts/MAPA.md     → O que cada arquivo faz
//   - CONTRIBUINDO.md     → Regras completas de edição
//
// NUNCA edite scripts/dist/game-injector.js diretamente!
// =====================================================================

(function () {
    'use strict';

    console.log('%c[BUG SUITE] Tampermonkey script carregado', 'color:#facc15;font-weight:bold');

    // Evita injetar duas vezes (reloads agendados pelo próprio script)
    if (window.__bugSuiteCarregado) return;
    window.__bugSuiteCarregado = true;

    window.__bugSuiteBuild = '2026-09-03 14:48:54';
        // =====================================================================
        // 09b-doca.js — DOCAS: cards soltos acoplados às bordas do painel
        // =====================================================================
        // Uma "doca" é um card que vive no `body`, fora do painel, e se ancora a
        // uma das bordas dele. Nasceu do Ginásio: a lista de líderes e o
        // assistente precisavam de altura própria sem disputar espaço com a
        // arena e o log — foi justamente esse aperto que causou o bug do Log
        // empurrando a altura do painel.
        //
        // Este arquivo existe porque eu escrevi o mesmo código de arrastar,
        // ancorar e fechar DUAS vezes (líderes e assistente) antes de perceber
        // que é um só. Toda doca nova deve sair daqui em vez de copiar.
        //
        // Uso:
        //   const d = docaCriar({
        //     id: 'doca-lideres', titulo: '🏟️ Líderes', lado: 'esquerda',
        //     largura: 290, tom: 'roxo',
        //     acoes: [{ icone: '↻', titulo: 'Atualizar', ao: () => recarregar() }]
        //   });
        //   d.corpo.appendChild(algo);      // conteúdo
        //   d.rodape.textContent = '...';   // linha de status
        //   d.mostrar(true);                // abre (respeita o ✕ do dono)
        //
        // Regras de convivência que já custaram bug:
        //   • lado 'esquerda' e 'direita' nunca se invadem — sem espaço, a doca
        //     encosta na borda da janela em vez de pular pro outro lado.
        //   • a altura acompanha a do painel, senão as três peças ficam
        //     desalinhadas na base.
        //   • depois de arrastada, a doca para de seguir o painel: a posição
        //     passou a ser escolha do dono.
        // =====================================================================

        const DOCA_FOLGA = 10;      // respiro entre a doca e o painel
        const DOCA_MARGEM = 8;      // respiro mínimo da borda da janela
        const DOCA_ARRASTO_MIN = 4; // px antes de virar arrasto (abaixo é clique)
        const _docas = [];

        function docaCss() {
            if (document.getElementById('doca-css')) return;
            const st = document.createElement('style');
            st.id = 'doca-css';
            st.textContent = `
                .doca {
                    position: fixed; z-index: 2147483000;
                    display: none; flex-direction: column; overflow: hidden;
                    background: linear-gradient(160deg, #16132a, #0e0c1c);
                    border: 1px solid rgba(148,163,184,.28); border-radius: 14px;
                    box-shadow: 0 18px 48px rgba(0,0,0,.55);
                    font-family: 'Segoe UI', system-ui, sans-serif; color: #e2e8f0;
                }
                .doca.on { display: flex; }
                .doca-head {
                    display:flex; align-items:center; gap:8px; padding:10px 12px; cursor:move;
                    border-bottom:1px solid rgba(148,163,184,.16); background:rgba(56,189,248,.08);
                    flex:none;
                }
                .doca.tom-roxo .doca-head { background:rgba(168,85,247,.10); }
                .doca-tit { font-size:11.5px; font-weight:800; color:#bae6fd; flex:1; }
                .doca.tom-roxo .doca-tit { color:#e9d5ff; }
                .doca-bt {
                    background:rgba(148,163,184,.12); border:1px solid rgba(148,163,184,.25); color:#cbd5e1;
                    border-radius:7px; font-size:10px; padding:4px 8px; cursor:pointer;
                    font-family:inherit; font-weight:700; flex:none;
                }
                .doca-bt:hover { background:rgba(148,163,184,.22); }
                .doca-corpo { flex:1; min-height:0; overflow-y:auto; padding:10px 12px; }
                .doca-rodape {
                    flex:none; padding:7px 12px; border-top:1px solid rgba(148,163,184,.14);
                    font-size:9.5px; color:#94a3b8; font-style:italic;
                }
                .doca-rodape:empty { display:none; }

                /* Recolhida: vira um trilho fino, clicavel, ainda ancorado com o
                   mesmo respiro do painel. Nunca encosta na borda da janela. */
                .doca.recolhida { width:34px !important; cursor:pointer; }
                .doca.recolhida .doca-corpo,
                .doca.recolhida .doca-rodape { display:none; }
                .doca.recolhida .doca-head {
                    flex:1; flex-direction:column; justify-content:flex-start; gap:10px;
                    padding:10px 4px; border-bottom:none; cursor:pointer;
                }
                .doca.recolhida .doca-tit {
                    writing-mode:vertical-rl; text-orientation:mixed;
                    flex:none; white-space:nowrap; letter-spacing:.5px;
                }
                /* Recolhida so mostra o botao de expandir: os outros nao teriam
                   onde agir sem o corpo visivel. */
                .doca.recolhida .doca-bt { display:none; }
                .doca.recolhida .doca-bt.doca-recolher { display:block; padding:4px 5px; }
                .doca-bt.doca-recolher { font-size:11px; }
            `;
            document.head.appendChild(st);
        }

        function docaAncorar(d) {
            if (!d || !d.el || d.el.dataset.movido === '1') return;
            const p = document.getElementById(d.ancora);
            const r = p ? p.getBoundingClientRect() : null;
            // ANCORA AUSENTE OU FECHADA. Antes era `return` seco: a doca ficava
            // sem `left`/`top` nenhum e o navegador a jogava no canto superior
            // esquerdo, por cima do jogo — foi assim que a Doca de Hunts
            // "sumiu" pro usuario (o modal do jogo estava fechado na hora em
            // que ela abriu). Agora ela encosta na borda da janela do lado dela,
            // que e um lugar previsivel em vez de nenhum lugar.
            if (!r || !r.width) {
                const larg0 = d.el.offsetWidth || d.largura;
                d.el.style.left = (d.lado === 'esquerda'
                    ? DOCA_MARGEM
                    : Math.max(DOCA_MARGEM, window.innerWidth - larg0 - DOCA_MARGEM)) + 'px';
                d.el.style.top = DOCA_MARGEM + 'px';
                const alt0 = window.innerHeight - 2 * DOCA_MARGEM;
                if (alt0 > 120) d.el.style.height = Math.round(alt0) + 'px';
                return;
            }
            // Largura EFETIVA: recolhida sao 34px, e o respiro tem que valer
            // igual pros dois estados.
            const larg = d.el.offsetWidth || d.largura;
            // `deslocamento` = quanto afastar ALÉM da folga normal. Serve pra
            // pôr DUAS docas do mesmo lado, lado a lado: a segunda pede o
            // deslocamento da largura da primeira. Sem isto elas nascem
            // empilhadas no mesmo x. Zero por padrão — as docas antigas não
            // mudam de lugar.
            const desl = d.deslocamento || 0;
            // Nunca pula pro outro lado: lá pode morar outra doca.
            const x = d.lado === 'esquerda'
                ? Math.max(DOCA_MARGEM, r.left - larg - DOCA_FOLGA - desl)
                : (r.right + DOCA_FOLGA + desl + larg <= window.innerWidth
                    ? r.right + DOCA_FOLGA + desl
                    : Math.max(DOCA_MARGEM, window.innerWidth - larg - DOCA_MARGEM));
            d.el.style.left = Math.round(x) + 'px';
            d.el.style.top = Math.round(Math.max(DOCA_MARGEM, r.top)) + 'px';
            // Acompanha a altura do painel: sem isto as peças ficam com bases
            // desalinhadas e a doca parece cortada no meio da tela.
            const alt = Math.min(r.height, window.innerHeight - 2 * DOCA_MARGEM);
            if (alt > 120) d.el.style.height = Math.round(alt) + 'px';
        }

        function docaAncorarTodas() { for (const d of _docas) if (d.el.classList.contains('on')) docaAncorar(d); }
        // Some com todas: o painel principal fechou e as docas vivem no body,
        // entao ficariam orfas flutuando na tela.
        // Some com as docas DO PAINEL quando ele fecha — elas vivem no body e
        // ficariam orfas flutuando. Uma doca marcada `independente` e ignorada:
        // ela se ancora numa tela do JOGO (o modal de Hunts, por exemplo) e nao
        // tem por que sumir junto do painel do Idle Suite. Era isto que fazia a
        // Doca de Hunts desaparecer ao fechar o painel v2.
        function docaEsconderTodas() {
            for (const d of _docas) if (!d.independente) d.el.classList.remove('on');
        }

        function docaCriar(cfg) {
            docaCss();
            const id = cfg.id;
            const existente = _docas.find(d => d.id === id);
            if (existente && existente.el.isConnected) return existente;

            const el = document.createElement('div');
            el.id = id;
            el.className = 'doca' + (cfg.tom ? ' tom-' + cfg.tom : '');
            el.style.width = (cfg.largura || 320) + 'px';

            const head = document.createElement('div');
            head.className = 'doca-head';
            const tit = document.createElement('span');
            tit.className = 'doca-tit';
            tit.textContent = cfg.titulo || '';
            head.appendChild(tit);
            for (const a of (cfg.acoes || [])) {
                const b = document.createElement('button');
                b.className = 'doca-bt';
                b.textContent = a.icone;
                if (a.titulo) b.title = a.titulo;
                b.onclick = ev => { ev.stopPropagation(); try { a.ao(); } catch (e) { console.error('[doca]', id, e); } };
                head.appendChild(b);
            }
            // Recolher, nao fechar: fechar deixava a doca inalcancavel, porque
            // nao havia nada na tela pra traze-la de volta.
            const recolher = document.createElement('button');
            recolher.className = 'doca-bt doca-recolher';
            head.appendChild(recolher);

            const corpo = document.createElement('div');
            corpo.className = 'doca-corpo';
            const rodape = document.createElement('div');
            rodape.className = 'doca-rodape';

            el.appendChild(head); el.appendChild(corpo); el.appendChild(rodape);
            document.body.appendChild(el);

            const d = {
                id, el, corpo, rodape, titulo: tit,
                lado: cfg.lado === 'esquerda' ? 'esquerda' : 'direita',
                largura: cfg.largura || 320,
                // Afastamento extra no mesmo lado — ver docaAncorar.
                deslocamento: cfg.deslocamento || 0,
                ancora: cfg.ancora || 'painel-speed-bench-v2',
                independente: !!cfg.independente,
                // `mostrar` controla apenas a presenca na tela (a aba esta
                // aberta ou nao). O estado recolhido e independente e persiste.
                mostrar(ligar, expandir) {
                    if (!ligar) { el.classList.remove('on'); return; }
                    if (expandir) d.recolher(false);
                    el.classList.add('on');
                    docaAncorar(d);
                },
                recolher(sim) {
                    const rec = sim == null ? !el.classList.contains('recolhida') : !!sim;
                    el.classList.toggle('recolhida', rec);
                    el.style.width = (rec ? 34 : d.largura) + 'px';
                    recolher.textContent = rec ? (d.lado === 'esquerda' ? '»' : '«') : (d.lado === 'esquerda' ? '«' : '»');
                    recolher.title = rec ? 'Expandir' : 'Recolher';
                    try { localStorage.setItem('bugSuiteDoca:' + id, rec ? '1' : '0'); } catch (e) { }
                    docaAncorar(d);
                },
                aberta() { return el.classList.contains('on'); },
                estaRecolhida() { return el.classList.contains('recolhida'); }
            };

            recolher.onclick = ev => { ev.stopPropagation(); d.recolher(); };
            // Saida de emergencia: arrastou pra um canto ruim, dois cliques no
            // cabecalho e a doca volta a acompanhar o painel.
            head.addEventListener('dblclick', ev => {
                if (ev.target.closest('button')) return;
                delete el.dataset.movido;
                docaAncorar(d);
            });
            // Recolhida, o card inteiro vira alvo de clique: um trilho de 34px
            // e area pequena demais pra exigir mira no botao.
            el.addEventListener('click', ev => {
                if (!el.classList.contains('recolhida')) return;
                if (ev.target.closest('.doca-bt')) return;
                d.recolher(false);
            });
            // Estado recolhido sobrevive ao reload — e preferencia, nao acidente.
            let rec0 = false;
            try { rec0 = localStorage.getItem('bugSuiteDoca:' + id) === '1'; } catch (e) { }
            d.recolher(rec0);

            head.addEventListener('pointerdown', ev => {
                if (ev.target.closest('button')) return;
                ev.preventDefault();
                const x0 = ev.clientX, y0 = ev.clientY, l0 = el.offsetLeft, t0 = el.offsetTop;
                let arrastou = false;
                const mover = e => {
                    const dx = e.clientX - x0, dy = e.clientY - y0;
                    // Sem limiar, o tremor de um clique comum ja marcava
                    // `movido` e a doca parava de seguir o painel — foi assim
                    // que ela apareceu no meio da tela.
                    if (!arrastou && Math.abs(dx) < DOCA_ARRASTO_MIN && Math.abs(dy) < DOCA_ARRASTO_MIN) return;
                    arrastou = true;
                    el.style.left = Math.max(0, Math.min(window.innerWidth - 60, l0 + dx)) + 'px';
                    el.style.top = Math.max(0, Math.min(window.innerHeight - 40, t0 + dy)) + 'px';
                    el.dataset.movido = '1';
                };
                const soltar = () => {
                    head.removeEventListener('pointermove', mover);
                    head.removeEventListener('pointerup', soltar);
                };
                head.addEventListener('pointermove', mover);
                head.addEventListener('pointerup', soltar);
                try { head.setPointerCapture(ev.pointerId); } catch (e) { }
            });

            _docas.push(d);
            return d;
        }

        window.addEventListener('resize', docaAncorarTodas);
        // O painel é arrastável e redimensionável: sem reancorar por tempo, as
        // docas ficariam pra trás. 400ms é o mesmo ritmo do espelho do painel.
        setInterval(docaAncorarTodas, 400);

        // =====================================================================
        // 09c-espaco-modal.js — ABRIR ESPAÇO AO LADO DO MODAL DO JOGO
        // =====================================================================
        // As docas viviam disputando a tela com o painel do jogo. O Time & Box é
        // o pior caso: o `openTeamBox` liga a classe `modal-xl`, que é
        // `min(1440px, 98vw)` (style.css:5773) — ele come a tela inteira e sobra
        // uma fresta pras docas.
        //
        // Em vez de espremer as docas, este módulo EMPURRA o painel do jogo:
        // reserva uma faixa à direita e o modal se acomoda no que sobrou.
        //
        // ── Como, sem brigar com o CSS do jogo ──
        // `#modal-bg` é `position:fixed; inset:0` com flex centralizando o
        // `#modal` (style.css:4013). Um `padding-right` nele encolhe a caixa
        // onde a centralização acontece: o modal continua centralizado, só que
        // na faixa que sobrou — ou seja, ele anda pra esquerda sozinho, sem
        // ninguém calcular posição.
        //
        // O `modal-xl` precisa de teto próprio: `98vw` ignoraria o padding e
        // vazaria por baixo das docas.
        //
        // ── Por que é reversível, e tem que ser ──
        // Isto mexe no painel DO JOGO. Fechada a doca, o espaço é devolvido na
        // hora: deixar o modal encolhido depois que a doca sumiu seria um bug
        // silencioso que ninguém ligaria à gente.
        // =====================================================================

        // ⚠️ RESERVA COM DONO.
        // A 1a versao guardava um numero so. Com duas docas (Inventario e Time &
        // Box) isso vira briga: clicar no pokemon ativo DENTRO da mochila fecha
        // a bag e abre o Time & Box, e por um instante as duas estao vivas — uma
        // pedindo 750px e a outra devolvendo 0. O painel do jogo ficava pulando
        // e a doca "quebrava".
        //
        // Agora cada doca reserva com a SUA chave e o modulo aplica o maior
        // pedido vivo. Quem fecha zera so a propria chave.
        const _espacoPorDono = {};
        let _espacoModalAtual = -1;

        function espacoModalCss() {
            if (document.getElementById('espaco-modal-css')) return;
            const st = document.createElement('style');
            st.id = 'espaco-modal-css';
            st.textContent = `
                html.doca-espaco #modal-bg {
                    justify-content: center;
                    padding-right: var(--doca-reserva, 0px);
                    box-sizing: border-box;
                }
                /* O modal-xl do Time & Box e 98vw: sem este teto ele passaria
                   por baixo das docas em vez de encolher. */
                html.doca-espaco #modal.modal-xl {
                    width: min(1440px, calc(98vw - var(--doca-reserva, 0px)));
                }
                /* Transicao curta: o painel andando de repente parece defeito. */
                #modal-bg { transition: padding-right .18s ease; }
                /* Enquanto um popup do jogo esta aberto, a doca desce pra
                   debaixo dele. O important e necessario porque a regra de
                   z-index da doca generica tambem vence por especificidade. */
                .doca.doca-atras-do-jogo { z-index: 120 !important; }
            `;
            document.head.appendChild(st);
        }

        // dono = quem está pedindo (id da doca). px = quanto reservar à
        // direita; 0 devolve o espaço daquele dono.
        function reservarEspacoModal(dono, px) {
            _espacoPorDono[dono] = Math.max(0, Math.round(px || 0));
            let v = 0;
            for (const k in _espacoPorDono) if (_espacoPorDono[k] > v) v = _espacoPorDono[k];
            if (v === _espacoModalAtual) return;
            _espacoModalAtual = v;
            espacoModalCss();
            const raiz = document.documentElement;
            if (!v) { raiz.classList.remove('doca-espaco'); raiz.style.removeProperty('--doca-reserva'); return; }
            raiz.style.setProperty('--doca-reserva', v + 'px');
            raiz.classList.add('doca-espaco');
        }

        function liberarEspacoModal(dono) { reservarEspacoModal(dono, 0); }

        // Quanto dá pra pedir sem espremer o painel do jogo. O Time & Box tem
        // duas colunas e um piso real de utilidade; abaixo disso é melhor a doca
        // ceder do que a tela do jogo virar um corredor.
        const ESPACO_MODAL_MIN_JOGO = 900;

        // ── MEDIÇÃO DO TEMPO DE CARGA ──────────────────────────────────────
        // "As docas demoram a aparecer depois de reiniciar o Electron" é uma
        // queixa real, mas com três suspeitos possíveis e nenhum medido:
        //   1. o shell só injeta o bundle DEPOIS de detectar o login;
        //   2. o bundle é grande e o parse custa;
        //   3. a doca só nasce/desenha na primeira abertura.
        // O (3) já foi atacado com o pré-aquecimento. Isto aqui mede os três,
        // pra a próxima correção sair de número e não de palpite — que é como
        // este projeto trabalha (ver `ahLogMudou` no 29b).
        //
        // `performance.now()` conta desde a NAVEGAÇÃO da página, não desde o
        // nosso script: é o único relógio que enxerga o tempo que passou antes
        // de a gente existir.
        function docaAgoraMs() {
            try { return Math.round(performance.now()); } catch (e) { return -1; }
        }

        // Marcado uma vez, no primeiro arquivo nosso que roda.
        const DOCA_T_BUNDLE = docaAgoraMs();

        function docaMedir(evento, extra) {
            try {
                if (typeof ahLog !== 'function') return;
                ahLog(evento, Object.assign({
                    msDesdeNavegacao: docaAgoraMs(),
                    msDesdeBundle: docaAgoraMs() - DOCA_T_BUNDLE,
                    build: window.__bugSuiteBuild || '?'
                }, extra || {}));
            } catch (e) { }
        }

        // Cronômetro de um trecho: devolve a função que fecha a conta.
        function docaCronometro(evento, extra) {
            const t0 = docaAgoraMs();
            return (extraFim) => docaMedir(evento, Object.assign({ durouMs: docaAgoraMs() - t0 }, extra, extraFim));
        }

        // ── CEDER A VEZ PROS POPUPS DO JOGO ────────────────────────────────
        // A doca generica vive em z-index 2147483000, acima de tudo. Isso virou
        // bug: clicar num held abre o seletor do jogo (helds.js, `.hd-ov`,
        // z-index 9600) e a nossa doca ficava POR CIMA dele.
        //
        // A 1a correcao foi baixar a doca pra 9500 de vez — e ai ela deixou de
        // ficar acima do resto do jogo o tempo todo, que era o comportamento
        // certo em 99% dos casos. Trocar um problema por outro.
        //
        // Isto aqui e o meio-termo: a doca fica no topo SEMPRE, e so desce
        // enquanto um overlay do jogo esta de fato na tela. Fechou o overlay,
        // ela volta. Nenhuma decisao permanente por causa de um caso pontual.
        const SELETORES_OVERLAY_JOGO = '.hd-ov, .hb-bg, .hb-sub-bg';

        function jogoTemOverlayAberto() {
            try { return !!document.querySelector(SELETORES_OVERLAY_JOGO); }
            catch (e) { return false; }
        }

        // Chamado no tick de cada doca.
        function docaCederAoJogo(el) {
            if (!el) return;
            el.classList.toggle('doca-atras-do-jogo', jogoTemOverlayAberto());
        }

        function espacoDisponivelParaDocas() {
            return Math.max(0, window.innerWidth - ESPACO_MODAL_MIN_JOGO);
        }

        // =====================================================================
        // 14b-catalogo-itens.js — CATÁLOGO DE ITENS DA MOCHILA
        // =====================================================================
        // Diz, para cada linha da mochila, EM QUE GAVETA ela cai e O QUE ELA FAZ.
        // Sem DOM e sem globais: `montarLinhasMochila(estado, meta)` recebe o
        // state e o /api/meta e devolve as linhas prontas. É a peça que a doca
        // do Inventário (35) desenha, e é testável fora do navegador
        // (testes/verifica_itens_catalogo.js).
        //
        // ── Por que existe ──
        // Hoje a descrição de um item só aparece no `title` do slot: é preciso
        // passar o mouse item a item pra saber o que cada coisa faz. Todo o
        // texto necessário já vem do servidor — só não está em lugar nenhum da
        // tela ao mesmo tempo.
        //
        // ── A REGRA DE CASAMENTO (não mexa sem ler) ──
        // Os nomes carregam \n LITERAL: "ancient\nstone", "chave\nde boss",
        // "Focus\nPunch" (18 nomes e 12 labels de held). O jogo casa
        // `bag[].name` com o meta por igualdade EXATA, \n incluso (ver openBag
        // no game.js). Então nós casamos igual, e normalizamos SÓ pra exibir.
        // Trocar por um casamento normalizado faria a nossa gaveta divergir da
        // do jogo justo nos itens de nome quebrado.
        //
        // E os conjuntos do meta não são consistentes ENTRE SI: `bossItems` tem
        // "chave\nde boss" e `tradeItems` tem "chave de boss" pro mesmo item.
        // Por isso o índice guarda as duas chaves e o exato tem prioridade.
        //
        // ── ORDEM DAS GAVETAS ──
        // É a mesma do openBag (stones, tms, boss, held, resto), de propósito:
        // um item que aqui aparece numa gaveta e lá em outra faria o jogador
        // duvidar das duas telas.
        //
        // ── O QUE O SERVIDOR DÁ, E O QUE NÃO DÁ ──
        // Conferido no /api/meta:
        //   heldItems (235, berries incluídas) → `desc` PRONTO + `funcao`.
        //   tms (72)      → move/type/tier/kind. A ficha de verdade (poder,
        //                   precisão, PP, efeito) NÃO está aqui: vem de
        //                   /api/gym/tm/catalogo, que a doca busca à parte.
        //   balls (7)     → `desc` vazio em 6 de 7. Composta dos campos.
        //   potions (6)   → sem `desc`. Composta de heal/revive/gold.
        //   stones (17)   → só name/gold/itemId. SEM descrição.
        //   bossItems(22) → só name/cid. SEM descrição.
        // Nas duas últimas eu escrevo apenas o que o dado sustenta. Um
        // dicionário nosso de 39 frases seria uma segunda lista livre pra
        // divergir do servidor na primeira leva nova de item — o mesmo motivo
        // que o próprio game.js dá pra não cravar as listas no client.
        // =====================================================================

        // Ordem de exibição das gavetas. `chave` é o que a doca usa pra agrupar.
        const ITEM_GAVETAS = [
            { chave: 'ball',   titulo: '🎯 Pokébolas' },
            { chave: 'potion', titulo: '🧪 Poções' },
            { chave: 'held',   titulo: '🧤 Itens segurados' },
            { chave: 'tm',     titulo: '💿 TMs & HMs' },
            { chave: 'stone',  titulo: '🪨 Pedras de evolução' },
            { chave: 'boss',   titulo: '🏆 Itens de boss' },
            { chave: 'loot',   titulo: '🎒 Loot (venda no Mark)' }
        ];

        // Rótulos das 19 `funcao` de heldItems. Só traduzem o valor cru do campo
        // pra português legível — não acrescentam regra nenhuma. Valor
        // desconhecido cai no próprio nome do campo, e não em "Outros": quando
        // o servidor criar uma função nova eu quero VER o nome dela aqui.
        const ITEM_FUNCOES = {
            'dano-tipo': 'Dano por tipo',
            'dano-tipo-v2': 'Dano por tipo (novos)',
            'resistencia-tipo': 'Resistência a tipo',
            'especie': 'Espécie específica',
            'utilidade': 'Utilidade',
            'defensivo': 'Defensivo',
            'ofensivo': 'Ofensivo',
            'recuperacao': 'Recuperação',
            'contra-ataque': 'Contra-ataque',
            'campo': 'Efeito de campo',
            'evolucao': 'Evolução',
            'precisao-critico': 'Precisão e crítico',
            'ordem-turno': 'Ordem de turno',
            'treino-ev': 'Treino de EV',
            'impulso-limite': 'Impulso no limite',
            'handicap': 'Handicap',
            'cura-status': 'Cura de status',
            'concurso': 'Concurso',
            'correio': 'Correio'
        };

        // \n dentro do nome é quebra de linha de VITRINE (o jogo desenha o nome
        // em duas linhas no slot de 52px). Numa lista de uma linha por item ele
        // só parte a frase no meio.
        function itemNomeLegivel(nome) {
            return String(nome == null ? '' : nome).replace(/\s+/g, ' ').trim();
        }

        function itemTitulo(nome) {
            const n = itemNomeLegivel(nome);
            return n.replace(/(^|\s)([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase());
        }

        // Dois índices: o EXATO, que é o que classifica, e o SOLTO (nome
        // normalizado), que NÃO classifica — só serve pra flagrar quando os dois
        // discordam.
        //
        // ⚠️ Isto não é preciosismo: no state real a mochila tem
        // "venom\nstone" e o meta tem "venom stone". O casamento exato do
        // openBag FALHA nesse item, e o jogo o joga em "Loot (venda no Mark)"
        // por $5.000 — apesar de ele ser uma pedra de evolução no catálogo. É
        // um furo de dado do servidor.
        //
        // Casar solto aqui "consertaria" a gaveta e faria a nossa lista
        // discordar da tela do jogo em silêncio — e o jogador venderia a pedra
        // achando que a nossa etiqueta valia. Então classificamos igual ao jogo
        // e AVISAMOS na linha. Ver `divergencia` em montarLinhasMochila.
        function itemIndexar(lista, campoChave) {
            const exato = new Map(), solto = new Map();
            for (const reg of (lista || [])) {
                const k = reg && reg[campoChave];
                if (k == null) continue;
                exato.set(String(k), reg);
                const n = itemNomeLegivel(k).toLowerCase();
                if (!solto.has(n)) solto.set(n, reg);
            }
            return {
                get(nome) { return nome == null ? null : (exato.get(String(nome)) || null); },
                tem(nome) { return !!this.get(nome); },
                // Casa ignorando espaço/quebra/caixa. Só pra detectar o furo.
                getSolto(nome) {
                    return nome == null ? null : (solto.get(itemNomeLegivel(nome).toLowerCase()) || null);
                },
                tamanho: exato.size
            };
        }

        function montarIndiceItens(meta) {
            const m = meta || {};
            return {
                stones: itemIndexar(m.stones, 'name'),
                tms: itemIndexar(m.tms, 'itemKey'),
                boss: itemIndexar(m.bossItems, 'name'),
                held: itemIndexar(m.heldItems, 'name'),
                balls: itemIndexar(m.balls, 'key'),
                potions: itemIndexar(m.potions, 'key')
            };
        }

        // Mesma precedência dos filtros do openBag. Um item que estivesse em
        // dois conjuntos apareceria nas duas gavetas lá; aqui ele fica na
        // primeira, que é a que o jogo desenha primeiro.
        function classificarItemBag(nome, idx) {
            if (idx.stones.tem(nome)) return { gaveta: 'stone', meta: idx.stones.get(nome) };
            if (idx.tms.tem(nome)) return { gaveta: 'tm', meta: idx.tms.get(nome) };
            if (idx.boss.tem(nome)) return { gaveta: 'boss', meta: idx.boss.get(nome) };
            if (idx.held.tem(nome)) return { gaveta: 'held', meta: idx.held.get(nome) };
            return { gaveta: 'loot', meta: null };
        }

        // O item caiu em Loot, mas existe no catálogo com um nome que só difere
        // por espaço/quebra de linha? Então o jogo vai vendê-lo como loot
        // comum — e quem olha a lista merece saber disso ANTES de vender.
        const ITEM_GAVETA_NOME = { stone: 'pedra de evolução', tm: 'TM/HM', boss: 'item de boss', held: 'item segurado' };

        function detectarDivergenciaItem(nome, idx) {
            for (const g of ['stones', 'tms', 'boss', 'held']) {
                const reg = idx[g].getSolto(nome);
                if (!reg) continue;
                const chave = g === 'stones' ? 'stone' : g === 'tms' ? 'tm' : g;
                const nomeMeta = reg.name || reg.itemKey || '';
                return {
                    gaveta: chave,
                    texto: '⚠️ O jogo vende como loot: o catálogo tem "' + itemNomeLegivel(nomeMeta) +
                        '" como ' + (ITEM_GAVETA_NOME[chave] || chave) +
                        ', mas o nome na mochila difere (quebra de linha). Confira antes de vender.'
                };
            }
            return null;
        }

        // PESO DE ORDENAÇÃO DENTRO DA GAVETA.
        //
        // Ordenar alfabeticamente dentro da gaveta não é neutro, é errado: a
        // lista saía "Great Ball, Poké Ball, Super Ball, Ultra Ball" e as
        // poções saíam com o Revive entre a Hyper e a Small. Quem abre a
        // mochila não pergunta "qual vem primeiro no dicionário", pergunta
        // "qual é a melhor" — e cada gaveta já tem no servidor o campo que
        // responde isso. Alfabético fica só onde não existe ordem natural.
        const ITEM_TIER_ORDEM = { SS: 0, S: 1, A: 2, B: 3, C: 4, D: 5 };

        function pesoItem(gaveta, reg, linha) {
            const r = reg || {};
            if (gaveta === 'ball') return Number(r.points) || 0;          // força de captura
            if (gaveta === 'potion') return r.revive ? 99 : (Number(r.heal) || 0) * 100;  // cura; revive por último
            if (gaveta === 'tm') return ITEM_TIER_ORDEM[r.tier] != null ? ITEM_TIER_ORDEM[r.tier] : 9;
            // Loot: o que vale mais primeiro — é a decisão que se toma ali.
            if (gaveta === 'loot') return -((Number(linha && linha.price) || 0) * ((linha && linha.count) | 0));
            return 0;
        }

        function itemDinheiro(n) {
            const v = Number(n) || 0;
            return v >= 1000 ? v.toLocaleString('pt-BR') : String(v);
        }

        // ── Descrições ──────────────────────────────────────────────────────
        // Cada uma devolve { desc, tags }. `desc` é a frase; `tags` são as
        // pastilhas curtas. Texto vindo do servidor entra inteiro e sem
        // reescrita — é ele que o jogador já conhece do hover.

        function descreverHeld(reg) {
            const fn = reg && reg.funcao;
            return {
                desc: (reg && reg.desc) ? itemNomeLegivel(reg.desc) : '',
                tags: fn ? [ITEM_FUNCOES[fn] || fn] : []
            };
        }

        function descreverBall(reg, chave) {
            // 6 das 7 bolas vêm com `desc` vazio, então a frase é COMPOSTA dos
            // campos. Cada pedaço abaixo é a leitura direta de um campo — nada
            // de mecânica inventada: `points` é dito como "captura N pts",
            // que é o nome do campo, e não como uma taxa de sucesso.
            const r = reg || {};
            const tags = [];
            // FORÇA RELATIVA. `points` é a escala de captura do servidor e a
            // Poké Ball vale 1 — conferido nos 7 registros: 1,2,3,4,5,10,10.
            // Então "5×" não é número nosso: é a razão entre o campo do item e o
            // do item base. Dizer "5 pts" não respondia nada; dizer "5× a Poké
            // Ball" responde a única pergunta que se faz olhando uma bola.
            if (r.points != null) tags.push(r.points + '× a Poké Ball');
            if (r.gold > 0) tags.push('$' + itemDinheiro(r.gold));
            if (r.diamonds > 0) tags.push('💎 ' + itemDinheiro(r.diamonds));
            if (r.master) tags.push('master');
            if (r.legendary) tags.push('lendários');
            if (r.soBoss) tags.push('só boss');
            if (r.noAuto) tags.push('fora do auto');
            if (!r.atMark && r.gold > 0) tags.push('não vende no Mark');
            const partes = [];
            if (r.points != null) {
                partes.push('Força de captura ' + r.points + ' — ' +
                    (r.points === 1 ? 'a bola base do jogo.'
                        : r.points + '× a da Poké Ball (que vale 1).'));
            }
            if (r.desc) partes.push(itemNomeLegivel(r.desc));
            if (Array.isArray(r.bestTypes) && r.bestTypes.length) {
                partes.push('Melhor contra: ' + r.bestTypes.join(', ') +
                    (r.bestPoints != null ? ' (' + r.bestPoints + ' pts)' : '') + '.');
            }
            if (r.fusao && r.fusao.de) {
                partes.push('Fusão: ' + Math.max(1, r.fusao.custo | 0) + '× ' +
                    itemTitulo(r.fusao.de) + ' viram 1.');
            }
            if (!partes.length && !reg) partes.push('Bola "' + itemNomeLegivel(chave) + '" fora do catálogo do servidor.');
            return { desc: partes.join(' '), tags };
        }

        function descreverPotion(reg, chave) {
            // Sem `desc` no meta. `heal` é fração (0.3 = 30%); `revive` é flag.
            const r = reg || {};
            const tags = [];
            if (r.gold > 0) tags.push('$' + itemDinheiro(r.gold));
            let desc = '';
            if (r.revive) desc = 'Revive um pokémon derrotado.';
            else if (r.heal > 0) desc = 'Cura ' + Math.round(r.heal * 100) + '% do HP máximo.';
            else if (!reg) desc = 'Poção "' + itemNomeLegivel(chave) + '" fora do catálogo do servidor.';
            return { desc, tags };
        }

        function descreverTm(reg) {
            // A ficha de verdade (poder/precisão/PP/efeito) NÃO está no
            // /api/meta — a doca a busca em /api/gym/tm/catalogo e reescreve
            // esta linha quando chegar. Até lá, o que o meta dá já identifica o
            // disco sem obrigar o hover.
            const r = reg || {};
            const tags = [];
            if (r.kind) tags.push(r.kind === 'hm' ? 'HM' : 'TM');
            if (r.type) tags.push(itemTitulo(r.type));
            if (r.tier) tags.push('Tier ' + r.tier);
            const partes = [];
            if (r.move) partes.push('Ensina ' + itemTitulo(r.move) + '.');
            if (r.tierNote) partes.push(itemNomeLegivel(r.tierNote));
            if (r.clima) partes.push('Clima: ' + itemNomeLegivel(r.clima) + '.');
            if (r.officialSource && r.officialSource.detail) {
                partes.push('Origem oficial: ' + itemNomeLegivel(r.officialSource.detail) + '.');
            }
            return { desc: partes.join(' '), tags, pendente: true };
        }

        function descreverStone(reg) {
            // O servidor manda name/gold/itemId e MAIS NADA. Dizer qual pokémon
            // ela evolui exigiria uma tabela nossa; o campo `evoStones` do card
            // existe mas veio vazio em todo pokémon já evoluído do state, então
            // não dá pra prometer. Escrevo o que o dado sustenta.
            const r = reg || {};
            const tags = [];
            if (r.gold > 0) tags.push('$' + itemDinheiro(r.gold) + ' na loja');
            return { desc: 'Pedra de evolução. Use no card do pokémon que a aceita.', tags };
        }

        function descreverBoss() {
            // Idem: bossItems é só { name, cid }. Esta frase é a MESMA que o
            // openBag já põe no title do slot — não é texto novo, é o texto do
            // jogo trazido pra lista.
            return {
                desc: 'Guardado na mochila. Não vende no Mark — negocie no 🏪 Mercado.',
                tags: ['não vende no Mark']
            };
        }

        function descreverLoot(linha) {
            const preco = Number(linha && linha.price) || 0;
            return {
                desc: preco > 0
                    ? 'Vende por $' + itemDinheiro(preco) + ' cada na loja do Mark.'
                    : 'Sem preço de venda informado.',
                tags: preco > 0 ? ['$' + itemDinheiro(preco)] : []
            };
        }

        // ── Montagem das linhas ─────────────────────────────────────────────
        // PURA de propósito: recebe estado e meta, não lê window. É o que o
        // teste exercita com o state real.
        function montarLinhasMochila(estado, meta) {
            const st = estado || {}, idx = montarIndiceItens(meta);
            const linhas = [];

            for (const [chave, qtd] of Object.entries(st.balls || {})) {
                if (!(qtd > 0)) continue;
                const reg = idx.balls.get(chave);
                const d = descreverBall(reg, chave);
                linhas.push({
                    gaveta: 'ball', chave, nome: chave,
                    titulo: itemTitulo((reg && reg.label) || chave),
                    qtd, cid: null, valor: (reg && reg.gold) || 0,
                    desc: d.desc, tags: d.tags, grupo: 'Pokébolas',
                    // O NÚMERO, não o texto. A coluna da doca lia a tag
                    // "captura N pts" com regex; renomear a tag pra "N× a Poké
                    // Ball" quebrou a coluna em silêncio. Campo não quebra
                    // quando a redação muda.
                    pontos: (reg && reg.points != null) ? Number(reg.points) : null,
                    peso: pesoItem('ball', reg, null)
                });
            }

            for (const [chave, qtd] of Object.entries(st.potions || {})) {
                if (!(qtd > 0)) continue;
                const reg = idx.potions.get(chave);
                const d = descreverPotion(reg, chave);
                linhas.push({
                    gaveta: 'potion', chave, nome: chave,
                    titulo: itemTitulo((reg && reg.label) || chave),
                    qtd, cid: null, valor: (reg && reg.gold) || 0,
                    desc: d.desc, tags: d.tags, grupo: 'Poções',
                    cura: (reg && reg.heal > 0) ? Math.round(reg.heal * 100) : null,
                    revive: !!(reg && reg.revive),
                    peso: pesoItem('potion', reg, null)
                });
            }

            for (const linha of (st.bag || [])) {
                if (!linha || !linha.name) continue;
                const qtd = linha.count | 0;
                if (qtd <= 0) continue;
                const cls = classificarItemBag(linha.name, idx);
                const reg = cls.meta;
                let d, titulo, grupo, cid = (reg && reg.cid) || null;

                if (cls.gaveta === 'held') {
                    d = descreverHeld(reg);
                    titulo = itemTitulo((reg && reg.label) || linha.name);
                    grupo = d.tags[0] || 'Item segurado';
                } else if (cls.gaveta === 'tm') {
                    d = descreverTm(reg);
                    titulo = (reg && reg.kind === 'hm' ? 'HM' : 'TM') + ' — ' +
                        itemTitulo((reg && reg.move) || linha.name);
                    // Agrupado por TIER, não por tipo elemental: com 13 discos
                    // na mochila a pergunta é "quais das minhas prestam", e o
                    // tier é o campo que responde. O tipo continua na pastilha.
                    grupo = (reg && reg.tier) ? ('Tier ' + reg.tier) : 'Sem tier';
                    cid = (reg && reg.spriteCid) || null;
                } else if (cls.gaveta === 'stone') {
                    d = descreverStone(reg);
                    titulo = itemTitulo(linha.name);
                    grupo = 'Pedras';
                } else if (cls.gaveta === 'boss') {
                    d = descreverBoss();
                    titulo = itemTitulo(linha.name);
                    grupo = 'Itens de boss';
                } else {
                    d = descreverLoot(linha);
                    titulo = itemTitulo(linha.name);
                    grupo = 'Loot';
                    const div = detectarDivergenciaItem(linha.name, idx);
                    if (div) {
                        d = { desc: d.desc + ' ' + div.texto, tags: (d.tags || []).concat(['⚠️ nome divergente']) };
                        grupo = 'Loot com nome divergente';
                    }
                }

                linhas.push({
                    gaveta: cls.gaveta, chave: linha.name, nome: linha.name,
                    titulo, qtd, cid,
                    valor: (cls.gaveta === 'loot' ? (Number(linha.price) || 0)
                        : cls.gaveta === 'stone' ? ((reg && reg.gold) || 0) : 0),
                    desc: d.desc, tags: d.tags, grupo,
                    peso: pesoItem(cls.gaveta, reg, linha),
                    // Peso do GRUPO: TM ordena os cabeçalhos por tier (SS antes
                    // de D) e o loot de nome divergente sobe pro topo da gaveta,
                    // porque é o que pode ser vendido por engano.
                    grupoPeso: cls.gaveta === 'tm'
                        ? (ITEM_TIER_ORDEM[(reg && reg.tier)] != null ? ITEM_TIER_ORDEM[reg.tier] : 9)
                        : (grupo === 'Loot com nome divergente' ? -1 : 0),
                    fichaPendente: !!d.pendente
                });
            }

            return linhas;
        }

        // Ordenações. 'tipo' é a padrão: gaveta na ordem do jogo, depois o
        // subgrupo (a `funcao` do held, o tipo da TM), depois o nome — é a
        // "ordenação por tipo" pedida.
        const ITEM_ORDENS = {
            tipo: (a, b) => {
                const ga = ITEM_GAVETAS.findIndex(g => g.chave === a.gaveta);
                const gb = ITEM_GAVETAS.findIndex(g => g.chave === b.gaveta);
                if (ga !== gb) return ga - gb;
                // O GRUPO vem antes do item, mas ordenado pelo peso do grupo e
                // não pelo alfabeto: senão as TMs saíam "Tier A, Tier B, Tier D,
                // Tier S" — o alfabeto jogava o disco mais raro do jogador pro
                // fim da lista, dizendo o contrário do que o tier significa.
                if ((a.grupoPeso || 0) !== (b.grupoPeso || 0)) return (a.grupoPeso || 0) - (b.grupoPeso || 0);
                if (a.grupo !== b.grupo) return String(a.grupo).localeCompare(String(b.grupo), 'pt-BR');
                if ((a.peso || 0) !== (b.peso || 0)) return (a.peso || 0) - (b.peso || 0);
                return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
            },
            quantidade: (a, b) => (b.qtd - a.qtd) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'),
            nome: (a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'),
            valor: (a, b) => ((b.valor * b.qtd) - (a.valor * a.qtd)) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR')
        };

        function ordenarLinhasMochila(linhas, ordem) {
            const cmp = ITEM_ORDENS[ordem] || ITEM_ORDENS.tipo;
            return (linhas || []).slice().sort(cmp);
        }

        // ── CASAR O SLOT DO JOGO COM A NOSSA LINHA ─────────────────────────
        // O jogador quer clicar no item na GRADE DO JOGO e ver o card aqui. Só
        // que o `openBag` não põe id nem data-attr nos slots: o único texto que
        // sobra é o `title`, e ele é montado diferente em cada gaveta:
        //
        //   bola    "Ultra Ball — desc..."        (label + desc)
        //   poção   "Ultra Potion"                (só label)
        //   pedra   "ancient\nstone"              (nome cru, com quebra)
        //   TM      "TM — Dig (clique pra ver...)"
        //   boss    "chave\nde boss — guardado..."
        //   held    "Hard Stone — Tier 1: +4%..."
        //   loot    "future orb — $110 cada"
        //
        // O denominador comum é que TODOS começam pelo nome ou pelo rótulo do
        // item. Então casamos por PREFIXO normalizado, e ficamos com o mais
        // longo: sem isso "Berry" casaria com "Berry Crítica" e "Berry Efetiva"
        // ao mesmo tempo, e o card abriria no item errado.
        function casarSlotComLinha(titulo, linhas) {
            const alvo = itemNomeLegivel(titulo).toLowerCase();
            if (!alvo) return null;
            let melhor = null, tam = 0;
            for (const l of (linhas || [])) {
                for (const cand of [l.titulo, l.nome, l.chave]) {
                    const c = itemNomeLegivel(cand).toLowerCase();
                    if (!c || c.length <= tam) continue;
                    if (alvo === c || alvo.startsWith(c)) { melhor = l; tam = c.length; }
                }
            }
            return melhor;
        }

        // Busca: casa no nome legível, no título, na descrição e nas tags —
        // procurar "lutador" tem que achar a Black Belt pela DESCRIÇÃO, que é o
        // ponto inteiro de ter a descrição na tela.
        function filtrarLinhasMochila(linhas, termo) {
            const t = itemNomeLegivel(termo).toLowerCase();
            if (!t) return (linhas || []).slice();
            return (linhas || []).filter(l => {
                const alvo = [l.titulo, l.nome, l.desc, l.grupo]
                    .concat(l.tags || []).join(' ');
                return itemNomeLegivel(alvo).toLowerCase().includes(t);
            });
        }

        // =====================================================================
        // 14c-ficha-poke.js — NOTA DA FICHA, RANKING E FILTROS DE POKÉMON
        // =====================================================================
        // A pontuação do avaliador meta, portada pra dentro da página. Sem DOM
        // e sem globais: recebe o card do pokémon e devolve números. É o que a
        // doca da Equipe (36) desenha, e roda fora do navegador no teste
        // (testes/verifica_ficha_poke.js).
        //
        // ── DUAS PERGUNTAS DIFERENTES, DOIS NÚMEROS ──
        // Isto é o que mais confunde, então está escrito antes do código:
        //
        //   • `power` / `dps`  → "quem bate mais AGORA". Número do próprio
        //     jogo, sem modelo nosso. É o que importa pra escolher quem caça.
        //   • `ficha` (0..100) → "de N cópias que eu cacei, qual vale criar".
        //     Feita SÓ dos dois atributos rolados na captura, então independe
        //     de nível. Um Bulbasaur Lv.1 pode ter ficha melhor que um
        //     Chandelure Lv.220 e ainda assim fazer 30 de DPS contra 23.871.
        //
        // A doca mostra os dois lado a lado de propósito. Mostrar só a ficha
        // faria o jogador achar que o Bulbasaur é "o mais forte".
        //
        // ── ⚠️ ESTA FÓRMULA TEM UMA SEGUNDA CÓPIA ──
        // A original vive em `shell/32-banco-dados-avaliador-meta.js`, que roda
        // no shell Electron (multi-conta, lê inventários via IPC). Aqui roda
        // dentro da página, numa conta só. São contextos diferentes: não dá pra
        // importar um do outro.
        //
        // O que impede as duas de divergirem é o teste
        // `testes/verifica_ficha_poke.js`: ele extrai a função DOS DOIS bundles
        // gerados e exige nota idêntica nos mesmos pokémon. Se alguém mexer em
        // um lado só, o teste quebra e diz qual. Mexeu aqui, mexa lá.
        //
        // ── DE ONDE VÊM OS PESOS (não os mude no chute) ──
        // Calibrados contra os 56 Bulbasaur Lv.1 de um state real — mesma
        // espécie e mesmo nível, então o `power` do jogo é a verdade absoluta.
        // Correlação de postos entre a nota e o power, variando o peso:
        //     100% growth (fórmula ANTIGA) → -0,109   (pior que sorteio)
        //      50/50                       → +0,436
        //      75/25  (escolhido)          → +0,87
        //      90/10                       → +0,971
        // O ótimo medido é ~90% IV, mas isso vale pra Lv.1, onde o growth quase
        // não entra na conta; em nível alto ele vira ~40% dos stats. 75/25 é o
        // meio-termo deliberado.
        // =====================================================================

        const IV_MAX_JOGO = 2.5;      // api/tiers.html → "ivMax": 2.5
        const PESO_IV = 0.75;
        const PESO_GROWTH = 0.25;

        function calcularFichaPoke(pk) {
            const p = pk || {};
            const gTotal = (p.growthTotal != null)
                ? Number(p.growthTotal)
                : (p.growth ? Object.values(p.growth).reduce((a, b) => a + Number(b || 0), 0) : null);
            const gMax = Number(p.growthTotalMax) || 192;
            // O jogo já manda growthPct pronto; só recalculamos se não veio.
            const gPct = (p.growthPct != null)
                ? Number(p.growthPct)
                : (gTotal != null ? Math.round((gTotal / gMax) * 100) : null);

            const iv = Number(p.iv) || 0;
            const ivPct = Math.max(0, Math.min(100, Math.round((iv / IV_MAX_JOGO) * 100)));

            // Sem clamp artificial em 100: é média ponderada de dois 0..100,
            // então já nasce na faixa. A fórmula antiga estourava 100 e achatava
            // vários pokémon distintos no mesmo "100%", justo no topo do ranking
            // — que é exatamente onde a diferença importa.
            const ficha = (gPct != null)
                ? Math.round(PESO_IV * ivPct + PESO_GROWTH * gPct)
                : ivPct;

            return { gTotal, gMax, gPct, iv, ivPct, ficha };
        }

        // ── A NOTA EXATA, PRA ORDENAR ──────────────────────────────────────
        // `ficha` arredonda DUAS vezes: ivPct e gPct já saem inteiros, e a média
        // deles é arredondada de novo. Com 21 cópias de Staraptor isso empilha
        // cinco bichos distintos no mesmo "66" — e aí a nota parece não
        // confiável, porque a tela diz que são iguais e o poder diz que não.
        //
        // `fichaExata` refaz a conta a partir dos valores CRUS (iv float,
        // growthTotal/growthTotalMax), sem arredondar no meio. Serve pra
        // ORDENAR e pra desempatar. O inteiro `ficha` continua igualzinho ao do
        // shell — é ele que o teste de divergência compara, e mudá-lo faria as
        // duas telas discordarem.
        function calcularFichaExata(pk) {
            const p = pk || {};
            const ivPctEx = Math.max(0, Math.min(100, (Number(p.iv) || 0) / IV_MAX_JOGO * 100));
            let gPctEx = null;
            const gTotal = (p.growthTotal != null)
                ? Number(p.growthTotal)
                : (p.growth ? Object.values(p.growth).reduce((a, b) => a + Number(b || 0), 0) : null);
            const gMax = Number(p.growthTotalMax) || 192;
            if (gTotal != null && gMax > 0) gPctEx = Math.max(0, Math.min(100, gTotal / gMax * 100));
            else if (p.growthPct != null) gPctEx = Number(p.growthPct);
            return (gPctEx != null) ? (PESO_IV * ivPctEx + PESO_GROWTH * gPctEx) : ivPctEx;
        }

        // Faixa de leitura da nota. Serve pra pintar, não pra decidir nada.
        function faixaFichaPoke(ficha) {
            if (ficha >= 90) return { rotulo: 'Excelente', classe: 'ex' };
            if (ficha >= 75) return { rotulo: 'Bom', classe: 'bom' };
            if (ficha >= 55) return { rotulo: 'Mediano', classe: 'med' };
            return { rotulo: 'Fraco', classe: 'fraco' };
        }

        // Letra de leitura rápida da NOSSA nota.
        //
        // ⚠️ NÃO confundir com o `tier` da espécie, que vem do servidor e diz
        // outra coisa (quão boa é a ESPÉCIE). Este grau é do INDIVÍDUO. A doca
        // mostra os dois com rótulos diferentes de propósito — misturar os dois
        // é o caminho mais curto pra ninguém acreditar em nenhum.
        function grauFichaPoke(ficha) {
            if (ficha >= 95) return 'S+';
            if (ficha >= 85) return 'S';
            if (ficha >= 75) return 'A';
            if (ficha >= 60) return 'B';
            if (ficha >= 45) return 'C';
            return 'D';
        }

        // Junta time e box num só rol, marcando de onde cada um veio. `origem`
        // importa porque as ações do jogo não valem igual nos dois: o sellMany
        // percorre a BOX, e o pokémon ativo não é vendável.
        function listarPokesConta(estado) {
            const st = estado || {};
            const fora = [];
            for (const p of (st.team || [])) if (p) fora.push(montarLinhaPoke(p, 'time'));
            for (const p of (st.box || [])) if (p) fora.push(montarLinhaPoke(p, 'box'));
            return fora;
        }

        function montarLinhaPoke(p, origem) {
            const f = calcularFichaPoke(p);
            return {
                id: p.id,
                nome: p.name || '?',
                nomeLegivel: String(p.name || '?').replace(/\s+/g, ' ').trim(),
                origem,
                nivel: p.level | 0,
                power: Number(p.power) || 0,
                dps: Number(p.dps) || 0,
                sell: Number(p.sell) || 0,
                locked: !!p.locked,
                ativo: !!p.active,
                shiny: !!p.shiny,
                tier: p.tier || '',
                raridade: p.rarity || '',
                tipo1: p.type1 || '', tipo2: (p.type2 && p.type2 !== 'none') ? p.type2 : '',
                held: p.heldNome || '',
                heldTier: p.heldTier || 0,
                lookType: p.lookType,
                iv: f.iv, ivPct: f.ivPct, growthPct: f.gPct, ficha: f.ficha,
                // Valores CRUS junto do percentual: o card do jogo mostra
                // "Growth 181/192 (94%)" e "Mítica +2.46", e ver só o % obriga
                // a traduzir de cabeca entre as duas telas.
                growthTotal: f.gTotal, growthMax: f.gMax,
                growthPorStat: p.growth || null,
                raridadeIv: p.rarity || '',
                lendario: !!p.legendary,
                // `moves` só vem no card CHEIO (time/ativo). A box vem leve, sem
                // ele (CARD_LIGHT_OMIT no servidor) — a ficha diz isso em vez
                // de fingir que o pokémon não tem golpe nenhum.
                golpes: Array.isArray(p.moves) ? p.moves.slice() : null,
                aura: p.aura || '',
                hab: p.hab || null,
                // Exata pra ordenar e desempatar; o inteiro e o que se mostra.
                fichaExata: calcularFichaExata(p),
                faixa: faixaFichaPoke(f.ficha).classe,
                grau: grauFichaPoke(f.ficha),
                // Vendável = o que o JOGO deixa vender. Travado e ativo não
                // entram; a doca não tenta contornar nenhuma das duas travas.
                vendavel: !p.locked && !p.active && origem === 'box',
                cru: p
            };
        }

        // Quantas cópias da mesma espécie a conta tem. É a conta que responde
        // "posso vender esta?" melhor que a nota sozinha: nota 60 sendo a única
        // cópia vale mais que nota 60 sendo a sétima.
        function contarEspecies(linhas) {
            const c = {};
            for (const l of (linhas || [])) {
                const k = l.nomeLegivel.toLowerCase();
                c[k] = (c[k] || 0) + 1;
            }
            for (const l of (linhas || [])) l.copias = c[l.nomeLegivel.toLowerCase()] || 1;
            return linhas;
        }

        // Todo desempate usa `fichaExata`, nunca o inteiro: ordenar pelo
        // inteiro deixava cinco Staraptor "66" em ordem arbitraria, e ordem
        // arbitraria numa lista de ranking le como erro.
        const POKE_ORDENS = {
            ficha: (a, b) => (b.fichaExata - a.fichaExata) || (b.power - a.power),
            power: (a, b) => (b.power - a.power) || (b.fichaExata - a.fichaExata),
            dps: (a, b) => (b.dps - a.dps) || (b.fichaExata - a.fichaExata),
            iv: (a, b) => (b.iv - a.iv) || (b.fichaExata - a.fichaExata),
            growth: (a, b) => ((b.growthPct || 0) - (a.growthPct || 0)) || (b.fichaExata - a.fichaExata),
            nivel: (a, b) => (b.nivel - a.nivel) || (b.power - a.power),
            valor: (a, b) => (b.sell - a.sell) || (b.fichaExata - a.fichaExata),
            nome: (a, b) => a.nomeLegivel.localeCompare(b.nomeLegivel, 'pt-BR') || (b.fichaExata - a.fichaExata),
            copias: (a, b) => ((b.copias || 1) - (a.copias || 1)) || (a.fichaExata - b.fichaExata)
        };

        function ordenarPokes(linhas, ordem) {
            return (linhas || []).slice().sort(POKE_ORDENS[ordem] || POKE_ORDENS.ficha);
        }

        // Filtros. Tudo opcional; ausente = não filtra.
        function filtrarPokes(linhas, f) {
            const flt = f || {};
            const termo = String(flt.termo || '').trim().toLowerCase();
            return (linhas || []).filter(l => {
                if (flt.origem && flt.origem !== 'tudo' && l.origem !== flt.origem) return false;
                if (flt.soShiny && !l.shiny) return false;
                if (flt.soLendario && !l.lendario) return false;
                if (flt.raridade && String(l.raridadeIv || '').toLowerCase() !== String(flt.raridade).toLowerCase()) return false;
                if (flt.soVendavel && !l.vendavel) return false;
                if (flt.soTravados && !l.locked) return false;
                if (flt.soFavoritos && !flt.favoritos.has(l.id)) return false;
                if (flt.soDuplicados && (l.copias || 1) < 2) return false;
                if (flt.fichaMin != null && l.ficha < flt.fichaMin) return false;
                if (flt.fichaMax != null && l.ficha > flt.fichaMax) return false;
                if (termo) {
                    const alvo = [l.nomeLegivel, l.tipo1, l.tipo2, l.tier, l.held].join(' ').toLowerCase();
                    if (!alvo.includes(termo)) return false;
                }
                return true;
            });
        }

        // ── PRÉ-SELEÇÕES PARA VENDA ────────────────────────────────────────
        // Selecionar 39 pokémon na mão é o que faz ninguém limpar a box nunca.
        // Cada preset abaixo é uma REGRA EXPLÍCITA, e todas passam pelo mesmo
        // funil: só entra quem o jogo deixa vender (box, destravado, não-ativo).
        // Nenhuma delas vende nada — só marca. A venda continua atrás do
        // uiConfirm do jogo, com os nomes na tela.

        // "Duplicatas piores": das cópias da mesma espécie, marca todas MENOS a
        // melhor. É a limpeza que quase todo mundo quer e ninguém faz na mão.
        // A melhor é decidida pela ficha EXATA — com o inteiro, cinco cópias
        // "66" empatariam e a escolha de qual guardar viraria sorteio.
        function preselDuplicatasPiores(linhas) {
            const melhorPorEspecie = {};
            for (const l of (linhas || [])) {
                const k = l.nomeLegivel.toLowerCase();
                const atual = melhorPorEspecie[k];
                if (!atual || l.fichaExata > atual.fichaExata) melhorPorEspecie[k] = l;
            }
            return (linhas || []).filter(l =>
                l.vendavel && melhorPorEspecie[l.nomeLegivel.toLowerCase()] !== l);
        }

        // "Abaixo de N": marca o que tem ficha menor que o corte.
        function preselAbaixoDe(linhas, corte) {
            return (linhas || []).filter(l => l.vendavel && l.fichaExata < corte);
        }

        // "Grau C ou pior": mesma ideia, dita em letra em vez de número.
        function preselGrauRuim(linhas) {
            return (linhas || []).filter(l => l.vendavel && (l.grau === 'C' || l.grau === 'D'));
        }

        const PRESELS_POKE = {
            duplicatas: { rotulo: '⧉ Duplicatas piores', dica: 'Marca as cópias repetidas, guardando a melhor de cada espécie', fn: preselDuplicatasPiores },
            grauRuim: { rotulo: '🗑 Grau C ou pior', dica: 'Marca tudo com ficha abaixo de 60', fn: preselGrauRuim },
            abaixo70: { rotulo: '≤ 70', dica: 'Marca tudo com ficha abaixo de 70', fn: l => preselAbaixoDe(l, 70) },
            abaixo50: { rotulo: '≤ 50', dica: 'Marca tudo com ficha abaixo de 50', fn: l => preselAbaixoDe(l, 50) }
        };

        // Resumo da conta: o que a doca escreve no topo sem ninguém pedir.
        // "Quem bate mais" e "quem tem a melhor ficha" são perguntas diferentes
        // e podem dar pokémon diferentes — quando dão, isso é informação.
        function resumoPokes(linhas) {
            const lst = (linhas || []);
            if (!lst.length) return null;
            const time = lst.filter(l => l.origem === 'time');
            const porPower = lst.slice().sort(POKE_ORDENS.power)[0];
            const porFicha = lst.slice().sort(POKE_ORDENS.ficha)[0];
            const timePorPower = time.length ? time.slice().sort(POKE_ORDENS.power)[0] : null;
            return {
                total: lst.length,
                noTime: time.length,
                naBox: lst.length - time.length,
                travados: lst.filter(l => l.locked).length,
                vendaveis: lst.filter(l => l.vendavel).length,
                valorVendaveis: lst.filter(l => l.vendavel).reduce((a, b) => a + b.sell, 0),
                maisForte: porPower,
                melhorFicha: porFicha,
                maisForteDoTime: timePorPower,
                // Quando os dois campeões são o mesmo bicho não há o que
                // explicar; quando são diferentes, é aí que a doca precisa falar.
                divergem: !!(porPower && porFicha && porPower.id !== porFicha.id)
            };
        }

        // =====================================================================
        // 14d-sugestoes-hunt.js — CONTRA QUEM ESTE POKÉMON É FORTE (E FRACO)
        // =====================================================================
        // Matchup de tipo do pokémon aberto na ficha: contra quais tipos ele
        // bate forte e quais tipos batem forte nele. Puro: sem DOM, sem globais.
        //
        // ── POR QUE NÃO É "SUGESTÃO DE ZONA PRA CAÇAR" ──
        // A primeira versão disto ranqueava ZONAS pra caçar e teleportava com um
        // clique. Foi descartado por um motivo simples: o pokémon que se abre na
        // ficha é quase sempre um Lv.1 parado na box. Mandar ele caçar numa zona
        // de nível 400 é conselho que não dá pra seguir — a sugestão parecia
        // útil e não era.
        //
        // Matchup de tipo, não: vale igual pro Lv.1 e pro Lv.809, porque é
        // propriedade da ESPÉCIE, não do indivíduo. É a informação que responde
        // "pra que serve este bicho" em qualquer momento.
        //
        // ── NÃO REINVENTA A TABELA DE TIPOS ──
        // As contas saem de `multDanoAtkVsDef` e `multDanoRecebido`
        // (26-auto-hunt-matriz.js), as MESMAS que o Auto Hunt usa pra escolher
        // zona. Uma segunda tabela aqui faria a ficha discordar do robô que
        // caça, e o jogador não teria como saber qual das duas está certa.
        // =====================================================================

        // Os 18 tipos, na ordem em que o jogo os escreve.
        const TIPOS_JOGO = [
            'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
            'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark',
            'steel', 'fairy'
        ];

        const TIPO_PT = {
            normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico',
            grass: 'Planta', ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno',
            ground: 'Terra', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto',
            rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio',
            steel: 'Aço', fairy: 'Fada'
        };

        function tiposDoPoke(p) {
            return [p && p.type1, p && p.type2]
                .filter(t => t && String(t).toLowerCase() !== 'none')
                .map(t => String(t).toLowerCase());
        }

        // Devolve { forte, fraco, imune } — listas de { tipo, rotulo, mult }.
        //
        // `forte`  = tipos em que ELE bate com vantagem (>= 2x atacando).
        // `fraco`  = tipos que batem NELE com vantagem (>= 2x apanhando).
        // `imune`  = tipos em que ele não causa dano nenhum (0x). Fica separado
        //            porque é eliminatório, não "meio ruim": sem dano não há
        //            caçada, por melhor que seja o resto.
        //
        // As funções de dano são injetáveis só pra o teste exercitar a regra sem
        // arrastar o motor inteiro; em produção são as do 26.
        function matchupsDoPoke(poke, opcoes) {
            const op = opcoes || {};
            const atacando = op.atacando ||
                (typeof multDanoAtkVsDef === 'function' ? multDanoAtkVsDef : null);
            const apanhando = op.apanhando ||
                (typeof multDanoRecebido === 'function' ? multDanoRecebido : null);
            if (!atacando || !apanhando || !poke) return null;

            const meus = tiposDoPoke(poke);
            if (!meus.length) return null;

            const forte = [], fraco = [], imune = [];
            for (const t of TIPOS_JOGO) {
                const dou = atacando(meus, [t]);
                const levo = apanhando([t], meus);
                if (dou === 0) imune.push({ tipo: t, rotulo: TIPO_PT[t] || t, mult: 0 });
                else if (dou >= 2) forte.push({ tipo: t, rotulo: TIPO_PT[t] || t, mult: dou });
                if (levo >= 2) fraco.push({ tipo: t, rotulo: TIPO_PT[t] || t, mult: levo });
            }
            // Mais forte primeiro em cada lista: 4x antes de 2x.
            forte.sort((a, b) => (b.mult - a.mult) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
            fraco.sort((a, b) => (b.mult - a.mult) || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
            return { tipos: meus, forte, fraco, imune };
        }

        // Espécies do dex que caem nos tipos em que ele é forte. Serve pra dar
        // CARA ao matchup — "forte contra Planta" é abstrato, "forte contra
        // Venusaur, Vileplume…" é reconhecível.
        //
        // ⚠️ Só nomeia; não diz onde caçar, pelo motivo do cabeçalho.
        function especiesFracasContra(matchup, dex, limite) {
            if (!matchup || !Array.isArray(dex)) return [];
            const alvos = new Set(matchup.forte.map(f => f.tipo));
            if (!alvos.size) return [];
            const fora = [];
            for (const d of dex) {
                const t = tiposDoPoke(d);
                if (!t.length || !t.some(x => alvos.has(x))) continue;
                // Se ele também é forte contra mim, não é presa — é troca.
                const contra = matchup.fraco.some(f => t.indexOf(f.tipo) >= 0);
                if (contra) continue;
                fora.push({ nome: d.name, tier: d.tier || '', tipos: t });
            }
            // Tier melhor primeiro: são os que valem a pena reconhecer.
            const ordemTier = { SS: 0, S: 1, A: 2, B: 3, C: 4, D: 5, F: 6 };
            fora.sort((a, b) => (ordemTier[a.tier] == null ? 9 : ordemTier[a.tier]) -
                (ordemTier[b.tier] == null ? 9 : ordemTier[b.tier]));
            return limite ? fora.slice(0, limite) : fora;
        }

        // =====================================================================
        // 18-api-helpers.js — obterToken / apiTest / chamadaSegura / logErro
        // =====================================================================
        // Helpers genericos de chamada a /api/action, extraidos do dev
        // (scripts/05-core-api.js e scripts/18-pause-bind.js) -- usados pela
        // Doca de Hunts (37f) pra ligar o Auto-Helper NATIVO do jogo
        // (setAuto{hunt:true}), que e um recurso do PROPRIO jogo, nao o nosso
        // motor de Auto Hunt (que fica fora do cliente).
        // =====================================================================
        function obterToken() {
            try {
                const ss = sessionStorage.getItem('pmi_tab_token');
                if (ss && ss.length >= 10) return ss;
            } catch(e){}
            try {
                const ls = localStorage.getItem('pmi_token');
                if (ls && ls.length >= 10) return ls;
            } catch(e){}
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (w.q && typeof w.q === 'string') return w.q;
                if (w.TOKEN && typeof w.TOKEN === 'string') return w.TOKEN;
                if (w.TAB_TOKEN && typeof w.TAB_TOKEN === 'string') return w.TAB_TOKEN;
            } catch(e){}
            return '';
        }

        function logErro(ctx, msg) { console.warn('[Hunts]', ctx, msg); }

        async function apiTest(action, payload) {
            try {
                const tok = obterToken();
                const res = await fetch('/api/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tok, action, ...payload })
                });
                let data = {};
                try { data = await res.json(); } catch (e) { }
                return { status: res.status, data };
            } catch (e) { return { status: 0, data: {}, error: String(e) }; }
        }

        async function chamadaSegura(fn, ctxoErro) {
            try {
                const r = await fn();
                if (!r) { logErro(ctxoErro, 'resposta vazia'); return null; }
                if (r.status === 0) { logErro(ctxoErro, 'sem resposta do servidor'); return r; }
                if (r.data && r.data.error) { logErro(ctxoErro, r.data.error); return r; }
                return r;
            } catch (e) {
                logErro(ctxoErro, String(e && e.message ? e.message : e));
                return null;
            }
        }

        // Lista das 650 zonas de hunt (/api/meta -> zones). A Doca de Hunts
        // (37f) usa isto pra montar a lista inteira -- no dev vem junto do
        // resto de scripts/05-core-api.js, mas aquele arquivo TERMINA no meio
        // de uma funcao (continua no scripts/06 seguinte): nao da pra copiar
        // so um pedaco dele. Aqui e so o que a doca precisa mesmo.
        let META_ZONES = [];
        (async function carregarZonasMeta() {
            try {
                const meta = await fetch('/api/meta').then(r => r.json()).catch(() => null);
                if (meta && Array.isArray(meta.zones)) META_ZONES = meta.zones;
            } catch (e) { }
        })();

        // =====================================================================
        // 20-pin-topbar.js — SISTEMA DE PIN NA TOPBAR DO JOGO
        // =====================================================================
        // Extraido de scripts/20-cidade-utils.js do dev (a IIFE
        // instalarSistemaPinTopbar, self-contida) -- o resto daquele arquivo e
        // Auto Hunt/troca-de-conta, que nao vem pro cliente. So duas funcoes
        // do dev foram trocadas por uma versao minima aqui embaixo:
        //   chamarFuncaoJogo -- o dev tem um fallback via `executarNaPagina`
        //   (ponte de sandbox) que so existe no Idle Suite; aqui chama so o
        //   caminho direto (que e o que cobre os itens do PIN_ALLOWLIST).
        //   logEvent -- escrevia no feed do painel do Idle Suite (nao existe
        //   aqui); vira no-op.
        // =====================================================================
        function chamarFuncaoJogo(nome, args = []) {
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w[nome] === 'function') { w[nome](...args); return 'direto'; }
            } catch (e) { }
            return null;
        }
        function logEvent(txt, cor) { /* feed do Idle Suite nao existe no cliente */ }

        // =====================================================
        // 📌 SISTEMA DE PIN PARA MENUS DA TOPBAR (AO LADO DO MAPA/HUNT)
        // Como funciona: o jogo cria, por categoria da topbar (Treinador, Loja,
        // Recompensas, Comunidade, Sistema, Ginásio, Boss), um "flyout" que só
        // aparece no hover — os botões dentro dele (.tbm-item/.gp-tbmenu-item/
        // .bs-tbitem) são um PROXY sem data-modal/id próprios. O botão REAL, que
        // sabe pra onde navegar, fica escondido em #topbar com a classe .tbm-off.
        // A gente injeta o 📌 no proxy (que é o que o usuário vê e clica) mas
        // resolve a AÇÃO (data-modal/id) contra o botão real, casando pelo título.
        // =====================================================
        (function instalarSistemaPinTopbar() {
            const STORAGE_KEY = 'idleTopbarPinnedShortcuts_v2';

            const PIN_ALLOWLIST = [
                'time & box', 'invent', 'golpes da ca', 'item segurado',
                'boost', 'natures', 'pergaminho', 'mega evolu', 'g. balls',
                'gerenciador de bolas', 'bolas', 'perfil', 'outfit',
                'vender por raridade', 'gina', 'lideres', 'meu time',
                'pvp ranqueado', 'individual', 'guilda', 'mercado global',
                'diamantes', 'loja de', 'moon pass', 'indique',
                'recompensa di', 'mailbox', 'quest', 'clã', 'ranking',
                'capturas glob', 'captura', 'atualiza', 'configura',
                'poke', 'sair', 'moon'
            ];
            function ehPermitido(label) {
                const t = label.toLowerCase();
                if (t.length < 3 || t.length > 45) return false;
                return PIN_ALLOWLIST.some(kw => t.indexOf(kw) >= 0);
            }

            function tituloCurto(titulo) {
                return (titulo || '').split(/[—·]/)[0].trim().toLowerCase();
            }

            // O ícone do proxy do flyout é uma CÓPIA 1:1 do ícone do botão real
            // (o próprio jogo faz isso ao montar o flyout) — então é uma chave bem
            // mais confiável do que o texto pra achar o real depois.
            function acharIcone(el) {
                const ic = el.querySelector('.tbm-ic, .gp-tbmenu-ic, .bs-tbic') || el;
                const img = ic.querySelector('img');
                if (img) return { tipo: 'img', valor: img.getAttribute('src') || '' };
                return { tipo: 'texto', valor: (ic.textContent || '').trim() };
            }

            // Acha o botão REAL (escondido em #topbar, classe .tbm-off) correspondente
            // a um item do flyout — é ele que sabe pra onde a ação deve ir (data-modal/id).
            // proxyEl é opcional: quando disponível (flyout aberto), casa pelo ÍCONE
            // (confiável — copiado do real); senão cai pro título, que é mais frágil
            // (o rótulo do flyout às vezes não bate com o title do botão real, ex:
            // "Mercado Global" no flyout vs title="Mercado — compre e venda..." no real).
            function acharBotaoReal(proxyEl, label) {
                const topbarEl = document.getElementById('topbar');
                if (!topbarEl) return null;
                const candidatos = topbarEl.querySelectorAll('.tbm-off');

                if (proxyEl) {
                    const icone = acharIcone(proxyEl);
                    if (icone.valor) {
                        for (const el of candidatos) {
                            const img = el.querySelector('img');
                            if (icone.tipo === 'img' && img && img.getAttribute('src') === icone.valor) return el;
                            if (icone.tipo === 'texto' && !img && (el.querySelector('span') || el).textContent.trim() === icone.valor) return el;
                        }
                    }
                }

                if (label) {
                    const alvo = label.trim().toLowerCase();
                    for (const el of candidatos) {
                        const t = tituloCurto(el.getAttribute('title'));
                        if (t === alvo || t.indexOf(alvo) >= 0 || alvo.indexOf(t) >= 0) return el;
                    }
                }
                return null;
            }

            function extrairEmoji(label) {
                const m = label && String(label).match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u);
                return m ? m[0] : '🎮';
            }

            // ---------- Estado (persistido em localStorage) ----------
            function carregarFixados() {
                try {
                    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    if (Array.isArray(parsed)) return parsed;
                } catch(e) {}
                return [];
            }
            function salvarFixados() {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedList)); } catch(e) {}
            }
            let pinnedList = carregarFixados();

            function combina(a, b) {
                return a.id === b.id || (a.label && b.label && a.label.toLowerCase() === b.label.toLowerCase());
            }
            function estaFixado(item) {
                return pinnedList.some(p => combina(p, item));
            }
            function alternarPinItem(item) {
                const idx = pinnedList.findIndex(p => combina(p, item));
                if (idx >= 0) pinnedList.splice(idx, 1);
                else pinnedList.push(item);
                salvarFixados();
                renderizarBarraFixada();
                atualizarBotoesPinNosMenus();
            }

            // ---------- Barra fixada, ao lado da topbar/Hunt ----------
            let rail = document.getElementById('idle-topbar-pinned-shortcuts');
            if (!rail) {
                rail = document.createElement('div');
                rail.id = 'idle-topbar-pinned-shortcuts';
                rail.className = 'hud';
                rail.style.cssText = 'position:fixed;left:0;top:0;z-index:25;display:none;visibility:hidden;flex-direction:row;align-items:center;gap:clamp(2px,.35vw,5px);padding:6px clamp(4px,.7vw,10px);border:1px solid rgba(234,179,8,0.45);border-radius:9px;background:rgba(12,16,26,0.98);box-shadow:0 4px 16px rgba(0,0,0,.6);box-sizing:border-box;transition:all .15s ease;';
                document.body.appendChild(rail);
            }

            function posicionarAoLadoDoHunt() {
                if (rail.style.display === 'none') return;
                const topbarEl = document.getElementById('topbar');
                if (!topbarEl) return;
                const r = topbarEl.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return;
                rail.style.height = `${Math.round(r.height)}px`;
                rail.style.top = `${Math.round(r.top)}px`;
                rail.style.left = `${Math.max(2, Math.round(r.left - rail.offsetWidth - 4))}px`; // à esquerda da topbar
            }

            // Acha o ícone (img) do botão real de um item pinado, pra desenhar no rail.
            function resolverIconeReal(item) {
                if (item.icon && item.icon.length > 5) return item.icon;
                const real = (item.elId && document.getElementById(item.elId))
                    || (item.dataModal && document.querySelector(`[data-modal="${item.dataModal}"], [data-action="${item.dataModal}"]`))
                    || acharBotaoReal(null, item.label);
                if (!real) return '';
                const img = real.querySelector('img');
                if (img && img.src) return img.src;
                const bg = getComputedStyle(real).backgroundImage;
                const m = bg && bg.match(/url\(['"]?(.*?)['"]?\)/);
                return m ? m[1] : '';
            }

            function criarBotaoFixado(item) {
                const iconSrc = resolverIconeReal(item);
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb ic';
                b.title = `${item.label} (Clique para abrir · Passe o mouse para desafixar)`;
                b.style.cssText = [
                    'position:relative', 'display:flex', 'align-items:center', 'justify-content:center',
                    'width:clamp(32px, 3.7vw, 52px)', 'height:clamp(32px, 3.7vw, 52px)',
                    'padding:clamp(3px, .45vw, 6px)', 'border:none', 'border-radius:8px',
                    'background:rgba(15,23,42,0.9)', 'color:#e2e8f0', 'cursor:pointer',
                    'transition:all .15s ease', 'box-sizing:border-box',
                    'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
                ].join(';');
                b.innerHTML = iconSrc
                    ? `<img src="${iconSrc}" alt="${item.label}" style="width:clamp(22px, 2.6vw, 34px); height:clamp(22px, 2.6vw, 34px); object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,.5)); opacity:.95; transition:transform .12s ease, opacity .12s ease;" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${item.emoji || extrairEmoji(item.label)}',style:'font-size:18px;line-height:1'}))">`
                    : `<span style="font-size:18px; line-height:1">${item.emoji || extrairEmoji(item.label)}</span>`;
                b.insertAdjacentHTML('beforeend', '<div class="idle-unpin-btn" title="Desafixar da Barra" style="position:absolute; top:-3px; right:-3px; width:15px; height:15px; background:#ef4444; color:#fff; border-radius:50%; font-size:9px; font-weight:900; display:none; align-items:center; justify-content:center; box-shadow:0 0 6px rgba(239,68,68,0.8); cursor:pointer">✕</div>');

                const unpinBtn = b.querySelector('.idle-unpin-btn');
                unpinBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); alternarPinItem(item); };
                b.onmouseenter = () => { b.style.background = '#223047'; b.style.transform = 'translateY(-1px)'; unpinBtn.style.display = 'flex'; };
                b.onmouseleave = () => { b.style.background = 'rgba(15,23,42,0.9)'; b.style.transform = ''; unpinBtn.style.display = 'none'; };
                b.onclick = () => executarAcaoItem(item);
                return b;
            }

            function renderizarBarraFixada() {
                rail.innerHTML = '';
                if (!pinnedList.length) {
                    rail.style.display = 'none';
                    rail.style.visibility = 'hidden';
                    rail.style.pointerEvents = 'none';
                    return;
                }
                rail.style.display = 'flex';
                rail.style.visibility = 'visible';
                rail.style.pointerEvents = 'auto';
                // try/catch por item: um item com dado inesperado não pode derrubar
                // o resto da barra no meio do forEach.
                pinnedList.forEach(item => {
                    try { rail.appendChild(criarBotaoFixado(item)); } catch(e) {}
                });
                posicionarAoLadoDoHunt();
            }

            // ---------- Executa a ação de um item (nativo ou fixado) ----------
            function abrirItemFlyout(item, flyoutSel, itemSel, parentSel) {
                const abrir = () => {
                    const fly = document.querySelector(flyoutSel);
                    if (!fly) return false;
                    const alvo = (item.label || '').trim().toLowerCase();
                    for (const el of fly.querySelectorAll(itemSel)) {
                        const lblEl = el.querySelector('.tbm-label, .gp-tbmenu-label, .bs-tblab') || el;
                        const txt = (lblEl.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        if (txt.indexOf(alvo) >= 0 && typeof el.click === 'function') { el.click(); return true; }
                    }
                    return false;
                };
                if (abrir()) return true;
                const parent = document.querySelector(parentSel);
                if (parent && typeof parent.click === 'function') { parent.click(); setTimeout(abrir, 120); return true; }
                return false;
            }

            function executarAcaoItem(item) {
                if (item.fnName) {
                    const via = chamarFuncaoJogo(item.fnName);
                    if (via) { logEvent(`🔗 <b>${item.label}</b> aberto · via ${via}`, '#7dd3fc'); return; }
                }
                if (item.module === 'gym' && abrirItemFlyout(item, '.gp-tbmenu-flyout.gp-tbmenu-open', '.gp-tbmenu-item', '#tb-gymproto')) {
                    logEvent(`🔗 <b>${item.label}</b> aberto via Ginásio`, '#7dd3fc'); return;
                }
                if (item.module === 'boss' && abrirItemFlyout(item, '.bs-tbmenu.bs-tbopen', '.bs-tbitem', '#tb-boss')) {
                    logEvent(`🔗 <b>${item.label}</b> aberto via Boss`, '#7dd3fc'); return;
                }
                if (item.dataModal) {
                    const el = document.querySelector(`[data-modal="${item.dataModal}"], [data-action="${item.dataModal}"]`);
                    if (el && typeof el.click === 'function') { el.click(); return; }
                }
                if (item.elId) {
                    const el = document.getElementById(item.elId);
                    if (el && typeof el.click === 'function') { el.click(); return; }
                }
            }

            // ---------- Botão de pin 📌 nos itens visíveis do flyout ----------
            function atualizarBotoesPinNosMenus() {
                document.querySelectorAll('.idle-menu-pin-btn').forEach(btn => {
                    const pinado = estaFixado({ id: btn.dataset.pinId, label: btn.dataset.pinLabel });
                    btn.style.color = pinado ? '#facc15' : 'rgba(255,255,255,0.45)';
                    btn.style.opacity = pinado ? '1' : '0.7';
                    btn.style.filter = pinado ? 'drop-shadow(0 0 4px rgba(250,204,21,0.8))' : 'none';
                    btn.title = pinado ? 'Desafixar da barra de atalhos' : 'Fixar ao lado do mapa (Hunt)';
                    const host = btn.parentElement;
                    if (host) host.style.boxShadow = pinado ? 'inset 0 0 0 1px rgba(16,185,129,0.5)' : '';
                });
            }

            function injectPin(proxyEl, module) {
                if (proxyEl.querySelector('.idle-menu-pin-btn')) return;
                const lblEl = proxyEl.querySelector('.tbm-label, .gp-tbmenu-label, .bs-tblab');
                const label = ((lblEl || proxyEl).textContent || '').replace(/\s+/g, ' ').trim();
                if (!ehPermitido(label)) return;

                let dataModal = proxyEl.getAttribute('data-modal') || proxyEl.getAttribute('data-action') || '';
                let elId = '';
                if (module === 'tbm') {
                    // proxy do flyout nunca tem data-modal/id — resolve contra o real
                    const real = acharBotaoReal(proxyEl, label);
                    if (real) {
                        dataModal = dataModal || real.getAttribute('data-modal') || real.getAttribute('data-action') || '';
                        elId = real.id || '';
                    }
                } else {
                    elId = proxyEl.id || '';
                }
                const id = (dataModal || elId || (module + '_' + label.toLowerCase())).replace(/[^a-z0-9]/gi, '_');

                // O ícone do proxy é cópia do real (img OU emoji/texto) — guarda os
                // dois pra não cair no 🎮 genérico quando o item usa emoji (ex:
                // Mercado Global = 🏪 no botão real, mas "Mercado Global" como texto
                // não tem nenhum emoji pra extractEmoji() achar).
                const icone = acharIcone(proxyEl);
                const pin = document.createElement('div');
                pin.className = 'idle-menu-pin-btn';
                pin.dataset.pinId = id;
                pin.dataset.pinLabel = label.substring(0, 30);
                pin.dataset.pinIcon = icone.tipo === 'img' ? icone.valor : '';
                pin.dataset.pinEmoji = icone.tipo === 'texto' && icone.valor ? icone.valor : extrairEmoji(label);
                pin.dataset.pinModule = module;
                pin.dataset.pinDatamodal = dataModal;
                pin.dataset.pinElid = elId;
                pin.textContent = '📌';
                pin.title = 'Fixar: ' + label.substring(0, 30);
                pin.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(250,204,21,0.25);border:1px solid rgba(250,204,21,0.6);border-radius:4px;color:#facc15;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,0.7);pointer-events:auto';

                proxyEl.style.position = 'relative';
                proxyEl.style.overflow = 'visible';
                proxyEl.appendChild(pin);
            }

            function injetarPinsNosMenus() {
                if (!document.getElementById('topbar')) return;
                // Idempotente (injectPin pula quem já tem pin) — pode rodar à vontade
                // sem remover/recriar nada, o que evita o "piscar" visual.
                const tbmFlyout = document.querySelector('.tbm-flyout.tbm-open');
                if (tbmFlyout) tbmFlyout.querySelectorAll('.tbm-item').forEach(el => injectPin(el, 'tbm'));

                const gymFlyout = document.querySelector('.gp-tbmenu-flyout.gp-tbmenu-open');
                if (gymFlyout) gymFlyout.querySelectorAll('.gp-tbmenu-item').forEach(el => injectPin(el, 'gym'));

                const bossFlyout = document.querySelector('.bs-tbmenu.bs-tbopen');
                if (bossFlyout) bossFlyout.querySelectorAll('.bs-tbitem').forEach(el => injectPin(el, 'boss'));

                atualizarBotoesPinNosMenus();
            }

            // ---------- Clique no 📌 — UM único handler, delegado ----------
            document.addEventListener('click', ev => {
                const pinBtn = ev.target.closest('.idle-menu-pin-btn');
                if (!pinBtn) return;
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                alternarPinItem({
                    id: pinBtn.dataset.pinId,
                    label: pinBtn.dataset.pinLabel,
                    icon: pinBtn.dataset.pinIcon,
                    emoji: pinBtn.dataset.pinEmoji,
                    module: pinBtn.dataset.pinModule,
                    dataModal: pinBtn.dataset.pinDatamodal,
                    elId: pinBtn.dataset.pinElid
                });
            }, true);
            // mousedown/pointerdown só impedem que o clique vaze pro botão do jogo
            // por baixo do pin — nenhum dos dois aciona o toggle.
            ['mousedown', 'pointerdown'].forEach(evtName => {
                document.addEventListener(evtName, ev => {
                    if (ev.target.closest('.idle-menu-pin-btn')) { ev.preventDefault(); ev.stopPropagation(); }
                }, true);
            });

            // ---------- Gatilhos ----------
            let agendado = null;
            function agendarInjecao() {
                if (agendado) return;
                agendado = setTimeout(() => { agendado = null; injetarPinsNosMenus(); }, 10);
            }
            document.addEventListener('mouseover', ev => {
                if (ev.target.closest && ev.target.closest('#topbar [aria-haspopup="true"], #tb-gymproto, #tb-boss')) {
                    agendarInjecao();
                }
            }, { passive: true });

            // Rede de segurança, bem mais espaçada (a injeção é idempotente/barata).
            setInterval(() => {
                injetarPinsNosMenus();
                if (pinnedList.length) posicionarAoLadoDoHunt();
            }, 3000);
            window.addEventListener('resize', posicionarAoLadoDoHunt, { passive: true });

            // Atalhos de teclado (Shift+B = Time & Box, Shift+I = Inventário)
            document.addEventListener('keydown', ev => {
                if (ev.defaultPrevented || ev.ctrlKey || ev.altKey || ev.metaKey) return;
                const tag = document.activeElement && document.activeElement.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                if (ev.shiftKey && ev.key.toLowerCase() === 'b') { ev.preventDefault(); executarAcaoItem({ label: 'Time & Box', fnName: 'openTeamBox', dataModal: 'team' }); }
                if (ev.shiftKey && ev.key.toLowerCase() === 'i') { ev.preventDefault(); executarAcaoItem({ label: 'Inventário', fnName: 'openBag', dataModal: 'bag' }); }
            });

            // Hook mínimo de debug via F12 (Console): __idlePins.list() / .rescan()
            window.__idlePins = {
                list: () => pinnedList.map(p => ({ id: p.id, label: p.label })),
                rescan: injetarPinsNosMenus,
                toggle: alternarPinItem
            };

            renderizarBarraFixada();
            posicionarAoLadoDoHunt();
        })();

        // =====================================================================
        // 21-hunt-analyse-reset.js — BOTÃO RÁPIDO DE RESET NA BARRINHA NATIVA
        // (📊 Hunt Analyse)
        // =====================================================================
        // Porta de scripts/21-modal-cidade.js (dev), só a parte do botão --
        // o resto daquele arquivo é o "Master Reset" do motor de Auto Hunt
        // (zera contadores locais que não existem aqui) e não se aplica ao
        // client. O reset em si (`huntReset`) é uma ação do SERVIDOR do jogo,
        // chamada via apiTest (scripts/18-api-helpers.js) -- não depende de
        // motor nenhum.
        //
        // #mini-hunt é do jogo, não do userscript, e o próprio jogo reescreve
        // o innerHTML dela a cada tick -- um botão inserido DENTRO dela seria
        // apagado no próximo refresh. O botão aqui é um elemento à parte que
        // PERSEGUE o retângulo dela a cada 150ms (mesma ideia de
        // `docaAncorarTodas`, 09b-doca.js): arrastar a barra move o botão
        // junto no próximo tick, sem tocar em como ela se move.
        // =====================================================================
        function montarBotaoResetMiniHunt() {
            const barra = document.getElementById('mini-hunt');
            if (!barra) return;

            let btn = document.getElementById('ha-mini-hunt-reset');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'ha-mini-hunt-reset';
                btn.type = 'button';
                btn.title = 'Reiniciar Hunt Analyse (sem abrir o painel)';
                btn.textContent = '🔄';
                btn.style.cssText = 'position:fixed;z-index:26;display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #2a3d55;border-top-left-radius:0;border-bottom-left-radius:0;'
                    + 'color:#8b97a5;cursor:pointer;font-size:12px;padding:0 10px;line-height:1;';
                btn.onmouseenter = () => { btn.style.color = '#7fd1ff'; btn.style.borderColor = '#37475c'; };
                btn.onmouseleave = () => { btn.style.color = '#8b97a5'; btn.style.borderColor = '#2a3d55'; };
                btn.onclick = async ev => {
                    ev.stopPropagation();
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    try {
                        if (typeof w.Y === 'function') await w.Y('huntReset');
                        else await apiTest('huntReset');
                    } catch (e) { }
                    logEvent('🔄 <b>Hunt Analyse reiniciada</b> (barra rápida)', '#38bdf8');
                };
                document.body.appendChild(btn);
            }

            // Encosta no lado direito da barra: tira o arredondado e a borda
            // do lado que gruda. Não mexe em `position`/`left`/`top` dela.
            if (barra.dataset.haFlat !== '1') {
                barra.dataset.haFlat = '1';
                barra.style.borderTopRightRadius = '0';
                barra.style.borderBottomRightRadius = '0';
                barra.style.borderRight = 'none';
            }

            const escondida = barra.classList.contains('hidden') || getComputedStyle(barra).display === 'none';
            btn.style.display = escondida ? 'none' : 'flex';
            if (!escondida) {
                const r = barra.getBoundingClientRect();
                btn.style.left = Math.round(r.right) + 'px';
                btn.style.top = Math.round(r.top) + 'px';
                btn.style.height = Math.round(r.height) + 'px';
            }
        }
        // 150ms: rápido o bastante pra o botão acompanhar o arrasto da barra
        // sem lag visível, e barato -- é só um getBoundingClientRect.
        setInterval(montarBotaoResetMiniHunt, 150);
        montarBotaoResetMiniHunt();

        // =====================================================================
        // 23-status-bridge.js — window.__getTabInfo / window.__obterDashboardStatus
        // =====================================================================
        // Versao simplificada e AUTOSSUFICIENTE das pontes que o shell consome
        // via wv.executeJavaScript (sprite/nome na aba, XP Tracker, Mini
        // Dashboard). As originais do dev (scripts/37-tabinfo.js,
        // scripts/37c-dashboard-status-api.js) leem de variaveis internas do
        // Auto Hunt (pokeAtivoInfo, ultimoStateGeral, sessao, xpPorSeg...) que
        // nao existem aqui -- essas dependiam do motor de automacao inteiro so
        // pra ler dado que o SERVIDOR ja manda pronto.
        //
        // Aqui le-se direto do estado do jogo (window.K / window.gameState):
        //   - player / active vem prontos do servidor a cada tick;
        //   - hunt.xp / hunt.secs / hunt.pxp sao contadores DO SERVIDOR desde
        //     que a caçada começou (manual ou nao) -- a mesma taxa de XP/s
        //     que o dev calculava, sem precisar de nenhum sampler local.
        // Sem caçada ativa (`hunt` vazio), o ETA some ('—') em vez de errar.
        // =====================================================================
        function __statusFmtTempoCurto(seg) {
            if (seg == null || !isFinite(seg) || seg <= 0) return '—';
            const d = Math.floor(seg / 86400);
            const h = Math.floor((seg % 86400) / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = Math.floor(seg % 60);
            if (d > 0) return d + 'd ' + h + 'h';
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm ' + s + 's';
            return s + 's';
        }

        function __statusJanelaJogo() {
            return (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
        }

        // `window.K`/`window.gameState` NAO sao globais do jogo -- quem os
        // preenchia era o proprio motor de Auto Hunt, a cada vez que chamava
        // /api/state e guardava o resultado ali (visto em scripts/26 e no
        // carregarInventariosTradeHub do shell). Sem motor nenhum, ninguem
        // faz esse polling e ficam sempre vazios -- por isso trainer/pokemon
        // apareciam em branco. Aqui e um poller proprio, minimo, so pra
        // manter esse cache vivo pras pontes deste arquivo.
        let __statusCache = {};
        async function __statusAtualizarCache() {
            try {
                const w = __statusJanelaJogo();
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || localStorage.getItem('pmi_token') || w.q || w.TOKEN || w.TAB_TOKEN || ''; } catch (e) { }
                const url = tok ? ('/api/state?token=' + encodeURIComponent(tok)) : '/api/state';
                const res = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
                const s = res && (res.state || res);
                if (s && typeof s === 'object') {
                    __statusCache = s;
                    w.K = s;
                    w.gameState = s;
                }
            } catch (e) { }
        }
        __statusAtualizarCache();
        setInterval(__statusAtualizarCache, 4000);
        setInterval(__statusPintarEtaCardOficial, 2000);
        __statusPintarEtaCardOficial();

        // ---------- Selo de ETA direto no CARD NATIVO do jogo ----------
        // O dev injeta um <span> irmao de #pp-poke-lv e #pp-exp-pct -- o
        // jogo so troca o textContent DAQUELES nos a cada tick, entao o
        // nosso span do lado sobrevive sem MutationObserver nenhum. E o
        // "XP Tracker" que aparece dentro do proprio card do jogo (o com
        // botao Evoluir/Bônus), nao um painel separado.
        function __statusFmtNum(v) { return Number(v || 0).toLocaleString('pt-BR'); }
        function __statusFmtTempoMini(seg) {
            if (!Number.isFinite(seg) || seg <= 0) return '';
            if (seg > 86400 * 3) return '> 72h';
            seg = Math.round(seg);
            const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
            if (h > 0) return h + 'h';
            if (m > 0) return m + 'm';
            return (seg % 60) + 's';
        }
        function __statusSeloCard(id, refId, cor, alinharDireita) {
            const ref = document.getElementById(refId);
            if (!ref || !ref.parentNode) return null;
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('span');
                el.id = id;
                // `white-space:normal` (nao nowrap) de proposito: a linha do
                // Treinador ("EXP x% · Nx stage") ja vem cheia do proprio
                // jogo, e o texto que a gente emenda no fim (tempo + numero
                // de kills) as vezes nao cabe no resto da largura -- sem
                // poder quebrar linha ele vazava pra fora do card.
                el.style.cssText = 'font-size:10px;font-weight:700;white-space:normal;overflow-wrap:anywhere;color:' + cor +
                    (alinharDireita ? ';margin-left:auto' : ';margin-left:5px');
                ref.parentNode.appendChild(el);
            }
            return el;
        }
        function __statusPintarEtaCardOficial() {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                const hunt = s.hunt || {};
                const temHunt = hunt && hunt.secs > 0;
                const taxaPoke = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
                const taxaJog = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;
                const xpMedioPoke = (hunt.xp > 0 && hunt.kills > 0) ? Number(hunt.xp) / Number(hunt.kills) : 0;
                const xpMedioJog = (hunt.pxp > 0 && hunt.kills > 0) ? Number(hunt.pxp) / Number(hunt.kills) : 0;

                const sp = __statusSeloCard('idle-eta-poke', 'pp-poke-lv', '#4ade80', true);
                if (sp && act) {
                    const falta = Math.max(0, Number(act.xpNext || 0) - Number(act.xp || 0));
                    const segs = taxaPoke > 0 && falta > 0 ? falta / taxaPoke : Infinity;
                    const kills = (xpMedioPoke > 0 && falta > 0) ? Math.ceil(falta / xpMedioPoke) : null;
                    const t = __statusFmtTempoMini(segs);
                    const k = (kills != null && kills > 0) ? ` · ≈${__statusFmtNum(kills)}x` : '';
                    sp.title = 'Tempo e nº de pokémons estimados para o pokémon ativo subir de nível';
                    sp.textContent = t ? '⏳ ' + t + k : '';
                }

                const sj = __statusSeloCard('idle-eta-jog', 'pp-exp-pct', '#fbbf24', false);
                if (sj) {
                    const falta = Math.max(0, Number(p.xpNext || 0) - Number(p.xp || 0));
                    const segs = taxaJog > 0 && falta > 0 ? falta / taxaJog : Infinity;
                    const kills = (xpMedioJog > 0 && falta > 0) ? Math.ceil(falta / xpMedioJog) : null;
                    const t = __statusFmtTempoMini(segs);
                    const k = (kills != null && kills > 0) ? ` · ≈${__statusFmtNum(kills)}x` : '';
                    sj.title = 'Tempo e nº de pokémons estimados para você subir de nível';
                    sj.textContent = t ? '· ⏳ ' + t + k : '';
                }
            } catch (e) { }
        }

        function __statusEstadoBruto() {
            const w = __statusJanelaJogo();
            if (w.K && typeof w.K === 'object' && Object.keys(w.K).length) return w.K;
            if (w.gameState && typeof w.gameState === 'object' && Object.keys(w.gameState).length) return w.gameState;
            return __statusCache;
        }

        // ---------- Ponte 1: nome/aba (usada pelo shell/19 pro sprite e título) ----------
        window.__getTabInfo = function () {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                let trainer = p.name || '';
                if (!trainer) {
                    try {
                        const el = document.querySelector('#stat-jog-name');
                        if (el) trainer = el.textContent.replace(/[\u{1F3AE}\u{1F43E}⚡]/gu, '').replace(/Treinador/gi, '').trim();
                    } catch (e) { }
                }
                return JSON.stringify({ poke: (act && act.name) || '', lv: (act && act.level) || '', trainer: trainer });
            } catch (e) { return '{}'; }
        };

        // ---------- Ponte 2: Mini Dashboard / Dashboard 4x ----------
        window.__obterDashboardStatus = function () {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                const hunt = s.hunt || {};
                const bag = Array.isArray(s.bag) ? s.bag : [];
                const balls = s.balls || {};
                const pots = s.potions || {};

                let ultraBalls = Number(balls.ultra || balls['ultra ball'] || 0);
                let ultraPotions = Number(pots.ultra || pots.hyper || pots['ultra potion'] || 0);
                let revives = Number(pots.revive || 0);
                bag.forEach(it => {
                    if (!it || !it.name) return;
                    const n = String(it.name).toLowerCase();
                    const count = Number(it.count || it.qty || 1);
                    if (ultraBalls === 0 && n.includes('ultra ball')) ultraBalls += count;
                    if (ultraPotions === 0 && (n.includes('ultra pot') || n.includes('hyper pot'))) ultraPotions += count;
                    if (revives === 0 && n.includes('revive')) revives += count;
                });

                // Taxa de XP/s: contador do SERVIDOR desde que a caçada começou.
                // Sem `hunt.secs` (nunca caçou nesta sessão) fica sem taxa -> ETA '—'.
                const temHunt = hunt && hunt.secs > 0;
                const taxaPokeSec = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
                const taxaJogSec = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;

                const pExp = Number(p.xp || 0);
                const pExpNext = Number(p.xpNext || 0);
                const pExpPct = p.xpPct != null ? Number(p.xpPct) : (pExpNext > 0 ? Math.min(100, Math.round((pExp / pExpNext) * 100)) : 0);
                const trainerFaltaXp = Math.max(0, pExpNext - pExp);
                const trainerEtaSeg = (taxaJogSec > 0 && trainerFaltaXp > 0) ? (trainerFaltaXp / taxaJogSec) : null;

                let actInfo = null;
                if (act && act.name) {
                    const pkExp = Number(act.xp || act.exp || 0);
                    const pkExpNext = Number(act.xpNext || act.expNext || 0);
                    const pkExpPct = act.expPct != null ? Number(act.expPct)
                        : (act.pct != null ? Number(act.pct) : (pkExpNext > 0 ? Math.min(100, Math.round((pkExp / pkExpNext) * 100)) : 0));
                    const pokeFaltaXp = Math.max(0, pkExpNext - pkExp);
                    const pokeEtaSeg = (taxaPokeSec > 0 && pokeFaltaXp > 0) ? (pokeFaltaXp / taxaPokeSec) : null;
                    actInfo = {
                        id: act.id,
                        name: act.name,
                        level: Number(act.level || 1),
                        shiny: !!act.shiny,
                        hp: Math.round(Number(act.hp || 0)),
                        maxHp: Math.round(Number(act.maxHp || 100)),
                        exp: pkExp,
                        expNext: pkExpNext,
                        expPct: Math.round(pkExpPct),
                        expFalta: pokeFaltaXp,
                        expEtaSeg: pokeEtaSeg,
                        expEta: __statusFmtTempoCurto(pokeEtaSeg),
                        xpPorSeg: taxaPokeSec,
                        dps: Number(act.dps || 0),
                        power: Number(act.power || 0),
                        held: act.heldNome || act.held || null,
                        moves: act.moves || []
                    };
                }

                const encName = (s.encounter && s.encounter.name) || (hunt.lock && hunt.lock.name) || '';
                const encInfo = {
                    name: encName || 'Nenhum',
                    level: Number((s.encounter && s.encounter.level) || 1),
                    hp: Math.round(Number((s.encounter && s.encounter.hp) || 0)),
                    maxHp: Math.round(Number((s.encounter && s.encounter.maxHp) || 100)),
                    shiny: !!(s.encounter && s.encounter.shiny),
                    dexKills: 0,
                    dexGoal: 100,
                    dexDone: false,
                    dexPct: 0
                };

                return {
                    trainer: p.name || '',
                    level: Number(p.level || 1),
                    xp: pExp,
                    xpNext: pExpNext,
                    xpPct: Math.round(pExpPct),
                    xpFalta: trainerFaltaXp,
                    xpPorSeg: taxaJogSec,
                    trainerEtaSeg: trainerEtaSeg,
                    trainerEta: __statusFmtTempoCurto(trainerEtaSeg),
                    kills: Number(p.kills || 0),
                    catches: Number(p.catches || 0),
                    totalShinies: Number(p.shinies || 0),
                    gold: Number(p.gold || 0),
                    diamonds: Number(p.diamonds || 0),
                    vip: !!(p.vip || (p.vipUntil && p.vipUntil > Date.now())),
                    active: actInfo,
                    encounter: encInfo,
                    ballsStats: { normalThrown: 0, shinyThrown: 0, targetNormal: 0, targetShiny: 0 },
                    hunt: {
                        active: temHunt,
                        afk: false,
                        target: (hunt.lock && hunt.lock.name) || 'Caçada Livre',
                        kills: Number(hunt.kills || 0),
                        catches: Number(hunt.catches || 0),
                        shinies: Number(hunt.shinies || 0),
                        xpGained: Number(hunt.xp || 0),
                        goldGained: Number(hunt.soldGold || 0),
                        secs: Number(hunt.secs || 0)
                    },
                    inventory: {
                        ultraBalls: ultraBalls,
                        ultraPotions: ultraPotions,
                        revives: revives,
                        balls: balls,
                        bag: bag.map(it => ({
                            name: it.name || 'Item',
                            count: Number(it.count || it.qty || 1),
                            price: Number(it.price || 0),
                            type: it.type || 'loot'
                        })),
                        bagCount: bag.length,
                        boxCount: Array.isArray(s.box) ? s.box.length : 0
                    },
                    pokedex: window.__pokedexStats || { total: 151, caught: 0, missing: 151, pct: 0 }
                };
            } catch (e) {
                return { erro: String((e && e.message) || e) };
            }
        };

        if (typeof unsafeWindow !== 'undefined' && unsafeWindow && unsafeWindow !== window) {
            unsafeWindow.__getTabInfo = window.__getTabInfo;
            unsafeWindow.__obterDashboardStatus = window.__obterDashboardStatus;
        }

        // =====================================================================
        // 23b-xp-tracker-dock.js — DOCA DO XP TRACKER NO CARD DO TREINADOR
        // =====================================================================
        // Porta de scripts/28b-xp-tracker-dock.js (dev) pro client. O card
        // oficial do jogo (#player-panel) já ganha os selos de ETA em
        // 23-status-bridge.js (__statusPintarEtaCardOficial): "21m · ≈506x" ao
        // lado do nível do Pokémon e do EXP do treinador. O que não cabe ali —
        // XP/h, tempo de caçada, abates — vive nesta doca, atrás de uma
        // lingueta colada na borda do card. Oculta por padrão.
        //
        // Fonte do dado: no dev isso lê window.__idleSuiteXpStatus (montado
        // pelo motor de Auto Hunt). O client não tem esse motor, então aqui
        // os mesmos números são montados direto do estado do jogo, do mesmo
        // jeito que __statusPintarEtaCardOficial já faz em 23-status-bridge.js
        // (__statusEstadoBruto / hunt.xp / hunt.secs / hunt.pxp do servidor).
        //
        // Infra de doca (arrastar, ancorar, recolher) vem de 09b-doca.js.
        // =====================================================================

        let _dockXpTreinador = null;

        function garantirBotaoDockXpTreinador() {
            const panel = document.getElementById('player-panel');
            if (!panel) return;

            const existente = document.getElementById('ppxp-dock-toggle');
            if (existente && existente.isConnected) return;

            if (getComputedStyle(panel).position === 'static') {
                panel.style.position = 'relative';
            }

            const btn = document.createElement('button');
            btn.id = 'ppxp-dock-toggle';
            btn.type = 'button';
            btn.title = 'Abrir XP Tracker completo';
            btn.textContent = '›';
            btn.style.cssText = 'position:absolute; top:50%; right:-13px; z-index:5;'
                + 'width:13px; height:40px; padding:0; line-height:1;'
                + 'display:flex; align-items:center; justify-content:center;'
                + 'font-size:13px; font-weight:700; cursor:pointer;'
                + 'background:rgba(15,23,42,.92); border:1px solid rgba(148,163,184,.35); border-left:none;'
                + 'border-radius:0 7px 7px 0; box-shadow:2px 0 8px rgba(0,0,0,.4);'
                + 'color:#94a3b8; transition:background .15s, border-color .15s, color .15s;';
            btn.onmouseenter = function () { if (!_dockXpTreinador || !_dockXpTreinador.aberta()) btn.style.color = '#f1f5f9'; };
            btn.onmouseleave = function () { pintarBotaoDockXpTreinador(!!(_dockXpTreinador && _dockXpTreinador.aberta())); };
            btn.onclick = function (ev) { ev.stopPropagation(); toggleDockXpTreinador(); };
            panel.appendChild(btn);

            const abertoAgora = !!(_dockXpTreinador && _dockXpTreinador.aberta());
            pintarBotaoDockXpTreinador(abertoAgora);
        }

        function pintarBotaoDockXpTreinador(aberto) {
            const btn = document.getElementById('ppxp-dock-toggle');
            if (!btn) return;
            btn.style.transform = 'translateY(-50%) rotate(' + (aberto ? '180' : '0') + 'deg)';
            btn.style.background = aberto ? 'rgba(34,197,94,.25)' : 'rgba(15,23,42,.92)';
            btn.style.borderColor = aberto ? 'rgba(34,197,94,.55)' : 'rgba(148,163,184,.35)';
            btn.style.color = aberto ? '#86efac' : '#94a3b8';
            btn.title = aberto ? 'Fechar XP Tracker completo' : 'Abrir XP Tracker completo';
        }

        function linhaXpDock(prefixoId, emoji, cor) {
            return '<div style="display:flex; flex-direction:column; gap:3px; margin-bottom:9px">'
                + '<div style="display:flex; align-items:center; justify-content:space-between; gap:6px">'
                + '<div style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">'
                + '<span style="font-size:11px; flex-shrink:0">' + emoji + '</span>'
                + '<span id="' + prefixoId + '-name" style="font-size:11px; font-weight:800; color:' + cor + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">--</span>'
                + '<span id="' + prefixoId + '-lv" style="font-size:9px; background:rgba(148,163,184,.15); border:1px solid rgba(148,163,184,.3); color:#cbd5e1; padding:0 4px; border-radius:4px; font-weight:800; font-family:\'SF Mono\',monospace; flex-shrink:0">Lv.--</span>'
                + '</div>'
                + '<span id="' + prefixoId + '-pct" style="font-size:11px; font-weight:900; color:' + cor + '; font-family:\'SF Mono\',monospace; flex-shrink:0">0%</span>'
                + '</div>'
                + '<div style="width:100%; height:5px; background:rgba(15,23,42,.9); border-radius:3px; overflow:hidden; border:1px solid rgba(148,163,184,.2)">'
                + '<div id="' + prefixoId + '-fill" style="width:0%; height:100%; border-radius:3px; background:' + cor + '; transition:width .3s"></div>'
                + '</div>'
                + '<div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8">'
                + '<span id="' + prefixoId + '-falta">--</span>'
                + '<span id="' + prefixoId + '-eta" style="color:#fde047; font-weight:700">⏳ --</span>'
                + '</div>'
                + '<div id="' + prefixoId + '-taxa" style="font-size:9px; color:#64748b">XP/h: --</div>'
                + '</div>';
        }

        function garantirDockXpTreinador() {
            if (_dockXpTreinador) return _dockXpTreinador;
            _dockXpTreinador = docaCriar({
                id: 'ppxp-dock', titulo: '📈 XP Tracker completo', lado: 'direita',
                largura: 250, ancora: 'player-panel', independente: true
            });
            _dockXpTreinador.corpo.innerHTML =
                linhaXpDock('ppxp-dock-poke', '🐾', '#4ade80') +
                linhaXpDock('ppxp-dock-jog', '🧑', '#fbbf24');
            return _dockXpTreinador;
        }

        function toggleDockXpTreinador() {
            const d = garantirDockXpTreinador();
            const abrir = !d.aberta();
            d.mostrar(abrir, true);
            pintarBotaoDockXpTreinador(abrir);
            if (abrir) atualizarConteudoDockXpTreinador();
        }

        // Monta o mesmo formato que window.__idleSuiteXpStatus tinha no dev,
        // só que a partir do estado que 23-status-bridge.js já lê do servidor
        // (__statusEstadoBruto), sem depender de motor de auto-hunt nenhum.
        function _lerXpStatusDock() {
            const s = __statusEstadoBruto();
            const p = s.player || {};
            const team = Array.isArray(s.team) ? s.team : [];
            const act = s.active || team.find(x => x && x.active) || team[0] || null;
            const hunt = s.hunt || {};
            const temHunt = hunt && hunt.secs > 0;
            const taxaPoke = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
            const taxaJog = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;

            function montarBloco(entidade, taxa) {
                if (!entidade) return null;
                const xp = Number(entidade.xp || entidade.exp || 0);
                const xpNext = Number(entidade.xpNext || entidade.expNext || 0);
                const pct = entidade.xpPct != null ? Number(entidade.xpPct)
                    : (entidade.expPct != null ? Number(entidade.expPct)
                        : (xpNext > 0 ? Math.min(100, Math.round((xp / xpNext) * 100)) : 0));
                const falta = Math.max(0, xpNext - xp);
                const segs = taxa > 0 && falta > 0 ? falta / taxa : Infinity;
                return {
                    name: entidade.name || '--',
                    level: entidade.level || '--',
                    shiny: !!entidade.shiny,
                    pct: pct,
                    pctText: pct + '%',
                    falta: falta > 0 ? __statusFmtNum(Math.round(falta)) + ' XP restante' : '—',
                    eta: __statusFmtTempoCurto(segs)
                };
            }

            return {
                poke: montarBloco(act, taxaPoke),
                jog: montarBloco(p, taxaJog),
                hunt: { taxaPoke: taxaPoke, taxaJog: taxaJog, secs: Number(hunt.secs || 0), kills: Number(hunt.kills || 0) }
            };
        }

        function atualizarConteudoDockXpTreinador() {
            if (!_dockXpTreinador || !_dockXpTreinador.aberta()) return;
            const s = _lerXpStatusDock();

            function preencher(prefixo, dado) {
                if (!dado) return;
                const elName = document.getElementById(prefixo + '-name');
                const elLv = document.getElementById(prefixo + '-lv');
                const elPct = document.getElementById(prefixo + '-pct');
                const elFill = document.getElementById(prefixo + '-fill');
                const elFalta = document.getElementById(prefixo + '-falta');
                const elEta = document.getElementById(prefixo + '-eta');
                const pct = Math.max(0, Math.min(100, Number(dado.pct) || 0));
                if (elName) elName.textContent = (dado.shiny ? '✨ ' : '') + (dado.name || '--');
                if (elLv) elLv.textContent = 'Lv.' + (dado.level || '--');
                if (elPct) elPct.textContent = dado.pctText || (pct + '%');
                if (elFill) elFill.style.width = pct + '%';
                if (elFalta) elFalta.textContent = dado.falta || '—';
                if (elEta) elEta.textContent = dado.eta ? (dado.eta.indexOf('⏳') === 0 ? dado.eta : '⏳ ' + dado.eta) : '⏳ --';
            }

            preencher('ppxp-dock-poke', s.poke);
            preencher('ppxp-dock-jog', s.jog);

            const h = s.hunt || {};
            const taxaPokeH = h.taxaPoke > 0 ? Math.round(h.taxaPoke * 3600).toLocaleString('pt-BR') : '--';
            const taxaJogH = h.taxaJog > 0 ? Math.round(h.taxaJog * 3600).toLocaleString('pt-BR') : '--';
            const elTaxaPoke = document.getElementById('ppxp-dock-poke-taxa');
            const elTaxaJog = document.getElementById('ppxp-dock-jog-taxa');
            if (elTaxaPoke) elTaxaPoke.textContent = 'XP/h: ' + taxaPokeH;
            if (elTaxaJog) elTaxaJog.textContent = 'XP/h: ' + taxaJogH;

            const secs = Number(h.secs) || 0;
            const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60);
            const tempo = hh > 0 ? (hh + 'h ' + mm + 'm') : (mm + 'm');
            _dockXpTreinador.rodape.textContent = secs > 0
                ? ('⏱️ ' + tempo + ' de caçada · ⚔️ ' + Number(h.kills || 0).toLocaleString('pt-BR') + ' kills')
                : '';
        }

        garantirBotaoDockXpTreinador();
        setInterval(function () {
            garantirBotaoDockXpTreinador();
            atualizarConteudoDockXpTreinador();
        }, 1000);

        // =====================================================================
        // 35-doca-inventario.js — DOCA DO INVENTÁRIO
        // =====================================================================
        // Card acoplado à DIREITA da mochila do jogo, com a descrição de cada
        // item escrita na tela. O problema que resolve: hoje a descrição só
        // existe no `title` do slot, então saber o que se tem na mochila é
        // passar o mouse item a item — e o texto já vem pronto do servidor.
        //
        // ── Onde ancora, e por que dá pra ancorar ──
        // O md deste trabalho dizia que Equipe e Inventário "montam o modal na
        // hora, sem id estável", e que seria preciso MutationObserver. Não é o
        // caso: `openBag()` monta só o CONTEÚDO e entrega pro `openModal()`,
        // que injeta em #modal-body, dentro de #modal, dentro de #modal-bg —
        // markup ESTÁTICO do play.html. A âncora é #modal, e é tão estável
        // quanto o nosso próprio painel.
        //
        // E clicar aqui não fecha a mochila: o `Wi.onclick` do jogo só fecha
        // quando `event.target === Wi`, e a doca é irmã no body, não
        // descendente do modal.
        //
        // ── Infra ──
        // Arrastar, ancorar, recolher e casar altura vêm da doca genérica
        // (09b-doca.js), a mesma das duas docas do Ginásio. O `ancora` dela já
        // era configurável — só nunca tinha apontado pra fora do nosso painel.
        //
        // ── Abertura ──
        // Dois caminhos, de propósito: envelopamos `window.openBag` (pega
        // inclusive o redesenho automático depois de fundir bolas, que
        // re-chama openBag) E conferimos o estado no tick de 400ms. Se o
        // envelope falhar — o jogo é minificado e muda —, o tick ainda abre e
        // fecha a doca na hora certa.
        //
        // ── Volume ──
        // O md falava em "~137 mil itens". Isso é a soma dos `count` (52.583
        // Ultra Balls num state real); as LINHAS distintas são ~32 (19 no bag +
        // 7 bolas + 6 poções). Por isso aqui é uma lista rolável simples, sem
        // virtualização: otimizar pra 137 mil seria otimizar pro número errado.
        // =====================================================================

        let _docaInv = null;
        let _docaInvOrdem = 'tipo';
        let _docaInvBusca = '';
        let _docaInvSig = '';
        let _docaInvScroll = 0;       // posição de leitura, preservada entre redesenhos
        // gaveta + '|' + chave do item aberto na coluna da ficha — NUNCA só a
        // chave. Bola e poção COMPARTILHAM chave crua no jogo ("ultra" é tanto
        // a Ultra Ball quanto a Ultra Potion — mesmo furo que o shell/48 já
        // documentou pro sprite). `chave` sozinha em `todas.find` sempre
        // devolvia a BOLA (ela nasce primeiro na lista): clicar na Ultra
        // Potion abria a ficha da Ultra Ball. `gaveta` desempata porque cada
        // linha só existe numa gaveta.
        let _docaInvSel = null;
        function docaInvChaveSel(l) { return l.gaveta + '|' + l.chave; }
        function docaInvSelPartes(sel) {
            if (!sel) return null;
            const i = sel.indexOf('|');
            return i < 0 ? null : { gaveta: sel.slice(0, i), chave: sel.slice(i + 1) };
        }

        // ── MODO DE VISTA ──────────────────────────────────────────────────
        // Três NÍVEIS de tela, não três arranjos de coluna. Depois que clicar no
        // item (aqui ou na grade do jogo) passou a funcionar, a lista completa
        // deixou de ser o caminho principal: ela virou a tela de quem está
        // vasculhando, não de quem quer saber o que uma coisa faz.
        //
        //   card    (padrão) — só a ficha do item clicado. É o uso comum.
        //   hibrido          — ficha + lista LIMPA (busca e linhas soltas, sem
        //                      cabeçalho de gaveta nem índice). Pra achar sem
        //                      sair da ficha.
        //   full             — a lista inteira: gavetas, índice, ordenação,
        //                      densidade. Pra inventariar de verdade.
        const DOCA_INV_VISTA_KEY = 'bugSuiteInvVista';
        let _docaInvVista = 'card';
        try {
            const v = localStorage.getItem(DOCA_INV_VISTA_KEY);
            // Os nomes antigos ('ambos'/'lista'/'ficha') viram os novos em vez
            // de cair num modo inválido e desenhar tela em branco.
            _docaInvVista = { ambos: 'hibrido', lista: 'full', ficha: 'card' }[v] || v || 'card';
        } catch (e) { }
        if (['card', 'hibrido', 'full'].indexOf(_docaInvVista) < 0) _docaInvVista = 'card';

        const INV_VISTAS = [
            { chave: 'card', icone: '▤', titulo: 'Só a ficha do item clicado' },
            { chave: 'hibrido', icone: '▥', titulo: 'Ficha + lista enxuta com busca' },
            { chave: 'full', icone: '☰', titulo: 'Lista completa: gavetas, índice e ordenação' }
        ];

        function docaInvTrocarVista(v) {
            _docaInvVista = v;
            try { localStorage.setItem(DOCA_INV_VISTA_KEY, v); } catch (e) { }
            docaInvDesenhar(true);
            docaInvAplicarLarguras();
        }

        function docaInvMarcarVista() {
            if (!_docaInv) return;
            _docaInv.el.querySelectorAll('.doca-bt[data-vista]').forEach(b => {
                b.classList.toggle('vista-on', b.dataset.vista === _docaInvVista);
            });
        }

        function docaInvColunas() {
            if (_docaInvVista === 'full') return { lista: true, ficha: !!_docaInvSel, limpa: false };
            if (_docaInvVista === 'hibrido') return { lista: true, ficha: true, limpa: true };
            return { lista: false, ficha: true, limpa: false };
        }

        // Densidade da lista. 'compacta' = uma linha por item (a lista vira
        // índice, e a descrição inteira vive na doca de detalhe); 'confortavel'
        // = a descrição também na lista. É preferência, então persiste.
        const DOCA_INV_DENS_KEY = 'bugSuiteDocaInvDensidade';
        let _docaInvDens = 'compacta';
        try { _docaInvDens = localStorage.getItem(DOCA_INV_DENS_KEY) || 'compacta'; } catch (e) { }
        let _docaInvTmCache = null;   // itemKey -> ficha do catálogo do ginásio
        let _docaInvTmBuscando = false;

        // ── SPRITES REAIS DOS ITENS ────────────────────────────────────────
        // `createSpriteCanvas(look, px)` do jogo desenha POKÉMON — recebe um
        // "look"/lookType de espécie, é o que o 37b usa pra pintar a zona de
        // caça e o 26 guarda como `lookType`. Item não tem "look" nenhum: o
        // `cid` de item é outro número, e passá-lo pra essa função não
        // desenhava nada. A caixa ficava em BRANCO em vez de cair no emoji,
        // porque o HTML só escrevia o emoji quando `l.cid` já vinha vazio do
        // 14b — com cid presente (held/boss/TM, que o /api/meta dá pronto) o
        // emoji nem entrava no DOM, sobrando um quadrado vazio quando o
        // desenho falhava calado.
        //
        // O jogo resolve item por IMAGEM, não canvas: `sprites/item_<cid>.png`
        // — o mesmo levantamento que shell/48-sprites-itens-jogo.js fez pra
        // Central de Trade (`sprites/icons.json` + campos do /api/meta).
        // Rodando aqui DENTRO da página do jogo (mesma origem), dá pra buscar
        // direto, sem o bridge de webview que o shell precisa.
        //
        // Bola e poção nem têm cid no /api/meta (só stones/balls trazem
        // itemId, held/TM trazem cid/spriteCid — ver 14b) — por isso elas
        // caíam sempre no emoji. O mapa do icons.json cobre esse resto pelo
        // NOME do item.
        const DOCA_INV_SPRITES_CACHE_KEY = 'bugSuiteItemSpriteCids';
        const DOCA_INV_SPRITES_TTL_MS = 24 * 60 * 60 * 1000; // 1 dia
        let _docaInvSpriteMapa = null;
        let _docaInvSpriteCarregando = false;

        // minusculo, sem acento, sem quebra de linha — mesma normalização do
        // shell/48, pra "berry crítica" (mochila) casar com "berry critica"
        // (icons.json) e "heart\nstone" (meta) com "heart stone".
        function docaInvNomeSprite(nome) {
            return String(nome == null ? '' : nome)
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function docaInvLerCacheSprites() {
            try {
                const cru = localStorage.getItem(DOCA_INV_SPRITES_CACHE_KEY);
                if (!cru) return null;
                const o = JSON.parse(cru);
                return (o && o.mapa && typeof o.mapa === 'object') ? o : null;
            } catch (e) { return null; }
        }

        function docaInvSalvarCacheSprites(mapa) {
            try { localStorage.setItem(DOCA_INV_SPRITES_CACHE_KEY, JSON.stringify({ at: Date.now(), mapa })); } catch (e) { }
        }

        async function docaInvBaixarMapaSprites() {
            const mapa = {};
            const por = (obj, sufixo, sobrescrever) => {
                if (!obj || typeof obj !== 'object') return;
                for (const [nome, cid] of Object.entries(obj)) {
                    const n = docaInvNomeSprite(nome) + (sufixo || '');
                    const c = Number(cid) || 0;
                    if (!n || !c) continue;
                    if (sobrescrever === false && mapa[n]) continue;
                    mapa[n] = c;
                }
            };
            try {
                const icons = await fetch('/sprites/icons.json').then(r => r.json());
                por(icons && icons.loot);
                por(icons && icons.misc);
                // balls/potions COMPARTILHAM chave ("ultra","great","hyper"):
                // cada grupo entra com o sufixo de como aparece na mochila, e
                // só depois — sem sobrescrever — a chave nua, pro Revive (que
                // não vira "revive potion") continuar achando.
                por(icons && icons.balls, ' ball');
                por(icons && icons.potions, ' potion');
                por(icons && icons.balls, '', false);
                por(icons && icons.potions, '', false);
            } catch (e) { /* segue só com o cid que o 14b já casou no meta */ }
            return mapa;
        }

        // Idempotente: dispara o download uma vez, guarda em cache e redesenha
        // a doca quando o mapa chega — a primeira chamada quase sempre acontece
        // antes do fetch responder, então devolve null e o redesenho seguinte
        // é que pinta o sprite de verdade.
        function docaInvGarantirSprites() {
            if (_docaInvSpriteMapa) return _docaInvSpriteMapa;
            if (_docaInvSpriteCarregando) return null;
            const cache = docaInvLerCacheSprites();
            if (cache) {
                _docaInvSpriteMapa = cache.mapa;
                if (Date.now() - (cache.at || 0) <= DOCA_INV_SPRITES_TTL_MS) return _docaInvSpriteMapa;
            }
            _docaInvSpriteCarregando = true;
            docaInvBaixarMapaSprites().then(mapa => {
                _docaInvSpriteCarregando = false;
                if (mapa && Object.keys(mapa).length) {
                    _docaInvSpriteMapa = mapa;
                    docaInvSalvarCacheSprites(mapa);
                    docaInvDesenhar(true);
                }
            }).catch(() => { _docaInvSpriteCarregando = false; });
            return _docaInvSpriteMapa;
        }

        // cid de um item: o que o 14b já casou no /api/meta (held/boss/TM/
        // pedra, quando existir) vale mais — é o MESMO cid que o jogo usa pra
        // esse item. O mapa do icons.json é o resto (bola, poção, itens sem
        // cid no meta).
        //
        // ⚠️ A chave NUA ("ultra") é AMBÍGUA — bola e poção compartilham ela
        // no icons.json, e a mochila devolve o item por essa chave crua, sem
        // sufixo nenhum (`l.nome` de poção é "ultra", não "ultra potion").
        // docaInvBaixarMapaSprites já registra "ultra ball" e "ultra potion"
        // SEPARADOS pra isso — mas só ajuda se a busca tentar o sufixo da
        // PRÓPRIA gaveta antes da chave nua. Sem o `gaveta` aqui, a Ultra
        // Potion caía na chave nua "ultra", que o merge preenche com a
        // primeira bola que passar (balls entra antes de potions) — Great
        // Potion e Ultra Potion saíam com o sprite da BOLA homônima.
        function docaInvCidItem(cidMeta, nome, gaveta) {
            const direto = Number(cidMeta) || 0;
            if (direto) return direto;
            const mapa = docaInvGarantirSprites();
            if (!mapa) return 0;
            const n = docaInvNomeSprite(nome);
            if (gaveta === 'ball' && mapa[n + ' ball']) return mapa[n + ' ball'];
            if (gaveta === 'potion' && mapa[n + ' potion']) return mapa[n + ' potion'];
            if (mapa[n]) return mapa[n];
            const semSufixo = n.replace(/\s+(ball|potion)$/, '');
            return (semSufixo !== n && mapa[semSufixo]) || 0;
        }

        // `sprites/item_<cid>.png` às vezes é uma FOLHA (pokébola vem 128×64,
        // 4 fases × 2 direções); o jogo desenha só o primeiro quadro 32×32 do
        // canto superior esquerdo. Por isso o recorte: caixa 32×32 com
        // overflow escondido, e a caixa inteira escalada por transform pro
        // tamanho final — escalar só a imagem esticaria a folha toda e
        // apareceriam pedaços dos quadros vizinhos.
        function docaInvHtmlSprite(cid, px) {
            const escala = (px / 32).toFixed(3);
            return `<span class="di-spr" style="width:${px}px;height:${px}px">`
                + `<span class="di-spr-crop" style="transform:scale(${escala})">`
                + `<img src="/sprites/item_${cid}.png?v=walk1" alt="" loading="lazy" />`
                + `</span></span>`;
        }

        function docaInvCss() {
            if (document.getElementById('doca-inventario-css')) return;
            const st = document.createElement('style');
            st.id = 'doca-inventario-css';
            /* Escopo por id: a doca vive no body e não herda nada do painel.
               Sem crases aqui dentro — isto é template literal. */
            st.textContent = `
                /* ── ESTRUTURA ──
                   O corpo da doca (09b) e o container que rola. Aqui ele vira
                   coluna: barra de ferramentas FIXA em cima e a lista rolando
                   embaixo. Sem isso a busca e o indice sumiam ao rolar, que e
                   exatamente quando se quer usar os dois. Sem crases: template. */
                #doca-inventario .doca-corpo { padding:0; display:flex; flex-direction:column; overflow:hidden; }
                /* A regra de recolher do 09b e ".doca.recolhida .doca-corpo"
                   (3 classes). A minha acima tem ID, e ID vence qualquer
                   numero de classes — sem esta linha o botao de recolher
                   deixava de esconder o corpo. */
                #doca-inventario.recolhida .doca-corpo, #doca-inventario.recolhida .doca-rodape { display:none; }
                /* DUAS COLUNAS num painel so, com divisoria. Antes eram duas
                   docas: ao recolher, cada uma virava um trilho e a reserva
                   continuava calculada pela largura expandida — os trilhos
                   ficavam boiando longe do jogo. Painel unico mata a classe. */
                #doca-inventario .di-wrap { flex:1; min-height:0; display:flex; }
                #doca-inventario .di-col-lista { flex:1; min-width:0; display:flex; flex-direction:column; }
                #doca-inventario .di-div { flex:none; width:1px; background:linear-gradient(180deg, transparent, rgba(148,163,184,.35) 12%, rgba(148,163,184,.35) 88%, transparent); }
                #doca-inventario .di-col-ficha { flex:none; min-width:0; overflow-y:auto; padding:11px 12px; }
                #doca-inventario .di-col-ficha::-webkit-scrollbar { width:8px; }
                #doca-inventario .di-col-ficha::-webkit-scrollbar-thumb { background:rgba(148,163,184,.25); border-radius:99px; }

                /* A doca fica no TOPO (o z-index da 09b vale). Ela so desce
                   enquanto um popup do jogo esta aberto — ver docaCederAoJogo
                   no 09c. Baixar o z-index de vez consertava o caso do held e
                   quebrava o resto. */
                /* overflow VISIVEL pra fita poder sair da borda; o recorte de
                   canto passa pro corpo, que e quem tem conteudo rolando. */
                #doca-inventario { overflow:visible; }
                #doca-inventario .doca-corpo { border-radius:0 0 13px 13px; }
                #doca-inventario .doca-recolher {
                    position:absolute; right:-15px; top:50%; transform:translateY(-50%);
                    width:16px; height:58px; padding:0; border-radius:0 8px 8px 0;
                    background:rgba(30,41,59,.97); border:1px solid rgba(148,163,184,.3);
                    color:#94a3b8; font-size:10px; line-height:56px; z-index:5;
                    display:block !important; border-left:none;
                }
                #doca-inventario .doca-recolher:hover { color:#7dd3fc; border-color:rgba(56,189,248,.5); }
                /* Recolhida: o botao vai pro TOPO da fita (order:-1). No fluxo
                   normal do header ele nasce DEPOIS do titulo, e numa coluna
                   isso o jogava pro pe da fita, longe do alcance. */
                #doca-inventario.recolhida { overflow:hidden; }
                #doca-inventario.recolhida .doca-recolher {
                    position:static; transform:none; order:-1;
                    width:24px; height:24px; line-height:22px; border-radius:6px;
                    border:1px solid rgba(148,163,184,.3);
                }
                #doca-inventario.recolhida .doca-head { padding:8px 3px; gap:8px; align-items:center; }
                #doca-inventario.recolhida .doca-tit {
                    writing-mode:vertical-rl; text-orientation:mixed;
                    max-height:calc(100% - 60px); overflow:hidden; text-overflow:ellipsis;
                    white-space:nowrap; font-size:11px; letter-spacing:.3px;
                }
                #doca-inventario.recolhida .doca-bt[data-vista] { display:none; }
                #doca-inventario .doca-bt[data-vista].vista-on { background:rgba(56,189,248,.22); border-color:rgba(56,189,248,.5); color:#e0f2fe; }
                #doca-inventario .di-topo { flex:none; padding:8px 10px 6px; border-bottom:1px solid rgba(148,163,184,.12); }
                #doca-inventario .di-linha1 { display:flex; gap:6px; }
                #doca-inventario .di-busca { flex:1; min-width:0; background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:7px; padding:6px 8px; font-size:11px; color:#e2e8f0; font-family:inherit; }
                #doca-inventario .di-busca:focus { outline:none; border-color:rgba(56,189,248,.6); }
                #doca-inventario .di-ordem { background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:7px; padding:6px 4px; font-size:10.5px; color:#e2e8f0; font-family:inherit; }

                /* Indice: as 7 gavetas em uma linha. E atalho E resumo — diz
                   quanto tem de cada coisa sem rolar nada. */
                #doca-inventario .di-chips { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
                #doca-inventario .di-chip { display:flex; align-items:center; gap:3px; font-size:10px; font-weight:800; padding:3px 7px; border-radius:999px; background:rgba(148,163,184,.12); border:1px solid transparent; color:#cbd5e1; cursor:pointer; font-family:inherit; }
                #doca-inventario .di-chip:hover { border-color:rgba(56,189,248,.5); background:rgba(56,189,248,.14); }
                #doca-inventario .di-chip i { font-style:normal; color:#64748b; font-weight:700; }
                #doca-inventario .di-chip.fechada { opacity:.45; }

                #doca-inventario .di-scroll { flex:1; min-height:0; overflow-y:auto; padding:0 10px 10px; }
                #doca-inventario .di-scroll::-webkit-scrollbar { width:8px; }
                #doca-inventario .di-scroll::-webkit-scrollbar-thumb { background:rgba(148,163,184,.25); border-radius:99px; }

                /* Cabecalho de gaveta GRUDADO no topo: rolando a lista longa, e
                   ele que diz onde voce esta. Clicar recolhe a gaveta. */
                #doca-inventario .di-gaveta { position:sticky; top:0; z-index:3; display:flex; align-items:center; gap:6px; padding:7px 4px 5px; margin-top:4px; background:rgba(14,12,28,.97); backdrop-filter:blur(6px); font-size:11px; font-weight:800; color:#bae6fd; cursor:pointer; border-bottom:1px solid rgba(148,163,184,.14); }
                #doca-inventario .di-gaveta:hover { color:#e0f2fe; }
                #doca-inventario .di-gaveta .di-seta { font-size:9px; color:#64748b; width:9px; flex:none; }
                #doca-inventario .di-gaveta .di-tit { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                #doca-inventario .di-gaveta .di-cont { font-size:9px; color:#64748b; font-weight:700; flex:none; }
                #doca-inventario .di-grupo { font-size:8.5px; font-weight:700; color:#7c8899; text-transform:uppercase; letter-spacing:.6px; margin:6px 0 2px 4px; }

                /* ── LINHA DO ITEM ──
                   Duas linhas no MAXIMO, e a segunda so existe quando ha o que
                   dizer. A versao anterior gastava uma linha inteira pra
                   escrever "—" nas bolas, que nao tem desc no servidor. */
                #doca-inventario .di-item { display:flex; gap:7px; align-items:flex-start; padding:4px 5px; border-radius:6px; }
                #doca-inventario .di-item:hover { background:rgba(56,189,248,.09); }
                #doca-inventario .di-item.alerta { box-shadow:inset 2px 0 0 #f59e0b; background:rgba(245,158,11,.06); }
                #doca-inventario .di-ic { width:22px; height:22px; flex:none; display:flex; align-items:center; justify-content:center; font-size:14px; margin-top:1px; }
                #doca-inventario .di-ic canvas, #doca-inventario .di-ic img { image-rendering:pixelated; max-width:22px; max-height:22px; }
                /* SPRITE REAL DO ITEM — recorte de folha (ver docaInvHtmlSprite).
                   .di-spr e a caixa final, do tamanho do icone; .di-spr-crop
                   e o quadro 32x32 fixo, escalado por transform pro tamanho
                   final; a imagem crua fica no tamanho natural dela dentro do
                   recorte, ancorada no canto superior esquerdo. Sem crases:
                   isto vive dentro de template literal. */
                #doca-inventario .di-spr, #doca-inventario .did-ic .di-spr { flex-shrink:0; display:block; position:relative; overflow:hidden; }
                #doca-inventario .di-spr-crop { position:absolute; top:0; left:0; width:32px; height:32px; overflow:hidden; transform-origin:top left; }
                /* Empate de especificidade com ".di-ic img"/".did-ic img" (2 classes
                   + tag cada) resolvia por ORDEM: a regra de max-width:42px do
                   .did-ic, mais abaixo no arquivo, vencia esta aqui e ESPREMIA a
                   folha inteira (varios quadros) pra caber em 42px — o "sprite
                   repetido" que o jogador viu. Um seletor a mais quebra o empate
                   sem depender de onde a regra cai no arquivo. */
                #doca-inventario .di-ic .di-spr-crop img, #doca-inventario .did-ic .di-spr-crop img { position:absolute; top:0; left:0; width:auto; height:auto; max-width:none; max-height:none; image-rendering:pixelated; }
                #doca-inventario .di-txt { min-width:0; flex:1; }
                #doca-inventario .di-l1 { display:flex; gap:7px; align-items:baseline; }
                #doca-inventario .di-nome { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; font-weight:700; color:#e8eef6; }
                /* Quantidade em peso NORMAL e cor fria: a pergunta quase nunca e
                   "quantos", e em laranja forte ela competia com o nome. */
                #doca-inventario .di-vlr { flex:none; text-align:right; min-width:52px; }
                #doca-inventario .di-sub { font-size:9px; font-weight:800; margin-top:2px; font-variant-numeric:tabular-nums; }
                #doca-inventario .di-sub.ouro { color:#fbbf24; }
                #doca-inventario .di-sub.frio { color:#7dd3fc; }
                #doca-inventario .di-sub.verde { color:#4ade80; }
                #doca-inventario .di-sub.tier { display:inline-block; padding:1px 5px; border-radius:4px; border:1px solid rgba(148,163,184,.35); color:#94a3b8; }
                #doca-inventario .di-sub.t-ss, #doca-inventario .di-sub.t-s { color:#f0abfc; border-color:rgba(217,70,239,.45); }
                #doca-inventario .di-sub.t-a { color:#7dd3fc; border-color:rgba(56,189,248,.45); }
                #doca-inventario .di-sub.t-b { color:#fbbf24; border-color:rgba(245,158,11,.4); }
                /* A setinha avisa que o clique NAO abre um card nosso, e sim a
                   tela do jogo. Sem ela o mesmo gesto teria dois resultados
                   diferentes sem nada na tela explicando qual vem. */
                #doca-inventario .di-tela { flex:none; font-size:9px; color:#7dd3fc; opacity:.8; }
                #doca-inventario .di-nome { flex:0 1 auto; }
                #doca-inventario .di-qtd { flex:none; font-size:10.5px; font-weight:600; color:#8b97a5; font-variant-numeric:tabular-nums; }
                #doca-inventario .di-item.muito .di-qtd { color:#cbd5e1; }
                #doca-inventario .di-l2 { font-size:10px; line-height:1.35; color:#8792a3; margin-top:1px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
                #doca-inventario .di-l2 i { font-style:normal; color:#b3c0d1; font-weight:600; }
                #doca-inventario .di-l2.pendente { color:#5c6675; font-style:italic; }
                #doca-inventario .di-l2 b.aviso { color:#fbbf24; font-weight:700; }
                #doca-inventario .di-item mark { background:rgba(56,189,248,.3); color:#e0f2fe; border-radius:2px; padding:0 1px; }

                #doca-inventario .di-vazio { font-size:10.5px; color:#64748b; text-align:center; padding:18px 8px; line-height:1.5; }
                #doca-inventario .di-item.sel { background:rgba(56,189,248,.16); box-shadow:inset 2px 0 0 #38bdf8; }
                #doca-inventario .di-dens { background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:7px; padding:0 7px; font-size:12px; color:#94a3b8; cursor:pointer; font-family:inherit; }
                #doca-inventario .di-dens.oculto { display:none; }
                #doca-inventario .di-dens.on { color:#7dd3fc; border-color:rgba(56,189,248,.45); }

                /* ── DOCA DE DETALHE (esquerda) ──
                   A lista virou indice de uma linha; o texto inteiro mora aqui.
                   Largura medida do espaco real a esquerda do modal — cravar um
                   numero cobriria a mochila em janela estreita. */
                #doca-inventario .did-vazio { font-size:10.5px; color:#64748b; text-align:center; padding:22px 10px; line-height:1.6; }
                #doca-inventario .did-topo { display:flex; gap:10px; align-items:flex-start; padding-bottom:10px; border-bottom:1px solid rgba(148,163,184,.16); }
                #doca-inventario .did-ic { width:48px; height:48px; flex:none; display:flex; align-items:center; justify-content:center; font-size:26px; background:rgba(148,163,184,.08); border-radius:10px; }
                #doca-inventario .did-ic canvas, #doca-inventario .did-ic img { image-rendering:pixelated; max-width:42px; max-height:42px; }
                #doca-inventario .did-id { min-width:0; flex:1; }
                #doca-inventario .did-nome { font-size:14px; font-weight:800; color:#f1f5f9; line-height:1.2; }
                /* Badges na mesma gramatica do card do jogo. */
                #doca-inventario .did-badges { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
                #doca-inventario .bdg { font-size:8.5px; font-weight:800; padding:2px 7px; border-radius:5px; }
                #doca-inventario .bdg.gav { background:rgba(56,189,248,.16); color:#7dd3fc; }
                #doca-inventario .bdg.grp { background:rgba(148,163,184,.16); color:#cbd5e1; }
                #doca-inventario .did-qtd-linha { display:flex; justify-content:space-between; align-items:baseline; font-size:10.5px; color:#8792a3; margin:9px 0 0; }
                #doca-inventario .did-qtd-linha b { font-size:15px; font-weight:800; color:#e2e8f0; font-variant-numeric:tabular-nums; }

                /* NUMERO-HEROI: cada gaveta tem uma pergunta so, e este e o
                   lugar dela. Sem isto o card era uma tabela sem manchete. */
                #doca-inventario .did-hero { display:flex; align-items:center; gap:11px; margin:10px 0 4px; padding:10px 12px; border-radius:11px; border:1px solid; }
                #doca-inventario .did-hero .n { font-size:26px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
                #doca-inventario .did-hero .lado { min-width:0; }
                #doca-inventario .did-hero .lado div:first-child { font-size:10.5px; font-weight:800; color:#e2e8f0; }
                #doca-inventario .did-hero .lado div:last-child { font-size:9px; color:#8792a3; margin-top:2px; }
                #doca-inventario .did-hero.ouro { background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(30,41,59,.35)); border-color:rgba(245,158,11,.3); }
                #doca-inventario .did-hero.ouro .n { color:#fbbf24; }
                #doca-inventario .did-hero.frio { background:linear-gradient(135deg, rgba(56,189,248,.14), rgba(30,41,59,.35)); border-color:rgba(56,189,248,.3); }
                #doca-inventario .did-hero.frio .n { color:#7dd3fc; }
                #doca-inventario .did-hero.verde { background:linear-gradient(135deg, rgba(34,197,94,.14), rgba(30,41,59,.35)); border-color:rgba(34,197,94,.3); }
                #doca-inventario .did-hero.verde .n { color:#4ade80; }
                #doca-inventario .did-hero.tier { background:linear-gradient(135deg, rgba(217,70,239,.14), rgba(30,41,59,.35)); border-color:rgba(217,70,239,.3); }
                #doca-inventario .did-hero.tier .n { color:#f0abfc; }

                #doca-inventario .did-tags { display:flex; flex-wrap:wrap; gap:4px; margin:9px 0; }
                #doca-inventario .tchip { font-size:9.5px; font-weight:700; padding:3px 8px; border-radius:6px; background:rgba(148,163,184,.1); border:1px solid rgba(148,163,184,.2); color:#c3cdda; }
                #doca-inventario .did-sec { font-size:9.5px; font-weight:800; color:#7c8899; text-transform:uppercase; letter-spacing:.6px; margin:12px 0 5px; }
                #doca-inventario .did-desc { font-size:11px; line-height:1.6; color:#c3cdda; }
                #doca-inventario .did-aviso { font-size:10.5px; line-height:1.55; color:#fbbf24; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); border-radius:8px; padding:8px 10px; margin-top:10px; }
                #doca-inventario .did-pend { font-size:10px; color:#5c6675; font-style:italic; margin-top:8px; }
                #doca-inventario .did-acoes { display:flex; flex-direction:column; gap:5px; }
                #doca-inventario .did-bt { padding:8px 10px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; font-family:inherit; border:1px solid rgba(56,189,248,.35); background:rgba(56,189,248,.12); color:#bae6fd; text-align:left; }
                #doca-inventario .did-bt:hover { border-color:rgba(56,189,248,.65); background:rgba(56,189,248,.2); }
                #doca-inventario .did-obs { font-size:9px; color:#64748b; line-height:1.5; margin-top:7px; font-style:italic; }
                #doca-inventario .did-aviso { font-size:10.5px; line-height:1.5; color:#fbbf24; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); border-radius:7px; padding:7px 9px; margin-top:10px; }
                #doca-inventario .did-pend { font-size:10px; color:#5c6675; font-style:italic; margin-top:8px; }
            `;
            document.head.appendChild(st);
        }

        function docaInventario() {
            if (_docaInv && _docaInv.el.isConnected) return _docaInv;
            docaInvCss();
            _docaInv = docaCriar({
                id: 'doca-inventario',
                titulo: '🧳 O que é cada item',
                lado: 'direita',
                largura: docaInvLarguras(false).total,
                // A mochila do jogo, não o nosso painel. Ver o cabeçalho.
                ancora: 'modal',
                // Na BARRA DE TÍTULO, como no Time & Box. Sem botão de
                // recarregar: a doca já redesenha sozinha a cada 400ms quando o
                // estado muda — um botão sem efeito visível só gera a pergunta
                // "pra que serve esse aí?".
                acoes: INV_VISTAS.map(v => ({
                    icone: v.icone, titulo: v.titulo, ao: () => docaInvTrocarVista(v.chave)
                })).concat([{
                    // ✕ RECOLHE, não fecha de vez: um clique errado não pode
                    // deixar o painel inalcançável.
                    icone: '✕', titulo: 'Recolher o painel',
                    ao: () => { if (_docaInv) _docaInv.recolher(true); }
                }])
            });
            _docaInv.el.querySelectorAll('.doca-head .doca-bt').forEach((b, i) => {
                if (INV_VISTAS[i]) b.dataset.vista = INV_VISTAS[i].chave;
            });
            docaInvMarcarVista();
            // Recolher muda a largura efetiva; a reserva no painel do jogo tem
            // que acompanhar no mesmo gesto, senao sobra um rombo.
            const orig = _docaInv.recolher;
            _docaInv.recolher = function (sim) { orig.call(_docaInv, sim); docaInvAplicarLarguras(); };
            return _docaInv;
        }

        // ── DOCA DE DETALHE ────────────────────────────────────────────────
        // A lista é índice de uma linha por item; a ficha inteira abre aqui.
        //
        // As duas ficam à DIREITA, lado a lado, e o painel do jogo é EMPURRADO
        // pra esquerda (09c). A versão anterior punha a ficha à esquerda e, com
        // o modal centralizado, ela acabava cobrindo a mochila em janela
        // estreita. Empurrar o painel uma vez só resolve o problema inteiro: as
        // duas docas ganham largura de verdade e nada se sobrepõe.
        const INV_FOLGA = 12;
        const INV_TRILHO = 34;        // largura da doca recolhida (09b)
        const INV_LISTA_MAX = 380, INV_LISTA_MIN = 300;
        const INV_DET_MAX = 340, INV_DET_MIN = 250;

        function docaInvLarguras(comDetalhe) {
            const disp = espacoDisponivelParaDocas() - INV_FOLGA * 2;
            if (!comDetalhe) {
                const lista = Math.max(INV_LISTA_MIN, Math.min(INV_LISTA_MAX, disp));
                return { lista, detalhe: 0, total: lista, reserva: lista + INV_FOLGA * 2 };
            }
            // A FICHA cede primeiro: a lista e a tela principal, a ficha e o
            // detalhe. Calcular a lista primeiro fazia o contrario — em 1550px
            // ela caia no piso de 300 e a ficha ficava com 314, maior que ela.
            const detalhe = Math.min(INV_DET_MAX, Math.max(INV_DET_MIN, disp - INV_LISTA_MAX));
            const lista = Math.min(INV_LISTA_MAX, Math.max(INV_LISTA_MIN, disp - detalhe));
            const total = lista + detalhe;
            return { lista, detalhe, total, reserva: total + INV_FOLGA * 2 };
        }

        function docaInvAplicarLarguras() {
            if (!_docaInv) return;
            // Recolhida, o painel e um trilho de 34px: reservar a largura cheia
            // deixava um rombo vazio entre o jogo e o trilho — era o bug de
            // "os docks ficam boiando" ao apertar o recolher.
            if (_docaInv.estaRecolhida()) { reservarEspacoModal('doca-inventario', INV_TRILHO + INV_FOLGA * 2); return; }
            const c = docaInvColunas();
            const L = docaInvLarguras(c.lista && c.ficha);
            const larg = (c.lista && c.ficha) ? L.total : (c.ficha ? (L.detalhe || INV_DET_MAX) : L.lista);
            _docaInv.largura = larg;
            _docaInv.el.style.width = larg + 'px';
            reservarEspacoModal('doca-inventario', larg + INV_FOLGA * 2);
            docaInvMarcarVista();
        }

        // A mochila está na tela? Duas evidências independentes, e basta uma:
        // o título (emoji, pode mudar) e a grade de slots (classe do jogo, que
        // só existe dentro do openBag — conferido: `inv-grid` aparece uma vez
        // no game.js inteiro).
        function docaInvBagAberta() {
            const bg = document.getElementById('modal-bg');
            if (!bg || bg.classList.contains('hidden')) return false;
            const tit = document.getElementById('modal-title');
            if (tit && tit.textContent.indexOf('Inventário') >= 0) return true;
            const corpo = document.getElementById('modal-body');
            return !!(corpo && corpo.querySelector('.inv-grid'));
        }

        // ⚠️ K e S NÃO estão em `window`. O game.js os declara com `let` no topo
        // do script (linha 59: `let q = ..., K = null, S = null`), e `let` de
        // topo de script entra no escopo léxico global, NÃO vira propriedade do
        // window. Ler `window.K` devolve undefined pra sempre.
        //
        // O identificador NU resolve, porque o nosso bundle roda no mesmo
        // realm — é o que o obterGameState() do 26-auto-hunt-matriz.js já fazia,
        // e por isso ele testa com `typeof` antes (identificador não declarado
        // lança ReferenceError, não devolve undefined).
        //
        // Isto custou uma rodada: a doca abria vazia, em silêncio, porque
        // desenhar sem estado só dava `return`.
        function docaInvEstado() {
            let est = null, meta = null;
            try { if (typeof K !== 'undefined' && K) est = K; } catch (e) { }
            try { if (typeof S !== 'undefined' && S) meta = S; } catch (e) { }
            if (!est || !meta) {
                // Fallback pro caso de alguma build do jogo passar a exportar.
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (!est) est = w.K || null;
                    if (!meta) meta = w.S || null;
                } catch (e) { }
            }
            return { K: est, S: meta };
        }

        // Assinatura barata do que a doca desenha. Sem isso a lista ficaria
        // parada enquanto a mochila muda por baixo (fusão de bolas, venda de
        // loot); com ela, redesenha só quando algo mudou de verdade.
        function docaInvAssinatura(K) {
            if (!K) return '';
            let s = [_docaInvOrdem, _docaInvBusca, _docaInvDens, _docaInvSel, _docaInvVista].join('|') + '|';
            for (const it of (K.bag || [])) s += it.name + ':' + it.count + ',';
            for (const k of Object.keys(K.balls || {})) s += k + ':' + K.balls[k] + ',';
            for (const k of Object.keys(K.potions || {})) s += k + ':' + K.potions[k] + ',';
            return s;
        }

        function docaInvEsc(t) {
            return String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        }

        // COLUNA DA DIREITA — o segundo número que a linha carrega, e ele é
        // diferente por gaveta. A versão anterior só mostrava a quantidade, e a
        // pergunta que sobrava era sempre "e daí?": 1.998 Rubber Ball só quer
        // dizer alguma coisa junto do que valem ($249.750).
        function docaInvValorLinha(l) {
            if (l.gaveta === 'loot' && l.valor > 0) {
                return { texto: '$' + itemDinheiro(l.valor * l.qtd), classe: 'ouro' };
            }
            if (l.gaveta === 'stone' && l.valor > 0) {
                return { texto: '$' + itemDinheiro(l.valor) + ' cada', classe: 'frio' };
            }
            if (l.gaveta === 'tm') {
                const t = (l.grupo || '').replace('Tier ', '');
                return t ? { texto: t, classe: 'tier t-' + t.toLowerCase() } : null;
            }
            // Campos, nao regex sobre a descricao: a versao anterior lia a tag
            // "captura N pts" e a coluna quebrou calada quando essa tag virou
            // "N× a Poke Ball". Texto de interface muda; campo do servidor nao.
            if (l.gaveta === 'ball') {
                return l.pontos != null ? { texto: l.pontos + '×', classe: 'frio' } : null;
            }
            if (l.gaveta === 'potion') {
                if (l.revive) return { texto: 'revive', classe: 'verde' };
                return l.cura != null ? { texto: l.cura + '%', classe: 'verde' } : null;
            }
            return null;
        }

        const DOCA_INV_EMOJI = { ball: '🎯', potion: '🧪', held: '🧤', tm: '💿', stone: '🪨', boss: '🏆', loot: '🎒' };

        // Gavetas recolhidas. É preferência do dono ("já sei o que tem nas
        // minhas bolas, some com elas"), então sobrevive ao reload — mesma
        // decisão que a doca genérica tomou pro estado recolhido dela.
        const DOCA_INV_FECHADAS_KEY = 'bugSuiteDocaInvFechadas';

        function docaInvFechadas() {
            try {
                const cru = localStorage.getItem(DOCA_INV_FECHADAS_KEY);
                return new Set(cru ? JSON.parse(cru) : []);
            } catch (e) { return new Set(); }
        }

        function docaInvAlternarGaveta(chave) {
            const f = docaInvFechadas();
            if (f.has(chave)) f.delete(chave); else f.add(chave);
            try { localStorage.setItem(DOCA_INV_FECHADAS_KEY, JSON.stringify([...f])); } catch (e) { }
            docaInvDesenhar(true);
        }

        // Realce do termo buscado. Opera SOBRE O TEXTO JÁ ESCAPADO e escapa o
        // termo antes de virar regex — senão uma busca por "<" ou por "(" ou
        // injetaria markup ou lançaria SyntaxError no meio do desenho.
        function docaInvRealcar(texto) {
            const esc = docaInvEsc(texto);
            if (!_docaInvBusca) return esc;
            const termo = docaInvEsc(_docaInvBusca).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (!termo) return esc;
            try { return esc.replace(new RegExp(termo, 'gi'), m => '<mark>' + m + '</mark>'); }
            catch (e) { return esc; }
        }

        function docaInvDesenhar(forcar) {
            const d = docaInventario();
            const { K, S } = docaInvEstado();

            // Doca vazia e muda é indistinguível de doca quebrada — foi assim
            // que o bug do `window.K` passou. Se falta estado, ela DIZ o que
            // falta em vez de não desenhar nada.
            if (!K || !S) {
                d.corpo.innerHTML = `<div class="di-vazio">
                    Sem acesso ao estado do jogo agora.<br>
                    ${!K ? 'Falta o state (K).' : ''} ${!S ? 'Falta o catálogo (S, do /api/meta).' : ''}<br>
                    Se persistir depois de reabrir a mochila, é regressão nossa — não do jogo.
                </div>`;
                d.rodape.textContent = 'sem dados';
                _docaInvSig = '';
                return;
            }

            const sig = docaInvAssinatura(K);
            if (!forcar && sig === _docaInvSig) return;
            // A assinatura só é carimbada NO FIM, depois de desenhar. Carimbar
            // aqui faria um erro no meio do desenho congelar a doca pra sempre:
            // todo tick seguinte veria "já desenhei isso" e sairia.

            // O desenho troca o innerHTML inteiro, e o tick de 400ms pode cair
            // no meio de uma digitação (a mochila muda sozinha: fusão de bola,
            // loot caindo). Sem guardar foco e cursor, a busca perdia a letra
            // seguinte de quem estava escrevendo.
            const focoNaBusca = !!(d.corpo.querySelector('#di-busca') &&
                document.activeElement === d.corpo.querySelector('#di-busca'));
            const caret = focoNaBusca ? d.corpo.querySelector('#di-busca').selectionStart : null;

            const todas = montarLinhasMochila(K, S);
            const linhas = ordenarLinhasMochila(filtrarLinhasMochila(todas, _docaInvBusca), _docaInvOrdem);
            const buscando = !!_docaInvBusca;

            // Gavetas recolhidas: preferência, sobrevive ao reload. Buscando,
            // TUDO abre — esconder resultado atrás de uma seta fechada é a pior
            // coisa que uma busca pode fazer.
            const fechadas = buscando ? new Set() : docaInvFechadas();

            const cols = docaInvColunas();
            // ⚠️ A FICHA VEM PRIMEIRO — coluna da ESQUERDA.
            // A mochila do jogo fica à esquerda da doca, e é lá que o item é
            // clicado. Com a ficha na ponta direita, o olho tinha que atravessar
            // a lista inteira pra achar a resposta do clique que acabou de dar.
            // Encostada na mochila, a descrição nasce ao lado do item.
            const escolhido = _docaInvSel ? todas.find(x => docaInvChaveSel(x) === _docaInvSel) : null;
            if (!escolhido && _docaInvSel) _docaInvSel = null;
            let html = '<div class="di-wrap">';
            if (cols.ficha) {
                html += '<div class="di-col-ficha" id="di-ficha">'
                    + (escolhido ? docaInvHtmlFicha(escolhido)
                        : '<div class="di-vazio">Nenhum item escolhido.<br>Clique num item — aqui ou na mochila do jogo.</div>')
                    + '</div>';
                if (cols.lista) html += '<div class="di-div"></div>';
            }
            if (cols.lista) html += `<div class="di-col-lista">
                <div class="di-topo">
                    <div class="di-linha1">
                        <input type="text" class="di-busca" id="di-busca" placeholder="🔍 Buscar item ou efeito..." value="${docaInvEsc(_docaInvBusca)}" />
                        <select class="di-ordem" id="di-ordem" title="Ordenar">
                            <option value="tipo">Tipo</option>
                            <option value="quantidade">Qtd</option>
                            <option value="nome">Nome</option>
                            <option value="valor">Valor</option>
                        </select>
                        <button class="di-dens${_docaInvDens === 'confortavel' ? ' on' : ''}${cols.limpa ? ' oculto' : ''}" id="di-dens"
                            title="${_docaInvDens === 'compacta' ? 'Mostrar a descrição na lista' : 'Só o nome na lista (clique no item pra ver a ficha)'}">☰</button>
                    </div>
                    <div class="di-chips" id="di-chips"></div>
                </div>
                <div class="di-scroll" id="di-scroll">`;

            if (!linhas.length) {
                html += `<div class="di-vazio">${buscando
                    ? 'Nada casa com <b>' + docaInvEsc(_docaInvBusca) + '</b>.<br>A busca também olha a descrição e as pastilhas.'
                    : 'Mochila vazia — derrote selvagens.'}</div>`;
            }

            // Índice do topo: quanto tem de cada gaveta, e o clique leva lá. É
            // atalho e resumo ao mesmo tempo — responde "tenho TM?" sem rolar.
            const chips = [];

            // Cabeçalho de gaveta só quando a ordenação é por tipo; nas outras
            // o agrupamento brigaria com a ordem pedida.
            // Na lista LIMPA nao ha cabecalho de gaveta nem subgrupo: ela e uma
            // lista corrida com busca. Agrupar ali seria repetir a lista completa
            // com menos espaco — e ai os dois modos nao se justificariam.
            const porTipo = _docaInvOrdem === 'tipo' && !cols.limpa;
            let gavetaAtual = null, grupoAtual = null, abertaAtual = true;
            for (const l of linhas) {
                if (porTipo && l.gaveta !== gavetaAtual) {
                    gavetaAtual = l.gaveta; grupoAtual = null;
                    const g = ITEM_GAVETAS.find(x => x.chave === l.gaveta);
                    const nesta = linhas.filter(x => x.gaveta === l.gaveta);
                    const unid = nesta.reduce((a, b) => a + b.qtd, 0);
                    abertaAtual = !fechadas.has(l.gaveta);
                    const titulo = g ? g.titulo : l.gaveta;
                    chips.push({ gaveta: l.gaveta, icone: titulo.slice(0, 2).trim(), n: nesta.length, aberta: abertaAtual });
                    html += `<div class="di-gaveta" data-gaveta="${l.gaveta}" id="di-sec-${l.gaveta}">
                        <span class="di-seta">${abertaAtual ? '▾' : '▸'}</span>
                        <span class="di-tit">${docaInvEsc(titulo)}</span>
                        <span class="di-cont">${nesta.length} · ${itemDinheiro(unid)} un.</span>
                    </div>`;
                }
                if (porTipo && !abertaAtual) continue;
                if (porTipo && l.grupo !== grupoAtual && (l.gaveta === 'held' || l.gaveta === 'tm')) {
                    grupoAtual = l.grupo;
                    html += `<div class="di-grupo">${docaInvEsc(l.grupo)}</div>`;
                }

                // Segunda linha = pastilhas + descrição em texto corrido. As
                // pastilhas viraram texto porque, em 340px, três delas quebravam
                // linha e empurravam a descrição pra fora da vista.
                const aviso = (l.tags || []).some(t => String(t).indexOf('⚠') >= 0);
                const meta = (l.tags || []).filter(t => String(t).indexOf('⚠') < 0).join(' · ');
                const partes = [];
                if (meta) partes.push('<i>' + docaInvRealcar(meta) + '</i>');
                if (l.desc) partes.push(docaInvRealcar(l.desc));
                // Compacta esconde a 2ª linha — MENOS quando se está buscando:
                // aí a descrição é justamente o que explica por que o item
                // apareceu no resultado, e escondê-la deixaria a busca muda.
                const l2 = ((_docaInvDens === 'compacta' || cols.limpa) && !buscando) ? '' : partes.join(' ');
                const v = docaInvValorLinha(l);
                const temTela = docaInvTemAcao(l);
                html += `
                    <div class="di-item${aviso ? ' alerta' : ''}${docaInvChaveSel(l) === _docaInvSel ? ' sel' : ''}" data-chave="${docaInvEsc(l.chave)}" data-gaveta="${l.gaveta}" title="${docaInvEsc(l.titulo + (l.desc ? ' — ' + l.desc : ''))}">
                        <div class="di-ic" data-cid="${l.cid || ''}" data-nome="${docaInvEsc(l.nome)}" data-gaveta="${l.gaveta}" data-emoji="${DOCA_INV_EMOJI[l.gaveta] || '📦'}">${DOCA_INV_EMOJI[l.gaveta] || '📦'}</div>
                        <div class="di-txt">
                            <div class="di-l1">
                                <span class="di-nome">${docaInvRealcar(l.titulo)}</span>
                                ${temTela ? '<span class="di-tela" title="Tem ação: o card traz o botão que leva até a tela do jogo">↗</span>' : ''}
                            </div>
                            ${l2 ? `<div class="di-l2${l.fichaPendente ? ' pendente' : ''}">${l2}</div>` : ''}
                        </div>
                        <div class="di-vlr">
                            <div class="di-qtd${l.qtd >= 1000 ? ' muito' : ''}">${itemDinheiro(l.qtd)}</div>
                            ${v ? `<div class="di-sub ${v.classe}">${docaInvEsc(v.texto)}</div>` : ''}
                        </div>
                    </div>`;
            }
            if (cols.lista) html += '</div></div>';
            html += '</div>';

            d.corpo.innerHTML = html;
            const colF = d.corpo.querySelector('#di-ficha');
            if (colF) colF.style.width = cols.lista ? docaInvLarguras(true).detalhe + 'px' : '100%';
            docaInvAplicarLarguras();

            // Chips só fazem sentido agrupado por tipo; nas outras ordens não há
            // seção pra onde pular.
            const barra = d.corpo.querySelector('#di-chips');
            if (barra) {
                if (cols.limpa || !porTipo || !chips.length) barra.style.display = 'none';
                else {
                    barra.innerHTML = chips.map(c =>
                        `<button class="di-chip${c.aberta ? '' : ' fechada'}" data-ir="${c.gaveta}" title="Ir para a gaveta">${c.icone}<i>${c.n}</i></button>`).join('');
                    barra.querySelectorAll('.di-chip[data-ir]').forEach(b => {
                        b.onclick = () => {
                            const alvo = d.corpo.querySelector('#di-sec-' + b.dataset.ir);
                            if (alvo) alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
                        };
                    });
                }
            }

            // Clique no cabeçalho recolhe a gaveta.
            d.corpo.querySelectorAll('.di-gaveta[data-gaveta]').forEach(h => {
                h.onclick = () => docaInvAlternarGaveta(h.dataset.gaveta);
            });

            // Clique no item abre a ficha completa na doca da esquerda.
            d.corpo.querySelectorAll('.di-item[data-chave]').forEach(it => {
                it.onclick = () => docaInvSelecionar(it.dataset.gaveta + '|' + it.dataset.chave);
            });

            const dens = d.corpo.querySelector('#di-dens');
            if (dens) dens.onclick = () => {
                _docaInvDens = _docaInvDens === 'compacta' ? 'confortavel' : 'compacta';
                try { localStorage.setItem(DOCA_INV_DENS_KEY, _docaInvDens); } catch (e) { }
                docaInvDesenhar(true);
            };

            // Sprites reais: cid do 14b (held/boss/TM/pedra) ou do mapa de
            // icons.json (bola/poção/resto). Emoji fica até o cid resolver, e
            // volta se a imagem falhar — nunca fica caixa em branco.
            try {
                d.corpo.querySelectorAll('.di-ic[data-nome], .did-ic[data-nome]').forEach(ic => {
                    const px = ic.classList.contains('did-ic') ? 42 : 22;
                    const cid = docaInvCidItem(ic.dataset.cid, ic.dataset.nome, ic.dataset.gaveta);
                    if (!cid) return;
                    ic.innerHTML = docaInvHtmlSprite(cid, px);
                    const img = ic.querySelector('img');
                    if (img) img.onerror = () => { ic.textContent = ic.dataset.emoji || '📦'; };
                });
            } catch (e) { }

            const busca = d.corpo.querySelector('#di-busca');
            if (busca) {
                busca.oninput = () => { _docaInvBusca = busca.value; docaInvDesenhar(true); };
                if (focoNaBusca) {
                    busca.focus();
                    const p = caret == null ? busca.value.length : Math.min(caret, busca.value.length);
                    try { busca.setSelectionRange(p, p); } catch (e) { }
                }
            }
            const ordem = d.corpo.querySelector('#di-ordem');
            if (ordem) {
                ordem.value = _docaInvOrdem;
                ordem.onchange = () => { _docaInvOrdem = ordem.value; docaInvDesenhar(true); };
            }
            // A lista inteira é trocada a cada redesenho; sem restaurar o
            // scroll, o tick de 400ms jogaria quem está lendo o fim da lista de
            // volta pro topo a cada bola gasta.
            const scroll = d.corpo.querySelector('#di-scroll');
            if (scroll) {
                if (_docaInvScroll > 0) scroll.scrollTop = _docaInvScroll;
                scroll.onscroll = () => { _docaInvScroll = scroll.scrollTop; };
            }

            const totUnid = todas.reduce((a, b) => a + b.qtd, 0);
            const totLoot = todas.filter(l => l.gaveta === 'loot').reduce((a, b) => a + b.qtd * b.valor, 0);
            d.rodape.innerHTML = buscando
                ? `${linhas.length} de ${todas.length} itens`
                : `${todas.length} itens distintos · ${itemDinheiro(totUnid)} unidades · loot vale $${itemDinheiro(totLoot)}`;

            if (escolhido) {
                docaInvCompletarTms(d, [escolhido]);
                for (const a of docaInvAcoesItem(escolhido)) {
                    const b = d.corpo.querySelector('#' + a.id);
                    if (b) b.onclick = ev => { ev.stopPropagation(); try { a.ao(); } catch (e) { console.error('[doca-inv] acao', e); } };
                }
            }

            _docaInvSig = sig;
            docaInvCompletarTms(d, linhas);
        }

        // A ficha de verdade da TM (poder, precisão, PP, efeito) NÃO está no
        // /api/meta: sai de /api/gym/tm/catalogo e do descreverGolpe do
        // gymproto — as MESMAS fontes que o openTmDetail do jogo usa, pra que a
        // TM não seja descrita de dois jeitos em duas telas. É async: a linha
        // nasce com o que o meta dá e é reescrita quando o catálogo chega.
        function docaInvCompletarTms(d, linhas) {
            if (!linhas.some(l => l.gaveta === 'tm')) return;
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

            const aplicar = () => {
                if (!_docaInvTmCache) return;
                const gb = w.GYMBATTLE || {};
                // Reescreve a linha da lista E a ficha da coluna, se abertas.
                const alvos = [];
                d.corpo.querySelectorAll('.di-item[data-gaveta="tm"]').forEach(el => alvos.push([el.dataset.chave, el.querySelector('.di-l2')]));
                const fic = d.corpo.querySelector('#did-tm');
                const selPartes = docaInvSelPartes(_docaInvSel);
                // #did-tm só existe quando o item escolhido é TM (ver
                // docaInvHtmlFicha); a checagem de gaveta é só reforço.
                if (fic && selPartes && selPartes.gaveta === 'tm') alvos.push([selPartes.chave, fic]);
                alvos.forEach(([chave, alvo]) => {
                    const tm = _docaInvTmCache.get(chave);
                    if (!tm || !alvo) return;
                    const f = tm.ficha;
                    if (!f) return;
                    // `power > 0` é o teste de "bate em alguém" — a `category`
                    // mente em golpe de status (nota do próprio game.js).
                    const cat = !(f.power > 0) ? 'Status' : f.category === 'special' ? 'Especial' : 'Físico';
                    const prec = f.accuracy == null ? 'sempre acerta' : f.accuracy + '%';
                    const efeito = typeof gb.descreverGolpe === 'function'
                        ? gb.descreverGolpe(f) : ('Golpe ' + cat.toLowerCase() + '.');
                    alvo.classList.remove('pendente');
                    alvo.textContent = cat + ' · poder ' + (f.power > 0 ? f.power : '—') +
                        ' · ' + prec + ' · ' + (f.pp != null ? f.pp + ' PP' : '— PP') + '. ' + efeito;
                });
            };

            if (_docaInvTmCache) { aplicar(); return; }
            if (_docaInvTmBuscando || typeof w.loadTmCatalog !== 'function') return;
            _docaInvTmBuscando = true;
            Promise.resolve()
                .then(() => w.loadTmCatalog())
                .then(mapa => { _docaInvTmCache = mapa; aplicar(); })
                .catch(() => { /* sem catálogo a linha fica com o texto do meta */ })
                .then(() => { _docaInvTmBuscando = false; });
        }

        // Coluna da ficha do item. Recebe a LINHA já montada pelo catálogo
        // (14b) — nada de reclassificar aqui, senão a lista e a ficha poderiam
        // discordar sobre o mesmo item.
        function docaInvHtmlFicha(l) {
            const g = ITEM_GAVETAS.find(x => x.chave === l.gaveta);
            const aviso = (l.tags || []).filter(t => String(t).indexOf('⚠') >= 0);
            const badges = (l.tags || []).filter(t => String(t).indexOf('⚠') < 0);

            // O NÚMERO-HERÓI: cada gaveta tem um, e é a resposta da pergunta
            // que se faz olhando aquele item. Sem ele o card era uma tabela
            // sem manchete.
            let heroi = null;
            if (l.gaveta === 'loot' && l.valor > 0) {
                heroi = { n: '$' + itemDinheiro(l.valor * l.qtd), r: 'no Mark, tudo',
                    s: '$' + itemDinheiro(l.valor) + ' cada × ' + itemDinheiro(l.qtd), c: 'ouro' };
            } else if (l.gaveta === 'ball' && l.pontos != null) {
                heroi = { n: l.pontos + '×', r: 'a força da Poké Ball',
                    s: 'a Poké Ball vale 1 nessa escala', c: 'frio' };
            } else if (l.gaveta === 'potion') {
                if (l.revive) heroi = { n: '↺', r: 'revive', s: 'traz de volta um pokémon derrotado', c: 'verde' };
                else if (l.cura != null) heroi = { n: l.cura + '%', r: 'do HP máximo', s: 'por uso', c: 'verde' };
            } else if (l.gaveta === 'stone' && l.valor > 0) {
                heroi = { n: '$' + itemDinheiro(l.valor), r: 'na loja', s: 'preço de cada pedra', c: 'frio' };
            } else if (l.gaveta === 'tm') {
                const t = (l.grupo || '').replace('Tier ', '');
                if (t) heroi = { n: t, r: 'tier do disco', s: 'quanto mais alto, mais raro', c: 'tier' };
            }

            let html = `
                <div class="did-topo">
                    <div class="did-ic" data-cid="${l.cid || ''}" data-nome="${docaInvEsc(l.nome)}" data-gaveta="${l.gaveta}" data-emoji="${DOCA_INV_EMOJI[l.gaveta] || '📦'}">${DOCA_INV_EMOJI[l.gaveta] || '📦'}</div>
                    <div class="did-id">
                        <div class="did-nome">${docaInvEsc(l.titulo)}</div>
                        <div class="did-badges">
                            <span class="bdg gav">${docaInvEsc(g ? g.titulo : l.gaveta)}</span>
                            ${l.grupo && l.grupo !== 'Loot' ? `<span class="bdg grp">${docaInvEsc(l.grupo)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="did-qtd-linha">
                    <span>Você tem</span><b>${itemDinheiro(l.qtd)}</b>
                </div>`;

            if (heroi) {
                html += `
                    <div class="did-hero ${heroi.c}">
                        <div class="n">${docaInvEsc(heroi.n)}</div>
                        <div class="lado">
                            <div>${docaInvEsc(heroi.r)}</div>
                            <div>${docaInvEsc(heroi.s)}</div>
                        </div>
                    </div>`;
            }

            if (badges.length) {
                html += '<div class="did-tags">'
                    + badges.map(t => `<span class="tchip">${docaInvEsc(t)}</span>`).join('')
                    + '</div>';
            }

            if (l.desc) {
                const corte = l.desc.indexOf('⚠');
                const corpo = corte >= 0 ? l.desc.slice(0, corte).trim() : l.desc;
                if (corpo) html += `<div class="did-sec">O que faz</div><div class="did-desc">${docaInvEsc(corpo)}</div>`;
            }
            for (const a of aviso) {
                const txt = l.desc && l.desc.indexOf('⚠') >= 0 ? l.desc.slice(l.desc.indexOf('⚠')).trim() : a;
                html += `<div class="did-aviso">${docaInvEsc(txt)}</div>`;
                break;
            }

            if (l.gaveta === 'tm') {
                html += `<div class="did-sec">Ficha do golpe</div><div class="did-desc" id="did-tm">…</div>`;
            }
            const acoes = docaInvAcoesItem(l);
            if (acoes.length) {
                html += '<div class="did-sec">Ações</div><div class="did-acoes">'
                    + acoes.map(a => `<button class="did-bt" id="${a.id}">${docaInvEsc(a.rotulo)}</button>`).join('')
                    + '</div><div class="did-obs">Abrir fecha a mochila e este painel — a tela do jogo precisa da frente.</div>';
            }
            return html;
        }

        // Ficha completa da TM no detalhe. Mesma fonte do openTmDetail do jogo
        // (catálogo do ginásio + descreverGolpe), pra não existir uma segunda
        // descrição do mesmo golpe.
        function docaInvFichaTmDetalhe(d, l) {
            const alvo = d.corpo.querySelector('#did-tm');
            if (!alvo) return;
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

            const pintar = () => {
                const el = d.corpo.querySelector('#did-tm');
                if (!el) return;
                const tm = _docaInvTmCache && _docaInvTmCache.get(l.chave);
                const f = tm && tm.ficha;
                if (!f) { el.textContent = 'Ficha indisponível para este disco.'; return; }
                const cat = !(f.power > 0) ? 'Status' : f.category === 'special' ? 'Especial' : 'Físico';
                const prec = f.accuracy == null ? 'sempre acerta' : f.accuracy + '%';
                const gb = w.GYMBATTLE || {};
                const efeito = typeof gb.descreverGolpe === 'function'
                    ? gb.descreverGolpe(f) : ('Golpe ' + cat.toLowerCase() + '.');
                el.textContent = cat + ' · poder ' + (f.power > 0 ? f.power : '—') +
                    ' · ' + prec + ' · ' + (f.pp != null ? f.pp + ' PP' : '— PP') + '. ' + efeito;
            };

            if (_docaInvTmCache) { pintar(); return; }
            alvo.textContent = 'Carregando a ficha do golpe…';
            if (typeof w.loadTmCatalog !== 'function') { alvo.textContent = 'Catálogo do ginásio indisponível agora.'; return; }
            Promise.resolve().then(() => w.loadTmCatalog())
                .then(mapa => { _docaInvTmCache = mapa; pintar(); })
                .catch(() => { const el = d.corpo.querySelector('#did-tm'); if (el) el.textContent = 'Não deu pra carregar a ficha agora.'; });
        }

        // ── AÇÕES DO ITEM ──────────────────────────────────────────────────
        // Todo clique abre o CARD. Os itens que têm tela no jogo (TM/HM e
        // segurados) ganham, dentro do card, o botão que leva até ela.
        //
        // A versão anterior mandava o clique direto pra tela do jogo, e isso
        // era pior por dois motivos:
        //   1. o mesmo gesto tinha dois resultados diferentes dependendo do
        //      item, sem nada na tela avisando qual viria;
        //   2. pulava a descrição justo nos itens que mais precisam dela — dá
        //      pra querer saber o que a TM faz sem querer ensiná-la agora.
        //
        // ⚠️ E resolve um problema que era do JOGO: o slot de held da mochila
        // chama `HELDS_UI.abrir()` SEM fechar a bag, e a tela de item segurado
        // nasce atrás dela. Saindo daqui, a gente fecha a mochila primeiro.
        function docaInvAcoesItem(l) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            const fora = [];
            if (l.gaveta === 'tm' && typeof w.openTmDetail === 'function') {
                fora.push({
                    id: 'did-tm-abrir', rotulo: '💿 Ficha do golpe e ensinar',
                    // openTmDetail desenha no MESMO #modal da mochila, então
                    // fechar antes só evita o pisca de dois conteúdos.
                    ao: () => { docaInvSairDaFrente(); w.openTmDetail(l.chave); }
                });
            }
            if (l.gaveta === 'held' && w.HELDS_UI && typeof w.HELDS_UI.abrir === 'function') {
                fora.push({
                    id: 'did-held-abrir', rotulo: '🧤 Equipar em um pokémon',
                    ao: () => { docaInvSairDaFrente(); w.HELDS_UI.abrir(null, null); }
                });
            }
            return fora;
        }

        // Fecha a mochila (o que fecha a doca junto, pelo tick) antes de
        // entregar a tela pro jogo. Sem isto a tela do jogo nasce atrás.
        function docaInvSairDaFrente() {
            const f = document.getElementById('modal-close');
            if (f) f.click();
            if (_docaInv) _docaInv.mostrar(false);
            liberarEspacoModal('doca-inventario');
            _docaInvSig = '';
        }

        function docaInvTemAcao(l) {
            return docaInvAcoesItem(l).length > 0;
        }

        // ── CLIQUE NA GRADE DO JOGO ────────────────────────────────────────
        // Ouve em CAPTURA no #modal-body, que é estático e sobrevive a todo
        // redesenho do openBag — por isso um listener só, instalado uma vez, em
        // vez de reinstalar em cada slot a cada render.
        //
        // Nos itens que têm ação no jogo (TM e segurado) o clique do jogo é
        // BLOQUEADO de propósito: o card passou a ser a porta única, e ele traz
        // o botão que leva à tela. Deixar os dois caminhos vivos faria o mesmo
        // gesto abrir coisas diferentes conforme a gaveta.
        //
        // O slot do "Pokémon ativo" (.poke) fica de fora: ele leva pro Time &
        // Box, que é outra tela e tem doca própria.
        let _docaInvSlotsLigados = false;
        function docaInvLigarSlotsDoJogo() {
            if (_docaInvSlotsLigados) return true;
            const corpo = document.getElementById('modal-body');
            if (!corpo) return false;
            corpo.addEventListener('click', ev => {
                try {
                    if (!docaInvBagAberta()) return;
                    const slot = ev.target.closest && ev.target.closest('.inv-slot');
                    if (!slot || slot.classList.contains('poke')) return;
                    const { K, S } = docaInvEstado();
                    if (!K || !S) return;
                    const linha = casarSlotComLinha(slot.title || '', montarLinhasMochila(K, S));
                    if (!linha) return;
                    if (docaInvTemAcao(linha)) { ev.stopPropagation(); ev.preventDefault(); }
                    _docaInvSel = docaInvChaveSel(linha);
                    // Clicar tem que ter resposta visivel: se o modo em uso nao
                    // mostra a ficha, passa pro hibrido, que mostra os dois.
                    if (docaInvColunas().ficha === false) _docaInvVista = 'hibrido';
                    docaInvDesenhar(true);
                    docaInvAplicarLarguras();
                } catch (e) { console.error('[doca-inv] slot', e); }
            }, true);
            _docaInvSlotsLigados = true;
            return true;
        }

        function docaInvSelecionar(chave) {
            // Clicar de novo no mesmo item fecha o detalhe: o clique é um
            // interruptor, não um caminho só de ida.
            // Clicar de novo fecha a coluna: o clique e interruptor.
            _docaInvSel = (_docaInvSel === chave) ? null : chave;
            docaInvDesenhar(true);
            docaInvAplicarLarguras();
        }

        let _docaInvJaAbriu = false;
        function docaInvAbrir() {
            if (!_docaInvJaAbriu) {
                _docaInvJaAbriu = true;
                docaMedir('doca:primeira-abertura', { doca: 'inventario' });
            }
            docaInventario().mostrar(true);
            docaInvAplicarLarguras();
            docaInvDesenhar(true);
        }

        function docaInvFechar() {
            if (_docaInv) _docaInv.mostrar(false);
            // Devolve o espaco do painel do jogo na hora: modal encolhido depois
            // da doca sumir seria um bug que ninguem ligaria a gente.
            liberarEspacoModal('doca-inventario');
            _docaInvSig = '';
        }

        // Envelopa openBag. `function openBag(){}` no game.js é binding global,
        // então o envelope pega também as chamadas INTERNAS do jogo (a fusão de
        // bolas re-chama openBag pra redesenhar).
        let _docaInvEnvelopada = false;
        function docaInvEnvelopar() {
            if (_docaInvEnvelopada) return true;
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            const orig = w.openBag;
            if (typeof orig !== 'function' || orig.__docaInv) return !!(orig && orig.__docaInv);
            const env = function () {
                const r = orig.apply(this, arguments);
                try { docaInvAbrir(); } catch (e) { console.error('[doca-inv] abrir', e); }
                return r;
            };
            env.__docaInv = true;
            env.__original = orig;
            try { w.openBag = env; } catch (e) { return false; }
            _docaInvEnvelopada = true;
            return true;
        }

        // ── FECHAR NA HORA ─────────────────────────────────────────────────
        // Abrir era instantâneo (envelope do openBag), mas FECHAR dependia do
        // tick: o jogo faz `Wi.classList.add("hidden")` e a doca só percebia no
        // próximo ciclo, até 400ms depois. Numa ação de fechar, esse atraso é
        // visível — a mochila some e as docas ficam um tempo sozinhas na tela.
        //
        // O observador reage à MUDANÇA DE CLASSE do #modal-bg no mesmo quadro.
        // O tick continua, como rede: se o observador não instalar (elemento
        // ainda não existe, ou o jogo mudar o markup), o fechamento ainda
        // acontece — só que devagar, como antes, em vez de nunca.
        let _docaInvObs = null;
        function docaInvObservarModal() {
            if (_docaInvObs) return true;
            const bg = document.getElementById('modal-bg');
            if (!bg || typeof MutationObserver !== 'function') return false;
            _docaInvObs = new MutationObserver(() => {
                try { docaInvTick(); } catch (e) { console.error('[doca-inv] obs', e); }
            });
            _docaInvObs.observe(bg, { attributes: true, attributeFilter: ['class'] });
            // O jogo também TROCA de modal sem esconder o fundo (clicar no
            // pokémon ativo dentro da mochila abre o Time & Box no mesmo #modal).
            // Aí o que muda é o título e o corpo, não a classe do fundo.
            const tit = document.getElementById('modal-title');
            if (tit) _docaInvObs.observe(tit, { childList: true, characterData: true, subtree: true });
            const corpo = document.getElementById('modal-body');
            if (corpo) _docaInvObs.observe(corpo, { childList: true });
            return true;
        }

        function docaInvTick() {
            // Segue tentando envelopar e observar: no reload o jogo redefine
            // openBag e remonta o modal, levando envelope e observador junto.
            docaInvEnvelopar();
            docaInvObservarModal();
            // O #modal-body existe desde o play.html, mas se por algum motivo
            // ainda não estiver lá, o tick tenta de novo — a função é idempotente.
            docaInvLigarSlotsDoJogo();
            if (_docaInv) docaCederAoJogo(_docaInv.el);
            const aberta = docaInvBagAberta();
            const doca = _docaInv;
            if (aberta) {
                if (!doca || !doca.aberta()) docaInvAbrir();
                else docaInvDesenhar(false);
            } else if (doca && doca.aberta()) {
                // A doca de detalhe vive da lista: sem mochila na tela ela
                // ficaria sozinha no canto, mostrando um item de um painel que
                // nao esta mais aberto. E o espaco reservado volta pro jogo.
                docaInvFechar();
            }
        }

        if (!window.__docaInventarioInstalada) {
            window.__docaInventarioInstalada = true;
            // PRÉ-AQUECIMENTO: cria o elemento e injeta o CSS agora, escondido.
            // Sem isto o primeiro clique pagava tudo junto — criar o nó, montar
            // a folha de estilo e só então desenhar — e o painel aparecia com
            // atraso visível, empurrando o jogo depois de já estar na tela.
            const _fimCriar = docaCronometro('doca:criada', { doca: 'inventario' });
            try { docaInventario(); } catch (e) { }
            _fimCriar();
            docaInvEnvelopar();
            docaInvObservarModal();
            setInterval(docaInvTick, 400);
            docaMedir('doca:instalada', { doca: 'inventario' });
        }

        // =====================================================================
        // 36-doca-equipe.js — DOCA DA EQUIPE (Time & Box)
        // =====================================================================
        // Duas docas à DIREITA do painel do jogo, lado a lado: a lista/ranking e
        // a ficha do pokémon selecionado. O painel do jogo é empurrado pra
        // esquerda (09c) em vez de as docas se espremerem numa fresta.
        //
        // ── POR QUE A NOTA PARECIA NÃO CONFIÁVEL ──
        // A 1ª versão mostrava só o composto (`ficha`), arredondado duas vezes.
        // Com 21 cópias de Staraptor, cinco delas apareciam como "66" — com
        // poderes 135, 133, 132 e 129. A tela dizia que eram iguais e o jogo
        // dizia que não. Três correções, todas aqui:
        //   1. cada linha mostra IV e GROWTH, os dois componentes, com barra —
        //      dá pra CONFERIR a nota em vez de acreditar nela;
        //   2. a ordenação usa `fichaExata` (sem arredondar no meio), então
        //      empate na tela não vira ordem aleatória;
        //   3. o grau (S+/S/A/B/C/D) é da NOSSA nota e vem rotulado como tal,
        //      separado do `tier` da espécie, que é do servidor e diz outra
        //      coisa. Misturar os dois é o caminho curto pra ninguém acreditar
        //      em nenhum.
        //
        // ── ESPELHO COM O PAINEL DO JOGO ──
        // Clicar numa linha chama `openTeamBox(id)`: o painel do meio abre o
        // MESMO pokémon. Sem isso era preciso caçar o bicho na grade pra saber
        // qual era.
        //
        // ── AÇÕES DESTRUTIVAS ──
        // Venda em massa é da BOX (o `sellMany` percorre `K.box`). Time,
        // travados e o ativo não ficam nem selecionáveis. As pré-seleções só
        // MARCAM; a venda continua atrás do `uiConfirm` do jogo, com os nomes.
        // =====================================================================

        let _docaEq = null;
        let _docaEqSig = '';
        let _docaEqScroll = 0;
        let _docaEqSel = null;
        let _docaEqOrdem = 'ficha';
        let _docaEqBusca = '';
        let _docaEqOrigem = 'tudo';
        let _docaEqMarcados = new Set();
        let _docaEqModoVenda = false;
        let _docaEqShiny = false;
        let _docaEqLendario = false;
        let _docaEqRaridade = '';

        // MODO DE VISTA. Três estados exclusivos, então é um seletor de 3
        // posições na barra de título — não um menu de configurações: com três
        // opções mutuamente exclusivas, um menu troca um clique por dois e
        // ainda esconde qual está ativo.
        //   ambos  = ranking + ficha
        //   lista  = só o ranking
        //   ficha  = só o card do pokémon
        const DOCA_EQ_VISTA_KEY = 'bugSuiteEquipeVista';
        let _docaEqVista = 'ambos';
        try { _docaEqVista = localStorage.getItem(DOCA_EQ_VISTA_KEY) || 'ambos'; } catch (e) { }

        const EQ_VISTAS = [
            { chave: 'ambos', icone: '▥', titulo: 'Ranking + ficha' },
            { chave: 'lista', icone: '☰', titulo: 'Só o ranking' },
            { chave: 'ficha', icone: '▤', titulo: 'Só a ficha do pokémon' }
        ];

        function docaEqTrocarVista(v) {
            _docaEqVista = v;
            try { localStorage.setItem(DOCA_EQ_VISTA_KEY, v); } catch (e) { }
            docaEqDesenhar(true);
            docaEqAplicarLarguras();
        }

        const DOCA_EQ_FAV_KEY = 'bugSuiteEquipeFavoritos';
        const DOCA_EQ_DENS_KEY = 'bugSuiteEquipeDensidade';
        let _docaEqDens = 'detalhada';
        try { _docaEqDens = localStorage.getItem(DOCA_EQ_DENS_KEY) || 'detalhada'; } catch (e) { }

        // ── Larguras ────────────────────────────────────────────────────────
        // UM painel só, com duas colunas e uma divisória. Antes eram duas docas
        // separadas, e isso trouxe um bug de cara: ao recolher, cada uma virava
        // um trilho de 34px, mas a reserva no painel do jogo e o deslocamento da
        // segunda continuavam calculados pela largura EXPANDIDA — os dois
        // trilhos ficavam boiando longe, no meio da tela.
        //
        // Painel único mata a classe inteira: um recolher, uma reserva, um
        // deslocamento a menos pra errar. E lê como uma ferramenta só.
        const EQ_FOLGA = 12;
        const EQ_TRILHO = 34;          // largura da doca recolhida (09b)
        const EQ_LISTA_MAX = 400, EQ_LISTA_MIN = 300;
        const EQ_FICHA_MAX = 340, EQ_FICHA_MIN = 250;

        function docaEqLarguras(comFicha) {
            const disp = espacoDisponivelParaDocas() - EQ_FOLGA * 2;
            if (!comFicha) {
                const lista = Math.max(EQ_LISTA_MIN, Math.min(EQ_LISTA_MAX, disp));
                return { lista, ficha: 0, total: lista, reserva: lista + EQ_FOLGA * 2 };
            }
            // A FICHA cede primeiro: a lista é a tela principal.
            const ficha = Math.min(EQ_FICHA_MAX, Math.max(EQ_FICHA_MIN, disp - EQ_LISTA_MAX));
            const lista = Math.min(EQ_LISTA_MAX, Math.max(EQ_LISTA_MIN, disp - ficha));
            const total = lista + ficha;
            return { lista, ficha, total, reserva: total + EQ_FOLGA * 2 };
        }

        // O que aparece agora, dado o modo e se há pokémon escolhido.
        function docaEqColunas() {
            const temSel = !!_docaEqSel;
            if (_docaEqVista === 'lista') return { lista: true, ficha: false };
            if (_docaEqVista === 'ficha') return { lista: false, ficha: true };
            return { lista: true, ficha: temSel };
        }

        function docaEqAplicarLarguras() {
            if (!_docaEq) return;
            // Recolhida, o painel é um trilho: reservar a largura cheia deixaria
            // um rombo vazio entre o jogo e o trilho — foi exatamente o bug.
            if (_docaEq.estaRecolhida()) { reservarEspacoModal('doca-equipe', EQ_TRILHO + EQ_FOLGA * 2); return; }
            const c = docaEqColunas();
            const L = docaEqLarguras(c.lista && c.ficha);
            const larg = (c.lista && c.ficha) ? L.total : (c.ficha ? L.ficha || EQ_FICHA_MAX : L.lista);
            _docaEq.largura = larg;
            _docaEq.el.style.width = larg + 'px';
            reservarEspacoModal('doca-equipe', larg + EQ_FOLGA * 2);
            docaEqMarcarVista();
        }

        function docaEqMarcarVista() {
            if (!_docaEq) return;
            _docaEq.el.querySelectorAll('.doca-bt[data-vista]').forEach(b => {
                b.classList.toggle('vista-on', b.dataset.vista === _docaEqVista);
            });
        }

        function docaEqFavoritos() {
            try {
                const cru = localStorage.getItem(DOCA_EQ_FAV_KEY);
                return new Set(cru ? JSON.parse(cru) : []);
            } catch (e) { return new Set(); }
        }

        function docaEqAlternarFavorito(id) {
            const f = docaEqFavoritos();
            if (f.has(id)) f.delete(id); else f.add(id);
            try { localStorage.setItem(DOCA_EQ_FAV_KEY, JSON.stringify([...f])); } catch (e) { }
            _docaEqSig = '';
            docaEqDesenhar(true);
        }

        function docaEqCss() {
            if (document.getElementById('doca-equipe-css')) return;
            const st = document.createElement('style');
            st.id = 'doca-equipe-css';
            st.textContent = `
                #doca-equipe .doca-corpo, #doca-eq-detalhe .doca-corpo { padding:0; display:flex; flex-direction:column; overflow:hidden; }
                /* Regra de recolher do 09b e so de classes; estas tem ID e
                   venceriam, deixando o corpo visivel na doca recolhida. */
                #doca-equipe.recolhida .doca-corpo, #doca-eq-detalhe.recolhida .doca-corpo { display:none; }

                /* DUAS COLUNAS num painel so, divisoria no meio. */
                #doca-equipe .de-wrap { flex:1; min-height:0; display:flex; }
                #doca-equipe .de-col-lista { flex:1; min-width:0; display:flex; flex-direction:column; }
                #doca-equipe .de-div { flex:none; width:1px; background:linear-gradient(180deg, transparent, rgba(148,163,184,.35) 12%, rgba(148,163,184,.35) 88%, transparent); }
                #doca-equipe .de-col-ficha { flex:none; min-width:0; overflow-y:auto; padding:11px 12px; }
                #doca-equipe .de-col-ficha::-webkit-scrollbar { width:8px; }
                #doca-equipe .de-col-ficha::-webkit-scrollbar-thumb { background:rgba(148,163,184,.25); border-radius:99px; }

                /* A doca fica no TOPO (o z-index da 09b vale). Ela so desce
                   enquanto um popup do jogo esta aberto — ver docaCederAoJogo
                   no 09c. Baixar o z-index de vez consertava o caso do held e
                   quebrava o resto. */
                /* overflow VISIVEL pra fita poder sair da borda; o recorte de
                   canto passa pro corpo, que e quem tem conteudo rolando. */
                #doca-equipe { overflow:visible; }
                #doca-equipe .doca-corpo { border-radius:0 0 13px 13px; }
                #doca-equipe .doca-recolher {
                    position:absolute; right:-15px; top:50%; transform:translateY(-50%);
                    width:16px; height:58px; padding:0; border-radius:0 8px 8px 0;
                    background:rgba(30,41,59,.97); border:1px solid rgba(148,163,184,.3);
                    color:#94a3b8; font-size:10px; line-height:56px; z-index:5;
                    display:block !important; border-left:none;
                }
                #doca-equipe .doca-recolher:hover { color:#7dd3fc; border-color:rgba(56,189,248,.5); }
                /* Recolhida: o botao vai pro TOPO da fita (order:-1). No fluxo
                   normal do header ele nasce DEPOIS do titulo, e numa coluna
                   isso o jogava pro pe da fita, longe do alcance. */
                #doca-equipe.recolhida { overflow:hidden; }
                #doca-equipe.recolhida .doca-recolher {
                    position:static; transform:none; order:-1;
                    width:24px; height:24px; line-height:22px; border-radius:6px;
                    border:1px solid rgba(148,163,184,.3);
                }
                #doca-equipe.recolhida .doca-head { padding:8px 3px; gap:8px; align-items:center; }
                #doca-equipe.recolhida .doca-tit {
                    writing-mode:vertical-rl; text-orientation:mixed;
                    max-height:calc(100% - 60px); overflow:hidden; text-overflow:ellipsis;
                    white-space:nowrap; font-size:11px; letter-spacing:.3px;
                }
                #doca-equipe.recolhida .doca-bt[data-vista] { display:none; }
                #doca-equipe .doca-bt[data-vista].vista-on { background:rgba(56,189,248,.22); border-color:rgba(56,189,248,.5); color:#e0f2fe; }
                #doca-equipe .de-fechar { background:rgba(148,163,184,.12); border:1px solid rgba(148,163,184,.25); color:#cbd5e1; border-radius:6px; padding:3px 8px; font-size:12px; cursor:pointer; font-family:inherit; }
                #doca-equipe .de-fechar:hover { color:#fca5a5; border-color:rgba(239,68,68,.45); }
                #doca-equipe .de-topo { flex:none; padding:9px 10px 7px; border-bottom:1px solid rgba(148,163,184,.12); }
                #doca-equipe .de-linha1 { display:flex; gap:6px; }
                #doca-equipe .de-busca { flex:1; min-width:0; background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:8px; padding:7px 9px; font-size:11px; color:#e2e8f0; font-family:inherit; }
                #doca-equipe .de-busca:focus { outline:none; border-color:rgba(56,189,248,.6); }
                #doca-equipe .de-sel { background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:8px; padding:7px 5px; font-size:10.5px; color:#e2e8f0; font-family:inherit; }
                #doca-equipe .de-ico-bt { background:rgba(15,23,42,.7); border:1px solid rgba(148,163,184,.28); border-radius:8px; padding:0 8px; font-size:13px; color:#94a3b8; cursor:pointer; font-family:inherit; }
                #doca-equipe .de-ico-bt.on { color:#7dd3fc; border-color:rgba(56,189,248,.45); }

                #doca-equipe .de-chips { display:flex; flex-wrap:wrap; gap:4px; margin-top:7px; }
                #doca-equipe .de-chip { display:flex; align-items:center; gap:4px; font-size:10px; font-weight:800; padding:4px 9px; border-radius:999px; background:rgba(148,163,184,.1); border:1px solid transparent; color:#cbd5e1; cursor:pointer; font-family:inherit; }
                #doca-equipe .de-chip:hover { border-color:rgba(56,189,248,.45); }
                #doca-equipe .de-chip.on { background:rgba(56,189,248,.18); border-color:rgba(56,189,248,.5); color:#e0f2fe; }
                #doca-equipe .de-chip.venda.on { background:rgba(239,68,68,.2); border-color:rgba(239,68,68,.55); color:#fecaca; }
                #doca-equipe .de-chip i { font-style:normal; opacity:.6; font-weight:700; }

                /* CAMPEOES: as duas perguntas, lado a lado, sempre visiveis. */
                #doca-equipe .de-resumo { flex:none; padding:8px 10px; display:flex; gap:7px; border-bottom:1px solid rgba(148,163,184,.12); }
                #doca-equipe .de-campeao { flex:1; min-width:0; border-radius:9px; padding:7px 9px; border:1px solid; }
                #doca-equipe .de-campeao.pw { background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(30,41,59,.4)); border-color:rgba(245,158,11,.3); }
                #doca-equipe .de-campeao.fc { background:linear-gradient(135deg, rgba(56,189,248,.14), rgba(30,41,59,.4)); border-color:rgba(56,189,248,.3); }
                #doca-equipe .de-campeao .rot { font-size:8.5px; font-weight:800; text-transform:uppercase; letter-spacing:.6px; opacity:.75; }
                #doca-equipe .de-campeao.pw .rot { color:#fbbf24; }
                #doca-equipe .de-campeao.fc .rot { color:#7dd3fc; }
                #doca-equipe .de-campeao .nm { font-size:11.5px; font-weight:800; color:#f1f5f9; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                #doca-equipe .de-campeao .vl { font-size:9.5px; color:#94a3b8; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                #doca-equipe .de-nota { flex:none; font-size:9.5px; color:#cbd5e1; padding:7px 10px; line-height:1.5; background:rgba(56,189,248,.06); border-bottom:1px solid rgba(148,163,184,.12); }
                #doca-equipe .de-nota b { color:#fbbf24; }

                #doca-equipe .de-scroll { flex:1; min-height:0; overflow-y:auto; padding:5px 8px 10px; }
                #doca-equipe .de-scroll::-webkit-scrollbar, #doca-eq-detalhe .doca-corpo::-webkit-scrollbar { width:8px; }
                #doca-equipe .de-scroll::-webkit-scrollbar-thumb, #doca-eq-detalhe .doca-corpo::-webkit-scrollbar-thumb { background:rgba(148,163,184,.25); border-radius:99px; }

                /* ── CARD DO POKEMON ── */
                #doca-equipe .de-item { display:flex; gap:8px; align-items:center; padding:6px 7px; border-radius:9px; cursor:pointer; border:1px solid transparent; margin-bottom:3px; background:rgba(148,163,184,.05); }
                #doca-equipe .de-item:hover { background:rgba(56,189,248,.1); border-color:rgba(56,189,248,.28); }
                #doca-equipe .de-item.sel { background:rgba(56,189,248,.17); border-color:rgba(56,189,248,.55); }
                #doca-equipe .de-item.marcado { background:rgba(239,68,68,.14); border-color:rgba(239,68,68,.45); }
                #doca-equipe .de-item.notime { box-shadow:inset 3px 0 0 #a855f7; }
                #doca-equipe .de-chk { width:14px; height:14px; flex:none; accent-color:#ef4444; cursor:pointer; }
                #doca-equipe .de-ic { width:32px; height:32px; flex:none; display:flex; align-items:center; justify-content:center; }
                #doca-equipe .de-ic canvas, #doca-equipe .de-ic img { image-rendering:pixelated; max-width:32px; max-height:32px; }
                #doca-equipe .de-txt { min-width:0; flex:1; }
                #doca-equipe .de-l1 { display:flex; gap:5px; align-items:baseline; }
                /* O NOME estica; os selos colam logo depois dele. Antes o
                   flex:1 estava nos selos, o que abria um vao enorme entre
                   o nome curto e os icones la na ponta direita. */
                #doca-equipe .de-nome { flex:0 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; font-weight:800; color:#eef4fb; }
                #doca-equipe .de-lv { flex:none; font-size:9px; font-weight:700; color:#7c8899; }
                #doca-equipe .de-selos { flex:none; font-size:9.5px; white-space:nowrap; letter-spacing:-1px; }
                #doca-equipe .de-l1 > .de-espaco { flex:1; min-width:4px; }

                /* Barras de IV e GROWTH: os componentes da nota, visiveis. Sem
                   isso a nota era um numero pra acreditar, nao pra conferir. */
                /* Uma barra por LINHA, ocupando a largura toda. Lado a lado,
                   em 400px, sobravam ~80px pra cada uma: barra pequena demais
                   pra ler e ainda espremia o numero. Empilhadas, cada uma tem
                   largura de verdade e cabe o valor CRU junto do percentual. */
                #doca-equipe .de-barras { margin-top:5px; }
                #doca-equipe .de-barra { display:flex; align-items:center; gap:6px; }
                #doca-equipe .de-barra + .de-barra { margin-top:3px; }
                /* Rotulo em TEXTO. So o emoji nao dizia qual barra era qual —
                   e sem saber o que a barra mede, ela nao mede nada. */
                #doca-equipe .de-barra .rot { flex:none; width:17px; font-size:8px; font-weight:800; color:#7c8899; letter-spacing:.3px; }
                #doca-equipe .de-barra.iv .rot { color:#4ade80; }
                #doca-equipe .de-barra.gr .rot { color:#7dd3fc; }
                #doca-equipe .de-barra .cab { flex:none; order:3; font-size:8.5px; font-weight:700; color:#7c8899; letter-spacing:.2px; white-space:nowrap; }
                #doca-equipe .de-barra .cab b { color:#dbe4ee; font-weight:800; font-variant-numeric:tabular-nums; }
                /* MEDIDOR, nao duas faixas. O trilho estava em .18 de opacidade
                   e competia com o preenchimento: a parte vazia parecia estar
                   medindo alguma coisa tambem. Agora ele e so o rastro que leva
                   o olho ate o fim da escala — quem fala e a parte pintada. */
                #doca-equipe .de-barra .trilho { flex:1; min-width:0; height:5px; border-radius:99px; background:rgba(148,163,184,.07); box-shadow:inset 0 0 0 1px rgba(148,163,184,.09); overflow:hidden; }
                #doca-equipe .de-barra .cheio { height:100%; border-radius:99px; box-shadow:0 0 6px -1px currentColor; }
                #doca-equipe .de-barra.iv .cheio { color:#4ade80; }
                #doca-equipe .de-barra.gr .cheio { color:#7dd3fc; }
                #doca-equipe .de-barra.iv .cheio { background:linear-gradient(90deg,#22c55e,#4ade80); }
                #doca-equipe .de-barra.gr .cheio { background:linear-gradient(90deg,#0ea5e9,#7dd3fc); }
                #doca-equipe .de-l3 { font-size:9px; color:#7c8899; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

                /* Nota + grau, o bloco que fecha o card a direita. */
                #doca-equipe .de-nota-bloco { flex:none; text-align:center; min-width:34px; }
                #doca-equipe .de-ficha { font-size:16px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
                #doca-equipe .de-tierchip { display:inline-block; margin-top:3px; font-size:8px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid rgba(148,163,184,.35); color:#94a3b8; }
                #doca-equipe .de-grau { display:inline-block; margin-top:3px; font-size:8.5px; font-weight:800; padding:1px 5px; border-radius:4px; letter-spacing:.3px; }
                #doca-equipe .g-sp, #doca-eq-detalhe .g-sp { color:#f0abfc; background:rgba(217,70,239,.16); }
                #doca-equipe .g-s,  #doca-eq-detalhe .g-s  { color:#4ade80; background:rgba(34,197,94,.16); }
                #doca-equipe .g-a,  #doca-eq-detalhe .g-a  { color:#7dd3fc; background:rgba(56,189,248,.16); }
                #doca-equipe .g-b,  #doca-eq-detalhe .g-b  { color:#fbbf24; background:rgba(245,158,11,.16); }
                #doca-equipe .g-c,  #doca-eq-detalhe .g-c  { color:#fb923c; background:rgba(249,115,22,.16); }
                #doca-equipe .g-d,  #doca-eq-detalhe .g-d  { color:#94a3b8; background:rgba(148,163,184,.16); }

                /* ── BARRA DE VENDA ── */
                #doca-equipe .de-vendabar { flex:none; padding:8px 10px; border-top:1px solid rgba(239,68,68,.28); background:rgba(239,68,68,.09); }
                #doca-equipe .de-presel { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:7px; }
                #doca-equipe .de-pchip { font-size:9.5px; font-weight:700; padding:4px 8px; border-radius:6px; background:rgba(15,23,42,.6); border:1px solid rgba(148,163,184,.25); color:#cbd5e1; cursor:pointer; font-family:inherit; }
                #doca-equipe .de-pchip:hover { border-color:rgba(56,189,248,.5); color:#e0f2fe; }
                #doca-equipe .de-cnt { font-size:10.5px; color:#fca5a5; font-weight:700; margin-bottom:6px; }
                #doca-equipe .de-cnt b { color:#fecaca; }
                #doca-equipe .de-cnt .oculto { color:#fbbf24; }
                #doca-equipe .de-bt { width:100%; padding:8px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; font-family:inherit; border:1px solid rgba(239,68,68,.5); background:rgba(239,68,68,.2); color:#fecaca; }
                #doca-equipe .de-bt:disabled { opacity:.35; cursor:not-allowed; }
                #doca-equipe .de-vazio { font-size:10.5px; color:#64748b; text-align:center; padding:20px 10px; line-height:1.55; }

                /* ── COLUNA DA FICHA ── */
                #doca-equipe .ded-topo { display:flex; gap:10px; align-items:flex-start; cursor:pointer; padding:4px; margin:-4px; border-radius:9px; }
                #doca-equipe .ded-topo:hover { background:rgba(56,189,248,.1); }
                #doca-equipe .ded-ic { width:56px; height:56px; flex:none; display:flex; align-items:center; justify-content:center; background:rgba(148,163,184,.08); border-radius:11px; }
                #doca-equipe .ded-ic canvas, #doca-equipe .ded-ic img { image-rendering:pixelated; max-width:52px; max-height:52px; }
                #doca-equipe .ded-id { min-width:0; flex:1; }
                #doca-equipe .ded-nome { font-size:14px; font-weight:800; color:#f1f5f9; line-height:1.2; }
                /* Badges na gramatica do card do jogo. */
                #doca-equipe .ded-badges { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
                #doca-equipe .bdg { font-size:8.5px; font-weight:800; padding:2px 6px; border-radius:5px; letter-spacing:.2px; }
                #doca-equipe .bdg.poder { background:rgba(245,158,11,.16); color:#fbbf24; }
                #doca-equipe .bdg.tipo { background:rgba(148,163,184,.16); color:#cbd5e1; }
                #doca-equipe .bdg.rar { background:rgba(217,70,239,.16); color:#f0abfc; }
                #doca-equipe .bdg.tier { background:rgba(56,189,248,.16); color:#7dd3fc; }
                #doca-equipe .ded-hero { display:flex; align-items:center; gap:10px; margin:11px 0 4px; padding:9px 11px; border-radius:10px; background:rgba(148,163,184,.07); border:1px solid rgba(148,163,184,.16); }
                #doca-equipe .ded-hero .n { font-size:30px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; }
                #doca-equipe .ded-hero .lado div:first-child { font-size:10.5px; font-weight:800; color:#e2e8f0; }
                #doca-equipe .ded-hero .lado div:last-child { font-size:9px; color:#8792a3; margin-top:1px; }
                /* Componentes EMPILHADOS, cada um com o valor cru e a barra na
                   largura toda — lado a lado nao cabia numero nenhum. */
                #doca-equipe .ded-comp { display:flex; flex-direction:column; gap:6px; margin:9px 0; }
                #doca-equipe .ded-cbox { border-radius:9px; padding:8px 10px; background:rgba(148,163,184,.06); border:1px solid rgba(148,163,184,.14); }
                #doca-equipe .ded-cbox .r { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; color:#7c8899; }
                #doca-equipe .ded-cbox .v { font-size:19px; font-weight:800; margin-top:2px; font-variant-numeric:tabular-nums; }
                #doca-equipe .ded-cbox .v s { font-size:11px; font-weight:600; color:#7c8899; text-decoration:none; }
                #doca-equipe .ded-cbox.iv .v { color:#4ade80; }
                #doca-equipe .ded-cbox.gr .v { color:#7dd3fc; }
                #doca-equipe .ded-cbox .trilho { height:6px; border-radius:99px; background:rgba(148,163,184,.07); box-shadow:inset 0 0 0 1px rgba(148,163,184,.09); margin:6px 0 5px; overflow:hidden; }
                #doca-equipe .ded-cbox .cheio { height:100%; border-radius:99px; box-shadow:0 0 8px -2px currentColor; }
                #doca-equipe .ded-cbox.iv .cheio { background:linear-gradient(90deg,#22c55e,#4ade80); color:#4ade80; }
                #doca-equipe .ded-cbox.gr .cheio { background:linear-gradient(90deg,#0ea5e9,#7dd3fc); color:#7dd3fc; }
                #doca-equipe .ded-cbox .s { font-size:10px; color:#94a3b8; line-height:1.5; }
                #doca-equipe .ded-fatos { display:flex; flex-direction:column; gap:1px; margin:9px 0; }
                #doca-equipe .ded-fato { display:flex; justify-content:space-between; gap:10px; font-size:11px; padding:4px 7px; border-radius:5px; }
                #doca-equipe .ded-fato:nth-child(odd) { background:rgba(148,163,184,.06); }
                #doca-equipe .ded-fato span { color:#8792a3; flex:none; }
                #doca-equipe .ded-fato b { color:#e2e8f0; font-weight:700; text-align:right; }
                #doca-equipe .ded-sec { font-size:9.5px; font-weight:800; color:#7c8899; text-transform:uppercase; letter-spacing:.6px; margin:13px 0 5px; }
                #doca-equipe .ded-acoes { display:flex; flex-direction:column; gap:5px; margin-top:10px; }
                #doca-equipe .ded-bt { padding:8px 10px; border-radius:8px; font-size:10.5px; font-weight:800; cursor:pointer; font-family:inherit; border:1px solid rgba(148,163,184,.28); background:rgba(15,23,42,.55); color:#cbd5e1; text-align:left; }
                #doca-equipe .ded-bt:hover { border-color:rgba(56,189,248,.5); color:#e0f2fe; }
                #doca-equipe .ded-golpes { display:flex; flex-wrap:wrap; gap:4px; }
                #doca-equipe .gchip { font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px; background:rgba(56,189,248,.12); color:#bae6fd; border:1px solid rgba(56,189,248,.22); }
                #doca-equipe .ded-hab { font-size:11px; color:#e2e8f0; padding:7px 9px; border-radius:8px;
                    background:rgba(217,70,239,.1); border:1px solid rgba(217,70,239,.25); margin-bottom:5px; }
                #doca-equipe .ded-hab i { color:#f0abfc; font-style:normal; font-size:9px; font-weight:800; }
                #doca-equipe .ded-nota-leve { font-size:10px; color:#8792a3; line-height:1.5; }
                #doca-equipe .ded-linha { display:flex; gap:5px; }
                #doca-equipe .ded-linha .ded-bt { flex:1; min-width:0; text-align:center; padding:7px 6px; }
                #doca-equipe .ded-bt.perigo { border-color:rgba(239,68,68,.45); background:rgba(239,68,68,.14); color:#fecaca; text-align:center; }
                /* "Ex.: Bulbasaur, Ivysaur..." estava em 9px, ilegivel. Este e
                   um conteudo pra LER, nao uma nota de rodape. */
                #doca-equipe .ded-exemplos { font-size:10.5px; line-height:1.6; color:#c3cdda; margin-top:8px; padding:7px 9px; border-radius:8px; background:rgba(148,163,184,.06); }
                #doca-equipe .ded-exemplos b { color:#8792a3; font-weight:800; }
                /* Mesmo cartao do bloco de exemplos: era texto solto em 9.5px,
                   e o olho lia como rodape descartavel — sendo que e a
                   explicacao da nota inteira. */
                #doca-equipe .ded-obs { font-size:10.5px; color:#c3cdda; line-height:1.6; margin-top:8px;
                    padding:8px 10px; border-radius:8px; background:rgba(148,163,184,.06); }
                #doca-equipe .ded-obs b { color:#e2e8f0; font-weight:800; }
                /* Matchup de tipo: duas linhas, rotulo a esquerda e as
                   pastilhas correndo a direita. */
                #doca-equipe .mlinha { display:flex; gap:7px; align-items:flex-start; margin-bottom:6px; }
                #doca-equipe .mrot { flex:none; width:74px; font-size:8.5px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; padding-top:3px; }
                #doca-equipe .mrot.forte { color:#4ade80; }
                #doca-equipe .mrot.fraco { color:#f87171; }
                #doca-equipe .mrot.imune { color:#94a3b8; }
                #doca-equipe .mlista { flex:1; min-width:0; display:flex; flex-wrap:wrap; gap:3px; }
                #doca-equipe .mchip { display:inline-flex; align-items:center; gap:3px; font-size:9px; font-weight:700; padding:2px 6px; border-radius:5px; }
                #doca-equipe .mchip i { font-style:normal; font-size:8px; opacity:.75; font-weight:800; }
                #doca-equipe .mchip.f { background:rgba(34,197,94,.15); color:#86efac; }
                #doca-equipe .mchip.w { background:rgba(239,68,68,.15); color:#fca5a5; }
                #doca-equipe .mchip.i { background:rgba(148,163,184,.14); color:#cbd5e1; }
                #doca-equipe .mvazio { font-size:9px; color:#64748b; font-style:italic; padding-top:3px; }
            `;
            document.head.appendChild(st);
        }

        const EQ_GRAU_CLASSE = { 'S+': 'g-sp', 'S': 'g-s', 'A': 'g-a', 'B': 'g-b', 'C': 'g-c', 'D': 'g-d' };

        function docaEquipe() {
            if (_docaEq && _docaEq.el.isConnected) return _docaEq;
            docaEqCss();
            _docaEq = docaCriar({
                id: 'doca-equipe', titulo: '⭐ Avaliador da conta',
                lado: 'direita', largura: docaEqLarguras(false).total, ancora: 'modal',
                // Na BARRA DE TÍTULO, não dentro do corpo: trocar de vista e
                // fechar são ações da janela, e o lugar delas é onde se espera
                // encontrar controle de janela.
                //
                // Sem botão de recarregar: a doca já redesenha sozinha a cada
                // 400ms quando o estado muda.
                acoes: EQ_VISTAS.map(v => ({
                    icone: v.icone, titulo: v.titulo, ao: () => docaEqTrocarVista(v.chave)
                })).concat([{
                    // ✕ RECOLHE, nao fecha de vez. Fechar deixava o painel
                    // inalcancavel ate reabrir o Time & Box — e um clique errado
                    // nao pode custar isso. Recolhido ele vira a fita lateral,
                    // que devolve o painel com um clique.
                    icone: '✕', titulo: 'Recolher o painel',
                    ao: () => { if (_docaEq) _docaEq.recolher(true); }
                }])
            });
            // Marca qual vista está ativa: os botões vêm da doca genérica sem
            // estado, então a classe é posta aqui.
            _docaEq.el.querySelectorAll('.doca-head .doca-bt').forEach((b, i) => {
                if (EQ_VISTAS[i]) b.dataset.vista = EQ_VISTAS[i].chave;
                else if (b.textContent === '✕') b.classList.add('de-bt-fechar');
            });
            // Recolher/expandir muda a largura efetiva, e a reserva no painel do
            // jogo tem que acompanhar no mesmo gesto — senão sobra um rombo.
            docaEqMarcarVista();
            const orig = _docaEq.recolher;
            _docaEq.recolher = function (sim) { orig.call(_docaEq, sim); docaEqAplicarLarguras(); };
            return _docaEq;
        }

        // ⚠️ NÃO use `.eq-slots`: o Mercado monta "🐾 Pokémon do Box" com a mesma
        // classe (game.js:8303) e a doca abriria por cima dele. O marcador é
        // `tb-body` no #modal-body — o teste que o próprio jogo faz (5440).
        function docaEqBoxAberta() {
            const bg = document.getElementById('modal-bg');
            if (!bg || bg.classList.contains('hidden')) return false;
            const corpo = document.getElementById('modal-body');
            if (corpo && corpo.classList.contains('tb-body')) return true;
            const tit = document.getElementById('modal-title');
            return !!(tit && (tit.textContent || '').indexOf('Equipe') >= 0);
        }

        // K é `let` de topo de script no game.js: não vive no window.
        function docaEqEstado() {
            let est = null;
            try { if (typeof K !== 'undefined' && K) est = K; } catch (e) { }
            if (!est) {
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    est = w.K || null;
                } catch (e) { }
            }
            return est;
        }

        function docaEqAssinatura(K) {
            if (!K) return '';
            let s = [_docaEqOrdem, _docaEqBusca, _docaEqOrigem, _docaEqSel,
                _docaEqModoVenda, _docaEqMarcados.size, _docaEqDens,
                _docaEqShiny, _docaEqLendario, _docaEqRaridade, _docaEqVista].join('|') + '|';
            for (const p of (K.team || [])) s += p.id + ':' + p.level + ':' + (p.locked ? 1 : 0) + ',';
            for (const p of (K.box || [])) s += p.id + ':' + p.level + ':' + (p.locked ? 1 : 0) + ',';
            return s;
        }

        const docaEqEsc = t => String(t == null ? '' : t).replace(/[&<>"]/g,
            c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

        function docaEqNum(n) {
            const v = Number(n) || 0;
            return v >= 1000 ? v.toLocaleString('pt-BR') : String(v);
        }

        function docaEqLinhas(K) { return contarEspecies(listarPokesConta(K)); }

        function docaEqDesenhar(forcar) {
            const d = docaEquipe();
            const K = docaEqEstado();
            if (!K) {
                d.corpo.innerHTML = `<div class="de-vazio">Sem acesso ao estado do jogo agora.<br>
                    Se persistir depois de reabrir o Time &amp; Box, é regressão nossa.</div>`;
                d.rodape.textContent = 'sem dados';
                _docaEqSig = '';
                return;
            }
            const sig = docaEqAssinatura(K);
            if (!forcar && sig === _docaEqSig) return;

            docaEqAplicarLarguras();

            const focoNaBusca = !!(d.corpo.querySelector('#de-busca') &&
                document.activeElement === d.corpo.querySelector('#de-busca'));
            const caret = focoNaBusca ? d.corpo.querySelector('#de-busca').selectionStart : null;

            const todas = docaEqLinhas(K);
            const favoritos = docaEqFavoritos();
            const linhas = ordenarPokes(filtrarPokes(todas, {
                termo: _docaEqBusca,
                soShiny: _docaEqShiny || undefined,
                soLendario: _docaEqLendario || undefined,
                raridade: _docaEqRaridade || undefined,
                origem: (_docaEqOrigem === 'time' || _docaEqOrigem === 'box') ? _docaEqOrigem : null,
                soFavoritos: _docaEqOrigem === 'fav' ? true : undefined,
                soVendavel: _docaEqModoVenda || undefined,
                favoritos
            }), _docaEqOrdem);
            const r = resumoPokes(todas);
            const detalhada = _docaEqDens === 'detalhada';

            const cols = docaEqColunas();
            let html = '<div class="de-wrap">';
            if (cols.lista) html += `<div class="de-col-lista">
                <div class="de-topo">
                    <div class="de-linha1">
                        <input type="text" class="de-busca" id="de-busca" placeholder="🔍 Nome, tipo, tier, item..." value="${docaEqEsc(_docaEqBusca)}" />
                        <select class="de-sel" id="de-ordem" title="Ordenar por">
                            <option value="ficha">⭐ Ficha</option>
                            <option value="power">⚡ Poder</option>
                            <option value="dps">🎯 DPS</option>
                            <option value="iv">🧬 IV</option>
                            <option value="growth">📈 Growth</option>
                            <option value="nivel">🆙 Nível</option>
                            <option value="copias">⧉ Cópias</option>
                            <option value="valor">💰 Valor</option>
                            <option value="nome">🔤 Nome</option>
                        </select>
                        <button class="de-ico-bt${detalhada ? ' on' : ''}" id="de-dens" title="${detalhada ? 'Esconder IV e Growth na lista' : 'Mostrar IV e Growth na lista'}">IV</button>
                    </div>
                    <div class="de-chips">
                        <button class="de-chip${_docaEqOrigem === 'tudo' ? ' on' : ''}" data-org="tudo">Tudo <i>${todas.length}</i></button>
                        <button class="de-chip${_docaEqOrigem === 'time' ? ' on' : ''}" data-org="time">⚔ Time <i>${r ? r.noTime : 0}</i></button>
                        <button class="de-chip${_docaEqOrigem === 'box' ? ' on' : ''}" data-org="box">📦 Box <i>${r ? r.naBox : 0}</i></button>
                        <button class="de-chip${_docaEqOrigem === 'fav' ? ' on' : ''}" data-org="fav">⭐ <i>${favoritos.size}</i></button>
                        <button class="de-chip venda${_docaEqModoVenda ? ' on' : ''}" id="de-modo-venda">💰 Vender</button>
                    </div>
                    <div class="de-chips">
                        <button class="de-chip attr${_docaEqShiny ? ' on' : ''}" data-attr="shiny">✨ Shiny <i>${todas.filter(x => x.shiny).length}</i></button>
                        <button class="de-chip attr${_docaEqLendario ? ' on' : ''}" data-attr="lendario">👑 Lendário <i>${todas.filter(x => x.lendario).length}</i></button>
                        <select class="de-sel" id="de-rar" title="Raridade do IV">
                            <option value="">💎 Toda raridade</option>
                            ${[...new Set(todas.map(x => x.raridadeIv).filter(Boolean))].sort()
                    .map(r => `<option value="${docaEqEsc(r)}">${docaEqEsc(r)}</option>`).join('')}
                        </select>
                    </div>
                </div>`;

            if (r && cols.lista) {
                html += `
                    <div class="de-resumo">
                        <div class="de-campeao pw">
                            <div class="rot">⚡ Bate mais agora</div>
                            <div class="nm">${docaEqEsc(r.maisForte.nomeLegivel)}</div>
                            <div class="vl">${docaEqNum(r.maisForte.power)} poder · ${docaEqNum(r.maisForte.dps)} DPS</div>
                        </div>
                        <div class="de-campeao fc">
                            <div class="rot">⭐ Melhor ficha</div>
                            <div class="nm">${docaEqEsc(r.melhorFicha.nomeLegivel)}</div>
                            <div class="vl">${r.melhorFicha.ficha} · IV ${r.melhorFicha.ivPct}% · GR ${r.melhorFicha.growthPct == null ? '—' : r.melhorFicha.growthPct + '%'}</div>
                        </div>
                    </div>`;
                if (r.divergem) {
                    html += `<div class="de-nota">Os dois não são o mesmo pokémon, e está certo:
                        <b>poder</b> é quanto ele bate hoje e depende do nível;
                        <b>ficha</b> é o que foi sorteado na captura e não muda mais.</div>`;
                }
            }

            if (cols.lista) {
            html += '<div class="de-scroll" id="de-scroll">';
            if (!linhas.length) {
                html += `<div class="de-vazio">${_docaEqModoVenda
                    ? 'Nenhum pokémon vendável com esse filtro.<br>O time inteiro, os travados 🔒 e o ativo ⚔ nunca entram.'
                    : 'Nada casa com esse filtro.'}</div>`;
            }

            for (const l of linhas) {
                const fav = favoritos.has(l.id);
                const marcado = _docaEqMarcados.has(l.id);
                const tipos = [l.tipo1, l.tipo2].filter(Boolean).join('/');
                const selos = (l.ativo ? '⚔' : '') + (l.locked ? '🔒' : '') + (fav ? '⭐' : '') + (l.shiny ? '✨' : '');
                html += `
                    <div class="de-item${l.id === _docaEqSel ? ' sel' : ''}${marcado ? ' marcado' : ''}${l.origem === 'time' ? ' notime' : ''}" data-id="${docaEqEsc(l.id)}">
                        ${_docaEqModoVenda ? `<input type="checkbox" class="de-chk" data-marca="${docaEqEsc(l.id)}"${marcado ? ' checked' : ''} />` : ''}
                        <div class="de-ic" data-look="${l.lookType == null ? '' : l.lookType}" data-shiny="${l.shiny ? 1 : 0}"></div>
                        <div class="de-txt">
                            <div class="de-l1">
                                <span class="de-nome">${docaEqEsc(l.nomeLegivel)}</span>
                                <span class="de-lv">Lv${l.nivel}</span>
                                <span class="de-selos">${selos}</span>
                                <span class="de-espaco"></span>
                            </div>
                            ${detalhada ? `
                            <div class="de-barras">
                                <div class="de-barra iv">
                                    <span class="rot">IV</span>
                                    <span class="trilho"><span class="cheio" style="width:${l.ivPct}%"></span></span>
                                    <span class="cab"><b>${l.iv.toFixed(2)}</b>/${IV_MAX_JOGO} · ${l.ivPct}%</span>
                                </div>
                                <div class="de-barra gr">
                                    <span class="rot">GR</span>
                                    <span class="trilho"><span class="cheio" style="width:${l.growthPct || 0}%"></span></span>
                                    <span class="cab">${l.growthTotal == null ? '—' : `<b>${l.growthTotal}</b>/${l.growthMax}`} · ${l.growthPct == null ? '—' : l.growthPct + '%'}</span>
                                </div>
                            </div>` : ''}
                            <div class="de-l3">⚡${docaEqNum(l.power)}${tipos ? ' · ' + docaEqEsc(tipos) : ''}${(l.copias || 1) > 1 ? ' · ⧉' + l.copias : ''}</div>
                        </div>
                        <div class="de-nota-bloco">
                            <div class="de-ficha ${EQ_GRAU_CLASSE[l.grau] || 'g-d'}">${l.ficha}</div>
                            <span class="de-grau ${EQ_GRAU_CLASSE[l.grau] || 'g-d'}" title="Grau da NOSSA nota">${l.grau}</span>
                            ${l.tier ? `<span class="de-tierchip" title="Tier da espécie, do servidor">T${docaEqEsc(l.tier)}</span>` : ''}
                        </div>
                    </div>`;
            }
            html += '</div>';
            }

            if (cols.lista && _docaEqModoVenda) {
                const marc = todas.filter(l => _docaEqMarcados.has(l.id) && l.vendavel);
                const total = marc.reduce((a, b) => a + b.sell, 0);
                const visiveis = new Set(linhas.map(l => l.id));
                const ocultos = marc.filter(l => !visiveis.has(l.id)).length;
                html += `
                    <div class="de-vendabar">
                        <div class="de-presel">
                            <button class="de-pchip" data-presel="visiveis" title="Marca tudo que está aparecendo agora">☑ Visíveis</button>
                            ${Object.keys(PRESELS_POKE).map(k =>
                    `<button class="de-pchip" data-presel="${k}" title="${docaEqEsc(PRESELS_POKE[k].dica)}">${docaEqEsc(PRESELS_POKE[k].rotulo)}</button>`).join('')}
                            <button class="de-pchip" data-presel="limpar">✕ Limpar</button>
                        </div>
                        <div class="de-cnt"><b>${marc.length}</b> marcado(s) · <b>$${docaEqNum(total)}</b>${ocultos ? ` · <span class="oculto">${ocultos} fora do filtro</span>` : ''}</div>
                        <button class="de-bt" id="de-vender"${marc.length ? '' : ' disabled'}>💰 Vender ${marc.length}</button>
                    </div>`;
            }
            if (cols.lista) html += '</div>';

            // Coluna da ficha. No modo "ambos" ela só existe com pokémon
            // escolhido; no modo "ficha" ela é a tela inteira e, sem seleção,
            // explica o que fazer em vez de aparecer em branco.
            const escolhido = _docaEqSel ? todas.find(x => x.id === _docaEqSel) : null;
            if (!escolhido && _docaEqSel) _docaEqSel = null;   // vendido: sem fantasma
            if (cols.ficha) {
                if (cols.lista) html += '<div class="de-div"></div>';
                html += '<div class="de-col-ficha" id="de-ficha">'
                    + (escolhido ? docaEqHtmlFicha(escolhido, favoritos)
                        : '<div class="de-vazio">Nenhum pokémon escolhido.<br>Volte pro ranking (☰ ou ▥ no topo) e clique num.</div>')
                    + '</div>';
            }
            html += '</div>';

            d.corpo.innerHTML = html;
            const colFicha = d.corpo.querySelector('#de-ficha');
            if (colFicha) colFicha.style.width = cols.lista ? docaEqLarguras(true).ficha + 'px' : '100%';
            docaEqAplicarLarguras();
            docaEqPintarSprites(d.corpo);

            if (cols.lista) {
            const busca = d.corpo.querySelector('#de-busca');
            if (busca) {
                busca.oninput = () => { _docaEqBusca = busca.value; docaEqDesenhar(true); };
                if (focoNaBusca) {
                    busca.focus();
                    const p = caret == null ? busca.value.length : Math.min(caret, busca.value.length);
                    try { busca.setSelectionRange(p, p); } catch (e) { }
                }
            }
            const ordem = d.corpo.querySelector('#de-ordem');
            if (ordem) { ordem.value = _docaEqOrdem; ordem.onchange = () => { _docaEqOrdem = ordem.value; docaEqDesenhar(true); }; }
            const bdens = d.corpo.querySelector('#de-dens');
            if (bdens) bdens.onclick = () => {
                _docaEqDens = detalhada ? 'compacta' : 'detalhada';
                try { localStorage.setItem(DOCA_EQ_DENS_KEY, _docaEqDens); } catch (e) { }
                docaEqDesenhar(true);
            };
            d.corpo.querySelectorAll('.de-chip[data-org]').forEach(b => {
                b.onclick = () => { _docaEqOrigem = b.dataset.org; docaEqDesenhar(true); };
            });
            d.corpo.querySelectorAll('.de-chip[data-attr]').forEach(b => {
                b.onclick = () => {
                    if (b.dataset.attr === 'shiny') _docaEqShiny = !_docaEqShiny;
                    else _docaEqLendario = !_docaEqLendario;
                    docaEqDesenhar(true);
                };
            });
            const brar = d.corpo.querySelector('#de-rar');
            if (brar) { brar.value = _docaEqRaridade; brar.onchange = () => { _docaEqRaridade = brar.value; docaEqDesenhar(true); }; }
            const bvenda = d.corpo.querySelector('#de-modo-venda');
            if (bvenda) bvenda.onclick = () => {
                _docaEqModoVenda = !_docaEqModoVenda;
                // Sair do modo limpa a marcação: marca velha é a origem clássica
                // da venda por engano.
                if (!_docaEqModoVenda) _docaEqMarcados.clear();
                docaEqDesenhar(true);
            };
            d.corpo.querySelectorAll('.de-item[data-id]').forEach(it => {
                it.onclick = ev => {
                    if (ev.target.closest('.de-chk')) return;
                    docaEqSelecionar(it.dataset.id);
                };
            });
            d.corpo.querySelectorAll('.de-chk[data-marca]').forEach(c => {
                c.onchange = () => {
                    if (c.checked) _docaEqMarcados.add(c.dataset.marca);
                    else _docaEqMarcados.delete(c.dataset.marca);
                    docaEqDesenhar(true);
                };
            });
            d.corpo.querySelectorAll('.de-pchip[data-presel]').forEach(b => {
                b.onclick = () => docaEqPreselecionar(b.dataset.presel, todas, linhas);
            });
            const bvender = d.corpo.querySelector('#de-vender');
            if (bvender) bvender.onclick = () => docaEqVender(todas);

            const scroll = d.corpo.querySelector('#de-scroll');
            if (scroll) {
                if (_docaEqScroll > 0) scroll.scrollTop = _docaEqScroll;
                scroll.onscroll = () => { _docaEqScroll = scroll.scrollTop; };
            }
            }

            d.rodape.innerHTML = r
                ? `${todas.length} pokémon · ${r.travados} travados · ${r.vendaveis} vendáveis ($${docaEqNum(r.valorVendaveis)})`
                : '';

            if (escolhido) docaEqLigarFicha(d, escolhido);
            _docaEqSig = sig;
        }

        // As pré-seleções só MARCAM. Nenhuma vende nada, e todas passam pelo
        // mesmo funil de `vendavel` (box, destravado, não-ativo).
        function docaEqPreselecionar(qual, todas, visiveis) {
            if (qual === 'limpar') { _docaEqMarcados.clear(); docaEqDesenhar(true); return; }
            if (qual === 'visiveis') {
                for (const l of visiveis) if (l.vendavel) _docaEqMarcados.add(l.id);
                docaEqDesenhar(true);
                return;
            }
            const p = PRESELS_POKE[qual];
            if (!p) return;
            // Somam-se à marcação atual em vez de substituí-la: dá pra empilhar
            // "duplicatas piores" + "≤50" sem perder a primeira.
            for (const l of p.fn(todas)) _docaEqMarcados.add(l.id);
            docaEqDesenhar(true);
        }

        function docaEqPintarSprites(raiz) {
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w.loadSprite !== 'function') return;
                raiz.querySelectorAll('[data-look]').forEach(el => {
                    if (el.dataset.look === '') return;
                    const tam = el.classList.contains('ded-ic') ? 52 : 32;
                    const spr = w.loadSprite(Number(el.dataset.look), tam, el.dataset.shiny === '1');
                    if (spr) { el.textContent = ''; el.appendChild(spr); }
                });
            } catch (e) { }
        }

        function docaEqSelecionar(id) {
            // Clicar de novo fecha a coluna da ficha: o clique e interruptor.
            if (_docaEqSel === id) {
                _docaEqSel = null;
                docaEqDesenhar(true);
                docaEqAplicarLarguras();
                return;
            }
            _docaEqSel = id;
            // ESPELHO: o painel do meio abre o MESMO pokémon. Sem isso era
            // preciso caçar o bicho na grade pra saber qual era.
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w.openTeamBox === 'function') w.openTeamBox(id);
            } catch (e) { }
            docaEqDesenhar(true);
        }

        // ── COLUNA DA FICHA ────────────────────────────────────────────────
        // Segue a gramática do card do JOGO (badges de nível/poder, tipo,
        // raridade+IV cru, tier), com os números que ele mostra — "Mítica +2.46"
        // e "Growth 181/192 (94%)" — mais a nossa leitura por cima. Mostrar só
        // o percentual obrigava a traduzir de cabeça entre as duas telas.
        function docaEqHtmlFicha(l, favoritos) {
            const fav = favoritos.has(l.id);
            const fx = faixaFichaPoke(l.ficha);
            const cls = EQ_GRAU_CLASSE[l.grau] || 'g-d';
            const tipos = [l.tipo1, l.tipo2].filter(Boolean);
            const g = l.growthPorStat || null;
            const porStat = g
                ? ['hp', 'atk', 'def', 'spa', 'spd', 'vel']
                    .filter(k => g[k] != null)
                    .map(k => k.toUpperCase() + ' ' + g[k]).join(' · ')
                : '';

            let h = `
                <div class="ded-topo" id="ded-abrir" title="Abrir este pokémon no painel do jogo">
                    <div class="ded-ic" data-look="${l.lookType == null ? '' : l.lookType}" data-shiny="${l.shiny ? 1 : 0}"></div>
                    <div class="ded-id">
                        <div class="ded-nome">${l.shiny ? '✨ ' : ''}${docaEqEsc(l.nomeLegivel)}</div>
                        <div class="ded-badges">
                            <span class="bdg poder">Nv ${l.nivel} · ⚡ ${docaEqNum(l.power)}</span>
                            ${tipos.map(t => `<span class="bdg tipo">${docaEqEsc(t.toUpperCase())}</span>`).join('')}
                            ${l.raridadeIv ? `<span class="bdg rar">${docaEqEsc(l.raridadeIv)} +${l.iv.toFixed(2)}</span>` : ''}
                            ${l.tier ? `<span class="bdg tier">Tier ${docaEqEsc(l.tier)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="ded-hero">
                    <div class="n ${cls}">${l.ficha}</div>
                    <div class="lado">
                        <div>Grau ${l.grau} · ${fx.rotulo}</div>
                        <div>nota do indivíduo, 0 a 100</div>
                    </div>
                </div>
                <div class="ded-comp">
                    <div class="ded-cbox iv">
                        <div class="r">🧬 IV · peso 75%</div>
                        <div class="v">${l.iv.toFixed(3)} <s>de ${IV_MAX_JOGO}</s></div>
                        <div class="trilho"><div class="cheio" style="width:${l.ivPct}%"></div></div>
                        <div class="s">${l.ivPct}%${l.raridadeIv ? ' · ' + docaEqEsc(l.raridadeIv) : ''}</div>
                    </div>
                    <div class="ded-cbox gr">
                        <div class="r">📈 Growth · peso 25%</div>
                        <div class="v">${l.growthTotal == null ? '—' : l.growthTotal} <s>de ${l.growthMax}</s></div>
                        <div class="trilho"><div class="cheio" style="width:${l.growthPct || 0}%"></div></div>
                        <div class="s">${l.growthPct == null ? '—' : l.growthPct + '%'}${porStat ? ' · ' + docaEqEsc(porStat) : ''}</div>
                    </div>
                </div>
                <div class="ded-fatos">
                    <div class="ded-fato"><span>🎯 DPS</span><b>${docaEqNum(l.dps)}</b></div>
                    <div class="ded-fato"><span>⧉ Cópias na conta</span><b>${l.copias || 1}</b></div>
                    ${l.held ? `<div class="ded-fato"><span>🧤 Item segurado</span><b>${docaEqEsc(l.held)}${l.heldTier ? ' T' + l.heldTier : ''}</b></div>` : ''}
                    <div class="ded-fato"><span>💰 Vende por</span><b>$${docaEqNum(l.sell)}</b></div>
                </div>
                ${l.golpes && l.golpes.length ? `
                <div class="ded-sec">🎮 Golpes</div>
                <div class="ded-golpes">${l.golpes.map(g => `<span class="gchip">${docaEqEsc(itemNomeLegivel(g))}</span>`).join('')}</div>` : `
                <div class="ded-sec">🎮 Golpes</div>
                <div class="ded-nota-leve">O card da box vem leve e não traz os golpes
                    (o servidor os omite). Traga pro time ou abra no painel pra ver.</div>`}
                <div class="ded-sec">🧬 Habilidade</div>
                ${l.hab
                    ? `<div class="ded-hab"><b>${docaEqEsc(l.hab.n || l.hab.nome || l.hab.id || '?')}</b>${l.hab.oc ? ' <i>oculta</i>' : ''}</div>`
                    : `<div class="ded-nota-leve">Ainda não revelada.</div>`}
                <button class="ded-bt" id="ded-hab">🧬 Abrir Habilidades</button>
                <div class="ded-sec">⚙️ Ações</div>
                <div class="ded-acoes">
                    <div class="ded-linha">
                        <button class="ded-bt" id="ded-fav">${fav ? '⭐ Favorito' : '☆ Favoritar'}</button>
                        <button class="ded-bt" id="ded-lock">${l.locked ? '🔓 Destravar' : '🔒 Travar'}</button>
                    </div>
                    <div class="ded-linha">
                        ${l.origem === 'box'
                    ? `<button class="ded-bt" id="ded-time">⬆ Trazer pro time</button>`
                    : `<button class="ded-bt" id="ded-box"${l.ativo ? ' disabled title="O pokémon que caça não vai pra box"' : ''}>📦 Guardar no Box</button>`}
                        <button class="ded-bt" id="ded-ativo"${l.ativo ? ' disabled title="Já é quem caça"' : ''}>⚔ Usar na caçada</button>
                    </div>
                    <div class="ded-linha">
                        <button class="ded-bt" id="ded-chat">🔗 Linkar no chat</button>
                        <button class="ded-bt" id="ded-aura">✨ Aura</button>
                    </div>
                    <button class="ded-bt perigo" id="ded-vender"${l.vendavel ? '' : ' disabled title="' + (l.locked ? 'Travado' : l.ativo ? 'É o que caça' : 'Só pokémon da box') + '"'}>💰 Vender $${docaEqNum(l.sell)}${l.locked ? ' 🔒' : ''}</button>
                </div>
                <div class="ded-sec">⚔️ Contra quem ele é forte</div>
                <div id="ded-sug"></div>
                <div class="ded-obs">A nota <b>${l.ficha}</b> = 75% do IV (${l.ivPct}%) + 25% do growth
                    (${l.growthPct == null ? '—' : l.growthPct + '%'}) — os dois atributos sorteados na
                    captura, que não mudam. O <b>poder</b> é do jogo e depende do nível.
                    O <b>grau</b> é da nossa nota; o <b>tier</b> vem do servidor e fala da espécie.
                    ⭐ favorito é marca nossa, só neste navegador.</div>`;
            return h;
        }

        // Matchup de tipo. Cacheado por pokémon: a conta é barata, mas
        // refazê-la a cada tick de 400ms é desperdício puro.
        let _docaEqMatchCache = { id: null, html: '' };

        function docaEqHtmlMatchup(l) {
            if (_docaEqMatchCache.id === l.id) return _docaEqMatchCache.html;
            const m = matchupsDoPoke(l.cru || l);
            if (!m) return '<div class="ded-obs">Sem tipo registrado para este pokémon.</div>';

            const chip = (x, k) => `<span class="mchip ${k}">${docaEqEsc(x.rotulo)}<i>${x.mult}×</i></span>`;
            let h = '';
            h += `<div class="mlinha"><span class="mrot forte">▲ Forte contra</span>
                <span class="mlista">${m.forte.length ? m.forte.map(x => chip(x, 'f')).join('') : '<span class="mvazio">nada com vantagem</span>'}</span></div>`;
            h += `<div class="mlinha"><span class="mrot fraco">▼ Cuidado com</span>
                <span class="mlista">${m.fraco.length ? m.fraco.map(x => chip(x, 'w')).join('') : '<span class="mvazio">nenhuma fraqueza</span>'}</span></div>`;
            if (m.imune.length) {
                h += `<div class="mlinha"><span class="mrot imune">⊘ Não causa dano</span>
                    <span class="mlista">${m.imune.map(x => `<span class="mchip i">${docaEqEsc(x.rotulo)}</span>`).join('')}</span></div>`;
            }

            // Nomes reconhecíveis pros tipos em que ele é forte.
            let dex = null;
            try { if (typeof S !== 'undefined' && S && Array.isArray(S.dex)) dex = S.dex; } catch (e) { }
            const presas = especiesFracasContra(m, dex, 8);
            if (presas.length) {
                h += `<div class="ded-exemplos"><b>Ex.:</b> ${presas.map(x => docaEqEsc(x.nome)).join(' · ')}</div>`;
            }
            _docaEqMatchCache = { id: l.id, html: h };
            return h;
        }

        function docaEqLigarFicha(d, l) {
            docaEqPintarSprites(d.corpo);
            const bf = d.corpo.querySelector('#ded-fav');
            if (bf) bf.onclick = ev => { ev.stopPropagation(); docaEqAlternarFavorito(l.id); };
            const bl = d.corpo.querySelector('#ded-lock');
            if (bl) bl.onclick = ev => { ev.stopPropagation(); docaEqTravar(l); };
            // No modo "só a ficha" não há lista pra clicar: o próprio cabeçalho
            // é o caminho de mandar o painel do jogo abrir este pokémon.
            const babrir = d.corpo.querySelector('#ded-abrir');
            if (babrir) babrir.onclick = () => {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                try { if (typeof w.openTeamBox === 'function') w.openTeamBox(l.id); } catch (e) { }
            };

            // Todas as ações abaixo são as MESMAS do menu da ficha do jogo, com
            // os mesmos payloads (game.js ~5690). Nenhuma regra nova aqui: só o
            // caminho curto pra elas.
            const acao = (id, fn) => {
                const b = d.corpo.querySelector('#' + id);
                if (b && !b.disabled) b.onclick = ev => { ev.stopPropagation(); fn(); };
            };
            acao('ded-time', () => docaEqAcaoJogo('setActive', l));
            acao('ded-box', () => docaEqAcaoJogo('moveToBox', l));
            acao('ded-ativo', () => docaEqAcaoJogo('setActive', l));
            acao('ded-chat', () => {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                try { if (typeof w.sendChatMessage === 'function') w.sendChatMessage(l.id); } catch (e) { }
            });
            acao('ded-aura', () => {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                try { if (typeof w.openAuraSelect === 'function') w.openAuraSelect(l.cru || l); } catch (e) { }
            });
            acao('ded-vender', () => docaEqVenderUm(l));
            // A tela de Habilidades vive num IIFE do app-2.js, sem nada
            // exportado — mas o botão dela está no topbar com id fixo. Clicar
            // no botão real é o mesmo proxy que o painel v2 já usa pro v1, e
            // não duplica regra nenhuma da mecânica.
            acao('ded-hab', () => {
                // Fecha o Time & Box ANTES de abrir Habilidades: aquela e uma
                // tela cheia, e deixar o painel do jogo e a doca abertos atras
                // dela so empilha janela. Fechar o modal fecha a doca junto (o
                // tick percebe), entao e um gesto so.
                const fechar = document.getElementById('modal-close');
                if (fechar) fechar.click();
                const b = document.getElementById('tb-habilidades');
                if (b) b.click();
            });

            const alvo = d.corpo.querySelector('#ded-sug');
            if (alvo) alvo.innerHTML = docaEqHtmlMatchup(l);
        }

        // Ação do jogo, sem regra nossa no meio. O painel do jogo se redesenha
        // sozinho (o Y devolve o state novo), e a doca acompanha pelo tick.
        function docaEqAcaoJogo(acao, l) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            if (typeof w.Y !== 'function') return;
            Promise.resolve(w.Y(acao, { pokeId: l.id }))
                .then(() => { _docaEqSig = ''; docaEqDesenhar(true); })
                .catch(() => { });
        }

        // Venda de UM, com o mesmo pedágio da venda em massa: uiConfirm do jogo,
        // com nome, nível, ficha e valor. Irreversível não pode ter atalho.
        async function docaEqVenderUm(l) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            if (!l.vendavel) return;
            const msg = 'Vender ' + l.nomeLegivel + ' Lv' + l.nivel + ' (ficha ' + l.ficha + ')' +
                ' por $' + docaEqNum(l.sell) + '?\n\nEssa ação não tem volta.';
            let ok = false;
            try {
                ok = typeof w.uiConfirm === 'function'
                    ? await w.uiConfirm(msg, { rotuloSim: '💰 Vender', perigo: true })
                    : false;
            } catch (e) { ok = false; }
            if (!ok) return;
            try {
                if (typeof w.Y !== 'function') return;
                if (await w.Y('sell', { pokeId: l.id })) {
                    _docaEqSel = null;
                    _docaEqSig = '';
                    docaEqDesenhar(true);
                }
            } catch (e) { console.error('[doca-eq] sell', e); }
        }

        function docaEqTravar(l) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            if (typeof w.Y !== 'function') return;
            Promise.resolve(w.Y('lockPoke', { pokeId: l.id }))
                .then(() => { _docaEqSig = ''; docaEqDesenhar(true); })
                .catch(() => { });
        }

        // Irreversível. A confirmação é o uiConfirm DO JOGO, com quantos, quanto
        // e os nomes — e o que está marcado mas escondido pelo filtro entra na
        // conta e é dito (o jogo já teve esse bug: marcava 40, filtrava, via 3,
        // vendia 40). Sem uiConfirm disponível, não vende.
        async function docaEqVender(todas) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            const marc = (todas || []).filter(l => _docaEqMarcados.has(l.id) && l.vendavel);
            if (!marc.length) return;
            const total = marc.reduce((a, b) => a + b.sell, 0);
            const nomes = marc.slice(0, 6).map(l => l.nomeLegivel + ' Lv' + l.nivel + ' (ficha ' + l.ficha + ')').join(', ');
            const resto = marc.length > 6 ? ' e mais ' + (marc.length - 6) : '';
            const msg = 'Vender ' + marc.length + ' pokémon por $' + docaEqNum(total) + '?\n\n' +
                nomes + resto + '.\n\nEssa ação não tem volta.';
            let ok = false;
            try {
                ok = typeof w.uiConfirm === 'function'
                    ? await w.uiConfirm(msg, { rotuloSim: '💰 Vender', perigo: true })
                    : false;
            } catch (e) { ok = false; }
            if (!ok) return;
            try {
                if (typeof w.Y !== 'function') return;
                const r = await w.Y('sellMany', { ids: marc.map(l => l.id) });
                if (r) {
                    _docaEqMarcados.clear();
                    _docaEqSel = null;
                    if (typeof w.showStatusToast === 'function') {
                        w.showStatusToast('💰 ' + marc.length + ' pokémon vendidos!');
                    }
                    if (typeof w.openTeamBox === 'function') w.openTeamBox();
                    _docaEqSig = '';
                    docaEqDesenhar(true);
                }
            } catch (e) { console.error('[doca-eq] sellMany', e); }
        }

        let _docaEqJaAbriu = false;
        function docaEqAbrir() {
            if (!_docaEqJaAbriu) {
                _docaEqJaAbriu = true;
                docaMedir('doca:primeira-abertura', { doca: 'equipe' });
            }
            docaEquipe().mostrar(true);
            docaEqAutoSelecionar();
            docaEqAplicarLarguras();
            docaEqDesenhar(true);
        }

        // Abrir sem nada escolhido deixava metade do painel dizendo "nenhum
        // pokémon escolhido" — uma tela vazia como primeira impressão. Começa
        // no que está CAÇANDO (o do ⚔), que é o que o jogador está olhando;
        // sem ativo, o melhor do time; sem time, o melhor da conta.
        function docaEqAutoSelecionar() {
            if (_docaEqSel) return;
            const K = docaEqEstado();
            if (!K) return;
            const todas = docaEqLinhas(K);
            if (!todas.length) return;
            const alvo = todas.find(l => l.ativo)
                || ordenarPokes(todas.filter(l => l.origem === 'time'), 'power')[0]
                || ordenarPokes(todas, 'ficha')[0];
            if (alvo) _docaEqSel = alvo.id;
        }

        function docaEqFechar() {
            if (_docaEq) _docaEq.mostrar(false);
            // Devolve o espaço do painel do jogo. Deixar o modal encolhido
            // depois que a doca sumiu seria um bug que ninguém ligaria à gente.
            liberarEspacoModal('doca-equipe');
            _docaEqSig = '';
        }

        let _docaEqEnvelopada = false;
        function docaEqEnvelopar() {
            if (_docaEqEnvelopada) return true;
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            const orig = w.openTeamBox;
            if (typeof orig !== 'function' || orig.__docaEq) return !!(orig && orig.__docaEq);
            const env = function (id) {
                const r = orig.apply(this, arguments);
                try {
                    // Clicar num dos 6 slots do time (ou num da box) chama
                    // openTeamBox(id). Capturar o argumento faz a doca seguir o
                    // painel do jogo: escolheu lá, abre a ficha aqui.
                    if (id != null && id !== '') _docaEqSel = id;
                    docaEqAbrir();
                } catch (e) { console.error('[doca-eq] abrir', e); }
                return r;
            };
            env.__docaEq = true;
            env.__original = orig;
            try { w.openTeamBox = env; } catch (e) { return false; }
            _docaEqEnvelopada = true;
            return true;
        }

        let _docaEqObs = null;
        function docaEqObservarModal() {
            if (_docaEqObs) return true;
            const bg = document.getElementById('modal-bg');
            if (!bg || typeof MutationObserver !== 'function') return false;
            _docaEqObs = new MutationObserver(() => { try { docaEqTick(); } catch (e) { } });
            _docaEqObs.observe(bg, { attributes: true, attributeFilter: ['class'] });
            const tit = document.getElementById('modal-title');
            if (tit) _docaEqObs.observe(tit, { childList: true, characterData: true, subtree: true });
            return true;
        }

        function docaEqTick() {
            docaEqEnvelopar();
            docaEqObservarModal();
            if (_docaEq) docaCederAoJogo(_docaEq.el);
            const aberta = docaEqBoxAberta();
            const doca = _docaEq;
            if (aberta) {
                if (!doca || !doca.aberta()) docaEqAbrir();
                else docaEqDesenhar(false);
            } else if (doca && doca.aberta()) {
                docaEqFechar();
            }
        }

        if (!window.__docaEquipeInstalada) {
            window.__docaEquipeInstalada = true;
            // PRÉ-AQUECIMENTO: cria o elemento e injeta o CSS agora, escondido.
            // Sem isto o primeiro clique pagava tudo junto — criar o nó, montar
            // a folha de estilo e só então desenhar — e o painel aparecia com
            // atraso visível, empurrando o jogo depois de já estar na tela.
            const _fimCriar = docaCronometro('doca:criada', { doca: 'equipe' });
            try { docaEquipe(); } catch (e) { }
            _fimCriar();
            docaEqEnvelopar();
            docaEqObservarModal();
            setInterval(docaEqTick, 400);
            docaMedir('doca:instalada', { doca: 'equipe' });
        }

        // =====================================================================
        // 37d-doca-custo.js — DOCA "CUSTO DE CAPTURA" (adaptada do dev)
        // =====================================================================
        // No dev isto e uma ABA dentro do painel Idle Suite v2 inteiro
        // (scripts/37d-aba-custo-captura.js, registrada em __ABAS_EXTRA_V2 que
        // scripts/37b le pra montar as abas). Sem o painel v2 aqui, virou uma
        // DOCA independente (docaCriar, 09b) igual Inventario/Equipe/Hunts —
        // abre com Shift+C. A logica de calculo (medir, nao estimar, o custo
        // de captura a partir de /api/ballmanager + /api/globalcaps + /api/meta)
        // e a MESMA do dev; so a apresentacao mudou de aba pra doca, e
        // `ultimoStateGeral` (variavel do Auto Hunt, nao existe aqui) virou
        // leitura direta de window.K/gameState.
        // =====================================================================
        const CUSTO_PRECO_FALLBACK = { pokeball: 15, great: 40, super: 50, ultra: 80, premier: 0, supermoon: 0, master: 0 };

        let custoPrecoBolas = null;
        let custoListaBolas = null;
        let custoGlobal = null;
        let custoOrdem = 'ouro';
        let custoCarregando = false;
        let _docaCusto = null;

        function custoFmt(n) {
            const v = Number(n) || 0;
            return v.toLocaleString('pt-BR');
        }
        function custoFmtCurto(n) {
            const v = Number(n) || 0;
            if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
            if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
            if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
            return String(Math.round(v));
        }

        function custoEstadoAtual() {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            return (w.K && typeof w.K === 'object') ? w.K : ((w.gameState && typeof w.gameState === 'object') ? w.gameState : {});
        }

        function custoCopiasPorEspecie() {
            const mapa = {};
            try {
                const s = custoEstadoAtual();
                const listas = [];
                if (Array.isArray(s.box)) listas.push(s.box);
                if (Array.isArray(s.team)) listas.push(s.team);
                listas.forEach(l => l.forEach(p => {
                    const n = String((p && p.name) || '').toLowerCase().trim();
                    if (n) mapa[n] = (mapa[n] || 0) + 1;
                }));
            } catch (e) { }
            return mapa;
        }

        function custoPrecoDe(chave) {
            const k = String(chave || '').toLowerCase();
            if (custoPrecoBolas && custoPrecoBolas[k]) return custoPrecoBolas[k];
            return { gold: CUSTO_PRECO_FALLBACK[k] || 0, diamonds: 0, label: k };
        }

        function custoDaEspecie(item) {
            let gold = 0, diam = 0;
            const bolas = (item && item.balls) || {};
            for (const [k, qtd] of Object.entries(bolas)) {
                const p = custoPrecoDe(k);
                gold += (Number(p.gold) || 0) * (Number(qtd) || 0);
                diam += (Number(p.diamonds) || 0) * (Number(qtd) || 0);
            }
            return { gold, diam };
        }

        async function custoBuscarDados(forcar) {
            if (custoCarregando) return;
            if (custoListaBolas && !forcar) return;
            custoCarregando = true;
            try {
                const tok = (typeof obterToken === 'function') ? obterToken() : '';
                const [bm, gc, meta] = await Promise.all([
                    tok ? fetch('/api/ballmanager?token=' + encodeURIComponent(tok)).then(r => r.json()).catch(() => null) : null,
                    fetch('/api/globalcaps').then(r => r.json()).catch(() => null),
                    fetch('/api/meta').then(r => r.json()).catch(() => null)
                ]);

                if (meta && Array.isArray(meta.balls)) {
                    custoPrecoBolas = {};
                    meta.balls.forEach(b => {
                        if (!b || !b.key) return;
                        custoPrecoBolas[String(b.key).toLowerCase()] = {
                            gold: Number(b.gold) || 0,
                            diamonds: Number(b.diamonds) || 0,
                            label: String(b.label || b.key).replace(/\s+/g, ' ').trim()
                        };
                    });
                }

                if (bm && Array.isArray(bm.list)) custoListaBolas = bm.list;
                else if (!custoListaBolas) {
                    const s = custoEstadoAtual();
                    if (Array.isArray(s.brokes)) custoListaBolas = s.brokes;
                }

                if (gc) custoGlobal = gc;
            } catch (e) {
                if (typeof logErro === 'function') logErro('Doca Custo', String((e && e.message) || e));
            } finally {
                custoCarregando = false;
            }
        }

        function custoPaneHtml() {
            return `
                <div class="v2-counters custo-counters">
                    <span class="v2-counter"><span class="v2-counter-label">💸 Ouro em bolas</span><span id="custo-total-ouro" class="v2-counter-val" style="color:#fbbf24">—</span></span>
                    <span class="v2-counter"><span class="v2-counter-label">⚾ Bolas jogadas</span><span id="custo-total-bolas" class="v2-counter-val" style="color:#fca5a5">—</span></span>
                    <span class="v2-counter"><span class="v2-counter-label">🎯 Espécies</span><span id="custo-total-especies" class="v2-counter-val" style="color:#7dd3fc">—</span></span>
                    <span class="v2-counter"><span class="v2-counter-label">✨ Shiny no servidor</span><span id="custo-taxa-shiny" class="v2-counter-val" style="color:#fbbf24">—</span></span>
                </div>
                <div class="custo-barra">
                    <input type="text" id="custo-busca" class="custo-input" placeholder="🔍 Buscar espécie..." />
                    <select id="custo-ordem" class="custo-input custo-sel">
                        <option value="ouro">Mais ouro gasto</option>
                        <option value="bolas">Mais bolas jogadas</option>
                        <option value="copias">Mais caro por cópia</option>
                        <option value="nome">Nome (A-Z)</option>
                    </select>
                    <button id="custo-recarregar" class="custo-btn">🔄 Atualizar</button>
                </div>
                <div class="custo-nota" id="custo-nota"></div>
                <div class="custo-tabela-wrap">
                    <table class="custo-tabela">
                        <thead>
                            <tr>
                                <th class="custo-th-nome">Espécie</th>
                                <th>Bolas</th>
                                <th class="custo-th-chips">Por tipo</th>
                                <th>Ouro gasto</th>
                                <th title="Cópias que você tem agora (box + equipe)">Cópias</th>
                                <th title="Ouro gasto ÷ cópias que você tem — é um TETO">Ouro/cópia (teto)</th>
                                <th title="Capturas desta espécie no servidor inteiro">Servidor</th>
                            </tr>
                        </thead>
                        <tbody id="custo-tbody">
                            <tr><td colspan="7" class="custo-vazio">Carregando…</td></tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        function custoRenderizar() {
            if (!_docaCusto) return;
            const pane = _docaCusto.corpo;
            const tbody = pane.querySelector('#custo-tbody');
            if (!tbody) return;

            if (!custoListaBolas) {
                tbody.innerHTML = '<tr><td colspan="7" class="custo-vazio">' +
                    (custoCarregando ? 'Carregando…' : 'Não consegui ler o gerenciador de bolas. Clique em Atualizar.') +
                    '</td></tr>';
                return;
            }

            const copias = custoCopiasPorEspecie();
            const capsServidor = {};
            const shinyServidor = {};
            if (custoGlobal && Array.isArray(custoGlobal.species)) {
                custoGlobal.species.forEach(sp => {
                    const n = String((sp && sp.name) || '').toLowerCase().trim();
                    if (!n) return;
                    capsServidor[n] = Number(sp.captures) || 0;
                    shinyServidor[n] = Number(sp.shinies) || 0;
                });
            }

            const linhas = custoListaBolas.map(it => {
                const nome = String((it && it.name) || '?').trim();
                const chave = nome.toLowerCase();
                const c = custoDaEspecie(it);
                const meus = copias[chave] || 0;
                return {
                    nome, chave,
                    total: Number(it.total) || 0,
                    balls: it.balls || {},
                    caught: !!it.caught,
                    gold: c.gold, diam: c.diam, meus,
                    porCopia: meus > 0 ? (c.gold / meus) : null,
                    servidor: capsServidor[chave] || 0,
                    servidorShiny: shinyServidor[chave] || 0
                };
            });

            const totOuro = linhas.reduce((a, l) => a + l.gold, 0);
            const totBolas = linhas.reduce((a, l) => a + l.total, 0);
            const elOuro = pane.querySelector('#custo-total-ouro');
            const elBolas = pane.querySelector('#custo-total-bolas');
            const elEsp = pane.querySelector('#custo-total-especies');
            const elShiny = pane.querySelector('#custo-taxa-shiny');
            if (elOuro) { elOuro.textContent = '$' + custoFmtCurto(totOuro); elOuro.title = '$' + custoFmt(totOuro); }
            if (elBolas) { elBolas.textContent = custoFmtCurto(totBolas); elBolas.title = custoFmt(totBolas) + ' bolas'; }
            if (elEsp) elEsp.textContent = custoFmt(linhas.length);
            if (elShiny) {
                if (custoGlobal && custoGlobal.total > 0) {
                    const taxa = (Number(custoGlobal.shinyTotal) || 0) / Number(custoGlobal.total);
                    elShiny.textContent = taxa > 0 ? ('1 em ' + custoFmt(Math.round(1 / taxa))) : 'nenhum ainda';
                    elShiny.title = custoFmt(custoGlobal.shinyTotal) + ' shinies em ' + custoFmt(custoGlobal.total) + ' capturas no servidor inteiro';
                } else {
                    elShiny.textContent = '—';
                }
            }

            const nota = pane.querySelector('#custo-nota');
            if (nota) {
                const semPreco = !custoPrecoBolas;
                nota.innerHTML =
                    '📐 <b>Medido, não estimado:</b> bolas jogadas vêm do gerenciador de bolas do jogo e o preço de cada bola vem do servidor' +
                    (semPreco ? ' <span style="color:#fca5a5">(falhou — usando a tabela fixa do script)</span>' : '') + '. ' +
                    '<b>Ouro/cópia é um teto:</b> o jogo não guarda quantas vezes você capturou cada espécie, então o divisor é quantas cópias você tem agora.';
            }

            const busca = (pane.querySelector('#custo-busca')?.value || '').toLowerCase().trim();
            let vis = busca ? linhas.filter(l => l.chave.includes(busca)) : linhas.slice();

            if (custoOrdem === 'nome') vis.sort((a, b) => a.nome.localeCompare(b.nome));
            else if (custoOrdem === 'bolas') vis.sort((a, b) => b.total - a.total);
            else if (custoOrdem === 'copias') vis.sort((a, b) => (b.porCopia == null ? -1 : b.porCopia) - (a.porCopia == null ? -1 : a.porCopia));
            else vis.sort((a, b) => b.gold - a.gold);

            if (!vis.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="custo-vazio">Nenhuma espécie com esse nome na sua lista.</td></tr>';
                return;
            }

            tbody.innerHTML = vis.map(l => {
                const chips = Object.entries(l.balls)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, q]) => {
                        const p = custoPrecoDe(k);
                        return '<span class="custo-chip" title="' + custoFmt(q) + ' × ' + (p.label || k) +
                            (p.gold ? ' a $' + custoFmt(p.gold) : '') + '">' + (p.label || k) + '<b>' + custoFmtCurto(q) + '</b></span>';
                    }).join('');
                const img = (typeof spriteArtePoke === 'function') ? spriteArtePoke(l.nome) : '';
                const porCopia = l.porCopia == null
                    ? '<span class="custo-dim" title="Você não tem nenhuma cópia desta espécie agora">—</span>'
                    : '$' + custoFmtCurto(l.porCopia);
                const servidor = l.servidor
                    ? custoFmtCurto(l.servidor) + (l.servidorShiny ? ' <span class="custo-shiny" title="' + l.servidorShiny + ' shiny(s) no servidor">✨' + l.servidorShiny + '</span>' : '')
                    : '<span class="custo-dim">—</span>';
                return '<tr>' +
                    '<td class="custo-td-nome">' +
                        (img ? '<img class="custo-sprite" src="' + img + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'" />' : '') +
                        '<span>' + l.nome + '</span>' +
                        (l.caught ? '<span class="custo-tag-ok" title="Já capturado">✓</span>' : '') +
                    '</td>' +
                    '<td class="custo-num">' + custoFmt(l.total) + '</td>' +
                    '<td class="custo-td-chips">' + chips + '</td>' +
                    '<td class="custo-num custo-ouro" title="$' + custoFmt(l.gold) + '">$' + custoFmtCurto(l.gold) +
                        (l.diam ? ' <span class="custo-diam" title="' + custoFmt(l.diam) + ' diamantes">💠' + custoFmtCurto(l.diam) + '</span>' : '') + '</td>' +
                    '<td class="custo-num">' + (l.meus || '<span class="custo-dim">0</span>') + '</td>' +
                    '<td class="custo-num">' + porCopia + '</td>' +
                    '<td class="custo-num">' + servidor + '</td>' +
                '</tr>';
            }).join('');
        }

        const CUSTO_CSS = `
            #doca-custo .custo-counters { display:flex; gap:10px; flex-wrap:wrap; padding:6px 2px; font-size:10px; }
            #doca-custo .v2-counter { display:flex; flex-direction:column; gap:1px; }
            #doca-custo .v2-counter-label { color:#94a3b8; font-size:9px; }
            #doca-custo .v2-counter-val { font-weight:800; font-size:12px; }
            #doca-custo .custo-barra { display:flex; gap:6px; align-items:center; flex-wrap:wrap; padding:4px 2px; }
            #doca-custo .custo-input {
                background: rgba(148,163,184,0.08); border: 1px solid rgba(148,163,184,0.2);
                border-radius: 7px; padding: 5px 9px; font-size: 11px; color: #f1f5f9; font-family: inherit;
            }
            #doca-custo #custo-busca { flex: 1; min-width: 100px; }
            #doca-custo .custo-btn {
                background: rgba(56,189,248,0.14); border: 1px solid rgba(56,189,248,0.36);
                border-radius: 7px; padding: 5px 11px; font-size: 11px; font-weight: 700;
                color: #7dd3fc; cursor: pointer; font-family: inherit;
            }
            #doca-custo .custo-nota { font-size: 10px; line-height: 1.5; color: #cbd5e1; padding: 4px 2px; }
            #doca-custo .custo-tabela-wrap { flex: 1; min-height: 160px; max-height: 50vh; overflow: auto; border-radius: 9px; border: 1px solid rgba(148,163,184,0.14); }
            #doca-custo .custo-tabela { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            #doca-custo .custo-tabela thead th {
                position: sticky; top: 0; z-index: 1; background: rgba(15,23,42,0.97); color: #94a3b8;
                font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px;
                text-align: right; padding: 6px 7px; border-bottom: 1px solid rgba(148,163,184,0.2); white-space: nowrap;
            }
            #doca-custo .custo-tabela thead th.custo-th-nome, #doca-custo .custo-tabela thead th.custo-th-chips { text-align: left; }
            #doca-custo .custo-tabela tbody td { padding: 4px 7px; border-bottom: 1px solid rgba(148,163,184,0.07); vertical-align: middle; }
            #doca-custo .custo-tabela tbody tr:hover { background: rgba(56,189,248,0.06); }
            #doca-custo .custo-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
            #doca-custo .custo-ouro { color: #fbbf24; font-weight: 700; }
            #doca-custo .custo-td-nome { display: flex; align-items: center; gap: 5px; font-weight: 700; color: #f8fafc; max-width: 150px; }
            #doca-custo .custo-td-nome > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #doca-custo .custo-sprite { width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; flex-shrink: 0; }
            #doca-custo .custo-tag-ok { color: #4ade80; font-size: 10px; }
            #doca-custo .custo-td-chips { display: flex; flex-wrap: wrap; gap: 3px; max-width: 150px; }
            #doca-custo .custo-chip {
                display: inline-flex; align-items: center; gap: 3px; font-size: 8px; font-weight: 700; color: #cbd5e1;
                background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.18); border-radius: 4px; padding: 0 4px; white-space: nowrap;
            }
            #doca-custo .custo-chip b { color: #fde047; }
            #doca-custo .custo-dim { color: #64748b; }
            #doca-custo .custo-shiny { color: #fde047; font-weight: 800; }
            #doca-custo .custo-diam { color: #67e8f9; font-weight: 700; }
            #doca-custo .custo-vazio { text-align: center; color: #64748b; padding: 16px; font-size: 10.5px; }
        `;

        async function custoAbrirDoca() {
            if (!document.getElementById('custo-doca-style')) {
                const st = document.createElement('style');
                st.id = 'custo-doca-style';
                st.textContent = CUSTO_CSS;
                document.head.appendChild(st);
            }
            if (typeof docaCriar !== 'function') return;
            if (!_docaCusto || !_docaCusto.el.isConnected) {
                _docaCusto = docaCriar({
                    id: 'doca-custo', titulo: '📉 Custo de Captura', lado: 'esquerda',
                    largura: 380, ancora: 'modal', tom: 'laranja', independente: true,
                    acoes: [{ icone: '↻', titulo: 'Recarregar dados', ao: () => custoBuscarDados(true).then(custoRenderizar) }]
                });
                _docaCusto.corpo.innerHTML = custoPaneHtml();
                const busca = _docaCusto.corpo.querySelector('#custo-busca');
                if (busca) busca.oninput = custoRenderizar;
                const ordem = _docaCusto.corpo.querySelector('#custo-ordem');
                if (ordem) { ordem.value = custoOrdem; ordem.onchange = () => { custoOrdem = ordem.value; custoRenderizar(); }; }
                const recarregar = _docaCusto.corpo.querySelector('#custo-recarregar');
                if (recarregar) {
                    recarregar.onclick = async () => {
                        recarregar.disabled = true;
                        recarregar.textContent = '⏳ Buscando…';
                        await custoBuscarDados(true);
                        recarregar.disabled = false;
                        recarregar.textContent = '🔄 Atualizar';
                        custoRenderizar();
                    };
                }
            }
            _docaCusto.mostrar(true, true);
            custoRenderizar();
            await custoBuscarDados(false);
            custoRenderizar();
        }

        function custoAlternarDoca() {
            if (_docaCusto && _docaCusto.el.classList.contains('on')) {
                _docaCusto.mostrar(false);
            } else {
                custoAbrirDoca();
            }
        }

        // Atalho Shift+C — mesmo padrao do sistema de pin (Shift+B/Shift+I).
        document.addEventListener('keydown', ev => {
            if (ev.defaultPrevented || ev.ctrlKey || ev.altKey || ev.metaKey) return;
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (ev.shiftKey && ev.key.toLowerCase() === 'c') { ev.preventDefault(); custoAlternarDoca(); }
        });

        (function () {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            w.__alternarDocaCusto = custoAlternarDoca;
        })();

        // =====================================================================
        // 37f-doca-hunts.js — DOCA DE HUNTS: favoritar, filtrar e entrar
        // =====================================================================
        // A tela de Hunts do jogo tem 650 zonas e um campo de busca — pra voltar
        // numa hunt conhecida, ou se digita o nome de novo, ou se rola a lista.
        // Esta doca guarda FAVORITOS e entra na zona com um clique.
        //
        // ── DE ONDE VEM CADA NUMERO (e o que NAO inventamos) ─────────────────
        //
        // ACESSO — regra exata do jogo, lida de app-1.js (funcao `C`):
        //     reqLevel >= 200 ? nivel >= reqLevel : nivel >= reqLevel - 20
        // Ou seja: abaixo de 200 ha um desconto de 20 niveis; de 200 pra cima,
        // nao ha. E o mesmo criterio do botao "So onde posso entrar".
        //
        // NIVEL DO SELVAGEM — e o proprio `reqLevel` da zona. Isto foi MEDIDO,
        // nao suposto, e a primeira medicao estava errada:
        //
        //   Tentativa 1 (descartada): cruzar `world/spawns.json` pelo NOME do
        //   pokemon. Cruzava em 650/650, mas pegava o bicho no MUNDO INTEIRO —
        //   a "Area de Snivy" saia como "Lv 1-900" porque existe Snivy de nivel
        //   900 em outro canto do mapa. Foi o preview que denunciou.
        //
        //   Tentativa 2 (correta): `zona.spawnPoints[]` traz {dx,dy} — offsets
        //   do centro da zona. Casando (cx+dx, cy+dy, z) com spawns.json casam
        //   6.496 de 6.496 pontos, 100%, nas 650 zonas.
        //
        // E com o casamento exato o resultado foi: `reqLevel` == nivel do
        // selvagem em TODAS as 650 zonas, sem excecao. Ou seja, o cruzamento
        // com spawns.json nao acrescenta nada e foi removido — `reqLevel`
        // sozinho ja e o nivel do bicho, exato e de graca. A "divergencia em
        // 282 zonas" que eu tinha anotado aqui era artefato do cruzamento
        // errado, nao um fato do jogo.
        //
        // VANTAGEM DE TIPO — `multDanoAtkVsDef` e `multDanoRecebido`
        // (26-auto-hunt-matriz.js), as MESMAS que o Auto Hunt usa pra escolher
        // zona. Uma segunda tabela aqui faria a doca discordar do robo que caca.
        //
        // ⚠️ XP POR MINUTO NAO E ESTIMADO. A formula de XP e do servidor e nao
        // esta publicada em lugar nenhum do cliente — qualquer numero de "XP/h"
        // calculado aqui seria invencao. Em vez disso a doca MEDE: enquanto
        // voce caca, `huntsAmostrarXp()` acumula XP e tempo por zona e a lista
        // passa a mostrar o SEU XP/h real naquela zona. Sem historico, a doca
        // mostra o nivel do selvagem e diz que e proxy — nao um numero com cara
        // de precisao que ninguem mediu.
        //
        // ── POR QUE ISTO NAO REPETE O ERRO DO 14d ────────────────────────────
        // `14d-sugestoes-hunt.js` conta que uma versao antiga sugeria zona pela
        // ficha do pokemon e foi descartada: o bicho da ficha e quase sempre um
        // Lv.1 da box, e mandar ele pra zona 400 e conselho impossivel de
        // seguir. Aqui a sugestao sai do POKEMON ATIVO e do SEU nivel de
        // treinador, e zona sem acesso aparece marcada como bloqueada. E a
        // diferenca entre "seria bom" e "da pra fazer agora".
        // =====================================================================
        const HUNTS_FAV_KEY = 'bugSuiteHuntsFavoritos';
        const HUNTS_XP_KEY = 'bugSuiteHuntsXpPorZona';
        const HUNTS_NIVEL_TETO = 200;   // o `m` do app-1.js

        let huntsFavoritos = new Set();
        try {
            const cru = localStorage.getItem(HUNTS_FAV_KEY);
            if (cru) { const a = JSON.parse(cru); if (Array.isArray(a)) huntsFavoritos = new Set(a.map(Number)); }
        } catch (e) { }

        let huntsXpPorZona = {};    // { zonaIndex: { xp, seg } }
        try {
            const cru = localStorage.getItem(HUNTS_XP_KEY);
            if (cru) { const o = JSON.parse(cru); if (o && typeof o === 'object') huntsXpPorZona = o; }
        } catch (e) { }

        let huntsFiltro = { busca: '', soFav: false, soAcesso: true, soVantagem: false, ordem: 'rec' };

        // Entrar numa hunt e parar olhando nao serve pra nada — o passo seguinte
        // e sempre ligar a caça. Ligado por padrao; o chip na doca desliga.
        const HUNTS_AUTOCACA_KEY = 'bugSuiteHuntsAutoCaca';
        let huntsAutoCaca = true;
        try {
            const v = localStorage.getItem(HUNTS_AUTOCACA_KEY);
            if (v != null) huntsAutoCaca = v === '1';
        } catch (e) { }
        let _docaHunts = null;
        let _huntsCache = null;      // lista montada (invalida ao trocar de ativo)

        function huntsSalvarFavoritos() {
            try { localStorage.setItem(HUNTS_FAV_KEY, JSON.stringify([...huntsFavoritos])); } catch (e) { }
        }
        function huntsSalvarXp() {
            try { localStorage.setItem(HUNTS_XP_KEY, JSON.stringify(huntsXpPorZona)); } catch (e) { }
        }

        // O nivel do selvagem e o `reqLevel` (ver cabecalho: medido, 650/650).
        function huntsNivelDaZona(z) {
            const n = Number(z.reqLevel) || null;
            return { min: n, max: n };
        }

        // ---------------------------------------------------------------------
        // Estado do jogador
        // ---------------------------------------------------------------------
        function huntsNivelJogador() {
            try {
                const s = ultimoStateGeral || {};
                return Number(s.player && s.player.level) || Number(jogadorInfo && jogadorInfo.level) || 0;
            } catch (e) { return 0; }
        }

        function huntsPokeAtivo() {
            try {
                const s = ultimoStateGeral || {};
                if (s.active && s.active.type1) return s.active;
                const t = Array.isArray(s.team) ? s.team : [];
                return t.find(p => p && p.active && p.type1) || t.find(p => p && p.type1) || null;
            } catch (e) { return null; }
        }

        function huntsTiposDe(p) {
            return [p && p.type1, p && p.type2]
                .filter(t => t && String(t).toLowerCase() !== 'none')
                .map(t => String(t).toLowerCase());
        }

        function huntsZonaAtualIndex() {
            try {
                const s = ultimoStateGeral || {};
                return (s.zone && s.zone.index != null) ? Number(s.zone.index) : -1;
            } catch (e) { return -1; }
        }

        // Regra de acesso do jogo, ipsis litteris.
        function huntsTemAcesso(z, nivel) {
            const req = Number(z.reqLevel) || 0;
            return req >= HUNTS_NIVEL_TETO ? nivel >= req : nivel >= (req - 20);
        }
        function huntsNivelExigido(z) {
            const req = Number(z.reqLevel) || 0;
            return req >= HUNTS_NIVEL_TETO ? req : Math.max(1, req - 20);
        }

        // ---------------------------------------------------------------------
        // Medicao de XP por zona (o unico numero de XP que a doca mostra)
        // ---------------------------------------------------------------------
        let _huntsUltimaAmostra = null;   // { zona, xp, kills, em }

        // ⚠️ A FONTE MUDOU, E PRA MELHOR.
        // A primeira versao media `player.xp`, o que obrigava a tratar subida de
        // nivel (o xp zera) e nao dizia nada sobre kills. Mas o jogo JA
        // contabiliza a caçada inteira em `state.hunt`:
        //
        //   { secs, xp, pxp, kills, catches, balls, loot[{name,count,gold}] }
        //
        // Sao contadores acumulados do proprio servidor. Tirando delta deles por
        // zona sai XP/h, kills/h e **XP por kill** — tudo medido, nada suposto.
        // No state real: 822.975.638 XP / 45.140 s = 65,6M XP/h, 13.837 kills =
        // 59.476 XP por kill.
        function huntsAmostrarXp() {
            try {
                const s = ultimoStateGeral;
                const h = s && s.hunt;
                if (!h) return;
                const zona = huntsZonaAtualIndex();
                const xp = Number(h.xp) || 0;
                const kills = Number(h.kills) || 0;
                const agora = Date.now();
                const ant = _huntsUltimaAmostra;

                // A base so avanca quando e consumida ou quando deixou de
                // servir. Trocar a cada tick (~400ms) faria o dt nunca alcancar
                // a janela minima e o medidor nunca registraria nada.
                const trocar = () => { _huntsUltimaAmostra = { zona, xp, kills, em: agora }; };

                if (zona < 0) return trocar();
                if (!ant || ant.zona !== zona) return trocar();

                const dt = (agora - ant.em) / 1000;
                if (dt < 3) return;                 // ainda cedo: mantem a base
                if (dt > 120) return trocar();      // aba parada: descarta

                const dxp = xp - ant.xp;
                const dk = kills - ant.kills;
                // `hunt` zera quando a caçada reinicia: delta negativo nao e
                // medida, e recomeço.
                if (dxp < 0 || dk < 0) return trocar();
                if (dxp === 0 && dk === 0) return trocar();

                const reg = huntsXpPorZona[zona] || { xp: 0, seg: 0, kills: 0 };
                reg.xp += dxp;
                reg.kills = (reg.kills || 0) + dk;
                reg.seg += dt;
                huntsXpPorZona[zona] = reg;
                trocar();
                if (reg.seg > 30 && Math.random() < 0.05) huntsSalvarXp();
            } catch (e) { }
        }

        function huntsKillsHora(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || r.seg < 60 || !r.kills) return null;
            return (r.kills / r.seg) * 3600;
        }

        // XP por kill medido — e o numero que permite projetar as outras zonas.
        function huntsXpPorKill(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || !r.kills || r.seg < 60) return null;
            return r.xp / r.kills;
        }

        // PROJECAO pras zonas que voce ainda nao caçou.
        // Nao ha formula de XP no cliente (o servidor nao publica), entao a
        // unica base honesta e o que VOCE ja mediu. Com pelo menos uma zona
        // medida, projetamos assumindo que o XP por kill acompanha o nivel do
        // selvagem — e a suposicao fica dita no tooltip, nao escondida.
        // Sem nenhuma medida, nao ha projecao: o card mostra nivel e vantagem.
        function huntsBaseProjecao() {
            let melhor = null;
            for (const k of Object.keys(huntsXpPorZona)) {
                const xpk = huntsXpPorKill(k);
                const kh = huntsKillsHora(k);
                if (xpk == null || kh == null) continue;
                const z = (META_ZONES || []).find(x => x && String(x.index) === String(k));
                const nivel = z ? (Number(z.reqLevel) || 0) : 0;
                if (!nivel) continue;
                const r = huntsXpPorZona[k];
                if (!melhor || r.seg > melhor.seg) melhor = { nivel, xpPorKill: xpk, killsHora: kh, seg: r.seg };
            }
            return melhor;
        }

        function huntsXpHora(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || r.seg < 60) return null;   // menos de 1 min nao e medida
            return (r.xp / r.seg) * 3600;
        }

        // ---------------------------------------------------------------------
        // Montagem e nota
        // ---------------------------------------------------------------------
        function huntsMontarLista() {
            const nivel = huntsNivelJogador();
            const ativo = huntsPokeAtivo();
            const meusTipos = huntsTiposDe(ativo);
            const zonas = (META_ZONES || []).filter(z => z && !z.city);

            return zonas.map(z => {
                const pk = z.pokemon || [];
                const tiposZona = [];
                pk.forEach(p => huntsTiposDe(p).forEach(t => { if (!tiposZona.includes(t)) tiposZona.push(t); }));

                // Melhor multiplicador do MEU golpe contra algum bicho da zona,
                // e o pior que algum bicho da zona faz em mim.
                let bato = 1, apanho = 1;
                if (meusTipos.length && typeof multDanoAtkVsDef === 'function') {
                    bato = 0;
                    pk.forEach(p => {
                        const d = huntsTiposDe(p);
                        if (!d.length) return;
                        const m = multDanoAtkVsDef(meusTipos, d);
                        if (m > bato) bato = m;
                    });
                    if (!bato) bato = 1;
                }
                if (meusTipos.length && typeof multDanoRecebido === 'function') {
                    pk.forEach(p => {
                        const a = huntsTiposDe(p);
                        if (!a.length) return;
                        const m = multDanoRecebido(a, meusTipos);
                        if (m > apanho) apanho = m;
                    });
                }

                const lv = huntsNivelDaZona(z);
                return {
                    index: z.index,
                    nome: z.name,
                    regiao: z.region || '',
                    reqLevel: Number(z.reqLevel) || 0,
                    exigido: huntsNivelExigido(z),
                    acesso: huntsTemAcesso(z, nivel),
                    pokemon: pk,
                    tipos: tiposZona,
                    lvMin: lv.min,
                    lvMax: lv.max,
                    bato,
                    apanho,
                    xpHora: huntsXpHora(z.index),
                    killsHora: huntsKillsHora(z.index),
                    fav: huntsFavoritos.has(Number(z.index))
                };
            });
        }

        // Nota de recomendacao. Componentes, todos verificaveis:
        //   • sem acesso -> fundo do poço (nao adianta recomendar o que trava);
        //   • XP/h MEDIDO por você domina quando existe;
        //   • senão, nível do selvagem (proxy honesto de XP) normalizado;
        //   • vantagem de tipo multiplica; levar 2x+ na cara penaliza.
        function huntsNota(h, tetoLv, tetoXp) {
            if (!h.acesso) return -1;
            let base;
            if (h.xpHora != null && tetoXp) base = h.xpHora / tetoXp;
            else if (h.xpProj && tetoXp) base = (h.xpProj / tetoXp) * 0.9;   // projetado vale menos que medido
            else base = tetoLv ? ((h.lvMax || 0) / tetoLv) * 0.85 : 0;
            const vant = h.bato >= 2 ? 1.35 : (h.bato >= 1 ? 1 : 0.55);
            const risco = h.apanho >= 2 ? 0.72 : 1;
            return base * vant * risco;
        }

        // ---------------------------------------------------------------------
        // UI
        // ---------------------------------------------------------------------
        function huntsFavoritar(idx) {
            const i = Number(idx);
            if (huntsFavoritos.has(i)) huntsFavoritos.delete(i); else huntsFavoritos.add(i);
            huntsSalvarFavoritos();
            huntsRenderizar();
        }

        async function huntsEntrar(idx) {
            const i = Number(idx);
            const z = (META_ZONES || []).find(x => x && x.index === i);
            if (!z) return;
            if (!huntsTemAcesso(z, huntsNivelJogador())) {
                if (typeof logEvent === 'function') logEvent(`🔒 "${z.name}" exige nível ${huntsNivelExigido(z)}.`, '#fca5a5');
                return;
            }
            try {
                if (typeof selecionarZonaConfirmada === 'function') await selecionarZonaConfirmada(i);
                else if (typeof selecionarZonaNativa === 'function') await selecionarZonaNativa(i);
                if (typeof logEvent === 'function') logEvent(`📍 Entrando em "${z.name}".`, '#7dd3fc');
                if (huntsAutoCaca) await huntsLigarCaca();
            } catch (e) {
                if (typeof logErro === 'function') logErro('Entrar na hunt', String((e && e.message) || e));
            }
            huntsRenderizar();
        }

        function huntsFmtXp(n) {
            if (n == null) return null;
            if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
            if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
            if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
            return String(Math.round(n));
        }

        // Liga a caça automatica do jogo (o "Caçar automático" da barra lateral).
        // E a MESMA chave que o Auto-Helper usa: `setAuto { hunt: true }` — nao
        // um clique simulado no checkbox, que dependeria do painel estar aberto
        // e do rotulo nao ter mudado de nome.
        async function huntsLigarCaca() {
            try {
                // O teleporte ainda esta assentando quando `selectZone` volta;
                // ligar a caça antes de o servidor registrar a zona nova faria
                // o robo comecar caçando na zona antiga.
                await new Promise(r => setTimeout(r, 700));
                const r = await chamadaSegura(() => apiTest('setAuto', { hunt: true }), 'ligar caça automática');
                const ok = r && r.data && (r.data.ok || r.data.state);
                if (ok) {
                    // Mantem o resto da suite em sincronia com o servidor: o
                    // widget da sidebar e o espelho do painel leem daqui.
                    try { if (typeof estadoAuto === 'object') estadoAuto.hunt = true; } catch (e) { }
                    try { if (typeof pintarAutoToggleIdle === 'function') pintarAutoToggleIdle('hunt', true); } catch (e) { }
                    try { if (typeof window.__setIdleAuto === 'function') window.__setIdleAuto('hunt', true); } catch (e) { }
                    if (typeof logEvent === 'function') logEvent('🎯 Caça automática ligada na zona nova.', '#4ade80');
                } else if (typeof logEvent === 'function') {
                    logEvent('🎯 Não consegui ligar a caça — o servidor não confirmou.', '#fca5a5');
                }
                return ok;
            } catch (e) { return false; }
        }

        function huntsCardHtml(h, atual, base) {
            const bloq = !h.acesso;
            const lv = h.lvMax == null ? '—' : ('Lv ' + h.lvMax);

            // Sprite do bicho principal da zona. O caminho e relativo e resolve
            // sozinho porque a doca roda DENTRO da pagina do jogo.
            const principal = h.pokemon[0];
            const sprite = (principal && typeof spriteAnimadoPoke === 'function')
                ? `<img class="hd-sprite" src="${spriteAnimadoPoke(principal.name)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`
                : '';

            const bichos = h.pokemon.map(p => p.name).join(', ');

            // Drops: pedras primeiro (sao o que se caça de proposito), o resto
            // depois. Vem de zone.pokemon[].loot / .stones.
            const pedras = [], comuns = [];
            h.pokemon.forEach(p => {
                (p.stones || []).forEach(x => { if (!pedras.includes(x)) pedras.push(x); });
                (p.loot || []).forEach(x => {
                    if ((p.stones || []).includes(x)) return;
                    if (!comuns.includes(x)) comuns.push(x);
                });
            });
            const drops = pedras.map(x => `<span class="hd-drop pedra">${x}</span>`).join('')
                        + comuns.slice(0, 4).map(x => `<span class="hd-drop">${x}</span>`).join('')
                        + (comuns.length > 4 ? `<span class="hd-drop mais">+${comuns.length - 4}</span>` : '');

            const selos = [];
            if (h.bato >= 2) selos.push(`<span class="hd-selo bom" title="Seu Pokémon ativo bate ${h.bato}× num dos bichos daqui">⚔️ ${h.bato}×</span>`);
            if (h.apanho >= 2) selos.push(`<span class="hd-selo ruim" title="Algum bicho daqui bate ${h.apanho}× em você">🛡️ ${h.apanho}×</span>`);

            // XP: medido ganha de projetado, sempre.
            const xpMed = huntsFmtXp(h.xpHora);
            const killsMed = h.killsHora;
            if (xpMed) {
                selos.push(`<span class="hd-selo medido" title="MEDIDO no seu jogo nesta zona: ${Math.round(h.xpHora).toLocaleString('pt-BR')} XP/h${killsMed ? ' · ' + Math.round(killsMed).toLocaleString('pt-BR') + ' kills/h' : ''}">📈 ${xpMed} XP/h</span>`);
            } else if (h.xpProj) {
                selos.push(`<span class="hd-selo proj" title="PROJEÇÃO, não medida: parte do que você mediu na sua melhor zona (${base.nivel} · ${Math.round(base.xpPorKill).toLocaleString('pt-BR')} XP por kill) e assume que o XP por kill acompanha o nível do selvagem. Cace aqui ~1 min e vira número medido.">≈ ${huntsFmtXp(h.xpProj)} XP/h</span>`);
            }

            return `
                <div class="hd-card${bloq ? ' bloq' : ''}${atual ? ' atual' : ''}" data-idx="${h.index}">
                    <button class="hd-fav${h.fav ? ' on' : ''}" data-fav="${h.index}" title="${h.fav ? 'Desfavoritar' : 'Favoritar'}">${h.fav ? '★' : '☆'}</button>
                    ${sprite}
                    <div class="hd-corpo" data-ir="${h.index}" title="${bloq ? 'Requer nível ' + h.exigido : 'Clique para entrar nesta hunt'}">
                        <div class="hd-l1">
                            <span class="hd-nome">${h.nome}</span>
                            ${atual ? '<span class="hd-atual">ATUAL</span>' : ''}
                        </div>
                        <div class="hd-l2">
                            <span class="hd-lv">${lv}</span>
                            <span class="hd-reg">${h.regiao}</span>
                            ${bloq ? '<span class="hd-lock">🔒 Nv ' + h.exigido + '</span>' : ''}
                        </div>
                        <div class="hd-l3">${bichos}</div>
                        ${drops ? '<div class="hd-drops">' + drops + '</div>' : ''}
                        ${selos.length ? '<div class="hd-selos">' + selos.join('') + '</div>' : ''}
                    </div>
                </div>`;
        }

        function huntsRenderizar() {
            if (!_docaHunts) return;
            const lista = huntsMontarLista();
            const nivel = huntsNivelJogador();
            const ativo = huntsPokeAtivo();
            const atualIdx = huntsZonaAtualIndex();

            const acessiveis = lista.filter(h => h.acesso);
            const tetoLv = acessiveis.reduce((a, h) => Math.max(a, h.lvMax || 0), 0);
            const tetoXp = acessiveis.reduce((a, h) => Math.max(a, h.xpHora || 0), 0);

            // Projecao pras zonas ainda nao caçadas — so existe se voce ja
            // mediu ALGUMA. Ver `huntsBaseProjecao`: nao ha formula de XP no
            // cliente, entao a unica base honesta e a sua propria medida.
            const base = huntsBaseProjecao();
            lista.forEach(h => {
                h.xpProj = null;
                if (base && h.acesso && h.xpHora == null && h.lvMax && base.nivel) {
                    // Assume que o XP por kill acompanha o nivel do selvagem e
                    // que a velocidade de kill se mantem. Duas suposicoes, e as
                    // duas estao ditas no tooltip do selo.
                    h.xpProj = base.xpPorKill * (h.lvMax / base.nivel) * base.killsHora;
                }
                h.nota = huntsNota(h, tetoLv, tetoXp);
            });

            let vis = lista;
            const q = huntsFiltro.busca.trim().toLowerCase();
            if (q) vis = vis.filter(h => h.nome.toLowerCase().includes(q) ||
                h.pokemon.some(p => String(p.name || '').toLowerCase().includes(q)));
            if (huntsFiltro.soFav) vis = vis.filter(h => h.fav);
            if (huntsFiltro.soAcesso) vis = vis.filter(h => h.acesso);
            if (huntsFiltro.soVantagem) vis = vis.filter(h => h.bato >= 2);

            if (huntsFiltro.ordem === 'nome') vis.sort((a, b) => a.nome.localeCompare(b.nome));
            else if (huntsFiltro.ordem === 'lv') vis.sort((a, b) => (b.lvMax || 0) - (a.lvMax || 0));
            else vis.sort((a, b) => (b.nota - a.nota) || ((b.lvMax || 0) - (a.lvMax || 0)));

            // Favorito sempre no topo: é pra isso que ele existe.
            vis.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));

            const corpo = _docaHunts.corpo;
            const rolagem = corpo.scrollTop;
            const tiposAtivo = huntsTiposDe(ativo);
            corpo.innerHTML = `
                <div class="hd-eu">
                    <b>Nv ${nivel || '?'}</b> · ${ativo ? ativo.name : 'sem Pokémon ativo'}
                    ${tiposAtivo.length ? '<span class="hd-tipos">' + tiposAtivo.join(' / ') + '</span>' : ''}
                    <div class="hd-eu-sub">${acessiveis.length} de ${lista.length} hunts liberadas</div>
                </div>
                <input type="text" class="hd-busca" id="hd-busca" placeholder="🔍 Buscar hunt ou Pokémon..." value="${huntsFiltro.busca.replace(/"/g, '&quot;')}" />
                <div class="hd-chips">
                    <button class="hd-chip${huntsFiltro.soFav ? ' on' : ''}" data-f="soFav">★ Favoritos</button>
                    <button class="hd-chip${huntsFiltro.soAcesso ? ' on' : ''}" data-f="soAcesso">✅ Posso entrar</button>
                    <button class="hd-chip${huntsFiltro.soVantagem ? ' on' : ''}" data-f="soVantagem" title="Zonas onde seu ativo bate 2× ou mais">⚔️ Vantagem</button>
                    <button class="hd-chip caca${huntsAutoCaca ? ' on' : ''}" id="hd-autocaca" title="Ao entrar numa hunt, liga sozinho o 'Caçar automático' (setAuto hunt) — assim você já chega atacando">🎯 Caçar ao chegar</button>
                </div>
                <div class="hd-chips">
                    <button class="hd-chip ord${huntsFiltro.ordem === 'rec' ? ' on' : ''}" data-o="rec" title="Nível do selvagem × vantagem de tipo, e o XP/h medido quando existe">⭐ Recomendado</button>
                    <button class="hd-chip ord${huntsFiltro.ordem === 'lv' ? ' on' : ''}" data-o="lv">Nível ↓</button>
                    <button class="hd-chip ord${huntsFiltro.ordem === 'nome' ? ' on' : ''}" data-o="nome">Nome</button>
                </div>
                <div class="hd-lista">
                    ${vis.length ? vis.slice(0, 120).map(h => huntsCardHtml(h, h.index === atualIdx, base)).join('')
                                 : '<div class="hd-vazio">Nenhuma hunt bate com esse filtro.</div>'}
                </div>
                ${vis.length > 120 ? '<div class="hd-mais">+' + (vis.length - 120) + ' fora da lista — refine a busca.</div>' : ''}
            `;
            corpo.scrollTop = rolagem;

            const busca = corpo.querySelector('#hd-busca');
            if (busca) {
                busca.oninput = () => { huntsFiltro.busca = busca.value; huntsRenderizar(); };
                if (q) { busca.focus(); busca.setSelectionRange(busca.value.length, busca.value.length); }
            }
            corpo.querySelectorAll('[data-f]').forEach(b => {
                b.onclick = () => { huntsFiltro[b.dataset.f] = !huntsFiltro[b.dataset.f]; huntsRenderizar(); };
            });
            const btCaca = corpo.querySelector('#hd-autocaca');
            if (btCaca) btCaca.onclick = () => {
                huntsAutoCaca = !huntsAutoCaca;
                try { localStorage.setItem(HUNTS_AUTOCACA_KEY, huntsAutoCaca ? '1' : '0'); } catch (e) { }
                huntsRenderizar();
            };
            corpo.querySelectorAll('[data-o]').forEach(b => {
                b.onclick = () => { huntsFiltro.ordem = b.dataset.o; huntsRenderizar(); };
            });
            corpo.querySelectorAll('[data-fav]').forEach(b => {
                b.onclick = ev => { ev.stopPropagation(); huntsFavoritar(b.dataset.fav); };
            });
            corpo.querySelectorAll('[data-ir]').forEach(b => {
                b.onclick = () => huntsEntrar(b.dataset.ir);
            });

            const medidas = Object.keys(huntsXpPorZona).filter(k => huntsXpHora(k) != null).length;
            _docaHunts.rodape.textContent = medidas
                ? `${vis.length} listadas · XP/h medido em ${medidas} zona(s)`
                : `${vis.length} listadas · o XP/h aparece depois de ~1 min caçando em cada zona`;
        }

        const HD_CSS = `
            .hd-eu { font-size:11px; color:#e2e8f0; background:rgba(56,189,248,.08);
                     border:1px solid rgba(56,189,248,.22); border-radius:8px; padding:6px 9px; margin-bottom:8px; }
            .hd-eu b { color:#7dd3fc; }
            .hd-tipos { font-size:9px; color:#c4b5fd; margin-left:5px; text-transform:uppercase; letter-spacing:.4px; }
            .hd-eu-sub { font-size:9px; color:#94a3b8; margin-top:2px; }
            .hd-busca { width:100%; box-sizing:border-box; background:rgba(148,163,184,.08);
                        border:1px solid rgba(148,163,184,.22); border-radius:7px; padding:5px 8px;
                        font-size:10.5px; color:#f1f5f9; font-family:inherit; margin-bottom:6px; }
            .hd-chips { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
            .hd-chip { font-size:9px; font-weight:700; font-family:inherit; cursor:pointer;
                       background:rgba(148,163,184,.08); border:1px solid rgba(148,163,184,.2);
                       color:#94a3b8; border-radius:999px; padding:3px 8px; white-space:nowrap; }
            .hd-chip.on { background:rgba(56,189,248,.18); border-color:rgba(56,189,248,.45); color:#7dd3fc; }
            .hd-chip.ord.on { background:rgba(250,204,21,.16); border-color:rgba(250,204,21,.45); color:#fde047; }
            /* Verde porque nao e filtro de lista, e comportamento ao entrar. */
            .hd-chip.caca.on { background:rgba(34,197,94,.16); border-color:rgba(34,197,94,.45); color:#4ade80; }
            .hd-lista { display:flex; flex-direction:column; gap:4px; }
            .hd-card { display:flex; align-items:stretch; gap:5px;
                       background:rgba(148,163,184,.05); border:1px solid rgba(148,163,184,.14);
                       border-radius:8px; padding:5px 6px; }
            .hd-card:hover { border-color:rgba(56,189,248,.4); background:rgba(56,189,248,.07); }
            .hd-card.bloq { opacity:.5; }
            .hd-card.atual { border-color:rgba(34,197,94,.5); background:rgba(34,197,94,.1); }
            .hd-fav { flex:none; width:22px; background:transparent; border:none; cursor:pointer;
                      color:#475569; font-size:15px; line-height:1; padding:0; font-family:inherit; }
            .hd-fav.on { color:#fbbf24; }
            .hd-corpo { flex:1; min-width:0; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
            .hd-l1 { display:flex; align-items:center; gap:5px; }
            .hd-nome { font-size:10.5px; font-weight:700; color:#f8fafc;
                       overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .hd-atual { font-size:7.5px; font-weight:900; color:#4ade80;
                        background:rgba(34,197,94,.18); border-radius:3px; padding:0 4px; flex:none; }
            .hd-l2 { display:flex; align-items:center; gap:6px; font-size:9px; }
            .hd-lv { color:#fde047; font-weight:800; }
            .hd-reg { color:#64748b; }
            .hd-lock { color:#fca5a5; font-weight:700; }
            .hd-l3 { font-size:8.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .hd-selos { display:flex; flex-wrap:wrap; gap:3px; margin-top:1px; }
            .hd-selo { font-size:7.5px; font-weight:800; border-radius:3px; padding:0 4px; }
            .hd-selo.bom { background:rgba(34,197,94,.18); color:#4ade80; }
            .hd-selo.ruim { background:rgba(239,68,68,.16); color:#fca5a5; }
            .hd-selo.medido { background:rgba(56,189,248,.16); color:#7dd3fc; }
            /* Projetado e visualmente MAIS FRACO que medido, de proposito: os
               dois nao valem a mesma coisa e a cor nao pode sugerir que valem. */
            .hd-selo.proj { background:rgba(148,163,184,.14); color:#a5b4fc; font-style:italic; }
            .hd-sprite { width:34px; height:34px; object-fit:contain; image-rendering:pixelated;
                         flex:none; align-self:center; }
            .hd-drops { display:flex; flex-wrap:wrap; gap:2px; margin-top:1px; }
            .hd-drop { font-size:7.5px; font-weight:700; color:#94a3b8;
                       background:rgba(148,163,184,.1); border:1px solid rgba(148,163,184,.16);
                       border-radius:3px; padding:0 3px; white-space:nowrap; }
            .hd-drop.pedra { color:#67e8f9; background:rgba(6,182,212,.14); border-color:rgba(6,182,212,.32); }
            .hd-drop.mais { color:#64748b; }
            .hd-vazio, .hd-mais { text-align:center; color:#64748b; font-size:9.5px; padding:10px 0; }
        `;

        function huntsAbrirDoca() {
            if (!document.getElementById('doca-hunts-css')) {
                const st = document.createElement('style');
                st.id = 'doca-hunts-css';
                st.textContent = HD_CSS;
                document.head.appendChild(st);
            }
            if (!_docaHunts || !_docaHunts.el.isConnected) {
                _docaHunts = docaCriar({
                    id: 'doca-hunts', titulo: '🏹 Hunts', lado: 'direita',
                    // `modal` e o modal do PROPRIO JOGO (#modal do play.html) —
                    // e ao lado da tela de Hunts que esta doca faz sentido.
                    // `independente` a livra do docaEsconderTodas() do painel v2,
                    // que nao manda nela.
                    largura: 320, ancora: 'modal', tom: 'roxo', independente: true,
                    acoes: [{ icone: '↻', titulo: 'Recalcular com o estado atual', ao: () => huntsRenderizar() }]
                });
            }
            _docaHunts.mostrar(true, true);
            huntsRenderizar();
        }

        function huntsFecharDoca() {
            if (_docaHunts) _docaHunts.mostrar(false);
        }

        // Fechar com a tela de Hunts ABERTA e uma decisao sobre esta sessao:
        // a doca nao volta sozinha enquanto aquela tela nao for reaberta.
        function huntsFecharPeloUsuario() {
            huntsFechadaPeloUsuario = true;
            huntsFecharDoca();
        }

        function huntsAlternarDoca() {
            const aberta = _docaHunts && _docaHunts.el.isConnected && _docaHunts.el.classList.contains('on');
            if (aberta) huntsFecharDoca(); else huntsAbrirDoca();
            return !aberta;
        }

        // =====================================================================
        // ABRIR JUNTO COM A TELA DE HUNTS DO JOGO
        // =====================================================================
        // O usuario abriu o jogo depois de reiniciar e nao achou a doca: ela so
        // existia atras de Game Tools. O lugar onde ela e util e obvio — do lado
        // da tela de Hunts — entao e ali que ela tem que aparecer sozinha.
        //
        // O sinal e do proprio jogo: quando a tela de Hunts monta, ela poe um
        // `.hnt-root` dentro de `#modal-body` (app-1.js). Observamos isso em vez
        // de tentar adivinhar cliques em botao.
        //
        // `huntsFechadaPeloUsuario` respeita o ✕: quem fechou a doca com o modal
        // de Hunts aberto nao quer que ela volte sozinha na proxima abertura.
        let huntsFechadaPeloUsuario = false;
        let _huntsModalAberto = false;

        function huntsObservarModalDoJogo() {
            const alvo = document.getElementById('modal-body');
            if (!alvo || alvo.__docaHuntsObservado) return false;
            alvo.__docaHuntsObservado = true;

            // ⚠️ PRESENCA NAO E VISIBILIDADE. O jogo fecha o modal escondendo o
            // FUNDO (`#modal-bg.hidden`) e deixa o `.hnt-root` no corpo. Checar
            // so `querySelector('.hnt-root')` dava sempre verdadeiro depois da
            // primeira abertura — foi por isso que a doca ficou grudada na
            // borda da tela depois de teleportar: a tela de Hunts tinha sumido
            // e ela achava que continuava aberta. Mesma guarda que a doca de
            // inventario ja usava (`docaInvBagAberta`, scripts/35).
            const conferir = () => {
                const bg = document.getElementById('modal-bg');
                const visivel = !!bg && !bg.classList.contains('hidden');
                const temHunts = visivel && !!alvo.querySelector('.hnt-root');
                if (temHunts === _huntsModalAberto) return;
                _huntsModalAberto = temHunts;
                if (temHunts) {
                    if (!huntsFechadaPeloUsuario) huntsAbrirDoca();
                } else {
                    // A tela de Hunts fechou: a doca perdeu a ancora. Some com
                    // ela e libera a volta automatica na proxima vez.
                    huntsFecharDoca();
                    huntsFechadaPeloUsuario = false;
                }
            };

            try {
                const obs = new MutationObserver(conferir);
                obs.observe(alvo, { childList: true, subtree: true });
                // Fechar o modal muda a CLASSE DO FUNDO, nao o corpo — sem
                // observar isto o fechamento passava despercebido.
                const bg = document.getElementById('modal-bg');
                if (bg) obs.observe(bg, { attributes: true, attributeFilter: ['class'] });
            } catch (e) { return false; }
            conferir();
            return true;
        }

        // `#modal-body` ja existe no play.html, mas o script pode entrar antes
        // do DOM do jogo estar pronto — daí a tentativa repetida, que para
        // assim que consegue observar.
        (function huntsLigarObservador() {
            if (huntsObservarModalDoJogo()) return;
            let tentativas = 0;
            const t = setInterval(() => {
                if (huntsObservarModalDoJogo() || ++tentativas > 60) clearInterval(t);
            }, 1000);
        })();

        try {
            const _w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            _w.__abrirDocaHunts = huntsAbrirDoca;
            _w.__alternarDocaHunts = huntsAlternarDoca;
            _w.__docaHuntsAberta = () => !!(_docaHunts && _docaHunts.el.isConnected && _docaHunts.el.classList.contains('on'));
        } catch (e) { }

})();
