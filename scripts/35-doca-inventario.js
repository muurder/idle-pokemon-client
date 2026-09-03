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
