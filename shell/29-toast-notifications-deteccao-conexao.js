    function mostrarToast(mensagem, icone = 'ℹ️', tipo = 'normal', duracaoMs = 4000) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast-item ${tipo === 'toast-success' ? 'toast-success' : ''}`;
      toast.innerHTML = `<span>${icone}</span><span>${mensagem}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 350);
      }, duracaoMs);
    }

    // Áudio Chime do Shiny no Desktop Client
    function tocarDesktopShinyChime() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notas = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
        notas.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.07);
          osc.stop(ctx.currentTime + i * 0.07 + 0.36);
        });
      } catch(e) {}
    }

    // Toast de Shiny Interativo com Nome do Personagem / Aba e Clique Direto
    function dispararToastShiny(index, nomeAba, charName, pokeName) {
      tocarDesktopShinyChime();
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast-item toast-shiny';
      toast.setAttribute('title', 'Clique para ir direto para esta conta!');

      const charDisplay = charName && charName !== nomeAba ? ` (${charName})` : '';

      toast.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:8px">
          <span style="font-size:12.5px; font-weight:900; color:#fde047; display:flex; align-items:center; gap:5px">
            <span>✨</span> <span>SHINY ENCONTRADO!</span>
          </span>
          <span style="font-size:9.5px; background:linear-gradient(135deg,#facc15,#eab308); color:#090d16; font-weight:900; padding:2px 7px; border-radius:10px; box-shadow:0 0 8px rgba(250,204,21,0.6)">IR PARA ABA ➔</span>
        </div>
        <div style="font-size:11.5px; color:#e2e8f0; line-height:1.3">
          Conta <b style="color:#38bdf8">${nomeAba}</b><span style="color:#a5b4fc">${charDisplay}</span>
        </div>
        <div style="font-size:13.5px; font-weight:900; color:#facc15; text-shadow:0 0 10px rgba(250,204,21,0.5)">
          🌟 ${pokeName || 'Pokémon'} Shiny!
        </div>
        <div style="font-size:9.5px; color:#94a3b8; font-weight:600">
          👆 Clique aqui para visualizar a conta em tela cheia!
        </div>
      `;

      // Ao clicar na notificação, vai direto para a aba correspondente
      toast.onclick = (e) => {
        e.stopPropagation();
        fecharTradeHubModal();
        if (isGridMode) {
          toggleGridMode(); // Sai do grid para focar na tela completa da conta
        }
        selectTab(index);

        if (webviews[index]) {
          try { webviews[index].focus(); } catch(err) {}
        }

        // Efeito de destaque na aba selecionada
        const btnTab = tabButtons[index];
        if (btnTab) {
          btnTab.classList.add('shiny-flash');
          setTimeout(() => btnTab.classList.remove('shiny-flash'), 6000);
        }

        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
      };

      container.appendChild(toast);

      // Dispara o alerta flutuante na Tela Principal em setups multi-monitores
      try {
        ipcRenderer.send('show-primary-screen-shiny-alert', { index, nomeAba, charName, pokeName });
      } catch(e) {}

      // Salva no histórico de Troféus de Shinies
      adicionarHistoricoShiny(index, nomeAba, charName, pokeName);

      // Piscar a aba no topo mesmo antes do clique
      const btnTab = tabButtons[index];
      if (btnTab) {
        btnTab.classList.add('shiny-flash');
        setTimeout(() => btnTab.classList.remove('shiny-flash'), 10000);
      }

      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 350);
        }
      }, 12000);
    }

    // Listener para focar aba quando o alerta da tela principal for clicado
    ipcRenderer.on('focus-tab', (event, targetIndex) => {
      fecharTradeHubModal();
      if (isGridMode) {
        toggleGridMode();
      }
      selectTab(targetIndex || 0);
      if (webviews[targetIndex]) {
        try { webviews[targetIndex].focus(); } catch(err) {}
      }
    });

    // ================================================================
