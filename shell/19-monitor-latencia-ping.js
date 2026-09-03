    //  ⚡ MONITOR DE LATÊNCIA (PING MS) POR CONTA / PROXY
    // ================================================================
    let pingMonitoringTimer = null;

    // Tooltip flutuante do ponto de ping. `title` nativo não serve: o botão
    // da aba é draggable="true" (drag-and-drop de reordenar) e o Chromium
    // suprime tooltip nativo em qualquer descendente de elemento arrastável
    // — o `title` fica gravado no DOM mas nunca aparece no hover. Delegado
    // no document (não no ponto em si) porque `renderizarAbasClient` recria
    // os pontos a cada render; um listener direto morreria junto.
    let _pingTipEl = null;
    function _pingTipMostrar(dot) {
      if (!_pingTipEl) {
        _pingTipEl = document.createElement('div');
        _pingTipEl.className = 'ping-tip-flutuante';
        document.body.appendChild(_pingTipEl);
      }
      const texto = dot.getAttribute('data-tip');
      if (!texto) return;
      _pingTipEl.textContent = texto;
      _pingTipEl.style.display = 'block';
      const r = dot.getBoundingClientRect();
      _pingTipEl.style.left = `${r.left + r.width / 2}px`;
      _pingTipEl.style.top = `${r.bottom + 6}px`;
    }
    function _pingTipEsconder() {
      if (_pingTipEl) _pingTipEl.style.display = 'none';
    }
    document.addEventListener('mouseover', (e) => {
      const dot = e.target.closest && e.target.closest('.tab-ping-dot[data-tip]');
      if (dot) _pingTipMostrar(dot);
    });
    document.addEventListener('mouseout', (e) => {
      const dot = e.target.closest && e.target.closest('.tab-ping-dot[data-tip]');
      if (dot) _pingTipEsconder();
    });

    // Busca o Pokémon ativo de cada conta e atualiza a aba na sidebar
    const pokemonAtivoCache = {};
    // ⚠️ UMA TRAVESSIA DE PROCESSO POR CONTA, NAO TRES.
    // Cada `executeJavaScript` e um ida-e-volta pro processo daquela conta. O
    // loop chamava tres por conta (ping, info do pokemon, nick) a cada 3,5 s —
    // com 11 contas davam 9,4 travessias por segundo, sem parar. Agora o loop
    // usa `varrerContaEmLote`, que pergunta as duas coisas de uma vez so: 3,1/s.
    //
    // ⚠️ Isto NAO mexe em background throttling. As contas continuam todas
    // rodando a todo vapor (`backgroundThrottling:false` no main.js + os
    // switches de linha de comando + `manterWebviewAcorda`). O que diminuiu foi
    // o custo de FICAR PERGUNTANDO, nao o que a conta faz.

    // Pinta na aba o que veio do jogo. Separado do fetch porque os dois
    // caminhos (varredura em lote e chamada avulsa) escrevem a mesma coisa.
    function aplicarInfoPokeAba(index, d) {
      if (!d) return;
      try {
        // O sprite da aba sai daqui: e o unico ponto onde o nome do pokemon
        // ativo chega, e ele muda sozinho quando o Auto Hunt troca de bicho.
        if (d.poke && typeof pintarSpriteAba === 'function') pintarSpriteAba(index, d.poke);
        const pokeEl = document.getElementById(`tab-poke-${index}`);
        const btnEl = document.getElementById(`tab-${index}`);
        const nome = nomesAbas[index] || `Conta ${index + 1}`;
        if (pokeEl && d.poke) {
          const lvStr = d.lv ? ` Lv.${d.lv}` : '';
          pokeEl.textContent = `${d.poke}${lvStr}`;
          pokeEl.style.color = '#94a3b8';
          pokemonAtivoCache[index] = d;
        } else if (pokeEl) {
          pokeEl.textContent = '…';
          pokeEl.style.color = '#475569';
        }
        // Tooltip: nome do personagem + Pokémon ativo
        if (btnEl) {
          const t = d.trainer || nome;
          const pk = d.poke ? `${d.poke}${d.lv ? ' Lv.'+d.lv : ''}` : '…';
          btnEl.setAttribute('title', `${t} (persist:acc${index + 1})\n🎮 Pokémon: ${pk}\nArraste para reordenar • Clique duplo para gerenciar`);
        }
      } catch(e) {}
    }

    async function atualizarPokemonAtivoAba(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const info = await wv.executeJavaScript(
          'typeof window.__getTabInfo==="function"?window.__getTabInfo():"{}"'
        );
        if (info) aplicarInfoPokeAba(index, JSON.parse(info));
      } catch(e) {}
    }

    // Ping + info do pokemon numa chamada so.
    async function varrerContaEmLote(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const r = await wv.executeJavaScript(`
          (async function() {
            const saida = { ping: -1, info: null };
            try {
              const t0 = performance.now();
              await fetch('/api/state?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
              saida.ping = Math.round(performance.now() - t0);
            } catch(e) {}
            try {
              if (typeof window.__getTabInfo === 'function') saida.info = window.__getTabInfo();
            } catch(e) {}
            return saida;
          })()
        `);
        if (!r) { atualizarBadgePingAba(index, -1); return; }
        atualizarBadgePingAba(index, r.ping);
        if (r.info) {
          try { aplicarInfoPokeAba(index, JSON.parse(r.info)); } catch (e) { }
        }
      } catch(e) {
        atualizarBadgePingAba(index, -1);
      }
    }

    async function medirPingConta(index) {
      const wv = webviews[index];
      if (!wv) return;
      try {
        const pingMs = await wv.executeJavaScript(`
          (async function() {
            try {
              const t0 = performance.now();
              await fetch('/api/state?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
              return Math.round(performance.now() - t0);
            } catch(e) {
              return -1;
            }
          })()
        `);
        atualizarBadgePingAba(index, pingMs);
      } catch(e) {
        atualizarBadgePingAba(index, -1);
      }
    }

    function atualizarBadgePingAba(index, pingMs) {
      const dot = document.getElementById(`tab-ping-${index}`);
      if (!dot) return;

      // ⚠️ ERA UM BADGE COM O NÚMERO ("104ms"). Com o sprite do Pokémon entrando
      // na aba, o número passou a disputar a mesma linha do nome — e o valor
      // exato do ping quase nunca é o que se quer saber: o que importa é
      // "está bem / está ruim / caiu". Virou um ponto colorido, e o número
      // completo ficou no tooltip pra quem precisar.
      dot.classList.remove('bom', 'medio', 'ruim', 'morto');
      let texto;
      if (pingMs <= 0 || pingMs === -1) {
        dot.classList.add('morto');
        texto = 'Sem resposta do servidor';
      } else if (pingMs < 90) {
        dot.classList.add('bom');
        texto = `Conexão excelente — ${pingMs} ms`;
      } else if (pingMs < 200) {
        dot.classList.add('medio');
        texto = `Conexão boa / proxy estável — ${pingMs} ms`;
      } else {
        dot.classList.add('ruim');
        texto = `Latência alta — ${pingMs} ms`;
      }
      dot.title = texto;
      // ⚠️ O `title` nativo NUNCA aparece aqui: a aba (`.tab-btn`) tem
      // `draggable="true"` pro drag-and-drop de reordenar, e o Chromium
      // suprime o tooltip nativo em qualquer descendente de elemento
      // arrastável. `data-tip` + CSS (`::after`) contorna isso.
      dot.setAttribute('data-tip', texto);
    }

    // Detecção Automática do Nome do Personagem ao Logar
    //
    // Antes so tentava ler globais da pagina (`K.player.name`, `gameState...`)
    // e um seletor `#stat-jog-name` que NAO EXISTE no jogo (0 ocorrencias em
    // play.html/app-1.js/game.js) — por isso a aba nova nunca era renomeada
    // depois do login/cadastro. A fonte confiavel e a mesma que o proprio
    // Idle Suite usa: GET /api/state -> state.player.name. O token fica em
    // sessionStorage.pmi_tab_token / localStorage.pmi_token, que sao lidos
    // igual em qualquer mundo de execucao (ao contrario dos globais da pagina,
    // invisiveis quando o executeJavaScript cai em mundo isolado).
    async function checarNomePersonagemWebview(index) {
      const wv = webviews[index];
      if (!wv) return;

      // ⚠️ PORTÃO DE CUSTO — regressão introduzida em 2026-09-02 nesta mesma
      // função. Ao consertar o auto-nick eu troquei a leitura de globais (de
      // graça) por um `fetch('/api/state?token=')`. Só que o loop de ping chama
      // isto para TODA conta a cada 3,5 s: com 11 contas viraram ~3 requisições
      // HTTP por segundo ao servidor, para sempre — inclusive para abas que já
      // têm o nome do personagem e nunca mais seriam renomeadas.
      //
      // A renomeação só acontece enquanto o nome ainda é o padrão ("Conta N").
      // Então a checagem cara só precisa rodar nesse caso. Uma aba já nomeada
      // sai do circuito e não custa mais nada.
      const nomeAtualRapido = (nomesAbas[index] || '').trim();
      if (nomeAtualRapido && !/^Conta\s*\d+$/i.test(nomeAtualRapido)) return;

      try {
        const nick = await wv.executeJavaScript(`
          (async function() {
            function limpar(v) {
              if (!v || typeof v !== 'string') return null;
              const t = v.replace(/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/gu, '')
                         .replace(/Treinador/gi, '').trim();
              return t.length >= 2 ? t : null;
            }
            try {
              // 1. Ponte do proprio Idle Suite, quando ja injetado.
              if (typeof window.__obterDashboardStatus === 'function') {
                const d = window.__obterDashboardStatus();
                const n = limpar(d && d.player && d.player.trainer);
                if (n) return n;
              }
            } catch(e) {}
            try {
              // 2. Globais da pagina (so funcionam no mundo principal).
              const w = window;
              const cand = (w.K && w.K.player && w.K.player.name)
                        || (w.S && w.S.player && w.S.player.name)
                        || (w.gameState && w.gameState.player && w.gameState.player.name)
                        || (w.__gameState && w.__gameState.player && w.__gameState.player.name);
              const n = limpar(cand);
              if (n) return n;
            } catch(e) {}
            try {
              // 3. Fonte de verdade: /api/state.
              let tok = '';
              try { tok = sessionStorage.getItem('pmi_tab_token') || ''; } catch(e) {}
              if (!tok || tok.length < 10) { try { tok = localStorage.getItem('pmi_token') || ''; } catch(e) {} }
              if ((!tok || tok.length < 10) && typeof window.q === 'string') tok = window.q;
              if (tok && tok.length >= 10) {
                const r = await fetch('/api/state?token=' + encodeURIComponent(tok)).then(x => x.json()).catch(() => null);
                const n = limpar(r && r.state && r.state.player && r.state.player.name);
                if (n) return n;
              }
            } catch(e) {}
            try {
              // 4. Ultimo recurso: painel do jogador no DOM (#pp-name).
              const el = document.getElementById('pp-name')
                      || document.querySelector('.trainer-name')
                      || document.getElementById('player-name');
              const n = limpar(el && el.textContent);
              if (n) return n;
            } catch(e) {}
            return null;
          })()
        `);

        if (!nick || typeof nick !== 'string') return;
        if (nick.length < 2 || nick === 'Carregando...' || /^conta\s*\d+$/i.test(nick)) return;

        const nomeAtual = (nomesAbas[index] || '').trim();
        // So renomeia enquanto a aba ainda tem nome padrao — nome escolhido
        // pelo usuario no modal de renomear continua mandando.
        const ehNomePadrao = !nomeAtual || /^Conta\s*\d+$/i.test(nomeAtual);
        if (!ehNomePadrao || nomeAtual === nick) return;

        console.log(`[Auto-Nick] Conta ${index + 1}: personagem '${nick}' detectado — renomeando aba.`);
        nomesAbas[index] = nick;
        try {
          localStorage.setItem('idlePokemonCustomTabNames', JSON.stringify(nomesAbas));
        } catch(e) {}

        // Credencial guardada da conta tambem acompanha o nick, senao o modal
        // de gerenciar continua mostrando "Conta N".
        try {
          if (Array.isArray(listaCredenciais) && listaCredenciais[index]) {
            const cu = (listaCredenciais[index].user || '').trim();
            if (!cu || /^Conta\s*\d+$/i.test(cu)) {
              listaCredenciais[index].user = nick;
              localStorage.setItem('idlePokemonAccountCredentials', JSON.stringify(listaCredenciais));
            }
          }
        } catch(e) {}

        const titleEl = document.getElementById(`tab-title-${index}`);
        if (titleEl) titleEl.textContent = nick;

        const headerEl = document.getElementById(`header-title-${index}`);
        if (headerEl) headerEl.textContent = `🎮 ${nick} (persist:acc${index + 1})`;

        const tabBtn = document.getElementById(`tab-${index}`);
        if (tabBtn) tabBtn.setAttribute('title', `${nick} (persist:acc${index + 1})\nArraste para reordenar • Clique duplo para gerenciar`);

        if (typeof mostrarToast === 'function') {
          mostrarToast(`Aba ${index + 1} renomeada para "${nick}"`, '🏷️', 'success', 2600);
        }
      } catch(e) {}
    }

    function iniciarLoopMonitoramentoPing() {
      if (pingMonitoringTimer) clearInterval(pingMonitoringTimer);
      pingMonitoringTimer = setInterval(() => {
        for (let i = 0; i < totalContas; i++) {
          varrerContaEmLote(i);
          // Fica de fora do lote de proposito: com o portao de custo abaixo ela
          // custa ZERO em aba ja nomeada, e so faz a chamada cara enquanto o
          // nome ainda e "Conta N".
          checarNomePersonagemWebview(i);
        }
      }, 3500);
      setTimeout(() => {
        for (let i = 0; i < totalContas; i++) {
          varrerContaEmLote(i);
          checarNomePersonagemWebview(i);
        }
      }, 1500);
    }

    // Memorizador de Login Inteligente na Webview (Salva e Preenche Direto na Tela do Jogo)
    //
    // Tres bugs corrigidos aqui (reportados em 2026-09-02):
    //
    // 1. Aba nova ja nascia com o campo de usuario preenchido. Causa: o fill
    //    usava `localStorage.getItem('idle_saved_user') || "<nome da aba>"`,
    //    ou seja, SEM credencial salva ele escrevia "Conta 5" no campo. Agora
    //    o fallback nao existe: sem credencial salva, campo vazio.
    //
    // 2. Apagar o campo nao adiantava — o texto voltava sozinho. Causa: o
    //    `setInterval(instalarLembrarLogin, 800)` reexecutava o fill a cada
    //    800ms e a unica guarda era `!uInput.value`; assim que o usuario
    //    esvaziava, o proximo tick reescrevia. Agora o preenchimento e feito
    //    UMA vez por carregamento de pagina e qualquer digitacao/apagamento do
    //    usuario marca o formulario como "tocado", travando o fill de vez.
    //
    // 3. Preenchia tambem o CADASTRO. Causa: o jogo reaproveita os MESMOS
    //    inputs (#li-name/#li-pass) nas duas abas — so troca a classe .active
    //    entre #li-tab-login e #li-tab-register e revela #li-pass2. O fill nao
    //    olhava isso. Agora, em modo cadastro, nao preenche nada e ainda limpa
    //    o que tenha sido preenchido antes da troca de aba.
    function injetarAutoLogin(wv, index) {
      wv.executeJavaScript(`
        (function() {
          if (window.__idleLoginAddon) return;
          window.__idleLoginAddon = true;

          // Limpeza do estrago da versao anterior: ela chegava a SALVAR
          // "Conta N" como usuario (bastava dar Enter no formulario com o
          // campo pre-preenchido). Sem isso, a particao ja contaminada
          // continuaria preenchendo sozinha mesmo com o bug corrigido.
          try {
            var _su = localStorage.getItem('idle_saved_user') || '';
            if (/^Conta\\s*\\d+$/i.test(_su)) localStorage.removeItem('idle_saved_user');
          } catch(e) {}

          var preenchido = false;   // ja preencheu nesta carga de pagina
          var tocado = false;       // usuario digitou/apagou -> nunca mais preenche

          function campos() {
            var u = document.getElementById('li-name');
            var p = document.getElementById('li-pass');
            if (!u) u = document.querySelector('input[name="username"]');
            if (!p) p = document.querySelector('input[type="password"]');
            return (u && p) ? { u: u, p: p } : null;
          }

          // O jogo usa os mesmos inputs pra Entrar e pra Criar conta.
          // #li-tab-register.active (ou #li-pass2 visivel) = modo cadastro.
          function modoCadastro() {
            var tabReg = document.getElementById('li-tab-register');
            if (tabReg && tabReg.classList.contains('active')) return true;
            var p2 = document.getElementById('li-pass2');
            if (p2 && p2.offsetParent !== null) return true;
            return false;
          }

          function lembrarLigado() {
            try { return localStorage.getItem('idle_remember_login') !== '0'; } catch(e) { return true; }
          }

          function marcarTocado() { tocado = true; }

          function preencher(c) {
            if (tocado || preenchido) return;
            if (modoCadastro()) return;
            if (!lembrarLigado()) return;
            var su = '', sp = '';
            try {
              su = localStorage.getItem('idle_saved_user') || '';
              sp = localStorage.getItem('idle_saved_pass') || '';
            } catch(e) {}
            // Sem credencial salva nao inventa nada (era daqui que saia o
            // "Conta N" pre-preenchido numa aba recem-criada).
            if (!su && !sp) return;
            if (su && !c.u.value) {
              c.u.value = su;
              c.u.dispatchEvent(new Event('input', { bubbles: true }));
              c.u.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (sp && !c.p.value) {
              c.p.value = sp;
              c.p.dispatchEvent(new Event('input', { bubbles: true }));
              c.p.dispatchEvent(new Event('change', { bubbles: true }));
            }
            preenchido = true;
          }

          function salvarCredenciais(c) {
            var chk = document.getElementById('chk-remember-login-input');
            var lem = chk ? chk.checked : true;
            try {
              localStorage.setItem('idle_remember_login', lem ? '1' : '0');
              if (lem) {
                if (c.u.value) localStorage.setItem('idle_saved_user', c.u.value);
                if (c.p.value) localStorage.setItem('idle_saved_pass', c.p.value);
              } else {
                localStorage.removeItem('idle_saved_user');
                localStorage.removeItem('idle_saved_pass');
              }
            } catch(e) {}
          }

          function instalarAddon(c) {
            if (document.getElementById('chk-remember-login-addon')) return true;

            var container = document.createElement('div');
            container.id = 'chk-remember-login-addon';
            container.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:6px; margin:8px 0 4px 0; font-size:11.5px; color:#cbd5e1; font-weight:bold; cursor:pointer; user-select:none; font-family:sans-serif';
            var isChecked = lembrarLigado();
            container.innerHTML = '<label style="display:flex; align-items:center; gap:6px; cursor:pointer"><input type="checkbox" id="chk-remember-login-input" ' + (isChecked ? 'checked' : '') + ' style="accent-color:#eab308; width:15px; height:15px; cursor:pointer" /> <span>Lembrar login e senha</span></label>';

            var btnLogin = document.getElementById('btn-login')
              || document.querySelector('#login button.btn-primary')
              || document.querySelector('#login button[type="submit"]')
              || document.querySelector('.login-btn');
            if (btnLogin && btnLogin.parentNode) {
              btnLogin.parentNode.insertBefore(container, btnLogin);
              btnLogin.addEventListener('click', function() { salvarCredenciais(c); });
            } else if (c.p.parentNode) {
              c.p.parentNode.appendChild(container);
            }

            // Desmarcar "lembrar" apaga o que estava guardado na hora, senao o
            // usuario desmarca, recarrega e o texto volta assim mesmo.
            var chk = document.getElementById('chk-remember-login-input');
            if (chk) {
              chk.addEventListener('change', function() {
                marcarTocado();
                salvarCredenciais(c);
              });
            }

            // Qualquer edicao do usuario (inclusive apagar) desliga o fill.
            ['input', 'keydown', 'paste', 'cut'].forEach(function(ev) {
              c.u.addEventListener(ev, marcarTocado);
              c.p.addEventListener(ev, marcarTocado);
            });
            c.u.addEventListener('keydown', function(e) { if (e.key === 'Enter') salvarCredenciais(c); });
            c.p.addEventListener('keydown', function(e) { if (e.key === 'Enter') salvarCredenciais(c); });

            // Trocar pra aba "Criar conta" limpa o que o fill tinha colocado.
            var tabReg = document.getElementById('li-tab-register');
            if (tabReg) {
              tabReg.addEventListener('click', function() {
                if (!tocado && preenchido) { c.u.value = ''; c.p.value = ''; }
                tocado = true;
              });
            }
            return true;
          }

          // O formulario de login pode ainda nao existir quando o script roda.
          // Espera ele aparecer, instala UMA vez e para o watchdog — o loop
          // eterno de 800ms era justamente o que ressuscitava o texto apagado.
          var tentativas = 0;
          var t = setInterval(function() {
            var c = campos();
            if (c) {
              instalarAddon(c);
              preencher(c);
              clearInterval(t);
              return;
            }
            if (++tentativas > 75) clearInterval(t);   // ~60s
          }, 800);
        })();
      `).catch(() => {});
    }

    // Carrega o script do tampermonkey da memória
    async function carregarScriptTamper() {
      try {
        tamperScriptCache = await ipcRenderer.invoke('get-tamper-script');
        console.log('[IdleSuite] Script Suite carregado:', tamperScriptCache ? tamperScriptCache.length : 0, 'bytes');
      } catch(e) {
        console.error('[IdleSuite] Erro ao carregar script suite:', e);
      }
    }

    let activeDisplayInfo = null;

    // Injeta os scripts em uma webview de forma segura
    // ⚠️ NÃO injeta o script principal até o jogo estar logado (#topbar)
    // para evitar bloquear o Cloudflare Turnstile e o botão ENTRAR.
    const _injetadoPorConta = {};  // controla injeção por conta
    function injetarScriptNaWebview(wv, index) {
      // Auto-preenchimento / Auto-Login (pode rodar na tela de login)
      injetarAutoLogin(wv, index);

      // Se já injetamos o script principal para esta conta, não repete
      if (_injetadoPorConta[index]) return;

      if (!tamperScriptCache) {
        const warnMsg = `[Conta ${index + 1}] tamperScriptCache vazio!`;
        console.warn(warnMsg);
        ipcRenderer.send('write-debug-log', { tipo: 'WV-WARN', mensagem: warnMsg });
        return;
      }

      // Verifica se o jogo já logou (presença de #topbar)
      wv.executeJavaScript('!!document.getElementById("topbar")').then(loggedIn => {
        if (loggedIn) {
          // Jogo logado — injeta direto
          _injetarScriptPrincipal(wv, index);
        } else {
          // Tela de login — espera o login com polling (máx 5 min)
          const msg = `[Conta ${index + 1}] Aguardando login para injetar script...`;
          console.log(msg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: msg });
          let tentativas = 0;
          const checkLogin = setInterval(() => {
            tentativas++;
            if (tentativas > 300) { clearInterval(checkLogin); return; } // 5 min timeout
            wv.executeJavaScript('!!document.getElementById("topbar")').then(ok => {
              if (ok) {
                clearInterval(checkLogin);
                _injetarScriptPrincipal(wv, index);
              }
            }).catch(() => {}); // webview pode ter recarregado
          }, 1000);
          // Salva referência para cancelar se navegar
          if (!wv.__loginPollTimers) wv.__loginPollTimers = [];
          wv.__loginPollTimers.push(checkLogin);
        }
      }).catch(() => {}); // webview fechada ou erro
    }

    function _injetarScriptPrincipal(wv, index) {
      if (_injetadoPorConta[index]) return;
      _injetadoPorConta[index] = true;
      // Cancela polls anteriores
      if (wv.__loginPollTimers) {
        wv.__loginPollTimers.forEach(t => clearInterval(t));
        wv.__loginPollTimers = [];
      }
      const scriptSize = tamperScriptCache.length;
      ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: `[Conta ${index + 1}] Jogo logado! Injetando script (${scriptSize} bytes)...` });
      wv.executeJavaScript(tamperScriptCache)
        .then(() => {
          const okMsg = `[Conta ${index + 1}] Script injetado OK (${scriptSize} bytes)`;
          console.log(okMsg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-INJECT', mensagem: okMsg });
          if (activeDisplayInfo) {
            wv.executeJavaScript(`
              if (typeof window.__setMonitorInfo === 'function') {
                window.__setMonitorInfo(${JSON.stringify(activeDisplayInfo)});
              }
              `).catch(() => {});
          }
        })
        .catch(err => {
          _injetadoPorConta[index] = false; // permite retry
          const errMsg = `[Conta ${index + 1}] ERRO ao injetar suite: ${err.message}`;
          console.error(errMsg);
          ipcRenderer.send('write-debug-log', { tipo: 'WV-ERR', mensagem: errMsg });
        });
    }

    // Mantém a webview "acorda" (sem throttle de timers/rAF) mesmo quando a aba não está
    // visível, para que Auto Hunt / Auto Catch / Auto Sell / Auto Buy rodem em segundo plano
    // continuamente. O backgroundThrottling:false da BrowserWindow NÃO alcança as <webview> filhas.
    function manterWebviewAcorda(wv) {
      // Estratégia 1: IPC para o main process (mais confiável no Electron 30+)
      try {
        const wcId = wv.getWebContentsId && wv.getWebContentsId();
        if (wcId) ipcRenderer.invoke('disable-webview-throttling', wcId).catch(() => {});
      } catch(e) {}
      // Estratégia 2: Acesso direto ao webContents (fallback para versões mais antigas)
      try {
        const wc = (wv.webContents) || (typeof wv.getWebContents === 'function' && wv.getWebContents());
        if (wc && typeof wc.setBackgroundThrottling === 'function') wc.setBackgroundThrottling(false);
      } catch (e) {}
    }


    // === WATCHDOG & AUTO-RECONEXÃO INTELIGENTE (5 SEGUNDOS) ===
