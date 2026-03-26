import sys, json, subprocess

try:
    out = subprocess.check_output(['python', '.agent/skills/frontend-design/scripts/ux_audit.py', '.', '--json'])
except subprocess.CalledProcessError as e:
    out = e.output

data = json.loads(out.decode('utf-8'))
with open('result.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
