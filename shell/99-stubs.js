
// =====================================================================
// 99-stubs.js -- TOCOS PARA AS CHAMADAS QUE A PODA DEIXOU PENDURADAS
// =====================================================================
// ESTE ARQUIVO SO EXISTE NO CLIENTE. Ele e colado no fim de
// shell.gerado.js por build_client.py.
//
// Por que precisa existir: o shell do dev e UM ESCOPO PLANO -- os modulos
// se chamam livremente, sem import. Quando a allowlist do cliente corta um
// modulo, o codigo que FICOU continua chamando funcoes que sumiram. Sem
// toco, cada uma dessas chamadas e um ReferenceError que derruba a funcao
// inteira que a continha (nao so a linha).
//
// Como manter: NAO escreva toco de cabeca. Rode
//     python scripts_orfaos.py
// depois de cada build; ele lista exatamente o que ficou pendurado. Toco a
// mais e peso morto; toco a menos e tela quebrada na mao do cliente.
//
// Regra pros tocos: cada um imita o CONTRATO do original -- o que o
// chamador faz com o retorno. `rotacionarProxyConta` devolve null porque o
// chamador guarda o retorno e testa. Os de render nao devolvem nada porque
// ninguem olha.
// =====================================================================
(function () {

  // --- UI da Central de Trade -----------------------------------------
  // Chamados de dentro de carregarInventariosTradeHub(), que o cliente USA
  // (e o coletor de inventario do Avaliador Meta). O coletor termina
  // redesenhando a tela do trade hub, que aqui nao existe.
  function tradeLog() {}
  function tradeSetProgress() {}
  function atualizarStatsContas() {}
  function renderizarGradeInventario() {}
  function renderizarGradePokes() {}
  function renderizarOfertasQueue() {}
  function fecharTradeHubModal() {}

  // --- Widget de Auto Toggles (Hunt/Catch/Sell/Buy) --------------------
  // O widget e do Idle Suite e nao vem pro cliente, mas o watchdog e o
  // sistema de itens fixaveis chamam essas tres no ciclo normal.
  function renderizarWidgetAutoTogglesSidebar() {}
  function syncSidebarAutoToggles() {}
  function toggleWidgetAutoTogglesSidebarVisibilidade() {}

  // --- Proxy -----------------------------------------------------------
  // O cliente nao gerencia proxy. O watchdog e o mini dashboard chamam isto
  // ao reconectar uma conta; devolver null e o mesmo que o original faz
  // quando o pool esta vazio, entao o chamador ja sabe lidar.
  function rotacionarProxyConta() { return null; }

  // Publica no escopo global: o shell.gerado.js roda em escopo plano e as
  // chamadas pendentes procuram estes nomes ali.
  var tocos = {
    tradeLog: tradeLog,
    tradeSetProgress: tradeSetProgress,
    atualizarStatsContas: atualizarStatsContas,
    renderizarGradeInventario: renderizarGradeInventario,
    renderizarGradePokes: renderizarGradePokes,
    renderizarOfertasQueue: renderizarOfertasQueue,
    fecharTradeHubModal: fecharTradeHubModal,
    renderizarWidgetAutoTogglesSidebar: renderizarWidgetAutoTogglesSidebar,
    syncSidebarAutoToggles: syncSidebarAutoToggles,
    toggleWidgetAutoTogglesSidebarVisibilidade: toggleWidgetAutoTogglesSidebarVisibilidade,
    rotacionarProxyConta: rotacionarProxyConta
  };
  for (var nome in tocos) {
    if (typeof window[nome] === 'undefined') window[nome] = tocos[nome];
  }
})();
