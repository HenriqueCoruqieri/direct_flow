import { Loader2Icon } from "lucide-react"

import { cn } from "@/app/_lib/utils"
import type { CompanyLookupStatus } from "@/app/(app)/registry/companies/_hooks/use-company-lookup"

interface CompanyLookupNoticeProps {
  status: CompanyLookupStatus
}

const CompanyLookupNotice = ({ status }: CompanyLookupNoticeProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5",
      status.kind === "notice" &&
        status.tone === "warning" &&
        "text-warning-foreground",
    )}
  >
    {status.kind === "loading" ? (
      <Loader2Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
      />
    ) : null}
    {status.kind === "idle" ? null : status.message}
  </span>
)

export default CompanyLookupNotice
