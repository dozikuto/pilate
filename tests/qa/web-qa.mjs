// QA-only Vite startup/build. preserveSymlinks avoids Windows sandbox native-realpath EPERM.
// Application sources and the production Vite config are not changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build, createServer } from '../../web-admin/node_modules/vite/dist/node/index.js';
import tailwindConfig from '../../web-admin/tailwind.config.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dep = createRequire(path.join(root, 'web-admin/package.json'));
const react = dep('@vitejs/plugin-react').default;
process.chdir(path.join(root, 'web-admin'));
const reportDir = process.env.QA_REPORT_DIR;
const ui = reportDir ? JSON.parse(fs.readFileSync(path.join(reportDir, 'ui-server.json'), 'utf8')) : undefined;
const config = {
  configFile: false,
  root: path.join(root, 'web-admin'),
  envDir: root,
  plugins: [react()],
  resolve: { preserveSymlinks: true, alias: { '@': path.join(root, 'web-admin/src') } },
  define: ui ? { 'import.meta.env.VITE_API_URL': JSON.stringify(ui.base) } : {},
  css: { postcss: { plugins: [dep('tailwindcss')(tailwindConfig), dep('autoprefixer')()] } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: path.join(root, 'tests/qa/web-dist'), emptyOutDir: true },
};
if (process.argv.includes('--build')) await build(config);
else { const server = await createServer(config); await server.listen(); server.printUrls(); }
