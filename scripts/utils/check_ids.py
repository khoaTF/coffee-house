import re

with open('public/index.html', encoding='utf-8') as f: html = f.read()
with open('public/js/customer.js', encoding='utf-8') as f: js = f.read()

html_ids = set()
for m in re.finditer(r'id=["\']([^"\']+)["\']', html): 
    html_ids.add(m.group(1))

js_ids = set()
for m in re.finditer(r'getElementById\([\'"]([^\'"]+)[\'"]\)', js): 
    js_ids.add(m.group(1))

missing = js_ids - html_ids
for m in missing:
    print("Missing ID:", m)
