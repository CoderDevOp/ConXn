import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail, Search, Sparkles, UserPlus } from 'lucide-react'
import { mentorIntroDraft, mentorMatch, smartSearchAlumni } from '../../api'
import { EmailModal } from '../../components/EmailModal'
import { SearchHitArticle } from '../../components/SearchHitArticle'
import { useSearchLoadingPhase } from '../../hooks/useSearchLoadingPhase'

function tierBadgeClass(tier) {
  if (tier === 'strong') return 'bg-emerald-100 text-emerald-800'
  if (tier === 'good') return 'bg-blue-100 text-blue-800'
  if (tier === 'semantic') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

export function StudentMentorshipPage() {
  const [q, setQ] = useState('AI engineer from SRM in Chennai')
  const [filteredResults, setFilteredResults] = useState([])
  const [recommendedResults, setRecommendedResults] = useState([])
  const [smartMeta, setSmartMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const searchPhase = useSearchLoadingPhase(loading)

  const [goal, setGoal] = useState('I want to get into data science')
  const [mentors, setMentors] = useState([])
  const [mentorLoading, setMentorLoading] = useState(false)

  const [outreachTopic, setOutreachTopic] = useState('Career mentorship request')
  const [outreachDetails, setOutreachDetails] = useState(
    'I would value a short chat about how you approached your first role in industry.',
  )
  const [connectAlumniId, setConnectAlumniId] = useState('')
  const [introDraft, setIntroDraft] = useState('')
  const [introBusy, setIntroBusy] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const mentorInviteList = useMemo(() => {
    const merged = [...filteredResults, ...recommendedResults, ...mentors]
    const byId = Object.fromEntries(merged.map((a) => [a.id, a]))
    return Object.values(byId)
  }, [filteredResults, recommendedResults, mentors])

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
      if (first && !connectAlumniId) setConnectAlumniId(first.id)
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Search failed')
      setFilteredResults([])
      setRecommendedResults([])
      setSmartMeta(null)
    } finally {
      setLoading(false)
    }
  }

  async function runIntroDraft() {
    if (!connectAlumniId) return
    setIntroBusy(true)
    try {
      const res = await mentorIntroDraft({
        alumni_id: connectAlumniId,
        topic: outreachTopic,
        ask_details: `${outreachDetails}\n\n(Context: student career goal — ${goal})`,
      })
      setIntroDraft(res.draft || '')
    } catch {
      setIntroDraft('Could not generate draft — check API.')
    } finally {
      setIntroBusy(false)
    }
  }

  async function runMentors() {
    setMentorLoading(true)
    setErr(null)
    try {
      const data = await mentorMatch(goal, 8)
      setMentors(data)
      const first = (data || [])[0]
      if (first && !connectAlumniId) setConnectAlumniId(first.id)
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Mentor match failed')
      setMentors([])
    } finally {
      setMentorLoading(false)
    }
  }

  const modalStudentNote = [
    goal.trim() && `Career goal: ${goal.trim()}`,
    outreachTopic.trim() && `Topic: ${outreachTopic.trim()}`,
    outreachDetails.trim() && outreachDetails.trim(),
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <>
      <main className="relative mx-auto max-w-3xl space-y-16 border-t border-sky-100/70 bg-gradient-to-b from-sky-50/40 via-white/60 to-indigo-50/25 px-6 py-10">
        <section>
          <p className="inline-flex rounded-full bg-sky-100/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-900">
            Mentorship
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-indigo-950">
            Find mentors & reach out
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Search for the right people, generate a personalized intro (same flow
            as events), then use goal-based matching. Graph on the{' '}
            <Link to="/#graph" className="font-semibold text-sky-700 hover:underline">
              home page
            </Link>
            .
          </p>
          <p className="mt-3 text-sm">
            <Link
              to="/student/events"
              className="font-semibold text-violet-700 underline-offset-4 hover:underline"
            >
              Switch to event invitations →
            </Link>
          </p>
        </section>

        <section id="search" className="scroll-mt-24">
          <div className="flex items-center gap-2 text-slate-900">
            <Search className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold">Find alumni to connect with</h2>
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
              placeholder="Who do you want to learn from?"
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

        <section id="mentorship-draft" className="scroll-mt-24 pb-8">
          <div className="flex items-center gap-2 text-slate-900">
            <Mail className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Mentorship message</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pick an alum from your search or mentor list, then generate a draft
            (same idea as event invitations).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={outreachTopic}
              onChange={(e) => setOutreachTopic(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Topic (e.g. mentorship chat)"
            />
            <select
              value={connectAlumniId}
              onChange={(e) => setConnectAlumniId(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select alumni (run search or find mentors)</option>
              {mentorInviteList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={outreachDetails}
            onChange={(e) => setOutreachDetails(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="What you want help with"
          />
          <button
            type="button"
            onClick={runIntroDraft}
            disabled={introBusy || !connectAlumniId}
            className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
          >
            {introBusy ? 'Drafting…' : 'Generate introduction'}
          </button>
          {introDraft && (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {introDraft}
            </pre>
          )}
        </section>

        <section id="mentor" className="scroll-mt-24 pb-24">
          <div className="flex items-center gap-2 text-slate-900">
            <UserPlus className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold">Mentor matching</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            State a goal — we rank mentors by semantic fit. Results appear in the
            dropdown above for drafting.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Your career goal…"
            />
            <button
              type="button"
              onClick={runMentors}
              disabled={mentorLoading}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {mentorLoading ? 'Matching…' : 'Find mentors'}
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {mentors.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-4 py-3 text-sm transition hover:border-slate-300"
              >
                <div>
                  <span className="font-medium text-slate-500">#{i + 1}</span>{' '}
                  <span className="font-semibold text-slate-900">{m.name}</span>
                  <span className="text-slate-600"> — {m.role_company}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(m)
                    setModalOpen(true)
                  }}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <EmailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alumni={selected}
        searchQuery={q}
        studentNote={modalStudentNote}
      />
    </>
  )
}
