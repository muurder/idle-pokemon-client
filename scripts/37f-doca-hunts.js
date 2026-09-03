        // =====================================================================
        // 37f-doca-hunts.js — DOCA DE HUNTS: favoritar, filtrar e entrar
        // =====================================================================
        // A tela de Hunts do jogo tem 650 zonas e um campo de busca — pra voltar
        // numa hunt conhecida, ou se digita o nome de novo, ou se rola a lista.
        // Esta doca guarda FAVORITOS e entra na zona com um clique.
        //
        // ── DE ONDE VEM CADA NUMERO (e o que NAO inventamos) ─────────────────
        //
        // ACESSO — regra exata do jogo, lida de app-1.js (funcao `C`):
        //     reqLevel >= 200 ? nivel >= reqLevel : nivel >= reqLevel - 20
        // Ou seja: abaixo de 200 ha um desconto de 20 niveis; de 200 pra cima,
        // nao ha. E o mesmo criterio do botao "So onde posso entrar".
        //
        // NIVEL DO SELVAGEM — e o proprio `reqLevel` da zona. Isto foi MEDIDO,
        // nao suposto, e a primeira medicao estava errada:
        //
        //   Tentativa 1 (descartada): cruzar `world/spawns.json` pelo NOME do
        //   pokemon. Cruzava em 650/650, mas pegava o bicho no MUNDO INTEIRO —
        //   a "Area de Snivy" saia como "Lv 1-900" porque existe Snivy de nivel
        //   900 em outro canto do mapa. Foi o preview que denunciou.
        //
        //   Tentativa 2 (correta): `zona.spawnPoints[]` traz {dx,dy} — offsets
        //   do centro da zona. Casando (cx+dx, cy+dy, z) com spawns.json casam
        //   6.496 de 6.496 pontos, 100%, nas 650 zonas.
        //
        // E com o casamento exato o resultado foi: `reqLevel` == nivel do
        // selvagem em TODAS as 650 zonas, sem excecao. Ou seja, o cruzamento
        // com spawns.json nao acrescenta nada e foi removido — `reqLevel`
        // sozinho ja e o nivel do bicho, exato e de graca. A "divergencia em
        // 282 zonas" que eu tinha anotado aqui era artefato do cruzamento
        // errado, nao um fato do jogo.
        //
        // VANTAGEM DE TIPO — `multDanoAtkVsDef` e `multDanoRecebido`
        // (26-auto-hunt-matriz.js), as MESMAS que o Auto Hunt usa pra escolher
        // zona. Uma segunda tabela aqui faria a doca discordar do robo que caca.
        //
        // ⚠️ XP POR MINUTO NAO E ESTIMADO. A formula de XP e do servidor e nao
        // esta publicada em lugar nenhum do cliente — qualquer numero de "XP/h"
        // calculado aqui seria invencao. Em vez disso a doca MEDE: enquanto
        // voce caca, `huntsAmostrarXp()` acumula XP e tempo por zona e a lista
        // passa a mostrar o SEU XP/h real naquela zona. Sem historico, a doca
        // mostra o nivel do selvagem e diz que e proxy — nao um numero com cara
        // de precisao que ninguem mediu.
        //
        // ── POR QUE ISTO NAO REPETE O ERRO DO 14d ────────────────────────────
        // `14d-sugestoes-hunt.js` conta que uma versao antiga sugeria zona pela
        // ficha do pokemon e foi descartada: o bicho da ficha e quase sempre um
        // Lv.1 da box, e mandar ele pra zona 400 e conselho impossivel de
        // seguir. Aqui a sugestao sai do POKEMON ATIVO e do SEU nivel de
        // treinador, e zona sem acesso aparece marcada como bloqueada. E a
        // diferenca entre "seria bom" e "da pra fazer agora".
        // =====================================================================
        const HUNTS_FAV_KEY = 'bugSuiteHuntsFavoritos';
        const HUNTS_XP_KEY = 'bugSuiteHuntsXpPorZona';
        const HUNTS_NIVEL_TETO = 200;   // o `m` do app-1.js

        let huntsFavoritos = new Set();
        try {
            const cru = localStorage.getItem(HUNTS_FAV_KEY);
            if (cru) { const a = JSON.parse(cru); if (Array.isArray(a)) huntsFavoritos = new Set(a.map(Number)); }
        } catch (e) { }

        let huntsXpPorZona = {};    // { zonaIndex: { xp, seg } }
        try {
            const cru = localStorage.getItem(HUNTS_XP_KEY);
            if (cru) { const o = JSON.parse(cru); if (o && typeof o === 'object') huntsXpPorZona = o; }
        } catch (e) { }

        let huntsFiltro = { busca: '', soFav: false, soAcesso: true, soVantagem: false, ordem: 'rec' };

        // Entrar numa hunt e parar olhando nao serve pra nada — o passo seguinte
        // e sempre ligar a caça. Ligado por padrao; o chip na doca desliga.
        const HUNTS_AUTOCACA_KEY = 'bugSuiteHuntsAutoCaca';
        let huntsAutoCaca = true;
        try {
            const v = localStorage.getItem(HUNTS_AUTOCACA_KEY);
            if (v != null) huntsAutoCaca = v === '1';
        } catch (e) { }
        let _docaHunts = null;
        let _huntsCache = null;      // lista montada (invalida ao trocar de ativo)

        function huntsSalvarFavoritos() {
            try { localStorage.setItem(HUNTS_FAV_KEY, JSON.stringify([...huntsFavoritos])); } catch (e) { }
        }
        function huntsSalvarXp() {
            try { localStorage.setItem(HUNTS_XP_KEY, JSON.stringify(huntsXpPorZona)); } catch (e) { }
        }

        // O nivel do selvagem e o `reqLevel` (ver cabecalho: medido, 650/650).
        function huntsNivelDaZona(z) {
            const n = Number(z.reqLevel) || null;
            return { min: n, max: n };
        }

        // ---------------------------------------------------------------------
        // Estado do jogador
        // ---------------------------------------------------------------------
        function huntsNivelJogador() {
            try {
                const s = ultimoStateGeral || {};
                return Number(s.player && s.player.level) || Number(jogadorInfo && jogadorInfo.level) || 0;
            } catch (e) { return 0; }
        }

        function huntsPokeAtivo() {
            try {
                const s = ultimoStateGeral || {};
                if (s.active && s.active.type1) return s.active;
                const t = Array.isArray(s.team) ? s.team : [];
                return t.find(p => p && p.active && p.type1) || t.find(p => p && p.type1) || null;
            } catch (e) { return null; }
        }

        function huntsTiposDe(p) {
            return [p && p.type1, p && p.type2]
                .filter(t => t && String(t).toLowerCase() !== 'none')
                .map(t => String(t).toLowerCase());
        }

        function huntsZonaAtualIndex() {
            try {
                const s = ultimoStateGeral || {};
                return (s.zone && s.zone.index != null) ? Number(s.zone.index) : -1;
            } catch (e) { return -1; }
        }

        // Regra de acesso do jogo, ipsis litteris.
        function huntsTemAcesso(z, nivel) {
            const req = Number(z.reqLevel) || 0;
            return req >= HUNTS_NIVEL_TETO ? nivel >= req : nivel >= (req - 20);
        }
        function huntsNivelExigido(z) {
            const req = Number(z.reqLevel) || 0;
            return req >= HUNTS_NIVEL_TETO ? req : Math.max(1, req - 20);
        }

        // ---------------------------------------------------------------------
        // Medicao de XP por zona (o unico numero de XP que a doca mostra)
        // ---------------------------------------------------------------------
        let _huntsUltimaAmostra = null;   // { zona, xp, kills, em }

        // ⚠️ A FONTE MUDOU, E PRA MELHOR.
        // A primeira versao media `player.xp`, o que obrigava a tratar subida de
        // nivel (o xp zera) e nao dizia nada sobre kills. Mas o jogo JA
        // contabiliza a caçada inteira em `state.hunt`:
        //
        //   { secs, xp, pxp, kills, catches, balls, loot[{name,count,gold}] }
        //
        // Sao contadores acumulados do proprio servidor. Tirando delta deles por
        // zona sai XP/h, kills/h e **XP por kill** — tudo medido, nada suposto.
        // No state real: 822.975.638 XP / 45.140 s = 65,6M XP/h, 13.837 kills =
        // 59.476 XP por kill.
        function huntsAmostrarXp() {
            try {
                const s = ultimoStateGeral;
                const h = s && s.hunt;
                if (!h) return;
                const zona = huntsZonaAtualIndex();
                const xp = Number(h.xp) || 0;
                const kills = Number(h.kills) || 0;
                const agora = Date.now();
                const ant = _huntsUltimaAmostra;

                // A base so avanca quando e consumida ou quando deixou de
                // servir. Trocar a cada tick (~400ms) faria o dt nunca alcancar
                // a janela minima e o medidor nunca registraria nada.
                const trocar = () => { _huntsUltimaAmostra = { zona, xp, kills, em: agora }; };

                if (zona < 0) return trocar();
                if (!ant || ant.zona !== zona) return trocar();

                const dt = (agora - ant.em) / 1000;
                if (dt < 3) return;                 // ainda cedo: mantem a base
                if (dt > 120) return trocar();      // aba parada: descarta

                const dxp = xp - ant.xp;
                const dk = kills - ant.kills;
                // `hunt` zera quando a caçada reinicia: delta negativo nao e
                // medida, e recomeço.
                if (dxp < 0 || dk < 0) return trocar();
                if (dxp === 0 && dk === 0) return trocar();

                const reg = huntsXpPorZona[zona] || { xp: 0, seg: 0, kills: 0 };
                reg.xp += dxp;
                reg.kills = (reg.kills || 0) + dk;
                reg.seg += dt;
                huntsXpPorZona[zona] = reg;
                trocar();
                if (reg.seg > 30 && Math.random() < 0.05) huntsSalvarXp();
            } catch (e) { }
        }

        function huntsKillsHora(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || r.seg < 60 || !r.kills) return null;
            return (r.kills / r.seg) * 3600;
        }

        // XP por kill medido — e o numero que permite projetar as outras zonas.
        function huntsXpPorKill(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || !r.kills || r.seg < 60) return null;
            return r.xp / r.kills;
        }

        // PROJECAO pras zonas que voce ainda nao caçou.
        // Nao ha formula de XP no cliente (o servidor nao publica), entao a
        // unica base honesta e o que VOCE ja mediu. Com pelo menos uma zona
        // medida, projetamos assumindo que o XP por kill acompanha o nivel do
        // selvagem — e a suposicao fica dita no tooltip, nao escondida.
        // Sem nenhuma medida, nao ha projecao: o card mostra nivel e vantagem.
        function huntsBaseProjecao() {
            let melhor = null;
            for (const k of Object.keys(huntsXpPorZona)) {
                const xpk = huntsXpPorKill(k);
                const kh = huntsKillsHora(k);
                if (xpk == null || kh == null) continue;
                const z = (META_ZONES || []).find(x => x && String(x.index) === String(k));
                const nivel = z ? (Number(z.reqLevel) || 0) : 0;
                if (!nivel) continue;
                const r = huntsXpPorZona[k];
                if (!melhor || r.seg > melhor.seg) melhor = { nivel, xpPorKill: xpk, killsHora: kh, seg: r.seg };
            }
            return melhor;
        }

        function huntsXpHora(zonaIndex) {
            const r = huntsXpPorZona[zonaIndex];
            if (!r || r.seg < 60) return null;   // menos de 1 min nao e medida
            return (r.xp / r.seg) * 3600;
        }

        // ---------------------------------------------------------------------
        // Montagem e nota
        // ---------------------------------------------------------------------
        function huntsMontarLista() {
            const nivel = huntsNivelJogador();
            const ativo = huntsPokeAtivo();
            const meusTipos = huntsTiposDe(ativo);
            const zonas = (META_ZONES || []).filter(z => z && !z.city);

            return zonas.map(z => {
                const pk = z.pokemon || [];
                const tiposZona = [];
                pk.forEach(p => huntsTiposDe(p).forEach(t => { if (!tiposZona.includes(t)) tiposZona.push(t); }));

                // Melhor multiplicador do MEU golpe contra algum bicho da zona,
                // e o pior que algum bicho da zona faz em mim.
                let bato = 1, apanho = 1;
                if (meusTipos.length && typeof multDanoAtkVsDef === 'function') {
                    bato = 0;
                    pk.forEach(p => {
                        const d = huntsTiposDe(p);
                        if (!d.length) return;
                        const m = multDanoAtkVsDef(meusTipos, d);
                        if (m > bato) bato = m;
                    });
                    if (!bato) bato = 1;
                }
                if (meusTipos.length && typeof multDanoRecebido === 'function') {
                    pk.forEach(p => {
                        const a = huntsTiposDe(p);
                        if (!a.length) return;
                        const m = multDanoRecebido(a, meusTipos);
                        if (m > apanho) apanho = m;
                    });
                }

                const lv = huntsNivelDaZona(z);
                return {
                    index: z.index,
                    nome: z.name,
                    regiao: z.region || '',
                    reqLevel: Number(z.reqLevel) || 0,
                    exigido: huntsNivelExigido(z),
                    acesso: huntsTemAcesso(z, nivel),
                    pokemon: pk,
                    tipos: tiposZona,
                    lvMin: lv.min,
                    lvMax: lv.max,
                    bato,
                    apanho,
                    xpHora: huntsXpHora(z.index),
                    killsHora: huntsKillsHora(z.index),
                    fav: huntsFavoritos.has(Number(z.index))
                };
            });
        }

        // Nota de recomendacao. Componentes, todos verificaveis:
        //   • sem acesso -> fundo do poço (nao adianta recomendar o que trava);
        //   • XP/h MEDIDO por você domina quando existe;
        //   • senão, nível do selvagem (proxy honesto de XP) normalizado;
        //   • vantagem de tipo multiplica; levar 2x+ na cara penaliza.
        function huntsNota(h, tetoLv, tetoXp) {
            if (!h.acesso) return -1;
            let base;
            if (h.xpHora != null && tetoXp) base = h.xpHora / tetoXp;
            else if (h.xpProj && tetoXp) base = (h.xpProj / tetoXp) * 0.9;   // projetado vale menos que medido
            else base = tetoLv ? ((h.lvMax || 0) / tetoLv) * 0.85 : 0;
            const vant = h.bato >= 2 ? 1.35 : (h.bato >= 1 ? 1 : 0.55);
            const risco = h.apanho >= 2 ? 0.72 : 1;
            return base * vant * risco;
        }

        // ---------------------------------------------------------------------
        // UI
        // ---------------------------------------------------------------------
        function huntsFavoritar(idx) {
            const i = Number(idx);
            if (huntsFavoritos.has(i)) huntsFavoritos.delete(i); else huntsFavoritos.add(i);
            huntsSalvarFavoritos();
            huntsRenderizar();
        }

        async function huntsEntrar(idx) {
            const i = Number(idx);
            const z = (META_ZONES || []).find(x => x && x.index === i);
            if (!z) return;
            if (!huntsTemAcesso(z, huntsNivelJogador())) {
                if (typeof logEvent === 'function') logEvent(`🔒 "${z.name}" exige nível ${huntsNivelExigido(z)}.`, '#fca5a5');
                return;
            }
            try {
                if (typeof selecionarZonaConfirmada === 'function') await selecionarZonaConfirmada(i);
                else if (typeof selecionarZonaNativa === 'function') await selecionarZonaNativa(i);
                if (typeof logEvent === 'function') logEvent(`📍 Entrando em "${z.name}".`, '#7dd3fc');
                if (huntsAutoCaca) await huntsLigarCaca();
            } catch (e) {
                if (typeof logErro === 'function') logErro('Entrar na hunt', String((e && e.message) || e));
            }
            huntsRenderizar();
        }

        function huntsFmtXp(n) {
            if (n == null) return null;
            if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
            if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
            if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
            return String(Math.round(n));
        }

        // Liga a caça automatica do jogo (o "Caçar automático" da barra lateral).
        // E a MESMA chave que o Auto-Helper usa: `setAuto { hunt: true }` — nao
        // um clique simulado no checkbox, que dependeria do painel estar aberto
        // e do rotulo nao ter mudado de nome.
        async function huntsLigarCaca() {
            try {
                // O teleporte ainda esta assentando quando `selectZone` volta;
                // ligar a caça antes de o servidor registrar a zona nova faria
                // o robo comecar caçando na zona antiga.
                await new Promise(r => setTimeout(r, 700));
                const r = await chamadaSegura(() => apiTest('setAuto', { hunt: true }), 'ligar caça automática');
                const ok = r && r.data && (r.data.ok || r.data.state);
                if (ok) {
                    // Mantem o resto da suite em sincronia com o servidor: o
                    // widget da sidebar e o espelho do painel leem daqui.
                    try { if (typeof estadoAuto === 'object') estadoAuto.hunt = true; } catch (e) { }
                    try { if (typeof pintarAutoToggleIdle === 'function') pintarAutoToggleIdle('hunt', true); } catch (e) { }
                    try { if (typeof window.__setIdleAuto === 'function') window.__setIdleAuto('hunt', true); } catch (e) { }
                    if (typeof logEvent === 'function') logEvent('🎯 Caça automática ligada na zona nova.', '#4ade80');
                } else if (typeof logEvent === 'function') {
                    logEvent('🎯 Não consegui ligar a caça — o servidor não confirmou.', '#fca5a5');
                }
                return ok;
            } catch (e) { return false; }
        }

        function huntsCardHtml(h, atual, base) {
            const bloq = !h.acesso;
            const lv = h.lvMax == null ? '—' : ('Lv ' + h.lvMax);

            // Sprite do bicho principal da zona. O caminho e relativo e resolve
            // sozinho porque a doca roda DENTRO da pagina do jogo.
            const principal = h.pokemon[0];
            const sprite = (principal && typeof spriteAnimadoPoke === 'function')
                ? `<img class="hd-sprite" src="${spriteAnimadoPoke(principal.name)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />`
                : '';

            const bichos = h.pokemon.map(p => p.name).join(', ');

            // Drops: pedras primeiro (sao o que se caça de proposito), o resto
            // depois. Vem de zone.pokemon[].loot / .stones.
            const pedras = [], comuns = [];
            h.pokemon.forEach(p => {
                (p.stones || []).forEach(x => { if (!pedras.includes(x)) pedras.push(x); });
                (p.loot || []).forEach(x => {
                    if ((p.stones || []).includes(x)) return;
                    if (!comuns.includes(x)) comuns.push(x);
                });
            });
            const drops = pedras.map(x => `<span class="hd-drop pedra">${x}</span>`).join('')
                        + comuns.slice(0, 4).map(x => `<span class="hd-drop">${x}</span>`).join('')
                        + (comuns.length > 4 ? `<span class="hd-drop mais">+${comuns.length - 4}</span>` : '');

            const selos = [];
            if (h.bato >= 2) selos.push(`<span class="hd-selo bom" title="Seu Pokémon ativo bate ${h.bato}× num dos bichos daqui">⚔️ ${h.bato}×</span>`);
            if (h.apanho >= 2) selos.push(`<span class="hd-selo ruim" title="Algum bicho daqui bate ${h.apanho}× em você">🛡️ ${h.apanho}×</span>`);

            // XP: medido ganha de projetado, sempre.
            const xpMed = huntsFmtXp(h.xpHora);
            const killsMed = h.killsHora;
            if (xpMed) {
                selos.push(`<span class="hd-selo medido" title="MEDIDO no seu jogo nesta zona: ${Math.round(h.xpHora).toLocaleString('pt-BR')} XP/h${killsMed ? ' · ' + Math.round(killsMed).toLocaleString('pt-BR') + ' kills/h' : ''}">📈 ${xpMed} XP/h</span>`);
            } else if (h.xpProj) {
                selos.push(`<span class="hd-selo proj" title="PROJEÇÃO, não medida: parte do que você mediu na sua melhor zona (${base.nivel} · ${Math.round(base.xpPorKill).toLocaleString('pt-BR')} XP por kill) e assume que o XP por kill acompanha o nível do selvagem. Cace aqui ~1 min e vira número medido.">≈ ${huntsFmtXp(h.xpProj)} XP/h</span>`);
            }

            return `
                <div class="hd-card${bloq ? ' bloq' : ''}${atual ? ' atual' : ''}" data-idx="${h.index}">
                    <button class="hd-fav${h.fav ? ' on' : ''}" data-fav="${h.index}" title="${h.fav ? 'Desfavoritar' : 'Favoritar'}">${h.fav ? '★' : '☆'}</button>
                    ${sprite}
                    <div class="hd-corpo" data-ir="${h.index}" title="${bloq ? 'Requer nível ' + h.exigido : 'Clique para entrar nesta hunt'}">
                        <div class="hd-l1">
                            <span class="hd-nome">${h.nome}</span>
                            ${atual ? '<span class="hd-atual">ATUAL</span>' : ''}
                        </div>
                        <div class="hd-l2">
                            <span class="hd-lv">${lv}</span>
                            <span class="hd-reg">${h.regiao}</span>
                            ${bloq ? '<span class="hd-lock">🔒 Nv ' + h.exigido + '</span>' : ''}
                        </div>
                        <div class="hd-l3">${bichos}</div>
                        ${drops ? '<div class="hd-drops">' + drops + '</div>' : ''}
                        ${selos.length ? '<div class="hd-selos">' + selos.join('') + '</div>' : ''}
                    </div>
                </div>`;
        }

        function huntsRenderizar() {
            if (!_docaHunts) return;
            const lista = huntsMontarLista();
            const nivel = huntsNivelJogador();
            const ativo = huntsPokeAtivo();
            const atualIdx = huntsZonaAtualIndex();

            const acessiveis = lista.filter(h => h.acesso);
            const tetoLv = acessiveis.reduce((a, h) => Math.max(a, h.lvMax || 0), 0);
            const tetoXp = acessiveis.reduce((a, h) => Math.max(a, h.xpHora || 0), 0);

            // Projecao pras zonas ainda nao caçadas — so existe se voce ja
            // mediu ALGUMA. Ver `huntsBaseProjecao`: nao ha formula de XP no
            // cliente, entao a unica base honesta e a sua propria medida.
            const base = huntsBaseProjecao();
            lista.forEach(h => {
                h.xpProj = null;
                if (base && h.acesso && h.xpHora == null && h.lvMax && base.nivel) {
                    // Assume que o XP por kill acompanha o nivel do selvagem e
                    // que a velocidade de kill se mantem. Duas suposicoes, e as
                    // duas estao ditas no tooltip do selo.
                    h.xpProj = base.xpPorKill * (h.lvMax / base.nivel) * base.killsHora;
                }
                h.nota = huntsNota(h, tetoLv, tetoXp);
            });

            let vis = lista;
            const q = huntsFiltro.busca.trim().toLowerCase();
            if (q) vis = vis.filter(h => h.nome.toLowerCase().includes(q) ||
                h.pokemon.some(p => String(p.name || '').toLowerCase().includes(q)));
            if (huntsFiltro.soFav) vis = vis.filter(h => h.fav);
            if (huntsFiltro.soAcesso) vis = vis.filter(h => h.acesso);
            if (huntsFiltro.soVantagem) vis = vis.filter(h => h.bato >= 2);

            if (huntsFiltro.ordem === 'nome') vis.sort((a, b) => a.nome.localeCompare(b.nome));
            else if (huntsFiltro.ordem === 'lv') vis.sort((a, b) => (b.lvMax || 0) - (a.lvMax || 0));
            else vis.sort((a, b) => (b.nota - a.nota) || ((b.lvMax || 0) - (a.lvMax || 0)));

            // Favorito sempre no topo: é pra isso que ele existe.
            vis.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));

            const corpo = _docaHunts.corpo;
            const rolagem = corpo.scrollTop;
            const tiposAtivo = huntsTiposDe(ativo);
            corpo.innerHTML = `
                <div class="hd-eu">
                    <b>Nv ${nivel || '?'}</b> · ${ativo ? ativo.name : 'sem Pokémon ativo'}
                    ${tiposAtivo.length ? '<span class="hd-tipos">' + tiposAtivo.join(' / ') + '</span>' : ''}
                    <div class="hd-eu-sub">${acessiveis.length} de ${lista.length} hunts liberadas</div>
                </div>
                <input type="text" class="hd-busca" id="hd-busca" placeholder="🔍 Buscar hunt ou Pokémon..." value="${huntsFiltro.busca.replace(/"/g, '&quot;')}" />
                <div class="hd-chips">
                    <button class="hd-chip${huntsFiltro.soFav ? ' on' : ''}" data-f="soFav">★ Favoritos</button>
                    <button class="hd-chip${huntsFiltro.soAcesso ? ' on' : ''}" data-f="soAcesso">✅ Posso entrar</button>
                    <button class="hd-chip${huntsFiltro.soVantagem ? ' on' : ''}" data-f="soVantagem" title="Zonas onde seu ativo bate 2× ou mais">⚔️ Vantagem</button>
                    <button class="hd-chip caca${huntsAutoCaca ? ' on' : ''}" id="hd-autocaca" title="Ao entrar numa hunt, liga sozinho o 'Caçar automático' (setAuto hunt) — assim você já chega atacando">🎯 Caçar ao chegar</button>
                </div>
                <div class="hd-chips">
                    <button class="hd-chip ord${huntsFiltro.ordem === 'rec' ? ' on' : ''}" data-o="rec" title="Nível do selvagem × vantagem de tipo, e o XP/h medido quando existe">⭐ Recomendado</button>
                    <button class="hd-chip ord${huntsFiltro.ordem === 'lv' ? ' on' : ''}" data-o="lv">Nível ↓</button>
                    <button class="hd-chip ord${huntsFiltro.ordem === 'nome' ? ' on' : ''}" data-o="nome">Nome</button>
                </div>
                <div class="hd-lista">
                    ${vis.length ? vis.slice(0, 120).map(h => huntsCardHtml(h, h.index === atualIdx, base)).join('')
                                 : '<div class="hd-vazio">Nenhuma hunt bate com esse filtro.</div>'}
                </div>
                ${vis.length > 120 ? '<div class="hd-mais">+' + (vis.length - 120) + ' fora da lista — refine a busca.</div>' : ''}
            `;
            corpo.scrollTop = rolagem;

            const busca = corpo.querySelector('#hd-busca');
            if (busca) {
                busca.oninput = () => { huntsFiltro.busca = busca.value; huntsRenderizar(); };
                if (q) { busca.focus(); busca.setSelectionRange(busca.value.length, busca.value.length); }
            }
            corpo.querySelectorAll('[data-f]').forEach(b => {
                b.onclick = () => { huntsFiltro[b.dataset.f] = !huntsFiltro[b.dataset.f]; huntsRenderizar(); };
            });
            const btCaca = corpo.querySelector('#hd-autocaca');
            if (btCaca) btCaca.onclick = () => {
                huntsAutoCaca = !huntsAutoCaca;
                try { localStorage.setItem(HUNTS_AUTOCACA_KEY, huntsAutoCaca ? '1' : '0'); } catch (e) { }
                huntsRenderizar();
            };
            corpo.querySelectorAll('[data-o]').forEach(b => {
                b.onclick = () => { huntsFiltro.ordem = b.dataset.o; huntsRenderizar(); };
            });
            corpo.querySelectorAll('[data-fav]').forEach(b => {
                b.onclick = ev => { ev.stopPropagation(); huntsFavoritar(b.dataset.fav); };
            });
            corpo.querySelectorAll('[data-ir]').forEach(b => {
                b.onclick = () => huntsEntrar(b.dataset.ir);
            });

            const medidas = Object.keys(huntsXpPorZona).filter(k => huntsXpHora(k) != null).length;
            _docaHunts.rodape.textContent = medidas
                ? `${vis.length} listadas · XP/h medido em ${medidas} zona(s)`
                : `${vis.length} listadas · o XP/h aparece depois de ~1 min caçando em cada zona`;
        }

        const HD_CSS = `
            .hd-eu { font-size:11px; color:#e2e8f0; background:rgba(56,189,248,.08);
                     border:1px solid rgba(56,189,248,.22); border-radius:8px; padding:6px 9px; margin-bottom:8px; }
            .hd-eu b { color:#7dd3fc; }
            .hd-tipos { font-size:9px; color:#c4b5fd; margin-left:5px; text-transform:uppercase; letter-spacing:.4px; }
            .hd-eu-sub { font-size:9px; color:#94a3b8; margin-top:2px; }
            .hd-busca { width:100%; box-sizing:border-box; background:rgba(148,163,184,.08);
                        border:1px solid rgba(148,163,184,.22); border-radius:7px; padding:5px 8px;
                        font-size:10.5px; color:#f1f5f9; font-family:inherit; margin-bottom:6px; }
            .hd-chips { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
            .hd-chip { font-size:9px; font-weight:700; font-family:inherit; cursor:pointer;
                       background:rgba(148,163,184,.08); border:1px solid rgba(148,163,184,.2);
                       color:#94a3b8; border-radius:999px; padding:3px 8px; white-space:nowrap; }
            .hd-chip.on { background:rgba(56,189,248,.18); border-color:rgba(56,189,248,.45); color:#7dd3fc; }
            .hd-chip.ord.on { background:rgba(250,204,21,.16); border-color:rgba(250,204,21,.45); color:#fde047; }
            /* Verde porque nao e filtro de lista, e comportamento ao entrar. */
            .hd-chip.caca.on { background:rgba(34,197,94,.16); border-color:rgba(34,197,94,.45); color:#4ade80; }
            .hd-lista { display:flex; flex-direction:column; gap:4px; }
            .hd-card { display:flex; align-items:stretch; gap:5px;
                       background:rgba(148,163,184,.05); border:1px solid rgba(148,163,184,.14);
                       border-radius:8px; padding:5px 6px; }
            .hd-card:hover { border-color:rgba(56,189,248,.4); background:rgba(56,189,248,.07); }
            .hd-card.bloq { opacity:.5; }
            .hd-card.atual { border-color:rgba(34,197,94,.5); background:rgba(34,197,94,.1); }
            .hd-fav { flex:none; width:22px; background:transparent; border:none; cursor:pointer;
                      color:#475569; font-size:15px; line-height:1; padding:0; font-family:inherit; }
            .hd-fav.on { color:#fbbf24; }
            .hd-corpo { flex:1; min-width:0; cursor:pointer; display:flex; flex-direction:column; gap:2px; }
            .hd-l1 { display:flex; align-items:center; gap:5px; }
            .hd-nome { font-size:10.5px; font-weight:700; color:#f8fafc;
                       overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .hd-atual { font-size:7.5px; font-weight:900; color:#4ade80;
                        background:rgba(34,197,94,.18); border-radius:3px; padding:0 4px; flex:none; }
            .hd-l2 { display:flex; align-items:center; gap:6px; font-size:9px; }
            .hd-lv { color:#fde047; font-weight:800; }
            .hd-reg { color:#64748b; }
            .hd-lock { color:#fca5a5; font-weight:700; }
            .hd-l3 { font-size:8.5px; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .hd-selos { display:flex; flex-wrap:wrap; gap:3px; margin-top:1px; }
            .hd-selo { font-size:7.5px; font-weight:800; border-radius:3px; padding:0 4px; }
            .hd-selo.bom { background:rgba(34,197,94,.18); color:#4ade80; }
            .hd-selo.ruim { background:rgba(239,68,68,.16); color:#fca5a5; }
            .hd-selo.medido { background:rgba(56,189,248,.16); color:#7dd3fc; }
            /* Projetado e visualmente MAIS FRACO que medido, de proposito: os
               dois nao valem a mesma coisa e a cor nao pode sugerir que valem. */
            .hd-selo.proj { background:rgba(148,163,184,.14); color:#a5b4fc; font-style:italic; }
            .hd-sprite { width:34px; height:34px; object-fit:contain; image-rendering:pixelated;
                         flex:none; align-self:center; }
            .hd-drops { display:flex; flex-wrap:wrap; gap:2px; margin-top:1px; }
            .hd-drop { font-size:7.5px; font-weight:700; color:#94a3b8;
                       background:rgba(148,163,184,.1); border:1px solid rgba(148,163,184,.16);
                       border-radius:3px; padding:0 3px; white-space:nowrap; }
            .hd-drop.pedra { color:#67e8f9; background:rgba(6,182,212,.14); border-color:rgba(6,182,212,.32); }
            .hd-drop.mais { color:#64748b; }
            .hd-vazio, .hd-mais { text-align:center; color:#64748b; font-size:9.5px; padding:10px 0; }
        `;

        function huntsAbrirDoca() {
            if (!document.getElementById('doca-hunts-css')) {
                const st = document.createElement('style');
                st.id = 'doca-hunts-css';
                st.textContent = HD_CSS;
                document.head.appendChild(st);
            }
            if (!_docaHunts || !_docaHunts.el.isConnected) {
                _docaHunts = docaCriar({
                    id: 'doca-hunts', titulo: '🏹 Hunts', lado: 'direita',
                    // `modal` e o modal do PROPRIO JOGO (#modal do play.html) —
                    // e ao lado da tela de Hunts que esta doca faz sentido.
                    // `independente` a livra do docaEsconderTodas() do painel v2,
                    // que nao manda nela.
                    largura: 320, ancora: 'modal', tom: 'roxo', independente: true,
                    acoes: [{ icone: '↻', titulo: 'Recalcular com o estado atual', ao: () => huntsRenderizar() }]
                });
            }
            _docaHunts.mostrar(true, true);
            huntsRenderizar();
        }

        function huntsFecharDoca() {
            if (_docaHunts) _docaHunts.mostrar(false);
        }

        // Fechar com a tela de Hunts ABERTA e uma decisao sobre esta sessao:
        // a doca nao volta sozinha enquanto aquela tela nao for reaberta.
        function huntsFecharPeloUsuario() {
            huntsFechadaPeloUsuario = true;
            huntsFecharDoca();
        }

        function huntsAlternarDoca() {
            const aberta = _docaHunts && _docaHunts.el.isConnected && _docaHunts.el.classList.contains('on');
            if (aberta) huntsFecharDoca(); else huntsAbrirDoca();
            return !aberta;
        }

        // =====================================================================
        // ABRIR JUNTO COM A TELA DE HUNTS DO JOGO
        // =====================================================================
        // O usuario abriu o jogo depois de reiniciar e nao achou a doca: ela so
        // existia atras de Game Tools. O lugar onde ela e util e obvio — do lado
        // da tela de Hunts — entao e ali que ela tem que aparecer sozinha.
        //
        // O sinal e do proprio jogo: quando a tela de Hunts monta, ela poe um
        // `.hnt-root` dentro de `#modal-body` (app-1.js). Observamos isso em vez
        // de tentar adivinhar cliques em botao.
        //
        // `huntsFechadaPeloUsuario` respeita o ✕: quem fechou a doca com o modal
        // de Hunts aberto nao quer que ela volte sozinha na proxima abertura.
        let huntsFechadaPeloUsuario = false;
        let _huntsModalAberto = false;

        function huntsObservarModalDoJogo() {
            const alvo = document.getElementById('modal-body');
            if (!alvo || alvo.__docaHuntsObservado) return false;
            alvo.__docaHuntsObservado = true;

            // ⚠️ PRESENCA NAO E VISIBILIDADE. O jogo fecha o modal escondendo o
            // FUNDO (`#modal-bg.hidden`) e deixa o `.hnt-root` no corpo. Checar
            // so `querySelector('.hnt-root')` dava sempre verdadeiro depois da
            // primeira abertura — foi por isso que a doca ficou grudada na
            // borda da tela depois de teleportar: a tela de Hunts tinha sumido
            // e ela achava que continuava aberta. Mesma guarda que a doca de
            // inventario ja usava (`docaInvBagAberta`, scripts/35).
            const conferir = () => {
                const bg = document.getElementById('modal-bg');
                const visivel = !!bg && !bg.classList.contains('hidden');
                const temHunts = visivel && !!alvo.querySelector('.hnt-root');
                if (temHunts === _huntsModalAberto) return;
                _huntsModalAberto = temHunts;
                if (temHunts) {
                    if (!huntsFechadaPeloUsuario) huntsAbrirDoca();
                } else {
                    // A tela de Hunts fechou: a doca perdeu a ancora. Some com
                    // ela e libera a volta automatica na proxima vez.
                    huntsFecharDoca();
                    huntsFechadaPeloUsuario = false;
                }
            };

            try {
                const obs = new MutationObserver(conferir);
                obs.observe(alvo, { childList: true, subtree: true });
                // Fechar o modal muda a CLASSE DO FUNDO, nao o corpo — sem
                // observar isto o fechamento passava despercebido.
                const bg = document.getElementById('modal-bg');
                if (bg) obs.observe(bg, { attributes: true, attributeFilter: ['class'] });
            } catch (e) { return false; }
            conferir();
            return true;
        }

        // `#modal-body` ja existe no play.html, mas o script pode entrar antes
        // do DOM do jogo estar pronto — daí a tentativa repetida, que para
        // assim que consegue observar.
        (function huntsLigarObservador() {
            if (huntsObservarModalDoJogo()) return;
            let tentativas = 0;
            const t = setInterval(() => {
                if (huntsObservarModalDoJogo() || ++tentativas > 60) clearInterval(t);
            }, 1000);
        })();

        try {
            const _w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            _w.__abrirDocaHunts = huntsAbrirDoca;
            _w.__alternarDocaHunts = huntsAlternarDoca;
            _w.__docaHuntsAberta = () => !!(_docaHunts && _docaHunts.el.isConnected && _docaHunts.el.classList.contains('on'));
        } catch (e) { }
