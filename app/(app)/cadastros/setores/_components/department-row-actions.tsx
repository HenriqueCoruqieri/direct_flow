import type { DepartmentListItem } from "@/app/_lib/types/department"

import DeactivateDepartmentDialog from "./deactivate-department-dialog"
import DepartmentFormDialog from "./department-form-dialog"
import ReactivateDepartmentButton from "./reactivate-department-button"

interface DepartmentRowActionsProps {
  department: DepartmentListItem
}

const DepartmentRowActions = ({ department }: DepartmentRowActionsProps) => (
  <div className="flex items-center justify-end gap-1">
    <DepartmentFormDialog mode="rename" department={department} />
    {department.isActive ? (
      <DeactivateDepartmentDialog department={department} />
    ) : (
      <ReactivateDepartmentButton department={department} />
    )}
  </div>
)

export default DepartmentRowActions
