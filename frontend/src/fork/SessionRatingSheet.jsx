// Lifestyle (fork addition): "How was it?" after every workout. Opened by doFinishWorkout in
// sheets.jsx (the one line there, see FORK.md) and from the Ich page for a session not rated yet.
// Swiping it away skips it; the session can still be rated later on the Ich page.
import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { Button, TextArea } from '../components/ui.jsx'
import ScorePicker from './ScorePicker.jsx'
import { SESSION_QUESTIONS, SESSION_MAX, complete } from './lifestyle-core.js'
import { useLifestyle } from './lifestyle-store.js'
import './lifestyle.css'

function SessionRating({ w, close }) {
  const prev = useLifestyle.getState().data().sessions[w.id] || {}
  const [vals, setVals] = useState({ overall: prev.overall, motivation: prev.motivation, strength: prev.strength })
  const [note, setNote] = useState(prev.note || '')
  const ready = complete(vals, SESSION_QUESTIONS, SESSION_MAX)

  const save = () => {
    useLifestyle.getState().saveSession({ id: w.id, d: w.d || todayISO(), ...vals, note })
    close()
    useUI.getState().toast('Bewertung gespeichert')
  }

  return (
    <div className="ls-sheet">
      <h3>Wie war dein Training?</h3>
      <p className="ls-sub">{w.name ? w.name + ' · ' : ''}Es zählt, wie du dich gefühlt hast, nicht was du geschafft hast.</p>
      {SESSION_QUESTIONS.map(q => (
        <ScorePicker key={q.key} label={q.label} max={SESSION_MAX} low={q.low} high={q.high}
          value={vals[q.key]} onChange={n => setVals(v => ({ ...v, [q.key]: n }))} />
      ))}
      <TextArea className="ls-note" rows={2} maxLength={500} placeholder="Notiz (optional), z. B. schlecht geschlafen, Knie zwickt"
        value={note} onChange={e => setNote(e.target.value)} />
      <div className="ls-actions">
        <Button variant="primary" disabled={!ready} onClick={save}>Speichern</Button>
        <Button variant="plain" onClick={close}>Später</Button>
      </div>
    </div>
  )
}

/** Open the rating for a finished workout `w` (needs w.id, uses w.d and w.name). */
export function openSessionRating(w) {
  if (!w || w.id == null) return
  useUI.getState().openSheet(close => <SessionRating w={w} close={close} />)
}
