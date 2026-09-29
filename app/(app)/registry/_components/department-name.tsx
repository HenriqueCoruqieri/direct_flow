import { Badge } from "@/app/_components/ui/badge"

interface DepartmentNameProps {
  name: string
  isActive: boolean
}

const DepartmentName = ({ name, isActive }: DepartmentNameProps) => (
  <div className="flex items-center gap-2">
    <span>{name}</span>
    {isActive ? null : (
      <Badge variant="outline" className="text-muted-foreground">
        Setor inativo
      </Badge>
    )}
  </div>
)

export default DepartmentName
