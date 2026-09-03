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
