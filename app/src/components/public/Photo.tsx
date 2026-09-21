import Image from 'next/image'

interface PhotoProps {
  src: string
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  /**
   * Jemné prekrytie farbou stránky (tmavá modrá), aby fotka zapadla do tmavého
   * dizajnu. 0 = vypnuté (napr. QR kód musí ostať čistý). Predvolene 12 %.
   */
  tint?: number
}

/** Fotografia z /public v zaoblenom rámiku, voliteľne s jemným modrým tónovaním. */
export default function Photo({
  src,
  alt,
  className = '',
  sizes = '(max-width: 1024px) 100vw, 40vw',
  priority = false,
  tint = 0.12,
}: PhotoProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      {tint > 0 && (
        <>
          {/* Tón stránky cez fotku + jemný gradient zospodu, aby nadväzovala na tmavé pozadie */}
          <div className="absolute inset-0 bg-blue-deep pointer-events-none" style={{ opacity: tint }} />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-deep/35 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
        </>
      )}
    </div>
  )
}
