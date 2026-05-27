interface MetricCardProps {
  label: string
  value: number
  tone: 'ink' | 'green' | 'blue' | 'amber'
}

/**
 * Componente pequeño para mostrar una métrica con estilo.
 * - `tone` controla la paleta visual.
 */
export function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
