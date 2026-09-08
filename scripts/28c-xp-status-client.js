        // =====================================================================
        // 28c-xp-status-client.js — XP TRACKER, ETAS E ESTADO LIMPO (CLIENT)
        // =====================================================================
        // Este modulo prove para a versao CLIENT a mesma experiencia rica de XP
        // que o DEV tem, sem carregar nenhum motor de bot / auto-hunt:
        //
        // 1. Sincronizacao de estado (window.K e window.gameState via /api/state
        //    leve e interceptor de fetch transparente do proprio jogo);
        // 2. Calculo em tempo real de XP/s, pokemons restantes e ETA para
        //    Pokemon ativo e Treinador;
        // 3. Publicacao de window.__idleSuiteXpStatus (consumido pelo widget
        //    flutuante / fixado na sidebar do shell Electron);
        // 4. Injecao dos selos discretos de ETA no card oficial (#player-panel);
        // 5. Doca expansivel de XP (lingueta lateral › na borda do card);
        // 6. Pontes window.__getTabInfo e window.__obterDashboardStatus.
        //
        // GUARDA: se window.__xpTrackerDockRico ja estiver ativo (caso do DEV,
        // onde 28-auto-hunt-precos.js e 28b-xp-tracker-dock.js ja rodam),
        // este modulo fica completamente dormente.
        // =====================================================================

        (function () {
            'use strict';

            if (typeof window !== 'undefined' && window.__xpTrackerDockRico) {
                return;
            }

            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

            // ---------- 1. OBTENÇÃO DE TOKEN E JANELA ----------
            function obterToken() {
                try {
                    const ss = sessionStorage.getItem('pmi_tab_token');
                    if (ss && ss.length >= 10) return ss;
                } catch (e) { }
                try {
                    const ls = localStorage.getItem('pmi_token');
                    if (ls && ls.length >= 10) return ls;
                } catch (e) { }
                try {
                    if (w.q && typeof w.q === 'string') return w.q;
                    if (w.TOKEN && typeof w.TOKEN === 'string') return w.TOKEN;
                    if (w.TAB_TOKEN && typeof w.TAB_TOKEN === 'string') return w.TAB_TOKEN;
                } catch (e) { }
                return '';
            }

            // ---------- 2. CACHE E INTERCEPTOR TRANSPARENTE ----------
            let _estadoCache = {};
            let _ultimoFetchTs = 0;

            function aplicarEstado(s) {
                if (!s || typeof s !== 'object') return;
                const state = s.state || s;
                if (!state || typeof state !== 'object') return;
                _estadoCache = state;
                w.K = state;
                w.gameState = state;
                atualizarStatusXpClient();
            }

            // Intercepta respostas naturais do jogo para /api/state ou /api/action
            try {
                if (!w.__idleFetchInterceptorClient) {
                    w.__idleFetchInterceptorClient = true;
                    const origFetch = w.fetch;
                    w.fetch = async function (...args) {
                        const res = await origFetch.apply(this, args);
                        try {
                            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                            if (url.includes('/api/state') || url.includes('/api/action') || url.includes('/api/gym')) {
                                res.clone().json().then(data => {
                                    if (data) aplicarEstado(data);
                                }).catch(() => { });
                            }
                        } catch (e) { }
                        return res;
                    };
                }
            } catch (e) { }

            async function atualizarEstadoRemoto() {
                const agora = Date.now();
                if (agora - _ultimoFetchTs < 2000) return;
                _ultimoFetchTs = agora;
                try {
                    const tok = obterToken();
                    const url = tok ? ('/api/state?token=' + encodeURIComponent(tok)) : '/api/state';
                    const res = await fetch(url, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
                    if (res) aplicarEstado(res);
                } catch (e) { }
            }

            // Polling leve periódico caso o jogo esteja ocioso
            setInterval(atualizarEstadoRemoto, 3000);
            atualizarEstadoRemoto();

            // ---------- 3. MEDIDOR INCREMENTAL DE TAXA E ETA ----------
            let _lastPokeXp = null;
            let _lastJogXp = null;
            let _lastPokeTs = null;
            let _lastJogTs = null;
            let _taxaLocalPoke = 0;
            let _taxaLocalJog = 0;
            let _localKillsPoke = 0;
            let _localKillsJog = 0;
            let _deltaTotalPoke = 0;
            let _deltaTotalJog = 0;

            let _cacheTrainerXpNextClient = new Map();
            let _cacheTrainerXpRestanteClient = new Map();
            let _liveEtaPokeClient = { segs: 0, ts: 0, restante: null };
            let _liveEtaJogClient = { segs: 0, ts: 0, restante: null };

            function fmtNum(v) {
                return Number(v || 0).toLocaleString('pt-BR');
            }

            function fmtTempo(seg, isMax = false, isPausado = false) {
                if (isMax) return '⭐ Nível MAX';
                if (isPausado) return '⏸️ Pausado';
                if (!Number.isFinite(seg) || seg <= 0) return '--';
                if (seg > 86400 * 3) return '> 72h';
                seg = Math.round(seg);
                const h = Math.floor(seg / 3600);
                const m = Math.floor((seg % 3600) / 60);
                const s = seg % 60;
                if (h > 0) return `${h}h ${m}m`;
                if (m > 0) return `${m}m ${s}s`;
                return `${s}s`;
            }

            function fmtTempoCurto(seg, isMax = false, isPausado = false) {
                if (isMax) return 'MAX';
                if (isPausado) return '⏸️';
                if (!Number.isFinite(seg) || seg <= 0) return '—';
                if (seg > 86400 * 3) return '> 72h';
                seg = Math.round(seg);
                const d = Math.floor(seg / 86400);
                const h = Math.floor((seg % 86400) / 3600);
                const m = Math.floor((seg % 3600) / 60);
                const s = seg % 60;
                if (d > 0) return `${d}d ${h}h`;
                if (h > 0) return `${h}h ${m}m`;
                if (m > 0) return `${m}m ${s}s`;
                return `${s}s`;
            }

            function fmtFalta(restante, kills) {
                if (restante == null || restante <= 0) return '—';
                if (kills != null && kills > 0) return `≈ ${fmtNum(kills)} pokes`;
                return `falta ${fmtNum(restante)} XP`;
            }

            // Suaviza a taxa se nao houver ganhos por mais de 5s
            function decairTaxas() {
                const agora = Date.now();
                if (_lastPokeTs && agora - _lastPokeTs > 5000 && _taxaLocalPoke > 0) {
                    _taxaLocalPoke *= 0.85;
                    if (_taxaLocalPoke < 0.1) _taxaLocalPoke = 0;
                }
                if (_lastJogTs && agora - _lastJogTs > 5000 && _taxaLocalJog > 0) {
                    _taxaLocalJog *= 0.85;
                    if (_taxaLocalJog < 0.1) _taxaLocalJog = 0;
                }
            }

            function extrairDadosAtivos() {
                let s = null;
                try {
                    const wWin = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (wWin.K && (wWin.K.player || wWin.K.active)) s = wWin.K;
                    else if (wWin.S && (wWin.S.player || wWin.S.active)) s = wWin.S;
                    else if (wWin.gameState && (wWin.gameState.player || wWin.gameState.active)) s = wWin.gameState;
                } catch (e) { }
                if (!s) {
                    try { if (typeof K !== 'undefined' && K && (K.player || K.active)) s = K; } catch (e) { }
                }
                if (!s && typeof obterGameState === 'function') {
                    try { s = obterGameState(); } catch (e) { }
                }
                if (!s) {
                    s = (w.K && typeof w.K === 'object' && Object.keys(w.K).length) ? w.K : _estadoCache;
                }
                const root = (s && s.state && typeof s.state === 'object') ? s.state : (s || {});
                const player = root.player || {};
                const team = Array.isArray(root.team) ? root.team : [];
                const active = root.active || (root.player && root.player.active) || team.find(x => x && (x.id === root.activeId || x.active)) || team[0] || {};
                const hunt = root.hunt || {};

                // Fallbacks no DOM se state ainda nao tiver populado campos visiveis
                let domPokePct = null;
                let domJogPct = null;
                let domPokeName = null;
                let domPokeLv = null;
                let domJogName = null;
                let domJogLv = null;

                try {
                    const elLv = document.getElementById('pp-poke-lv');
                    if (elLv && elLv.textContent) {
                        const m = elLv.textContent.match(/(\d+)/);
                        if (m) domPokeLv = parseInt(m[1], 10);
                    }
                    const elPl = document.getElementById('player-panel');
                    if (elPl) {
                        const txt = elPl.textContent || '';
                        const mPoke = txt.match(/(\d+(?:\.\d+)?)\s*%\s*XP/i);
                        if (mPoke) domPokePct = parseFloat(mPoke[1]);
                        const mJog = txt.match(/EXP\s*(\d+(?:\.\d+)?)\s*%/i);
                        if (mJog) domJogPct = parseFloat(mJog[1]);
                    }
                    const elName = document.getElementById('pp-name');
                    if (elName && elName.textContent.trim()) domJogName = elName.textContent.trim();
                    const elSub = document.getElementById('pp-sub');
                    if (elSub && elSub.textContent) {
                        const mLv = elSub.textContent.match(/(\d+)/);
                        if (mLv) domJogLv = parseInt(mLv[1], 10);
                    }
                } catch (e) { }

                const pName = active.name || domPokeName || 'Pokémon';
                const pLv = Number(active.level || domPokeLv || 1);
                const pXp = Number(active.xp || active.exp || 0);
                const pXpNext = Number(active.xpNext || active.expNext || 0);
                // Pokémon tem limite de nível até 1000
                const isPokeMax = !!(active.xpCap || (pLv >= 1000 && (pXpNext <= 0 || (pXp > 0 && pXpNext > 0 && pXp >= pXpNext))));
                const pXpRestante = (!isPokeMax && pXpNext > 0) ? Math.max(0, pXpNext - pXp) : 0;
                const pPctCalculado = pXpNext > 0 ? Math.min(100, Math.round((pXp / pXpNext) * 100)) : 0;
                const pPct = isPokeMax ? 100 : (domPokePct !== null ? domPokePct : pPctCalculado);

                const jName = player.name || domJogName || 'Treinador';
                const jLv = Number(player.level || domJogLv || 1);
                // Treinador no Idle Pokémon tem nível infinito (sem limite de nível)
                const isJogMax = !!player.xpCap;
                const jXp = Number(player.xp || 0);
                let jXpNext = Number(player.xpNext || 0);
                if (jXpNext > 0 && jLv) {
                    _cacheTrainerXpNextClient.set(jLv, jXpNext);
                } else if (!jXpNext && jLv && _cacheTrainerXpNextClient.has(jLv)) {
                    jXpNext = _cacheTrainerXpNextClient.get(jLv);
                }
                const pctBaseJog = (domJogPct !== null ? domJogPct : Number(player.xpPct)) || 0;
                let jXpRestante = (!isJogMax && jXpNext > 0 && jXp > 0 && jXpNext > jXp) ? (jXpNext - jXp) : 0;
                if (!isJogMax && jXpRestante <= 0 && pctBaseJog > 0 && pctBaseJog < 100 && jXpNext > 0) {
                    jXpRestante = Math.round(jXpNext * ((100 - pctBaseJog) / 100));
                }
                if (jXpRestante > 0 && jLv) {
                    _cacheTrainerXpRestanteClient.set(jLv, jXpRestante);
                } else if (!jXpRestante && jLv && _cacheTrainerXpRestanteClient.has(jLv)) {
                    jXpRestante = _cacheTrainerXpRestanteClient.get(jLv);
                }
                const jPctCalculado = (jXpNext > 0 && jXp > 0 && jXpNext >= jXp) ? Math.min(100, Math.round((jXp / jXpNext) * 100)) : pctBaseJog;
                const jPct = isJogMax ? 100 : (domJogPct !== null ? domJogPct : jPctCalculado);

                return {
                    s, player, active, hunt, isPokeMax, isJogMax,
                    poke: { name: pName, level: pLv, shiny: !!(active.shiny || active.isShiny), xp: pXp, xpNext: pXpNext, xpRestante: pXpRestante, pct: pPct, xpCap: isPokeMax },
                    jog: { name: jName, level: jLv, xp: jXp, xpNext: jXpNext, xpRestante: jXpRestante, pct: jPct, xpCap: isJogMax }
                };
            }

            function atualizarStatusXpClient() {
                decairTaxas();
                const { hunt, poke, jog, isPokeMax, isJogMax } = extrairDadosAtivos();
                const agora = Date.now();

                // 1. Atualizacao delta local de XP (somente quando há ganho efetivo de XP)
                if (poke.xp > 0) {
                    if (_lastPokeXp !== null && poke.xp > _lastPokeXp) {
                        const delta = poke.xp - _lastPokeXp;
                        const dt = _lastPokeTs ? (agora - _lastPokeTs) / 1000 : 1;
                        if (dt > 0.3 && dt < 60) {
                            const inst = delta / dt;
                            _taxaLocalPoke = _taxaLocalPoke > 0 ? (_taxaLocalPoke * 0.6 + inst * 0.4) : inst;
                        }
                        _localKillsPoke += 1;
                        _deltaTotalPoke += delta;
                        _lastPokeTs = agora;
                    }
                    _lastPokeXp = poke.xp;
                }

                if (jog.xp > 0) {
                    if (_lastJogXp !== null && jog.xp > _lastJogXp) {
                        const delta = jog.xp - _lastJogXp;
                        const dt = _lastJogTs ? (agora - _lastJogTs) / 1000 : 1;
                        if (dt > 0.3 && dt < 60) {
                            const inst = delta / dt;
                            _taxaLocalJog = _taxaLocalJog > 0 ? (_taxaLocalJog * 0.6 + inst * 0.4) : inst;
                        }
                        _localKillsJog += 1;
                        _deltaTotalJog += delta;
                        _lastJogTs = agora;
                    }
                    _lastJogXp = jog.xp;
                }

                // 2. Taxas consolidadas com proteção contra taxa fantasma
                const estaPausado = (typeof autoHuntPausado !== 'undefined' && autoHuntPausado) || (typeof emCidadeOuTransito !== 'undefined' && emCidadeOuTransito);
                const ociosoPoke = _lastPokeTs ? (agora - _lastPokeTs > 45000) : false;
                const ociosoJog = _lastJogTs ? (agora - _lastJogTs > 45000) : false;

                const temHunt = hunt && Number(hunt.secs || 0) > 0;
                const huntSecs = temHunt ? Number(hunt.secs) : 0;
                const huntKills = temHunt ? Number(hunt.kills || 0) : _localKillsPoke;
                const taxaPokeServ = (temHunt && Number(hunt.xp || 0) > 0 && huntSecs > 0) ? (Number(hunt.xp) / huntSecs) : 0;
                const taxaJogServ = (temHunt && Number(hunt.pxp || 0) > 0 && huntSecs > 0) ? (Number(hunt.pxp) / huntSecs) : 0;

                let taxaPoke = 0;
                if (!estaPausado) {
                    taxaPoke = taxaPokeServ > 0 ? taxaPokeServ : (_taxaLocalPoke > 0 ? _taxaLocalPoke : 0);
                }
                let taxaJog = 0;
                if (!estaPausado) {
                    taxaJog = taxaJogServ > 0 ? taxaJogServ : (_taxaLocalJog > 0 ? _taxaLocalJog : 0);
                }

                const xpMedioPoke = (temHunt && huntKills > 0 && Number(hunt.xp || 0) > 0)
                    ? (Number(hunt.xp) / huntKills)
                    : (_localKillsPoke > 0 && _deltaTotalPoke > 0 ? (_deltaTotalPoke / _localKillsPoke) : 0);

                const xpMedioJog = (temHunt && huntKills > 0 && Number(hunt.pxp || 0) > 0)
                    ? (Number(hunt.pxp) / huntKills)
                    : (_localKillsJog > 0 && _deltaTotalJog > 0 ? (_deltaTotalJog / _localKillsJog) : 0);

                const faltaPokeKills = (!isPokeMax && poke.xpRestante > 0 && xpMedioPoke > 0) ? Math.ceil(poke.xpRestante / xpMedioPoke) : null;
                let faltaJogKills = (!isJogMax && jog.xpRestante > 0 && xpMedioJog > 0) ? Math.ceil(jog.xpRestante / xpMedioJog) : null;
                if (!faltaJogKills && !isJogMax && jog.pct > 0 && jog.pct < 100) {
                    const killsTotais = Number(hunt.kills || 0);
                    const killsPor1Pct = killsTotais > 0 ? (killsTotais / Math.max(1, jog.pct)) : 20;
                    faltaJogKills = Math.ceil(killsPor1Pct * (100 - jog.pct));
                }

                // Live countdown interpolation
                let segsPoke = Infinity;
                if (isPokeMax) {
                    segsPoke = 0;
                    _liveEtaPokeClient.segs = 0;
                    _liveEtaPokeClient.ts = agora;
                    _liveEtaPokeClient.restante = 0;
                } else if (estaPausado) {
                    segsPoke = _liveEtaPokeClient.segs || (taxaPoke > 0 && poke.xpRestante > 0 ? Math.round(poke.xpRestante / taxaPoke) : Infinity);
                } else if (taxaPoke > 0 && poke.xpRestante > 0) {
                    const etaCalc = poke.xpRestante / taxaPoke;
                    if (_liveEtaPokeClient.restante !== poke.xpRestante || !_liveEtaPokeClient.segs || !isFinite(_liveEtaPokeClient.segs) || Math.abs(agora - _liveEtaPokeClient.ts) > 15000) {
                        _liveEtaPokeClient.segs = etaCalc;
                        _liveEtaPokeClient.ts = agora;
                        _liveEtaPokeClient.restante = poke.xpRestante;
                        segsPoke = Math.max(1, Math.round(etaCalc));
                    } else {
                        const decorrido = Math.floor((agora - _liveEtaPokeClient.ts) / 1000);
                        segsPoke = Math.max(1, Math.round(_liveEtaPokeClient.segs - decorrido));
                    }
                } else {
                    _liveEtaPokeClient.segs = Infinity;
                    _liveEtaPokeClient.restante = poke.xpRestante;
                }

                let segsJog = Infinity;
                if (isJogMax) {
                    segsJog = 0;
                    _liveEtaJogClient.segs = 0;
                    _liveEtaJogClient.ts = agora;
                    _liveEtaJogClient.restante = 0;
                } else if (estaPausado) {
                    segsJog = _liveEtaJogClient.segs || (taxaJog > 0 && jog.xpRestante > 0 ? Math.round(jog.xpRestante / taxaJog) : Infinity);
                } else if (taxaJog > 0 && jog.xpRestante > 0) {
                    const etaCalc = jog.xpRestante / taxaJog;
                    if (_liveEtaJogClient.restante !== jog.xpRestante || !_liveEtaJogClient.segs || !isFinite(_liveEtaJogClient.segs) || Math.abs(agora - _liveEtaJogClient.ts) > 15000) {
                        _liveEtaJogClient.segs = etaCalc;
                        _liveEtaJogClient.ts = agora;
                        _liveEtaJogClient.restante = jog.xpRestante;
                        segsJog = Math.max(1, Math.round(etaCalc));
                    } else {
                        const decorrido = Math.floor((agora - _liveEtaJogClient.ts) / 1000);
                        segsJog = Math.max(1, Math.round(_liveEtaJogClient.segs - decorrido));
                    }
                } else if (taxaJog > 0 && faltaJogKills && xpMedioJog > 0) {
                    const estXp = faltaJogKills * xpMedioJog;
                    if (!_liveEtaJogClient.segs || !isFinite(_liveEtaJogClient.segs) || Math.abs(agora - _liveEtaJogClient.ts) > 15000) {
                        segsJog = estXp / taxaJog;
                        _liveEtaJogClient.segs = segsJog;
                        _liveEtaJogClient.ts = agora;
                        _liveEtaJogClient.restante = estXp;
                    } else {
                        const decorrido = Math.floor((agora - _liveEtaJogClient.ts) / 1000);
                        segsJog = Math.max(1, Math.round(_liveEtaJogClient.segs - decorrido));
                    }
                } else {
                    _liveEtaJogClient.segs = Infinity;
                    _liveEtaJogClient.restante = jog.xpRestante;
                }

                // 3. Publicacao de window.__idleSuiteXpStatus para o Electron Shell
                const statusObj = {
                    poke: {
                        name: poke.name,
                        level: poke.level,
                        shiny: poke.shiny,
                        pct: poke.pct,
                        pctText: isPokeMax ? '100%' : (Math.round(poke.pct) + '%'),
                        falta: isPokeMax ? '⭐ MAX' : fmtFalta(poke.xpRestante, faltaPokeKills),
                        eta: fmtTempo(segsPoke, isPokeMax, estaPausado),
                        segs: segsPoke,
                        xpRestante: poke.xpRestante,
                        xpNext: poke.xpNext,
                        xp: poke.xp,
                        xpCap: isPokeMax,
                        pausado: estaPausado
                    },
                    jog: {
                        name: jog.name,
                        level: jog.level,
                        pct: jog.pct,
                        pctText: isJogMax ? '100%' : (Math.round(jog.pct) + '%'),
                        falta: isJogMax ? '⭐ MAX' : fmtFalta(jog.xpRestante, faltaJogKills),
                        eta: fmtTempo(segsJog, isJogMax, estaPausado),
                        segs: segsJog,
                        xpRestante: jog.xpRestante,
                        xpNext: jog.xpNext,
                        xp: jog.xp,
                        xpCap: isJogMax,
                        pausado: estaPausado
                    },
                    hunt: {
                        kills: huntKills,
                        secs: huntSecs,
                        taxaPoke: taxaPoke,
                        taxaJog: taxaJog,
                        pausado: estaPausado
                    },
                    timestamp: agora
                };

                w.__idleSuiteXpStatus = statusObj;
                window.__idleSuiteXpStatus = statusObj;

                // 4. Selos discretos no card oficial (#player-panel)
                pintarEtaCardOficialClient(segsPoke, segsJog, faltaPokeKills, faltaJogKills, {
                    pokeMax: isPokeMax,
                    jogMax: isJogMax,
                    estaPausado: estaPausado
                });

                // 5. Atualiza a doca lateral se estiver aberta
                atualizarConteudoDockXpClient(statusObj);
            }

            // ---------- 4. SELOS DE ETA NO CARD OFICIAL DO JOGO ----------
            function seloCard(id, refId, cor, alinharDireita) {
                const ref = document.getElementById(refId);
                if (!ref || !ref.parentNode) return null;
                let el = document.getElementById(id);
                if (!el) {
                    el = document.createElement('span');
                    el.id = id;
                    el.style.cssText = 'font-size:10px; font-weight:700; white-space:nowrap; color:' + cor +
                        (alinharDireita ? ';margin-left:auto' : ';margin-left:5px');
                    ref.parentNode.appendChild(el);
                }
                return el;
            }

            function pintarEtaCardOficialClient(segPoke, segJog, killsPoke, killsJog, opts = {}) {
                let ligado = true;
                try { ligado = localStorage.getItem('idleSuiteEtaNoCard') !== '0'; } catch (e) { }
                if (!ligado) {
                    ['idle-eta-poke', 'idle-eta-jog'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.remove();
                    });
                    return;
                }

                const sp = seloCard('idle-eta-poke', 'pp-poke-lv', '#4ade80', true);
                if (sp) {
                    sp.title = 'Tempo e nº de pokémons estimados para o pokémon ativo subir de nível';
                    if (opts.pokeMax) {
                        sp.textContent = '⭐ MAX';
                    } else if (opts.estaPausado) {
                        sp.textContent = '⏸️ Pausado';
                    } else {
                        const t = fmtTempoCurto(segPoke, false, false);
                        const k = (killsPoke != null && killsPoke > 0) ? ` · ≈${fmtNum(killsPoke)}x` : '';
                        sp.textContent = (t !== '—' && t) ? ('⏳ ' + t + k) : '⏳ calculando...';
                    }
                }

                const sj = seloCard('idle-eta-jog', 'pp-exp-pct', '#fbbf24', false);
                if (sj) {
                    sj.title = 'Tempo e nº de pokémons estimados para você subir de nível';
                    if (opts.jogMax) {
                        sj.textContent = '· ⭐ MAX';
                    } else if (opts.estaPausado) {
                        sj.textContent = '· ⏸️ Pausado';
                    } else {
                        const t = fmtTempoCurto(segJog, false, false);
                        const k = (killsJog != null && killsJog > 0) ? ` · ≈${fmtNum(killsJog)}x` : '';
                        sj.textContent = (t !== '—' && t) ? ('· ⏳ ' + t + k) : '· ⏳ calculando...';
                    }
                }
            }

            // ---------- 5. DOCA LATERAL EXPANSÍVEL (›) ----------
            let _dockXpTreinador = null;

            function garantirBotaoDockXpTreinador() {
                const panel = document.getElementById('player-panel');
                if (!panel) return;

                const existente = document.getElementById('ppxp-dock-toggle');
                if (existente && existente.isConnected) return;

                if (getComputedStyle(panel).position === 'static') {
                    panel.style.position = 'relative';
                }

                const btn = document.createElement('button');
                btn.id = 'ppxp-dock-toggle';
                btn.type = 'button';
                btn.title = 'Abrir XP Tracker completo';
                btn.textContent = '›';
                btn.style.cssText = 'position:absolute; top:50%; right:-13px; z-index:5;'
                    + 'width:13px; height:40px; padding:0; line-height:1;'
                    + 'display:flex; align-items:center; justify-content:center;'
                    + 'font-size:13px; font-weight:700; cursor:pointer;'
                    + 'background:rgba(15,23,42,.92); border:1px solid rgba(148,163,184,.35); border-left:none;'
                    + 'border-radius:0 7px 7px 0; box-shadow:2px 0 8px rgba(0,0,0,.4);'
                    + 'color:#94a3b8; transition:background .15s, border-color .15s, color .15s;';

                btn.onmouseenter = function () { if (!_dockXpTreinador || !_dockXpTreinador.aberta()) btn.style.color = '#f1f5f9'; };
                btn.onmouseleave = function () { pintarBotaoDockXpTreinador(!!(_dockXpTreinador && _dockXpTreinador.aberta())); };
                btn.onclick = function (ev) { ev.stopPropagation(); toggleDockXpTreinador(); };
                panel.appendChild(btn);

                pintarBotaoDockXpTreinador(!!(_dockXpTreinador && _dockXpTreinador.aberta()));
            }

            function pintarBotaoDockXpTreinador(aberto) {
                const btn = document.getElementById('ppxp-dock-toggle');
                if (!btn) return;
                btn.style.transform = 'translateY(-50%) rotate(' + (aberto ? '180' : '0') + 'deg)';
                btn.style.background = aberto ? 'rgba(34,197,94,.25)' : 'rgba(15,23,42,.92)';
                btn.style.borderColor = aberto ? 'rgba(34,197,94,.55)' : 'rgba(148,163,184,.35)';
                btn.style.color = aberto ? '#86efac' : '#94a3b8';
                btn.title = aberto ? 'Fechar XP Tracker completo' : 'Abrir XP Tracker completo';
            }

            function linhaXpDock(prefixoId, emoji, cor) {
                return '<div style="display:flex; flex-direction:column; gap:3px; margin-bottom:9px">'
                    + '<div style="display:flex; align-items:center; justify-content:space-between; gap:6px">'
                    + '<div style="display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden">'
                    + '<span style="font-size:11px; flex-shrink:0">' + emoji + '</span>'
                    + '<span id="' + prefixoId + '-name" style="font-size:11px; font-weight:800; color:' + cor + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">--</span>'
                    + '<span id="' + prefixoId + '-lv" style="font-size:9px; background:rgba(148,163,184,.15); border:1px solid rgba(148,163,184,.3); color:#cbd5e1; padding:0 4px; border-radius:4px; font-weight:800; font-family:\'SF Mono\',monospace; flex-shrink:0">Lv.--</span>'
                    + '</div>'
                    + '<span id="' + prefixoId + '-pct" style="font-size:11px; font-weight:900; color:' + cor + '; font-family:\'SF Mono\',monospace; flex-shrink:0">0%</span>'
                    + '</div>'
                    + '<div style="width:100%; height:5px; background:rgba(15,23,42,.9); border-radius:3px; overflow:hidden; border:1px solid rgba(148,163,184,.2)">'
                    + '<div id="' + prefixoId + '-fill" style="width:0%; height:100%; border-radius:3px; background:' + cor + '; transition:width .3s"></div>'
                    + '</div>'
                    + '<div style="display:flex; justify-content:space-between; font-size:9px; color:#94a3b8">'
                    + '<span id="' + prefixoId + '-falta">--</span>'
                    + '<span id="' + prefixoId + '-eta" style="color:#fde047; font-weight:700">⏳ --</span>'
                    + '</div>'
                    + '<div id="' + prefixoId + '-taxa" style="font-size:9px; color:#64748b">XP/h: --</div>'
                    + '</div>';
            }

            function garantirDockXpTreinador() {
                if (_dockXpTreinador) return _dockXpTreinador;
                if (typeof docaCriar !== 'function') return null;
                _dockXpTreinador = docaCriar({
                    id: 'ppxp-dock', titulo: '📈 XP Tracker completo', lado: 'direita',
                    largura: 250, ancora: 'player-panel', independente: true
                });
                _dockXpTreinador.corpo.innerHTML =
                    linhaXpDock('ppxp-dock-poke', '🐾', '#4ade80') +
                    linhaXpDock('ppxp-dock-jog', '🧑', '#fbbf24');
                return _dockXpTreinador;
            }

            function toggleDockXpTreinador() {
                const d = garantirDockXpTreinador();
                if (!d) return;
                const abrir = !d.aberta();
                d.mostrar(abrir, true);
                pintarBotaoDockXpTreinador(abrir);
                if (abrir && w.__idleSuiteXpStatus) {
                    atualizarConteudoDockXpClient(w.__idleSuiteXpStatus);
                }
            }

            function atualizarConteudoDockXpClient(s) {
                if (!_dockXpTreinador || !_dockXpTreinador.aberta() || !s) return;

                function preencher(prefixo, dado) {
                    if (!dado) return;
                    const elName = document.getElementById(prefixo + '-name');
                    const elLv = document.getElementById(prefixo + '-lv');
                    const elPct = document.getElementById(prefixo + '-pct');
                    const elFill = document.getElementById(prefixo + '-fill');
                    const elFalta = document.getElementById(prefixo + '-falta');
                    const elEta = document.getElementById(prefixo + '-eta');
                    const pct = Math.max(0, Math.min(100, Math.round(Number(dado.pct) || 0)));
                    if (elName) elName.textContent = (dado.shiny ? '✨ ' : '') + (dado.name || '--');
                    if (elLv) elLv.textContent = 'Lv.' + (dado.level || '--');
                    if (elPct) elPct.textContent = dado.pctText || (pct + '%');
                    if (elFill) elFill.style.width = pct + '%';
                    if (elFalta) elFalta.textContent = dado.falta || '—';
                    if (elEta) {
                        if (dado.xpCap) {
                            elEta.textContent = '⭐ MAX';
                        } else if (dado.pausado) {
                            elEta.textContent = '⏸️ Pausado';
                        } else if (dado.eta) {
                            elEta.textContent = (dado.eta.indexOf('⏳') === 0 || dado.eta.indexOf('⭐') === 0 || dado.eta.indexOf('⏸️') === 0)
                                ? dado.eta
                                : (dado.eta === '--' ? '⏳ —' : '⏳ ' + dado.eta);
                        } else {
                            elEta.textContent = '⏳ —';
                        }
                    }
                }

                preencher('ppxp-dock-poke', s.poke);
                preencher('ppxp-dock-jog', s.jog);

                const h = s.hunt || {};
                const taxaPokeH = h.taxaPoke > 0 ? Math.round(h.taxaPoke * 3600).toLocaleString('pt-BR') : '--';
                const taxaJogH = h.taxaJog > 0 ? Math.round(h.taxaJog * 3600).toLocaleString('pt-BR') : '--';
                const elTaxaPoke = document.getElementById('ppxp-dock-poke-taxa');
                const elTaxaJog = document.getElementById('ppxp-dock-jog-taxa');
                if (elTaxaPoke) elTaxaPoke.textContent = 'XP/h: ' + taxaPokeH;
                if (elTaxaJog) elTaxaJog.textContent = 'XP/h: ' + taxaJogH;

                const secs = Number(h.secs) || 0;
                const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60);
                const tempo = hh > 0 ? (hh + 'h ' + mm + 'm') : (mm + 'm');
                if (_dockXpTreinador.rodape) {
                    _dockXpTreinador.rodape.textContent = secs > 0
                        ? ('⏱️ ' + tempo + ' de caçada · ⚔️ ' + Number(h.kills || 0).toLocaleString('pt-BR') + ' kills')
                        : '';
                }
            }

            // ---------- 6. PONTES AUXILIARES PARA SHELL ----------
            w.__getTabInfo = function () {
                try {
                    const { poke, jog } = extrairDadosAtivos();
                    return JSON.stringify({
                        poke: poke.name || '',
                        lv: poke.level || '',
                        trainer: jog.name || ''
                    });
                } catch (e) { return '{}'; }
            };

            w.__obterDashboardStatus = function () {
                try {
                    const { s, player, active, hunt, poke, jog } = extrairDadosAtivos();
                    const temHunt = hunt && Number(hunt.secs || 0) > 0;
                    const taxaPoke = temHunt && Number(hunt.xp || 0) > 0 ? Number(hunt.xp) / Number(hunt.secs) : _taxaLocalPoke;
                    const taxaJog = temHunt && Number(hunt.pxp || 0) > 0 ? Number(hunt.pxp) / Number(hunt.secs) : _taxaLocalJog;
                    const segsPoke = taxaPoke > 0 && poke.xpRestante > 0 ? poke.xpRestante / taxaPoke : null;
                    const segsJog = taxaJog > 0 && jog.xpRestante > 0 ? jog.xpRestante / taxaJog : null;

                    return {
                        trainer: jog.name,
                        level: Number(jog.level) || 1,
                        xp: jog.xp,
                        xpNext: jog.xpNext,
                        xpPct: Math.round(jog.pct),
                        xpFalta: jog.xpRestante,
                        xpPorSeg: taxaJog,
                        trainerEtaSeg: segsJog,
                        trainerEta: fmtTempoCurto(segsJog) || '—',
                        kills: Number(player.kills || 0),
                        catches: Number(player.catches || 0),
                        gold: Number(player.gold || 0),
                        diamonds: Number(player.diamonds || 0),
                        active: {
                            id: active.id,
                            name: poke.name,
                            level: Number(poke.level) || 1,
                            shiny: poke.shiny,
                            hp: Number(active.hp || 0),
                            maxHp: Number(active.maxHp || 100),
                            exp: poke.xp,
                            expNext: poke.xpNext,
                            expPct: Math.round(poke.pct),
                            expFalta: poke.xpRestante,
                            expEtaSeg: segsPoke,
                            expEta: fmtTempoCurto(segsPoke) || '—',
                            xpPorSeg: taxaPoke
                        },
                        hunt: {
                            active: temHunt,
                            target: (hunt.lock && hunt.lock.name) || 'Caçada Livre',
                            kills: Number(hunt.kills || 0),
                            catches: Number(hunt.catches || 0),
                            xpGained: Number(hunt.xp || 0),
                            secs: Number(hunt.secs || 0)
                        }
                    };
                } catch (e) {
                    return { erro: String((e && e.message) || e) };
                }
            };

            // Loop de atualizacao continua de XP e UI (1s)
            setInterval(() => {
                garantirBotaoDockXpTreinador();
                atualizarStatusXpClient();
            }, 1000);

            garantirBotaoDockXpTreinador();
            atualizarStatusXpClient();
        })();
