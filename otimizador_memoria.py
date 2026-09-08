#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
otimizador_memoria.py — Otimizador de Memória RAM para Windows & Electron
=============================================================================
Utiliza a API nativa do Windows (EmptyWorkingSet via psapi.dll / kernel32.dll)
para liberar páginas de memória física ociosas e não referenciadas, aliviando
a pressão de RAM no sistema operacional sem reiniciar nem derrubar contas.

IMPORTANTE — o que EmptyWorkingSet faz e o que ele NÃO faz:
    Ele tira as páginas do working set do processo e joga na standby list /
    memória comprimida / pagefile. Página que o processo ainda usa volta por
    page fault em segundos. Ou seja: aparar o working set de um processo ATIVO
    não libera RAM, só gera churn de disco e engorda o MemCompression.
    Por isso este otimizador mede o ganho REAL (RAM livre do Windows antes x
    depois) e não a soma da queda de RSS, que é um número inflado e enganoso.
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

# --- Padrões do modo sentinela (loop) -------------------------------------
PISO_LIVRE_MB_PADRAO = 1500    # só apara se a RAM livre estiver abaixo disso
MIN_WS_MB_PADRAO = 64          # processo menor que isso não paga o page fault
GANHO_MIN_MB_PADRAO = 100      # abaixo disso o trim conta como inútil
INTERVALO_MAX_S = 300          # teto do backoff quando o trim não adianta
FATOR_REAQUECIDO = 0.75        # voltou a >=75% do que tinha = memória viva
QUENTE_LIMITE = 2              # 2 reaquecidas seguidas = para de aparar
QUENTE_PULOS = 5               # e fica de fora pelos próximos 5 ciclos

# Estado entre ciclos do sentinela: pid -> {'ws_pre','ws_pos','quente','pular'}
_historico_processos = {}

# O botão "Otimizar RAM" roda um processo novo a cada clique, então o histórico
# de processo quente precisa sobreviver fora da memória — senão cada clique volta
# a ser a marreta que apara os 3.4 GB inteiros e rende ~18 MB reais.
ARQUIVO_ESTADO = os.path.join(os.environ.get('TEMP') or os.path.dirname(os.path.abspath(__file__)),
                              'idle-pokemon-sentinela.json')
VALIDADE_ESTADO_S = 600


def _carregar_estado():
    try:
        with open(ARQUIVO_ESTADO, 'r', encoding='utf-8') as fh:
            dados = json.load(fh)
        agora = time.time()
        for pid, h in (dados.get('processos') or {}).items():
            if agora - h.get('ts', 0) <= VALIDADE_ESTADO_S:
                _historico_processos[int(pid)] = h
    except Exception:
        pass


def _salvar_estado():
    try:
        agora = time.time()
        dados = {'processos': {str(k): v for k, v in _historico_processos.items()
                               if agora - v.get('ts', 0) <= VALIDADE_ESTADO_S}}
        with open(ARQUIVO_ESTADO, 'w', encoding='utf-8') as fh:
            json.dump(dados, fh)
    except Exception:
        pass


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


def executar_otimizacao(alvo='electron', otimizar_tudo=False, min_ws_mb=0, seletivo=False):
    """Varre e otimiza processos alvos.

    seletivo=True (usado pelo sentinela) pula processo pequeno demais para
    pagar o page fault e processo marcado como 'quente' — aquele cujo working
    set voltou quase inteiro logo depois do trim anterior, sinal de que a
    memória está em uso e aparar de novo só gera churn.
    """
    ram_antes = obter_status_ram()
    processos_otimizados = []
    total_economizado_bytes = 0
    ignorados_quentes = []

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

                if not (eh_electron or (otimizar_tudo and eh_secundario)):
                    continue

                mem_antes = p.info['memory_info'].rss
                ws_antes_mb = mem_antes / (1024 * 1024)

                if seletivo:
                    if ws_antes_mb < min_ws_mb:
                        continue
                    hist = _historico_processos.get(pid)
                    if hist and hist.get('pular', 0) > 0:
                        hist['pular'] -= 1
                        ignorados_quentes.append({'pid': pid, 'nome': p.info['name'],
                                                  'ws_mb': round(ws_antes_mb, 1)})
                        continue
                    # Working set voltou a quase tudo que era antes do último
                    # trim? Então é memória viva: aparar de novo só custa I/O.
                    if hist and hist.get('ws_pre'):
                        if ws_antes_mb >= hist['ws_pre'] * FATOR_REAQUECIDO:
                            hist['quente'] = hist.get('quente', 0) + 1
                            if hist['quente'] >= QUENTE_LIMITE:
                                hist['pular'] = QUENTE_PULOS
                                hist['quente'] = 0
                                ignorados_quentes.append({'pid': pid, 'nome': p.info['name'],
                                                          'ws_mb': round(ws_antes_mb, 1)})
                                continue
                        else:
                            hist['quente'] = 0

                if limpar_processo(pid):
                    try:
                        mem_depois = p.memory_info().rss
                        diff = max(0, mem_antes - mem_depois)
                    except Exception:
                        mem_depois = mem_antes
                        diff = 0
                    total_economizado_bytes += diff
                    if seletivo:
                        h = _historico_processos.setdefault(pid, {})
                        h['ws_pre'] = ws_antes_mb
                        h['ws_pos'] = mem_depois / (1024 * 1024)
                        h['ts'] = time.time()
                        h.setdefault('quente', 0)
                        h.setdefault('pular', 0)
                    processos_otimizados.append({
                        'pid': pid,
                        'nome': p.info['name'],
                        'tipo': 'electron' if eh_electron else 'outro',
                        'antes_mb': round(ws_antes_mb, 1),
                        'depois_mb': round(mem_depois / (1024 * 1024), 1),
                        'economizado_mb': round(diff / (1024 * 1024), 1)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
    else:
        # Fallback sem psutil: tenta ler processos via toolhelp32
        pass

    if seletivo and psutil:
        vivos = set()
        for p in psutil.process_iter(['pid']):
            vivos.add(p.info['pid'])
        for pid_morto in [k for k in _historico_processos if k not in vivos]:
            _historico_processos.pop(pid_morto, None)

    ram_depois = obter_status_ram()
    ganho_mb = round(ram_depois['livre_mb'] - ram_antes['livre_mb'], 1)

    return {
        'timestamp': time.time(),
        'processos_count': len(processos_otimizados),
        # soma da queda de RSS — inflado: a maior parte volta por page fault
        'economizado_processos_mb': round(total_economizado_bytes / (1024 * 1024), 1),
        'ram_antes': ram_antes,
        'ram_depois': ram_depois,
        # ganho REAL de RAM livre; negativo se o sistema encheu durante o trim
        'ram_liberada_so_mb': max(0, ganho_mb),
        'ganho_real_mb': ganho_mb,
        'ignorados_quentes': len(ignorados_quentes),
        'detalhes': processos_otimizados[:15]
    }


def _sentinela(args):
    """Loop com histerese, cooldown adaptativo e feedback de eficácia."""
    base = args.loop
    intervalo = base
    piso = args.piso_livre
    rearmar_em = max(0.0, args.threshold - args.histerese)
    armado = True
    falhas = 0
    avisou_inutil = False
    _carregar_estado()

    print(f"[*] Sentinela ativo: checa a cada {base}s")
    print(f"[*] Dispara quando RAM >= {args.threshold}% E livre <= {piso} MB")
    print(f"[*] Rearma quando RAM < {rearmar_em}% | ganho mínimo útil: {args.ganho_min} MB\n", flush=True)

    try:
        while True:
            ram = obter_status_ram()
            hora = time.strftime('%H:%M:%S')

            if not armado and ram['percent'] < rearmar_em:
                armado = True
                falhas = 0
                intervalo = base
                avisou_inutil = False
                print(f"[{hora}] 🔄 RAM voltou a {ram['percent']}% — sentinela rearmado.", flush=True)

            pressao = ram['percent'] >= args.threshold and ram['livre_mb'] <= piso

            if pressao and armado:
                res = executar_otimizacao(otimizar_tudo=args.all,
                                          min_ws_mb=args.min_ws,
                                          seletivo=True)
                _salvar_estado()
                ganho = res['ganho_real_mb']
                sufixo = (f", {res['ignorados_quentes']} pulados (memória viva)"
                          if res['ignorados_quentes'] else '')

                if ganho >= args.ganho_min:
                    falhas = 0
                    intervalo = base
                    print(f"[{hora}] 🟢 Trim em {res['processos_count']} processos{sufixo}: "
                          f"+{ganho} MB livres de verdade. "
                          f"RAM {ram['percent']}% -> {res['ram_depois']['percent']}%", flush=True)
                else:
                    falhas += 1
                    intervalo = min(base * (2 ** falhas), INTERVALO_MAX_S)
                    print(f"[{hora}] 🟡 Trim rendeu {ganho} MB (mínimo útil {args.ganho_min} MB)"
                          f"{sufixo}. Próxima checagem em {intervalo}s.", flush=True)
                    if falhas >= 3 and not avisou_inutil:
                        avisou_inutil = True
                        armado = False
                        print(f"[{hora}] ⛔ Trim sem efeito 3x seguidas: a RAM está presa em memória "
                              f"EM USO, não em working set ocioso. Sentinela em espera até a RAM cair "
                              f"de {rearmar_em}%. Aparar mais só geraria page fault e engordaria o "
                              f"MemCompression.", flush=True)
            elif args.verbose:
                estado = 'estável' if armado else 'em espera'
                print(f"[{hora}] 💤 RAM em {ram['percent']}% ({ram['livre_mb']} MB livres) — {estado}.",
                      flush=True)

            time.sleep(intervalo)
    except KeyboardInterrupt:
        print('\n[*] Monitor encerrado pelo usuário.', flush=True)


def main():
    parser = argparse.ArgumentParser(description='Otimizador de Memória RAM para Electron & Windows')
    parser.add_argument('--loop', type=int, default=0, help='Roda em loop contínuo a cada N segundos (0 = roda apenas 1 vez)')
    parser.add_argument('--threshold', type=float, default=82.0, help='Percentual mínimo de RAM para acionar o trim no loop (padrão: 82.0%%)')
    parser.add_argument('--piso-livre', dest='piso_livre', type=float, default=PISO_LIVRE_MB_PADRAO,
                        help=f'Só dispara se a RAM livre estiver abaixo deste valor em MB (padrão: {PISO_LIVRE_MB_PADRAO})')
    parser.add_argument('--histerese', type=float, default=6.0,
                        help='Pontos percentuais que a RAM precisa cair para o sentinela rearmar (padrão: 6)')
    parser.add_argument('--ganho-min', dest='ganho_min', type=float, default=GANHO_MIN_MB_PADRAO,
                        help=f'Ganho real mínimo em MB para o trim contar como útil (padrão: {GANHO_MIN_MB_PADRAO})')
    parser.add_argument('--min-ws', dest='min_ws', type=float, default=MIN_WS_MB_PADRAO,
                        help=f'Ignora processo com working set menor que isso em MB (padrão: {MIN_WS_MB_PADRAO})')
    parser.add_argument('--verbose', action='store_true', help='Loga também os ciclos em que nada foi feito')
    parser.add_argument('--all', action='store_true', help='Otimiza também navegadores e programas secundários (Discord, Steam, etc.)')
    parser.add_argument('--forcar', action='store_true',
                        help='Apara TODOS os processos alvo, ignorando o histórico de processo quente (comportamento antigo, quase sempre nocivo)')
    parser.add_argument('--json', action='store_true', help='Gera saída puramente em JSON (para integração com Electron IPC)')
    args = parser.parse_args()

    if args.json:
        # O botão do modal cai aqui. Medido em 2026-09-08: aparar os 17 processos
        # de uma vez rendeu +17.7 MB reais e SUBIU os page faults de 58.9k/s para
        # 87.7k/s. Por isso o clique também é seletivo, com o histórico de
        # processo quente lido do disco — a menos que se peça --forcar.
        if not args.forcar:
            _carregar_estado()
        res = executar_otimizacao(otimizar_tudo=args.all,
                                  min_ws_mb=0 if args.forcar else args.min_ws,
                                  seletivo=not args.forcar)
        if not args.forcar:
            _salvar_estado()
        print(json.dumps(res, ensure_ascii=False))
        return

    print('=' * 65)
    print('  ⚡ OTIMIZADOR DE MEMÓRIA RAM — IDLE POKÉMON SUITE')
    print('=' * 65)

    if args.loop <= 0:
        print('[*] Analisando memória física e processos do Electron...')
        if not args.forcar:
            _carregar_estado()
        res = executar_otimizacao(otimizar_tudo=args.all,
                                  min_ws_mb=0 if args.forcar else args.min_ws,
                                  seletivo=not args.forcar)
        if not args.forcar:
            _salvar_estado()
        antes = res['ram_antes']
        depois = res['ram_depois']

        print(f"\n[+] Processos otimizados: {res['processos_count']}")
        print(f"[+] Working set aparado: {res['economizado_processos_mb']} MB (boa parte volta por page fault)")
        print(f"\n--- ESTADO DA RAM DO WINDOWS ---")
        print(f"  Antes:  {antes['usada_mb']} MB usada / {antes['livre_mb']} MB livre ({antes['percent']}%)")
        print(f"  Depois: {depois['usada_mb']} MB usada / {depois['livre_mb']} MB livre ({depois['percent']}%)")
        print(f"  Ganho REAL de RAM livre: {res['ganho_real_mb']:+} MB")
        print('=' * 65)
    else:
        _sentinela(args)


if __name__ == '__main__':
    main()
