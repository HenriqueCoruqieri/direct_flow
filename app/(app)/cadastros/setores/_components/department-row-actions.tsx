import { setDepartmentActive } from "@/app/_lib/actions/departments"
import {
  checkDepartmentDeactivation,
  describeDepartmentDeactivationBlock,
} from "@/app/_lib/domain/department"
import type { DepartmentListItem } from "@/app/_lib/types/department"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import DepartmentFormDialog from "./department-form-dialog"

interface DepartmentRowActionsProps {
  department: DepartmentListItem
}

const DepartmentRowActions = ({ department }: DepartmentRowActionsProps) => {
  const check = checkDepartmentDeactivation(department)
  const isBoardLocked = !check.ok && check.reason === "IS_BOARD"

  return (
    <div className="flex items-center justify-end gap-1">
      <DepartmentFormDialog mode="rename" department={department} />
      {department.isActive ? (
        isBoardLocked ? null : (
          <DeactivateRegistryDialog
            name={department.name}
            description="O setor deixa de receber pessoas e chamados. Você pode reativá-lo depois."
            blockedReason={
              check.ok ? null : describeDepartmentDeactivationBlock(check)
            }
            onDeactivate={() =>
              setDepartmentActive({ id: department.id, isActive: false })
            }
          />
        )
      ) : (
        <ReactivateRegistryButton
          name={department.name}
          onReactivate={() =>
            setDepartmentActive({ id: department.id, isActive: true })
          }
        />
      )}
    </div>
  )
}

export default DepartmentRowActions
