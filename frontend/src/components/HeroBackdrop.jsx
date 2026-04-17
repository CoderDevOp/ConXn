/**
 * Full-bleed hero photograph (Unsplash — free to use under their license).
 * @see https://unsplash.com/license
 */
const HERO_IMAGE_SRC =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2400&q=85'

/** Decorative team / collaboration photo behind the hero. */
export function HeroBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900" aria-hidden>
      <img
        src={HERO_IMAGE_SRC}
        alt=""
        width={2400}
        height={1600}
        decoding="async"
        fetchPriority="high"
        className="hero-ken-burns pointer-events-none absolute inset-0 h-full min-h-full w-full min-w-full origin-center object-cover object-[center_28%]"
      />
      {/* Softer vignette + bottom fade into the rest of the page */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,transparent_0%,rgba(15,23,42,0.18)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/25 via-transparent to-white" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
    </div>
  )
}
