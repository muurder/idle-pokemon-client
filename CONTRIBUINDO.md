# 🤖 INSTRUÇÕES PARA IA — COMO EDITAR ESTE PROJETO

> **⚠️ REGRA #1: NUNCA edite `bug-test-suite.gerado.tampermonkey.js` diretamente!**
> Este arquivo é um **OUTPUT** do build, não fonte. Edições nele são perdidas
> quando `build.py` roda.

## Fluxo Obrigatório

```
1. Leia `scripts/MAPA.md` para entender qual arquivo editar
2. Edite APENAS em `scripts/XX-nome.js`
3. Rode `python scripts/build.py` para gerar o output
4. O arquivo gerado na raiz é reescrito automaticamente
5. O usuário reinicia o Electron
```

## Estrutura do Projeto

```
browser_pokemoon_dev/
├── scripts/                    ← FONTE (edite aqui!)
│   ├── _header.js              ← Abre IIFE (NÃO EDITAR)
│   ├── 01-core-estado.js       ← Variáveis globais
│   ├── 02-...36-...js          ← Módulos de funcionalidade
│   ├── 37-tabinfo.js           ← Barra "now playing"
│   ├── _footer.js              ← Fecha IIFE (NÃO EDITAR)
│   ├── build.py                ← Compilador (junta tudo)
│   └── MAPA.md                 ← Documentação de cada arquivo
│
├── bug-test-suite.gerado.tampermonkey.js  ← OUTPUT (NÃO EDITAR!)
├── main.js                     ← Processo principal do Electron
├── index.html                  ← UI do Electron
└── backups/                    ← Cópias de segurança
```

## Regras Importantes

### ❌ NÃO FAÇA ISSO:
- Editar `bug-test-suite.gerado.tampermonkey.js`
- Criar novos arquivos `.js` na raiz (exceto main.js, preload.js)
- Rodar `build.py` sem antes salvar as mudanças em `scripts/`

### ✅ FAÇA ISSO:
- Editar sempre em `scripts/`
- Rodar `build.py` após cada edição significativa
- Adicionar comentários explicando o que cada função faz
- Verificar sintaxe com `node -c bug-test-suite.gerado.tampermonkey.js`

### ⚠️ Crase dentro de CSS/HTML

Quase todo CSS e HTML do projeto mora dentro de template literal (crase). Um
`/* ... */` ali dentro **não é comentário** — é texto da string. Se você escrever
uma crase nele (pra destacar um nome de classe, por exemplo), ela **fecha a
string no meio** e o resto vira expressão JS. O `node -c` passa liso, porque a
sintaxe fica válida; o erro só aparece no runtime, e dentro de função `async`
vira `Uncaught (in promise) ReferenceError: <lixo> is not defined`.

O `build.py` derruba o build quando isso acontece. Se ele acusar, tire a crase
do comentário — não tente escapar.

## Para Criar um Novo Script

1. Crie `scripts/XX-nome-do-script.js` (XX = próximo número)
2. **NÃO** use IIFE própria — o código roda dentro da IIFE do `_header.js`
3. Use guard para evitar dupla execução:
   ```javascript
   if (!window.__nomeUnico) {
       window.__nomeUnico = true;
       // seu código aqui
   }
   ```
4. Rode `python scripts/build.py`
5. Reinicie Electron

## Comandos Úteis

```bash
# Compilar scripts/ → gerado
python scripts/build.py

# Verificar sintaxe do gerado
node -c bug-test-suite.gerado.tampermonkey.js

# Verificar depth de chaves (deve ser 0)
node -e "const s=require('fs').readFileSync('bug-test-suite.gerado.tampermonkey.js','utf8'); let d=0; for(const c of s){if(c==='{')d++;if(c==='}')d--;} console.log('Depth:',d);"

# Verificar sefunções-chave existem
grep -c "__getIdleAuto\|__setIdleAuto\|__getTabInfo" bug-test-suite.gerado.tampermonkey.js
```

## Arquivos Mais Editados

| Arquivo | O que é | Quando editar |
|---------|---------|---------------|
| `26-auto-hunt-matriz.js` | Auto Hunt | Mudar lógica de caçada, detecção de troca |
| `07-ui-build.js` | UI do drawer | Mudar layout, adicionar abas, estilos |
| `19-toggles-auto.js` | Toggles auto | Mudar sincronização sidebar ↔ menu |
| `30-motor-farm.js` | Loop principal | Mudar combate, drops, XP |
| `20-cidade-utils.js` | Topbar pins | Mudar pins 📌, atalhos |
| `01-core-estado.js` | Variáveis | Adicionar novo estado global |
