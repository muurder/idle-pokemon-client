@echo off
title Sentinela de RAM - Idle Pokemon Suite
cd /d "%~dp0"
echo =================================================================
echo   [*] SENTINELA DE MEMORIA RAM (Windows e Electron)
echo   Verificando a cada 60s se a RAM ultrapassa 75%%
echo =================================================================
python otimizador_memoria.py --loop 60 --threshold 75
pause
