@echo off
setlocal enabledelayedexpansion
title Compilador de Executavel - Idle Pokemon Multi-Client
color 0b

REM ============================================================
REM  ATENCAO: os arquivos deste projeto sao GERADOS.
REM  index.html, main.js, preload.js, styles.css, shell\ e
REM  bug-test-suite.client.js saem de build_client.py, que roda
REM  no projeto do DEV. Editar aqui e perder a edicao no proximo
REM  build. O passo [1/4] abaixo regenera tudo antes de compilar.
REM ============================================================

cd /d "%~dp0"

echo ================================================================
echo      COMPILADOR DE EXECUTAVEL (.EXE) - IDLE POKEMON CLIENT
echo ================================================================
echo.

echo [1/4] Regenerando o projeto a partir do fonte do dev...
pushd "..\browser_pokemoon_dev"
python build_client.py
if errorlevel 1 (
    color 0c
    echo.
    echo  [ERRO] build_client.py falhou. NAO vou compilar um pacote
    echo         a partir de arquivos possivelmente desatualizados.
    popd
    pause
    exit /b 1
)
popd

echo.
echo [2/4] Verificando dependencias locais...
if not exist "node_modules\electron" (
    echo Instalando Electron...
    call npm install --save-dev electron@30.0.0
)

echo.
echo [3/4] Compilando executavel portatil...
call npx electron-builder --win portable

echo.
echo [4/4] Resultado:
echo ================================================================
if exist "dist\*.exe" (
    color 0a
    for %%F in ("dist\*.exe") do echo  [OK] %%~nxF  (%%~zF bytes^)
    echo ================================================================
    start "" explorer "%~dp0dist"
) else (
    color 0c
    echo  [AVISO] Nenhum .exe encontrado em dist\.
    echo  Veja a mensagem de erro acima.
    echo ================================================================
)

echo.
pause
