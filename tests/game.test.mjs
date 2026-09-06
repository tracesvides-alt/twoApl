import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshGame,
  transition,
  parseSave,
  loadGame,
  saveGame,
  SAVE_KEY,
  targetCount,
  targetGoal,
  animalCount,
  carCount,
  growthLevel,
} from '../lib/game.ts';
const finish = (g, activity = 'fruit') => {
  g = transition(g, { type: 'start', activity, id: `trip-${g.trips}` });
  for (let i = 0; i < 3; i++) g = transition(g, { type: 'move' });
  for (let i = 0; i < targetCount(activity); i++)
    for (let n = 0; n < targetGoal(activity); n++)
      g = transition(g, { type: 'hit', index: i });
  return g;
};
for (const activity of ['fruit', 'wash', 'water'])
  test(`Complete ${activity} journey, reward once, resume and return`, () => {
    let g = freshGame();
    g = transition(g, { type: 'start', activity, id: 'test' });
    g = transition(g, { type: 'move' });
    g = transition(g, { type: 'home' });
    assert.equal(g.trip.step, 1);
    assert.equal(parseSave(JSON.stringify(g)).trip.step, 1);
    g = transition(g, { type: 'resume' });
    assert.equal(g.screen, 'ride');
    g = transition(g, { type: 'move' });
    g = transition(g, { type: 'move' });
    assert.equal(g.screen, 'activity');
    g = transition(g, { type: 'hit', index: 0 });
    g = parseSave(JSON.stringify(g));
    assert.ok(g);
    assert.equal(g.trip.hits[0], 1);
    for (let i = 0; i < targetCount(activity); i++)
      for (let n = 0; n < targetGoal(activity); n++)
        g = transition(g, { type: 'hit', index: i });
    assert.equal(g.screen, 'reward');
    assert.equal(g.trips, 1);
    const rewarded = g;
    g = transition(g, { type: 'hit', index: 0 });
    assert.strictEqual(g, rewarded);
    g = parseSave(JSON.stringify(g));
    assert.equal(g.screen, 'reward');
    g = transition(g, { type: 'garden' });
    assert.equal(g.trip, null);
    assert.equal(g.screen, 'garden');
    assert.equal(growthLevel(g, 0), 1);
    g = transition(g, { type: 'home' });
    assert.equal(g.screen, 'home');
  });
test('Eight varied trips unlock everything; continued play grows garden through three stages', () => {
  let g = freshGame();
  for (let i = 0; i < 24; i++) {
    g = finish(g, ['fruit', 'wash', 'water'][i % 3]);
    g = transition(g, { type: 'garden' });
    assert.equal(g.trips, i + 1);
    assert.ok(parseSave(JSON.stringify(g)));
  }
  assert.equal(animalCount(g), 4);
  assert.equal(carCount(g), 4);
  assert.equal(growthLevel(g, 7), 3);
  g = transition(g, { type: 'poke', index: 7 });
  assert.equal(g.gardenTaps[7], 1);
});
test('Invalid input and locked selections cannot advance progress', () => {
  const g = freshGame();
  assert.strictEqual(transition(g, { type: 'animal', index: 3 }), g);
  assert.strictEqual(transition(g, { type: 'car', index: 3 }), g);
  assert.strictEqual(transition(g, { type: 'hit', index: 0 }), g);
  let playing = transition(g, { type: 'start', activity: 'fruit', id: 'x' });
  for (let i = 0; i < 3; i++) playing = transition(playing, { type: 'move' });
  assert.strictEqual(transition(playing, { type: 'hit', index: 8 }), playing);
  assert.strictEqual(transition(playing, { type: 'hit', index: -1 }), playing);
});
test('Atomic local save round-trip, backup recovery, blocked storage and malformed schema', () => {
  const data = new Map();
  const store = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  const initial = freshGame();
  assert.ok(saveGame(store, initial));
  const completed = finish(initial);
  assert.ok(saveGame(store, completed));
  assert.deepEqual(loadGame(store).game, completed);
  data.set(SAVE_KEY, '{bad-json');
  const recovery = loadGame(store);
  assert.equal(recovery.recovered, true);
  assert.deepEqual(recovery.game, initial);
  const blocked = {
    getItem: () => {
      throw Error('denied');
    },
    setItem: () => {
      throw Error('denied');
    },
  };
  assert.equal(loadGame(blocked).available, false);
  assert.equal(saveGame(blocked, initial), false);
  for (const raw of [
    'null',
    '{}',
    '[]',
    '{"version":2}',
    JSON.stringify({ ...initial, screen: 'reward' }),
    JSON.stringify({ ...initial, trips: -1 }),
    JSON.stringify({ ...initial, gardenTaps: [] }),
  ])
    assert.equal(parseSave(raw), null);
});
