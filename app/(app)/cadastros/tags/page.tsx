import type { Metadata } from "next"

import { requireRegistryAccess } from "@/app/_lib/auth/registry-access"
import { listDepartmentOptions } from "@/app/_lib/data/departments"
import { listTags } from "@/app/_lib/data/tags"
import { isDirectorAccess } from "@/app/_lib/domain/registry"
import { tagCreationDepartments, tagScopeFor } from "@/app/_lib/domain/tag"
import type { DepartmentOption } from "@/app/_lib/types/department"

import TagFormDialog from "./_components/tag-form-dialog"
import TagsTable from "./_components/tags-table"

export const metadata: Metadata = {
  title: "Tags",
}

const NO_DEPARTMENT_OPTIONS: DepartmentOption[] = []

const TagsPage = async () => {
  const access = await requireRegistryAccess()
  const isDirector = isDirectorAccess(access)
  const [tags, departmentOptions] = await Promise.all([
    listTags(tagScopeFor(access)),
    isDirector ? listDepartmentOptions() : NO_DEPARTMENT_OPTIONS,
  ])

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">Tags</h1>
          <p className="text-caption text-muted-foreground">
            {isDirector
              ? "Crie, renomeie e ative ou desative as tags de categoria de todos os setores."
              : "Crie, renomeie e ative ou desative as tags de categoria do seu setor."}
          </p>
        </div>
        {isDirector ? (
          <TagFormDialog
            mode="create"
            departments={tagCreationDepartments(departmentOptions)}
          />
        ) : (
          <TagFormDialog mode="create" departmentId={access.departmentId} />
        )}
      </div>

      <TagsTable
        tags={tags}
        isDirector={isDirector}
        departmentOptions={departmentOptions}
      />
    </div>
  )
}

export default TagsPage
