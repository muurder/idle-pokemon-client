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
