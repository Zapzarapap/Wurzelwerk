import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActive, elapsedMs, pause, resume, finalize, timerDone, timerEndAt } from '../js/sessionlogic.js';

const MIN = 60000;
const T0 = Date.UTC(2026, 10, 14, 8, 0);

test('Endless mit Pause: Zeit aus Zeitstempeln', () => {
  let a = createActive({ tagId: 't', region: 'r', species: 's', mode: 'endless' }, T0);
  assert.equal(elapsedMs(a, T0 + 10 * MIN), 10 * MIN);
  a = pause(a, T0 + 10 * MIN);
  assert.equal(elapsedMs(a, T0 + 50 * MIN), 10 * MIN); // pausiert zählt nicht
  a = resume(a, T0 + 50 * MIN);
  assert.equal(elapsedMs(a, T0 + 70 * MIN), 30 * MIN);
  const f = finalize(a, T0 + 70 * MIN + 30000);
  assert.equal(f.minutes, 30);
  assert.equal(f.segments.length, 2);
  assert.equal(f.endedAt, T0 + 70 * MIN + 30000);
});

test('Timer: endet exakt am Ablauf, auch wenn die App später öffnet', () => {
  let a = createActive({ mode: 'timer', targetMin: 30 }, T0);
  assert.equal(timerEndAt(a), T0 + 30 * MIN);
  assert.equal(timerDone(a, T0 + 29 * MIN), false);
  assert.equal(timerDone(a, T0 + 30 * MIN), true);
  const f = finalize(a, T0 + 5 * 3600 * 1000); // Stunden später geöffnet
  assert.equal(f.minutes, 30);
  assert.equal(f.endedAt, T0 + 30 * MIN);
});

test('Timer mit Pause verschiebt das Ende', () => {
  let a = createActive({ mode: 'timer', targetMin: 30 }, T0);
  a = pause(a, T0 + 10 * MIN);
  a = resume(a, T0 + 20 * MIN);
  assert.equal(timerEndAt(a), T0 + 40 * MIN);
  const f = finalize(a, T0 + 100 * MIN);
  assert.equal(f.minutes, 30);
  assert.equal(f.endedAt, T0 + 40 * MIN);
});

test('Abbruch eines Timers: gelernte Zeit zählt', () => {
  const a = createActive({ mode: 'timer', targetMin: 60 }, T0);
  const f = finalize(a, T0 + 20 * MIN);
  assert.equal(f.minutes, 20);
});
