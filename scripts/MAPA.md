# 🗺️ Mapa dos Scripts — Idle Suite

## [2026-09-02] Auto Toggles viram CHAVE, e o cabecalho para de quebrar linha

### Chave on/off no lugar do botao com selo

Eram botoes com um selo "ON"/"OFF" ao lado. Dava pra ler — mas exigia LER. Uma
chave se entende pela posicao do botao antes de qualquer texto.

A mudanca de fundo nao foi visual, foi de responsabilidade: `atualizarSidebarAutoToggles`
escrevia `borderColor`, `background` e cor do texto em **estilo inline**. Estilo
inline vence a folha, entao qualquer transicao declarada no CSS era ignorada —
por isso nunca houve animacao. Agora o JS diz so `el.classList.toggle('on', ...)`
e a aparencia inteira (cor da pilula, posicao do botao, transicao de 180ms) mora
no CSS.

Verde pro que caca e captura, ambar pro que mexe em dinheiro — mesma familia de
cor que o resto da suite usa pra essas duas naturezas.

### O ✕ que caia numa segunda linha

O cabecalho do XP Tracker tinha quatro botoes (fixar, fechar, ▲, ▼) numa faixa
de ~200px com o titulo ao lado: o ✕ nao cabia e quebrava linha. Duas medidas:

1. `flex-wrap: nowrap` nos tres cabecalhos de bloco;
2. as acoes que **nao** sao de reordenar (fixar, fechar) so aparecem no
   `:hover` — e no `:focus-within`, senao o teclado nao alcancaria o que o mouse
   alcanca. Os ▲▼ ficam sempre visiveis, que foi o pedido.

Isso responde "temos muitos icones no XP Tracker" sem tirar funcao: o icone
existe, so nao ocupa a tela o tempo todo.


## [2026-09-02] Sidebar, rodada 2: fora o que nao servia

### O botaozinho colado no ▼ (e um erro meu de leitura)

Primeiro eu removi os ▲/▼ de mover bloco. **Errado** — o usuario apontava o
botaozinho a DIREITA do ▼, nao as setas. Restaurei as setas.

A causa do botaozinho espremido era um bug de encaixe que eu mesmo criei ao
achatar o cabecalho: `montarControlesBlocosSidebar` inseria os ▲▼ em
`header.lastElementChild`. Enquanto havia um `div` agrupando as acoes a direita
isso funcionava; com o cabecalho virando uma linha plana, o ultimo filho passou a
ser um BOTAO — e as setas foram parar DENTRO do botao de recolher. Agora e sempre
`appendChild` no proprio cabecalho.

E teve um segundo erro na mesma leva: eu havia posto uma "limpeza de restos"
(`querySelectorAll('.sidebar-bloco-acoes').forEach(remove)`) no inicio de
`montarControlesBlocosSidebar`. Com as setas de volta, ela passou a apagar os
proprios botoes recem-criados a cada passada. Removida.

O que de fato saiu foi o **botao de recolher o BLOCO** (contas e Auto Toggles):
recolher a lista de contas a fazia sumir e voltar, o que de fora parecia a lista
"girando", e a barra inteira ja recolhe pela lingueta da borda.

**Armadilha de migracao:** quem tivesse deixado um desses blocos recolhido
abriria o app com a lista de contas escondida e **sem botao pra traze-la de
volta**. Uma migracao em `shell/06` apaga esse estado de
`idlePokemonSidebarBlocksCollapsed` uma unica vez.

### Emojis fora, titulos DE VOLTA

Primeira passada: tirei emojis E titulos. O usuario testou e disse "ficou ruim
sem os textos, ne?" — e estava certo. Sem rotulo, os blocos perdem identidade e
a alca sozinha nao diz o que se esta arrastando.

O que ficou: os **emojis** saem (`🎯` do Auto Toggles, `📈` do XP Tracker, `🎮`
do cabecalho de contas, e os quatro dos botoes Hunt/Catch/Sell/Buy — que tem o
nome escrito por extenso ao lado, o emoji so repetia). Os **titulos voltam**, mas
em caixa normal e peso 700, nao no caixa-alta espacado de antes, que era metade
do peso visual da barra.

O peso que se queria tirar era a MOLDURA (gradiente verde, borda inferior, cinco
botoes), nao a informacao.

### O bug que mandou os botoes de mover pro fim do bloco

Ao achatar as barras de titulo do XP Tracker e do Auto Toggles eu criei
`.xpmini-head` e `.sidebar-auto-head` — e tirei sem querer a classe
`sidebar-block-header`. So que ela nao e decorativa: `acharCabecalhoBloco`
(shell/05) procura por ela; sem achar, sobe dois `parentElement` a partir da
alca e devolve **o bloco inteiro** como cabecalho. Resultado: os ▲▼ iam parar no
fim do bloco, soltos embaixo das barras de XP.

A classe voltou nos dois cabecalhos, com um comentario dizendo que ela e
funcional. Cuidado extra: esse comentario mora dentro de um template literal, e
**crase em "comentario" fecha a string** — foi o que quebrou o arquivo na
primeira tentativa. E a mesma armadilha que o `build.py` deste projeto ja
documenta na guarda do topo.

### Lingueta de recolher: pra FORA da sidebar

Ela morava dentro do cabecalho da marca — sumia junto com o resto ao recolher, e
voltar exigia adivinhar onde clicar. Agora e `position: fixed` colada na borda
direita da barra e centrada na altura, no mesmo lugar nos dois estados. A seta
gira 180° quando recolhida: a lingueta diz o que ela FAZ, nao onde esta.

Detalhe: o `left` e 220px fixo, a largura real da `.app-sidebar` — `position:
fixed` nao herda largura de ninguem.

### Estado colapsado: nada mais cortado

A barra virava 56px e o conteudo continuava com a largura de dentro; botoes,
icones e a lista ficavam cortados pela borda. A regra passou a ser: **ou o
elemento cabe centrado em 56px, ou nao aparece**. Somem marca, cabecalhos, XP
Tracker e Auto Toggles; sobra a lista de contas — que e pra ela que se recolhe a
barra. O sprite fica centrado num quadrado de 44px e o ponto de ping vira selo no
canto superior direito.

### Bug de rolagem que a previa mostrou

`.tab-btn.active` tem `transform: translateX(3px)`. Esses 3px estouravam a largura
do container e faziam nascer uma barra de rolagem HORIZONTAL embaixo da lista de
contas. `overflow-x: hidden` no container e 3px de folga na lista.


## [2026-09-02] Sidebar: sprite na aba, ping como ponto, blocos sem caixa

### Sprite do Pokemon no lugar da pokebola

As 11 abas tinham a MESMA pokebola; a cor da conta era a unica distincao, o que
com 11 contas vira teste de memoria. Agora cada aba mostra o sprite do Pokemon
ativo — o dado ja existia em `pokemonAtivoCache`, alimentado pelo loop de ping.

Caminho igual ao do jogo (visto em `scripts/05-core-api.js`): slug minusculo, sem
apostrofo e ponto, espaco vira hifen. Aqui a URL e ABSOLUTA, porque a sidebar
roda no shell e nao na origem do jogo.

Dois cuidados que evitam buraco na interface:

- **A pokebola continua como base.** Ela so some quando a imagem carrega de
  fato (`.tem-sprite` entra no `onload`). Conta sem Pokemon lido, ou sprite que
  nao existe no acervo, cai de volta na pokebola em vez de virar um quadrado
  quebrado — o `onerror` desfaz a classe e remove a img.
- **Prefixos de forma sao removidos.** "Alolan Exeggutor", "Ancient Golem",
  "Elder Tyranitar" nao existem separados no acervo; o slug cai pra especie base.

O sprite e repintado em dois momentos: no `renderizarAbasClient` (o innerHTML
recria os conteineres e a aba voltaria pra pokebola a cada render) e em
`aplicarInfoPokeAba`, que e onde o nome do Pokemon ativo chega e muda sozinho
quando o Auto Hunt troca de bicho.

### Ping virou ponto colorido

Era um badge com o numero ("104ms"). Com o sprite entrando, o numero passou a
disputar a linha do nome — e o que se quer saber quase sempre e "esta bem / esta
ruim / caiu", nao o valor exato. Virou um ponto de 7px (verde <90ms, amarelo
<200ms, laranja acima, vermelho sem resposta) e o numero completo foi pro
tooltip.

### Cabecalho de bloco sem rotulo

Sai o "CONTAS ATIVAS" em caixa-alta; ficam a alca de arrasto, o icone, o
contador e as acoes. O botao grande "Nova Conta" do rodape da lista virou um
**+** no cabecalho.

Duas decisoes que valem registro:

- **O + e verde.** Cinza igual aos controles de ordenar e recolher ficaria
  ambiguo, e ele e a unica acao do cabecalho que cria coisa.
- **O icone do bloco ficou.** A primeira versao deixou alca e icone em
  `opacity: .35` e eles sumiram — sem rotulo E sem icone, nao ha como saber
  qual bloco se esta arrastando. Subiu pra .55 (e .9 no hover), com o icone em
  opacidade cheia.

### Blocos sem caixa

Os blocos eram cards com borda em volta; empilhados, viravam tres molduras
competindo. Agora e so uma linha de separacao entre um assunto e o outro — o
peso que sobrava era a borda, nao o conteudo. O titulo "XP TRACKER" tambem saiu:
duas barras de XP com nome de Pokemon e de treinador dizem o que o bloco e.


## [2026-09-02] Trade, rodada 2: abas, Card x Lista, e o rotulo que so eu entendia

### "Na secao dono aparece c2, c3, c4, nao sei o que e isso"

Falha minha, e das feias: eu rotulei os chips de dono com **C1..C11**, que e o
indice da posicao — detalhe interno do codigo. Quem usa nao tem por que saber
disso. Agora o chip mostra o **nome do treinador** (`apelidoCurtoContaV2`), e o
numero da conta foi pro `title`, pra quem quiser casar com a ordem da sidebar.
Vale pros tres lugares: chips da grade, chips da doca de favoritos e a barra
"DONO:" do modo consolidado.

Licao pra proxima: identificador que so faz sentido pra quem escreveu o codigo
nao pode chegar na tela.

### Abas Itens | Pokemon

As duas listas dividiam a altura da coluna (`flex: 1 1 0` nas duas) — cada uma
ficava com metade, e metade de uma coluna estreita e quase nada. Agora sao abas:
so uma aparece por vez e ocupa a coluna inteira. Marcacao por `data-aba` nos
blocos + `display: none` — esconder por opacidade nao serviria, o bloco
continuaria roubando altura.

O contador vai **na propria aba** ("Itens 8" / "Pokemon 66"): sem ele, clicar em
Pokemon pra descobrir que a conta nao tem nenhum e um clique jogado fora. A aba
ativa persiste por coluna.

### Card e Lista eram "bem parecidos"

Eram mesmo: com a coluna estreita, a grade `auto-fill` do modo Card colapsava
pra uma coluna e virava a mesma coisa que a Lista. Agora cada modo tem um
proposito:

- **Lista** = tabela densa, `grid-template-columns` fixo, colunas alinhadas,
  zebra nas linhas impares, quantidade com `tabular-nums` a direita. E o modo de
  ACHAR.
- **Card** = ladrilho de ~132px com sprite ampliado, nome centrado e quantidade
  grande em dourado. E o modo de BATER O OLHO.

Linguagem visual emprestada do card do Avaliador da conta (scripts/36), que o
usuario apontou como referencia: rotulo miudo em cima, valor forte embaixo, tudo
alinhado. A primeira tentativa usou `scale(1.5)` no sprite e o ladrilho passou
de 100px de altura — cabiam 4 itens na coluna. Ficou em `scale(1.3)`.

## [2026-09-02] Central de Trade: de 3 colunas apertadas para 5 faixas

Queixa: *"os cards dos itens estao enormes"*, *"a mesa de negociacao e muito
pequena"*, *"ta muito ruim de trabalhar com ela"*.

### Cards enormes — culpa da rodada anterior

Ao trocar o emoji de 13 px pelo sprite de 34 px eu tambem **empilhei nome e
quantidade** e mantive uma segunda linha de tags. O card virou tres andares e
cabiam ~4 itens numa coluna que precisa mostrar dezenas. Sprite voltou pra
26 px, nome e quantidade dividem a mesma linha, e `.v2trade-item-bot:empty`
some com a linha de baixo quando nao ha tag nem dono pra mostrar.

### Layout: favoritos | origem | mesa | destino | log

O **log morava dentro da coluna central** e comia metade do espaco da mesa —
justamente onde a troca acontece. Agora sao cinco faixas, com as duas pontas
recolhiveis (o estado persiste em `bugSuiteTradeDocas`) e uma lingueta pra
reabrir: fechar sem deixar como voltar seria esconder a funcao pra sempre.

A mesa saiu de `flex: 0 0 380px` para `clamp(380px, 30vw, 560px)`, e as duas
caixas de oferta viraram `flex: 1 1 0` — antes elas ficavam minusculas enquanto
o log tomava a coluna.

### Doca de favoritos: a inversao que resolve o problema real

Com 11 contas, achar QUEM tem um item era abrir conta por conta no seletor de
origem e procurar na mochila. A doca inverte: voce marca o item uma vez (a ⭐ no
card) e ela passa a dizer **quem tem e quanto**, lendo o MESMO `inventariosContas`
que a grade ja usa — nenhuma leitura nova, nenhuma chamada extra.

Clicar no chip de um dono chama `irParaItemNaContaV2`: troca a conta de origem,
protege o destino de virar a mesma conta, preenche a busca com o nome do item,
rola ate ele e **pisca** a linha — sem o piscar, a lista rola e nao da pra saber
qual das linhas era o alvo.

### Responsivo: o defeito que so a previa mostrou

Renderizando em 784 px: com duas docas fixas + mesa em 30vw, as colunas de conta
sobravam com ~130 px e o conteudo **transbordava** (barra horizontal em cada
coluna, nome do item cortado). Tres correcoes:

1. `.v2trade-col` ganhou `min-width: 248px`;
2. a grade passou de `minmax(178px, 1fr)` para `minmax(min(178px, 100%), 1fr)` —
   o valor fixo exigia 178 px por coluna e era ele que estourava a largura;
3. abaixo de 1400 px de viewport as docas recolhem sozinhas: e melhor perder o
   log do que perder a leitura da mochila.

Caixa cresceu de `min(1480px, 97vw)` para `min(1760px, 98vw)` — cinco faixas nao
cabem em 1480.

### Suite `testes/verifica_trade_docas.js`

16 asercoes. Alem da ordem das faixas e da logica de "quem tem o item"
(maiuscula/minuscula, entradas repetidas na mesma conta, conta sem inventario),
ela varre **todo `onclick` do modal** e exige que a funcao exista no bundle —
`onclick` apontando pra funcao inexistente so falha em runtime, no clique.


## [2026-09-02] O lag e INTERMITENTE: o diagnostico virou caixa-preta

O primeiro diagnostico voltou conclusivo, mas pelo lado negativo: as **11 contas
a 16,7 ms** (exatamente 1000/60) com `alivio` **0**. Ninguem perdendo quadro, o
jogo folgado em todas. **O gargalo nao esta nos renderers do jogo.**

Ai o usuario esclareceu: *"so acontece de vez em quando, agora ta suave"*. Isso
invalida a FERRAMENTA, nao a medicao — um RETRATO tirado num bom momento sempre
vai dizer que esta tudo bem. Problema intermitente pede GRAVADOR.

`shell/49-diagnostico-desempenho.js` agora:

- mede o **shell** (o que faltava, e onde o clique cai): deltas de rAF da janela
  do cliente, `PerformanceObserver` de longtask, e heap;
- **grava a sessao inteira** (400 tarefas longas, 200 quadros ruins) em vez de
  olhar so os ultimos 60 s;
- guarda o **contexto de cada pico** — hora, aba ativa, se estava em Grid, e se
  o pico caiu DURANTE a varredura de contas. Sem contexto o relatorio diz
  "travou 300 ms" e nao da pra saber por que, que e exatamente onde eu ja errei
  duas vezes nesta base;
- lista **os piores momentos da sessao**, que e o que responde "de vez em quando";
- varre as contas **em paralelo**: eram 11 esperas em serie, ~13 ms cada = 145 ms
  de varredura. Cada chamada espera uma brecha no quadro DAQUELA conta, nao do
  shell, entao podem correr juntas — passa a custar o pior caso, nao a soma.

**Por que a mediana nao servia:** tres travadas de 300 ms em dez minutos nao
mexem na mediana e sao exatamente o que se sente. Por isso o registro agora e
por pico, com hora.

## [2026-09-02] Doca de Hunts: sprite, drops, XP medido e caçar ao chegar

**Sprite e drops** saem de `zone.pokemon[]`: o sprite pelo nome (caminho
relativo, resolve dentro da pagina do jogo) e os drops de `loot[]`/`stones[]`,
com as pedras destacadas — sao elas que se caça de proposito.

**XP: o motor estava no lugar errado.** Procurei a formula de dano/XP e ela nao
existe no cliente. Mas `state.hunt` ja traz a contabilidade do proprio servidor:

    { secs, xp, pxp, kills, catches, balls, loot[{name,count,gold}] }

No state real: 822.975.638 XP em 45.140 s = **65,6M XP/h, 1.104 kills/h,
59.476 XP por kill**. O amostrador trocou `player.xp` (que zerava ao subir de
nivel e obrigava a tratar o caso) por deltas de `hunt.xp` / `hunt.kills` por
zona — e de quebra passou a dar **XP por kill**, que e o que permite projetar as
zonas ainda nao caçadas. A projecao aparece com selo mais fraco que a medida, de
proposito: as duas nao valem o mesmo, e o tooltip diz as duas suposicoes.

**Caçar ao chegar** (chip ligado por padrao): entrar numa hunt e parar olhando
nao serve pra nada. Usa `setAuto { hunt: true }`, a MESMA chave do Auto-Helper
(`flag: "hunt"` em app-1.js) — nao um clique simulado no checkbox, que
dependeria do painel estar aberto e do rotulo nao mudar de nome. Espera 700 ms
depois do `selectZone`: o teleporte ainda esta assentando quando a chamada
volta, e ligar antes faria o robo comecar caçando na zona ANTIGA.


## [2026-09-02] Desempenho: I/O sincrono no main, IPC triplicado, e duas conclusoes minhas erradas

### Antes de tudo: eu errei o diagnostico duas vezes

Vale registrar, porque as duas afirmacoes chegaram a entrar neste arquivo:

1. Escrevi que `docaAncorarTodas` chamava `getBoundingClientRect` com as docas
   fechadas. **Nao chamava** — a funcao ja faz `if (d.el.classList.contains('on'))`.
2. Escrevi que os 5 timers de 400 ms rodavam em TODA conta. **Nao rodam** — o
   espelho do painel v2 so liga em `abrirPainelV2()` e desliga em
   `fecharPainelV2()`, ou seja, uma conta por vez.

Nos dois casos eu afirmei sem ler a funcao. Por isso agora existe
`shell/49-diagnostico-desempenho.js`, que **le o `window.pmiFps()`** que o jogo
ja expoe (game.js:3151) em cada conta: tempo de quadro, FPS, `alivio` (o degrau
de auto-degradacao de efeitos do proprio jogo, 0 a 2), tamanho dos caches de
sprite, nos de DOM e o ida-e-volta do IPC. Entrada "Diagnostico de Desempenho"
no Game Tools; copia o relatorio pra area de transferencia.

### O que estava realmente caro (medido)

| # | problema | antes | agora |
|---|---|---|---|
| 1 | 3 `executeJavaScript` por conta a cada 3,5 s | 9,4 travessias/s | **3,1/s** (um lote so) |
| 2 | `fetch /api/state` do auto-nick (regressao minha) | 3,1 req/s pra sempre | **0/s** (so aba "Conta N") |
| 3 | `console.log` por tick do TabPoke | 3,1 linhas/s → 3,4 MB | **0** |
| 4 | **`fs.appendFileSync` no processo PRINCIPAL** | 1 escrita sincrona por linha | buffer + append assincrono |

O item 4 e o mais grave e o menos obvio: `registrarLogDebug` gravava com
**`appendFileSync`**, e `console.log` do main esta interceptado por ele. O main
e quem coordena as 11 webviews — escrita sincrona em disco **bloqueia o event
loop dele** a cada linha. Os handlers `autohunt-log` e o do ginasio faziam o
mesmo, e esses disparam por evento do jogo nas 11 contas.

Agora: buffer em memoria, flush assincrono a cada 2 s (ou 200 linhas), rotacao
em 5 MB guardando um `.1`. A unica escrita sincrona que sobrou e no
`before-quit`, onde ela e a coisa certa — o processo morre antes do flush.

### O que NAO da pra cortar, e por que

`renderFrame` (game.js:3162) **nao e so desenho**: e dentro dele que rodam o
teleporte (`K.tpTo`), o carregamento de mundo (`initWorld`) e o passo do
jogador. Estrangular o `requestAnimationFrame` das contas de fundo cortaria a
caçada junto — exatamente o que nao pode acontecer.

Por isso **nada aqui toca `backgroundThrottling`**. Continuam de pe: os switches
de linha de comando (`disable-background-timer-throttling`,
`disable-backgrounding-occluded-windows`), `backgroundThrottling:false` nas
webPreferences, `setBackgroundThrottling(false)` por webContents reaplicado a
cada reload, e `manterWebviewAcorda`. As 11 contas seguem rodando a todo vapor.
O que diminuiu foi o custo da SUITE de ficar perguntando e gravando, nao o do
jogo.

**Piso inevitavel:** 11 webviews rodando um jogo 2D com canvas, todas sem
throttling, e ~11× o custo de uma. O `alivio` do `pmiFps()` diz, por conta, se
o jogo ja esta cortando efeito pra dar conta — e o numero que separa "a suite
esta pesada" de "e a maquina que nao da conta de 11 jogos".


## [2026-09-02] Doca de Hunts nao aparecia, resgate automatico nao resgatava

Tres defeitos da doca, reportados por print:

1. **So abria por Game Tools.** O lugar onde ela e util e do lado da tela de
   Hunts, entao e ali que tem que aparecer sozinha. Agora um `MutationObserver`
   em `#modal-body` procura o `.hnt-root` (a classe que o proprio jogo poe ao
   montar a tela de Hunts) e abre/fecha a doca junto. Fechar no X com a tela
   aberta e respeitado ate ela ser reaberta.
2. **`docaEsconderTodas()` do painel v2 apagava a doca.** Ela se ancora no modal
   do JOGO, nao no painel do Idle Suite — nao tinha por que sumir junto. Nova
   flag `independente` em `docaCriar` isenta essas docas.
3. **Sem ancora com largura, ficava sem posicao.** `docaAncorar` fazia `return`
   seco quando o elemento-ancora estava fechado; a doca ia parar no canto
   superior esquerdo, por cima do jogo. Agora encosta na borda da janela do lado
   dela — lugar previsivel em vez de nenhum lugar.

### O resgate automatico nao resgatava, e olhava so 1 dos 4 sistemas

Com o toggle ON o Gift Center seguia mostrando "Resgatar tudo". Causa: eu usava
`mailOp` com `op:read` como sonda, mas `read` exige um `id` (marca UMA mensagem
como lida). Sem id nao volta contador, `pend` ficava 0 e o `claimAll` nunca era
chamado. A sonda certa e `GET /api/mail?token=`, que devolve `list` e `counts`.

Levantei os quatro sistemas de recompensa que expiram sozinhos:

| sistema | leitura | resgate |
|---|---|---|
| Caixa de correio | `GET /api/mail` | `mailOp` com `op:claimAll` |
| Moon Pass — missoes | `moonOpen` | `moonClaimMission` com `chainId, step` |
| Moon Pass — tiers | `moonOpen` | `moonClaimTier` com `track, tier` |
| Quests de NPC | `GET /api/tasks` | `claimQuest` com `id` |

Ordem: Moon Pass primeiro, correio por ultimo — as recompensas de tier **caem na
caixa de correio**, entao a mesma passada recolhe o que o passe acabou de mandar.

**Duas coisas que o automatico nao faz, de proposito:** `moonBuyTrack` (COMPRA a
trilha com diamante) e tier `kind:outfitChoice` (o jogo pede pra voce escolher um
outfit entre varios — escolher no seu lugar e irreversivel). Os de escolha sao
contados e mostrados no card.

### Desempenho: uma regressao minha, medida

Com 11 contas o loop de ping faz **3 `executeJavaScript` por conta a cada 3,5 s
= 9,4/s**. Ao consertar o auto-nick nesta mesma rodada eu troquei leitura de
globais (de graca) por `fetch` do `/api/state` — e isso virou **~3,1 requisicoes
HTTP por segundo, para sempre**, inclusive em abas que ja tinham nome e nunca
mais seriam renomeadas.

Portao de custo: a checagem cara so roda enquanto o nome ainda e o padrao
("Conta N"). Com todas as abas nomeadas, cai pra **0/s**.

**Ainda em aberto (medido, nao corrigido):** 5 timers de 400 ms rodam dentro de
CADA conta — `09b docaAncorarTodas`, `34 sincronizar`, `35 docaInvTick`,
`36 docaEqTick`, `37b espelho`. Com 11 contas sao **55 timers e ~138
callbacks/s**, e `docaAncorarTodas` chama `getBoundingClientRect` (forca layout)
mesmo com todas as docas fechadas. O `debug-console.log` tambem esta em 3,4 MB e
e alimentado por IPC a cada evento.


## [2026-09-02] Doca de Hunts — `scripts/37f-doca-hunts.js`

Pedido: um dock lateral com as hunts pra **favoritar em vez de digitar**, que
detecte o nível do jogador, sugira onde fazer XP para o tipo do Pokémon ativo
e diga a quais mapas há acesso.

### De onde vem cada número

| dado | fonte | exatidão |
|---|---|---|
| lista de 650 hunts | `/api/meta` → `zones` (sem `city`) | exata |
| acesso | regra do jogo, lida de `app-1.js` (função `C`) | exata |
| nível do selvagem | `zone.reqLevel` | exata, **medida** (ver abaixo) |
| vantagem de tipo | `multDanoAtkVsDef` / `multDanoRecebido` (scripts/26) | mesma tabela do Auto Hunt |
| XP/h | **medido no seu jogo**, por zona | só aparece com ≥ 1 min de amostra |

**Acesso**, transcrito do jogo:

```
reqLevel >= 200 ? nivel >= reqLevel : nivel >= reqLevel - 20
```

Abaixo de 200 há desconto de 20 níveis; de 200 pra cima, não há. É o mesmo
critério do botão "Só onde posso entrar". Conferido: nível 373 → 572 de 650
liberadas.

### O erro de medição que a própria prévia denunciou

A primeira versão cruzava `world/spawns.json` **pelo nome do Pokémon** pra achar
o nível do selvagem. Cruzava em 650/650 e parecia certo — até a prévia mostrar
"Área de Snivy — Lv 1–900": o cruzamento por nome pega o bicho no **mundo
inteiro**, e existe Snivy de nível 900 em outro canto do mapa.

A correção foi casar por **posição**: `zone.spawnPoints[]` traz `{dx, dy}`,
offsets do centro da zona; casando `(cx+dx, cy+dy, z)` com `spawns.json` casam
**6.496 de 6.496 pontos, 100%**, nas 650 zonas.

E o casamento exato revelou o desfecho: **`reqLevel` é igual ao nível do
selvagem nas 650 zonas, sem exceção.** Ou seja, o cruzamento não acrescenta
nada e foi **removido** do módulo — `reqLevel` sozinho já é o nível do bicho,
exato e de graça, sem indexar 6.595 spawns em runtime.

⚠️ Uma anotação anterior deste arquivo dizia que "reqLevel diverge do nível do
selvagem em 282 das 650 zonas". **Isso era falso** — artefato do cruzamento por
nome, não um fato do jogo. A suite `verifica_doca_hunts.js` agora trava o fato
correto pra ninguém reintroduzir a heurística.

### XP/h é medido, nunca estimado

A fórmula de XP é do servidor e não está publicada em lugar nenhum do cliente
(`server.js` da raiz é um mock de teste: `player.xp += 25`). Qualquer "XP/h"
calculado aqui seria invencionice. Então `huntsAmostrarXp()` — pendurado no
mesmo tick que atualiza `ultimoStateGeral` (scripts/26) — acumula XP e tempo
**por zona** enquanto você caça, e a lista passa a mostrar o **seu** XP/h real
naquela zona. Sem histórico, o card mostra nível e vantagem, e o rodapé diz que
o número aparece depois de ~1 min caçando.

**Bug pego antes de ligar:** a primeira versão reescrevia a linha de base a cada
chamada. Como o tick é ~400 ms e a janela mínima é 3 s, o `dt` nunca chegaria a
3 e o medidor ficaria **eternamente em "sem medida"**. Agora a base só avança
quando é consumida, ou quando deixou de servir (mudou zona/nível, ou a janela
passou de 120 s — aba parada não vira "tempo caçando"). A suite simula 90 s de
caçada a 100 XP/s e exige 360k XP/h de volta.

### Por que isto não repete o erro do 14d

`14d-sugestoes-hunt.js` registra que uma versão antiga sugeria zona a partir da
ficha do Pokémon e foi descartada: o bicho da ficha é quase sempre um Lv.1 da
box, e mandar ele pra zona 400 é conselho impossível de seguir. Aqui a sugestão
sai do **Pokémon ativo** e do **seu nível de treinador**, e zona sem acesso
aparece marcada com cadeado. É a diferença entre "seria bom" e "dá pra fazer
agora".

### Interface

Doca (`docaCriar`, scripts/09b) ancorada à direita do painel. Cabeçalho com
nível, Pokémon ativo e tipos, mais "N de 650 hunts liberadas". Busca por hunt ou
Pokémon; filtros ★ Favoritos / ✅ Posso entrar / ⚔️ Vantagem; ordem ⭐ Recomendado
/ Nível ↓ / Nome. Favorito sobe pro topo sempre. Clicar no card **entra na zona**
(`selecionarZonaConfirmada`, scripts/26) — que é o ponto do pedido: não digitar.

Nota de recomendação = XP/h medido quando existe, senão nível normalizado (×0,85,
porque medido vale mais que proxy), ×1,35 se você bate 2×, ×0,72 se apanha 2×.
Sem acesso vai pro fundo.

Entrada `isuite-hunts` no Game Tools; ponte `__alternarDocaHunts` em shell/02.


## [2026-09-02] Registro único de atalhos, reordenação de abas, aba Custo e correio

Quatro frentes numa rodada só. Ordem aqui = ordem em que foram feitas.

### 1. `MENU_ITEMS` vira fonte única dos dois dropdowns

Cada ferramenta era declarada **três vezes**: em `MENU_ITEMS` (shell/04), na
marcação escrita à mão do `index.html` (repetindo ícone, rótulo, ação e o
`toggleFixarMenu('id')`) e no atalho do `main.js`. Os IDs estavam sincronizados
(20/20), mas **3 de 20 rótulos já divergiam**: `isuite-debug` era "Scripts: Debug
Logs" aqui e "Copiar Logs de Debug" lá; `recarregar-todas` e `avaliador-meta-v2`
idem.

Agora `renderizarMenusDeFerramentas()` desenha as linhas dos dois dropdowns a
partir do registro. O `index.html` guarda só a moldura (seletores de zoom e de
colunas do Grid) e dois containers vazios: `#menu-itens-geral` e
`#menu-itens-gametools`. Campos novos por entrada: `menu` (`geral`/`gametools`),
`grupo` (vira cabeçalho de seção quando muda), `desc` (tooltip), `hotkey` (chip
ao lado do rótulo), `btnId`/`iconId`/`labelId` (para quem repinta ao vivo) e
`badgeHtml`. **Adicionar ferramenta = uma entrada.**

Cuidados que o renderizador precisa ter, e tem:
- Três linhas têm ícone/rótulo que mudam com o estado (áudio, Grid, XP). Como o
  `innerHTML` recria esses elementos, eles voltam com o valor estático do
  registro — por isso `renderizarEstadoAudio()`, `atualizarBadgeXpTrackerMenu()`
  e o rótulo do Grid são repintados no fim de cada render.
- No bootstrap, o render vem **antes** de `renderizarEstadoAudio()`: é ele quem
  cria `#menu-audio-icon`/`#menu-audio-text`.
- As cercas `@client:off` migraram para dentro do registro. Verificado: o recorte
  do cliente continua sintaticamente válido e com zero entradas `isuite-*`.

### 2. Reordenar abas só trocava o nome

Reportado como "tento ordenar e parece que só acontece a troca do nome da aba".
`reordenarContas()` reordenava `nomesAbas`, `listaProxies` e `listaCredenciais` e
mais nada. A **conta** de verdade é o `<webview>`, cujo `partition` era derivado
do índice (`persist:acc${i+1}`) e é **imutável depois que o elemento é anexado**.
Os rótulos trocavam de lugar e as sessões ficavam paradas.

Três mudanças:

1. **A partição virou dado** (`listaParticoes`, shell/10, persistida em
   `idlePokemonTabPartitions`) e viaja junto com nome, proxy e credencial.
   `particaoLivre()` dá a menor `accN` não usada — abrir e fechar contas não
   pode fazer duas posições apontarem para a mesma sessão.
2. **Os elementos ficam onde estão e são renumerados.** Mover um `<webview>` no
   DOM faria o Chromium desanexar e reanexar o guest, ou seja **recarregar o jogo
   de todas as contas a cada arrasto**. Renumerar o `id` basta porque tudo aqui
   acha a webview por `getElementById('wv-N')`, e a ordem visual do Grid sai da
   propriedade `order` do CSS (no modo Abas nem importa: os wrappers são
   `position:absolute` empilhados, só o `.active` aparece). A renumeração é em
   **duas passadas** — na primeira os ids saem do caminho, senão a segunda
   colide.
3. **`conectarEventosWebview` deixou de capturar o índice no closure.** 36 usos de
   `index` viraram `idxAtual()`, que lê `webviews.indexOf(wv)` na hora. Sem isso
   os eventos passariam a falar da conta errada depois da primeira reordenação —
   log da conta errada, reconexão na conta errada, script injetado na errada.

Também viajam os caches indexados (`inventariosContas`, `pokemonAtivoCache`,
`_injetadoPorConta`) e as cores fixadas das abas.

**Bug irmão corrigido de passagem:** `removerAba(index)` cortava os dados em
`index` mas apagava sempre o **último** wrapper (`wrap-${totalContas}`) — fechar
uma conta do meio deixava dados e sessões desencontrados, o mesmo desalinhamento.

**Arrasto:** o alvo era a aba inteira e o destino sempre o índice dela, sem
"antes/depois"; arrastar para baixo largava a conta uma posição acima do
esperado. Agora a metade do botão sob o cursor decide o lado, a linha de
inserção aparece do lado certo, e o destino desconta o `splice` da origem.
Além disso o modal de gerenciar conta ganhou **↑ Subir / ↓ Descer**, que é o
caminho previsível com 11 contas empilhadas.

Suite `testes/verifica_reordenar_contas.js`: 18 asserções nos dois sentidos,
incluindo "o id `wv-N` aponta para a sessão certa" e "a árvore não mudou".

### 3. Aba **Custo** — `scripts/37d-aba-custo-captura.js`

Custo de captura medido, não estimado. Fontes que ninguém lia:

| fonte | o que dá |
|---|---|
| `/api/ballmanager?token=` | lista **completa** de bolas jogadas por espécie e por tipo (`state.brokes` é só o topo dessa lista) |
| `/api/globalcaps` | capturas e shinies do servidor inteiro |
| `/api/meta` → `balls[]` | preço real de cada bola |

Medido no state real: **$43,43M só em Bulbasaur** (542.910 bolas), $59,5M no topo
da lista, e a taxa de shiny do servidor é **1 em 78.733** (18 em 1.417.196).

Dois cuidados de honestidade:
- `BALL_PRICES` (scripts/24) é tabela fixa e **já divergiu** do servidor
  (pokeball 20 × 15, premier 150 × 0, master 1000 de ouro × 999 de **diamante**).
  A aba busca do `/api/meta`; a tabela fixa só entra se a rede falhar.
- O jogo **não guarda capturas por espécie** — só bolas jogadas e um `caught`
  booleano. O divisor de "ouro por cópia" é quantas cópias você tem agora
  (box + equipe), que é um **piso**; logo o valor é um **teto**, e a coluna diz
  isso. Não inventamos exatidão onde ela não existe.

### 4. Correio automático e os 3 toggles que faltavam — `scripts/37e-correio-e-toggles.js`

O jogo entrega prêmio de ranking, loot de boss e presente por correio; a suíte
só via o aviso em `state.notes` e o item ficava parado. A operação existe:
`POST /api/action {action:'mailOp', op:'claimAll'}` (ops: `claim`, `claimAll`,
`read`, `delete`, `clearRead`). O laço sonda com `read` (a operação mais barata
que ainda devolve `mail.counts`) e só chama `claimAll` quando `pend > 0`.

O Auto-Helper do jogo tem **nove** chaves; `CHAVES_SERVIDOR` (scripts/19) cobria
seis. Entraram `potionOn` (cura automática), `catchShiny` e `fish` (a pesca
inteira: nível, XP, iscas). O estado desses três vem do servidor
(`state.auto`) — não guardamos cópia local, porque mostrar "ligado" no que o
servidor considera desligado é pior que não ter o botão.

### Pontos de extensão novos no painel v2 (`scripts/37b`)

O arquivo tem 200 KB; obrigar toda aba nova a nascer lá dentro só aumenta o
monolito. Dois registros, lidos **na hora de montar** o painel (então a ordem de
carga dos módulos não importa):

- `window.__ABAS_EXTRA_V2` — `{ id, label, html(), montar(pane), aoAbrir(pane) }`
- `window.__CARDS_EXTRA_V2` — `{ id, pane, html(), montar(pane) }` para colocar
  um bloco dentro de uma aba nativa (a Config, tipicamente)

`aoAbrir` é o gate de dado caro: a aba Custo faz três chamadas de rede e só as
faz quando a aba aparece.


## [2026-09-02] Central de Trade v2 — sprites reais do jogo, dono do item e o card cortado

Quatro queixas do usuário sobre a tela, com a causa de cada uma:

### 1. "O card cortado"

A faixa do pokémon ativo (`.v2trade-ativo`) aparecia com o texto decapitado.
`.v2trade-col` é um flex column e **todo filho nasce com `flex-shrink: 1`** —
quando o conteúdo passava da altura, o navegador comprimia os blocos de altura
fixa, e como `.v2trade-ativo` tem `overflow: hidden`, a compressão virava corte.
Agora toda a "moldura" da coluna (cabeçalho, stats, faixa do ativo, títulos de
seção, barra de donos, categorias, busca, filtros, nota do destino e a linha de
Gold) tem `flex-shrink: 0`.

### 2. "A bag é confusa de explorar"

Duas causas:

- **Três barras de rolagem empilhadas na mesma coluna**: a coluna rolava por
  fora *e* cada lista tinha `max-height: clamp(180px, 27vh, 420px)` com rolagem
  própria. Agora as duas listas são `flex: 1 1 0` e repartem a altura que sobra;
  a coluna só rola como válvula, se nem a moldura couber.
- **Ordenação alfabética fixa**: numa mochila de 300 linhas isso enterra os
  estoques grandes (o que se quer mover) no meio de 73 berries. O padrão passou
  a ser **quantidade decrescente**, com seletor Quantidade / Nome / Categoria
  (`tradeOrdemItensV2`, persistido).

Grade também saiu de `repeat(2, 1fr)` fixo para `repeat(auto-fill, minmax(178px,
1fr))` — acompanha a largura da coluna em vez de forcar duas colunas sempre.

### 3. "Não sei de quem é aquele item" (modo Todas as Contas)

O dado **já era calculado** (`it.contas`), mas era despejado como texto
`"C1: 120 · C3: 40"` dentro de `.v2trade-item-det`, que dividia espaço com as
tags e tinha `white-space: nowrap` + `text-overflow: ellipsis` — na prática
sumia no primeiro dono. Agora cada conta é um chip (`.v2trade-dono-chip`),
ordenado por quantidade, com o nome do treinador no `title`.

### 4. "Sincronizar as imagens originais do jogo" — `shell/48-sprites-itens-jogo.js`

Até aqui o ícone saia de `obterIconeItem()` (shell/25): emoji escolhido por
substring. As 73 berries caiam todas no 🎒 genérico.

Como o jogo resolve o sprite (`app-1.js`, funções `Yo`/`Jo`):

| fonte | conteúdo |
|---|---|
| `sprites/icons.json` | nome → cid, em 4 grupos: `loot` (360), `balls`, `potions`, `misc` |
| `/api/meta` | `tms[].spriteCid` (por `itemKey`), `heldItems[].cid`, `stones[].itemId`, `balls[].itemId` |
| imagem | `sprites/item_<cid>.png?v=walk1` |

Três detalhes que o módulo trata e que quebrariam uma implementação ingênua:

1. **Acentuação.** As chaves do `icons.json` são sem acento (`"berry critica"`,
   `"berry de aco"`) e a mochila devolve acentuado. Alguns nomes do `/api/meta`
   ainda vêm com `\n` no meio (`"heart\nstone"`). Daí `normalizarNomeItem()`
   (minúsculo + NFD sem diacríticos + espaços colapsados). Medido: **24/24** dos
   nomes tirados do print do usuário resolvem.
2. **Colisão balls × potions.** Os dois grupos usam as MESMAS chaves
   (`ultra`, `great`, `hyper`). Achatar num mapa só fazia o último vencer e a
   **Ultra Ball aparecia com o frasco da Ultra Potion** (23855 virava 25224).
   Cada grupo entra com seu sufixo (`" ball"` / `" potion"`), que é como o item
   aparece na mochila, e a chave nua entra depois só se estiver livre — é o que
   mantém `"Revive"` (que não vira "revive potion") funcionando.
3. **Folha de sprites.** `item_23829.png` (pokeball) é 128×64: 4 fases × 2
   direções. O jogo desenha só o primeiro quadro 32×32. Por isso o CSS recorta
   (`.game-item-sprite-crop`, 32×32 com `overflow: hidden`, imagem ancorada em
   0,0) e escala a caixa por `transform` — esticar por `width` mostraria
   pedaços dos quadros vizinhos.

O JSON é buscado **de dentro de uma webview** (`executeJavaScript`, mesmo padrão
de `carregarInventariosTradeHub`): a shell roda noutra origem e um `fetch` direto
morreria no CORS. O mapa fica em `localStorage` (TTL 1 dia) porque muda raramente
e o desenho não pode depender de ter conta logada naquele instante. Sem mapa, o
render **cai no emoji antigo** — nenhum item fica sem ícone.

Ícone passou de ~13px (emoji) para **34px** no modo card e 26px na lista; nome e
quantidade foram empilhados ao lado do sprite (`.v2trade-item-idw`) porque com
tudo na mesma linha o sprite maior espremia o nome até sobrar `"berry de…"`.

**Cliente:** `48` NÃO foi para a allowlist de `build_client.py` — o `42`
(Central de Trade) também não está lá, então o módulo não tem consumidor no
cliente. Se o Trade entrar um dia, `48` tem que entrar junto.


## [2026-09-02] 3 bugs das abas de conta do shell Electron (destaque, login, nick)

Reportados pelo usuário: "não dá pra ver qual aba está selecionada", "aba nova
já vem com o login preenchido e não deixa apagar", "aba nova não renomeia com o
nome do personagem".

### 1. Aba ativa indistinguível — duas causas somadas

- **CSS**: `.tab-btn.active` pintava fundo com alpha 0,18 e borda 0,5, mas
  `.tab-btn::after` (css/07) jogava por cima um gradiente da COR DA CONTA que na
  ativa subia pra 32% — ou seja, o próprio sinal de seleção ficava coberto pelo
  lavado colorido. Pior: `.tab-btn:hover` usava a MESMA borda esmeralda da ativa,
  então passar o mouse em qualquer aba dava a leitura de "esta é a ativa".
  Agora: hover só vale em `:not(.active)` e com borda neutra; a ativa ganha fundo
  0,34, borda cheia `rgba(52,211,153,.85)`, glow, `translateX(3px)` fixo, título
  em branco 800 e segunda linha em `#a7f3d0`; o wash da cor da conta CAI na ativa
  (32% → 14%) e a identidade da conta migra pra faixa lateral, que engorda de 5px
  pra 7px e ganha `box-shadow` da própria cor.
  Arquivos: `css/02-sidebar-lateral.css`, `css/07-modal-renomear-aba.css`.

- **JS**: em `selectTab` (`shell/20`) a pintura do `.active` nos botões da
  sidebar morava DENTRO do `else` do modo Abas. No modo Grid ela nunca rodava —
  a sidebar ficava com o `.active` congelado na última aba usada antes de entrar
  no grid. A pintura subiu pra fora do `if/else` e vale nos dois modos.

### 2. Login/cadastro pré-preenchido e "voltando" ao apagar

`injetarAutoLogin` (`shell/19`) tinha três defeitos independentes:

| defeito | causa exata | correção |
|---|---|---|
| aba nova já nascia preenchida | `localStorage.getItem('idle_saved_user') || "<nome da aba>"` — sem credencial salva ele escrevia "Conta 5" no campo | fallback removido; sem credencial salva, campo vazio |
| apagar não adiantava, o texto voltava | `setInterval(instalarLembrarLogin, 800)` reexecutava o fill pra sempre e a única guarda era `!uInput.value` — assim que o campo esvaziava, o próximo tick reescrevia | fill roda UMA vez por carga de página; `input`/`keydown`/`paste`/`cut` marcam o form como "tocado" e travam o fill; o interval agora só espera o form existir e se auto-encerra (`clearInterval`) |
| preenchia também o CADASTRO | o jogo reaproveita os MESMOS inputs `#li-name`/`#li-pass` nas duas abas — só troca `.active` entre `#li-tab-login` e `#li-tab-register` e revela `#li-pass2`; o fill não olhava isso | `modoCadastro()` checa `#li-tab-register.active` / `#li-pass2` visível; em cadastro não preenche, e clicar em "Criar conta" limpa o que o fill tinha posto |

Foi incluída também uma **limpeza da partição já contaminada**: a versão antiga
chegava a SALVAR `"Conta N"` como usuário (bastava dar Enter com o campo
pré-preenchido), então o script agora remove `idle_saved_user` quando ele casa
com `/^Conta\s*\d+$/i`. Sem isso o bug sobreviveria à correção nas contas
antigas.

### 3. Aba não renomeava com o nome do personagem

`checarNomePersonagemWebview` (`shell/19`) só tentava globais da página
(`K.player.name`, `gameState...`) e o seletor `#stat-jog-name` — que **não existe
no jogo** (0 ocorrências em `play.html`, `index.html`, `app-1.js`, `game.js`).
Como os globais são invisíveis quando o `executeJavaScript` cai em mundo isolado,
na prática quase sempre voltava `null`.

Nova cadeia de fontes, em ordem: `window.__obterDashboardStatus().player.trainer`
(ponte do próprio Idle Suite, `scripts/37c`) → globais `K`/`S`/`gameState` →
**`GET /api/state?token=...` → `state.player.name`** (a mesma fonte que o Idle
Suite usa; o token sai de `sessionStorage.pmi_tab_token` / `localStorage.pmi_token`,
legíveis em qualquer mundo) → DOM `#pp-name` (o id que existe de verdade).
A renomeação continua só sobrescrevendo nome padrão (`/^Conta\s*\d+$/`), agora
também atualiza `listaCredenciais[i].user` e emite toast.

**Cuidado de manutenção:** todo esse código vive dentro de template literals que
vão pro `executeJavaScript`. `\s`, `\d` e `\u{...}` precisam de barra DUPLA na
fonte — com barra simples o JS come o escape ao montar a string e a regex chega
quebrada na webview.


## [2026-08-31] Auditoria do Avaliador de Metas contra o código do jogo

Comparado com `F:\idle-pokemon\idlepokemoon.com.br` (`api/state*.html`,
`api/tiers.html`, `app-1.js`, `game.js`). O jogo entrega por Pokémon três eixos
de qualidade INDEPENDENTES, e o resultado já calculado:

| campo | o que é | onde confirmei |
|---|---|---|
| `iv` 0..2.5 | multiplicador de raridade, rolado na captura | `api/tiers.html` (`ivMax: 2.5`, faixas Fraca→Mítica) |
| `growth{}` / `growthTotal` /192 | o que o jogo chama de "IV (Growth)", 6 stats × `growthMax` 32 | `api/state`, `trTipHtml` em game.js |
| `tier` S/A/B/C | poder da ESPÉCIE | `tierTagHTML` em app-1.js: "poder da espécie medido no alvo neutro" |
| `power`, `dps` | resultado pronto | `api/state` (vêm até no card leve da box) |

### O que estava errado

1. **A nota ignorava o `iv`** — o eixo que mais mexe no poder. Regressão nos 56
   Bulbasaur Lv.1 do state real: `power ≈ -43,6 + 91,56·iv + 0,0797·growthTotal`
   (erro médio 1,0 sobre power ~135). A faixa de iv observada movia o power em
   25 pontos; a faixa inteira de growth, em 4,8.
2. **Correlação de postos da nota antiga com o `power` do jogo: −0,109** — em
   56 cópias da mesma espécie e mesmo nível, onde `power` é a verdade absoluta.
   Pior que sorteio. Com a nota nova (75% IV + 25% growth): **+0,87**.
3. **Tier inventado.** A escala do jogo é S/A/B/C e é da ESPÉCIE. A nossa criava
   "S+" (que não existe) e derivava S/A/B/C do próprio score, então a mesma
   palavra significava duas coisas diferentes na mesma tela.
4. **`power` e `dps` eram ignorados** mesmo vindo prontos. Efeito medido: a nota
   antiga colocava um Bulbasaur Lv.1 de 30 DPS em 2º lugar geral, à frente de um
   Chandelure Lv.220 de 23.871 DPS (que ela pontuava 60).
5. **Saturação**: `Math.min(100, growth + 8 shiny + 10 lendário + 8 boost + 6
   meta)` grudava vários Pokémon distintos em 100% justo no topo do ranking.
6. **Bônus de boost mal escalado**: `Math.min(8, boost)` com boost indo de 0 a
   `boostMax` 100 — boost 8 valia igual a boost 100.
7. **Campos lidos com o nome errado** em `shell/25`: `nature` (o campo é `nat`,
   objeto) e `type`/`types` (são `type1`/`type2`) vinham sempre vazios; `exp`/
   `maxExp` não existem (são `xp`/`xpNext`).
8. **Moveset**: `META_POKEMON_DB` cobre 15 de 151+ espécies; o resto caía num
   placeholder fixo. O jogo manda o moveset recomendado em `wm` (só no card
   cheio — a box vem leve, ver `CARD_LIGHT_OMIT`/`lightenCard`).

### O que mudou

- `shell/25`: passa a coletar `tier`, `wm`, `nat`, `hab`, `type1/type2`,
  `speed`, `boostMax`, `held*`, `growthPct`, `xp/xpNext`.
- `shell/32`: nota nova (`calcularFichaPoke`) = **Ficha**, independente de nível,
  só com o que é rolado na captura (`PESO_IV` 0,75 / `PESO_GROWTH` 0,25, knob
  único e comentado com a curva de calibração). Tier passa a ser o do jogo.
  Novo `rankDps`. `montarMetaGenerica()` usa `wm` no lugar do placeholder.
- `shell/33`: ordenações novas por **DPS**, **Power**, **IV** e **Growth**
  (a antiga "IVs ↓" ordenava por growthTotal, apesar do rótulo). Filtro `s_plus`
  vira alias de `s`.
- `shell/34` + `css/41`: card mostra tier da espécie e Ficha separados, mais uma
  faixa de métricas cruas do jogo (⚡DPS · 💪Power · 🎲raridade ×iv · 🚀boost).

**Limite conhecido:** o ótimo medido em Lv.1 é ~90% IV, mas em nível alto o
growth vira ~40% dos stats (Venusaur Lv.409: `growthBonus.def` 688 de 1745) e
não há no state amostra de cópias variadas em nível alto pra medir esse extremo.
Os 75/25 são um meio-termo deliberado. Para comparar cópias do MESMO nível de
forma exata, ordene por **Power** — é número do jogo e não passa por peso nenhum.


## [2026-08-31] Rodada 2 — Grid (4 colunas + zoom) e Avaliador Meta v2 (rank/IVs)

### Grid: o zoom não voltava a 100% — segundo crash na mesma função

A rodada anterior corrigiu um `ReferenceError` em `selZoom` no ramo de saída do
`toggleGridMode()`, mas o zoom continuou preso. Causa: **um segundo throw, três
linhas antes**. O ramo de saída fazia

```js
btnGrid.classList.remove('active');
gridTxt.textContent = 'Grid Multi-Contas';
gridIcon.textContent = '🪟';
```

**sem guarda de null**, enquanto o ramo de entrada guardava todas com `if (...)`.
Os IDs `btn-grid-toggle` / `grid-txt` / `grid-icon` são da topbar antiga e **não
existem mais no `index.html`** (confirmado por grep: 0 ocorrências; só existem os
`*-menu`). Então `btnGrid` era `null` e `null.classList` estourava `TypeError`
toda vez que se saía do Grid — matando `selectTab`, o reset de zoom e o
`notificarAjusteGrid` que vinham depois. As três linhas mortas foram removidas.

Zoom agora tem ponto único de verdade (`zoomAlvoAtual()` / `aplicarZoomAlvo()`),
é reaplicado 250ms depois do relayout e também a cada `selectTab` — se alguma
chamada se perder, trocar de aba conserta sozinho.

### Grid: 4 por linha, cards deitados, resto no scroll

`css/06`: `repeat(auto-fit, minmax(280px,1fr))` espremia 7-8 contas por linha em
tela larga. Agora é `repeat(var(--grid-cols), minmax(0,1fr))` com
`aspect-ratio: 16/10` no card — a altura da linha sai da largura da coluna, o
formato paisagem se mantém em qualquer tela e o que não couber vai pro scroll.
Novo seletor "🪟 Colunas do Grid" (2 a 6, padrão 4, persistido em
`idlePokemonGridCols`).

O zoom do Grid passou a acompanhar as colunas
(`GRID_ZOOM_POR_COLUNAS = {2:1.0, 3:0.85, 4:0.75, 5:0.62, 6:0.55}`) em vez de ser
uma constante. O seletor "Escala Visual" virou "Escala (Abas)" e vale só pro modo
Abas — antes os dois disputariam o zoom no Grid.

### Avaliador Meta v2: rank, growth por stat e modo lista de verdade

- `shell/32`: passou a guardar `growth` (objeto cru) e `growthMax`, e a calcular
  dois rankings — `rankGeral` (posição no acervo inteiro, por score, desempate
  growth → level) e `rankEspecie` (posição entre as cópias da mesma espécie, que
  é o número que decide o que vender).
- `shell/34`, `renderizarAvaliadorMetaV2`: card mostra chips de rank geral e de
  espécie, natureza, growth absoluto (`168/192`) além da %, e uma faixa de chips
  de growth por stat (HP/Atk/Def/SpA/SpD/Vel) coloridos pelo quão perto do teto
  (`pk.growthMax`) cada um está.
- `css/41`: coluna mínima de 230px → 300px (menos cards por linha, cada um
  legível). **Modo lista deixou de esconder growth/build** — os mesmos blocos
  viram colunas de uma linha densa (identidade | ranks | growth | stats | build |
  ações); só as moves somem. Abaixo de 1400px a linha quebra em duas em vez de
  espremer.


## [2026-08-31] 5 correções de UI reportadas por print (dashboard, grid, mini dashboard, avaliador)

1. **Dashboard Central sem ✕.** O botão "Fechar Dashboard" existia, mas era o
   último item de `.dash-toolbar-actions`, que quebra em várias linhas quando há
   muitas contas — ele saía do campo de visão. Agora há um `✕` ancorado no canto
   do header (`.dash-close-x`, `css/13`) e `Esc` fecha a Dashboard quando ela é a
   tela ativa (`shell/24`). `fecharDashboardCentral()` também deixou de jogar
   sempre na Conta 1: `selectTab` guarda a aba anterior em `abaAntesDaDashboard`.

2. **Grid vertical + zoom preso ao sair do Grid.**
   - `css/06`: `grid-auto-rows: minmax(220px, 1fr)` esticava cada linha até
     preencher a altura da tela → cards em retrato altos. Trocado por altura de
     linha fixa (`--grid-card-h: 188px`) menor que a largura mínima da coluna
     (`--grid-card-w: 300px`), o que dá cards deitados ~1.6:1 e menores.
   - `shell/20`, `toggleGridMode()`: o ramo de volta pro modo Abas lia
     `selZoom`, **variável que nunca foi declarada nesse escopo** (só existia
     como `const` local dentro do handler de `dom-ready`). A leitura estourava
     `ReferenceError` e matava as duas linhas seguintes — o reset de zoom e o
     `notificarAjusteGrid(false)`. Resultado: as abas voltavam com a escala do
     grid grudada. Agora o elemento é lido por `getElementById` e o zoom volta
     pro valor do seletor (100% quando está em "auto"). O zoom do grid virou a
     constante `GRID_ZOOM` (0.5, acompanhando os cards menores).

3. **Nenhum ETA em lugar nenhum (e todo card com "Nv ?" / 0).** Causa raiz:
   `window.__obterDashboardStatus` — a ponte que o shell consome via
   `executeJavaScript` pra montar a Dashboard 4x e o Mini Dashboard — existia no
   bundle monolítico antigo e **não foi trazida na quebra em `scripts/*.js`**. A
   chamada voltava `undefined` e o shell caía nos defaults. Reposta em
   `scripts/37c-dashboard-status-api.js`, agora expondo também `trainerEta` /
   `active.expEta` (XP que falta ÷ taxa de XP/s da caçada, mesma conta do XP
   Tracker da sidebar em `shell/21`).

4. **Mini Dashboard v2 virou A tela; v1 removida.** A v2 abria vazia porque
   `atualizarMiniDashboard()` começava com `if (!cardsEl || !miniDashAberto)
   return` — só populava os containers v2 na mesma passada da v1, então com a v1
   fechada não renderizava nada. Agora:
   - `shell/40-mini-dashboard.js` (era `40-mini-dashboard-v2.js`) é o
     controlador único da janela; nomes `...V2` viram apelidos em `window` pros
     itens fixados legados.
   - `shell/13` ficou só com coleta + render (layout `.md2-*`), com duas linhas
     novas de progresso + ETA por card (treinador e Pokémon ativo).
   - `css/16-mini-dashboard-contas-ativas.css` foi apagado; a única regra
     compartilhada que morava lá (`.menu-item-btn.active`) foi pra
     `css/16-estado-ativo-botoes-menu.css`, mantendo a posição na cascata.
   - `css/40-mini-dashboard.css`: classes `mini-dash-v2-*` → `mini-dash-*`.
   - `shell/04`: `MENU_ITEMS_LEGADO` migra pins salvos como `mini-dashboard-v2`.

5. **Avaliador Meta v2 maior.** `css/41`: `.v2eval-box` de
   `min(1180px, 94vw) × min(800px, 90vh)` para `min(1760px, 97vw) ×
   min(1120px, 95vh)`.


## [2026-08-30] Fase 1c — correção de bugs reais reportados no Electron de verdade

Usuário testou a Fase 1b (cards neutros) no Electron e reportou vários
problemas concretos, não só gosto de estilo:

1. **Painel continuava enorme** mesmo depois de eu já ter reduzido o
   tamanho em `07a`. Causa: o tamanho 1440×900 antigo estava **duplicado
   em mais 3 lugares** que eu não tinha visto — `07o-idle-suite-panel-behavior.js`
   (`NORMAL_W`/`NORMAL_H`, usado ao sair do modo dock), `10-ui-miniatura.js`
   (usado ao sair do modo miniatura) e `12-ui-recolher.js` (usado ao
   expandir de novo após recolher). Todos os 4 lugares agora usam
   1180×720. Confirmado por grep: zero ocorrências de `1440px`/`900px,
   calc(100vh` sobrando em `scripts/`.
2. **Painel de logs sumindo por completo** (usuário: "não tem log dos
   status que estão ocorrendo"). Causa raiz confirmada: a Fase 1b tinha
   colocado a coluna "Mochila | Logs" dentro de um `display:grid` com
   `grid-template-columns`, mas sem `grid-template-rows` — a row fica
   `auto` (altura pelo conteúdo), então o `flex:1;min-height:0` do
   `#p-content`/`#feed-drawer` (que dependem de RECEBER altura de um pai
   com altura definida) não tinha de onde puxar altura e colapsava perto
   de zero. Resolvido nesta rodada usando a mesma estrutura que já
   funcionava nas fases anteriores: `#p-content` de volta como filho
   direto do fluxo da Home (`display:flex;flex-direction:column`), sem
   grid intermediário.
3. **Sem foto do Pokémon** — a Fase 1b só tinha uma caixa cinza decorativa
   no lugar da imagem. Corrigido usando a MESMA fonte de sprite que
   `shell/30-dashboard-4x-command-center.js`, `shell/31-sala-trofeus-*.js`
   e `shell/34-painel-lateral-selecao.js` já usam com sucesso:
   `https://play.pokemonshowdown.com/sprites/gen5/{nome-limpo}.png` com
   fallback `onerror` pro sprite `substitute`. Como o painel do jogo
   (`scripts/07i`) não tinha esse padrão ainda (só existia no `shell/`),
   adicionei um pequeno poller de 1s em `07i` que lê o texto de
   `#p-poke-name` (já atualizado pelo motor) e troca a `src` do novo
   `#p-poke-sprite` só quando o nome muda (evita re-disparar o load da
   imagem a cada tick).
4. **Direção visual**: a tentativa "cards neutros" (Fase 1b) foi
   rejeitada — usuário comparou com a aba Mercado (que eu nunca toquei
   nesta leva) e preferiu esse estilo: cards com **tinta de gradiente por
   categoria** (vermelho=kills, dourado=shiny/ouro, verde=hunt, azul=xp,
   rosa=venda, roxo=diversos), do jeito que já existia antes da Fase 1b.
   Revertido pra esse sistema, mantendo as correções estruturais acima
   (sprite, sem o grid quebrado, painel menor) e os botões
   maiores/coloridos por estado (não mais os badges com bolinha da
   Fase 1b, que ficaram "feios" segundo o usuário).
5. **"Não tem o blur transparente"**: o painel externo
   (`#painel-speed-bench`, `07a`) estava em `rgba(15,23,42,0.82)` —
   opaco o bastante pra não parecer vidro de verdade sobre o jogo
   desfocado. Reduzido pra `0.68` (mais transparência, `backdrop-filter:
   blur(28px)` já existente fica mais evidente).

Validação: `build.py → BUILD OK` · `node -c → SYNTAX OK` · chaves do
bundle 2696/2696 · divs do arquivo 60/60 · diff de ids: os 51 originais
intactos + 1 novo (`p-poke-sprite`, adição, não substituição) ·
`pokemonshowdown.com` presente 4× no bundle (era 3×, agora 4× com a Home).

## [2026-08-30] Fase 1b — reconstrução real da Home (a partir do mockup aprovado)

O ajuste incremental da Fase 1 (reordenar cards do design antigo) não
resolveu — usuário achou que "parece com a anterior" porque eu nunca via o
resultado renderizado antes dele, só editava CSS às cegas nos templates
inline. Mudei de abordagem: desenhei mockups reais (Home, Auto Hunt 2,
Gym, Trade Hub) num canvas de design publicado como Artifact, usuário
aprovou a direção ("Pode fazer") e pediu também **pra diminuir o dialog
do Idle Suite Completo**. Esta entrada documenta a reconstrução da Home
a partir do mockup `Main.dc.html` aprovado.

**Painel menor** (`07a-idle-suite-panel-setup.js`): tamanho padrão do
`#painel-speed-bench` reduzido de `min(1440px,...)/min(900px,...)` (min
980×640) pra `min(1180px,...)/min(720px,...)` (min 860×560). Continua
`resize:both`, então o usuário pode aumentar se quiser — só o tamanho
de abertura padrão ficou menor.

**Home reconstruída** (`07i-idle-suite-tab-home.js`), linguagem visual
nova (não é mais um reorder do design antigo):
- **Cards neutros**: antes CADA card tinha um gradiente colorido próprio
  (candy-colored) — agora é uma única cor de superfície (`.ds-neutral-card`,
  `#1a2436`) com cor só nos textos/ícones. Muito menos poluído visualmente.
- **Toggles viraram badges com indicador de bolinha** (`.home-toggle-card::before`,
  verde quando `.on-state`, cinza quando `.off-state`) em vez de botões
  grandes coloridos — o contrato JS (`classList.toggle('on-state'/'off-state')`,
  texto ON/OFF/timer no `.home-toggle-state`) não mudou, só a casca.
- **Combatente ativo** continua em destaque no topo do Status de Caça,
  agora dentro de um card com XP do Pokémon e do Treinador lado a lado
  (bar mais fina, mais discreta).
- **Mochila** e **Resumo da sessão** viraram DOIS blocos independentes na
  coluna esquerda (antes o resumo tinha ficado sem querer aninhado dentro
  do `#home-bag-status`, o que faria colapsar a Mochila esconder o resumo
  também — corrigido pra cada um ter seu próprio collapse/vida).
- Tipografia: títulos de seção em `'Sora'` (fallback pro stack padrão se a
  fonte não carregar no contexto do jogo — mesmo padrão de fallback que
  `'JetBrains Mono'` já usava no projeto, sem `@font-face`/import extra).
- Layout mais compacto (paddings/fontes menores) pra caber bem no painel
  agora menor.

Nenhum id/class/data-attr removido (diff da lista de 51 ids: idêntica).
Validação: `build.py → BUILD OK` · `node -c → SYNTAX OK` · divs do
arquivo 58/58 balanceados · chaves do bundle 2686/2686.

Mockups de referência (Home + Auto Hunt 2 + Gym + Trade Hub) publicados
em: https://claude.ai/code/artifact/70fdfec7-c168-49dc-9fb0-c0eb5deb81b4
— Auto Hunt 2, Gym e Trade Hub ainda não foram implementados no código
de produção (só a Home, até agora).

## [2026-08-30] Refatoração completa Idle Suite + Shell — Fase 0 (fixes de fiação) + Fase 1 (Home)

Plano completo em `C:\Users\juann\.claude\plans\recursive-strolling-stream.md`
(10 fases, painel + shell inteiro). Usuário pediu redesign total depois de
ver que o motor de lógica não batia com o visual em vários pontos. Essas
duas fases foram feitas e validadas juntas (mexem nos mesmos arquivos:
`07i`/`07k`/`07l`).

**Fase 0 — bugs de fiação lógica↔visual, achados por agente de exploração:**
- `#stat-xp-real` ("XP/s" da Home) mostrava `xpSessao` (total acumulado da
  sessão) em vez da taxa `xpPorSeg` — corrigido em `30-motor-farm.js:248`.
- `#sessao-tempo2` (relógio "⏱") só atualizava a cada 10s porque estava
  amarrado à cadência de amostragem do gráfico de sessão — desacoplado em
  `30-motor-farm.js` (agora atualiza todo tick; só a amostragem do gráfico
  continua nos 10s de `SESS_INTERVALO_MS`).
- Removidas 3 consts mortas (`pokeName`/`pokeHp`/`hpBar`, nunca lidas) de
  `13-refs-farm.js`.
- `#bag-bolas-shiny-alvo` (Home) nunca recebia valor — agora ligado ao
  `pityShiny` real em `28-auto-hunt-precos.js` (novo const `bagBolasShinyAlvo`
  em `13-refs-farm.js`). As duas escritas em IDs fantasma que nunca
  existiram em HTML nenhum (`stat-bolas-alvo`/`stat-bolas-shiny-alvo`,
  calculavam o valor certo e jogavam fora) foram removidas de
  `28-auto-hunt-precos.js` e do reset em `21-modal-cidade.js`.
- O modal "Plano de Caçada" (`hunt-plan-*`/`spawn-*`) morava fisicamente
  no arquivo da aba Config (`07k`) mas é parte da aba Hunt 2 — movido
  pra `07l` (fim do arquivo, depois da trilha), zero mudança de
  ID/lógica, só localização do arquivo fonte.
- Bug de **ID duplicado**: `07k` tinha DOIS `<button id="spawn-select-all">`
  na mesma linha (um deles nunca respondia a clique) — o botão redundante
  foi removido no processo de mover o dialog pra `07l`; sobrou só 1.
- `btn-relatorio` (`gerarRelatorioSessao()`, copia resumo da sessão pro
  clipboard) não tinha nenhum elemento HTML em lugar nenhum — a função
  existia e funcionava, mas não tinha porta de entrada. Adicionado o
  botão "📊 Relatório" no cabeçalho do feed de logs da Home (`07i`).
- Rótulo de pin divergente pro mesmo item ("Scripts: Trade" em
  `shell/04-fixar-desfixar-menu-lateral.js` vs "Central de Trade" em
  `shell/07-fixar-itens-dashboard.js` e no próprio texto do menu em
  `index.html`) — unificado pra "Central de Trade" em `04-*`.

**Fase 1 — redesign visual da Home (`07i-idle-suite-tab-home.js`):**
- Reordenado por prioridade de leitura: barra de controle rápido → **card
  do combatente ativo promovido pro topo da seção "Status de Caça"**
  (antes ficava depois da grade de 4 stats — agora é a primeira coisa que
  aparece, já que "o que estou lutando agora" é a info mais importante de
  relance) → grade de stats → barras de XP → Mochila → resumo compacto da
  sessão → logs → ações.
- O bloco "Resumo da Sessão" (Alvo atual/XP hora/Taxa de captura/Progresso)
  duplicava informação já detalhada na seção de cima — cards reduzidos
  (`.home-summary-card-compact`) pra pesar visualmente menos, já que é um
  recap e não informação nova. IDs/classes mantidos intactos.
- **Bug de borda invisível corrigido**: várias bordas/divisores usavam
  `rgba(30,41,59,X)` (a mesma cor do fundo do card) — sobra do script de
  reversão de paleta da sessão anterior, que tratou todo `rgba(255,255,255,X)`
  como "fundo claro→escuro" sem diferenciar de bordas que também usavam
  branco. Resultado: bordas praticamente invisíveis (divisor do header,
  contorno dos toggles desligados, moldura da gaveta de log, etc.).
  Trocadas por `rgba(255,255,255,X)` de verdade (borda clara sobre fundo
  escuro, visível).
- Títulos de seção ("⚔️ Status de Caça", "🎒 Mochila & Recursos") agora
  usam `var(--ds-gold)` em vez de cinza-claro — consistente com o dourado
  = título de seção visto nas telas nativas do jogo.
- Nenhum id/class/data-attr removido ou renomeado (checado por diff da
  lista de ids antes/depois — idêntica, 51/51).

Validação: `python scripts/build.py` → BUILD OK · `node -c` → SYNTAX OK ·
`python shell/build_shell.py` → BUILD OK · `node -c shell/shell.gerado.js`
→ SYNTAX OK · chaves do bundle do painel balanceadas (2696/2696) ·
`btn-relatorio`/`hunt-plan-dialog`/`spawn-select-all` cada um 1× no bundle
· `statBolasAlvo` e a leitura antiga de `xpSessao` em `stat-xp-real`
confirmados ausentes do bundle.

**Próximo passo**: usuário confere Home no Electron antes da Fase 2
(Auto Hunt v2 + modal Plano de Caçada — a aba mais importante).

## [2026-08-30] Reversão de paleta: vidro CLARO → vidro ESCURO seguindo as cores nativas do jogo

Sessão anterior tinha aprovado um mockup verde-relva/vidro CLARO (fundo branco
translúcido) e convertido as abas Home e Mercado pra essa paleta. Na última
mensagem daquela sessão o usuário escreveu "acho que deveria acompanhar as
cores originais do jogo" sem detalhar — decisão ficou em aberto (ver
`CONTINUAR.md` do handoff). Resolvida nesta sessão: usuário mandou prints das
telas NATIVAS do jogo (Equipe, Inventário, Hunts, Pokédex, HUD do jogador,
Auto-Helper) — todas usam painel **azul-marinho escuro sólido**, **dourado**
como acento primário (títulos de seção, badges de tier/nível, moeda, VIP) e
**verde** como acento secundário (HP, toggles ligados). Confirmado: manter
blur/transparência (não ficar 100% opaco como o jogo), só que agora
escuro-azulado em vez de branco.

Trabalho feito:
- `07b-idle-suite-tokens.js`: tokens `--ds-*` voltaram pra base escura
  (`--ds-bg`/`--ds-surface` slate-900/800 translúcidos, iguais aos valores
  que o painel já usava ANTES do mockup claro — ver commit `efe3d53^`) +
  novos tokens `--ds-gold`/`--ds-gold-2`/`--ds-gold-soft`/`--ds-gold-glow`
  pro acento primário dourado. `--ds-green` continua como secundário
  (HP/sucesso/toggle ligado), mesma função de antes.
- `07a-idle-suite-panel-setup.js`: fundo do container externo do painel
  (`rgba(255,255,255,.14)` branco) → `rgba(15,23,42,.82)` azul-marinho,
  borda e sombra recalibradas pro escuro.
- `07i-idle-suite-tab-home.js` / `07j-idle-suite-tab-mercado.js`: script de
  conversão programática (mesma técnica da purga de indigo) trocou TODAS as
  cores claro-sobre-branco de volta pra claro-sobre-escuro, preservando a
  família de matiz por categoria (vermelho=kills, âmbar/dourado=ouro/shiny,
  verde=hunt/sucesso, azul-céu=xp/diamantes, rosa=venda de loot,
  roxo=diversos) — script em `recolor_home_mercado.py` (scratchpad,
  descartável). `rgba(15,36,23,X)` (tinta escura usada em `border`/divisores
  no tema claro) virou `rgba(255,255,255,X)` (borda clara sobre fundo
  escuro); a MESMA tinta usada dentro de `box-shadow` virou `rgba(0,0,0,X)`
  (sombra de verdade, não um "brilho" branco).
- `07c-idle-suite-core-chrome.js`: 2 regras `!important` que tinham vazado
  pro tema claro (`#btn-reset` fundo branco, `#p-drag-header-mini` fundo
  branco) corrigidas pro escuro — essas sobrescreviam qualquer ajuste feito
  no HTML inline por causa do `!important`.

**Não precisou mexer**: `07k`-`07n` (Config, Hunt 2, Captura, Gym) e o resto
do CSS partilhado (`07d`-`07g`) nunca saíram do tema escuro original — o
handoff anterior achava que precisavam de conversão, mas na verdade só
`07i`/`07j`/`07a`/`07b` + essas 2 regras do `07c` tinham sido tocadas.

Validação: `build.py → BUILD OK` · `node -c` → `SYNTAX OK` · chaves do
bundle 2698/2698 balanceadas · 0 ocorrências de `rgba(255,255,255,` ou dos
hex claro-sobre-branco (`#0f2417`, `#1f3a2a`, etc.) sobrando em `07i`/`07j`.

**Próximo passo sugerido**: reiniciar o Electron e abrir o Idle Suite no
jogo pra confirmar visualmente Home e Mercado antes de considerar essa
paleta "fechada" — só depois disso faz sentido seguir pro redesign de
conteúdo das abas restantes (Hunt 2 timeline, etc.) do roadmap original.

## [2026-08-30] "Clique fantasma" fechando a navegação hover da topbar

Usuário reportou: ao navegar a topbar do jogo (hover pra abrir o flyout de
categoria e escolher um item filho), às vezes o flyout fecha sozinho no meio
da navegação, como se um clique tivesse acontecido fora do menu.

**Causa:** `30-motor-farm.js` (`processarArremessoIndividual`, chamado a cada
200ms pelo `window.__catchInterval` enquanto o Auto Catch está ligado) simula
um clique de verdade no botão `[Lançar]` do card de captura — `pointerdown` →
`mousedown` → `click()` → `mouseup`, todos com `bubbles:true`. Isso já era
redundante: a ação de arremessar já acontece via chamada direta de
`throwBall()` (passo 1) e via `fetch('/api/action', {action:'throwBall'})`
(passo 3) — o clique de DOM é só um terceiro caminho, mantido por segurança.
O problema é que esses eventos sintéticos borbulham até o `document`/`window`
inteiro, e qualquer listener do próprio jogo que feche flyouts/dropdowns ao
detectar "clique fora do menu" (padrão comum de UI) enxerga esse clique
fantasma vindo de um botão de captura, que nunca está dentro do flyout da
topbar — e fecha a navegação, mesmo o usuário nunca tendo saído do hover.

**Fix (não mexe na mecânica de captura):** os 4 eventos sintéticos agora são
contidos na própria linha do card (`ev.stopPropagation()` registrado com
`{once:true}` na linha, antes do dispatch) — o botão `[Lançar]` ainda recebe
o clique normalmente (handler dele já roda na fase de alvo, antes da
propagação subir), só não vaza mais pro resto da página. `throwBall()` direto
e o `fetch` continuam intocados, então a captura em si não muda.

Validação: `build.py → BUILD OK` · `node -c` no bundle → SYNTAX OK ·
`conterNaLinha` presente no bundle (1x, dentro de `processarArremessoIndividual`).

**Se ainda sentir o clique fantasma depois disso:** o próximo suspeito é
`interceptarEFecharAnuncios()` (`15-auto-banners.js`, roda a cada 1.5s), que
também chama `.click()` — mas só quando um banner de boas-vindas está
realmente na tela, então é bem menos provável de coincidir com navegação
normal na topbar.


> **Fluxo de trabalho:** Edita em `scripts/` → `python build.py` → reinicia Electron
> **NUNCA** edite `bug-test-suite.gerado.tampermonkey.js` diretamente.

## Ordem de Execução

Os scripts são concatenados em ordem numérica. A ordem importa porque
variáveis declaradas em scripts anteriores estão disponíveis nos posteriores.

```
_header.js          → Abre a IIFE principal (function () { 'use strict'; ...)
01-core-estado.js   → Variáveis globais (let autoHuntLigado, etc.)
02-...36-...        → Módulos de funcionalidade
_footer.js          → Fecha a IIFE principal (})();
```

## Arquivos por Categoria

### 🏗️ Infraestrutura

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `_header.js` | 31 | Abre IIFE, define `window.__bugSuiteCarregado`, inicia `bugSuite()` |
| `_footer.js` | 2 | Fecha IIFE com `})();` |
| `01-core-estado.js` | 74 | **Todas as variáveis globais**: `autoHuntLigado`, `catchAutoLigado`, `autoVendaLigada`, `autoCompraLigado`, `pokeAtivoInfo`, `jogadorInfo`, etc. |
| `05-core-api.js` | 138 | **API do jogo**: `obterToken()`, `apiTest()`, `chamarFuncaoJogo()`, `obterGameState()`, fetch de spawns |
| `06-core-config.js` | 200 | **Salva/carrega config**: `salvarConfig()`, `carregarConfig()`, `aplicarConfigNaTela()`, persistência no localStorage |
| `06b-tipografia.js` | 138 | **Tipografia global**: presets de fonte, tokens `--app-font-ui` / `--app-font-num` escritos em `<html>`, `window.__setTipografia()` / `__getTipografia()` / `__listarTipografias()` / `__getTipografiaCSS()`. Controle na aba Config do painel v2; a casca do Electron sincroniza por `shell/45-tipografia-sync.js` |
| `06c-ui-mascara-modal.js` | 187 | **Máscara única + fechar clicando fora** (padrão do `#modal-bg` do jogo). `mascaraModal.abrir(el, fechar, {mascara, fechaFora})` / `.fechar(el)` / `.atualizar(el, opcoes)` / `.fecharTopo()`, exposto em `window.__isuiteMascara`. Pilha de telas: ESC fecha a do topo, clique na máscara fecha a primeira que aceita. Usado por 11 (painel v1), 07o (dock), 37b (painel v2 + gaveta da trilha) e 26 (diálogo do plano de hunt). Teste: `testes/verifica_mascara_modal.html` |
| `06d-ui-botao-fechar.js` | 62 | **Botão de fechar padrão** (`.isuite-x`): a receita do `#modal-close` / `#npc-close` do jogo (`background:none; border:none; color:#8b97a5; font-size:15px` + glifo `✕`). Substituiu 6 estilos diferentes — as 3 bolinhas do v2, as caixinhas vermelhas do v1/plano/trilha, a pílula dourada da gaveta e o ✕ do widget. Teste: `testes/verifica_botao_fechar.html` |

### 🎮 Auto Hunt (Caçada Automática)

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `02-auto-hunt-roteiro.js` | 42 | **Variáveis do hunt**: `autoHuntLigado`, `autoHuntFase`, `autoHuntKills`, `autoHuntTargetTypes` |
| `03-auto-hunt-contadores.js` | 23 | **Contadores**: `autoHuntFaseKills`, `autoHuntDropsFase`, `autoHuntTeleport`, `autoHuntLock` |
| `16-refs-auto-hunt.js` | 32 | **Referências DOM**: `btnAutoHuntStart`, `ahStatus`, `ahMeuTipo`, etc. |
| `26-auto-hunt-matriz.js` | 1370 | **⭐ CORAÇÃO DO HUNT**: `avaliarAutoHuntCore()`, `fasePorNivel()`, `capPorNivel()`, `atualizarAutoHuntUi()`, `iniciarAutoHunt()`, `pararAutoHunt()`, detecção de troca de Pokémon |
| `27-auto-hunt-tipo-dificuldade.js` | 109 | Filtro por tipo e dificuldade (Fácil/Médio/Difícil) |
| `28-auto-hunt-precos.js` | 607 | Tabela de preços de itens do jogo + `atualizarStatusXp()` (XP/ETA do pokémon e do treinador, `window.__idleSuiteXpStatus`) + `pintarEtaCardOficial()` (selos de tempo dentro do `#player-panel` do jogo) |

### 🎯 Auto Catch / Auto Sell / Auto Buy

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `14-refs-loot.js` | 299 | **Referências de loot**: `btnCatchToggle`, `chkAutoVenda`, `btnAutoCompra`, funções de captura, venda e compra automáticas |
| `19-toggles-auto.js` | 193 | **🔗 LINK sidebar ↔ menu**: `pintarAutoToggleIdle()`, `enviarAuto()`, `idleAutoState()`, sincroniza toggles |
| `25-loot-aba.js` | 458 | Aba de loot: lista de drops, contadores, estatísticas |

### 🏪 Cidade / Mercado / NPCs

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `20-cidade-utils.js` | 523 | **Atalhos da topbar**: pins 📌, `injetarPinsNosMenus()`, barra fixada, `chamarFuncaoJogo()` |
| `21-modal-cidade.js` | 157 | `modalJogoAberto()`, `ajustarBackdropModal()`, botão pausar/reset, `syncHomeToggles()` |

### 🖥️ Interface (UI)

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `07a-idle-suite-panel-setup.js` | 127 | Comentário de topo, `aplicarConfigNaTela`, criação do painel (`p.style.cssText`) |
| `07b-idle-suite-tokens.js` | 96 | Tokens de design (`--ds-*`, aliases `--bs-*`/`--suite-*`) — fonte única de cor/raio/sombra |
| `07c-idle-suite-core-chrome.js` | 414 | Header, botões, tab nav, badges, barras XP, stat cards, inputs, toggles, scrollbar, feed |
| `07d-idle-suite-core-cards-tabs-hd.js` | 112 | Cards/pills/inputs base + camada "TABS · Legibilidade HD" |
| `07e-idle-suite-tabs-captura-gym-config.js` | 148 | CSS específico das abas Captura, Gym, Config |
| `07f-idle-suite-tabs-mercado-utilitarias.js` | 279 | CSS da aba Mercado + classes utilitárias `.ds-*` |
| `07g-idle-suite-final-layers.js` | 157 | Camadas `FINAL` (Home compacta, acentos) + `SHELL` chrome + fecha `</style>` |
| `07h-idle-suite-header-tabnav.js` | 40 | Markup do header arrastável + botões de navegação das abas |
| `07i-idle-suite-tab-home.js` | 270 | HTML da aba `#aba-status` (Home) |
| `07j-idle-suite-tab-mercado.js` | 231 | HTML da aba `#aba-mercado` |
| `07k-idle-suite-tab-config.js` | 122 | HTML da aba `#aba-configs` |
| `07l-idle-suite-tab-hunt.js` | 205 | HTML da aba `#aba-autohunt` (Hunt 2) |
| `07m-idle-suite-tab-captura.js` | 143 | HTML da aba `#aba-captura` |
| `07n-idle-suite-tab-gym.js` | 113 | HTML da aba `#aba-gym` + fecha o template literal `p.innerHTML` |
| `07o-idle-suite-panel-behavior.js` | 104 | `appendChild(p)`, dock/pin, funções de comportamento do painel |
| `08-ui-drawer-feed.js` | 90 | Feed de eventos do drawer (log de ações) |
| `09-ui-arrasto.js` | 52 | Arrasto do painel pelo header (`iniciarArrasto`) |
| `10-ui-miniatura.js` | 31 | Modo miniatura vs modo grandão |
| `11-ui-modal.js` | 55 | Abertura/fechamento do drawer, `abrirDrawerSuite()`, `fecharDrawerSuite()`. O clique-fora e o ESC saíram daqui para `06c-ui-mascara-modal.js` |
| `12-ui-recolher.js` | 58 | Recolher painel (modo clean no rodapé) |
| `34-sidebar.js` | 95 | Sidebar do jogo (atalhos, info) |
| `36-topbar-extras.js` | 93 | Botões extras na topbar (áudio, dashboard, proxy) |

### 📊 Dashboards / Relatórios

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `22-mini-dashboard.js` | 73 | **Mini Dashboard**: `__getIdleAuto()`, `__setIdleAuto()`, ponte para sidebar |
| `23-widget-auto.js` | 177 | **Widget auto toggles**: `__getTabInfo()`, widget flutuante, drag |
| `24-dashboard.js` | 259 | Dashboard principal: kills, shiny, XP, sessão |
| `29-sessao-relatorio.js` | 51 | Relatório de sessão (gráfico, tempo, stats) |

### ⚔️ Gym / Trade / Diagnóstico

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `30-motor-farm.js` | 866 | **Motor de farm**: loop principal `tick()`, combate, drops, XP, auto-pause na cidade |
| `31-aba-gym.js` | 892 | Aba de Ginásios: líderes, batalhas, insígnias |

> **Removido (Auto Rota 3.0):** os arquivos `31-auto-hunt-v3.js` e `38-auto-rota-entry.js`
> foram desativados (movidos para `scripts/_desativados/`). A ideia de trilha agora vive
> dentro do Auto Hunt 2: o botão **INICIAR HUNT** abre o **Plano de Caçada** (trilha de
> fases), e ao confirmar o plano, o motor respeita a meta de nível (última fase ativa =
> trava/farm) e caça apenas os pokémons selecionados de cada fase (`_huntPlanAtivo` /
> `_huntPlanSpawns` em `26-auto-hunt-matriz.js`).
>
> **Tema Pokémon Fun:** camada visual em `07-ui-build.js` (bloco `POKÉMON FUN THEME`)
> inspirada no `prototipo.jpg` — paleta verde esmeralda/azul-petróleo, pokébola
> decorativa no header, sidebar estilo pokédex, botões primários em gradiente
> esmeralda e cards com hover divertido. Apenas CSS, sem tocar em lógica/IDs.
>
| `32-aba-trade.js` | 698 | Aba de Trade: troca entre contas |
| `33-aba-diag.js` | 436 | Aba de diagnóstico: estado do jogo, variáveis, debug |

### 🧬 Pokémon Info

| Arquivo | Linhas | O que faz |
|---------|--------|-----------|
| `13-refs-farm.js` | 58 | Referências de farm (DOM elements) |
| `15-auto-banners.js` | 62 | Auto-fechamento de banners/popups |
| `17-pause-funcoes.js` | 44 | Funções de pause do loop |
| `18-pause-bind.js` | 38 | Bind de teclado para pause |
| `37-tabinfo.js` | 49 | **Barra "now playing"**: nome do treinador + Pokémon ativo |

## Arquivo Mais Importante

**`26-auto-hunt-matriz.js`** (1370 linhas) — É o cérebro da caçada automática.
Contém: detecção de troca, cálculo de fase/zona, teleporte, escolha de alvo.

**`07-ui-build.js`** (1493 linhas) — É o esqueleto visual.
Contém: todo o HTML/CSS do drawer, abas, tabs, menus.

## Para Adicionar um Novo Script

1. Crie `XX-nome-do-script.js` (XX = próximo número)
2. **Não** use IIFE própria — o código roda dentro da IIFE do `_header.js`
3. Use guard: `if (!window.__nomeUnico) { window.__nomeUnico = true; ... }`
4. Rode `python scripts/build.py`
5. Reinicie Electron

## 2026-08-30 — Correções: Home, Pin, Motor (build aprovado)

### Aba Home — status de caça reconectados
- Nova seção `#home-hunt-status` em `aba-status` com os IDs que o motor já alimentava mas que o redesign havia removido: `stat-dano`, `stat-xp-real`, `stat-alvo-lv`, `stat-ultimo-abate`, `sessao-tempo2`, `p-poke-name`/`p-poke-hp`/`p-hp-bar`, barras de XP do Pokémon (`stat-xp-poke-*`, `stat-xp-pct/fill/falta/eta`) e do Treinador (`stat-jog-*`).
- Camada CSS final "CAMADA FINAL COERENTE" (última no cascade): compacta os botões gigantes (toggles 38px, botões 32px, sidebar 64px, abas 52px, header 44px) e nivela trilha/editor (`#hunt-trail-card { flex:1; min-width:0 }`, editor `min-height:280px`).

### Sistema de Pin (topbar) — funcionando
- **Bug crítico corrigido em `20-cidade-utils.js`**: `alternarPinItem` usava `idx` indefinido (`if (idx >= 0)` sempre falso) → fixar duplicava e **desfixar nunca removia**. Agora calcula `findIndex` por id/label e atualiza os botões após salvar.
- Camada 2 da injeção agora mira **somente os filhos** `button.tb.ic.tbm-off` (sem pins nos pais `aria-haspopup`, sem o `data-pin-label="!"` do badge). Allowlist ganhou `'bolas'` (Gerenciador de Bolas) e `'moon'` (Moon Pass).

### Motor — guardas defensivas
- `30-motor-farm.js`: `statRaro` lido sem guarda dentro do loop de kills (`Number(statRaro.textContent)+1`) lançava TypeError e quebrava o processamento de drops/loot → agora `if (statRaro) ...`.
- `25-loot-aba.js`: handler "Limpar" acessava `statDano`/`statHist` sem guarda → guardas adicionadas.

### Validação
- `python scripts/build.py` → BUILD OK
- `node -c bug-test-suite.gerado.tampermonkey.js` → SYNTAX OK
- 21 IDs novos presentes (1x cada); `aba-status` com divs balanceados; fixes confirmados no bundle.

## 2026-08-30 — Consolidação de temas CSS (limpeza de camadas)

- Removidas do `<style id="bs-style">` as camadas de tema antigas e conflitantes:
  **PROTOTYPE VISUAL SYSTEM** (`--proto-*`), **MODULAR WIDGET DESIGN SYSTEM** (`--widget-*`, classes `.widget-*` não usadas no HTML) e **POKÉMON FUN THEME** (decorativo, pokébola no header, bordas douradas TCG).
- Mantidas: **HOME VISUAL SYSTEM**, **REDESIGN SYSTEM** (`--bs-*`), **PREMIUM DESIGN SYSTEM** (`--suite-*` + blocos modulares Captura/Gym/Config/Mercado), **DESIGN SYSTEM CORE** (`--ds-*` / classes `ds-*` usadas no HTML) e a **CAMADA FINAL COERENTE** (última no cascade).
- Regras únicas que existiam só nas camadas removidas foram reaplicadas na CAMADA FINAL: `box-sizing: border-box` global do painel, `min-width/min-height:0` em `#p-full-view`/`#area-conteudo`, e o media query `≤1100px` que colapsa o grid de métricas da Home para 3 colunas.
- Resultado: ~18,7KB de CSS morto removido (bundle 761KB → 721KB), cascade simplificado (5 camadas → sem sobreposição de `!important` conflitantes), aparência final governada por PREMIUM + DS CORE + CAMADA FINAL.
- Validação: `build.py → BUILD OK`, `node -c → SYNTAX OK`, chaves CSS balanceadas (250/250), zero referências a `--proto-*`/`--widget-*`/`--pokeball-*` no bundle.

- Ajuste pós-verificação: os acentos decorativos essenciais foram reaplicados num bloco único **"POKÉMON ACENTOS"** na CAMADA FINAL (sem os `!important` conflitantes de antes): pokébola no header + borda inferior vermelha 2px, cards das abas em `border-radius:16px` com hover dourado, sublinhado amarelo na aba ativa, chips de tipo `12px` e divisa vermelha no rodapé. Validação: `build.py → BUILD OK`, `node -c → SYNTAX OK`, chaves CSS 255/255.

## 2026-08-30 — Reconexão de IDs órfãos (abas Diag/Trade + Mochila)

Refeição do levantamento de IDs órfãos (129 → 81 restantes) e reconexão dos grupos pedidos:

- **`diag-*` (13/13)** — nova aba **🔍 Diag** (sidebar + `#aba-diag`): status de Token, Posição, Alvo, XP Poké/Treinador e Catch + botões Testar Estado/Atacar/Catch, Copiar diag, Limpar cache, Limpar log + `#diag-log-container`. Conectada em `08-ui-drawer-feed.js` (tab switch, onclick, restore) e alimentada pelo loop de 1s quando `abaAtiva==='diag'`.
- **`trade-*` (23/23)** — nova aba **🤝 Trade** (`#aba-trade`): badge de status, envio de convite, `#trade-conteudo-status`, `#trade-botoes-acoes`, favoritos, jogadores do mapa, nicks recentes e automação (favoritos/todos/notify/whitelist). O render e os handlers já existiam em `32-aba-trade.js` — agora os containers existem.
- **`bag-*` (10/10)** — card **🎒 Mochila & Recursos** na Home (`#home-bag-status`): Gold, Diamantes, Bolas, Poções, Itens, Mortes, Shinies, Bolas no alvo.
- Refs `tabDiag/abaDiagEl/tabTrade/abaTradeEl` adicionadas ao bloco TABS do `07`; `ativarTab`/onhandlers/`mapTabs` do `08` estendidos (ordem do build: 07 < 08, correto).

### Ainda órfãos (fora deste escopo)
- **`mini-*` (31)** — pertencem ao **mini-widget** (dock/bolinha compacta, `10-ui-miniatura.js`), que não tem host no design atual → exige criar o widget minimizado (feature nova).
- `ah-*`, `atk-*`, `stat-balanco-*`, `stat-bolas-*`, `stat-catches/hist/raro/xp-boost/z`, `pp-*`, `char/player/profile-name`, `btn-*`, `header-*` — pertences a outros painéis removidos em redesigns (Auto Hunt status, captura da hunt, dashboard de balanço, perfil). Os setters são guardados (`if(el)`) na maioria, sem quebrar o motor.

### Validação
- `build.py → BUILD OK`, `node -c → SYNTAX OK`
- Wiring confirmado no bundle (cada token exatamente 1×): `tabDiag`, `tabTrade`, `abaDiagEl`, `abaTradeEl`, `salvarAbaAtiva('diag'/'trade')`, `mapTabs` com diag/trade, `id="aba-diag"`, `id="aba-trade"`, `id="home-bag-status"`, `diag-log-container`, `trade-input-nick`.
- `area-conteudo` com divs balanceados (351 open / 352 close = +1 da própria `area-conteudo`).

## [2026-08-30] Camadas CSS renomeadas + tokens centralizados
- `<style id="bs-style">` (07-ui-build.js): todas as variáveis `--bs-*`, `--suite-*`, `--ds-*`
  movidas para UM bloco único `CORE · TOKENS` no topo do style.
- Camadas mantidas renomeadas: CORE (base do painel/cards/pills/classes ds),
  TABS (Captura, Gym, Config, Mercado, HD), FINAL (Camada Coerente + Acentos Pokémon).
- Build OK · node -c SYNTAX OK · chaves CSS 253/253 · cada token definido 1x.

## [2026-08-30] Redesign visual da Trilha de Progressão (Auto Hunt 2)
- Nós agora são cards (bg #1e293b, radius 12px, borda rgba(255,255,255,.06), hover azul).
- Cores por estado (eram roxas #4f46e5): ATUAL = azul neon #38bdf8 + anel/glow/pulse,
  CONCLUÍDO = verde esmeralda #10b981, FUTURO = slate #334155 translúcido, FARM = âmbar #f59e0b.
- Editor lateral: body padding 20px, sugestões (ht2-sug) viram cards flutuantes (hover verde + elevação),
  botões de rodapé (farm toggle / reset) com ícones, cantos 10px, contraste e sombra.
- Nenhuma classe/ID/handler alterado (ht2-*, hunt-trail-*-* intactos). Build OK · node -c OK · chaves 36/36.

## [2026-08-30] Design System de Alta Performance aplicado ao painel
- Tokens aliasing adicionados ao CORE · TOKENS (escopados em #painel-speed-bench):
  --bg-main/#0f172a, --bg-card/#1e293b, --bg-card-hover/#334155, --accent-green/#10b981,
  --accent-blue/#38bdf8, --text-main/#f8fafc, --text-muted/#94a3b8, --border-subtle,
  --radius-box(14)/--radius-pill(9999), --btn-green-grad, --shadow-box/--shadow-btn/--shadow-btn-hover.
- Classes utilitárias novas (escopadas, sem vazar pro jogo):
  .card-panel (card-panel:hover), .btn-primary-custom (+hover), .text-muted-custom, .badge-green.
- Build OK · node -c OK · chaves 260/260 · tokens definidos 1x cada.

## [2026-08-30] Fix Auto Hunt v2 — detecção de troca de pokémon
- O verificador periódico de hunt (30-motor-farm.js) dependia de obterGameState() (gameState global
  / ultimoStateGeral) que ficava STALE após trocar o pokémon pelo Box — o script continuava acusando
  o pokémon antigo mesmo após level up.
- Agora, a cada verificação, busca o /api/state fresco (fonte mais confiável, via obterToken) como
  fonte primária do pokémon ativo, com fallback pro gameState. Intervalo reduzido de 15s → 8s.
- A troca é então detectada por nome, nivel e tipo, disparando recalcularAutoHunt(true).
- Build OK · node -c OK · fetch fresco confirmado no bundle.

## [2026-08-30] Fix Auto Hunt v2 — teleporte repetido + catch desligando sozinho
- Teleporte: `precisaTeleportar` agora exige `!naZonaCorreta` — `forcar` recalcula rota/alvos
  mas NUNCA força teleporte se o treinador já está na zona alvo. Antes, o tick chamava
  `avaliarAutoHunt(true)` a cada level up e re-teleportava infinitamente (26-auto-hunt-matriz.js).
- Toggles: sync do servidor (syncTogglesComState + espelho idleAutoState) agora respeita
  cooldown de 2.5s após clique local — não sobrescreve mais catchAutoLigado/autoHuntLigado
  com o valor do servidor logo após o usuário ligar (19-toggles-auto.js).
- Build OK · node -c OK · cooldown e guarda de teleporte confirmados no bundle.

## [2026-08-30] Refatoração Visual (Padrão do Protótipo) — Fases 1,2,3,5,6
- Tokens: --bs-primary/--bs-glow já verdes; styles.css :root agora espelha
  --bs-*/--suite-* aliases para consistência shell Electron ↔ painel.
- Camadas CSS consolidadas: SHELL (chrome) + TABS (raios 14px nas abas) + RESPONSIVE
  adicionadas; .ds-tab-active (barra verde lateral) e .ds-btn-primary consolidado.
- Chrome: header, sidebar abas, bubble view, scrollbars, feed, footer — índigo→verde.
- Nós .ht2-node.current da trilha (26-auto-hunt-matriz.js): azul #38bdf8 → verde #10b981.
- Home: XP do treinador (#stat-xp-jog-fill), map detect, xp pct, diamantes, configs → verde.
- hunt-plan-dialog: bordas/acentos índigo → verde (IDs/handlers intactos).
- Widgets: 23-widget-auto.js e 37-tabinfo.js bordas índigo → verde.
- Shell Electron (index.html): xp-mini-view hover, Game Tools btn, dropdown → verde.
- Build OK · node -c OK · chaves 284/284 · 0 índigo no CSS do painel · DESIGN_SYSTEM.md atualizado.

## [Home] Feed sempre visível + collapse + botões compactos
- Removido o botão "Abrir Feed de Logs em Tempo Real" e o "Fechar" do feed: `#feed-drawer` agora abre `display:flex` por padrão (logs integrados à Home).
- `12-ui-recolher.js`: ao expandir o painel, o feed é restaurado para `flex` (sem depender do botão removido).
- Botões de collapse (`.home-collapse-btn` + classe `.home-collapsed`) adicionados nas seções **Status de Caça** e **Mochila & Recursos** da Home.
- Rodapé: `#btn-pausar` / `#btn-reset` compactados (padding 7px 4px, font-size 11px) — IDs preservados para os handlers JS.
- Build OK · node -c OK · chaves CSS balanceadas.

## [Fix] Auto Catch desligando sozinho
- **Causa raiz:** o tick (~350ms) roda `syncTogglesComState(s.auto)` e, quando o servidor ainda reportava `auto.catch=false` (latência do proxy / setAuto em voo), sobrescrevia `catchAutoLigado=false` — desligando o catch logo após o usuário ligar. O cooldown de 2.5s só protegia os cliques da sidebar `#auto-toggles`; os botões da aba Captura (`btnCatchToggle`), Home (`toggle-home-catch`) e mini-dashboard não marcavam a mudança local.
- **Correção (19-toggles-auto.js):** nova flag `_usuarioControla[chave]` — uma vez que o usuário liga um toggle na sessão, o sync do servidor e o espelho do Idle Suite **só podem ligar, nunca desligar** (`usuarioControla(chave) && !auto[chave]` → skip). Desligar só volta a acontecer por clique explícito do usuário.
- **Correção (14-refs-loot.js / 22-mini-dashboard.js):** `marcarMudancaLocal('catch')` adicionado em `btnCatchToggle`, `toggle-home-catch` e `__setIdleAuto('catch')`; este último agora respeita o parâmetro `on` (liga/desliga para o estado pedido em vez de toggle cego).
- Build OK · node -c OK · verificações no bundle OK.

## [Remoção] Aba Diagnóstico & Logs
- Removido `scripts/33-aba-diag.js` (aba 🔍 Diag) e todo o código associado:
  - HTML `#aba-diag` + botão `#tab-diag` da sidebar (07-ui-build.js)
  - CSS `#painel-speed-bench #aba-diag > div` (07-ui-build.js)
  - Refs JS `tabDiag`/`abaDiagEl` + mapa de abas/onclick (08-ui-drawer-feed.js)
- **IMPORTANTE (arquitetura do build):** `33-aba-diag.js` era o arquivo que fechava o corpo de `bugSuite()` (aberto em 01-core-estado.js) e chamava `iniciarQuandoPronto();`. Ao deletá-lo, o bundle quebrou (`Unexpected token ')'` no `_footer.js`).
  - Criado `scripts/38-bootstrap.js` (último arquivo numerado) que faz exatamente isso: fecha `bugSuite()` e dispara o bootstrap.
- Validação: build.py OK · node -c OK · 0 referências `diag-*`/`tab-diag`/`aba-diag` no bundle.

## [Remoção] Aba Trade (Cross-Map Trade Suite)
- Removido `scripts/32-aba-trade.js` (aba 🤝 Trade) e todo o código associado:
  - HTML `#aba-trade` + botão `#tab-trade` da sidebar + CSS `#aba-trade > div` (07-ui-build.js)
  - Refs JS `tabTrade`/`abaTradeEl`, mapa de abas/onclick (08-ui-drawer-feed.js)
  - Chamada `checarTradeEventos(s)` no tick (30-motor-farm.js)
  - Config save/restore de trade (06-core-config.js), export/import de favoritos (14-refs-loot.js)
  - Vars de trade em 04-trade-estado.js (mantido o arquivo: compartilha estado de captura/hunt + `autoBallSelecionados` usado pela aba Mercado)
- Motivo: o jogo já tem sistema de trade completo.
- **Bootstrap preservado:** o `38-bootstrap.js` (criado na remoção da aba Diag) continua fechando `bugSuite()` e chamando `iniciarQuandoPronto();` — o build não quebrou desta vez.
- Nota: `.modal-trade-container` em 11-ui-modal.js é uma classe genérica de guarda de modais do jogo (não é a aba), mantida de propósito.
- Validação: build.py OK · node -c OK · 0 referências `trade-*`/`tab-trade`/`aba-trade` no bundle (exceto `.modal-trade-container`).

## [2026-08-30] Pin da topbar — ícone errado (matching por título era frágil demais)

Depois da reescrita abaixo, usuário reportou: fixar "Mercado Global" mostrava um
🎮 (joystick) no rail em vez do 🏪 do Mercado.

Causa: `acharBotaoReal()` casava o botão real (escondido em `#topbar`) pelo
TÍTULO, mas o rótulo do item no flyout nem sempre bate com o `title` do botão
real — ex.: flyout mostra "Mercado Global", mas o botão real tem
`title="Mercado — compre e venda com outros jogadores"` (confirmado no config
ao vivo do jogo, `app-2.js`: `{ sel: '[data-modal="market"]', rotulo: "Mercado
Global" }`). Sem achar o real, `dataModal`/`elId` ficavam vazios e, pior, o
emoji de verdade (🏪, que só existe DENTRO do botão real) nunca era capturado —
`extractEmoji()` tentava achar um emoji no TEXTO "Mercado Global" (não tem
nenhum) e caía no 🎮 padrão.

Fix: trocada a estratégia de matching. O ícone do item no flyout é uma CÓPIA
1:1 do ícone do botão real (o próprio jogo faz essa cópia ao montar o flyout —
mesmo `src` de img, ou mesmo texto/emoji do span) — muito mais confiável que
comparar texto. `acharBotaoReal(proxyEl, label)` agora casa primeiro pelo
ícone (img `src` idêntico, ou emoji/texto idêntico) e só cai pro título como
fallback. De brinde, a emoji real agora é capturada e guardada no pin
(`pin.dataset.pinEmoji`) na hora de fixar, em vez de tentar adivinhar depois.

**Nota:** pins salvos ANTES desse fix (localStorage) ficaram com os dados
antigos (vazios/errados) — não há migração automática. Desfixar e fixar de
novo resolve, já que a lógica nova roda no próximo clique.

Validação: `build.py → BUILD OK` · `node -c` (bundle + main.js) → SYNTAX OK ·
chaves balanceadas, depth 0.

## [2026-08-30] Pin da topbar — reescrito do zero

Depois do fix pontual abaixo (clique duplo + dataModal errado + observer quebrado)
o usuário pediu uma reescrita completa pra eliminar as camadas de patch acumuladas
— o arquivo tinha 3 versões da mesma ideia sobrepostas (uma `PIN_ALLOWLIST`
duplicada dentro de `injetarPinsNosMenus()`, busca de ícone com 3 fallbacks quase
iguais, `_pinLog`/`__testPin`/`__getPinnedList` de debug que nunca funcionaram
direito). `instalarSistemaPinTopbar()` (todo o bloco 📌 em `20-cidade-utils.js`)
foi substituído por uma versão única e coerente, mesma STORAGE_KEY (pins
existentes do usuário continuam funcionando):

- Um único helper `acharBotaoReal(label)` resolve o botão real escondido em
  `#topbar` (usado tanto pra achar `data-modal`/`id` na hora de fixar quanto pro
  ícone na hora de desenhar o rail) — antes essa busca por título existia
  duplicada em 2 lugares com pequenas diferenças.
- `renderizarBarraFixada()` agora envolve a criação de cada botão em try/catch
  por item, pra um item com dado inesperado não derrubar o resto da barra no
  meio do `forEach`.
- Debug: trocado `_pinLog`/`window.__testPin`/`window.__getPinnedList` (que
  gravava em localStorage e nunca era lido do contexto certo) por um hook único
  `window.__idlePins = { list, rescan, toggle }`, inspecionável direto no F12
  (DevTools) da `<webview>` do jogo.
- `main.js`: removidos os handlers IPC `dump-pin-logs`/`test-pin` (quebrados,
  ver bug de contexto abaixo) e o auto-dump de 15s (poluía o debug-startup.log
  e checava `pinnedList`/`__pinLogs` como globals que nunca existiram nesse
  escopo). `Ctrl+Shift+P` agora chama `__idlePins.list()` de verdade.

Validação: `build.py → BUILD OK` · `node -c` no bundle e no `main.js` → SYNTAX OK
· chaves do bundle balanceadas, depth 0 · 1 único listener de clique no bundle ·
`window.__idlePins` presente · nenhuma referência a `__pinLogs`/`__testPin`/
`__pinDelegateInstalled` sobrando.

## [2026-08-30] Pin da topbar — clique duplo cancelava o fixar + performance (fix pontual, substituído pela reescrita acima)

Depois de várias tentativas anteriores não resolverem, uma auditoria completa do
fluxo (comparando `20-cidade-utils.js` com o DOM real do jogo em `app-2.js`,
`gymproto.js`, `boss.js`) achou 3 bugs concretos:

1. **Clique duplo cancelava o pin** (causa raiz do "clico e não fixa"): o handler
   de clique (`_onPinClick`) estava registrado em `mousedown` **e** `click` pro
   mesmo botão. Um clique físico dispara os dois eventos, e como
   `alternarPinItem()` é um toggle, o 2º disparo desfazia o 1º na hora — fixar e
   desfixar no mesmo clique, sem efeito nenhum. Agora só `click` chama o toggle;
   `mousedown`/`pointerdown` só bloqueiam o evento pro jogo por baixo.
2. **`dataModal` sempre vazio pros itens da Treinador/Loja/Recompensas/Comunidade/
   Sistema** (causava "fixei mas clicar no pin não abre nada"): o pin lia
   `data-modal` do botão PROXY dentro do flyout (`.tbm-item`, criado dinamicamente
   pelo jogo em `document.body`), mas esse proxy nunca tem esse atributo — só o
   botão REAL escondido em `#topbar` (`.tbm-off`) tem. `injectPin()` agora acha o
   real pelo título (`title` batendo com o rótulo) e guarda `data-modal`/`id` dele;
   `executarAcaoItem()` ganhou fallback por `id` pros itens que só têm id (Natures,
   Pergaminho, Mega, Golpes, Helds, Moon Pass, Indique, Guildas, MailBox, Capturas
   Globais, Sair, PokéPédia, Vender por raridade).
3. **Pin "piscando" / demorando até 5s pra aparecer** (relatado pelo usuário): o
   gatilho de reinjeção era um `MutationObserver` em `document.body` inteiro
   (`childList+subtree+attributes`) — caro, disparava a cada troca de classe em
   QUALQUER lugar do jogo — **e além disso estava quebrado**: `.observe(topbar, …)`
   referenciava uma variável `topbar` que só existe dentro de
   `injetarPinsNosMenus()`, não nesse escopo externo, então lançava
   `ReferenceError` (engolido pelo try/catch) e o observer nunca era instalado. Na
   prática só o interval de 5s injetava os pins — daí a demora. Trocado por um
   listener de `mouseover` delegado nos botões-pai da topbar (dispara na hora do
   hover) + interval de 3s só como rede de segurança. `injetarPinsNosMenus()`
   também parou de remover TODOS os pins a cada chamada antes de recriar (causa do
   "piscar visual") — agora é idempotente, só injeta o que falta.
4. Bônus (infra de debug, não afetava o jogo): `main.js` tinha `dump-pin-logs` e
   `test-pin` chamando `contents.getAllWebContents()` numa instância de
   `WebContents` (método não existe aí, é estático do módulo `webContents`) e o
   auto-dump a cada 15s lia `__pinLogs`/`pinnedList` de `mainWindow.webContents`
   (o shell `index.html`) em vez da `<webview>` onde o jogo roda — os dois sempre
   retornavam vazio/erro, o que mascarou o bug real em investigações anteriores.
   Corrigido: `webContents` importado do módulo `electron` e os 3 pontos agora
   iteram `webContents.getAllWebContents()` (bônus: também destrava
   `disable-webview-throttling`, que tinha o mesmo import faltando).

Validação: `build.py → BUILD OK` · `node -c bug-test-suite.gerado.tampermonkey.js
→ SYNTAX OK` · `node -c main.js → SYNTAX OK` · chaves 2715/2715 balanceadas,
depth 0 · confirmado no bundle: 1 único listener `_onPinClick` (antes 2) · 0
`_topObs.observe` órfão · `data-pin-datamodal`/`data-pin-elid` presentes.

## ✅ Pin — correção de escopo (matchesAllowlist is not defined)
- A causa: `injectPin()` (nível do IIFE) chamava `matchesAllowlist`/
  `processed`, que estavam DENTRO de `injetarPinsNosMenus()` → ReferenceError ao clicar nos pins.
- Fix: movi `injectPin` + `extractEmoji` para dentro de `injetarPinsNosMenus()`
  (após a allowlist/matchesAllowlist), para herdarem o escopo via closure.
- Validação: build OK · node -c OK.
- Ajuste follow-up: `extractEmoji` também é usado pela `renderizarBarraFixada`
  (fallback do rail, nível do IIFE). Movi-o para o topo do IIFE (linha ~383) e
dentro de `injetarPinsNosMenus` ficou só `injectPin` (hoje a única que precisa de
`matchesAllowlist`/`processed`). Fim do erro "extractEmoji is not defined".

## [2026-08-30] Split de 07-ui-build.js (2561 linhas → 15 arquivos)
`07-ui-build.js` cresceu até virar um arquivo único de 2561 linhas misturando
setup do painel, ~1200 linhas de CSS e o HTML de todas as 6 abas — impossível
de navegar. Fatiado em `07a-idle-suite-*.js` a `07o-idle-suite-*.js` (ver
tabela acima), cada um isolando uma responsabilidade (tokens, chrome/CSS
partilhado, CSS por grupo de abas, HTML por aba, comportamento do painel).
Split puramente mecânico: cada corte foi verificado como reconstrução
byte-a-byte do arquivo original antes de apagar o monolito — nenhum ID,
classe, handler ou trecho de CSS/HTML foi alterado, só reorganizado. Mesma
técnica usada no split do `index.html` (→ `shell/`) e `styles.css` (→ `css/`)
do shell Electron. `scripts/build.py` não precisou mudar — o filtro
`f[:2].isdigit()` já pega qualquer `07x-*.js`.

Consequência prática: qualquer ajuste visual numa aba específica agora é só
abrir `07i-idle-suite-tab-home.js` (por exemplo) em vez de rolar 2500 linhas.
