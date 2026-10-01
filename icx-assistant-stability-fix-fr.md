# ICX Intelligence — mode gratuit Gemini seul

**État de la source : 30 septembre 2026**  
**Site public observé :** [icx-power-projet.onrender.com/assistant](https://icx-power-projet.onrender.com/assistant)

## Choix retenu

Le mode choisi est **Gemini gratuit seul**, sans basculement automatique vers un fournisseur susceptible d’être facturé. Le code, le modèle Render et le modèle de variables sont désormais réglés par défaut sur `AI_PREFERRED_PROVIDER=gemini` et `AI_ENABLE_FALLBACK=false`. Si la clé Gemini manque ou si son quota est épuisé, le serveur n’appellera pas GPT-5/Forge en second; il affichera l’indisponibilité plutôt que de déclencher silencieusement une facturation.

## Limite importante : le site public n’est pas encore déployé

Lors d’un contrôle public antérieur, une requête avait reçu HTTP 503, puis deux requêtes de test avaient obtenu HTTP 200. Le dernier contrôle en lecture seule de `/healthz` a expiré après 20 secondes sans recevoir de réponse (HTTP 000); cela peut être un incident ponctuel ou un délai de réveil Render, mais je ne peux pas confirmer la santé actuelle du site. Je n’ai pas accès aux journaux ni aux variables privées Render. **La source et le paquet sont prêts, mais la production ne prendra le nouveau réglage qu’après déploiement et configuration de `GEMINI_API_KEY` dans Render.** Un mode gratuit, dont la capacité n’est pas garantie par Google, ne permet pas de promettre zéro erreur.

## Correctifs réalisés

Le client Gemini retente une fois les erreurs réseau ou certains statuts transitoires (408, 425, 500, 502, 503, 504), avec un délai court. Il ne renvoie pas automatiquement les erreurs HTTP 429 de quota. La priorité des fournisseurs reste configurable; dans le mode choisi, seul Gemini est appelé.

Le chat affiche dans les six langues un avis visible : les messages sont envoyés au fournisseur configuré; si le niveau gratuit Gemini est utilisé, Google peut utiliser les prompts/réponses pour améliorer ses produits et les faire lire par des réviseurs humains. L’avis demande de ne pas saisir d’informations personnelles, sensibles ou confidentielles. Les erreurs API restent visibles dans la conversation.

`/healthz` renvoie `assistantConfigured` et `assistantHealth: "configuration-only"`. Le champ historique `assistantReady` reste présent pour compatibilité, mais ces valeurs vérifient uniquement la configuration : elles ne testent pas la disponibilité de Google.

## Pourquoi une erreur peut encore survenir

Google liste `gemini-3.8-flash` comme modèle stable et annonce des tokens d’entrée et de sortie gratuits dans son niveau Free. Les quotas dépendent toutefois du modèle et du projet; la capacité réelle n’est pas garantie et une limite dépassée peut produire HTTP 429. Le mode gratuit seul ne peut donc pas assurer une continuité comparable à un fournisseur de secours.

Les conditions Google comportent une exception régionale importante : bien que les clauses générales des services non payés indiquent que les prompts/réponses peuvent améliorer les produits et être lus par des réviseurs, Google précise que les clauses de traitement des services payants s’appliquent également au quota Gemini gratuit pour les utilisateurs de l’EEE, de la Suisse et du Royaume-Uni. Selon ces clauses, les prompts ne servent pas à améliorer les produits; ils peuvent être conservés temporairement pour la sécurité et les obligations légales. ICX étant établi en Roumanie, il faut vérifier les conditions applicables au projet et à l’entité avant d’appliquer le message général aux visiteurs. Dans tous les cas, limiter les données personnelles et confidentielles envoyées au chatbot reste une bonne pratique.

Sources officielles : [modèles Gemini](https://ai.google.dev/gemini-api/docs/models), [tarification](https://ai.google.dev/gemini-api/docs/pricing), [conditions sur les données](https://ai.google.dev/gemini-api/terms) et [limites de débit](https://ai.google.dev/gemini-api/docs/rate-limits).

## Activation nécessaire dans Render

1. Créer une clé sur [Google AI Studio](https://aistudio.google.com/apikey), après examen des conditions du niveau gratuit.
2. Dans **Render → service ICX → Environment**, enregistrer `GEMINI_API_KEY` comme secret, `GEMINI_MODEL=gemini-3.8-flash`, `AI_PREFERRED_PROVIDER=gemini` et `AI_ENABLE_FALLBACK=false`.
3. Redéployer le service et vérifier `/healthz` : en mode gratuit seul, `assistantConfigured` doit être `true`. Cela confirme la présence de la clé, pas la disponibilité de l’API.
4. Envoyer un message synthétique et non personnel. Si l’erreur revient, vérifier les journaux Render pour le statut amont et le quota Google; ne partager aucune clé dans une conversation.

Ne jamais mettre la clé dans GitHub, dans le bundle navigateur (`VITE_*`) ni dans un message. Cette session n’a ni accès Render ni accès aux journaux privés; je n’ai donc pas pu enregistrer le secret ou déployer sur le domaine public.

## Flèche et validation

**Oui, la flèche de retour en haut est déjà intégrée dans la source** : `BackToTopButton` est monté globalement par `App.tsx`, apparaît après le défilement et utilise un défilement fluide sauf si l’utilisateur préfère réduire les animations. Elle est présente dans l’archive mise à jour.

Validation locale finale : Prettier, `pnpm check`, **26 tests réussis sur 7 fichiers**, `pnpm build`, puis deux contrôles de `/healthz` isolés confirmant qu’il signale `assistantConfigured=false` sans clé Gemini et `true` avec une clé de test synthétique. Ces contrôles ne contactent pas Google et ne remplacent pas le test en production après configuration de la vraie clé dans Render.
