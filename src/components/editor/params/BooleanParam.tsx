import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type BooleanParamProps = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function BooleanParam({ label, value, onChange }: BooleanParamProps) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <Switch id={id} checked={value} onCheckedChange={onChange} />
    </div>
  )
}
