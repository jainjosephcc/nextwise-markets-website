import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterAt, settleScrollPosition, transitionProgress } from '../home-scroll.js';

test('chapter navigation and skipped scroll positions leave a complete screen', () => {
  assert.equal(transitionProgress(-500, 812, 1624), 0);
  assert.equal(transitionProgress(812, 812, 1624), 0);
  assert.equal(transitionProgress(1624, 812, 1624), 1);
  assert.equal(transitionProgress(7000, 812, 1624), 1);
});

test('each chapter has a stable reading pause before and after its transition', () => {
  assert.equal(transitionProgress(190, 0, 1000), 0);
  assert.equal(transitionProgress(920, 0, 1000), 1);
  assert.ok(Math.abs(transitionProgress(550, 0, 1000) - .5) < 1e-10);
});

test('reversing scroll retraces the same motion without overshooting at any screen size', () => {
  for (const height of [494, 680, 770, 812]) {
    const positions = Array.from({ length: 101 }, (_, index) => height * index / 100);
    const forward = positions.map(position => transitionProgress(position, 0, height));
    const backward = positions.reverse().map(position => transitionProgress(position, 0, height));
    assert.deepEqual(backward, forward.toReversed());
    assert.ok(forward.every((value, index) => value >= 0 && value <= 1 && (!index || value >= forward[index - 1])));
  }
});

test('a collapsed interval during layout never produces invalid animation values', () => {
  assert.equal(transitionProgress(199, 200, 200), 0);
  assert.equal(transitionProgress(200, 200, 200), 1);
});

test('unequal chapter distances select the correct adjacent screens, including direct jumps', () => {
  const stops = [0, 1462, 2924, 3817];
  assert.deepEqual(chapterAt(-50, stops), { index: 0, progress: 0 });
  assert.deepEqual(chapterAt(1462, stops), { index: 1, progress: 0 });
  assert.equal(chapterAt(2800, stops).progress, 1);
  assert.deepEqual(chapterAt(5000, stops), { index: 3, progress: 0 });
  assert.deepEqual(chapterAt(0, []), { index: -1, progress: 0 });
});

test('a tall chapter remains fully active while its lower content scrolls into view', () => {
  // The second chapter needs 600px of reading travel, then a 1000px transition.
  const stops = [0, 1000, 2600];
  const reading = [0, 600, 0];
  for (const position of [1000, 1250, 1500, 1599, 1600, 1800]) {
    assert.deepEqual(chapterAt(position, stops, reading), { index: 1, progress: 0 });
  }
  assert.ok(Math.abs(chapterAt(2150, stops, reading).progress - .5) < 1e-10);
  assert.deepEqual(chapterAt(2520, stops, reading), { index: 1, progress: 1 });
  assert.deepEqual(chapterAt(2600, stops, reading), { index: 2, progress: 0 });
});

test('reading travel and transitions retrace consistently when scrolling back or jumping chapters', () => {
  const stops = [0, 1800, 2850, 4250];
  const reading = [800, 50, 400, 500];
  const positions = [-100, 0, 500, 800, 1350, 1799, 1800, 1825, 1850, 2400, 2850, 3100, 3250, 3800, 4250, 4750, 6000];
  const forward = positions.map(position => chapterAt(position, stops, reading));
  const backward = positions.toReversed().map(position => chapterAt(position, stops, reading));
  assert.deepEqual(backward, forward.toReversed());
  assert.ok(forward.every(({ progress }) => Number.isFinite(progress) && progress >= 0 && progress <= 1));
  assert.deepEqual(chapterAt(3100, stops, reading), { index: 2, progress: 0 });
  assert.deepEqual(chapterAt(1825, stops, reading), { index: 1, progress: 0 });
  assert.ok(Math.abs(chapterAt(3800, stops, reading).progress - .5) < 1e-10);
});

test('the last tall chapter stays visible through its reading travel and the end of the story', () => {
  for (const position of [2600, 2800, 3200, 4000]) {
    assert.deepEqual(chapterAt(position, [0, 1000, 2600], [0, 600, 600]), { index: 2, progress: 0 });
  }
  assert.deepEqual(chapterAt(0, [], []), { index: -1, progress: 0 });
});

test('chapters without extra reading distance keep their existing transition timing', () => {
  const stops = [0, 1000, 2000];
  for (const position of [0, 200, 550, 950, 1000, 1550, 2000]) {
    assert.deepEqual(chapterAt(position, stops, []), chapterAt(position, stops));
    assert.deepEqual(chapterAt(position, stops, [0]), chapterAt(position, stops));
  }
});

test('scroll smoothing has consistent timing across frame rates and never overshoots', () => {
  let at60 = 0, at120 = 0;
  for (let i = 0; i < 12; i += 1) at60 = settleScrollPosition(at60, 1000, 1000 / 60);
  for (let i = 0; i < 24; i += 1) at120 = settleScrollPosition(at120, 1000, 1000 / 120);
  assert.ok(Math.abs(at60 - at120) < .001);
  assert.ok(at60 > 800 && at60 < 1000);
  assert.ok(settleScrollPosition(1000, 0, 16) > 0);
  assert.ok(settleScrollPosition(1000, 0, 16) < 1000);
  assert.equal(settleScrollPosition(999.9, 1000, 16), 1000);
});
