/**
 * Stage H3 — Skeleton placeholder.
 *
 * Drop-in replacement for spinners while content is loading. Honors
 * `prefers-reduced-motion` (the shimmer animation freezes when the OS
 * setting is on). Variants cover the most-used shapes; raw <Skeleton/>
 * is a flexbox-friendly rectangle.
 */

import type { CSSProperties, HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Variant = 'rect' | 'text' | 'circle' | 'card'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  width?: string | number
  height?: string | number
  /** number of stacked lines, only meaningful for variant='text' */
  lines?: number
}

const VARIANT_CLASS: Record<Variant, string> = {
  rect: 'rounded-md',
  text: 'rounded-sm h-4',
  circle: 'rounded-full',
  card: 'rounded-xl h-32',
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  lines = 1,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const inlineStyle: CSSProperties = { ...style }
  if (width !== undefined) inlineStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) inlineStyle.height = typeof height === 'number' ? `${height}px` : height

  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)} {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={clsx(
              'tlush-skeleton-shimmer bg-cs-border/40',
              VARIANT_CLASS.text,
              // Last line shorter for natural look
              i === lines - 1 && 'w-2/3',
            )}
            style={i === lines - 1 ? undefined : inlineStyle}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'tlush-skeleton-shimmer bg-cs-border/40',
        VARIANT_CLASS[variant],
        className,
      )}
      style={inlineStyle}
      aria-hidden="true"
      {...rest}
    />
  )
}

/** Pre-baked compositions that show up repeatedly. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-3 rounded-xl border border-cs-border bg-white p-4', className)}>
      <Skeleton variant="text" lines={1} width="60%" />
      <Skeleton variant="text" lines={3} />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-cs-border/50 px-4 py-3 last:border-0">
      <Skeleton variant="circle" width={24} height={24} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="80%" />
      </div>
      <Skeleton variant="text" width={80} />
    </div>
  )
}
