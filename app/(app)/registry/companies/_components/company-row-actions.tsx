import { setCompanyActive } from "@/app/_lib/actions/companies"
import type { CompanyListItem } from "@/app/_lib/types/company"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import RegistryRowActions from "../../_components/registry-row-actions"
import CompanyFormDialog from "./company-form-dialog"

interface CompanyRowActionsProps {
  company: CompanyListItem
}

const CompanyRowActions = ({ company }: CompanyRowActionsProps) => {
  const statusAction = company.isActive ? (
    <DeactivateRegistryDialog
      name={company.tradeName}
      description="A empresa sai da lista de ativas. Os dados ficam guardados e você pode reativá-la depois."
      onDeactivate={() => setCompanyActive({ id: company.id, isActive: false })}
    />
  ) : (
    <ReactivateRegistryButton
      name={company.tradeName}
      onReactivate={() => setCompanyActive({ id: company.id, isActive: true })}
    />
  )

  return (
    <RegistryRowActions
      slots={[
        {
          id: "edit",
          width: "fit",
          action: <CompanyFormDialog mode="edit" company={company} />,
        },
        { id: "status", width: "md", action: statusAction },
      ]}
    />
  )
}

export default CompanyRowActions
