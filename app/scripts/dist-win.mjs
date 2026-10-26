// Il launcher legge il ProductVersion dell'exe e lo confronta con la versione della release:
// "0.1.3.0" (default di electron-builder) non è una versione valida per lui, "0.1.3" sì.
// electron-builder lo prende da "shortVersionWindows" del package.json: deve essere uguale a "version".
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
if (pkg.shortVersionWindows !== pkg.version) {
  console.error(`package.json: "shortVersionWindows" (${pkg.shortVersionWindows}) deve essere uguale a "version" (${pkg.version}).`);
  process.exit(1);
}
const r = spawnSync('npx', ['electron-builder', '--win', 'nsis', 'zip', '--x64', '--publish', 'never'], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
