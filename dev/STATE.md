# Diem : état du travail autonome

mode: veille
(« veille » = le propriétaire est absent, les lancements automatiques travaillent ; « actif » = ils s'arrêtent aussitôt. Claude le change quand il dit « mode veille » ou quand il revient.)

## Dernier lot
Lancement autonome du 25/11 (soir), sur `dev`, en démo (v=49), pas en ligne :
- Lot 1 « site marqué dangereux », côté site : balise noindex, page `about.html` qui explique Diem et ce qui part où (lien en bas des Réglages), plus aucun champ « mot de passe » dans la page (la clé Claude se saisit derrière un bouton « Saisir une clé », champ texte masqué, vide = garder l’ancienne).
- Lot 2 « glisser au doigt » : poignée ⋮⋮ sur chaque tuile, visible seulement sur écran tactile ; on la tire, la tuile suit le doigt, on dépose entre deux tâches, en sous-tâche, sur Backlog / Aujourd’hui ; défilement automatique près des bords. Corrigé au passage : sur la frise téléphone, déposer sur la moitié basse d’une tuile range bien après elle.
- Tests : 60/61. Le seul rouge est « Import Sunsama », qui a besoin de ton vrai export CSV (absent ici, et on n’utilise pas tes vraies données) : rien à voir avec ces lots.

Précédent : v1.7 en ligne le 25/11 à 15 h 45.

## File d'attente (validée par le propriétaire le 25/11 à 20 h 24 — suivre cet ordre)
Source de vérité : section « File d'attente » du plan (doc Claude). Une nouvelle remarque se range à sa place, sans passer devant.

### 1. Bugs et fonctions gênantes
1. ~~Site marqué dangereux~~ : côté site fait (démo v=49). Reste de ton côté, après mise en ligne : Search Console › Problèmes de sécurité › « Demander un examen », en citant la page about.html.
2. ~~Glisser-déposer au doigt~~ : fait (démo v=49), à essayer sur ton téléphone.
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
- Glisser au doigt : j’ai mis une poignée ⋮⋮ à gauche des tuiles (sur tactile seulement) plutôt qu’« appui long puis glisser », parce que l’appui long sert déjà à la sélection. Choix par défaut : la poignée. Dis-moi si tu préfères l’appui long.
- Page À propos : elle est en noindex comme le reste (le site n’apparaît pas dans Google). Choix par défaut : noindex partout. Si tu veux que la page À propos soit trouvable, je retire la balise de cette page seulement.
