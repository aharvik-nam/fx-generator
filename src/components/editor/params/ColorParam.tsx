import { useId } from 'react'
import { Label } from '@/components/ui/label'

type ColorParamProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorParam({ label, value, onChange }: ColorParamProps) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-input h-6 w-8 cursor-pointer rounded border bg-transparent p-0"
        />
        <span className="text-muted-foreground w-16 text-right font-mono text-xs">{value}</span>
      </div>
    </div>
  )
}
