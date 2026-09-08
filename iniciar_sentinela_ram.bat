@echo off
title Sentinela de RAM - Idle Pokemon Suite
cd /d "%~dp0"
echo =================================================================
echo   [*] SENTINELA DE MEMORIA RAM (Windows e Electron)
echo   Checa a cada 60s: dispara com RAM > 85%% e menos de 1500 MB livres
echo =================================================================
python otimizador_memoria.py --loop 60 --threshold 85 --piso-livre 1500 --histerese 8 --ganho-min 100 --verbose
pause
