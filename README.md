# Idle Pokémon — Cliente Multi-Contas

Cliente desktop (Electron) para jogar Idle Pokémon com várias contas ao mesmo
tempo, cada uma isolada em sua própria sessão (`persist:accN`).

## Funcionalidades

- Várias contas em abas ou em modo grid (várias telas ao mesmo tempo)
- Tracker de XP/ETA injetado no card do treinador e no mini-dashboard
- Doca de Hunts: navegar, buscar e favoritar zonas de caça
- Doca de Custo de Captura: calculadora de custo por captura
- Atualização automática via GitHub Releases (`electron-updater`)

## Como iniciar

```bash
npm install
npm start
```

## Atalhos de teclado

| Atalho | Ação |
| :--- | :--- |
| `Alt + 1` até `Alt + 9`, `Alt + 0` | Trocar de conta (funciona mesmo com o jogo em foco) |
| `Ctrl + G` | Alternar modo Grid / Abas |
| `Ctrl + Alt + R` | Reiniciar o app completamente |
| `Ctrl + Shift + R` | Recarregar todas as contas |
| `F5` | Recarregar a conta ativa |
| `Shift + C` | Abrir/fechar a doca de Custo de Captura |
| `Shift + B` | Abrir Time & Box (do próprio jogo) |
| `Shift + I` | Abrir Inventário (do próprio jogo) |

## Build e release

Veja [CONTRIBUINDO.md](CONTRIBUINDO.md) para o fluxo de edição dos scripts
injetados e `.github/workflows/release.yml` para o processo de release
(tag `vX.Y.Z` → build → publish no GitHub Releases → auto-update nos clientes
instalados).
