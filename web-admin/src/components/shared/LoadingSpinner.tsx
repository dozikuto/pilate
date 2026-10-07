import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'md',
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  const spinner = (
    <div
      className={cn(
        'rounded-full border-primary/20 border-t-primary animate-spin',
        sizes[size],
        className
      )}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-gray-500 font-medium">Đang tải...</p>
        </div>
      </div>
    )
  }

  return spinner
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
    </div>
  )
}
