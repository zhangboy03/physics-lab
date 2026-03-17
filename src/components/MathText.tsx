import katex from 'katex'

interface MathTextProps {
  math: string
  block?: boolean
  className?: string
}

export default function MathText({
  math,
  block = false,
  className,
}: MathTextProps) {
  const html = katex.renderToString(math, {
    displayMode: block,
    throwOnError: false,
    strict: 'ignore',
  })

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
