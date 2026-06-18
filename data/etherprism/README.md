# EtherPrism City RP Seed

Ce dossier contient un seed additif pour EtherPrism lié à la Rue Éther QC, la Résidence Éther et la Boutique Éther.

## Fichiers

- `seed-city-rp.json` — données RP enrichies : players, vehicles, houses, shops, jobs, inventory, factions, bank accounts.
- `../../scripts/apply-etherprism-seed.mjs` — validation et application vers `etherprism_db.json`.

## Vérifier

```bash
node scripts/apply-etherprism-seed.mjs --check
```

## Appliquer localement

```bash
node scripts/apply-etherprism-seed.mjs
```

`etherprism_db.json` reste un fichier runtime ignoré par Git. Le seed versionné est `data/etherprism/seed-city-rp.json`.
