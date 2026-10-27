---
type: concept
title: ProductVersion dell'exe uguale alla versione
tags: [rilascio, windows]
related: [regole-asset-del-launcher]
created: 2026-10-27
updated: 2026-10-27
---


electron-builder scrive `0.1.5.0` (quattro numeri) e il launcher non lo riconosce come `0.1.5`. Tentativi:

| Tentativo | Esito |
|---|---|
| `-c.extraMetadata.shortVersionWindows` | nessun effetto |
| `shortVersionWindows` in `package.json` | nessun effetto da solo (resta `0.1.5.0`) |
| `rcedit` in `afterPack` | troppo presto: electron-builder riscrive le risorse dopo |
| `rcedit` in **`afterSign`** (`app/scripts/after-pack.cjs`) | funziona: `0.1.7` |

Verifica dopo ogni build: scaricare lo zip, estrarre `ponte-ai.exe` e cercare `ProductVersion` con `strings -el`.
