import test from 'node:test';
import assert from 'node:assert/strict';
import { packScreenRows } from '../screen-layout.js';

test('screen packing preserves every row in order across a short viewport', () => {
  const heights = [250, 190, 220, 160, 90];
  const pages = packScreenRows(heights, 430, 480);
  assert.deepEqual(pages.flat(), [0, 1, 2, 3, 4]);
  pages.forEach((page, i) => {
    const used = page.reduce((sum, n) => sum + heights[n], 0) + Math.max(0, page.length - 1) * 16;
    assert.ok(used <= (i ? 480 : 430));
  });
});

test('a substantial introduction can have its own screen before complete cards', () => {
  assert.deepEqual(packScreenRows([300, 300], 120, 400), [[], [0], [1]]);
});

test('a larger viewport reunites rows without losing content', () => {
  assert.deepEqual(packScreenRows([180, 180, 180], 600, 600), [[0, 1, 2]]);
});

test('a small final note stays with cards instead of occupying a screen alone', () => {
  const pages = packScreenRows([100, 100, 100, 100, 90], 470, 470);
  assert.deepEqual(pages.flat(), [0, 1, 2, 3, 4]);
  assert.equal(pages.length, 2);
  assert.ok(pages.at(-1).length > 1);
});

test('a single oversized item remains available rather than being discarded', () => {
  assert.deepEqual(packScreenRows([600, 80], 400, 450), [[], [0], [1]]);
});
