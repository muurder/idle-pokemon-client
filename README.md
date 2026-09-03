# 🛠️ Idle Pokémon — Dev Suite (Ambiente de Testes)

Ambiente completo de desenvolvimento, testes e automação avançada com isolamento total para **Idle Pokémon**.

---

## 📌 Diferenças entre as Versões

| Recurso | `browser_pokemoon` (Comunitário) | `browser_pokemoon_dev` (Ambiente Dev/Testes) |
| :--- | :---: | :---: |
| **Público-Alvo** | Jogadores / Distribuição Pública | Desenvolvimento, Testes & Diagnósticos |
| **Partições & Isolamento** | `browser_pokemoon_community_data` | `browser_pokemoon_dev_data` |
| **Limite de Contas** | 3 Contas fixas | Até 16 Contas simultâneas |
| **Injeção de Scripts (Tampermonkey)** | ❌ Bloqueado | ✅ Ativo (`bug-test-suite`, `xp-tracker`, etc.) |
| **Editor de Scripts em Tempo Real** | ❌ Não | ✅ Ativo (`Ctrl + E`) |
| **Gerenciador de Proxies (Webshare/IP:Port)** | ❌ Conexão Direta | ✅ Ativo (`Ctrl + P` com teste de IP em tempo real) |
| **Monitor de Drops & Inventário** | ❌ Não | ✅ Ativo (`Ctrl + L`) |
| **Trade Hub & Central de Trocas** | ❌ Não | ✅ Ativo (`Ctrl + T`) |
| **Avaliador Meta & Estatísticas** | ❌ Não | ✅ Ativo (`Ctrl + M`) |
| **Suporte Multi-Monitores** | ❌ Automático | ✅ Seleção dinâmica de telas com 1 clique |

---

## 🚀 Como Iniciar

Você pode iniciar o cliente de testes de duas maneiras:

1. **Pela Raiz:**
   * Dê dois cliques em `iniciar-cliente-dev.bat`
2. **Dentro desta pasta (`browser_pokemoon_dev`):**
   * Dê dois cliques em `iniciar.bat`
   * Ou pelo terminal: `npm start` ou `npx electron .`

---

## ⌨️ Atalhos Principais no Ambiente DEV

* **`Ctrl + 1` até `Ctrl + 9`**: Alternar entre contas ativas
* **`Ctrl + G`**: Alternar modo Grid Multi-Telas / Tela Cheia
* **`Ctrl + E`**: Abrir Editor de Scripts e Automações em Tempo Real
* **`Ctrl + P`**: Abrir Painel de Configuração e Diagnóstico de Proxies
* **`Ctrl + L`**: Abrir Monitor de Drops e Inventário
* **`Ctrl + T`**: Abrir Central de Trade Automatizada
* **`Ctrl + M`**: Abrir Calculadora e Avaliador Meta
* **`Ctrl + Alt + R`**: Reiniciar o Electron completamente
* **`Ctrl + Shift + R`**: Recarregar todas as contas simultaneamente
