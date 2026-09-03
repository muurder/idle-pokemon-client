
// =====================================================================
// 97-auto-update-notify.js -- AVISO DE ATUALIZACAO BAIXADA
// =====================================================================
// O main.js (electron-updater) baixa a atualizacao em segundo plano sem
// interromper nada; quando termina, so este toast avisa. A atualizacao
// so entra de verdade no PROXIMO restart do app (o updater nunca troca
// arquivo de um processo rodando).
// =====================================================================
(function () {
  'use strict';
  if (typeof ipcRenderer === 'undefined' || !ipcRenderer) return;

  ipcRenderer.on('update-downloaded', (event, versao) => {
    if (typeof mostrarToast === 'function') {
      mostrarToast(`✅ Atualização v${versao} baixada! Reinicie o app pra aplicar.`, '⬆️', 'toast-success', 8000);
    }
  });
})();
