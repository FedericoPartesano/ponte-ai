# Rilascio e Micelio Launcher

Cosa serve perché Ponte AI compaia nel launcher e si installi. Ogni regola qui sotto è venuta da un errore reale (release 0.1.3–0.1.6, poi cancellate).

## Come si rilascia

1. Alzare `version` **e** `shortVersionWindows` in `app/package.json` (uguali: `scripts/dist-win.mjs` si ferma se differiscono).
2. Commit, poi `git tag vX.Y.Z` e `git push origin vX.Y.Z`.
3. Il workflow `.github/workflows/windows.yml` parte da solo sul tag (oppure a mano: `gh workflow run windows.yml -f tag=vX.Y.Z`). Dura circa 3-4 minuti, Windows è il più lento.
4. Il workflow crea la release e carica AppImage, installer `.exe`, zip portabile e `SHA256SUMS.txt`.

Da WSL non si può costruire l'installer Windows: electron-builder vuole `wine` per modificare l'exe, e senza wine produce un installer senza il programma dentro. Si costruisce su GitHub (runner `windows-latest`).

## Regole del launcher (lette in `micelio-launcher/crates/core/src/platform.rs`)

- **I file di una release si scoprono da `SHA256SUMS.txt`.** Senza, il launcher non vede nessun file e scrive "Not available". Lo genera il job `somme` del workflow.
- **Nomi accettati:** `<id>-<versione>-<os>-<arch><suffisso>`, con `<id>` = `ponte-ai` (id nel catalogo del launcher).
- **Su Windows solo due formati:** `.msi` oppure `…-windows-x64-portable.zip`. Un `…-windows-x64.zip` viene scartato. L'installer NSIS `.exe` resta per chi scarica a mano, il launcher non lo usa.
- **Su Linux:** `…-linux-x86_64.AppImage`.
- **Lo zip portabile** deve avere `ponte-ai.exe` alla radice.
- **`ProductVersion` dell'exe = versione della release.** Il launcher lo legge senza avviare il programma; se non coincide, annulla con "The portable executable does not match the selected version".

## ProductVersion: cosa funziona

electron-builder scrive `0.1.5.0` (quattro numeri) e il launcher non lo riconosce come `0.1.5`. Tentativi:

| Tentativo | Esito |
|---|---|
| `-c.extraMetadata.shortVersionWindows` | nessun effetto |
| `shortVersionWindows` in `package.json` | nessun effetto da solo (resta `0.1.5.0`) |
| `rcedit` in `afterPack` | troppo presto: electron-builder riscrive le risorse dopo |
| `rcedit` in **`afterSign`** (`app/scripts/after-pack.cjs`) | funziona: `0.1.7` |

Verifica dopo ogni build: scaricare lo zip, estrarre `ponte-ai.exe` e cercare `ProductVersion` con `strings -el`.

## Workflow: punti non ovvi

- `--publish never` nei due script **e** `build.publish: null` **e** il campo `repository` nel `package.json`: electron-builder in CI cerca da solo dove pubblicare e fallisce con "Cannot detect repository" o "reading 'channel'".
- Lo zip esce dal build come `…-windows-x64.zip` e il workflow lo rinomina in `…-portable.zip` prima del caricamento.
- Se una release va rifatta: cancellarla con `gh release delete vX --cleanup-tag`, non riscrivere il tag.

## Limiti noti

- Installer non firmato: Windows mostra l'avviso SmartScreen.
- Mai provato l'installer su una macchina Windows dall'autore; la prova è del collega con il launcher.
