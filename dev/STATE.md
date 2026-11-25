# Diem : état du travail autonome

mode: veille
(« veille » = le propriétaire est absent, les lancements automatiques travaillent ; « actif » = ils s'arrêtent aussitôt. Claude le change quand il dit « mode veille » ou quand il revient.)

## Dernier lot
3e lancement autonome du 25/11 (nuit), sur `dev`, en démo (v=51), pas en ligne :
- Lot 5 « Rendez-vous Google → tâche » : un petit + sur chaque rendez-vous (agenda du volet droit, liste des rendez-vous du jour, vue téléphone). Le rendez-vous devient une tâche à la même heure, fixe : l’agenda vivant, le report et les autres tâches ne la déplacent pas et passent autour. Elle se coche, se classe dans l’Arbre (mots-clés), compte dans les stats. Le rendez-vous Google n’est jamais modifié (rien n’est écrit dans Google). ⌘/Ctrl Z pour annuler, le rendez-vous réapparaît. Dans la démo : « Appel avec Léa (fictif) » ce soir, « Dentiste (fictif) » demain.
- Lot 6 « Page Habits + Statistiques » : étude courte et proposition écrites dans le plan (section « Proposition : Habitudes et Statistiques », sous la file d’attente). Rien n’est codé : j’attends ton feu vert.
- Tests : 63/64 (seul rouge : import Sunsama, qui attend ton vrai export CSV).

Avant :
2e lancement autonome du 25/11 (soir), sur `dev`, en démo (v=50), pas en ligne :
- Lot 3 « doublon Cuisine / Alimentation saine » : une carte dans l’Arbre (et Réglages › Arbre) propose de tout fusionner dans Corps › « Alimentation & cuisine », ou dans Foyer › « Cuisine & alimentation », ou de garder les deux. Rien n’est fait sans ton clic ; annulable. Après fusion, #cuisine et les mots-clés « recette, cuisiner… » vont vers la catégorie gardée, sur tous tes appareils.
- Lot 4 « Trier mes mails » (Gmail et Outlook) : bouton « Trier mes mails » dans l’onglet du Génie, visible seulement quand la lecture est autorisée. Le Génie lit les non-lus des 14 derniers jours (lecture seule, rien n’est enregistré) et propose des tâches à appliquer une par une. Réglages avancés › Trier mes mails : Autoriser / Arrêter pour Gmail et Outlook, et seuil de la tâche automatique « Lire mes mails » (20 non-lus par défaut, 0 = jamais). Testé avec de faux mails.
- Tests : 62/63 (seul rouge : import Sunsama, qui attend ton vrai export CSV).

1er lancement autonome du 25/11 (soir), sur `dev`, en démo (v=49), pas en ligne :
- Lot 1 « site marqué dangereux », côté site : balise noindex, page `about.html` qui explique Diem et ce qui part où (lien en bas des Réglages), plus aucun champ « mot de passe » dans la page (la clé Claude se saisit derrière un bouton « Saisir une clé », champ texte masqué, vide = garder l’ancienne).
- Lot 2 « glisser au doigt » : poignée ⋮⋮ sur chaque tuile, visible seulement sur écran tactile ; on la tire, la tuile suit le doigt, on dépose entre deux tâches, en sous-tâche, sur Backlog / Aujourd’hui ; défilement automatique près des bords. Corrigé au passage : sur la frise téléphone, déposer sur la moitié basse d’une tuile range bien après elle.
- Tests : 60/61. Le seul rouge est « Import Sunsama », qui a besoin de ton vrai export CSV (absent ici, et on n’utilise pas tes vraies données) : rien à voir avec ces lots.

Précédent : v1.7 en ligne le 25/11 à 15 h 45.

## File d'attente (validée par le propriétaire le 25/11 à 20 h 24 — suivre cet ordre)
Source de vérité : section « File d'attente » du plan (doc Claude). Une nouvelle remarque se range à sa place, sans passer devant.

### 1. Bugs et fonctions gênantes
1. ~~Site marqué dangereux~~ : côté site fait (démo v=49). Reste de ton côté, après mise en ligne : Search Console › Problèmes de sécurité › « Demander un examen », en citant la page about.html.
2. ~~Glisser-déposer au doigt~~ : fait (démo v=49), à essayer sur ton téléphone.
3. ~~Doublon Cuisine / Alimentation saine~~ : proposition de fusion dans l’appli (démo v=50).
4. Bug « tâches pas dans le lendemain » : à confirmer à l'usage, ne rien faire sans nouveau signalement.

### 2. Fonctionnel
1. ~~Trier mes mails~~ : fait en démo (v=50). Prérequis de ton côté avant d’autoriser : gmail.readonly dans la console Google Cloud, Mail.Read dans Azure. Détail d’origine : Trier mes mails, **Gmail et Outlook** (remarque 25/11 20 h 29), bouton dans la section du Génie (onglet Claude du volet droit) : le Génie lit les non-lus (Gmail, lecture seule) et propose des tâches (questions directes, colis à retirer, rendez-vous, factures, échéances). Prérequis propriétaire : accès gmail.readonly dans la console Google Cloud ; pour Outlook, accès Mail.Read via Microsoft Graph (compte perso OK ; compte de travail bloqué comme To Do). Coder et tester avec de faux mails ; bouton masqué tant que l'accès n'est pas accordé. Puis tâche auto « Lire mes mails » quand les non-lus s'accumulent (seuil réglable).
2. Page Habits (remarque 25/11 20 h 25) : s'inspirer d'Habitica et des autres suivis d'habitudes (Streaks, Loop, Way of Life…) en se demandant comment Sunsama ferait un suivi d'habitudes (sobre, intégré à la journée, sans culpabiliser). Commencer par une courte étude et une proposition au propriétaire ; ne pas coder avant sa validation.
   → Proposition prête dans le plan (section « Proposition : Habitudes et Statistiques »), à valider avant de coder.
   Même lot : refonte de la page Statistiques (remarque 25/11 20 h 29). Étudier les meilleurs suivis d'habitudes du marché ; les habitudes s'intègrent aux statistiques ; elles restent secondaires (Diem reste d'abord un planificateur de journée) ; tâches et habitudes reliées entre elles (une tâche peut nourrir une habitude, une habitude peut créer sa tâche du jour) ; plan d'intégration fonctionnelle par étapes.
3. ~~Événements Google ajoutables comme tâches~~ : fait (démo v=51).
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
- Doublon Cuisine : quelle fusion ? Rien n’est fait tout seul : la carte attend ton choix dans l’Arbre. Bouton mis en avant par défaut : tout dans Corps › « Alimentation & cuisine ».
- Mails : par défaut, la tâche « Lire mes mails » arrive à partir de 20 non-lus, au plus une par jour, dans Gestion › Administratif. Le seuil se règle.
- Gmail : gmail.readonly est un accès « restreint » chez Google. En mode test de la console (toi seul comme testeur), ça marche sans vérification ; une publication pour d’autres demanderait un audit Google.
- Glisser au doigt : j’ai mis une poignée ⋮⋮ à gauche des tuiles (sur tactile seulement) plutôt qu’« appui long puis glisser », parce que l’appui long sert déjà à la sélection. Choix par défaut : la poignée. Dis-moi si tu préfères l’appui long.
- Page À propos : elle est en noindex comme le reste (le site n’apparaît pas dans Google). Choix par défaut : noindex partout. Si tu veux que la page À propos soit trouvable, je retire la balise de cette page seulement.
- Rendez-vous → tâche : un rendez-vous passé que tu n’as pas coché est compté comme fait à minuit (il ne revient pas le lendemain comme une tâche oubliée). Autre option : le supprimer. Choix par défaut : compté comme fait.
- Rendez-vous → tâche : si tu déplaces la tâche dans l’agenda, le rendez-vous Google reste à son heure d’origine (Diem ne le modifie jamais) et reste caché. Choix par défaut : Google intouché.
- Habitudes : trois questions dans la proposition du plan (page dédiée ou non, score ou série, nombre de pastilles), avec mes choix par défaut. Prochain lot autonome possible : « Le Génie propose une suggestion selon l’heure », en attendant ta validation des habitudes.
