import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

type SliderParamProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number, options: { commit: boolean }) => void
}

export function SliderParam({ label, value, min, max, step, onChange }: SliderParamProps) {
  const isDraggingRef = useRef(false)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{label}</span>
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          aria-label={`${label} (nøyaktig verdi)`}
          className="h-6 w-16 px-1.5 py-0 text-right text-xs"
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (!Number.isNaN(parsed)) onChange(clamp(parsed, min, max), { commit: true })
          }}
        />
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => {
          onChange(values[0], { commit: !isDraggingRef.current })
          isDraggingRef.current = true
        }}
        onValueCommit={() => {
          isDraggingRef.current = false
        }}
      />
    </div>
  )
}
