from pathlib import Path
p=Path('/home/ubuntu/icx-power-solutions/client/src/pages/Home.tsx')
s=p.read_text()
s=s.replace('{activeTab === view.tabs[0] ? view.description : `{copy.serviceMethodBody}`}', '{activeTab === view.tabs[0] ? view.description : copy.serviceMethodBody}')
s=s.replace('function Footer({ setLocation }: { setLocation: (path: string) => void }) {', 'function Footer({ locale = "fr", setLocation }: { locale?: Locale; setLocation: (path: string) => void }) { const copy = siteCopy[locale];')
s=s.replace('<Footer locale={locale} setLocation={setLocation} />', '<Footer locale={locale} setLocation={setLocation} />')
s=s.replace('<Footer setLocation={setLocation} />', '<Footer locale={locale} setLocation={setLocation} />')
# Make footer headings and navigation language-aware without changing legal identity data.
s=s.replace('Une plateforme d’accompagnement pour relier les ambitions, les marchés et les trajectoires internationales.', '{copy.platformA}')
s=s.replace('>Explorer</p>', '>{copy.expertiseEyebrow}</p>')
s=s.replace('>Nos services</button>', '>{copy.services}</button>')
s=s.replace('>Explorer les études</button>', '>{copy.explorePrograms}</button>')
s=s.replace('>Notre approche</button>', '>{copy.exploreApproach}</button>')
s=s.replace('>Coordonnées</p>', '>{copy.contactIcx}</p>')
s=s.replace('>Informations légales</p>', '>{copy.secureProject}</p>')
# Service card call remains independent; use localized service overview in its action area.
p.write_text(s)
