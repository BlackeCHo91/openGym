// Fork addition: Lifestyle ratings (api/lifestyle.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanSession, cleanDay, readLifestyle, writeLifestyle, lifestyleRoutes } from '../lifestyle.js';

test('a session rating takes three whole scores from 1 to 10', () => {
  const r = cleanSession({ id: 'w1', d: '2026-11-05', overall: 7, motivation: '4', strength: 10, note: '  müde  ' });
  assert.deepEqual(r, { id: 'w1', d: '2026-11-05', overall: 7, motivation: 4, strength: 10, note: 'müde' });
  assert.equal(typeof cleanSession({ id: 'w1', d: '2026-11-05', overall: 11, motivation: 4, strength: 5 }), 'string');
  assert.equal(typeof cleanSession({ id: 'w1', d: '2026-11-05', overall: 0, motivation: 4, strength: 5 }), 'string');
  assert.equal(typeof cleanSession({ id: 'w1', d: '2026-11-05', overall: 5.5, motivation: 4, strength: 5 }), 'string');
  assert.equal(typeof cleanSession({ d: '2026-11-05', overall: 5, motivation: 4, strength: 5 }), 'string');
  assert.equal(typeof cleanSession({ id: 'w1', d: '5.11.2026', overall: 5, motivation: 4, strength: 5 }), 'string');
});

test('a day takes four whole scores from 1 to 5 and caps the note', () => {
  const r = cleanDay({ d: '2026-11-05', energy: 1, mood: 5, stress: 3, sleep: 2, note: 'x'.repeat(900) });
  assert.equal(r.note.length, 500);
  assert.equal(r.energy, 1);
  assert.equal(typeof cleanDay({ d: '2026-11-05', energy: 6, mood: 5, stress: 3, sleep: 2 }), 'string');
  assert.equal(typeof cleanDay({ d: '2026-11-05', energy: 3, mood: 5, stress: 3 }), 'string');
});

test('the file round-trips and starts empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-'));
  assert.deepEqual(readLifestyle(dir, 'u1'), { sessions: {}, days: {} });
  writeLifestyle(dir, 'u1', { sessions: { a: { overall: 1 } }, days: {} });
  assert.deepEqual(readLifestyle(dir, 'u1').sessions.a, { overall: 1 });
  assert.ok(fs.existsSync(path.join(dir, 'lifestyle-u1.json')));
});

test('the routes refuse a caller without a session and store per user', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-'));
  let user = null, body = null;
  const out = [];
  const routes = lifestyleRoutes({
    dir,
    readSession: () => user,
    readBody: async () => body,
    json: (res, code, obj) => out.push({ code, obj }),
  });
  await routes['GET /api/lifestyle']({}, {});
  assert.equal(out.pop().code, 401);
  user = { id: 'u1' };
  body = { id: 'w9', d: '2026-11-05', overall: 8, motivation: 6, strength: 7 };
  await routes['PUT /api/lifestyle/session']({}, {});
  assert.equal(out.pop().code, 200);
  body = { d: '2026-11-05', energy: 4, mood: 4, stress: 2, sleep: 3, note: 'gut' };
  await routes['PUT /api/lifestyle/day']({}, {});
  assert.equal(out.pop().code, 200);
  body = { d: '2026-11-05', energy: 9, mood: 4, stress: 2, sleep: 3 };
  await routes['PUT /api/lifestyle/day']({}, {});
  assert.equal(out.pop().code, 400);
  await routes['GET /api/lifestyle']({}, {});
  const got = out.pop().obj;
  assert.equal(got.sessions.w9.overall, 8);
  assert.equal(got.days['2026-11-05'].note, 'gut');
  user = { id: 'u2' };
  await routes['GET /api/lifestyle']({}, {});
  assert.deepEqual(out.pop().obj, { sessions: {}, days: {} });
});
