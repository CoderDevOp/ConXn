import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import { Box, Layers, Minus, Network, Plus } from 'lucide-react'
import { fetchGraph } from '../api'

/** Distinct hues for companies / clusters */
const NODE_PALETTE = [
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
  '#f472b6',
  '#818cf8',
  '#fcd34d',
  '#4ade80',
  '#60a5fa',
  '#c084fc',
]

function edgeColorFromReasons(reasons) {
  const r = (reasons || '').toLowerCase()
  if (r.includes('same_college')) return '#0ea5e9'
  if (r.includes('same_company')) return '#10b981'
  if (r.includes('shared_skills')) return '#f59e0b'
  return '#94a3b8'
}

/** Attach cytoscape data fields for mapped colors */
function enrichGraphElements(elements) {
  const companyToColor = new Map()
  let idx = 0
  return elements.map((el) => {
    const d = el.data
    if (d.source != null && d.target != null) {
      return {
        data: {
          ...d,
          edgeColor: edgeColorFromReasons(d.reasons),
        },
      }
    }
    const comp = (d.company || '').trim() || '—'
    if (!companyToColor.has(comp)) {
      companyToColor.set(comp, NODE_PALETTE[idx % NODE_PALETTE.length])
      idx += 1
    }
    return {
      data: {
        ...d,
        nodeColor: companyToColor.get(comp),
      },
    }
  })
}

const cyStyle = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(nodeColor)',
      'border-color': '#1e293b',
      'border-width': 1.5,
      label: 'data(label)',
      color: '#0f172a',
      'font-size': 10,
      'font-weight': 600,
      'text-valign': 'bottom',
      'text-margin-y': 5,
      width: 26,
      height: 26,
    },
  },
  {
    selector: 'node.hl',
    style: {
      'border-color': '#1d4ed8',
      'border-width': 3,
      'background-color': '#bfdbfe',
    },
  },
  {
    selector: 'node.dim',
    style: {
      opacity: 0.22,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.75,
      'line-color': 'data(edgeColor)',
      opacity: 0.88,
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'edge.hl',
    style: {
      'line-color': '#2563eb',
      width: 2.5,
      opacity: 1,
    },
  },
  {
    selector: 'edge.dim',
    style: {
      opacity: 0.1,
    },
  },
]

function toForceData(elements) {
  const nodes = []
  const links = []
  const companyToColor = new Map()
  let ci = 0
  for (const el of elements) {
    const d = el.data
    if (d.source != null && d.target != null) {
      links.push({
        source: d.source,
        target: d.target,
        color: edgeColorFromReasons(d.reasons),
      })
    } else if (d.id != null) {
      const comp = (d.company || '').trim() || '—'
      if (!companyToColor.has(comp)) {
        companyToColor.set(comp, NODE_PALETTE[ci % NODE_PALETTE.length])
        ci += 1
      }
      nodes.push({
        id: d.id,
        name: d.label || d.id,
        color: companyToColor.get(comp),
      })
    }
  }
  return { nodes, links }
}

function Graph3DView({ data, height, onReady }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !data.nodes.length) return undefined

    el.innerHTML = ''
    let cancelled = false

    import('3d-force-graph')
      .then((mod) => {
        if (cancelled || !ref.current) return
        const ForceGraph3D = mod.default
        const w = el.clientWidth || 800
        const fg = ForceGraph3D()(el)
          .graphData(data)
          .nodeLabel('name')
          .nodeColor((n) => n.color || '#38bdf8')
          .nodeRelSize(6.8)
          .linkColor((l) => l.color || '#94a3b8')
          .linkWidth(0.65)
          .linkOpacity(0.85)
          .backgroundColor('#e8eef9')
          .width(w)
          .height(height ?? 420)
          .enableNodeDrag(true)
          .showNavInfo(false)
        onReady?.(fg)
        const z = () => {
          if (cancelled) return
          fg.zoomToFit(760, 1.75)
          const cam = fg.cameraPosition()
          fg.cameraPosition(
            {
              x: cam.x * 0.92,
              y: cam.y * 0.92,
              z: Math.max(110, cam.z * 0.74),
            },
            undefined,
            700,
          )
        }
        setTimeout(z, 120)
        setTimeout(z, 900)
      })
      .catch(() => {
        if (ref.current) ref.current.innerHTML = ''
      })

    return () => {
      cancelled = true
      onReady?.(null)
      if (el) el.innerHTML = ''
    }
  }, [data, height, onReady])

  return <div ref={ref} className="h-full w-full overflow-hidden" />
}

export function GraphPanel({
  graphHeight = 420,
  showChrome = true,
  only3d = false,
}) {
  const [elements, setElements] = useState([])
  const [mode, setMode] = useState(() => (only3d ? '3d' : '2d'))
  const [loadError, setLoadError] = useState(null)
  const cyRef = useRef(null)
  const fgRef = useRef(null)

  useEffect(() => {
    fetchGraph()
      .then((g) => setElements(g.elements || []))
      .catch((e) => setLoadError(e.message || 'Failed to load graph'))
  }, [])

  const displayElements = useMemo(
    () => enrichGraphElements(elements),
    [elements],
  )

  const fgData = useMemo(() => toForceData(elements), [elements])

  const layout = useMemo(
    () => ({
      name: 'cose',
      animate: true,
      animationDuration: 400,
      fit: true,
      padding: 6,
      nodeRepulsion: () => 380000,
      idealEdgeLength: () => 48,
      componentSpacing: 36,
    }),
    [],
  )

  const onTap = useCallback(
    (cy) => {
      if (!cy) return
      cy.removeListener('tap', 'node')
      cy.on('tap', 'node', (evt) => {
        const n = evt.target
        cy.batch(() => {
          cy.nodes().removeClass('hl dim')
          cy.edges().removeClass('hl dim')
          n.addClass('hl')
          const hood = n.closedNeighborhood()
          cy.elements().difference(hood).addClass('dim')
          hood.edges().addClass('hl')
        })
      })
      cy.on('tap', (e) => {
        if (e.target === cy) {
          cy.nodes().removeClass('hl dim')
          cy.edges().removeClass('hl dim')
        }
      })
    },
    [],
  )

  const bindCy = useCallback(
    (cy) => {
      if (!cy) return
      cyRef.current = cy
      onTap(cy)
      cy.one('layoutstop', () => {
        cy.fit(cy.elements(), 6)
      })
    },
    [onTap],
  )

  const bindFg = useCallback((fg) => {
    fgRef.current = fg
  }, [])

  const zoomIn = useCallback(() => {
    if (mode === '2d') {
      const cy = cyRef.current
      if (!cy) return
      const next = Math.min(3.2, cy.zoom() * 1.18)
      cy.zoom(next)
      cy.center()
      return
    }
    const fg = fgRef.current
    if (!fg) return
    const cam = fg.cameraPosition()
    fg.cameraPosition(
      {
        x: cam.x,
        y: cam.y,
        z: Math.max(95, cam.z * 0.82),
      },
      undefined,
      350,
    )
  }, [mode])

  const zoomOut = useCallback(() => {
    if (mode === '2d') {
      const cy = cyRef.current
      if (!cy) return
      const next = Math.max(0.12, cy.zoom() / 1.18)
      cy.zoom(next)
      cy.center()
      return
    }
    const fg = fgRef.current
    if (!fg) return
    const cam = fg.cameraPosition()
    fg.cameraPosition(
      {
        x: cam.x,
        y: cam.y,
        z: Math.min(1800, cam.z * 1.2),
      },
      undefined,
      350,
    )
  }, [mode])

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-indigo-50/40 via-white to-sky-50/30">
      {showChrome && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Network className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold">Network graph</span>
          </div>
          {!only3d && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setMode('2d')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  mode === '2d'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                2D
              </button>
              <button
                type="button"
                onClick={() => setMode('3d')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  mode === '3d'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                3D
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={zoomOut}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              title="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
              Out
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              title="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
              In
            </button>
          </div>
        </div>
      )}

      <div
        className="relative w-full bg-gradient-to-br from-slate-50 via-indigo-50/25 to-sky-50/40"
        style={{ height: graphHeight }}
      >
        {loadError && (
          <p className="absolute inset-0 z-10 flex items-center justify-center p-4 text-sm text-red-600">
            {loadError}
          </p>
        )}
        {!only3d && mode === '2d' && displayElements.length > 0 && (
          <CytoscapeComponent
            elements={displayElements}
            stylesheet={cyStyle}
            layout={layout}
            style={{ width: '100%', height: '100%' }}
            cy={bindCy}
            wheelSensitivity={0.52}
            minZoom={0.12}
            maxZoom={3.2}
          />
        )}
        {(mode === '3d' || only3d) && fgData.nodes.length > 0 && (
          <Graph3DView data={fgData} height={graphHeight} onReady={bindFg} />
        )}
      </div>
      {showChrome && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          {only3d
            ? '3D view: node colors follow company and edge colors follow link type (college / company / skills). Scroll to zoom.'
            : '2D: node colors follow company; edge colors follow link type (college / company / skills). Click a node to focus. Scroll to zoom — view starts tighter on the cluster.'}
        </p>
      )}
    </div>
  )
}
