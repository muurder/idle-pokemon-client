        // =====================================================================
        // 41-pokepedia-ui.js — POKÉPÉDIA: botão flutuante + janela de busca
        // =====================================================================
        // Desenha a Poképédia. O DADO vem todo do 40 (que lê o /api/meta via S);
        // aqui é só tela. É de propósito AUTO-CONTIDO: um botão 📚 próprio e uma
        // janela (overlay) própria, sem tocar no painel-suite (07h/07o/08). Isso
        // deixa o layout livre pra ocupar a tela toda — que é o que uma dex de
        // 599 precisa — e mantém o módulo fácil de portar depois (o botão e o
        // overlay nascem do body, não dependem da suite).
        //
        // ── SPRITES ──
        // Pokémon: `window.loadSprite(lookType, px, shiny)` do jogo (mesmo
        // caminho da doca da Equipe, 36) — pintado SÓ quando a linha entra na
        // tela (IntersectionObserver), senão 599 canvases nascem de uma vez.
        // Item (held/TM): o jogo resolve por imagem, `/sprites/item_<cid>.png`
        // (ver 35). Held usa `cid`, TM usa `spriteCid`.
        // =====================================================================

        (function () {
            if (typeof document === 'undefined') return;

            const PP_COR_TIPO = {
                normal: '#9fa19f', fire: '#e62829', water: '#2980ef', grass: '#3fa129',
                electric: '#e0b000', ice: '#3dcef3', fighting: '#ff8000', poison: '#9141cb',
                ground: '#b0722a', flying: '#81b9ef', psychic: '#ef4179', bug: '#91a119',
                rock: '#afa981', ghost: '#704170', dragon: '#5060e1', dark: '#5a4a47',
                steel: '#60a1b8', fairy: '#ef70ef'
            };
            const PP_TIER_COR = { S: '#ff5d8f', A: '#ffb020', B: '#54c1ff', C: '#8fd36b' };

            function ppWin() {
                try { return (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window; }
                catch (e) { return window; }
            }

            function ppEsc(t) {
                return String(t == null ? '' : t).replace(/[&<>"']/g, c => (
                    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
                ));
            }

            function ppChipTipo(t) {
                if (!t) return '';
                const c = PP_COR_TIPO[String(t).toLowerCase()] || '#6b7280';
                return `<span class="pp-tp" style="background:${c}">${ppEsc(String(t).toUpperCase())}</span>`;
            }

            function ppChipTier(t) {
                if (!t) return '';
                const c = PP_TIER_COR[String(t).toUpperCase()] || '#6b7280';
                return `<span class="pp-tier" style="color:${c};border-color:${c}">${ppEsc(String(t).toUpperCase())}</span>`;
            }

            // ── CSS (uma vez) ─────────────────────────────────────────────────
            function ppCss() {
                if (document.getElementById('pp-css')) return;
                const st = document.createElement('style');
                st.id = 'pp-css';
                st.textContent = `
                    .pp-ov {
                        position: fixed; inset: 0; z-index: 2147483100; display: none;
                        background: rgba(6,5,16,.72); backdrop-filter: blur(4px);
                        align-items: center; justify-content: center;
                        font-family: 'Segoe UI', system-ui, sans-serif;
                    }
                    .pp-ov.on { display: flex; }
                    .pp-win {
                        width: min(1120px, 95vw); height: min(880px, 90vh);
                        display: flex; flex-direction: column; overflow: hidden;
                        background: linear-gradient(165deg, #171233, #0d0a1e);
                        border: 1px solid rgba(148,120,246,.34); border-radius: 18px;
                        box-shadow: 0 30px 80px rgba(0,0,0,.6); color: #e6e2f4;
                    }
                    .pp-head {
                        display: flex; align-items: center; gap: 10px; padding: 12px 16px;
                        border-bottom: 1px solid rgba(148,120,246,.2);
                        background: rgba(124,58,237,.12); flex: none;
                    }
                    .pp-h-tit { font-size: 15px; font-weight: 900; color: #d6ccff; letter-spacing: .3px; }
                    .pp-nav { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
                    .pp-nav-b {
                        background: rgba(148,163,184,.1); border: 1px solid rgba(148,163,184,.18);
                        color: #b6add6; border-radius: 9px; padding: 6px 12px; cursor: pointer;
                        font-size: 12px; font-weight: 700; font-family: inherit; transition: all .15s;
                    }
                    .pp-nav-b:hover { background: rgba(148,163,184,.2); }
                    .pp-nav-b.on { background: rgba(124,58,237,.34); border-color: rgba(167,139,250,.7); color: #fff; }
                    .pp-x {
                        background: rgba(239,68,68,.16); border: 1px solid rgba(239,68,68,.4);
                        color: #fca5a5; border-radius: 9px; width: 32px; height: 30px; cursor: pointer;
                        font-size: 14px; font-weight: 900; flex: none;
                    }
                    .pp-tool {
                        display: flex; align-items: center; gap: 8px; padding: 10px 16px;
                        border-bottom: 1px solid rgba(148,120,246,.14); flex-wrap: wrap; flex: none;
                    }
                    .pp-search {
                        flex: 1; min-width: 180px; background: #0c0a1c; color: #fff;
                        border: 1px solid rgba(148,120,246,.3); border-radius: 10px;
                        padding: 9px 12px; font-size: 13px; font-family: inherit; outline: none;
                    }
                    .pp-search:focus { border-color: rgba(167,139,250,.8); }
                    .pp-chips { display: flex; gap: 5px; flex-wrap: wrap; }
                    .pp-chip {
                        background: rgba(148,163,184,.1); border: 1px solid rgba(148,163,184,.22);
                        color: #b6add6; border-radius: 999px; padding: 5px 11px; cursor: pointer;
                        font-size: 11px; font-weight: 700; font-family: inherit; transition: all .12s;
                    }
                    .pp-chip:hover { background: rgba(148,163,184,.2); }
                    .pp-chip.on { background: rgba(124,58,237,.4); border-color: rgba(167,139,250,.8); color: #fff; }
                    .pp-body { display: flex; flex: 1; min-height: 0; }
                    .pp-list { flex: 1; min-width: 0; overflow-y: auto; padding: 12px; }
                    .pp-detail {
                        width: 340px; flex: none; overflow-y: auto; padding: 16px;
                        border-left: 1px solid rgba(148,120,246,.18); background: rgba(12,10,28,.5);
                        display: none;
                    }
                    .pp-detail.on { display: block; }
                    .pp-count { font-size: 11px; color: #8b81b0; padding: 0 4px 8px; }
                    .pp-grid {
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 8px;
                    }
                    .pp-card {
                        background: rgba(30,24,58,.6); border: 1px solid rgba(148,120,246,.16);
                        border-radius: 12px; padding: 10px; cursor: pointer; transition: all .12s;
                        display: flex; flex-direction: column; align-items: center; gap: 4px;
                    }
                    .pp-card:hover { border-color: rgba(167,139,250,.6); background: rgba(45,35,84,.7); transform: translateY(-1px); }
                    .pp-card.sel { border-color: #a78bfa; box-shadow: 0 0 0 1px #a78bfa inset; }
                    .pp-spr { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; image-rendering: pixelated; }
                    .pp-spr img, .pp-spr canvas { max-width: 56px; max-height: 56px; image-rendering: pixelated; }
                    .pp-nm { font-size: 12px; font-weight: 800; color: #ece8fb; text-align: center; line-height: 1.15; }
                    .pp-dex-n { font-size: 9.5px; color: #7d73a6; font-weight: 700; }
                    .pp-tps { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; }
                    .pp-tp { font-size: 8.5px; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 6px; letter-spacing: .3px; }
                    .pp-tier { font-size: 9px; font-weight: 900; border: 1px solid; border-radius: 5px; padding: 1px 5px; }
                    .pp-row {
                        display: flex; align-items: center; gap: 10px; padding: 9px 11px;
                        background: rgba(30,24,58,.5); border: 1px solid rgba(148,120,246,.14);
                        border-radius: 10px; margin-bottom: 6px; cursor: pointer; transition: all .12s;
                    }
                    .pp-row:hover { border-color: rgba(167,139,250,.5); background: rgba(45,35,84,.6); }
                    .pp-row-ic { width: 34px; height: 34px; flex: none; display: flex; align-items: center; justify-content: center; }
                    .pp-row-ic img { max-width: 34px; max-height: 34px; image-rendering: pixelated; }
                    .pp-row-main { flex: 1; min-width: 0; }
                    .pp-row-nm { font-size: 13px; font-weight: 800; color: #ece8fb; }
                    .pp-row-sub { font-size: 11px; color: #9990c0; margin-top: 2px; line-height: 1.4; }
                    .pp-badge { font-size: 9px; font-weight: 800; background: rgba(124,58,237,.3); color: #d6ccff; padding: 2px 7px; border-radius: 6px; }
                    .pp-d-spr { display: flex; justify-content: center; margin-bottom: 8px; }
                    .pp-d-spr img, .pp-d-spr canvas { width: 96px; height: 96px; image-rendering: pixelated; }
                    .pp-d-nm { font-size: 18px; font-weight: 900; color: #fff; text-align: center; }
                    .pp-d-sec { margin-top: 14px; }
                    .pp-d-lbl { font-size: 10px; font-weight: 800; color: #8b81b0; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 6px; }
                    .pp-d-txt { font-size: 12.5px; color: #cfc8ea; line-height: 1.5; }
                    .pp-d-zona { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(148,120,246,.1); color: #cfc8ea; }
                    .pp-d-zona b { color: #a78bfa; font-weight: 800; }
                    .pp-empty { text-align: center; color: #7d73a6; font-size: 13px; padding: 40px 20px; }
                    .pp-mais {
                        display: block; margin: 12px auto 4px; background: rgba(124,58,237,.28);
                        border: 1px solid rgba(167,139,250,.5); color: #d6ccff; border-radius: 10px;
                        padding: 8px 20px; cursor: pointer; font-size: 12px; font-weight: 700; font-family: inherit;
                    }
                    .pp-mais:hover { background: rgba(124,58,237,.42); }
                    .pp-tbl-wrap { overflow-x: auto; }
                    .pp-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .pp-tbl th, .pp-tbl td { padding: 6px 8px; text-align: center; white-space: nowrap; }
                    .pp-tbl thead th { position: sticky; top: 0; background: #1a1436; color: #b6add6; font-size: 11px; cursor: pointer; user-select: none; border-bottom: 1px solid rgba(148,120,246,.25); }
                    .pp-tbl thead th.on { color: #fff; }
                    .pp-tbl th.pp-l, .pp-tbl td.pp-l { text-align: left; }
                    .pp-tbl tbody tr { border-bottom: 1px solid rgba(148,120,246,.08); }
                    .pp-tbl tbody tr:hover { background: rgba(124,58,237,.14); }
                    .pp-tbl .pp-rk { color: #7d73a6; font-size: 11px; }
                    .pp-tbl .pp-tnm { font-weight: 800; color: #ece8fb; }
                    .pp-tbl .pp-bst { font-weight: 900; color: #ffd964; }
                    .pp-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                    .pp-bar-lbl { width: 52px; font-size: 10.5px; color: #9990c0; flex: none; }
                    .pp-bar-num { width: 62px; font-size: 11.5px; color: #ece8fb; font-weight: 700; flex: none; text-align: right; }
                    .pp-bar-trk { flex: 1; height: 7px; background: rgba(148,120,246,.14); border-radius: 4px; overflow: hidden; }
                    .pp-bar-fill { display: block; height: 100%; border-radius: 4px; }
                    .pp-kv { margin-top: 4px; }
                    .pp-kv-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(148,120,246,.1); color: #cfc8ea; }
                    .pp-kv-row b { color: #a78bfa; font-weight: 800; text-align: right; }
                `;
                document.head.appendChild(st);
            }

            // ── ESTADO ────────────────────────────────────────────────────────
            const PP_SECOES = [
                { id: 'dex', rot: 'Pokédex' }, { id: 'mega', rot: 'Mega' },
                { id: 'stats', rot: 'Stats' }, { id: 'item', rot: 'Itens' },
                { id: 'tipo', rot: 'Tipos' }, { id: 'sistema', rot: 'Sistema' }
            ];
            const PP_ITEM_CATS = [
                { id: 'held', rot: 'Helds' }, { id: 'tm', rot: 'TMs' },
                { id: 'stone', rot: 'Stones' }, { id: 'ball', rot: 'Balls' },
                { id: 'potion', rot: 'Poções' }, { id: 'bait', rot: 'Iscas' },
                { id: 'boss', rot: 'Boss' }
            ];
            const PP_STAT_COLS = [
                ['hp', 'HP'], ['atk', 'Atq'], ['def', 'Def'],
                ['spa', 'Atq.Esp'], ['spd', 'Def.Esp'], ['spe', 'Vel'], ['bst', 'BST']
            ];
            let ppSecao = 'dex', ppTermo = '', ppFiltroTipo = '', ppFiltroTier = '';
            let ppLimite = 120, ppSel = null;
            let ppItemCat = 'held';
            let ppStatSort = 'bst', ppStatDir = -1, ppStatExtra = false;
            let ppObs = null;

            let ovEl = null, listEl = null, detEl = null, toolEl = null, searchEl = null, navEl = null;

            // Pinta sprites de pokémon só quando entram na tela.
            function ppObserver() {
                if (ppObs) ppObs.disconnect();
                ppObs = new IntersectionObserver(ents => {
                    for (const e of ents) {
                        if (!e.isIntersecting) continue;
                        const el = e.target;
                        ppObs.unobserve(el);
                        const look = Number(el.dataset.look);
                        if (!look && look !== 0) continue;
                        try {
                            const w = ppWin();
                            if (typeof w.loadSprite === 'function') {
                                const spr = w.loadSprite(look, 56, el.dataset.shiny === '1');
                                if (spr) { el.textContent = ''; el.appendChild(spr); }
                            }
                        } catch (err) { }
                    }
                }, { root: listEl, rootMargin: '120px' });
            }

            function ppItemImg(cid, px) {
                const c = Number(cid) || 0;
                if (!c) return '<span style="font-size:20px">🎒</span>';
                return `<img src="/sprites/item_${c}.png?v=walk1" width="${px}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('🎒'))" />`;
            }

            // ── RENDER: cabeçalho da toolbar (chips dependem da seção) ─────────
            const PP_TIPOS_CHIP = ['', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting',
                'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',
                'dragon', 'dark', 'steel', 'fairy', 'normal'];

            function ppRenderTool() {
                let extra = '';
                if (ppSecao === 'dex') {
                    extra = '<div class="pp-chips">' + PP_TIPOS_CHIP.map(t =>
                        `<span class="pp-chip${ppFiltroTipo === t ? ' on' : ''}" data-tipo="${t}"${t ? ` style="border-color:${PP_COR_TIPO[t]}"` : ''}>${t ? ppEsc(t.toUpperCase()) : 'Todos'}</span>`
                    ).join('') + '</div><div class="pp-chips">' + ['', 'S', 'A', 'B', 'C'].map(t =>
                        `<span class="pp-chip${ppFiltroTier === t ? ' on' : ''}" data-tier="${t}">${t ? ('Tier ' + t) : 'Tier•'}</span>`
                    ).join('') + '</div>';
                } else if (ppSecao === 'item') {
                    extra = '<div class="pp-chips">' + PP_ITEM_CATS.map(c =>
                        `<span class="pp-chip${ppItemCat === c.id ? ' on' : ''}" data-cat="${c.id}">${ppEsc(c.rot)}</span>`
                    ).join('') + '</div>';
                } else if (ppSecao === 'stats') {
                    extra = `<div class="pp-chips"><span class="pp-chip${ppStatExtra ? ' on' : ''}" id="pp-stat-extra">Incluir Megas & Lendários</span></div>`;
                }
                const semBusca = ppSecao === 'sistema';
                const ph = ppSecao === 'tipo' ? 'Filtrar tipo…'
                    : ppSecao === 'item' ? 'Buscar item…'
                        : ppSecao === 'stats' ? 'Buscar pokémon…'
                            : ppSecao === 'mega' ? 'Buscar mega…' : 'Buscar pokémon ou nº…';
                toolEl.innerHTML = (semBusca ? '' : `<input class="pp-search" placeholder="${ph}" value="${ppEsc(ppTermo)}" />`) + extra;
                searchEl = toolEl.querySelector('.pp-search');
                if (searchEl) searchEl.oninput = () => { ppTermo = searchEl.value; ppLimite = 120; ppRenderList(); };
                toolEl.querySelectorAll('.pp-chip[data-tipo]').forEach(c => c.onclick = () => {
                    ppFiltroTipo = c.dataset.tipo; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                toolEl.querySelectorAll('.pp-chip[data-tier]').forEach(c => c.onclick = () => {
                    ppFiltroTier = c.dataset.tier; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                toolEl.querySelectorAll('.pp-chip[data-cat]').forEach(c => c.onclick = () => {
                    ppItemCat = c.dataset.cat; ppLimite = 120; ppRenderTool(); ppRenderList();
                });
                const be = toolEl.querySelector('#pp-stat-extra');
                if (be) be.onclick = () => { ppStatExtra = !ppStatExtra; ppRenderTool(); ppRenderList(); };
            }

            // ── RENDER: lista central ─────────────────────────────────────────
            function ppRenderList() {
                ppObserver();
                if (ppSecao === 'dex') return ppRenderDex();
                if (ppSecao === 'mega') return ppRenderMega();
                if (ppSecao === 'stats') return ppRenderStats();
                if (ppSecao === 'item') return ppRenderItens();
                if (ppSecao === 'tipo') return ppRenderTipo();
                if (ppSecao === 'sistema') return ppRenderSistema();
            }

            function ppMaisBtn(total) {
                if (total <= ppLimite) return '';
                return `<button class="pp-mais" id="pp-mais">Mostrar mais (${total - ppLimite} restantes)</button>`;
            }
            function ppLigarMais() {
                const b = listEl.querySelector('#pp-mais');
                if (b) b.onclick = () => { ppLimite += 200; ppRenderList(); };
            }

            function ppRenderDex() {
                const todos = ppFiltrarDex(ppTermo, ppFiltroTipo, ppFiltroTier);
                const vis = todos.slice(0, ppLimite);
                let h = `<div class="pp-count">${todos.length} pokémon</div><div class="pp-grid">`;
                for (const p of vis) {
                    h += `<div class="pp-card${ppSel === 'dex:' + p.dex ? ' sel' : ''}" data-dex="${p.dex}">
                        <div class="pp-spr" data-look="${p.lookType == null ? '' : p.lookType}"></div>
                        <div class="pp-dex-n">#${String(p.dex).padStart(3, '0')} ${ppChipTier(p.tier).replace(/class="pp-tier"/, 'class="pp-tier" ') || ''}</div>
                        <div class="pp-nm">${ppEsc(ppLimpo(p.name))}</div>
                        <div class="pp-tps">${ppChipTipo(p.type1)}${ppChipTipo(p.type2)}</div>
                    </div>`;
                }
                h += '</div>' + ppMaisBtn(todos.length);
                if (!todos.length) h = '<div class="pp-empty">Nada encontrado.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-spr[data-look]').forEach(el => { if (el.dataset.look !== '') ppObs.observe(el); });
                listEl.querySelectorAll('.pp-card[data-dex]').forEach(c => c.onclick = () => ppAbrirDex(Number(c.dataset.dex)));
                ppLigarMais();
            }

            // ── ITENS (sub-categorias do /api/meta) ───────────────────────────
            function ppItensDaCat() {
                const c = ppItemCat;
                if (c === 'held') return ppHelds().map(it => ({ icon: ppItemImg(it.cid, 34), nm: it.label || ppLimpo(it.name), badge: it.funcao, sub: ppLimpo(it.desc), nome: it.label || it.name }));
                if (c === 'tm') return ppTms().map(t => { const s = t.officialSource || {}; const f = s.detail ? ppLimpo(s.detail) : (s.method || ''); return { icon: ppItemImg(t.spriteCid, 34), nm: ppLimpo(t.move), extra: ppChipTipo(t.type) + ' ' + ppChipTier(t.tier), sub: (t.kind ? String(t.kind).toUpperCase() : '') + (f ? ' · ' + f : ''), nome: ppLimpo(t.move) }; });
                if (c === 'stone') return ppStones().map(s => ({ icon: ppItemImg(s.itemId, 34), nm: ppLimpo(s.name), sub: s.gold ? ('💰 ' + Number(s.gold).toLocaleString('pt-BR')) : '', nome: s.name }));
                if (c === 'ball') return ppBalls().map(b => ({ icon: ppItemImg(b.itemId, 34), nm: b.label || b.key, sub: ppLimpo(b.desc) || [b.gold ? ('💰 ' + Number(b.gold).toLocaleString('pt-BR')) : '', b.diamonds ? ('💎 ' + b.diamonds) : ''].filter(Boolean).join(' · '), nome: b.label || b.key }));
                if (c === 'potion') return ppPotions().map(p => ({ icon: ppItemImg(p.itemId, 34), nm: p.label || p.key, sub: [p.gold ? ('💰 ' + Number(p.gold).toLocaleString('pt-BR')) : '', p.heal ? ('cura ' + p.heal) : ''].filter(Boolean).join(' · '), nome: p.label || p.key }));
                if (c === 'bait') return ppBaits().map(b => ({ icon: '<span style="font-size:20px">' + (b.emoji || '🪝') + '</span>', nm: b.label || b.key, sub: ['Lv ' + (b.reqLevel | 0) + '+', b.gold ? ('💰 ' + Number(b.gold).toLocaleString('pt-BR')) : '', b.exp ? ('exp ' + b.exp) : ''].filter(Boolean).join(' · '), nome: b.label || b.key }));
                if (c === 'boss') return ppBossItems().map(b => ({ icon: ppItemImg(b.cid, 34), nm: ppLimpo(b.name), sub: '', nome: b.name }));
                return [];
            }
            function ppRenderItens() {
                const q = ppNorm(ppTermo);
                const todos = ppItensDaCat().filter(it => !q || ppNorm(it.nome).indexOf(q) >= 0 || ppNorm(it.sub).indexOf(q) >= 0);
                const vis = todos.slice(0, ppLimite);
                let h = `<div class="pp-count">${todos.length} itens</div>`;
                for (const it of vis) {
                    h += `<div class="pp-row">
                        <div class="pp-row-ic">${it.icon}</div>
                        <div class="pp-row-main">
                            <div class="pp-row-nm">${ppEsc(it.nm)} ${it.extra || ''}${it.badge ? '<span class="pp-badge">' + ppEsc(it.badge) + '</span>' : ''}</div>
                            <div class="pp-row-sub">${ppEsc(it.sub) || ''}</div>
                        </div>
                    </div>`;
                }
                h += ppMaisBtn(todos.length);
                if (!todos.length) h = '<div class="pp-empty">Nada nessa categoria.</div>';
                listEl.innerHTML = h;
                ppLigarMais();
            }

            // ── STATS (base stats, do módulo 42) ──────────────────────────────
            let _ppDexTipoMap = null;
            function ppDexTipoMap() {
                if (_ppDexTipoMap) return _ppDexTipoMap;
                const m = {};
                for (const p of ppDex()) m[ppNorm(p.name).replace(/[^a-z0-9]/g, '')] = { t1: p.type1, t2: p.type2, dex: p.dex };
                _ppDexTipoMap = m;
                return m;
            }
            function ppRenderStats() {
                const q = ppNorm(ppTermo);
                const tmap = ppDexTipoMap();
                const LBL = (typeof PP_STATS_LABEL !== 'undefined') ? PP_STATS_LABEL : {};
                let linhas = (typeof ppTodasStats === 'function') ? ppTodasStats() : [];
                linhas = linhas.filter(r => {
                    if (!ppStatExtra && (r.mega || !tmap[r.key])) return false;
                    if (q && (LBL[r.key] || r.key).toLowerCase().indexOf(q) < 0) return false;
                    return true;
                });
                linhas.sort((a, b) => (a[ppStatSort] - b[ppStatSort]) * ppStatDir);
                const vis = linhas.slice(0, ppLimite);
                let h = `<div class="pp-count">${linhas.length} — clique numa coluna pra ordenar</div>`;
                h += '<div class="pp-tbl-wrap"><table class="pp-tbl"><thead><tr><th>#</th><th class="pp-l">Pokémon</th><th>Tipos</th>';
                for (const [k, lbl] of PP_STAT_COLS) h += `<th data-sort="${k}" class="${ppStatSort === k ? 'on' : ''}">${lbl}${ppStatSort === k ? (ppStatDir < 0 ? ' ▾' : ' ▴') : ''}</th>`;
                h += '</tr></thead><tbody>';
                vis.forEach((r, i) => {
                    const nm = LBL[r.key] || r.key; const tp = tmap[r.key] || {};
                    h += `<tr><td class="pp-rk">${i + 1}</td><td class="pp-l pp-tnm">${ppEsc(nm)}${r.mega ? ' <span class="pp-badge">M</span>' : ''}</td><td>${ppChipTipo(tp.t1)}${ppChipTipo(tp.t2)}</td>`;
                    for (const [k] of PP_STAT_COLS) h += `<td class="${k === 'bst' ? 'pp-bst' : ''}">${r[k]}</td>`;
                    h += '</tr>';
                });
                h += '</tbody></table></div>' + ppMaisBtn(linhas.length);
                listEl.innerHTML = h;
                listEl.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => {
                    const k = th.dataset.sort;
                    if (ppStatSort === k) ppStatDir = -ppStatDir; else { ppStatSort = k; ppStatDir = -1; }
                    ppLimite = 120; ppRenderList();
                });
                ppLigarMais();
            }

            // ── MEGA ──────────────────────────────────────────────────────────
            function ppRenderMega() {
                const q = ppNorm(ppTermo);
                const todos = (typeof ppMegas === 'function' ? ppMegas() : []).filter(m => !q || ppNorm(m.name).indexOf(q) >= 0);
                let h = `<div class="pp-count">${todos.length} Mega Evoluções</div><div class="pp-grid">`;
                for (const m of todos) {
                    h += `<div class="pp-card${ppSel === 'mega:' + m.mkey ? ' sel' : ''}" data-mkey="${m.mkey}">
                        <div class="pp-spr" data-look="${m.lookType == null ? '' : m.lookType}"></div>
                        <div class="pp-nm">Mega ${ppEsc(ppLimpo(m.name))}</div>
                        <div class="pp-tps">${ppChipTipo(m.type1)}${ppChipTipo(m.type2)}</div>
                        ${m.mega ? `<div class="pp-dex-n">BST ${m.base ? m.base.bst : '?'} → <b style="color:#7bed9f">${m.mega.bst}</b></div>` : ''}
                    </div>`;
                }
                h += '</div>';
                if (!todos.length) h = '<div class="pp-empty">Sem megas.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-spr[data-look]').forEach(el => { if (el.dataset.look !== '') ppObs.observe(el); });
                listEl.querySelectorAll('.pp-card[data-mkey]').forEach(c => c.onclick = () => ppAbrirMega(c.dataset.mkey));
            }

            // ── SISTEMA ───────────────────────────────────────────────────────
            function ppRenderSistema() {
                const lista = (typeof PP_SISTEMA !== 'undefined') ? PP_SISTEMA : [];
                let h = '<div class="pp-count">Mecânicas do jogo — clique pra abrir</div><div class="pp-grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">';
                for (const s of lista) {
                    h += `<div class="pp-card" style="align-items:flex-start;text-align:left" data-sis="${s.id}">
                        <div style="font-size:22px">${s.icone || '📘'}</div>
                        <div class="pp-nm" style="text-align:left">${ppEsc(s.rot)}</div>
                        <div class="pp-row-sub">${ppEsc(s.resumo || '')}</div>
                    </div>`;
                }
                h += '</div>';
                if (!lista.length) h = '<div class="pp-empty">Conteúdo de sistema indisponível.</div>';
                listEl.innerHTML = h;
                listEl.querySelectorAll('.pp-card[data-sis]').forEach(c => c.onclick = () => ppAbrirSistema(c.dataset.sis));
            }

            function ppRenderTipo() {
                const q = ppNorm(ppTermo);
                const tc = ppTypeChart();
                const tipos = PP_TIPOS.filter(t => !q || t.indexOf(q) >= 0);
                let h = '<div class="pp-count">tabela de tipos — o que cada tipo bate forte</div><div class="pp-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">';
                for (const t of tipos) {
                    const bate = (tc[t] || []).map(x => ppChipTipo(x)).join('') || '<span style="color:#7d73a6;font-size:11px">— nada super-efetivo —</span>';
                    h += `<div class="pp-card" style="align-items:stretch;cursor:default">
                        <div style="text-align:center;margin-bottom:6px">${ppChipTipo(t)}</div>
                        <div class="pp-d-lbl">Forte contra</div>
                        <div class="pp-tps" style="justify-content:flex-start">${bate}</div>
                    </div>`;
                }
                h += '</div>';
                listEl.innerHTML = h;
            }

            // ── DETALHE ───────────────────────────────────────────────────────
            const PP_STAT_BARRA = [
                ['hp', 'HP', '#7bed9f'], ['atk', 'Atq', '#ff8f6b'], ['def', 'Def', '#ffd964'],
                ['spa', 'Atq.Esp', '#7fb8ff'], ['spd', 'Def.Esp', '#a78bfa'], ['spe', 'Vel', '#f38fd0']
            ];
            function ppStatBarsHtml(st, cmp) {
                if (!st) return '';
                let h = '<div class="pp-d-sec"><div class="pp-d-lbl">📊 Base stats</div>';
                for (const [k, lbl, cor] of PP_STAT_BARRA) {
                    const v = st[k] | 0, w = Math.max(3, Math.min(100, v / 200 * 100));
                    const cv = cmp ? (cmp[k] | 0) : null;
                    const delta = cv != null && cv !== v ? ` <span style="color:${cv > v ? '#7bed9f' : '#fca5a5'};font-size:10px">${cv > v ? '+' : ''}${cv - v}</span>` : '';
                    h += `<div class="pp-bar-row"><span class="pp-bar-lbl">${lbl}</span><span class="pp-bar-num">${v}${delta}</span><span class="pp-bar-trk"><span class="pp-bar-fill" style="width:${w}%;background:${cor}"></span></span></div>`;
                }
                h += `<div class="pp-bar-row" style="margin-top:5px"><span class="pp-bar-lbl">BST</span><span class="pp-bar-num" style="color:#ffd964;font-weight:900">${st.bst | 0}${cmp ? ` <span style="color:${cmp.bst > st.bst ? '#7bed9f' : '#fca5a5'};font-size:10px">${cmp.bst > st.bst ? '+' : ''}${cmp.bst - st.bst}</span>` : ''}</span><span></span></div></div>`;
                return h;
            }

            function ppAbrirDex(dex) {
                const p = ppDex().find(x => x.dex === dex);
                if (!p) return;
                ppSel = 'dex:' + dex;
                listEl.querySelectorAll('.pp-card').forEach(c => c.classList.toggle('sel', Number(c.dataset.dex) === dex));
                const fraco = ppFracoContra(p.type1, p.type2);
                const forte = ppForteAtacando(p.type1, p.type2);
                const zonas = ppOndeAcha(p.name).slice(0, 12);
                const helds = ppHeldsPorTipo(p.type1, p.type2).slice(0, 4);
                const st = (typeof ppStatsDe === 'function') ? ppStatsDe(p.name) : null;
                let h = `<div class="pp-d-spr" data-look="${p.lookType == null ? '' : p.lookType}"></div>
                    <div class="pp-d-nm">${ppEsc(ppLimpo(p.name))}</div>
                    <div style="text-align:center;margin-top:4px">#${String(p.dex).padStart(3, '0')} ${ppChipTipo(p.type1)}${ppChipTipo(p.type2)} ${ppChipTier(p.tier)}</div>
                    <div style="text-align:center;font-size:11px;color:#8b81b0;margin-top:6px">${(p.points | 0)} pts de dex</div>`;
                h += ppStatBarsHtml(st);
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">⚠️ Fraco contra</div><div class="pp-tps" style="justify-content:flex-start">${fraco.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">💥 Forte atacando (STAB)</div><div class="pp-tps" style="justify-content:flex-start">${forte.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                if (helds.length) {
                    h += `<div class="pp-d-sec"><div class="pp-d-lbl">🧤 Held sugerido</div>`
                        + helds.map(x => `<div class="pp-d-txt" style="margin-bottom:5px"><b style="color:#dcefb4">${ppEsc(x.label)}</b> — ${ppEsc(x.desc)}</div>`).join('') + '</div>';
                }
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">📍 Onde caçar (${ppOndeAcha(p.name).length})</div>`;
                if (zonas.length) {
                    h += zonas.map(z => `<div class="pp-d-zona"><span>${ppEsc(ppLimpo(z.zona))} <span style="color:#7d73a6">Lv${z.reqLevel}+</span></span><b>${z.weight}%</b></div>`).join('');
                } else h += '<div class="pp-d-txt">Não aparece em spawn de zona.</div>';
                h += '</div>';
                detEl.innerHTML = h;
                detEl.classList.add('on');
                // sprite grande
                try {
                    const w = ppWin();
                    const sl = detEl.querySelector('.pp-d-spr[data-look]');
                    if (sl && sl.dataset.look !== '' && typeof w.loadSprite === 'function') {
                        const spr = w.loadSprite(Number(sl.dataset.look), 96, false);
                        if (spr) sl.appendChild(spr);
                    }
                } catch (e) { }
            }

            function ppAbrirMega(mkey) {
                const m = (typeof ppMegas === 'function' ? ppMegas() : []).find(x => x.mkey === mkey);
                if (!m) return;
                ppSel = 'mega:' + mkey;
                listEl.querySelectorAll('.pp-card').forEach(c => c.classList.toggle('sel', c.dataset.mkey === mkey));
                const fraco = ppFracoContra(m.type1, m.type2);
                const forte = ppForteAtacando(m.type1, m.type2);
                let h = `<div class="pp-d-spr" data-look="${m.lookType == null ? '' : m.lookType}"></div>
                    <div class="pp-d-nm">Mega ${ppEsc(ppLimpo(m.name))}</div>
                    <div style="text-align:center;margin-top:4px">#${String(m.dex).padStart(3, '0')} ${ppChipTipo(m.type1)}${ppChipTipo(m.type2)} ${ppChipTier(m.tier)}</div>`;
                if (m.mega) h += ppStatBarsHtml(m.mega, m.base);
                if (m.base && m.mega) h += `<div class="pp-d-txt" style="text-align:center;margin-top:4px">BST base ${m.base.bst} → <b style="color:#7bed9f">${m.mega.bst}</b> (${m.mega.bst - m.base.bst > 0 ? '+' : ''}${m.mega.bst - m.base.bst})</div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">⚠️ Fraco contra</div><div class="pp-tps" style="justify-content:flex-start">${fraco.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                h += `<div class="pp-d-sec"><div class="pp-d-lbl">💥 Forte atacando (STAB)</div><div class="pp-tps" style="justify-content:flex-start">${forte.map(ppChipTipo).join('') || '<span class="pp-d-txt">—</span>'}</div></div>`;
                detEl.innerHTML = h;
                detEl.classList.add('on');
                try {
                    const w = ppWin();
                    const sl = detEl.querySelector('.pp-d-spr[data-look]');
                    if (sl && sl.dataset.look !== '' && typeof w.loadSprite === 'function') {
                        const spr = w.loadSprite(Number(sl.dataset.look), 96, false);
                        if (spr) sl.appendChild(spr);
                    }
                } catch (e) { }
            }

            function ppAbrirSistema(id) {
                const lista = (typeof PP_SISTEMA !== 'undefined') ? PP_SISTEMA : [];
                const s = lista.find(x => x.id === id);
                if (!s) return;
                ppSel = 'sis:' + id;
                let h = `<div class="pp-d-nm" style="font-size:17px">${s.icone || '📘'} ${ppEsc(s.rot)}</div>
                    <div class="pp-d-txt" style="text-align:center;margin-top:4px;color:#8b81b0">${ppEsc(s.resumo || '')}</div>`;
                for (const b of (s.blocos || [])) {
                    h += `<div class="pp-d-sec"><div class="pp-d-lbl">${ppEsc(b.h || '')}</div>`;
                    for (const ln of (b.linhas || [])) h += `<div class="pp-d-txt" style="margin-bottom:4px">• ${ppEsc(ln)}</div>`;
                    if (b.tabela) {
                        h += '<div class="pp-kv">';
                        for (const [a, c] of b.tabela) h += `<div class="pp-kv-row"><span>${ppEsc(a)}</span><b>${ppEsc(c)}</b></div>`;
                        h += '</div>';
                    }
                    h += '</div>';
                }
                detEl.innerHTML = h;
                detEl.classList.add('on');
            }

            // ── SHELL: nav + abrir/fechar ─────────────────────────────────────
            function ppRenderNav() {
                navEl.innerHTML = PP_SECOES.map(s =>
                    `<button class="pp-nav-b${ppSecao === s.id ? ' on' : ''}" data-sec="${s.id}">${s.rot}</button>`
                ).join('');
                navEl.querySelectorAll('.pp-nav-b').forEach(b => b.onclick = () => {
                    ppSecao = b.dataset.sec; ppTermo = ''; ppFiltroTipo = ''; ppFiltroTier = '';
                    ppLimite = 120; ppSel = null; detEl.classList.remove('on');
                    ppRenderNav(); ppRenderTool(); ppRenderList();
                });
            }

            function ppMontar() {
                if (ovEl) return;
                ppCss();
                ovEl = document.createElement('div');
                ovEl.className = 'pp-ov';
                ovEl.innerHTML = `
                    <div class="pp-win">
                        <div class="pp-head">
                            <span class="pp-h-tit">📚 Poképédia</span>
                            <div class="pp-nav" id="pp-nav"></div>
                            <button class="pp-x" id="pp-x">✕</button>
                        </div>
                        <div class="pp-tool" id="pp-tool"></div>
                        <div class="pp-body">
                            <div class="pp-list" id="pp-list"></div>
                            <div class="pp-detail" id="pp-detail"></div>
                        </div>
                    </div>`;
                document.body.appendChild(ovEl);
                navEl = ovEl.querySelector('#pp-nav');
                toolEl = ovEl.querySelector('#pp-tool');
                listEl = ovEl.querySelector('#pp-list');
                detEl = ovEl.querySelector('#pp-detail');
                ovEl.querySelector('#pp-x').onclick = ppFechar;
                ovEl.onclick = e => { if (e.target === ovEl) ppFechar(); };
            }

            function ppAbrir() {
                ppMontar();
                ovEl.classList.add('on');
                ppRenderNav(); ppRenderTool(); ppRenderList();
                setTimeout(() => { if (searchEl) searchEl.focus(); }, 30);
            }
            function ppFechar() { if (ovEl) ovEl.classList.remove('on'); }

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && ovEl && ovEl.classList.contains('on')) ppFechar();
            });

            // NÃO há botão flutuante próprio: o gatilho é o botão-âncora da barra
            // de fixados (ver instalarSistemaPinTopbar em 20-cidade-utils.js), que
            // chama `abrirPokepedia()`. Mantido só o CSS pronto pra quando abrir.
            if (document.body) ppCss();
            else document.addEventListener('DOMContentLoaded', ppCss);

            // Atalho global — é o que a barra de fixados (e o console) chamam.
            try { ppWin().abrirPokepedia = ppAbrir; } catch (e) { }
        })();
