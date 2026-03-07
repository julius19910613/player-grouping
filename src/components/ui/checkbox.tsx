import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked?: boolean
  disabled?: boolean
  id?: string
  className?: string
  onCheckedChange?: (checked: boolean) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checked, disabled, id }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        id={id}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 accent-primary",
          className
        )}
        ref={ref}
        onChange={handleChange}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
