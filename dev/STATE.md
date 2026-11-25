# Diem : état du travail autonome

mode: veille
(« veille » = le propriétaire est absent, les lancements automatiques travaillent ; « actif » = ils s'arrêtent aussitôt. Claude le change quand il dit « mode veille » ou quand il revient.)

## Dernier lot
v1.7 prêt en démo (25/11) : refonte visuelle, arbre étoile en grand avec zoom, tri et filtre du backlog, sous-tâches par glisser et dépliables, journée entière ajustable, indisponibilités récurrentes, sélection clavier / appui long, accent Or par défaut. En ligne le 25/11 à 15 h 45.

## File d'attente (validée par le propriétaire le 25/11 à 20 h 24 — suivre cet ordre)
Source de vérité : section « File d'attente » du plan (doc Claude). Une nouvelle remarque se range à sa place, sans passer devant.

### 1. Bugs et fonctions gênantes
1. Site marqué dangereux par Google : préparer côté site ce qui aide la révision (page d'accueil explicative, champ de clé hors de la première page, noindex) ; la démarche Search Console est à faire par le propriétaire.
2. Glisser-déposer au doigt sur téléphone (le glisser HTML ne marche pas au toucher).
3. Doublon Cuisine / Alimentation saine dans l'arbre (proposer la fusion, noter la question si un choix est nécessaire).
4. Bug « tâches pas dans le lendemain » : à confirmer à l'usage, ne rien faire sans nouveau signalement.

### 2. Fonctionnel
1. Trier mes mails, **Gmail et Outlook** (remarque 25/11 20 h 29), bouton dans la section du Génie (onglet Claude du volet droit) : le Génie lit les non-lus (Gmail, lecture seule) et propose des tâches (questions directes, colis à retirer, rendez-vous, factures, échéances). Prérequis propriétaire : accès gmail.readonly dans la console Google Cloud ; pour Outlook, accès Mail.Read via Microsoft Graph (compte perso OK ; compte de travail bloqué comme To Do). Coder et tester avec de faux mails ; bouton masqué tant que l'accès n'est pas accordé. Puis tâche auto « Lire mes mails » quand les non-lus s'accumulent (seuil réglable).
2. Page Habits (remarque 25/11 20 h 25) : s'inspirer d'Habitica et des autres suivis d'habitudes (Streaks, Loop, Way of Life…) en se demandant comment Sunsama ferait un suivi d'habitudes (sobre, intégré à la journée, sans culpabiliser). Commencer par une courte étude et une proposition au propriétaire ; ne pas coder avant sa validation.
   Même lot : refonte de la page Statistiques (remarque 25/11 20 h 29). Étudier les meilleurs suivis d'habitudes du marché ; les habitudes s'intègrent aux statistiques ; elles restent secondaires (Diem reste d'abord un planificateur de journée) ; tâches et habitudes reliées entre elles (une tâche peut nourrir une habitude, une habitude peut créer sa tâche du jour) ; plan d'intégration fonctionnelle par étapes.
3. Événements Google ajoutables comme tâches.
4. Le Génie propose une suggestion selon l'heure (icône).
5. Appli Android : APK régénéré avec le nom Diem.
6. Microsoft To Do : bloqué (authentification du compte de travail), ne pas traiter.
7. Jalon : audit de la concurrence puis bêta-test complet ; résultats ajoutés au plan.

### 3. Design
1. Boutons pour fermer les volets placés comme dans Claude (bouton de repli dans l'en-tête du volet, à côté du logo à gauche ; en haut à droite pour le volet droit).
2. Logo plus gros.
3. Identité du Génie (inspiration derniers Zelda, « Génie » à la place de « Claude » partout).
4. Mode focus : direction artistique libre.
5. Citations Camus : paraphrases publiées ou retrait.
6. « Chaque page tient à l'écran, sans défilement » : à confirmer avec le propriétaire avant de toucher.

### Plus tard
Gamification (XP, skill tree, mode Fantasy).

## Questions en suspens
(aucune)
