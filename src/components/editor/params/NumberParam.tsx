import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type NumberParamProps = {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export function NumberParam({ label, value, min, max, onChange }: NumberParamProps) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        className="h-7 w-20 text-right font-mono text-xs"
        onChange={(event) => {
          const parsed = Number(event.target.value)
          if (!Number.isNaN(parsed)) onChange(parsed)
        }}
      />
    </div>
  )
}
