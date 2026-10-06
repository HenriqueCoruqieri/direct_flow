import { notFound } from "next/navigation"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { listTicketAssigneeOptions } from "@/app/_lib/data/people"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { buildNewTicketFormOptions } from "@/app/_lib/domain/ticket"

import AppTopBarFrame from "./app-top-bar-frame"
import NewTicketBlockedButton from "./new-ticket-blocked-button"
import NewTicketDialog from "./new-ticket-dialog"

const AppTopBar = async () => {
  const [facts, actor] = await Promise.all([getAccountFacts(), getSession()])
  if (!facts || !actor) notFound()

  const [tags, assignees] = await Promise.all([
    listActiveDepartmentTags(facts.departmentId),
    listTicketAssigneeOptions(facts.departmentId),
  ])
  const options = buildNewTicketFormOptions(facts, actor, tags, assignees)

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
