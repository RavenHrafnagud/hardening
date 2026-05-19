interface MetricCardProps {
  label: string
  value: number
  tone: 'ink' | 'green' | 'blue' | 'amber'
}

export function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
