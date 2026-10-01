# Mise en service de la console admin ICX (Render)

## Ce qui a été séparé

- Le portail client continue à utiliser son authentification Manus.
- `/admin` est un document HTML et un bundle React autonomes; il ne charge plus la page d’accueil du client.
- La connexion admin est réservée au compte Microsoft autorisé configuré dans `SUPER_ADMIN_EMAIL` (par défaut `icxps.sale@outlook.com`). Elle utilise un cookie serveur HttpOnly distinct.
- L’accès aux routes de demandes, fichiers et intégrations est contrôlé côté serveur. Les pièces jointes ne sont proposées qu’après contrôle de session et émission d’une URL signée du stockage.

## Variables à ajouter dans Render

Dans **Render Dashboard → votre Web Service → Environment**, ajoutez ou vérifiez :

| Variable | Valeur / origine |
| --- | --- |
| `MICROSOFT_TENANT_ID` | `consumers` pour le compte personnel `@outlook.com` (l’app Entra doit accepter les comptes personnels Microsoft). |
| `MICROSOFT_CLIENT_ID` | Application (client) ID de l’app « ICX Power Solutions Outlook ». |
| `MICROSOFT_CLIENT_SECRET` | Secret actif créé dans Microsoft Entra; saisir directement dans Render, jamais dans Git ni dans une conversation. |
| `MICROSOFT_REDIRECT_URI` | `https://VOTRE-DOMAINE-RENDER/api/admin/auth/callback` — doit être identique, caractère pour caractère, à l’URI Web déclarée dans l’app Microsoft. |
| `INTEGRATION_ENCRYPTION_KEY` | Générer localement avec `openssl rand -base64 32`; coller la valeur uniquement dans Render. Ne pas la modifier après connexion Outlook sans migrer les jetons chiffrés. |
| `BREVO_API_KEY` | Clé API Brevo côté serveur. |
| `BREVO_FROM_EMAIL` | Expéditeur appartenant à un domaine vérifié dans Brevo, p. ex. `notifications@votre-domaine.com`. L’adresse personnelle `@outlook.com` n’est pas un domaine expéditeur vérifiable par ICX dans Brevo. |
| `BREVO_FROM_NAME` | `ICX Power Solutions SRL`. |
| `BREVO_REPLY_TO` | `icxps.sale@outlook.com`. |
| `DATABASE_URL` | URL TiDB/MySQL du schéma ICX dédié; éviter le schéma système `sys`. Ne pas remplacer `<PASSWORD>` par un mot de passe dans Git. |
| `DATABASE_SSL` | `true` pour TiDB Cloud via l’endpoint public (valeur déjà inscrite dans `render.yaml`). Le serveur active TLS 1.2 pour les hôtes `*.tidbcloud.com`. |
| `BUILT_IN_FORGE_API_URL` et `BUILT_IN_FORGE_API_KEY` | Nécessaires au stockage Forge que ce projet utilise déjà pour les fichiers du portail client. |

`VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` et `OAUTH_SERVER_URL` restent uniquement dans le parcours Manus du **site client**. La console admin ne redirige plus vers `/app-auth`.

Dans l’URL TiDB que vous avez montrée, le suffixe `/sys` sélectionne le schéma SQL `sys`. Ce schéma est réservé au système; l’application doit utiliser une base dédiée. Si votre compte TiDB a les droits de création, créez-la dans le SQL Editor TiDB :

```sql
CREATE DATABASE IF NOT EXISTS icx_power_solutions;
```

Puis remplacez seulement le suffixe de `DATABASE_URL` par `/icx_power_solutions` dans Render. Gardez l’hôte et le port TiDB fournis par le tableau de connexion, encodez les caractères spéciaux du nom/mot de passe dans l’URL, et n’affichez pas le secret dans Git.

### Permissions Microsoft Entra

Dans **App registrations → ICX Power Solutions Outlook → Authentication**, choisissez un type de comptes qui inclut les comptes Microsoft personnels, ajoutez une plateforme **Web**, puis l’URI de redirection exacte ci-dessus. Dans **API permissions**, utilisez les permissions **Microsoft Graph déléguées** : `User.Read`, `Mail.ReadWrite`, `Mail.Send`, ainsi que les scopes OIDC `openid`, `profile`, `email`, `offline_access`. L’app demande les scopes lors de la première connexion admin. Le site vérifie que l’adresse retournée correspond à `SUPER_ADMIN_EMAIL`; une autre adresse est refusée.

La boîte personnelle Outlook doit être accédée avec des permissions déléguées par le propriétaire connecté. Les permissions Graph **Application** et leur consentement administrateur s’appliquent au scénario serveur/tenant professionnel et ne sont pas la voie retenue pour une boîte personnelle `@outlook.com`.

## Brevo et réception Outlook

Le portail envoie les accusés de réception, changements de statut et notifications email via l’API Brevo. Il faut une clé API valide et un domaine expéditeur vérifié dans Brevo. La réception de la boîte existante `icxps.sale@outlook.com` se fait par Microsoft Graph, pas en remplaçant les MX d’un domaine dans Brevo. Le panneau Outlook peut lister les messages, les dossiers, les marquer lus/non lus, les déplacer et répondre depuis le compte connecté.

## Migrations et déploiement

1. Téléchargez l’archive corrigée dans `~/Downloads`.
2. Sur votre Mac, ouvrez Terminal et allez dans le dépôt montré dans votre capture :

   ```bash
   cd "/Users/jpttraore/Downloads/Projet-ICX-Web/icx-power-solutions"
   git status --short
   git branch backup/avant-console-admin
   unzip -o ~/Downloads/icx-power-solutions-corrige.zip -d .
   git status --short
   ```

   La capture précédente affichait **“working tree clean”** et **“Everything up-to-date”** : les fichiers de cette correction n’étaient donc pas encore dans ce dépôt local; le `git push` précédent n’avait rien à envoyer.
3. Ajoutez les variables Microsoft/Brevo ci-dessus dans Render. Pour `MICROSOFT_REDIRECT_URI`, utilisez exactement le domaine public de votre service.
4. Dans le dépôt Mac, vérifiez que `git status --short` montre des fichiers modifiés, puis committez et poussez :

   ```bash
   git add .
   git commit -m "Sépare la console admin et corrige OAuth Microsoft"
   git push origin main
   ```

5. Dans Render, lancez **Manual Deploy → Deploy latest commit** (ou vérifiez le déploiement automatique de `main`).
6. Après le déploiement, ouvrez le **Shell** du service Render et exécutez `pnpm db:push`. Le script applique les migrations versionnées avec le pool TiDB/TLS du serveur. Vérifiez que `DATABASE_URL` utilise un schéma ICX dédié, par exemple `icx_power_solutions`, pas `sys`, et que le mot de passe est correctement encodé dans l’URL.
7. Ouvrez `/admin`, puis **Continuer avec Microsoft** et acceptez les permissions demandées avec `icxps.sale@outlook.com`.
8. Vérifiez dans **Système & intégrations** que Outlook, Brevo, stockage et base sont marqués « Prêt » / « Connecté ». Envoyez une demande test et vérifiez la notification client, l’e-mail Brevo, puis le téléchargement d’un document dans la console admin.

Le fichier `render.yaml` ne provisionne plus de base Render PostgreSQL : le code utilise `drizzle-orm/mysql2` et doit utiliser TiDB/MySQL, pas PostgreSQL.

## Sources officielles

- Microsoft OAuth Authorization Code + PKCE : https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft Graph list messages, permissions déléguées et application : https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- Microsoft Graph accès application/consentement administrateur : https://learn.microsoft.com/en-us/graph/auth-v2-service
- Brevo Send Email API : https://brevo.com/docs/api-reference/emails/send-email
- Brevo domaines expéditeurs vérifiés : https://brevo.com/docs/dashboard/domains/introduction
- Brevo réception entrante et webhooks : https://brevo.com/docs/dashboard/receiving/introduction
- Render variables d’environnement : https://render.com/docs/configure-environment-variables
- TiDB Cloud Starter/Essential — TLS obligatoire pour l’endpoint public : https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/
- PingCAP Node.js `mysql2` — pool MySQL et configuration TLS : https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-mysql2/
