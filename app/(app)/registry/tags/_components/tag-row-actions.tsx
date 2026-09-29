import { setTagActive } from "@/app/_lib/actions/tags"
import { TAG_DEPARTMENT_INACTIVE_MESSAGE } from "@/app/_lib/domain/tag"
import type { TagListItem } from "@/app/_lib/types/tag"

import DeactivateRegistryDialog from "../../_components/deactivate-registry-dialog"
import ReactivateRegistryButton from "../../_components/reactivate-registry-button"
import RegistryRowActions from "../../_components/registry-row-actions"
import TagFormDialog from "./tag-form-dialog"

interface TagRowActionsProps {
  tag: TagListItem
}

const TagRowActions = ({ tag }: TagRowActionsProps) => {
  const statusAction = tag.isActive ? (
    <DeactivateRegistryDialog
      name={tag.name}
      description="A tag deixa de ser oferecida em chamados novos. Chamados que já a usam não mudam, e você pode reativá-la depois."
      onDeactivate={() => setTagActive({ id: tag.id, isActive: false })}
    />
  ) : (
    <ReactivateRegistryButton
      name={tag.name}
      disabledReason={
        tag.departmentIsActive ? null : TAG_DEPARTMENT_INACTIVE_MESSAGE
      }
      onReactivate={() => setTagActive({ id: tag.id, isActive: true })}
    />
  )

  return (
    <RegistryRowActions
      slots={[
        {
          id: "rename",
          width: "fit",
          action: <TagFormDialog mode="rename" tag={tag} />,
        },
        { id: "status", width: "md", action: statusAction },
      ]}
    />
  )
}

export default TagRowActions
