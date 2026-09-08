        // =====================================================================
        // 28e-botao-mapa-ancorado.js — O BOTÃO DE MAPA SAI DE CIMA DO CARD
        // =====================================================================
        // O #btn-map-adm nasce cravado no CSS do jogo:
        //
        //     #btn-map-adm { position: fixed; left: 12px; top: 300px; }
        //
        // 300px era o suficiente quando o card do treinador terminava antes
        // disso. Só que o card cresceu — os selos de ETA (28-auto-hunt-precos)
        // e a tira das berrys (28d) somam altura — e o botão passou a ficar POR
        // CIMA do card, tapando o ✨ Bônus. E como ele não é um `.panel` do
        // jogo, não passa pelo restoreElementPosition(): não dá pra arrastar
        // pra lugar nenhum.
        //
        // Duas coisas acontecem aqui, nesta ordem:
        //
        //   1. Por padrão ele fica OCULTO. É o "Mapa (ADM)", que o jogo já
        //      entrega com a classe `hidden` pra quase todo mundo — quem tem
        //      ele na tela em geral não usa, e ele custa o canto do card.
        //   2. Quem quiser de volta liga em "Ajustes do card", no painel do +
        //      da tira da berry (28d). Aí ele reaparece ANCORADO: a posição
        //      passa a ser medida do card de verdade (getBoundingClientRect, que
        //      já considera o `transform: scale(.82)` que o jogo aplica em tela
        //      estreita) e ele cola logo abaixo, alinhado pela esquerda. Card
        //      arrastado, tira da berry aparecendo ou sumindo, janela mudando de
        //      tamanho: acompanha sozinho, porque a conta refaz a cada tick.
        //
        // Estilo inline ganha do seletor de id da folha do jogo, então não
        // precisa de !important nem de sobrescrever CSS.
        //
        // ⚠️ A classe `hidden` do jogo é respeitada: se ele já estava escondido
        // por não ser ADM, nada aqui o traz de volta. O toggle só decide o que
        // fazer com um botão que o jogo TINHA mostrado.
        // =====================================================================

        const MAPA_VISIVEL_KEY = 'idleSuiteMapaVisivel';
        const MAPA_FOLGA_PX = 8;
        let _mapaUltimaPos = '';

        // Ausente = oculto. Só um '1' explícito, gravado pelo toggle, mostra.
        function mapaVisivel() {
            try { return localStorage.getItem(MAPA_VISIVEL_KEY) === '1'; } catch (e) { return false; }
        }

        function mapaDefinirVisivel(v) {
            try { localStorage.setItem(MAPA_VISIVEL_KEY, v ? '1' : '0'); } catch (e) { }
            _mapaUltimaPos = '';   // força reposicionar quando voltar a aparecer
            aplicarBotaoMapa();
        }

        function aplicarBotaoMapa() {
            const btn = document.getElementById('btn-map-adm');
            if (!btn) return;

            // O jogo esconde o botão com a classe `hidden` pra quem não é ADM.
            // Esse caso não é nosso: sair mexendo no display dele seria o
            // caminho pra mostrar pra alguém um botão que o jogo negou.
            if (btn.classList.contains('hidden')) return;

            if (!mapaVisivel()) {
                if (btn.style.display !== 'none') btn.style.display = 'none';
                return;
            }
            if (btn.style.display === 'none') btn.style.display = '';

            const card = document.getElementById('player-panel');
            if (!card) return;
            // Fora do fluxo (aba oculta, card ainda não montado) o rect vem
            // zerado e a conta sairia errada.
            if (!btn.offsetParent) return;

            const r = card.getBoundingClientRect();
            if (!r.height) return;

            const topo = Math.round(r.bottom + MAPA_FOLGA_PX);
            const esq = Math.round(r.left);

            // Só escreve quando muda de verdade: escrever style a cada segundo
            // num elemento `position:fixed` força recálculo de layout à toa.
            const marca = esq + ',' + topo;
            if (marca === _mapaUltimaPos) return;
            _mapaUltimaPos = marca;

            btn.style.top = topo + 'px';
            btn.style.left = esq + 'px';
        }

        aplicarBotaoMapa();
        setInterval(aplicarBotaoMapa, 1000);
        window.addEventListener('resize', aplicarBotaoMapa);
