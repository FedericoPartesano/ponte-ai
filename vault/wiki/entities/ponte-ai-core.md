---
type: entity
title: core: il ponte
tags: [entity]
related: [ponte-ai-app, claude-limitato-agli-strumenti-mcp]
created: 2026-10-27
updated: 2026-10-27
---

# core

`core/`: `bridge.mjs` (connessione al server), `claude-run.mjs` (avvio di `claude -p` con configurazione MCP temporanea), `stream-json.mjs`, `ask.mjs` e `ponte.mjs`. Usabile da riga di comando (`--code`) o come libreria dall'app. Accetta ordini solo dal server configurato.

Dalla 0.1.8 `creaPonte` accetta `onTraffico` per mostrare le richieste nell'app: [[scheda-attivita]].
