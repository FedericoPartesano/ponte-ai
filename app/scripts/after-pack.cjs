// Il launcher confronta il ProductVersion dell'exe con la versione della release ("0.1.5").
// electron-builder lo scrive a quattro numeri ("0.1.5.0") e il launcher rifiuta l'installazione:
// qui lo riscriviamo uguale alla versione (hook afterSign: afterPack gira PRIMA della modifica delle risorse).
const path = require('node:path');
module.exports = async (context) => {
  if (context.electronPlatformName !== 'win32') return;
  const { rcedit } = await import('rcedit');
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const version = context.packager.appInfo.version;
  await rcedit(exe, { 'version-string': { ProductVersion: version } });
  console.log(`  • ProductVersion di ${path.basename(exe)} = ${version}`);
};
