import { setDepartmentActive } from "@/app/_lib/actions/departments"
import {
  checkDepartmentDeactivation,
  deactivationBlockPeopleHref,
  describeDepartmentDeactivationBlock,
  isDepartmentDeactivationLocked,
} from "@/app/_lib/domain/department"
import type { DepartmentListItem } from "@/app/_lib/types/department"
import type { DepartmentMember } from "@/app/_lib/types/department-admins"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import RegistryRowActions from "../../_components/registry-row-actions"
import DepartmentEditDialog from "./department-edit-dialog"

interface DepartmentRowActionsProps {
  department: DepartmentListItem
  members: DepartmentMember[]
}

const DepartmentRowActions = ({
  department,
  members,
}: DepartmentRowActionsProps) => {
  const check = checkDepartmentDeactivation(department)
  const isLocked = isDepartmentDeactivationLocked(check)
  const peopleHref = check.ok
    ? null
    : deactivationBlockPeopleHref(department.id, check)

  const statusAction = department.isActive ? (
    isLocked ? null : (
      <DeactivateRegistryDialog
        name={department.name}
        description="O setor deixa de receber pessoas e chamados. Você pode reativá-lo depois."
        blockedReason={
          check.ok ? null : describeDepartmentDeactivationBlock(check)
        }
        blockedLink={
          peopleHref === null
            ? null
            : { label: "Ver pessoas", href: peopleHref }
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
          id: "edit",
          width: "fit",
          action: (
            <DepartmentEditDialog department={department} members={members} />
          ),
        },
        { id: "status", width: "md", action: statusAction },
      ]}
    />
  )
}

export default DepartmentRowActions
