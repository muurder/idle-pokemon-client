        // =====================================================================
        // 28e-botao-mapa-ancorado.js — OS BOTÕES DE MAPA SAEM DE CIMA DO CARD
        // =====================================================================
        // Dois botões flutuantes do jogo nascem cravados na coluna da esquerda,
        // na altura em que o card do treinador TERMINAVA:
        //
        //     #mm-show     { position: fixed; left: 12px; top: 262px; }  🗺️
        //     #btn-map-adm { position: fixed; left: 12px; top: 300px; }
        //
        // O #mm-show é o "Mostrar minimapa" — ele só aparece depois que você
        // esconde o minimapa, e é o que estava por cima do card. O #btn-map-adm
        // é o "Mapa (ADM)", que quase todo mundo recebe já com a classe
        // `hidden`. Os dois moram na mesma faixa de pixels.
        //
        // O card cresceu — os selos de ETA (28-auto-hunt-precos) e a tira das
        // berrys (28d) somam altura — e eles passaram a ficar POR CIMA dele,
        // tapando o ✨ Bônus. E como nenhum dos dois é um `.panel` do jogo, não
        // passam pelo restoreElementPosition(): não dá pra arrastar pra lugar
        // nenhum.
        //
        // Duas coisas acontecem aqui, nesta ordem:
        //
        //   1. Por padrão eles ficam OCULTOS.
        //   2. Quem quiser de volta liga em "Ajustes do card", no painel do +
        //      da tira da berry (28d). Aí reaparecem ANCORADOS: a posição passa
        //      a ser medida do card de verdade (getBoundingClientRect, que já
        //      considera o `transform: scale(.82)` que o jogo aplica em tela
        //      estreita) e eles empilham logo abaixo, alinhados pela esquerda.
        //      Card arrastado, tira da berry aparecendo ou sumindo, janela
        //      mudando de tamanho: acompanham sozinhos, porque a conta refaz a
        //      cada tick.
        //
        // Estilo inline ganha do seletor de id da folha do jogo, então não
        // precisa de !important nem de sobrescrever CSS.
        //
        // ⚠️ A classe `hidden` do jogo é sempre respeitada, e ela quer dizer
        // coisas diferentes nos dois: no #btn-map-adm é "você não é ADM"; no
        // #mm-show é "o minimapa está aberto, não precisa do botão de mostrar".
        // Nos dois casos a resposta é a mesma — não encostar. Quem decide se o
        // botão EXISTE é o jogo; nós só decidimos o que fazer com um que ele já
        // tinha mostrado.
        //
        // ⚠️ Com o toggle desligado e o minimapa escondido, o caminho de volta
        // pro minimapa é ligar o toggle de novo. É o que o texto de ajuda do
        // toggle avisa.
        // =====================================================================

        const MAPA_VISIVEL_KEY = 'idleSuiteMapaVisivel';
        const MAPA_FOLGA_PX = 8;
        const MAPA_BOTOES = ['mm-show', 'btn-map-adm'];
        let _mapaUltimaPos = '';

        // Ausente = oculto. Só um '1' explícito, gravado pelo toggle, mostra.
        function mapaVisivel() {
            try { return localStorage.getItem(MAPA_VISIVEL_KEY) === '1'; } catch (e) { return false; }
        }

        function mapaDefinirVisivel(v) {
            try { localStorage.setItem(MAPA_VISIVEL_KEY, v ? '1' : '0'); } catch (e) { }
            _mapaUltimaPos = '';   // força reposicionar quando voltarem a aparecer
            aplicarBotaoMapa();
        }

        function aplicarBotaoMapa() {
            const mostrar = mapaVisivel();
            const card = document.getElementById('player-panel');

            // Empilhados na ordem de MAPA_BOTOES, cada um abaixo do anterior.
            // Sem o card (ainda não montou) não há de onde medir: nesse caso só
            // o esconder continua valendo, que não depende de posição nenhuma.
            const r = card ? card.getBoundingClientRect() : null;
            let topo = (r && r.height) ? Math.round(r.bottom + MAPA_FOLGA_PX) : 0;
            const esq = (r && r.height) ? Math.round(r.left) : 0;

            // Esconder não depende de medida nenhuma e é idempotente, então sai
            // na frente e sem passar pela memória de posição.
            const visiveis = [];
            for (const id of MAPA_BOTOES) {
                const btn = document.getElementById(id);
                if (!btn) continue;

                // `hidden` é decisão do jogo — ver o comentário do topo.
                if (btn.classList.contains('hidden')) continue;

                if (!mostrar) {
                    if (btn.style.display !== 'none') btn.style.display = 'none';
                    continue;
                }
                if (btn.style.display === 'none') btn.style.display = '';
                if (topo && btn.offsetParent) visiveis.push(btn);
            }
            if (!mostrar || !visiveis.length) return;

            // A posição de cada um é decidida ANTES de escrever: reescrever
            // style a cada segundo num elemento `position:fixed` força recálculo
            // de layout à toa, e sem calcular tudo primeiro não dá pra saber se
            // alguma coisa mudou de verdade.
            const alvos = [];
            for (const btn of visiveis) {
                alvos.push({ btn, topo, esq });
                topo += Math.round(btn.getBoundingClientRect().height) + 6;
            }
            const marca = alvos.map(a => a.btn.id + ':' + a.esq + ',' + a.topo).join('|');
            if (marca === _mapaUltimaPos) return;
            _mapaUltimaPos = marca;

            for (const a of alvos) {
                a.btn.style.top = a.topo + 'px';
                a.btn.style.left = a.esq + 'px';
            }
        }

        aplicarBotaoMapa();
        setInterval(aplicarBotaoMapa, 1000);
        window.addEventListener('resize', aplicarBotaoMapa);
