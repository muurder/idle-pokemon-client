    function toggleGlobalAudio() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('idlePokemonGlobalMuted', isMuted ? '1' : '0');
      } catch(e) {}
      webviews.forEach(wv => {
        try {
          if (wv && typeof wv.setAudioMuted === 'function') {
            wv.setAudioMuted(isMuted);
          }
        } catch(e) {}
      });
      renderizarEstadoAudio();
      mostrarToast(isMuted ? 'Áudio silenciado em todas as contas' : 'Áudio ativado em todas as contas', isMuted ? '🔇' : '🔊', 'info', 2500);
    }

    function renderizarEstadoAudio() {
      const icon = document.getElementById('menu-audio-icon');
      const text = document.getElementById('menu-audio-text');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      if (text) text.textContent = isMuted ? 'Áudio: Silenciado' : 'Áudio: Ativo';
    }

    // Inicialização do Electron Client
