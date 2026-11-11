import {
  PRODUCTION_CARD_LABEL,
  productionEmptyCopy,
  productionEntryLabel,
  productionScrollHint,
  productionSubtitle,
} from "@/app/_lib/domain/operations"
import type { TeamProductionEntry } from "@/app/_lib/types/operations"

import ProductionChart from "./production-chart"
import ProductionPanelFrame from "./production-panel-frame"

const MOBILE_VISIBLE_BARS = 5

interface ProductionPanelProps {
  entries: TeamProductionEntry[]
  sessionUserId: number
  filter: React.ReactNode
}

const ProductionPanel = ({
  entries,
  sessionUserId,
  filter,
}: ProductionPanelProps) => {
  const emptyCopy = productionEmptyCopy(entries)

  return (
    <ProductionPanelFrame
      subtitle={productionSubtitle(entries)}
      filter={filter}
    >
      {emptyCopy !== null ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-semibold">{emptyCopy.title}</p>
          <p className="max-w-md text-caption text-muted-foreground">
            {emptyCopy.description}
          </p>
        </div>
      ) : (
        <>
          <ProductionChart entries={entries} sessionUserId={sessionUserId} />
          {entries.length > MOBILE_VISIBLE_BARS ? (
            <p
              aria-hidden="true"
              className="text-caption text-muted-foreground sm:hidden"
            >
              {productionScrollHint(entries.length)}
            </p>
          ) : null}
          <div className="sr-only">
            <table>
              <caption>{PRODUCTION_CARD_LABEL}</caption>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.userId}>
                    <td>{productionEntryLabel(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ProductionPanelFrame>
  )
}

export default ProductionPanel
