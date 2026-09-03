import os
import datetime

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPTS_DIR, 'dist')
OUT = os.path.join(OUT_DIR, 'game-injector.js')

# Carimbo do build: entra no bundle e vai pro log do Auto Hunt, pra dar pra
# saber QUAL build produziu um log (webview com script antigo em memoria e
# indistinguivel de um bug, sem isso).
BUILD_ID = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')


# ---------------------------------------------------------------------------
# GUARDA: crase dentro de "comentario" que na verdade e texto de template
# ---------------------------------------------------------------------------
# Quase todo CSS/HTML do projeto mora dentro de template literal (crase). Um
# /* ... */ escrito ali dentro NAO e comentario pro parser: e texto da string.
# Entao uma crase escrita nesse "comentario" FECHA a string no meio, e o que
# vem depois vira expressao JS.
#
# Em 01/09/2026 isso derrubou o painel v2 inteiro. A linha era:
#     O fechar agora e o `.isuite-x` do jogo
# e o parser leu:
#     `...css...` .isuite - x + `...resto do css...`
# ou seja, "ReferenceError: x is not defined" no runtime, dentro de uma funcao
# async -> aparece como "Uncaught (in promise)". `node --check` passa liso,
# porque a SINTAXE e valida; o erro so existe em tempo de execucao.
#
# O scanner abaixo percorre o arquivo como o parser percorreria (codigo,
# string, template, comentario, regex) e acusa todo template que fecha com um
# /* ou // aberto dentro dele — que e exatamente essa pegadinha.
INICIO_REGEX = set('(,=:[!&|?{};+-*%~^')


def checar_crase_em_comentario(nome, texto):
    problemas = []
    ctx = [{'tipo': 'code', 'sub': 'plain'}]
    i, n, linha = 0, len(texto), 1
    ultimo = ''  # ultimo char significativo, p/ separar regex de divisao

    while i < n:
        c = texto[i]
        prox = texto[i + 1] if i + 1 < n else ''
        topo = ctx[-1]

        if c == '\n':
            linha += 1
            if topo['tipo'] == 'code' and topo['sub'] == 'line':
                topo['sub'] = 'plain'
            elif topo['tipo'] == 'tpl':
                topo['linha_com'] = None
            i += 1
            continue

        if topo['tipo'] == 'tpl':
            if c == '\\':
                i += 2
                continue
            if c == '$' and prox == '{':
                ctx.append({'tipo': 'code', 'sub': 'plain', 'interp': True})
                i += 2
                continue
            if c == '`':
                if topo['bloco'] is not None:
                    problemas.append((nome, topo['bloco'], 'crase dentro de /* */ no meio de um template'))
                elif topo['linha_com'] is not None:
                    problemas.append((nome, topo['linha_com'], 'crase dentro de // no meio de um template'))
                ctx.pop()
                i += 1
                continue
            if c == '/' and prox == '*' and topo['bloco'] is None:
                topo['bloco'] = linha
                i += 2
                continue
            if c == '*' and prox == '/' and topo['bloco'] is not None:
                topo['bloco'] = None
                i += 2
                continue
            if c == '/' and prox == '/' and topo['bloco'] is None and topo['linha_com'] is None:
                topo['linha_com'] = linha
                i += 2
                continue
            i += 1
            continue

        sub = topo['sub']
        if sub == 'line':
            i += 1
            continue
        if sub == 'block':
            if c == '*' and prox == '/':
                topo['sub'] = 'plain'
                i += 2
                continue
            i += 1
            continue
        if sub in ('sq', 'dq'):
            if c == '\\':
                i += 2
                continue
            if (sub == 'sq' and c == "'") or (sub == 'dq' and c == '"'):
                topo['sub'] = 'plain'
            i += 1
            continue

        # sub == 'plain' (codigo de verdade)
        if c == '/' and prox == '/':
            topo['sub'] = 'line'
            i += 2
            continue
        if c == '/' and prox == '*':
            topo['sub'] = 'block'
            i += 2
            continue
        if c == '/' and (ultimo == '' or ultimo in INICIO_REGEX):
            # literal de regex: consome ate a barra final, respeitando [...]
            i += 1
            classe = False
            while i < n:
                d = texto[i]
                if d == '\\':
                    i += 2
                    continue
                if d == '\n':
                    linha += 1
                    break
                if d == '[':
                    classe = True
                elif d == ']':
                    classe = False
                elif d == '/' and not classe:
                    i += 1
                    break
                i += 1
            ultimo = '/'
            continue
        if c == "'":
            topo['sub'] = 'sq'
            i += 1
            continue
        if c == '"':
            topo['sub'] = 'dq'
            i += 1
            continue
        if c == '`':
            ctx.append({'tipo': 'tpl', 'bloco': None, 'linha_com': None})
            i += 1
            continue
        if c == '}' and topo.get('interp') and len(ctx) > 1:
            ctx.pop()
            i += 1
            continue
        if not c.isspace():
            ultimo = c
        i += 1

    return problemas


parts = []
problemas = []
parts.append(open(os.path.join(SCRIPTS_DIR, '_header.js'), encoding='utf-8').read())
parts.append("    window.__bugSuiteBuild = %r;" % BUILD_ID)
for fn in sorted(f for f in os.listdir(SCRIPTS_DIR) if f[:2].isdigit() and f.endswith('.js')):
    texto = open(os.path.join(SCRIPTS_DIR, fn), encoding='utf-8').read()
    problemas += checar_crase_em_comentario(fn, texto)
    parts.append(texto)
parts.append(open(os.path.join(SCRIPTS_DIR, '_footer.js'), encoding='utf-8').read())

if problemas:
    print('BUILD ABORTADO - crase fechando template no meio de um comentario:')
    for nome, linha, motivo in problemas:
        print('  %s:%d  %s' % (nome, linha, motivo))
    print('Tire as crases desse comentario: la dentro elas nao sao decoracao,')
    print('sao o fim da string. Ver o bloco GUARDA no topo deste build.py.')
    raise SystemExit(1)

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write('\n'.join(parts))
print('build ->', OUT, '| id:', BUILD_ID)
