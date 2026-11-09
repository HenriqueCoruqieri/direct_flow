import { useWatch } from "react-hook-form"

import {
  type CompanyFormValues,
  type CompanyRequiredField,
  isCompanyRequiredFieldValid,
} from "@/app/_lib/validation/company"

interface CompanyRequiredMarkProps {
  field: CompanyRequiredField
}

const CompanyRequiredMark = ({ field }: CompanyRequiredMarkProps) => {
  const missing = useWatch<CompanyFormValues, CompanyRequiredField>({
    name: field,
    compute: (value) => !isCompanyRequiredFieldValid(field, value),
  })

  if (!missing) return null

  return (
    <span aria-hidden="true" className="text-destructive">
      *
    </span>
  )
}

export default CompanyRequiredMark
