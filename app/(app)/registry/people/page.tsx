import type { Metadata } from "next"

import { requireRegistryAccess } from "@/app/_lib/auth/registry-access"
import { requireSession } from "@/app/_lib/auth/session"
import { listDepartmentOptions } from "@/app/_lib/data/departments"
import { listPeople } from "@/app/_lib/data/people"
import {
  canAssignRole,
  personCreationDepartments,
  personScopeFor,
} from "@/app/_lib/domain/person"
import { isDirectorAccess } from "@/app/_lib/domain/registry"

import PeopleTable from "./_components/people-table"
import PersonFormDialog from "./_components/person-form-dialog"

export const metadata: Metadata = {
  title: "Pessoas",
}

const PeoplePage = async () => {
  const actor = await requireSession()
  const access = await requireRegistryAccess()
  const isDirector = isDirectorAccess(access)
  const [people, departmentOptions] = await Promise.all([
    listPeople(personScopeFor(access)),
    listDepartmentOptions(),
  ])

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">Pessoas</h1>
          <p className="text-caption text-muted-foreground">
            {isDirector
              ? "Cadastre, edite e ative ou desative todas as pessoas da organização."
              : "Cadastre, edite e ative ou desative as pessoas do seu setor e as não alocadas."}
          </p>
        </div>
        {isDirector ? (
          <PersonFormDialog
            mode="create"
            departments={personCreationDepartments(departmentOptions)}
            canAssignRole={canAssignRole(access)}
          />
        ) : (
          <PersonFormDialog mode="create" departmentId={access.departmentId} />
        )}
      </div>

      <PeopleTable
        people={people}
        access={access}
        actorId={actor.id}
        departmentOptions={departmentOptions}
      />
    </div>
  )
}

export default PeoplePage
