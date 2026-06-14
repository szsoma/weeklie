type Props = {
  completed: number
  total: number
}

export default function RingChart({ completed, total }: Props) {
  const pct = total > 0 ? (completed / total) * 100 : 0
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle
        cx="50" cy="50" r={radius}
        fill="none" stroke="var(--rule-strong)" strokeWidth="8"
      />
      <circle
        cx="50" cy="50" r={radius}
        fill="none" stroke="var(--ink)" strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50" y="50"
        textAnchor="middle" dy="0.35em"
        fill="var(--ink)"
        className="text-lg font-mono"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  )
}
