# Configuration manuelle de Render — ICX Power Solutions

## À retenir d’abord

- Je ne me connecterai pas à Render et je ne modifierai pas la production. Ce guide vous permet de faire les changements vous-même.
- **Aucune variable Render ne rend le site compatible avec la navigation privée.** Dans les vérifications faites depuis le bac à sable, `https://icx-power-projet.onrender.com/` et `/etudes` répondaient en HTTP 200 et les pages se rendaient; `/healthz` répondait aussi `status: ok`. Ce test ne reproduit pas votre téléphone ni l’application Google.
- La page actuellement publiée contient encore un script Analytics avec des valeurs `%VITE_ANALYTICS_…%` non remplacées. Le correctif source retire cette requête invalide et affiche un indicateur pendant le démarrage. **Il faut publier le code pour que cette correction arrive sur le site.**
- Préservez les valeurs existantes qui fonctionnent. Ne remplacez pas `DATABASE_URL`, `JWT_SECRET` ou `INTEGRATION_ENCRYPTION_KEY` au hasard : changer la base peut rendre les données inaccessibles; changer le secret de session déconnecte les utilisateurs; changer la clé de chiffrement peut rendre illisibles les intégrations enregistrées.

## 1. Variables à vérifier dans Render

Dans le Dashboard Render, ouvrez le service `icx-power-solutions`, puis **Environment**. Vérifiez ou ajoutez seulement les variables qui manquent; gardez les valeurs existantes lorsqu’elles sont déjà correctes.

| Variable | Valeur ou origine | Rôle |
|---|---|---|
| `NODE_ENV` | `production` | Mode de production (déjà déclaré dans `render.yaml`). |
| `DATABASE_URL` | URL MySQL/TiDB fournie pour la base ICX; garder la base actuellement utilisée | Comptes, demandes, dossiers et notifications. Ne pas substituer une autre base. |
| `DATABASE_SSL` | `true` | TLS de la connexion MySQL/TiDB (déjà déclaré). |
| `JWT_SECRET` | Secret aléatoire long; conserver l’actuel s’il existe | Sessions et cookies d’authentification. Si absent, générer une fois avec `openssl rand -base64 48`. |
| `OAUTH_SERVER_URL` | `https://api.manus.im` | Serveur OAuth Manus (déjà déclaré). |
| `VITE_APP_ID` | Identifiant de l’application Manus ICX; reprendre la valeur de la configuration existante | Associe les sessions à la bonne application. Ne pas inventer. |
| `OWNER_OPEN_ID` | Open ID du propriétaire dans Manus; reprendre la valeur existante | Reconnaissance du compte propriétaire/administrateur. |
| `SUPER_ADMIN_EMAIL` | Adresse du super-administrateur voulu (le manifeste actuel indique `icxps.sale@outlook.com`) | Rôle administrateur associé à cette adresse. |
| `NEXT_PUBLIC_SITE_URL` | `https://icx-power-projet.onrender.com` | URL publique insérée dans les liens de notifications. |

Render fournit normalement `PORT` au service. **Ne le modifiez pas** sauf si votre tableau de bord montre explicitement une configuration personnalisée; l’application écoute la valeur de `PORT` fournie par Render.

### Stockage des pièces jointes

Conservez les deux variables déjà utilisées par le stockage et les intégrations du projet :

- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`

Elles ne sont pas nécessaires pour afficher la page d’accueil, mais les retirer peut casser le dépôt/téléchargement de documents et certains flux associés. Gardez les valeurs Render déjà en place; ne copiez pas de clé dans GitHub ni dans un message.

## 2. Intégrations facultatives selon les fonctions utilisées

### Assistant IA — Gemini seul, sans repli payant

Pour conserver le choix actuel :

```text
AI_PREFERRED_PROVIDER=gemini
AI_ENABLE_FALLBACK=false
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=<votre clé privée Google AI Studio>
```

Saisissez la clé uniquement dans Render côté serveur. **Ne la nommez pas `VITE_GEMINI_API_KEY`** et ne la mettez ni dans le code, ni dans GitHub. Ne configurez pas `OPENAI_API_KEY` ou `OPENAI_API_BASE` si vous voulez Gemini seul.

### E-mails de confirmation — Brevo

Si ICX doit envoyer les accusés de réception par e-mail, vérifiez :

```text
BREVO_API_KEY=<clé API Brevo privée>
BREVO_FROM_NAME=ICX Power Solutions SRL
BREVO_FROM_EMAIL=<adresse d’expéditeur vérifiée dans Brevo>
BREVO_REPLY_TO=<adresse de réponse surveillée>
```

La clé API et l’adresse d’expéditeur doivent être valides dans Brevo. Leur absence ne devrait pas empêcher l’ouverture publique du site, mais peut empêcher l’envoi d’e-mails.

### Connexion Microsoft pour `/admin`

À renseigner uniquement si l’administrateur utilise la connexion Microsoft et Outlook :

```text
MICROSOFT_TENANT_ID=consumers
MICROSOFT_CLIENT_ID=<ID de l’application Microsoft Entra>
MICROSOFT_CLIENT_SECRET=<secret privé Entra>
MICROSOFT_REDIRECT_URI=https://icx-power-projet.onrender.com/api/admin/auth/callback
INTEGRATION_ENCRYPTION_KEY=<clé base64 de 32 octets>
```

L’URL `MICROSOFT_REDIRECT_URI` doit être exactement la même dans Render et dans les URI de redirection de l’application Entra. Si `INTEGRATION_ENCRYPTION_KEY` n’existe pas encore, générez-la une seule fois avec `openssl rand -base64 32`. **Conservez-la ensuite**, car elle sert au chiffrement des secrets d’intégration.

## 3. Enregistrer et redéployer manuellement

1. Dans Render, ouvrez **icx-power-solutions → Environment**.
2. Ajoutez ou corrigez les variables ci-dessus. Ne supprimez pas les variables existantes sans vérifier leur rôle.
3. Cliquez sur **Save Changes**.
4. Si Render ne lance pas automatiquement une nouvelle compilation, choisissez **Manual Deploy → Deploy latest commit**.
5. Les variables préfixées `VITE_` sont incorporées au build du navigateur : toute modification de ces valeurs nécessite une nouvelle compilation/déploiement.
6. Le changement d’écran de chargement et la suppression du script Analytics mal formé sont des **changements de code**, pas des variables. Ils doivent être poussés sur la branche GitHub reliée au service, puis déployés par Render.

Le projet est configuré avec le contrôle de santé `/healthz`. Après le déploiement, testez :

- `https://icx-power-projet.onrender.com/`
- `https://icx-power-projet.onrender.com/etudes`
- `https://icx-power-projet.onrender.com/healthz` — attendre `{"status":"ok",...}`

Un `status: ok` confirme que le serveur répond; il ne vérifie pas à lui seul l’inscription, la base de données, l’envoi d’e-mails ou l’affichage sur un appareil Android.

## 4. Test dans Google/Chrome sur Android

Après le déploiement, ouvrez d’abord l’URL exacte ci-dessus dans Chrome. Si l’onglet normal reste bloqué, effacez les données du seul site `icx-power-projet.onrender.com` dans les paramètres de site de Chrome, fermez ses onglets ICX, puis rouvrez l’URL. Cela peut déconnecter la session existante et réinitialiser la préférence de langue/thème de ce navigateur.

Si le problème persiste, relevez :

- l’URL exacte qui échoue (accueil ou page précise);
- si elle est ouverte dans l’application Google, Chrome normal ou Chrome privé;
- ce qui apparaît (page blanche, chargement qui tourne, message d’erreur) et, si possible, une capture d’écran.

Ces éléments sont nécessaires pour distinguer un problème de données locales, un blocage du navigateur intégré Google, un lien précis ou un incident réseau. Les variables Render seules ne permettent pas de corriger un réglage local du navigateur.


## 5. Paramètres du service à conserver

Dans les paramètres du service Web, vérifiez également les valeurs du projet :

```text
Runtime: Node
Build Command: pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
Health Check Path: /healthz
```

Render fournit le port d’écoute au service. Ne créez pas un second service pour ce correctif et ne changez pas le plan ou la base de données pour résoudre un problème de profil navigateur.
