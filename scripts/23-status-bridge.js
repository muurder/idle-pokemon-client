        // =====================================================================
        // 23-status-bridge.js — window.__getTabInfo / window.__obterDashboardStatus
        // =====================================================================
        // Versao simplificada e AUTOSSUFICIENTE das pontes que o shell consome
        // via wv.executeJavaScript (sprite/nome na aba, XP Tracker, Mini
        // Dashboard). As originais do dev (scripts/37-tabinfo.js,
        // scripts/37c-dashboard-status-api.js) leem de variaveis internas do
        // Auto Hunt (pokeAtivoInfo, ultimoStateGeral, sessao, xpPorSeg...) que
        // nao existem aqui -- essas dependiam do motor de automacao inteiro so
        // pra ler dado que o SERVIDOR ja manda pronto.
        //
        // Aqui le-se direto do estado do jogo (window.K / window.gameState):
        //   - player / active vem prontos do servidor a cada tick;
        //   - hunt.xp / hunt.secs / hunt.pxp sao contadores DO SERVIDOR desde
        //     que a caçada começou (manual ou nao) -- a mesma taxa de XP/s
        //     que o dev calculava, sem precisar de nenhum sampler local.
        // Sem caçada ativa (`hunt` vazio), o ETA some ('—') em vez de errar.
        // =====================================================================
        function __statusFmtTempoCurto(seg) {
            if (seg == null || !isFinite(seg) || seg <= 0) return '—';
            const d = Math.floor(seg / 86400);
            const h = Math.floor((seg % 86400) / 3600);
            const m = Math.floor((seg % 3600) / 60);
            const s = Math.floor(seg % 60);
            if (d > 0) return d + 'd ' + h + 'h';
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm ' + s + 's';
            return s + 's';
        }

        function __statusJanelaJogo() {
            return (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
        }

        // `window.K`/`window.gameState` NAO sao globais do jogo -- quem os
        // preenchia era o proprio motor de Auto Hunt, a cada vez que chamava
        // /api/state e guardava o resultado ali (visto em scripts/26 e no
        // carregarInventariosTradeHub do shell). Sem motor nenhum, ninguem
        // faz esse polling e ficam sempre vazios -- por isso trainer/pokemon
        // apareciam em branco. Aqui e um poller proprio, minimo, so pra
        // manter esse cache vivo pras pontes deste arquivo.
        let __statusCache = {};
        async function __statusAtualizarCache() {
            try {
                const w = __statusJanelaJogo();
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || localStorage.getItem('pmi_token') || w.q || w.TOKEN || w.TAB_TOKEN || ''; } catch (e) { }
                const url = tok ? ('/api/state?token=' + encodeURIComponent(tok)) : '/api/state';
                const res = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
                const s = res && (res.state || res);
                if (s && typeof s === 'object') {
                    __statusCache = s;
                    w.K = s;
                    w.gameState = s;
                }
            } catch (e) { }
        }
        __statusAtualizarCache();
        setInterval(__statusAtualizarCache, 4000);
        setInterval(__statusPintarEtaCardOficial, 2000);
        __statusPintarEtaCardOficial();

        // ---------- Selo de ETA direto no CARD NATIVO do jogo ----------
        // O dev injeta um <span> irmao de #pp-poke-lv e #pp-exp-pct -- o
        // jogo so troca o textContent DAQUELES nos a cada tick, entao o
        // nosso span do lado sobrevive sem MutationObserver nenhum. E o
        // "XP Tracker" que aparece dentro do proprio card do jogo (o com
        // botao Evoluir/Bônus), nao um painel separado.
        function __statusFmtNum(v) { return Number(v || 0).toLocaleString('pt-BR'); }
        function __statusFmtTempoMini(seg) {
            if (!Number.isFinite(seg) || seg <= 0) return '';
            if (seg > 86400 * 3) return '> 72h';
            seg = Math.round(seg);
            const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
            if (h > 0) return h + 'h';
            if (m > 0) return m + 'm';
            return (seg % 60) + 's';
        }
        function __statusSeloCard(id, refId, cor, alinharDireita) {
            const ref = document.getElementById(refId);
            if (!ref || !ref.parentNode) return null;
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('span');
                el.id = id;
                // `white-space:normal` (nao nowrap) de proposito: a linha do
                // Treinador ("EXP x% · Nx stage") ja vem cheia do proprio
                // jogo, e o texto que a gente emenda no fim (tempo + numero
                // de kills) as vezes nao cabe no resto da largura -- sem
                // poder quebrar linha ele vazava pra fora do card.
                el.style.cssText = 'font-size:10px;font-weight:700;white-space:normal;overflow-wrap:anywhere;color:' + cor +
                    (alinharDireita ? ';margin-left:auto' : ';margin-left:5px');
                ref.parentNode.appendChild(el);
            }
            return el;
        }
        function __statusPintarEtaCardOficial() {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                const hunt = s.hunt || {};
                const temHunt = hunt && hunt.secs > 0;
                const taxaPoke = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
                const taxaJog = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;
                const xpMedioPoke = (hunt.xp > 0 && hunt.kills > 0) ? Number(hunt.xp) / Number(hunt.kills) : 0;
                const xpMedioJog = (hunt.pxp > 0 && hunt.kills > 0) ? Number(hunt.pxp) / Number(hunt.kills) : 0;

                const sp = __statusSeloCard('idle-eta-poke', 'pp-poke-lv', '#4ade80', true);
                if (sp && act) {
                    const falta = Math.max(0, Number(act.xpNext || 0) - Number(act.xp || 0));
                    const segs = taxaPoke > 0 && falta > 0 ? falta / taxaPoke : Infinity;
                    const kills = (xpMedioPoke > 0 && falta > 0) ? Math.ceil(falta / xpMedioPoke) : null;
                    const t = __statusFmtTempoMini(segs);
                    const k = (kills != null && kills > 0) ? ` · ≈${__statusFmtNum(kills)}x` : '';
                    sp.title = 'Tempo e nº de pokémons estimados para o pokémon ativo subir de nível';
                    sp.textContent = t ? '⏳ ' + t + k : '';
                }

                const sj = __statusSeloCard('idle-eta-jog', 'pp-exp-pct', '#fbbf24', false);
                if (sj) {
                    const falta = Math.max(0, Number(p.xpNext || 0) - Number(p.xp || 0));
                    const segs = taxaJog > 0 && falta > 0 ? falta / taxaJog : Infinity;
                    const kills = (xpMedioJog > 0 && falta > 0) ? Math.ceil(falta / xpMedioJog) : null;
                    const t = __statusFmtTempoMini(segs);
                    const k = (kills != null && kills > 0) ? ` · ≈${__statusFmtNum(kills)}x` : '';
                    sj.title = 'Tempo e nº de pokémons estimados para você subir de nível';
                    sj.textContent = t ? '· ⏳ ' + t + k : '';
                }
            } catch (e) { }
        }

        function __statusEstadoBruto() {
            const w = __statusJanelaJogo();
            if (w.K && typeof w.K === 'object' && Object.keys(w.K).length) return w.K;
            if (w.gameState && typeof w.gameState === 'object' && Object.keys(w.gameState).length) return w.gameState;
            return __statusCache;
        }

        // ---------- Ponte 1: nome/aba (usada pelo shell/19 pro sprite e título) ----------
        window.__getTabInfo = function () {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                let trainer = p.name || '';
                if (!trainer) {
                    try {
                        const el = document.querySelector('#stat-jog-name');
                        if (el) trainer = el.textContent.replace(/[\u{1F3AE}\u{1F43E}⚡]/gu, '').replace(/Treinador/gi, '').trim();
                    } catch (e) { }
                }
                return JSON.stringify({ poke: (act && act.name) || '', lv: (act && act.level) || '', trainer: trainer });
            } catch (e) { return '{}'; }
        };

        // ---------- Ponte 2: Mini Dashboard / Dashboard 4x ----------
        window.__obterDashboardStatus = function () {
            try {
                const s = __statusEstadoBruto();
                const p = s.player || {};
                const team = Array.isArray(s.team) ? s.team : [];
                const act = s.active || team.find(x => x && x.active) || team[0] || null;
                const hunt = s.hunt || {};
                const bag = Array.isArray(s.bag) ? s.bag : [];
                const balls = s.balls || {};
                const pots = s.potions || {};

                let ultraBalls = Number(balls.ultra || balls['ultra ball'] || 0);
                let ultraPotions = Number(pots.ultra || pots.hyper || pots['ultra potion'] || 0);
                let revives = Number(pots.revive || 0);
                bag.forEach(it => {
                    if (!it || !it.name) return;
                    const n = String(it.name).toLowerCase();
                    const count = Number(it.count || it.qty || 1);
                    if (ultraBalls === 0 && n.includes('ultra ball')) ultraBalls += count;
                    if (ultraPotions === 0 && (n.includes('ultra pot') || n.includes('hyper pot'))) ultraPotions += count;
                    if (revives === 0 && n.includes('revive')) revives += count;
                });

                // Taxa de XP/s: contador do SERVIDOR desde que a caçada começou.
                // Sem `hunt.secs` (nunca caçou nesta sessão) fica sem taxa -> ETA '—'.
                const temHunt = hunt && hunt.secs > 0;
                const taxaPokeSec = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
                const taxaJogSec = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;

                const pExp = Number(p.xp || 0);
                const pExpNext = Number(p.xpNext || 0);
                const pExpPct = p.xpPct != null ? Number(p.xpPct) : (pExpNext > 0 ? Math.min(100, Math.round((pExp / pExpNext) * 100)) : 0);
                const trainerFaltaXp = Math.max(0, pExpNext - pExp);
                const trainerEtaSeg = (taxaJogSec > 0 && trainerFaltaXp > 0) ? (trainerFaltaXp / taxaJogSec) : null;

                let actInfo = null;
                if (act && act.name) {
                    const pkExp = Number(act.xp || act.exp || 0);
                    const pkExpNext = Number(act.xpNext || act.expNext || 0);
                    const pkExpPct = act.expPct != null ? Number(act.expPct)
                        : (act.pct != null ? Number(act.pct) : (pkExpNext > 0 ? Math.min(100, Math.round((pkExp / pkExpNext) * 100)) : 0));
                    const pokeFaltaXp = Math.max(0, pkExpNext - pkExp);
                    const pokeEtaSeg = (taxaPokeSec > 0 && pokeFaltaXp > 0) ? (pokeFaltaXp / taxaPokeSec) : null;
                    actInfo = {
                        id: act.id,
                        name: act.name,
                        level: Number(act.level || 1),
                        shiny: !!act.shiny,
                        hp: Math.round(Number(act.hp || 0)),
                        maxHp: Math.round(Number(act.maxHp || 100)),
                        exp: pkExp,
                        expNext: pkExpNext,
                        expPct: Math.round(pkExpPct),
                        expFalta: pokeFaltaXp,
                        expEtaSeg: pokeEtaSeg,
                        expEta: __statusFmtTempoCurto(pokeEtaSeg),
                        xpPorSeg: taxaPokeSec,
                        dps: Number(act.dps || 0),
                        power: Number(act.power || 0),
                        held: act.heldNome || act.held || null,
                        moves: act.moves || []
                    };
                }

                const encName = (s.encounter && s.encounter.name) || (hunt.lock && hunt.lock.name) || '';
                const encInfo = {
                    name: encName || 'Nenhum',
                    level: Number((s.encounter && s.encounter.level) || 1),
                    hp: Math.round(Number((s.encounter && s.encounter.hp) || 0)),
                    maxHp: Math.round(Number((s.encounter && s.encounter.maxHp) || 100)),
                    shiny: !!(s.encounter && s.encounter.shiny),
                    dexKills: 0,
                    dexGoal: 100,
                    dexDone: false,
                    dexPct: 0
                };

                return {
                    trainer: p.name || '',
                    level: Number(p.level || 1),
                    xp: pExp,
                    xpNext: pExpNext,
                    xpPct: Math.round(pExpPct),
                    xpFalta: trainerFaltaXp,
                    xpPorSeg: taxaJogSec,
                    trainerEtaSeg: trainerEtaSeg,
                    trainerEta: __statusFmtTempoCurto(trainerEtaSeg),
                    kills: Number(p.kills || 0),
                    catches: Number(p.catches || 0),
                    totalShinies: Number(p.shinies || 0),
                    gold: Number(p.gold || 0),
                    diamonds: Number(p.diamonds || 0),
                    vip: !!(p.vip || (p.vipUntil && p.vipUntil > Date.now())),
                    active: actInfo,
                    encounter: encInfo,
                    ballsStats: { normalThrown: 0, shinyThrown: 0, targetNormal: 0, targetShiny: 0 },
                    hunt: {
                        active: temHunt,
                        afk: false,
                        target: (hunt.lock && hunt.lock.name) || 'Caçada Livre',
                        kills: Number(hunt.kills || 0),
                        catches: Number(hunt.catches || 0),
                        shinies: Number(hunt.shinies || 0),
                        xpGained: Number(hunt.xp || 0),
                        goldGained: Number(hunt.soldGold || 0),
                        secs: Number(hunt.secs || 0)
                    },
                    inventory: {
                        ultraBalls: ultraBalls,
                        ultraPotions: ultraPotions,
                        revives: revives,
                        balls: balls,
                        bag: bag.map(it => ({
                            name: it.name || 'Item',
                            count: Number(it.count || it.qty || 1),
                            price: Number(it.price || 0),
                            type: it.type || 'loot'
                        })),
                        bagCount: bag.length,
                        boxCount: Array.isArray(s.box) ? s.box.length : 0
                    },
                    pokedex: window.__pokedexStats || { total: 151, caught: 0, missing: 151, pct: 0 }
                };
            } catch (e) {
                return { erro: String((e && e.message) || e) };
            }
        };

        if (typeof unsafeWindow !== 'undefined' && unsafeWindow && unsafeWindow !== window) {
            unsafeWindow.__getTabInfo = window.__getTabInfo;
            unsafeWindow.__obterDashboardStatus = window.__obterDashboardStatus;
        }
