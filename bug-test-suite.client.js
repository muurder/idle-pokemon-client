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

    window.__bugSuiteBuild = '2026-09-08 23:05:05';
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
        // 14e-matchup-tipos.js — TABELA DE TIPOS E MATCHUP (extraido do dev)
        // =====================================================================
        // A doca da Equipe (36) desenha "▲ Forte contra / ▼ Cuidado com / ⊘ Nao
        // causa dano" chamando `matchupsDoPoke()` e `especiesFracasContra()`.
        // As duas foram adotadas junto com o 36, mas moram em
        // `scripts/14d-sugestoes-hunt.js` do dev, que nao veio -- e elas por sua
        // vez usam `multDanoAtkVsDef` / `multDanoRecebido`, que moram em
        // `scripts/26-auto-hunt-matriz.js`, que tambem nao vem pro cliente.
        //
        // Resultado ate 08/09/2026: `matchupsDoPoke is not defined` ao abrir a
        // ficha de um pokemon na doca da Equipe. O build passava liso -- o nome
        // so falta em tempo de EXECUCAO. E o modo de falha classico de adotar
        // modulo sem levar o helper junto.
        //
        // Este arquivo e a metade PURA dos dois modulos do dev, sem uma linha do
        // motor de Auto Hunt:
        //   de 26-auto-hunt-matriz.js -> TYPE_CHART_OFFICIAL, efetividadeAtaque,
        //                                multDanoRecebido, multDanoAtkVsDef
        //   de 14d-sugestoes-hunt.js  -> TIPOS_JOGO, TIPO_PT, tiposDoPoke,
        //                                matchupsDoPoke, especiesFracasContra
        // Ficaram de fora, de proposito, o avaliador/otimizador de movesets de
        // caca (o resto do 14d) e tudo que escolhe zona (o resto do 26).
        //
        // POR QUE NAO USAR O `ppTypeChart()` DO 40-pokepedia-dados: aquele vem
        // do /api/meta e lista so os pares SUPER EFICAZES. Sem os 0.5x e os 0x
        // nao da pra saber que um tipo que bate 2x num dos meus tipos e resistido
        // pelo outro -- daria "forte contra" onde o dano real e 1x, e a lista de
        // imunidade nao existiria. Aqui a tabela e completa, entao o numero que
        // aparece na ficha do cliente e o MESMO que o dev mostra.
        //
        // Sem DOM e sem globais: entra e sai numero.
        // =====================================================================

        const TYPE_CHART_OFFICIAL = {
            normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
            fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
            water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
            electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
            grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
            ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
            fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
            poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
            ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
            flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
            psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
            bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, steel: 0.5, fairy: 0.5, dark: 2 },
            rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
            ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
            dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
            dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
            steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
            fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
        };

        // Multiplicador exato de 1 atacante contra 1 defensor. Par ausente da
        // tabela e 1x -- e assim que a tabela oficial e escrita: so o que desvia
        // do neutro aparece.
        function efetividadeAtaque(atk, def) {
            if (!atk || !def) return 1.0;
            const a = String(atk).toLowerCase().trim();
            const d = String(def).toLowerCase().trim();
            if (TYPE_CHART_OFFICIAL[a] && typeof TYPE_CHART_OFFICIAL[a][d] !== 'undefined') {
                return TYPE_CHART_OFFICIAL[a][d];
            }
            return 1.0;
        }

        // Quanto o INIMIGO bate em mim: pior caso entre os tipos que ele tem
        // (ele escolhe o golpe que mais machuca, entao vale o maximo).
        function multDanoRecebido(inimigoTipos, meusTipos) {
            if (!inimigoTipos || !inimigoTipos.length || !meusTipos || !meusTipos.length) return 1.0;
            let pior = 0;
            for (const a of inimigoTipos) {
                let m = 1.0;
                for (const d of meusTipos) m *= efetividadeAtaque(a, d);
                if (m > pior) pior = m;
            }
            return pior;
        }

        // Melhor multiplicador dos MEUS tipos contra os tipos do alvo.
        function multDanoAtkVsDef(atkTipos, defTipos) {
            if (!atkTipos || !atkTipos.length || !defTipos || !defTipos.length) return 1.0;
            let melhorMult = 0;
            for (const a of atkTipos) {
                let multTipo = 1.0;
                for (const d of defTipos) {
                    multTipo *= efetividadeAtaque(a, d);
                }
                if (multTipo > melhorMult) melhorMult = multTipo;
            }
            return melhorMult;
        }

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

        // Devolve { tipos, forte, fraco, imune } — listas de { tipo, rotulo, mult }.
        //
        // `forte`  = tipos em que ELE bate com vantagem (>= 2x atacando).
        // `fraco`  = tipos que batem NELE com vantagem (>= 2x apanhando).
        // `imune`  = tipos em que ele nao causa dano nenhum (0x). Fica separado
        //            porque e eliminatorio, nao "meio ruim".
        function matchupsDoPoke(poke, opcoes) {
            const op = opcoes || {};
            const atacando = op.atacando || multDanoAtkVsDef;
            const apanhando = op.apanhando || multDanoRecebido;
            if (!poke) return null;

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

        // Especies do dex que caem nos tipos em que ele e forte. Serve pra dar
        // CARA ao matchup — "forte contra Planta" e abstrato, "forte contra
        // Venusaur, Vileplume…" e reconhecivel. So nomeia; nao diz onde cacar.
        function especiesFracasContra(matchup, dex, limite) {
            if (!matchup || !Array.isArray(dex)) return [];
            const alvos = new Set(matchup.forte.map(f => f.tipo));
            if (!alvos.size) return [];
            const fora = [];
            for (const d of dex) {
                const t = tiposDoPoke(d);
                if (!t.length || !t.some(x => alvos.has(x))) continue;
                // Se ele tambem e forte contra mim, nao e presa — e troca.
                const contra = matchup.fraco.some(f => t.indexOf(f.tipo) >= 0);
                if (contra) continue;
                fora.push({ nome: d.name, tier: d.tier || '', tipos: t });
            }
            // Tier melhor primeiro: sao os que valem a pena reconhecer.
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

            // ---------- Poképédia: SEMPRE o primeiro item do rail ----------
            // Cravada à esquerda de tudo que o usuário fixou. Não entra na
            // pinnedList (não é toggle, não some) e não participa do arrasto.
            const PP_ICONE_POKEDEX =
                '<svg viewBox="0 0 24 24" width="100%" height="100%" style="display:block">'
                + '<rect x="2" y="3" width="20" height="18" rx="3" fill="#e3350d" stroke="#7d1907" stroke-width="1"/>'
                + '<path d="M2 6a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2H2z" fill="#c0290a"/>'
                + '<circle cx="7" cy="6" r="2.1" fill="#8fd8ff" stroke="#fff" stroke-width=".7"/>'
                + '<circle cx="6.4" cy="5.4" r=".6" fill="#eaffff"/>'
                + '<circle cx="12.6" cy="6" r=".95" fill="#ffde59"/>'
                + '<circle cx="15.6" cy="6" r=".95" fill="#7bed9f"/>'
                + '<rect x="4.8" y="11.5" width="6.4" height="6.6" rx="1.1" fill="#2a1720"/>'
                + '<rect x="13.2" y="12" width="5.2" height="1.7" rx=".85" fill="#2a1720"/>'
                + '<rect x="13.2" y="15" width="5.2" height="1.7" rx=".85" fill="#2a1720"/>'
                + '</svg>';

            function criarBotaoPokepedia() {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb ic idle-pp-btn';
                b.title = 'Poképédia — dex, mega, stats, itens, tipos e sistema (Clique para abrir)';
                b.style.cssText = [
                    'position:relative', 'display:flex', 'align-items:center', 'justify-content:center',
                    'width:clamp(32px, 3.7vw, 52px)', 'height:clamp(32px, 3.7vw, 52px)',
                    'padding:clamp(4px, .5vw, 7px)', 'border:none', 'border-radius:8px',
                    'background:rgba(15,23,42,0.9)', 'color:#e2e8f0', 'cursor:pointer',
                    'transition:all .15s ease', 'box-sizing:border-box',
                    'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
                ].join(';');
                b.innerHTML = '<span style="width:clamp(24px,2.9vw,36px);height:clamp(24px,2.9vw,36px);display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">' + PP_ICONE_POKEDEX + '</span>';
                b.onmouseenter = () => { b.style.background = '#223047'; b.style.transform = 'translateY(-1px)'; };
                b.onmouseleave = () => { b.style.background = 'rgba(15,23,42,0.9)'; b.style.transform = ''; };
                b.onclick = () => { chamarFuncaoJogo('abrirPokepedia'); };
                return b;
            }

            // ---------- Arrasto pra reordenar os itens fixados ----------
            let _ppDragIdx = null;
            function tornarArrastavel(botao, idx) {
                botao.draggable = true;
                botao.dataset.pinIdx = idx;
                botao.addEventListener('dragstart', (e) => {
                    _ppDragIdx = idx;
                    botao.style.opacity = '0.4';
                    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); } catch (er) {}
                });
                botao.addEventListener('dragend', () => { botao.style.opacity = ''; _ppDragIdx = null; });
                botao.addEventListener('dragover', (e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (er) {} });
                botao.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const de = _ppDragIdx, para = idx;
                    if (de == null || de === para) return;
                    const [mov] = pinnedList.splice(de, 1);
                    pinnedList.splice(para, 0, mov);
                    salvarFixados();
                    renderizarBarraFixada();
                });
            }

            function renderizarBarraFixada() {
                rail.innerHTML = '';
                // A barra existe SEMPRE, por causa da Poképédia âncora.
                rail.style.display = 'flex';
                rail.style.visibility = 'visible';
                rail.style.pointerEvents = 'auto';
                try { rail.appendChild(criarBotaoPokepedia()); } catch (e) {}
                // try/catch por item: um item com dado inesperado não pode derrubar
                // o resto da barra no meio do forEach.
                pinnedList.forEach((item, idx) => {
                    try {
                        const b = criarBotaoFixado(item);
                        tornarArrastavel(b, idx);
                        rail.appendChild(b);
                    } catch(e) {}
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
                posicionarAoLadoDoHunt(); // rail existe sempre (Poképédia âncora)
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
        // PERSEGUE o retângulo dela a cada 400ms (mesmo ritmo de
        // `docaAncorarTodas`, 09b-doca.js): arrastar a barra move o botão
        // junto no próximo tick, sem tocar em como ela se move.
        //
        // Rodava a 150ms antes -- rápido demais pra um reposicionamento que só
        // muda quando alguém arrasta a barra manualmente, e com getBoundingClientRect
        // (força layout) em CADA conta aberta isso somava até ~100 execuções/s
        // com muitas contas simultâneas. 400ms segue igual de suave visualmente
        // e alinha com o mesmo ritmo já usado pro resto das docas.
        // =====================================================================
        // Função robusta de reset que pode ser invocada tanto localmente quanto via executeJavaScript pelo shell
        window.__haExecutarResetHunt = async function(origem = 'local') {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            let ok = false;

            // 1. Zera dados locais em memória imediatamente para resposta visual instantânea
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
            } catch (e) { }

            // 2. Dispara o reset oficial no servidor
            try {
                if (typeof w.Y === 'function') {
                    await w.Y('huntReset');
                    ok = true;
                }
            } catch (e) { }

            if (!ok && typeof apiTest === 'function') {
                try {
                    await apiTest('huntReset');
                    ok = true;
                } catch (e) { }
            }

            if (!ok) {
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
                    ok = true;
                }
            }

            // 3. Força atualização imediata da mini barra passando o objeto zerado
            try {
                const huntObj = (w.K && w.K.hunt) || (w.gameState && w.gameState._lastHunt) || { secs: 0, t0: Date.now(), gold: 0, soldGold: 0, lootGold: 0, loot: [], xp: 0, kills: 0 };
                if (typeof w.updateMiniHunt === 'function') {
                    w.updateMiniHunt(huntObj);
                }
            } catch (e) { }

            try {
                if (typeof logEvent === 'function') {
                    const txt = origem === 'global' ? '🔄 <b>Hunt Analyse reiniciada</b> (todas as abas)' : '🔄 <b>Hunt Analyse reiniciada</b> (esta aba)';
                    logEvent(txt, '#38bdf8');
                }
            } catch (e) { }

            return ok;
        };

        function montarBotaoResetMiniHunt() {
            const barra = document.getElementById('mini-hunt');
            if (!barra) return;

            let container = document.getElementById('ha-mini-hunt-actions');
            if (!container) {
                container = document.createElement('div');
                container.id = 'ha-mini-hunt-actions';
                container.style.cssText = 'position:fixed;z-index:26;display:flex;align-items:center;gap:3px;';
                document.body.appendChild(container);
            }

            let btn = document.getElementById('ha-mini-hunt-reset');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'ha-mini-hunt-reset';
                btn.type = 'button';
                btn.title = 'Reiniciar Hunt Analyse (desta aba)';
                btn.textContent = '🔄';
                btn.style.cssText = 'display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #2a3d55;border-radius:4px;'
                    + 'color:#38bdf8;cursor:pointer;font-size:12px;padding:0 7px;line-height:1;height:100%;box-sizing:border-box;transition:border-color .15s, color .15s, opacity .15s;';
                btn.onmouseenter = () => { btn.style.color = '#7fd1ff'; btn.style.borderColor = '#38bdf8'; btn.style.background = 'rgba(56,189,248,.15)'; };
                btn.onmouseleave = () => { btn.style.color = '#38bdf8'; btn.style.borderColor = '#2a3d55'; btn.style.background = 'rgba(10,16,24,.85)'; };
                btn.onmousedown = () => { btn.style.opacity = '0.7'; };
                btn.onmouseup = () => { btn.style.opacity = '1'; };
                btn.onclick = async ev => {
                    ev.stopPropagation();
                    if (typeof window.__haExecutarResetHunt === 'function') {
                        await window.__haExecutarResetHunt('local');
                    }
                };
                container.appendChild(btn);
            } else if (btn.parentElement !== container) {
                btn.style.position = 'static';
                btn.style.borderRadius = '4px';
                btn.style.height = '100%';
                btn.style.boxSizing = 'border-box';
                container.appendChild(btn);
            }

            let btnAll = document.getElementById('ha-mini-hunt-reset-all');
            if (!btnAll) {
                btnAll = document.createElement('button');
                btnAll.id = 'ha-mini-hunt-reset-all';
                btnAll.type = 'button';
                btnAll.title = 'Reiniciar Hunt Analyse em TODAS as abas (Global)';
                btnAll.textContent = '🌐';
                btnAll.style.cssText = 'display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #4c1d95;border-radius:4px;'
                    + 'color:#c084fc;cursor:pointer;font-size:12px;padding:0 7px;line-height:1;height:100%;box-sizing:border-box;transition:border-color .15s, color .15s, opacity .15s;';
                btnAll.onmouseenter = () => { btnAll.style.color = '#f3e8ff'; btnAll.style.borderColor = '#a855f7'; btnAll.style.background = 'rgba(147,51,234,.25)'; };
                btnAll.onmouseleave = () => { btnAll.style.color = '#c084fc'; btnAll.style.borderColor = '#4c1d95'; btnAll.style.background = 'rgba(10,16,24,.85)'; };
                btnAll.onmousedown = () => { btnAll.style.opacity = '0.7'; };
                btnAll.onmouseup = () => { btnAll.style.opacity = '1'; };
                btnAll.onclick = async ev => {
                    ev.stopPropagation();

                    // 1. Notifica o shell via console-message
                    console.log('[HUNT_RESET_ALL]');

                    // 2. Notifica o shell via page-title-updated (fallback nativo)
                    try {
                        const prevTitle = document.title;
                        document.title = '__HUNT_RESET_ALL__' + Date.now();
                        setTimeout(() => { try { if (document.title.startsWith('__HUNT_RESET_ALL__')) document.title = prevTitle; } catch(e){} }, 120);
                    } catch (e) { }

                    // 3. BroadcastChannel para fallback caso rodando fora do Electron
                    try {
                        if (typeof BroadcastChannel !== 'undefined') {
                            const bc = new BroadcastChannel('ha_hunt_reset_channel');
                            bc.postMessage({ acao: 'huntReset', ts: Date.now() });
                            bc.close();
                        }
                    } catch (e) { }

                    // 4. Executa localmente nesta aba imediatamente
                    if (typeof window.__haExecutarResetHunt === 'function') {
                        await window.__haExecutarResetHunt('global');
                    }
                };
                container.appendChild(btnAll);
            } else if (btnAll.parentElement !== container) {
                btnAll.style.position = 'static';
                btnAll.style.borderRadius = '4px';
                btnAll.style.height = '100%';
                btnAll.style.boxSizing = 'border-box';
                container.appendChild(btnAll);
            }

            const escondida = barra.classList.contains('hidden') || getComputedStyle(barra).display === 'none';
            container.style.display = escondida ? 'none' : 'flex';
            if (!escondida) {
                const r = barra.getBoundingClientRect();
                container.style.left = Math.round(r.right + 4) + 'px';
                container.style.top = Math.round(r.top) + 'px';
                container.style.height = Math.round(r.height) + 'px';
            }
        }

        // Listener fallback de BroadcastChannel para instâncias externas
        try {
            if (typeof BroadcastChannel !== 'undefined' && !window.__haHuntResetChannelIniciado) {
                window.__haHuntResetChannelIniciado = true;
                const bc = new BroadcastChannel('ha_hunt_reset_channel');
                bc.onmessage = async ev => {
                    if (ev && ev.data && ev.data.acao === 'huntReset') {
                        if (typeof window.__haExecutarResetHunt === 'function') {
                            await window.__haExecutarResetHunt('global');
                        }
                    }
                };
            }
        } catch (e) { }

        setInterval(montarBotaoResetMiniHunt, 400);
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
        // 28c-xp-status-client.js — XP TRACKER, ETAS E ESTADO LIMPO (CLIENT)
        // =====================================================================
        // Este modulo prove para a versao CLIENT a mesma experiencia rica de XP
        // que o DEV tem, sem carregar nenhum motor de bot / auto-hunt:
        //
        // 1. Sincronizacao de estado (window.K e window.gameState via /api/state
        //    leve e interceptor de fetch transparente do proprio jogo);
        // 2. Calculo em tempo real de XP/s, pokemons restantes e ETA para
        //    Pokemon ativo e Treinador;
        // 3. Publicacao de window.__idleSuiteXpStatus (consumido pelo widget
        //    flutuante / fixado na sidebar do shell Electron);
        // 4. Injecao dos selos discretos de ETA no card oficial (#player-panel);
        // 5. Doca expansivel de XP (lingueta lateral › na borda do card);
        // 6. Pontes window.__getTabInfo e window.__obterDashboardStatus.
        //
        // GUARDA: se window.__xpTrackerDockRico ja estiver ativo (caso do DEV,
        // onde 28-auto-hunt-precos.js e 28b-xp-tracker-dock.js ja rodam),
        // este modulo fica completamente dormente.
        // =====================================================================

        (function () {
            'use strict';

            if (typeof window !== 'undefined' && window.__xpTrackerDockRico) {
                return;
            }

            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

            // ---------- 1. OBTENÇÃO DE TOKEN E JANELA ----------
            function obterToken() {
                try {
                    const ss = sessionStorage.getItem('pmi_tab_token');
                    if (ss && ss.length >= 10) return ss;
                } catch (e) { }
                try {
                    const ls = localStorage.getItem('pmi_token');
                    if (ls && ls.length >= 10) return ls;
                } catch (e) { }
                try {
                    if (w.q && typeof w.q === 'string') return w.q;
                    if (w.TOKEN && typeof w.TOKEN === 'string') return w.TOKEN;
                    if (w.TAB_TOKEN && typeof w.TAB_TOKEN === 'string') return w.TAB_TOKEN;
                } catch (e) { }
                return '';
            }

            // ---------- 2. CACHE E INTERCEPTOR TRANSPARENTE ----------
            let _estadoCache = {};
            let _ultimoFetchTs = 0;

            function aplicarEstado(s) {
                if (!s || typeof s !== 'object') return;
                const state = s.state || s;
                if (!state || typeof state !== 'object') return;
                _estadoCache = state;
                w.K = state;
                w.gameState = state;
                atualizarStatusXpClient();
            }

            // Intercepta respostas naturais do jogo para /api/state ou /api/action
            try {
                if (!w.__idleFetchInterceptorClient) {
                    w.__idleFetchInterceptorClient = true;
                    const origFetch = w.fetch;
                    w.fetch = async function (...args) {
                        const res = await origFetch.apply(this, args);
                        try {
                            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                            if (url.includes('/api/state') || url.includes('/api/action') || url.includes('/api/gym')) {
                                res.clone().json().then(data => {
                                    if (data) aplicarEstado(data);
                                }).catch(() => { });
                            }
                        } catch (e) { }
                        return res;
                    };
                }
            } catch (e) { }

            async function atualizarEstadoRemoto() {
                const agora = Date.now();
                if (agora - _ultimoFetchTs < 2000) return;
                _ultimoFetchTs = agora;
                try {
                    const tok = obterToken();
                    const url = tok ? ('/api/state?token=' + encodeURIComponent(tok)) : '/api/state';
                    const res = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
                    if (res) aplicarEstado(res);
                } catch (e) { }
            }

            // Polling leve periódico caso o jogo esteja ocioso
            setInterval(atualizarEstadoRemoto, 3000);
            atualizarEstadoRemoto();

            // ---------- 3. MEDIDOR INCREMENTAL DE TAXA E ETA ----------
            let _lastPokeXp = null;
            let _lastJogXp = null;
            let _lastPokeTs = null;
            let _lastJogTs = null;
            let _localKillsPoke = 0;
            let _localKillsJog = 0;
            let _deltaTotalPoke = 0;
            let _deltaTotalJog = 0;

            let _cacheTrainerXpNextClient = new Map();
            let _cacheTrainerXpRestanteClient = new Map();

            // ---------- 3b. ESTIMADOR DE TAXA E ETA (cópia local) ----------
            // Mesma lógica de scripts/01b-taxa-eta.js, mas própria: este módulo
            // é o único tracker de XP do CLIENT, onde 01b não existe. Chamar as
            // funções de lá daria ReferenceError com o jogo do usuário rodando
            // (não no build). Por isso a duplicação é deliberada.
            const MEIA_VIDA_TAXA_MS_CLI = 90000;

            function criarTaxaCli() { return { valor: 0, desvio: 0, ts: 0, n: 0 }; }

            // Peso vindo do TEMPO decorrido, não da contagem de chamadas: antes
            // o decaimento era `*= 0.85` por chamada, e como esta função roda em
            // vários intervalos ao mesmo tempo, a taxa caía mais rápido quanto
            // mais painel estivesse aberto — inflando o ETA sozinho.
            function alimentarTaxaCli(t, deltaXp, agora) {
                if (!t || !(deltaXp > 0)) return;
                if (!t.ts) { t.ts = agora; return; }
                const dtMs = agora - t.ts;
                if (dtMs <= 0 || dtMs > 60000) { t.ts = agora; return; }
                const inst = deltaXp / (dtMs / 1000);
                if (!t.valor) {
                    t.valor = inst;
                    t.desvio = 0;
                } else {
                    const peso = Math.max(1 - Math.pow(0.5, dtMs / MEIA_VIDA_TAXA_MS_CLI),
                                          1 / Math.min(t.n + 1, 20));
                    const erro = inst - t.valor;
                    t.valor += erro * peso;
                    t.desvio += (Math.abs(erro) - t.desvio) * peso;
                }
                t.ts = agora;
                t.n++;
            }

            // Idempotente: só lê, nunca escreve.
            function lerTaxaCli(t, agora) {
                if (!t || !(t.valor > 0) || !t.ts) return 0;
                // Ocioso demais para afirmar ritmo nenhum: acima de ~4 meias-vidas
                // (~6 min sem XP) a taxa deixa de existir em vez de virar um numero
                // minusculo que o ETA transformaria num "1d 10h" sem sentido.
                const fator = Math.pow(0.5, (agora - t.ts) / MEIA_VIDA_TAXA_MS_CLI);
                if (fator < 0.05) return 0;
                const v = t.valor * fator;
                return v < 0.05 ? 0 : v;
            }

            function bandaTaxaCli(t, agora) {
                if (!t || t.n < 8 || !(t.desvio > 0)) return null;
                const taxa = lerTaxaCli(t, agora);
                if (!(taxa > 0)) return null;
                const alta = taxa + t.desvio;
                const baixa = Math.max(taxa * 0.15, taxa - t.desvio);
                if (!(alta > 0) || !(baixa > 0) || alta <= baixa) return null;
                return { alta: alta, baixa: baixa };
            }

            function criarPrazoCli() { return { alvo: 0, base: 0 }; }

            // Guarda o INSTANTE-ALVO, não a duração. O código anterior guardava
            // `segs` e re-ancorava sempre que `restante` mudasse — isto é, em
            // todo abate — e o contador tremia. Aqui o relógio desce sozinho e
            // só corrige quando a estimativa diverge >20% DA ÂNCORA (comparar
            // com o relógio faria o próprio avanço do tempo disparar a
            // re-ancoragem, e o número saltaria pra trás a cada 20% andado).
            function etaSegundosCli(prazo, restante, taxa, agora) {
                if (!prazo) return Infinity;
                if (!(taxa > 0) || !(restante > 0)) {
                    prazo.alvo = 0;
                    prazo.base = 0;
                    return Infinity;
                }
                const bruto = restante / taxa;
                const faltaRelogio = prazo.alvo ? (prazo.alvo - agora) / 1000 : 0;
                const divergiu = !prazo.base || Math.abs(bruto - prazo.base) / prazo.base > 0.20;
                if (!prazo.alvo || faltaRelogio <= 0 || divergiu) {
                    prazo.alvo = agora + bruto * 1000;
                    prazo.base = bruto;
                    return Math.max(1, bruto);
                }
                return Math.max(1, faltaRelogio);
            }

            function pausarPrazoCli(prazo, agora) {
                if (!prazo || !prazo.alvo) return Infinity;
                const falta = (prazo.alvo - agora) / 1000;
                return falta > 0 ? falta : Infinity;
            }

            const _taxaXpPokeCli = criarTaxaCli();
            const _taxaXpJogCli = criarTaxaCli();
            // Ritmo de ABATES, mesma meia-vida das taxas de XP. Existe por causa
            // do "faltam 486 pokes" com a barra em 99%: a contagem de abates
            // saia de `hunt.xp / hunt.kills`, a media VITALICIA da cacada — o
            // mesmo defeito que tirou `hunt.xp / hunt.secs` do calculo da taxa,
            // so que do outro lado da divisao. Numa cacada longa que passou por
            // zonas de XP diferente, ou depois de um bonus entrar, o XP por
            // abate de agora nao tem relacao com o dos ultimos 120 minutos, e o
            // ETA (que ja usa a taxa recente) discordava da contagem de abates
            // impressa na mesma linha.
            const _taxaKillsCli = criarTaxaCli();
            let _ultKillsCli = null;
            const _prazoPokeCli = criarPrazoCli();
            const _prazoJogCli = criarPrazoCli();

            // Dividir a taxa de XP pela taxa de abates da o XP por abate
            // RECENTE, e as duas decaem com a mesma meia-vida. A propriedade que
            // importa e que o ETA e a contagem de abates nao podem mais
            // discordar: como
            //
            //     kills = restante / (taxaXp / taxaKills) = (restante / taxaXp) * taxaKills
            //
            // a contagem vira exatamente "o ETA vezes o ritmo de abates".
            // `medioVitalicio` fica de reserva para os primeiros segundos, antes
            // de a amostra existir: ali um numero grosseiro ainda e melhor que
            // um traco.
            function xpPorAbateCli(taxaXp, agora, medioVitalicio) {
                const kps = lerTaxaCli(_taxaKillsCli, agora);
                if (_taxaKillsCli.n >= 8 && kps > 0 && taxaXp > 0) {
                    const v = taxaXp / kps;
                    if (isFinite(v) && v > 0) return v;
                }
                return (medioVitalicio > 0) ? medioVitalicio : 0;
            }

            function fmtNum(v) {
                return Number(v || 0).toLocaleString('pt-BR');
            }

            function fmtTempo(seg, isMax = false, isPausado = false) {
                if (isMax) return '⭐ Nível MAX';
                if (isPausado) return '⏸️ Pausado';
                if (!Number.isFinite(seg) || seg <= 0) return '--';
                if (seg > 86400 * 3) return '> 72h';
                seg = Math.round(seg);
                const h = Math.floor(seg / 3600);
                const m = Math.floor((seg % 3600) / 60);
                const s = seg % 60;
                if (h > 0) return `${h}h ${m}m`;
                if (m > 0) return `${m}m ${s}s`;
                return `${s}s`;
            }

            function fmtTempoCurto(seg, isMax = false, isPausado = false) {
                if (isMax) return 'MAX';
                if (isPausado) return '⏸️';
                if (!Number.isFinite(seg) || seg <= 0) return '—';
                if (seg > 86400 * 3) return '> 72h';
                seg = Math.round(seg);
                const d = Math.floor(seg / 86400);
                const h = Math.floor((seg % 86400) / 3600);
                const m = Math.floor((seg % 3600) / 60);
                const s = seg % 60;
                if (d > 0) return `${d}d ${h}h`;
                if (h > 0) return `${h}h ${m}m`;
                if (m > 0) return `${m}m ${s}s`;
                return `${s}s`;
            }

            function fmtFalta(restante, kills) {
                if (restante == null || restante <= 0) return '—';
                if (kills != null && kills > 0) return `≈ ${fmtNum(kills)} pokes`;
                return `falta ${fmtNum(restante)} XP`;
            }

            // Suaviza a taxa se nao houver ganhos por mais de 5s
            function extrairDadosAtivos() {
                let s = null;
                try {
                    const wWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (wWin.K && (wWin.K.player || wWin.K.active)) s = wWin.K;
                    else if (wWin.S && (wWin.S.player || wWin.S.active)) s = wWin.S;
                    else if (wWin.gameState && (wWin.gameState.player || wWin.gameState.active)) s = wWin.gameState;
                } catch (e) { }
                if (!s) {
                    try { if (typeof K !== 'undefined' && K && (K.player || K.active)) s = K; } catch (e) { }
                }
                if (!s && typeof obterGameState === 'function') {
                    try { s = obterGameState(); } catch (e) { }
                }
                if (!s) {
                    s = (w.K && typeof w.K === 'object' && Object.keys(w.K).length) ? w.K : _estadoCache;
                }
                const root = (s && s.state && typeof s.state === 'object') ? s.state : (s || {});
                const player = root.player || {};
                const team = Array.isArray(root.team) ? root.team : [];
                const active = root.active || (root.player && root.player.active) || team.find(x => x && (x.id === root.activeId || x.active)) || team[0] || {};
                const hunt = root.hunt || {};

                // Fallbacks no DOM se state ainda nao tiver populado campos visiveis
                let domPokePct = null;
                let domJogPct = null;
                let domPokeName = null;
                let domPokeLv = null;
                let domJogName = null;
                let domJogLv = null;

                try {
                    const elLv = document.getElementById('pp-poke-lv');
                    if (elLv && elLv.textContent) {
                        const m = elLv.textContent.match(/(\d+)/);
                        if (m) domPokeLv = parseInt(m[1], 10);
                    }
                    const elPl = document.getElementById('player-panel');
                    if (elPl) {
                        const txt = elPl.textContent || '';
                        const mPoke = txt.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
                        if (mPoke) domPokePct = parseFloat(mPoke[1]);
                        const mJog = txt.match(/EXP\s*(\d+(?:\.\d+)?)\s*%/i);
                        if (mJog) domJogPct = parseFloat(mJog[1]);
                    }
                    const elName = document.getElementById('pp-name');
                    if (elName && elName.textContent.trim()) domJogName = elName.textContent.trim();
                    const elSub = document.getElementById('pp-sub');
                    if (elSub && elSub.textContent) {
                        // Item 7: pegar o primeiro numero de #pp-sub acerta em
                        // "Lv 5" e erra em "Rota 3 . Lv 5" (captura o 3). Tenta
                        // o rotulo de nivel primeiro; o numero solto so vale
                        // como ultimo recurso.
                        const txtSub = elSub.textContent;
                        const mLv = txtSub.match(/Lv\.?\s*(\d+)/i) || txtSub.match(/N[ivn]{0,2}\.?\s*(\d+)/i) || txtSub.match(/(\d+)\s*$/) || txtSub.match(/(\d+)/);
                        if (mLv) domJogLv = parseInt(mLv[1], 10);
                    }
                } catch (e) { }

                const pName = active.name || domPokeName || 'Pokémon';
                const pLv = Number(active.level || domPokeLv || 1);
                const pXp = Number(active.xp || active.exp || 0);
                const pXpNext = Number(active.xpNext || active.expNext || 0);
                // Pokémon tem limite de nível até 1000
                const isPokeMax = !!(active.xpCap || (pLv >= 1000 && (pXpNext <= 0 || (pXp > 0 && pXpNext > 0 && pXp >= pXpNext))));
                const pXpRestante = (!isPokeMax && pXpNext > 0) ? Math.max(0, pXpNext - pXp) : 0;
                const pPctCalculado = pXpNext > 0 ? Math.min(100, Math.round((pXp / pXpNext) * 100)) : 0;
                const pPct = isPokeMax ? 100 : (domPokePct !== null ? domPokePct : pPctCalculado);

                const jName = player.name || domJogName || 'Treinador';
                const jLv = Number(player.level || domJogLv || 1);
                // Treinador no Idle Pokémon tem nível infinito (sem limite de nível)
                const isJogMax = !!player.xpCap;
                const jXp = Number(player.xp || 0);
                let jXpNext = Number(player.xpNext || 0);
                if (jXpNext > 0 && jLv) {
                    _cacheTrainerXpNextClient.set(jLv, jXpNext);
                } else if (!jXpNext && jLv && _cacheTrainerXpNextClient.has(jLv)) {
                    jXpNext = _cacheTrainerXpNextClient.get(jLv);
                }
                const pctBaseJog = (domJogPct !== null ? domJogPct : Number(player.xpPct)) || 0;
                // O XP do treinador e ACUMULADO da carreira, e `xpNext` e o
                // limiar acumulado do proximo nivel — nao o custo de um nivel.
                // Entao `jXpNext - jXp` e a sobra certa, e so ela.
                //
                // O que saiu daqui: um `jXpNext * (100 - pct) / 100` de reserva.
                // Ele so podia rodar quando `jXpNext <= jXp`, ou seja, com o
                // xpNext velho de antes de um nivel subir — e ali media 3% da
                // CARREIRA no lugar de 3% de um nivel. Era o ETA de "> 72h" pra
                // subir um nivel. Sem ele a sobra vem do cache por nivel logo
                // abaixo, que e um numero de UM nivel.
                let jXpRestante = (!isJogMax && jXpNext > 0 && jXp > 0 && jXpNext > jXp) ? (jXpNext - jXp) : 0;
                if (jXpRestante > 0 && jLv) {
                    _cacheTrainerXpRestanteClient.set(jLv, jXpRestante);
                } else if (!jXpRestante && jLv && _cacheTrainerXpRestanteClient.has(jLv)) {
                    jXpRestante = _cacheTrainerXpRestanteClient.get(jLv);
                }
                const jPctCalculado = (jXpNext > 0 && jXp > 0 && jXpNext >= jXp) ? Math.min(100, Math.round((jXp / jXpNext) * 100)) : pctBaseJog;
                const jPct = isJogMax ? 100 : (domJogPct !== null ? domJogPct : jPctCalculado);

                return {
                    s, player, active, hunt, isPokeMax, isJogMax,
                    poke: { name: pName, level: pLv, shiny: !!(active.shiny || active.isShiny), xp: pXp, xpNext: pXpNext, xpRestante: pXpRestante, pct: pPct, xpCap: isPokeMax },
                    jog: { name: jName, level: jLv, xp: jXp, xpNext: jXpNext, xpRestante: jXpRestante, pct: jPct, xpCap: isJogMax }
                };
            }

            function atualizarStatusXpClient() {
                const { hunt, poke, jog, isPokeMax, isJogMax } = extrairDadosAtivos();
                const agora = Date.now();

                // 1. Atualizacao delta local de XP (somente quando há ganho efetivo de XP)
                if (poke.xp > 0) {
                    if (_lastPokeXp !== null && poke.xp > _lastPokeXp) {
                        const delta = poke.xp - _lastPokeXp;
                        alimentarTaxaCli(_taxaXpPokeCli, delta, agora);
                        _localKillsPoke += 1;
                        _deltaTotalPoke += delta;
                        _lastPokeTs = agora;
                    }
                    _lastPokeXp = poke.xp;
                }

                if (jog.xp > 0) {
                    if (_lastJogXp !== null && jog.xp > _lastJogXp) {
                        const delta = jog.xp - _lastJogXp;
                        alimentarTaxaCli(_taxaXpJogCli, delta, agora);
                        _localKillsJog += 1;
                        _deltaTotalJog += delta;
                        _lastJogTs = agora;
                    }
                    _lastJogXp = jog.xp;
                }

                // 2. Taxa consolidada — estimador único, meia-vida de 90s.
                // O que saiu daqui: `hunt.xp / hunt.secs`, média vitalícia da
                // caçada. `hunt.secs` conta desde que o servidor começou, então
                // troca de mapa, troca de pokémon e horas paradas pesavam igual
                // ao último minuto. Agora ela só serve de partida enquanto o
                // estimador não tem amostra própria.
                const estaPausado = (typeof autoHuntPausado !== 'undefined' && autoHuntPausado) || (typeof emCidadeOuTransito !== 'undefined' && emCidadeOuTransito);

                const temHunt = hunt && Number(hunt.secs || 0) > 0;
                const huntSecs = temHunt ? Number(hunt.secs) : 0;
                const huntKills = temHunt ? Number(hunt.kills || 0) : _localKillsPoke;
                const taxaPokeServ = (temHunt && Number(hunt.xp || 0) > 0 && huntSecs > 0) ? (Number(hunt.xp) / huntSecs) : 0;
                const taxaJogServ = (temHunt && Number(hunt.pxp || 0) > 0 && huntSecs > 0) ? (Number(hunt.pxp) / huntSecs) : 0;

                // Ritmo de abates. `hunt.kills` e a contagem boa quando existe:
                // vem do servidor e ja traz o lote inteiro quando o tick mata
                // mais de um. Sem hunt sobra `_localKillsPoke`, que conta um
                // abate por ganho de XP — aproximado, mas e o que ha.
                if (huntKills > 0) {
                    if (_ultKillsCli !== null && huntKills > _ultKillsCli) {
                        alimentarTaxaCli(_taxaKillsCli, huntKills - _ultKillsCli, agora);
                    }
                    _ultKillsCli = huntKills;
                }

                let taxaPoke = 0;
                let taxaJog = 0;
                if (!estaPausado) {
                    taxaPoke = lerTaxaCli(_taxaXpPokeCli, agora) || taxaPokeServ;
                    taxaJog = lerTaxaCli(_taxaXpJogCli, agora) || taxaJogServ;
                }
                const bandaPokeCli = estaPausado ? null : bandaTaxaCli(_taxaXpPokeCli, agora);
                const bandaJogCli = estaPausado ? null : bandaTaxaCli(_taxaXpJogCli, agora);

                const xpMedioPoke = (temHunt && huntKills > 0 && Number(hunt.xp || 0) > 0)
                    ? (Number(hunt.xp) / huntKills)
                    : (_localKillsPoke > 0 && _deltaTotalPoke > 0 ? (_deltaTotalPoke / _localKillsPoke) : 0);

                const xpMedioJog = (temHunt && huntKills > 0 && Number(hunt.pxp || 0) > 0)
                    ? (Number(hunt.pxp) / huntKills)
                    : (_localKillsJog > 0 && _deltaTotalJog > 0 ? (_deltaTotalJog / _localKillsJog) : 0);

                // O divisor e o XP por abate RECENTE, nao `hunt.xp / hunt.kills`.
                // A media vitalicia era a causa do "faltam 486 pokes" com a
                // barra em 99%; com o divisor vindo da mesma dupla de
                // estimadores que o ETA, a contagem vira `ETA x ritmo de
                // abates` e as duas nao podem mais divergir.
                const xpPorKillPokeCli = xpPorAbateCli(taxaPoke, agora, xpMedioPoke);
                const xpPorKillJogCli = xpPorAbateCli(taxaJog, agora, xpMedioJog);

                const faltaPokeKills = (!isPokeMax && poke.xpRestante > 0 && xpPorKillPokeCli > 0) ? Math.ceil(poke.xpRestante / xpPorKillPokeCli) : null;
                let faltaJogKills = (!isJogMax && jog.xpRestante > 0 && xpPorKillJogCli > 0) ? Math.ceil(jog.xpRestante / xpPorKillJogCli) : null;
                if (!faltaJogKills && !isJogMax && jog.pct > 0 && jog.pct < 100) {
                    const killsTotais = Number(hunt.kills || 0);
                    const killsPor1Pct = killsTotais > 0 ? (killsTotais / Math.max(1, jog.pct)) : 20;
                    faltaJogKills = Math.ceil(killsPor1Pct * (100 - jog.pct));
                }

                // ETA ancorado em PRAZO. O bloco anterior guardava a DURAÇÃO e
                // re-ancorava sempre que `restante` mudasse — ou seja, em todo
                // abate — e o contador tremia.
                let segsPoke = Infinity;
                if (isPokeMax) {
                    _prazoPokeCli.alvo = 0;
                    _prazoPokeCli.base = 0;
                    segsPoke = 0;
                } else if (estaPausado) {
                    segsPoke = pausarPrazoCli(_prazoPokeCli, agora);
                } else {
                    segsPoke = etaSegundosCli(_prazoPokeCli, poke.xpRestante, taxaPoke, agora);
                }

                // Sem `xpRestante` absoluto do treinador, o restante é
                // extrapolado dos abates que faltam. É estimativa, e sai
                // marcada com `~`.
                let jogRestanteEstimado = false;
                let jogRestanteXp = jog.xpRestante;
                if (!isJogMax && !(jogRestanteXp > 0) && faltaJogKills > 0 && xpMedioJog > 0) {
                    jogRestanteXp = faltaJogKills * xpMedioJog;
                    jogRestanteEstimado = true;
                }

                let segsJog = Infinity;
                if (isJogMax) {
                    _prazoJogCli.alvo = 0;
                    _prazoJogCli.base = 0;
                    segsJog = 0;
                } else if (estaPausado) {
                    segsJog = pausarPrazoCli(_prazoJogCli, agora);
                } else {
                    segsJog = etaSegundosCli(_prazoJogCli, jogRestanteXp, taxaJog, agora);
                }

                // Banda de confiança a partir do desvio da taxa (8+ amostras).
                const faixaPokeCli = (!isPokeMax && bandaPokeCli && poke.xpRestante > 0)
                    ? { min: poke.xpRestante / bandaPokeCli.alta, max: poke.xpRestante / bandaPokeCli.baixa } : null;
                const faixaJogCli = (!isJogMax && bandaJogCli && jogRestanteXp > 0)
                    ? { min: jogRestanteXp / bandaJogCli.alta, max: jogRestanteXp / bandaJogCli.baixa } : null;

                const fmtEtaRicoCli = (segs, isMax, isPausado, estimado, faixa) => {
                    const base = fmtTempo(segs, isMax, isPausado);
                    if (isMax || isPausado || base === '--') return base;
                    let banda = '';
                    if (faixa && isFinite(faixa.min) && isFinite(faixa.max)
                        && faixa.min > 0 && faixa.max / faixa.min > 1.15 && faixa.max < 86400 * 3) {
                        banda = ` (${fmtTempoCurto(faixa.min)}–${fmtTempoCurto(faixa.max)})`;
                    }
                    return (estimado ? '~' : '') + base + banda;
                };

                // 3. Publicacao de window.__idleSuiteXpStatus para o Electron Shell
                const statusObj = {
                    poke: {
                        name: poke.name,
                        level: poke.level,
                        shiny: poke.shiny,
                        pct: poke.pct,
                        pctText: isPokeMax ? '100%' : (Math.round(poke.pct) + '%'),
                        falta: isPokeMax ? '⭐ MAX' : fmtFalta(poke.xpRestante, faltaPokeKills),
                        eta: fmtEtaRicoCli(segsPoke, isPokeMax, estaPausado, false, faixaPokeCli),
                        segs: segsPoke,
                        xpRestante: poke.xpRestante,
                        xpNext: poke.xpNext,
                        xp: poke.xp,
                        xpCap: isPokeMax,
                        pausado: estaPausado
                    },
                    jog: {
                        name: jog.name,
                        level: jog.level,
                        pct: jog.pct,
                        pctText: isJogMax ? '100%' : (Math.round(jog.pct) + '%'),
                        falta: isJogMax ? '⭐ MAX' : (jogRestanteEstimado ? '~' : '') + fmtFalta(jogRestanteXp, faltaJogKills),
                        eta: fmtEtaRicoCli(segsJog, isJogMax, estaPausado, jogRestanteEstimado, faixaJogCli),
                        segs: segsJog,
                        xpRestante: jog.xpRestante,
                        xpNext: jog.xpNext,
                        xp: jog.xp,
                        xpCap: isJogMax,
                        pausado: estaPausado
                    },
                    hunt: {
                        kills: huntKills,
                        secs: huntSecs,
                        taxaPoke: taxaPoke,
                        taxaJog: taxaJog,
                        pausado: estaPausado
                    },
                    timestamp: agora
                };

                w.__idleSuiteXpStatus = statusObj;
                window.__idleSuiteXpStatus = statusObj;

                // 4. Selos discretos no card oficial (#player-panel)
                pintarEtaCardOficialClient(segsPoke, segsJog, faltaPokeKills, faltaJogKills, {
                    pokeMax: isPokeMax,
                    jogMax: isJogMax,
                    estaPausado: estaPausado
                });

                // 5. Atualiza a doca lateral se estiver aberta
                atualizarConteudoDockXpClient(statusObj);
            }

            // ---------- 4. SELOS DE ETA NO CARD OFICIAL DO JOGO ----------
            function seloCard(id, refId, cor, alinharDireita) {
                const ref = document.getElementById(refId);
                if (!ref || !ref.parentNode) return null;
                let el = document.getElementById(id);
                if (!el) {
                    el = document.createElement('span');
                    el.id = id;
                    el.style.cssText = 'font-size:10px; font-weight:700; white-space:nowrap; color:' + cor +
                        (alinharDireita ? ';margin-left:auto' : ';margin-left:5px');
                    ref.parentNode.appendChild(el);
                }
                return el;
            }

            function pintarEtaCardOficialClient(segPoke, segJog, killsPoke, killsJog, opts = {}) {
                let ligado = true;
                try { ligado = localStorage.getItem('idleSuiteEtaNoCard') !== '0'; } catch (e) { }
                if (!ligado) {
                    ['idle-eta-poke', 'idle-eta-jog'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.remove();
                    });
                    return;
                }

                const sp = seloCard('idle-eta-poke', 'pp-poke-lv', '#4ade80', true);
                if (sp) {
                    sp.title = 'Tempo e nº de pokémons estimados para o pokémon ativo subir de nível';
                    if (opts.pokeMax) {
                        sp.textContent = '⭐ MAX';
                    } else if (opts.estaPausado) {
                        sp.textContent = '⏸️ Pausado';
                    } else {
                        const t = fmtTempoCurto(segPoke, false, false);
                        const k = (killsPoke != null && killsPoke > 0) ? ` · ≈${fmtNum(killsPoke)}x` : '';
                        sp.textContent = (t !== '—' && t) ? ('⏳ ' + t + k) : '⏳ calculando...';
                    }
                }

                const sj = seloCard('idle-eta-jog', 'pp-exp-pct', '#fbbf24', false);
                if (sj) {
                    sj.title = 'Tempo e nº de pokémons estimados para você subir de nível';
                    if (opts.jogMax) {
                        sj.textContent = '· ⭐ MAX';
                    } else if (opts.estaPausado) {
                        sj.textContent = '· ⏸️ Pausado';
                    } else {
                        const t = fmtTempoCurto(segJog, false, false);
                        const k = (killsJog != null && killsJog > 0) ? ` · ≈${fmtNum(killsJog)}x` : '';
                        sj.textContent = (t !== '—' && t) ? ('· ⏳ ' + t + k) : '· ⏳ calculando...';
                    }
                }
            }

            // ---------- 5. DOCA LATERAL EXPANSÍVEL (›) ----------
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

                pintarBotaoDockXpTreinador(!!(_dockXpTreinador && _dockXpTreinador.aberta()));
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

            // ── A DOCA FICA NO NIVEL DO CARD DO TREINADOR ──────────────
            // `.doca` nasce em z-index 2147483000 (09b): acima de TUDO. Faz
            // sentido pras docas que o usuario abre POR CIMA do jogo. Aqui
            // nao: esta doca e um apendice do #player-panel, e ficar acima de
            // tudo a punha na frente do Time & Box, da Pokedex e dos outros
            // popups do jogo — abrir uma janela do jogo com a doca aberta
            // deixava a doca boiando na frente dela.
            //
            // `docaCederAoJogo` (09c) ja resolve isso, mas so pros overlays
            // que ele conhece (`.hd-ov, .hb-bg, .hb-sub-bg`) e so enquanto
            // eles estao na tela. Em vez de sair listando cada popup do jogo
            // aqui, a doca passa a valer o MESMO que o card ao qual ela esta
            // colada: o que passa por cima do card passa por cima dela
            // tambem, sem lista nenhuma pra manter.
            //
            // O nivel do card e o do ancestral posicionado mais proximo com
            // z-index numerico — e o que de fato empilha o card na pagina do
            // jogo. Nenhum: `auto`, e a doca empilha por ordem de documento,
            // que ja e o comportamento certo pra um elemento no fim do <body>.
            function nivelDoCardTreinador() {
                let el = document.getElementById('player-panel');
                while (el && el !== document.body && el !== document.documentElement) {
                    const cs = getComputedStyle(el);
                    const z = parseInt(cs.zIndex, 10);
                    if (!isNaN(z) && cs.position !== 'static') return z;
                    el = el.parentElement;
                }
                return null;
            }

            function nivelarDockComCardTreinador() {
                if (!_dockXpTreinador) return;
                const z = nivelDoCardTreinador();
                // Sem `!important`: o inline ja vence a regra `.doca`, e deixar
                // a regra `.doca-atras-do-jogo` (09c, com !important) continuar
                // podendo baixar a doca mais ainda e exatamente o que se quer.
                _dockXpTreinador.el.style.zIndex = (z == null ? 'auto' : String(z));
            }

            function garantirDockXpTreinador() {
                if (_dockXpTreinador) return _dockXpTreinador;
                if (typeof docaCriar !== 'function') return null;
                _dockXpTreinador = docaCriar({
                    id: 'ppxp-dock', titulo: '📈 XP Tracker completo', lado: 'direita',
                    largura: 250, ancora: 'player-panel', independente: true
                });
                _dockXpTreinador.corpo.innerHTML =
                    linhaXpDock('ppxp-dock-poke', '🐾', '#4ade80') +
                    linhaXpDock('ppxp-dock-jog', '🧑', '#fbbf24');
                nivelarDockComCardTreinador();
                return _dockXpTreinador;
            }

            function toggleDockXpTreinador() {
                const d = garantirDockXpTreinador();
                if (!d) return;
                const abrir = !d.aberta();
                d.mostrar(abrir, true);
                pintarBotaoDockXpTreinador(abrir);
                // Relido a cada abertura: o card do jogo e redesenhado (troca
                // de tela, troca de conta) e pode voltar num nivel diferente.
                if (abrir) nivelarDockComCardTreinador();
                if (abrir && w.__idleSuiteXpStatus) {
                    atualizarConteudoDockXpClient(w.__idleSuiteXpStatus);
                }
            }

            function atualizarConteudoDockXpClient(s) {
                if (!_dockXpTreinador || !_dockXpTreinador.aberta() || !s) return;

                function preencher(prefixo, dado) {
                    if (!dado) return;
                    const elName = document.getElementById(prefixo + '-name');
                    const elLv = document.getElementById(prefixo + '-lv');
                    const elPct = document.getElementById(prefixo + '-pct');
                    const elFill = document.getElementById(prefixo + '-fill');
                    const elFalta = document.getElementById(prefixo + '-falta');
                    const elEta = document.getElementById(prefixo + '-eta');
                    const pct = Math.max(0, Math.min(100, Math.round(Number(dado.pct) || 0)));
                    if (elName) elName.textContent = (dado.shiny ? '✨ ' : '') + (dado.name || '--');
                    if (elLv) elLv.textContent = 'Lv.' + (dado.level || '--');
                    if (elPct) elPct.textContent = dado.pctText || (pct + '%');
                    if (elFill) elFill.style.width = pct + '%';
                    if (elFalta) elFalta.textContent = dado.falta || '—';
                    if (elEta) {
                        if (dado.xpCap) {
                            elEta.textContent = '⭐ MAX';
                        } else if (dado.pausado) {
                            elEta.textContent = '⏸️ Pausado';
                        } else if (dado.eta) {
                            elEta.textContent = (dado.eta.indexOf('⏳') === 0 || dado.eta.indexOf('⭐') === 0 || dado.eta.indexOf('⏸️') === 0)
                                ? dado.eta
                                : (dado.eta === '--' ? '⏳ —' : '⏳ ' + dado.eta);
                        } else {
                            elEta.textContent = '⏳ —';
                        }
                    }
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
                if (_dockXpTreinador.rodape) {
                    _dockXpTreinador.rodape.textContent = secs > 0
                        ? ('⏱️ ' + tempo + ' de caçada · ⚔️ ' + Number(h.kills || 0).toLocaleString('pt-BR') + ' kills')
                        : '';
                }
            }

            // ---------- 6. PONTES AUXILIARES PARA SHELL ----------
            w.__getTabInfo = function () {
                try {
                    const { poke, jog } = extrairDadosAtivos();
                    return JSON.stringify({
                        poke: poke.name || '',
                        lv: poke.level || '',
                        trainer: jog.name || ''
                    });
                } catch (e) { return '{}'; }
            };

            w.__obterDashboardStatus = function () {
                try {
                    const { s, player, active, hunt, poke, jog } = extrairDadosAtivos();
                    const temHunt = hunt && Number(hunt.secs || 0) > 0;
                    const _agoraTx = Date.now();
                    const taxaPoke = lerTaxaCli(_taxaXpPokeCli, _agoraTx)
                        || (temHunt && Number(hunt.xp || 0) > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0);
                    const taxaJog = lerTaxaCli(_taxaXpJogCli, _agoraTx)
                        || (temHunt && Number(hunt.pxp || 0) > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0);
                    const segsPoke = taxaPoke > 0 && poke.xpRestante > 0 ? poke.xpRestante / taxaPoke : null;
                    const segsJog = taxaJog > 0 && jog.xpRestante > 0 ? jog.xpRestante / taxaJog : null;

                    return {
                        trainer: jog.name,
                        level: Number(jog.level) || 1,
                        xp: jog.xp,
                        xpNext: jog.xpNext,
                        xpPct: Math.round(jog.pct),
                        xpFalta: jog.xpRestante,
                        xpPorSeg: taxaJog,
                        trainerEtaSeg: segsJog,
                        trainerEta: fmtTempoCurto(segsJog) || '—',
                        kills: Number(player.kills || 0),
                        catches: Number(player.catches || 0),
                        gold: Number(player.gold || 0),
                        diamonds: Number(player.diamonds || 0),
                        active: {
                            id: active.id,
                            name: poke.name,
                            level: Number(poke.level) || 1,
                            shiny: poke.shiny,
                            hp: Number(active.hp || 0),
                            maxHp: Number(active.maxHp || 100),
                            exp: poke.xp,
                            expNext: poke.xpNext,
                            expPct: Math.round(poke.pct),
                            expFalta: poke.xpRestante,
                            expEtaSeg: segsPoke,
                            expEta: fmtTempoCurto(segsPoke) || '—',
                            xpPorSeg: taxaPoke
                        },
                        hunt: {
                            active: temHunt,
                            target: (hunt.lock && hunt.lock.name) || 'Caçada Livre',
                            kills: Number(hunt.kills || 0),
                            catches: Number(hunt.catches || 0),
                            xpGained: Number(hunt.xp || 0),
                            secs: Number(hunt.secs || 0)
                        }
                    };
                } catch (e) {
                    return { erro: String((e && e.message) || e) };
                }
            };

            // Loop de atualizacao continua de XP e UI (1s)
            setInterval(() => {
                garantirBotaoDockXpTreinador();
                // So com a doca aberta: fechada nao ha o que empilhar, e o
                // getComputedStyle nao precisa rodar de graca a cada segundo.
                if (_dockXpTreinador && _dockXpTreinador.aberta()) nivelarDockComCardTreinador();
                atualizarStatusXpClient();
            }, 1000);

            garantirBotaoDockXpTreinador();
            atualizarStatusXpClient();
        })();

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

        // =====================================================================
        // 28e-botao-mapa-ancorado.js — OS BOTÕES DE MAPA SAEM DE CIMA DO CARD
        // =====================================================================
        // Dois botões flutuantes do jogo nascem cravados na coluna da esquerda,
        // na altura em que o card do treinador TERMINAVA:
        //
        //     #mm-show     { position: fixed; left: 12px; top: 262px; }  🗺️
        //     #btn-map-adm { position: fixed; left: 12px; top: 300px; }
        //
        // O #mm-show é o "Mostrar minimapa" — ele só aparece depois que você
        // esconde o minimapa, e é o que estava por cima do card. O #btn-map-adm
        // é o "Mapa (ADM)", que quase todo mundo recebe já com a classe
        // `hidden`. Os dois moram na mesma faixa de pixels.
        //
        // O card cresceu — os selos de ETA (28-auto-hunt-precos) e a tira das
        // berrys (28d) somam altura — e eles passaram a ficar POR CIMA dele,
        // tapando o ✨ Bônus. E como nenhum dos dois é um `.panel` do jogo, não
        // passam pelo restoreElementPosition(): não dá pra arrastar pra lugar
        // nenhum.
        //
        // Duas coisas acontecem aqui, nesta ordem:
        //
        //   1. Por padrão eles ficam OCULTOS.
        //   2. Quem quiser de volta liga em "Ajustes do card", no painel do +
        //      da tira da berry (28d). Aí reaparecem ANCORADOS: a posição passa
        //      a ser medida do card de verdade (getBoundingClientRect, que já
        //      considera o `transform: scale(.82)` que o jogo aplica em tela
        //      estreita) e eles empilham logo abaixo, alinhados pela esquerda.
        //      Card arrastado, tira da berry aparecendo ou sumindo, janela
        //      mudando de tamanho: acompanham sozinhos, porque a conta refaz a
        //      cada tick.
        //
        // Estilo inline ganha do seletor de id da folha do jogo, então não
        // precisa de !important nem de sobrescrever CSS.
        //
        // ⚠️ A classe `hidden` do jogo é sempre respeitada, e ela quer dizer
        // coisas diferentes nos dois: no #btn-map-adm é "você não é ADM"; no
        // #mm-show é "o minimapa está aberto, não precisa do botão de mostrar".
        // Nos dois casos a resposta é a mesma — não encostar. Quem decide se o
        // botão EXISTE é o jogo; nós só decidimos o que fazer com um que ele já
        // tinha mostrado.
        //
        // ⚠️ Com o toggle desligado e o minimapa escondido, o caminho de volta
        // pro minimapa é ligar o toggle de novo. É o que o texto de ajuda do
        // toggle avisa.
        // =====================================================================

        const MAPA_VISIVEL_KEY = 'idleSuiteMapaVisivel';
        const MAPA_FOLGA_PX = 8;
        const MAPA_BOTOES = ['mm-show', 'btn-map-adm'];
        let _mapaUltimaPos = '';

        // Ausente = oculto. Só um '1' explícito, gravado pelo toggle, mostra.
        function mapaVisivel() {
            try { return localStorage.getItem(MAPA_VISIVEL_KEY) === '1'; } catch (e) { return false; }
        }

        function mapaDefinirVisivel(v) {
            try { localStorage.setItem(MAPA_VISIVEL_KEY, v ? '1' : '0'); } catch (e) { }
            _mapaUltimaPos = '';   // força reposicionar quando voltarem a aparecer
            aplicarBotaoMapa();
        }

        function aplicarBotaoMapa() {
            const mostrar = mapaVisivel();
            const card = document.getElementById('player-panel');

            // Empilhados na ordem de MAPA_BOTOES, cada um abaixo do anterior.
            // Sem o card (ainda não montou) não há de onde medir: nesse caso só
            // o esconder continua valendo, que não depende de posição nenhuma.
            const r = card ? card.getBoundingClientRect() : null;
            let topo = (r && r.height) ? Math.round(r.bottom + MAPA_FOLGA_PX) : 0;
            const esq = (r && r.height) ? Math.round(r.left) : 0;

            // Esconder não depende de medida nenhuma e é idempotente, então sai
            // na frente e sem passar pela memória de posição.
            const visiveis = [];
            for (const id of MAPA_BOTOES) {
                const btn = document.getElementById(id);
                if (!btn) continue;

                // `hidden` é decisão do jogo — ver o comentário do topo.
                if (btn.classList.contains('hidden')) continue;

                if (!mostrar) {
                    if (btn.style.display !== 'none') btn.style.display = 'none';
                    continue;
                }
                if (btn.style.display === 'none') btn.style.display = '';
                if (topo && btn.offsetParent) visiveis.push(btn);
            }
            if (!mostrar || !visiveis.length) return;

            // A posição de cada um é decidida ANTES de escrever: reescrever
            // style a cada segundo num elemento `position:fixed` força recálculo
            // de layout à toa, e sem calcular tudo primeiro não dá pra saber se
            // alguma coisa mudou de verdade.
            const alvos = [];
            for (const btn of visiveis) {
                alvos.push({ btn, topo, esq });
                topo += Math.round(btn.getBoundingClientRect().height) + 6;
            }
            const marca = alvos.map(a => a.btn.id + ':' + a.esq + ',' + a.topo).join('|');
            if (marca === _mapaUltimaPos) return;
            _mapaUltimaPos = marca;

            for (const a of alvos) {
                a.btn.style.top = a.topo + 'px';
                a.btn.style.left = a.esq + 'px';
            }
        }

        aplicarBotaoMapa();
        setInterval(aplicarBotaoMapa, 1000);
        window.addEventListener('resize', aplicarBotaoMapa);

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
        // 35c-fusao-lote.js — FUNDIR BOLAS EM LOTE
        // =====================================================================
        // A tira "Fundir" do jogo (game.js, .fuse-row) sempre manda
        // `vezes: 1`. Quem tem 400 Moon Ball precisa de 20 cliques — e cada
        // clique remonta a mochila inteira (o handler do jogo re-chama
        // openBag), então são 20 redesenhos também.
        //
        // Aqui embaixo de cada tira nasce uma SEGUNDA tira, só nossa, com
        // quantidade escolhida (−/+, campo, "máx") e um botão que faz o lote de
        // uma vez. A tira do jogo continua intacta: um clique nela ainda funde
        // uma, e quem não quiser lote nunca precisa olhar pra nossa.
        //
        // ── Receita: do /api/meta, nunca cravada ──
        // `S.balls[].fusao` = { de: 'premier', custo: 20 }. Se o dono trocar
        // 20 por 15 no balls.json, esta tira acompanha sem deploy — mesma
        // decisão que o game.js já documenta na tira original.
        //
        // ── Uma requisição, com rede ──
        // O servidor recebe `vezes` e DEVOLVE quantas fez (`resp.vezes`), então
        // não precisamos adivinhar se ele aceita lote: pedimos N, conferimos o
        // que voltou e completamos o que faltar com pedidos de 1 em 1. Se ele
        // aceitar o lote, é 1 requisição; se limitar a 1, o resultado é o mesmo
        // que os 20 cliques dariam — só que sem os 20 cliques e sem os 20
        // redesenhos, porque a mochila só é redesenhada no fim.
        // =====================================================================

        // Quantidade escolhida por receita, entre um redesenho e outro da
        // mochila. Sem isto, digitar 7 e ver a tira renascer com "máx" seria a
        // regra, não a exceção: o jogo remonta a grade a cada poll.
        const _fLoteQtd = {};
        let _fLoteRodando = false;
        let _fLoteAbortar = false;

        function fLoteEstado() {
            // Mesmo acesso léxico do 35: K e S são `let` de topo de script no
            // game.js, então não existem em window.
            let est = null, meta = null;
            try { if (typeof K !== 'undefined' && K) est = K; } catch (e) { }
            try { if (typeof S !== 'undefined' && S) meta = S; } catch (e) { }
            if (!est || !meta) {
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (!est) est = w.K || null;
                    if (!meta) meta = w.S || null;
                } catch (e) { }
            }
            return { K: est, S: meta };
        }

        // Todas as receitas de fusão que o jogador PODE fazer agora (>= 1).
        // Espelha o filtro da tira do jogo de propósito: nossa tira só existe
        // colada numa tira dele.
        function fLoteReceitas() {
            const { K, S } = fLoteEstado();
            if (!K || !S || !Array.isArray(S.balls)) return [];
            const fora = [];
            for (const b of S.balls) {
                if (!b.fusao || !b.fusao.de) continue;
                const de = b.fusao.de;
                const custo = Math.max(1, b.fusao.custo | 0);
                const tem = (K.balls && K.balls[de]) | 0;
                const max = Math.floor(tem / custo);
                if (max < 1) continue;
                const deLabel = (S.balls.find(x => x.key === de) || {}).label || de;
                fora.push({ alvo: b.key, label: b.label || b.key, de, deLabel, custo, tem, max });
            }
            return fora;
        }

        function fLoteToast(msg) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            try { if (typeof w.showStatusToast === 'function') { w.showStatusToast(msg); return; } } catch (e) { }
            try { if (typeof logEvent === 'function') logEvent(msg, '#c4b5fd'); } catch (e) { }
        }

        // Uma chamada crua ao endpoint. O `t()` do jogo não é alcançável daqui
        // (é local do game.js), então falamos com a API do mesmo jeito que os
        // outros módulos do suite falam.
        async function fLotePedir(alvo, vezes) {
            const tok = (typeof obterToken === 'function') ? obterToken() : '';
            if (!tok) throw new Error('Sem token pra falar com o servidor.');
            const r = await fetch('/api/balls/fundir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tok, alvo, vezes })
            });
            let o = null;
            try { o = await r.json(); } catch (e) { o = null; }
            // Erro do servidor vem como mensagem, não como exceção de rede — e
            // sem `alvo` na resposta não houve fusão nenhuma.
            if (!r.ok || !o || !o.alvo) {
                throw new Error((o && (o.error || o.erro || o.message)) || ('Falha na fusão (HTTP ' + r.status + ').'));
            }
            return o;
        }

        // Aplica a resposta no estado do jogo. A mochila é desenhada a partir
        // de K.balls: sem isto o jogador só veria a bola nova no próximo poll,
        // que é exatamente o que o handler original do jogo evita.
        function fLoteAplicar(rec, resp) {
            const { K } = fLoteEstado();
            if (!K || !K.balls) return;
            if (resp.de && resp.de.restam != null) K.balls[rec.de] = resp.de.restam;
            if (resp.alvo && resp.alvo.total != null) K.balls[rec.alvo] = resp.alvo.total;
        }

        async function fLoteExecutar(rec, vezes, bt) {
            if (_fLoteRodando) return;
            vezes = Math.max(1, Math.min(rec.max, vezes | 0));
            _fLoteRodando = true;
            _fLoteAbortar = false;
            const rotulo = bt.textContent;
            bt.classList.add('flote-rodando');
            const pintar = feito => { bt.textContent = feito + '/' + vezes + ' — parar'; };
            pintar(0);

            let feito = 0, gastou = 0, erro = null;
            try {
                // 1ª tentativa: o lote inteiro numa requisição.
                try {
                    const o = await fLotePedir(rec.alvo, vezes);
                    fLoteAplicar(rec, o);
                    feito = Math.max(1, o.vezes | 0);
                    gastou = (o.gastou | 0) || feito * rec.custo;
                } catch (e) {
                    // Servidor que recusa o lote ainda aceita a unidade: o laço
                    // abaixo cobre esse caso sozinho. Só desistimos se ele
                    // recusar a unidade também.
                    erro = e;
                }
                // 2ª parte: completa o que faltou (servidor que ignora/limita o
                // `vezes`, ou que recusou o lote de cara).
                while (feito < vezes && !_fLoteAbortar) {
                    try {
                        const o = await fLotePedir(rec.alvo, 1);
                        fLoteAplicar(rec, o);
                        feito += Math.max(1, o.vezes | 0);
                        gastou += (o.gastou | 0) || rec.custo;
                        erro = null;
                        pintar(feito);
                    } catch (e) { erro = e; break; }
                    // Respiro entre chamadas: 20 POSTs sem pausa é o desenho de
                    // um cliente que parece ataque, não de um que parece jogo.
                    await new Promise(res => setTimeout(res, 90));
                }
            } finally {
                _fLoteRodando = false;
                bt.classList.remove('flote-rodando');
                bt.textContent = rotulo;
            }

            if (feito > 0) {
                delete _fLoteQtd[rec.alvo];
                fLoteToast('🌕 ' + gastou + '× ' + rec.deLabel + ' viraram ' + feito + '× ' + rec.label + '!');
                // Redesenha pelo caminho do próprio jogo (o envelope da doca do
                // inventário mora aqui também, então a doca acompanha).
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (typeof w.openBag === 'function') w.openBag();
                } catch (e) { }
            }
            if (erro && feito < vezes) fLoteToast('⚠️ ' + (erro.message || 'Fusão interrompida.') + (feito ? ' (' + feito + ' feita(s))' : ''));
        }

        const FLOTE_CSS = `
        .flote-row{grid-column:1/-1;display:flex;align-items:center;gap:8px;width:100%;
            margin:-1px 0 5px;padding:6px 9px;border-radius:10px;color:#cfc6ea;font:inherit;
            border:1px solid #322b52;border-top-color:#241f3d;
            background:linear-gradient(180deg,rgba(60,46,105,.20),rgba(15,17,30,.42))}
        .flote-lbl{font-size:10.5px;letter-spacing:.3px;color:#8f86ad}
        .flote-bt{font:inherit;font-size:12px;line-height:1;color:#e6d9ff;cursor:pointer;
            padding:5px 9px;border-radius:7px;border:1px solid rgba(185,155,255,.32);
            background:linear-gradient(180deg,rgba(150,120,235,.22),rgba(70,55,130,.22))}
        .flote-bt:hover{border-color:rgba(215,190,255,.7);color:#fff}
        .flote-bt:disabled{opacity:.4;cursor:default}
        .flote-num{width:64px;font:inherit;font-size:12px;text-align:center;color:#fff;
            padding:5px 4px;border-radius:7px;border:1px solid #453a70;background:rgba(10,11,20,.6);
            font-variant-numeric:tabular-nums}
        .flote-num::-webkit-outer-spin-button,.flote-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .flote-conta{font-size:10.5px;color:#8f86ad;font-variant-numeric:tabular-nums}
        .flote-go{margin-left:auto;font-size:10px;font-weight:800;letter-spacing:2.2px;
            text-transform:uppercase;color:#e6d9ff;cursor:pointer;padding:6px 12px;border-radius:7px;
            border:1px solid rgba(185,155,255,.4);font-family:inherit;
            background:linear-gradient(180deg,rgba(150,120,235,.3),rgba(70,55,130,.3))}
        .flote-go:hover:not(:disabled){color:#fff;border-color:rgba(215,190,255,.78);
            background:linear-gradient(180deg,rgba(170,140,255,.46),rgba(90,70,160,.42))}
        .flote-go:disabled{opacity:.45;cursor:default}
        .flote-go.flote-rodando{letter-spacing:.6px;border-color:rgba(255,180,120,.6);color:#ffd9a8;
            background:linear-gradient(180deg,rgba(190,120,60,.34),rgba(90,55,25,.34))}
        `;

        function fLoteCss() {
            if (document.getElementById('flote-css')) return;
            const st = document.createElement('style');
            st.id = 'flote-css';
            st.textContent = FLOTE_CSS;
            document.head.appendChild(st);
        }

        // A tira do jogo não carrega o `key` da bola em lugar nenhum do DOM —
        // só o `title`, que é texto de interface. Por isso casamos pela ORDEM:
        // o game.js percorre `S.balls` na mesma ordem que fLoteReceitas(), e
        // ambos aplicam o mesmo filtro (`max >= 1`). O `title` entra só como
        // conferência: se ele não citar o rótulo da receita que a ordem diz,
        // desistimos daquela linha em vez de desenhar o controle errado.
        function fLoteCasar(linhas, receitas) {
            const pares = [];
            const n = Math.min(linhas.length, receitas.length);
            for (let i = 0; i < n; i++) {
                const t = linhas[i].title || '';
                if (t && receitas[i].label && t.indexOf(receitas[i].label) < 0) continue;
                pares.push([linhas[i], receitas[i]]);
            }
            return pares;
        }

        function fLoteMontar(linha, rec) {
            const row = document.createElement('div');
            row.className = 'flote-row';
            row.dataset.floteAlvo = rec.alvo;
            row.title = 'Fusão em lote: escolha quantas ' + rec.label + ' fazer de uma vez.';

            const lbl = document.createElement('span');
            lbl.className = 'flote-lbl';
            lbl.textContent = 'Em lote:';

            const menos = document.createElement('button');
            menos.type = 'button';
            menos.className = 'flote-bt';
            menos.textContent = '−';

            const num = document.createElement('input');
            num.className = 'flote-num';
            num.type = 'number';
            num.min = '1';
            num.max = String(rec.max);
            num.step = '1';

            const mais = document.createElement('button');
            mais.type = 'button';
            mais.className = 'flote-bt';
            mais.textContent = '+';

            const max = document.createElement('button');
            max.type = 'button';
            max.className = 'flote-bt';
            max.textContent = 'máx ' + rec.max;

            const conta = document.createElement('span');
            conta.className = 'flote-conta';

            const go = document.createElement('button');
            go.type = 'button';
            go.className = 'flote-go';

            // Padrão = o máximo. Quem abre esta tira quase sempre quer "faz
            // tudo"; quem quer 3 digita 3, e a escolha sobrevive ao redesenho.
            let v = _fLoteQtd[rec.alvo];
            v = Math.max(1, Math.min(rec.max, (v | 0) || rec.max));

            const pintar = () => {
                _fLoteQtd[rec.alvo] = v;
                num.value = String(v);
                conta.textContent = (v * rec.custo) + '× ' + rec.deLabel + ' → ' + v + '× ' + rec.label
                    + ' · sobram ' + (rec.tem - v * rec.custo);
                go.textContent = 'Fundir ' + v + '×';
                menos.disabled = v <= 1;
                mais.disabled = v >= rec.max;
                max.disabled = v >= rec.max;
            };

            const setar = nv => {
                v = Math.max(1, Math.min(rec.max, (nv | 0) || 1));
                pintar();
            };

            menos.onclick = ev => { ev.stopPropagation(); setar(v - 1); };
            mais.onclick = ev => { ev.stopPropagation(); setar(v + 1); };
            max.onclick = ev => { ev.stopPropagation(); setar(rec.max); };
            num.onclick = ev => ev.stopPropagation();
            num.oninput = () => {
                // Enquanto digita, campo vazio é campo vazio — normalizar aqui
                // faria "2" virar "1" no meio da digitação de "20".
                const n = parseInt(num.value, 10);
                if (!isNaN(n)) { v = Math.max(1, Math.min(rec.max, n)); _fLoteQtd[rec.alvo] = v; }
            };
            num.onchange = () => setar(parseInt(num.value, 10));
            num.onkeydown = ev => {
                ev.stopPropagation();   // o jogo escuta teclas soltas na página
                if (ev.key === 'Enter') { setar(parseInt(num.value, 10)); go.click(); }
            };

            go.onclick = ev => {
                ev.stopPropagation();
                // Clicar de novo enquanto roda = parar. O lote já feito fica
                // feito; só o que falta é cancelado.
                if (_fLoteRodando) { _fLoteAbortar = true; return; }
                fLoteExecutar(rec, v, go);
            };

            pintar();
            row.append(lbl, menos, num, mais, max, conta, go);
            linha.insertAdjacentElement('afterend', row);
        }

        // Redesenha as tiras de lote quando a mochila muda. Barato: sai fora na
        // hora se não há tira de fusão na tela (o caso comum).
        function fLoteSincronizar() {
            const corpo = document.getElementById('modal-body');
            if (!corpo) return;
            const linhas = [...corpo.querySelectorAll('.fuse-row')];
            if (!linhas.length) {
                corpo.querySelectorAll('.flote-row').forEach(el => el.remove());
                return;
            }
            // Mexer no DOM no meio de um lote tiraria o botão que mostra o
            // progresso (e o que serve pra parar) debaixo do dedo do jogador.
            if (_fLoteRodando) return;
            const receitas = fLoteReceitas();
            const pares = fLoteCasar(linhas, receitas);
            const vivos = new Set();
            for (const [linha, rec] of pares) {
                vivos.add(rec.alvo);
                const atual = linha.nextElementSibling;
                const jaOk = atual && atual.classList && atual.classList.contains('flote-row')
                    && atual.dataset.floteAlvo === rec.alvo && atual.dataset.floteMax === String(rec.max);
                if (jaOk) continue;
                if (atual && atual.classList && atual.classList.contains('flote-row')) atual.remove();
                fLoteMontar(linha, rec);
                const nova = linha.nextElementSibling;
                if (nova) nova.dataset.floteMax = String(rec.max);
            }
            corpo.querySelectorAll('.flote-row').forEach(el => {
                if (!vivos.has(el.dataset.floteAlvo)) el.remove();
            });
        }

        if (!window.__fusaoLoteInstalada) {
            window.__fusaoLoteInstalada = true;
            fLoteCss();
            // Duas redes, como o resto do suite: o observador pega o redesenho
            // no mesmo quadro; o tick cobre o caso de o #modal-body ainda não
            // existir quando instalamos, ou de o markup do jogo mudar.
            try {
                const corpo = document.getElementById('modal-body');
                if (corpo && typeof MutationObserver === 'function') {
                    new MutationObserver(() => {
                        try { fLoteSincronizar(); } catch (e) { console.error('[fusao-lote] obs', e); }
                    }).observe(corpo, { childList: true, subtree: true });
                }
            } catch (e) { }
            setInterval(() => {
                try { fLoteSincronizar(); } catch (e) { console.error('[fusao-lote] tick', e); }
            }, 600);
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
        // 40-pokepedia-dados.js — POKÉPÉDIA: camada de dados (sem DOM)
        // =====================================================================
        // A Poképédia é uma referência para NAVEGAR tudo que o servidor manda no
        // /api/meta — os 599 da dex, os 235 held, os 72 TM, as 650+ zonas e a
        // tabela de tipos — sem sair pro site. Este arquivo é só o dado: recebe
        // o catálogo e devolve listas, buscas e cruzamentos prontos. Quem
        // desenha é o 41. Sem DOM e sem global próprio: dá pra testar fora do
        // navegador passando o meta na mão.
        //
        // ── DE ONDE VEM O META ──
        // `S` (símbolo do jogo, ver EXTERNOS no checar_escopo) É o objeto do
        // /api/meta em runtime — o MESMO que a doca do inventário lê em 35. Não
        // buscamos nada pela rede: se o jogo carregou, o dado já está aqui, e a
        // Poképédia funciona offline depois do primeiro load.
        //
        // ── A TABELA DE TIPOS SÓ TEM O SUPER-EFETIVO ──
        // No meta, `typeChart[ataque]` é a LISTA de tipos defensores que aquele
        // ataque bate FORTE (ex.: fire → [grass, bug, ice, steel]). Não há dado
        // de resistência (0.5×) nem imunidade (0×). Então dá pra derivar, com
        // honestidade:
        //   • "forte atacando" de um pokémon = typeChart[tipo dele] (o que o
        //     STAB dele arrebenta).
        //   • "fraco contra" (defensivo) = todo tipo de ataque A tal que um dos
        //     tipos do pokémon aparece em typeChart[A] — inversão da tabela.
        // O que NÃO dá pra afirmar (resiste a / imune a) a tela não inventa.
        // =====================================================================

        function ppMeta() {
            try { if (typeof S !== 'undefined' && S) return S; } catch (e) { }
            return null;
        }

        // "Focus\nPunch" → "Focus Punch"; nomes do meta trazem \n literal.
        function ppLimpo(t) {
            return String(t == null ? '' : t).replace(/\s*\n\s*/g, ' ').trim();
        }

        function ppNorm(t) {
            return ppLimpo(t).toLowerCase();
        }

        function ppDex() {
            const m = ppMeta();
            return (m && Array.isArray(m.dex)) ? m.dex : [];
        }

        function ppHelds() {
            const m = ppMeta();
            return (m && Array.isArray(m.heldItems)) ? m.heldItems
                : (m && Array.isArray(m.helds)) ? m.helds : [];
        }

        function ppTms() {
            const m = ppMeta();
            return (m && Array.isArray(m.tms)) ? m.tms : [];
        }

        function ppZones() {
            const m = ppMeta();
            return (m && Array.isArray(m.zones)) ? m.zones : [];
        }

        function ppTypeChart() {
            const m = ppMeta();
            return (m && m.typeChart && typeof m.typeChart === 'object') ? m.typeChart : {};
        }

        // Lista fixa dos 18 tipos, na ordem canônica — usada quando a tela
        // precisa iterar tipos mesmo que o typeChart venha capado.
        const PP_TIPOS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice',
            'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock',
            'ghost', 'dragon', 'dark', 'steel', 'fairy'];

        // "forte atacando": o que o STAB desse(s) tipo(s) bate forte.
        function ppForteAtacando(type1, type2) {
            const tc = ppTypeChart();
            const out = new Set();
            for (const t of [type1, type2]) {
                if (!t) continue;
                for (const d of (tc[ppNorm(t)] || [])) out.add(ppNorm(d));
            }
            return [...out];
        }

        // "fraco contra" (defensivo): inversão da tabela. Um pokémon é fraco a
        // um ataque A se algum tipo DELE está na lista de A.
        function ppFracoContra(type1, type2) {
            const tc = ppTypeChart();
            const meus = [type1, type2].filter(Boolean).map(ppNorm);
            const out = new Set();
            for (const atk of PP_TIPOS) {
                const bate = (tc[atk] || []).map(ppNorm);
                if (meus.some(m => bate.includes(m))) out.add(atk);
            }
            return [...out];
        }

        // Onde caçar: zonas cujo spawn tem esse pokémon (casa por name/baseName,
        // normalizado). Devolve [{ zona, region, reqLevel, weight }], ordenado
        // pela chance (weight) desc — onde ele é mais comum primeiro.
        function ppOndeAcha(nomeOuKey) {
            const alvo = ppNorm(nomeOuKey);
            if (!alvo) return [];
            const out = [];
            for (const z of ppZones()) {
                for (const p of (z.pokemon || [])) {
                    const bate = ppNorm(p.name) === alvo
                        || ppNorm(p.baseName) === alvo;
                    if (bate) {
                        out.push({
                            zona: z.name, region: z.region || '',
                            reqLevel: z.reqLevel | 0, weight: p.weight | 0,
                            index: z.index
                        });
                        break;
                    }
                }
            }
            return out.sort((a, b) => b.weight - a.weight);
        }

        // Held sugerido para um tipo: os held de "dano-tipo" costumam ter o tipo
        // no meio do desc ("golpes do tipo X"). Casamento simples por texto —
        // é uma DICA, não um veredito. Devolve [{ label, desc }].
        function ppHeldsPorTipo(type1, type2) {
            const tipos = [type1, type2].filter(Boolean).map(ppNorm);
            if (!tipos.length) return [];
            const PT = {
                normal: 'normal', fire: 'fogo', water: 'água', grass: 'planta',
                electric: 'elétr', ice: 'gelo', fighting: 'lutador', poison: 'veneno',
                ground: 'terra', flying: 'voador', psychic: 'psíqui', bug: 'inseto',
                rock: 'pedra', ghost: 'fantasma', dragon: 'dragão', dark: 'sombri',
                steel: 'aço', fairy: 'fada'
            };
            const alvos = tipos.map(t => PT[t] || t);
            const out = [];
            for (const h of ppHelds()) {
                if (ppNorm(h.funcao).indexOf('dano-tipo') < 0) continue;
                const d = ppNorm(h.desc);
                if (alvos.some(a => d.indexOf(a) >= 0)) {
                    out.push({ label: h.label || ppLimpo(h.name), desc: ppLimpo(h.desc), cid: h.cid });
                }
            }
            return out;
        }

        // ── Outras categorias de item do /api/meta (aba Itens) ──────────────
        function ppStones()     { const m = ppMeta(); return (m && Array.isArray(m.stones))     ? m.stones     : []; }
        function ppBalls()      { const m = ppMeta(); return (m && Array.isArray(m.balls))      ? m.balls      : []; }
        function ppPotions()    { const m = ppMeta(); return (m && Array.isArray(m.potions))    ? m.potions    : []; }
        function ppBaits()      { const m = ppMeta(); return (m && Array.isArray(m.baits))      ? m.baits      : []; }
        function ppBossItems()  { const m = ppMeta(); return (m && Array.isArray(m.bossItems))  ? m.bossItems  : []; }
        function ppTradeItems() { const m = ppMeta(); return (m && Array.isArray(m.tradeItems)) ? m.tradeItems : []; }
        function ppOutfits()    { const m = ppMeta(); return (m && Array.isArray(m.outfits))    ? m.outfits    : []; }

        // ── Megas: cruza a dex do meta com quem tem base stats de Mega (módulo
        // 42). Devolve os pokémon da dex que possuem forma Mega, com os stats da
        // base e da mega lado a lado. Depende de ppStatsDe/PP_MEGA_KEYS (42).
        function ppMegas() {
            if (typeof PP_MEGA_KEYS === 'undefined' || typeof ppStatsDe !== 'function') return [];
            // Índice dos nomes da dex, normalizados, do mais longo pro mais curto,
            // pra que 'megacharizardx' case com 'charizard' (e não com nada menor).
            const dexNorm = ppDex().map(p => ({ p: p, n: ppNorm(p.name).replace(/[^a-z0-9]/g, '') }))
                .sort((a, b) => b.n.length - a.n.length);
            const out = [];
            for (const key of PP_MEGA_KEYS) {
                const bare = key.replace(/^mega/, '');            // ex.: 'charizardx'
                const alvo = dexNorm.find(d => d.n && bare.indexOf(d.n) === 0);
                if (!alvo) continue;
                const p = alvo.p;
                let label = ppLimpo(p.name);                       // nome-base por padrão
                if (typeof PP_STATS_LABEL !== 'undefined' && PP_STATS_LABEL[key]) {
                    label = PP_STATS_LABEL[key].replace(/^\s*mega\s+/i, ''); // 'Charizard X'
                }
                out.push({
                    mkey: key, dex: p.dex, name: label, key: p.key, lookType: p.lookType,
                    type1: p.type1, type2: p.type2, tier: p.tier,
                    base: ppStatsDe(p.name), mega: ppStatsDe(key)
                });
            }
            return out;
        }

        // Busca genérica por nome/label/move, com filtro opcional de tipo e tier.
        function ppFiltrarDex(termo, tipo, tier) {
            const q = ppNorm(termo);
            const ft = tipo ? ppNorm(tipo) : '';
            const fr = tier ? String(tier).toUpperCase() : '';
            return ppDex().filter(p => {
                if (q && ppNorm(p.name).indexOf(q) < 0 && String(p.dex) !== q) return false;
                if (ft && ppNorm(p.type1) !== ft && ppNorm(p.type2) !== ft) return false;
                if (fr && String(p.tier || '').toUpperCase() !== fr) return false;
                return true;
            });
        }

        // =====================================================================
        // 41-pokepedia-ui.js — POKÉPÉDIA: botão flutuante + janela de busca
        // =====================================================================
        // Desenha a Poképédia. O DADO vem todo do 40 (que lê o /api/meta via S);
        // aqui é só tela. É de propósito AUTO-CONTIDO: um botão 📚 próprio e uma
        // janela (overlay) própria, sem tocar no painel-suite (07h/07o/08). Isso
        // deixa o layout livre pra ocupar a tela toda — que é o que uma dex de
        // 599 precisa — e mantém o módulo fácil de portar depois (o botão e o
        // overlay nascem do body, não dependem da suite).
        //
        // ── SPRITES ──
        // Pokémon: `window.loadSprite(lookType, px, shiny)` do jogo (mesmo
        // caminho da doca da Equipe, 36) — pintado SÓ quando a linha entra na
        // tela (IntersectionObserver), senão 599 canvases nascem de uma vez.
        // Item (held/TM): o jogo resolve por imagem, `/sprites/item_<cid>.png`
        // (ver 35). Held usa `cid`, TM usa `spriteCid`.
        // =====================================================================

        (function () {
            if (typeof document === 'undefined') return;

            const PP_COR_TIPO = {
                normal: '#9fa19f', fire: '#e62829', water: '#2980ef', grass: '#3fa129',
                electric: '#e0b000', ice: '#3dcef3', fighting: '#ff8000', poison: '#9141cb',
                ground: '#b0722a', flying: '#81b9ef', psychic: '#ef4179', bug: '#91a119',
                rock: '#afa981', ghost: '#704170', dragon: '#5060e1', dark: '#5a4a47',
                steel: '#60a1b8', fairy: '#ef70ef'
            };
            const PP_TIER_COR = { S: '#ff5d8f', A: '#ffb020', B: '#54c1ff', C: '#8fd36b' };

            function ppWin() {
                try { return (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window; }
                catch (e) { return window; }
            }

            function ppEsc(t) {
                return String(t == null ? '' : t).replace(/[&<>"']/g, c => (
                    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
                ));
            }

            function ppChipTipo(t) {
                if (!t) return '';
                const c = PP_COR_TIPO[String(t).toLowerCase()] || '#6b7280';
                return `<span class="pp-tp" style="background:${c}">${ppEsc(String(t).toUpperCase())}</span>`;
            }

            function ppChipTier(t) {
                if (!t) return '';
                const c = PP_TIER_COR[String(t).toUpperCase()] || '#6b7280';
                return `<span class="pp-tier" style="color:${c};border-color:${c}">${ppEsc(String(t).toUpperCase())}</span>`;
            }

            // ── CSS (uma vez) ─────────────────────────────────────────────────
            function ppCss() {
                if (document.getElementById('pp-css')) return;
                const st = document.createElement('style');
                st.id = 'pp-css';
                st.textContent = `
                    .pp-ov {
                        position: fixed; inset: 0; z-index: 2147483100; display: none;
                        background: rgba(6,5,16,.72); backdrop-filter: blur(4px);
                        align-items: center; justify-content: center;
                        font-family: 'Segoe UI', system-ui, sans-serif;
                    }
                    .pp-ov.on { display: flex; }
                    .pp-win {
                        width: min(1120px, 95vw); height: min(880px, 90vh);
                        display: flex; flex-direction: column; overflow: hidden;
                        background: linear-gradient(165deg, #171233, #0d0a1e);
                        border: 1px solid rgba(148,120,246,.34); border-radius: 18px;
                        box-shadow: 0 30px 80px rgba(0,0,0,.6); color: #e6e2f4;
                    }
                    .pp-head {
                        display: flex; align-items: center; gap: 10px; padding: 12px 16px;
                        border-bottom: 1px solid rgba(148,120,246,.2);
                        background: rgba(124,58,237,.12); flex: none;
                    }
                    .pp-h-tit { font-size: 15px; font-weight: 900; color: #d6ccff; letter-spacing: .3px; }
                    .pp-nav { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
                    .pp-nav-b {
                        background: rgba(148,163,184,.1); border: 1px solid rgba(148,163,184,.18);
                        color: #b6add6; border-radius: 9px; padding: 6px 12px; cursor: pointer;
                        font-size: 12px; font-weight: 700; font-family: inherit; transition: all .15s;
                    }
                    .pp-nav-b:hover { background: rgba(148,163,184,.2); }
                    .pp-nav-b.on { background: rgba(124,58,237,.34); border-color: rgba(167,139,250,.7); color: #fff; }
                    .pp-x {
                        background: rgba(239,68,68,.16); border: 1px solid rgba(239,68,68,.4);
                        color: #fca5a5; border-radius: 9px; width: 32px; height: 30px; cursor: pointer;
                        font-size: 14px; font-weight: 900; flex: none;
                    }
                    .pp-tool {
                        display: flex; align-items: center; gap: 8px; padding: 10px 16px;
                        border-bottom: 1px solid rgba(148,120,246,.14); flex-wrap: wrap; flex: none;
                    }
                    .pp-search {
                        flex: 1; min-width: 180px; background: #0c0a1c; color: #fff;
                        border: 1px solid rgba(148,120,246,.3); border-radius: 10px;
                        padding: 9px 12px; font-size: 13px; font-family: inherit; outline: none;
                    }
                    .pp-search:focus { border-color: rgba(167,139,250,.8); }
                    .pp-chips { display: flex; gap: 5px; flex-wrap: wrap; }
                    .pp-chip {
                        background: rgba(148,163,184,.1); border: 1px solid rgba(148,163,184,.22);
                        color: #b6add6; border-radius: 999px; padding: 5px 11px; cursor: pointer;
                        font-size: 11px; font-weight: 700; font-family: inherit; transition: all .12s;
                    }
                    .pp-chip:hover { background: rgba(148,163,184,.2); }
                    .pp-chip.on { background: rgba(124,58,237,.4); border-color: rgba(167,139,250,.8); color: #fff; }
                    .pp-body { display: flex; flex: 1; min-height: 0; }
                    .pp-list { flex: 1; min-width: 0; overflow-y: auto; padding: 12px; }
                    .pp-detail {
                        width: 340px; flex: none; overflow-y: auto; padding: 16px;
                        border-left: 1px solid rgba(148,120,246,.18); background: rgba(12,10,28,.5);
                        display: none;
                    }
                    .pp-detail.on { display: block; }
                    .pp-count { font-size: 11px; color: #8b81b0; padding: 0 4px 8px; }
                    .pp-grid {
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 8px;
                    }
                    .pp-card {
                        background: rgba(30,24,58,.6); border: 1px solid rgba(148,120,246,.16);
                        border-radius: 12px; padding: 10px; cursor: pointer; transition: all .12s;
                        display: flex; flex-direction: column; align-items: center; gap: 4px;
                    }
                    .pp-card:hover { border-color: rgba(167,139,250,.6); background: rgba(45,35,84,.7); transform: translateY(-1px); }
                    .pp-card.sel { border-color: #a78bfa; box-shadow: 0 0 0 1px #a78bfa inset; }
                    .pp-spr { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; image-rendering: pixelated; }
                    .pp-spr img, .pp-spr canvas { max-width: 56px; max-height: 56px; image-rendering: pixelated; }
                    .pp-nm { font-size: 12px; font-weight: 800; color: #ece8fb; text-align: center; line-height: 1.15; }
                    .pp-dex-n { font-size: 9.5px; color: #7d73a6; font-weight: 700; }
                    .pp-tps { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; }
                    .pp-tp { font-size: 8.5px; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 6px; letter-spacing: .3px; }
                    .pp-tier { font-size: 9px; font-weight: 900; border: 1px solid; border-radius: 5px; padding: 1px 5px; }
                    .pp-row {
                        display: flex; align-items: center; gap: 10px; padding: 9px 11px;
                        background: rgba(30,24,58,.5); border: 1px solid rgba(148,120,246,.14);
                        border-radius: 10px; margin-bottom: 6px; cursor: pointer; transition: all .12s;
                    }
                    .pp-row:hover { border-color: rgba(167,139,250,.5); background: rgba(45,35,84,.6); }
                    .pp-row-ic { width: 34px; height: 34px; flex: none; display: flex; align-items: center; justify-content: center; }
                    .pp-row-ic img { max-width: 34px; max-height: 34px; image-rendering: pixelated; }
                    .pp-row-main { flex: 1; min-width: 0; }
                    .pp-row-nm { font-size: 13px; font-weight: 800; color: #ece8fb; }
                    .pp-row-sub { font-size: 11px; color: #9990c0; margin-top: 2px; line-height: 1.4; }
                    .pp-badge { font-size: 9px; font-weight: 800; background: rgba(124,58,237,.3); color: #d6ccff; padding: 2px 7px; border-radius: 6px; }
                    .pp-d-spr { display: flex; justify-content: center; margin-bottom: 8px; }
                    .pp-d-spr img, .pp-d-spr canvas { width: 96px; height: 96px; image-rendering: pixelated; }
                    .pp-d-nm { font-size: 18px; font-weight: 900; color: #fff; text-align: center; }
                    .pp-d-sec { margin-top: 14px; }
                    .pp-d-lbl { font-size: 10px; font-weight: 800; color: #8b81b0; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 6px; }
                    .pp-d-txt { font-size: 12.5px; color: #cfc8ea; line-height: 1.5; }
                    .pp-d-zona { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(148,120,246,.1); color: #cfc8ea; }
                    .pp-d-zona b { color: #a78bfa; font-weight: 800; }
                    .pp-empty { text-align: center; color: #7d73a6; font-size: 13px; padding: 40px 20px; }
                    .pp-mais {
                        display: block; margin: 12px auto 4px; background: rgba(124,58,237,.28);
                        border: 1px solid rgba(167,139,250,.5); color: #d6ccff; border-radius: 10px;
                        padding: 8px 20px; cursor: pointer; font-size: 12px; font-weight: 700; font-family: inherit;
                    }
                    .pp-mais:hover { background: rgba(124,58,237,.42); }
                    .pp-tbl-wrap { overflow-x: auto; }
                    .pp-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .pp-tbl th, .pp-tbl td { padding: 6px 8px; text-align: center; white-space: nowrap; }
                    .pp-tbl thead th { position: sticky; top: 0; background: #1a1436; color: #b6add6; font-size: 11px; cursor: pointer; user-select: none; border-bottom: 1px solid rgba(148,120,246,.25); }
                    .pp-tbl thead th.on { color: #fff; }
                    .pp-tbl th.pp-l, .pp-tbl td.pp-l { text-align: left; }
                    .pp-tbl tbody tr { border-bottom: 1px solid rgba(148,120,246,.08); }
                    .pp-tbl tbody tr:hover { background: rgba(124,58,237,.14); }
                    .pp-tbl .pp-rk { color: #7d73a6; font-size: 11px; }
                    .pp-tbl .pp-tnm { font-weight: 800; color: #ece8fb; }
                    .pp-tbl .pp-bst { font-weight: 900; color: #ffd964; }
                    .pp-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                    .pp-bar-lbl { width: 52px; font-size: 10.5px; color: #9990c0; flex: none; }
                    .pp-bar-num { width: 62px; font-size: 11.5px; color: #ece8fb; font-weight: 700; flex: none; text-align: right; }
                    .pp-bar-trk { flex: 1; height: 7px; background: rgba(148,120,246,.14); border-radius: 4px; overflow: hidden; }
                    .pp-bar-fill { display: block; height: 100%; border-radius: 4px; }
                    .pp-kv { margin-top: 4px; }
                    .pp-kv-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(148,120,246,.1); color: #cfc8ea; }
                    .pp-kv-row b { color: #a78bfa; font-weight: 800; text-align: right; }
                `;
                document.head.appendChild(st);
            }

            // ── ESTADO ────────────────────────────────────────────────────────
            const PP_SECOES = [
                { id: 'dex', rot: 'Pokédex' }, { id: 'mega', rot: 'Mega' },
                { id: 'stats', rot: 'Stats' }, { id: 'item', rot: 'Itens' },
                { id: 'tipo', rot: 'Tipos' }, { id: 'sistema', rot: 'Sistema' }
            ];
            const PP_ITEM_CATS = [
                { id: 'held', rot: 'Helds' }, { id: 'tm', rot: 'TMs' },
                { id: 'stone', rot: 'Stones' }, { id: 'ball', rot: 'Balls' },
                { id: 'potion', rot: 'Poções' }, { id: 'bait', rot: 'Iscas' },
                { id: 'boss', rot: 'Boss' }
            ];
            const PP_STAT_COLS = [
                ['hp', 'HP'], ['atk', 'Atq'], ['def', 'Def'],
                ['spa', 'Atq.Esp'], ['spd', 'Def.Esp'], ['spe', 'Vel'], ['bst', 'BST']
            ];
            let ppSecao = 'dex', ppTermo = '', ppFiltroTipo = '', ppFiltroTier = '';
            let ppLimite = 120, ppSel = null;
            let ppItemCat = 'held';
            let ppStatSort = 'bst', ppStatDir = -1, ppStatExtra = false;
            let ppObs = null;

            let ovEl = null, listEl = null, detEl = null, toolEl = null, searchEl = null, navEl = null;

            // Pinta sprites de pokémon só quando entram na tela.
            function ppObserver() {
                if (ppObs) ppObs.disconnect();
                ppObs = new IntersectionObserver(ents => {
                    for (const e of ents) {
                        if (!e.isIntersecting) continue;
                        const el = e.target;
                        ppObs.unobserve(el);
                        const look = Number(el.dataset.look);
                        if (!look && look !== 0) continue;
                        try {
                            const w = ppWin();
                            if (typeof w.loadSprite === 'function') {
                                const spr = w.loadSprite(look, 56, el.dataset.shiny === '1');
                                if (spr) { el.textContent = ''; el.appendChild(spr); }
                            }
                        } catch (err) { }
                    }
                }, { root: listEl, rootMargin: '120px' });
            }

            function ppItemImg(cid, px) {
                const c = Number(cid) || 0;
                if (!c) return '<span style="font-size:20px">🎒</span>';
                return `<img src="/sprites/item_${c}.png?v=walk1" width="${px}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('🎒'))" />`;
            }

            // ── RENDER: cabeçalho da toolbar (chips dependem da seção) ─────────
            const PP_TIPOS_CHIP = ['', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
                'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',
                'dragon', 'dark', 'steel', 'fairy', 'normal'];

            function ppRenderTool() {
                let extra = '';
                if (ppSecao === 'dex') {
                    extra = '<div class="pp-chips">' + PP_TIPOS_CHIP.map(t =>
                        `<span class="pp-chip${ppFiltroTipo === t ? ' on' : ''}" data-tipo="${t}"${t ? ` style="border-color:${PP_COR_TIPO[t]}"` : ''}>${t ? ppEsc(t.toUpperCase()) : 'Todos'}</span>`
                    ).join('') + '</div><div class="pp-chips">' + ['', 'S', 'A', 'B', 'C'].map(t =>
                        `<span class="pp-chip${ppFiltroTier === t ? ' on' : ''}" data-tier="${t}">${t ? ('Tier ' + t) : 'Tier•'}</span>`
                    ).join('') + '</div>';
                } else if (ppSecao === 'item') {
                    extra = '<div class="pp-chips">' + PP_ITEM_CATS.map(c =>
                        `<span class="pp-chip${ppItemCat === c.id ? ' on' : ''}" data-cat="${c.id}">${ppEsc(c.rot)}</span>`
                    ).join('') + '</div>';
                } else if (ppSecao === 'stats') {
                    extra = `<div class="pp-chips"><span class="pp-chip${ppStatExtra ? ' on' : ''}" id="pp-stat-extra">Incluir Megas & Lendários</span></div>`;
                }
                const semBusca = ppSecao === 'sistema';
                const ph = ppSecao === 'tipo' ? 'Filtrar tipo…'
                    : ppSecao === 'item' ? 'Buscar item…'
                        : ppSecao === 'stats' ? 'Buscar pokémon…'
                            : ppSecao === 'mega' ? 'Buscar mega…' : 'Buscar pokémon ou nº…';
                toolEl.innerHTML = (semBusca ? '' : `<input class="pp-search" placeholder="${ph}" value="${ppEsc(ppTermo)}" />`) + extra;
                searchEl = toolEl.querySelector('.pp-search');
                if (searchEl) searchEl.oninput = () => { ppTermo = searchEl.value; ppLimite = 120; ppRenderList(); };
                toolEl.querySelectorAll('.pp-chip[data-tipo]').forEach(c => c.onclick = () => {
                    ppFiltroTipo = c.dataset.tipo; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                toolEl.querySelectorAll('.pp-chip[data-tier]').forEach(c => c.onclick = () => {
                    ppFiltroTier = c.dataset.tier; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                toolEl.querySelectorAll('.pp-chip[data-cat]').forEach(c => c.onclick = () => {
                    ppItemCat = c.dataset.cat; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                const be = toolEl.querySelector('#pp-stat-extra');
                if (be) be.onclick = () => { ppStatExtra = !ppStatExtra; ppRenderTool(); ppRenderList(); };
            }

            // ── RENDER: lista central ─────────────────────────────────────────
            function ppRenderList() {
                ppObserver();
                if (ppSecao === 'dex') return ppRenderDex();
                if (ppSecao === 'mega') return ppRenderMega();
                if (ppSecao === 'stats') return ppRenderStats();
                if (ppSecao === 'item') return ppRenderItens();
                if (ppSecao === 'tipo') return ppRenderTipo();
                if (ppSecao === 'sistema') return ppRenderSistema();
            }

            function ppMaisBtn(total) {
                if (total <= ppLimite) return '';
                return `<button class="pp-mais" id="pp-mais">Mostrar mais (${total - ppLimite} restantes)</button>`;
            }
            function ppLigarMais() {
                const b = listEl.querySelector('#pp-mais');
                if (b) b.onclick = () => { ppLimite += 200; ppRenderList(); };
            }

            function ppRenderDex() {
                const todos = ppFiltrarDex(ppTermo, ppFiltroTipo, ppFiltroTier);
                const vis = todos.slice(0, ppLimite);
                let h = `<div class="pp-count">${todos.length} pokémon</div><div class="pp-grid">`;
                for (const p of vis) {
                    h += `<div class="pp-card${ppSel === 'dex:' + p.dex ? ' sel' : ''}" data-dex="${p.dex}">
                        <div class="pp-spr" data-look="${p.lookType == null ? '' : p.lookType}"></div>
                        <div class="pp-dex-n">#${String(p.dex).padStart(3, '0')} ${ppChipTier(p.tier).replace(/class="pp-tier"/, 'class="pp-tier" ') || ''}</div>
                        <div class="pp-nm">${ppEsc(ppLimpo(p.name))}</div>
                        <div class="pp-tps">${ppChipTipo(p.type1)}${ppChipTipo(p.type2)}</div>
                    </div>`;
                }
                h += '</div>' + ppMaisBtn(todos.length);
                if (!todos.length) h = '<div class="pp-empty">Nada encontrado.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-spr[data-look]').forEach(el => { if (el.dataset.look !== '') ppObs.observe(el); });
                listEl.querySelectorAll('.pp-card[data-dex]').forEach(c => c.onclick = () => ppAbrirDex(Number(c.dataset.dex)));
                ppLigarMais();
            }

            // ── ITENS (sub-categorias do /api/meta) ───────────────────────────
            function ppItensDaCat() {
                const c = ppItemCat;
                if (c === 'held') return ppHelds().map(it => ({ icon: ppItemImg(it.cid, 34), nm: it.label || ppLimpo(it.name), badge: it.funcao, sub: ppLimpo(it.desc), nome: it.label || it.name }));
                if (c === 'tm') return ppTms().map(t => { const s = t.officialSource || {}; const f = s.detail ? ppLimpo(s.detail) : (s.method || ''); return { icon: ppItemImg(t.spriteCid, 34), nm: ppLimpo(t.move), extra: ppChipTipo(t.type) + ' ' + ppChipTier(t.tier), sub: (t.kind ? String(t.kind).toUpperCase() : '') + (f ? ' · ' + f : ''), nome: ppLimpo(t.move) }; });
                if (c === 'stone') return ppStones().map(s => ({ icon: ppItemImg(s.itemId, 34), nm: ppLimpo(s.name), sub: s.gold ? ('💰 ' + Number(s.gold).toLocaleString('pt-BR')) : '', nome: s.name }));
                if (c === 'ball') return ppBalls().map(b => ({ icon: ppItemImg(b.itemId, 34), nm: b.label || b.key, sub: ppLimpo(b.desc) || [b.gold ? ('💰 ' + Number(b.gold).toLocaleString('pt-BR')) : '', b.diamonds ? ('💎 ' + b.diamonds) : ''].filter(Boolean).join(' · '), nome: b.label || b.key }));
                if (c === 'potion') return ppPotions().map(p => ({ icon: ppItemImg(p.itemId, 34), nm: p.label || p.key, sub: [p.gold ? ('💰 ' + Number(p.gold).toLocaleString('pt-BR')) : '', p.heal ? ('cura ' + p.heal) : ''].filter(Boolean).join(' · '), nome: p.label || p.key }));
                if (c === 'bait') return ppBaits().map(b => ({ icon: '<span style="font-size:20px">' + (b.emoji || '🪝') + '</span>', nm: b.label || b.key, sub: ['Lv ' + (b.reqLevel | 0) + '+', b.gold ? ('💰 ' + Number(b.gold).toLocaleString('pt-BR')) : '', b.exp ? ('exp ' + b.exp) : ''].filter(Boolean).join(' · '), nome: b.label || b.key }));
                if (c === 'boss') return ppBossItems().map(b => ({ icon: ppItemImg(b.cid, 34), nm: ppLimpo(b.name), sub: '', nome: b.name }));
                return [];
            }
            function ppRenderItens() {
                const q = ppNorm(ppTermo);
                const todos = ppItensDaCat().filter(it => !q || ppNorm(it.nome).indexOf(q) >= 0 || ppNorm(it.sub).indexOf(q) >= 0);
                const vis = todos.slice(0, ppLimite);
                let h = `<div class="pp-count">${todos.length} itens</div>`;
                for (const it of vis) {
                    h += `<div class="pp-row">
                        <div class="pp-row-ic">${it.icon}</div>
                        <div class="pp-row-main">
                            <div class="pp-row-nm">${ppEsc(it.nm)} ${it.extra || ''}${it.badge ? '<span class="pp-badge">' + ppEsc(it.badge) + '</span>' : ''}</div>
                            <div class="pp-row-sub">${ppEsc(it.sub) || ''}</div>
                        </div>
                    </div>`;
                }
                h += ppMaisBtn(todos.length);
                if (!todos.length) h = '<div class="pp-empty">Nada nessa categoria.</div>';
                listEl.innerHTML = h;
                ppLigarMais();
            }

            // ── STATS (base stats, do módulo 42) ──────────────────────────────
            let _ppDexTipoMap = null;
            function ppDexTipoMap() {
                if (_ppDexTipoMap) return _ppDexTipoMap;
                const m = {};
                for (const p of ppDex()) m[ppNorm(p.name).replace(/[^a-z0-9]/g, '')] = { t1: p.type1, t2: p.type2, dex: p.dex };
                _ppDexTipoMap = m;
                return m;
            }
            function ppRenderStats() {
                const q = ppNorm(ppTermo);
                const tmap = ppDexTipoMap();
                const LBL = (typeof PP_STATS_LABEL !== 'undefined') ? PP_STATS_LABEL : {};
                let linhas = (typeof ppTodasStats === 'function') ? ppTodasStats() : [];
                linhas = linhas.filter(r => {
                    if (!ppStatExtra && (r.mega || !tmap[r.key])) return false;
                    if (q && (LBL[r.key] || r.key).toLowerCase().indexOf(q) < 0) return false;
                    return true;
                });
                linhas.sort((a, b) => (a[ppStatSort] - b[ppStatSort]) * ppStatDir);
                const vis = linhas.slice(0, ppLimite);
                let h = `<div class="pp-count">${linhas.length} — clique numa coluna pra ordenar</div>`;
                h += '<div class="pp-tbl-wrap"><table class="pp-tbl"><thead><tr><th>#</th><th class="pp-l">Pokémon</th><th>Tipos</th>';
                for (const [k, lbl] of PP_STAT_COLS) h += `<th data-sort="${k}" class="${ppStatSort === k ? 'on' : ''}">${lbl}${ppStatSort === k ? (ppStatDir < 0 ? ' ▾' : ' ▴') : ''}</th>`;
                h += '</tr></thead><tbody>';
                vis.forEach((r, i) => {
                    const nm = LBL[r.key] || r.key; const tp = tmap[r.key] || {};
                    h += `<tr><td class="pp-rk">${i + 1}</td><td class="pp-l pp-tnm">${ppEsc(nm)}${r.mega ? ' <span class="pp-badge">M</span>' : ''}</td><td>${ppChipTipo(tp.t1)}${ppChipTipo(tp.t2)}</td>`;
                    for (const [k] of PP_STAT_COLS) h += `<td class="${k === 'bst' ? 'pp-bst' : ''}">${r[k]}</td>`;
                    h += '</tr>';
                });
                h += '</tbody></table></div>' + ppMaisBtn(linhas.length);
                listEl.innerHTML = h;
                listEl.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => {
                    const k = th.dataset.sort;
                    if (ppStatSort === k) ppStatDir = -ppStatDir; else { ppStatSort = k; ppStatDir = -1; }
                    ppLimite = 120; ppRenderList();
                });
                ppLigarMais();
            }

            // ── MEGA ──────────────────────────────────────────────────────────
            function ppRenderMega() {
                const q = ppNorm(ppTermo);
                const todos = (typeof ppMegas === 'function' ? ppMegas() : []).filter(m => !q || ppNorm(m.name).indexOf(q) >= 0);
                let h = `<div class="pp-count">${todos.length} Mega Evoluções</div><div class="pp-grid">`;
                for (const m of todos) {
                    h += `<div class="pp-card${ppSel === 'mega:' + m.mkey ? ' sel' : ''}" data-mkey="${m.mkey}">
                        <div class="pp-spr" data-look="${m.lookType == null ? '' : m.lookType}"></div>
                        <div class="pp-nm">Mega ${ppEsc(ppLimpo(m.name))}</div>
                        <div class="pp-tps">${ppChipTipo(m.type1)}${ppChipTipo(m.type2)}</div>
                        ${m.mega ? `<div class="pp-dex-n">BST ${m.base ? m.base.bst : '?'} → <b style="color:#7bed9f">${m.mega.bst}</b></div>` : ''}
                    </div>`;
                }
                h += '</div>';
                if (!todos.length) h = '<div class="pp-empty">Sem megas.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-spr[data-look]').forEach(el => { if (el.dataset.look !== '') ppObs.observe(el); });
                listEl.querySelectorAll('.pp-card[data-mkey]').forEach(c => c.onclick = () => ppAbrirMega(c.dataset.mkey));
            }

            // ── SISTEMA ───────────────────────────────────────────────────────
            function ppRenderSistema() {
                const lista = (typeof PP_SISTEMA !== 'undefined') ? PP_SISTEMA : [];
                let h = '<div class="pp-count">Mecânicas do jogo — clique pra abrir</div><div class="pp-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">';
                for (const s of lista) {
                    h += `<div class="pp-card" style="align-items:flex-start;text-align:left" data-sis="${s.id}">
                        <div style="font-size:22px">${s.icone || '📘'}</div>
                        <div class="pp-nm" style="text-align:left">${ppEsc(s.rot)}</div>
                        <div class="pp-row-sub">${ppEsc(s.resumo || '')}</div>
                    </div>`;
                }
                h += '</div>';
                if (!lista.length) h = '<div class="pp-empty">Conteúdo de sistema indisponível.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-card[data-sis]').forEach(c => c.onclick = () => ppAbrirSistema(c.dataset.sis));
            }

            function ppRenderTipo() {
                const q = ppNorm(ppTermo);
                const tc = ppTypeChart();
                const tipos = PP_TIPOS.filter(t => !q || t.indexOf(q) >= 0);
                let h = '<div class="pp-count">tabela de tipos — o que cada tipo bate forte</div><div class="pp-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">';
                for (const t of tipos) {
                    const bate = (tc[t] || []).map(x => ppChipTipo(x)).join('') || '<span style="color:#7d73a6;font-size:11px">— nada super-efetivo —</span>';
                    h += `<div class="pp-card" style="align-items:stretch;cursor:default">
                        <div style="text-align:center;margin-bottom:6px">${ppChipTipo(t)}</div>
                        <div class="pp-d-lbl">Forte contra</div>
                        <div class="pp-tps" style="justify-content:flex-start">${bate}</div>
                    </div>`;
                }
                h += '</div>';
                listEl.innerHTML = h;
            }

            // ── DETALHE ───────────────────────────────────────────────────────
            const PP_STAT_BARRA = [
                ['hp', 'HP', '#7bed9f'], ['atk', 'Atq', '#ff8f6b'], ['def', 'Def', '#ffd964'],
                ['spa', 'Atq.Esp', '#7fb8ff'], ['spd', 'Def.Esp', '#a78bfa'], ['spe', 'Vel', '#f38fd0']
            ];
            function ppStatBarsHtml(st, cmp) {
                if (!st) return '';
                let h = '<div class="pp-d-sec"><div class="pp-d-lbl">📊 Base stats</div>';
                for (const [k, lbl, cor] of PP_STAT_BARRA) {
                    const v = st[k] | 0, w = Math.max(3, Math.min(100, v / 200 * 100));
                    const cv = cmp ? (cmp[k] | 0) : null;
                    const delta = cv != null && cv !== v ? ` <span style="color:${cv > v ? '#7bed9f' : '#fca5a5'};font-size:10px">${cv > v ? '+' : ''}${cv - v}</span>` : '';
                    h += `<div class="pp-bar-row"><span class="pp-bar-lbl">${lbl}</span><span class="pp-bar-num">${v}${delta}</span><span class="pp-bar-trk"><span class="pp-bar-fill" style="width:${w}%;background:${cor}"></span></span></div>`;
                }
                h += `<div class="pp-bar-row" style="margin-top:5px"><span class="pp-bar-lbl">BST</span><span class="pp-bar-num" style="color:#ffd964;font-weight:900">${st.bst | 0}${cmp ? ` <span style="color:${cmp.bst > st.bst ? '#7bed9f' : '#fca5a5'};font-size:10px">${cmp.bst > st.bst ? '+' : ''}${cmp.bst - st.bst}</span>` : ''}</span><span></span></div></div>`;
                return h;
            }

            function ppAbrirDex(dex) {
                const p = ppDex().find(x => x.dex === dex);
                if (!p) return;
                ppSel = 'dex:' + dex;
                listEl.querySelectorAll('.pp-card').forEach(c => c.classList.toggle('sel', Number(c.dataset.dex) === dex));
                const fraco = ppFracoContra(p.type1, p.type2);
                const forte = ppForteAtacando(p.type1, p.type2);
                const zonas = ppOndeAcha(p.name).slice(0, 12);
                const helds = ppHeldsPorTipo(p.type1, p.type2).slice(0, 4);
                const st = (typeof ppStatsDe === 'function') ? ppStatsDe(p.name) : null;
                let h = `<div class="pp-d-spr" data-look="${p.lookType == null ? '' : p.lookType}"></div>
                    <div class="pp-d-nm">${ppEsc(ppLimpo(p.name))}</div>
                    <div style="text-align:center;margin-top:4px">#${String(p.dex).padStart(3, '0')} ${ppChipTipo(p.type1)}${ppChipTipo(p.type2)} ${ppChipTier(p.tier)}</div>
                    <div style="text-align:center;font-size:11px;color:#8b81b0;margin-top:6px">${(p.points | 0)} pts de dex</div>`;
                h += ppStatBarsHtml(st);
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">⚠️ Fraco contra</div><div class="pp-tps" style="justify-content:flex-start">${fraco.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">💥 Forte atacando (STAB)</div><div class="pp-tps" style="justify-content:flex-start">${forte.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                if (helds.length) {
                    h += `<div class="pp-d-sec"><div class="pp-d-lbl">🧤 Held sugerido</div>`
                        + helds.map(x => `<div class="pp-d-txt" style="margin-bottom:5px"><b style="color:#dcefb4">${ppEsc(x.label)}</b> — ${ppEsc(x.desc)}</div>`).join('') + '</div>';
                }
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">📍 Onde caçar (${ppOndeAcha(p.name).length})</div>`;
                if (zonas.length) {
                    h += zonas.map(z => `<div class="pp-d-zona"><span>${ppEsc(ppLimpo(z.zona))} <span style="color:#7d73a6">Lv${z.reqLevel}+</span></span><b>${z.weight}%</b></div>`).join('');
                } else h += '<div class="pp-d-txt">Não aparece em spawn de zona.</div>';
                h += '</div>';
                detEl.innerHTML = h;
                detEl.classList.add('on');
                // sprite grande
                try {
                    const w = ppWin();
                    const sl = detEl.querySelector('.pp-d-spr[data-look]');
                    if (sl && sl.dataset.look !== '' && typeof w.loadSprite === 'function') {
                        const spr = w.loadSprite(Number(sl.dataset.look), 96, false);
                        if (spr) sl.appendChild(spr);
                    }
                } catch (e) { }
            }

            function ppAbrirMega(mkey) {
                const m = (typeof ppMegas === 'function' ? ppMegas() : []).find(x => x.mkey === mkey);
                if (!m) return;
                ppSel = 'mega:' + mkey;
                listEl.querySelectorAll('.pp-card').forEach(c => c.classList.toggle('sel', c.dataset.mkey === mkey));
                const fraco = ppFracoContra(m.type1, m.type2);
                const forte = ppForteAtacando(m.type1, m.type2);
                let h = `<div class="pp-d-spr" data-look="${m.lookType == null ? '' : m.lookType}"></div>
                    <div class="pp-d-nm">Mega ${ppEsc(ppLimpo(m.name))}</div>
                    <div style="text-align:center;margin-top:4px">#${String(m.dex).padStart(3, '0')} ${ppChipTipo(m.type1)}${ppChipTipo(m.type2)} ${ppChipTier(m.tier)}</div>`;
                if (m.mega) h += ppStatBarsHtml(m.mega, m.base);
                if (m.base && m.mega) h += `<div class="pp-d-txt" style="text-align:center;margin-top:4px">BST base ${m.base.bst} → <b style="color:#7bed9f">${m.mega.bst}</b> (${m.mega.bst - m.base.bst > 0 ? '+' : ''}${m.mega.bst - m.base.bst})</div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">⚠️ Fraco contra</div><div class="pp-tps" style="justify-content:flex-start">${fraco.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">💥 Forte atacando (STAB)</div><div class="pp-tps" style="justify-content:flex-start">${forte.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                detEl.innerHTML = h;
                detEl.classList.add('on');
                try {
                    const w = ppWin();
                    const sl = detEl.querySelector('.pp-d-spr[data-look]');
                    if (sl && sl.dataset.look !== '' && typeof w.loadSprite === 'function') {
                        const spr = w.loadSprite(Number(sl.dataset.look), 96, false);
                        if (spr) sl.appendChild(spr);
                    }
                } catch (e) { }
            }

            function ppAbrirSistema(id) {
                const lista = (typeof PP_SISTEMA !== 'undefined') ? PP_SISTEMA : [];
                const s = lista.find(x => x.id === id);
                if (!s) return;
                ppSel = 'sis:' + id;
                let h = `<div class="pp-d-nm" style="font-size:17px">${s.icone || '📘'} ${ppEsc(s.rot)}</div>
                    <div class="pp-d-txt" style="text-align:center;margin-top:4px;color:#8b81b0">${ppEsc(s.resumo || '')}</div>`;
                for (const b of (s.blocos || [])) {
                    h += `<div class="pp-d-sec"><div class="pp-d-lbl">${ppEsc(b.h || '')}</div>`;
                    for (const ln of (b.linhas || [])) h += `<div class="pp-d-txt" style="margin-bottom:4px">• ${ppEsc(ln)}</div>`;
                    if (b.tabela) {
                        h += '<div class="pp-kv">';
                        for (const [a, c] of b.tabela) h += `<div class="pp-kv-row"><span>${ppEsc(a)}</span><b>${ppEsc(c)}</b></div>`;
                        h += '</div>';
                    }
                    h += '</div>';
                }
                detEl.innerHTML = h;
                detEl.classList.add('on');
            }

            // ── SHELL: nav + abrir/fechar ─────────────────────────────────────
            function ppRenderNav() {
                navEl.innerHTML = PP_SECOES.map(s =>
                    `<button class="pp-nav-b${ppSecao === s.id ? ' on' : ''}" data-sec="${s.id}">${s.rot}</button>`
                ).join('');
                navEl.querySelectorAll('.pp-nav-b').forEach(b => b.onclick = () => {
                    ppSecao = b.dataset.sec; ppTermo = ''; ppFiltroTipo = ''; ppFiltroTier = '';
                    ppLimite = 120; ppSel = null; detEl.classList.remove('on');
                    ppRenderNav(); ppRenderTool(); ppRenderList();
                });
            }

            function ppMontar() {
                if (ovEl) return;
                ppCss();
                ovEl = document.createElement('div');
                ovEl.className = 'pp-ov';
                ovEl.innerHTML = `
                    <div class="pp-win">
                        <div class="pp-head">
                            <span class="pp-h-tit">📚 Poképédia</span>
                            <div class="pp-nav" id="pp-nav"></div>
                            <button class="pp-x" id="pp-x">✕</button>
                        </div>
                        <div class="pp-tool" id="pp-tool"></div>
                        <div class="pp-body">
                            <div class="pp-list" id="pp-list"></div>
                            <div class="pp-detail" id="pp-detail"></div>
                        </div>
                    </div>`;
                document.body.appendChild(ovEl);
                navEl = ovEl.querySelector('#pp-nav');
                toolEl = ovEl.querySelector('#pp-tool');
                listEl = ovEl.querySelector('#pp-list');
                detEl = ovEl.querySelector('#pp-detail');
                ovEl.querySelector('#pp-x').onclick = ppFechar;
                ovEl.onclick = e => { if (e.target === ovEl) ppFechar(); };
            }

            function ppAbrir() {
                ppMontar();
                ovEl.classList.add('on');
                ppRenderNav(); ppRenderTool(); ppRenderList();
                setTimeout(() => { if (searchEl) searchEl.focus(); }, 30);
            }
            function ppFechar() { if (ovEl) ovEl.classList.remove('on'); }

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && ovEl && ovEl.classList.contains('on')) ppFechar();
            });

            // NÃO há botão flutuante próprio: o gatilho é o botão-âncora da barra
            // de fixados (ver instalarSistemaPinTopbar em 20-cidade-utils.js), que
            // chama `abrirPokepedia()`. Mantido só o CSS pronto pra quando abrir.
            if (document.body) ppCss();
            else document.addEventListener('DOMContentLoaded', ppCss);

            // Atalho global — é o que a barra de fixados (e o console) chamam.
            try { ppWin().abrirPokepedia = ppAbrir; } catch (e) { }
        })();

        // =====================================================================
        // 42-pokepedia-stats.js — POKÉPÉDIA: base stats (dado do server oficial)
        // =====================================================================
        // Base stats da FICHA da espécie (HP/Atq/Def/Atq.Esp/Def.Esp/Vel + BST),
        // antes de nível, IV, raridade ou item — exatamente como a página
        // /pokepedia/stats do idlepokemoon.com.br mostra. Extraído de lá em
        // 2026-09-08. Chave = nome normalizado (minúsculo, só letras/números),
        // pra casar com o `name` da dex do /api/meta. Sem DOM.
        //
        // Inclui as 34 Mega (chave "mega<base>") e os lendários. ppStatsDe casa
        // por nome normalizado, com apelidos p/ nomes quebrados (Nidoran etc.).
        // =====================================================================

        const PP_BASE_STATS = {
            "slaking":[150,160,100,95,65,100,670],"dragonite":[91,134,95,100,100,80,600],"tyranitar":[100,134,110,95,100,61,600],"salamence":[95,135,80,110,80,100,600],
            "metagross":[80,135,130,95,90,70,600],"garchomp":[108,130,95,80,85,102,600],"hydreigon":[92,105,90,125,90,98,600],"archeops":[75,140,65,112,65,110,567],
            "arcanine":[90,110,80,100,80,95,555],"volcarona":[85,60,65,135,105,100,550],"togekiss":[85,50,95,120,115,80,545],"gyarados":[95,125,79,60,100,81,540],
            "snorlax":[160,110,65,65,110,30,540],"kingdra":[75,95,95,95,95,85,540],"blissey":[255,10,10,75,135,55,540],"milotic":[95,60,79,100,125,81,540],
            "electivire":[75,123,67,95,85,95,540],"magmortar":[75,95,67,125,95,83,540],"haxorus":[76,147,90,60,70,97,540],"lapras":[130,85,80,85,95,60,535],
            "crobat":[85,90,80,70,80,130,535],"swampert":[100,110,90,85,90,60,535],"magnezone":[70,70,115,130,90,60,535],"rhyperior":[115,140,130,55,55,40,535],
            "tangrowth":[100,100,125,110,50,50,535],"porygonz":[85,80,70,135,75,90,535],"vanilluxe":[71,95,85,110,95,79,535],"charizard":[78,84,78,109,85,100,534],
            "typhlosion":[78,84,78,109,85,100,534],"infernape":[76,104,71,104,71,108,534],"blastoise":[79,83,100,85,105,78,530],"exeggutor":[95,95,85,125,75,55,530],
            "feraligatr":[85,105,100,79,83,78,530],"sceptile":[70,85,65,105,85,120,530],"blaziken":[80,120,70,110,70,80,530],"aggron":[70,110,180,60,60,50,530],
            "walrein":[110,80,90,95,90,65,530],"empoleon":[84,86,88,111,101,60,530],"mamoswine":[110,130,80,70,60,80,530],"serperior":[75,75,95,75,95,113,528],
            "emboar":[110,123,65,100,65,65,528],"samurott":[95,100,85,108,70,70,528],"venusaur":[80,82,83,100,100,80,525],"cloyster":[50,95,180,85,45,70,525],
            "vaporeon":[130,65,60,110,95,65,525],"jolteon":[65,65,60,110,95,130,525],"flareon":[65,130,60,95,110,65,525],"meganium":[80,82,100,83,100,80,525],
            "espeon":[65,65,60,130,95,110,525],"umbreon":[95,65,110,60,130,65,525],"torterra":[95,109,105,75,85,56,525],"lucario":[70,110,70,115,70,90,525],
            "hippowdon":[108,112,118,68,72,47,525],"leafeon":[65,110,130,60,65,95,525],"glaceon":[65,60,110,130,95,65,525],"probopass":[60,55,145,75,150,40,525],
            "dusknoir":[45,100,135,65,135,45,525],"sylveon":[95,65,65,110,130,60,525],"luxray":[80,120,79,95,79,70,523],"starmie":[60,75,85,100,85,115,520],
            "flygon":[80,100,80,80,80,100,520],"klinklang":[60,100,115,70,85,90,520],"chandelure":[60,55,90,145,90,80,520],"krookodile":[95,117,80,65,70,92,519],
            "gardevoir":[68,65,65,125,115,80,518],"gallade":[68,125,65,65,115,80,518],"tentacruel":[80,70,65,80,120,100,515],"aerodactyl":[80,105,65,60,75,130,515],
            "porygon2":[85,80,90,105,95,60,515],"roserade":[60,70,65,125,105,90,515],"lickilicky":[110,85,95,80,95,50,515],"yanmega":[86,76,86,116,56,95,515],
            "gigalith":[85,135,130,60,80,25,515],"eelektross":[85,115,80,105,80,50,515],"poliwrath":[90,95,95,70,90,70,510],"ampharos":[90,75,85,115,90,55,510],
            "steelix":[75,85,200,55,65,30,510],"weavile":[70,120,65,45,85,125,510],"gliscor":[75,95,125,45,75,95,510],"zoroark":[60,105,60,120,60,105,510],
            "mienshao":[65,125,60,95,60,105,510],"braviary":[100,123,75,57,75,80,510],"mandibuzz":[110,65,105,55,95,80,510],"seismitoad":[105,95,75,85,75,74,509],
            "excadrill":[110,135,60,50,65,88,508],"nidoqueen":[90,92,87,75,85,76,505],"nidoking":[81,102,77,85,75,85,505],"ninetales":[73,76,75,81,100,100,505],
            "machamp":[90,130,80,65,85,55,505],"shuckle":[20,10,230,10,230,5,505],"honchkrow":[100,125,52,105,52,71,505],"conkeldurr":[105,140,95,55,65,45,505],
            "beartic":[95,130,80,70,80,50,505],"golduck":[80,82,78,95,80,85,500],"alakazam":[55,50,45,135,95,120,500],"rapidash":[65,100,70,80,80,105,500],
            "muk":[105,105,75,65,100,50,500],"gengar":[60,65,60,130,75,110,500],"scyther":[70,110,80,55,80,105,500],"politoed":[90,75,75,90,100,70,500],
            "scizor":[70,130,100,55,80,65,500],"ursaring":[90,130,75,75,75,55,500],"houndoom":[75,90,50,110,80,95,500],"donphan":[90,120,120,60,60,50,500],
            "wailord":[170,90,45,90,45,60,500],"claydol":[60,70,105,70,120,75,500],"bronzong":[67,89,116,79,116,33,500],"drapion":[70,90,110,60,75,95,500],
            "stoutland":[85,110,90,45,90,80,500],"leavanny":[75,103,80,70,80,92,500],"drifblim":[150,80,44,90,54,80,498],"simisage":[75,98,63,98,63,101,498],
            "simisear":[75,98,63,98,63,101,498],"simipour":[75,98,63,98,63,101,498],"zebstrika":[75,100,63,80,63,116,497],"golem":[80,120,130,55,65,45,495],
            "magmar":[65,95,57,100,85,93,495],"omastar":[70,60,125,115,70,55,495],"kabutops":[60,115,105,65,70,80,495],"cradily":[86,81,97,81,107,43,495],
            "armaldo":[75,125,100,70,80,45,495],"rampardos":[97,165,60,65,50,58,495],"bastiodon":[60,52,168,47,138,30,495],"floatzel":[85,105,55,85,50,115,495],
            "mismagius":[60,60,60,105,105,105,495],"carracosta":[74,108,133,83,65,32,495],"escavalier":[70,135,105,60,105,20,495],"accelgor":[80,70,40,100,60,145,495],
            "abomasnow":[90,92,75,92,85,60,494],"vileplume":[75,80,85,110,90,50,490],"victreebel":[80,105,65,100,70,70,490],"slowbro":[95,75,110,100,80,30,490],
            "electrode":[60,50,70,80,80,150,490],"weezing":[65,90,120,85,70,60,490],"kangaskhan":[105,95,80,40,80,90,490],"electabuzz":[65,83,57,95,85,105,490],
            "tauros":[75,100,95,40,70,110,490],"bellossom":[75,80,95,90,100,50,490],"slowking":[95,75,80,100,110,30,490],"miltank":[95,80,105,40,70,100,490],
            "exploud":[104,91,63,91,73,68,490],"altaria":[75,70,90,70,105,80,490],"toxicroak":[83,106,65,86,65,85,490],"sigilyph":[72,58,80,103,80,97,490],
            "gothitelle":[70,55,95,95,110,65,490],"reuniclus":[110,65,75,125,85,30,490],"bisharp":[65,125,100,60,70,70,490],"bouffalant":[95,110,95,40,95,55,490],
            "ferrothorn":[74,94,131,54,116,20,489],"unfezant":[80,115,80,65,55,93,488],"scrafty":[65,90,115,45,115,58,488],"musharna":[116,55,85,107,95,29,487],
            "raichu":[60,90,55,90,80,110,485],"rhydon":[105,130,120,45,45,40,485],"mantine":[85,40,70,80,140,70,485],"huntail":[55,104,105,94,75,52,485],
            "gorebyss":[55,84,105,114,75,52,485],"relicanth":[100,90,130,45,65,55,485],"staraptor":[85,120,70,50,60,100,485],"scolipede":[60,100,89,55,69,112,485],
            "crustle":[70,105,125,65,75,45,485],"beheeyem":[75,75,75,125,95,40,485],"cryogonal":[70,50,30,95,135,105,485],"druddigon":[77,120,90,60,90,48,485],
            "heatmor":[85,97,66,105,66,65,484],"durant":[58,109,112,48,48,109,484],"clefable":[95,70,73,95,90,60,483],"hypno":[85,73,70,73,115,67,483],
            "cofagrigus":[58,50,145,95,105,30,483],"golurk":[89,124,80,55,80,55,483],"ambipom":[75,100,66,60,66,115,482],"octillery":[75,105,75,105,75,45,480],
            "ludicolo":[80,70,70,90,100,70,480],"shiftry":[90,100,60,90,60,80,480],"glalie":[80,80,80,80,80,80,480],"lopunny":[65,76,84,54,96,105,480],
            "froslass":[70,80,70,80,70,110,480],"whimsicott":[60,67,85,77,75,116,480],"lilligant":[70,60,75,110,75,90,480],"darmanitan":[105,140,55,30,55,95,480],
            "jellicent":[100,60,70,85,105,60,480],"pidgeot":[83,80,75,70,70,101,479],"skuntank":[103,93,67,71,61,84,479],"dewgong":[90,70,80,70,95,70,475],
            "kingler":[55,130,115,50,50,75,475],"manectric":[70,75,60,105,60,105,475],"cacturne":[70,115,60,115,60,55,475],"gastrodon":[111,83,68,92,82,39,475],
            "sawsbuck":[80,100,70,60,70,95,475],"hariyama":[144,120,60,40,60,50,474],"vespiquen":[70,80,102,80,102,40,474],"garbodor":[80,95,82,60,82,75,474],
            "swanna":[75,87,63,87,63,98,473],"galvantula":[70,77,60,97,60,108,472],"stunfisk":[109,66,84,81,99,32,471],"dodrio":[60,110,70,60,60,110,470],
            "xatu":[65,75,70,95,70,95,470],"torkoal":[70,85,140,85,70,20,470],"grumpig":[80,45,65,90,110,80,470],"cinccino":[75,95,60,65,60,115,470],
            "alomomola":[165,75,80,40,45,65,470],"whiscash":[110,78,73,76,71,60,468],"crawdaunt":[63,120,85,90,55,55,468],"swalot":[100,73,83,73,83,55,467],
            "magneton":[50,60,95,120,70,70,465],"forretress":[75,90,140,60,60,40,465],"skarmory":[65,80,140,40,70,70,465],"stantler":[73,95,62,85,65,85,465],
            "absol":[65,130,60,75,60,75,465],"throh":[120,100,85,30,85,45,465],"sawk":[75,125,75,30,75,85,465],"amoonguss":[114,85,70,85,80,30,464],
            "maractus":[75,86,67,106,67,60,461],"mrmime":[40,45,65,100,120,90,460],"lanturn":[125,58,58,76,76,67,460],"jumpluff":[75,55,70,55,95,110,460],
            "breloom":[60,130,80,60,60,70,460],"sharpedo":[70,120,40,95,40,95,460],"camerupt":[70,100,70,105,75,40,460],"lunatone":[90,55,65,95,85,70,460],
            "solrock":[90,95,85,55,65,70,460],"tropius":[99,68,83,72,87,51,460],"lumineon":[69,69,76,69,86,91,460],"basculin":[70,92,65,80,55,98,460],
            "zangoose":[73,115,60,60,60,90,458],"seviper":[73,100,60,100,60,65,458],"ninjask":[61,90,45,50,50,160,456],"golbat":[75,80,70,65,75,90,455],
            "primeape":[65,105,60,60,70,95,455],"hitmonlee":[50,120,53,35,110,87,455],"hitmonchan":[50,105,79,35,110,76,455],"jynx":[65,50,35,115,95,95,455],
            "girafarig":[70,80,65,90,65,85,455],"hitmontop":[50,95,95,35,110,70,455],"swellow":[60,85,60,75,50,125,455],"banette":[64,115,65,83,63,65,455],
            "dusclops":[40,70,130,60,130,25,455],"chimecho":[75,50,80,95,90,65,455],"masquerain":[70,60,62,100,82,80,454],"carnivine":[74,100,72,90,72,46,454],
            "noctowl":[100,50,50,86,96,70,452],"purugly":[71,82,64,64,59,112,452],"sandslash":[75,100,110,45,55,65,450],"venomoth":[70,65,60,90,75,90,450],
            "chansey":[250,5,5,35,105,50,450],"seaking":[80,92,65,65,80,68,450],"granbull":[90,120,75,60,60,45,450],"piloswine":[100,100,80,60,60,50,450],
            "cherrim":[70,60,70,87,78,85,450],"arbok":[60,95,69,65,79,80,448],"liepard":[64,88,50,88,50,106,446],"audino":[103,60,86,60,86,50,445],
            "fearow":[65,90,65,61,61,100,442],"persian":[65,70,60,65,65,115,440],"seadra":[55,65,95,95,45,85,440],"qwilfish":[65,95,85,55,55,85,440],
            "pelipper":[60,50,100,95,70,65,440],"vigoroth":[80,80,80,55,55,90,440],"kecleon":[60,90,70,60,120,40,440],"rotom":[50,50,77,95,77,91,440],
            "klang":[60,80,95,70,85,50,440],"wigglytuff":[140,70,45,85,50,45,435],"tangela":[65,55,115,100,40,60,435],"quagsire":[95,85,85,65,65,35,430],
            "gligar":[65,75,105,35,65,85,430],"sneasel":[55,95,55,35,75,115,430],"magcargo":[60,50,120,90,80,30,430],"lairon":[60,90,140,50,50,40,430],
            "volbeat":[65,73,75,47,85,85,430],"illumise":[65,47,75,73,85,85,430],"emolga":[55,75,60,75,60,103,428],"dugtrio":[35,100,50,50,70,120,425],
            "marowak":[60,80,110,50,80,45,425],"sunflora":[75,75,55,105,85,30,425],"swoobat":[67,57,55,77,55,114,425],"wormadam":[60,59,85,79,105,36,424],
            "mothim":[70,94,50,94,50,66,424],"dragonair":[61,84,65,70,70,70,420],"azumarill":[100,50,80,60,80,50,420],"mightyena":[70,90,70,60,60,70,420],
            "linoone":[78,70,61,50,61,100,420],"castform":[70,70,70,70,70,70,420],"shelgon":[65,95,100,60,50,50,420],"metang":[60,75,100,55,80,50,420],
            "watchog":[60,85,69,60,69,77,420],"zweilous":[72,85,70,65,70,58,420],"pignite":[90,93,55,70,55,55,418],"furret":[85,76,64,45,55,90,415],
            "dunsparce":[100,70,70,65,65,45,415],"raticate":[55,81,60,50,70,97,413],"servine":[60,60,75,60,75,83,413],"dewott":[75,75,60,83,60,60,413],
            "chatot":[76,65,45,92,42,91,411],"ponyta":[50,85,55,65,65,90,410],"sudowoodo":[70,100,115,30,65,30,410],"corsola":[65,55,95,65,95,35,410],
            "pupitar":[70,84,70,65,70,51,410],"medicham":[60,60,75,60,75,80,410],"sealeo":[90,60,70,75,70,45,410],"bibarel":[79,85,60,55,60,71,410],
            "gabite":[68,90,65,50,55,82,410],"fraxure":[66,117,70,40,50,67,410],"ivysaur":[60,62,63,80,80,60,405],"charmeleon":[58,64,58,80,65,80,405],
            "wartortle":[59,63,80,65,80,58,405],"parasect":[60,95,80,60,80,30,405],"machoke":[80,100,70,50,60,45,405],"haunter":[45,50,45,115,55,95,405],
            "bayleef":[60,62,80,63,80,60,405],"quilava":[58,64,58,80,65,80,405],"croconaw":[65,80,80,59,63,58,405],"togetic":[55,40,85,80,105,40,405],
            "murkrow":[60,85,42,85,42,91,405],"wobbuffet":[190,33,58,33,58,33,405],"grovyle":[50,65,45,85,65,95,405],"combusken":[60,85,60,85,60,55,405],
            "marshtomp":[70,85,70,60,70,50,405],"plusle":[60,50,40,85,75,95,405],"minun":[60,40,50,75,85,95,405],"grotle":[75,89,85,55,65,36,405],
            "monferno":[64,78,52,78,52,81,405],"prinplup":[64,66,68,81,76,50,405],"pachirisu":[60,45,70,45,90,95,405],"gurdurr":[85,105,85,40,50,40,405],
            "eelektrik":[65,85,70,75,70,40,405],"archen":[55,112,45,74,45,70,401],"kadabra":[40,35,30,120,70,105,400],"ariados":[70,90,70,60,70,40,400],
            "delcatty":[70,65,65,55,55,90,400],"roselia":[50,60,45,100,80,65,400],"wailmer":[130,70,35,70,35,60,400],"butterfree":[60,45,50,90,80,70,395],
            "beedrill":[65,90,40,45,80,75,395],"gloom":[60,65,70,85,75,40,395],"porygon":[65,60,70,85,75,40,395],"beautifly":[60,70,50,100,50,65,395],
            "vanillish":[51,65,65,80,75,59,395],"weepinbell":[65,90,50,85,45,55,390],"graveler":[55,95,115,45,45,35,390],"ledian":[55,35,50,55,110,85,390],
            "yanma":[65,65,45,75,45,95,390],"munchlax":[135,85,40,40,85,5,390],"boldore":[70,105,105,50,40,20,390],"gothorita":[60,45,70,75,85,55,390],
            "poliwhirl":[65,65,65,50,50,90,385],"onix":[35,45,160,30,45,70,385],"lickitung":[90,55,75,60,75,30,385],"dustox":[60,50,70,50,90,65,385],
            "kricketune":[77,85,51,55,51,65,384],"palpitoad":[75,65,55,65,55,69,384],"sableye":[50,75,75,65,65,50,380],"mawile":[50,85,85,55,55,50,380],
            "swadloon":[55,63,90,50,80,42,380],"farfetchd":[52,90,55,58,62,60,377],"nosepass":[30,45,135,45,90,30,375],"herdier":[65,80,65,35,65,60,370],
            "duosion":[65,40,50,125,60,30,370],"lampent":[60,40,60,95,60,55,370],"vullaby":[70,55,75,45,65,60,370],"nidorina":[70,62,67,55,55,56,365],
            "nidorino":[61,72,57,55,55,65,365],"flaaffy":[70,55,55,80,60,45,365],"magby":[45,75,37,70,55,83,365],"luxio":[60,85,49,60,49,60,363],
            "aipom":[55,70,55,40,55,85,360],"elekid":[45,63,37,65,55,95,360],"loudred":[84,71,43,71,43,48,360],"spinda":[60,60,60,60,60,60,360],
            "whirlipede":[40,55,99,40,79,47,360],"larvesta":[55,85,55,50,55,60,360],"tranquill":[62,77,62,50,42,65,358],"omanyte":[35,40,100,90,55,35,355],
            "kabuto":[30,80,90,55,45,55,355],"lileep":[66,41,77,61,87,23,355],"anorith":[45,95,50,40,50,75,355],"tirtouga":[54,78,103,53,45,22,355],
            "krokorok":[60,82,45,45,45,74,351],"growlithe":[55,70,45,70,50,60,350],"cranidos":[67,125,40,30,30,58,350],"shieldon":[30,42,118,42,88,30,350],
            "buneary":[55,66,44,44,56,85,350],"mienfoo":[45,85,50,55,50,65,350],"rufflet":[70,83,50,37,50,60,350],"pidgeotto":[63,60,55,50,50,71,349],
            "drifloon":[90,50,34,60,44,70,348],"scraggy":[50,75,70,35,70,48,348],"rhyhorn":[80,85,95,30,30,25,345],"clamperl":[35,64,85,74,55,32,345],
            "mantyke":[45,20,50,60,120,50,345],"koffing":[40,65,95,60,45,35,340],"staryu":[30,45,55,70,55,85,340],"skiploom":[55,45,50,45,65,80,340],
            "lombre":[60,50,50,60,70,50,340],"nuzleaf":[70,70,40,60,40,60,340],"vibrava":[50,70,50,50,50,70,340],"staravia":[55,75,50,40,40,80,340],
            "pawniard":[45,85,70,40,40,60,340],"tentacool":[40,40,35,50,100,70,335],"cacnea":[50,85,40,85,40,35,335],"deerling":[60,60,50,40,50,75,335],
            "frillish":[55,40,50,65,85,40,335],"elgyem":[55,55,55,85,55,30,335],"snover":[60,62,50,62,60,40,334],"voltorb":[40,30,50,55,55,100,330],
            "chinchou":[75,38,38,56,56,67,330],"teddiursa":[60,80,50,50,50,40,330],"delibird":[45,55,45,65,45,75,330],"houndour":[45,60,30,80,50,65,330],
            "phanpy":[90,60,60,40,40,40,330],"aron":[50,70,100,40,40,30,330],"spoink":[60,25,35,70,80,60,330],"luvdisc":[43,30,55,40,65,97,330],
            "buizel":[55,65,35,60,30,85,330],"hippopotas":[68,72,78,38,42,32,330],"skorupi":[40,50,90,30,55,65,330],"finneon":[49,49,56,49,61,66,330],
            "zorua":[40,65,40,80,40,65,330],"stunky":[63,63,47,41,41,74,329],"trubbish":[50,50,62,40,62,65,329],"drowzee":[60,48,45,43,90,42,328],
            "drilbur":[60,85,40,30,45,68,328],"magnemite":[25,35,70,95,55,45,325],"seel":[65,45,55,45,70,45,325],"grimer":[80,80,50,40,50,25,325],
            "krabby":[30,105,90,25,25,50,325],"exeggcute":[60,40,80,60,45,40,325],"eevee":[55,55,50,45,65,55,325],"shellos":[76,48,48,57,62,34,325],
            "dwebble":[50,65,85,35,35,55,325],"clefairy":[70,45,48,60,65,35,323],"woobat":[65,45,43,55,43,72,323],"pikachu":[35,55,40,50,50,90,320],
            "oddish":[45,50,55,75,65,30,320],"psyduck":[50,52,48,65,50,55,320],"cubone":[50,50,95,40,50,35,320],"goldeen":[45,67,60,35,50,63,320],
            "natu":[40,50,45,70,45,70,320],"axew":[46,87,60,30,40,57,320],"joltik":[50,47,50,57,50,65,319],"bulbasaur":[45,49,49,65,65,45,318],
            "chikorita":[45,49,65,49,65,45,318],"turtwig":[55,68,64,45,55,31,318],"pansage":[50,53,48,53,48,64,316],"pansear":[50,53,48,53,48,64,316],
            "panpour":[50,53,48,53,48,64,316],"slowpoke":[90,65,65,40,40,15,315],"darumaka":[70,90,45,15,45,50,315],"karrablast":[50,75,45,40,45,60,315],
            "squirtle":[44,48,65,50,64,43,314],"totodile":[50,65,64,44,48,43,314],"piplup":[53,51,53,61,56,40,314],"abra":[25,20,15,105,55,90,310],
            "doduo":[35,85,45,35,35,75,310],"gastly":[30,35,30,100,35,80,310],"treecko":[40,45,35,65,55,70,310],"torchic":[45,60,40,70,50,45,310],
            "mudkip":[50,70,50,50,50,40,310],"swablu":[45,40,60,40,75,50,310],"glameow":[49,55,42,42,37,85,310],"mimejr":[20,25,45,70,90,60,310],
            "sewaddle":[45,53,70,40,60,42,310],"charmander":[39,52,43,60,50,65,309],"cyndaquil":[39,52,43,60,50,65,309],"chimchar":[44,58,44,58,44,61,309],
            "corphish":[43,80,65,50,35,35,308],"snivy":[45,45,55,45,55,63,308],"tepig":[65,63,45,45,45,45,308],"oshawott":[55,55,45,63,45,45,308],
            "venonat":[60,55,50,40,55,45,305],"mankey":[40,80,35,35,45,70,305],"machop":[70,80,50,35,35,35,305],"shellder":[30,65,100,45,25,40,305],
            "smoochum":[45,30,15,85,65,65,305],"carvanha":[45,90,20,65,20,65,305],"numel":[60,60,40,65,45,35,305],"timburr":[75,80,55,25,35,35,305],
            "ducklett":[62,44,50,44,50,55,305],"vanillite":[36,50,50,65,60,44,305],"ferroseed":[44,50,91,24,86,10,305],"cubchoo":[55,70,40,60,40,40,305],
            "shelmet":[50,40,85,40,65,25,305],"yamask":[38,30,85,55,65,30,303],"golett":[59,74,50,35,50,35,303],"gulpin":[70,43,53,43,53,40,302],
            "sandshrew":[50,75,85,20,30,40,300],"poliwag":[40,50,40,40,40,90,300],"bellsprout":[50,75,35,70,30,40,300],"geodude":[40,80,100,30,30,20,300],
            "dratini":[41,64,45,50,50,50,300],"snubbull":[60,80,50,40,40,30,300],"remoraid":[35,65,35,65,35,65,300],"larvitar":[50,64,50,45,50,41,300],
            "baltoy":[40,40,55,40,70,55,300],"snorunt":[50,50,50,50,50,50,300],"bagon":[45,75,60,40,30,50,300],"beldum":[40,55,80,35,60,30,300],
            "bronzor":[57,24,86,24,86,23,300],"gible":[58,70,45,40,45,42,300],"croagunk":[48,61,40,61,40,50,300],"minccino":[55,50,40,40,40,75,300],
            "klink":[40,55,70,45,60,30,300],"deino":[52,65,50,45,50,38,300],"vulpix":[38,41,40,50,65,65,299],"horsea":[30,40,70,70,25,60,295],
            "shroomish":[60,40,60,40,60,35,295],"electrike":[40,45,40,65,40,65,295],"shuppet":[44,75,35,63,33,45,295],"duskull":[20,40,90,30,90,25,295],
            "blitzle":[45,60,32,50,32,76,295],"tympole":[50,50,40,50,40,64,294],"foongus":[69,55,45,55,55,15,294],"munna":[76,25,45,67,55,24,292],
            "sandile":[50,72,35,35,35,65,292],"meowth":[40,45,35,40,40,90,290],"pineco":[50,65,90,35,35,15,290],"trapinch":[45,100,45,45,45,10,290],
            "spheal":[70,40,50,55,50,25,290],"bonsly":[50,80,95,10,45,10,290],"gothita":[45,30,50,55,65,45,290],"solosis":[45,30,40,105,50,20,290],
            "ekans":[35,60,44,40,54,55,288],"barboach":[50,48,43,46,41,60,288],"paras":[35,70,55,45,55,25,285],"chingling":[45,30,50,65,50,45,285],
            "riolu":[40,70,40,35,40,60,285],"purrloin":[41,50,37,50,37,66,281],"mareep":[55,40,40,65,45,35,280],"slakoth":[60,60,60,35,35,30,280],
            "meditite":[30,40,55,40,55,60,280],"budew":[40,30,35,50,70,55,280],"roggenrola":[55,75,85,25,25,15,280],"cottonee":[40,27,60,37,50,66,280],
            "petilil":[45,35,50,70,50,30,280],"kirlia":[38,35,35,65,55,50,278],"cherubi":[45,35,45,62,53,35,275],"lillipup":[45,60,45,25,45,55,275],
            "tynamo":[35,55,40,45,40,60,275],"litwick":[50,30,55,65,55,20,275],"nidoranfemale":[46,57,40,40,40,50,273],"nidoranmale":[46,57,40,40,40,50,273],
            "jigglypuff":[115,45,20,45,25,20,270],"taillow":[40,55,30,30,30,85,270],"wingull":[40,30,30,55,30,85,270],"surskit":[40,30,32,50,52,65,269],
            "nincada":[31,45,90,30,30,40,266],"diglett":[10,55,25,35,45,95,265],"ledyba":[40,20,30,40,80,55,265],"pidove":[50,55,50,36,30,43,264],
            "shinx":[45,65,34,40,34,45,263],"spearow":[40,60,30,31,31,70,262],"hoothoot":[60,30,30,36,56,50,262],"skitty":[50,45,45,35,35,50,260],
            "wynaut":[95,23,48,23,48,23,260],"venipede":[30,45,59,30,39,57,260],"patrat":[45,55,39,35,39,42,255],"rattata":[30,56,35,25,35,72,253],
            "pidgey":[40,45,40,35,35,56,251],"spinarak":[40,60,40,40,40,30,250],"marill":[70,20,50,20,50,40,250],"hoppip":[35,35,40,35,55,50,250],
            "slugma":[40,40,40,70,40,20,250],"swinub":[50,50,40,30,30,50,250],"smeargle":[55,20,35,20,45,75,250],"bidoof":[59,45,40,35,40,31,250],
            "zubat":[40,45,35,30,40,55,245],"togepi":[35,20,65,40,65,20,245],"starly":[40,55,30,30,30,60,245],"combee":[30,30,42,30,42,70,244],
            "zigzagoon":[38,30,41,30,41,60,240],"whismur":[64,51,23,51,23,28,240],"makuhita":[72,60,30,20,30,25,237],"shedinja":[1,90,45,30,30,40,236],
            "burmy":[40,29,45,29,45,36,224],"poochyena":[35,55,35,30,30,35,220],"lotad":[40,30,30,40,50,30,220],"seedot":[40,40,50,30,30,30,220],
            "happiny":[100,5,5,15,65,30,220],"cleffa":[50,25,28,45,55,15,218],"sentret":[35,46,34,35,45,20,215],"igglybuff":[90,30,15,40,20,15,210],
            "wooper":[55,45,45,25,25,15,210],"tyrogue":[35,35,35,35,35,35,210],"metapod":[50,20,55,25,25,30,205],"kakuna":[45,25,50,25,25,35,205],
            "pichu":[20,40,15,35,35,60,205],"silcoon":[50,35,55,25,25,15,205],"cascoon":[50,35,55,25,25,15,205],"feebas":[20,15,20,10,55,80,200],
            "ralts":[28,25,25,45,35,40,198],"caterpie":[45,30,35,20,20,45,195],"weedle":[40,35,30,20,20,50,195],"wurmple":[45,45,35,20,30,20,195],
            "kricketot":[37,25,41,25,41,25,194],"azurill":[50,20,40,20,40,20,190],"sunkern":[30,30,30,30,30,30,180],"arceus":[120,120,120,120,120,120,720],
            "mewtwo":[106,110,90,154,90,130,680],"lugia":[106,90,130,90,154,110,680],"hooh":[106,130,90,110,154,90,680],"dialga":[100,120,120,150,100,90,680],
            "giratina":[150,100,120,100,120,90,680],"palkia":[90,120,100,150,120,100,680],"rayquaza":[105,150,90,150,90,95,680],"reshiram":[100,120,100,150,120,90,680],
            "zekrom":[100,150,120,120,100,90,680],"groudon":[100,150,140,100,90,90,670],"kyogre":[100,100,90,150,140,90,670],"regigigas":[110,160,110,80,110,100,670],
            "kyurem":[125,130,90,130,90,95,660],"mew":[100,100,100,100,100,100,600],"celebi":[100,100,100,100,100,100,600],"heatran":[91,90,106,130,106,77,600],
            "cresselia":[120,70,120,75,130,85,600],"darkrai":[70,90,90,135,90,125,600],"deoxys":[50,150,50,150,50,150,600],"genesect":[71,120,95,120,95,99,600],
            "jirachi":[100,100,100,100,100,100,600],"landorus":[89,125,90,115,80,101,600],"latias":[80,80,90,110,130,110,600],"latios":[80,90,80,130,110,110,600],
            "manaphy":[100,100,100,100,100,100,600],"meloetta":[100,77,77,128,128,90,600],"shaymin":[100,100,100,100,100,100,600],"victini":[100,100,100,100,100,100,600],
            "articuno":[90,85,100,95,125,85,580],"zapdos":[90,90,85,125,90,100,580],"moltres":[90,100,90,125,85,90,580],"raikou":[90,85,75,115,100,115,580],
            "entei":[115,115,85,90,75,100,580],"suicune":[100,75,115,90,115,85,580],"azelf":[75,125,70,125,70,115,580],"cobalion":[91,90,129,90,72,108,580],
            "keldeo":[91,72,90,129,90,108,580],"mesprit":[80,105,105,105,105,80,580],"regice":[80,50,100,100,200,50,580],"regirock":[80,100,200,50,100,50,580],
            "registeel":[80,75,150,75,150,50,580],"terrakion":[91,129,90,72,90,108,580],"thundurus":[79,115,70,125,80,111,580],"tornadus":[79,115,70,125,80,111,580],
            "uxie":[75,75,130,75,130,95,580],"virizion":[91,90,72,90,129,108,580],"phione":[80,80,80,80,80,80,480],"megagarchomp":[108,170,115,120,95,92,700],
            "megametagross":[80,145,150,105,110,110,700],"megasalamence":[95,145,130,120,90,120,700],"megatyranitar":[100,164,150,95,120,71,700],
            "megagyarados":[95,155,109,70,130,81,640],"megaswampert":[100,150,110,95,110,70,635],"megacharizardx":[78,130,111,130,85,100,634],
            "megacharizardy":[78,104,78,159,115,100,634],"megaaggron":[70,140,230,60,80,50,630],"megablastoise":[79,103,120,135,115,78,630],
            "megablaziken":[80,160,80,130,80,100,630],"megasceptile":[70,110,75,145,85,145,630],"megalucario":[70,145,88,140,70,112,625],
            "megavenusaur":[80,100,123,122,120,80,625],"megagardevoir":[68,85,65,165,135,100,618],"megaaerodactyl":[80,135,85,70,95,150,615],
            "megaampharos":[90,95,105,165,110,45,610],"megasteelix":[75,125,230,55,95,30,610],"megaalakazam":[55,50,65,175,105,150,600],
            "megagengar":[60,65,80,170,95,130,600],"megahoundoom":[75,90,90,140,90,115,600],"megascizor":[70,150,140,65,100,75,600],
            "megaabomasnow":[90,132,105,132,105,30,594],"megaslowbro":[95,75,180,130,80,30,590],"megaglalie":[80,120,80,120,80,100,580],
            "megapidgeot":[83,80,80,135,80,121,579],"megamanectric":[70,75,80,135,80,135,575],"megaabsol":[65,150,60,115,60,115,565],
            "megacamerupt":[70,120,100,145,105,20,560],"megaaudino":[103,60,126,80,126,50,545],"megamedicham":[60,100,85,80,85,100,510],
            "megabeedrill":[65,150,40,15,80,145,495],"megamawile":[50,105,125,55,95,50,480],"megasableye":[50,85,125,85,115,20,480]
        };
        // 4 espécies da dex que a página oficial de stats não listou — base
        // canônica preenchida à mão pra ficha não vir vazia (Pinsir, Heracross,
        // Misdreavus, Spiritomb).
        Object.assign(PP_BASE_STATS, {
            "pinsir": [65, 125, 100, 55, 70, 85, 500], "heracross": [80, 125, 75, 40, 95, 85, 500],
            "misdreavus": [60, 60, 60, 85, 85, 85, 435], "spiritomb": [50, 92, 108, 92, 108, 35, 485]
        });
        const PP_MEGA_KEYS = ["megagarchomp", "megametagross", "megasalamence", "megatyranitar", "megagyarados", "megaswampert", "megacharizardx", "megacharizardy", "megaaggron", "megablastoise", "megablaziken", "megasceptile", "megalucario", "megavenusaur", "megagardevoir", "megaaerodactyl", "megaampharos", "megasteelix", "megaalakazam", "megagengar", "megahoundoom", "megascizor", "megaabomasnow", "megaslowbro", "megaglalie", "megapidgeot", "megamanectric", "megaabsol", "megacamerupt", "megaaudino", "megamedicham", "megabeedrill", "megamawile", "megasableye"];

        function ppNorm2(s){ return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]/g,''); }
        const PP_STATS_ALIAS = {
            'nidoranf':'nidoranfemale', 'nidoranm':'nidoranmale',
            'hooh':'hooh', 'porygonz':'porygonz'
        };
        function ppStatsDe(nome){
            let k = ppNorm2(nome);
            if (PP_STATS_ALIAS[k]) k = PP_STATS_ALIAS[k];
            const v = PP_BASE_STATS[k];
            if (!v) return null;
            return { hp:v[0], atk:v[1], def:v[2], spa:v[3], spd:v[4], spe:v[5], bst:v[6] };
        }
        function ppTodasStats(){
            const out = [];
            for (const k in PP_BASE_STATS){
                const v = PP_BASE_STATS[k];
                out.push({ key:k, hp:v[0], atk:v[1], def:v[2], spa:v[3], spd:v[4], spe:v[5], bst:v[6], mega: PP_MEGA_KEYS.indexOf(k)>=0 });
            }
            return out;
        }
        const PP_STATS_LABEL = {};
        Object.assign(PP_STATS_LABEL, {
            "slaking":"Slaking","dragonite":"Dragonite","tyranitar":"Tyranitar","salamence":"Salamence","metagross":"Metagross","garchomp":"Garchomp",
            "hydreigon":"Hydreigon","archeops":"Archeops","arcanine":"Arcanine","volcarona":"Volcarona","togekiss":"Togekiss","gyarados":"Gyarados","snorlax":"Snorlax",
            "kingdra":"Kingdra","blissey":"Blissey","milotic":"Milotic","electivire":"Electivire","magmortar":"Magmortar","haxorus":"Haxorus","lapras":"Lapras",
            "crobat":"Crobat","swampert":"Swampert","magnezone":"Magnezone","rhyperior":"Rhyperior","tangrowth":"Tangrowth","porygonz":"Porygon-Z",
            "vanilluxe":"Vanilluxe","charizard":"Charizard","typhlosion":"Typhlosion","infernape":"Infernape","blastoise":"Blastoise","exeggutor":"Exeggutor",
            "feraligatr":"Feraligatr","sceptile":"Sceptile","blaziken":"Blaziken","aggron":"Aggron","walrein":"Walrein","empoleon":"Empoleon","mamoswine":"Mamoswine",
            "serperior":"Serperior","emboar":"Emboar","samurott":"Samurott","venusaur":"Venusaur","cloyster":"Cloyster","vaporeon":"Vaporeon","jolteon":"Jolteon",
            "flareon":"Flareon","meganium":"Meganium","espeon":"Espeon","umbreon":"Umbreon","torterra":"Torterra","lucario":"Lucario","hippowdon":"Hippowdon",
            "leafeon":"Leafeon","glaceon":"Glaceon","probopass":"Probopass","dusknoir":"Dusknoir","sylveon":"Sylveon","luxray":"Luxray","starmie":"Starmie",
            "flygon":"Flygon","klinklang":"Klinklang","chandelure":"Chandelure","krookodile":"Krookodile","gardevoir":"Gardevoir","gallade":"Gallade",
            "tentacruel":"Tentacruel","aerodactyl":"Aerodactyl","porygon2":"Porygon2","roserade":"Roserade","lickilicky":"Lickilicky","yanmega":"Yanmega",
            "gigalith":"Gigalith","eelektross":"Eelektross","poliwrath":"Poliwrath","ampharos":"Ampharos","steelix":"Steelix","weavile":"Weavile","gliscor":"Gliscor",
            "zoroark":"Zoroark","mienshao":"Mienshao","braviary":"Braviary","mandibuzz":"Mandibuzz","seismitoad":"Seismitoad","excadrill":"Excadrill",
            "nidoqueen":"Nidoqueen","nidoking":"Nidoking","ninetales":"Ninetales","machamp":"Machamp","shuckle":"Shuckle","honchkrow":"Honchkrow",
            "conkeldurr":"Conkeldurr","beartic":"Beartic","golduck":"Golduck","alakazam":"Alakazam","rapidash":"Rapidash","muk":"Muk","gengar":"Gengar",
            "scyther":"Scyther","politoed":"Politoed","scizor":"Scizor","ursaring":"Ursaring","houndoom":"Houndoom","donphan":"Donphan","wailord":"Wailord",
            "claydol":"Claydol","bronzong":"Bronzong","drapion":"Drapion","stoutland":"Stoutland","leavanny":"Leavanny","drifblim":"Drifblim","simisage":"Simisage",
            "simisear":"Simisear","simipour":"Simipour","zebstrika":"Zebstrika","golem":"Golem","magmar":"Magmar","omastar":"Omastar","kabutops":"Kabutops",
            "cradily":"Cradily","armaldo":"Armaldo","rampardos":"Rampardos","bastiodon":"Bastiodon","floatzel":"Floatzel","mismagius":"Mismagius",
            "carracosta":"Carracosta","escavalier":"Escavalier","accelgor":"Accelgor","abomasnow":"Abomasnow","vileplume":"Vileplume","victreebel":"Victreebel",
            "slowbro":"Slowbro","electrode":"Electrode","weezing":"Weezing","kangaskhan":"Kangaskhan","electabuzz":"Electabuzz","tauros":"Tauros","bellossom":"Bellossom",
            "slowking":"Slowking","miltank":"Miltank","exploud":"Exploud","altaria":"Altaria","toxicroak":"Toxicroak","sigilyph":"Sigilyph","gothitelle":"Gothitelle",
            "reuniclus":"Reuniclus","bisharp":"Bisharp","bouffalant":"Bouffalant","ferrothorn":"Ferrothorn","unfezant":"Unfezant","scrafty":"Scrafty",
            "musharna":"Musharna","raichu":"Raichu","rhydon":"Rhydon","mantine":"Mantine","huntail":"Huntail","gorebyss":"Gorebyss","relicanth":"Relicanth",
            "staraptor":"Staraptor","scolipede":"Scolipede","crustle":"Crustle","beheeyem":"Beheeyem","cryogonal":"Cryogonal","druddigon":"Druddigon","heatmor":"Heatmor",
            "durant":"Durant","clefable":"Clefable","hypno":"Hypno","cofagrigus":"Cofagrigus","golurk":"Golurk","ambipom":"Ambipom","octillery":"Octillery",
            "ludicolo":"Ludicolo","shiftry":"Shiftry","glalie":"Glalie","lopunny":"Lopunny","froslass":"Froslass","whimsicott":"Whimsicott","lilligant":"Lilligant",
            "darmanitan":"Darmanitan","jellicent":"Jellicent","pidgeot":"Pidgeot","skuntank":"Skuntank","dewgong":"Dewgong","kingler":"Kingler","manectric":"Manectric",
            "cacturne":"Cacturne","gastrodon":"Gastrodon","sawsbuck":"Sawsbuck","hariyama":"Hariyama","vespiquen":"Vespiquen","garbodor":"Garbodor","swanna":"Swanna",
            "galvantula":"Galvantula","stunfisk":"Stunfisk","dodrio":"Dodrio","xatu":"Xatu","torkoal":"Torkoal","grumpig":"Grumpig","cinccino":"Cinccino",
            "alomomola":"Alomomola","whiscash":"Whiscash","crawdaunt":"Crawdaunt","swalot":"Swalot","magneton":"Magneton","forretress":"Forretress","skarmory":"Skarmory",
            "stantler":"Stantler","absol":"Absol","throh":"Throh","sawk":"Sawk","amoonguss":"Amoonguss","maractus":"Maractus","mrmime":"Mr.Mime","lanturn":"Lanturn",
            "jumpluff":"Jumpluff","breloom":"Breloom","sharpedo":"Sharpedo","camerupt":"Camerupt","lunatone":"Lunatone","solrock":"Solrock","tropius":"Tropius",
            "lumineon":"Lumineon","basculin":"Basculin","zangoose":"Zangoose","seviper":"Seviper","ninjask":"Ninjask","golbat":"Golbat","primeape":"Primeape",
            "hitmonlee":"Hitmonlee","hitmonchan":"Hitmonchan","jynx":"Jynx","girafarig":"Girafarig","hitmontop":"Hitmontop","swellow":"Swellow","banette":"Banette",
            "dusclops":"Dusclops","chimecho":"Chimecho","masquerain":"Masquerain","carnivine":"Carnivine","noctowl":"Noctowl","purugly":"Purugly","sandslash":"Sandslash",
            "venomoth":"Venomoth","chansey":"Chansey","seaking":"Seaking","granbull":"Granbull","piloswine":"Piloswine","cherrim":"Cherrim","arbok":"Arbok",
            "liepard":"Liepard","audino":"Audino","fearow":"Fearow","persian":"Persian","seadra":"Seadra","qwilfish":"Qwilfish","pelipper":"Pelipper",
            "vigoroth":"Vigoroth","kecleon":"Kecleon","rotom":"Rotom","klang":"Klang","wigglytuff":"Wigglytuff","tangela":"Tangela","quagsire":"Quagsire",
            "gligar":"Gligar","sneasel":"Sneasel","magcargo":"Magcargo","lairon":"Lairon","volbeat":"Volbeat","illumise":"Illumise","emolga":"Emolga","dugtrio":"Dugtrio",
            "marowak":"Marowak","sunflora":"Sunflora","swoobat":"Swoobat","wormadam":"Wormadam","mothim":"Mothim","dragonair":"Dragonair","azumarill":"Azumarill",
            "mightyena":"Mightyena","linoone":"Linoone","castform":"Castform","shelgon":"Shelgon","metang":"Metang","watchog":"Watchog","zweilous":"Zweilous",
            "pignite":"Pignite","furret":"Furret","dunsparce":"Dunsparce","raticate":"Raticate","servine":"Servine","dewott":"Dewott","chatot":"Chatot","ponyta":"Ponyta",
            "sudowoodo":"Sudowoodo","corsola":"Corsola","pupitar":"Pupitar","medicham":"Medicham","sealeo":"Sealeo","bibarel":"Bibarel","gabite":"Gabite",
            "fraxure":"Fraxure","ivysaur":"Ivysaur","charmeleon":"Charmeleon","wartortle":"Wartortle","parasect":"Parasect","machoke":"Machoke","haunter":"Haunter",
            "bayleef":"Bayleef","quilava":"Quilava","croconaw":"Croconaw","togetic":"Togetic","murkrow":"Murkrow","wobbuffet":"Wobbuffet","grovyle":"Grovyle",
            "combusken":"Combusken","marshtomp":"Marshtomp","plusle":"Plusle","minun":"Minun","grotle":"Grotle","monferno":"Monferno","prinplup":"Prinplup",
            "pachirisu":"Pachirisu","gurdurr":"Gurdurr","eelektrik":"Eelektrik","archen":"Archen","kadabra":"Kadabra","ariados":"Ariados","delcatty":"Delcatty",
            "roselia":"Roselia","wailmer":"Wailmer","butterfree":"Butterfree","beedrill":"Beedrill","gloom":"Gloom","porygon":"Porygon","beautifly":"Beautifly",
            "vanillish":"Vanillish","weepinbell":"Weepinbell","graveler":"Graveler","ledian":"Ledian","yanma":"Yanma","munchlax":"Munchlax","boldore":"Boldore",
            "gothorita":"Gothorita","poliwhirl":"Poliwhirl","onix":"Onix","lickitung":"Lickitung","dustox":"Dustox","kricketune":"Kricketune","palpitoad":"Palpitoad",
            "sableye":"Sableye","mawile":"Mawile","swadloon":"Swadloon","farfetchd":"Farfetchd","nosepass":"Nosepass","herdier":"Herdier","duosion":"Duosion",
            "lampent":"Lampent","vullaby":"Vullaby","nidorina":"Nidorina","nidorino":"Nidorino","flaaffy":"Flaaffy","magby":"Magby","luxio":"Luxio","aipom":"Aipom",
            "elekid":"Elekid","loudred":"Loudred","spinda":"Spinda","whirlipede":"Whirlipede","larvesta":"Larvesta","tranquill":"Tranquill","omanyte":"Omanyte",
            "kabuto":"Kabuto","lileep":"Lileep","anorith":"Anorith","tirtouga":"Tirtouga","krokorok":"Krokorok","growlithe":"Growlithe","cranidos":"Cranidos",
            "shieldon":"Shieldon","buneary":"Buneary","mienfoo":"Mienfoo","rufflet":"Rufflet","pidgeotto":"Pidgeotto","drifloon":"Drifloon","scraggy":"Scraggy",
            "rhyhorn":"Rhyhorn","clamperl":"Clamperl","mantyke":"Mantyke","koffing":"Koffing","staryu":"Staryu","skiploom":"Skiploom","lombre":"Lombre",
            "nuzleaf":"Nuzleaf","vibrava":"Vibrava","staravia":"Staravia","pawniard":"Pawniard","tentacool":"Tentacool","cacnea":"Cacnea","deerling":"Deerling",
            "frillish":"Frillish","elgyem":"Elgyem","snover":"Snover","voltorb":"Voltorb","chinchou":"Chinchou","teddiursa":"Teddiursa","delibird":"Delibird",
            "houndour":"Houndour","phanpy":"Phanpy","aron":"Aron","spoink":"Spoink","luvdisc":"Luvdisc","buizel":"Buizel","hippopotas":"Hippopotas","skorupi":"Skorupi",
            "finneon":"Finneon","zorua":"Zorua","stunky":"Stunky","trubbish":"Trubbish","drowzee":"Drowzee","drilbur":"Drilbur","magnemite":"Magnemite","seel":"Seel",
            "grimer":"Grimer","krabby":"Krabby","exeggcute":"Exeggcute","eevee":"Eevee","shellos":"Shellos","dwebble":"Dwebble","clefairy":"Clefairy","woobat":"Woobat",
            "pikachu":"Pikachu","oddish":"Oddish","psyduck":"Psyduck","cubone":"Cubone","goldeen":"Goldeen","natu":"Natu","axew":"Axew","joltik":"Joltik",
            "bulbasaur":"Bulbasaur","chikorita":"Chikorita","turtwig":"Turtwig","pansage":"Pansage","pansear":"Pansear","panpour":"Panpour","slowpoke":"Slowpoke",
            "darumaka":"Darumaka","karrablast":"Karrablast","squirtle":"Squirtle","totodile":"Totodile","piplup":"Piplup","abra":"Abra","doduo":"Doduo","gastly":"Gastly",
            "treecko":"Treecko","torchic":"Torchic","mudkip":"Mudkip","swablu":"Swablu","glameow":"Glameow","mimejr":"Mime Jr.","sewaddle":"Sewaddle",
            "charmander":"Charmander","cyndaquil":"Cyndaquil","chimchar":"Chimchar","corphish":"Corphish","snivy":"Snivy","tepig":"Tepig","oshawott":"Oshawott",
            "venonat":"Venonat","mankey":"Mankey","machop":"Machop","shellder":"Shellder","smoochum":"Smoochum","carvanha":"Carvanha","numel":"Numel","timburr":"Timburr",
            "ducklett":"Ducklett","vanillite":"Vanillite","ferroseed":"Ferroseed","cubchoo":"Cubchoo","shelmet":"Shelmet","yamask":"Yamask","golett":"Golett",
            "gulpin":"Gulpin","sandshrew":"Sandshrew","poliwag":"Poliwag","bellsprout":"Bellsprout","geodude":"Geodude","dratini":"Dratini","snubbull":"Snubbull",
            "remoraid":"Remoraid","larvitar":"Larvitar","baltoy":"Baltoy","snorunt":"Snorunt","bagon":"Bagon","beldum":"Beldum","bronzor":"Bronzor","gible":"Gible",
            "croagunk":"Croagunk","minccino":"Minccino","klink":"Klink","deino":"Deino","vulpix":"Vulpix","horsea":"Horsea","shroomish":"Shroomish",
            "electrike":"Electrike","shuppet":"Shuppet","duskull":"Duskull","blitzle":"Blitzle","tympole":"Tympole","foongus":"Foongus","munna":"Munna",
            "sandile":"Sandile","meowth":"Meowth","pineco":"Pineco","trapinch":"Trapinch","spheal":"Spheal","bonsly":"Bonsly","gothita":"Gothita","solosis":"Solosis",
            "ekans":"Ekans","barboach":"Barboach","paras":"Paras","chingling":"Chingling","riolu":"Riolu","purrloin":"Purrloin","mareep":"Mareep","slakoth":"Slakoth",
            "meditite":"Meditite","budew":"Budew","roggenrola":"Roggenrola","cottonee":"Cottonee","petilil":"Petilil","kirlia":"Kirlia","cherubi":"Cherubi",
            "lillipup":"Lillipup","tynamo":"Tynamo","litwick":"Litwick","nidoranfemale":"Nidoran Female","nidoranmale":"Nidoran Male","jigglypuff":"Jigglypuff",
            "taillow":"Taillow","wingull":"Wingull","surskit":"Surskit","nincada":"Nincada","diglett":"Diglett","ledyba":"Ledyba","pidove":"Pidove","shinx":"Shinx",
            "spearow":"Spearow","hoothoot":"Hoothoot","skitty":"Skitty","wynaut":"Wynaut","venipede":"Venipede","patrat":"Patrat","rattata":"Rattata","pidgey":"Pidgey",
            "spinarak":"Spinarak","marill":"Marill","hoppip":"Hoppip","slugma":"Slugma","swinub":"Swinub","smeargle":"Smeargle","bidoof":"Bidoof","zubat":"Zubat",
            "togepi":"Togepi","starly":"Starly","combee":"Combee","zigzagoon":"Zigzagoon","whismur":"Whismur","makuhita":"Makuhita","shedinja":"Shedinja","burmy":"Burmy",
            "poochyena":"Poochyena","lotad":"Lotad","seedot":"Seedot","happiny":"Happiny","cleffa":"Cleffa","sentret":"Sentret","igglybuff":"Igglybuff","wooper":"Wooper",
            "tyrogue":"Tyrogue","metapod":"Metapod","kakuna":"Kakuna","pichu":"Pichu","silcoon":"Silcoon","cascoon":"Cascoon","feebas":"Feebas","ralts":"Ralts",
            "caterpie":"Caterpie","weedle":"Weedle","wurmple":"Wurmple","kricketot":"Kricketot","azurill":"Azurill","sunkern":"Sunkern","arceus":"Arceus",
            "mewtwo":"Mewtwo","lugia":"Lugia","hooh":"Ho-Oh","dialga":"Dialga","giratina":"Giratina","palkia":"Palkia","rayquaza":"Rayquaza","reshiram":"Reshiram",
            "zekrom":"Zekrom","groudon":"Groudon","kyogre":"Kyogre","regigigas":"Regigigas","kyurem":"Kyurem","mew":"Mew","celebi":"Celebi","heatran":"Heatran",
            "cresselia":"Cresselia","darkrai":"Darkrai","deoxys":"Deoxys","genesect":"Genesect","jirachi":"Jirachi","landorus":"Landorus","latias":"Latias",
            "latios":"Latios","manaphy":"Manaphy","meloetta":"Meloetta","shaymin":"Shaymin","victini":"Victini","articuno":"Articuno","zapdos":"Zapdos",
            "moltres":"Moltres","raikou":"Raikou","entei":"Entei","suicune":"Suicune","azelf":"Azelf","cobalion":"Cobalion","keldeo":"Keldeo","mesprit":"Mesprit",
            "regice":"Regice","regirock":"Regirock","registeel":"Registeel","terrakion":"Terrakion","thundurus":"Thundurus","tornadus":"Tornadus","uxie":"Uxie",
            "virizion":"Virizion","phione":"Phione","megagarchomp":"Mega Garchomp","megametagross":"Mega Metagross","megasalamence":"Mega Salamence",
            "megatyranitar":"Mega Tyranitar","megagyarados":"Mega Gyarados","megaswampert":"Mega Swampert","megacharizardx":"Mega Charizard X",
            "megacharizardy":"Mega Charizard Y","megaaggron":"Mega Aggron","megablastoise":"Mega Blastoise","megablaziken":"Mega Blaziken","megasceptile":"Mega Sceptile",
            "megalucario":"Mega Lucario","megavenusaur":"Mega Venusaur","megagardevoir":"Mega Gardevoir","megaaerodactyl":"Mega Aerodactyl",
            "megaampharos":"Mega Ampharos","megasteelix":"Mega Steelix","megaalakazam":"Mega Alakazam","megagengar":"Mega Gengar","megahoundoom":"Mega Houndoom",
            "megascizor":"Mega Scizor","megaabomasnow":"Mega Abomasnow","megaslowbro":"Mega Slowbro","megaglalie":"Mega Glalie","megapidgeot":"Mega Pidgeot",
            "megamanectric":"Mega Manectric","megaabsol":"Mega Absol","megacamerupt":"Mega Camerupt","megaaudino":"Mega Audino","megamedicham":"Mega Medicham",
            "megabeedrill":"Mega Beedrill","megamawile":"Mega Mawile","megasableye":"Mega Sableye"
        });
        Object.assign(PP_STATS_LABEL, { "pinsir":"Pinsir", "heracross":"Heracross", "misdreavus":"Misdreavus", "spiritomb":"Spiritomb" });

        // =====================================================================
        // 43-pokepedia-sistema.js — POKÉPÉDIA: conteúdo da aba Sistema
        // =====================================================================
        // Os textos de mecânica da Poképédia oficial (idlepokemoon.com.br/
        // pokepedia/sistemas/*), reunidos como DADO estruturado — números,
        // fórmulas e tabelas fiéis à fonte (extraídos 2026-09-08). Sem DOM: é
        // uma lista de seções que o 41 desenha. Cada seção tem blocos, cada
        // bloco um título e linhas (texto puro ou "rótulo|valor" pra virar
        // tabela de duas colunas).
        // =====================================================================

        const PP_SISTEMA = [
            {
                id: 'combate', rot: 'Combate', icone: '⚔️',
                resumo: 'Como o dano é calculado na caçada e os multiplicadores.',
                blocos: [
                    { h: 'Fórmula de dano', linhas: [
                        'dano = poder do golpe × (seu ataque ÷ defesa do alvo) × vantagem de tipo × mesmo tipo × escala de nível × variação',
                        'Dano mínimo: 1 · Variação: 0,90 a 1,05'
                    ] },
                    { h: 'Multiplicadores', tabela: [
                        ['Mesmo tipo (STAB)', '×1,5'], ['Super eficaz', '×1,65'],
                        ['Dupla fraqueza', '×2,72'], ['Pouco eficaz', '×0,5'],
                        ['Dupla resistência', '×0,25'], ['Crítico', '×2 (chance 6,25%)'],
                        ['Selvagem atacando', '×1,5'], ['Shiny', '×1,2 (todos atributos e vida)'],
                        ['Clã', '+4% ou +8%']
                    ] },
                    { h: 'Diferença de nível', linhas: [
                        'Alvo acima: −1,5% dano causado e +1,5% dano recebido POR nível',
                        'Piso do dano causado: 20% · Dano recebido: sem limite'
                    ] },
                    { h: 'Velocidade', linhas: [
                        'Divide a recarga dos golpes e o intervalo entre ataques',
                        'Piso de recarga: 0,75s · Piso de intervalo: 0,5s · Intervalo base: 2,5s'
                    ] },
                    { h: 'Outros', linhas: [
                        'Golpes de apoio duram 1 hora, no máximo ×2,2',
                        'Física vs Especial é decidido pelo TIPO do golpe',
                        'Batalha por turno (Ginásio/PvP) usa regime diferente'
                    ] }
                ]
            },
            {
                id: 'golpes', rot: 'Golpes', icone: '💥',
                resumo: 'Categorias, recarga, STAB e regras de TM.',
                blocos: [
                    { h: 'Categorias', linhas: [
                        'Físicos: usam Ataque vs Defesa do alvo',
                        'Especiais: usam Atq. Especial vs Def. Especial do alvo',
                        'Status: dormir, envenenar, curar, mudar atributos'
                    ] },
                    { h: 'Quantos golpes', linhas: [
                        'Caçada: automática — o pokémon usa todos os desbloqueados por nível',
                        'Ginásio/PvP: você escolhe 4 golpes por pokémon'
                    ] },
                    { h: 'Recarga e PP', linhas: [
                        'Recarga na caçada: 1,60s a 2,50s (inverso ao poder)',
                        'Intervalo mínimo entre ataques: 1s · PP só existe em batalha de turno'
                    ] },
                    { h: 'STAB e TM', linhas: [
                        'STAB: ×1,5 quando o golpe é do mesmo tipo do pokémon',
                        'TM/HM adiciona golpe não aprendido naturalmente',
                        'Desde 12/08/2026 o golpe de TM vale também na caçada',
                        'TM tier SS (poder 225) é prêmio de Chefe Lendário'
                    ] },
                    { h: 'Números', tabela: [
                        ['Poder natural', '20 a 200'], ['Especiais criados', '150'],
                        ['Tier SS', '225'], ['Precisão dos criados', '100%']
                    ] }
                ]
            },
            {
                id: 'growth', rot: 'Qualidade & Growth', icone: '🌱',
                resumo: 'A raridade e as 6 notas que cada pokémon ganha ao nascer.',
                blocos: [
                    { h: 'Qualidade (raridade)', linhas: [
                        'Multiplicador geral dos atributos, em 7 faixas:'
                    ], tabela: [
                        ['Fraca', 'abaixo de 1,00'], ['Comum', '1,00'], ['Incomum', '1,10'],
                        ['Rara', '1,30'], ['Épica', '1,50'], ['Lendária', '1,70'], ['Mítica', '2,00']
                    ] },
                    { h: 'Growth', linhas: [
                        '6 notas separadas (Vida, Ataque, Defesa, Atq.Esp, Def.Esp, Velocidade)',
                        'Cada nota vai de 1 a 32 · cada ponto soma +2 na base do atributo'
                    ] },
                    { h: 'Fórmula de poder', linhas: [
                        'Atributo = (base da espécie + 2 × nota do Growth) × nível ÷ 100 × Qualidade [× 1,2 se shiny] + 10',
                        'A Qualidade entra duas vezes, então amplifica muito os raros'
                    ] },
                    { h: 'Peso do Growth', linhas: [
                        'Base baixa (Diglett): até 6,2× entre nota 1 e 32',
                        'Base alta (Mewtwo): só 1,4× entre nota 1 e 32'
                    ] }
                ]
            },
            {
                id: 'natures', rot: 'Natures', icone: '🧭',
                resumo: 'Sobe 10% de um atributo, desce 10% de outro. HP nunca é afetado.',
                blocos: [
                    { h: '25 naturezas (20 ativas + 5 neutras)', tabela: [
                        ['Lonely', '+Ataque / −Defesa'], ['Brave', '+Ataque / −Velocidade'],
                        ['Adamant', '+Ataque / −Atq.Esp'], ['Naughty', '+Ataque / −Def.Esp'],
                        ['Bold', '+Defesa / −Ataque'], ['Relaxed', '+Defesa / −Velocidade'],
                        ['Impish', '+Defesa / −Atq.Esp'], ['Lax', '+Defesa / −Def.Esp'],
                        ['Timid', '+Velocidade / −Ataque'], ['Hasty', '+Velocidade / −Defesa'],
                        ['Jolly', '+Velocidade / −Atq.Esp'], ['Naive', '+Velocidade / −Def.Esp'],
                        ['Modest', '+Atq.Esp / −Ataque'], ['Mild', '+Atq.Esp / −Defesa'],
                        ['Quiet', '+Atq.Esp / −Velocidade'], ['Rash', '+Atq.Esp / −Def.Esp'],
                        ['Calm', '+Def.Esp / −Ataque'], ['Gentle', '+Def.Esp / −Defesa'],
                        ['Sassy', '+Def.Esp / −Velocidade'], ['Careful', '+Def.Esp / −Atq.Esp'],
                        ['Hardy · Docile · Serious · Bashful · Quirky', 'neutras']
                    ] },
                    { h: 'Regra', linhas: ['HP nunca é afetado por nenhuma nature.'] }
                ]
            },
            {
                id: 'habilidades', rot: 'Habilidades', icone: '✨',
                resumo: 'Efeito passivo permanente. Uma por pokémon.',
                blocos: [
                    { h: 'O que são', linhas: [
                        'Efeito passivo o tempo todo, sem gastar turno nem ocupar slot de golpe',
                        'Cada pokémon tem 1 habilidade · 164 no total (gen 5), 144 ativas em algum motor'
                    ] },
                    { h: 'Obter e trocar', linhas: [
                        'Revelação inicial: grátis, dá a habilidade canônica da espécie',
                        'Espécie com duas canônicas: sorteia entre as duas',
                        'Ocultas: só saem no giro (as mais raras)',
                        'Giro de troca: 5.000.000 + 50 stones'
                    ] },
                    { h: 'Por motor', tabela: [
                        ['Caçada', 'tempo contínuo, sem turnos'],
                        ['Ginásio', 'por turno, status completo'],
                        ['Boss', 'por turno, chefe imune a status/debuff'],
                        ['Indicadores', '✅ completo · ⚠️ em parte · ⛔ nada']
                    ] }
                ]
            },
            {
                id: 'pergaminho', rot: 'Pergaminho de IV', icone: '📜',
                resumo: 'Regira a nota de um atributo. Só 2 atributos por pokémon, pra sempre.',
                blocos: [
                    { h: 'Regra', linhas: [
                        'Cada pokémon nasce com nota 1 a 32 em cada um dos 6 atributos',
                        'No máximo 2 atributos DIFERENTES girados na vida inteira',
                        'Os outros 4 ficam definitivos — nenhum Pergaminho encosta neles',
                        'Você vê o resultado antes de decidir (confirma com Ficar)'
                    ] },
                    { h: 'Chances da roleta', tabela: [
                        ['1 a 10', '35%'], ['11 a 16', '30%'], ['17 a 22', '20%'],
                        ['23 a 28', '10%'], ['29 a 31', '4%'], ['32', '1%']
                    ] },
                    { h: 'Custo', linhas: [
                        'Consome o item ao girar · a vaga de reuso só se gasta ao confirmar',
                        'Fonte: exclusivamente Chefes Lendários'
                    ] }
                ]
            },
            {
                id: 'boost', rot: 'Boost', icone: '⬆️',
                resumo: '+1 nível efetivo de força e vida por boost, até +100.',
                blocos: [
                    { h: 'Como funciona', linhas: [
                        'Cada boost dá +1 nível efetivo de força e vida, até +100',
                        'Golpe não entra: o boost não libera ataques mais cedo'
                    ] },
                    { h: 'Custo por faixa', tabela: [
                        ['+1 a +25', 'grátis (0 💎)'], ['+26 a +100', '1 💎 por nível'],
                        ['Gold', '1.000.000 a 5.000.000 por faixa'], ['Stones', '1-2 até 9-10 por faixa']
                    ] },
                    { h: 'Total +0 → +100', tabela: [
                        ['Diamantes', '75 💎'], ['Gold', '300.000.000'], ['Stones', '550']
                    ] }
                ]
            },
            {
                id: 'ginasio', rot: 'Ginásio', icone: '🥊',
                resumo: '18 líderes, 6 faixas. Tudo em nível 100.',
                blocos: [
                    { h: 'Estrutura', linhas: [
                        '18 líderes em 6 faixas de 3 · cada líder tem tipo temático e insígnia',
                        'Progressão linear: só passa de faixa vencendo todos da atual'
                    ] },
                    { h: 'Requisitos', linhas: [
                        'Pokémon nível 100 (piso) · treinador no nível da faixa (100/200/300/400/500/600)',
                        'Time até 6, sem repetir espécie · Ditto proibido (inclusive shiny)',
                        'Sem custo, tentativas ilimitadas'
                    ] },
                    { h: 'Batalha', tabela: [
                        ['Nível', 'ambos em 100'], ['Vantagem de tipo', '×2 (×4 dupla)'],
                        ['STAB', '×1,5'], ['Crítico', '6,25% · ×1,5'], ['Multiplicador geral', '×1,75']
                    ] },
                    { h: 'Recompensas', linhas: [
                        '1ª vitória por líder: insígnia + 5 Chaves de Boss + 2 Pergaminhos + TM',
                        'Fechar os 18: 15 Chaves de Boss + 5 Pergaminhos'
                    ] },
                    { h: 'Bônus das insígnias', tabela: [
                        ['Chave de Boss', '+2% por insígnia (+36% com 18)'],
                        ['TM', '×1,05 por insígnia (multiplicativo)']
                    ] }
                ]
            },
            {
                id: 'clas', rot: 'Clãs', icone: '🛡️',
                resumo: '9 clãs por afinidade de tipo. +8%/+4% força e velocidade.',
                blocos: [
                    { h: 'Regras', linhas: [
                        '9 grupos fixos (diferente de guilda) · nível 80 pra entrar/trocar',
                        'Primeira escolha grátis · trocar custa 10 💎',
                        'Com pokémon ativo do tipo do clã: +8% força e +8% velocidade',
                        'Sem tipo correspondente: +4% e +4% · não empilha (muda de patamar)'
                    ] },
                    { h: 'Os 9 clãs', tabela: [
                        ['Seavell', 'Água, Gelo'], ['Naturia', 'Planta, Inseto, Venenoso'],
                        ['Volcanic', 'Fogo'], ['Wingeon', 'Voador, Dragão'],
                        ['Raibolt', 'Elétrico'], ['Orebound', 'Pedra, Terra, Aço'],
                        ['Malefic', 'Fantasma, Sombrio, Venenoso'], ['Gardestrike', 'Lutador, Normal'],
                        ['Psycraft', 'Psíquico, Fada']
                    ] }
                ]
            },
            {
                id: 'guildas', rot: 'Guildas', icone: '🤝',
                resumo: 'Criadas por jogadores. Até 25, +1% XP por nível (máx +40%).',
                blocos: [
                    { h: 'Criação', linhas: [
                        'Fundar custa 10 💎, sem requisito de nível · nome até 24 letras',
                        'TAG de 2-4 caracteres · limite 25 vagas'
                    ] },
                    { h: 'Cargos', tabela: [
                        ['Líder', 'transfere, dissolve, muda cargos'],
                        ['Oficial', 'convida, expulsa, brasão e TAG'],
                        ['Membro', 'sem permissões']
                    ] },
                    { h: 'Benefícios e níveis', linhas: [
                        '+1% de XP por nível da guilda (máx +40% no nível 40)',
                        'TAG colorida, brasão próprio, rankings de poder e nível',
                        'Progressão do nível 1 ao 40 por contribuição cumulativa'
                    ] },
                    { h: 'Contribuição', tabela: [
                        ['Caçar', '1 ponto / 1.200.000 XP'], ['Shiny', '5.000 pontos'],
                        ['Boss diário', '200 (derrota) / 400 (vitória)'],
                        ['Doações semanais', 'até 10.000.000 gold ou 10 💎 por membro']
                    ] }
                ]
            }
        ];

})();
