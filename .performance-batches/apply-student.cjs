const fs = require('node:fs');
const path = require('node:path');
const sourceRoot = path.join(__dirname, 'testing-zone');
const targetRoot = path.resolve(__dirname, '../../testing-zone');
for (const relative of process.argv.slice(2)) {
  const source = path.resolve(sourceRoot, relative);
  const target = path.resolve(targetRoot, relative);
  if (!source.startsWith(sourceRoot + path.sep) || !target.startsWith(targetRoot + path.sep)) throw new Error('Path outside batch roots');
  if (!fs.statSync(source).isFile()) throw new Error('Expected a staged file');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`Applied ${relative}`);
}
