import xml.etree.ElementTree as E,re
from pathlib import Path
root=E.parse('backend/src/main/resources/payroll/Lohnsteuer2026.xml').getroot()
out=['package com.balance.app.work;','import java.math.BigDecimal;','/** Generated from official BMF PAP 2026 (23 October 2025). See docs/work-calendar.md.',' * Tax class I only: factor f is fixed to integer 1; decimal literals use strings. */','@SuppressWarnings("deprecation")','final class Lohnsteuer2026 {']
def exact(s):
 return re.sub(r'BigDecimal.valueOf\(\s*([0-9]+\.[0-9]+)\s*\)',lambda m:'new BigDecimal("'+m[1]+'")',s)
for group in list(root.find('VARIABLES'))+[root.find('CONSTANTS')]:
 for v in group:
  typ=v.get('type');name=v.get('name')
  if not typ:continue
  val=v.get('default') or v.get('value') or ('BigDecimal.ZERO' if typ=='BigDecimal' else '0')
  if typ=='double':typ='int';val='1'
  out.append(('static final ' if v.tag=='CONSTANT' else '')+typ+' '+name+' = '+exact(val)+';')
def emit(n):
 if n.tag=='EVAL':return exact(n.get('exec'))+';'
 if n.tag=='EXECUTE':return n.get('method')+'();'
 if n.tag=='IF':return 'if('+exact(n.get('expr'))+'){'+''.join(emit(c) for c in n.find('THEN'))+'}'+('else{'+''.join(emit(c) for c in n.find('ELSE'))+'}' if n.find('ELSE') is not None else '')
 raise ValueError(n.tag)
for n in root.find('METHODS'):
 out.append('void '+('calculate' if n.tag=='MAIN' else n.get('name'))+'(){'+''.join(emit(c) for c in n)+'}')
out.append('}')
p=Path('backend/src/main/java/com/balance/app/work');p.mkdir(exist_ok=True);(p/'Lohnsteuer2026.java').write_text('\n'.join(out),encoding='utf-8')
Path('backend/src/main/resources/payroll').mkdir(exist_ok=True);Path('backend/src/main/resources/payroll/Lohnsteuer2026.xml').write_bytes(Path('backend/src/main/resources/payroll/Lohnsteuer2026.xml').read_bytes())
