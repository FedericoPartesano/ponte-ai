---
type: concept
title: Workflow di rilascio
tags: [rilascio, github-actions]
related: [regole-asset-del-launcher]
created: 2026-10-27
updated: 2026-10-27
---


1. Alzare `version` **e** `shortVersionWindows` in `app/package.json` (uguali: `scripts/dist-win.mjs` si ferma se differiscono).
2. Commit, poi `git tag vX.Y.Z` e `git push origin vX.Y.Z`.
3. Il workflow `.github/workflows/windows.yml` parte da solo sul tag (oppure a mano: `gh workflow run windows.yml -f tag=vX.Y.Z`). Dura circa 3-4 minuti, Windows è il più lento.
4. Il workflow crea la release e carica AppImage, installer `.exe`, zip portabile e `SHA256SUMS.txt`.

Da WSL non si può costruire l'installer Windows: electron-builder vuole `wine` per modificare l'exe, e senza wine produce un installer senza il programma dentro. Si costruisce su GitHub (runner `windows-latest`).
## Workflow: punti non ovvi

- `--publish never` nei due script **e** `build.publish: null` **e** il campo `repository` nel `package.json`: electron-builder in CI cerca da solo dove pubblicare e fallisce con "Cannot detect repository" o "reading 'channel'".
- Lo zip esce dal build come `…-windows-x64.zip` e il workflow lo rinomina in `…-portable.zip` prima del caricamento.
- Se una release va rifatta: cancellarla con `gh release delete vX --cleanup-tag`, non riscrivere il tag.


## Limiti noti

- Installer non firmato: Windows mostra l'avviso SmartScreen.
- L'installer non è mai stato provato su Windows dall'autore: la prova è del collega con il launcher.
