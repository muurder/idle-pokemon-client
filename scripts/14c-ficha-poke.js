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
