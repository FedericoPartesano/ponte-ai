// Il launcher legge il ProductVersion dell'exe e lo confronta con la versione della release:
// "0.1.3.0" (default di electron-builder) non è una versione valida per lui, "0.1.3" sì.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const r = spawnSync('npx', ['electron-builder', '--win', 'nsis', 'zip', '--x64', '--publish', 'never',
  `-c.extraMetadata.shortVersionWindows=${version}`], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
