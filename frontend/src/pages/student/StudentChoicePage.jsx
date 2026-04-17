import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Sparkles } from 'lucide-react'

const INTENT_KEY = 'conxn_student_intent'

export function StudentChoicePage() {
  const navigate = useNavigate()

  function go(path, intent) {
    sessionStorage.setItem(INTENT_KEY, intent)
    navigate(path)
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-lg flex-col justify-center px-6 py-16 md:min-h-svh">
      <div
        className="pointer-events-none absolute -right-24 -top-20 h-56 w-56 rounded-full bg-violet-300/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-20 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700/90">
          Student workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-violet-950">
          How do you want to use ConXn?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Each path opens its own workspace. You can switch anytime from the
          sidebar.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-1">
          <button
            type="button"
            onClick={() => go('/student/mentorship', 'mentorship')}
            className="group rounded-2xl border border-violet-200/90 bg-white/90 p-6 text-left shadow-md shadow-violet-900/5 ring-1 ring-white/80 backdrop-blur-sm transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-600/30">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">Mentorship</p>
                <p className="mt-1 text-sm text-slate-600">
                  Find mentors, run smart search, match by goals, and draft
                  outreach.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => go('/student/events', 'events')}
            className="group rounded-2xl border border-cyan-200/90 bg-white/90 p-6 text-left shadow-md shadow-cyan-900/5 ring-1 ring-white/80 backdrop-blur-sm transition hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-600/30">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  Event invitations
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Search alumni, pick who to invite, and generate invitation
                  drafts.
                </p>
              </div>
            </div>
          </button>
        </div>
        <p className="mt-10 text-center text-sm text-slate-600">
          Institutions:{' '}
          <Link
            to="/organization"
            className="font-semibold text-violet-700 underline-offset-4 hover:text-amber-800 hover:underline"
          >
            Organization workspace
          </Link>{' '}
          — add your roster and search only your alumni.
        </p>
      </div>
    </main>
  )
}
