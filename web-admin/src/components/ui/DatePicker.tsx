import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  required?: boolean
  min?: string
  max?: string
  id?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      disabled,
      className,
      required,
      min,
      max,
      id,
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-accent ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type="date"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            min={min}
            max={max}
            className={cn(
              'w-full rounded-lg border bg-white px-3 py-2 pl-10 text-sm text-gray-900',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
              'disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed',
              error
                ? 'border-accent focus:border-accent focus:ring-accent/30'
                : 'border-gray-300',
              className
            )}
          />
          <Calendar
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        {error && <p className="text-xs text-accent">{error}</p>}
      </div>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
