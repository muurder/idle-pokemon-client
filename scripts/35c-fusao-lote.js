        // =====================================================================
        // 35c-fusao-lote.js — FUNDIR BOLAS EM LOTE
        // =====================================================================
        // A tira "Fundir" do jogo (game.js, .fuse-row) sempre manda
        // `vezes: 1`. Quem tem 400 Moon Ball precisa de 20 cliques — e cada
        // clique remonta a mochila inteira (o handler do jogo re-chama
        // openBag), então são 20 redesenhos também.
        //
        // Aqui embaixo de cada tira nasce uma SEGUNDA tira, só nossa, com
        // quantidade escolhida (−/+, campo, "máx") e um botão que faz o lote de
        // uma vez. A tira do jogo continua intacta: um clique nela ainda funde
        // uma, e quem não quiser lote nunca precisa olhar pra nossa.
        //
        // ── Receita: do /api/meta, nunca cravada ──
        // `S.balls[].fusao` = { de: 'premier', custo: 20 }. Se o dono trocar
        // 20 por 15 no balls.json, esta tira acompanha sem deploy — mesma
        // decisão que o game.js já documenta na tira original.
        //
        // ── Uma requisição, com rede ──
        // O servidor recebe `vezes` e DEVOLVE quantas fez (`resp.vezes`), então
        // não precisamos adivinhar se ele aceita lote: pedimos N, conferimos o
        // que voltou e completamos o que faltar com pedidos de 1 em 1. Se ele
        // aceitar o lote, é 1 requisição; se limitar a 1, o resultado é o mesmo
        // que os 20 cliques dariam — só que sem os 20 cliques e sem os 20
        // redesenhos, porque a mochila só é redesenhada no fim.
        // =====================================================================

        // Quantidade escolhida por receita, entre um redesenho e outro da
        // mochila. Sem isto, digitar 7 e ver a tira renascer com "máx" seria a
        // regra, não a exceção: o jogo remonta a grade a cada poll.
        const _fLoteQtd = {};
        let _fLoteRodando = false;
        let _fLoteAbortar = false;

        function fLoteEstado() {
            // Mesmo acesso léxico do 35: K e S são `let` de topo de script no
            // game.js, então não existem em window.
            let est = null, meta = null;
            try { if (typeof K !== 'undefined' && K) est = K; } catch (e) { }
            try { if (typeof S !== 'undefined' && S) meta = S; } catch (e) { }
            if (!est || !meta) {
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (!est) est = w.K || null;
                    if (!meta) meta = w.S || null;
                } catch (e) { }
            }
            return { K: est, S: meta };
        }

        // Todas as receitas de fusão que o jogador PODE fazer agora (>= 1).
        // Espelha o filtro da tira do jogo de propósito: nossa tira só existe
        // colada numa tira dele.
        function fLoteReceitas() {
            const { K, S } = fLoteEstado();
            if (!K || !S || !Array.isArray(S.balls)) return [];
            const fora = [];
            for (const b of S.balls) {
                if (!b.fusao || !b.fusao.de) continue;
                const de = b.fusao.de;
                const custo = Math.max(1, b.fusao.custo | 0);
                const tem = (K.balls && K.balls[de]) | 0;
                const max = Math.floor(tem / custo);
                if (max < 1) continue;
                const deLabel = (S.balls.find(x => x.key === de) || {}).label || de;
                fora.push({ alvo: b.key, label: b.label || b.key, de, deLabel, custo, tem, max });
            }
            return fora;
        }

        function fLoteToast(msg) {
            const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
            try { if (typeof w.showStatusToast === 'function') { w.showStatusToast(msg); return; } } catch (e) { }
            try { if (typeof logEvent === 'function') logEvent(msg, '#c4b5fd'); } catch (e) { }
        }

        // Uma chamada crua ao endpoint. O `t()` do jogo não é alcançável daqui
        // (é local do game.js), então falamos com a API do mesmo jeito que os
        // outros módulos do suite falam.
        async function fLotePedir(alvo, vezes) {
            const tok = (typeof obterToken === 'function') ? obterToken() : '';
            if (!tok) throw new Error('Sem token pra falar com o servidor.');
            const r = await fetch('/api/balls/fundir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tok, alvo, vezes })
            });
            let o = null;
            try { o = await r.json(); } catch (e) { o = null; }
            // Erro do servidor vem como mensagem, não como exceção de rede — e
            // sem `alvo` na resposta não houve fusão nenhuma.
            if (!r.ok || !o || !o.alvo) {
                throw new Error((o && (o.error || o.erro || o.message)) || ('Falha na fusão (HTTP ' + r.status + ').'));
            }
            return o;
        }

        // Aplica a resposta no estado do jogo. A mochila é desenhada a partir
        // de K.balls: sem isto o jogador só veria a bola nova no próximo poll,
        // que é exatamente o que o handler original do jogo evita.
        function fLoteAplicar(rec, resp) {
            const { K } = fLoteEstado();
            if (!K || !K.balls) return;
            if (resp.de && resp.de.restam != null) K.balls[rec.de] = resp.de.restam;
            if (resp.alvo && resp.alvo.total != null) K.balls[rec.alvo] = resp.alvo.total;
        }

        async function fLoteExecutar(rec, vezes, bt) {
            if (_fLoteRodando) return;
            vezes = Math.max(1, Math.min(rec.max, vezes | 0));
            _fLoteRodando = true;
            _fLoteAbortar = false;
            const rotulo = bt.textContent;
            bt.classList.add('flote-rodando');
            const pintar = feito => { bt.textContent = feito + '/' + vezes + ' — parar'; };
            pintar(0);

            let feito = 0, gastou = 0, erro = null;
            try {
                // 1ª tentativa: o lote inteiro numa requisição.
                try {
                    const o = await fLotePedir(rec.alvo, vezes);
                    fLoteAplicar(rec, o);
                    feito = Math.max(1, o.vezes | 0);
                    gastou = (o.gastou | 0) || feito * rec.custo;
                } catch (e) {
                    // Servidor que recusa o lote ainda aceita a unidade: o laço
                    // abaixo cobre esse caso sozinho. Só desistimos se ele
                    // recusar a unidade também.
                    erro = e;
                }
                // 2ª parte: completa o que faltou (servidor que ignora/limita o
                // `vezes`, ou que recusou o lote de cara).
                while (feito < vezes && !_fLoteAbortar) {
                    try {
                        const o = await fLotePedir(rec.alvo, 1);
                        fLoteAplicar(rec, o);
                        feito += Math.max(1, o.vezes | 0);
                        gastou += (o.gastou | 0) || rec.custo;
                        erro = null;
                        pintar(feito);
                    } catch (e) { erro = e; break; }
                    // Respiro entre chamadas: 20 POSTs sem pausa é o desenho de
                    // um cliente que parece ataque, não de um que parece jogo.
                    await new Promise(res => setTimeout(res, 90));
                }
            } finally {
                _fLoteRodando = false;
                bt.classList.remove('flote-rodando');
                bt.textContent = rotulo;
            }

            if (feito > 0) {
                delete _fLoteQtd[rec.alvo];
                fLoteToast('🌕 ' + gastou + '× ' + rec.deLabel + ' viraram ' + feito + '× ' + rec.label + '!');
                // Redesenha pelo caminho do próprio jogo (o envelope da doca do
                // inventário mora aqui também, então a doca acompanha).
                try {
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    if (typeof w.openBag === 'function') w.openBag();
                } catch (e) { }
            }
            if (erro && feito < vezes) fLoteToast('⚠️ ' + (erro.message || 'Fusão interrompida.') + (feito ? ' (' + feito + ' feita(s))' : ''));
        }

        const FLOTE_CSS = `
        .flote-row{grid-column:1/-1;display:flex;align-items:center;gap:8px;width:100%;
            margin:-1px 0 5px;padding:6px 9px;border-radius:10px;color:#cfc6ea;font:inherit;
            border:1px solid #322b52;border-top-color:#241f3d;
            background:linear-gradient(180deg,rgba(60,46,105,.20),rgba(15,17,30,.42))}
        .flote-lbl{font-size:10.5px;letter-spacing:.3px;color:#8f86ad}
        .flote-bt{font:inherit;font-size:12px;line-height:1;color:#e6d9ff;cursor:pointer;
            padding:5px 9px;border-radius:7px;border:1px solid rgba(185,155,255,.32);
            background:linear-gradient(180deg,rgba(150,120,235,.22),rgba(70,55,130,.22))}
        .flote-bt:hover{border-color:rgba(215,190,255,.7);color:#fff}
        .flote-bt:disabled{opacity:.4;cursor:default}
        .flote-num{width:64px;font:inherit;font-size:12px;text-align:center;color:#fff;
            padding:5px 4px;border-radius:7px;border:1px solid #453a70;background:rgba(10,11,20,.6);
            font-variant-numeric:tabular-nums}
        .flote-num::-webkit-outer-spin-button,.flote-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .flote-conta{font-size:10.5px;color:#8f86ad;font-variant-numeric:tabular-nums}
        .flote-go{margin-left:auto;font-size:10px;font-weight:800;letter-spacing:2.2px;
            text-transform:uppercase;color:#e6d9ff;cursor:pointer;padding:6px 12px;border-radius:7px;
            border:1px solid rgba(185,155,255,.4);font-family:inherit;
            background:linear-gradient(180deg,rgba(150,120,235,.3),rgba(70,55,130,.3))}
        .flote-go:hover:not(:disabled){color:#fff;border-color:rgba(215,190,255,.78);
            background:linear-gradient(180deg,rgba(170,140,255,.46),rgba(90,70,160,.42))}
        .flote-go:disabled{opacity:.45;cursor:default}
        .flote-go.flote-rodando{letter-spacing:.6px;border-color:rgba(255,180,120,.6);color:#ffd9a8;
            background:linear-gradient(180deg,rgba(190,120,60,.34),rgba(90,55,25,.34))}
        `;

        function fLoteCss() {
            if (document.getElementById('flote-css')) return;
            const st = document.createElement('style');
            st.id = 'flote-css';
            st.textContent = FLOTE_CSS;
            document.head.appendChild(st);
        }

        // A tira do jogo não carrega o `key` da bola em lugar nenhum do DOM —
        // só o `title`, que é texto de interface. Por isso casamos pela ORDEM:
        // o game.js percorre `S.balls` na mesma ordem que fLoteReceitas(), e
        // ambos aplicam o mesmo filtro (`max >= 1`). O `title` entra só como
        // conferência: se ele não citar o rótulo da receita que a ordem diz,
        // desistimos daquela linha em vez de desenhar o controle errado.
        function fLoteCasar(linhas, receitas) {
            const pares = [];
            const n = Math.min(linhas.length, receitas.length);
            for (let i = 0; i < n; i++) {
                const t = linhas[i].title || '';
                if (t && receitas[i].label && t.indexOf(receitas[i].label) < 0) continue;
                pares.push([linhas[i], receitas[i]]);
            }
            return pares;
        }

        function fLoteMontar(linha, rec) {
            const row = document.createElement('div');
            row.className = 'flote-row';
            row.dataset.floteAlvo = rec.alvo;
            row.title = 'Fusão em lote: escolha quantas ' + rec.label + ' fazer de uma vez.';

            const lbl = document.createElement('span');
            lbl.className = 'flote-lbl';
            lbl.textContent = 'Em lote:';

            const menos = document.createElement('button');
            menos.type = 'button';
            menos.className = 'flote-bt';
            menos.textContent = '−';

            const num = document.createElement('input');
            num.className = 'flote-num';
            num.type = 'number';
            num.min = '1';
            num.max = String(rec.max);
            num.step = '1';

            const mais = document.createElement('button');
            mais.type = 'button';
            mais.className = 'flote-bt';
            mais.textContent = '+';

            const max = document.createElement('button');
            max.type = 'button';
            max.className = 'flote-bt';
            max.textContent = 'máx ' + rec.max;

            const conta = document.createElement('span');
            conta.className = 'flote-conta';

            const go = document.createElement('button');
            go.type = 'button';
            go.className = 'flote-go';

            // Padrão = o máximo. Quem abre esta tira quase sempre quer "faz
            // tudo"; quem quer 3 digita 3, e a escolha sobrevive ao redesenho.
            let v = _fLoteQtd[rec.alvo];
            v = Math.max(1, Math.min(rec.max, (v | 0) || rec.max));

            const pintar = () => {
                _fLoteQtd[rec.alvo] = v;
                num.value = String(v);
                conta.textContent = (v * rec.custo) + '× ' + rec.deLabel + ' → ' + v + '× ' + rec.label
                    + ' · sobram ' + (rec.tem - v * rec.custo);
                go.textContent = 'Fundir ' + v + '×';
                menos.disabled = v <= 1;
                mais.disabled = v >= rec.max;
                max.disabled = v >= rec.max;
            };

            const setar = nv => {
                v = Math.max(1, Math.min(rec.max, (nv | 0) || 1));
                pintar();
            };

            menos.onclick = ev => { ev.stopPropagation(); setar(v - 1); };
            mais.onclick = ev => { ev.stopPropagation(); setar(v + 1); };
            max.onclick = ev => { ev.stopPropagation(); setar(rec.max); };
            num.onclick = ev => ev.stopPropagation();
            num.oninput = () => {
                // Enquanto digita, campo vazio é campo vazio — normalizar aqui
                // faria "2" virar "1" no meio da digitação de "20".
                const n = parseInt(num.value, 10);
                if (!isNaN(n)) { v = Math.max(1, Math.min(rec.max, n)); _fLoteQtd[rec.alvo] = v; }
            };
            num.onchange = () => setar(parseInt(num.value, 10));
            num.onkeydown = ev => {
                ev.stopPropagation();   // o jogo escuta teclas soltas na página
                if (ev.key === 'Enter') { setar(parseInt(num.value, 10)); go.click(); }
            };

            go.onclick = ev => {
                ev.stopPropagation();
                // Clicar de novo enquanto roda = parar. O lote já feito fica
                // feito; só o que falta é cancelado.
                if (_fLoteRodando) { _fLoteAbortar = true; return; }
                fLoteExecutar(rec, v, go);
            };

            pintar();
            row.append(lbl, menos, num, mais, max, conta, go);
            linha.insertAdjacentElement('afterend', row);
        }

        // Redesenha as tiras de lote quando a mochila muda. Barato: sai fora na
        // hora se não há tira de fusão na tela (o caso comum).
        function fLoteSincronizar() {
            const corpo = document.getElementById('modal-body');
            if (!corpo) return;
            const linhas = [...corpo.querySelectorAll('.fuse-row')];
            if (!linhas.length) {
                corpo.querySelectorAll('.flote-row').forEach(el => el.remove());
                return;
            }
            // Mexer no DOM no meio de um lote tiraria o botão que mostra o
            // progresso (e o que serve pra parar) debaixo do dedo do jogador.
            if (_fLoteRodando) return;
            const receitas = fLoteReceitas();
            const pares = fLoteCasar(linhas, receitas);
            const vivos = new Set();
            for (const [linha, rec] of pares) {
                vivos.add(rec.alvo);
                const atual = linha.nextElementSibling;
                const jaOk = atual && atual.classList && atual.classList.contains('flote-row')
                    && atual.dataset.floteAlvo === rec.alvo && atual.dataset.floteMax === String(rec.max);
                if (jaOk) continue;
                if (atual && atual.classList && atual.classList.contains('flote-row')) atual.remove();
                fLoteMontar(linha, rec);
                const nova = linha.nextElementSibling;
                if (nova) nova.dataset.floteMax = String(rec.max);
            }
            corpo.querySelectorAll('.flote-row').forEach(el => {
                if (!vivos.has(el.dataset.floteAlvo)) el.remove();
            });
        }

        if (!window.__fusaoLoteInstalada) {
            window.__fusaoLoteInstalada = true;
            fLoteCss();
            // Duas redes, como o resto do suite: o observador pega o redesenho
            // no mesmo quadro; o tick cobre o caso de o #modal-body ainda não
            // existir quando instalamos, ou de o markup do jogo mudar.
            try {
                const corpo = document.getElementById('modal-body');
                if (corpo && typeof MutationObserver === 'function') {
                    new MutationObserver(() => {
                        try { fLoteSincronizar(); } catch (e) { console.error('[fusao-lote] obs', e); }
                    }).observe(corpo, { childList: true, subtree: true });
                }
            } catch (e) { }
            setInterval(() => {
                try { fLoteSincronizar(); } catch (e) { console.error('[fusao-lote] tick', e); }
            }, 600);
        }
