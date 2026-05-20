/**
 * Copia api/ → frontend/server/ antes del build en Vercel (Root Directory = frontend).
 * Ejecutar: npm run sync-server
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const repoRoot = path.join(frontendRoot, '..');
const apiSrc = path.join(repoRoot, 'api');
const serverDest = path.join(frontendRoot, 'server');
const regionalSrc = path.join(repoRoot, 'tiendas-regionales.json');
const regionalDest = path.join(frontendRoot, 'tiendas-regionales.json');

if (!fs.existsSync(apiSrc)) {
  console.error('sync-server: no se encontró', apiSrc);
  process.exit(1);
}

if (fs.existsSync(serverDest)) {
  for (const name of fs.readdirSync(serverDest)) {
    if (name === 'data') continue;
    fs.rmSync(path.join(serverDest, name), { recursive: true, force: true });
  }
} else {
  fs.mkdirSync(serverDest, { recursive: true });
}
fs.cpSync(apiSrc, serverDest, { recursive: true, force: true });

fs.writeFileSync(
  path.join(serverDest, 'package.json'),
  JSON.stringify({ type: 'commonjs', private: true }, null, 2)
);

if (fs.existsSync(regionalSrc)) {
  fs.copyFileSync(regionalSrc, regionalDest);
} else {
  console.warn('sync-server: tiendas-regionales.json no encontrado en raíz');
}

console.log('sync-server: listo → frontend/server/');
