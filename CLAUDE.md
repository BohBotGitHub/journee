# Diem : consignes pour Claude Code

Diem est l'appli perso de planification de Jonathan (équivalent de Sunsama), en PWA statique.
En ligne : https://bohbotgithub.github.io/journee/ (GitHub Pages, branche `main`).
Réponds toujours en **français**.

## Façon de travailler avec Jonathan (à respecter)

- Messages courts, pas de pavés. Une question à la fois. Toujours donner ton avis.
- « bd » / « braindump » / « nsa » = noter au plan sans appliquer. Ses remarques en cours de travail se notent au plan, sauf demande explicite ou bug qui casse ce que tu livres.
- Priorités : bugs, puis fonctionnel, puis design. Avant chaque version : revoir la file et proposer un ordre.
- Mise en ligne **seulement** quand il dit « mets en ligne ». Toujours mettre la démo à jour avant.
- Vérifier visuellement à 3 largeurs (1440, 820, 390) avant de livrer.
- Ne jamais inventer de menus ou de chemins d'appli : dire qu'on ne sait pas.
- Ne jamais saisir de mot de passe, clé API ou code ; il colle lui-même ses clés et accepte lui-même les écrans OAuth.
- Démos : données fictives uniquement.
- Proposer des plugins quand une mission sort de tes attributions.

## Branches

- `dev` : tout le travail. `main` : le site en ligne. Jamais de commit direct sur `main` hors mise en ligne.
- `avant-audit` : point de retour avant l'audit du 26/11.

## Commandes

- Tests (Playwright, ~5 min) : `python3 tests/e2e.py` ; un seul test : `ONLY="mot du titre" python3 tests/e2e.py`. Tous doivent passer (87 au 28/11).
- Démo : `python3 dev/tools/build_demo.py` (écrit dans `/tmp/diem-demo`) puis `cp about.html /tmp/diem-demo/`.
- À chaque version : monter `?v=NN` dans `index.html` et `CACHE = 'mydaybot-vNN'` dans `sw.js` (v94 au 28/11), et l'étiquette `<b>vX.Y · JJ/MM</b>` du menu.
- Mise en ligne (sur « mets en ligne ») :
  ```
  git fetch && [ "$(git rev-parse main)" = "$(git ls-remote origin refs/heads/main | cut -f1)" ]
  git checkout main && git checkout dev -- . ':(exclude)dev' ':(exclude)CLAUDE.md' && git add -A && git commit -m "vX.Y : …" && git push origin main; git checkout dev
  ```
  Puis vérifier `https://bohbotgithub.github.io/journee/sw.js?nc=<n>` (le cache doit avoir le nouveau numéro ; Pages met 1 à 3 min).

## Architecture (js/)

core (état `S`, tâches, récurrence, `parseQuick`), sync (Drive appData, fusion par horodatage `u`/`uu`), flow (placement auto, report), google (agenda, OAuth), ai (le Génie : API Anthropic avec la clé de Jonathan), habits, inbox (lien Claude), mail, render, views, events, icons (dont `LAMP_SVG`, la lampe du Génie).

## Lien avec Claude (v2.5)

- Dans claude.ai, la compétence de compte **diem** dépose un fichier JSON par demande dans le dossier Drive « Diem · boîte de réception » (id `1Bvr297YET366-SwwZqmdPaqJveV93-ot`). `js/inbox.js` les lit (scope `drive.readonly`, ajouté dans la console Google Cloud du projet `journee-515708`) : `kind:add` ajouté directement, `kind:suggest` présenté par le Génie (onglet Génie + section « Le Génie propose » à l'étape Choisir du rituel du matin).
- Tâche programmée claude.ai « Diem · suggestions du matin » (5 h 43, Paris) : relit les conversations et dépose des suggestions. Pas encore confirmé qu'elle a accès aux conversations.

## Où en est le plan (27/11)

- En ligne : v2.5.1 (Habitudes, focus Lampe, lampe ronde partout, Génie sans réponse vide, lien Claude).
- Restent au plan : identité du Génie (au-delà de la lampe), citations de Camus (paraphrases publiées ou retrait), APK Android, Microsoft To Do (bloqué par l'authentification du compte de travail), colonnes de la Semaine étroites.
- Le plan détaillé est un doc Claude (claude.ai), pas dans le dépôt ; `ROADMAP.md` et `dev/STATE.md` donnent un historique plus ancien.
