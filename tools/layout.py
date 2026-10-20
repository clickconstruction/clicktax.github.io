#!/usr/bin/env python3
"""Prints a form's widget layout from the draft JSON: python3 tools/layout.py <form> <year> [otherYear]."""
import json, sys
form, year = sys.argv[1], sys.argv[2]
other = sys.argv[3] if len(sys.argv) > 3 else None
base = 'packages/forms/pdf'
d = json.load(open(f'{base}/{year}/{form}.draft.json'))
for it in d:
    n = it['pdfField'].replace('topmostSubform[0].', '').replace('[0]', '')
    print(f"p{it['page']} {it['type'][:5]:5} x{it['x']:<6g} y{it['y']:<6g} w{it['w']:<6g} {n:60} | {it['leftTok'][:14]:14} | {it['rowText'][:70]}")
if other:
    a = [x['pdfField'] for x in d]; b = [x['pdfField'] for x in json.load(open(f'{base}/{other}/{form}.draft.json'))]
    sa, sb = set(a), set(b)
    print(f"\n{year} vs {other}: same names = {a == b}; only-{year} ({len(sa-sb)}): {sorted(sa-sb)[:30]}; only-{other} ({len(sb-sa)}): {sorted(sb-sa)[:30]}")
