"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import type { Control } from "react-hook-form"

import FormField from "@/app/_components/form-field"
import { Checkbox } from "@/app/_components/ui/checkbox"
import { Field, FieldLabel } from "@/app/_components/ui/field"
import type { DepartmentMember } from "@/app/_lib/types/department-admins"
import type { RenameDepartmentInput } from "@/app/_lib/validation/department"

const FIELD_DESCRIPTION =
  "Marque quem administra o setor. Quem ficar desmarcado continua no setor como membro."
const EMPTY_MESSAGE = "Nenhuma pessoa ativa neste setor."
const NO_ADMIN_WARNING =
  "Sem administrador, só a Diretoria gerencia as pessoas e as tags deste setor e distribui os chamados dele."

interface DepartmentAdminsFieldProps {
  control: Control<RenameDepartmentInput>
  members: DepartmentMember[]
}

const adminsFirst = (members: DepartmentMember[]): DepartmentMember[] => [
  ...members.filter((member) => member.role === "admin"),
  ...members.filter((member) => member.role !== "admin"),
]

const DepartmentAdminsField = ({
  control,
  members,
}: DepartmentAdminsFieldProps) => {
  const [displayedMembers] = useState(() => adminsFirst(members))
  const isEmpty = members.length === 0

  return (
    <FormField
      control={control}
      name="admins.adminIds"
      label="Administradores"
      labelMode="group"
      description={isEmpty ? undefined : FIELD_DESCRIPTION}
    >
      {({
        ref,
        value,
        onChange,
        onBlur,
        disabled,
        id,
        "aria-invalid": ariaInvalid,
        "aria-describedby": ariaDescribedBy,
        "aria-labelledby": ariaLabelledBy,
      }) => {
        if (isEmpty) {
          return (
            <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
          )
        }

        const selected = new Set(value ?? [])

        const toggle = (memberId: number, checked: boolean) => {
          const next = new Set(selected)
          if (checked) next.add(memberId)
          else next.delete(memberId)
          onChange(
            members.filter((member) => next.has(member.id)).map(({ id }) => id),
          )
        }

        return (
          <>
            <div
              id={id}
              role="group"
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              className="rounded-lg border"
            >
              <div className="flex max-h-51 scroll-py-3 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
                {displayedMembers.map((member, index) => {
                  const checkboxId = `${id}-${member.id}`
                  return (
                    <Field
                      key={member.id}
                      orientation="horizontal"
                      className="items-start gap-2.5"
                    >
                      <Checkbox
                        ref={index === 0 ? ref : undefined}
                        id={checkboxId}
                        checked={selected.has(member.id)}
                        disabled={disabled}
                        aria-invalid={ariaInvalid}
                        onCheckedChange={(checked) =>
                          toggle(member.id, checked === true)
                        }
                        onBlur={onBlur}
                        className="mt-0.5"
                      />
                      <FieldLabel
                        htmlFor={checkboxId}
                        className="min-w-0 flex-col items-start gap-0 font-normal"
                      >
                        <span
                          title={member.name}
                          className="max-w-full truncate text-sm/5"
                        >
                          {member.name}
                        </span>
                        <span
                          title={member.email}
                          className="max-w-full truncate text-xs/4 text-muted-foreground"
                        >
                          {member.email}
                        </span>
                      </FieldLabel>
                    </Field>
                  )
                })}
              </div>
            </div>
            {selected.size === 0 ? (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning p-3 text-sm text-warning-foreground"
              >
                <TriangleAlertIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                {NO_ADMIN_WARNING}
              </p>
            ) : null}
          </>
        )
      }}
    </FormField>
  )
}

export default DepartmentAdminsField
