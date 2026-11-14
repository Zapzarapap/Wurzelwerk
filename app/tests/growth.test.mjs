import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageFor, splitMinutes, plantsForMinutes, growingInfo, tokensFor } from '../js/growth.js';

test('stageFor: Schwellen aus KONZEPT.md', () => {
  const cases = [[0, 0], [14, 0], [15, 1], [29, 1], [30, 2], [59, 2], [60, 3], [89, 3], [90, 4], [119, 4], [120, 5], [500, 5]];
  for (const [m, s] of cases) assert.equal(stageFor(m), s, `${m} min`);
});

test('splitMinutes: Endless-Aufteilung', () => {
  assert.deepEqual(splitMinutes(0), []);
  assert.deepEqual(splitMinutes(10), [10]);
  assert.deepEqual(splitMinutes(120), [120]);
  assert.deepEqual(splitMinutes(130), [120, 10]);
  assert.deepEqual(splitMinutes(240), [120, 120]);
  assert.deepEqual(splitMinutes(250), [120, 120, 10]);
  assert.deepEqual(splitMinutes(305), [120, 120, 65]);
});

test('plantsForMinutes: < 15 min = nichts, Rest unter 15 min verfällt', () => {
  assert.deepEqual(plantsForMinutes(14), []);
  assert.deepEqual(plantsForMinutes(15), [{ minutes: 15, stage: 1 }]);
  assert.deepEqual(plantsForMinutes(134), [{ minutes: 120, stage: 5 }]);
  assert.deepEqual(plantsForMinutes(135), [{ minutes: 120, stage: 5 }, { minutes: 15, stage: 1 }]);
  assert.deepEqual(plantsForMinutes(300).map((p) => p.stage), [5, 5, 3]);
});

test('growingInfo: Fortschritt der wachsenden Pflanze', () => {
  const g = growingInfo(45);
  assert.equal(g.index, 0); assert.equal(g.stage, 2); assert.equal(g.nextStage, 3); assert.equal(g.minutesToNext, 15);
  const g2 = growingInfo(125);
  assert.equal(g2.index, 1); assert.equal(g2.minutes, 5); assert.equal(g2.stage, 0); assert.equal(g2.minutesToNext, 10);
});

test('tokensFor', () => {
  assert.equal(tokensFor(0), 0);
  assert.equal(tokensFor(37), 37);
});
