// ==UserScript==
// @name         IdlePokemon - Bug Test Suite v2 (auto)
// @namespace    http://idlepokemoon.local
// @version      1.0
// @description  Injeta o Bug Test Suite v2 automaticamente no IdlePokemon
// @match        https://idlepokemoon.com.br/play
// @match        https://idlepokemoon.com.br/*
// @match        http://localhost:3000/*
// @grant        none
// @run-at       document-idle
// @inject-into  page
// @sandbox      raw
// @noframes
// ==/UserScript==

// =====================================================================
// ⚠️  PARA IA / DESENVOLVEDOR:
// =====================================================================
// ESTE ARQUIVO É GERADO POR build.py — NÃO EDITE DIRETAMENTE!
//
// FLUXO CORRETO:
//   1. Edite arquivos em scripts/*.js
//   2. Rode: python scripts/build.py
//   3. Reinicie o Electron
//
// DOCUMENTAÇÃO:
//   - scripts/MAPA.md     → O que cada arquivo faz
//   - CONTRIBUINDO.md     → Regras completas de edição
//
// NUNCA edite bug-test-suite.gerado.tampermonkey.js na raiz!
// =====================================================================

(function () {
    'use strict';

    console.log('%c[BUG SUITE] Tampermonkey script carregado', 'color:#facc15;font-weight:bold');

    // Evita injetar duas vezes (reloads agendados pelo próprio script)
    if (window.__bugSuiteCarregado) return;
    window.__bugSuiteCarregado = true;
