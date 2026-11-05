// Lifestyle (fork addition): one question, a row of numbers to tap. Big enough for a thumb that
// has just finished a set. Labels at both ends say what low and high mean for this question.
export default function ScorePicker({ label, value, max, low, high, inverted, onChange }) {
  const nums = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="ls-q">
      <div className="ls-q-label">{label}</div>
      <div className={'ls-scale ls-scale-' + max + (inverted ? ' inverted' : '')} role="radiogroup" aria-label={label}>
        {nums.map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n}
            className={'ls-num' + (value === n ? ' on' : '')} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div className="ls-ends"><span>{low}</span><span>{high}</span></div>
    </div>
  )
}
