    // === CENTRAL DE TRADE 4X DIRETO & COORDENAÇÃO DE CONTAS ===
    // =====================================================
    let tradeMainTarget = parseInt(localStorage.getItem('idlePokemonTradeMainTarget') || '0');
    let inventariosContas = [null, null, null, null];
    let tradeOrigemIndex = 1;
    let tradeDestinoIndex = 0;
    let tradeCategoriaAtiva1 = 'all';
    let tradeCategoriaAtiva2 = 'all';
    let tradeOferta1 = { items: {}, pokes: [], gold: 0 };
    let tradeOferta2 = { items: {}, pokes: [], gold: 0 };

    const STONES_HELDS_KEYWORDS = ['stone', 'band', 'specs', 'scarf', 'sash', 'orb', 'eviolite', 'share', 'egg', 'bell', 'brace', 'weight', 'belt', 'lens', 'anklet', 'miracle', 'charcoal', 'mystic', 'magnet', 'hard_stone', 'sharp_beak', 'poison_barb', 'soft_sand', 'silk', 'silver', 'spell_tag', 'metal_coat', 'dragon_scale', 'king_rock', 'upgrade', 'disc', 'prism', 'reaper', 'protector', 'electirizer', 'magmarizer', 'dubious', 'oval', 'leaf', 'fire', 'water', 'thunder', 'moon', 'sun', 'shiny', 'dusk', 'dawn', 'ice'];
    const BALLS_POTIONS_KEYWORDS = ['ball', 'potion', 'revive', 'ether', 'elixir', 'small', 'great', 'hyper', 'ultra', 'premier', 'master', 'moon'];
    async function executarAcaoTradeNoWebview(wv, action, params = {}) {
      if (!wv) return { ok: false, error: 'Webview não encontrada' };
      try {
        const execPromise = wv.executeJavaScript(`
          (async function() {
            try {
              let tok = '';
              try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
              if (!tok || tok.length < 10) {
                try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
              }
              if (!tok || tok.length < 10) {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
              }
              if (!tok) return { ok: false, error: 'Token de autenticação não encontrado nesta aba' };

              const body = { token: tok, action: ${JSON.stringify(action)}, ...${JSON.stringify(params)} };
              const r = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const j = await r.json().catch(() => ({}));
              if (!r.ok || j.err || j.error) {
                return { ok: false, error: j.err || j.error || ('HTTP ' + r.status), data: j };
              }
              if (j.state) {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w.handleStateUpdate === 'function') {
                  try { w.handleStateUpdate(j.state); } catch(e){}
                }
                w.K = j.state;
                w.__gameState = j.state;
              }
              return { ok: true, state: j.state, data: j };
            } catch(err) {
              return { ok: false, error: err.message };
            }
          })()
        `);

        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'Timeout de comunicação com o jogo (6s)' }), 6000));
        const res = await Promise.race([execPromise, timeoutPromise]);
        return res || { ok: false, error: 'Sem resposta' };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    async function carregarInventariosTradeHub() {
      tradeLog(`🔄 Lendo dados e inventários de ${totalContas} contas via API /api/state...`, '#38bdf8');
      for (let i = 0; i < totalContas; i++) {
        const wv = webviews[i];
        if (!wv) continue;
        try {
          const inv = await wv.executeJavaScript(`
            (async function() {
              try {
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
                if (!tok || tok.length < 10) {
                  try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
                }
                if (!tok || tok.length < 10) {
                  const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                  tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
                }

                let s = null;
                if (tok) {
                  try {
                    const res = await fetch('/api/state?token=' + encodeURIComponent(tok)).then(r => r.json()).catch(() => null);
                    if (res && res.state) {
                      s = res.state;
                      const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                      w.K = s;
                      w.__gameState = s;
                    }
                  } catch(e){}
                }

                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (!s) {
                  s = (w.gameState && (w.gameState.player || w.gameState.bag || w.gameState.box)) ? w.gameState : ((w.K && (w.K.player || w.K.bag || w.K.box)) ? w.K : (w.qState || w.state || {}));
                }
                const p = (s && s.player) || (w.K && w.K.player) || (w.gameState && w.gameState.player) || s || {};

                const bagList = [];
                const bagMap = new Map();

                // 1. Itens da Mochila (s.bag)
                const rawBag = (s && s.bag) || (w.K && w.K.bag) || (p && p.bag) || [];
                if (Array.isArray(rawBag)) {
                  rawBag.forEach(it => {
                    if (it && it.name) {
                      const count = Number(it.count || it.qty || it.amount || 1);
                      const bound = Number(it.bound || 0);
                      const freeCount = count - bound;
                      if (freeCount > 0) {
                        const nLower = it.name.toLowerCase();
                        const cat = nLower.includes('stone') ? 'stone' : (nLower.includes('ball') ? 'ball' : 'item');
                        bagMap.set(it.name, {
                          name: it.name,
                          key: it.name,
                          cat: cat,
                          count: freeCount,
                          bound: bound,
                          price: Number(it.price || 0),
                          type: it.type || cat
                        });
                      }
                    }
                  });
                }

                // 2. Pokéballs (s.balls)
                const rawBalls = (s && s.balls) || (w.K && w.K.balls) || (p && p.balls) || {};
                if (rawBalls && typeof rawBalls === 'object') {
                  Object.keys(rawBalls).forEach(bKey => {
                    const count = Number(rawBalls[bKey]);
                    if (count > 0) {
                      let ballName = bKey.trim();
                      if (!ballName.toLowerCase().includes('ball')) ballName = ballName + ' ball';
                      ballName = ballName.charAt(0).toUpperCase() + ballName.slice(1);
                      if (!bagMap.has(ballName)) {
                        bagMap.set(ballName, {
                          name: ballName,
                          key: bKey,
                          cat: 'ball',
                          count: count,
                          bound: 0,
                          price: 0,
                          type: 'ball'
                        });
                      }
                    }
                  });
                }

                // 3. Poções (s.potions)
                const rawPots = (s && s.potions) || (w.K && w.K.potions) || (p && p.potions) || {};
                if (rawPots && typeof rawPots === 'object') {
                  Object.keys(rawPots).forEach(pKey => {
                    const count = Number(rawPots[pKey]);
                    if (count > 0) {
                      let potName = pKey.trim();
                      potName = potName.charAt(0).toUpperCase() + potName.slice(1);
                      if (!bagMap.has(potName)) {
                        bagMap.set(potName, {
                          name: potName,
                          key: pKey,
                          cat: 'potion',
                          count: count,
                          bound: 0,
                          price: 0,
                          type: 'potion'
                        });
                      }
                    }
                  });
                }

                bagMap.forEach(v => bagList.push(v));

                // 4. Pokémon (Box + Time)
                const pokesList = [];
                const pokeIdSeen = new Set();

                function extrairDadosCompletosPoke(pk, isTeam) {
                  if (!pk || (!pk.id && !pk._id && !pk.uid && !pk.name)) return null;
                  const pid = pk.id || pk._id || pk.uid || (pk.name + '_' + (pk.level || 1));
                  if (pokeIdSeen.has(String(pid))) return null;
                  pokeIdSeen.add(String(pid));

                  return {
                    id: String(pid),
                    name: pk.name || pk.n || 'Pokémon',
                    level: Number(pk.level || pk.lv || 1),
                    power: Number(pk.power || pk.pwr || 0),
                    shiny: !!pk.shiny,
                    legendary: !!pk.legendary,
                    isTeam: !!isTeam,
                    lookType: pk.lookType,
                    rarity: pk.rarity || 'Comum',
                    iv: Number(pk.iv || 1.0),
                    // tier da ESPÉCIE, vindo do próprio jogo ("poder da espécie
                    // medido no alvo neutro" — ver tierTagHTML em app-1.js).
                    // Escala real do jogo: S / A / B / C. Não existe "S+".
                    tierJogo: pk.tier || null,
                    boost: Number(pk.boost || 0),
                    boostMax: Number(pk.boostMax || 100),
                    growth: pk.growth || null,
                    growthTotal: (pk.growthTotal != null) ? Number(pk.growthTotal) : null,
                    growthTotalMax: Number(pk.growthTotalMax || 192),
                    growthMax: Number(pk.growthMax || 32),
                    growthPct: (pk.growthPct != null) ? Number(pk.growthPct) : null,
                    // O campo é 'nat' (objeto {id,s,d,txt}), nao 'nature'/'natureName'
                    // — por isso a natureza vinha sempre vazia.
                    nature: (pk.nat && (pk.nat.id || pk.nat.txt)) || pk.nature || '',
                    natureTxt: (pk.nat && pk.nat.txt) || '',
                    natureUp: (pk.nat && pk.nat.s) || '',
                    natureDown: (pk.nat && pk.nat.d) || '',
                    hab: pk.hab || null,
                    stats: pk.stats || null,
                    hp: Number(pk.hp || 0),
                    maxHp: Number(pk.maxHp || pk.hp || 0),
                    xp: Number(pk.xp || 0),
                    xpNext: Number(pk.xpNext || 0),
                    speed: Number(pk.speed || 0),
                    dps: Number(pk.dps || 0),
                    moves: Array.isArray(pk.moves) ? pk.moves : [],
                    // 'wm' = moveset recomendado pelo jogo. So vem no card cheio
                    // (time/ativo); o card leve da box não traz (lightenCard).
                    wm: Array.isArray(pk.wm) ? pk.wm : [],
                    held: pk.held || null,
                    heldNome: pk.heldNome || null,
                    heldTier: (pk.heldTier != null) ? Number(pk.heldTier) : null,
                    locked: !!pk.locked,
                    sell: Number(pk.sell || 0),
                    aura: pk.aura || null,
                    // O jogo usa type1/type2 (string), nao 'type'/'types'.
                    type1: pk.type1 || '',
                    type2: (pk.type2 && pk.type2 !== 'none') ? pk.type2 : '',
                    catchInfo: pk.catchInfo || (pk.owner ? ('Catch: ' + pk.owner) : ''),
                    isDitto: !!pk.isDitto
                  };
                }

                const rawBox = (p && p.box && Array.isArray(p.box)) ? p.box : ((s && s.box && Array.isArray(s.box)) ? s.box : ((w.K && Array.isArray(w.K.box)) ? w.K.box : []));
                rawBox.forEach(pk => {
                  const pObj = extrairDadosCompletosPoke(pk, false);
                  if (pObj) pokesList.push(pObj);
                });

                const rawTeam = (p && p.team && Array.isArray(p.team)) ? p.team : ((s && s.team && Array.isArray(s.team)) ? s.team : ((w.K && Array.isArray(w.K.team)) ? w.K.team : []));
                rawTeam.forEach(pk => {
                  const pObj = extrairDadosCompletosPoke(pk, true);
                  if (pObj) pokesList.push(pObj);
                });

                // 5. Gold
                let goldVal = 0;
                if (p && p.gold != null) goldVal = Number(p.gold);
                else if (s && s.gold != null) goldVal = Number(s.gold);
                else if (w.K && w.K.gold != null) goldVal = Number(w.K.gold);
                else if (p && p.wallet && p.wallet.gold != null) goldVal = Number(p.wallet.gold);
                else if (p && p.money != null) goldVal = Number(p.money);

                if (!goldVal || isNaN(goldVal)) {
                  const elG = document.getElementById('stat-carteira-gold') ||
                              document.getElementById('mini-saldo-carteira') ||
                              document.getElementById('bag-gold') ||
                              document.querySelector('#gold, .gold, .wallet-gold, [data-gold]');
                  if (elG && elG.textContent) {
                    const num = parseInt(elG.textContent.replace(/[^0-9]/g, ''));
                    if (!isNaN(num)) goldVal = num;
                  }
                }

                const nomeTreinador = (p && p.name) || (w.K && w.K.player && w.K.player.name) || (document.getElementById('profile-name') ? document.getElementById('profile-name').textContent.trim() : (typeof getPlayerCharacterName === 'function' ? getPlayerCharacterName() : 'Treinador'));

                return {
                  trainer: nomeTreinador,
                  gold: goldVal || 0,
                  bag: bagList,
                  pokes: pokesList,
                  trade: (s && s.trade) || (w.K && w.K.trade) || null
                };
              } catch(err) {
                return null;
              }
            })()
          `);
          if (inv) {
            inventariosContas[i] = inv;
            tradeLog(`[C${i + 1}: ${nomesAbas[i] || inv.trainer}] Gold: $${(inv.gold || 0).toLocaleString('pt-BR')} | Itens: ${(inv.bag || []).length} | Box/Time: ${(inv.pokes || []).length}`, '#94a3b8');
          }
        } catch(e) {}
      }

      atualizarStatsContas(1);
      atualizarStatsContas(2);
      renderizarGradeInventario(1);
      renderizarGradeInventario(2);
      renderizarGradePokes(1);
      renderizarGradePokes(2);
      renderizarOfertasQueue();
      tradeLog('✔ Dados de inventário e Pokémon sincronizados!', '#86efac');
    }

    function classificarItem(nome) {
      if (!nome) return 'loot';
      const n = (nome || '').toLowerCase().trim();
      if (n.includes('diamond') || n.includes('diamante') || n.includes('gem')) return 'diamond';
      if (n.includes('stone') || n.includes('pedra')) return 'stones';
      if (n.includes('ball') || n.includes('potion') || n.includes('revive') || n.includes('ether') || n.includes('elixir')) return 'balls';
      if (n.includes('tm_') || n.includes('tm ') || n.includes('held') || n.includes('orb') || n.includes('scale') || n.includes('leftovers') || n.includes('band') || n.includes('lens') || n.includes('rock') || n.includes('vest') || n.includes('belt') || n.includes('scarf') || n.includes('sash') || n.includes('specs')) return 'stones';
      return 'loot';
    }

    function obterIconeItem(nome) {
      const n = (nome || '').toLowerCase().trim();
      const isStone = n.includes('stone') || n.includes('pedra') || n.includes('crystal stone') || n.includes('orb');
      const isTM = n.includes('tm_') || n.includes('tm ');
      const isHeld = n.includes('band') || n.includes('belt') || n.includes('scarf') || n.includes('specs') || n.includes('lens') || n.includes('sash') || n.includes('leftovers') || n.includes('vest') || n.includes('bell') || n.includes('scale');
      const isBall = n.includes('ball');
      const isPotion = n.includes('potion') || n.includes('revive') || n.includes('ether') || n.includes('elixir');
      const isDiamond = n.includes('diamond') || n.includes('diamante') || n.includes('gem');

      if (n.includes('fire stone')) return { icon: '🔥', border: 'rgba(239,68,68,0.5)', bg: 'rgba(239,68,68,0.18)', label: 'Fire Stone', isStone: true };
      if (n.includes('water stone')) return { icon: '💧', border: 'rgba(59,130,246,0.5)', bg: 'rgba(59,130,246,0.18)', label: 'Water Stone', isStone: true };
      if (n.includes('thunder stone')) return { icon: '⚡', border: 'rgba(234,179,8,0.5)', bg: 'rgba(234,179,8,0.18)', label: 'Thunder Stone', isStone: true };
      if (n.includes('leaf stone')) return { icon: '🍃', border: 'rgba(34,197,94,0.5)', bg: 'rgba(34,197,94,0.18)', label: 'Leaf Stone', isStone: true };
      if (n.includes('moon stone')) return { icon: '🌙', border: 'rgba(192,132,252,0.5)', bg: 'rgba(192,132,252,0.18)', label: 'Moon Stone', isStone: true };
      if (n.includes('sun stone')) return { icon: '☀️', border: 'rgba(249,115,22,0.5)', bg: 'rgba(249,115,22,0.18)', label: 'Sun Stone', isStone: true };
      if (n.includes('shiny stone')) return { icon: '✨', border: 'rgba(253,224,71,0.5)', bg: 'rgba(253,224,71,0.18)', label: 'Shiny Stone', isStone: true };
      if (n.includes('dusk stone') || n.includes('dark stone')) return { icon: '🌑', border: 'rgba(100,116,139,0.5)', bg: 'rgba(100,116,139,0.18)', label: 'Dusk Stone', isStone: true };
      if (n.includes('dawn stone')) return { icon: '🌅', border: 'rgba(6,182,212,0.5)', bg: 'rgba(6,182,212,0.18)', label: 'Dawn Stone', isStone: true };
      if (n.includes('ice stone')) return { icon: '❄️', border: 'rgba(103,232,249,0.5)', bg: 'rgba(103,232,249,0.18)', label: 'Ice Stone', isStone: true };
      if (n.includes('earth stone')) return { icon: '🌍', border: 'rgba(161,98,7,0.5)', bg: 'rgba(161,98,7,0.18)', label: 'Earth Stone', isStone: true };
      if (n.includes('rock stone')) return { icon: '🪨', border: 'rgba(120,113,108,0.5)', bg: 'rgba(120,113,108,0.18)', label: 'Rock Stone', isStone: true };
      if (n.includes('metal stone') || n.includes('metal coat')) return { icon: '⚙️', border: 'rgba(148,163,184,0.5)', bg: 'rgba(148,163,184,0.18)', label: 'Metal Stone', isStone: true };
      if (n.includes('venom stone')) return { icon: '☠️', border: 'rgba(168,85,247,0.5)', bg: 'rgba(168,85,247,0.18)', label: 'Venom Stone', isStone: true };
      if (n.includes('cocoon stone')) return { icon: '🐛', border: 'rgba(132,204,22,0.5)', bg: 'rgba(132,204,22,0.18)', label: 'Cocoon Stone', isStone: true };
      if (n.includes('feather stone')) return { icon: '🪶', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Feather Stone', isStone: true };
      if (n.includes('heart stone')) return { icon: '💖', border: 'rgba(236,72,153,0.5)', bg: 'rgba(236,72,153,0.18)', label: 'Heart Stone', isStone: true };
      if (n.includes('enigma stone')) return { icon: '🔮', border: 'rgba(139,92,246,0.5)', bg: 'rgba(139,92,246,0.18)', label: 'Enigma Stone', isStone: true };
      if (n.includes('crystal stone')) return { icon: '💎', border: 'rgba(6,182,212,0.6)', bg: 'rgba(6,182,212,0.22)', label: 'Crystal Stone', isStone: true };
      if (n.includes('future orb') || n.includes('orb')) return { icon: '🔮', border: 'rgba(147,51,234,0.5)', bg: 'rgba(147,51,234,0.18)', label: 'Orb', isStone: true };
      if (n.includes('leftovers')) return { icon: '🍎', border: 'rgba(132,204,22,0.5)', bg: 'rgba(132,204,22,0.18)', label: 'Leftovers', isHeld: true };
      if (n.includes('band') || n.includes('belt') || n.includes('scarf')) return { icon: '🎗️', border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.18)', label: 'Held', isHeld: true };
      if (n.includes('specs') || n.includes('lens')) return { icon: '👓', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Held', isHeld: true };
      if (n.includes('sash')) return { icon: '🥋', border: 'rgba(226,232,240,0.5)', bg: 'rgba(226,232,240,0.18)', label: 'Held', isHeld: true };
      if (n.includes('egg')) return { icon: '🥚', border: 'rgba(253,224,71,0.5)', bg: 'rgba(253,224,71,0.18)', label: 'Egg', isHeld: true };
      if (n.includes('bell')) return { icon: '🔔', border: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.18)', label: 'Bell', isHeld: true };
      if (n.includes('tm_') || n.includes('tm ')) return { icon: '💿', border: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.18)', label: 'TM', isTM: true };
      if (n.includes('ball')) return { icon: '⚾', border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.15)', label: 'Ball', isBall: true };
      if (n.includes('potion') || n.includes('revive')) return { icon: '🧪', border: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.15)', label: 'Potion', isPotion: true };
      if (n.includes('diamond') || n.includes('diamante') || n.includes('gem')) return { icon: '💎', border: 'rgba(56,189,248,0.5)', bg: 'rgba(56,189,248,0.18)', label: 'Diamond', isDiamond: true };
      return { icon: '🎒', border: 'rgba(148,163,184,0.25)', bg: 'rgba(148,163,184,0.1)', label: 'Loot', isStone, isHeld, isTM, isBall, isPotion, isDiamond };
    }

    function obterNomeTreinadorConta(idx) {
      if (inventariosContas[idx] && inventariosContas[idx].trainer && inventariosContas[idx].trainer !== 'Treinador') {
        return inventariosContas[idx].trainer;
      }
      if (nomesAbas[idx]) return nomesAbas[idx];
      return 'Conta ' + (idx + 1);
    }
