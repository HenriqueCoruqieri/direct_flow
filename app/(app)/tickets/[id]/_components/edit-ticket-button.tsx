import { PencilIcon } from "lucide-react"

import BlockableOutlineButton from "@/app/_components/blockable-outline-button"

type EditTicketButtonProps = Omit<
  React.ComponentProps<typeof BlockableOutlineButton>,
  "children" | "size"
>

const EditTicketButton = (props: EditTicketButtonProps) => {
  return (
    <BlockableOutlineButton {...props}>
      <PencilIcon aria-hidden="true" className="size-4" />
      Editar
    </BlockableOutlineButton>
  )
}

export default EditTicketButton
