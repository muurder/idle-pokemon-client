        // =====================================================================
        // 09c-espaco-modal.js — ABRIR ESPAÇO AO LADO DO MODAL DO JOGO
        // =====================================================================
        // As docas viviam disputando a tela com o painel do jogo. O Time & Box é
        // o pior caso: o `openTeamBox` liga a classe `modal-xl`, que é
        // `min(1440px, 98vw)` (style.css:5773) — ele come a tela inteira e sobra
        // uma fresta pras docas.
        //
        // Em vez de espremer as docas, este módulo EMPURRA o painel do jogo:
        // reserva uma faixa à direita e o modal se acomoda no que sobrou.
        //
        // ── Como, sem brigar com o CSS do jogo ──
        // `#modal-bg` é `position:fixed; inset:0` com flex centralizando o
        // `#modal` (style.css:4013). Um `padding-right` nele encolhe a caixa
        // onde a centralização acontece: o modal continua centralizado, só que
        // na faixa que sobrou — ou seja, ele anda pra esquerda sozinho, sem
        // ninguém calcular posição.
        //
        // O `modal-xl` precisa de teto próprio: `98vw` ignoraria o padding e
        // vazaria por baixo das docas.
        //
        // ── Por que é reversível, e tem que ser ──
        // Isto mexe no painel DO JOGO. Fechada a doca, o espaço é devolvido na
        // hora: deixar o modal encolhido depois que a doca sumiu seria um bug
        // silencioso que ninguém ligaria à gente.
        // =====================================================================

        // ⚠️ RESERVA COM DONO.
        // A 1a versao guardava um numero so. Com duas docas (Inventario e Time &
        // Box) isso vira briga: clicar no pokemon ativo DENTRO da mochila fecha
        // a bag e abre o Time & Box, e por um instante as duas estao vivas — uma
        // pedindo 750px e a outra devolvendo 0. O painel do jogo ficava pulando
        // e a doca "quebrava".
        //
        // Agora cada doca reserva com a SUA chave e o modulo aplica o maior
        // pedido vivo. Quem fecha zera so a propria chave.
        const _espacoPorDono = {};
        let _espacoModalAtual = -1;

        function espacoModalCss() {
            if (document.getElementById('espaco-modal-css')) return;
            const st = document.createElement('style');
            st.id = 'espaco-modal-css';
            st.textContent = `
                html.doca-espaco #modal-bg {
                    justify-content: center;
                    padding-right: var(--doca-reserva, 0px);
                    box-sizing: border-box;
                }
                /* O modal-xl do Time & Box e 98vw: sem este teto ele passaria
                   por baixo das docas em vez de encolher. */
                html.doca-espaco #modal.modal-xl {
                    width: min(1440px, calc(98vw - var(--doca-reserva, 0px)));
                }
                /* Transicao curta: o painel andando de repente parece defeito. */
                #modal-bg { transition: padding-right .18s ease; }
                /* Enquanto um popup do jogo esta aberto, a doca desce pra
                   debaixo dele. O important e necessario porque a regra de
                   z-index da doca generica tambem vence por especificidade. */
                .doca.doca-atras-do-jogo { z-index: 120 !important; }
            `;
            document.head.appendChild(st);
        }

        // dono = quem está pedindo (id da doca). px = quanto reservar à
        // direita; 0 devolve o espaço daquele dono.
        function reservarEspacoModal(dono, px) {
            _espacoPorDono[dono] = Math.max(0, Math.round(px || 0));
            let v = 0;
            for (const k in _espacoPorDono) if (_espacoPorDono[k] > v) v = _espacoPorDono[k];
            if (v === _espacoModalAtual) return;
            _espacoModalAtual = v;
            espacoModalCss();
            const raiz = document.documentElement;
            if (!v) { raiz.classList.remove('doca-espaco'); raiz.style.removeProperty('--doca-reserva'); return; }
            raiz.style.setProperty('--doca-reserva', v + 'px');
            raiz.classList.add('doca-espaco');
        }

        function liberarEspacoModal(dono) { reservarEspacoModal(dono, 0); }

        // Quanto dá pra pedir sem espremer o painel do jogo. O Time & Box tem
        // duas colunas e um piso real de utilidade; abaixo disso é melhor a doca
        // ceder do que a tela do jogo virar um corredor.
        const ESPACO_MODAL_MIN_JOGO = 900;

        // ── MEDIÇÃO DO TEMPO DE CARGA ──────────────────────────────────────
        // "As docas demoram a aparecer depois de reiniciar o Electron" é uma
        // queixa real, mas com três suspeitos possíveis e nenhum medido:
        //   1. o shell só injeta o bundle DEPOIS de detectar o login;
        //   2. o bundle é grande e o parse custa;
        //   3. a doca só nasce/desenha na primeira abertura.
        // O (3) já foi atacado com o pré-aquecimento. Isto aqui mede os três,
        // pra a próxima correção sair de número e não de palpite — que é como
        // este projeto trabalha (ver `ahLogMudou` no 29b).
        //
        // `performance.now()` conta desde a NAVEGAÇÃO da página, não desde o
        // nosso script: é o único relógio que enxerga o tempo que passou antes
        // de a gente existir.
        function docaAgoraMs() {
            try { return Math.round(performance.now()); } catch (e) { return -1; }
        }

        // Marcado uma vez, no primeiro arquivo nosso que roda.
        const DOCA_T_BUNDLE = docaAgoraMs();

        function docaMedir(evento, extra) {
            try {
                if (typeof ahLog !== 'function') return;
                ahLog(evento, Object.assign({
                    msDesdeNavegacao: docaAgoraMs(),
                    msDesdeBundle: docaAgoraMs() - DOCA_T_BUNDLE,
                    build: window.__bugSuiteBuild || '?'
                }, extra || {}));
            } catch (e) { }
        }

        // Cronômetro de um trecho: devolve a função que fecha a conta.
        function docaCronometro(evento, extra) {
            const t0 = docaAgoraMs();
            return (extraFim) => docaMedir(evento, Object.assign({ durouMs: docaAgoraMs() - t0 }, extra, extraFim));
        }

        // ── CEDER A VEZ PROS POPUPS DO JOGO ────────────────────────────────
        // A doca generica vive em z-index 2147483000, acima de tudo. Isso virou
        // bug: clicar num held abre o seletor do jogo (helds.js, `.hd-ov`,
        // z-index 9600) e a nossa doca ficava POR CIMA dele.
        //
        // A 1a correcao foi baixar a doca pra 9500 de vez — e ai ela deixou de
        // ficar acima do resto do jogo o tempo todo, que era o comportamento
        // certo em 99% dos casos. Trocar um problema por outro.
        //
        // Isto aqui e o meio-termo: a doca fica no topo SEMPRE, e so desce
        // enquanto um overlay do jogo esta de fato na tela. Fechou o overlay,
        // ela volta. Nenhuma decisao permanente por causa de um caso pontual.
        const SELETORES_OVERLAY_JOGO = '.hd-ov, .hb-bg, .hb-sub-bg';

        function jogoTemOverlayAberto() {
            try { return !!document.querySelector(SELETORES_OVERLAY_JOGO); }
            catch (e) { return false; }
        }

        // Chamado no tick de cada doca.
        function docaCederAoJogo(el) {
            if (!el) return;
            el.classList.toggle('doca-atras-do-jogo', jogoTemOverlayAberto());
        }

        function espacoDisponivelParaDocas() {
            return Math.max(0, window.innerWidth - ESPACO_MODAL_MIN_JOGO);
        }
