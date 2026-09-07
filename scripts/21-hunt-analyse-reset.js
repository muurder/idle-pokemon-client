        // =====================================================================
        // 21-hunt-analyse-reset.js — BOTÃO RÁPIDO DE RESET NA BARRINHA NATIVA
        // (📊 Hunt Analyse)
        // =====================================================================
        // Porta de scripts/21-modal-cidade.js (dev), só a parte do botão --
        // o resto daquele arquivo é o "Master Reset" do motor de Auto Hunt
        // (zera contadores locais que não existem aqui) e não se aplica ao
        // client. O reset em si (`huntReset`) é uma ação do SERVIDOR do jogo,
        // chamada via apiTest (scripts/18-api-helpers.js) -- não depende de
        // motor nenhum.
        //
        // #mini-hunt é do jogo, não do userscript, e o próprio jogo reescreve
        // o innerHTML dela a cada tick -- um botão inserido DENTRO dela seria
        // apagado no próximo refresh. O botão aqui é um elemento à parte que
        // PERSEGUE o retângulo dela a cada 400ms (mesmo ritmo de
        // `docaAncorarTodas`, 09b-doca.js): arrastar a barra move o botão
        // junto no próximo tick, sem tocar em como ela se move.
        //
        // Rodava a 150ms antes -- rápido demais pra um reposicionamento que só
        // muda quando alguém arrasta a barra manualmente, e com getBoundingClientRect
        // (força layout) em CADA conta aberta isso somava até ~100 execuções/s
        // com muitas contas simultâneas. 400ms segue igual de suave visualmente
        // e alinha com o mesmo ritmo já usado pro resto das docas.
        // =====================================================================
        // Função robusta de reset que pode ser invocada tanto localmente quanto via executeJavaScript pelo shell
        window.__haExecutarResetHunt = async function(origem = 'local') {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            let ok = false;

            // 1. Zera dados locais em memória imediatamente para resposta visual instantânea
            try {
                if (w.K && w.K.hunt) {
                    w.K.hunt.secs = 0;
                    w.K.hunt.t0 = Date.now();
                    w.K.hunt.gold = 0;
                    w.K.hunt.soldGold = 0;
                    w.K.hunt.lootGold = 0;
                    w.K.hunt.loot = [];
                    w.K.hunt.xp = 0;
                    w.K.hunt.kills = 0;
                    w.K.hunt.catches = 0;
                }
                if (w.gameState && w.gameState._lastHunt) {
                    w.gameState._lastHunt = (w.K && w.K.hunt) ? w.K.hunt : { secs: 0, t0: Date.now(), gold: 0, soldGold: 0, lootGold: 0, loot: [], xp: 0, kills: 0 };
                }
            } catch (e) { }

            // 2. Dispara o reset oficial no servidor
            try {
                if (typeof w.Y === 'function') {
                    await w.Y('huntReset');
                    ok = true;
                }
            } catch (e) { }

            if (!ok && typeof apiTest === 'function') {
                try {
                    await apiTest('huntReset');
                    ok = true;
                } catch (e) { }
            }

            if (!ok) {
                let tok = '';
                try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e){}
                if (!tok || tok.length < 10) {
                    try { tok = localStorage.getItem('pmi_token') || localStorage.getItem('token') || ''; } catch(e){}
                }
                if (!tok || tok.length < 10) tok = w.q || w.TOKEN || w.TAB_TOKEN || '';
                if (tok) {
                    await fetch('/api/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: tok, action: 'huntReset' })
                    }).catch(() => {});
                    ok = true;
                }
            }

            // 3. Força atualização imediata da mini barra passando o objeto zerado
            try {
                const huntObj = (w.K && w.K.hunt) || (w.gameState && w.gameState._lastHunt) || { secs: 0, t0: Date.now(), gold: 0, soldGold: 0, lootGold: 0, loot: [], xp: 0, kills: 0 };
                if (typeof w.updateMiniHunt === 'function') {
                    w.updateMiniHunt(huntObj);
                }
            } catch (e) { }

            try {
                if (typeof logEvent === 'function') {
                    const txt = origem === 'global' ? '🔄 <b>Hunt Analyse reiniciada</b> (todas as abas)' : '🔄 <b>Hunt Analyse reiniciada</b> (esta aba)';
                    logEvent(txt, '#38bdf8');
                }
            } catch (e) { }

            return ok;
        };

        function montarBotaoResetMiniHunt() {
            const barra = document.getElementById('mini-hunt');
            if (!barra) return;

            let container = document.getElementById('ha-mini-hunt-actions');
            if (!container) {
                container = document.createElement('div');
                container.id = 'ha-mini-hunt-actions';
                container.style.cssText = 'position:fixed;z-index:26;display:flex;align-items:center;gap:3px;';
                document.body.appendChild(container);
            }

            let btn = document.getElementById('ha-mini-hunt-reset');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'ha-mini-hunt-reset';
                btn.type = 'button';
                btn.title = 'Reiniciar Hunt Analyse (desta aba)';
                btn.textContent = '🔄';
                btn.style.cssText = 'display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #2a3d55;border-radius:4px;'
                    + 'color:#38bdf8;cursor:pointer;font-size:12px;padding:0 7px;line-height:1;height:100%;box-sizing:border-box;transition:border-color .15s, color .15s, opacity .15s;';
                btn.onmouseenter = () => { btn.style.color = '#7fd1ff'; btn.style.borderColor = '#38bdf8'; btn.style.background = 'rgba(56,189,248,.15)'; };
                btn.onmouseleave = () => { btn.style.color = '#38bdf8'; btn.style.borderColor = '#2a3d55'; btn.style.background = 'rgba(10,16,24,.85)'; };
                btn.onmousedown = () => { btn.style.opacity = '0.7'; };
                btn.onmouseup = () => { btn.style.opacity = '1'; };
                btn.onclick = async ev => {
                    ev.stopPropagation();
                    if (typeof window.__haExecutarResetHunt === 'function') {
                        await window.__haExecutarResetHunt('local');
                    }
                };
                container.appendChild(btn);
            } else if (btn.parentElement !== container) {
                btn.style.position = 'static';
                btn.style.borderRadius = '4px';
                btn.style.height = '100%';
                btn.style.boxSizing = 'border-box';
                container.appendChild(btn);
            }

            let btnAll = document.getElementById('ha-mini-hunt-reset-all');
            if (!btnAll) {
                btnAll = document.createElement('button');
                btnAll.id = 'ha-mini-hunt-reset-all';
                btnAll.type = 'button';
                btnAll.title = 'Reiniciar Hunt Analyse em TODAS as abas (Global)';
                btnAll.textContent = '🌐';
                btnAll.style.cssText = 'display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #4c1d95;border-radius:4px;'
                    + 'color:#c084fc;cursor:pointer;font-size:12px;padding:0 7px;line-height:1;height:100%;box-sizing:border-box;transition:border-color .15s, color .15s, opacity .15s;';
                btnAll.onmouseenter = () => { btnAll.style.color = '#f3e8ff'; btnAll.style.borderColor = '#a855f7'; btnAll.style.background = 'rgba(147,51,234,.25)'; };
                btnAll.onmouseleave = () => { btnAll.style.color = '#c084fc'; btnAll.style.borderColor = '#4c1d95'; btnAll.style.background = 'rgba(10,16,24,.85)'; };
                btnAll.onmousedown = () => { btnAll.style.opacity = '0.7'; };
                btnAll.onmouseup = () => { btnAll.style.opacity = '1'; };
                btnAll.onclick = async ev => {
                    ev.stopPropagation();

                    // 1. Notifica o shell via console-message
                    console.log('[HUNT_RESET_ALL]');

                    // 2. Notifica o shell via page-title-updated (fallback nativo)
                    try {
                        const prevTitle = document.title;
                        document.title = '__HUNT_RESET_ALL__' + Date.now();
                        setTimeout(() => { try { if (document.title.startsWith('__HUNT_RESET_ALL__')) document.title = prevTitle; } catch(e){} }, 120);
                    } catch (e) { }

                    // 3. BroadcastChannel para fallback caso rodando fora do Electron
                    try {
                        if (typeof BroadcastChannel !== 'undefined') {
                            const bc = new BroadcastChannel('ha_hunt_reset_channel');
                            bc.postMessage({ acao: 'huntReset', ts: Date.now() });
                            bc.close();
                        }
                    } catch (e) { }

                    // 4. Executa localmente nesta aba imediatamente
                    if (typeof window.__haExecutarResetHunt === 'function') {
                        await window.__haExecutarResetHunt('global');
                    }
                };
                container.appendChild(btnAll);
            } else if (btnAll.parentElement !== container) {
                btnAll.style.position = 'static';
                btnAll.style.borderRadius = '4px';
                btnAll.style.height = '100%';
                btnAll.style.boxSizing = 'border-box';
                container.appendChild(btnAll);
            }

            const escondida = barra.classList.contains('hidden') || getComputedStyle(barra).display === 'none';
            container.style.display = escondida ? 'none' : 'flex';
            if (!escondida) {
                const r = barra.getBoundingClientRect();
                container.style.left = Math.round(r.right + 4) + 'px';
                container.style.top = Math.round(r.top) + 'px';
                container.style.height = Math.round(r.height) + 'px';
            }
        }

        // Listener fallback de BroadcastChannel para instâncias externas
        try {
            if (typeof BroadcastChannel !== 'undefined' && !window.__haHuntResetChannelIniciado) {
                window.__haHuntResetChannelIniciado = true;
                const bc = new BroadcastChannel('ha_hunt_reset_channel');
                bc.onmessage = async ev => {
                    if (ev && ev.data && ev.data.acao === 'huntReset') {
                        if (typeof window.__haExecutarResetHunt === 'function') {
                            await window.__haExecutarResetHunt('global');
                        }
                    }
                };
            }
        } catch (e) { }

        setInterval(montarBotaoResetMiniHunt, 400);
        montarBotaoResetMiniHunt();
