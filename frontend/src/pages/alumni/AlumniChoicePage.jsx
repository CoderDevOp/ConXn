import { useNavigate } from 'react-router-dom'
import { Compass, MessageCircle } from 'lucide-react'

const ALUMNI_INTENT_KEY = 'conxn_alumni_intent'

export function AlumniChoicePage() {
  const navigate = useNavigate()

  function go(path, intent) {
    sessionStorage.setItem(ALUMNI_INTENT_KEY, intent)
    navigate(path)
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-lg flex-col justify-center px-6 py-16 md:min-h-svh">
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-emerald-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-24 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/90">
          Alumni workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">
          Welcome back, alumni
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Pick a dedicated workspace. Switch anytime from the sidebar.
        </p>
        <div className="mt-10 grid gap-4">
          <button
            type="button"
            onClick={() => go('/alumni/mentor', 'mentor')}
            className="rounded-2xl border border-emerald-200/90 bg-white/90 p-6 text-left shadow-md shadow-emerald-900/5 ring-1 ring-white/80 backdrop-blur-sm transition hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-lime-600 text-white shadow-md shadow-emerald-600/30">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">Mentor hub</p>
                <p className="mt-1 text-sm text-slate-600">
                  Student requests with new/opened filters, optional AI reply or
                  AI decline, and inline send. Alumni chat stays in Chats /
                  Discover.
                </p>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => go('/alumni/discover', 'discover')}
            className="rounded-2xl border border-amber-200/90 bg-white/90 p-6 text-left shadow-md shadow-amber-900/5 ring-1 ring-white/80 backdrop-blur-sm transition hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/10"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-600/30">
                <Compass className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  Discover peers
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Smart search across alumni, criteria chips, and relaxed
                  suggestions. The graph lives on the home page.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </main>
  )
}
