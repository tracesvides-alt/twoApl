import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { staticPath } from '../scripts/static-path.mjs';

test('Offline worker caches static pages, returns settings offline, isolates other origins and caches', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'garage-worker-test-'));
  const root = path.join(temp, 'dist', 'client');
  fs.mkdirSync(path.join(root, 'parents'), { recursive: true });
  fs.writeFileSync(path.join(root, 'index.html'), 'game');
  fs.writeFileSync(path.join(root, 'parents.html'), 'settings');
  fs.writeFileSync(path.join(root, 'app.js'), 'game-code');
  try {
    assert.equal(staticPath(root, '/'), path.join(root, 'index.html'));
    assert.equal(
      staticPath(root, '/parents/'),
      path.join(root, 'parents.html'),
    );
    assert.equal(staticPath(root, '/parents'), path.join(root, 'parents.html'));
    assert.equal(staticPath(root, '/../../outside.txt'), null);
    const builder = fileURLToPath(
      new URL('../scripts/build-sw.mjs', import.meta.url),
    );
    const result = spawnSync(process.execPath, [builder], {
      cwd: temp,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const code = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    const handlers = {};
    const cacheData = new Map();
    const names = new Set(['another-app-cache', 'animal-garage-old']);
    const caches = {
      open: async (key) => {
        names.add(key);
        return {
          addAll: async (paths) => {
            for (const p of paths)
              cacheData.set(p, {
                body: fs.readFileSync(path.join(root, p), 'utf8'),
              });
          },
        };
      },
      keys: async () => [...names],
      delete: async (key) => names.delete(key),
      match: async (key) => cacheData.get(key),
    };
    const self = {
      location: { origin: 'https://garage.test' },
      clients: { claim: async () => {} },
      addEventListener: (name, fn) => {
        handlers[name] = fn;
      },
    };
    vm.runInNewContext(code, {
      self,
      caches,
      URL,
      Response,
      fetch: async () => {
        throw Error('offline');
      },
    });
    let pending;
    handlers.install({
      waitUntil: (p) => {
        pending = p;
      },
    });
    await Promise.resolve(pending);
    handlers.activate({
      waitUntil: (p) => {
        pending = p;
      },
    });
    await Promise.resolve(pending);
    assert.ok(names.has('another-app-cache'));
    assert.ok(!names.has('animal-garage-old'));
    const fetchEvent = async (url, mode = 'navigate') => {
      let response;
      handlers.fetch({
        request: { url, method: 'GET', mode },
        respondWith: (p) => {
          response = p;
        },
      });
      return response ? await Promise.resolve(response) : null;
    };
    assert.equal((await fetchEvent('https://garage.test/')).body, 'game');
    assert.equal(
      (await fetchEvent('https://garage.test/parents/')).body,
      'settings',
    );
    assert.equal(
      (await fetchEvent('https://garage.test/parents')).body,
      'settings',
    );
    assert.equal(
      (await fetchEvent('https://garage.test/app.js', 'same-origin')).body,
      'game-code',
    );
    assert.equal(
      await fetchEvent('https://other.test/app.js', 'same-origin'),
      null,
    );
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('garage-worker-test-'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
