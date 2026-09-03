        // =====================================================================
        // 20-pin-topbar.js — SISTEMA DE PIN NA TOPBAR DO JOGO
        // =====================================================================
        // Extraido de scripts/20-cidade-utils.js do dev (a IIFE
        // instalarSistemaPinTopbar, self-contida) -- o resto daquele arquivo e
        // Auto Hunt/troca-de-conta, que nao vem pro cliente. So duas funcoes
        // do dev foram trocadas por uma versao minima aqui embaixo:
        //   chamarFuncaoJogo -- o dev tem um fallback via `executarNaPagina`
        //   (ponte de sandbox) que so existe no Idle Suite; aqui chama so o
        //   caminho direto (que e o que cobre os itens do PIN_ALLOWLIST).
        //   logEvent -- escrevia no feed do painel do Idle Suite (nao existe
        //   aqui); vira no-op.
        // =====================================================================
        function chamarFuncaoJogo(nome, args = []) {
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (typeof w[nome] === 'function') { w[nome](...args); return 'direto'; }
            } catch (e) { }
            return null;
        }
        function logEvent(txt, cor) { /* feed do Idle Suite nao existe no cliente */ }

        // =====================================================
        // 📌 SISTEMA DE PIN PARA MENUS DA TOPBAR (AO LADO DO MAPA/HUNT)
        // Como funciona: o jogo cria, por categoria da topbar (Treinador, Loja,
        // Recompensas, Comunidade, Sistema, Ginásio, Boss), um "flyout" que só
        // aparece no hover — os botões dentro dele (.tbm-item/.gp-tbmenu-item/
        // .bs-tbitem) são um PROXY sem data-modal/id próprios. O botão REAL, que
        // sabe pra onde navegar, fica escondido em #topbar com a classe .tbm-off.
        // A gente injeta o 📌 no proxy (que é o que o usuário vê e clica) mas
        // resolve a AÇÃO (data-modal/id) contra o botão real, casando pelo título.
        // =====================================================
        (function instalarSistemaPinTopbar() {
            const STORAGE_KEY = 'idleTopbarPinnedShortcuts_v2';

            const PIN_ALLOWLIST = [
                'time & box', 'invent', 'golpes da ca', 'item segurado',
                'boost', 'natures', 'pergaminho', 'mega evolu', 'g. balls',
                'gerenciador de bolas', 'bolas', 'perfil', 'outfit',
                'vender por raridade', 'gina', 'lideres', 'meu time',
                'pvp ranqueado', 'individual', 'guilda', 'mercado global',
                'diamantes', 'loja de', 'moon pass', 'indique',
                'recompensa di', 'mailbox', 'quest', 'clã', 'ranking',
                'capturas glob', 'captura', 'atualiza', 'configura',
                'poke', 'sair', 'moon'
            ];
            function ehPermitido(label) {
                const t = label.toLowerCase();
                if (t.length < 3 || t.length > 45) return false;
                return PIN_ALLOWLIST.some(kw => t.indexOf(kw) >= 0);
            }

            function tituloCurto(titulo) {
                return (titulo || '').split(/[—·]/)[0].trim().toLowerCase();
            }

            // O ícone do proxy do flyout é uma CÓPIA 1:1 do ícone do botão real
            // (o próprio jogo faz isso ao montar o flyout) — então é uma chave bem
            // mais confiável do que o texto pra achar o real depois.
            function acharIcone(el) {
                const ic = el.querySelector('.tbm-ic, .gp-tbmenu-ic, .bs-tbic') || el;
                const img = ic.querySelector('img');
                if (img) return { tipo: 'img', valor: img.getAttribute('src') || '' };
                return { tipo: 'texto', valor: (ic.textContent || '').trim() };
            }

            // Acha o botão REAL (escondido em #topbar, classe .tbm-off) correspondente
            // a um item do flyout — é ele que sabe pra onde a ação deve ir (data-modal/id).
            // proxyEl é opcional: quando disponível (flyout aberto), casa pelo ÍCONE
            // (confiável — copiado do real); senão cai pro título, que é mais frágil
            // (o rótulo do flyout às vezes não bate com o title do botão real, ex:
            // "Mercado Global" no flyout vs title="Mercado — compre e venda..." no real).
            function acharBotaoReal(proxyEl, label) {
                const topbarEl = document.getElementById('topbar');
                if (!topbarEl) return null;
                const candidatos = topbarEl.querySelectorAll('.tbm-off');

                if (proxyEl) {
                    const icone = acharIcone(proxyEl);
                    if (icone.valor) {
                        for (const el of candidatos) {
                            const img = el.querySelector('img');
                            if (icone.tipo === 'img' && img && img.getAttribute('src') === icone.valor) return el;
                            if (icone.tipo === 'texto' && !img && (el.querySelector('span') || el).textContent.trim() === icone.valor) return el;
                        }
                    }
                }

                if (label) {
                    const alvo = label.trim().toLowerCase();
                    for (const el of candidatos) {
                        const t = tituloCurto(el.getAttribute('title'));
                        if (t === alvo || t.indexOf(alvo) >= 0 || alvo.indexOf(t) >= 0) return el;
                    }
                }
                return null;
            }

            function extrairEmoji(label) {
                const m = label && String(label).match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u);
                return m ? m[0] : '🎮';
            }

            // ---------- Estado (persistido em localStorage) ----------
            function carregarFixados() {
                try {
                    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    if (Array.isArray(parsed)) return parsed;
                } catch(e) {}
                return [];
            }
            function salvarFixados() {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedList)); } catch(e) {}
            }
            let pinnedList = carregarFixados();

            function combina(a, b) {
                return a.id === b.id || (a.label && b.label && a.label.toLowerCase() === b.label.toLowerCase());
            }
            function estaFixado(item) {
                return pinnedList.some(p => combina(p, item));
            }
            function alternarPinItem(item) {
                const idx = pinnedList.findIndex(p => combina(p, item));
                if (idx >= 0) pinnedList.splice(idx, 1);
                else pinnedList.push(item);
                salvarFixados();
                renderizarBarraFixada();
                atualizarBotoesPinNosMenus();
            }

            // ---------- Barra fixada, ao lado da topbar/Hunt ----------
            let rail = document.getElementById('idle-topbar-pinned-shortcuts');
            if (!rail) {
                rail = document.createElement('div');
                rail.id = 'idle-topbar-pinned-shortcuts';
                rail.className = 'hud';
                rail.style.cssText = 'position:fixed;left:0;top:0;z-index:25;display:none;visibility:hidden;flex-direction:row;align-items:center;gap:clamp(2px,.35vw,5px);padding:6px clamp(4px,.7vw,10px);border:1px solid rgba(234,179,8,0.45);border-radius:9px;background:rgba(12,16,26,0.98);box-shadow:0 4px 16px rgba(0,0,0,.6);box-sizing:border-box;transition:all .15s ease;';
                document.body.appendChild(rail);
            }

            function posicionarAoLadoDoHunt() {
                if (rail.style.display === 'none') return;
                const topbarEl = document.getElementById('topbar');
                if (!topbarEl) return;
                const r = topbarEl.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return;
                rail.style.height = `${Math.round(r.height)}px`;
                rail.style.top = `${Math.round(r.top)}px`;
                rail.style.left = `${Math.max(2, Math.round(r.left - rail.offsetWidth - 4))}px`; // à esquerda da topbar
            }

            // Acha o ícone (img) do botão real de um item pinado, pra desenhar no rail.
            function resolverIconeReal(item) {
                if (item.icon && item.icon.length > 5) return item.icon;
                const real = (item.elId && document.getElementById(item.elId))
                    || (item.dataModal && document.querySelector(`[data-modal="${item.dataModal}"], [data-action="${item.dataModal}"]`))
                    || acharBotaoReal(null, item.label);
                if (!real) return '';
                const img = real.querySelector('img');
                if (img && img.src) return img.src;
                const bg = getComputedStyle(real).backgroundImage;
                const m = bg && bg.match(/url\(['"]?(.*?)['"]?\)/);
                return m ? m[1] : '';
            }

            function criarBotaoFixado(item) {
                const iconSrc = resolverIconeReal(item);
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'tb ic';
                b.title = `${item.label} (Clique para abrir · Passe o mouse para desafixar)`;
                b.style.cssText = [
                    'position:relative', 'display:flex', 'align-items:center', 'justify-content:center',
                    'width:clamp(32px, 3.7vw, 52px)', 'height:clamp(32px, 3.7vw, 52px)',
                    'padding:clamp(3px, .45vw, 6px)', 'border:none', 'border-radius:8px',
                    'background:rgba(15,23,42,0.9)', 'color:#e2e8f0', 'cursor:pointer',
                    'transition:all .15s ease', 'box-sizing:border-box',
                    'box-shadow:0 2px 8px rgba(0,0,0,0.5)'
                ].join(';');
                b.innerHTML = iconSrc
                    ? `<img src="${iconSrc}" alt="${item.label}" style="width:clamp(22px, 2.6vw, 34px); height:clamp(22px, 2.6vw, 34px); object-fit:contain; filter:drop-shadow(0 1px 2px rgba(0,0,0,.5)); opacity:.95; transition:transform .12s ease, opacity .12s ease;" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${item.emoji || extrairEmoji(item.label)}',style:'font-size:18px;line-height:1'}))">`
                    : `<span style="font-size:18px; line-height:1">${item.emoji || extrairEmoji(item.label)}</span>`;
                b.insertAdjacentHTML('beforeend', '<div class="idle-unpin-btn" title="Desafixar da Barra" style="position:absolute; top:-3px; right:-3px; width:15px; height:15px; background:#ef4444; color:#fff; border-radius:50%; font-size:9px; font-weight:900; display:none; align-items:center; justify-content:center; box-shadow:0 0 6px rgba(239,68,68,0.8); cursor:pointer">✕</div>');

                const unpinBtn = b.querySelector('.idle-unpin-btn');
                unpinBtn.onclick = (e) => { e.stopPropagation(); e.preventDefault(); alternarPinItem(item); };
                b.onmouseenter = () => { b.style.background = '#223047'; b.style.transform = 'translateY(-1px)'; unpinBtn.style.display = 'flex'; };
                b.onmouseleave = () => { b.style.background = 'rgba(15,23,42,0.9)'; b.style.transform = ''; unpinBtn.style.display = 'none'; };
                b.onclick = () => executarAcaoItem(item);
                return b;
            }

            function renderizarBarraFixada() {
                rail.innerHTML = '';
                if (!pinnedList.length) {
                    rail.style.display = 'none';
                    rail.style.visibility = 'hidden';
                    rail.style.pointerEvents = 'none';
                    return;
                }
                rail.style.display = 'flex';
                rail.style.visibility = 'visible';
                rail.style.pointerEvents = 'auto';
                // try/catch por item: um item com dado inesperado não pode derrubar
                // o resto da barra no meio do forEach.
                pinnedList.forEach(item => {
                    try { rail.appendChild(criarBotaoFixado(item)); } catch(e) {}
                });
                posicionarAoLadoDoHunt();
            }

            // ---------- Executa a ação de um item (nativo ou fixado) ----------
            function abrirItemFlyout(item, flyoutSel, itemSel, parentSel) {
                const abrir = () => {
                    const fly = document.querySelector(flyoutSel);
                    if (!fly) return false;
                    const alvo = (item.label || '').trim().toLowerCase();
                    for (const el of fly.querySelectorAll(itemSel)) {
                        const lblEl = el.querySelector('.tbm-label, .gp-tbmenu-label, .bs-tblab') || el;
                        const txt = (lblEl.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        if (txt.indexOf(alvo) >= 0 && typeof el.click === 'function') { el.click(); return true; }
                    }
                    return false;
                };
                if (abrir()) return true;
                const parent = document.querySelector(parentSel);
                if (parent && typeof parent.click === 'function') { parent.click(); setTimeout(abrir, 120); return true; }
                return false;
            }

            function executarAcaoItem(item) {
                if (item.fnName) {
                    const via = chamarFuncaoJogo(item.fnName);
                    if (via) { logEvent(`🔗 <b>${item.label}</b> aberto · via ${via}`, '#7dd3fc'); return; }
                }
                if (item.module === 'gym' && abrirItemFlyout(item, '.gp-tbmenu-flyout.gp-tbmenu-open', '.gp-tbmenu-item', '#tb-gymproto')) {
                    logEvent(`🔗 <b>${item.label}</b> aberto via Ginásio`, '#7dd3fc'); return;
                }
                if (item.module === 'boss' && abrirItemFlyout(item, '.bs-tbmenu.bs-tbopen', '.bs-tbitem', '#tb-boss')) {
                    logEvent(`🔗 <b>${item.label}</b> aberto via Boss`, '#7dd3fc'); return;
                }
                if (item.dataModal) {
                    const el = document.querySelector(`[data-modal="${item.dataModal}"], [data-action="${item.dataModal}"]`);
                    if (el && typeof el.click === 'function') { el.click(); return; }
                }
                if (item.elId) {
                    const el = document.getElementById(item.elId);
                    if (el && typeof el.click === 'function') { el.click(); return; }
                }
            }

            // ---------- Botão de pin 📌 nos itens visíveis do flyout ----------
            function atualizarBotoesPinNosMenus() {
                document.querySelectorAll('.idle-menu-pin-btn').forEach(btn => {
                    const pinado = estaFixado({ id: btn.dataset.pinId, label: btn.dataset.pinLabel });
                    btn.style.color = pinado ? '#facc15' : 'rgba(255,255,255,0.45)';
                    btn.style.opacity = pinado ? '1' : '0.7';
                    btn.style.filter = pinado ? 'drop-shadow(0 0 4px rgba(250,204,21,0.8))' : 'none';
                    btn.title = pinado ? 'Desafixar da barra de atalhos' : 'Fixar ao lado do mapa (Hunt)';
                    const host = btn.parentElement;
                    if (host) host.style.boxShadow = pinado ? 'inset 0 0 0 1px rgba(16,185,129,0.5)' : '';
                });
            }

            function injectPin(proxyEl, module) {
                if (proxyEl.querySelector('.idle-menu-pin-btn')) return;
                const lblEl = proxyEl.querySelector('.tbm-label, .gp-tbmenu-label, .bs-tblab');
                const label = ((lblEl || proxyEl).textContent || '').replace(/\s+/g, ' ').trim();
                if (!ehPermitido(label)) return;

                let dataModal = proxyEl.getAttribute('data-modal') || proxyEl.getAttribute('data-action') || '';
                let elId = '';
                if (module === 'tbm') {
                    // proxy do flyout nunca tem data-modal/id — resolve contra o real
                    const real = acharBotaoReal(proxyEl, label);
                    if (real) {
                        dataModal = dataModal || real.getAttribute('data-modal') || real.getAttribute('data-action') || '';
                        elId = real.id || '';
                    }
                } else {
                    elId = proxyEl.id || '';
                }
                const id = (dataModal || elId || (module + '_' + label.toLowerCase())).replace(/[^a-z0-9]/gi, '_');

                // O ícone do proxy é cópia do real (img OU emoji/texto) — guarda os
                // dois pra não cair no 🎮 genérico quando o item usa emoji (ex:
                // Mercado Global = 🏪 no botão real, mas "Mercado Global" como texto
                // não tem nenhum emoji pra extractEmoji() achar).
                const icone = acharIcone(proxyEl);
                const pin = document.createElement('div');
                pin.className = 'idle-menu-pin-btn';
                pin.dataset.pinId = id;
                pin.dataset.pinLabel = label.substring(0, 30);
                pin.dataset.pinIcon = icone.tipo === 'img' ? icone.valor : '';
                pin.dataset.pinEmoji = icone.tipo === 'texto' && icone.valor ? icone.valor : extrairEmoji(label);
                pin.dataset.pinModule = module;
                pin.dataset.pinDatamodal = dataModal;
                pin.dataset.pinElid = elId;
                pin.textContent = '📌';
                pin.title = 'Fixar: ' + label.substring(0, 30);
                pin.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(250,204,21,0.25);border:1px solid rgba(250,204,21,0.6);border-radius:4px;color:#facc15;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,0.7);pointer-events:auto';

                proxyEl.style.position = 'relative';
                proxyEl.style.overflow = 'visible';
                proxyEl.appendChild(pin);
            }

            function injetarPinsNosMenus() {
                if (!document.getElementById('topbar')) return;
                // Idempotente (injectPin pula quem já tem pin) — pode rodar à vontade
                // sem remover/recriar nada, o que evita o "piscar" visual.
                const tbmFlyout = document.querySelector('.tbm-flyout.tbm-open');
                if (tbmFlyout) tbmFlyout.querySelectorAll('.tbm-item').forEach(el => injectPin(el, 'tbm'));

                const gymFlyout = document.querySelector('.gp-tbmenu-flyout.gp-tbmenu-open');
                if (gymFlyout) gymFlyout.querySelectorAll('.gp-tbmenu-item').forEach(el => injectPin(el, 'gym'));

                const bossFlyout = document.querySelector('.bs-tbmenu.bs-tbopen');
                if (bossFlyout) bossFlyout.querySelectorAll('.bs-tbitem').forEach(el => injectPin(el, 'boss'));

                atualizarBotoesPinNosMenus();
            }

            // ---------- Clique no 📌 — UM único handler, delegado ----------
            document.addEventListener('click', ev => {
                const pinBtn = ev.target.closest('.idle-menu-pin-btn');
                if (!pinBtn) return;
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                alternarPinItem({
                    id: pinBtn.dataset.pinId,
                    label: pinBtn.dataset.pinLabel,
                    icon: pinBtn.dataset.pinIcon,
                    emoji: pinBtn.dataset.pinEmoji,
                    module: pinBtn.dataset.pinModule,
                    dataModal: pinBtn.dataset.pinDatamodal,
                    elId: pinBtn.dataset.pinElid
                });
            }, true);
            // mousedown/pointerdown só impedem que o clique vaze pro botão do jogo
            // por baixo do pin — nenhum dos dois aciona o toggle.
            ['mousedown', 'pointerdown'].forEach(evtName => {
                document.addEventListener(evtName, ev => {
                    if (ev.target.closest('.idle-menu-pin-btn')) { ev.preventDefault(); ev.stopPropagation(); }
                }, true);
            });

            // ---------- Gatilhos ----------
            let agendado = null;
            function agendarInjecao() {
                if (agendado) return;
                agendado = setTimeout(() => { agendado = null; injetarPinsNosMenus(); }, 10);
            }
            document.addEventListener('mouseover', ev => {
                if (ev.target.closest && ev.target.closest('#topbar [aria-haspopup="true"], #tb-gymproto, #tb-boss')) {
                    agendarInjecao();
                }
            }, { passive: true });

            // Rede de segurança, bem mais espaçada (a injeção é idempotente/barata).
            setInterval(() => {
                injetarPinsNosMenus();
                if (pinnedList.length) posicionarAoLadoDoHunt();
            }, 3000);
            window.addEventListener('resize', posicionarAoLadoDoHunt, { passive: true });

            // Atalhos de teclado (Shift+B = Time & Box, Shift+I = Inventário)
            document.addEventListener('keydown', ev => {
                if (ev.defaultPrevented || ev.ctrlKey || ev.altKey || ev.metaKey) return;
                const tag = document.activeElement && document.activeElement.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                if (ev.shiftKey && ev.key.toLowerCase() === 'b') { ev.preventDefault(); executarAcaoItem({ label: 'Time & Box', fnName: 'openTeamBox', dataModal: 'team' }); }
                if (ev.shiftKey && ev.key.toLowerCase() === 'i') { ev.preventDefault(); executarAcaoItem({ label: 'Inventário', fnName: 'openBag', dataModal: 'bag' }); }
            });

            // Hook mínimo de debug via F12 (Console): __idlePins.list() / .rescan()
            window.__idlePins = {
                list: () => pinnedList.map(p => ({ id: p.id, label: p.label })),
                rescan: injetarPinsNosMenus,
                toggle: alternarPinItem
            };

            renderizarBarraFixada();
            posicionarAoLadoDoHunt();
        })();
