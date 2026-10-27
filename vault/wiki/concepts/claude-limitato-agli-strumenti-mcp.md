---
type: concept
title: Claude limitato agli strumenti MCP
tags: [sicurezza]
related: [ponte-ai-core]
created: 2026-10-27
updated: 2026-10-27
---

## Cosa può fare Claude lanciato dal ponte

Il processo `claude` parte con:
`--strict-mcp-config --allowedTools mcp__smlbi --permission-mode auto --restricted --tools ""`

Solo gli strumenti MCP del server collegato; nessuno strumento nativo (Bash, Read, Write…). Provato: Write bloccato, Bash e Read non disponibili, gli strumenti MCP funzionano. Il ponte accetta ordini solo dal server configurato.
