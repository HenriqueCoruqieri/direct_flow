import IllustrativeBadge from "./illustrative-badge"

interface StatHintProps {
  text: string
  illustrative?: boolean
}

const StatHint = ({ text, illustrative = false }: StatHintProps) => {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        title={text}
        className="truncate text-xs font-bold text-text-tertiary"
      >
        {text}
      </span>
      {illustrative ? <IllustrativeBadge /> : null}
    </div>
  )
}

export default StatHint
