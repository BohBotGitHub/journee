# Diem : consignes du travail autonome (mode veille)

Ce fichier guide chaque lancement automatique. Chaque lancement repart de zéro : tout le contexte est ici, dans le plan et dans le code.

## Démarrage d'un lancement (dans cet ordre)
1. **Garde-fou** : cloner le dépôt `BohBotGitHub/journee` (branche `dev`) et lire `dev/STATE.md`. Si la ligne `mode:` ne vaut pas `veille`, s'arrêter tout de suite et le dire en une ligne : le propriétaire est là, on ne travaille pas à sa place.
2. Toujours travailler sur la branche **`dev`** (jamais `main`).
3. Lire le plan : doc Claude `7f87661b-2ef4-4776-a963-50e75e54c599`, onglet `0454f7db-ba01`, tableau des lots `m7dyfaegn36.14769`. Les lignes « À faire » sont le travail restant.
4. Relire `dev/STATE.md` (dernier lot fait, file d'attente, questions en suspens).

## Règles du propriétaire (à respecter strictement)
- Parler et écrire en **français naturel**.
- Ordre de priorité : **1) bugs et fonctions gênantes à l'usage, 2) fonctionnel, 3) design**. La gamification seulement une fois l'appli fonctionnelle.
- **Petits lots** : un lot = quelques changements cohérents, testés.
- **Ne jamais mettre en ligne** : ne jamais pousser sur `main`, ne jamais fusionner `dev` dans `main`. Le propriétaire dit « mets en ligne » lui-même.
- Ne jamais saisir de clé API, mot de passe, code ; ne jamais accepter de conditions à sa place.
- Données de démo **fictives uniquement** ; jamais ses vraies tâches.
- Une question pour le propriétaire ne bloque pas : la noter dans `dev/STATE.md` (section Questions) avec le choix fait par défaut, et continuer.
- S'occuper du fonctionnement de l'outil, pas de la façon dont il l'utilise.
- Plus d'icônes, tailles de fenêtres stables, vérification visuelle avant chaque démo.

## Déroulé d'un lot
1. Choisir la ligne la plus prioritaire du plan (ou de la file de `dev/STATE.md`).
2. Coder dans `js/`, `css/`, `index.html`.
3. Tests : `python3 tests/e2e.py` (Playwright) : **tout doit passer** ; ajouter un test pour chaque nouveauté.
4. Version : incrémenter `?v=NN` dans `index.html` et le cache `mydaybot-vNN` dans `sw.js` une fois par lancement.
5. Démo : `python3 dev/tools/build_demo.py` puis `python3 dev/tools/crawl.py` (aucune erreur) et `python3 dev/tools/shots.py today,tree,settings` (regarder les captures `/tmp/s_*`).
   Mettre à jour `dev/demo/demo-panel.js` (liste ITEMS des points à tester, changer la clé `journee.demoNN.checks`).
   Publier sur l'artefact démo `d3133bc8-48ab-40f2-ba0c-f60e40a36b16` avec `publish_files` (fichiers de `/tmp/diem-demo`).
6. Commit sur `dev` (message en français), `git push origin dev`.
7. Plan : passer la ligne traitée à « Fait (v1.x, en démo) », ajouter une ligne de version si besoin.
8. `dev/STATE.md` : mettre à jour dernier lot, file, questions.
9. Fin : un court résumé en français (ce qui est prêt dans la démo, les questions), envoyé comme notification.

## Limites d'un lancement
- Au plus **2 lots** par lancement, pour garder des jetons au propriétaire pour ses autres projets.
- S'arrêter proprement si un test reste rouge après 2 essais : noter le problème dans `dev/STATE.md`.
