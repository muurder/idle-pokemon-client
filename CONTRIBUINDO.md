# Instruções para editar este projeto

> **Regra #1: nunca edite `scripts/dist/game-injector.js` diretamente!**
> Esse arquivo é **output** do build, não fonte. Edições nele são perdidas
> na próxima vez que `scripts/build.py` rodar.

## Fluxo obrigatório

```
1. Edite APENAS em scripts/XX-nome.js (script injetado no jogo)
   ou shell/XX-nome.js (UI do Electron, sidebar, docas, atalhos)
2. Rode:
   python scripts/build.py     # gera scripts/dist/game-injector.js
   python shell/build_shell.py # gera shell/shell.gerado.js
3. Reinicie o Electron (npm start) pra testar
```

## Estrutura do projeto

```
browser_pokemoon_client/
├── scripts/                       ← fonte do script injetado no jogo
│   ├── _header.js / _footer.js    ← abrem/fecham a IIFE (não editar)
│   ├── 09b-doca.js                ← factory de docas (Hunts, Custo, etc.)
│   ├── 18-api-helpers.js          ← helpers de API + zonas meta
│   ├── 23-status-bridge.js        ← poller de estado + XP/ETA no card do jogo
│   ├── 37d-doca-custo.js          ← doca de Custo de Captura (Shift+C)
│   ├── 37f-doca-hunts.js          ← doca de Hunts
│   ├── build.py                   ← compila scripts/*.js → scripts/dist/game-injector.js
│   └── dist/game-injector.js      ← OUTPUT (não editar!)
│
├── shell/                         ← fonte da UI do Electron (sidebar, topbar, docas de janela)
│   ├── build_shell.py             ← compila shell/*.js → shell/shell.gerado.js
│   └── shell.gerado.js            ← OUTPUT (não editar!)
│
├── main.js                        ← processo principal do Electron
├── index.html                     ← UI do Electron
└── css/                           ← fonte do CSS (build_css.py → styles.css)
```

## Regras importantes

### Não faça isso
- Editar `scripts/dist/game-injector.js` ou `shell/shell.gerado.js` diretamente
- Rodar os `build.py` sem antes salvar as mudanças nos arquivos fonte

### Faça isso
- Editar sempre em `scripts/` (script do jogo) ou `shell/` (UI do Electron)
- Rodar o `build.py` correspondente após cada edição
- Verificar sintaxe com `node -c <arquivo gerado>`

### Crase dentro de CSS/HTML em template literal

Quase todo CSS e HTML deste projeto mora dentro de template literal (crase). Um
`/* ... */` ali dentro **não é comentário** — é texto da string. Se você
escrever uma crase nesse "comentário" (pra destacar um nome de classe, por
exemplo), ela **fecha a string no meio** e o resto vira expressão JS. O
`node -c` passa liso, porque a sintaxe fica válida; o erro só aparece em
runtime, e dentro de função `async` vira `Uncaught (in promise)
ReferenceError: <lixo> is not defined`.

`scripts/build.py` derruba o build quando detecta isso. Se ele acusar, tire a
crase do comentário — não tente escapar.

## Para criar um novo script

1. Crie `scripts/XX-nome-do-script.js` (XX = próximo número livre)
2. **Não** use IIFE própria — o código roda dentro da IIFE compartilhada
3. Use guard para evitar dupla execução se o script puder rodar mais de uma vez:
   ```javascript
   if (!window.__nomeUnico) {
       window.__nomeUnico = true;
       // seu código aqui
   }
   ```
4. Rode `python scripts/build.py`
5. Reinicie o Electron

## Comandos úteis

```bash
# Compilar scripts/ → scripts/dist/game-injector.js
python scripts/build.py

# Compilar shell/ → shell/shell.gerado.js
python shell/build_shell.py

# Verificar sintaxe
node -c scripts/dist/game-injector.js
node -c shell/shell.gerado.js
node -c main.js

# Checar onclick/chamadas órfãs (função referenciada mas não definida)
python scripts_orfaos.py
```
