import { cpSync, existsSync, rmSync } from 'node:fs';

const build = new URL('../dist/', import.meta.url);
const published = new URL('../play/', import.meta.url);
if (!existsSync(new URL('index.html', build))) {
  throw new Error('Build the game before staging it for GitHub Pages.');
}
// This directory contains only the generated, tracked Pages release.
rmSync(published, { recursive: true, force: true });
cpSync(build, published, { recursive: true });
