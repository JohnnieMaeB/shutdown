// Builds the web app's shared logic: the phone app's plain-TypeScript modules (no React Native in them) become
// ES modules in web/lib/, so the web app and the phone app use the same phrases, rules and colours.
// Uses the TypeScript compiler already in devDependencies.  node tools/build-web.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = ['content', 'phrases', 'text', 'tokens'];
const out = path.join(root, 'web', 'lib');
fs.mkdirSync(out, { recursive: true });
for (const name of SHARED) {
  const src = fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
    // Browsers need the extension on relative imports.
    .replace(/(from\s+['"])(\.\/[\w-]+)(['"])/g, '$1$2.js$3');
  fs.writeFileSync(path.join(out, name + '.js'), '// Built from src/' + name + '.ts by tools/build-web.mjs. Edit the .ts file, not this one.\n' + js);
}
// The line icons too, used as CSS masks.
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'assets', 'icons'))) fs.copyFileSync(path.join(root, 'assets', 'icons', f), path.join(out, 'icons', f));
console.log('built web/lib:', SHARED.join(', '), '+ icons');
