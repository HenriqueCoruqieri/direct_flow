import type { OperationsTab } from "@/app/_lib/types/operations"

import GoalPanelSkeleton from "./goal-panel-skeleton"
import ProductionSkeleton from "./production-skeleton"

interface OperationsTabSkeletonProps {
  tab: OperationsTab
  filter?: React.ReactNode
}

const OperationsTabSkeleton = ({
  tab,
  filter = null,
}: OperationsTabSkeletonProps) => {
  switch (tab) {
    case "meu-objetivo":
      return <GoalPanelSkeleton scope="person" />
    case "time":
      return <GoalPanelSkeleton scope="team" />
    case "producao":
      return <ProductionSkeleton filter={filter} />
  }
}

export default OperationsTabSkeleton
