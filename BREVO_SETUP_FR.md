# Configuration Brevo + Render

Le projet envoie les e-mails avec l’API HTTPS Brevo (`https://api.brevo.com/v3/smtp/email`). Aucun port SMTP n’est utilisé, ce qui convient à Render Free.

## 1. Créer et vérifier l’expéditeur dans Brevo

1. Connectez-vous à Brevo.
2. Ouvrez **Settings → Senders, Domains & Dedicated IPs → Senders**.
3. Cliquez sur **Add a sender**.
4. Saisissez :
   - **From name** : `ICX Power Solutions SRL`
   - **From email** : `icxps.sale@outlook.com`
5. Validez l’e-mail reçu dans cette boîte Outlook.
6. Vérifiez que l’expéditeur apparaît comme **Verified**.

Un domaine personnalisé n’est pas obligatoire pour commencer avec un expéditeur individuel vérifié. Pour la production à grande échelle, l’authentification d’un domaine reste recommandée.

## 2. Créer la clé API

1. Ouvrez **Settings → API Keys** (ou `https://app.brevo.com/settings/keys/api`).
2. Cliquez sur **Generate a new API key**.
3. Donnez-lui un nom, par exemple `icx-render-production`.
4. Copiez la clé une seule fois et gardez-la secrète.
5. Ne la mettez jamais dans GitHub, dans le navigateur ou dans une variable `VITE_*`.

Le code utilise cette clé dans l’en-tête HTTPS `api-key`.

## 3. Variables à saisir dans Render

Dans **Render → votre service → Environment → Add Environment Variable**, ajoutez exactement :

```text
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx
BREVO_FROM_NAME=ICX Power Solutions SRL
BREVO_FROM_EMAIL=icxps.sale@outlook.com
BREVO_REPLY_TO=icxps.sale@outlook.com
```

Remplacez uniquement `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx` par la vraie clé Brevo. Ne mettez pas de guillemets et ne laissez pas d’espace au début ou à la fin.

Puis choisissez **Save, rebuild, and deploy**.

## 4. Déployer le code

Les fichiers importants sont :

- `server/_core/brevo.ts` : appel API Brevo et gestion des erreurs ;
- `server/routers.ts` : branchement de l’authentification et journalisation ;
- `client/src/admin/AdminConsole.tsx` : affichage de l’état Brevo ;
- `.env.render.template` et `render.yaml` : noms des variables ;
- `README.md` : documentation mise à jour.

Après le push GitHub, vérifiez dans Render que le nouveau déploiement est terminé et que le service est **Live**.

## 5. Tester

1. Utilisez une nouvelle adresse de test ou supprimez l’ancien compte non confirmé.
2. Créez un compte depuis `/inscription`.
3. Vérifiez la boîte Outlook du destinataire.
4. Dans Brevo, ouvrez **Transactional → Logs**.
5. Dans Render, recherchez :

```text
[Brevo] E-mail accepté, messageId=...
```

En cas d’échec, le log indiquera le code Brevo, par exemple `401`, `403` ou `400`.

## Erreurs fréquentes

- **401** : clé `BREVO_API_KEY` absente, invalide ou mal copiée.
- **400 invalid_parameter** : adresse ou contenu invalide.
- **403 sender not authorized** : `BREVO_FROM_EMAIL` n’est pas l’expéditeur vérifié dans Brevo.
- **Pas de log Brevo** : le nouveau déploiement Render n’est pas terminé ou les variables n’ont pas été enregistrées avec redéploiement.

Ne partagez jamais la clé API dans une conversation ou une capture d’écran. Si elle a été exposée, révoquez-la dans Brevo et créez-en une nouvelle.
