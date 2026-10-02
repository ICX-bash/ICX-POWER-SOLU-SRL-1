# Variables d’environnement — déploiement Render

Configurez les variables dans **Render → Web Service → Environment**. N’enregistrez jamais les secrets réels dans Git ou dans un ticket. Le détail opératoire se trouve dans [ADMIN_SETUP_FR.md](ADMIN_SETUP_FR.md).

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | Connexion TiDB/MySQL au schéma applicatif ICX dédié (pas `sys`). |
| `DATABASE_SSL` | `true` pour l’endpoint public TiDB Cloud; le serveur active aussi TLS automatiquement sur `*.tidbcloud.com`. |
| `JWT_SECRET` | Secret aléatoire fort, côté serveur seulement; signe les cookies de session client et admin. |
| `NEXT_PUBLIC_SITE_URL` | Origine HTTPS exacte du service public Render, sans chemin ni barre finale; utilisée pour les liens de confirmation et de réinitialisation. |
| `SUPER_ADMIN_EMAIL` | Adresse Microsoft autorisée à se connecter à `/admin`, par défaut `icxps.sale@outlook.com`. |
| `MICROSOFT_TENANT_ID` | `consumers` pour le compte Outlook personnel; l’application Entra doit aussi autoriser les types de comptes voulus. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Application Microsoft Entra; le secret reste uniquement dans Render. |
| `MICROSOFT_REDIRECT_URI` | Callback exact `https://VOTRE-SERVICE.onrender.com/api/admin/auth/callback`, également déclaré en plateforme Web dans Entra. |
| `INTEGRATION_ENCRYPTION_KEY` | Clé base64 aléatoire de 32 octets pour chiffrer le refresh token Outlook. Ne pas la changer sans migrer le jeton. |
| `BREVO_API_KEY` | Clé API serveur pour les emails de vérification, de réinitialisation et les notifications. |
| `BREVO_FROM_NAME` / `BREVO_FROM_EMAIL` | Nom et expéditeur; le domaine d’envoi doit être vérifié dans Brevo. |
| `BREVO_REPLY_TO` | Adresse de réponse, souvent `icxps.sale@outlook.com`. |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Stockage Forge utilisé actuellement pour les pièces jointes du portail. |
| `AI_PREFERRED_PROVIDER` | `gemini` pour le mode gratuit Gemini seul; `llm` uniquement si un fournisseur LLM primaire est volontairement configuré. |
| `AI_ENABLE_FALLBACK` | `false` pour ne jamais appeler automatiquement un fournisseur secondaire potentiellement payant. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Clé serveur Google AI Studio et modèle Gemini; requis lorsque `AI_PREFERRED_PROVIDER=gemini`. |
| `OAUTH_SERVER_URL` | Valeur historique Manus côté serveur; elle n’est plus utilisée par la connexion client. `VITE_APP_ID` et `VITE_OAUTH_PORTAL_URL` ne sont plus requis. |

La connexion client utilise le compte local vérifié par e-mail; elle ne dépend pas de Manus. Microsoft/Entra reste réservé à la console `/admin`. Les comptes client n’obtiennent pas d’accès admin, même si un rôle ancien apparaît en base.

Pour appliquer la nouvelle table client et les autres migrations déjà enregistrées, déployez le code puis exécutez une fois `pnpm db:push` dans le Shell Render avec `DATABASE_URL`/TLS valides. La migration `0007_client_auth.sql` ajoute les credentials, les expirations de tokens et les dates d’acceptation; elle ne modifie pas les données de demandes existantes.

Ne placez jamais de secret sous `VITE_*` : ces valeurs seraient visibles dans le JavaScript public.
