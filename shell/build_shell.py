import os
SHELL_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(SHELL_DIR, 'shell.gerado.js')

parts = []
for fn in sorted(f for f in os.listdir(SHELL_DIR) if f[:2].isdigit() and f.endswith('.js')):
    parts.append(open(os.path.join(SHELL_DIR, fn), encoding='utf-8').read())

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write(''.join(parts))
print('build ->', OUT)
