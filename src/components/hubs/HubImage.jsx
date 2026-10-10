import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../ui'

// Demo images are remote placeholders; fall back to a neutral tile if they fail to load.
export default function HubImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center bg-elevated text-muted', className)}
      >
        <ImageOff aria-hidden="true" className="size-8" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
