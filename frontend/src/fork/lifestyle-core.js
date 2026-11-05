// Lifestyle (fork addition): the pure part. No imports, no React, so it is easy to test and the
// later daily analysis can reuse it. See FORK.md.
//
// The idea behind it: what you felt counts next to what you lifted. A session with more weight
// and more reps can still have felt flat, and a night the watch calls good can still have felt
// bad. Both get recorded, by you, and later sit beside the hard numbers.

/* After every workout, 1 to 10. */
export const SESSION_QUESTIONS = [
  { key: 'overall', label: 'Wie hat sich das Training angefühlt?', low: 'schlecht', high: 'super' },
  { key: 'motivation', label: 'Wie motiviert warst du?', low: 'gar nicht', high: 'voll' },
  { key: 'strength', label: 'Wie kraftvoll hast du dich gefühlt?', low: 'kraftlos', high: 'stark' },
]
export const SESSION_MAX = 10

/* Once a day, 1 to 5. Stress is the one where high is bad. */
export const DAY_QUESTIONS = [
  { key: 'energy', label: 'Energie', low: 'leer', high: 'voller Energie' },
  { key: 'mood', label: 'Stimmung', low: 'mies', high: 'super' },
  { key: 'stress', label: 'Stress', low: 'entspannt', high: 'sehr gestresst', inverted: true },
  { key: 'sleep', label: 'Schlaf (gefühlt)', low: 'miserabel', high: 'erholsam' },
]
export const DAY_MAX = 5

export function emptyData() { return { sessions: {}, days: {} } }

/** Is every question answered with a whole number in range? */
export function complete(values, questions, max) {
  return questions.every(q => Number.isInteger(values?.[q.key]) && values[q.key] >= 1 && values[q.key] <= max)
}

/** The data with one saved item applied: what the screen shows before the server confirms. */
export function applyItem(data, item, now = Date.now()) {
  const base = data || emptyData()
  if (item.kind === 'session') {
    const { id, ...rest } = item.body
    return { ...base, sessions: { ...base.sessions, [id]: { ...rest, at: now } } }
  }
  if (item.kind === 'day') {
    const { d, ...rest } = item.body
    return { ...base, days: { ...base.days, [d]: { ...rest, at: now } } }
  }
  return base
}

/** The server's answer with the queued items that have not reached it yet laid on top. */
export function withPending(server, queue) {
  return (queue || []).reduce((acc, item) => applyItem(acc, item, item.at), server || emptyData())
}

/** A newer save for the same session or day replaces the queued one instead of piling up. */
export function enqueue(queue, item) {
  const same = q => q.kind === item.kind && (item.kind === 'session' ? q.body.id === item.body.id : q.body.d === item.body.d)
  return [...(queue || []).filter(q => !same(q)), item]
}

/**
 * What to do with a queued item after a failed send. No status (offline, timeout), a server
 * error or "not signed in" is worth trying again later. Anything else (a 400) never will be.
 */
export function shouldRetry(err) {
  const s = err && err.status
  return !s || s >= 500 || s === 401 || s === 408 || s === 429
}

/** YYYY-MM-DD `n` days before `iso` (local calendar days, no time zone drift). */
export function daysBefore(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1, d - n)
  const p = v => String(v).padStart(2, '0')
  return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate())
}

function mean(xs) {
  const v = xs.filter(x => Number.isFinite(x))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null
}

/**
 * Averages over the last `span` days up to and including `today`: one per question, null where
 * nothing was rated. Sessions are read by their workout date (`d`).
 */
export function averages(data, today, span = 7) {
  const from = daysBefore(today, span - 1)
  const inRange = d => typeof d === 'string' && d >= from && d <= today
  const days = Object.entries(data?.days || {}).filter(([d]) => inRange(d)).map(([, v]) => v)
  const sessions = Object.values(data?.sessions || {}).filter(s => inRange(s.d))
  const out = { days: days.length, sessions: sessions.length }
  for (const q of DAY_QUESTIONS) out[q.key] = mean(days.map(v => v[q.key]))
  for (const q of SESSION_QUESTIONS) out[q.key] = mean(sessions.map(v => v[q.key]))
  return out
}
