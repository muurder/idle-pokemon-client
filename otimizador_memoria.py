#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
otimizador_memoria.py — Otimizador de Memória RAM para Windows & Electron
=============================================================================
Utiliza a API nativa do Windows (EmptyWorkingSet via psapi.dll / kernel32.dll)
para liberar páginas de memória física ociosas e não referenciadas, aliviando
a pressão de RAM no sistema operacional sem reiniciar nem derrubar contas.
=============================================================================
"""

import sys
import os
import time
import argparse
import json
import ctypes
from ctypes import wintypes

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

try:
    import psutil
except ImportError:
    psutil = None

PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_SET_QUOTA = 0x0100
PROCESS_ALL_ACCESS = 0x1F0FFF

psapi = ctypes.windll.psapi
kernel32 = ctypes.windll.kernel32

def obter_status_ram():
    """Retorna estatísticas de memória RAM do sistema."""
    if psutil:
        vm = psutil.virtual_memory()
        return {
            'total_mb': round(vm.total / (1024 * 1024), 1),
            'livre_mb': round(vm.available / (1024 * 1024), 1),
            'usada_mb': round(vm.used / (1024 * 1024), 1),
            'percent': vm.percent
        }
    else:
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ('dwLength', wintypes.DWORD),
                ('dwMemoryLoad', wintypes.DWORD),
                ('ullTotalPhys', ctypes.c_uint64),
                ('ullAvailPhys', ctypes.c_uint64),
                ('ullTotalPageFile', ctypes.c_uint64),
                ('ullAvailPageFile', ctypes.c_uint64),
                ('ullTotalVirtual', ctypes.c_uint64),
                ('ullAvailVirtual', ctypes.c_uint64),
                ('ullAvailExtendedVirtual', ctypes.c_uint64),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        total = stat.ullTotalPhys / (1024 * 1024)
        avail = stat.ullAvailPhys / (1024 * 1024)
        used = total - avail
        return {
            'total_mb': round(total, 1),
            'livre_mb': round(avail, 1),
            'usada_mb': round(used, 1),
            'percent': round((used / total) * 100, 1)
        }

def limpar_processo(pid):
    """Executa EmptyWorkingSet em um processo específico."""
    h = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, False, pid)
    if not h:
        h = kernel32.OpenProcess(PROCESS_ALL_ACCESS, False, pid)
    if not h:
        return False
    try:
        ok = psapi.EmptyWorkingSet(h)
        return bool(ok)
    finally:
        kernel32.CloseHandle(h)

def executar_otimizacao(alvo='electron', otimizar_tudo=False):
    """Varre e otimiza processos alvos."""
    ram_antes = obter_status_ram()
    processos_otimizados = []
    total_economizado_bytes = 0

    alvos_secundarios = ['firefox', 'chrome', 'msedge', 'discord', 'spotify', 'steamwebhelper']

    if psutil:
        for p in psutil.process_iter(['pid', 'name', 'memory_info']):
            try:
                name = (p.info['name'] or '').lower()
                pid = p.info['pid']
                if pid <= 4:
                    continue

                eh_electron = 'electron' in name
                eh_secundario = any(s in name for s in alvos_secundarios)

                if eh_electron or (otimizar_tudo and eh_secundario):
                    mem_antes = p.info['memory_info'].rss
                    if limpar_processo(pid):
                        try:
                            mem_depois = p.memory_info().rss
                            diff = max(0, mem_antes - mem_depois)
                        except Exception:
                            diff = 0
                        total_economizado_bytes += diff
                        processos_otimizados.append({
                            'pid': pid,
                            'nome': p.info['name'],
                            'tipo': 'electron' if eh_electron else 'outro',
                            'antes_mb': round(mem_antes / (1024 * 1024), 1),
                            'depois_mb': round(mem_depois / (1024 * 1024), 1) if diff else round(mem_antes / (1024 * 1024), 1),
                            'economizado_mb': round(diff / (1024 * 1024), 1)
                        })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
    else:
        # Fallback sem psutil: tenta ler processos via toolhelp32
        pass

    ram_depois = obter_status_ram()
    ganho_mb = round(max(0, ram_depois['livre_mb'] - ram_antes['livre_mb']), 1)

    return {
        'timestamp': time.time(),
        'processos_count': len(processos_otimizados),
        'economizado_processos_mb': round(total_economizado_bytes / (1024 * 1024), 1),
        'ram_antes': ram_antes,
        'ram_depois': ram_depois,
        'ram_liberada_so_mb': ganho_mb,
        'detalhes': processos_otimizados[:15]
    }

def main():
    parser = argparse.ArgumentParser(description='Otimizador de Memória RAM para Electron & Windows')
    parser.add_argument('--loop', type=int, default=0, help='Roda em loop contínuo a cada N segundos (0 = roda apenas 1 vez)')
    parser.add_argument('--threshold', type=float, default=82.0, help='Percentual mínimo de RAM para acionar o trim no loop (padrão: 82.0%%)')
    parser.add_argument('--all', action='store_true', help='Otimiza também navegadores e programas secundários (Discord, Steam, etc.)')
    parser.add_argument('--json', action='store_true', help='Gera saída puramente em JSON (para integração com Electron IPC)')
    args = parser.parse_args()

    if args.json:
        res = executar_otimizacao(otimizar_tudo=args.all)
        print(json.dumps(res, ensure_ascii=False))
        return

    print('=' * 65)
    print('  ⚡ OTIMIZADOR DE MEMÓRIA RAM — IDLE POKÉMON SUITE')
    print('=' * 65)

    if args.loop <= 0:
        print('[*] Analisando memória física e processos do Electron...')
        res = executar_otimizacao(otimizar_tudo=args.all)
        antes = res['ram_antes']
        depois = res['ram_depois']

        print(f"\n[+] Processos otimizados: {res['processos_count']}")
        print(f"[+] Memória liberada nos processos: {res['economizado_processos_mb']} MB")
        print(f"\n--- ESTADO DA RAM DO WINDOWS ---")
        print(f"  Antes:  {antes['usada_mb']} MB usada / {antes['livre_mb']} MB livre ({antes['percent']}%)")
        print(f"  Depois: {depois['usada_mb']} MB usada / {depois['livre_mb']} MB livre ({depois['percent']}%)")
        print(f"  Ganho direto de RAM livre: +{res['ram_liberada_so_mb']} MB")
        print('=' * 65)
    else:
        print(f"[*] Modo monitor contínuo ativado: verificando a cada {args.loop}s")
        print(f"[*] Limite de ativação: RAM acima de {args.threshold}%\n")
        try:
            while True:
                ram = obter_status_ram()
                hora = time.strftime('%H:%M:%S')
                if ram['percent'] >= args.threshold:
                    print(f"[{hora}] ⚠️ RAM em {ram['percent']}% (acima de {args.threshold}%) -> Disparando otimização...", flush=True)
                    res = executar_otimizacao(otimizar_tudo=args.all)
                    print(f"[{hora}] 🟢 Concluído! Liberados {res['economizado_processos_mb']} MB nos processos. RAM agora em {res['ram_depois']['percent']}%\n", flush=True)
                else:
                    print(f"[{hora}] 💤 RAM em {ram['percent']}% ({ram['livre_mb']} MB livres) — Estável.", flush=True)
                time.sleep(args.loop)
        except KeyboardInterrupt:
            print('\n[*] Monitor encerrado pelo usuário.', flush=True)

if __name__ == '__main__':
    main()
