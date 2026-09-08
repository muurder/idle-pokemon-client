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
