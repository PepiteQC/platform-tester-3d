# EtherWorld Agent Rules

Ces règles définissent la façon de travailler sur le projet **EtherWorld Platform Tester 3D**. Elles sont adaptées à l’architecture actuelle du repo : **Express**, **WebSocket**, **Vite**, **React**, **Three.js**, **TroxT**, fichiers statiques dans `public/`, et modules applicatifs dans `src/`.

---

## 1. Règle principale du propriétaire

- Ne jamais supprimer de fichier sans demande explicite.
- Ne jamais écraser un fichier existant sans confirmation explicite.
- Ne jamais modifier un fichier existant sans confirmation explicite.
- Toujours demander avant toute modification importante.
- Ajouter les nouvelles fonctionnalités de façon logique, additive et compatible avec l’existant.
- Préserver l’architecture actuelle du projet.
- Ne pas convertir le projet vers Next.js ou une autre stack sans demande explicite.
- Ne pas faire de commit ou de push sans demande explicite.

Priorité d’intégration :

1. Ajouter un nouveau fichier.
2. Ajouter une extension séparée.
3. Ajouter une ligne de liaison seulement si confirmé.
4. Modifier un fichier existant seulement si confirmé.
5. Ne jamais supprimer.

---

## 2. Architecture du projet

Le projet utilise actuellement :

- Backend Express : `server.mjs`
- WebSocket multiplayer : `ws`
- Jeu statique : `public/index.html`, `public/game.js`, `public/styles.css`
- Admin panel existant : `public/admin.js`
- Extensions additives :
  - `public/admin-troxt-enhanced.js`
  - `public/ether-particles.js`
- Dashboard React/Vite/TroxT : `src/`
- Config Vite : `vite.config.ts`
- TypeScript : `tsconfig.json`, `tsconfig.node.json`
- Package manager actuel : `npm`, avec `package-lock.json`

Ne pas appliquer automatiquement les règles d’un starter Next.js/v0 si elles ne correspondent pas à cette architecture.

---

## 3. Fichiers protégés

Ces fichiers sont centraux et ne doivent pas être remplacés :

- `server.mjs`
- `public/game.js`
- `public/admin.js`
- `public/styles.css`
- `src/agents/troxt/*`
- `src/core/*`

Toute modification à ces fichiers nécessite une confirmation explicite.

---

## 4. Extensions additives recommandées

Pour ajouter une fonctionnalité navigateur :

- créer un fichier séparé dans `public/` ;
- ne pas modifier `game.js` directement si une extension peut faire le travail ;
- exposer une API globale propre si nécessaire ;
- attendre que `window.game` soit disponible avant de brancher une extension ;
- éviter les doubles initialisations ;
- documenter les APIs globales ajoutées ;
- nettoyer les timers, listeners et ressources graphiques si l’extension crée des objets persistants.

Exemples d’APIs globales déjà prévues ou acceptées :

```js
window.EtherParticles
window.EtherWorldAdminBridge
window.troxtAdmin
```

Événements recommandés :

```js
etherworld:*:event
troxt:*:event
troxt:*:command
```

---

## 5. Intégration TroxT

Toute intégration TroxT doit :

- être additive ;
- exposer des événements propres ;
- utiliser des noms clairs ;
- rester compatible avec le bridge existant ;
- ne pas casser les modules EtherPrism, EtherForge, EtherWeave, EtherLens ou Platform Tester ;
- pouvoir fonctionner même si TroxT n’est pas encore initialisé ;
- échouer proprement si une API n’est pas disponible.

Pattern recommandé :

```js
window.dispatchEvent(new CustomEvent('troxt:module:event', {
  detail: {
    source: 'module-name',
    type: 'event-name',
    timestamp: Date.now(),
    payload: {}
  }
}))
```

---

## 6. Performance

Les nouvelles fonctionnalités doivent privilégier :

- cache court quand pertinent ;
- déduplication des requêtes ;
- throttling / polling contrôlé ;
- nettoyage mémoire ;
- pas de fuite de timers ;
- pas de boucle infinie non contrôlée ;
- `requestAnimationFrame` pour les animations visuelles ;
- `BufferGeometry` pour les particules Three.js ;
- `dispose()` sur les matériaux et géométries Three.js ;
- limitation du nombre d’objets actifs en scène ;
- dégradation propre si une API ou un module n’est pas disponible ;
- arrêt ou ralentissement du polling quand `document.hidden === true` ;
- pas de recalcul DOM massif à haute fréquence ;
- pas de mutation de DOM dans une boucle animation sauf nécessité.

Pour les effets Three.js :

- réutiliser les textures si possible ;
- appeler `geometry.dispose()` ;
- appeler `material.dispose()` ;
- retirer les meshes/points du `scene` quand l’effet est terminé ;
- limiter les systèmes actifs ;
- éviter les allocations excessives dans `requestAnimationFrame`.

---

## 7. Sécurité

Ne pas ajouter :

- scripts Cloudflare injectés automatiquement ;
- scripts inconnus copiés depuis une page web ;
- secrets ou tokens dans le code ;
- clés API dans Git ;
- dépendances inutiles ;
- code obfusqué non expliqué ;
- URLs externes non nécessaires ;
- stockage de données sensibles dans le navigateur.

Les fichiers générés localement doivent rester ignorés :

```txt
node_modules/
dist/
saves/
snapshots/
server_logs.json
etherprism_db.json
.env
```

Si un nouveau fichier généré apparaît, vérifier s’il doit être ajouté au `.gitignore` avant tout commit.

---

## 8. Accessibilité HTML

Quand le HTML est amélioré :

- conserver tous les IDs utilisés par `game.js` ;
- ajouter `aria-label`, `aria-live`, `role` si utile ;
- utiliser `type="button"` sur les boutons ;
- garder une structure sémantique avec `main`, `section`, `nav`, `header`, `footer` quand pertinent ;
- ne jamais retirer les éléments attendus par le JavaScript ;
- ajouter `noscript` quand la page dépend fortement de JavaScript ;
- éviter les changements qui cassent le pointer lock, le chat, l’éditeur ou l’admin panel ;
- vérifier que les éléments dynamiques importants sont annoncés avec `aria-live` si nécessaire.

Avant de finaliser une modification HTML, vérifier que les IDs critiques existent toujours :

```txt
hud
hud-top-left
player-info
player-name
player-pos
fps-counter
player-count
hud-top-right
btn-editor
btn-generate
btn-save
btn-load
btn-export
btn-import
crosshair
hud-bottom
controls-hint
editor-panel
editor-close
ed-type
ed-color
ed-px
ed-py
ed-pz
ed-sx
ed-sy
ed-sz
ed-add
ed-selection-info
ed-delete
ed-seed
ed-count
ed-generate
ed-platform-list
save-panel
save-close
save-name
save-confirm
saves-list
chat-container
chat-messages
chat-input
notifications
import-file
```

---

## 9. Dépendances

Avant d’importer un nouveau package :

1. vérifier si le projet a déjà un équivalent ;
2. demander confirmation ;
3. installer avec `npm install` ;
4. ensuite seulement écrire le code qui importe le package.

Règles :

- Utiliser le package manager du repo : `npm`.
- Ne pas ajouter de dépendance pour une fonctionnalité réalisable proprement avec les dépendances existantes.
- Ne pas utiliser de dépendance abandonnée si une alternative maintenue est disponible.
- Vérifier l’impact bundle/performance si la dépendance touche le front.

---

## 10. Validation après ajout

Après chaque modification autorisée :

- vérifier la syntaxe JavaScript si applicable :

```bash
node --check public/fichier.js
```

- lancer le build :

```bash
npm run build
```

- si pertinent, tester le serveur :

```bash
npm run server
```

- si pertinent, vérifier les endpoints critiques :

```bash
curl http://localhost:5000/api/admin/metrics
curl http://localhost:5000/api/platforms
```

- si pertinent, vérifier que les scripts ajoutés sont servis :

```bash
curl -I http://localhost:5000/nom-du-fichier.js
```

---

## 11. Git

Ne jamais faire de commit ou push sans demande explicite.

Quand il faut préparer un commit :

- utiliser `git status` ;
- éviter `git add .` ;
- préférer `git add` explicite fichier par fichier ;
- ne jamais ajouter `node_modules`, `dist`, logs ou fichiers de sauvegarde ;
- vérifier `git diff --stat` avant commit ;
- vérifier `git diff --name-status` avant commit.

Exemple de pratique recommandée :

```bash
git status --short
git diff --stat
git add fichier-1 fichier-2 fichier-3
git commit -m "Message clair"
```

---

## 12. Style de travail

- Répondre clairement.
- Expliquer ce qui sera ajouté.
- Toujours distinguer :
  - fichiers ajoutés ;
  - fichiers modifiés ;
  - fichiers non touchés.
- Ne jamais agir silencieusement.
- Prévenir si une demande risque de casser l’existant.
- Proposer une intégration additive avant une modification directe.
- Demander confirmation quand il y a plusieurs chemins possibles.

---

# Migration Framework / Library

Cette section définit la méthode à suivre pour migrer une librairie, un framework ou un outil de build dans EtherWorld.

## Objectif

Planifier et exécuter une migration de framework ou librairie de façon incrémentale, sans migration big-bang, sans casser l’existant et avec rollback possible à chaque étape.

---

## 1. Dependency Audit

Avant toute migration :

- lister la version actuelle et la version cible ;
- lire le guide de migration ou le changelog de la version cible ;
- exécuter l’audit des dépendances :

```bash
npm outdated
```

- si nécessaire, inspecter l’arbre de dépendances :

```bash
npm ls package-name
npm explain package-name
```

- identifier les dépendances transitives qui peuvent aussi nécessiter une mise à jour ;
- identifier les packages liés entre eux, par exemple :
  - `vite` avec `@vitejs/plugin-react` ;
  - `react` avec `react-dom` ;
  - `three` avec `@types/three`, `@react-three/fiber`, `@react-three/drei` ;
  - `typescript` avec configs et plugins.

Documenter l’audit avant d’appliquer les modifications.

---

## 2. Breaking Changes Analysis

Pour chaque migration :

- lister les breaking changes entre la version actuelle et la version cible ;
- rechercher dans le code les usages affectés :
  - APIs dépréciées qui disparaissent ;
  - signatures de fonctions modifiées ;
  - types de retour modifiés ;
  - modules renommés ou déplacés ;
  - imports qui changent ;
  - comportements par défaut qui changent ;
  - configuration qui change.

Commandes utiles :

```bash
grep -RIn "ancienne_api" src public server.mjs vite.config.ts package.json
```

Catégoriser chaque changement :

- **trivial** : find-and-replace ou ajustement simple ;
- **moderate** : changement de logique localisé ;
- **complex** : changement d’architecture ou comportement transversal.

Ne pas commencer l’exécution avant d’avoir identifié les zones impactées.

---

## 3. Migration Plan

Ordonner les changements pour minimiser le risque :

1. Mettre à jour la configuration et les outils de build en premier.
2. Corriger les breaking changes dans les utilitaires partagés et modules core.
3. Mettre à jour le code feature du moins complexe au plus complexe.
4. Mettre à jour les tests en dernier, car ils peuvent nécessiter les nouveaux patterns.

Identifier :

- le code qui peut être compatible avec l’ancienne et la nouvelle version pendant la transition ;
- les modules qui peuvent être migrés séparément ;
- les fichiers à ne pas toucher ;
- les étapes qui peuvent être validées indépendamment ;
- le plan de rollback.

Pour une migration longue, prévoir une période de parallel-run si possible.

---

## 4. Execute Incrementally

Règles d’exécution :

- créer une branche dédiée pour la migration si un commit est demandé ;
- appliquer les changements module par module ;
- ne pas faire de big-bang migration ;
- garder le build passant à chaque étape ;
- éviter les ranges flottantes pendant la migration ;
- pinner la version cible exacte ;
- ne pas mélanger migration fonctionnelle et refonte UI non liée.

Exemples :

```bash
npm install vite@5.4.21 --save-exact
npm install @vitejs/plugin-react@4.3.3 --save-exact --save-dev
```

Après chaque module migré :

```bash
npm run build
```

Si un fichier JS public est modifié :

```bash
node --check public/fichier.js
```

---

## 5. Verify

Après migration :

- lancer le build complet ;
- lancer les tests si présents ;
- tester les flows critiques manuellement :
  - landing page ;
  - `/game` ;
  - WebSocket ;
  - admin panel ;
  - TroxT bridge ;
  - particules ;
  - sauvegarde / chargement ;
  - export / import ;
  - endpoints admin ;
- vérifier les performances :
  - taille du bundle ;
  - temps de build ;
  - FPS runtime ;
  - latence API ;
  - mémoire ;
- documenter les différences de comportement intentionnelles.

---

## 6. Rules

- Ne jamais faire de migration big-bang.
- Chaque PR ou commit doit être reviewable indépendamment.
- Si une dépendance fournit un outil de migration ou codemod, l’évaluer et l’utiliser d’abord si pertinent.
- Pinner la version cible exacte pendant la migration.
- Ne pas utiliser de ranges flottantes pendant une migration critique.
- Garder un plan de rollback clair.
- Savoir comment revenir à l’ancienne version à chaque étape.
- Mettre à jour les lock files dans un commit dédié si possible pour des diffs plus propres.
- Ne pas faire de commit ou push sans autorisation explicite.

---

## 7. Migration Report Template

Pour chaque migration, documenter :

```md
# Migration Report

## Dependency

- Package:
- Current version:
- Target version:
- Reason:

## Audit

- Direct dependencies affected:
- Transitive dependencies affected:
- Related packages:

## Breaking Changes

| Change | Impact | Category | Files affected | Action |
| --- | --- | --- | --- | --- |
| | | trivial/moderate/complex | | |

## Plan

1.
2.
3.

## Validation

- npm run build: pass/fail
- JS syntax checks: pass/fail
- Server smoke test: pass/fail
- Critical flows tested:

## Rollback

- Revert package version:
- Revert files:
- Known safe commit:

## Notes

- Intentional behavior changes:
- Follow-up tasks:
```
