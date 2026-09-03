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
