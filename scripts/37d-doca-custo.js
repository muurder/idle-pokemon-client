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
