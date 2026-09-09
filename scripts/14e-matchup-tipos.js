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
