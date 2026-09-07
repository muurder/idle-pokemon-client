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
// NUNCA edite bug-test-suite.gerado.tampermonkey.js na raiz!
// =====================================================================

(function () {
    'use strict';

    console.log('%c[BUG SUITE] Tampermonkey script carregado', 'color:#facc15;font-weight:bold');

    // Evita injetar duas vezes (reloads agendados pelo próprio script)
    if (window.__bugSuiteCarregado) return;
    window.__bugSuiteCarregado = true;


    (function () {   // docas: bloco isolado, fora do bugSuite()

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
            // Perf: Não executa em background
            if (document.hidden) return;

            const aberta = docaInvBagAberta();
            const doca = _docaInv;

            // Perf: Se a mochila não está aberta e a doca já está fechada, não gasta CPU nem mexe no DOM
            if (!aberta && (!doca || !doca.aberta())) return;

            // Segue tentando envelopar e observar: no reload o jogo redefine
            // openBag e remonta o modal, levando envelope e observador junto.
            docaInvEnvelopar();
            docaInvObservarModal();
            // O #modal-body existe desde o play.html, mas se por algum motivo
            // ainda não estiver lá, o tick tenta de novo — a função é idempotente.
            docaInvLigarSlotsDoJogo();
            if (_docaInv) docaCederAoJogo(_docaInv.el);
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


    })();

})();
