# MyDayBot : ton planificateur quotidien

MyDayBot est une appli web installable (PWA) pour planifier ta journée, reliée à **Google Agenda** et **Microsoft To Do**. Elle est gratuite, n'a pas de serveur et tes données restent dans ton navigateur.

## Ce qu'elle fait

| Fonction Sunsama | Dans MyDayBot |
|---|---|
| Rituel de planification du matin | 5 étapes : revue d'hier, choix des tâches (backlog et To Do), estimation, créneaux dans l'agenda, intention du jour |
| Alerte de surcharge | Barre de charge : tâches + réunions Google comparées à tes heures de travail |
| Timeboxing | Glisser une tâche sur l'agenda crée un événement dans Google Agenda. Placement automatique dans tes créneaux libres |
| Rituel de fin de journée | Bilan (fait / temps suivi / réunions), tri de ce qui reste, note de fin de journée |
| Objectifs de la semaine | Objectifs liés aux tâches, planification et revue de la semaine avec statistiques par canal |
| Channels | Canaux colorés. Taper `#perso` dans une tâche la range dans ce canal |
| Mode focus | Plein écran, chrono, sous-tâches et notes ; la tâche devient active dans l’agenda et le reste se décale |
| Suivi du temps | Temps réel comparé au temps estimé, par tâche, par jour et par semaine |
| Backlog, récurrence, sous-tâches, report | Oui. Les tâches non terminées sont proposées au report |
| Microsoft To Do | Panneau latéral : importer (bouton ou glisser). Cocher ici coche dans To Do, et inversement à la synchro |
| Raccourcis clavier | N, P, S, F, T, W, B, O, ← → |

Saisie rapide : « Appeler la banque 30m #perso » crée la tâche avec une durée de 30 min, rangée dans le canal Perso. `1h30` fonctionne aussi.

---

## Installation (environ 20 minutes, une seule fois)

Les connexions Google et Microsoft ont besoin que l'appli soit servie en **https** à une adresse fixe. Le plus simple est GitHub Pages, qui est gratuit.

### 1. Mettre l'appli en ligne avec GitHub Pages

1. Crée un dépôt sur GitHub nommé `journee` (public ou privé, avec un compte Pro pour le privé).
2. Choisis **Add file → Upload files** et dépose tous les fichiers de ce dossier.
3. Dans **Settings → Pages**, choisis Source : *Deploy from a branch*, Branch : `main`, dossier `/ (root)`.
4. Après une minute, l'appli est disponible à `https://TON-PSEUDO.github.io/journee/`.

Ouvre-la, puis va dans **Réglages → Adresse de redirection** et copie l'adresse exacte. Elle te servira aux deux étapes suivantes.

> Pour tester en local : lance `python3 -m http.server 8000` dans ce dossier et ouvre `http://localhost:8000/`. Google et Microsoft acceptent `localhost`. Ajoute alors aussi cette adresse dans leurs consoles.

### 2. Google Agenda

1. Va sur <https://console.cloud.google.com/> et crée un projet nommé « Journée ».
2. Dans **API et services → Bibliothèque**, active *Google Calendar API* et *Google Drive API* (la synchro entre appareils).
3. Dans **Google Auth Platform** (ou *Écran de consentement OAuth*), configure le projet :
   - Type : **Externe**, nom de l'appli : Journée, avec ton e-mail.
   - **Audience → Utilisateurs test** : ajoute ta propre adresse Gmail.
   - **Accès aux données** : ajoute les champs d'application `.../auth/calendar.events` et `.../auth/drive.appdata`.
4. Dans **Clients → Créer un client**, choisis le type **Application Web**, puis renseigne :
   - Origines JavaScript autorisées : `https://TON-PSEUDO.github.io`
   - URI de redirection autorisés : l'adresse copiée dans Réglages (par ex. `https://TON-PSEUDO.github.io/journee/`)
5. Copie l'**ID client** (`….apps.googleusercontent.com`) dans MyDayBot → Réglages → Google Agenda, puis clique sur **Connecter Google**.

Google affiche « Cette appli n'a pas été validée ». C'est normal pour une appli perso en mode test : clique sur *Continuer*.
Par sécurité, la session Google dure **1 heure**. Ensuite, un bouton **Reconnecter** apparaît et un clic suffit, sans ressaisir de mot de passe.

### 3. Microsoft To Do

1. Va sur <https://entra.microsoft.com/> (ou portal.azure.com), puis **Applications → Inscriptions d'applications → Nouvelle inscription**.
   - Nom : Journée
   - Types de comptes : **Comptes dans un annuaire d'organisation et comptes Microsoft personnels**
   - URI de redirection : plateforme **Application monopage (SPA)**, avec l'adresse copiée dans Réglages
2. Dans **API autorisées → Ajouter une autorisation → Microsoft Graph → Autorisations déléguées**, coche `Tasks.ReadWrite`. `User.Read` est déjà présente.
3. Dans **Vue d'ensemble**, copie l'**ID d'application (client)** dans MyDayBot → Réglages → Microsoft To Do, puis clique sur **Connecter Microsoft**.

La session Microsoft se renouvelle seule pendant 24 h, puis demande un clic pour se reconnecter.

### 4. Installer l'appli

- **Android (Chrome)** : menu ⋮ → **Installer l'application** ou **Ajouter à l'écran d'accueil**.
- **PC (Chrome / Edge)** : icône d'installation à droite de la barre d'adresse.

---

## Bon à savoir

- **Où sont tes données ?** Dans ton navigateur, et copiées dans un dossier caché de ton Google Drive (réservé à l'appli) dès que Google est connecté : c'est ce qui synchronise ton téléphone et ton Mac. En cas de modification sur deux appareils en même temps, la plus récente gagne. **Réglages → Exporter** reste disponible comme sauvegarde.
- **Sur mobile**, le glisser-déposer n'existe pas : ouvre une tâche et choisis son jour et son heure dans le détail.
- **Confidentialité** : l'appli parle directement à Google et à Microsoft depuis ton navigateur. Aucun serveur intermédiaire.
- **Mise à jour** : remplace les fichiers sur GitHub. Si l'ancienne version reste affichée, recharge l'appli deux fois.

## Tests

`python3 tests/e2e.py [export_sunsama.csv]` lance 22 scénarios de bout en bout dans Chrome (Playwright), avec Google, Claude et l'horloge simulés. `ONLY=palette python3 tests/e2e.py` pour n'en lancer qu'un.

## Arbre des catégories

Les tâches sont rangées dans un arbre à 4 piliers (Être, Grandir, Relier, Bâtir), puis en domaines et en catégories. Cet arbre servira de base au skill tree.
- **Ranger une tâche** : `#raccourci` à la saisie. Sans raccourci, MyDayBot devine par mots-clés, puis Claude affine.
- **Projets** : `+projet` associe la tâche à une étiquette transversale.
- **Agendas** : l'agenda Google se règle par pilier dans Réglages. Un domaine ou une catégorie peut le remplacer.
- **Anciens canaux Sunsama** : ils sont migrés après validation, avec une sauvegarde dans `journee.backup.pretree`.
- **Synchro** : envoi 1,5 s après chaque modification, vérification toutes les 15 s et au retour sur l'appli. Chaque appareil doit être connecté à Google.
