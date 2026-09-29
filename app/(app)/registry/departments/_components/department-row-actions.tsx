import { setDepartmentActive } from "@/app/_lib/actions/departments"
import {
  checkDepartmentDeactivation,
  describeDepartmentDeactivationBlock,
} from "@/app/_lib/domain/department"
import type { DepartmentListItem } from "@/app/_lib/types/department"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import RegistryRowActions from "../../_components/registry-row-actions"
import DepartmentFormDialog from "./department-form-dialog"

interface DepartmentRowActionsProps {
  department: DepartmentListItem
}

const DepartmentRowActions = ({ department }: DepartmentRowActionsProps) => {
  const check = checkDepartmentDeactivation(department)
  const isLocked =
    !check.ok &&
    (check.reason === "IS_BOARD" || check.reason === "IS_UNASSIGNED")

  const statusAction = department.isActive ? (
    isLocked ? null : (
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
  )

  return (
    <RegistryRowActions
      slots={[
        {
          id: "rename",
          width: "fit",
          action: (
            <DepartmentFormDialog mode="rename" department={department} />
          ),
        },
        { id: "status", width: "md", action: statusAction },
      ]}
    />
  )
}

export default DepartmentRowActions
