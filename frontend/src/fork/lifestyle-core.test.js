import { describe, it, expect } from 'vitest'
import { complete, applyItem, withPending, enqueue, shouldRetry, daysBefore, averages, SESSION_QUESTIONS, SESSION_MAX, DAY_QUESTIONS, DAY_MAX, emptyData } from './lifestyle-core.js'

describe('lifestyle core (fork)', () => {
  it('needs every question answered in range', () => {
    expect(complete({ overall: 5, motivation: 3, strength: 10 }, SESSION_QUESTIONS, SESSION_MAX)).toBe(true)
    expect(complete({ overall: 5, motivation: 3 }, SESSION_QUESTIONS, SESSION_MAX)).toBe(false)
    expect(complete({ energy: 6, mood: 1, stress: 1, sleep: 1 }, DAY_QUESTIONS, DAY_MAX)).toBe(false)
  })

  it('applies a session and a day', () => {
    let d = applyItem(emptyData(), { kind: 'session', body: { id: 'w1', d: '2026-11-05', overall: 7, motivation: 6, strength: 5, note: '' } }, 1)
    d = applyItem(d, { kind: 'day', body: { d: '2026-11-05', energy: 3, mood: 4, stress: 2, sleep: 4, note: 'ok' } }, 2)
    expect(d.sessions.w1).toEqual({ d: '2026-11-05', overall: 7, motivation: 6, strength: 5, note: '', at: 1 })
    expect(d.days['2026-11-05'].note).toBe('ok')
  })

  it('keeps only the newest queued save per session or day', () => {
    let q = enqueue([], { kind: 'day', body: { d: '2026-11-05', energy: 1 } })
    q = enqueue(q, { kind: 'session', body: { id: 'w1' } })
    q = enqueue(q, { kind: 'day', body: { d: '2026-11-05', energy: 4 } })
    expect(q).toHaveLength(2)
    expect(q[1].body.energy).toBe(4)
  })

  it('lays queued saves over the server copy', () => {
    const server = { sessions: {}, days: { '2026-11-04': { energy: 2 } } }
    const merged = withPending(server, [{ kind: 'day', at: 5, body: { d: '2026-11-05', energy: 4 } }])
    expect(Object.keys(merged.days).sort()).toEqual(['2026-11-04', '2026-11-05'])
  })

  it('retries offline and server errors, drops a refused body', () => {
    expect(shouldRetry(new Error('offline'))).toBe(true)
    expect(shouldRetry({ status: 503 })).toBe(true)
    expect(shouldRetry({ status: 401 })).toBe(true)
    expect(shouldRetry({ status: 400 })).toBe(false)
  })

  it('counts calendar days back across a month', () => {
    expect(daysBefore('2026-11-05', 6)).toBe('2026-10-30')
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28')
  })

  it('averages the last seven days only', () => {
    const data = {
      sessions: { a: { d: '2026-11-05', overall: 8, motivation: 6, strength: 7 }, b: { d: '2026-11-01', overall: 4, motivation: 4, strength: 4 }, old: { d: '2026-10-01', overall: 1, motivation: 1, strength: 1 } },
      days: { '2026-11-05': { energy: 4, mood: 4, stress: 2, sleep: 3 }, '2026-11-04': { energy: 2, mood: 3, stress: 4, sleep: 2 } },
    }
    const a = averages(data, '2026-11-05')
    expect(a.sessions).toBe(2)
    expect(a.overall).toBe(6)
    expect(a.energy).toBe(3)
    expect(a.stress).toBe(3)
  })
})
