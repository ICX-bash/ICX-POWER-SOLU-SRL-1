# Rétablissement de l’accès super-administrateur — ICX Power Solutions

## Diagnostic

Le message « compte créé » provenait d’un **formulaire simulé** : le navigateur affichait un toast de succès puis ouvrait l’espace client, sans appeler le fournisseur OAuth, sans créer de session et sans enregistrer de compte dans la base. L’adresse saisie ne pouvait donc recevoir aucun rôle administrateur.

La console existait dans le code, mais ses indicateurs et son tableau de demandes étaient en partie fictifs. La migration SQL de la table `users` était aussi absente de l’archive alors que son entrée figurait dans le journal Drizzle. Enfin, le déploiement déclarait `ADMIN_EMAIL`, tandis que le code attendait principalement `SUPER_ADMIN_EMAIL`.

## Correctifs livrés

- `/connexion` et `/inscription` utilisent désormais le fournisseur OAuth Manus réel; aucun mot de passe n’est collecté ou faussement validé sur le site.
- Après une connexion démarrée depuis `/admin`, le callback OAuth revient dans `/admin`.
- La console est visuellement séparée du site public et apparaît dans la navigation des administrateurs connectés.
- La liste des demandes, les chiffres du tableau de bord et les changements de statut sont reliés aux données serveur. Un changement de statut déclenche la notification client prévue.
- Le super-administrateur peut gérer les rôles des comptes déjà inscrits; les droits sont vérifiés côté serveur, les comptes protégés ne peuvent pas être rétrogradés et un email inconnu n’est plus annoncé comme un succès.
- Les migrations `0000` et `0005` créent la table `users` de façon idempotente, y compris si l’ancien historique est déjà enregistré.
- La configuration Render utilise `SUPER_ADMIN_EMAIL`, `OWNER_OPEN_ID` et les variables OAuth nécessaires.

## Déploiement nécessaire

Le code corrigé est prêt, mais **il n’a pas été déployé sur le site en production** : aucun dépôt, service Render, URL publique ou accès à la base de production n’a été fourni dans cette tâche.

### 1. Déployer le projet corrigé

Importer le contenu de l’archive corrigée dans le dépôt du site puis déclencher un nouveau déploiement. Conserver les secrets uniquement dans le gestionnaire de secrets de la plateforme, pas dans l’archive ni dans Git.

### 2. Vérifier les variables d’environnement

Dans Render (ou le gestionnaire de secrets utilisé), vérifier au minimum :

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`
- `OAUTH_SERVER_URL`
- `SUPER_ADMIN_EMAIL=icxps.sale@outlook.com`
- `OWNER_OPEN_ID` si l’identifiant owner fourni par le fournisseur OAuth est disponible

`VITE_APP_ID` et `VITE_OAUTH_PORTAL_URL` doivent être présents **avant le build front-end**. Vérifier dans la configuration OAuth du fournisseur que l’URL de callback autorisée est exactement `https://<domaine-du-site>/api/oauth/callback`.

### 3. Appliquer les migrations

Avec `DATABASE_URL` pointant vers la base cible, sauvegarder la base avant toute migration de production, puis exécuter une seule fois :

```bash
pnpm install --frozen-lockfile
pnpm db:push
```

Le script du projet génère puis applique les migrations Drizzle. La migration `0005_create_users_table.sql` utilise `CREATE TABLE IF NOT EXISTS`; elle couvre aussi une base ayant déjà mémorisé les migrations précédentes. Ne pas coller les secrets dans un ticket ou une conversation.

### 4. Ouvrir le panneau

1. Aller sur `https://<domaine-du-site>/admin`.
2. Cliquer sur **Se connecter** et terminer l’identification avec le compte OAuth associé à `icxps.sale@outlook.com`.
3. Le premier callback réel enregistre/actualise l’utilisateur et attribue son rôle admin côté serveur.
4. La redirection revient à `/admin`. Une fois connecté, le lien **Console admin** est également visible depuis le site.

Si la console reste refusée, vérifier que le fournisseur OAuth renvoie bien cette adresse email dans le profil, que la casse et l’adresse correspondent à `SUPER_ADMIN_EMAIL`, que `DATABASE_URL` est accessible et que le serveur a bien redémarré avec les nouvelles variables.

## Périmètre honnêtement vérifié

La console permet maintenant de consulter les demandes réellement enregistrées, de modifier leur statut et, pour le super-admin, de consulter les comptes et de gérer les rôles. **L’édition du catalogue de contenu et un journal d’audit détaillé ne sont pas encore des fonctions actives**; l’interface l’indique explicitement. L’authentification 2FA applicative et certaines intégrations de production restent aussi à configurer.

## Vérifications effectuées dans le sandbox

- `pnpm check` : réussi
- `pnpm test` : **10 tests réussis sur 5 fichiers**
- `pnpm build` : réussi
- Smoke test du serveur compilé : `/healthz` répond `200` et `/admin` sert l’application (`200 text/html`)

Le build affiche encore des avertissements non bloquants déjà liés aux variables analytics absentes et à un bundle JavaScript volumineux.
