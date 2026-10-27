# Password salvata e misure di sicurezza

## Dove va la password di una connessione

La password del server si cifra con `safeStorage` di Electron (Windows: DPAPI).
Su Linux/WSL non c'è un portachiavi di sistema: `safeStorage.isEncryptionAvailable()` è falso.

Dalla 0.1.2, in quel caso la password si salva **in chiaro** in `config.json` (`~/.config/Ponte AI/`), con permessi `0600`, nel formato `chiaro:<base64>`. Base64 non è cifratura. Prima c'era un errore e la connessione non si poteva salvare.

Limiti:
- Nessun avviso visibile nell'app sulla password in chiaro (da aggiungere).
- Alternative non adottate: tenerla solo in memoria (chiede la password a ogni avvio), oppure installare `gnome-keyring libsecret-1-0 dbus-x11` (non provato).
- Soluzione corretta a lungo termine: un token dedicato e revocabile al posto della password dell'account.

## Cosa può fare Claude lanciato dal ponte

Il processo `claude` parte con:
`--strict-mcp-config --allowedTools mcp__smlbi --permission-mode auto --restricted --tools ""`

Solo gli strumenti MCP del server collegato; nessuno strumento nativo (Bash, Read, Write…). Provato: Write bloccato, Bash e Read non disponibili, gli strumenti MCP funzionano. Il ponte accetta ordini solo dal server configurato.

## Codice di abbinamento

Più persone che condividono lo stesso account non avrebbero chat separate: ogni ponte ha un codice di 8 caratteri (`ABCD-EFGH`) che l'utente copia nel browser, così il server instrada la chat al PC giusto.

Da fare, in ordine: limite ai tentativi sul codice e codice più lungo; HTTPS; account personali o token dedicato; firma dell'installer Windows.
