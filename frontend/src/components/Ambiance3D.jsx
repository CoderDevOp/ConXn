import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Decorative depth layers: soft gradients + perspective “floor” grid,
 * parallax on scroll (disabled when prefers-reduced-motion).
 */
export function Ambiance3D() {
  const reduced = useReducedMotion()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (reduced) return undefined
    const onScroll = () => setScrollY(window.scrollY)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduced])

  const y1 = reduced ? 0 : scrollY * 0.022
  const y2 = reduced ? 0 : scrollY * -0.016
  const y3 = reduced ? 0 : scrollY * 0.011
  const rot = reduced ? 0 : Math.min(scrollY * 0.0055, 3.2)

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden [perspective:1400px]"
      aria-hidden
    >
      {/* Large color fields — “nodes” in abstract space */}
      <div
        className="absolute -left-[18%] -top-[12%] h-[85vh] w-[75vw] rounded-[48%] bg-gradient-to-br from-sky-300/45 via-indigo-300/30 to-fuchsia-200/35 blur-3xl"
        style={{
          transform: `translate3d(0, ${y1}px, 0) rotate(${-6 + rot * 0.22}deg)`,
        }}
      />
      <div
        className="absolute -right-[12%] top-[28%] h-[55vh] w-[55vw] rounded-[45%] bg-gradient-to-bl from-amber-200/35 via-rose-200/25 to-blue-200/30 blur-3xl"
        style={{
          transform: `translate3d(0, ${y2}px, 0) rotate(10deg)`,
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[15%] h-[50vh] w-[70vw] rounded-[50%] bg-gradient-to-t from-cyan-200/30 via-transparent to-transparent blur-2xl"
        style={{
          transform: `translate3d(0, ${y3}px, 0)`,
        }}
      />

      {/* Perspective grid — suggests graph / network floor */}
      <div
        className="absolute inset-x-[-20%] bottom-[-35%] h-[55%] origin-bottom opacity-[0.14]"
        style={{
          transform: reduced
            ? 'rotateX(78deg) scale(1.4)'
            : `translate3d(0, ${scrollY * 0.0045}px, 0) rotateX(${78 + rot * 0.06}deg) scale(1.45)`,
          transformStyle: 'preserve-3d',
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating “glass” slab */}
      <div
        className="absolute right-[6%] top-[18%] h-40 w-28 rounded-2xl border border-white/40 bg-white/25 shadow-lg shadow-indigo-500/10 backdrop-blur-md sm:h-52 sm:w-36"
        style={{
          transform: reduced
            ? 'rotateY(-18deg) rotateX(8deg)'
            : `translate3d(0, ${y2 * 0.6}px, 40px) rotateY(-22deg) rotateX(10deg) rotateZ(-4deg)`,
          transformStyle: 'preserve-3d',
        }}
      />
    </div>
  )
}
