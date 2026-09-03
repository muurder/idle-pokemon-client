        // =====================================================================
        // 23b-xp-tracker-dock.js — DOCA DO XP TRACKER NO CARD DO TREINADOR
        // =====================================================================
        // Porta de scripts/28b-xp-tracker-dock.js (dev) pro client. O card
        // oficial do jogo (#player-panel) já ganha os selos de ETA em
        // 23-status-bridge.js (__statusPintarEtaCardOficial): "21m · ≈506x" ao
        // lado do nível do Pokémon e do EXP do treinador. O que não cabe ali —
        // XP/h, tempo de caçada, abates — vive nesta doca, atrás de uma
        // lingueta colada na borda do card. Oculta por padrão.
        //
        // Fonte do dado: no dev isso lê window.__idleSuiteXpStatus (montado
        // pelo motor de Auto Hunt). O client não tem esse motor, então aqui
        // os mesmos números são montados direto do estado do jogo, do mesmo
        // jeito que __statusPintarEtaCardOficial já faz em 23-status-bridge.js
        // (__statusEstadoBruto / hunt.xp / hunt.secs / hunt.pxp do servidor).
        //
        // Infra de doca (arrastar, ancorar, recolher) vem de 09b-doca.js.
        // =====================================================================

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

            const abertoAgora = !!(_dockXpTreinador && _dockXpTreinador.aberta());
            pintarBotaoDockXpTreinador(abertoAgora);
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
            const abrir = !d.aberta();
            d.mostrar(abrir, true);
            pintarBotaoDockXpTreinador(abrir);
            if (abrir) atualizarConteudoDockXpTreinador();
        }

        // Monta o mesmo formato que window.__idleSuiteXpStatus tinha no dev,
        // só que a partir do estado que 23-status-bridge.js já lê do servidor
        // (__statusEstadoBruto), sem depender de motor de auto-hunt nenhum.
        function _lerXpStatusDock() {
            const s = __statusEstadoBruto();
            const p = s.player || {};
            const team = Array.isArray(s.team) ? s.team : [];
            const act = s.active || team.find(x => x && x.active) || team[0] || null;
            const hunt = s.hunt || {};
            const temHunt = hunt && hunt.secs > 0;
            const taxaPoke = temHunt && hunt.xp > 0 ? Number(hunt.xp) / Number(hunt.secs) : 0;
            const taxaJog = temHunt && hunt.pxp > 0 ? Number(hunt.pxp) / Number(hunt.secs) : 0;

            function montarBloco(entidade, taxa) {
                if (!entidade) return null;
                const xp = Number(entidade.xp || entidade.exp || 0);
                const xpNext = Number(entidade.xpNext || entidade.expNext || 0);
                const pct = entidade.xpPct != null ? Number(entidade.xpPct)
                    : (entidade.expPct != null ? Number(entidade.expPct)
                        : (xpNext > 0 ? Math.min(100, Math.round((xp / xpNext) * 100)) : 0));
                const falta = Math.max(0, xpNext - xp);
                const segs = taxa > 0 && falta > 0 ? falta / taxa : Infinity;
                return {
                    name: entidade.name || '--',
                    level: entidade.level || '--',
                    shiny: !!entidade.shiny,
                    pct: pct,
                    pctText: pct + '%',
                    falta: falta > 0 ? __statusFmtNum(Math.round(falta)) + ' XP restante' : '—',
                    eta: __statusFmtTempoCurto(segs)
                };
            }

            return {
                poke: montarBloco(act, taxaPoke),
                jog: montarBloco(p, taxaJog),
                hunt: { taxaPoke: taxaPoke, taxaJog: taxaJog, secs: Number(hunt.secs || 0), kills: Number(hunt.kills || 0) }
            };
        }

        function atualizarConteudoDockXpTreinador() {
            if (!_dockXpTreinador || !_dockXpTreinador.aberta()) return;
            const s = _lerXpStatusDock();

            function preencher(prefixo, dado) {
                if (!dado) return;
                const elName = document.getElementById(prefixo + '-name');
                const elLv = document.getElementById(prefixo + '-lv');
                const elPct = document.getElementById(prefixo + '-pct');
                const elFill = document.getElementById(prefixo + '-fill');
                const elFalta = document.getElementById(prefixo + '-falta');
                const elEta = document.getElementById(prefixo + '-eta');
                const pct = Math.max(0, Math.min(100, Number(dado.pct) || 0));
                if (elName) elName.textContent = (dado.shiny ? '✨ ' : '') + (dado.name || '--');
                if (elLv) elLv.textContent = 'Lv.' + (dado.level || '--');
                if (elPct) elPct.textContent = dado.pctText || (pct + '%');
                if (elFill) elFill.style.width = pct + '%';
                if (elFalta) elFalta.textContent = dado.falta || '—';
                if (elEta) elEta.textContent = dado.eta ? (dado.eta.indexOf('⏳') === 0 ? dado.eta : '⏳ ' + dado.eta) : '⏳ --';
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
            _dockXpTreinador.rodape.textContent = secs > 0
                ? ('⏱️ ' + tempo + ' de caçada · ⚔️ ' + Number(h.kills || 0).toLocaleString('pt-BR') + ' kills')
                : '';
        }

        garantirBotaoDockXpTreinador();
        setInterval(function () {
            garantirBotaoDockXpTreinador();
            atualizarConteudoDockXpTreinador();
        }, 1000);
