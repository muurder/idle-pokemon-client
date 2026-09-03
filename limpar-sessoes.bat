@echo off
title Limpando Sessoes do Electron...
echo ========================================
echo   LIMPANDO SESSOES E PROXIES ANTIGOS
echo ========================================
echo.
echo Fechando Electron se estiver aberto...
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

echo Limpando dados de sessao...
cd /d "%~dp0"
npx electron . --clear-sessions

echo.
echo Pronto! O Electron deve reiniciar automaticamente.
echo Se nao reiniciar, execute: iniciar.bat
pause
