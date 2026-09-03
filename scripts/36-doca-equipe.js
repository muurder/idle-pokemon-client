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
