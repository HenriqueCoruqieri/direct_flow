import { Badge } from "@/app/_components/ui/badge"

interface DepartmentNameProps {
  name: string
  isActive: boolean
}

const DepartmentName = ({ name, isActive }: DepartmentNameProps) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
    <span title={name} className="max-w-40 truncate">
      {name}
    </span>
    {isActive ? null : (
      <Badge variant="outline" className="text-muted-foreground">
        Setor inativo
      </Badge>
    )}
  </div>
)

export default DepartmentName
