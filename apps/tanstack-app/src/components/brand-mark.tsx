import { useEffect, useRef, useState } from 'react'
import { Clapperboard } from 'lucide-react'
import { cn } from '@libs/ui/utils/cn'

const LOGO_SRC = '/reelflow-logo.svg'

/**
 * Reelflow brand mark.
 *
 * Renders the transparent logo inside a rounded frame. The frame has no fill —
 * its interior shows the surrounding nav/sidebar colour, so in dark mode the
 * logo backdrop matches the top-nav colour automatically (and stays light in
 * light mode). A subtle ring keeps the rounded shape readable.
 *
 * `variant="dark"` forces the dark ring on always-dark surfaces such as the
 * public landing header (which doesn't toggle the `.dark` class).
 */
export function BrandMark({
  className,
  variant = 'auto',
  fallbackIconClassName,
}: {
  /** Sizing class for the frame, e.g. "h-10 w-10". */
  className?: string
  /** "auto" follows the theme; "dark" always uses the dark ring. */
  variant?: 'auto' | 'dark'
  /** Sizing class for the fallback icon, e.g. "h-5 w-5". */
  fallbackIconClassName?: string
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true)
    }
  }, [])

  const ring =
    variant === 'dark'
      ? 'ring-1 ring-white/12 text-white'
      : 'ring-1 ring-black/[0.07] text-foreground dark:ring-white/12 dark:text-white'

  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl', ring, className)}>
      {failed ? (
        <Clapperboard className={fallbackIconClassName ?? 'h-1/2 w-1/2'} aria-hidden="true" />
      ) : (
        <img
          ref={imgRef}
          src={LOGO_SRC}
          alt="Reelflow"
          className="h-full w-full object-contain p-[5%]"
          onError={() => setFailed(true)}
          draggable={false}
        />
      )}
    </span>
  )
}
