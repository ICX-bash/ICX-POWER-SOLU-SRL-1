from pathlib import Path
p=Path('/home/ubuntu/icx-power-solutions/client/src/lib/siteData.ts')
s=p.read_text()
old='if (Object.keys(serviceTranslations.pl).length === 0) serviceTranslations.pl = serviceTranslations.en;\nif (Object.keys(serviceTranslations.ar).length === 0) serviceTranslations.ar = serviceTranslations.en;'
new='''for (const locale of Object.keys(serviceTranslations) as Locale[]) {\n  if (locale === "fr") continue;\n  for (const slug of Object.keys(serviceTranslations.en)) {\n    if (!serviceTranslations[locale][slug]) serviceTranslations[locale][slug] = serviceTranslations.en[slug];\n  }\n}'''
if old not in s: raise SystemExit('fallback block not found')
p.write_text(s.replace(old,new))
