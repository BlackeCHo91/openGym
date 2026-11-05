// Lifestyle (fork addition): talks to /api/lifestyle and keeps a small queue for saves made
// without a connection (the gym basement). The queue and a copy of the last answer live in
// localStorage per user, so a rating made offline survives a closed app and shows right away.
import { create } from 'zustand'
import { api } from '../lib/api.js'
import { useStore } from '../store/useStore.js'
import { emptyData, applyItem, withPending, enqueue, shouldRetry } from './lifestyle-core.js'

const uidNow = () => useStore.getState().user?.id || 'local'
const key = name => 'lifestyle_' + name + '_v1:' + uidNow()

function readLS(name, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key(name))); return v ?? fallback } catch { return fallback }
}
function writeLS(name, value) {
  try { localStorage.setItem(key(name), JSON.stringify(value)) } catch { /* private mode, full storage */ }
}

export const useLifestyle = create((set, get) => ({
  server: readLS('cache', emptyData()),
  queue: readLS('queue', []),
  loading: false,
  error: null,

  /** What the screens show: the server's copy with not-yet-sent saves on top. */
  data() { return withPending(get().server, get().queue) },

  async load() {
    // A different profile signed in on this device since the store was made.
    set({ server: readLS('cache', emptyData()), queue: readLS('queue', []) })
    if (!useStore.getState().user) return
    set({ loading: true })
    try {
      await get().flush()
      const server = await api('/api/lifestyle')
      writeLS('cache', server)
      set({ server, error: null })
    } catch (e) {
      set({ error: e.message || 'offline' })
    } finally { set({ loading: false }) }
  },

  /** Save a session rating: body { id, d, overall, motivation, strength, note }. */
  saveSession(body) { return get().save({ kind: 'session', body, at: Date.now() }) },
  /** Save a day: body { d, energy, mood, stress, sleep, note }. */
  saveDay(body) { return get().save({ kind: 'day', body, at: Date.now() }) },

  async save(item) {
    const queue = enqueue(get().queue, item)
    writeLS('queue', queue)
    set({ queue })
    await get().flush()
  },

  async flush() {
    if (!useStore.getState().user) return
    let queue = [...get().queue]
    while (queue.length) {
      const item = queue[0]
      try {
        await api('/api/lifestyle/' + item.kind, { method: 'PUT', body: JSON.stringify(item.body) })
        const server = applyItem(get().server, item, item.at)
        writeLS('cache', server)
        set({ server })
      } catch (e) {
        if (shouldRetry(e)) break
        console.warn('lifestyle: a save was refused and dropped', e.message, item)
      }
      queue = queue.slice(1)
      writeLS('queue', queue)
      set({ queue })
    }
  },
}))

// Send what waited as soon as the connection is back, and when the app comes to the front.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useLifestyle.getState().flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useLifestyle.getState().queue.length) useLifestyle.getState().flush()
  })
}
