# Déploiement de la connexion client autonome

## Résultat du changement

- Les boutons **Créer un compte** et **Se connecter** n’appellent plus Manus `/app-auth`; ils restent sur ICX.
- Les clients utilisent e-mail + mot de passe, avec confirmation d’adresse avant la première connexion.
- Le mot de passe est stocké sous forme d’un hash scrypt; les liens de confirmation et de récupération sont à usage unique, expirent, et seul leur hash est conservé en base.
- La session client est un cookie HttpOnly signé. La réinitialisation du mot de passe invalide les sessions client antérieures.
- `/admin` reste une page autonome avec connexion Microsoft distincte. Les routes admin vérifient la session Microsoft côté serveur, pas simplement le rôle du compte client.
- Les anciens mots de passe Manus ne sont pas importés. Un ancien client doit créer un mot de passe ICX avec **la même adresse vérifiée**; lorsque cette adresse existe déjà en base, le compte de données correspondant est réutilisé. Tester ce rattachement avant d’ouvrir les inscriptions largement.

## Plateformes à utiliser

1. **GitHub** : envoyer les fichiers corrigés sur la branche connectée à Render.
2. **Render** : configurer les variables, déployer le commit, puis lancer la migration.
3. **TiDB Cloud** : vérifier que l’URL utilise la base applicative ICX, pas le schéma système `sys`.
4. **Brevo** : garder une clé API valide et un expéditeur provenant d’un domaine vérifié; les MX de la boîte Outlook ne doivent pas être remplacés.
5. **Microsoft Entra** : ne rien changer au callback admin si `/admin` fonctionne déjà; Microsoft reste réservé à l’administration.

## Étapes de déploiement

### A. Mettre les fichiers dans votre dépôt Mac

Téléchargez `icx-power-solutions-corrige-auth.zip`, puis ouvrez Terminal :

```bash
cd "/Users/jpttraore/Downloads/Projet-ICX-Web/icx-power-solutions"
git status --short
git branch "backup/avant-auth-locale-$(date +%Y%m%d-%H%M%S)"
unzip -o ~/Downloads/icx-power-solutions-corrige-auth.zip -d .
git status --short
```

Vérifiez que les fichiers modifiés incluent `server/routers.ts`, `server/_core/clientAuth.ts`, `client/src/pages/AuthPanel.tsx` et `drizzle/0007_client_auth.sql`. Ensuite :

```bash
git add .
git commit -m "Remplace Manus OAuth client par une authentification locale"
git push origin main
```

Le ZIP est organisé pour être extrait **dans la racine du dépôt**. Ne lancez pas ces commandes dans un autre projet.

### B. Variables Render

Dans **Render → Web Service ICX → Environment**, vérifiez :

- `JWT_SECRET` : déjà configuré, secret serveur fort. Ne le publiez pas et ne le changez pas sans raison; le changer déconnecte les sessions.
- `DATABASE_URL` : schéma dédié, par exemple `.../icx_power_solutions`, **pas `/sys`**. Si l’URL TiDB pointe encore sur `/sys`, arrêtez-vous et corrigez d’abord la base cible.
- `DATABASE_SSL=true` : obligatoire pour l’endpoint public TiDB Cloud.
- `NEXT_PUBLIC_SITE_URL` : origine HTTPS exacte affichée par Render, par exemple `https://votre-service.onrender.com`, sans `/admin`, sans callback et sans barre finale. Elle sert à former les liens e-mail.
- `BREVO_API_KEY` : clé API côté Render.
- `BREVO_FROM_EMAIL` : adresse sur un domaine validé dans Brevo; une adresse Outlook personnelle n’est pas un domaine expéditeur.
- `BREVO_FROM_NAME` : `ICX Power Solutions SRL`.

`VITE_APP_ID` et `VITE_OAUTH_PORTAL_URL` ne sont plus requis par la connexion client et ne doivent pas bloquer le déploiement. Le callback, le Client ID et le secret Microsoft restent séparés et ne sont utilisés que par `/admin`.

### C. Déployer et migrer la base

1. Attendez que le déploiement Render du nouveau commit passe au statut **Live**.
2. Ouvrez le **Shell** du service Render et exécutez une fois :

   ```bash
   pnpm db:push
   ```

3. Vérifiez le résultat avant de tester les formulaires. La migration `0007_client_auth.sql` ajoute une table de credentials et ne supprime aucune demande ni aucun document. Si elle échoue, **ne réessayez pas en boucle** : lisez l’erreur; vérifiez d’abord `DATABASE_URL`, l’accès réseau TiDB, TLS et la base dédiée.
4. Confirmez que `/healthz` répond et que le service est **Live**.

### D. Test de bout en bout

Avec une adresse de test que vous contrôlez :

1. Ouvrir `/inscription`, créer le compte et accepter les trois conditions.
2. Vérifier l’arrivée du message Brevo; cliquer sur **Confirmer mon adresse**.
3. Se connecter sur `/connexion`; vérifier l’ouverture de `/mon-espace` et la session après rechargement.
4. Soumettre une demande test; contrôler qu’elle apparaît dans `/admin`.
5. Utiliser **Mot de passe oublié**, puis un lien de réinitialisation; confirmer que l’ancien mot de passe ne fonctionne plus.
6. Ouvrir `/admin` dans une fenêtre privée et se connecter avec le compte Outlook configuré. Un compte client seul doit recevoir un refus d’accès admin.
7. Supprimer les demandes et comptes de test lorsque les contrôles sont terminés.

## En cas d’échec

- **Aucun e-mail reçu** : dans Brevo, vérifiez le domaine expéditeur, `BREVO_FROM_EMAIL`, la clé API et le journal des e-mails de la console admin. Vérifiez aussi le dossier indésirable.
- **Erreur de table inconnue** : `pnpm db:push` n’a pas été exécuté sur la base réellement utilisée par Render, ou `DATABASE_URL` pointe sur une autre base.
- **Lien renvoyant vers un ancien domaine** : corrigez `NEXT_PUBLIC_SITE_URL` dans Render, puis redéployez.
- **404 `/app-auth`** : le nouveau bundle ne doit plus appeler cette route. Vérifiez que Render déploie bien le nouveau commit et videz le cache navigateur.
- **Problème `/admin`** : ne remplacez pas l’auth Microsoft par le formulaire client. Vérifiez le callback Microsoft et les journaux du service séparément.

## Retour arrière

La migration est additive : revenir au code précédent laisse la table client inutilisée et ne supprime pas les demandes. Le plan Git créé avant l’extraction permet de restaurer les fichiers si nécessaire. Ne supprimez pas la table nouvellement créée pendant un incident.
