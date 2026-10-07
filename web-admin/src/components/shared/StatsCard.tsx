import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  iconBgClass?: string
  iconColorClass?: string
  growth?: number
  growthLabel?: string
  format?: 'currency' | 'number' | 'text'
  className?: string
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgClass = 'bg-primary-50',
  iconColorClass = 'text-primary',
  growth,
  growthLabel = 'so với hôm qua',
  format = 'text',
  className,
}: StatsCardProps) {
  const formatValue = () => {
    if (typeof value === 'string') return value
    if (format === 'currency') return formatCurrency(value)
    if (format === 'number') return formatNumber(value)
    return value.toString()
  }

  const growthPositive = growth !== undefined && growth > 0
  const growthNegative = growth !== undefined && growth < 0
  const growthNeutral = growth === 0

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4',
        className
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          iconBgClass
        )}
      >
        <span className={cn('w-6 h-6', iconColorClass)}>{icon}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 truncate">
          {formatValue()}
        </p>

        {growth !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {growthPositive && (
              <TrendingUp size={14} className="text-emerald-500" />
            )}
            {growthNegative && (
              <TrendingDown size={14} className="text-red-500" />
            )}
            {growthNeutral && <Minus size={14} className="text-gray-400" />}

            <span
              className={cn(
                'text-xs font-medium',
                growthPositive && 'text-emerald-600',
                growthNegative && 'text-red-600',
                growthNeutral && 'text-gray-400'
              )}
            >
              {growthPositive && '+'}
              {growth}%
            </span>
            <span className="text-xs text-gray-400">{growthLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
