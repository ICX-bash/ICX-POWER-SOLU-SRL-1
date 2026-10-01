import type { Locale } from "./siteData";
import { readLocalStorage } from "./safeStorage";

export type SiteCopy = {
  searchPlaceholder: string;
  all: string;
  services: string;
  studies: string;
  noResults: string;
  searchHint: string;
  account: string;
  signOut: string;
  openMenu: string;
  chooseLanguage: string;
  homeEyebrow: string;
  homeTitle: string;
  homeLead: string;
  exploreApproach: string;
  explorePrograms: string;
  platformEyebrow: string;
  platformTitle: string;
  platformA: string;
  platformB: string;
  expertiseEyebrow: string;
  expertiseTitle: string;
  viewStudies: string;
  viewService: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutBody: string;
  method: string;
  integratedExpertise: string;
  values: [string, string][];
  leadership: string;
  leadershipTitle: string;
  leadershipBody: string;
  direction: string;
  partnersEyebrow: string;
  partnersTitle: string;
  partnersButton: string;
  operationalPartner: string;
  expansionEyebrow: string;
  expansionTitle: string;
  expansionBody: string;
  expansionButton: string;
  backHome: string;
  expected: string;
  progression: string;
  framing: string;
  assessment: string;
  request: string;
  chooseEntry: string;
  chooseEntryBody: string;
  assessmentBody: string;
  backChoice: string;
  editAnswer: string;
  secureProject: string;
  secureProjectBody: string;
  finalise: string;
  finaliseBody: string;
  confidential: string;
  addDocuments: string;
  documentHint: string;
  saveRequest: string;
  saving: string;
  maxFiles: string;
  serviceOverview: string;
  serviceMethodTitle: string;
  serviceMethodBody: string;
  startRequest: string;
  studiesEyebrow: string;
  studiesTitle: string;
  studiesBody: string;
  searchStudies: string;
  universities: string;
  programmes: string;
  allCountries: string;
  allLevels: string;
  results: string;
  reset: string;
  noStudyResults: string;
  contactIcx: string;
  workflowPlaceholder?: string;
};

const fr: SiteCopy = {
  searchPlaceholder: "Services, universités, domaines…",
  all: "Tout",
  services: "Services",
  studies: "Études",
  noResults: "Aucun résultat pour cette recherche.",
  searchHint:
    "Recherchez une expertise, une université, une ville ou un domaine d’études.",
  account: "Mon espace",
  signOut: "Se déconnecter",
  openMenu: "Ouvrir le menu",
  chooseLanguage: "Choisir la langue",
  homeEyebrow: "Plateforme d’accompagnement international",
  homeTitle: "Les bonnes connexions créent les bons horizons.",
  homeLead:
    "ICX Power Solutions accompagne les entreprises, les talents et les projets qui veulent avancer au-delà des frontières — avec méthode, exigence et proximité.",
  exploreApproach: "Découvrir notre approche",
  explorePrograms: "Explorer les programmes",
  platformEyebrow: "Une plateforme, plusieurs trajectoires",
  platformTitle: "Pensée pour les décisions qui comptent.",
  platformA:
    "ICX Power Solutions crée un cadre de confiance pour faire avancer un projet, une entreprise ou une candidature avec des interlocuteurs fiables.",
  platformB:
    "Chaque accompagnement combine lecture stratégique, coordination opérationnelle et suivi documenté — pour que le prochain pas soit toujours clair.",
  expertiseEyebrow: "Nos expertises",
  expertiseTitle: "Le bon point d’entrée pour chaque ambition.",
  viewStudies: "Voir la plateforme Études",
  viewService: "Voir le service",
  aboutEyebrow: "Une approche lisible",
  aboutTitle: "Avancer avec un cadre, sans perdre la dimension humaine.",
  aboutBody:
    "Notre rôle est de rendre les projets plus lisibles, les échanges plus fluides et les décisions plus sereines. Nous travaillons à hauteur d’enjeu, avec rigueur et simplicité.",
  method: "Notre méthode",
  integratedExpertise: "expertises intégrées",
  values: [
    ["Lire avant d’agir", "Une analyse claire avant toute recommandation."],
    [
      "Documenter chaque étape",
      "Des décisions suivies, des prochaines actions visibles.",
    ],
    [
      "Rester disponible",
      "Des interlocuteurs identifiés, du premier échange au suivi.",
    ],
    [
      "Protéger les informations",
      "Un espace de travail pensé pour la confidentialité.",
    ],
  ],
  leadership: "Équipe dirigeante",
  leadershipTitle: "Des personnes engagées derrière chaque dossier.",
  leadershipBody:
    "Deux regards complémentaires pour relier l’opérationnel, le cadre légal et l’exigence de suivi.",
  direction: "Direction",
  partnersEyebrow: "Écosystème de confiance",
  partnersTitle: "Des liens qui prolongent notre expertise.",
  partnersButton: "Voir les partenaires",
  operationalPartner: "Partenaire opérationnel · Roumanie",
  expansionEyebrow: "Nouvelle expansion",
  expansionTitle: "Voyager, séjourner, acheter et investir avec un cadre ICX.",
  expansionBody:
    "Des axes en développement pour les billets d’avion, l’hôtellerie africaine, l’affiliation de marques, le tourisme et les partenariats miniers responsables.",
  expansionButton: "Voir les axes partenaires",
  backHome: "Retour à l’accueil",
  expected: "Ce que vous pouvez attendre",
  progression: "Progression du parcours",
  framing: "Cadrage",
  assessment: "Évaluation",
  request: "Demande",
  chooseEntry: "Choisissez votre point d’entrée",
  chooseEntryBody: "Le parcours restera sauvegardé si vous êtes connecté.",
  assessmentBody:
    "Cette étape aide ICX à adapter le niveau de détail, les documents et la prochaine action.",
  backChoice: "← Revenir au choix",
  editAnswer: "← Modifier ma réponse",
  secureProject: "Votre demande mérite un espace sécurisé.",
  secureProjectBody:
    "Créez un compte ou connectez-vous pour enregistrer votre besoin, joindre des documents et retrouver votre progression.",
  finalise: "Finaliser votre demande",
  finaliseBody:
    "Ajoutez le contexte utile : votre demande sera visible dans votre espace client et transmise à l’équipe ICX.",
  confidential: "Données traitées avec confidentialité",
  addDocuments: "Ajouter des documents",
  documentHint: "PDF, image ou justificatif · 8 Mo maximum par fichier",
  saveRequest: "Enregistrer la demande",
  saving: "Enregistrement…",
  maxFiles: "5 fichiers maximum, 8 Mo par fichier.",
  serviceOverview: "Présentation",
  serviceMethodTitle: "Une progression structurée, adaptée à votre contexte.",
  serviceMethodBody:
    "Sur ce volet, notre équipe construit une réponse précise, documentée et actionnable. Le cadre est posé avec vous, puis suivi dans un espace sécurisé.",
  startRequest: "Ouvrir un espace sécurisé",
  studiesEyebrow: "Service Études",
  studiesTitle: "Votre prochaine étape mérite un vrai point de départ.",
  studiesBody:
    "Explorez les universités et programmes, comparez les critères et contactez ICX lorsque votre choix se précise.",
  searchStudies: "Rechercher une université, une ville ou un domaine",
  universities: "Universités",
  programmes: "Programmes d’études",
  allCountries: "Tous les pays",
  allLevels: "Tous les niveaux",
  results: "résultats dans le catalogue",
  reset: "Réinitialiser les filtres",
  noStudyResults: "Aucun résultat ne correspond à ces filtres.",
  contactIcx: "Contacter ICX POWER SOLUTIONS SRL",
};

const en: SiteCopy = {
  ...fr,
  searchPlaceholder: "Services, universities, fields…",
  all: "All",
  services: "Services",
  studies: "Studies",
  noResults: "No results for this search.",
  searchHint: "Search for an expertise, university, city or field of study.",
  account: "My space",
  signOut: "Sign out",
  openMenu: "Open menu",
  chooseLanguage: "Choose language",
  homeEyebrow: "International support platform",
  homeTitle: "The right connections create new horizons.",
  homeLead:
    "ICX Power Solutions supports companies, talent and projects moving across borders — with method, rigor and proximity.",
  exploreApproach: "Discover our approach",
  explorePrograms: "Explore programmes",
  platformEyebrow: "One platform, many paths",
  platformTitle: "Built for decisions that matter.",
  platformA:
    "ICX Power Solutions creates a trusted framework for projects, companies and applications to move forward with reliable contacts.",
  platformB:
    "Every engagement combines strategic insight, operational coordination and documented follow-up, so the next step stays clear.",
  expertiseEyebrow: "Our expertise",
  expertiseTitle: "The right starting point for every ambition.",
  viewStudies: "Open the Studies platform",
  viewService: "View service",
  aboutEyebrow: "A clear approach",
  aboutTitle: "Move forward with structure without losing the human dimension.",
  aboutBody:
    "We make projects clearer, exchanges smoother and decisions calmer through rigorous, simple support.",
  method: "Our method",
  integratedExpertise: "integrated expertise",
  leadership: "Leadership team",
  leadershipTitle: "Committed people behind every file.",
  leadershipBody:
    "Two complementary perspectives connect operations, legal context and careful follow-up.",
  direction: "Leadership",
  partnersEyebrow: "Trusted ecosystem",
  partnersTitle: "Connections that extend our expertise.",
  partnersButton: "View partners",
  operationalPartner: "Operational partner · Romania",
  expansionEyebrow: "New expansion",
  expansionTitle: "Travel, stay, buy and invest with an ICX framework.",
  expansionBody:
    "Developing tracks for flights, African hospitality, brand affiliation, tourism and responsible mining partnerships.",
  expansionButton: "View partner tracks",
  backHome: "Back to home",
  expected: "What you can expect",
  progression: "Journey progress",
  framing: "Framing",
  assessment: "Assessment",
  request: "Request",
  chooseEntry: "Choose your starting point",
  chooseEntryBody: "Your journey is saved when you are signed in.",
  assessmentBody:
    "This step helps ICX adapt the detail, documents and next action.",
  backChoice: "← Back to choice",
  editAnswer: "← Change my answer",
  secureProject: "Your request deserves a secure space.",
  secureProjectBody:
    "Create an account or sign in to save your need, attach documents and resume your progress.",
  finalise: "Complete your request",
  finaliseBody:
    "Add useful context: your request will appear in your client space and reach the ICX team.",
  confidential: "Your data is handled confidentially",
  addDocuments: "Add documents",
  documentHint: "PDF, image or supporting file · 8 MB per file",
  saveRequest: "Save request",
  saving: "Saving…",
  maxFiles: "Up to 5 files, 8 MB per file.",
  serviceOverview: "Overview",
  serviceMethodTitle: "A structured progression adapted to your context.",
  serviceMethodBody:
    "For this area, our team builds a precise, documented and actionable response with you, then follows it in a secure space.",
  startRequest: "Open a secure space",
  studiesEyebrow: "Studies service",
  studiesTitle: "Your next step deserves a real starting point.",
  studiesBody:
    "Explore universities and programmes, compare criteria and contact ICX when your choice becomes clearer.",
  searchStudies: "Search a university, city or field",
  universities: "Universities",
  programmes: "Study programmes",
  allCountries: "All countries",
  allLevels: "All levels",
  results: "results in the catalogue",
  reset: "Reset filters",
  noStudyResults: "No result matches these filters.",
  contactIcx: "Contact ICX POWER SOLUTIONS SRL",
};

const zh: SiteCopy = {
  ...en,
  searchPlaceholder: "服务、大学、专业…",
  all: "全部",
  services: "服务",
  studies: "留学",
  noResults: "没有找到结果。",
  searchHint: "搜索服务、大学、城市或专业。",
  account: "我的空间",
  signOut: "退出登录",
  openMenu: "打开菜单",
  chooseLanguage: "选择语言",
  homeEyebrow: "国际支持平台",
  homeTitle: "正确的连接，开启新的视野。",
  homeLead:
    "ICX Power Solutions 以方法、严谨和亲近的方式支持企业、人才与跨境项目。",
  exploreApproach: "了解我们的方式",
  explorePrograms: "探索项目",
  expertiseEyebrow: "我们的专业服务",
  expertiseTitle: "为每个目标选择合适的起点。",
  viewStudies: "打开留学平台",
  viewService: "查看服务",
  backHome: "返回首页",
  expected: "您可以期待",
  progression: "流程进度",
  framing: "规划",
  assessment: "评估",
  request: "申请",
  chooseEntry: "选择您的起点",
  chooseEntryBody: "登录后将保存您的流程。",
  assessmentBody: "此步骤帮助 ICX 调整信息、文件和下一步行动。",
  secureProject: "您的需求值得一个安全空间。",
  secureProjectBody: "创建账户或登录以保存需求、上传文件并继续流程。",
  finalise: "完成您的申请",
  finaliseBody: "补充必要背景，申请将显示在您的客户空间并发送给 ICX 团队。",
  confidential: "您的数据将被保密处理",
  addDocuments: "添加文件",
  documentHint: "PDF、图片或证明文件 · 每个文件最多 8 MB",
  saveRequest: "保存申请",
  saving: "保存中…",
  maxFiles: "最多 5 个文件，每个 8 MB。",
  serviceOverview: "概览",
  serviceMethodTitle: "根据您的情况制定清晰流程。",
  serviceMethodBody:
    "我们的团队与您一起制定精准、可执行的方案，并在安全空间中跟进。",
  startRequest: "打开安全空间",
  studiesEyebrow: "留学服务",
  studiesTitle: "下一步需要一个真正的起点。",
  studiesBody: "探索大学和项目，比较条件，并在选择明确后联系 ICX。",
  searchStudies: "搜索大学、城市或专业",
  universities: "大学",
  programmes: "学习项目",
  allCountries: "所有国家",
  allLevels: "所有级别",
  results: "个目录结果",
  reset: "重置筛选",
  noStudyResults: "没有符合筛选条件的结果。",
  contactIcx: "联系 ICX POWER SOLUTIONS SRL",
};
const ro: SiteCopy = {
  ...en,
  homeEyebrow: "Platformă de sprijin internațional",
  homeTitle: "Conexiunile potrivite deschid noi orizonturi.",
  homeLead:
    "ICX Power Solutions sprijină companii, talente și proiecte internaționale cu metodă și rigoare.",
  exploreApproach: "Descoperă abordarea",
  explorePrograms: "Explorează programele",
  expertiseEyebrow: "Expertiza noastră",
  expertiseTitle: "Punctul potrivit de pornire pentru fiecare ambiție.",
  viewStudies: "Deschide platforma de studii",
  viewService: "Vezi serviciul",
  backHome: "Înapoi acasă",
  expected: "La ce vă puteți aștepta",
  progression: "Progresul parcursului",
  framing: "Încadrare",
  assessment: "Evaluare",
  request: "Solicitare",
  chooseEntry: "Alegeți punctul de pornire",
  secureProject: "Solicitarea dumneavoastră merită un spațiu securizat.",
  finalise: "Finalizați solicitarea",
  addDocuments: "Adăugați documente",
  saveRequest: "Salvează solicitarea",
  saving: "Se salvează…",
  serviceOverview: "Prezentare",
  startRequest: "Deschideți un spațiu securizat",
  studiesEyebrow: "Serviciul Studii",
  studiesTitle: "Următorul pas merită un punct de pornire real.",
  studiesBody:
    "Explorați universități și programe, comparați criteriile și contactați ICX când alegerea devine clară.",
  searchStudies: "Căutați o universitate, un oraș sau un domeniu",
  universities: "Universități",
  programmes: "Programe de studiu",
  allCountries: "Toate țările",
  allLevels: "Toate nivelurile",
  reset: "Resetează filtrele",
  noStudyResults: "Niciun rezultat nu corespunde filtrelor.",
  contactIcx: "Contactați ICX POWER SOLUTIONS SRL",
};
const pl: SiteCopy = {
  ...en,
  homeEyebrow: "Międzynarodowa platforma wsparcia",
  homeTitle: "Dobre połączenia otwierają nowe horyzonty.",
  homeLead:
    "ICX Power Solutions wspiera firmy, talenty i projekty międzynarodowe metodycznie i rzetelnie.",
  exploreApproach: "Poznaj nasze podejście",
  explorePrograms: "Przeglądaj programy",
  expertiseEyebrow: "Nasze kompetencje",
  expertiseTitle: "Właściwy punkt wyjścia dla każdej ambicji.",
  viewStudies: "Otwórz platformę studiów",
  viewService: "Zobacz usługę",
  backHome: "Wróć do strony głównej",
  expected: "Czego możesz oczekiwać",
  progression: "Postęp ścieżki",
  framing: "Ustalenie zakresu",
  assessment: "Ocena",
  request: "Wniosek",
  chooseEntry: "Wybierz punkt wyjścia",
  secureProject: "Twoja sprawa zasługuje na bezpieczną przestrzeń.",
  finalise: "Dokończ wniosek",
  addDocuments: "Dodaj dokumenty",
  saveRequest: "Zapisz wniosek",
  saving: "Zapisywanie…",
  serviceOverview: "Przegląd",
  startRequest: "Otwórz bezpieczną przestrzeń",
  studiesEyebrow: "Usługa studiów",
  studiesTitle: "Twój następny krok zasługuje na dobry początek.",
  studiesBody:
    "Poznaj uczelnie i programy, porównaj kryteria i skontaktuj się z ICX.",
  searchStudies: "Szukaj uczelni, miasta lub dziedziny",
  universities: "Uczelnie",
  programmes: "Programy studiów",
  allCountries: "Wszystkie kraje",
  allLevels: "Wszystkie poziomy",
  reset: "Wyczyść filtry",
  noStudyResults: "Brak wyników dla tych filtrów.",
  contactIcx: "Skontaktuj się z ICX POWER SOLUTIONS SRL",
};
const ar: SiteCopy = {
  ...en,
  homeEyebrow: "منصة دعم دولية",
  homeTitle: "العلاقات الصحيحة تفتح آفاقاً جديدة.",
  homeLead:
    "تدعم ICX Power Solutions الشركات والمواهب والمشاريع الدولية بمنهجية وصرامة وقرب.",
  exploreApproach: "اكتشف نهجنا",
  explorePrograms: "استكشف البرامج",
  expertiseEyebrow: "خدماتنا المتخصصة",
  expertiseTitle: "نقطة البداية المناسبة لكل طموح.",
  viewStudies: "افتح منصة الدراسات",
  viewService: "عرض الخدمة",
  backHome: "العودة إلى الرئيسية",
  expected: "ما يمكنكم توقعه",
  progression: "تقدم المسار",
  framing: "التخطيط",
  assessment: "التقييم",
  request: "الطلب",
  chooseEntry: "اختر نقطة البداية",
  secureProject: "طلبك يستحق مساحة آمنة.",
  finalise: "إكمال الطلب",
  addDocuments: "إضافة مستندات",
  saveRequest: "حفظ الطلب",
  saving: "جارٍ الحفظ…",
  serviceOverview: "نظرة عامة",
  startRequest: "فتح مساحة آمنة",
  studiesEyebrow: "خدمة الدراسات",
  studiesTitle: "خطوتك التالية تستحق بداية حقيقية.",
  studiesBody:
    "استكشف الجامعات والبرامج وقارن المعايير وتواصل مع ICX عندما تتضح الصورة.",
  searchStudies: "ابحث عن جامعة أو مدينة أو مجال",
  universities: "الجامعات",
  programmes: "البرامج الدراسية",
  allCountries: "كل البلدان",
  allLevels: "كل المستويات",
  reset: "إعادة ضبط الفلاتر",
  noStudyResults: "لا توجد نتائج مطابقة.",
  contactIcx: "تواصل مع ICX POWER SOLUTIONS SRL",
};

export const siteCopy: Record<Locale, SiteCopy> = { fr, en, zh, ro, pl, ar };

export const localeOptions: Array<{
  code: Locale;
  label: string;
  nativeLabel: string;
}> = [
  { code: "fr", label: "Français", nativeLabel: "fr" },
  { code: "en", label: "English", nativeLabel: "En" },
  { code: "ro", label: "Roumain", nativeLabel: "Ro" },
  { code: "pl", label: "Polonais", nativeLabel: "Pl" },
  { code: "ar", label: "Arabe", nativeLabel: "Ar" },
  { code: "zh", label: "Chinois", nativeLabel: "Zh" },
];

export const isLocale = (value: string | null): value is Locale =>
  Boolean(value && localeOptions.some(option => option.code === value));
export const detectLocale = (): Locale => {
  const saved = readLocalStorage("icx-locale");
  if (isLocale(saved)) return saved;
  return "fr";
};

// Keep the shared UI dictionary complete for every supported locale. These keys
// are used across every service route, not only on the home page.
Object.assign(siteCopy.ro, {
  chooseLanguage: "Alegeți limba",
  serviceMethodTitle:
    "Un parcurs structurat, adaptat contextului dumneavoastră.",
  serviceMethodBody:
    "Echipa noastră construiește împreună cu dumneavoastră un răspuns precis, documentat și aplicabil, apoi îl urmărește într-un spațiu securizat.",
  chooseEntryBody:
    "Această etapă ajută ICX să adapteze nivelul de detaliu, documentele și următoarea acțiune.",
  confidential: "Datele dumneavoastră sunt tratate confidențial",
  partnersButton: "Vezi partenerii",
  operationalPartner: "Partener operațional · România",
  expansionButton: "Vezi direcțiile parteneriale",
});
Object.assign(siteCopy.pl, {
  chooseLanguage: "Wybierz język",
  serviceMethodTitle:
    "Ustrukturyzowany proces dopasowany do Twojego kontekstu.",
  serviceMethodBody:
    "Nasz zespół tworzy z Tobą precyzyjną, udokumentowaną i praktyczną odpowiedź, a następnie prowadzi ją w bezpiecznej przestrzeni.",
  chooseEntryBody:
    "Ten etap pomaga ICX dopasować szczegóły, dokumenty i następne działanie.",
  confidential: "Twoje dane są przetwarzane poufnie",
  partnersButton: "Zobacz partnerów",
  operationalPartner: "Partner operacyjny · Rumunia",
  expansionButton: "Zobacz kierunki partnerskie",
});
Object.assign(siteCopy.ar, {
  chooseLanguage: "اختر اللغة",
  serviceMethodTitle: "مسار منظم ومناسب لسياقك.",
  serviceMethodBody:
    "يبني فريقنا معك استجابة دقيقة وموثقة وقابلة للتنفيذ، ثم يتابعها في مساحة آمنة.",
  chooseEntryBody:
    "تساعد هذه الخطوة ICX على تكييف مستوى التفاصيل والوثائق والإجراء التالي.",
  confidential: "تُعالَج بياناتك بسرية",
  partnersButton: "عرض الشركاء",
  operationalPartner: "شريك تشغيلي · رومانيا",
  expansionButton: "عرض مسارات الشراكة",
});
Object.assign(siteCopy.zh, {
  chooseLanguage: "选择语言",
  serviceMethodTitle: "根据您的情况制定清晰、结构化的流程。",
  serviceMethodBody:
    "我们的团队与您共同制定精准、可记录且可执行的方案，并在安全空间中持续跟进。",
  chooseEntryBody: "此步骤帮助 ICX 调整信息详略、所需文件和下一步行动。",
  confidential: "您的数据将得到保密处理",
  partnersButton: "查看合作伙伴",
  operationalPartner: "运营合作伙伴 · 罗马尼亚",
  expansionButton: "查看合作方向",
});

// Long-form home sections are overlaid after the base dictionaries so every locale
// has its own copy instead of inheriting the English page narrative.
const longFormTranslations: Partial<Record<Locale, Record<string, unknown>>> = {
  ro: {
    platformEyebrow: "O platformă, mai multe direcții",
    platformTitle: "Creată pentru deciziile care contează.",
    platformA:
      "ICX Power Solutions creează un cadru de încredere pentru proiecte, companii și candidaturi, cu interlocutori de încredere.",
    platformB:
      "Fiecare colaborare combină perspectiva strategică, coordonarea operațională și urmărirea documentată, astfel încât următorul pas să fie clar.",
    method: "Metoda noastră",
    integratedExpertise: "expertize integrate",
    aboutEyebrow: "O abordare clară",
    aboutTitle: "Avansați cu structură, fără să pierdeți dimensiunea umană.",
    aboutBody:
      "Facem proiectele mai clare, schimburile mai fluide și deciziile mai sigure printr-un sprijin riguros și simplu.",
    leadership: "Echipa de conducere",
    leadershipTitle: "Oameni implicați în spatele fiecărui dosar.",
    leadershipBody:
      "Două perspective complementare conectează operațiunile, cadrul legal și urmărirea atentă.",
    direction: "Conducere",
    partnersEyebrow: "Ecosistem de încredere",
    partnersTitle: "Legături care ne extind expertiza.",
    expansionEyebrow: "Extindere nouă",
    expansionTitle:
      "Călătoriți, locuiți, cumpărați și investiți cu cadrul ICX.",
    expansionBody:
      "Direcții în dezvoltare pentru bilete, ospitalitate africană, turism și parteneriate miniere responsabile.",
  },
  pl: {
    platformEyebrow: "Jedna platforma, wiele ścieżek",
    platformTitle: "Stworzona z myślą o ważnych decyzjach.",
    platformA:
      "ICX Power Solutions tworzy zaufane ramy dla projektów, firm i aplikacji, zapewniając wiarygodnych rozmówców.",
    platformB:
      "Każda współpraca łączy spojrzenie strategiczne, koordynację operacyjną i udokumentowane działania, aby kolejny krok był jasny.",
    method: "Nasza metoda",
    integratedExpertise: "zintegrowane kompetencje",
    aboutEyebrow: "Jasne podejście",
    aboutTitle: "Działaj ze strukturą, nie tracąc ludzkiego wymiaru.",
    aboutBody:
      "Porządkujemy projekty, ułatwiamy wymianę i uspokajamy decyzje dzięki rzetelnemu i prostemu wsparciu.",
    leadership: "Zespół zarządzający",
    leadershipTitle: "Za każdą sprawą stoją zaangażowani ludzie.",
    leadershipBody:
      "Dwie uzupełniające się perspektywy łączą operacje, kontekst prawny i staranne działania.",
    direction: "Zarząd",
    partnersEyebrow: "Ekosystem zaufania",
    partnersTitle: "Relacje, które poszerzają nasze kompetencje.",
    expansionEyebrow: "Nowa ekspansja",
    expansionTitle: "Podróżuj, mieszkaj, kupuj i inwestuj z ramami ICX.",
    expansionBody:
      "Rozwijane kierunki obejmują loty, afrykańską gościnność, turystykę i odpowiedzialne partnerstwa górnicze.",
  },
  ar: {
    platformEyebrow: "منصة واحدة، مسارات متعددة",
    platformTitle: "مصممة للقرارات المهمة.",
    platformA:
      "تنشئ ICX Power Solutions إطاراً موثوقاً للمشاريع والشركات والطلبات، مع جهات اتصال موثوقة.",
    platformB:
      "يجمع كل تعاون بين الرؤية الاستراتيجية والتنسيق التشغيلي والمتابعة الموثقة، حتى تظل الخطوة التالية واضحة.",
    method: "منهجيتنا",
    integratedExpertise: "خبرات متكاملة",
    aboutEyebrow: "نهج واضح",
    aboutTitle: "تقدم بهيكل واضح دون فقدان البعد الإنساني.",
    aboutBody:
      "نجعل المشاريع أوضح والتبادلات أسهل والقرارات أكثر اطمئناناً من خلال دعم دقيق وبسيط.",
    leadership: "فريق القيادة",
    leadershipTitle: "أشخاص ملتزمون خلف كل ملف.",
    leadershipBody:
      "تجمع رؤيتان متكاملتان بين التشغيل والسياق القانوني والمتابعة الدقيقة.",
    direction: "الإدارة",
    partnersEyebrow: "منظومة ثقة",
    partnersTitle: "روابط توسع خبرتنا.",
    expansionEyebrow: "توسع جديد",
    expansionTitle: "سافر وأقم واشترِ واستثمر ضمن إطار ICX.",
    expansionBody:
      "مسارات قيد التطوير للتذاكر والضيافة الأفريقية والسياحة والشراكات التعدينية المسؤولة.",
  },
  zh: {
    platformEyebrow: "一个平台，多种路径",
    platformTitle: "为重要决策而设计。",
    platformA:
      "ICX Power Solutions 为项目、企业和申请建立可信赖的框架，并提供可靠的联系人。",
    platformB:
      "每次合作都结合战略洞察、运营协调和记录完善的跟进，让下一步始终清晰。",
    method: "我们的方法",
    integratedExpertise: "综合专业能力",
    aboutEyebrow: "清晰的方法",
    aboutTitle: "以结构推动前进，同时保留人性温度。",
    aboutBody: "我们以严谨而简单的支持，让项目更清晰、沟通更顺畅、决策更从容。",
    leadership: "管理团队",
    leadershipTitle: "每个项目背后都有认真负责的人。",
    leadershipBody: "两种互补视角连接运营、法律环境和细致跟进。",
    direction: "管理层",
    partnersEyebrow: "可信赖的生态",
    partnersTitle: "延伸我们专业能力的连接。",
    expansionEyebrow: "新的拓展",
    expansionTitle: "在 ICX 框架下旅行、住宿、购买和投资。",
    expansionBody:
      "正在发展的方向包括机票、非洲酒店、品牌联盟、旅游以及负责任的矿业合作。",
  },
};
for (const [locale, translations] of Object.entries(longFormTranslations))
  Object.assign(siteCopy[locale as Locale], translations);

Object.assign(siteCopy.ro, {
  values: [
    [
      "Citim înainte de a acționa",
      "O analiză clară înaintea oricărei recomandări.",
    ],
    ["Documentăm fiecare etapă", "Decizii urmărite și acțiuni vizibile."],
    [
      "Rămânem disponibili",
      "Interlocutori identificați de la primul schimb până la urmărire.",
    ],
    [
      "Protejăm informațiile",
      "Un spațiu de lucru conceput pentru confidențialitate.",
    ],
  ],
});
Object.assign(siteCopy.pl, {
  values: [
    [
      "Czytamy sytuację przed działaniem",
      "Jasna analiza przed każdą rekomendacją.",
    ],
    [
      "Dokumentujemy każdy etap",
      "Śledzone decyzje i widoczne kolejne działania.",
    ],
    [
      "Jesteśmy dostępni",
      "Wyznaczeni rozmówcy od pierwszego kontaktu do dalszej obsługi.",
    ],
    [
      "Chronimy informacje",
      "Przestrzeń pracy zaprojektowana z myślą o poufności.",
    ],
  ],
});
Object.assign(siteCopy.ar, {
  values: [
    ["نقرأ قبل أن نتحرك", "تحليل واضح قبل أي توصية."],
    ["نوثق كل خطوة", "قرارات متابَعة وإجراءات تالية واضحة."],
    ["نبقى متاحين", "جهات اتصال محددة من أول تواصل إلى المتابعة."],
    ["نحمي المعلومات", "مساحة عمل مصممة للسرية."],
  ],
});
Object.assign(siteCopy.zh, {
  values: [
    ["先理解，再行动", "在提出建议前进行清晰分析。"],
    ["记录每个阶段", "跟踪决策并明确下一步行动。"],
    ["保持可联系", "从首次沟通到后续跟进都有明确联系人。"],
    ["保护信息", "为保密而设计的工作空间。"],
  ],
});

Object.assign(siteCopy.zh, { services: "服务", studies: "留学" });
Object.assign(siteCopy.ro, { services: "Servicii", studies: "Studii" });
Object.assign(siteCopy.pl, { services: "Usługi", studies: "Studia" });
Object.assign(siteCopy.ar, { services: "الخدمات", studies: "الدراسات" });
