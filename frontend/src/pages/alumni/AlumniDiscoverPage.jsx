import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, Users } from 'lucide-react'
import {
  connectPlatform,
  fetchPlatformConnections,
  smartSearchAlumni,
} from '../../api'
import { useSearchLoadingPhase } from '../../hooks/useSearchLoadingPhase'

const SELF_ID_KEY = 'conxn_alumni_id'
/** Max rows shown under Connections (full graph stays on home). */
const CONNECTIONS_PREVIEW_LIMIT = 5

function tierBadgeClass(tier) {
  if (tier === 'strong') return 'bg-emerald-100 text-emerald-800'
  if (tier === 'good') return 'bg-blue-100 text-blue-800'
  if (tier === 'semantic') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

function PeerSearchHit({
  a,
  selfId,
  isConnected,
  connectingId,
  onConnect,
  tierBadgeClass: tierCls,
  variant = 'default',
}) {
  const isSelf = String(a.id) === String(selfId)
  const busy = connectingId === a.id
  const shell =
    variant === 'recommended'
      ? 'rounded-xl border border-amber-100/80 bg-amber-50/30 p-4 shadow-sm'
      : 'rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300'

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{a.name}</p>
            {a.match_tier && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tierCls(a.match_tier)}`}
              >
                {a.match_tier}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            {a.role_company} · {a.location}
          </p>
          {a.explanation && (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {a.explanation}
            </p>
          )}
          {a.match_signals?.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              {a.match_signals.join(' · ')}
            </p>
          )}
          {a.similarity != null && (
            <p className="mt-2 text-xs text-slate-500">
              Similarity {(a.similarity * 100).toFixed(1)}%
              {a.combined_score != null &&
                ` · combined ${(a.combined_score * 100).toFixed(0)}%`}
            </p>
          )}
        </div>
        {!isSelf && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isConnected || busy}
              onClick={() => onConnect(a.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                'Connected'
              ) : (
                'Connect'
              )}
            </button>
            {isConnected && (
              <Link
                to={`/alumni/chats?peer=${encodeURIComponent(a.id)}`}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Message
              </Link>
            )}
          </div>
        )}
        {isSelf && (
          <span className="text-xs font-medium text-slate-400">Your profile</span>
        )}
      </div>
    </div>
  )
}

export function AlumniDiscoverPage() {
  const selfId = useMemo(
    () => localStorage.getItem(SELF_ID_KEY) || '0',
    [],
  )
  const [q, setQ] = useState('AI engineer from IIT Madras in Chennai')
  const [filteredResults, setFilteredResults] = useState([])
  const [recommendedResults, setRecommendedResults] = useState([])
  const [smartMeta, setSmartMeta] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const searchPhase = useSearchLoadingPhase(loading)
  const [platformPeers, setPlatformPeers] = useState([])
  const [connectingId, setConnectingId] = useState(null)
  const [connectMsg, setConnectMsg] = useState('')

  const loadPeers = useCallback(async () => {
    try {
      const d = await fetchPlatformConnections(selfId)
      setPlatformPeers(d.peers || [])
    } catch {
      setPlatformPeers([])
    }
  }, [selfId])

  useEffect(() => {
    loadPeers()
  }, [loadPeers])

  const connectedIds = useMemo(
    () => new Set(platformPeers.map((p) => String(p.id))),
    [platformPeers],
  )

  async function handleConnect(peerId) {
    setConnectingId(peerId)
    setConnectMsg('')
    try {
      const r = await connectPlatform(selfId, peerId)
      if (r.already_connected) setConnectMsg('Already connected.')
      else setConnectMsg('Connected — you can message them in Chats.')
      await loadPeers()
    } catch (e) {
      const d = e?.response?.data?.detail
      setConnectMsg(
        typeof d === 'string' ? d : 'Could not connect. Try again.',
      )
    } finally {
      setConnectingId(null)
    }
  }

  async function runSearch() {
    setLoading(true)
    try {
      const data = await smartSearchAlumni(q, 10)
      setSmartMeta({
        interpretation_line: data.interpretation_line,
        criteria: data.criteria,
      })
      setFilteredResults(data.filtered || [])
      setRecommendedResults(data.recommended || [])
      setSuggestions(data.suggestions || [])
    } catch {
      setFilteredResults([])
      setRecommendedResults([])
      setSmartMeta(null)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative mx-auto max-w-3xl space-y-14 border-t border-emerald-100/70 bg-gradient-to-b from-emerald-50/35 via-white/65 to-teal-50/20 px-6 py-10">
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Discover workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Search alumni peers
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Structured + semantic search. Use <strong className="font-medium text-slate-800">Connect</strong> to add someone on ConXn (like LinkedIn), then{' '}
          <Link to="/alumni/chats" className="font-medium text-blue-700 hover:underline">
            Chats
          </Link>{' '}
          to message them. Student requests live in{' '}
          <Link to="/alumni/mentor" className="font-medium text-blue-700 hover:underline">
            Mentor hub
          </Link>
          . The graph preview is on the{' '}
          <Link to="/#graph" className="font-medium text-blue-700 hover:underline">
            home page
          </Link>
          .
        </p>
        {connectMsg && (
          <p className="mt-2 text-sm text-slate-600">{connectMsg}</p>
        )}
      </section>

      <section id="discover" className="scroll-mt-24">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Smart search</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          <strong className="font-medium text-slate-800">Filtered</strong> =
          meets all parsed constraints.{' '}
          <strong className="font-medium text-slate-800">Recommended</strong> =
          partial / semantic matches (e.g. other engineers for an AI query).
        </p>
        {smartMeta?.interpretation_line && (
          <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
            {smartMeta.interpretation_line}
          </p>
        )}
        {smartMeta?.criteria && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ['roles', 'Role'],
              ['skills', 'Skills'],
              ['colleges', 'College'],
              ['locations', 'Location'],
              ['companies', 'Company'],
            ].map(([key, label]) => {
              const arr = smartMeta.criteria[key]
              if (!arr?.length) return null
              return (
                <span
                  key={key}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
                >
                  <span className="font-medium text-slate-800">{label}:</span>{' '}
                  {arr.slice(0, 4).join(', ')}
                </span>
              )
            })}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
            placeholder="Try: ML researchers in Bangalore from IIT…"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Smart search'
            )}
          </button>
        </div>
        {loading && searchPhase && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-800">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
            {searchPhase}
          </p>
        )}
        <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Filtered matches
        </h3>
        <div className="mt-3 space-y-3">
          {filteredResults.length === 0 && !loading && (
            <p className="text-sm text-slate-500">Run a search to see strict matches.</p>
          )}
          {filteredResults.map((a) => (
            <PeerSearchHit
              key={a.id}
              a={a}
              selfId={selfId}
              isConnected={connectedIds.has(String(a.id))}
              connectingId={connectingId}
              onConnect={handleConnect}
              tierBadgeClass={tierBadgeClass}
            />
          ))}
        </div>
        {recommendedResults.length > 0 && (
          <div className="mt-10 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800/90">
              Recommended (partial fit)
            </h3>
            <p className="text-xs text-slate-600">
              Looser matches — useful leads, but not every constraint matched.
            </p>
            <div className="space-y-3">
              {recommendedResults.map((a) => (
                <PeerSearchHit
                  key={a.id}
                  a={a}
                  selfId={selfId}
                  isConnected={connectedIds.has(String(a.id))}
                  connectingId={connectingId}
                  onConnect={handleConnect}
                  tierBadgeClass={tierBadgeClass}
                  variant="recommended"
                />
              ))}
            </div>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-10 space-y-8">
            <h3 className="text-sm font-semibold text-slate-800">
              Related suggestions
            </h3>
            {suggestions.map((block) => (
              <div key={block.title}>
                <p className="text-sm font-medium text-slate-900">{block.title}</p>
                {block.subtitle && (
                  <p className="mt-0.5 text-xs text-slate-500">{block.subtitle}</p>
                )}
                <div className="mt-3 space-y-2">
                  {(block.items || []).map((a) => (
                    <PeerSearchHit
                      key={a.id}
                      a={a}
                      selfId={selfId}
                      isConnected={connectedIds.has(String(a.id))}
                      connectingId={connectingId}
                      onConnect={handleConnect}
                      tierBadgeClass={tierBadgeClass}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="connections" className="scroll-mt-24 pb-20">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            Your connections on ConXn
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          People you have connected with on this site (not the graph). Open{' '}
          <Link to="/alumni/chats" className="font-medium text-blue-700 hover:underline">
            Chats
          </Link>{' '}
          to message them.
        </p>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <ul className="space-y-2 text-sm text-slate-700">
            {platformPeers.length === 0 && (
              <li className="text-slate-500">
                No connections yet. Connect from search results above, then chat
                here.
              </li>
            )}
            {platformPeers
              .slice(0, CONNECTIONS_PREVIEW_LIMIT)
              .map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2"
                >
                  <div>
                    <span className="font-medium text-slate-900">{n.name}</span>
                    <span className="text-slate-500">
                      {' '}
                      · {n.company || 'Alumni'}
                    </span>
                  </div>
                  <Link
                    to={`/alumni/chats?peer=${encodeURIComponent(n.id)}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    Message
                  </Link>
                </li>
              ))}
          </ul>
          {platformPeers.length > CONNECTIONS_PREVIEW_LIMIT && (
            <p className="mt-3 text-xs text-slate-500">
              +{platformPeers.length - CONNECTIONS_PREVIEW_LIMIT} more — open
              Chats for the full list of threads.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
