import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('all catalog Hi-Tech title exclusions match their current native brush geometry', () => {
  const output = execFileSync('python3', ['tools/card-effects/hi-tech-title-mask.py', '--check'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8'
  });
  assert.match(output, /Hi-Tech native headers verified; 3 shared masks match/);
});

test('every shared viewer and Hi-Tech mask loads the corrected revision', () => {
  const css = readFileSync(new URL('../public/card-surface.css', import.meta.url), 'utf8');
  for (const name of ['hi-tech-mask', 'hi-tech-background', 'vegeta-background']) {
    assert.ok(css.includes(`/card-effects/${name}.svg?v=20261114-title-contour`), name);
  }
  for (const page of ['cards', 'decks', 'arena', 'foil-test']) {
    const html = readFileSync(new URL(`../public/${page}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('/card-surface.css?v=20261114-title-contour'), page);
  }
});
