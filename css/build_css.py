import os
CSS_DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(CSS_DIR, os.pardir, 'styles.css')

parts = []
for fn in sorted(f for f in os.listdir(CSS_DIR) if f[:2].isdigit() and f.endswith('.css')):
    parts.append(open(os.path.join(CSS_DIR, fn), encoding='utf-8').read())

with open(OUT, 'w', encoding='utf-8') as fh:
    fh.write(''.join(parts))
print('build ->', os.path.abspath(OUT))
