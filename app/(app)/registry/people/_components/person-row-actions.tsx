import { setPersonActive } from "@/app/_lib/actions/people"
import {
  canAssignRole,
  checkPasswordRestore,
  checkPersonActivation,
  PERSON_DENIAL_MESSAGES,
  personMoveDepartments,
} from "@/app/_lib/domain/person"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import RegistryRowActions from "../../_components/registry-row-actions"
import PersonFormDialog from "./person-form-dialog"
import type { PersonRow } from "./person-row"
import RestorePasswordDialog from "./restore-password-dialog"

interface PersonRowActionsProps {
  person: PersonRow
}

const PersonRowActions = ({ person }: PersonRowActionsProps) => {
  const { access, actorId, departmentOptions } = person.context
  const deactivation = checkPersonActivation(access, actorId, person, false)
  const reactivation = checkPersonActivation(access, actorId, person, true)
  const passwordRestore = checkPasswordRestore(access, actorId, person)
  const isSelfDeactivation =
    !deactivation.ok && deactivation.reason === "SELF_DEACTIVATION"

  const statusAction = person.isActive ? (
    isSelfDeactivation ? null : (
      <DeactivateRegistryDialog
        name={person.name}
        description="A pessoa perde o acesso na hora e as sessões abertas são encerradas. Você pode reativá-la depois."
        blockedReason={
          deactivation.ok ? null : PERSON_DENIAL_MESSAGES[deactivation.reason]
        }
        onDeactivate={() => setPersonActive({ id: person.id, isActive: false })}
      />
    )
  ) : (
    <ReactivateRegistryButton
      name={person.name}
      disabledReason={
        reactivation.ok ? null : PERSON_DENIAL_MESSAGES[reactivation.reason]
      }
      onReactivate={() => setPersonActive({ id: person.id, isActive: true })}
    />
  )

  return (
    <RegistryRowActions
      slots={[
        {
          id: "edit",
          width: "fit",
          action: (
            <PersonFormDialog
              mode="edit"
              person={person}
              departments={personMoveDepartments(
                access,
                departmentOptions,
                person.departmentId,
              )}
              canAssignRole={canAssignRole(access)}
            />
          ),
        },
        { id: "status", width: "md", action: statusAction },
        {
          id: "restore-password",
          width: "lg",
          action: passwordRestore.ok ? (
            <RestorePasswordDialog personId={person.id} name={person.name} />
          ) : null,
        },
      ]}
    />
  )
}

export default PersonRowActions
