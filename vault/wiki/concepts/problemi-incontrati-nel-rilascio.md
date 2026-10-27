---
type: concept
title: Problemi incontrati nel rilascio (0.1.2-0.1.7)
tags: [rilascio, launcher, diagnosi]
related: [regole-asset-del-launcher, productversion-uguale-alla-versione, workflow-di-rilascio]
created: 2026-10-27
updated: 2026-10-27
---

# Problemi incontrati nel rilascio

Dal sintomo alla causa, in ordine di apparizione.

| Sintomo | Causa | Rimedio |
|---|---|---|
| Installer Windows costruito da WSL rotto (senza il programma dentro) | Manca `wine`, electron-builder non riesce a modificare l'exe | Costruire su GitHub Actions, runner `windows-latest` |
| CI: "Cannot detect repository" | electron-builder cerca da solo dove pubblicare | `--publish never` e campo `repository` nel `package.json` |
| CI: "Cannot read properties of null (reading 'channel')" | `build.publish: null` senza `repository` e senza `--publish never` | Tutti e tre insieme |
| Launcher: "Not available" con `ponte-ai-0.1.2-win-x64.exe` | Nome non riconosciuto: serve `<id>-<versione>-windows-x64` | Nomi con `artifactName` in `build.win` |
| Launcher: "Not available" anche con i nomi giusti (0.1.3) | Nessun `SHA256SUMS.txt`: senza, il launcher non scopre i file | Job `somme` del workflow |
| Launcher: "Not available" ancora, con lo zip `…-windows-x64.zip` | Su Windows vale solo `.msi` o `…-windows-x64-portable.zip` | Rinominare in `…-portable.zip` (il workflow lo fa) |
| Installazione annullata: "portable executable does not match the selected version" | `ProductVersion` dell'exe è `0.1.x.0`, la release è `0.1.x` | `rcedit` in `afterSign` |

## Tentativi che non hanno funzionato (ProductVersion)

`-c.extraMetadata.shortVersionWindows`; `shortVersionWindows` nel `package.json` da solo; `rcedit` in `afterPack` (le risorse vengono riscritte dopo). Ogni prova ha richiesto una release intera (3-4 minuti): da qui le release 0.1.3-0.1.6, poi cancellate.

## Come si diagnostica

- Scaricare la release e controllare i nomi e `SHA256SUMS.txt`.
- Leggere il `ProductVersion`: estrarre `ponte-ai.exe` dallo zip e `strings -el ponte-ai.exe | grep -A1 ^ProductVersion$`.
- Le regole sono nel codice del launcher: `crates/core/src/platform.rs` (nomi), `crates/core/src/release.rs` (`release_from_sums`), `crates/native/src/detect.rs` (lettura della versione), `crates/native/src/portable.rs` (exe alla radice dello zip).
- "Not available" = nessun file adatto alla piattaforma; "Offline" = errore di rete.
- Dopo una correzione il collega deve chiudere e riaprire il launcher (elenco in cache possibile).

## Altre note

- Rifare una release: cancellarla con `gh release delete vX --cleanup-tag`, non riscrivere il tag.
- Il launcher legge il catalogo da `catalog.json` (voce `ponte-ai` → repo `FedericoPartesano/ponte-ai`).
- Dalla 0.1.7 l'installazione sul PC di un collega non è ancora confermata.
