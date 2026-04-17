import { useEffect, useState } from 'react'

const PHASES = [
  'Enhancing your query…',
  'Parsing roles, skills & locations…',
  'Searching the alumni database…',
  'Applying smart filters…',
  'Ranking matches…',
  'Almost there…',
]

/**
 * Rotating status text while `loading` is true (e.g. during smart-search API call).
 */
export function useSearchLoadingPhase(loading) {
  const [phaseIndex, setPhaseIndex] = useState(0)

  useEffect(() => {
    if (!loading) return undefined
    const resetId = setTimeout(() => setPhaseIndex(0), 0)
    const id = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length)
    }, 520)
    return () => {
      clearTimeout(resetId)
      clearInterval(id)
    }
  }, [loading])

  return loading ? PHASES[phaseIndex] : ''
}
