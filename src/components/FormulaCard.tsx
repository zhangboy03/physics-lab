interface FormulaCardProps {
  formulas: string[]
  title?: string
}

export default function FormulaCard({
  formulas,
  title = '核心公式',
}: FormulaCardProps) {
  return (
    <div className="lab-panel rounded-[1.5rem] p-5">
      <div className="panel-caption">Physics Notes</div>
      <h4 className="mt-2 text-[20px] font-semibold text-[var(--color-ink)]">{title}</h4>
      <div className="paper-rule mt-5" />
      <div className="mt-5 space-y-3">
        {formulas.map((formula, index) => (
          <div
            key={`${formula}-${index}`}
            className="formula-chip mono-data px-4 py-3 text-[14px] text-[var(--color-ink)]"
          >
            {formula}
          </div>
        ))}
      </div>
    </div>
  )
}
