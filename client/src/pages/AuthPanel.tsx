import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Locale = "fr" | "en" | "ro" | "pl" | "ar" | "zh";
type AuthMode = "login" | "signup" | "forgot" | "verify";

const copy: Record<Locale, Record<string, string>> = {
  fr: { brand:"ICX POWER SOLUTIONS", loginTitle:"Accéder à votre espace", signupTitle:"Créer votre espace ICX", loginBody:"Connectez-vous pour retrouver vos demandes et documents.", signupBody:"Créez un compte pour déposer et suivre vos dossiers.", firstName:"Prénom", lastName:"Nom", email:"Adresse e-mail", password:"Mot de passe", confirm:"Confirmer le mot de passe", passwordHint:"12 caractères minimum", login:"Se connecter", signup:"Créer mon compte", forgot:"Mot de passe oublié ?", noAccount:"Pas encore de compte ?", haveAccount:"Vous avez déjà un compte ?", terms:"J’accepte les conditions d’utilisation.", privacy:"J’accepte la politique de confidentialité.", data:"J’accepte le traitement des données nécessaire à la gestion de mon compte et de mes demandes.", required:"Veuillez accepter les trois conditions pour continuer.", mismatch:"Les mots de passe ne correspondent pas.", sentTitle:"Vérifiez votre boîte e-mail", sentBody:"Si l’adresse peut être utilisée, un lien de confirmation vous a été envoyé. Vérifiez aussi vos courriers indésirables.", resend:"Renvoyer le lien de confirmation", resendSent:"Si un compte non confirmé correspond à cette adresse, un nouveau lien a été envoyé.", verifyTitle:"Confirmation de l’adresse e-mail", verifyWorking:"Vérification du lien…", verifySuccess:"Votre adresse est confirmée. Vous pouvez maintenant vous connecter.", verifyError:"Ce lien est invalide ou expiré. Demandez un nouveau lien depuis l’inscription.", forgotTitle:"Réinitialiser le mot de passe", forgotBody:"Saisissez l’adresse liée à votre compte. Si un compte vérifié existe, nous enverrons un lien valable 30 minutes.", sendReset:"Envoyer le lien", resetSent:"Si un compte vérifié correspond à cette adresse, un e-mail de réinitialisation a été envoyé.", newPassword:"Nouveau mot de passe", reset:"Enregistrer le nouveau mot de passe", resetSuccess:"Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.", backLogin:"Retour à la connexion", admin:"L’administration utilise une connexion Microsoft séparée. Cette page ne donne aucun droit administrateur.", processing:"Traitement…", home:"Retour au site", linkHelp:"Vous ne recevez pas l’e-mail ? Vérifiez l’adresse et les courriers indésirables, puis renvoyez le lien." },
  en: { brand:"ICX POWER SOLUTIONS", loginTitle:"Access your account", signupTitle:"Create your ICX account", loginBody:"Sign in to view your requests and documents.", signupBody:"Create an account to submit and track your files.", firstName:"First name", lastName:"Last name", email:"Email address", password:"Password", confirm:"Confirm password", passwordHint:"At least 12 characters", login:"Sign in", signup:"Create my account", forgot:"Forgot password?", noAccount:"New here?", haveAccount:"Already have an account?", terms:"I accept the terms of use.", privacy:"I accept the privacy policy.", data:"I accept the processing of data needed to manage my account and requests.", required:"Please accept all three conditions to continue.", mismatch:"Passwords do not match.", sentTitle:"Check your email", sentBody:"If this address can be used, a confirmation link has been sent. Check your spam folder too.", resend:"Resend confirmation link", resendSent:"If an unconfirmed account matches this address, a new link has been sent.", verifyTitle:"Confirm your email", verifyWorking:"Checking the link…", verifySuccess:"Your email is confirmed. You can now sign in.", verifyError:"This link is invalid or expired. Request a new one from sign-up.", forgotTitle:"Reset your password", forgotBody:"Enter the email on your account. If a verified account exists, we will send a link valid for 30 minutes.", sendReset:"Send reset link", resetSent:"If a verified account matches this address, a reset email has been sent.", newPassword:"New password", reset:"Save new password", resetSuccess:"Password updated. Sign in with your new password.", backLogin:"Back to sign in", admin:"Administration uses a separate Microsoft sign-in. This page cannot grant administrator access.", processing:"Working…", home:"Back to website", linkHelp:"No email? Check the address and spam folder, then resend the link." },
  ro: { brand:"ICX POWER SOLUTIONS", loginTitle:"Accesează contul", signupTitle:"Creează contul ICX", loginBody:"Conectează-te pentru a vedea cererile și documentele.", signupBody:"Creează un cont pentru a trimite și urmări dosarele.", firstName:"Prenume", lastName:"Nume", email:"Adresă de e-mail", password:"Parolă", confirm:"Confirmă parola", passwordHint:"Cel puțin 12 caractere", login:"Conectare", signup:"Creează contul", forgot:"Ai uitat parola?", noAccount:"Cont nou?", haveAccount:"Ai deja un cont?", terms:"Accept termenii de utilizare.", privacy:"Accept politica de confidențialitate.", data:"Accept prelucrarea datelor necesare pentru cont și cereri.", required:"Acceptă toate cele trei condiții.", mismatch:"Parolele nu coincid.", sentTitle:"Verifică e-mailul", sentBody:"Dacă adresa poate fi folosită, a fost trimis un link de confirmare. Verifică și spamul.", resend:"Retrimite linkul", resendSent:"Dacă există un cont neconfirmat, a fost trimis un link nou.", verifyTitle:"Confirmă adresa de e-mail", verifyWorking:"Se verifică linkul…", verifySuccess:"Adresa este confirmată. Te poți conecta.", verifyError:"Link invalid sau expirat. Solicită unul nou.", forgotTitle:"Resetează parola", forgotBody:"Introdu e-mailul contului. Dacă există un cont verificat, vei primi un link valabil 30 de minute.", sendReset:"Trimite linkul", resetSent:"Dacă există un cont verificat, a fost trimis un e-mail de resetare.", newPassword:"Parolă nouă", reset:"Salvează parola", resetSuccess:"Parola a fost actualizată. Conectează-te din nou.", backLogin:"Înapoi la conectare", admin:"Administrarea folosește o autentificare Microsoft separată.", processing:"Se procesează…", home:"Înapoi la site", linkHelp:"Verifică adresa și spamul, apoi retrimite linkul." },
  pl: { brand:"ICX POWER SOLUTIONS", loginTitle:"Zaloguj się", signupTitle:"Utwórz konto ICX", loginBody:"Zaloguj się, aby zobaczyć swoje zgłoszenia i dokumenty.", signupBody:"Utwórz konto, aby przesyłać i śledzić sprawy.", firstName:"Imię", lastName:"Nazwisko", email:"Adres e-mail", password:"Hasło", confirm:"Potwierdź hasło", passwordHint:"Co najmniej 12 znaków", login:"Zaloguj się", signup:"Utwórz konto", forgot:"Nie pamiętasz hasła?", noAccount:"Nie masz konta?", haveAccount:"Masz już konto?", terms:"Akceptuję warunki korzystania.", privacy:"Akceptuję politykę prywatności.", data:"Akceptuję przetwarzanie danych potrzebnych do obsługi konta i zgłoszeń.", required:"Zaakceptuj wszystkie trzy warunki.", mismatch:"Hasła nie są zgodne.", sentTitle:"Sprawdź pocztę", sentBody:"Jeśli można użyć tego adresu, wysłaliśmy link potwierdzający. Sprawdź spam.", resend:"Wyślij link ponownie", resendSent:"Jeśli istnieje niepotwierdzone konto, wysłaliśmy nowy link.", verifyTitle:"Potwierdź adres e-mail", verifyWorking:"Sprawdzanie linku…", verifySuccess:"Adres potwierdzony. Możesz się zalogować.", verifyError:"Link jest nieprawidłowy lub wygasł. Poproś o nowy.", forgotTitle:"Resetuj hasło", forgotBody:"Podaj adres e-mail konta. Jeśli istnieje zweryfikowane konto, wyślemy link ważny 30 minut.", sendReset:"Wyślij link", resetSent:"Jeśli istnieje zweryfikowane konto, wysłaliśmy e-mail resetujący.", newPassword:"Nowe hasło", reset:"Zapisz nowe hasło", resetSuccess:"Hasło zostało zmienione. Zaloguj się ponownie.", backLogin:"Wróć do logowania", admin:"Administracja używa osobnego logowania Microsoft.", processing:"Przetwarzanie…", home:"Wróć do strony", linkHelp:"Sprawdź adres i spam, a następnie wyślij link ponownie." },
  ar: { brand:"ICX POWER SOLUTIONS", loginTitle:"الدخول إلى حسابك", signupTitle:"إنشاء حساب ICX", loginBody:"سجّل الدخول لمراجعة طلباتك ومستنداتك.", signupBody:"أنشئ حساباً لإرسال الملفات ومتابعتها.", firstName:"الاسم الأول", lastName:"اسم العائلة", email:"البريد الإلكتروني", password:"كلمة المرور", confirm:"تأكيد كلمة المرور", passwordHint:"12 حرفاً على الأقل", login:"تسجيل الدخول", signup:"إنشاء حساب", forgot:"نسيت كلمة المرور؟", noAccount:"مستخدم جديد؟", haveAccount:"لديك حساب؟", terms:"أوافق على شروط الاستخدام.", privacy:"أوافق على سياسة الخصوصية.", data:"أوافق على معالجة البيانات اللازمة لإدارة الحساب والطلبات.", required:"يرجى قبول الشروط الثلاثة.", mismatch:"كلمتا المرور غير متطابقتين.", sentTitle:"تحقق من بريدك الإلكتروني", sentBody:"إذا كان العنوان صالحاً، فسيصلك رابط تأكيد. تحقق من البريد غير المرغوب فيه أيضاً.", resend:"إعادة إرسال رابط التأكيد", resendSent:"إذا كان هناك حساب غير مؤكد، فسيصلك رابط جديد.", verifyTitle:"تأكيد البريد الإلكتروني", verifyWorking:"جارٍ التحقق من الرابط…", verifySuccess:"تم تأكيد بريدك. يمكنك تسجيل الدخول الآن.", verifyError:"الرابط غير صالح أو منتهي. اطلب رابطاً جديداً.", forgotTitle:"إعادة تعيين كلمة المرور", forgotBody:"أدخل بريد حسابك. إذا كان هناك حساب موثق، فسنرسل رابطاً صالحاً لمدة 30 دقيقة.", sendReset:"إرسال الرابط", resetSent:"إذا كان هناك حساب موثق، فسيصلك بريد إعادة التعيين.", newPassword:"كلمة مرور جديدة", reset:"حفظ كلمة المرور", resetSuccess:"تم تحديث كلمة المرور. سجّل الدخول مجدداً.", backLogin:"العودة لتسجيل الدخول", admin:"تستخدم الإدارة تسجيلاً منفصلاً عبر Microsoft.", processing:"جارٍ التنفيذ…", home:"العودة إلى الموقع", linkHelp:"تحقق من العنوان والبريد غير المرغوب فيه ثم أعد إرسال الرابط." },
  zh: { brand:"ICX POWER SOLUTIONS", loginTitle:"登录您的账户", signupTitle:"创建 ICX 账户", loginBody:"登录以查看您的申请和文件。", signupBody:"创建账户以提交并跟踪您的档案。", firstName:"名字", lastName:"姓氏", email:"电子邮箱", password:"密码", confirm:"确认密码", passwordHint:"至少 12 个字符", login:"登录", signup:"创建账户", forgot:"忘记密码？", noAccount:"还没有账户？", haveAccount:"已有账户？", terms:"我接受使用条款。", privacy:"我接受隐私政策。", data:"我同意为管理账户和申请而处理必要数据。", required:"请接受全部三项条件。", mismatch:"两次密码不一致。", sentTitle:"请检查邮箱", sentBody:"如果该邮箱可以使用，我们已发送确认链接。请同时检查垃圾邮件。", resend:"重新发送确认链接", resendSent:"如果存在未确认账户，我们已发送新链接。", verifyTitle:"确认电子邮箱", verifyWorking:"正在验证链接…", verifySuccess:"邮箱已确认，现在可以登录。", verifyError:"链接无效或已过期，请重新申请。", forgotTitle:"重置密码", forgotBody:"输入账户邮箱。如果存在已验证账户，我们将发送 30 分钟有效的链接。", sendReset:"发送重置链接", resetSent:"如果存在已验证账户，我们已发送重置邮件。", newPassword:"新密码", reset:"保存新密码", resetSuccess:"密码已更新，请重新登录。", backLogin:"返回登录", admin:"管理员使用独立的 Microsoft 登录。", processing:"处理中…", home:"返回网站", linkHelp:"请检查邮箱地址和垃圾邮件，然后重新发送链接。" },
};

export default function AuthPanel({ mode, locale, setLocale, setLocation }: {
  mode: AuthMode;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocation: (path: string) => void;
}) {
  const words = copy[locale];
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptData, setAcceptData] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorText, setErrorText] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const verificationStarted = useRef(false);
  const token = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("token") || "";
  const resetMode = mode === "forgot" && Boolean(token);

  useEffect(() => {
    if (user && (mode === "login" || mode === "signup")) setLocation("/mon-espace");
  }, [user, mode, setLocation]);

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      setNotice(words.sentBody);
      toast.success(words.sentTitle);
    },
    onError: error => setErrorText(error.message),
  });
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      let target = "/mon-espace";
      try {
        const stored = sessionStorage.getItem("icx-auth-return-to");
        if (stored && stored.startsWith("/") && !stored.startsWith("//") && !stored.startsWith("/admin") && !["/connexion", "/inscription", "/mot-de-passe-oublie", "/verification-email"].includes(stored)) target = stored;
        sessionStorage.removeItem("icx-auth-return-to");
      } catch {}
      setLocation(target);
    },
    onError: error => {
      setErrorText(error.message);
      setNeedsVerification(error.message.toLowerCase().includes("confirmez") || error.message.toLowerCase().includes("verify"));
    },
  });
  const resend = trpc.auth.resendVerification.useMutation({
    onSuccess: () => { setNotice(words.resendSent); setErrorText(""); toast.success(words.resendSent); },
    onError: error => setErrorText(error.message),
  });
  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => { setNotice(words.resetSent); setErrorText(""); },
    onError: error => setErrorText(error.message),
  });
  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => { setNotice(words.verifySuccess); setErrorText(""); },
    onError: error => setErrorText(error.message || words.verifyError),
  });
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => { setNotice(words.resetSuccess); setErrorText(""); setPassword(""); setConfirmation(""); },
    onError: error => setErrorText(error.message),
  });

  useEffect(() => {
    if (mode !== "verify" || !token || verificationStarted.current) return;
    verificationStarted.current = true;
    verify.mutate({ token });
  }, [mode, token]);

  const isBusy = register.isPending || login.isPending || resend.isPending || requestReset.isPending || verify.isPending || reset.isPending;
  const effectiveMode = resetMode ? "reset" : mode;
  const title = effectiveMode === "signup" ? words.signupTitle : effectiveMode === "login" ? words.loginTitle : effectiveMode === "verify" ? words.verifyTitle : effectiveMode === "reset" ? words.newPassword : words.forgotTitle;
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText("");
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    if (effectiveMode === "signup") {
      if (password !== confirmation) return setErrorText(words.mismatch);
      if (!acceptTerms || !acceptPrivacy || !acceptData) return setErrorText(words.required);
      register.mutate({ firstName, lastName, email: normalizedEmail, password, acceptTerms: true, acceptPrivacy: true, acceptDataProcessing: true });
    } else if (effectiveMode === "login") {
      login.mutate({ email: normalizedEmail, password });
    } else if (effectiveMode === "forgot") {
      requestReset.mutate({ email: normalizedEmail });
    } else if (effectiveMode === "reset") {
      if (password !== confirmation) return setErrorText(words.mismatch);
      reset.mutate({ token, password });
    }
  };

  if (mode === "verify") {
    return <AuthShell locale={locale} setLocale={setLocale} setLocation={setLocation}>
      <AuthCard title={words.verifyTitle}>
        {!token ? <p className="text-sm text-rose-600">{words.verifyError}</p> : verify.isPending ? <p className="text-sm text-muted-foreground">{words.verifyWorking}</p> : notice ? <p className="text-sm text-emerald-700">{notice}</p> : errorText ? <p className="text-sm text-rose-600">{errorText}</p> : <p className="text-sm text-muted-foreground">{words.verifyWorking}</p>}
        {notice && <Button className="mt-6 w-full" onClick={() => setLocation("/connexion")}>{words.backLogin}<ArrowRight /></Button>}
      </AuthCard>
    </AuthShell>;
  }

  if (notice && effectiveMode === "signup") {
    return <AuthShell locale={locale} setLocale={setLocale} setLocation={setLocation}>
      <AuthCard title={words.sentTitle}>
        <p className="text-sm leading-6 text-muted-foreground">{notice}</p>
        <p className="mt-3 text-xs text-muted-foreground">{words.linkHelp}</p>
        <Button variant="outline" className="mt-6 w-full" disabled={resend.isPending} onClick={() => resend.mutate({ email: email.trim().toLowerCase() })}>{resend.isPending ? words.processing : words.resend}<Mail /></Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setLocation("/connexion")}>{words.backLogin}</Button>
      </AuthCard>
    </AuthShell>;
  }

  if (notice && effectiveMode === "forgot") {
    return <AuthShell locale={locale} setLocale={setLocale} setLocation={setLocation}>
      <AuthCard title={words.forgotTitle}><p className="text-sm leading-6 text-muted-foreground">{notice}</p><Button variant="ghost" className="mt-6 w-full" onClick={() => setLocation("/connexion")}>{words.backLogin}</Button></AuthCard>
    </AuthShell>;
  }

  if (notice && effectiveMode === "reset") {
    return <AuthShell locale={locale} setLocale={setLocale} setLocation={setLocation}>
      <AuthCard title={words.forgotTitle}><p className="text-sm leading-6 text-emerald-700">{notice}</p><Button className="mt-6 w-full" onClick={() => setLocation("/connexion")}>{words.backLogin}<ArrowRight /></Button></AuthCard>
    </AuthShell>;
  }

  if (loading && (effectiveMode === "login" || effectiveMode === "signup")) return <main className="grid min-h-screen place-items-center bg-[#111816] text-white"><p>{words.processing}</p></main>;

  return <AuthShell locale={locale} setLocale={setLocale} setLocation={setLocation}>
    <AuthCard title={title}>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">{effectiveMode === "signup" ? words.signupBody : effectiveMode === "login" ? words.loginBody : effectiveMode === "reset" ? words.passwordHint : words.forgotBody}</p>
      {errorText && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorText}</p>}
      <form onSubmit={submit} className="space-y-4">
        {effectiveMode === "signup" && <div className="grid gap-3 sm:grid-cols-2"><label className="block text-left text-sm font-medium">{words.firstName}<input autoComplete="given-name" required maxLength={120} value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3" /></label><label className="block text-left text-sm font-medium">{words.lastName}<input autoComplete="family-name" required maxLength={120} value={lastName} onChange={e => setLastName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3" /></label></div>}
        {effectiveMode !== "reset" && <label className="block text-left text-sm font-medium">{words.email}<input autoComplete="email" type="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>}
        {(effectiveMode === "login" || effectiveMode === "signup" || effectiveMode === "reset") && <label className="block text-left text-sm font-medium">{effectiveMode === "reset" ? words.newPassword : words.password}<input autoComplete={effectiveMode === "login" ? "current-password" : "new-password"} type="password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3" /><span className="mt-1 block text-xs text-muted-foreground">{words.passwordHint}</span></label>}
        {(effectiveMode === "signup" || effectiveMode === "reset") && <label className="block text-left text-sm font-medium">{words.confirm}<input autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3" /></label>}
        {effectiveMode === "signup" && <div className="space-y-3 rounded-xl border border-border p-4 text-left text-xs leading-5"><Consent checked={acceptTerms} onChange={setAcceptTerms}>{words.terms}</Consent><Consent checked={acceptPrivacy} onChange={setAcceptPrivacy}>{words.privacy}</Consent><Consent checked={acceptData} onChange={setAcceptData}>{words.data}</Consent></div>}
        <Button className="h-12 w-full rounded-xl" disabled={isBusy} type="submit">{isBusy ? words.processing : effectiveMode === "signup" ? words.signup : effectiveMode === "login" ? words.login : effectiveMode === "reset" ? words.reset : words.sendReset}<ArrowRight /></Button>
      </form>
      {effectiveMode === "login" && <button type="button" className="mt-4 text-sm text-amber-700 underline underline-offset-4" onClick={() => setLocation("/mot-de-passe-oublie")}>{words.forgot}</button>}
      <div className="mt-5 text-sm text-muted-foreground">{effectiveMode === "login" ? words.noAccount : effectiveMode === "signup" ? words.haveAccount : ""} {(effectiveMode === "login" || effectiveMode === "signup") && <button className="font-semibold text-foreground underline underline-offset-4" onClick={() => setLocation(effectiveMode === "login" ? "/inscription" : "/connexion")}>{effectiveMode === "login" ? words.signup : words.login}</button>}</div>
      {needsVerification && <Button variant="outline" className="mt-4 w-full" disabled={resend.isPending} onClick={() => resend.mutate({ email: email.trim().toLowerCase() })}>{words.resend}<Mail /></Button>}
      {effectiveMode === "forgot" && <p className="mt-4 text-xs leading-5 text-muted-foreground">{words.resetSent}</p>}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" />{words.admin}</div>
    </AuthCard>
  </AuthShell>;
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: string }) {
  return <label className="flex cursor-pointer items-start gap-2"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 size-4 accent-amber-600" /><span>{children}</span></label>;
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card className="w-full max-w-xl rounded-3xl border-white/30 p-2 shadow-2xl"><CardContent className="px-6 py-9 text-center sm:px-11"><span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-slate-900 text-amber-300"><LockKeyhole /></span><p className="text-[11px] font-bold tracking-[0.17em] text-amber-700">ICX POWER SOLUTIONS</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1><div className="mt-5 text-left">{children}</div></CardContent></Card>;
}

function AuthShell({ children, locale, setLocale, setLocation }: { children: React.ReactNode; locale: Locale; setLocale: (locale: Locale) => void; setLocation: (path: string) => void }) {
  const words = copy[locale];
  return <main className="grid min-h-screen place-items-center bg-[#f3f2ed] px-4 py-8 dark:bg-[#1b2420]"><div className="fixed left-5 right-5 top-5 flex items-center justify-between"><button className="text-xs font-bold tracking-[0.12em] text-slate-700 dark:text-slate-200" onClick={() => setLocation("/")}>{words.brand}</button><select aria-label="Language" value={locale} onChange={event => setLocale(event.target.value as Locale)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs"><option value="fr">FR</option><option value="en">EN</option><option value="ro">RO</option><option value="pl">PL</option><option value="ar">AR</option><option value="zh">中文</option></select></div><div className="w-full max-w-xl">{children}<button className="mx-auto mt-5 flex items-center gap-2 text-xs text-muted-foreground" onClick={() => setLocation("/")}><ArrowLeft className="size-3" />{words.home}</button></div></main>;
}
