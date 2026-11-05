// Lifestyle (fork addition): today's barometer on the Ich page. Four taps and done; once saved
// it folds to a summary that can be opened again to change it.
import { useEffect, useState } from 'react'
import { Button, TextArea } from '../components/ui.jsx'
import ScorePicker from './ScorePicker.jsx'
import { DAY_QUESTIONS, DAY_MAX, complete } from './lifestyle-core.js'
import { useLifestyle } from './lifestyle-store.js'

export default function DayBarometer({ day, saved }) {
  const [editing, setEditing] = useState(!saved)
  const [vals, setVals] = useState(() => pick(saved))
  const [note, setNote] = useState(saved?.note || '')
  // The server's copy arriving after the page opened: show it, unless a change is in progress.
  useEffect(() => { if (saved && !editing) { setVals(pick(saved)); setNote(saved.note || '') } }, [saved, editing])
  useEffect(() => { if (!saved) setEditing(true) }, [saved])

  if (!editing && saved) {
    return (
      <div className="ls-card">
        <div className="ls-summary">
          {DAY_QUESTIONS.map(q => (
            <div key={q.key} className="ls-chip"><span className="ls-chip-v">{saved[q.key]}</span><span className="ls-chip-l">{q.label}</span></div>
          ))}
        </div>
        {saved.note && <p className="ls-note-show">{saved.note}</p>}
        <Button variant="tinted" size="sm" icon="pencil" onClick={() => setEditing(true)}>Ändern</Button>
      </div>
    )
  }

  const ready = complete(vals, DAY_QUESTIONS, DAY_MAX)
  const save = () => {
    useLifestyle.getState().saveDay({ d: day, ...vals, note })
    setEditing(false)
  }
  return (
    <div className="ls-card">
      {DAY_QUESTIONS.map(q => (
        <ScorePicker key={q.key} label={q.label} max={DAY_MAX} low={q.low} high={q.high} inverted={q.inverted}
          value={vals[q.key]} onChange={n => setVals(v => ({ ...v, [q.key]: n }))} />
      ))}
      <TextArea className="ls-note" rows={2} maxLength={500} placeholder="Notiz (optional), z. B. erkältet, viel Arbeit"
        value={note} onChange={e => setNote(e.target.value)} />
      <div className="ls-actions">
        <Button variant="primary" disabled={!ready} onClick={save}>Speichern</Button>
        {saved && <Button variant="plain" onClick={() => { setVals(pick(saved)); setNote(saved.note || ''); setEditing(false) }}>Abbrechen</Button>}
      </div>
    </div>
  )
}

function pick(v) {
  return Object.fromEntries(DAY_QUESTIONS.map(q => [q.key, v?.[q.key]]))
}
