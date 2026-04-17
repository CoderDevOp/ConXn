import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Loader2, Search, Sparkles } from 'lucide-react'
import { eventInvite, smartSearchAlumni } from '../../api'
import { EmailModal } from '../../components/EmailModal'
import { SearchHitArticle } from '../../components/SearchHitArticle'
import { useSearchLoadingPhase } from '../../hooks/useSearchLoadingPhase'

function tierBadgeClass(tier) {
  if (tier === 'strong') return 'bg-emerald-100 text-emerald-800'
  if (tier === 'good') return 'bg-blue-100 text-blue-800'
  if (tier === 'semantic') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

export function StudentEventsPage() {
  const [q, setQ] = useState('AI engineer from SRM in Chennai')
  const [filteredResults, setFilteredResults] = useState([])
  const [recommendedResults, setRecommendedResults] = useState([])
  const [smartMeta, setSmartMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const searchPhase = useSearchLoadingPhase(loading)

  const [eventTitle, setEventTitle] = useState('AI & Careers fireside')
  const [eventDetails, setEventDetails] = useState(
    'Evening panel at the innovation lab, March 12.',
  )
  const [inviteAlumniId, setInviteAlumniId] = useState('')
  const [inviteDraft, setInviteDraft] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  async function runSearch() {
    setLoading(true)
    setErr(null)
    try {
      const data = await smartSearchAlumni(q, 10)
      setSmartMeta({
        interpretation_line: data.interpretation_line,
        criteria: data.criteria,
      })
      const f = data.filtered || []
      const r = data.recommended || []
      setFilteredResults(f)
      setRecommendedResults(r)
      const first = f[0] || r[0]
      if (first && !inviteAlumniId) setInviteAlumniId(first.id)
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Search failed')
      setFilteredResults([])
      setRecommendedResults([])
      setSmartMeta(null)
    } finally {
      setLoading(false)
    }
  }

  async function runInvite() {
    if (!inviteAlumniId) return
    setInviteBusy(true)
    try {
      const r = await eventInvite({
        alumni_id: inviteAlumniId,
        event_title: eventTitle,
        event_details: eventDetails,
      })
      setInviteDraft(r.draft || '')
    } catch {
      setInviteDraft('Could not generate draft — check API.')
    } finally {
      setInviteBusy(false)
    }
  }

  const inviteList = useMemo(() => {
    const merged = [...filteredResults, ...recommendedResults]
    const byId = Object.fromEntries(merged.map((a) => [a.id, a]))
    return Object.values(byId)
  }, [filteredResults, recommendedResults])

  return (
    <>
      <main className="relative mx-auto max-w-3xl space-y-16 border-t border-violet-100/70 bg-gradient-to-b from-violet-50/35 via-white/65 to-sky-50/20 px-6 py-10">
        <section>
          <p className="inline-flex rounded-full bg-violet-100/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-900">
            Events
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-indigo-950">
            Invite alumni to your event
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Search for the right people, then generate a personalized invitation.
            The relationship graph is on the{' '}
            <Link to="/#graph" className="font-semibold text-violet-700 hover:underline">
              home page
            </Link>
            .
          </p>
          <p className="mt-3 text-sm">
            <Link
              to="/student/mentorship"
              className="font-semibold text-sky-700 underline-offset-4 hover:underline"
            >
              ← Switch to mentorship workspace
            </Link>
          </p>
        </section>

        <section id="search" className="scroll-mt-24">
          <div className="flex items-center gap-2 text-slate-900">
            <Search className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold">Find alumni to invite</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Filtered = full match on parsed criteria. Recommended = partial /
            semantic only.
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
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Who should receive your invite?"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
          {loading && searchPhase && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-800">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
              {searchPhase}
            </p>
          )}
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Filtered matches
          </h3>
          <div className="mt-3 space-y-4">
            {filteredResults.length === 0 && !loading && (
              <p className="text-sm text-slate-500">Run a search to populate results.</p>
            )}
            {filteredResults.map((a) => (
              <SearchHitArticle
                key={a.id}
                a={a}
                tierBadgeClass={tierBadgeClass}
                onConnect={(alum) => {
                  setSelected(alum)
                  setModalOpen(true)
                }}
              />
            ))}
          </div>
          {recommendedResults.length > 0 && (
            <div className="mt-10 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800/90">
                Recommended (partial fit)
              </h3>
              <div className="space-y-4">
                {recommendedResults.map((a) => (
                  <SearchHitArticle
                    key={a.id}
                    a={a}
                    tierBadgeClass={tierBadgeClass}
                    onConnect={(alum) => {
                      setSelected(alum)
                      setModalOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="events" className="scroll-mt-24 pb-24">
          <div className="flex items-center gap-2 text-slate-900">
            <Calendar className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Event invitation</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pick an alum from your search, then generate a draft.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Event title"
            />
            <select
              value={inviteAlumniId}
              onChange={(e) => setInviteAlumniId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select alumni (run search first)</option>
              {inviteList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={eventDetails}
            onChange={(e) => setEventDetails(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Details"
          />
          <button
            type="button"
            onClick={runInvite}
            disabled={inviteBusy || !inviteAlumniId}
            className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
          >
            {inviteBusy ? 'Drafting…' : 'Generate invitation'}
          </button>
          {inviteDraft && (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {inviteDraft}
            </pre>
          )}
        </section>
      </main>

      <EmailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alumni={selected}
        searchQuery={q}
        studentNote={`Event: ${eventTitle}. ${eventDetails}`}
      />
    </>
  )
}
