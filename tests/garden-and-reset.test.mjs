import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshGame,
  transition,
  parseSave,
  resetStoredGame,
  SAVE_KEY,
} from '../lib/game.ts';
import { gardenPlacement } from '../lib/garden-layout.ts';

test('Garden drag keeps the grab point, clamps all edges and persists layout', () => {
  const bounds = { left: 20, top: 100, width: 400, height: 300 };
  const item = { width: 100, height: 100, grabX: 40, grabY: 20 };
  assert.deepEqual(gardenPlacement({ x: 210, y: 220 }, bounds, item), {
    x: 0.5,
    y: 0.5,
  });
  assert.deepEqual(gardenPlacement({ x: -500, y: 900 }, bounds, item), {
    x: 0,
    y: 1,
  });
  let g = { ...freshGame(), trips: 8 };
  g = transition(g, { type: 'place', index: 3, x: 0.25, y: 0.7 });
  assert.deepEqual(parseSave(JSON.stringify(g)).gardenPositions[3], {
    x: 0.25,
    y: 0.7,
    moved: true,
  });
  assert.equal(transition(g, { type: 'place', index: 0, x: NaN, y: 1 }), g);
  assert.equal(
    transition(freshGame(), { type: 'place', index: 2, x: 1, y: 1 }).trips,
    0,
  );
  g = transition(g, { type: 'place', index: 3, x: -1, y: 2 });
  assert.deepEqual(g.gardenPositions[3], { x: 0, y: 1, moved: true });
  const tidy = transition(g, { type: 'tidy' });
  assert.equal(tidy.trips, 8);
  assert.deepEqual(tidy.gardenPositions, freshGame().gardenPositions);
});

test('Saves from before movable gardens migrate without losing progress', () => {
  const old = { ...freshGame(), trips: 3, animal: 2 };
  delete old.gardenPositions;
  const migrated = parseSave(JSON.stringify(old));
  assert.equal(migrated.trips, 3);
  assert.equal(migrated.animal, 2);
  assert.equal(migrated.gardenPositions.length, 8);
  for (const bad of [
    null,
    [],
    [{ x: Infinity, y: 0 }],
    Array(8).fill({ x: -0.1, y: 0 }),
    Array(8).fill({ x: '0', y: 0 }),
  ])
    assert.equal(
      parseSave(JSON.stringify({ ...freshGame(), gardenPositions: bad })),
      null,
    );
});

test('Reset clears main and recovery copies, does not touch other apps, reports failure', () => {
  const data = new Map([
    [SAVE_KEY, JSON.stringify({ ...freshGame(), trips: 12 })],
    [SAVE_KEY + '-backup', JSON.stringify({ ...freshGame(), trips: 11 })],
    ['another-app', 'keep'],
  ]);
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
  assert.deepEqual(resetStoredGame(storage), freshGame());
  assert.deepEqual(parseSave(data.get(SAVE_KEY)), freshGame());
  assert.deepEqual(parseSave(data.get(SAVE_KEY + '-backup')), freshGame());
  assert.equal(data.get('another-app'), 'keep');
  assert.equal(
    resetStoredGame({
      getItem: () => null,
      setItem: () => {
        throw Error('quota');
      },
    }),
    null,
  );
});
