# Gemini ou Cloudflare Workers AI pour ICX ?

**Comparaison vérifiée le 30 septembre 2026**  
**Recommandation courte :** garder Gemini pour le lancement actuel est le chemin le plus simple, car il est déjà intégré au site ICX. Cela ne supprime pas les quotas. Cloudflare est une option sérieuse si la priorité devient une politique documentée de non-entraînement et une allocation gratuite quotidienne plus prévisible, au prix d’une intégration et d’un modèle différents.

## Comparaison

| Critère | Gemini API gratuit | Cloudflare Workers AI gratuit |
|---|---|---|
| **Coût** | Les tokens du niveau Free sont indiqués gratuits pour les modèles éligibles. Pour être certain de rester sans frais, vérifier le niveau du projet Google et ne pas associer de facturation active. | 10 000 Neurons par jour gratuits. Sur le plan Workers Free, dépasser l’allocation fait échouer les opérations; consommer au-delà nécessite le plan Workers Paid. Certains modèles exigent un moyen de paiement. |
| **Quota et continuité** | Limites RPM, TPM et RPD définies par projet et modèle, visibles dans AI Studio; elles évoluent et la capacité réelle n’est pas garantie. Un dépassement peut retourner 429. | Quota quotidien explicite partagé en Neurons, qui dépend du coût du modèle et de la taille des échanges; une fois la limite atteinte, les opérations gratuites échouent jusqu’au renouvellement. Ce n’est pas un nombre fixe de conversations. |
| **Données des prompts** | Google indique généralement que les données de quota non payé peuvent servir à améliorer ses produits et être lues par des réviseurs. **Nuance importante pour ICX :** ses conditions précisent que, pour les utilisateurs de l’EEE, de la Suisse ou du Royaume-Uni, les clauses de traitement des données des services payants s’appliquent aussi au quota gratuit. Ces clauses disent que les prompts ne servent pas à améliorer les produits, mais peuvent être enregistrés temporairement pour la sécurité et les obligations légales. À confirmer pour le compte/projet et le contexte juridique exacts. | Cloudflare indique que les entrées et sorties sont des « Customer Content », ne sont ni partagées avec les autres clients Cloudflare, ni utilisées pour entraîner des modèles ou améliorer ses services sans consentement explicite. Le contenu peut être stocké si un service de stockage Cloudflare est spécifiquement utilisé conjointement. |
| **Intégration au site actuel** | Déjà branché dans le code ICX; le mode choisi est Gemini seul (`AI_ENABLE_FALLBACK=false`). La clé reste à entrer dans Render. | Nouveau branchement API et nouveaux tests à faire dans le serveur ICX; pas besoin de faire tourner le modèle sur les téléphones des visiteurs. |
| **Qualité et modèle** | `gemini-3.8-flash` est déjà le modèle retenu. Il n’y a pas de comparaison de qualité exécutée dans cette tâche. | Plusieurs modèles sont proposés; il faudrait sélectionner un modèle et tester les réponses réelles dans les langues et parcours ICX. Aucun classement de qualité n’est présumé ici. |

## Mon conseil

**Pour le moment, je garderais Gemini en mode gratuit seul** : l’intégration est déjà prête, les appels ne basculent pas vers un fournisseur payant, et un déploiement peut être plus rapide qu’une migration. Il faut toutefois vérifier dans Google AI Studio le niveau, les limites actives et le statut de facturation du projet. Même sans repli, Gemini peut répondre 429 ou devenir momentanément indisponible.

**Je choisirais Cloudflare à la place** si ICX privilégie surtout une déclaration explicite de non-entraînement et une limite gratuite quotidienne connue, et accepte que le service s’arrête lorsque les 10 000 Neurons gratuits sont épuisés. Ce ne serait pas une solution sans quota et cela demande de modifier puis redéployer le code.

Aucune des deux API cloud n’est illimitée. Si « sans quota fournisseur » devient une exigence absolue, il faut exécuter un modèle localement sur un serveur contrôlé par ICX ou dans le navigateur du visiteur; la capacité dépendra alors du matériel et ne sera pas sans coût au sens large.

## Sources officielles

- [Gemini API — limites de débit](https://ai.google.dev/gemini-api/docs/rate-limits) : limites par projet/modèle (RPM, TPM, RPD), capacité non garantie et erreurs quand une limite est dépassée.
- [Gemini API — tarification](https://ai.google.dev/gemini-api/docs/pricing) : tokens gratuits pour le niveau Free admissible; service payant si le projet API est associé à une facturation active.
- [Gemini API — conditions](https://ai.google.dev/gemini-api/terms) : usage des données en service gratuit, réviseurs humains et exception pour les utilisateurs de l’EEE, de la Suisse et du Royaume-Uni.
- [Cloudflare Workers AI — tarification](https://developers.cloudflare.com/workers-ai/platform/pricing/) : 10 000 Neurons gratuits par jour et conséquences du dépassement.
- [Cloudflare Workers AI — usage des données](https://developers.cloudflare.com/workers-ai/platform/data-usage/) : non-entraînement, non-amélioration des services et conditions de stockage.
