# Diem : état du travail autonome

mode: actif
(« veille » = le propriétaire est absent, les lancements automatiques travaillent ; « actif » = ils s'arrêtent aussitôt. Claude le change quand il dit « mode veille » ou quand il revient.)

## Dernier lot
v1.7 prêt en démo (25/11) : refonte visuelle, arbre étoile en grand avec zoom, tri et filtre du backlog, sous-tâches par glisser et dépliables, journée entière ajustable, indisponibilités récurrentes, sélection clavier / appui long, accent Or par défaut. Pas encore en ligne (attend « mets en ligne »).

## File d'attente (par priorité)
1. **Trier mes mails (option 2 choisie le 25/11)** : bouton placé **dans la section du Génie** (onglet Claude du volet de droite, demande du 25/11 15 h 22) ; le Génie lit les mails non lus (Gmail, lecture seule) et propose des tâches : questions directes, colis à retirer, rendez-vous, factures, échéances. Prérequis côté propriétaire : ajouter le champ d'accès `gmail.readonly` dans la console Google Cloud du projet OAuth de Diem (il le fera lui-même). Construire le code et le tester avec des mails fictifs ; bouton masqué tant que l'accès n'est pas accordé.
2. Tâche « Lire mes mails » ajoutée automatiquement quand les non-lus s'accumulent (seuil réglable) — dépend du 1.
3. Thème clair dans la démo : le propriétaire voyait le thème clair ne pas marcher dans la démo ; correctif (thème posé sur la page) publié le 25/11, à confirmer.
4. Audit de la concurrence (Sunsama, Akiflow, Motion, Morgen, Todoist, Things…) puis bêta-test complet ; résultats au plan.
5. Citations Camus : paraphrases publiées par de vrais auteurs, ou retrait.
6. Identité du Génie, gamification : plus tard (après l'appli fonctionnelle).

## Questions en suspens
(aucune)
