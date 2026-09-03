        // =====================================================================
        // 18-api-helpers.js — obterToken / apiTest / chamadaSegura / logErro
        // =====================================================================
        // Helpers genericos de chamada a /api/action, extraidos do dev
        // (scripts/05-core-api.js e scripts/18-pause-bind.js) -- usados pela
        // Doca de Hunts (37f) pra ligar o Auto-Helper NATIVO do jogo
        // (setAuto{hunt:true}), que e um recurso do PROPRIO jogo, nao o nosso
        // motor de Auto Hunt (que fica fora do cliente).
        // =====================================================================
        function obterToken() {
            try {
                const ss = sessionStorage.getItem('pmi_tab_token');
                if (ss && ss.length >= 10) return ss;
            } catch(e){}
            try {
                const ls = localStorage.getItem('pmi_token');
                if (ls && ls.length >= 10) return ls;
            } catch(e){}
            try {
                const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                if (w.q && typeof w.q === 'string') return w.q;
                if (w.TOKEN && typeof w.TOKEN === 'string') return w.TOKEN;
                if (w.TAB_TOKEN && typeof w.TAB_TOKEN === 'string') return w.TAB_TOKEN;
            } catch(e){}
            return '';
        }

        function logErro(ctx, msg) { console.warn('[Hunts]', ctx, msg); }

        async function apiTest(action, payload) {
            try {
                const tok = obterToken();
                const res = await fetch('/api/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tok, action, ...payload })
                });
                let data = {};
                try { data = await res.json(); } catch (e) { }
                return { status: res.status, data };
            } catch (e) { return { status: 0, data: {}, error: String(e) }; }
        }

        async function chamadaSegura(fn, ctxoErro) {
            try {
                const r = await fn();
                if (!r) { logErro(ctxoErro, 'resposta vazia'); return null; }
                if (r.status === 0) { logErro(ctxoErro, 'sem resposta do servidor'); return r; }
                if (r.data && r.data.error) { logErro(ctxoErro, r.data.error); return r; }
                return r;
            } catch (e) {
                logErro(ctxoErro, String(e && e.message ? e.message : e));
                return null;
            }
        }

        // Lista das 650 zonas de hunt (/api/meta -> zones). A Doca de Hunts
        // (37f) usa isto pra montar a lista inteira -- no dev vem junto do
        // resto de scripts/05-core-api.js, mas aquele arquivo TERMINA no meio
        // de uma funcao (continua no scripts/06 seguinte): nao da pra copiar
        // so um pedaco dele. Aqui e so o que a doca precisa mesmo.
        let META_ZONES = [];
        (async function carregarZonasMeta() {
            try {
                const meta = await fetch('/api/meta').then(r => r.json()).catch(() => null);
                if (meta && Array.isArray(meta.zones)) META_ZONES = meta.zones;
            } catch (e) { }
        })();
