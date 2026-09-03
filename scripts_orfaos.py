# -*- coding: utf-8 -*-
"""Acha chamadas de funcao sem definicao no bundle gerado do cliente.

Nao e analise semantica: e regex sobre `function NOME` / `NOME = (...) =>` /
`NOME(`. Serve pra achar o que a poda deixou pendurado -- e so isso.
Falso positivo aqui custa um stub a mais; falso negativo custa um
ReferenceError na cara do cliente, entao a lista de globais conhecidas
abaixo e deliberadamente curta.
"""
import io
import os
import re
import sys

CLI = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   os.pardir, 'browser_pokemoon_client'))

GLOBAIS = set("""
if for while switch catch return typeof function new delete void yield await
String Number Boolean Array Object JSON Math Date RegExp Error Promise Map Set
WeakMap WeakSet Symbol BigInt Proxy Reflect Intl URL URLSearchParams Blob File
FileReader FormData Headers Request Response AbortController TextEncoder
TextDecoder parseInt parseFloat isNaN isFinite encodeURIComponent
decodeURIComponent encodeURI decodeURI setTimeout setInterval clearTimeout
clearInterval requestAnimationFrame cancelAnimationFrame queueMicrotask fetch
alert confirm prompt console document window navigator localStorage
sessionStorage location history screen performance CustomEvent Event
MutationObserver ResizeObserver IntersectionObserver getComputedStyle
structuredClone require module exports process Buffer __dirname
Uint8Array Int8Array Float32Array Float64Array ArrayBuffer DataView
""".split())


def carregar(caminho):
    return io.open(caminho, encoding='utf-8', errors='replace').read()


def definidas(texto):
    nomes = set()
    nomes |= set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', texto))
    # const/let/var NOME = function | (args) => | async (args) =>
    nomes |= set(re.findall(
        r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)',
        texto))
    # window.NOME = ... / NOME: function(...)
    nomes |= set(re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=', texto))
    # parametros e variaveis quaisquer: reduz falso positivo de callback
    nomes |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)', texto))
    nomes |= set(re.findall(r'\bfunction\s*\(([^)]*)\)', texto and '') or [])
    return nomes


def chamadas(texto):
    # NOME( sem . nem palavra antes (evita obj.metodo() e `new Classe(`)
    return set(m.group(1) for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', texto))


def main():
    bundle = carregar(os.path.join(CLI, 'shell', 'shell.gerado.js'))
    html = carregar(os.path.join(CLI, 'index.html'))

    defs = definidas(bundle) | GLOBAIS
    # parametros de funcao contam como definidos
    for grupo in re.findall(r'function[^(]*\(([^)]*)\)', bundle):
        for p in grupo.split(','):
            p = p.strip().split('=')[0].strip().lstrip('.')
            if re.match(r'^[A-Za-z_$][\w$]*$', p):
                defs.add(p)
    for grupo in re.findall(r'\(([^()]*)\)\s*=>', bundle):
        for p in grupo.split(','):
            p = p.strip().split('=')[0].strip()
            if re.match(r'^[A-Za-z_$][\w$]*$', p):
                defs.add(p)

    faltando_js = sorted(n for n in chamadas(bundle) if n not in defs)
    # onclick="foo(...)" no HTML
    onclicks = set()
    for atr in re.findall(r'on\w+\s*=\s*"([^"]*)"', html):
        onclicks |= set(re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', atr))
    faltando_html = sorted(n for n in onclicks if n not in defs)

    print('=== chamadas no shell.gerado.js sem definicao (%d) ===' % len(faltando_js))
    for n in faltando_js:
        print('   ', n)
    print('')
    print('=== onclick no index.html sem definicao (%d) ===' % len(faltando_html))
    for n in faltando_html:
        print('   ', n)
    return 1 if (faltando_js or faltando_html) else 0


if __name__ == '__main__':
    sys.exit(main())
