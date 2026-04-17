import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/** Fades / lifts content into place when it crosses into the viewport. */
export function ScrollReveal({ children, className = '', delay = 0, el = 'div' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    if (reduced) return undefined

    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    ob.observe(node)
    return () => ob.disconnect()
  }, [reduced])

  const Tag = el
  const base =
    'transform-gpu transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform'
  const hidden =
    'opacity-0 [transform:translate3d(0,2.75rem,0)_perspective(960px)_rotateX(6deg)]'
  const shown =
    'opacity-100 [transform:translate3d(0,0,0)_perspective(960px)_rotateX(0deg)]'

  return (
    <Tag
      ref={ref}
      className={`${base} ${reduced || visible ? shown : hidden} ${className}`}
      style={{ transitionDelay: reduced ? '0ms' : `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
