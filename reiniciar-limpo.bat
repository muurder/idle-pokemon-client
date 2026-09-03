@echo off
title Reiniciar Limpando Sessões
cd /d "%~dp0"

echo ========================================
echo   REINICIANDO LIMPANDO SESSÕES
echo ========================================
echo.

:: 1. Matar processos antigos
echo [1/4] Fechando processos Electron antigos...
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 >nul

:: 2. Limpar sessões
echo [2/4] Limpando sessões...
if exist "%APPDATA%\browser-pokemoon\Partitions" (
    rmdir /S /Q "%APPDATA%\browser-pokemoon\Partitions" 2>nul
    echo   Sessões limpas!
) else (
    echo   Nenhuma sessão antiga encontrada
)

:: 3. Limpar logs antigos
echo [3/4] Limpando logs antigos...
del /F /Q "%~dp0debug-startup.log" 2>nul
del /F /Q "%~dp0debug-startup-advanced.log" 2>nul
del /F /Q "%~dp0debug-console.log" 2>nul

:: 4. Iniciar Electron
echo [4/4] Iniciando Electron...
echo.
set ELECTRON_ENABLE_LOGGING=1
set NODE_OPTIONS=--max-old-space-size=4096
npm start

echo.
echo Electron finalizado.
