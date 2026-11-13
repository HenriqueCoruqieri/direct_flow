import type { CompanyLookupStatus } from "@/app/(app)/registry/companies/_hooks/use-company-lookup"

interface CompanyLookupAnnouncerProps {
  status: CompanyLookupStatus
}

const CompanyLookupAnnouncer = ({ status }: CompanyLookupAnnouncerProps) => (
  <span aria-live="polite" aria-atomic="true" className="sr-only">
    {status.kind === "idle" ? null : status.message}
  </span>
)

export default CompanyLookupAnnouncer
