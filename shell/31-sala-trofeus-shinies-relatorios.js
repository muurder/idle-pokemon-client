    //  🌟 SALA DE TROFÉUS DE SHINIES & RELATÓRIOS (DISCORD / LOGS)
    // ================================================================
    function adicionarHistoricoShiny(index, nomeAba, charName, pokeName, tipo) {
      try {
        let historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
        const novo = {
          id: Date.now(),
          poke: pokeName || 'Pokémon',
          conta: nomeAba || `Conta ${index+1}`,
          trainer: charName || '',
          tipo: tipo || 'shiny',
          data: new Date().toLocaleDateString('pt-BR'),
          hora: new Date().toLocaleTimeString('pt-BR'),
          timestamp: Date.now()
        };
        historico.unshift(novo);
        if (historico.length > 200) historico = historico.slice(0, 200);
        localStorage.setItem('idleSuiteShinyHistory', JSON.stringify(historico));
        renderizarGaleriaShiniesDashboard();
      } catch(e) {}
    }

    // Função para registrar troféus de bosses e míticos
    function adicionarHistoricoTrofeu(index, nomeAba, charName, pokeName, tipo) {
      adicionarHistoricoShiny(index, nomeAba, charName, pokeName, tipo);
    }

    function renderizarGaleriaShiniesDashboard() {
      const grid = document.getElementById('dashboard-shinies-grid');
      const badge = document.getElementById('dash-shiny-total-badge');
      if (!grid) return;

      let historico = [];
      try {
        historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
      } catch(e) {}

      // Contadores por tipo
      const contadores = { shiny: 0, boss: 0, mythic: 0, legendary: 0 };
      historico.forEach(s => { if (contadores[s.tipo] !== undefined) contadores[s.tipo]++; });

      if (badge) badge.textContent = `${historico.length} Troféus`;

      // Atualiza contadores no header
      const counterShiny = document.getElementById('trophy-counter-shiny');
      const counterBoss = document.getElementById('trophy-counter-boss');
      const counterMythic = document.getElementById('trophy-counter-mythic');
      const counterLegendary = document.getElementById('trophy-counter-legendary');
      if (counterShiny) counterShiny.textContent = `✨ ${contadores.shiny}`;
      if (counterBoss) counterBoss.textContent = `💀 ${contadores.boss}`;
      if (counterMythic) counterMythic.textContent = `🔮 ${contadores.mythic}`;
      if (counterLegendary) counterLegendary.textContent = `👑 ${contadores.legendary}`;

      if (!historico.length) {
        grid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b; font-size:11.5px">
            🏆 Nenhum troféu registrado ainda nesta sessão. Assim que um Shiny, Boss ou Mítico for encontrado por qualquer conta, ele aparecerá aqui com foto e timestamp!
          </div>
        `;
        return;
      }

      const tipoConfig = {
        shiny:    { icon: '⭐', color: '#fde047', label: 'Shiny' },
        boss:     { icon: '💀', color: '#ef4444', label: 'Boss' },
        mythic:   { icon: '🔮', color: '#a78bfa', label: 'Mítico' },
        legendary:{ icon: '👑', color: '#fbbf24', label: 'Lendário' }
      };

      grid.innerHTML = historico.map(s => {
        const pokeClean = s.poke.toLowerCase().replace(/[^a-z0-9]/g, '');
        const spriteUrl = `https://play.pokemonshowdown.com/sprites/gen5/${pokeClean}.png`;
        const tc = tipoConfig[s.tipo] || tipoConfig.shiny;

        return `
          <div class="dash-shiny-card" style="border-left:3px solid ${tc.color}" title="[${tc.label}] ${s.poke} por ${s.trainer || s.conta} em ${s.data} às ${s.hora}">
            <img src="${spriteUrl}" style="width:36px; height:36px; object-fit:contain" onerror="this.src='https://play.pokemonshowdown.com/sprites/gen5/substitute.png'" />
            <div style="flex:1; overflow:hidden">
              <div style="font-size:11px; font-weight:900; color:${tc.color}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                ${tc.icon} ${s.poke}
              </div>
              <div style="font-size:9px; color:#38bdf8; font-weight:700">
                👤 ${s.trainer || s.conta}
              </div>
              <div style="font-size:8px; color:#94a3b8">
                🕒 ${s.data} ${s.hora} · <span style="color:${tc.color}">${tc.label}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function copiarRelatorioShiniesDiscord() {
      let historico = [];
      try {
        historico = JSON.parse(localStorage.getItem('idleSuiteShinyHistory') || '[]');
      } catch(e) {}

      if (!historico.length) {
        mostrarToast('Nenhum troféu no histórico para copiar.', 'ℹ️', 'normal', 3000);
        return;
      }

      const tipoLabel = { shiny: '⭐ Shiny', boss: '💀 Boss', mythic: '🔮 Mítico', legendary: '👑 Lendário' };
      const tipoEmoji = { shiny: '⭐', boss: '💀', mythic: '🔮', legendary: '👑' };

      // Contadores
      const contadores = { shiny: 0, boss: 0, mythic: 0, legendary: 0 };
      historico.forEach(s => { if (contadores[s.tipo] !== undefined) contadores[s.tipo]++; });

      let relatorio = `🏆 **=== SALA DE TROFÉUS (IDLE POKÉMON 4X CLIENT) ===** 🏆\n`;
      relatorio += `📊 **Total:** ${historico.length} troféus\n`;
      if (contadores.shiny) relatorio += `  ⭐ Shinies: ${contadores.shiny}\n`;
      if (contadores.boss) relatorio += `  💀 Bosses: ${contadores.boss}\n`;
      if (contadores.mythic) relatorio += `  🔮 Míticos: ${contadores.mythic}\n`;
      if (contadores.legendary) relatorio += `  👑 Lendários: ${contadores.legendary}\n`;
      relatorio += `📅 **Gerado em:** ${new Date().toLocaleString('pt-BR')}\n\n`;

      historico.slice(0, 50).forEach((s, idx) => {
        const emoji = tipoEmoji[s.tipo] || '⭐';
        const label = tipoLabel[s.tipo] || 'Shiny';
        relatorio += `${idx + 1}. ${emoji} **${s.poke}** (${label}) | Treinador: **${s.trainer || s.conta}** | 🕒 ${s.data} ${s.hora}\n`;
      });

      navigator.clipboard.writeText(relatorio).then(() => {
        mostrarToast('📋 Relatório de Troféus copiado para o Clipboard (formato Discord)!', '🏆', 'toast-success', 4000);
      }).catch(() => {
        mostrarToast('Falha ao copiar para o clipboard.', '❌', 'normal', 3000);
      });
    }

    function limparHistoricoShinies() {
      if (confirm('Deseja limpar todo o histórico de Shinies registrados?')) {
        localStorage.removeItem('idleSuiteShinyHistory');
        renderizarGaleriaShiniesDashboard();
        mostrarToast('Histórico de Shinies limpo com sucesso.', '🧹', 'normal', 3000);
      }
    }

    // MONITOR DE CONEXAO — ele existe para avisar que as contas subiram, e
    // depois sair de cena.
    //
    // A versao anterior parava em `conectadasAgora === 4`, com o 4 cravado (e um
    // array de estado de tamanho fixo 4). Com qualquer numero de contas
    // diferente de 4 — e o app aceita ate 16 — a condicao nunca era verdadeira:
    // o intervalo de 1.5s seguia varrendo TODAS as contas com executeJavaScript
    // pelo resto da sessao. Nao vazava memoria, vazava trabalho.
    //
    // Agora o alvo e totalContas, o estado e um Set (sem tamanho fixo) e a
    // varredura e paralela: N sondas independentes nao precisam de fila.
    const contasConectadas = new Set();
    let todasConectadasNotificadas = false;
    let monitorTimer = null;

    const SONDA_EM_JOGO = '(function(){' +
      'return Boolean(window.K && (window.K.player || window.K.connected) ||' +
      ' (document.getElementById("topbar") && document.getElementById("topbar").offsetHeight > 0));' +
      '})()';

    async function monitorarConexaoContas() {
      const alvo = totalContas;
      const resultados = await Promise.allSettled(
        Array.from({ length: alvo }, (_, i) => {
          const wv = webviews[i];
          if (!wv || typeof wv.executeJavaScript !== 'function') return Promise.reject();
          return wv.executeJavaScript(SONDA_EM_JOGO).then(emJogo => ({ i, emJogo }));
        })
      );

      for (const r of resultados) {
        if (r.status !== 'fulfilled' || !r.value.emJogo) continue;
        const i = r.value.i;
        if (contasConectadas.has(i)) continue;
        contasConectadas.add(i);
        mostrarToast(`Conta <b>${nomesAbas[i] || (i + 1)}</b> conectou e está pronta!`, '🟢', 'normal', 3000);
      }

      if (contasConectadas.size >= alvo && !todasConectadasNotificadas) {
        todasConectadasNotificadas = true;
        mostrarToast(`🎉 Todas as ${alvo} contas conectadas e operando a 100%!`, '🚀', 'toast-success', 6000);
        if (monitorTimer) {
          clearInterval(monitorTimer);   // agora ACONTECE, com qualquer N
          monitorTimer = null;
        }
      }
    }
    monitorTimer = setInterval(monitorarConexaoContas, 1500);

    // =====================================================
    // === BANCO DE DADOS & MOTOR DO AVALIADOR DE POKÉMON META ===
