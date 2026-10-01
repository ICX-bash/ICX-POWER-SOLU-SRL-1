import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Cloud,
  FileArchive,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CountryField } from "@/components/WorldCountryFields";

type Tab =
  | "overview"
  | "requests"
  | "files"
  | "outlook"
  | "notifications"
  | "team"
  | "activity"
  | "integrations";
const STATUSES = [
  "Reçu",
  "En cours d’analyse",
  "Documents complémentaires requis",
  "Accepté",
  "Refusé",
  "Clôturé",
] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const statusStyle: Record<string, string> = {
  Reçu: "bg-sky-50 text-sky-700 ring-sky-200",
  "En cours d’analyse": "bg-amber-50 text-amber-800 ring-amber-200",
  "Documents complémentaires requis":
    "bg-orange-50 text-orange-800 ring-orange-200",
  Accepté: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Refusé: "bg-rose-50 text-rose-700 ring-rose-200",
  Clôturé: "bg-slate-100 text-slate-600 ring-slate-200",
};
const nav: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "requests", label: "Demandes", icon: ClipboardList },
  { id: "files", label: "Dossiers & fichiers", icon: FileArchive },
  { id: "outlook", label: "Boîte Outlook", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Comptes & rôles", icon: Users },
  { id: "activity", label: "Journal d’activité", icon: Activity },
  { id: "integrations", label: "Système & intégrations", icon: Settings2 },
];

function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
function fileSize(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${colors[tone]}`}
    >
      {children}
    </span>
  );
}
function Metric({
  label,
  value,
  hint,
  icon: Icon,
  accent = "amber",
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Inbox;
  accent?: "amber" | "green" | "blue" | "red";
}) {
  const color = {
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-sky-100 text-sky-800",
    red: "bg-rose-100 text-rose-800",
  }[accent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`grid size-11 place-items-center rounded-xl ${color}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
          <Inbox className="size-5" />
        </span>
        <p className="mt-4 font-bold text-slate-800">{title}</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null
  );
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous les statuts");
  const [priorityFilter, setPriorityFilter] = useState("Toutes les priorités");
  const [serviceFilter, setServiceFilter] = useState("Tous les services");
  const [countryFilter, setCountryFilter] = useState("Tous les pays");
  const [senderFilter, setSenderFilter] = useState("all");
  const [mailSenderFilter, setMailSenderFilter] = useState("all");
  const [needFilter, setNeedFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [priorityDraft, setPriorityDraft] = useState("normal");
  const [statusDraft, setStatusDraft] =
    useState<(typeof STATUSES)[number]>("Reçu");
  const [assignedDraft, setAssignedDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [recipientId, setRecipientId] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sendNotificationEmail, setSendNotificationEmail] = useState(true);
  const [folderId, setFolderId] = useState("inbox");
  const [selectedMailId, setSelectedMailId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [teamEmail, setTeamEmail] = useState("");

  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const isSuper = trpc.auth.isSuperAdmin.useQuery(undefined, {
    enabled: !!me.data,
    retry: false,
  });
  const isAdmin = Boolean(
    me.data && (me.data.role === "admin" || isSuper.data)
  );
  const dashboard = trpc.admin.dashboard.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const requests = trpc.admin.requests.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const files = trpc.admin.files.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const recipients = trpc.admin.recipients.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const notices = trpc.admin.notifications.useQuery(undefined, {
    enabled: isAdmin && tab === "notifications",
    retry: false,
  });
  const audit = trpc.admin.audit.useQuery(
    { limit: 250 },
    { enabled: isAdmin && tab === "activity", retry: false }
  );
  const emailLogs = trpc.admin.emailLogs.useQuery(undefined, {
    enabled: isAdmin && (tab === "activity" || tab === "integrations"),
    retry: false,
  });
  const integrations = trpc.admin.integrations.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const folders = trpc.admin.outlookFolders.useQuery(undefined, {
    enabled:
      isAdmin &&
      tab === "outlook" &&
      Boolean(integrations.data?.outlook.connected),
    retry: false,
  });
  const messages = trpc.admin.outlookMessages.useQuery(
    { folderId },
    {
      enabled:
        isAdmin &&
        tab === "outlook" &&
        Boolean(integrations.data?.outlook.connected),
      retry: false,
    }
  );
  const outlookMessage = trpc.admin.outlookMessage.useQuery(
    { messageId: selectedMailId },
    {
      enabled: isAdmin && tab === "outlook" && Boolean(selectedMailId),
      retry: false,
    }
  );
  const outlookAttachments = trpc.admin.outlookAttachments.useQuery(
    { messageId: selectedMailId },
    {
      enabled: isAdmin && tab === "outlook" && Boolean(selectedMailId),
      retry: false,
    }
  );
  const utils = trpc.useUtils();
  const deleteDocument = trpc.admin.deleteDocument.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.files.invalidate(),
        utils.admin.requests.invalidate(),
        utils.admin.dashboard.invalidate(),
      ]);
      toast.success("Document supprimé.");
    },
    onError: e => toast.error(e.message),
  });
  const deleteEmailLog = trpc.admin.deleteEmailLog.useMutation({
    onSuccess: async () => {
      await utils.admin.emailLogs.invalidate();
      toast.success("Journal e-mail supprimé.");
    },
    onError: e => toast.error(e.message),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.users.invalidate(),
        utils.admin.recipients.invalidate(),
        utils.admin.dashboard.invalidate(),
      ]);
      toast.success("Compte utilisateur supprimé.");
    },
    onError: e => toast.error(e.message),
  });
  const setRole = trpc.admin.setRole.useMutation({
    onSuccess: async () => {
      setTeamEmail("");
      await utils.admin.users.invalidate();
      toast.success("Rôle mis à jour.");
    },
    onError: error => toast.error(error.message),
  });
  const updateRequest = trpc.admin.updateRequest.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.admin.requests.invalidate(),
        utils.admin.dashboard.invalidate(),
        utils.admin.notifications.invalidate(),
        utils.admin.audit.invalidate(),
      ]);
      toast.success(
        result.messages?.length
          ? result.messages.join(" · ")
          : "Dossier enregistré."
      );
      setClientMessage("");
    },
    onError: error => toast.error(error.message || "La mise à jour a échoué."),
  });
  const downloadDocument = trpc.admin.documentUrl.useMutation({
    onSuccess: result => {
      window.location.assign(result.url);
    },
    onError: error =>
      toast.error(error.message || "Téléchargement impossible."),
  });
  const deleteNotification = trpc.admin.deleteNotification.useMutation({
    onSuccess: async () => {
      await utils.admin.notifications.invalidate();
      toast.success("Notification supprimée.");
    },
    onError: error => toast.error(error.message),
  });
  const sendNotification = trpc.admin.sendNotification.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.admin.notifications.invalidate(),
        utils.admin.emailLogs.invalidate(),
      ]);
      toast.success(
        result.emailSent
          ? "Notification et e-mail envoyés."
          : "Notification créée; e-mail non envoyé (vérifier Brevo). "
      );
      setNotificationTitle("");
      setNotificationBody("");
    },
    onError: error => toast.error(error.message || "Envoi impossible."),
  });
  const markRead = trpc.admin.outlookMarkRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.outlookMessages.invalidate(),
        utils.admin.outlookFolders.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const reply = trpc.admin.outlookReply.useMutation({
    onSuccess: async () => {
      setReplyBody("");
      await utils.admin.outlookMessages.invalidate();
      toast.success("Réponse envoyée depuis Outlook.");
    },
    onError: error => toast.error(error.message),
  });
  const moveMail = trpc.admin.outlookMove.useMutation({
    onSuccess: async () => {
      setSelectedMailId("");
      await Promise.all([
        utils.admin.outlookMessages.invalidate(),
        utils.admin.outlookFolders.invalidate(),
      ]);
      toast.success("Message déplacé.");
    },
    onError: error => toast.error(error.message),
  });
  const disconnectOutlook = trpc.admin.outlookDisconnect.useMutation({
    onSuccess: async () => {
      await utils.admin.integrations.invalidate();
      toast.success("Connexion Outlook supprimée de la console.");
    },
    onError: error => toast.error(error.message),
  });

  const requestRows = requests.data ?? [];
  const clientLabel = (userId: number) => {
    const client = recipients.data?.find(user => user.id === userId);
    return client?.name || client?.email || `Compte #${userId}`;
  };
  const visibleFiles = [...(files.data ?? [])]
    .filter(
      file => senderFilter === "all" || String(file.userId) === senderFilter
    )
    .sort(
      (a, b) =>
        a.userId - b.userId ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const visibleNotices = [...(notices.data ?? [])]
    .filter(
      item => senderFilter === "all" || String(item.userId) === senderFilter
    )
    .sort(
      (a, b) =>
        a.userId - b.userId ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const visibleEmailLogs = [...(emailLogs.data ?? [])]
    .filter(
      log =>
        senderFilter === "all" ||
        recipients.data
          ?.find(user => String(user.id) === senderFilter)
          ?.email?.toLowerCase() === log.recipient.toLowerCase()
    )
    .sort(
      (a, b) =>
        a.recipient.localeCompare(b.recipient) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const mailboxRows = (messages.data ?? []) as Array<{
    from?: { emailAddress?: { name?: string; address?: string } };
  }>;
  const mailboxSenders = Array.from(
    new Set(
      mailboxRows
        .map(item => item.from?.emailAddress?.address)
        .filter((email): email is string => Boolean(email))
    )
  ).sort();
  const visibleMailboxMessages = mailboxRows
    .filter(
      item =>
        mailSenderFilter === "all" ||
        item.from?.emailAddress?.address === mailSenderFilter
    )
    .sort((a, b) =>
      (a.from?.emailAddress?.address || "").localeCompare(
        b.from?.emailAddress?.address || ""
      )
    );

  const selectedRequest =
    requestRows.find(item => item.id === selectedRequestId) ?? null;
  useEffect(() => {
    if (!selectedRequest) return;
    setStatusDraft(selectedRequest.status as (typeof STATUSES)[number]);
    setPriorityDraft(selectedRequest.priority || "normal");
    setAssignedDraft(selectedRequest.assignedAdminEmail || "");
    setNotesDraft(selectedRequest.adminNotes || "");
  }, [
    selectedRequest?.id,
    selectedRequest?.status,
    selectedRequest?.priority,
    selectedRequest?.assignedAdminEmail,
    selectedRequest?.adminNotes,
  ]);

  const visibleRequests = useMemo(
    () =>
      requestRows.filter(item => {
        const search = requestSearch.trim().toLowerCase();
        const matchesSearch =
          !search ||
          `${item.id} ${item.firstName} ${item.lastName} ${item.email} ${item.serviceKey}`
            .toLowerCase()
            .includes(search);
        const matchesStatus =
          statusFilter === "Tous les statuts" || item.status === statusFilter;
        const matchesPriority =
          priorityFilter === "Toutes les priorités" ||
          item.priority === priorityFilter;
        const matchesService =
          serviceFilter === "Tous les services" ||
          item.serviceKey === serviceFilter;
        const matchesCountry =
          countryFilter === "Tous les pays" || item.country === countryFilter;
        const matchesSender =
          senderFilter === "all" || String(item.userId) === senderFilter;
        const matchesNeed =
          !needFilter.trim() ||
          `${item.message || ""} ${item.serviceKey}`
            .toLowerCase()
            .includes(needFilter.trim().toLowerCase());
        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesService &&
          matchesCountry &&
          matchesSender &&
          matchesNeed
        );
      }),
    [
      requestRows,
      requestSearch,
      statusFilter,
      priorityFilter,
      serviceFilter,
      countryFilter,
      senderFilter,
      needFilter,
    ]
  );
  const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 } as const;
  const sortedVisibleRequests = [...visibleRequests].sort(
    (a, b) =>
      a.userId - b.userId ||
      (sortBy === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : sortBy === "priority"
          ? (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const selectedMail = (messages.data ?? []).find(
    raw => (raw as { id?: string }).id === selectedMailId
  ) as
    | {
        id: string;
        subject?: string;
        from?: { emailAddress?: { name?: string; address?: string } };
        receivedDateTime?: string;
        bodyPreview?: string;
        isRead?: boolean;
        hasAttachments?: boolean;
      }
    | undefined;
  const messageDetails = outlookMessage.data as
    | { body?: { content?: string; contentType?: string } }
    | undefined;
  const authError = new URLSearchParams(window.location.search).get(
    "authError"
  );
  const authErrorText: Record<string, string> = {
    configuration:
      "La connexion Microsoft n’est pas entièrement configurée dans Render.",
    microsoft_denied:
      "Microsoft a refusé la connexion ou les autorisations demandées.",
    invalid_callback: "Réponse OAuth incomplète. Relancez la connexion.",
    invalid_state: "Contrôle de sécurité OAuth échoué. Relancez la connexion.",
    token_exchange:
      "Microsoft n’a pas accepté le code OAuth. Vérifiez l’ID, le secret et l’URL de retour.",
    invalid_identity_token:
      "L’identité reçue de Microsoft n’a pas pu être vérifiée.",
    graph_profile:
      "Impossible de lire le profil Outlook. Vérifiez la permission déléguée User.Read.",
    not_authorized:
      "Ce compte Microsoft n’est pas autorisé comme super-administrateur ICX.",
    callback_failed:
      "La connexion admin a échoué. Vérifiez les paramètres Microsoft et Render.",
  };

  if (me.isLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f2f5f3] text-slate-600">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-amber-600" />
          <p className="mt-4 text-sm font-semibold">
            Vérification de la session sécurisée…
          </p>
        </div>
      </div>
    );
  if (!me.data || !isAdmin)
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0b1714] px-4 py-12 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, #a7772d 0, transparent 32%), radial-gradient(circle at 85% 78%, #1b6553 0, transparent 30%)",
          }}
        />
        <section className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#14211d]/95 p-8 shadow-2xl sm:p-12">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber-300">
                ICX POWER SOLUTIONS
              </p>
              <p className="mt-1 text-xs text-slate-400">
                SECURE OPERATIONS CONSOLE
              </p>
            </div>
          </div>
          <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Accès réservé
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            Console d’administration
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            La console est une application distincte du portail client.
            Connectez-vous avec le compte Microsoft autorisé{" "}
            <strong className="text-white">icxps.sale@outlook.com</strong>.
          </p>
          {authError && (
            <div className="mt-6 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">
              <CircleAlert className="mr-2 inline size-4" />
              {authErrorText[authError] || "Connexion non autorisée."}
            </div>
          )}
          {me.data && !isAdmin && (
            <div className="mt-6 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">
              Ce compte ne dispose pas des droits d’administration.
            </div>
          )}
          <a
            href="/api/admin/auth/start"
            className="mt-8 flex h-12 items-center justify-center gap-3 rounded-xl bg-amber-400 px-5 text-sm font-extrabold text-[#17201c] transition hover:bg-amber-300"
          >
            <span className="grid size-6 place-items-center rounded bg-white/80 text-blue-700 font-black">
              M
            </span>
            Continuer avec Microsoft
            <ArrowUpRight className="size-4" />
          </a>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">
            La connexion Microsoft de l’admin n’utilise pas la session Manus du
            site client.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Retour au site client
          </a>
        </section>
      </main>
    );

  const currentTab = nav.find(item => item.id === tab)!;
  const PageIcon = currentTab.icon;
  const logout = async () => {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/admin");
  };

  return (
    <div className="min-h-screen bg-[#f3f6f4] text-slate-900 selection:bg-amber-200">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-[#0b1714] text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-400 text-[#17201c]">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]">
              ICX OPERATIONS
            </p>
            <p className="mt-1 text-[10px] text-slate-400">Console privée</p>
          </div>
        </div>
        <div className="px-4 pt-5">
          <p className="px-3 pb-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
            GESTION
          </p>
          <nav className="space-y-1">
            {nav.map(item => {
              const Icon = item.icon;
              const active = tab === item.id;
              const count =
                item.id === "requests"
                  ? dashboard.data?.totalRequests
                  : item.id === "files"
                    ? dashboard.data?.totalDocuments
                    : undefined;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${active ? "bg-amber-400 text-[#14201b] shadow-md shadow-amber-900/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon className="size-[17px]" />
                  <span className="flex-1">{item.label}</span>
                  {count !== undefined && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? "bg-black/10" : "bg-white/10 text-slate-400"}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              Session Microsoft vérifiée
            </div>
            <p className="mt-2 truncate text-[10px] text-slate-400">
              {me.data.email}
            </p>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              Les fonctions sensibles sont vérifiées côté serveur.
            </p>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 lg:hidden">
              <Building2 className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-800">
                ICX POWER SOLUTIONS · ADMIN
              </p>
              <h1 className="mt-0.5 flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-950">
                <PageIcon className="hidden size-4 text-amber-700 sm:block" />
                {currentTab.label}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate text-xs font-semibold text-slate-500 sm:block">
              {me.data.email}
            </span>
            <a
              href="/"
              className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:inline-flex"
            >
              Site client
              <ArrowUpRight className="size-3" />
            </a>
            <button
              onClick={logout}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
              aria-label="Déconnexion"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <div className="sticky top-[76px] z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                title={item.label}
                className={`grid size-10 shrink-0 place-items-center rounded-lg ${tab === item.id ? "bg-[#0b1714] text-amber-300" : "text-slate-500 hover:bg-slate-100"}`}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-7">
          {tab === "overview" && (
            <section>
              <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-800">
                    Pilotage
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                    Bonjour, {me.data.name?.split(" ")[0] || "administrateur"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Vue opérationnelle des dossiers, du courrier et des
                    intégrations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    void dashboard.refetch();
                    void requests.refetch();
                    void integrations.refetch();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <RefreshCw className="size-3.5" />
                  Actualiser
                </button>
              </div>
              {dashboard.isLoading ? (
                <LoadingCard />
              ) : dashboard.error ? (
                <ErrorCard message="La base ne répond pas. Vérifiez DATABASE_URL et appliquez la migration 0006." />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      label="Demandes totales"
                      value={dashboard.data?.totalRequests ?? 0}
                      hint="Dossiers enregistrés"
                      icon={ClipboardList}
                    />
                    <Metric
                      label="À traiter"
                      value={
                        (dashboard.data?.statusCounts?.["Reçu"] ?? 0) +
                        (dashboard.data?.statusCounts?.[
                          "Documents complémentaires requis"
                        ] ?? 0)
                      }
                      hint="Nouvelles / pièces attendues"
                      icon={Inbox}
                      accent="blue"
                    />
                    <Metric
                      label="Documents reçus"
                      value={dashboard.data?.totalDocuments ?? 0}
                      hint="Pièces téléversées par les clients"
                      icon={FileArchive}
                      accent="green"
                    />
                    <Metric
                      label="Comptes client"
                      value={dashboard.data?.totalUsers ?? 0}
                      hint="Comptes connus du portail"
                      icon={Users}
                      accent="red"
                    />
                  </div>
                  <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold">Demandes récentes</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Derniers dossiers reçus ou modifiés.
                          </p>
                        </div>
                        <button
                          onClick={() => setTab("requests")}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-600"
                        >
                          Voir tout →
                        </button>
                      </div>
                      <div className="mt-4 divide-y divide-slate-100">
                        {(dashboard.data?.latestRequests ?? []).length === 0 ? (
                          <p className="py-10 text-center text-sm text-slate-400">
                            Aucune demande enregistrée.
                          </p>
                        ) : (
                          dashboard.data?.latestRequests.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setSelectedRequestId(item.id);
                                setTab("requests");
                              }}
                              className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"
                            >
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-600">
                                #{item.id}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold">
                                  {item.firstName} {item.lastName}
                                </span>
                                <span className="mt-1 block truncate text-xs text-slate-500">
                                  {item.serviceKey} · {item.email}
                                </span>
                              </span>
                              <Badge
                                tone={
                                  item.status === "Reçu"
                                    ? "blue"
                                    : item.status === "Refusé"
                                      ? "red"
                                      : item.status === "Accepté"
                                        ? "green"
                                        : "amber"
                                }
                              >
                                {item.status}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold">
                            Connexions opérationnelles
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            État détecté par le serveur.
                          </p>
                        </div>
                        <button
                          onClick={() => setTab("integrations")}
                          className="text-xs font-bold text-emerald-800"
                        >
                          Détails
                        </button>
                      </div>
                      <div className="mt-5 space-y-3">
                        <StatusRow
                          label="Outlook / Microsoft Graph"
                          configured={integrations.data?.outlook.connected}
                          loading={integrations.isLoading}
                          detail={
                            integrations.data?.outlook.email ||
                            "Boîte non connectée"
                          }
                        />
                        <StatusRow
                          label="E-mails transactionnels Brevo"
                          configured={integrations.data?.brevo.configured}
                          loading={integrations.isLoading}
                          detail={
                            integrations.data?.brevo.from ||
                            "Clé ou expéditeur manquant"
                          }
                        />
                        <StatusRow
                          label="Stockage des pièces"
                          configured={integrations.data?.storage.configured}
                          loading={integrations.isLoading}
                          detail="Stockage Forge pour les fichiers clients"
                        />
                        <StatusRow
                          label="Base TiDB/MySQL"
                          configured={integrations.data?.database.connected}
                          loading={integrations.isLoading}
                          detail={
                            integrations.data?.database.connected
                              ? "Connexion SQL/TLS opérationnelle"
                              : integrations.data?.database.configured
                                ? "URL présente; vérifier réseau, TLS et migrations"
                                : "DATABASE_URL absent"
                          }
                        />
                      </div>
                    </section>
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "requests" && (
            <section>
              <PageIntro
                title="Centre de demandes"
                text="Recherche, tri, statut, priorité, notes internes, notifications client et assignation."
                action={
                  <button
                    onClick={() => void requests.refetch()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold shadow-sm"
                  >
                    <RefreshCw className="size-3.5" />
                    Actualiser
                  </button>
                }
              />
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.82fr)_minmax(420px,1.18fr)]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-4">
                    <label className="relative block">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={requestSearch}
                        onChange={event => setRequestSearch(event.target.value)}
                        placeholder="Nom, email, service ou #…"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
                      />
                    </label>
                    <select
                      value={statusFilter}
                      onChange={event => setStatusFilter(event.target.value)}
                      className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                    >
                      <option>Tous les statuts</option>
                      {STATUSES.map(status => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select
                        value={priorityFilter}
                        onChange={event =>
                          setPriorityFilter(event.target.value)
                        }
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                      >
                        <option>Toutes les priorités</option>
                        {PRIORITIES.map(priority => (
                          <option key={priority} value={priority}>
                            {priority === "urgent"
                              ? "Urgente"
                              : priority === "high"
                                ? "Haute"
                                : priority === "low"
                                  ? "Basse"
                                  : "Normale"}
                          </option>
                        ))}
                      </select>
                      <select
                        value={serviceFilter}
                        onChange={event => setServiceFilter(event.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                      >
                        <option>Tous les services</option>
                        {Array.from(
                          new Set(requestRows.map(item => item.serviceKey))
                        )
                          .sort()
                          .map(service => (
                            <option key={service}>{service}</option>
                          ))}
                      </select>
                      <CountryField
                        value={
                          countryFilter === "Tous les pays" ? "" : countryFilter
                        }
                        onChange={value =>
                          setCountryFilter(value || "Tous les pays")
                        }
                        locale="fr"
                        placeholder="Tous les pays ou saisir…"
                        className="sm:col-span-2"
                      />
                      <select
                        aria-label="Filtrer par utilisateur expéditeur"
                        value={senderFilter}
                        onChange={event => setSenderFilter(event.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold sm:col-span-2"
                      >
                        <option value="all">
                          Tous les utilisateurs / expéditeurs
                        </option>
                        {recipients.data?.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email || `Compte #${user.id}`}{" "}
                            {user.email ? `— ${user.email}` : ""}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sortBy}
                        onChange={event => setSortBy(event.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                      >
                        <option value="recent">Plus récentes</option>
                        <option value="priority">Priorité / urgence</option>
                        <option value="oldest">Plus anciennes</option>
                      </select>
                    </div>
                    <input
                      value={needFilter}
                      onChange={event => setNeedFilter(event.target.value)}
                      placeholder="Besoin ou programme d’études…"
                      className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    />
                  </div>
                  <div className="max-h-[70vh] overflow-auto">
                    {requests.isLoading ? (
                      <LoadingCard />
                    ) : requests.error ? (
                      <ErrorCard message="Impossible de charger les demandes. Vérifiez les migrations TiDB." />
                    ) : (
                      sortedVisibleRequests.map((item, index) => (
                        <div key={`request-user-${item.id}`}>
                          {(index === 0 ||
                            sortedVisibleRequests[index - 1].userId !==
                              item.userId) && (
                            <p className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                              Dossiers transmis par {clientLabel(item.userId)} ·{" "}
                              {item.email}
                            </p>
                          )}
                          <button
                            key={item.id}
                            onClick={() => setSelectedRequestId(item.id)}
                            className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${selectedRequestId === item.id ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-extrabold text-slate-500">
                                DOSSIER #{item.id}
                              </span>
                              <Badge
                                tone={
                                  item.status === "Reçu"
                                    ? "blue"
                                    : item.status === "Refusé"
                                      ? "red"
                                      : item.status === "Accepté"
                                        ? "green"
                                        : "amber"
                                }
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <p className="mt-2 font-bold">
                              {item.firstName} {item.lastName}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {item.serviceKey} · {item.email}
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                {item.documents?.length ??
                                  item.attachmentCount ??
                                  0}{" "}
                                fichier(s)
                              </span>
                              <span>{dateLabel(item.updatedAt)}</span>
                            </div>
                          </button>
                        </div>
                      ))
                    )}
                    {!requests.isLoading &&
                      sortedVisibleRequests.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-400">
                          Aucun résultat.
                        </p>
                      )}
                  </div>
                </section>
                {!selectedRequest ? (
                  <Empty
                    title="Sélectionnez un dossier"
                    text="Les détails, pièces reçues et outils de traitement s’afficheront ici."
                  />
                ) : (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="blue">
                            DOSSIER #{selectedRequest.id}
                          </Badge>
                          <Badge>{selectedRequest.serviceKey}</Badge>
                        </div>
                        <h3 className="mt-3 text-xl font-extrabold">
                          {selectedRequest.firstName} {selectedRequest.lastName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedRequest.email}
                          {selectedRequest.phone
                            ? ` · ${selectedRequest.phone}`
                            : ""}
                          {selectedRequest.country
                            ? ` · ${selectedRequest.country}`
                            : ""}
                        </p>
                      </div>
                      <span className="text-right text-[10px] text-slate-400">
                        Reçu
                        <br />
                        {dateLabel(selectedRequest.createdAt)}
                      </span>
                    </div>
                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Message du client
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedRequest.message || "—"}
                      </p>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-bold text-slate-600">
                        Statut
                        <select
                          value={statusDraft}
                          onChange={event =>
                            setStatusDraft(
                              event.target.value as (typeof STATUSES)[number]
                            )
                          }
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                          {STATUSES.map(status => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11px] font-bold text-slate-600">
                        Priorité
                        <select
                          value={priorityDraft}
                          onChange={event =>
                            setPriorityDraft(event.target.value)
                          }
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                        >
                          {PRIORITIES.map(priority => (
                            <option value={priority} key={priority}>
                              {
                                (
                                  {
                                    low: "Basse",
                                    normal: "Normale",
                                    high: "Haute",
                                    urgent: "Urgente",
                                  } as const
                                )[priority]
                              }
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">
                        Responsable (e-mail)
                        <input
                          value={assignedDraft}
                          onChange={event =>
                            setAssignedDraft(event.target.value)
                          }
                          placeholder="admin@icx… ou vide"
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        />
                      </label>
                      <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">
                        Note interne (visible uniquement par les
                        administrateurs)
                        <textarea
                          value={notesDraft}
                          onChange={event => setNotesDraft(event.target.value)}
                          rows={3}
                          maxLength={8000}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Décisions, prochaines étapes, éléments à vérifier…"
                        />
                      </label>
                      <label className="text-[11px] font-bold text-slate-600 sm:col-span-2">
                        Message à envoyer au client (facultatif)
                        <textarea
                          value={clientMessage}
                          onChange={event =>
                            setClientMessage(event.target.value)
                          }
                          rows={3}
                          maxLength={4000}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Message de suivi — il sera ajouté aux notifications et envoyé par e-mail si Brevo est configuré."
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={event =>
                            setNotifyEmail(event.target.checked)
                          }
                        />
                        Envoyer un courriel au client si statut/message modifié
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        disabled={updateRequest.isPending}
                        onClick={() =>
                          updateRequest.mutate({
                            id: selectedRequest.id,
                            status: statusDraft,
                            priority:
                              priorityDraft as (typeof PRIORITIES)[number],
                            assignedAdminEmail: assignedDraft.trim() || null,
                            adminNotes: notesDraft,
                            ...(clientMessage.trim()
                              ? { clientMessage: clientMessage.trim() }
                              : {}),
                            emailCustomer: notifyEmail,
                          })
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b1714] px-4 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60"
                      >
                        {updateRequest.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Enregistrer le dossier
                      </button>
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-extrabold">
                            Pièces jointes
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Téléchargement signé après contrôle du rôle admin.
                          </p>
                        </div>
                        <Badge>{selectedRequest.documents?.length ?? 0}</Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        {selectedRequest.documents?.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                          >
                            <FileText className="size-4 shrink-0 text-emerald-800" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold">
                                {doc.fileName}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {fileSize(doc.fileSize)} · {doc.mimeType} ·{" "}
                                {dateLabel(doc.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                downloadDocument.mutate({ id: doc.id })
                              }
                              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                              title="Télécharger"
                            >
                              <ArrowDownToLine className="size-4" />
                            </button>
                          </div>
                        ))}
                        {!selectedRequest.documents?.length && (
                          <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-400">
                            Aucun fichier associé.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </section>
          )}

          {tab === "files" && (
            <section>
              <PageIntro
                title="Dossiers & fichiers"
                text="Inventaire central des pièces téléversées par les utilisateurs; chaque téléchargement est protégé et journalisé."
                action={
                  <button
                    onClick={() => void files.refetch()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold"
                  >
                    <RefreshCw className="size-3.5" />
                    Actualiser
                  </button>
                }
              />
              <label className="mt-4 block max-w-xl text-[11px] font-bold text-slate-600">
                Filtrer les pièces par utilisateur qui les a transmises
                <select
                  value={senderFilter}
                  onChange={event => setSenderFilter(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">Tous les utilisateurs</option>
                  {recipients.data?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email || `Compte #${user.id}`}{" "}
                      {user.email ? `— ${user.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {files.error && (
                <div className="mt-4">
                  <ErrorCard message="Les pièces ne peuvent pas être listées. Vérifiez la base et le fournisseur de stockage." />
                </div>
              )}
              {!files.isLoading && (files.data?.length ?? 0) === 0 ? (
                <div className="mt-5">
                  <Empty
                    title="Aucune pièce reçue"
                    text="Les documents envoyés depuis les demandes clients apparaîtront ici."
                  />
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_100px_120px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <span>Fichier / demande</span>
                    <span>Client</span>
                    <span>Taille</span>
                    <span>Action</span>
                  </div>
                  {files.isLoading ? (
                    <LoadingCard />
                  ) : (
                    visibleFiles.map((doc, index) => (
                      <div key={`file-group-${doc.id}`}>
                        {(index === 0 ||
                          visibleFiles[index - 1].userId !== doc.userId) && (
                          <p className="border-y border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                            Pièces de {clientLabel(doc.userId)} ·{" "}
                            {doc.request.email}
                          </p>
                        )}
                        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_100px_120px] items-center gap-3 border-b border-slate-100 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
                              <FileText className="size-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold">
                                {doc.fileName}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                #{doc.request.id} · {doc.request.serviceKey} ·{" "}
                                {dateLabel(doc.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {doc.request.firstName} {doc.request.lastName}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {doc.request.email}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {fileSize(doc.fileSize)}
                          </span>
                          <button
                            onClick={() =>
                              downloadDocument.mutate({ id: doc.id })
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-[11px] font-bold hover:bg-slate-50"
                          >
                            <ArrowDownToLine className="size-3.5" />
                            Télécharger
                          </button>
                          {isSuper.data && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Supprimer définitivement ${doc.fileName} ?`
                                  )
                                )
                                  deleteDocument.mutate({ id: doc.id });
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 px-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {tab === "outlook" && (
            <section>
              <PageIntro
                title="Boîte Outlook"
                text="Courrier de l’adresse super-admin via Microsoft Graph; les actions s’exécutent sur la vraie boîte Outlook."
                action={
                  <button
                    onClick={() => {
                      void messages.refetch();
                      void folders.refetch();
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold"
                  >
                    <RefreshCw className="size-3.5" />
                    Actualiser
                  </button>
                }
              />
              {!integrations.data?.outlook.connected ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 size-5 text-amber-700" />
                    <div>
                      <h3 className="font-extrabold text-amber-950">
                        Outlook n’est pas encore connecté
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
                        Connectez-vous avec le compte autorisé Microsoft.
                        L’application doit prendre en charge les comptes
                        personnels Outlook.com et les autorisations déléguées{" "}
                        <code>User.Read</code>, <code>Mail.ReadWrite</code>,{" "}
                        <code>Mail.Send</code>.
                      </p>
                      <a
                        href="/api/admin/auth/start"
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b1714] px-4 text-xs font-extrabold text-white"
                      >
                        Connecter le compte Outlook
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
                    <div>
                      <p className="text-sm font-extrabold">
                        {integrations.data.outlook.email}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Courrier Microsoft Graph · boîte connectée
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={folderId}
                        onChange={event => {
                          setFolderId(event.target.value);
                          setSelectedMailId("");
                        }}
                        className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                      >
                        {folders.data?.map(folder => (
                          <option key={folder.id} value={folder.id}>
                            {folder.displayName} · {folder.unreadItemCount ?? 0}{" "}
                            non lu(s)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => disconnectOutlook.mutate()}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                      >
                        Déconnecter
                      </button>
                    </div>
                  </div>
                  <div className="grid min-h-[520px] lg:grid-cols-[minmax(300px,0.82fr)_minmax(360px,1.18fr)]">
                    <div className="max-h-[68vh] overflow-auto border-r border-slate-100">
                      <label className="sticky top-0 z-[2] block border-b border-slate-100 bg-white p-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Regrouper / filtrer par expéditeur
                        <select
                          value={mailSenderFilter}
                          onChange={event =>
                            setMailSenderFilter(event.target.value)
                          }
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs normal-case tracking-normal"
                        >
                          <option value="all">Tous les expéditeurs</option>
                          {mailboxSenders.map(sender => (
                            <option key={sender} value={sender}>
                              {sender}
                            </option>
                          ))}
                        </select>
                      </label>
                      {messages.isLoading ? (
                        <LoadingCard />
                      ) : messages.error ? (
                        <ErrorCard
                          message={
                            messages.error.message ||
                            "Impossible de lire la boîte. Reconnectez Outlook et vérifiez Mail.ReadWrite."
                          }
                        />
                      ) : (
                        visibleMailboxMessages.map(raw => {
                          const email = raw as {
                            id: string;
                            subject?: string;
                            from?: {
                              emailAddress?: {
                                name?: string;
                                address?: string;
                              };
                            };
                            receivedDateTime?: string;
                            bodyPreview?: string;
                            isRead?: boolean;
                            hasAttachments?: boolean;
                          };
                          return (
                            <button
                              key={email.id}
                              onClick={() => {
                                setSelectedMailId(email.id);
                                setReplyBody("");
                                if (!email.isRead)
                                  markRead.mutate({
                                    messageId: email.id,
                                    isRead: true,
                                  });
                              }}
                              className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${email.id === selectedMailId ? "bg-emerald-50" : ""}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={`truncate text-xs ${email.isRead ? "font-semibold text-slate-600" : "font-extrabold text-slate-950"}`}
                                >
                                  {email.from?.emailAddress?.name ||
                                    email.from?.emailAddress?.address ||
                                    "Expéditeur inconnu"}
                                </p>
                                <span className="shrink-0 text-[9px] text-slate-400">
                                  {dateLabel(email.receivedDateTime)}
                                </span>
                              </div>
                              <p
                                className={`mt-1 truncate text-xs ${email.isRead ? "text-slate-600" : "font-bold text-slate-900"}`}
                              >
                                {email.subject || "(sans objet)"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">
                                {email.bodyPreview || "Aucun aperçu"}
                              </p>
                              <div className="mt-2 flex gap-2">
                                {!email.isRead && (
                                  <Badge tone="blue">Non lu</Badge>
                                )}
                                {email.hasAttachments && (
                                  <Badge>Pièce jointe</Badge>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                      {!messages.isLoading &&
                        !messages.error &&
                        (messages.data?.length ?? 0) === 0 && (
                          <p className="p-8 text-center text-sm text-slate-400">
                            Aucun message dans ce dossier.
                          </p>
                        )}
                    </div>
                    <div className="p-5">
                      {!selectedMail ? (
                        <Empty
                          title="Sélectionnez un e-mail"
                          text="Choisissez un message pour lire son aperçu et répondre depuis Outlook."
                        />
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-extrabold">
                                {selectedMail.subject || "(sans objet)"}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                De : {selectedMail.from?.emailAddress?.name}{" "}
                                &lt;{selectedMail.from?.emailAddress?.address}
                                &gt;
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {dateLabel(selectedMail.receivedDateTime)}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                markRead.mutate({
                                  messageId: selectedMail.id,
                                  isRead: !selectedMail.isRead,
                                })
                              }
                              className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500"
                              title={
                                selectedMail.isRead
                                  ? "Marquer non lu"
                                  : "Marquer lu"
                              }
                            >
                              {selectedMail.isRead ? (
                                <Mail className="size-4" />
                              ) : (
                                <CheckCheck className="size-4" />
                              )}
                            </button>
                          </div>
                          <div className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                            {outlookMessage.isLoading
                              ? "Chargement du message…"
                              : messageDetails?.body?.content ||
                                selectedMail.bodyPreview ||
                                "Aucun contenu disponible."}
                          </div>
                          {selectedMail.hasAttachments && (
                            <div className="mt-4 rounded-xl border border-slate-200 p-4">
                              <p className="text-xs font-extrabold">
                                Pièces jointes Outlook
                              </p>
                              {outlookAttachments.isLoading ? (
                                <p className="mt-2 text-xs text-slate-400">
                                  Lecture des fichiers…
                                </p>
                              ) : outlookAttachments.error ? (
                                <p className="mt-2 text-xs text-rose-600">
                                  Impossible de lister les pièces jointes.
                                </p>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  {(outlookAttachments.data ?? []).map(raw => {
                                    const attachment = raw as {
                                      id: string;
                                      name?: string;
                                      size?: number;
                                      contentType?: string;
                                      isInline?: boolean;
                                    };
                                    if (attachment.isInline) return null;
                                    const href = `/api/admin/outlook/attachments/${encodeURIComponent(selectedMail.id)}/${encodeURIComponent(attachment.id)}`;
                                    return (
                                      <a
                                        key={attachment.id}
                                        href={href}
                                        className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs hover:bg-emerald-50"
                                      >
                                        <FileText className="size-4 shrink-0 text-emerald-800" />
                                        <span className="min-w-0 flex-1 truncate font-bold">
                                          {attachment.name || "Fichier"}
                                        </span>
                                        <span className="shrink-0 text-[10px] text-slate-400">
                                          {attachment.size
                                            ? fileSize(attachment.size)
                                            : attachment.contentType}
                                        </span>
                                        <ArrowDownToLine className="size-4 shrink-0 text-slate-500" />
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <label className="text-[10px] font-bold text-slate-500">
                              Déplacer vers
                              <select
                                defaultValue=""
                                onChange={event => {
                                  const destinationId = event.target.value;
                                  if (destinationId)
                                    moveMail.mutate({
                                      messageId: selectedMail.id,
                                      destinationId,
                                    });
                                  event.currentTarget.value = "";
                                }}
                                className="ml-2 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
                              >
                                <option value="">Choisir un dossier…</option>
                                {folders.data
                                  ?.filter(folder => folder.id !== folderId)
                                  .map(folder => (
                                    <option key={folder.id} value={folder.id}>
                                      {folder.displayName}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            {moveMail.isPending && (
                              <span className="text-[10px] text-slate-400">
                                Déplacement…
                              </span>
                            )}
                          </div>
                          <div className="mt-5 border-t border-slate-100 pt-5">
                            <label className="text-xs font-extrabold text-slate-700">
                              Répondre depuis Outlook
                              <textarea
                                value={replyBody}
                                onChange={event =>
                                  setReplyBody(event.target.value)
                                }
                                rows={6}
                                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal"
                                placeholder="Votre réponse…"
                              />
                            </label>
                            <div className="mt-3 flex justify-end">
                              <button
                                disabled={!replyBody.trim() || reply.isPending}
                                onClick={() =>
                                  reply.mutate({
                                    messageId: selectedMail.id,
                                    comment: replyBody.trim(),
                                  })
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b1714] px-4 text-xs font-extrabold text-white disabled:opacity-50"
                              >
                                {reply.isPending ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Send className="size-4" />
                                )}
                                Envoyer la réponse
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "notifications" && (
            <section>
              <PageIntro
                title="Notifications & communications"
                text="Créer une notification dans l’espace client et, si configuré, envoyer le même message par e-mail via Brevo."
              />
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(400px,1.2fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-extrabold">Nouveau message client</h3>
                  <div className="mt-4 space-y-3">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Destinataire
                      <select
                        value={recipientId}
                        onChange={event => setRecipientId(event.target.value)}
                        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Choisir un compte…</option>
                        {recipients.data?.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email || `Compte #${user.id}`}{" "}
                            {user.email ? `— ${user.email}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600">
                      Objet
                      <input
                        value={notificationTitle}
                        onChange={event =>
                          setNotificationTitle(event.target.value)
                        }
                        maxLength={180}
                        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      />
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600">
                      Message
                      <textarea
                        value={notificationBody}
                        onChange={event =>
                          setNotificationBody(event.target.value)
                        }
                        rows={5}
                        maxLength={4000}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={sendNotificationEmail}
                        onChange={event =>
                          setSendNotificationEmail(event.target.checked)
                        }
                      />
                      Envoyer aussi par e-mail (Brevo)
                    </label>
                    <button
                      disabled={
                        !recipientId ||
                        !notificationTitle.trim() ||
                        !notificationBody.trim() ||
                        sendNotification.isPending
                      }
                      onClick={() =>
                        sendNotification.mutate({
                          userId: Number(recipientId),
                          title: notificationTitle.trim(),
                          content: notificationBody.trim(),
                          sendEmail: sendNotificationEmail,
                        })
                      }
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0b1714] text-xs font-extrabold text-white disabled:opacity-50"
                    >
                      {sendNotification.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Créer et envoyer
                    </button>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold">
                        Historique des notifications
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Derniers messages enregistrés pour les comptes clients.
                      </p>
                    </div>
                    <button
                      onClick={() => void notices.refetch()}
                      className="grid size-9 place-items-center rounded-lg border border-slate-200"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                  </div>
                  <label className="mt-4 block text-[11px] font-bold text-slate-600">
                    Filtrer l’historique par utilisateur
                    <select
                      value={senderFilter}
                      onChange={event => setSenderFilter(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="all">Tous les utilisateurs</option>
                      {recipients.data?.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email || `Compte #${user.id}`}{" "}
                          {user.email ? `— ${user.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 max-h-[620px] space-y-2 overflow-auto">
                    {notices.isLoading ? (
                      <LoadingCard />
                    ) : notices.error ? (
                      <ErrorCard message="Impossible de consulter les notifications." />
                    ) : (
                      visibleNotices.map((item, index) => (
                        <div key={`notice-group-${item.id}`}>
                          {(index === 0 ||
                            visibleNotices[index - 1].userId !==
                              item.userId) && (
                            <p className="mb-2 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                              Messages liés à {item.userName || item.email} ·{" "}
                              {item.email}
                            </p>
                          )}
                          <article className="rounded-xl border border-slate-100 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {item.userName || item.email} · {item.email}
                                </p>
                              </div>
                              <span className="text-[9px] text-slate-400">
                                {dateLabel(item.createdAt)}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                              {item.content}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                deleteNotification.mutate({ id: item.id })
                              }
                              className="mt-3 text-xs font-bold text-rose-600 hover:underline"
                            >
                              Supprimer la notification
                            </button>
                          </article>
                        </div>
                      ))
                    )}
                    {!notices.isLoading && notices.data?.length === 0 && (
                      <p className="py-10 text-center text-sm text-slate-400">
                        Aucune notification.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}

          {tab === "team" && (
            <section>
              <PageIntro
                title="Utilisateurs & rôles"
                text="Comptes du portail; la promotion/révocation est réservée à l’identité super-admin protégée."
              />
              {!isSuper.data ? (
                <ErrorCard message="Cette fonction est réservée au super-administrateur." />
              ) : (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      if (teamEmail.trim())
                        setRole.mutate({
                          email: teamEmail.trim().toLowerCase(),
                          role: "admin",
                        });
                    }}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <input
                      type="email"
                      required
                      value={teamEmail}
                      onChange={event => setTeamEmail(event.target.value)}
                      placeholder="email@exemple.com"
                      className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
                    />
                    <button
                      disabled={setRole.isPending}
                      className="h-10 rounded-xl bg-[#0b1714] px-4 text-xs font-extrabold text-white"
                    >
                      Promouvoir administrateur
                    </button>
                  </form>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    Le rôle est appliqué aux comptes existants après leur
                    première connexion sécurisée. Le super-admin ICX ne peut pas
                    être rétrogradé.
                  </p>
                  <UsersTable
                    setRole={(email, role) => setRole.mutate({ email, role })}
                    onDelete={(id, email) => {
                      if (
                        window.confirm(
                          `Supprimer définitivement le compte ${email || id} et ses données ?`
                        )
                      )
                        deleteUser.mutate({ id });
                    }}
                  />
                </div>
              )}
            </section>
          )}

          {tab === "activity" && (
            <section>
              <PageIntro
                title="Journal d’activité"
                text="Historique des opérations admin et journal technique des envois Brevo. Les corps de messages et secrets ne sont jamais affichés ici."
                action={
                  <button
                    onClick={() => {
                      void audit.refetch();
                      void emailLogs.refetch();
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold"
                  >
                    <RefreshCw className="size-3.5" />
                    Actualiser
                  </button>
                }
              />
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-extrabold">Actions d’administration</h3>
                  <div className="mt-4 max-h-[70vh] space-y-2 overflow-auto">
                    {audit.isLoading ? (
                      <LoadingCard />
                    ) : audit.error ? (
                      <ErrorCard message="La table d’audit est absente. Appliquez la migration 0006." />
                    ) : (
                      audit.data?.map(entry => (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-slate-100 p-3"
                        >
                          <div className="flex justify-between gap-2">
                            <p className="text-xs font-bold">{entry.action}</p>
                            <span className="text-[9px] text-slate-400">
                              {dateLabel(entry.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {entry.entity}
                            {entry.entityId ? ` #${entry.entityId}` : ""} ·
                            admin #{entry.actorId}
                          </p>
                          {entry.details && (
                            <p className="mt-2 break-words text-[10px] text-slate-500">
                              {entry.details}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-extrabold">Journal Brevo</h3>
                  <label className="mt-3 block text-[11px] font-bold text-slate-600">
                    Filtrer les e-mails par compte destinataire
                    <select
                      value={senderFilter}
                      onChange={event => setSenderFilter(event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="all">Tous les comptes</option>
                      {recipients.data?.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email || `Compte #${user.id}`}{" "}
                          {user.email ? `— ${user.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 max-h-[70vh] space-y-2 overflow-auto">
                    {emailLogs.isLoading ? (
                      <LoadingCard />
                    ) : emailLogs.error ? (
                      <ErrorCard message="Impossible de charger le journal e-mail." />
                    ) : (
                      visibleEmailLogs.map((log, index) => (
                        <div key={`email-group-${log.id}`}>
                          {(index === 0 ||
                            visibleEmailLogs[
                              index - 1
                            ].recipient.toLowerCase() !==
                              log.recipient.toLowerCase()) && (
                            <p className="mb-2 mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                              Échanges avec{" "}
                              {recipients.data?.find(
                                user =>
                                  user.email?.toLowerCase() ===
                                  log.recipient.toLowerCase()
                              )?.name || log.recipient}
                            </p>
                          )}
                          <div className="rounded-xl border border-slate-100 p-3">
                            <div className="flex justify-between gap-2">
                              <p className="truncate text-xs font-bold">
                                {log.subject}
                              </p>
                              <Badge
                                tone={
                                  log.status === "sent"
                                    ? "green"
                                    : log.status === "failed"
                                      ? "red"
                                      : "amber"
                                }
                              >
                                {log.status}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-slate-500">
                              {log.recipient} · {dateLabel(log.createdAt)}
                            </p>
                            {isSuper.data && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Supprimer ce journal e-mail ?"
                                    )
                                  )
                                    deleteEmailLog.mutate({ id: log.id });
                                }}
                                className="mt-2 text-[10px] font-bold text-rose-700"
                              >
                                Supprimer le journal
                              </button>
                            )}
                            {log.error && (
                              <p className="mt-2 text-[10px] text-rose-600">
                                {log.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}

          {tab === "integrations" && (
            <section>
              <PageIntro
                title="Système & intégrations"
                text="État côté serveur. Les clés et jetons ne sont jamais renvoyés à l’interface admin."
                action={
                  <button
                    onClick={() => void integrations.refetch()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold"
                  >
                    <RefreshCw className="size-3.5" />
                    Actualiser l’état
                  </button>
                }
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <IntegrationCard
                  icon={Mail}
                  title="Microsoft Outlook / Graph"
                  state={
                    integrations.data?.outlook.connected
                      ? "ready"
                      : integrations.data?.microsoft.configured
                        ? "warning"
                        : "missing"
                  }
                  detail={
                    integrations.data?.outlook.email ||
                    "MICROSOFT_CLIENT_ID / SECRET / REDIRECT_URI requis"
                  }
                  note="Connexion déléguée du compte super-admin. Permissions : User.Read, Mail.ReadWrite, Mail.Send. L’app Entra doit accepter les comptes personnels Outlook.com."
                />
                <IntegrationCard
                  icon={Send}
                  title="Brevo — courriels sortants"
                  state={
                    integrations.data?.brevo.configured ? "ready" : "missing"
                  }
                  detail={
                    integrations.data?.brevo.from ||
                    "BREVO_API_KEY et BREVO_FROM_EMAIL requis"
                  }
                  note="Les e-mails partent depuis un expéditeur vérifié chez Brevo. Réponses configurées vers BREVO_REPLY_TO."
                />
                <IntegrationCard
                  icon={FileArchive}
                  title="Pièces jointes / stockage"
                  state={
                    integrations.data?.storage.configured ? "ready" : "missing"
                  }
                  detail="Stockage Forge actuellement utilisé par le portail client."
                  note="Le téléchargement admin vérifie les droits et génère une URL signée. Configurez BUILT_IN_FORGE_API_URL et BUILT_IN_FORGE_API_KEY sur Render."
                />
                <IntegrationCard
                  icon={Cloud}
                  title="Base de données"
                  state={
                    integrations.data?.database.connected
                      ? "ready"
                      : integrations.data?.database.configured
                        ? "warning"
                        : "missing"
                  }
                  detail={
                    integrations.data?.database.connected
                      ? "DATABASE_URL · MySQL/TiDB connecté"
                      : integrations.data?.database.configured
                        ? "URL configurée mais ping SQL échoué"
                        : "DATABASE_URL absent"
                  }
                  note="La base doit être accessible au service Render et contenir les migrations jusqu’à 0006."
                />
                <IntegrationCard
                  icon={ShieldCheck}
                  title="Session admin"
                  state={
                    integrations.data?.microsoft.configured
                      ? "ready"
                      : "warning"
                  }
                  detail="Cookie HttpOnly, 8 heures, rôle contrôlé côté serveur"
                  note="La session Microsoft d’admin est séparée du cookie Manus client; toutes les routes admin revalident le rôle."
                />
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold">
                  À configurer dans Render → Environment
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    "MICROSOFT_TENANT_ID=consumers",
                    "MICROSOFT_CLIENT_ID",
                    "MICROSOFT_CLIENT_SECRET",
                    "MICROSOFT_REDIRECT_URI=https://VOTRE-DOMAINE/api/admin/auth/callback",
                    "INTEGRATION_ENCRYPTION_KEY (32 octets en base64)",
                    "BREVO_API_KEY",
                    "BREVO_FROM_EMAIL (expéditeur vérifié)",
                    "BREVO_FROM_NAME=ICX Power Solutions",
                    "BREVO_REPLY_TO=icxps.sale@outlook.com",
                    "DATABASE_URL",
                    "BUILT_IN_FORGE_API_URL",
                    "BUILT_IN_FORGE_API_KEY",
                  ].map(name => (
                    <code
                      key={name}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-700"
                    >
                      {name}
                    </code>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Ne collez jamais les valeurs de secret dans le code, un commit
                  Git ou une conversation. Dans Microsoft Entra, enregistrez
                  l’URL de retour exactement comme{" "}
                  <code>MICROSOFT_REDIRECT_URI</code>. Pour l’accès Outlook
                  personnel, configurez les permissions Graph comme permissions
                  déléguées, pas applicatives.
                </p>
              </div>
            </section>
          )}
        </main>
        <footer className="border-t border-slate-200 px-7 py-5 text-[10px] text-slate-400">
          ICX Operations Console · Accès restreint · Site client et
          administration servis par des points d’entrée distincts
        </footer>
      </div>
    </div>
  );
}

function PageIntro({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">
          Opérations
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}
function LoadingCard() {
  return (
    <div className="grid min-h-32 place-items-center p-6 text-sm text-slate-400">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Chargement…
      </span>
    </div>
  );
}
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-800">
      <CircleAlert className="mr-2 inline size-4" />
      {message}
    </div>
  );
}
function StatusRow({
  label,
  configured,
  loading,
  detail,
}: {
  label: string;
  configured?: boolean;
  loading: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${loading ? "bg-slate-100 text-slate-400" : configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : configured ? (
          <CircleCheck className="size-4" />
        ) : (
          <CircleAlert className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">{label}</p>
        <p className="mt-1 truncate text-[10px] text-slate-500">
          {loading ? "Vérification…" : detail}
        </p>
      </div>
      <Badge tone={loading ? "slate" : configured ? "green" : "amber"}>
        {loading ? "…" : configured ? "Prêt" : "À configurer"}
      </Badge>
    </div>
  );
}
function IntegrationCard({
  icon: Icon,
  title,
  state,
  detail,
  note,
}: {
  icon: typeof Mail;
  title: string;
  state: "ready" | "warning" | "missing";
  detail: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <Icon className="size-5" />
          </span>
          <h3 className="font-extrabold">{title}</h3>
        </div>
        <Badge
          tone={
            state === "ready" ? "green" : state === "warning" ? "amber" : "red"
          }
        >
          {state === "ready"
            ? "Connecté"
            : state === "warning"
              ? "À autoriser"
              : "Manquant"}
        </Badge>
      </div>
      <p className="mt-4 text-xs font-bold text-slate-700">{detail}</p>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>
    </article>
  );
}
function UsersTable({
  setRole,
  onDelete,
}: {
  setRole: (email: string, role: "user" | "admin") => void;
  onDelete: (id: number, email: string | null) => void;
}) {
  const users = trpc.admin.users.useQuery(undefined, { retry: false });
  return (
    <div className="mt-6">
      <div className="grid grid-cols-[minmax(0,1fr)_110px_130px] gap-3 border-b border-slate-100 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
        <span>Compte</span>
        <span>Rôle</span>
        <span>Action</span>
      </div>
      {users.isLoading ? (
        <LoadingCard />
      ) : users.error ? (
        <ErrorCard message="Impossible de lire la liste des comptes." />
      ) : (
        users.data?.map(user => (
          <div
            key={user.id}
            className="grid grid-cols-[minmax(0,1fr)_110px_130px] items-center gap-3 border-b border-slate-100 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{user.name || "—"}</p>
              <p className="truncate text-[10px] text-slate-500">
                {user.email || user.openId}
              </p>
            </div>
            <Badge
              tone={
                user.isProtectedPrincipal
                  ? "amber"
                  : user.role === "admin"
                    ? "green"
                    : "slate"
              }
            >
              {user.isProtectedPrincipal ? "Super-admin" : user.role}
            </Badge>
            {user.isProtectedPrincipal || !user.email ? (
              <span className="text-[10px] text-slate-400">Protégé</span>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setRole(
                      user.email!,
                      user.role === "admin" ? "user" : "admin"
                    )
                  }
                  className="h-8 rounded-lg border border-slate-200 px-2 text-[10px] font-bold hover:bg-slate-50"
                >
                  {user.role === "admin" ? "Révoquer" : "Promouvoir"}
                </button>
                <button
                  onClick={() => onDelete(user.id, user.email)}
                  className="h-8 rounded-lg border border-rose-200 px-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
