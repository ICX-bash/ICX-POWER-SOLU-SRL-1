import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import AuthPanel from "@/pages/AuthPanel";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  Clock3,
  FileCheck2,
  Filter,
  Globe2,
  Handshake,
  Languages,
  LayoutDashboard,
  Lightbulb,
  Linkedin,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Paperclip,
  Phone,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  countries,
  programs,
  services,
  serviceTranslations,
  translations,
  type Locale,
  type Program,
  type Service,
} from "@/lib/siteData";
import { detectLocale, isLocale, localeOptions, siteCopy } from "@/lib/i18n";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "@/lib/safeStorage";
import {
  CountryField,
  PhoneCodeField,
  callingCodeForCountry,
  countryIsoCodeForName,
  getLocalizedCountryOptions,
} from "@/components/WorldCountryFields";

const serviceBySlug = Object.fromEntries(
  services.map(service => [service.slug, service])
);

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3"
      aria-label="ICX Power Solutions, accueil"
    >
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-amber-600/20 ring-1 ring-slate-200/80">
        <img
          src="/assets/icx-logo.png"
          alt="ICX Power Solutions SRL"
          className="size-full object-cover"
        />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[12px] font-black tracking-[0.22em] text-foreground">
            ICX POWER
          </span>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-muted-foreground">
            SOLUTIONS SRL
          </span>
        </span>
      )}
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600">
      <span className="h-px w-8 bg-amber-600" />
      {children}
    </p>
  );
}

function PageWrap({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-screen bg-background text-foreground ${className}`}>
      {children}
    </div>
  );
}

function Header({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<
    "all" | "services" | "studies"
  >("all");
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const copy = { ...translations[locale].ui, ...siteCopy[locale] };
  const navItems = [
    { label: copy.home, href: "/" },
    { label: copy.nav[0], href: "/#services" },
    { label: copy.nav[1], href: "/etudes" },
    { label: copy.nav[2], href: "/partenaires" },
    { label: copy.nav[3], href: "/#about" },
    ...(user?.role === "admin"
      ? [
          {
            label: locale === "fr" ? "Console admin" : "Admin console",
            href: "/admin",
          },
        ]
      : []),
  ];
  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return [];
    const serviceResults = services
      .filter(
        service => searchCategory === "all" || searchCategory === "services"
      )
      .filter(service =>
        `${service.label} ${service.description} ${service.outcomes.join(" ")}`
          .toLowerCase()
          .includes(normalized)
      )
      .map(service => ({
        type: "Service",
        title: service.label,
        detail: service.description,
        href: `/services/${service.slug}`,
      }));
    const studyResults = programs
      .filter(
        program => searchCategory === "all" || searchCategory === "studies"
      )
      .filter(program =>
        `${program.university} ${program.field} ${program.city} ${program.country}`
          .toLowerCase()
          .includes(normalized)
      )
      .map(program => ({
        type: "Étude",
        title: program.field,
        detail: `${program.university} · ${program.city}`,
        href: "/etudes",
      }));
    return [...serviceResults, ...studyResults].slice(0, 6);
  }, [searchCategory, searchQuery]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const go = (href: string) => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    if (href.startsWith("/#")) {
      setLocation("/");
      window.setTimeout(
        () =>
          document
            .getElementById(href.slice(2))
            ?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } else {
      setLocation(href);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
      <div className="container flex h-[74px] items-center justify-between gap-5">
        <BrandMark />
        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Navigation principale"
        >
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className="text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <button
              onClick={() => setSearchOpen(prev => !prev)}
              className={`flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${searchOpen ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-blue-800 dark:bg-[#27302b]/40 dark:text-blue-200" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              aria-expanded={searchOpen}
              aria-label={copy.search}
            >
              <Search className="size-3.5" />
              <span>{copy.search}</span>
              <kbd className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground xl:inline">
                ⌘K
              </kbd>
            </button>
            {searchOpen && (
              <div className="absolute right-0 top-12 z-[70] w-[calc(100vw-2rem)] max-w-[360px] rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-slate-950/10">
                <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="mt-3 flex gap-1">
                  <button
                    onClick={() => setSearchCategory("all")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "all" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {copy.all}
                  </button>
                  <button
                    onClick={() => setSearchCategory("services")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "services" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {copy.services}
                  </button>
                  <button
                    onClick={() => setSearchCategory("studies")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "studies" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {copy.studies}
                  </button>
                </div>
                {searchQuery.trim() && (
                  <div className="mt-3 border-t border-border pt-2">
                    {searchResults.length ? (
                      searchResults.map(result => (
                        <button
                          key={`${result.type}-${result.title}`}
                          onClick={() => go(result.href)}
                          className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-muted"
                        >
                          <span className="mt-0.5 grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                            <Search className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold uppercase tracking-[0.12em] text-amber-600">
                              {result.type}
                            </span>
                            <span className="mt-1 block truncate text-sm font-semibold">
                              {result.title}
                            </span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">
                              {result.detail}
                            </span>
                          </span>
                          <ChevronRight className="mt-2 size-4 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                        {copy.noResults}
                      </p>
                    )}
                  </div>
                )}
                {!searchQuery.trim() && (
                  <p className="px-2 py-4 text-xs leading-5 text-muted-foreground">
                    {copy.searchHint}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold">
            <Languages className="size-3.5 text-muted-foreground" />
            <select
              aria-label={copy.chooseLanguage}
              value={locale}
              onChange={event => setLocale(event.target.value as Locale)}
              className="bg-transparent text-[11px] outline-none"
            >
              {localeOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold">
            <Sun className="size-3.5 text-muted-foreground" />
            <select
              aria-label={copy.theme}
              value={theme}
              onChange={event =>
                setTheme(event.target.value as "light" | "dark" | "system")
              }
              className="bg-transparent text-[11px] outline-none"
            >
              <option value="light">{copy.light}</option>
              <option value="dark">{copy.dark}</option>
              <option value="system">{copy.system}</option>
            </select>
          </div>
          {isAuthenticated ? (
            <div className="ml-1 flex items-center gap-2">
              {user?.role === "admin" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/admin")}
                >
                  Console admin
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/mon-espace")}
              >
                <LayoutDashboard />
                {copy.account}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                aria-label={copy.signOut}
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/connexion")}
              >
                <LogIn />
                {copy.login}
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/inscription")}
                className="rounded-full px-5"
              >
                {copy.signup}
                <ArrowRight />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-10 items-center gap-1 rounded-full border border-border bg-card px-2">
            <Languages
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              aria-label={copy.chooseLanguage}
              value={locale}
              onChange={event => setLocale(event.target.value as Locale)}
              className="w-[76px] bg-transparent text-[11px] font-semibold outline-none"
            >
              {localeOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full border border-border"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label={copy.openMenu}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="container flex flex-col gap-1">
            <div className="mb-2 rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={event => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder={copy.searchPlaceholder}
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={() => setSearchCategory("all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "all" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {copy.all}
                </button>
                <button
                  onClick={() => setSearchCategory("services")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "services" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {copy.services}
                </button>
                <button
                  onClick={() => setSearchCategory("studies")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${searchCategory === "studies" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {copy.studies}
                </button>
              </div>
              {searchOpen && searchQuery.trim() && (
                <div className="mt-2 border-t border-border pt-2">
                  {searchResults.length ? (
                    searchResults.map(result => (
                      <button
                        key={`${result.type}-${result.title}`}
                        onClick={() => go(result.href)}
                        className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"
                      >
                        <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                          <Search className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.detail}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      {copy.noResults}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {copy.theme}
              </span>
              <select
                aria-label={copy.theme}
                value={theme}
                onChange={event =>
                  setTheme(event.target.value as "light" | "dark" | "system")
                }
                className="bg-transparent text-xs font-semibold outline-none"
              >
                <option value="light">{copy.light}</option>
                <option value="dark">{copy.dark}</option>
                <option value="system">{copy.system}</option>
              </select>
            </div>
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className="rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-muted"
              >
                {item.label}
              </button>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/connexion")}
                className="flex-1"
              >
                {copy.login}
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/inscription")}
                className="flex-1"
              >
                {copy.signup}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer({
  locale = "fr",
  setLocation,
}: {
  locale?: Locale;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  const footerLabels = {
    fr: [
      "Confidentialité",
      "Mentions légales",
      "Cookies",
      "© 2026 ICX Power Solutions SRL. Tous droits réservés.",
      "Accompagnement · Rigueur · International",
    ],
    en: [
      "Privacy",
      "Legal information",
      "Cookies",
      "© 2026 ICX Power Solutions SRL. All rights reserved.",
      "Support · Rigor · International",
    ],
    ro: [
      "Confidențialitate",
      "Informații juridice",
      "Cookie-uri",
      "© 2026 ICX Power Solutions SRL. Toate drepturile rezervate.",
      "Sprijin · Rigoare · Internațional",
    ],
    pl: [
      "Prywatność",
      "Informacje prawne",
      "Cookies",
      "© 2026 ICX Power Solutions SRL. Wszelkie prawa zastrzeżone.",
      "Wsparcie · Rzetelność · Międzynarodowość",
    ],
    ar: [
      "الخصوصية",
      "المعلومات القانونية",
      "ملفات الارتباط",
      "© 2026 ICX Power Solutions SRL. جميع الحقوق محفوظة.",
      "دعم · دقة · دولي",
    ],
    zh: [
      "隐私",
      "法律信息",
      "Cookie",
      "© 2026 ICX Power Solutions SRL。保留所有权利。",
      "支持 · 严谨 · 国际化",
    ],
  }[locale];
  return (
    <footer className="border-t border-border bg-[#1b2420] text-slate-300">
      <div className="mx-auto grid w-full grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:px-10 xl:grid-cols-[1.15fr_1fr_1.35fr] xl:gap-14 xl:px-16">
        <div>
          <BrandMark />
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
            {copy.platformA}
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href="https://www.linkedin.com"
              className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
              aria-label="LinkedIn"
            >
              <Linkedin className="size-4" />
            </a>
            <a
              href="mailto:icxps.sale@outlook.com"
              className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
              aria-label="Email"
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {copy.expertiseEyebrow}
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <button
              onClick={() => setLocation("/#services")}
              className="text-left transition hover:text-white"
            >
              {copy.services}
            </button>
            <button
              onClick={() => setLocation("/etudes")}
              className="text-left transition hover:text-white"
            >
              {copy.explorePrograms}
            </button>
            <button
              onClick={() => setLocation("/partenaires")}
              className="text-left transition hover:text-white"
            >
              {copy.partnersButton}
            </button>
            <button
              onClick={() => setLocation("/#about")}
              className="text-left transition hover:text-white"
            >
              {copy.exploreApproach}
            </button>
          </div>
        </div>

        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {copy.secureProject}
          </p>
          <p className="text-sm leading-6 text-slate-400">
            ICX POWER SOLUTIONS SRL
            <br />
            CUI 54675848 · J2026031336000
            <br />
            Str. Hlincea 47, Iași, 700715, Roumanie
            <br />
            <span className="text-slate-500">
              CAEN 7020 · créée le 13 mai 2026
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <button
              onClick={() => setLocation("/confidentialite")}
              className="hover:text-white"
            >
              {footerLabels[0]}
            </button>
            <button
              onClick={() => setLocation("/mentions-legales")}
              className="hover:text-white"
            >
              {footerLabels[1]}
            </button>
            <span>{footerLabels[2]}</span>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full flex-col gap-2 border-t border-slate-800 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10 xl:px-16">
        <span>{footerLabels[3]}</span>
        <span>{footerLabels[4]}</span>
      </div>
    </footer>
  );
}

function Hero({
  locale,
  setLocation,
}: {
  locale: Locale;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  return (
    <section className="relative overflow-hidden border-b border-border bg-[#1b2420] text-white">
      <div className="absolute inset-0 hero-grid opacity-40" />
      <div className="absolute -left-28 top-16 size-[480px] rounded-full bg-amber-600/25 blur-[120px]" />
      <div className="container relative grid min-h-[650px] items-center gap-14 py-20 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
            <span className="size-1.5 rounded-full bg-amber-300" />
            {copy.homeEyebrow}
          </div>
          <p className="text-4xl font-bold uppercase leading-none tracking-[0.04em] text-amber-100 sm:text-5xl lg:text-6xl">
            ICX POWER SOLUTIONS SRL
          </p>
          <h1 className="mt-7 max-w-3xl text-balance text-3xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-4xl lg:text-5xl">
            {copy.homeTitle}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
            {copy.homeLead}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => setLocation("/#services")}
              className="h-12 rounded-full bg-white px-6 text-[#1b2420] hover:bg-amber-50"
            >
              {copy.exploreApproach}
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/etudes")}
              className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10"
            >
              {copy.explorePrograms}
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-amber-300" />
              {copy.confidential}
            </span>
            <span className="flex items-center gap-2">
              <Globe2 className="size-4 text-amber-300" />
              {copy.homeEyebrow}
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-4 text-amber-300" />
              {copy.leadership}
            </span>
          </div>
        </div>
        <div className="relative aspect-[4/3] sm:aspect-[16/10] xl:aspect-auto xl:min-h-[470px]">
          <div className="absolute inset-0 overflow-hidden rounded-[2.2rem] border border-white/15 bg-[#27302b] shadow-[0_0_90px_rgba(183,121,31,.22)]">
            <img
              src="/assets/hero-inclusive-entrepreneurs-1600.webp"
              srcSet="/assets/hero-inclusive-entrepreneurs-800.webp 800w, /assets/hero-inclusive-entrepreneurs-1600.webp 1600w"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
              alt={copy.homeTitle}
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain opacity-90 xl:object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1b2420]/80 via-[#34453b]/15 to-amber-300/10" />
          </div>
          <div className="absolute bottom-6 left-6 max-w-[250px] rounded-2xl border border-white/20 bg-[#1b2420]/70 p-4 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold leading-5">
              {copy.platformTitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
function HomePage({
  locale,
  setLocale,
  setLocation,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <Hero locale={locale} setLocation={setLocation} />
      <main>
        <section className="container py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <Eyebrow>{copy.platformEyebrow}</Eyebrow>
              <h2 className="max-w-md text-4xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-5xl">
                {copy.platformTitle}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl md:p-7">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2rem] bg-amber-100/70 dark:bg-amber-400/10" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-100 font-mono text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                      01
                    </span>
                    <ShieldCheck className="size-5 text-amber-600" />
                  </div>
                  <p className="mt-7 text-base font-semibold leading-7 text-foreground md:text-lg">
                    {copy.platformA}
                  </p>
                  <div className="mt-6 h-1 w-10 rounded-full bg-amber-500 transition-all group-hover:w-16" />
                </div>
              </article>
              <article className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-[#1b2420] p-6 text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl md:p-7">
                <div className="absolute -right-8 -top-8 size-32 rounded-full bg-emerald-300/10" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 font-mono text-xs font-bold text-amber-200">
                      02
                    </span>
                    <ArrowRight className="size-5 text-amber-300" />
                  </div>
                  <p className="mt-7 text-base font-semibold leading-7 text-slate-100 md:text-lg">
                    {copy.platformB}
                  </p>
                  <div className="mt-6 h-1 w-10 rounded-full bg-amber-300 transition-all group-hover:w-16" />
                </div>
              </article>
            </div>
          </div>
        </section>
        <section
          id="services"
          className="scroll-mt-24 bg-muted/45 py-20 md:py-28"
        >
          <div className="container">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <Eyebrow>{copy.expertiseEyebrow}</Eyebrow>
                <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
                  {copy.expertiseTitle}
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation("/etudes")}
                className="w-fit rounded-full"
              >
                {copy.viewStudies}
                <ArrowRight />
              </Button>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <ServiceCard
                  key={service.slug}
                  service={service}
                  index={index}
                  locale={locale}
                  onClick={() => setLocation(`/services/${service.slug}`)}
                />
              ))}
            </div>
          </div>
        </section>
        <section id="about" className="container scroll-mt-24 py-20 md:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1fr]">
            <div className="relative min-h-[400px] overflow-hidden rounded-[2rem] bg-[#1b2420] p-8 text-white">
              <div className="absolute inset-0 hero-grid opacity-50" />
              <div className="relative flex h-full flex-col justify-between">
                <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                  {copy.method}
                </span>
                <p className="mt-20 max-w-sm text-3xl font-medium leading-tight tracking-[-0.035em]">
                  {copy.aboutBody}
                </p>
                <div className="mt-10 flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-semibold">
                      {String(services.length).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {copy.integratedExpertise}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Eyebrow>{copy.aboutEyebrow}</Eyebrow>
              <h2 className="max-w-lg text-4xl font-semibold leading-[1.06] tracking-[-0.045em] md:text-5xl">
                {copy.aboutTitle}
              </h2>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                {copy.aboutBody}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {copy.values.map(([title, text]) => (
                  <Value
                    key={title}
                    icon={
                      title.includes("document") || title.includes("Document")
                        ? CircleCheckBig
                        : title.includes("protect") ||
                            title.includes("Protéger")
                          ? LockKeyhole
                          : title.includes("available") ||
                              title.includes("disponible")
                            ? Users
                            : Lightbulb
                    }
                    title={title}
                    text={text}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-border bg-[#f3f2ed] py-20 dark:bg-[#29332e]/40 md:py-24">
          <div className="container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <Eyebrow>{copy.leadership}</Eyebrow>
              <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.045em]">
                {copy.leadershipTitle}
              </h2>
              <p className="mt-5 max-w-sm text-muted-foreground">
                {copy.leadershipBody}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <PersonCard
                initials="KT"
                name="K. Marcel Traoré"
                role={copy.direction}
                color="bg-amber-600"
                photo="/assets/k-marcel-traore.webp"
                locale={locale}
              />
              <PersonCard
                initials="JL"
                name="Jean Lansana Koundouno"
                role={copy.direction}
                color="bg-slate-800"
                photo="/assets/jean-lansana-enhanced.webp"
                locale={locale}
              />
            </div>
          </div>
        </section>
        <PartnerStrip locale={locale} setLocation={setLocation} />
        <ExpansionStrip locale={locale} setLocation={setLocation} />
      </main>
      <Footer locale={locale} setLocation={setLocation} />
    </PageWrap>
  );
}
function ServiceCard({
  service,
  index,
  locale,
  onClick,
}: {
  service: Service;
  index: number;
  locale: Locale;
  onClick: () => void;
}) {
  const Icon = service.icon;
  const copy = siteCopy[locale];
  const view = serviceTranslations[locale][service.slug]
    ? { ...service, ...serviceTranslations[locale][service.slug] }
    : service;
  return (
    <button
      onClick={onClick}
      className="group relative min-h-[330px] overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
    >
      <img
        src={service.image}
        alt={view.label}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#17211d] via-[#17211d]/65 to-transparent" />
      <div className="relative flex min-h-[330px] flex-col justify-between p-6 text-white">
        <div className="flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-xl bg-white/15 text-white backdrop-blur transition group-hover:bg-amber-500">
            <Icon className="size-5" />
          </span>
          <span className="font-mono text-xs text-white/75">0{index + 1}</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-tight">{view.label}</h3>
          <p className="mt-3 min-h-[52px] text-sm leading-6 text-white/80">
            {view.description}
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-amber-200">
            {copy.viewService}
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}
function Value({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="size-5 text-amber-600" />
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
function PersonCard({
  initials,
  name,
  role,
  color,
  photo,
  locale,
}: {
  initials: string;
  name: string;
  role: string;
  color: string;
  photo?: string;
  locale: Locale;
}) {
  const copy = siteCopy[locale];
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative mx-auto mt-6 grid size-44 place-items-end justify-center overflow-hidden rounded-full bg-white ring-4 ring-amber-100 dark:ring-amber-500/15">
        {photo ? (
          <img
            src={photo}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full scale-[1.12] rounded-full object-contain object-bottom"
          />
        ) : (
          <div
            className={`mb-6 grid size-20 place-items-center rounded-2xl ${color} text-xl font-semibold text-white shadow-lg`}
          >
            {initials}
          </div>
        )}
        <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700 backdrop-blur">
          {copy.direction}
        </span>
      </div>
      <div className="p-6 text-center">
        <p className="text-lg font-semibold">{name}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
function PartnerStrip({
  locale,
  setLocation,
}: {
  locale: Locale;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  return (
    <section className="container py-20 md:py-24">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <Eyebrow>{copy.partnersEyebrow}</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
            {copy.partnersTitle}
          </h2>
        </div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/partenaires")}
          className="w-fit"
        >
          {copy.partnersButton}
          <ArrowRight />
        </Button>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
          <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-border">
            <img
              src="/assets/lorondo-logo.jpg"
              loading="lazy"
              decoding="async"
              alt="Logo Lorondo Services SRL"
              className="size-full object-contain p-1"
            />
          </span>
          <div>
            <p className="font-semibold">Lorondo Services SRL</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.operationalPartner}
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
          <a
            href="https://www.instagram.com/aaft.ro/"
            target="_blank"
            rel="noreferrer"
            className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-border"
          >
            <img
              src="/assets/aaft-official.jpg"
              loading="lazy"
              decoding="async"
              alt="Logo officiel AAFT"
              className="size-full object-cover"
            />
          </a>
          <div>
            <p className="font-semibold">AAFT Association</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "fr"
                ? "Asociația Africanilor pentru Fericirea Tuturor · Roumanie"
                : locale === "en"
                  ? "Association of Africans for the Happiness of All · Romania"
                  : locale === "ro"
                    ? "Asociația Africanilor pentru Fericirea Tuturor · România"
                    : locale === "pl"
                      ? "Stowarzyszenie Afrykanów na rzecz szczęścia wszystkich · Rumunia"
                      : locale === "ar"
                        ? "جمعية الأفارقة من أجل سعادة الجميع · رومانيا"
                        : "非洲人幸福协会 · 罗马尼亚"}
            </p>
          </div>
          <ChevronRight className="ml-auto size-5 text-muted-foreground" />
        </div>
      </div>
    </section>
  );
}

function ExpansionStrip({
  locale,
  setLocation,
}: {
  locale: Locale;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  const tracks = {
    fr: [
      ["Emirates", "Billets & itinéraires"],
      ["Turkish Airlines", "Mobilité internationale"],
      ["Travelpayourts", "Travel-tech à confirmer"],
      ["Hôtels en Afrique", "Séjours & hospitalité"],
      ["Mines africaines", "Développement & coopération"],
    ],
    en: [
      ["Emirates", "Flights & itineraries"],
      ["Turkish Airlines", "International mobility"],
      ["Travelpayourts", "Travel-tech to confirm"],
      ["Hotels in Africa", "Stay & hospitality"],
      ["African mining", "Development & cooperation"],
    ],
    ro: [
      ["Emirates", "Bilete și itinerarii"],
      ["Turkish Airlines", "Mobilitate internațională"],
      ["Travelpayourts", "Travel-tech de confirmat"],
      ["Hoteluri în Africa", "Sejururi și ospitalitate"],
      ["Mine africane", "Dezvoltare și cooperare"],
    ],
    pl: [
      ["Emirates", "Bilety i trasy"],
      ["Turkish Airlines", "Mobilność międzynarodowa"],
      ["Travelpayourts", "Travel-tech do potwierdzenia"],
      ["Hotele w Afryce", "Pobyty i gościnność"],
      ["Afrykańskie kopalnie", "Rozwój i współpraca"],
    ],
    ar: [
      ["Emirates", "تذاكر ومسارات"],
      ["Turkish Airlines", "تنقل دولي"],
      ["Travelpayourts", "تقنيات سفر قيد التأكيد"],
      ["فنادق في أفريقيا", "إقامة وضيافة"],
      ["التعدين الأفريقي", "تنمية وتعاون"],
    ],
    zh: [
      ["Emirates", "机票与行程"],
      ["Turkish Airlines", "国际流动"],
      ["Travelpayourts", "待确认的旅行科技"],
      ["非洲酒店", "住宿与待客"],
      ["非洲矿业", "发展与合作"],
    ],
  }[locale];
  return (
    <section className="border-t border-border bg-muted/35 py-14">
      <div className="container">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow>{copy.expansionEyebrow}</Eyebrow>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em]">
              {copy.expansionTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {copy.expansionBody}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/partenaires")}
            className="w-fit rounded-full"
          >
            {copy.expansionButton}
            <ArrowRight />
          </Button>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tracks.map(([name, detail]) => (
            <button
              key={name}
              onClick={() =>
                setLocation(
                  name.toLowerCase().includes("mine") ||
                    name.includes("التعدين") ||
                    name.includes("矿业")
                    ? "/services/mines-afrique"
                    : name.toLowerCase().includes("hotel") ||
                        name.includes("فنادق") ||
                        name.includes("酒店")
                      ? "/services/voyage-tourisme"
                      : "/services/voyage-tourisme"
                )
              }
              className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <p className="text-sm font-semibold">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
const architectureCopy: Record<
  Service["architecture"],
  { label: string; intents: string[]; assessments: string[]; guidance: string }
> = {
  network: {
    label: "Cartographie & connexions",
    intents: [
      "Lire un marché ou un pays",
      "Identifier des partenaires",
      "Structurer une mission internationale",
    ],
    assessments: [
      "J’ai déjà un périmètre géographique",
      "Je cherche encore les bons interlocuteurs",
      "Je veux une feuille de route complète",
    ],
    guidance: "Un espace de cadrage pour relier pays, acteurs et opportunités.",
  },
  strategic: {
    label: "Atelier de décision",
    intents: [
      "Clarifier mon positionnement",
      "Construire un plan 90 jours",
      "Structurer mon organisation",
    ],
    assessments: [
      "Mon objectif est déjà chiffré",
      "Je dois prioriser mes décisions",
      "Je veux un accompagnement dirigeant",
    ],
    guidance:
      "Un parcours en séquences : diagnostic, arbitrage, mise en œuvre.",
  },
  pipeline: {
    label: "Chaîne de qualification",
    intents: [
      "Trouver un fournisseur",
      "Vérifier une entreprise",
      "Sécuriser une commande",
    ],
    assessments: [
      "J’ai un cahier des charges",
      "Je compare encore les options",
      "Je dois sécuriser un achat rapidement",
    ],
    guidance: "Un pipeline de recherche, vérification, échantillon et suivi.",
  },
  people: {
    label: "Parcours talents",
    intents: [
      "Recruter un profil",
      "Préparer une mobilité",
      "Créer un partenariat RH",
    ],
    assessments: [
      "Le poste est défini",
      "Je dois qualifier le besoin humain",
      "Je veux un suivi employeur-candidat",
    ],
    guidance:
      "Un espace confidentiel pour organisations, candidats et mobilité.",
  },
  trade: {
    label: "Flux import-export",
    intents: [
      "Étudier un flux",
      "Préparer une expédition",
      "Trouver un distributeur",
    ],
    assessments: [
      "Le produit et le pays sont définis",
      "Je dois clarifier documents et Incoterms",
      "Je cherche une coordination de bout en bout",
    ],
    guidance:
      "Une lecture opérationnelle des marchés, documents, transport et partenaires.",
  },
  academic: {
    label: "Dossier académique",
    intents: [
      "Explorer les universités",
      "Comparer des programmes",
      "Préparer une candidature",
    ],
    assessments: [
      "Je connais le pays et le niveau",
      "J’ai besoin d’orientation",
      "Je veux un suivi de dossier",
    ],
    guidance:
      "Un parcours en quatre temps : orientation, sélection, pièces, candidature.",
  },
  property: {
    label: "Étude d’opportunité",
    intents: [
      "Rechercher un logement",
      "Étudier un investissement",
      "Analyser un local ou terrain",
    ],
    assessments: [
      "Mon budget et ma zone sont définis",
      "Je dois évaluer la rentabilité",
      "Je veux coordonner les visites et documents",
    ],
    guidance:
      "Un atelier immobilier pour comparer les types de biens et les risques.",
  },
  travel: {
    label: "Dossier voyage & séjour",
    intents: [
      "Réserver un billet d’avion",
      "Trouver un hôtel en Afrique",
      "Construire un séjour touristique",
    ],
    assessments: [
      "Ma destination et mes dates sont définies",
      "Je compare encore les options",
      "Je veux un accompagnement de bout en bout",
    ],
    guidance:
      "Un parcours pratique pour itinéraire, hébergement, formalités à vérifier et expérience locale.",
  },
  affiliate: {
    label: "Parcours affiliation",
    intents: [
      "Découvrir des marques",
      "Créer un lien de commande",
      "Proposer une marque partenaire",
    ],
    assessments: [
      "Je veux acheter un produit",
      "Je souhaite partager un lien",
      "Je représente une marque",
    ],
    guidance:
      "Un espace transparent pour distinguer la redirection, la commande et la relation avec la marque.",
  },
  mining: {
    label: "Qualification minière",
    intents: [
      "Présenter une société minière",
      "Chercher un partenaire industriel",
      "Préparer une note de coopération",
    ],
    assessments: [
      "Le projet dispose de données initiales",
      "Je cherche à qualifier les interlocuteurs",
      "Je veux coordonner des expertises spécialisées",
    ],
    guidance:
      "Un premier cadrage partenarial qui ne remplace pas les audits techniques, juridiques et ESG.",
  },
};

const serviceDossiers: Record<
  string,
  { label: string; description: string; items: string[] }[]
> = {
  "expertise-internationale": [
    {
      label: "Intelligence marché",
      description: "Comprendre le terrain avant de décider.",
      items: ["Profil pays", "Cartographie acteurs", "Veille sectorielle"],
    },
    {
      label: "Connexions qualifiées",
      description: "Identifier les bons interlocuteurs.",
      items: ["Partenaires locaux", "Institutions", "Réseaux professionnels"],
    },
    {
      label: "Pilotage international",
      description: "Transformer l’analyse en plan d’action.",
      items: ["Feuille de route", "Comité de suivi", "Rapport de décision"],
    },
  ],
  "conseil-business": [
    {
      label: "Diagnostic dirigeant",
      description: "Mettre les priorités au clair.",
      items: ["Positionnement", "Indicateurs clés", "Risques immédiats"],
    },
    {
      label: "Architecture d’entreprise",
      description: "Installer une organisation lisible.",
      items: [
        "Processus internes",
        "Rôles & responsabilités",
        "Plan financier",
      ],
    },
    {
      label: "Croissance commerciale",
      description: "Passer de l’idée au marché.",
      items: ["Go-to-market", "Canaux de vente", "Partenariats B2B"],
    },
  ],
  sourcing: [
    {
      label: "Brief achat",
      description: "Définir précisément ce qui doit être acheté.",
      items: ["Cahier des charges", "Budget cible", "Volumes & délais"],
    },
    {
      label: "Qualification fournisseur",
      description: "Réduire les risques avant engagement.",
      items: ["Existence légale", "Références", "Capacité de production"],
    },
    {
      label: "Contrôle & livraison",
      description: "Suivre la qualité jusqu’à réception.",
      items: ["Échantillons", "Inspection", "Non-conformités"],
    },
  ],
  "ressources-humaines": [
    {
      label: "Workforce planning",
      description: "Relier les besoins aux compétences.",
      items: ["Référentiel de poste", "Plan de recrutement", "Budget RH"],
    },
    {
      label: "Talent pipeline",
      description: "Qualifier les profils avec méthode.",
      items: ["Recherche ciblée", "Préqualification", "Entretien structuré"],
    },
    {
      label: "Mobilité & intégration",
      description: "Accompagner la transition humaine.",
      items: ["Documents mobilité", "Onboarding", "Suivi employeur"],
    },
  ],
  "commerce-international": [
    {
      label: "Préparation des flux",
      description: "Clarifier produit, marché et responsabilités.",
      items: ["Étude de marché", "Incoterms", "Matrice des risques"],
    },
    {
      label: "Documents & conformité",
      description: "Préparer les pièces du passage frontière.",
      items: ["Facture commerciale", "Origine & douane", "Assurance transport"],
    },
    {
      label: "Réseau commercial",
      description: "Créer une présence locale durable.",
      items: ["Distributeurs", "Agents commerciaux", "Accords de coopération"],
    },
  ],
  etudes: [
    {
      label: "Orientation académique",
      description: "Choisir une trajectoire réaliste.",
      items: ["Bilan du profil", "Choix du pays", "Budget & calendrier"],
    },
    {
      label: "Dossier de candidature",
      description: "Transformer un projet en dossier complet.",
      items: ["Universités", "Programmes", "Pièces certifiées"],
    },
    {
      label: "Installation étudiante",
      description: "Préparer l’après-admission.",
      items: ["Visa", "Logement", "Arrivée & intégration"],
    },
  ],
  immobilier: [
    {
      label: "Recherche résidentielle",
      description: "Comparer les biens selon votre usage.",
      items: ["Appartement", "Maison", "Location longue durée"],
    },
    {
      label: "Investissement",
      description: "Lire l’opportunité et ses risques.",
      items: ["Rendement locatif", "Analyse de marché", "Due diligence"],
    },
    {
      label: "Projet professionnel",
      description: "Sécuriser un local, terrain ou projet.",
      items: ["Local commercial", "Terrain", "Coordination des visites"],
    },
  ],
  "voyage-tourisme": [
    {
      label: "Billets d’avion",
      description: "Comparer les itinéraires et conditions avant réservation.",
      items: ["Recherche de vol", "Emirates", "Turkish Airlines"],
    },
    {
      label: "Hôtels & transferts",
      description: "Préparer un séjour en Afrique avec des options adaptées.",
      items: ["Hôtels partenaires", "Transferts locaux", "Séjour sur mesure"],
    },
    {
      label: "Conseil touristique",
      description:
        "Donner un cadre clair à l’expérience et aux étapes du voyage.",
      items: ["Destination", "Programme culturel", "Informations à vérifier"],
    },
  ],
  "affiliation-produits": [
    {
      label: "Marques & catégories",
      description:
        "Explorer des offres de différentes marques depuis le portail.",
      items: ["Mode & équipement", "Technologie", "Produits du quotidien"],
    },
    {
      label: "Lien de commande",
      description: "Rediriger vers la marque avec des conditions lisibles.",
      items: ["Créer un lien", "Suivi du clic", "Information commission"],
    },
    {
      label: "Partenariat commercial",
      description: "Proposer une marque ou un catalogue à intégrer.",
      items: ["Proposer une marque", "Qualification", "Accord de coopération"],
    },
  ],
  "mines-afrique": [
    {
      label: "Profil du projet",
      description: "Rassembler les éléments de première qualification.",
      items: ["Société minière", "Localisation", "Substance & objectifs"],
    },
    {
      label: "Partenaires industriels",
      description: "Relier projets, investisseurs et opérateurs spécialisés.",
      items: ["Investisseurs", "Équipements", "Opérateurs"],
    },
    {
      label: "Coopération responsable",
      description: "Préparer les points à vérifier avant tout engagement.",
      items: ["Réglementation", "Risques ESG", "Comité de suivi"],
    },
  ],
};

type WorkflowMeta = {
  label: string;
  guidance: string;
  intents: string[];
  assessments: string[];
};
const localizedWorkflowMeta: Partial<
  Record<Locale, Record<string, WorkflowMeta>>
> = {
  ro: {
    "voyage-tourisme": {
      label: "Călătorii și turism",
      guidance:
        "Alegeți punctul de plecare pentru a construi un brief de călătorie clar și documentat.",
      intents: [
        "Planific o călătorie",
        "Caut zboruri și cazare",
        "Am nevoie de consultanță pentru destinație",
      ],
      assessments: [
        "Am deja datele călătoriei",
        "Compar opțiuni și buget",
        "Vreau o propunere personalizată",
      ],
    },
    "affiliation-produits": {
      label: "Afiliere și produse",
      guidance:
        "Clarificați categoria și tipul de parteneriat pentru a crea o direcție comercială verificabilă.",
      intents: [
        "Caut un produs",
        "Vreau să propun un brand",
        "Doresc să creez un link afiliat",
      ],
      assessments: [
        "Am o categorie clară",
        "Compar branduri și condiții",
        "Vreau să discut un parteneriat",
      ],
    },
  },
  pl: {
    "voyage-tourisme": {
      label: "Podróże i turystyka",
      guidance:
        "Wybierz punkt wyjścia, aby zbudować jasny i udokumentowany brief podróży.",
      intents: [
        "Planuję podróż",
        "Szukam lotów i zakwaterowania",
        "Potrzebuję doradztwa dotyczącego kierunku",
      ],
      assessments: [
        "Mam już daty podróży",
        "Porównuję opcje i budżet",
        "Chcę otrzymać propozycję",
      ],
    },
    "affiliation-produits": {
      label: "Afiliacja i produkty",
      guidance:
        "Określ kategorię i rodzaj współpracy, aby stworzyć możliwy do zweryfikowania kierunek handlowy.",
      intents: [
        "Szukam produktu",
        "Chcę zaproponować markę",
        "Chcę utworzyć link afiliacyjny",
      ],
      assessments: [
        "Mam określoną kategorię",
        "Porównuję marki i warunki",
        "Chcę omówić partnerstwo",
      ],
    },
  },
  ar: {
    "voyage-tourisme": {
      label: "السفر والسياحة",
      guidance: "اختر نقطة البداية لبناء موجز سفر واضح وموثق.",
      intents: [
        "أخطط لرحلة",
        "أبحث عن الرحلات والإقامة",
        "أحتاج إلى استشارة حول الوجهة",
      ],
      assessments: [
        "لدي تواريخ الرحلة",
        "أقارن الخيارات والميزانية",
        "أريد عرضاً مخصصاً",
      ],
    },
    "affiliation-produits": {
      label: "التسويق بالعمولة والمنتجات",
      guidance: "حدد الفئة ونوع الشراكة لبناء مسار تجاري قابل للتحقق.",
      intents: [
        "أبحث عن منتج",
        "أريد اقتراح علامة تجارية",
        "أرغب في إنشاء رابط إحالة",
      ],
      assessments: [
        "لدي فئة واضحة",
        "أقارن العلامات والشروط",
        "أريد مناقشة شراكة",
      ],
    },
  },
  zh: {
    "voyage-tourisme": {
      label: "旅行与旅游",
      guidance: "选择起点，建立清晰且有记录的旅行需求简报。",
      intents: ["我正在计划旅行", "我在寻找机票和住宿", "我需要目的地咨询"],
      assessments: [
        "我已有旅行日期",
        "我正在比较方案和预算",
        "我希望获得定制方案",
      ],
    },
    "affiliation-produits": {
      label: "联盟与产品",
      guidance: "明确产品类别和合作类型，建立可核实的商业方向。",
      intents: ["我在寻找产品", "我想推荐一个品牌", "我想创建联盟链接"],
      assessments: ["我已有明确品类", "我正在比较品牌和条件", "我想讨论合作"],
    },
  },
};

function ServiceWorkflow({
  service,
  locale,
  need,
  step,
  setStep,
  onClose,
  setLocation,
}: {
  service: Service;
  locale: Locale;
  need: string;
  step: "detail" | "assessment" | "auth";
  setStep: (step: "detail" | "assessment" | "auth") => void;
  onClose: () => void;
  setLocation: (path: string) => void;
}) {
  const Icon = service.icon;
  const meta =
    localizedWorkflowMeta[locale]?.[service.slug] ||
    architectureCopy[service.architecture];
  const copy = { ...translations[locale].ui, ...siteCopy[locale] };
  const { user } = useAuth();
  const save = trpc.workflow.save.useMutation();
  const utils = trpc.useUtils();
  const draftKey = `icx-draft-${service.slug}-${need}`;
  const [draftSaved, setDraftSaved] = useState(() =>
    Boolean(readLocalStorage(draftKey))
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const submit = trpc.requests.create.useMutation({
    onSuccess: async result => {
      removeLocalStorage(draftKey);
      await Promise.all([
        utils.requests.mine.invalidate(),
        utils.requests.documents.invalidate(),
        utils.notifications.mine.invalidate(),
      ]);
      toast.success(
        result.receiptEmailSent
          ? "ICX a bien reçu votre demande et un accusé a été envoyé à l’adresse e-mail de votre compte."
          : "ICX a bien reçu votre demande. L’accusé e-mail n’a pas pu être envoyé pour le moment."
      );
      onClose();
    },
    onError: e => toast.error(e.message),
  });
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [identity, setIdentity] = useState({
    username: "",
    country: "",
    phoneCode: "+40",
    phone: "",
    guardianPhoneCode: "+40",
    guardianPhone: "",
  });
  const [isMinor, setIsMinor] = useState(false);
  const [studyTarget, setStudyTarget] = useState({
    country: "",
    university: "",
    program: "",
  });
  const requiredDocuments =
    service.architecture === "academic"
      ? [
          "Passeport ou pièce d’identité",
          "Diplômes et relevés de notes",
          "CV",
          "Preuve de langue",
        ]
      : service.architecture === "property"
        ? [
            "Pièce d’identité",
            "Justificatif de budget",
            "Documents du bien ou critères de recherche",
          ]
        : service.architecture === "trade" ||
            service.architecture === "pipeline"
          ? [
              "Pièce d’identité",
              "Cahier des charges ou description du produit",
              "Budget et calendrier",
              "Documents commerciaux disponibles",
            ]
          : [
              "Pièce d’identité",
              "Présentation du projet ou besoin",
              "Budget et calendrier",
              "Pièces justificatives utiles",
            ];
  const studyUniversities = Array.from(
    new Set(
      programs
        .filter(
          program =>
            !studyTarget.country || program.country === studyTarget.country
        )
        .map(program => program.university)
    )
  );
  const [attachments, setAttachments] = useState<
    { fileName: string; mimeType: string; fileSize: number; data: string }[]
  >([]);
  const progressPercent =
    step === "detail" ? 33 : step === "assessment" ? 66 : 100;
  const readFile = (file: File) =>
    new Promise<{
      fileName: string;
      mimeType: string;
      fileSize: number;
      data: string;
    }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          data: String(reader.result).split(",")[1] || "",
        });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  const handleAttachments = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files)
      .filter(file => file.size <= 8_000_000)
      .slice(0, 10);
    if (selected.length < files.length)
      toast.error("10 fichiers maximum, 8 Mo par fichier.");
    try {
      setAttachments(await Promise.all(selected.map(readFile)));
    } catch {
      toast.error("Impossible de préparer un document.");
    }
  };
  const saveDraft = () => {
    const saved = writeLocalStorage(
      draftKey,
      JSON.stringify({
        answer,
        message,
        identity,
        isMinor,
        studyTarget,
        attachments,
        scheduledAt,
      })
    );
    if (saved) {
      setDraftSaved(true);
      toast.success("Brouillon enregistré.");
    } else {
      toast.error("Le stockage local est indisponible sur cet appareil.");
    }
  };
  const cancelDraft = () => {
    removeLocalStorage(draftKey);
    setDraftSaved(false);
    setMessage("");
    setAttachments([]);
    setScheduledAt("");
    toast.success("Brouillon annulé.");
  };
  const name = user?.name || "";
  const firstName = name.split(" ")[0] || "Client";
  const lastName = name.split(" ").slice(1).join(" ") || "ICX";
  useEffect(() => {
    if (user)
      save.mutate({ serviceKey: service.slug, need, step, answers: answer });
  }, [step, answer, need, service.slug, user?.id]);
  useEffect(() => {
    const raw = readLocalStorage(draftKey);
    if (raw)
      try {
        const d = JSON.parse(raw);
        setAnswer(d.answer || "");
        setMessage(d.message || "");
        setIdentity(
          d.identity || {
            username: "",
            country: "",
            phoneCode: "+40",
            phone: "",
            guardianPhoneCode: "+40",
            guardianPhone: "",
          }
        );
        setIsMinor(Boolean(d.isMinor));
        setStudyTarget(
          d.studyTarget || { country: "", university: "", program: "" }
        );
        setAttachments(d.attachments || []);
        setScheduledAt(d.scheduledAt || "");
      } catch {
        removeLocalStorage(draftKey);
      }
  }, [draftKey]);
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#17201c]/65 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Parcours ${need}`}
    >
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-border bg-card shadow-2xl">
        <div className="absolute right-16 top-5 z-10">
          <InfoBubble
            title="Avant l’envoi"
            text="Les documents requis sont listés avant l’envoi. Un dossier transmis ne peut plus être modifié depuis le portail ; contactez ICX pour demander une correction."
          />
        </div>
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="border-b border-border bg-muted/50 p-7 pr-16">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                {meta.label}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{need}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {meta.guidance}
          </p>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <span>{copy.progression}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span
                className={step === "detail" ? "font-bold text-amber-700" : ""}
              >
                {copy.framing}
              </span>
              <span
                className={
                  step === "assessment" ? "font-bold text-amber-700" : ""
                }
              >
                {copy.assessment}
              </span>
              <span
                className={step === "auth" ? "font-bold text-amber-700" : ""}
              >
                {copy.request}
              </span>
            </div>
          </div>
        </div>
        {step === "detail" && (
          <div className="p-7">
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.chooseEntry}. {copy.chooseEntryBody}
            </p>
            <div className="mt-6 grid gap-3">
              {meta.intents.map((option, index) => (
                <button
                  key={option}
                  onClick={() => {
                    setAnswer(option);
                    setStep("assessment");
                  }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-amber-100 font-mono text-xs text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                    0{index + 1}
                  </span>
                  <span className="flex-1">{option}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
        {step === "assessment" && (
          <div className="p-7">
            <p className="text-sm leading-6 text-muted-foreground">
              {copy.assessmentBody}
            </p>
            <div className="mt-6 space-y-3">
              {meta.assessments.map((option, index) => (
                <button
                  key={option}
                  onClick={() => {
                    setAnswer(option);
                    setStep("auth");
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-4 text-left transition hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-400/10"
                >
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-200">
                    0{index + 1}
                  </span>
                  <span className="text-sm font-semibold">{option}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("detail")}
              className="mt-6 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {copy.backChoice}
            </button>
          </div>
        )}
        {step === "auth" && (
          <div className="p-7">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
              <ShieldCheck className="size-6" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold">
              {user ? copy.finalise : copy.secureProject}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {user ? copy.finaliseBody : copy.secureProjectBody}
            </p>
            {user ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={event => {
                  event.preventDefault();
                  submit.mutate({
                    serviceKey: service.slug,
                    firstName,
                    lastName,
                    email: user.email || "client@icx.local",
                    phone: identity.phone
                      ? `${identity.phoneCode} ${identity.phone}`
                      : undefined,
                    country: identity.country || undefined,
                    message: `${identity.username ? `[${copy.username}: ${identity.username}] ` : ""}${identity.country ? `[${copy.country}: ${identity.country}] ` : ""}${identity.phone ? `[Téléphone: ${identity.phoneCode} ${identity.phone}] ` : ""}${service.architecture === "academic" ? `[Pays d’étude: ${studyTarget.country || "à préciser"}] [Université: ${studyTarget.university || "à préciser"}] [Programme: ${studyTarget.program || need}] ` : ""}${isMinor ? `[Demandeur mineur · garant/interlocuteur: ${identity.guardianPhoneCode} ${identity.guardianPhone}] ` : ""}${message || `${need} — ${answer}`}`,
                    appointmentAt: scheduledAt || undefined,
                    attachments,
                  });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={identity.username}
                    onChange={event =>
                      setIdentity(current => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder={copy.username}
                    className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <CountryField
                    required
                    value={identity.country}
                    onChange={value =>
                      setIdentity(current => ({
                        ...current,
                        country: value,
                        phoneCode:
                          callingCodeForCountry(value, locale) ||
                          current.phoneCode,
                      }))
                    }
                    locale={locale}
                    placeholder="Pays de résidence (choisir ou saisir)"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[.42fr_1fr]">
                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Code pays
                    </label>
                    <PhoneCodeField
                      value={identity.phoneCode}
                      onChange={value =>
                        setIdentity(current => ({
                          ...current,
                          phoneCode: value,
                        }))
                      }
                      label="Code pays"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold">
                      Téléphone
                    </label>
                    <input
                      required
                      value={identity.phone}
                      onChange={event =>
                        setIdentity(current => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Numéro sans le code pays"
                      className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                    />
                  </div>
                </div>
                <>
                  {service.architecture === "academic" && (
                    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-200">
                        Projet d’études
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CountryField
                          value={studyTarget.country}
                          onChange={value =>
                            setStudyTarget(current => ({
                              ...current,
                              country: value,
                              university: "",
                            }))
                          }
                          locale={locale}
                          placeholder="Choisir ou saisir un pays d’étude"
                        />
                        <select
                          value={studyTarget.university}
                          onChange={event =>
                            setStudyTarget(current => ({
                              ...current,
                              university: event.target.value,
                            }))
                          }
                          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Choisir une université</option>
                          {studyUniversities.map(item => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={studyTarget.program}
                        onChange={event =>
                          setStudyTarget(current => ({
                            ...current,
                            program: event.target.value,
                          }))
                        }
                        placeholder="Programme souhaité (ou proposition libre)"
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={isMinor}
                          onChange={event => setIsMinor(event.target.checked)}
                        />
                        Le demandeur est mineur
                      </label>
                      {isMinor && (
                        <div className="grid gap-3 sm:grid-cols-[.42fr_1fr]">
                          <PhoneCodeField
                            value={identity.guardianPhoneCode}
                            onChange={value =>
                              setIdentity(current => ({
                                ...current,
                                guardianPhoneCode: value,
                              }))
                            }
                            label="Indicatif du garant"
                          />
                          <input
                            required
                            value={identity.guardianPhone}
                            onChange={event =>
                              setIdentity(current => ({
                                ...current,
                                guardianPhone: event.target.value,
                              }))
                            }
                            placeholder="Téléphone du garant ou interlocuteur"
                            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>{" "}
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">
                    Documents utiles pour ce service
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {requiredDocuments.map(doc => (
                      <span
                        key={doc}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <FileCheck2 className="size-3.5 text-emerald-600" />
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
                <textarea
                  required
                  minLength={5}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  placeholder={copy.workflowPlaceholder}
                  className="min-h-28 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  <Paperclip className="size-4" />
                  <span className="flex-1">
                    {copy.addDocuments}{" "}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {copy.documentHint}
                    </span>
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={event =>
                      void handleAttachments(event.target.files)
                    }
                    className="sr-only"
                  />
                </label>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, i) => (
                      <div
                        key={`${file.fileName}-${i}`}
                        className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs font-semibold"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {file.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments(a => a.filter((_, j) => j !== i))
                          }
                          className="text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold">
                    Avant l’envoi définitif
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Enregistrez ou annulez votre brouillon, puis indiquez un
                    créneau de rendez-vous souhaité. Après envoi, les pièces
                    sont conservées et le créneau reste à confirmer par ICX.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveDraft}
                      className="flex-1"
                    >
                      {draftSaved
                        ? "Brouillon mis à jour"
                        : "Mettre en attente"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={cancelDraft}
                      className="flex-1 text-destructive"
                    >
                      Annuler / supprimer
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor="scheduled-send"
                      className="text-xs font-semibold"
                    >
                      Rendez-vous souhaité
                    </label>
                    <input
                      id="scheduled-send"
                      type="datetime-local"
                      min={new Date(
                        Date.now() - new Date().getTimezoneOffset() * 60_000
                      )
                        .toISOString()
                        .slice(0, 16)}
                      value={scheduledAt}
                      onChange={e => {
                        setScheduledAt(e.target.value);
                        setTimeout(saveDraft, 0);
                      }}
                      className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Créneau indicatif dans votre heure locale, à confirmer par
                    ICX.
                  </p>
                </div>
                <Button
                  disabled={submit.isPending}
                  type="submit"
                  className="h-11 w-full rounded-xl"
                >
                  {submit.isPending
                    ? copy.saving
                    : "Envoyer définitivement la demande"}
                  <ArrowRight />
                </Button>
              </form>
            ) : (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => setLocation("/inscription")}
                  className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
                >
                  {copy.create}
                  <ArrowRight />
                </Button>
                <Button
                  onClick={() => setLocation("/connexion")}
                  variant="outline"
                  className="rounded-full"
                >
                  {copy.login}
                  <LogIn />
                </Button>
              </div>
            )}
            <button
              onClick={() => setStep("assessment")}
              className="mt-6 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {copy.editAnswer}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkPermitWorkflow({
  locale,
  need,
  onClose,
  setLocation,
}: {
  locale: Locale;
  need: string;
  onClose: () => void;
  setLocation: (path: string) => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [applicant, setApplicant] = useState({
    firstName: user?.name?.split(/\s+/)[0] || "",
    lastName: user?.name?.split(/\s+/).slice(1).join(" ") || "",
    email: user?.email || "",
    residenceCountry: "",
    hostCountry: "Roumanie",
    phoneCode: "+40",
    phone: "",
    guarantorName: "",
    guarantorEmail: "",
    guarantorCountry: "",
    guarantorCode: "+40",
    guarantorPhone: "",
  });
  const [appointment, setAppointment] = useState("");
  const [files, setFiles] = useState<
    { fileName: string; mimeType: string; fileSize: number; data: string }[]
  >([]);
  const [agreements, setAgreements] = useState({
    genuine: false,
    hostWork: false,
    contractTerms: false,
    law: false,
    noPromise: false,
  });
  const allAgreementsAccepted = Object.values(agreements).every(Boolean);
  const submit = trpc.requests.create.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.requests.mine.invalidate(),
        utils.requests.documents.invalidate(),
        utils.notifications.mine.invalidate(),
      ]);
      toast.success(
        result.receiptEmailSent
          ? "Votre dossier est reçu et l’accusé de réception a été envoyé par e-mail."
          : "Votre dossier est reçu dans votre espace. L’envoi de l’e-mail de confirmation n’est pas disponible pour le moment."
      );
      onClose();
    },
    onError: error => toast.error(error.message),
  });
  const readFile = (file: File) =>
    new Promise<{
      fileName: string;
      mimeType: string;
      fileSize: number;
      data: string;
    }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          data: String(reader.result).split(",")[1] || "",
        });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  const chooseFiles = async (selected: FileList | null) => {
    if (!selected) return;
    const chosen = Array.from(selected)
      .filter(file => file.size <= 8_000_000)
      .slice(0, 10);
    if (chosen.length !== selected.length)
      toast.error("10 fichiers maximum, 8 Mo par fichier.");
    try {
      setFiles(await Promise.all(chosen.map(readFile)));
    } catch {
      toast.error("Impossible de lire une des pièces jointes.");
    }
  };
  const submitApplication = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!files.length)
      return toast.error("Joignez au moins une pièce du dossier.");
    if (!allAgreementsAccepted)
      return toast.error("Veuillez confirmer chaque déclaration obligatoire.");
    const statements = [
      `Service demandé : Permis de travail via contrat de travail — ${need}`,
      `Pays de résidence / origine : ${applicant.residenceCountry}`,
      `Pays d'accueil souhaité : ${applicant.hostCountry}`,
      `Téléphone candidat : ${applicant.phoneCode} ${applicant.phone}`,
      `Garant : ${applicant.guarantorName} · ${applicant.guarantorEmail} · ${applicant.guarantorCountry} · ${applicant.guarantorCode} ${applicant.guarantorPhone}`,
      "Déclarations confirmées : pièces présentées comme authentiques et non falsifiées; engagement de travailler uniquement dans le pays d'accueil indiqué et sous la responsabilité d'ICX; prise de connaissance des clauses du contrat de prestation qui sera communiqué si le dossier est accepté; respect des lois du pays d'accueil; compréhension qu'aucune promesse d'emploi, de permis ou d'acceptation n'est faite.",
      "Le demandeur reconnaît qu'un dépôt de pièces ne constitue pas un contrat de travail, une autorisation administrative, une promesse d'embauche ou un avis juridique.",
    ].join("\n");
    submit.mutate({
      serviceKey: "permis-travail",
      firstName: applicant.firstName.trim(),
      lastName: applicant.lastName.trim(),
      email: applicant.email.trim(),
      phone: `${applicant.phoneCode} ${applicant.phone}`.trim(),
      country: applicant.hostCountry.trim(),
      message: statements,
      appointmentAt: appointment || undefined,
      attachments: files,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#17201c]/70 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Demande de permis de travail"
    >
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>
        <div className="relative overflow-hidden border-b border-border bg-[#1d2521] p-7 pr-16 text-white sm:p-9">
          <img
            src="/assets/work-contracts.webp"
            alt="Signature de documents professionnels"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-[#142019]/75" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              ICX · Travail & mobilité
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Permis de travail par contrat de travail
            </h2>
            <p className="mt-2 text-sm text-slate-200">{need}</p>
            <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-300">
              Dossier confidentiel pour la Roumanie et les pays européens ou
              autres destinations que l’ICX pourra ajouter. Chaque destination
              est soumise à vérification des règles applicables.
            </p>
          </div>
        </div>
        {!user ? (
          <div className="p-7">
            <p className="text-sm leading-6 text-muted-foreground">
              Connectez-vous ou créez un compte pour téléverser vos pièces et
              suivre ce dossier dans votre espace sécurisé.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => setLocation("/connexion")}>
                Se connecter
                <LogIn />
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/inscription")}
              >
                Créer mon compte
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitApplication} className="space-y-6 p-6 sm:p-8">
            <section>
              <h3 className="font-semibold">Identité et coordonnées</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Prénom
                  <input
                    required
                    maxLength={120}
                    autoComplete="given-name"
                    value={applicant.firstName}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Nom
                  <input
                    required
                    maxLength={120}
                    autoComplete="family-name"
                    value={applicant.lastName}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Adresse e-mail valide
                  <input
                    required
                    type="email"
                    maxLength={320}
                    autoComplete="email"
                    value={applicant.email}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <CountryField
                  required
                  label="Pays d’origine ou de résidence"
                  value={applicant.residenceCountry}
                  onChange={value =>
                    setApplicant(current => ({
                      ...current,
                      residenceCountry: value,
                      phoneCode:
                        callingCodeForCountry(value, locale) ||
                        current.phoneCode,
                    }))
                  }
                  locale={locale}
                  placeholder="Choisir ou saisir votre pays"
                />
                <PhoneCodeField
                  value={applicant.phoneCode}
                  onChange={value =>
                    setApplicant(current => ({ ...current, phoneCode: value }))
                  }
                  label="Indicatif téléphonique de votre pays"
                />
                <label className="text-sm font-medium sm:col-span-2">
                  Téléphone
                  <input
                    required
                    type="tel"
                    autoComplete="tel-national"
                    value={applicant.phone}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Numéro sans l’indicatif"
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <CountryField
                  required
                  label="Pays d’accueil visé"
                  value={applicant.hostCountry}
                  onChange={value =>
                    setApplicant(current => ({
                      ...current,
                      hostCountry: value,
                    }))
                  }
                  locale={locale}
                  placeholder="Choisir ou saisir le pays d’accueil"
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                La Roumanie est incluse. Les options peuvent s’étendre à
                d’autres pays; l’éligibilité et les documents nécessaires sont
                vérifiés selon le droit local et européen.
              </p>
            </section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <div>
                  <h3 className="font-semibold">Pièces à transmettre</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Selon votre situation : passeport ou pièce d’identité, CV,
                    diplômes et qualifications, justificatif de résidence, et
                    tout document utile relatif au travail ou au séjour.
                  </p>
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-amber-400 bg-card px-4 py-4 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <UploadCloud className="size-5" />
                <span className="flex-1">
                  Téléverser tous les dossiers et justificatifs
                  <span className="block text-xs font-normal text-muted-foreground">
                    PDF, images ou documents · jusqu’à 10 fichiers · 8 Mo par
                    fichier
                  </span>
                </span>
                <input
                  type="file"
                  multiple
                  required={files.length === 0}
                  onChange={event => void chooseFiles(event.target.files)}
                  className="sr-only"
                />
              </label>
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.fileName}-${index}`}
                      className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs"
                    >
                      <Paperclip className="size-3.5 text-amber-600" />
                      <span className="min-w-0 flex-1 truncate">
                        {file.fileName}
                      </span>
                      <span>{Math.ceil(file.fileSize / 1024)} Ko</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles(current =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index
                            )
                          )
                        }
                        aria-label={`Retirer ${file.fileName}`}
                        className="text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h3 className="font-semibold">Garant</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Nom complet du garant
                  <input
                    required
                    maxLength={180}
                    value={applicant.guarantorName}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        guarantorName: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <label className="text-sm font-medium">
                  E-mail du garant
                  <input
                    required
                    type="email"
                    maxLength={320}
                    value={applicant.guarantorEmail}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        guarantorEmail: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
                <CountryField
                  required
                  label="Pays du garant"
                  value={applicant.guarantorCountry}
                  onChange={value =>
                    setApplicant(current => ({
                      ...current,
                      guarantorCountry: value,
                      guarantorCode:
                        callingCodeForCountry(value, locale) ||
                        current.guarantorCode,
                    }))
                  }
                  locale={locale}
                  placeholder="Choisir ou saisir un pays"
                />
                <PhoneCodeField
                  value={applicant.guarantorCode}
                  onChange={value =>
                    setApplicant(current => ({
                      ...current,
                      guarantorCode: value,
                    }))
                  }
                  label="Indicatif du garant"
                />
                <label className="text-sm font-medium sm:col-span-2">
                  Téléphone du garant
                  <input
                    required
                    type="tel"
                    value={applicant.guarantorPhone}
                    onChange={event =>
                      setApplicant(current => ({
                        ...current,
                        guarantorPhone: event.target.value,
                      }))
                    }
                    placeholder="Numéro sans l’indicatif"
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3"
                  />
                </label>
              </div>
            </section>
            <section>
              <label className="block text-sm font-semibold">
                Demander une prise de rendez-vous (facultatif)
                <input
                  type="datetime-local"
                  min={new Date(
                    Date.now() - new Date().getTimezoneOffset() * 60_000
                  )
                    .toISOString()
                    .slice(0, 16)}
                  value={appointment}
                  onChange={event => setAppointment(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm sm:max-w-sm"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Il s’agit d’une disponibilité souhaitée, et non d’un rendez-vous
                confirmé. ICX vous confirmera le créneau.
              </p>
            </section>
            <section className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6">
              <h3 className="font-semibold">Déclarations obligatoires</h3>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={agreements.genuine}
                  onChange={event =>
                    setAgreements(current => ({
                      ...current,
                      genuine: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-amber-600"
                />
                <span>
                  Je certifie que les dossiers transmis sont exacts et ne sont
                  pas falsifiés. Toute falsification peut conduire à la rupture
                  du contrat de prestation et aux poursuites prévues par la loi.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={agreements.hostWork}
                  onChange={event =>
                    setAgreements(current => ({
                      ...current,
                      hostWork: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-amber-600"
                />
                <span>
                  Je m’engage à venir travailler uniquement dans le pays
                  d’accueil indiqué et sous la responsabilité d’ICX POWER
                  SOLUTIONS SRL.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={agreements.contractTerms}
                  onChange={event =>
                    setAgreements(current => ({
                      ...current,
                      contractTerms: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-amber-600"
                />
                <span>
                  Je prends acte que, si mon dossier est accepté, je devrai
                  examiner puis respecter les clauses du contrat de prestation
                  qui me sera communiqué.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={agreements.law}
                  onChange={event =>
                    setAgreements(current => ({
                      ...current,
                      law: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-amber-600"
                />
                <span>
                  Je m’engage à respecter les lois du pays d’accueil, notamment
                  celles de la Roumanie et les règles européennes applicables.
                  Les règles du pays choisi devront être confirmées.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  required
                  checked={agreements.noPromise}
                  onChange={event =>
                    setAgreements(current => ({
                      ...current,
                      noPromise: event.target.checked,
                    }))
                  }
                  className="mt-1 size-4 accent-amber-600"
                />
                <span>
                  Je comprends qu’aucune promesse de travail, de permis,
                  d’admission ou d’acceptation de mon dossier n’existe et que le
                  dépôt ne vaut ni contrat ni autorisation.
                </span>
              </label>
            </section>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <strong>Après l’envoi :</strong> votre demande sera enregistrée et
              l’équipe ICX pourra l’examiner. Si elle est acceptée, les
              modalités d’un contrat de prestation seront communiquées pour
              examen. Un contrat de travail, un permis ou une embauche ne sont
              pas générés ni garantis automatiquement par le dépôt. L’option de
              rendez-vous reste à confirmer.
            </div>
            <Button
              type="submit"
              disabled={
                submit.isPending || !allAgreementsAccepted || files.length === 0
              }
              className="h-12 w-full rounded-xl"
            >
              {submit.isPending
                ? "Transmission du dossier…"
                : "Envoyer mon dossier à ICX"}
              <ArrowRight />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ServicePage({
  service,
  locale,
  setLocale,
  setLocation,
}: {
  service: Service;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const view = serviceTranslations[locale][service.slug]
    ? { ...service, ...serviceTranslations[locale][service.slug] }
    : service;
  const copy = siteCopy[locale];
  const [activeTab, setActiveTab] = useState(view.tabs[0]);
  const resumeKey = `icx-workflow-${service.slug}`;
  const [selectedNeed, setSelectedNeed] = useState<string | null>(() =>
    readLocalStorage(`${resumeKey}-need`)
  );
  const [workflowStep, setWorkflowStep] = useState<
    "detail" | "assessment" | "auth"
  >(() => {
    const savedStep = readLocalStorage(`${resumeKey}-step`);
    return savedStep === "assessment" || savedStep === "auth"
      ? savedStep
      : "detail";
  });
  useEffect(() => {
    setActiveTab(view.tabs[0]);
  }, [locale, service.slug]);
  useEffect(() => {
    if (selectedNeed) writeLocalStorage(`${resumeKey}-need`, selectedNeed);
    else removeLocalStorage(`${resumeKey}-need`);
    writeLocalStorage(`${resumeKey}-step`, workflowStep);
  }, [resumeKey, selectedNeed, workflowStep]);
  const Icon = service.icon;
  const dossiers = view.outcomes.map((outcome, index) => ({
    label: outcome,
    description: copy.serviceMethodBody,
    items: [
      view.tabs[index + 1] || view.tabs[0],
      view.tabs[(index + 2) % view.tabs.length] || view.tabs[0],
      copy.startRequest,
    ],
  }));
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main>
        <section className="relative overflow-hidden border-b border-border bg-[#1d2521] py-20 text-white md:py-28">
          <img
            src={service.image}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-[#142019]/80" />
          <div className="absolute inset-0 hero-grid opacity-30" />
          <div className="container relative">
            <div className="mb-6 flex justify-end">
              <InfoBubble
                title={view.label}
                text="Utilisez les onglets et les actions pour préciser votre besoin. La bulle indique les informations utiles à cette étape."
              />
            </div>
            <Link
              href="/"
              className="mb-12 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowRight className="size-4 rotate-180" />
              {copy.backHome}
            </Link>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
              <div>
                <div className="mb-6 flex items-center gap-3 text-amber-300">
                  <span className="grid size-12 place-items-center rounded-2xl bg-amber-400/10">
                    <Icon />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {view.eyebrow}
                  </span>
                </div>
                <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] md:text-7xl">
                  {view.label}
                </h1>
                <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                  {view.description}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {copy.expected}
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {view.outcomes.map(outcome => (
                    <div
                      key={outcome}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Check className="size-4 text-amber-300" />
                      {outcome}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-10">
          <div className="flex gap-2 overflow-x-auto border-b border-border pb-px">
            {view.tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? "border-amber-600 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {dossiers.map((dossier, index) => (
              <Card key={dossier.label} className="rounded-2xl bg-card/80">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid size-8 place-items-center rounded-lg bg-amber-100 font-mono text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                      0{index + 1}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-semibold">{dossier.label}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {dossier.description}
                  </p>
                  <div className="mt-4 space-y-2">
                    {dossier.items.map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          setSelectedNeed(item);
                          setWorkflowStep("detail");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition hover:bg-muted"
                      >
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        {item}
                        <ChevronRight className="ml-auto size-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-12 py-14 lg:grid-cols-[1fr_.8fr]">
            <div>
              <Eyebrow>{activeTab}</Eyebrow>
              <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em]">
                {copy.serviceMethodTitle}
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                {activeTab === view.tabs[0]
                  ? view.description
                  : copy.serviceMethodBody}
              </p>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {dossiers[
                  Math.max(0, view.tabs.indexOf(activeTab) - 1)
                ]?.items.map((item, index) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSelectedNeed(item);
                      setWorkflowStep("detail");
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-amber-50 font-mono text-xs font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                      0{index + 1}
                    </span>
                    <span className="flex-1 text-sm font-semibold">{item}</span>
                    <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
            <Card className="h-fit rounded-3xl border-amber-200 bg-amber-50/60 shadow-none dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <ClipboardList className="size-5" />
                </div>
                <CardTitle className="pt-3 text-xl">
                  {copy.expertiseTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.chooseEntryBody}
                </p>
                <Button
                  onClick={() => setLocation("/connexion")}
                  className="mt-6 w-full rounded-full bg-amber-600 hover:bg-amber-700"
                >
                  {copy.startRequest}
                  <ArrowRight />
                </Button>
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  {copy.confidential}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      {selectedNeed &&
        (service.slug === "permis-travail" ? (
          <WorkPermitWorkflow
            locale={locale}
            need={selectedNeed}
            onClose={() => setSelectedNeed(null)}
            setLocation={setLocation}
          />
        ) : (
          <ServiceWorkflow
            service={service}
            locale={locale}
            need={selectedNeed}
            step={workflowStep}
            setStep={setWorkflowStep}
            onClose={() => setSelectedNeed(null)}
            setLocation={setLocation}
          />
        ))}
      <Footer locale={locale} setLocation={setLocation} />
    </PageWrap>
  );
}

const studyFilterLabels: Record<
  Locale,
  {
    country: string;
    searchCountry: string;
    noCountryMatch: string;
    countryCount: string;
    level: string;
    view: string;
    panelTitle: string;
    panelSubtitle: string;
  }
> = {
  fr: {
    country: "Pays d’étude",
    searchCountry: "Rechercher un pays…",
    noCountryMatch: "Aucun pays ne correspond à cette recherche.",
    countryCount: "Pays répertoriés",
    level: "Niveau",
    view: "Catalogue",
    panelTitle: "Affinez votre recherche",
    panelSubtitle: "Trouvez rapidement un programme ou une université.",
  },
  en: {
    country: "Study country",
    searchCountry: "Search countries…",
    noCountryMatch: "No countries match this search.",
    countryCount: "Countries listed",
    level: "Level",
    view: "Catalogue",
    panelTitle: "Refine your search",
    panelSubtitle: "Find a programme or university quickly.",
  },
  ro: {
    country: "Țara de studiu",
    searchCountry: "Caută o țară…",
    noCountryMatch: "Nicio țară nu corespunde căutării.",
    countryCount: "Țări în listă",
    level: "Nivel",
    view: "Catalog",
    panelTitle: "Rafinează căutarea",
    panelSubtitle: "Găsește rapid un program sau o universitate.",
  },
  pl: {
    country: "Kraj studiów",
    searchCountry: "Szukaj kraju…",
    noCountryMatch: "Brak krajów pasujących do wyszukiwania.",
    countryCount: "Kraje na liście",
    level: "Poziom",
    view: "Katalog",
    panelTitle: "Doprecyzuj wyszukiwanie",
    panelSubtitle: "Szybko znajdź program lub uniwersytet.",
  },
  ar: {
    country: "بلد الدراسة",
    searchCountry: "ابحث عن بلد…",
    noCountryMatch: "لا توجد دولة تطابق هذا البحث.",
    countryCount: "دولة في القائمة",
    level: "المستوى",
    view: "الفهرس",
    panelTitle: "حسّن البحث",
    panelSubtitle: "اعثر بسرعة على برنامج أو جامعة.",
  },
  zh: {
    country: "留学国家",
    searchCountry: "搜索国家…",
    noCountryMatch: "没有符合此搜索条件的国家。",
    countryCount: "个国家/地区",
    level: "层次",
    view: "目录",
    panelTitle: "筛选结果",
    panelSubtitle: "快速查找课程或大学。",
  },
};

function StudiesPage({
  locale,
  setLocale,
  setLocation,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  const filterLabels = studyFilterLabels[locale];
  const [countryCode, setCountryCode] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [catalogView, setCatalogView] = useState<"programmes" | "universites">(
    "programmes"
  );
  const [selected, setSelected] = useState<Program | null>(null);
  const [studyNeed, setStudyNeed] = useState<string | null>(null);
  const [studyStep, setStudyStep] = useState<"detail" | "assessment" | "auth">(
    "auth"
  );
  const studyCountryOptions = useMemo(
    () => getLocalizedCountryOptions(locale),
    [locale]
  );
  const selectedCountry = studyCountryOptions.find(
    option => option.code === countryCode
  );
  const filtered = useMemo(
    () =>
      programs.filter(
        program =>
          (!countryCode ||
            countryIsoCodeForName(program.country, locale) === countryCode) &&
          (!level || program.level === level) &&
          `${program.university} ${program.field} ${program.city}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [countryCode, level, query, locale]
  );
  const universities = useMemo(
    () =>
      Array.from(
        new Map(filtered.map(program => [program.university, program])).values()
      ),
    [filtered]
  );
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main>
        <section className="border-b border-border bg-[#f3f2ed] py-16 dark:bg-[#29332e]/40 md:py-24">
          <div className="container">
            <Eyebrow>{copy.studiesEyebrow}</Eyebrow>
            <div className="grid gap-10 lg:grid-cols-[1fr_.75fr] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] md:text-7xl">
                  {copy.studiesTitle}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {copy.studiesBody}
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <GraduationCapIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {copy.serviceOverview}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{`${copy.universities} · ${copy.programmes} · ${copy.progression}`}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xl font-semibold">
                      {studyCountryOptions.length}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {filterLabels.countryCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xl font-semibold">{programs.length}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {copy.programmes}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-xl font-semibold">1:1</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {copy.progression}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-10 md:py-14">
          <div className="rounded-[1.75rem] border border-border/80 bg-card p-4 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-600/10 dark:text-emerald-300">
                  <Filter className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    {filterLabels.panelTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filterLabels.panelSubtitle}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit shrink-0 gap-2 rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCountryCode("");
                  setLevel("");
                  setQuery("");
                }}
              >
                <RotateCcw className="size-4" />
                {copy.reset}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.35fr)_minmax(14rem,1.1fr)_minmax(11rem,1fr)_minmax(10rem,0.85fr)]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {copy.searchStudies}
                </span>
                <span className="relative block">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={copy.searchStudies}
                    className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </span>
              </label>
              <div className="min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {filterLabels.country}
                </span>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-label={filterLabels.country}
                      aria-expanded={countryOpen}
                      className="h-12 w-full justify-between rounded-xl border-input bg-background px-3 text-left font-normal shadow-none hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Globe2 className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {selectedCountry?.name || copy.allCountries}
                        </span>
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                  >
                    <Command>
                      <CommandInput
                        placeholder={filterLabels.searchCountry}
                        aria-label={filterLabels.searchCountry}
                      />
                      <CommandList className="max-h-72 overscroll-contain">
                        <CommandEmpty>
                          {filterLabels.noCountryMatch}
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value={`${copy.allCountries} all`}
                            onSelect={() => {
                              setCountryCode("");
                              setCountryOpen(false);
                            }}
                          >
                            <Check
                              className={`size-4 ${countryCode ? "opacity-0" : "opacity-100"}`}
                            />
                            {copy.allCountries}
                          </CommandItem>
                          {studyCountryOptions.map(option => (
                            <CommandItem
                              key={option.code}
                              value={`${option.name} ${option.code}`}
                              onSelect={() => {
                                setCountryCode(option.code);
                                setCountryOpen(false);
                              }}
                            >
                              <Check
                                className={`size-4 ${countryCode === option.code ? "opacity-100" : "opacity-0"}`}
                              />
                              {option.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {filterLabels.view}
                </span>
                <select
                  aria-label={filterLabels.view}
                  value={catalogView}
                  onChange={event =>
                    setCatalogView(
                      event.target.value as "programmes" | "universites"
                    )
                  }
                  className="h-12 w-full min-w-0 cursor-pointer rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="universites">{copy.universities}</option>
                  <option value="programmes">{copy.programmes}</option>
                </select>
              </label>
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  {filterLabels.level}
                </span>
                <select
                  aria-label={filterLabels.level}
                  value={level}
                  onChange={event => setLevel(event.target.value)}
                  className="h-12 w-full min-w-0 cursor-pointer rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{copy.allLevels}</option>
                  <option>Bachelor</option>
                  <option>Master</option>
                  <option>Doctorat</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {catalogView === "programmes"
                    ? filtered.length
                    : universities.length}
                </span>{" "}
                {catalogView === "programmes"
                  ? `programme${filtered.length > 1 ? "s" : ""}`
                  : `université${universities.length > 1 ? "s" : ""}`}{" "}
                dans le catalogue
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  setStudyNeed("Proposer un programme d’études personnalisé")
                }
                className="w-fit rounded-full"
              >
                Proposer un programme
                <ArrowRight />
              </Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {catalogView === "programmes"
              ? filtered.map(program => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onClick={() => setSelected(program)}
                  />
                ))
              : universities.map(program => (
                  <UniversityCard
                    key={program.university}
                    program={program}
                    onClick={() => setQuery(program.university)}
                  />
                ))}
          </div>
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-4 font-semibold">{copy.noStudyResults}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.searchHint}
              </p>
            </div>
          )}
        </section>
      </main>
      {selected && (
        <ProgramDialog
          program={selected}
          onClose={() => setSelected(null)}
          onApply={() => {
            setStudyNeed(
              `Candidature · ${selected.field} · ${selected.university}`
            );
            setSelected(null);
            setStudyStep("auth");
          }}
        />
      )}
      {studyNeed && (
        <ServiceWorkflow
          service={serviceBySlug.etudes}
          locale={locale}
          need={studyNeed}
          step={studyStep}
          setStep={setStudyStep}
          onClose={() => setStudyNeed(null)}
          setLocation={setLocation}
        />
      )}
    </PageWrap>
  );
}

function GraduationCapIcon() {
  return <span className="text-2xl">⌂</span>;
}
function UniversityCard({
  program,
  onClick,
}: {
  program: Program;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {program.country}
          </Badge>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">
            {program.university}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {program.city} · {program.level}
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-amber-600" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          Programmes disponibles
        </span>
        <span className="text-sm font-semibold text-amber-600">
          Voir les options
        </span>
      </div>
    </button>
  );
}
function ProgramCard({
  program,
  onClick,
}: {
  program: Program;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {program.country}
            </Badge>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {program.level}
            </Badge>
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">
            {program.field}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {program.university} · {program.city}
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-amber-600" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Rentrée
          </p>
          <p className="mt-1 text-sm font-semibold">{program.intake}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Coût indicatif
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{program.cost}</p>
        </div>
      </div>
    </button>
  );
}
function ProgramDialog({
  program,
  onClose,
  onApply,
}: {
  program: Program;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1b2420]/55 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl md:rounded-3xl md:p-8"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="rounded-full">
                {program.country}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {program.level}
              </Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              {program.field}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {program.university} · {program.city}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoBubble
              title="Dossier d’études"
              text="Cette fenêtre présente les informations utiles et les pièces principales avant de commencer votre demande."
            />
            <button
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <p className="mt-7 text-sm leading-7 text-muted-foreground">
          {program.description}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted p-4">
            <Clock3 className="size-4 text-amber-600" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Calendrier
            </p>
            <p className="mt-1 text-sm font-semibold">{program.intake}</p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <BarChart3 className="size-4 text-amber-600" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Budget
            </p>
            <p className="mt-1 text-sm font-semibold">{program.cost}</p>
          </div>
        </div>
        <div className="mt-7">
          <p className="text-sm font-semibold">Documents à prévoir</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {program.documents.map(document => (
              <span
                key={document}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                <FileCheck2 className="size-3.5 text-emerald-600" />
                {document}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onApply}>
            Déposer ma demande
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoBubble({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-label={`Aide : ${title}`}
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full border border-amber-200 bg-amber-50 text-sm font-black text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      >
        ?
      </button>
      {open && (
        <div
          role="status"
          className="absolute right-0 top-11 z-[100] w-72 rounded-2xl border border-border bg-card p-4 text-left text-xs leading-5 text-muted-foreground shadow-2xl"
        >
          <p className="font-bold text-foreground">{title}</p>
          <p className="mt-1">{text}</p>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        required
        type={type}
        value={value}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function ContactPage({
  locale,
  setLocale,
  setLocation,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const copy = siteCopy[locale];
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main className="bg-[#f3f2ed] py-16 dark:bg-[#1b2420]/50 md:py-24">
        <div className="container">
          <Eyebrow>ICX POWER SOLUTIONS SRL</Eyebrow>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
            Choisissez librement le service dont vous avez besoin.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Chaque service ouvre son propre parcours, ses informations
            utilisateur, ses documents utiles et son module sécurisé de
            téléversement.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(service => {
              const Icon = service.icon;
              return (
                <button
                  key={service.slug}
                  onClick={() => setLocation(`/services/${service.slug}`)}
                  className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                      <Icon className="size-5" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">
                    {serviceTranslations[locale][service.slug]?.label ||
                      service.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {service.description}
                  </p>
                  <div className="mt-4 text-xs font-semibold text-amber-700">
                    Commencer ce parcours
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-10 rounded-2xl border border-border bg-card p-6">
            <p className="font-semibold">Accès à l’espace de travail</p>
            <p className="mt-2 text-sm text-muted-foreground">
              La création d’un compte est obligatoire avant l’envoi d’une
              demande et l’accès au suivi sécurisé.
            </p>
            <Button
              className="mt-5 rounded-full"
              onClick={() => setLocation("/inscription")}
            >
              Créer mon compte
              <ArrowRight />
            </Button>
          </div>
        </div>
      </main>
      <Footer locale={locale} setLocation={setLocation} />
    </PageWrap>
  );
}

function WorkspacePage({
  locale,
  setLocale,
  setLocation,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const { user } = useAuth();
  const requestsQuery = trpc.requests.mine.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: "always",
  });
  const progressQuery = trpc.workflow.mine.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: "always",
  });
  const documentsQuery = trpc.requests.documents.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: "always",
  });
  const notificationsQuery = trpc.notifications.mine.useQuery(undefined, {
    enabled: !!user,
    refetchOnMount: "always",
  });
  const emailHistoryQuery = trpc.notifications.emailHistory.useQuery(
    undefined,
    { enabled: !!user, refetchOnMount: "always" }
  );
  const requests = requestsQuery.data || [];
  const progress = progressQuery.data || [];
  const documents = documentsQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const emailHistory = emailHistoryQuery.data || [];
  const [adminMessageTitle, setAdminMessageTitle] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [contactAppointmentAt, setContactAppointmentAt] = useState("");
  const sendToAdmin = trpc.notifications.sendToAdmin.useMutation({
    onSuccess: r => {
      toast.success(
        r.receiptEmailSent
          ? "ICX a bien reçu votre message; l’accusé a été envoyé à l’adresse e-mail de votre compte."
          : "Votre message a été enregistré, mais l’accusé e-mail n’a pas pu être envoyé."
      );
      setAdminMessageTitle("");
      setAdminMessage("");
      setContactAppointmentAt("");
    },
    onError: e => toast.error(e.message),
  });
  const reportUser = trpc.notifications.reportUser.useMutation({
    onSuccess: r => {
      toast.success(
        r.receiptEmailSent
          ? "ICX a bien reçu votre signalement; l’accusé a été envoyé par e-mail."
          : "Votre signalement a été enregistré, mais l’accusé e-mail n’a pas pu être envoyé."
      );
      setReportMessage("");
    },
    onError: e => toast.error(e.message),
  });
  const workspaceLoading =
    Boolean(user) &&
    [
      requestsQuery,
      progressQuery,
      documentsQuery,
      notificationsQuery,
      emailHistoryQuery,
    ].some(query => query.isLoading || query.isFetching);

  if (!user)
    return (
      <AuthGate
        locale={locale}
        setLocale={setLocale}
        setLocation={setLocation}
        title="Votre espace personnel"
        text="Connectez-vous pour déposer une demande, téléverser vos documents et suivre chaque étape."
      />
    );
  if (workspaceLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f2ed] dark:bg-[#1b2420]">
        <p className="text-sm text-muted-foreground">
          Chargement de votre espace…
        </p>
      </main>
    );

  const nextStep =
    requests.length > 0
      ? "Suivi en cours"
      : progress.length > 0
        ? "Parcours à reprendre"
        : "—";
  const nextStepDetail =
    requests.length > 0
      ? "Selon vos demandes enregistrées"
      : progress.length > 0
        ? "Vous avez un parcours sauvegardé"
        : "Aucune action en attente";

  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main className="bg-[#f3f2ed] py-10 dark:bg-[#1b2420]/50 md:py-14">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <Eyebrow>Espace personnel</Eyebrow>
              <h1 className="text-4xl font-semibold tracking-[-0.045em]">
                Bonjour {user.name?.split(" ")[0] || "et bienvenue"}.
              </h1>
              <p className="mt-3 text-muted-foreground">
                Cet espace affiche uniquement vos parcours, demandes et
                documents.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setLocation("/contact")}
                className="w-fit rounded-full"
              >
                Nouvelle demande
                <ArrowRight />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  document
                    .getElementById("icx-contact-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.setTimeout(
                    () => document.getElementById("icx-contact-title")?.focus(),
                    350
                  );
                }}
                className="w-fit rounded-full"
              >
                Contacter ICX
                <Mail />
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/etudes")}
                className="w-fit rounded-full"
              >
                Explorer les programmes
                <ArrowRight />
              </Button>
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Metric
              icon={ClipboardList}
              label="Demandes enregistrées"
              value={String(requests.length)}
              detail={
                requests.length
                  ? `${requests.length} demande${requests.length > 1 ? "s" : ""} dans votre espace`
                  : "Aucune demande"
              }
            />
            <Metric
              icon={UploadCloud}
              label="Documents transmis"
              value={String(documents.length)}
              detail={
                documents.length ? "Liés à vos demandes" : "Aucun document"
              }
            />
            <Metric
              icon={Clock3}
              label="Prochaine étape"
              value={nextStep}
              detail={nextStepDetail}
            />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mes demandes</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Seules les demandes que vous avez réellement enregistrées
                      apparaissent ici.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="font-semibold">Votre espace est vierge.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aucune demande n’a été créée pour votre compte.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setLocation("/etudes")}
                    >
                      Choisir un service
                      <ArrowRight />
                    </Button>
                  </div>
                ) : (
                  requests.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold">
                            Demande · {item.serviceKey}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Créée le{" "}
                            {new Date(item.createdAt).toLocaleDateString(
                              locale
                            )}
                          </p>
                        </div>
                        <Badge className="w-fit rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {item.message}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Prochaines actions</CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 && progress.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Aucune action n’est générée automatiquement. Commencez un
                    parcours uniquement lorsque vous le souhaitez.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {progress.length > 0 && (
                      <button
                        onClick={() =>
                          setLocation(`/services/${progress[0].serviceKey}`)
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-amber-600 text-white">
                          1
                        </span>
                        <span className="flex-1 text-sm font-medium">
                          Reprendre votre parcours sauvegardé
                        </span>
                        <ChevronRight className="size-4" />
                      </button>
                    )}
                    {requests.length > 0 && (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Les prochaines étapes seront ajoutées uniquement après
                        une demande réelle ou un message de l’équipe ICX.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Parcours sauvegardés</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les parcours sauvegardés apparaissent uniquement si vous avez
                  commencé une démarche.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {progress.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun parcours sauvegardé pour le moment.
                  </p>
                ) : (
                  progress.map(item => (
                    <button
                      key={`progress-${item.id}`}
                      onClick={() =>
                        setLocation(`/services/${item.serviceKey}`)
                      }
                      className="rounded-xl border border-border p-4 text-left transition hover:border-amber-300 hover:bg-muted"
                    >
                      <p className="font-semibold">{item.need}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.serviceKey} · étape {item.step}
                      </p>
                      <span className="mt-3 inline-flex text-xs font-semibold text-amber-700">
                        Reprendre le parcours{" "}
                        <ArrowRight className="ml-1 size-3" />
                      </span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
            <Card
              id="icx-contact-form"
              className="mt-6 rounded-2xl lg:col-span-2 scroll-mt-8"
            >
              <CardHeader>
                <CardTitle>Écrire à l’administration</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Envoyez une question, une pièce complémentaire ou une
                  notification au super-admin.
                </p>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    sendToAdmin.mutate({
                      title: adminMessageTitle,
                      content: adminMessage,
                      appointmentAt: contactAppointmentAt || undefined,
                      sendEmail: true,
                    });
                  }}
                  className="grid gap-3 md:grid-cols-[.4fr_1fr_1fr_auto]"
                >
                  <input
                    required
                    minLength={2}
                    value={adminMessageTitle}
                    onChange={e => setAdminMessageTitle(e.target.value)}
                    id="icx-contact-title"
                    placeholder="Objet"
                    className="h-11 rounded-xl border border-input bg-background px-4 text-sm"
                  />
                  <textarea
                    required
                    minLength={2}
                    value={adminMessage}
                    onChange={e => setAdminMessage(e.target.value)}
                    placeholder="Votre message à l’équipe ICX"
                    className="min-h-11 rounded-xl border border-input bg-background px-4 py-3 text-sm"
                  />
                  <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                    Rendez-vous souhaité (facultatif)
                    <input
                      type="datetime-local"
                      min={new Date(
                        Date.now() - new Date().getTimezoneOffset() * 60_000
                      )
                        .toISOString()
                        .slice(0, 16)}
                      value={contactAppointmentAt}
                      onChange={event =>
                        setContactAppointmentAt(event.target.value)
                      }
                      className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal text-foreground"
                    />
                    <span>Le créneau sera confirmé par ICX.</span>
                  </label>
                  <Button disabled={sendToAdmin.isPending} type="submit">
                    {sendToAdmin.isPending ? "Envoi…" : "Envoyer"}
                    <Send className="size-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Signaler un usage suspect</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Décrivez tout comportement abusif, fraude, contenu inapproprié
                  ou tentative d’usurpation.
                </p>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    reportUser.mutate({
                      category: "autre",
                      content: reportMessage,
                    });
                  }}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <textarea
                    required
                    minLength={10}
                    value={reportMessage}
                    onChange={e => setReportMessage(e.target.value)}
                    placeholder="Décrire le problème observé…"
                    className="min-h-20 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm"
                  />
                  <Button
                    disabled={reportUser.isPending}
                    type="submit"
                    variant="outline"
                  >
                    {reportUser.isPending ? "Transmission…" : "Signaler"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les notifications liées à vos demandes apparaissent ici.
                </p>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune notification pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map(notification => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 rounded-xl border border-border p-4"
                      >
                        <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                          <Bell className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {notification.content}
                          </p>
                          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleString(
                              locale
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Historique des e-mails</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les e-mails de confirmation et de suivi liés à votre adresse
                  apparaissent ici.
                </p>
              </CardHeader>
              <CardContent>
                {emailHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun e-mail journalisé pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {emailHistory.map(email => (
                      <div
                        key={email.id}
                        className="flex items-center gap-3 rounded-xl border border-border p-3"
                      >
                        <Mail className="size-4 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {email.subject}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {email.status} ·{" "}
                            {new Date(email.createdAt).toLocaleString(locale)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="mt-6 rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Documents transmis</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les pièces jointes à vos demandes sont conservées dans votre
                  espace sécurisé.
                </p>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun document transmis pour le moment.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map(document => (
                      <a
                        key={document.id}
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:border-amber-300 hover:bg-muted"
                      >
                        <span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                          <Paperclip className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {document.fileName}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {Math.round(document.fileSize / 1024)} Ko · Ouvrir
                          </span>
                        </span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </PageWrap>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
            {value}
          </p>
          <p className="mt-1 text-xs text-emerald-600">{detail}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function AdminPage({
  locale,
  setLocale,
  setLocation,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const superAdminQuery = trpc.auth.isSuperAdmin.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const isSuperAdmin = superAdminQuery.data === true;
  const isAdmin = Boolean(user && (user.role === "admin" || isSuperAdmin));
  const requestsQuery = trpc.admin.requests.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const [panel, setPanel] = useState("dashboard");
  if (authLoading || (user && superAdminQuery.isLoading))
    return (
      <main className="grid min-h-screen place-items-center bg-[#111816] text-slate-100">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
          <p className="mt-4 text-sm">Vérification des autorisations…</p>
        </div>
      </main>
    );
  if (!isAdmin)
    return (
      <AuthGate
        locale={locale}
        setLocale={setLocale}
        setLocation={setLocation}
        title="Console super-administrateur"
        text="Connectez-vous avec l’adresse autorisée. La session et les droits sont vérifiés par le serveur."
        admin
      />
    );

  const nav = [
    { key: "dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
    { key: "requests", label: "Demandes clients", icon: ClipboardList },
    ...(isSuperAdmin
      ? [
          { key: "users", label: "Utilisateurs & rôles", icon: Users },
          {
            key: "moderation",
            label: "Modération & nettoyage",
            icon: ShieldCheck,
          },
        ]
      : []),
    { key: "content", label: "Contenu du portail", icon: GraduationCapIcon },
    { key: "audit", label: "État des fonctions", icon: ShieldCheck },
  ];
  const titles: Record<string, string> = {
    dashboard: "Console d’administration",
    requests: "Demandes clients",
    users: "Utilisateurs et rôles",
    moderation: "Modération & nettoyage",
    content: "Contenu du portail",
    audit: "État des fonctions",
  };
  const requests = requestsQuery.data ?? [];
  const inProgress = requests.filter(
    request =>
      request.status === "En cours d’analyse" ||
      request.status === "Documents complémentaires requis"
  ).length;
  const documents = requests.reduce(
    (total, request) => total + (request.attachmentCount || 0),
    0
  );
  const completed = requests.filter(request =>
    ["Accepté", "Refusé", "Clôturé"].includes(request.status)
  ).length;
  const responseRate = requests.length
    ? Math.round((completed / requests.length) * 100)
    : 0;

  return (
    <div className="dark min-h-screen bg-[#111816] text-slate-100">
      <header className="border-b border-white/10 bg-[#0d1210] px-5 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              ICX POWER SOLUTIONS
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              Console d’administration
            </h1>
            <p className="text-xs text-slate-400">
              {isSuperAdmin ? "Super-administrateur" : "Administrateur"} ·{" "}
              {user?.email || user?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
            >
              Retour au site
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/mon-espace")}
            >
              Mon espace
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-82px)] bg-[#111816]">
        <div className="container grid gap-6 py-6 md:py-8 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-[#151e1a] p-3 lg:sticky lg:top-6">
            <div className="flex items-center gap-3 border-b border-white/10 px-3 pb-4">
              <span className="grid size-9 place-items-center rounded-xl bg-[#1b2420] text-amber-300">
                <Settings2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold">ICX Operations</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Espace séparé du portail
                </p>
              </div>
            </div>
            <nav
              className="mt-3 space-y-1"
              aria-label="Navigation administration"
            >
              {nav.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setPanel(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${panel === item.key ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="size-2 rounded-full bg-emerald-500" />
                Session vérifiée
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Les actions sensibles sont protégées et validées côté serveur.
              </p>
            </div>
          </aside>
          <section className="min-w-0">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                  {isSuperAdmin ? "Super-administration" : "Administration"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                  {titles[panel]}
                </h2>
                <p className="mt-3 text-sm text-slate-400">
                  Console dédiée, distincte de l’interface publique.
                </p>
              </div>
              {panel === "requests" && (
                <Button
                  variant="outline"
                  onClick={() => requestsQuery.refetch()}
                >
                  Actualiser les demandes
                </Button>
              )}
            </div>
            {panel === "dashboard" && (
              <>
                {requestsQuery.error ? (
                  <AdminError message="Impossible de charger les demandes. Vérifiez la base de données et ses migrations." />
                ) : (
                  <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <AdminMetric
                      label="Demandes enregistrées"
                      value={String(requests.length)}
                      icon={InboxIcon}
                    />
                    <AdminMetric
                      label="En traitement"
                      value={String(inProgress)}
                      icon={Search}
                    />
                    <AdminMetric
                      label="Documents reçus"
                      value={String(documents)}
                      icon={FileCheck2}
                    />
                    <AdminMetric
                      label="Demandes clôturées"
                      value={`${responseRate}%`}
                      icon={BarChart3}
                    />
                  </div>
                )}
                <div className="mt-7">
                  <AdminRequestsPanel locale={locale} />
                </div>
              </>
            )}
            {panel === "requests" && (
              <div className="mt-6">
                <AdminRequestsPanel locale={locale} />
              </div>
            )}
            {panel === "users" && isSuperAdmin && (
              <AdminUsersPanel locale={locale} />
            )}
            {panel === "moderation" && isSuperAdmin && (
              <AdminModerationPanel locale={locale} />
            )}
            {panel === "content" && (
              <Card className="mt-7 rounded-2xl">
                <CardHeader>
                  <CardTitle>Gestion du contenu</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Les pages et le catalogue visibles sur le site sont édités
                    dans le code du projet. Aucun faux bouton de modification
                    n’est présenté comme une fonction active.
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/etudes")}
                  >
                    Ouvrir le catalogue public
                    <ArrowRight />
                  </Button>
                </CardContent>
              </Card>
            )}
            {panel === "audit" && (
              <Card className="mt-7 rounded-2xl">
                <CardHeader>
                  <CardTitle>Fonctions administrateur actives</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Les journaux d’audit détaillés ne sont pas encore persistés
                    dans cette version.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="rounded-xl border border-border p-3">
                    Authentification OAuth avec session serveur
                  </p>
                  <p className="rounded-xl border border-border p-3">
                    Accès admin/super-admin vérifié côté serveur
                  </p>
                  <p className="rounded-xl border border-border p-3">
                    Consultation et changement des statuts de demandes
                  </p>
                  {isSuperAdmin && (
                    <p className="rounded-xl border border-border p-3">
                      Promotion et révocation des rôles administrateur
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function AdminRequestsPanel({ locale }: { locale: Locale }) {
  const requestsQuery = trpc.admin.requests.useQuery(undefined, {
    retry: false,
  });
  const utils = trpc.useUtils();
  const updateStatus = trpc.requests.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.admin.requests.invalidate();
      toast.success(
        locale === "fr"
          ? "Statut de la demande mis à jour."
          : "Request status updated."
      );
    },
    onError: error =>
      toast.error(error.message || "Impossible de modifier le statut."),
  });
  const statuses = [
    "Reçu",
    "En cours d’analyse",
    "Documents complémentaires requis",
    "Accepté",
    "Refusé",
    "Clôturé",
  ] as const;
  if (requestsQuery.isLoading)
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Chargement des demandes…
        </CardContent>
      </Card>
    );
  if (requestsQuery.error)
    return (
      <AdminError message="Accès impossible aux demandes. Vérifiez les droits admin et la disponibilité de la base." />
    );
  const requests = requestsQuery.data ?? [];
  if (!requests.length)
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Aucune demande n’est encore enregistrée.
        </CardContent>
      </Card>
    );
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Demandes enregistrées ({requests.length})</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Les changements de statut sont sauvegardés et le client est notifié.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map(request => (
          <article
            key={request.id}
            className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1fr_240px]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">#{request.id}</Badge>
                <Badge variant="secondary">{request.serviceKey}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(request.updatedAt).toLocaleString(locale)}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">
                {request.firstName} {request.lastName}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.email}
                {request.phone ? ` · ${request.phone}` : ""}
                {request.country ? ` · ${request.country}` : ""}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {request.message}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {request.attachmentCount} document(s) associé(s)
              </p>
            </div>
            <div className="flex flex-col justify-between gap-3">
              <label className="text-xs font-semibold text-muted-foreground">
                Statut de traitement
                <select
                  aria-label={`Statut demande ${request.id}`}
                  value={request.status}
                  disabled={updateStatus.isPending}
                  onChange={event =>
                    updateStatus.mutate({
                      id: request.id,
                      status: event.target.value as typeof request.status,
                    })
                  }
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = `mailto:${request.email}?subject=${encodeURIComponent(`Suivi de votre demande ICX #${request.id}`)}`)
                }
              >
                Contacter le client
                <Mail />
              </Button>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <Card className="mt-6 rounded-2xl border-amber-500/40">
      <CardContent className="p-5 text-sm text-amber-700 dark:text-amber-200">
        {message}
      </CardContent>
    </Card>
  );
}
function InboxIcon() {
  return <span className="text-lg">↘</span>;
}
function AdminMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <Icon className="size-4 text-amber-600" />
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AdminUsersPanel({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const usersQuery = trpc.admin.users.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async r => {
      setFirstName("");
      setLastName("");
      setEmail("");
      await utils.admin.users.invalidate();
      toast.success(
        r.emailSent
          ? "Invitation envoyée au nouvel utilisateur."
          : "Utilisateur créé."
      );
    },
    onError: e => toast.error(e.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.users.invalidate();
      toast.success("Compte supprimé.");
    },
    onError: e => toast.error(e.message),
  });
  const setRole = trpc.admin.setRole.useMutation({
    onSuccess: async () => {
      setEmail("");
      await utils.admin.users.invalidate();
      toast.success(locale === "fr" ? "Rôle mis à jour." : "Role updated.");
    },
    onError: error =>
      toast.error(error.message || "La modification du rôle a échoué."),
  });
  const labels =
    locale === "fr"
      ? {
          title: "Comptes et rôles",
          description:
            "Les rôles s’appliquent aux comptes existants après leur première connexion sécurisée.",
          email: "Adresse email du compte",
          add: "Promouvoir administrateur",
          empty: "Aucun compte n’est encore enregistré.",
          super: "Super-administrateur",
        }
      : {
          title: "Users and roles",
          description:
            "Roles apply to existing accounts after their first secure sign-in.",
          email: "Account email",
          add: "Promote to administrator",
          empty: "No accounts are registered yet.",
          super: "Super administrator",
        };
  const superAdminQuery = trpc.auth.isSuperAdmin.useQuery(undefined, {
    retry: false,
  });
  const isSuperAdmin = superAdminQuery.data === true;
  return (
    <Card className="mt-7 rounded-2xl">
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          {labels.description}
        </p>
      </CardHeader>
      <CardContent>
        {isSuperAdmin && (
          <>
            <form
              className="mb-3 grid gap-2 sm:grid-cols-3"
              onSubmit={event => {
                event.preventDefault();
                createUser.mutate({ firstName, lastName, email });
              }}
            >
              <input
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <input
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Nom"
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={labels.email}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="sm:col-span-3"
              >
                {createUser.isPending
                  ? "Création…"
                  : "Créer et inviter l’utilisateur"}
              </Button>
            </form>
            <form
              className="mb-5 flex flex-col gap-2 sm:flex-row"
              onSubmit={event => {
                event.preventDefault();
                const normalized = email.trim().toLowerCase();
                if (normalized)
                  setRole.mutate({ email: normalized, role: "admin" });
              }}
            >
              <input
                required
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder={labels.email}
                className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <Button type="submit" disabled={setRole.isPending}>
                {labels.add}
              </Button>
            </form>
          </>
        )}
        {usersQuery.isLoading && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chargement des utilisateurs…
          </p>
        )}
        {usersQuery.error && (
          <AdminError message="Impossible de charger les utilisateurs. Vérifiez l’accès super-admin et la base de données." />
        )}
        <div className="space-y-3">
          {usersQuery.data?.map(account => {
            const isProtected = account.isProtectedPrincipal;
            return (
              <div
                key={account.email || account.openId}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
              >
                <span className="grid size-10 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                  {(account.name || account.email || "?")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{account.name || "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {account.email || account.openId}
                  </p>
                </div>
                <Badge
                  variant={account.role === "admin" ? "secondary" : "outline"}
                >
                  {isProtected
                    ? labels.super
                    : account.role === "admin"
                      ? "Admin"
                      : "Client"}
                </Badge>
                {isSuperAdmin && !isProtected && account.email && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={setRole.isPending}
                      onClick={() =>
                        setRole.mutate({
                          email: account.email!,
                          role: account.role === "admin" ? "user" : "admin",
                        })
                      }
                    >
                      {account.role === "admin" ? "Révoquer" : "Promouvoir"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (
                          window.confirm("Supprimer ce compte et ses données ?")
                        )
                          deleteUser.mutate({ id: account.id });
                      }}
                    >
                      Supprimer
                    </Button>
                  </>
                )}
              </div>
            );
          })}
          {usersQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminModerationPanel({ locale }: { locale: Locale }) {
  const notifications = trpc.admin.notifications.useQuery(undefined, {
    retry: false,
  });
  const logs = trpc.admin.emailLogs.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const delN = trpc.admin.deleteNotification.useMutation({
    onSuccess: async () => {
      await utils.admin.notifications.invalidate();
      toast.success("Notification supprimée.");
    },
    onError: e => toast.error(e.message),
  });
  const delE = trpc.admin.deleteEmailLog.useMutation({
    onSuccess: async () => {
      await utils.admin.emailLogs.invalidate();
      toast.success("E-mail supprimé du journal.");
    },
    onError: e => toast.error(e.message),
  });
  const reset = trpc.admin.resetData.useMutation({
    onSuccess: () => toast.success("Nettoyage effectué."),
    onError: e => toast.error(e.message),
  });
  return (
    <div className="mt-7 grid gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Notifications reçues</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Signalements et messages utilisateur transmis au super-admin.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.data?.map(n => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.email} · {n.content}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => delN.mutate({ id: n.id })}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Journaux e-mails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.data?.map(log => (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">{log.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {log.recipient} · {log.status}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => delE.mutate({ id: log.id })}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-destructive/30">
        <CardHeader>
          <CardTitle>Réinitialisation sélective</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Action irréversible. Sélectionnez uniquement les catégories à
            nettoyer.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["documents", "Documents"],
                ["requests", "Dossiers"],
                ["notifications", "Notifications"],
                ["emailLogs", "E-mails"],
                ["workflows", "Parcours"],
                ["partnerships", "Partenariats"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Réinitialiser ${label} ?`))
                    reset.mutate({
                      documents: key === "documents",
                      requests: key === "requests",
                      notifications: key === "notifications",
                      emailLogs: key === "emailLogs",
                      workflows: key === "workflows",
                      partnerships: key === "partnerships",
                    });
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthGate({
  locale,
  setLocale,
  setLocation,
  title,
  text,
  admin = false,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
  title: string;
  text: string;
  admin?: boolean;
}) {
  const goToAuth = (mode: "connexion" | "inscription") => {
    try {
      sessionStorage.setItem(
        "icx-auth-return-to",
        admin ? "/admin" : "/mon-espace"
      );
    } catch {}
    setLocation(`/${mode}`);
  };
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main className="grid min-h-[calc(100vh-74px)] place-items-center bg-[#f3f2ed] px-4 py-16 dark:bg-[#1b2420]">
        <Card className="w-full max-w-lg rounded-3xl p-2 text-center shadow-xl">
          <CardContent className="px-6 py-12 sm:px-12">
            <span
              className={`mx-auto grid size-16 place-items-center rounded-3xl ${admin ? "bg-slate-900 text-amber-300" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10"}`}
            >
              {admin ? <Settings2 /> : <LockKeyhole />}
            </span>
            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.045em]">
              {title}
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              {text}
            </p>
            <Button
              onClick={() => goToAuth("connexion")}
              className="mt-8 rounded-full px-6"
            >
              Se connecter
              <ArrowRight />
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Pas encore de compte ?{" "}
              <button
                onClick={() => goToAuth("inscription")}
                className="font-semibold text-amber-600"
              >
                Créer un compte
              </button>
            </p>
          </CardContent>
        </Card>
      </main>
    </PageWrap>
  );
}

function PartnershipDialog({
  onClose,
  setLocation,
}: {
  onClose: () => void;
  setLocation: (path: string) => void;
}) {
  const { user } = useAuth();
  const mutation = trpc.partnerships.create.useMutation({
    onSuccess: result => {
      toast.success(
        result.receiptEmailSent
          ? "ICX a bien reçu votre demande de partenariat et vous a envoyé un accusé e-mail."
          : "ICX a bien reçu votre demande; l’accusé e-mail n’a pas pu être envoyé."
      );
      onClose();
    },
  });
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: user?.email || "",
    phoneCode: "+40",
    phone: "",
    country: "",
    needs: "",
  });
  const [partnerFiles, setPartnerFiles] = useState<
    { fileName: string; mimeType: string; fileSize: number; data: string }[]
  >([]);
  const [partnerScheduledAt, setPartnerScheduledAt] = useState("");
  const partnerDraftKey = "icx-partnership-draft";
  const handlePartnerFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files)
      .filter(file => file.size <= 8_000_000)
      .slice(0, 10);
    if (selected.length < files.length)
      toast.error("10 fichiers maximum, 8 Mo par fichier.");
    const read = (file: File) =>
      new Promise<{
        fileName: string;
        mimeType: string;
        fileSize: number;
        data: string;
      }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            data: String(reader.result).split(",")[1] || "",
          });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    try {
      setPartnerFiles(await Promise.all(selected.map(read)));
    } catch {
      toast.error("Impossible de préparer une pièce jointe.");
    }
  };
  if (!user)
    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-[#17201c]/65 p-4 backdrop-blur-md">
        <Card className="w-full max-w-md rounded-3xl p-2">
          <CardContent className="p-7 text-center">
            <Handshake className="mx-auto size-10 text-amber-600" />
            <h2 className="mt-5 text-2xl font-semibold">
              Un espace entreprise sécurisé
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Connectez-vous pour déposer une proposition de partenariat et
              suivre sa qualification.
            </p>
            <div className="mt-7 flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Fermer
              </Button>
              <Button
                onClick={() => setLocation("/connexion")}
                className="flex-1"
              >
                Se connecter
                <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#17201c]/65 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl p-2">
        <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 pt-7">
          <div>
            <Eyebrow>Partenariat entreprise</Eyebrow>
            <CardTitle className="text-3xl tracking-[-0.04em]">
              Construisons une coopération utile.
            </CardTitle>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Présentez votre structure, vos marchés et le type de collaboration
              recherché.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InfoBubble
              title="Partenariat"
              text="Présentez votre organisation, les pays concernés, vos besoins et le calendrier souhaité. L’équipe ICX vous recontactera pour la qualification."
            />
            <button
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full bg-muted"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-7">
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              mutation.mutate({
                ...form,
                phone: form.phone ? `${form.phoneCode} ${form.phone}` : "",
                needs: form.needs,
                appointmentAt: partnerScheduledAt || undefined,
                attachments: partnerFiles,
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Raison sociale"
                placeholder="Nom de l’entreprise"
                value={form.companyName}
                onChange={value =>
                  setForm(prev => ({ ...prev, companyName: value }))
                }
              />
              <Field
                label="Interlocuteur"
                placeholder="Nom complet"
                value={form.contactName}
                onChange={value =>
                  setForm(prev => ({ ...prev, contactName: value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email professionnel"
                type="email"
                placeholder="vous@entreprise.com"
                value={form.email}
                onChange={value => setForm(prev => ({ ...prev, email: value }))}
              />
              <div className="grid grid-cols-[.42fr_1fr] gap-2">
                <PhoneCodeField
                  value={form.phoneCode}
                  onChange={value =>
                    setForm(prev => ({ ...prev, phoneCode: value }))
                  }
                  label="Indicatif"
                />
                <Field
                  label="Téléphone"
                  placeholder="Numéro"
                  value={form.phone}
                  onChange={value =>
                    setForm(prev => ({ ...prev, phone: value }))
                  }
                />
              </div>
            </div>
            <CountryField
              required
              label="Pays de résidence"
              value={form.country}
              onChange={value =>
                setForm(prev => ({
                  ...prev,
                  country: value,
                  phoneCode:
                    callingCodeForCountry(value, "fr") || prev.phoneCode,
                }))
              }
              locale="fr"
              placeholder="Choisir ou saisir un pays"
            />
            <div>
              <label className="mb-2 block text-sm font-medium">
                Besoin de coopération
              </label>
              <textarea
                required
                minLength={10}
                value={form.needs}
                onChange={event =>
                  setForm(prev => ({ ...prev, needs: event.target.value }))
                }
                placeholder="Pays concernés, objectif, expertise recherchée, calendrier..."
                className="min-h-32 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              <Paperclip className="size-4" />
              <span className="flex-1">
                Préparer des pièces jointes{" "}
                <span className="block text-xs font-normal text-muted-foreground">
                  Les noms seront ajoutés au brief transmis à l’équipe ICX.
                </span>
              </span>
              <input
                type="file"
                multiple
                onChange={event => void handlePartnerFiles(event.target.files)}
                className="sr-only"
              />
            </label>
            {partnerFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {partnerFiles.map(file => (
                  <span
                    key={file.fileName}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-semibold"
                  >
                    {file.fileName}
                  </span>
                ))}
              </div>
            )}
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const saved = writeLocalStorage(
                      partnerDraftKey,
                      JSON.stringify({ form, partnerFiles, partnerScheduledAt })
                    );
                    if (saved) {
                      toast.success("Brouillon partenaire enregistré.");
                    } else {
                      toast.error(
                        "Le stockage local est indisponible sur cet appareil."
                      );
                    }
                  }}
                >
                  Mettre en attente
                </Button>
                <label className="flex flex-1 items-center gap-2 text-xs font-semibold">
                  Rendez-vous souhaité{" "}
                  <input
                    type="datetime-local"
                    min={new Date(
                      Date.now() - new Date().getTimezoneOffset() * 60_000
                    )
                      .toISOString()
                      .slice(0, 16)}
                    value={partnerScheduledAt}
                    onChange={event =>
                      setPartnerScheduledAt(event.target.value)
                    }
                    className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Après transmission, une modification doit être demandée
                directement à ICX Power Solutions.
              </p>
            </div>
            <Button
              disabled={mutation.isPending}
              type="submit"
              className="h-12 w-full rounded-xl"
            >
              {mutation.isPending
                ? "Enregistrement..."
                : "Envoyer la proposition"}
              <ArrowRight />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoPage({
  kind,
  locale,
  setLocale,
  setLocation,
}: {
  kind: "partners" | "privacy" | "legal";
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const info = {
    fr: {
      partners: [
        "Écosystème",
        "Des partenaires qui partagent le même sens du suivi.",
        "ICX construit des passerelles avec des organisations complémentaires, dans le respect des rôles et des engagements de chacun.",
      ],
      privacy: [
        "Confidentialité",
        "Vos données méritent un cadre clair.",
        "Cette page présente l’intention de la politique de confidentialité. Les mentions définitives, les durées de conservation et les coordonnées du responsable de traitement devront être validées avant mise en production.",
      ],
      legal: [
        "Mentions légales",
        "Les informations légales d’ICX, en clair.",
        "Les informations ci-dessous correspondent aux données publiques consultées dans les bases roumaines d’entreprises et doivent rester alignées sur les documents officiels de la société.",
      ],
    },
    en: {
      partners: [
        "Ecosystem",
        "Partners who share the same commitment to follow-through.",
        "ICX builds bridges with complementary organisations while respecting each party’s roles and commitments.",
      ],
      privacy: [
        "Privacy",
        "Your data deserves a clear framework.",
        "This page presents the intent of the privacy policy. Final notices, retention periods and controller details must be validated before production.",
      ],
      legal: [
        "Legal information",
        "ICX legal information, made clear.",
        "The information below reflects public company data and must remain aligned with official corporate documents.",
      ],
    },
    zh: {
      partners: [
        "合作生态",
        "与我们一样重视跟进的合作伙伴。",
        "ICX 与互补组织建立桥梁，尊重各方职责与承诺。",
      ],
      privacy: [
        "隐私",
        "您的数据值得清晰的保护框架。",
        "本页介绍隐私政策意图，正式条款、保存期限和负责人信息将在上线前确认。",
      ],
      legal: [
        "法律信息",
        "清晰了解 ICX 的法律信息。",
        "以下信息来自公开企业数据，并须与公司的正式文件保持一致。",
      ],
    },
    ro: {
      partners: [
        "Ecosistem",
        "Parteneri care împărtășesc aceeași exigență a urmăririi.",
        "ICX creează legături cu organizații complementare, respectând rolurile și angajamentele fiecăruia.",
      ],
      privacy: [
        "Confidențialitate",
        "Datele dumneavoastră merită un cadru clar.",
        "Această pagină prezintă intenția politicii de confidențialitate, care va fi validată înainte de lansare.",
      ],
      legal: [
        "Informații juridice",
        "Informațiile juridice ICX, prezentate clar.",
        "Datele de mai jos provin din informații publice și trebuie aliniate cu documentele oficiale.",
      ],
    },
    pl: {
      partners: [
        "Ekosystem",
        "Partnerzy, którzy podzielają nasze podejście do konsekwentnej obsługi.",
        "ICX buduje mosty z uzupełniającymi się organizacjami, szanując role i zobowiązania każdej strony.",
      ],
      privacy: [
        "Prywatność",
        "Twoje dane zasługują na jasne zasady.",
        "Ta strona przedstawia założenia polityki prywatności, które zostaną zatwierdzone przed uruchomieniem.",
      ],
      legal: [
        "Informacje prawne",
        "Informacje prawne ICX przedstawione jasno.",
        "Poniższe dane pochodzą z informacji publicznych i muszą być zgodne z oficjalnymi dokumentami firmy.",
      ],
    },
    ar: {
      partners: [
        "منظومة الشركاء",
        "شركاء يشاركوننا الحرص على المتابعة.",
        "تبني ICX جسوراً مع منظمات متكاملة مع احترام أدوار والتزامات كل طرف.",
      ],
      privacy: [
        "الخصوصية",
        "بياناتك تستحق إطاراً واضحاً.",
        "تعرض هذه الصفحة توجه سياسة الخصوصية، وستُعتمد التفاصيل النهائية قبل الإطلاق.",
      ],
      legal: [
        "المعلومات القانونية",
        "المعلومات القانونية لـ ICX بوضوح.",
        "تستند المعلومات التالية إلى بيانات عامة ويجب أن تتوافق مع وثائق الشركة الرسمية.",
      ],
    },
  } as const;
  const [eyebrow, title, body] = info[locale][kind];
  const content = { eyebrow, title, body };
  return (
    <PageWrap>
      <Header locale={locale} setLocale={setLocale} />
      <main className="container py-20 md:py-28">
        <Eyebrow>{content.eyebrow}</Eyebrow>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] md:text-7xl">
          {content.title}
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
          {content.body}
        </p>
        {kind === "partners" ? (
          <>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                onClick={() => setPartnershipOpen(true)}
                className="rounded-full"
              >
                Proposer un partenariat entreprise
                <Handshake />
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/#services")}
                className="rounded-full"
              >
                Découvrir nos expertises
                <ArrowRight />
              </Button>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl">
                <CardContent className="p-7">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-border">
                    <img
                      src="/assets/lorondo-logo.jpg"
                      loading="lazy"
                      decoding="async"
                      alt="Logo Lorondo Services SRL"
                      className="size-full object-contain p-1"
                    />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">
                    Lorondo Services SRL
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Partenaire opérationnel en Roumanie, avec une identité
                    visuelle désormais affichée dans l’écosystème ICX.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardContent className="p-7">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-border">
                    <img
                      src="/assets/aaft-official.jpg"
                      loading="lazy"
                      decoding="async"
                      alt="Logo officiel AAFT"
                      className="size-full object-cover"
                    />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold">
                    AAFT Association
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Partenaire associatif en Roumanie. Logo public récupéré
                    depuis la page officielle et identité à confirmer avec le
                    partenaire.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="mt-12 max-w-3xl rounded-2xl">
            <CardContent className="space-y-5 p-7 text-sm leading-7 text-muted-foreground">
              <p>ICX POWER SOLUTIONS SRL · Roumanie</p>
              <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                CUI 54675848 · Nr. Reg. Com. J2026031336000 · siège : Str.
                Hlincea 47, Iași, 700715, Roumanie · CAEN 7020 · créée le 13 mai
                2026.
              </p>
              <p>
                Les contenus de cette interface sont fournis à titre informatif
                et ne remplacent pas la validation contractuelle des documents
                légaux.
              </p>
            </CardContent>
          </Card>
        )}
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="mt-10 rounded-full"
        >
          Retour à l’accueil
          <ArrowRight className="rotate-180" />
        </Button>
      </main>
      {partnershipOpen && (
        <PartnershipDialog
          onClose={() => setPartnershipOpen(false)}
          setLocation={setLocation}
        />
      )}
      <Footer locale={locale} setLocation={setLocation} />
    </PageWrap>
  );
}

const countryCodes =
  "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW".split(
    /\s+/
  );

const authTranslations: Record<
  Locale,
  {
    firstName: string;
    lastName: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    country: string;
    passwordHint: string;
    twoFactor: string;
    twoFactorHint: string;
    twoFactorCode: string;
    twoFactorCodeHint: string;
    cookieConsent: string;
    privacyConsent: string;
    gdprConsent: string;
    termsConsent: string;
    requiredNotice: string;
    loginTitle: string;
    signupTitle: string;
    loginSubtitle: string;
    signupSubtitle: string;
    noAccount: string;
    alreadyAccount: string;
    secureIntro: string;
    forgot: string;
    remember: string;
    show: string;
    hide: string;
    mismatch: string;
    missingConsent: string;
  }
> = {
  fr: {
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.com",
    phone: "Téléphone",
    country: "Pays",
    passwordHint: "10 caractères minimum",
    twoFactor: "Identification à deux facteurs (2FA)",
    twoFactorHint: "Saisissez le code reçu par votre application ou par SMS.",
    twoFactorCode: "Code 2FA",
    twoFactorCodeHint: "123456",
    cookieConsent:
      "J’accepte l’utilisation des cookies nécessaires et des copies de sauvegarde pour sécuriser mon espace.",
    privacyConsent: "J’accepte la politique de confidentialité.",
    gdprConsent:
      "J’accepte le traitement de mes données conformément au RGPD et aux règles européennes de protection des données.",
    termsConsent: "J’accepte les conditions générales d’utilisation.",
    requiredNotice: "Les champs marqués sont obligatoires.",
    loginTitle: "Ravi de vous revoir.",
    signupTitle: "Construisons la suite.",
    loginSubtitle: "Connectez-vous pour retrouver vos dossiers.",
    signupSubtitle: "Créez un espace pour centraliser votre projet.",
    noAccount: "Pas encore de compte ?",
    alreadyAccount: "Vous avez déjà un compte ?",
    secureIntro: "Votre espace pour avancer avec confiance.",
    forgot: "Mot de passe oublié ?",
    remember: "Se souvenir de moi",
    show: "Afficher",
    hide: "Masquer",
    mismatch: "Les mots de passe ne correspondent pas.",
    missingConsent: "Veuillez accepter toutes les conditions obligatoires.",
  },
  en: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    phone: "Phone",
    country: "Country",
    passwordHint: "10 characters minimum",
    twoFactor: "Two-factor authentication (2FA)",
    twoFactorHint: "Enter the code from your app or by SMS.",
    twoFactorCode: "2FA code",
    twoFactorCodeHint: "123456",
    cookieConsent:
      "I accept the use of necessary cookies and backup copies to secure my account.",
    privacyConsent: "I accept the privacy policy.",
    gdprConsent:
      "I accept the processing of my data under the GDPR and European data-protection rules.",
    termsConsent: "I accept the terms of use.",
    requiredNotice: "Fields marked are required.",
    loginTitle: "Welcome back.",
    signupTitle: "Let’s build what’s next.",
    loginSubtitle: "Sign in to access your files.",
    signupSubtitle: "Create a space to centralize your project.",
    noAccount: "Don’t have an account yet?",
    alreadyAccount: "Already have an account?",
    secureIntro: "Your space to move forward with confidence.",
    forgot: "Forgot password?",
    remember: "Remember me",
    show: "Show",
    hide: "Hide",
    mismatch: "Passwords do not match.",
    missingConsent: "Please accept all required conditions.",
  },
  zh: {
    firstName: "名",
    lastName: "姓",
    email: "电子邮箱",
    emailPlaceholder: "you@example.com",
    phone: "电话",
    country: "国家",
    passwordHint: "至少10个字符",
    twoFactor: "双重身份验证（2FA）",
    twoFactorHint: "输入应用或短信收到的验证码。",
    twoFactorCode: "2FA验证码",
    twoFactorCodeHint: "123456",
    cookieConsent: "我同意使用必要的 Cookie 和备份副本来保护账户。",
    privacyConsent: "我同意隐私政策。",
    gdprConsent: "我同意按照 GDPR 和欧洲数据保护规则处理我的数据。",
    termsConsent: "我同意使用条款。",
    requiredNotice: "标记字段为必填。",
    loginTitle: "欢迎回来。",
    signupTitle: "一起开启下一步。",
    loginSubtitle: "登录以访问您的文件。",
    signupSubtitle: "创建空间，集中管理您的项目。",
    noAccount: "还没有账户？",
    alreadyAccount: "已有账户？",
    secureIntro: "让您安心前进的空间。",
    forgot: "忘记密码？",
    remember: "记住我",
    show: "显示",
    hide: "隐藏",
    mismatch: "两次密码不一致。",
    missingConsent: "请接受所有必填条件。",
  },
  ro: {
    firstName: "Prenume",
    lastName: "Nume",
    email: "Adresă de e-mail",
    emailPlaceholder: "dumneavoastra@exemplu.com",
    phone: "Telefon",
    country: "Țară",
    passwordHint: "Minimum 10 caractere",
    twoFactor: "Autentificare în doi pași (2FA)",
    twoFactorHint: "Introduceți codul din aplicație sau SMS.",
    twoFactorCode: "Cod 2FA",
    twoFactorCodeHint: "123456",
    cookieConsent:
      "Accept folosirea cookie-urilor necesare și a copiilor de siguranță pentru protejarea contului.",
    privacyConsent: "Accept politica de confidențialitate.",
    gdprConsent:
      "Accept prelucrarea datelor conform GDPR și normelor europene.",
    termsConsent: "Accept termenii de utilizare.",
    requiredNotice: "Câmpurile marcate sunt obligatorii.",
    loginTitle: "Bine ați revenit.",
    signupTitle: "Construim următorul pas.",
    loginSubtitle: "Conectați-vă pentru a vă accesa dosarele.",
    signupSubtitle: "Creați un spațiu pentru proiectul dumneavoastră.",
    noAccount: "Nu aveți încă un cont?",
    alreadyAccount: "Aveți deja un cont?",
    secureIntro:
      "Spațiul dumneavoastră pentru a merge mai departe cu încredere.",
    forgot: "Ați uitat parola?",
    remember: "Ține-mă minte",
    show: "Arată",
    hide: "Ascunde",
    mismatch: "Parolele nu coincid.",
    missingConsent: "Acceptați toate condițiile obligatorii.",
  },
  pl: {
    firstName: "Imię",
    lastName: "Nazwisko",
    email: "Adres e-mail",
    emailPlaceholder: "ty@example.com",
    phone: "Telefon",
    country: "Kraj",
    passwordHint: "Minimum 10 znaków",
    twoFactor: "Uwierzytelnianie dwuskładnikowe (2FA)",
    twoFactorHint: "Wpisz kod z aplikacji lub SMS-a.",
    twoFactorCode: "Kod 2FA",
    twoFactorCodeHint: "123456",
    cookieConsent:
      "Akceptuję niezbędne pliki cookie i kopie zapasowe w celu ochrony konta.",
    privacyConsent: "Akceptuję politykę prywatności.",
    gdprConsent:
      "Akceptuję przetwarzanie danych zgodnie z RODO i europejskimi zasadami ochrony danych.",
    termsConsent: "Akceptuję warunki użytkowania.",
    requiredNotice: "Pola oznaczone są wymagane.",
    loginTitle: "Witaj ponownie.",
    signupTitle: "Zbudujmy kolejny krok.",
    loginSubtitle: "Zaloguj się, aby uzyskać dostęp do spraw.",
    signupSubtitle: "Utwórz przestrzeń dla swojego projektu.",
    noAccount: "Nie masz jeszcze konta?",
    alreadyAccount: "Masz już konto?",
    secureIntro: "Twoja bezpieczna przestrzeń do działania.",
    forgot: "Nie pamiętasz hasła?",
    remember: "Zapamiętaj mnie",
    show: "Pokaż",
    hide: "Ukryj",
    mismatch: "Hasła nie są zgodne.",
    missingConsent: "Zaakceptuj wszystkie wymagane warunki.",
  },
  ar: {
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    phone: "الهاتف",
    country: "البلد",
    passwordHint: "10 أحرف على الأقل",
    twoFactor: "المصادقة الثنائية (2FA)",
    twoFactorHint: "أدخل الرمز من التطبيق أو الرسالة النصية.",
    twoFactorCode: "رمز 2FA",
    twoFactorCodeHint: "123456",
    cookieConsent:
      "أوافق على استخدام ملفات الارتباط الضرورية ونسخ الاحتياط لحماية حسابي.",
    privacyConsent: "أوافق على سياسة الخصوصية.",
    gdprConsent:
      "أوافق على معالجة بياناتي وفق اللائحة العامة لحماية البيانات والقواعد الأوروبية.",
    termsConsent: "أوافق على شروط الاستخدام.",
    requiredNotice: "الحقول المحددة إلزامية.",
    loginTitle: "مرحباً بعودتك.",
    signupTitle: "لنبدأ الخطوة التالية.",
    loginSubtitle: "سجّل الدخول للوصول إلى ملفاتك.",
    signupSubtitle: "أنشئ مساحة لإدارة مشروعك.",
    noAccount: "ليس لديك حساب بعد؟",
    alreadyAccount: "لديك حساب بالفعل؟",
    secureIntro: "مساحتك للتقدم بثقة.",
    forgot: "هل نسيت كلمة المرور؟",
    remember: "تذكرني",
    show: "إظهار",
    hide: "إخفاء",
    mismatch: "كلمتا المرور غير متطابقتين.",
    missingConsent: "يرجى قبول جميع الشروط الإلزامية.",
  },
};

export default function Home() {
  const [location, setLocation] = useLocation();
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.title = `${siteCopy[locale].homeTitle} · ICX Power Solutions`;
  }, [locale]);
  const updateLocale = (next: Locale) => {
    if (!isLocale(next)) return;
    setLocale(next);
    writeLocalStorage("icx-locale", next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  };
  const serviceSlug = location.startsWith("/services/")
    ? location.split("/")[2]
    : "";
  if (serviceSlug && serviceBySlug[serviceSlug])
    return (
      <ServicePage
        service={serviceBySlug[serviceSlug]}
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/contact")
    return (
      <ContactPage
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/etudes")
    return (
      <StudiesPage
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/partenaires")
    return (
      <InfoPage
        kind="partners"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/confidentialite")
    return (
      <InfoPage
        kind="privacy"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/mentions-legales")
    return (
      <InfoPage
        kind="legal"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/connexion")
    return (
      <AuthPanel
        mode="login"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/inscription")
    return (
      <AuthPanel
        mode="signup"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/mot-de-passe-oublie")
    return (
      <AuthPanel
        mode="forgot"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/verification-email")
    return (
      <AuthPanel
        mode="verify"
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/mon-espace")
    return (
      <WorkspacePage
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  if (location === "/admin")
    return (
      <AdminPage
        locale={locale}
        setLocale={updateLocale}
        setLocation={setLocation}
      />
    );
  return (
    <HomePage
      locale={locale}
      setLocale={updateLocale}
      setLocation={setLocation}
    />
  );
}
