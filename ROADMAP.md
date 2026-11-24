# Journée — feuille de route et architecture

## Fait
- Version « lite » type Sunsama : rituels, timeboxing, focus, objectifs, canaux, récurrence, suivi du temps.
- Google Agenda, Microsoft To Do, synchro entre appareils via Google Drive.
- Claude intégré (clé API de l'utilisateur) : chat, propositions validables, suggestions automatiques.

## À venir (dans l'ordre)
1. **Import Sunsama** : lire l'export Sunsama (CSV/JSON) → tâches, canaux, objectifs, temps passés.
2. **Gamification inspirée d'Habitica + arbre de compétences** :
   - module séparé qui écoute le bus d'événements (`task:done`, `task:add`, `ritual:plan`, `ritual:shutdown`) via `window.journee.bus` ;
   - état de jeu isolé dans `S.game` (XP, niveau, or, vie, compétences débloquées, habitudes/quotidiennes), jamais mélangé aux données de planification ;
   - XP selon la durée/catégorie de la tâche, séries quotidiennes, récompenses, arbre de compétences par canal.
3. **Interrupteur Lite / Fantasy** : `data-mode="lite|fantasy"` sur `<html>`, réglage par appareil (non synchronisé) pour rester sobre au travail ;
   - mode lite : aucun élément de jeu visible ;
   - mode fantasy : thème heroic fantasy / SF (couleurs, typo, icônes, vocabulaire : « quêtes », « campagne »…), panneaux personnage et arbre.

## Principes d'architecture
- Le cœur (planification) ne dépend jamais des modules de jeu : ils s'abonnent aux événements.
- Le thème passe par des variables CSS et un dictionnaire de libellés, pour basculer sans recharger.
- Toutes les données restent dans `S` (localStorage + Drive) ; la clé API Claude reste locale.

## Notes à intégrer (demandées le 24/11)
- **Lieu des tâches** : savoir si une tâche est faisable à la maison, au boulot ou partout. Claude pose la question au moment de la saisie si ce n'est pas évident, et le plan du jour n'en propose que les tâches compatibles avec l'endroit où tu es.
- **Indisponibilités** : plages à exclure de la planification (absences, trajets, créneaux bloqués), en plus des rendez-vous Google.
- **Journées de boulot** : définir les jours travaillés (et leurs horaires), pour que la planification et le lieu des tâches en tiennent compte.
