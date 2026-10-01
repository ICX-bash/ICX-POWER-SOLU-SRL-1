import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { detectLocale, siteCopy } from "@/lib/i18n";
import type { Locale } from "@/lib/siteData";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Globe2,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const assistantCopy = {
  fr: {
    welcome:
      "Bonjour, je suis **ICX Intelligence**. Décrivez votre situation, votre objectif ou votre question.",
    unavailable:
      "L’assistant est momentanément indisponible. Réessayez ou contactez ICX directement.",
    newChat: "Nouvelle conversation",
    limits: "Les limites et les points à confirmer sont signalés clairement",
    recommendation: "Une recommandation concrète à chaque échange",
    dataNotice:
      "Vos messages sont transmis au fournisseur d’IA configuré. Les règles Google varient selon la région : certains usages gratuits peuvent servir à améliorer ses services et être lus par des réviseurs; des clauses différentes s’appliquent dans l’EEE, en Suisse et au Royaume-Uni. Évitez les données personnelles, sensibles ou confidentielles.",
    dataTerms: "Conditions Google",
    intents: [
      "Études & admissions",
      "Entreprise & stratégie",
      "Sourcing & commerce",
      "RH & mobilité",
    ],
  },
  en: {
    welcome:
      "Hello, I am **ICX Intelligence**. Describe your situation, goal or question.",
    unavailable:
      "The assistant is temporarily unavailable. Try again or contact ICX directly.",
    newChat: "New conversation",
    limits: "Limits and information to confirm are clearly flagged",
    recommendation: "One concrete recommendation in every exchange",
    dataNotice:
      "Your messages are sent to the configured AI provider. Google's data terms vary by region: some free usage may be used to improve its services and read by human reviewers; different clauses apply in the EEA, Switzerland and the UK. Avoid personal, sensitive or confidential information.",
    dataTerms: "Google terms",
    intents: [
      "Studies & admissions",
      "Business & strategy",
      "Sourcing & trade",
      "HR & mobility",
    ],
  },
  ro: {
    welcome:
      "Bună ziua, sunt **ICX Intelligence**. Descrieți situația, obiectivul sau întrebarea dumneavoastră.",
    unavailable:
      "Asistentul este temporar indisponibil. Încercați din nou sau contactați direct ICX.",
    newChat: "Conversație nouă",
    limits: "Limitele și informațiile de confirmat sunt semnalate clar",
    recommendation: "O recomandare concretă la fiecare schimb",
    dataNotice:
      "Mesajele sunt trimise furnizorului de inteligență artificială configurat. Regulile Google privind datele diferă în funcție de regiune: unele utilizări gratuite pot fi folosite pentru îmbunătățirea serviciilor și pot fi citite de evaluatori; în SEE, Elveția și Regatul Unit se aplică clauze diferite. Evitați datele personale, sensibile sau confidențiale.",
    dataTerms: "Condițiile Google",
    intents: [
      "Studii și admitere",
      "Afaceri și strategie",
      "Sourcing și comerț",
      "Resurse umane și mobilitate",
    ],
  },
  pl: {
    welcome:
      "Dzień dobry, jestem **ICX Intelligence**. Opisz swoją sytuację, cel lub pytanie.",
    unavailable:
      "Asystent jest chwilowo niedostępny. Spróbuj ponownie lub skontaktuj się z ICX.",
    newChat: "Nowa rozmowa",
    limits:
      "Ograniczenia i informacje wymagające potwierdzenia są wyraźnie oznaczone",
    recommendation: "Konkretna rekomendacja w każdej rozmowie",
    dataNotice:
      "Wiadomości są wysyłane do skonfigurowanego dostawcy AI. Zasady Google dotyczące danych zależą od regionu: niektóre bezpłatne użycia mogą służyć do ulepszania usług i być czytane przez recenzentów; w EOG, Szwajcarii i Wielkiej Brytanii obowiązują inne klauzule. Unikaj danych osobowych, wrażliwych i poufnych.",
    dataTerms: "Warunki Google",
    intents: [
      "Studia i rekrutacja",
      "Biznes i strategia",
      "Sourcing i handel",
      "HR i mobilność",
    ],
  },
  ar: {
    welcome: "مرحباً، أنا **ICX Intelligence**. صف وضعك أو هدفك أو سؤالك.",
    unavailable:
      "المساعد غير متاح مؤقتاً. حاول مرة أخرى أو تواصل مع ICX مباشرة.",
    newChat: "محادثة جديدة",
    limits: "يتم توضيح الحدود والمعلومات التي تحتاج إلى تأكيد",
    recommendation: "توصية عملية في كل محادثة",
    dataNotice:
      "تُرسل رسائلك إلى مزوّد الذكاء الاصطناعي المُعدّ. تختلف قواعد Google للبيانات حسب المنطقة: قد تُستخدم بعض الاستخدامات المجانية لتحسين الخدمات وقد يقرأها مراجعون؛ وتُطبّق شروط مختلفة في المنطقة الاقتصادية الأوروبية وسويسرا والمملكة المتحدة. تجنّب إدخال معلومات شخصية أو حساسة أو سرية.",
    dataTerms: "شروط Google",
    intents: [
      "الدراسات والقبول",
      "الأعمال والاستراتيجية",
      "التوريد والتجارة",
      "الموارد البشرية والتنقل",
    ],
  },
  zh: {
    welcome: "您好，我是 **ICX Intelligence**。请描述您的情况、目标或问题。",
    unavailable: "助手暂时不可用，请重试或直接联系 ICX。",
    newChat: "新对话",
    limits: "需要确认的限制和信息会清晰标注",
    recommendation: "每次交流都提供一个具体建议",
    dataNotice:
      "您的消息会发送给已配置的 AI 服务商。Google 的数据规则因地区而异：部分免费服务可能使用提示和回复改进服务并由人工审阅；欧洲经济区、瑞士和英国适用不同条款。请避免输入个人、敏感或机密信息。",
    dataTerms: "Google 条款",
    intents: ["留学与申请", "企业与战略", "采购与贸易", "人力资源与流动"],
  },
} as const;
const intentPrompts = [
  "I want to study internationally. Help me compare countries, programmes and required documents.",
  "I have an international business project. Help me clarify the need, risks and next steps.",
  "I am looking for a supplier or business partner. Give me a qualification method and required documents.",
  "I want to recruit or organise international mobility. Where should I start?",
];

export default function Assistant() {
  const locale = detectLocale();
  const copy = siteCopy[locale];
  const ui = assistantCopy[locale];
  const welcome: Message = { role: "assistant", content: ui.welcome };
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const chat = trpc.ai.chat.useMutation({
    onSuccess: response =>
      setMessages(current => [
        ...current,
        { role: "assistant", content: response.content },
      ]),
    onError: () => {
      setMessages(current => [
        ...current,
        { role: "assistant", content: ui.unavailable },
      ]);
      toast.error(ui.unavailable);
    },
  });

  const handleSend = (content: string) => {
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    chat.mutate({
      messages: nextMessages
        .filter(message => message.role !== "system")
        .slice(-20)
        .map(message => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
    });
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#171c1a] text-[#edf0e9]">
      <header className="border-b border-white/10 bg-[#1b211e]/90 backdrop-blur-xl">
        <div className="container flex h-[74px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assets/icx-logo.png"
                alt="ICX Power Solutions SRL"
                className="size-full object-cover"
              />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#edf0e9]">
              ICX Intelligence
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMessages([welcome])}
              className="text-[#a4afa5] hover:bg-white/10 hover:text-white"
              aria-label={ui.newChat}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/">
                <ArrowLeft />
                <span className="hidden sm:inline">{copy.backHome}</span>
                <span className="sr-only sm:hidden">{copy.backHome}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container grid max-w-4xl gap-6 py-6 lg:grid-cols-[.92fr_1.08fr] lg:py-8">
        <section className="flex max-w-lg flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
            <Sparkles className="size-3.5" />
            {copy.homeEyebrow}
          </span>
          <h1 className="mt-5 max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl">
            {copy.homeTitle}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#b8c1b8]">
            {copy.homeLead}
          </p>
          <div className="mt-6 space-y-2.5 text-sm text-[#b8c1b8]">
            <div className="flex items-center gap-3">
              <Globe2 className="size-4 text-amber-300" />
              {copy.homeEyebrow}
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-amber-300" />
              {ui.limits}
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-amber-300" />
              {ui.recommendation}
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200/20 bg-amber-200/[0.06] p-3 text-xs leading-5 text-[#f1dfb7]">
            <p dir="auto">
              {ui.dataNotice}{" "}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-2 hover:text-white"
              >
                {ui.dataTerms}
              </a>
              .
            </p>
          </div>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {assistantCopy[locale].intents.map((label, index) => {
              const Icon = [
                GraduationCap,
                BriefcaseBusiness,
                Globe2,
                UsersRound,
              ][index];
              const prompt = intentPrompts[index];
              return (
                <button
                  key={label}
                  onClick={() => handleSend(prompt)}
                  disabled={chat.isPending}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm font-semibold text-[#dbe3d9] transition hover:-translate-y-0.5 hover:border-amber-300/50 hover:bg-amber-300/10 disabled:opacity-50"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
                    <Icon className="size-4" />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="mx-auto w-full max-w-[540px] rounded-[1.35rem] border border-white/10 bg-[#202824] p-1.5 shadow-2xl shadow-black/25">
          <AIChatBox
            messages={messages}
            onSendMessage={handleSend}
            isLoading={chat.isPending}
            height="min(520px, calc(100dvh - 132px))"
            className="overflow-hidden rounded-[1.1rem] border-white/10 bg-[#fdfcf8]"
            placeholder={copy.searchHint}
            emptyStateMessage={copy.secureProject}
            suggestedPrompts={[
              "Quelles sont les étapes pour étudier en France ?",
              "Comment structurer un projet de sourcing ?",
              "De quels documents ai-je besoin pour commencer ?",
            ]}
          />
        </section>
      </main>
    </div>
  );
}
