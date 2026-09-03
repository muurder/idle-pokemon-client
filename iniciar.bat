@echo off
title Idle Pokemon Dev Suite
cd /d "%~dp0"

echo ========================================
echo   IDLE POKEMON DEV SUITE
echo ========================================
echo.

:: Matar processos Electron antigos
echo Verificando processos antigos...
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /I "electron" >nul
if %errorlevel% equ 0 (
    echo Matando processos Electron antigos...
    taskkill /F /IM electron.exe >nul 2>&1
    timeout /t 2 >nul
)

:: Verificar se os arquivos existem
echo Verificando arquivos...
if not exist "main.js" (
    echo ERRO: main.js nao encontrado!
    pause
    exit /b 1
)
if not exist "index.html" (
    echo ERRO: index.html nao encontrado!
    pause
    exit /b 1
)

:: Verificar se node_modules existe
if not exist "node_modules" (
    echo node_modules nao existe. Rodando npm install...
    call npm install
)

:: Iniciar Electron
echo.
echo Iniciando Electron...
echo.

:: Variaveis de ambiente para debug
set ELECTRON_ENABLE_LOGGING=1
set NODE_OPTIONS=--max-old-space-size=4096

:: Iniciar
npm start

echo.
echo Electron finalizado.
pause
