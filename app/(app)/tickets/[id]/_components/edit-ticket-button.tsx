import { PencilIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"

interface EditTicketButtonProps {
  ref?: React.Ref<HTMLButtonElement>
  onClick: () => void
}

const EditTicketButton = ({ ref, onClick }: EditTicketButtonProps) => {
  return (
    <Button ref={ref} type="button" variant="outline" onClick={onClick}>
      <PencilIcon aria-hidden="true" className="size-4" />
      Editar
    </Button>
  )
}

export default EditTicketButton
