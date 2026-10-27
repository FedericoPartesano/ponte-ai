---
type: concept
title: Password in chiaro (0600) senza portachiavi
tags: [sicurezza]
related: [ponte-ai-app]
created: 2026-10-27
updated: 2026-10-27
---

## Dove va la password di una connessione

La password del server si cifra con `safeStorage` di Electron (Windows: DPAPI).
Su Linux/WSL non c'è un portachiavi di sistema: `safeStorage.isEncryptionAvailable()` è falso.

Dalla 0.1.2, in quel caso la password si salva **in chiaro** in `config.json` (`~/.config/Ponte AI/`), con permessi `0600`, nel formato `chiaro:<base64>`. Base64 non è cifratura. Prima c'era un errore e la connessione non si poteva salvare.

Limiti:
- Nessun avviso visibile nell'app sulla password in chiaro (da aggiungere).
- Alternative non adottate: tenerla solo in memoria (chiede la password a ogni avvio), oppure installare `gnome-keyring libsecret-1-0 dbus-x11` (non provato).
- Soluzione corretta a lungo termine: un token dedicato e revocabile al posto della password dell'account.
