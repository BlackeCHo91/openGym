// Lifestyle (fork addition, not part of upstream openGym).
//
// How a session felt and how the day feels, as the person rates it: kept beside the profile, in
// DATA_DIR/lifestyle-<uid>.json, and never inside state-<uid>.json. Upstream's sync, merge and
// stamps stay untouched, and an upstream update cannot clash with this file.
//
//   sessions: { [workoutId]: { d, overall, motivation, strength, note, at } }   1 to 10
//   days:     { [YYYY-MM-DD]: { energy, mood, stress, sleep, note, at } }       1 to 5
//
// The whole module is wired into server.js with one line (see FORK.md).
import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from './durable.js';

export const SESSION_FIELDS = ['overall', 'motivation', 'strength'];
export const DAY_FIELDS = ['energy', 'mood', 'stress', 'sleep'];
const NOTE_MAX = 500;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function score(v, max) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}
function note(v) {
  return typeof v === 'string' ? v.trim().slice(0, NOTE_MAX) : '';
}

/** A session rating from a request body, or a string saying what is wrong with it. */
export function cleanSession(b) {
  if (!b || typeof b !== 'object') return 'body required';
  const id = typeof b.id === 'string' || typeof b.id === 'number' ? String(b.id).slice(0, 64) : '';
  if (!id) return 'id required';
  if (!ISO_DAY.test(String(b.d || ''))) return 'd must be YYYY-MM-DD';
  const out = { id, d: b.d };
  for (const k of SESSION_FIELDS) {
    const s = score(b[k], 10);
    if (s == null) return k + ' must be a whole number from 1 to 10';
    out[k] = s;
  }
  out.note = note(b.note);
  return out;
}

/** A day's barometer from a request body, or a string saying what is wrong with it. */
export function cleanDay(b) {
  if (!b || typeof b !== 'object') return 'body required';
  if (!ISO_DAY.test(String(b.d || ''))) return 'd must be YYYY-MM-DD';
  const out = { d: b.d };
  for (const k of DAY_FIELDS) {
    const s = score(b[k], 5);
    if (s == null) return k + ' must be a whole number from 1 to 5';
    out[k] = s;
  }
  out.note = note(b.note);
  return out;
}

export function emptyLifestyle() { return { sessions: {}, days: {} }; }

export function readLifestyle(dir, uid) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'lifestyle-' + uid + '.json'), 'utf8'));
    return {
      sessions: raw && typeof raw.sessions === 'object' && raw.sessions ? raw.sessions : {},
      days: raw && typeof raw.days === 'object' && raw.days ? raw.days : {},
    };
  } catch (e) {
    if (e.code === 'ENOENT') return emptyLifestyle();
    throw e;
  }
}

export function writeLifestyle(dir, uid, data) {
  atomicWrite(path.join(dir, 'lifestyle-' + uid + '.json'), JSON.stringify(data));
}

/** The routes, built on server.js's own helpers so auth and CSRF behave like every other route. */
export function lifestyleRoutes({ dir, readSession, readBody, json }) {
  const signedIn = (req, res) => {
    const user = readSession(req);
    if (!user) json(res, 401, { error: 'not signed in' });
    return user;
  };
  return {
    'GET /api/lifestyle': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      json(res, 200, readLifestyle(dir, user.id));
    },
    'PUT /api/lifestyle/session': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const r = cleanSession(await readBody(req));
      if (typeof r === 'string') return json(res, 400, { error: r });
      const data = readLifestyle(dir, user.id);
      const { id, ...rest } = r;
      data.sessions[id] = { ...rest, at: Date.now() };
      writeLifestyle(dir, user.id, data);
      json(res, 200, { ok: true, id, rating: data.sessions[id] });
    },
    'PUT /api/lifestyle/day': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const r = cleanDay(await readBody(req));
      if (typeof r === 'string') return json(res, 400, { error: r });
      const data = readLifestyle(dir, user.id);
      const { d, ...rest } = r;
      data.days[d] = { ...rest, at: Date.now() };
      writeLifestyle(dir, user.id, data);
      json(res, 200, { ok: true, d, day: data.days[d] });
    },
  };
}
