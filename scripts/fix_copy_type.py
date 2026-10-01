from pathlib import Path
p = Path('/home/ubuntu/icx-power-solutions/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace('  const copy = translations[locale].ui;\n  const { user } = useAuth();', '  const copy = { ...translations[locale].ui, ...siteCopy[locale] };\n  const { user } = useAuth();', 1)
p.write_text(s)
