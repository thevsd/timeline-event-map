/**
 * Copy the built page into Output/, the published copy of the app.
 * Run through `npm run release`, which builds first. Nothing else writes to Output/.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, 'dist', 'index.html');
const target = join(root, 'Output', 'Modern_Villainess_Timeline.html');

if (!existsSync(built)) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(built, target);
console.log('Released to Output/Modern_Villainess_Timeline.html');
