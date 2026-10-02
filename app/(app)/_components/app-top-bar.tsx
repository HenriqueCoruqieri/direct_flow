import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { buildNewTicketFormOptions } from "@/app/_lib/domain/ticket"

import AppTopBarFrame from "./app-top-bar-frame"
import NewTicketBlockedButton from "./new-ticket-blocked-button"
import NewTicketDialog from "./new-ticket-dialog"

const AppTopBar = async () => {
  const facts = await getAccountFacts()
  if (!facts) notFound()

  const tags = await listActiveDepartmentTags(facts.departmentId)
  const options = buildNewTicketFormOptions(facts, tags)

  return (
    <AppTopBarFrame
      action={
        options.canCreate ? (
          <NewTicketDialog options={options} />
        ) : (
          <NewTicketBlockedButton message={options.message} />
        )
      }
    />
  )
}

export default AppTopBar
