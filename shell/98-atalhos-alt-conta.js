
// =====================================================================
// 98-atalhos-alt-conta.js -- ALT+1..9 E ALT+0 TROCA DE CONTA
// =====================================================================
// Alt+1..Alt+9 vao pras contas 1-9; Alt+0 vai pra 10ª conta (mesma
// convencao de aba de navegador/IDE com Ctrl+1..9,0).
//
// Alt e nao Ctrl porque Ctrl+1..9 e atalho de aba do proprio Chromium
// dentro da webview: o jogo receberia o evento antes de nos.
//
// So vai ate a 10ª conta de proposito: o teclado numerico so tem 10
// teclas (1-9 e 0). Contas alem da 10ª (o app aceita ate 16) so tem
// troca por clique mesmo.
//
// DOIS caminhos pra mesma troca, e os dois sao necessarios:
//   1. `keydown` aqui no document -- pega a tecla quando o FOCO esta no
//      shell (sidebar, modais).
//   2. IPC `idle-alt-switch-tab` -- pega quando o foco esta DENTRO de um
//      <webview> (processo separado / guest do jogo). Depois de trocar
//      de aba o foco vai pra la, e keydown no document do shell nunca
//      mais dispara ate o usuario clicar fora de novo. O main.js
//      intercepta a tecla direto no processo do webview (before-input-
//      event) e manda pra ca -- funciona não importa onde o foco esteja.
// =====================================================================
(function () {
  'use strict';

  function trocarConta(idx) {
    if (typeof totalContas !== 'number' || idx >= totalContas) return;
    if (typeof selectTab !== 'function') return;
    selectTab(idx);
    if (typeof mostrarToast === 'function') {
      const nome = (typeof nomesAbas !== 'undefined' && nomesAbas[idx]) || ('Conta ' + (idx + 1));
      mostrarToast(nome, '⚡', 'normal', 1200);
    }
  }

  // Digitando em campo de texto, Alt+numero pode ser acento morto ou
  // caractere de layout -- nao roubamos a tecla de quem esta escrevendo.
  function digitando(alvo) {
    if (!alvo) return false;
    const tag = (alvo.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
  }

  document.addEventListener('keydown', function (ev) {
    if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    if (digitando(ev.target)) return;

    // ev.code em vez de ev.key: com Alt pressionado o layout ABNT2 entrega
    // ev.key como caractere morto, mas o code segue Digit0..Digit9.
    const m = /^Digit([0-9])$/.exec(ev.code || '');
    if (!m) return;

    const digito = parseInt(m[1], 10);
    ev.preventDefault();
    trocarConta(digito === 0 ? 9 : digito - 1);
  });

  if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
    ipcRenderer.on('idle-alt-switch-tab', (event, idx) => trocarConta(idx));
  }
})();
