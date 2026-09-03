    // =====================================================
    const META_POKEMON_DB = {
      'venusaur': {
        role: '🌾 Fast Farmer & Anti-Fada / Água',
        held: '🌿 Miracle Seed / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Venom Cascade (Lv 100)', stab: true, type: 'Venenoso', dps: '100.0/s' },
          { name: 'Thunderbolt [TM24]', stab: false, type: 'Elétrico', dps: '63.3/s' },
          { name: 'Petal Dance (Lv 86)', stab: true, type: 'Planta', dps: '60.0/s' },
          { name: 'Seed Bomb (Lv 45)', stab: true, type: 'Planta', dps: '53.3/s' }
        ]
      },
      'golurk': {
        role: '🤖 Nuke Físico de Boss & Caça',
        held: '🥋 Expert Belt / 🥊 Muscle Band',
        tierBase: 'S',
        moves: [
          { name: 'Earthquake (Lv 81)', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Dynamic Punch (Lv 70)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Hammer Arm (Lv 89)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Shadow Punch (Lv 30)', stab: true, type: 'Fantasma', dps: '40.0/s' }
        ]
      },
      'swampert': {
        role: '🐸 Bruiser Água/Terra Anti-Elétrico',
        held: '🌊 Mystic Water / 🍎 Leftovers',
        tierBase: 'S',
        moves: [
          { name: 'Earthquake [TM26]', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Waterfall [TM98]', stab: true, type: 'Água', dps: '53.3/s' },
          { name: 'Ice Beam [TM13]', stab: false, type: 'Gelo', dps: '60.0/s' },
          { name: 'Hammer Arm (Lv 69)', stab: false, type: 'Lutador', dps: '66.7/s' }
        ]
      },
      'regirock': {
        role: '🗿 Tanque Supremo de Boss & Gym',
        held: '🪨 Hard Stone / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Stone Edge (Lv 81)', stab: true, type: 'Pedra', dps: '66.7/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Hammer Arm (Lv 43)', stab: false, type: 'Lutador', dps: '66.7/s' },
          { name: 'Drain Punch [TM]', stab: false, type: 'Lutador', dps: '50.0/s' }
        ]
      },
      'chandelure': {
        role: '🔥 Nuke Especial Destruidor de Boss',
        held: '🔥 Charcoal / 👓 Choice Specs',
        tierBase: 'S+',
        moves: [
          { name: 'Shadow Ball [TM30]', stab: true, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Flamethrower [TM35]', stab: true, type: 'Fogo', dps: '60.0/s' },
          { name: 'Energy Ball [TM53]', stab: false, type: 'Planta', dps: '60.0/s' },
          { name: 'Psychic [TM29]', stab: false, type: 'Psíquico', dps: '60.0/s' }
        ]
      },
      'garchomp': {
        role: '🐉 Fast Sweeper Físico Meta',
        held: '🔥 Life Orb / 🥊 Muscle Band',
        tierBase: 'S+',
        moves: [
          { name: 'Outrage (Lv 82)', stab: true, type: 'Dragão', dps: '80.0/s' },
          { name: 'Earthquake (Lv 40)', stab: true, type: 'Terra', dps: '66.7/s' },
          { name: 'Stone Edge [TM71]', stab: false, type: 'Pedra', dps: '66.7/s' },
          { name: 'Fire Fang (Lv 1)', stab: false, type: 'Fogo', dps: '43.3/s' }
        ]
      },
      'hydreigon': {
        role: '🐲 Special Sweeper Levitate',
        held: '👓 Choice Specs / 🔥 Life Orb',
        tierBase: 'S+',
        moves: [
          { name: 'Dragon Pulse (Lv 55)', stab: true, type: 'Dragão', dps: '56.7/s' },
          { name: 'Dark Pulse [TM97]', stab: true, type: 'Sombrio', dps: '53.3/s' },
          { name: 'Flamethrower [TM35]', stab: false, type: 'Fogo', dps: '60.0/s' },
          { name: 'Earth Power [TM]', stab: false, type: 'Terra', dps: '60.0/s' }
        ]
      },
      'gengar': {
        role: '👻 Special Fast Sweeper',
        held: '👓 Choice Specs / 🔥 Life Orb',
        tierBase: 'S+',
        moves: [
          { name: 'Shadow Ball [TM30]', stab: true, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Sludge Bomb [TM36]', stab: true, type: 'Venenoso', dps: '60.0/s' },
          { name: 'Focus Blast [TM52]', stab: false, type: 'Lutador', dps: '80.0/s' },
          { name: 'Thunderbolt [TM24]', stab: false, type: 'Elétrico', dps: '63.3/s' }
        ]
      },
      'gyarados': {
        role: '🌊 Physical Dragon Bruiser',
        held: '🔥 Life Orb / 🥊 Muscle Band',
        tierBase: 'S',
        moves: [
          { name: 'Waterfall [TM98]', stab: true, type: 'Água', dps: '53.3/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Ice Fang (Lv 32)', stab: false, type: 'Gelo', dps: '43.3/s' },
          { name: 'Crunch (Lv 41)', stab: false, type: 'Sombrio', dps: '53.3/s' }
        ]
      },
      'alakazam': {
        role: '🔮 Special Nuker de Velocidade',
        held: '👓 Choice Specs / 🥋 Focus Sash',
        tierBase: 'S',
        moves: [
          { name: 'Psychic [TM29]', stab: true, type: 'Psíquico', dps: '60.0/s' },
          { name: 'Shadow Ball [TM30]', stab: false, type: 'Fantasma', dps: '53.3/s' },
          { name: 'Focus Blast [TM52]', stab: false, type: 'Lutador', dps: '80.0/s' },
          { name: 'Energy Ball [TM53]', stab: false, type: 'Planta', dps: '60.0/s' }
        ]
      },
      'tyranitar': {
        role: '🦖 Tank & Sweeper Pesado',
        held: '🥋 Choice Band / 🍎 Leftovers',
        tierBase: 'S+',
        moves: [
          { name: 'Stone Edge (Lv 73)', stab: true, type: 'Pedra', dps: '66.7/s' },
          { name: 'Crunch (Lv 47)', stab: true, type: 'Sombrio', dps: '53.3/s' },
          { name: 'Earthquake [TM26]', stab: false, type: 'Terra', dps: '66.7/s' },
          { name: 'Fire Punch [TM]', stab: false, type: 'Fogo', dps: '50.0/s' }
        ]
      },
      'machamp': {
        role: '🥊 Physical Fighter Nuke',
        held: '🥊 Muscle Band / 🔥 Flame Orb',
        tierBase: 'S',
        moves: [
          { name: 'Dynamic Punch (Lv 51)', stab: true, type: 'Lutador', dps: '66.7/s' },
          { name: 'Stone Edge [TM71]', stab: false, type: 'Pedra', dps: '66.7/s' },
          { name: 'Knock Off [TM]', stab: false, type: 'Sombrio', dps: '43.3/s' },
          { name: 'Bullet Punch (Lv 1)', stab: false, type: 'Aço', dps: '26.7/s' }
        ]
      }
    };

    let avaliadorPokesCache = [];

    function atualizarSelectContasAvaliador() {
      const select = document.getElementById('eval-filter-conta');
      if (!select) return;

      const valorAtual = select.value;
      let html = `<option value="all">⭐ Todas as ${totalContas} Contas</option>`;
      for (let i = 0; i < totalContas; i++) {
        const nome = nomesAbas[i] || `Conta ${i + 1}`;
        html += `<option value="${i}">👑 Conta ${i + 1} (${nome})</option>`;
      }
      select.innerHTML = html;

      // Preserva o filtro selecionado se ainda for válido
      if (valorAtual === 'all' || (parseInt(valorAtual) >= 0 && parseInt(valorAtual) < totalContas)) {
        select.value = valorAtual;
      } else {
        select.value = 'all';
      }

      // Atualiza a badge do topo
      const badge = document.getElementById('eval-header-multicontas-badge');
      if (badge) {
        badge.textContent = `${totalContas}x MULTI-CONTAS`;
      }

      // Espelha pro select v2 (mesmas opções, mesmo valor)
      const select2 = document.getElementById('v2-eval-filter-conta');
      if (select2) {
        const valorAtual2 = select2.value;
        select2.innerHTML = html;
        select2.value = (valorAtual2 === 'all' || (parseInt(valorAtual2) >= 0 && parseInt(valorAtual2) < totalContas)) ? valorAtual2 : 'all';
      }
      const badge2 = document.getElementById('v2-eval-header-multicontas-badge');
      if (badge2) badge2.textContent = `${totalContas}x`;
    }

    function abrirModalAvaliadorMeta() {
      const m = document.getElementById('modal-avaliador-meta');
      if (!m) return;
      m.classList.add('active');
      atualizarSelectContasAvaliador();
      atualizarAvaliadorMeta(false);
    }

    function fecharModalAvaliadorMeta() {
      const m = document.getElementById('modal-avaliador-meta');
      if (m) m.classList.remove('active');
    }

    // =====================================================================
    // PONTUAÇÃO — alinhada com os números do próprio jogo
    // =====================================================================
    // Auditado contra idlepokemoon.com.br (api/state, api/tiers, app-1.js).
    // O jogo entrega, por Pokémon, TRÊS eixos de qualidade independentes:
    //
    //   1. `iv` (0 … 2.5)  → multiplicador de raridade. api/tiers.html mapeia
    //      a faixa pro nome: Fraca <1 · Comum <1.1 · Incomum <1.3 · Rara <1.5
    //      · Épica <1.7 · Lendária <2 · Mítica <2.5. É rolado na captura e
    //      NUNCA muda. Regressão em 112 Bulbasaurs Lv.1 do state real:
    //          power ≈ -43.6 + 91.56*iv + 0.0797*growthTotal   (erro médio 1.0)
    //      ou seja: o iv é o que manda no power.
    //   2. `growthTotal` / `growthTotalMax` (o jogo chama isso de "IV (Growth)")
    //      → 6 stats de 0 a `growthMax` (32), total 192. Também é rolado na
    //      captura. Pesa pouco em nível baixo e MUITO em nível alto (no
    //      Venusaur Lv.409 do state, `growthBonus.def` = 688 de 1745 de DEF).
    //   3. `tier` da ESPÉCIE (S/A/B/C) → vem pronto do servidor,
    //      "poder da espécie medido no alvo neutro" (tierTagHTML, app-1.js).
    //
    // E entrega o resultado já calculado: `power` e `dps`.
    //
    // A fórmula ANTERIOR usava só o growth (+ bônus fixos de shiny/lendário/
    // boost + um DB de 15 espécies escrito à mão) e ignorava iv, tier, power e
    // dps. Consequência medida no state real: um Bulbasaur Lv.1 de growth 87%
    // era pontuado "S 87%" enquanto um Chandelure Lv.220 saía abaixo — sendo
    // que o Chandelure faz 23.871 de DPS contra 30 do Bulbasaur.
    //
    // Agora existem DUAS notas, porque são duas perguntas diferentes:
    //   • `power` / `dps` → "quem bate mais AGORA". Número do jogo, sem modelo.
    //   • `score` (Ficha) → "de N cópias que eu cacei, qual vale criar".
    //     Independente de nível, feito só dos dois atributos rolados na captura.
    const IV_MAX_JOGO = 2.5;                 // api/tiers.html → "ivMax": 2.5
    const TIER_JOGO_PESO = { S: 100, A: 75, B: 50, C: 25 };

    // Peso entre os dois eixos rolados na captura.
    //
    // Calibrado contra os 56 Bulbasaur Lv.1 do state real (mesma espécie e
    // mesmo nível ⇒ `power` é a verdade absoluta). Correlação de postos entre
    // a nota e o `power` do jogo, variando o peso:
    //     100% growth (fórmula ANTIGA) → -0,109   ← pior que sorteio
    //      50/50                       → +0,436
    //      75/25  (escolhido)          → +0,87
    //      90/10                       → +0,971
    // O ótimo medido é ~90% IV, MAS isso vale pra Lv.1, onde o growth quase não
    // entra na conta. Em nível alto ele vira ~40% dos stats (Venusaur Lv.409 do
    // state: growthBonus.def 688 de 1745 de DEF), e não há no state amostra de
    // cópias variadas em nível alto pra medir esse extremo. 75/25 é o meio-termo
    // deliberado: quase ótimo hoje, sem zerar o eixo que cresce depois.
    //
    // Pra comparação EXATA entre cópias do mesmo nível, ordene por Power/DPS —
    // são números do próprio jogo e não passam por este peso.
    const PESO_IV = 0.75;
    const PESO_GROWTH = 0.25;

    // Quando a espécie não está no META_POKEMON_DB (15 de 151+), o fallback
    // antigo era um placeholder fixo ("Golpe Principal STAB", "Cobertura 1"…)
    // que não dizia nada. O jogo manda o moveset recomendado dele em `wm`
    // (só no card cheio — time/ativo; a box vem leve, sem esse campo).
    function montarMetaGenerica(pk, tier) {
      const tipos = [pk.type1, pk.type2].filter(t => t && t !== 'none');
      const wm = Array.isArray(pk.wm) ? pk.wm : [];
      const moves = wm.length
        ? wm.map((nome, i) => ({ name: String(nome).split(/\s+/).join(' '), stab: i === 0, type: 'Recomendado do jogo', dps: '—' }))
        : [{ name: 'Moveset só aparece no time (box vem sem)', stab: false, type: '—', dps: '—' }];
      return {
        role: tipos.length ? ('⚔️ ' + tipos.join(' / ')) : '⚔️ Combatente Padrão',
        held: pk.heldNome ? ('🧤 ' + pk.heldNome + ' T' + (pk.heldTier || 1)) : 'sem item segurado',
        tierBase: tier,
        moves: moves
      };
    }

    function calcularFichaPoke(pk) {
      const gTotal = (pk.growthTotal != null)
        ? Number(pk.growthTotal)
        : (pk.growth ? Object.values(pk.growth).reduce((a, b) => a + Number(b || 0), 0) : null);
      const gMax = Number(pk.growthTotalMax) || 192;
      // O jogo já manda growthPct pronto; só recalculamos se ele não veio.
      const gPct = (pk.growthPct != null)
        ? Number(pk.growthPct)
        : (gTotal != null ? Math.round((gTotal / gMax) * 100) : null);

      const iv = Number(pk.iv) || 0;
      const ivPct = Math.max(0, Math.min(100, Math.round((iv / IV_MAX_JOGO) * 100)));

      // Nota da ficha: só o que foi rolado na captura e não muda mais.
      // Sem clamp em 100 artificial — é média ponderada de dois 0..100, então
      // já nasce na faixa certa (a fórmula antiga estourava 100 e achatava
      // vários Pokémon distintos no mesmo "100%", justo no topo do ranking).
      const ficha = (gPct != null)
        ? Math.round(PESO_IV * ivPct + PESO_GROWTH * gPct)
        : ivPct;

      return { gTotal, gMax, gPct, iv, ivPct, ficha };
    }

    async function atualizarAvaliadorMeta(forceRefresh = false) {
      atualizarSelectContasAvaliador();
      if (forceRefresh || !inventariosContas.some(inv => inv && inv.pokes && inv.pokes.length)) {
        await carregarInventariosTradeHub();
      }

      const todosPokes = [];
      const contagemEspecies = {};

      for (let contaIdx = 0; contaIdx < totalContas; contaIdx++) {
        const inv = inventariosContas[contaIdx];
        if (!inv || !inv.pokes) continue;

        inv.pokes.forEach(pk => {
          const nomeClean = (pk.name || '').toLowerCase().trim();
          contagemEspecies[nomeClean] = (contagemEspecies[nomeClean] || 0) + 1;

          const { gTotal, gMax, gPct, iv, ivPct, ficha } = calcularFichaPoke(pk);

          let growthDesc = '';
          if (pk.growth && typeof pk.growth === 'object') {
            const g = pk.growth;
            growthDesc = `HP ${g.hp || 0} • Atk ${g.atk || 0} • Def ${g.def || 0} • SpA ${g.spa || 0} • SpD ${g.spd || 0} • Vel ${g.spe || g.vel || 0}`;
          }

          // O tier é o da ESPÉCIE, vindo do jogo (S/A/B/C). Se a ficha veio de
          // um build antigo do coletor (sem tierJogo), cai no DB local e, em
          // último caso, em 'C' — mas nunca mais inventamos "S+", que não
          // existe na escala do jogo.
          const metaInfo = META_POKEMON_DB[nomeClean];
          const tier = pk.tierJogo
            || (metaInfo && metaInfo.tierBase === 'S+' ? 'S' : (metaInfo && metaInfo.tierBase))
            || 'C';
          const scoreFinal = ficha;

          todosPokes.push({
            id: pk.id,
            name: pk.name,
            cleanName: nomeClean,
            level: pk.level || 1,
            shiny: !!pk.shiny,
            legendary: !!pk.legendary,
            boost: pk.boost || 0,
            rarity: pk.rarity || 'Comum',
            iv: iv,
            ivPct: ivPct,
            power: Number(pk.power || 0),
            dps: Number(pk.dps || 0),
            speed: Number(pk.speed || 0),
            boostMax: Number(pk.boostMax || 100),
            hab: pk.hab || null,
            type1: pk.type1 || '',
            type2: pk.type2 || '',
            held: pk.held || null,
            heldNome: pk.heldNome || null,
            heldTier: pk.heldTier != null ? pk.heldTier : null,
            wm: Array.isArray(pk.wm) ? pk.wm : [],
            growthTotal: gTotal,
            growthTotalMax: gMax,
            growthPct: gPct,
            growthDesc: growthDesc,
            growth: pk.growth || null,   // objeto cru {hp,atk,def,spa,spd,spe} pros chips por stat
            growthMax: Number(pk.growthMax || 32),  // teto por stat (shell/25 já traz do jogo)
            nature: pk.nature || '',
            natureTxt: pk.natureTxt || '',
            stats: pk.stats || null,
            moves: pk.moves || [],
            locked: !!pk.locked,
            sell: pk.sell || 0,
            aura: pk.aura || null,
            catchInfo: pk.catchInfo || '',
            isTeam: !!pk.isTeam,
            contaIdx: contaIdx,
            contaNome: nomesAbas[contaIdx] || `Conta ${contaIdx + 1}`,
            score: scoreFinal,
            tier: tier,
            meta: metaInfo || montarMetaGenerica(pk, tier)
          });
        });
      }

      // Determina quais são as melhores cópias de cada espécie
      const melhorScorePorEspecie = {};
      todosPokes.forEach(p => {
        if (!melhorScorePorEspecie[p.cleanName] || p.score > melhorScorePorEspecie[p.cleanName].score || (p.score === melhorScorePorEspecie[p.cleanName].score && p.level > melhorScorePorEspecie[p.cleanName].level)) {
          melhorScorePorEspecie[p.cleanName] = p;
        }
      });

      todosPokes.forEach(p => {
        p.totalCopias = contagemEspecies[p.cleanName] || 1;
        p.isMelhorCopia = (p.totalCopias > 1 && melhorScorePorEspecie[p.cleanName] && melhorScorePorEspecie[p.cleanName].id === p.id);
        p.isDuplicataInferior = (p.totalCopias > 1 && !p.isMelhorCopia);
      });

      // RANKING — posição por score (desempate: growth, depois level). Dois
      // rankings, porque respondem perguntas diferentes:
      //   rankGeral   → onde este poke está no acervo inteiro das contas
      //   rankEspecie → qual cópia desta espécie ele é (o que decide o que vender)
      // Empate de ficha entre espécies diferentes: quem for de tier melhor
      // (poder de espécie, do jogo) vem antes; depois desempata por growth.
      const porScore = (a, b) =>
        (b.score - a.score)
        || ((TIER_JOGO_PESO[b.tier] || 0) - (TIER_JOGO_PESO[a.tier] || 0))
        || ((b.growthTotal || 0) - (a.growthTotal || 0))
        || ((b.level || 0) - (a.level || 0));

      todosPokes.slice().sort(porScore).forEach((p, i) => {
        p.rankGeral = i + 1;
        p.rankGeralTotal = todosPokes.length;
      });

      // Ranking "quem bate mais AGORA" — dps é número do próprio jogo, então
      // aqui não tem modelo nenhum no meio. É a resposta pra "qual eu boto pra
      // farmar hoje", enquanto o rankGeral responde "qual vale criar".
      todosPokes.slice()
        .sort((a, b) => (b.dps - a.dps) || (b.power - a.power) || (b.level - a.level))
        .forEach((p, i) => { p.rankDps = i + 1; });

      const porEspecie = {};
      todosPokes.forEach(p => { (porEspecie[p.cleanName] = porEspecie[p.cleanName] || []).push(p); });
      Object.values(porEspecie).forEach(lista => {
        lista.slice().sort(porScore).forEach((p, i) => {
          p.rankEspecie = i + 1;
          p.rankEspecieTotal = lista.length;
        });
      });

      avaliadorPokesCache = todosPokes;
      
      const totalEl = document.getElementById('eval-stat-total');
      if (totalEl) totalEl.textContent = `${todosPokes.length} Pokémon Analisados`;
      const totalEl2 = document.getElementById('v2-eval-stat-total');
      if (totalEl2) totalEl2.textContent = `${todosPokes.length} Pokémon`;

      renderizarAvaliadorMeta();
    }

    // === GERENCIAMENTO DE SELEÇÃO EM MASSA (AVALIADOR META) ===
