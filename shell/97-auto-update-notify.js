
// =====================================================================
// 97-auto-update-notify.js -- AVISO DE ATUALIZACAO BAIXADA
// =====================================================================
// O main.js (electron-updater) baixa a atualizacao em segundo plano sem
// interromper nada; quando termina, este aviso pede pra reiniciar. A
// atualizacao so entra de verdade no PROXIMO restart do app (o updater
// nunca troca arquivo de um processo rodando).
//
// Diferente do toast padrao (mostrarToast, scripts/29): esse não some
// sozinho -- fica na tela ate a pessoa clicar em "Reiniciar agora" ou
// "Depois", pra nao passar batido antes de decidir.
// =====================================================================
(function () {
  'use strict';
  if (typeof ipcRenderer === 'undefined' || !ipcRenderer) return;

  function mostrarAvisoAtualizacao(versao) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item toast-success';
    toast.style.cssText = 'flex-direction:column; align-items:flex-start; gap:8px; max-width:320px; animation:none';
    toast.innerHTML =
      '<span>⬆️ Atualização v' + versao + ' baixada! Reinicie pra aplicar.</span>' +
      '<div style="display:flex; gap:8px; width:100%">' +
      '<button id="btn-update-restart-now" style="flex:1; background:#16a34a; border:none; border-radius:8px; color:#fff; font-size:11px; font-weight:800; padding:6px 10px; cursor:pointer">🔄 Reiniciar agora</button>' +
      '<button id="btn-update-restart-later" style="background:rgba(148,163,184,.15); border:1px solid rgba(148,163,184,.3); border-radius:8px; color:#cbd5e1; font-size:11px; font-weight:700; padding:6px 10px; cursor:pointer">Depois</button>' +
      '</div>';
    container.appendChild(toast);

    toast.querySelector('#btn-update-restart-now').onclick = () => {
      ipcRenderer.send('restart-app');
    };
    toast.querySelector('#btn-update-restart-later').onclick = () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 350);
    };
  }

  ipcRenderer.on('update-downloaded', (event, versao) => {
    mostrarAvisoAtualizacao(versao);
  });
})();
