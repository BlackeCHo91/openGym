// Lifestyle (fork addition): the "Ich" tab. How you feel today, how your last sessions felt, the
// week at a glance, and the ways on to Body and the exercise library (whose tab this one took).
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { isOn } from '../lib/modules.js'
import { Section, Row } from '../components/ui.jsx'
import DayBarometer from './DayBarometer.jsx'
import { openSessionRating } from './SessionRatingSheet.jsx'
import { useLifestyle } from './lifestyle-store.js'
import { withPending, averages, DAY_QUESTIONS, SESSION_QUESTIONS } from './lifestyle-core.js'
import './lifestyle.css'

const SHORT = { overall: 'Gefühl', motivation: 'Motivation', strength: 'Kraft' }

export default function Me() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const server = useLifestyle(s => s.server)
  const queue = useLifestyle(s => s.queue)
  const loading = useLifestyle(s => s.loading)
  const data = useMemo(() => withPending(server, queue), [server, queue])
  const today = todayISO()

  useEffect(() => { useLifestyle.getState().load() }, [])

  const recent = useMemo(() => [...(S.workouts || [])]
    .sort((a, b) => (b.start || 0) - (a.start || 0)).slice(0, 6), [S.workouts])
  const week = averages(data, today, 7)
  const fmt = v => v == null ? '–' : String(v).replace('.', ',')

  return <>
    <div className="hdr"><div style={{ flex: 1 }}><h1>Ich</h1>
      <div className="sub">{fmtDate(today, true)}{queue.length ? ' · ' + queue.length + ' wartet auf Verbindung' : loading ? ' · lädt…' : ''}</div></div></div>

    <Section title="Wie geht's dir heute?">
      <DayBarometer day={today} saved={data.days[today]} />
    </Section>

    <Section title="Letzte Trainings" footer={recent.length ? 'Tippe auf ein Training, um es zu bewerten oder die Bewertung zu ändern.' : null}>
      {recent.length ? recent.map(w => {
        const r = data.sessions[w.id]
        return <Row key={w.id} icon={r ? 'checkCircle' : 'pencil'} iconTint={r ? 'var(--green)' : 'var(--orange)'}
          title={(w.name || 'Training') + ' · ' + fmtDate(w.d, false)}
          subtitle={r ? SESSION_QUESTIONS.map(q => SHORT[q.key] + ' ' + r[q.key]).join(' · ') : 'Noch nicht bewertet'}
          accessory="chevron" onClick={() => openSessionRating(w)} />
      }) : <Row icon="dumbbell" title="Noch keine Trainings" subtitle="Nach deinem ersten Training wirst du hier gefragt, wie es war." />}
    </Section>

    <Section title="Letzte 7 Tage" footer="Durchschnitt deiner eigenen Einschätzung. Tagesbarometer 1 bis 5, Trainings 1 bis 10.">
      {DAY_QUESTIONS.map(q => <Row key={q.key} title={q.label} value={fmt(week[q.key])} />)}
      {SESSION_QUESTIONS.map(q => <Row key={q.key} title={'Training: ' + SHORT[q.key]} value={fmt(week[q.key])} />)}
      <Row title="Erfasst" value={week.days + ' Tage · ' + week.sessions + ' Trainings'} />
    </Section>

    <Section title="Mehr">
      {isOn(S, 'body') && <Row icon="scale" iconTint="var(--teal)" title="Körper" subtitle="Gewicht und Messungen" accessory="chevron" onClick={() => nav('/measurements')} />}
      <Row icon="dumbbell" iconTint="var(--blue)" title="Übungen" subtitle="Die Übungsbibliothek" accessory="chevron" onClick={() => nav('/library')} />
      <Row icon="figureStrength" iconTint="var(--purple)" title="Muskeln" accessory="chevron" onClick={() => nav('/muscles')} />
    </Section>
  </>
}
