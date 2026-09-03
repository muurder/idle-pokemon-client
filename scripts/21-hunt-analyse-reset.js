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
        function montarBotaoResetMiniHunt() {
            const barra = document.getElementById('mini-hunt');
            if (!barra) return;

            let btn = document.getElementById('ha-mini-hunt-reset');
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'ha-mini-hunt-reset';
                btn.type = 'button';
                btn.title = 'Reiniciar Hunt Analyse (sem abrir o painel)';
                btn.textContent = '🔄';
                btn.style.cssText = 'position:fixed;z-index:26;display:flex;align-items:center;justify-content:center;'
                    + 'background:rgba(10,16,24,.85);border:1px solid #2a3d55;border-top-left-radius:0;border-bottom-left-radius:0;'
                    + 'color:#8b97a5;cursor:pointer;font-size:12px;padding:0 10px;line-height:1;';
                btn.onmouseenter = () => { btn.style.color = '#7fd1ff'; btn.style.borderColor = '#37475c'; };
                btn.onmouseleave = () => { btn.style.color = '#8b97a5'; btn.style.borderColor = '#2a3d55'; };
                btn.onclick = async ev => {
                    ev.stopPropagation();
                    const w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
                    try {
                        if (typeof w.Y === 'function') await w.Y('huntReset');
                        else await apiTest('huntReset');
                    } catch (e) { }
                    logEvent('🔄 <b>Hunt Analyse reiniciada</b> (barra rápida)', '#38bdf8');
                };
                document.body.appendChild(btn);
            }

            // Encosta no lado direito da barra: tira o arredondado e a borda
            // do lado que gruda. Não mexe em `position`/`left`/`top` dela.
            if (barra.dataset.haFlat !== '1') {
                barra.dataset.haFlat = '1';
                barra.style.borderTopRightRadius = '0';
                barra.style.borderBottomRightRadius = '0';
                barra.style.borderRight = 'none';
            }

            const escondida = barra.classList.contains('hidden') || getComputedStyle(barra).display === 'none';
            btn.style.display = escondida ? 'none' : 'flex';
            if (!escondida) {
                const r = barra.getBoundingClientRect();
                btn.style.left = Math.round(r.right) + 'px';
                btn.style.top = Math.round(r.top) + 'px';
                btn.style.height = Math.round(r.height) + 'px';
            }
        }
        setInterval(montarBotaoResetMiniHunt, 400);
        montarBotaoResetMiniHunt();
