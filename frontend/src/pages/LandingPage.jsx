import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Building2,
  GitBranch,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Ambiance3D } from '../components/Ambiance3D'
import { HeroBackdrop } from '../components/HeroBackdrop'
import { HERO_PHOTO_CREDIT } from '../components/heroPhotoCredit'
import { NetworkCanvas } from '../components/NetworkCanvas'
import { ScrollReveal } from '../components/ScrollReveal'
import { AuthModals } from '../components/AuthModals'
import { AppBrand } from '../components/AppBrand'

const GraphPanel = lazy(() =>
  import('../components/GraphPanel').then((m) => ({ default: m.GraphPanel })),
)

const HOW_STEPS = [
  {
    title: 'Map alumni relationships',
    d: 'Profiles are embedded with Sentence-BERT and connected in a NetworkX graph by shared college, employer, and skills.',
  },
  {
    title: 'Understand search intent',
    d: 'Your query is interpreted (LLM when available, heuristics offline), scored with structure + similarity, and expanded with near-matches by college or location.',
  },
  {
    title: 'Explore and reach out',
    d: 'Open the 2D or 3D network, inspect the strongest matches, then connect with a tailored message in the same flow.',
  },
]

const FEATURE_PANELS = [
  {
    t: 'LLM-aware search',
    d: 'Natural language is parsed into roles, schools, and cities, then fused with embeddings for better intent matching.',
    k: 'Intent + semantics',
    icon: BrainCircuit,
    a: 'from-indigo-500/20 via-indigo-400/10 to-transparent',
  },
  {
    t: 'Graph discovery',
    d: 'Visualize alumni clusters by college, company, and skills before you decide whom to contact.',
    k: 'Connection graph',
    icon: GitBranch,
    a: 'from-sky-500/20 via-cyan-400/10 to-transparent',
  },
  {
    t: 'Private organization workspace',
    d: 'Run search on your own roster with optional scope filters, while keeping institutional data separated from shared records.',
    k: 'Scoped roster',
    icon: ShieldCheck,
    a: 'from-violet-500/20 via-indigo-400/10 to-transparent',
  },
  {
    t: 'Smart outreach',
    d: 'Draft contextual outreach using profile and query context with local or cloud LLM options.',
    k: 'Action-ready',
    icon: Send,
    a: 'from-emerald-500/20 via-teal-400/10 to-transparent',
  },
]

export function LandingPage() {
  const [authModal, setAuthModal] = useState(null)

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-slate-100">
      {authModal && (
        <AuthModals mode={authModal} onClose={() => setAuthModal(null)} />
      )}

      {/* —— Hero: photo + depth + floating network —— */}
      <div className="relative isolate min-h-[min(88svh,900px)] overflow-hidden pb-10 sm:min-h-[90svh] sm:pb-14">
        <div className="absolute inset-0" aria-hidden>
          <HeroBackdrop />
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/58 via-white/42 to-indigo-50/52" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/62 via-white/28 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/[0.08] via-transparent to-sky-900/[0.1]" />
          <div className="bg-noise absolute inset-0 mix-blend-overlay opacity-[0.22]" />
          <div className="absolute inset-0 opacity-[0.58]">
            <Ambiance3D />
          </div>
          <div className="absolute inset-0 opacity-[0.46]">
            <NetworkCanvas />
          </div>
        </div>

        <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 pb-2 pt-5 sm:pt-6">
          <Link
            to="/"
            className="rounded-lg px-1 text-slate-900 drop-shadow-sm transition hover:text-indigo-800"
          >
            <AppBrand
              iconClassName="h-8 w-8"
              textClassName="text-lg font-semibold tracking-tight"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/50 bg-white/45 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 backdrop-blur-md sm:gap-5">
            <a
              href="#graph"
              className="rounded-md px-1.5 py-0.5 transition hover:bg-white/80 hover:text-slate-900"
            >
              Connections
            </a>
            <a
              href="#organization"
              className="rounded-md px-1.5 py-0.5 transition hover:bg-white/80 hover:text-slate-900"
            >
              Organizations
            </a>
            <a
              href="#how"
              className="rounded-md px-1.5 py-0.5 transition hover:bg-white/80 hover:text-slate-900"
            >
              How it Works
            </a>
            <a
              href="#features"
              className="rounded-md px-1.5 py-0.5 transition hover:bg-white/80 hover:text-slate-900"
            >
              Features
            </a>
          </nav>
        </header>

        <main className="relative z-10 mx-auto max-w-3xl px-6 pb-12 pt-6 text-center sm:pb-16 sm:pt-10">
          <ScrollReveal>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/75 px-3 py-1.5 text-xs font-medium text-indigo-900/90 shadow-md shadow-indigo-900/10 backdrop-blur-md">
              Semantic search · Graph intelligence · Mentorship
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 [text-shadow:0_1px_2px_rgba(255,255,255,0.9),0_0_40px_rgba(255,255,255,0.35)] sm:text-5xl sm:leading-[1.08]">
              Find the right alumni,{' '}
              <span className="bg-gradient-to-r from-indigo-700 to-sky-700 bg-clip-text text-transparent">
                not just any alumni
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-700 [text-shadow:0_0_24px_rgba(255,255,255,0.95)]">
              We do not only connect profiles in a list — we surface{' '}
              <span className="font-semibold text-slate-900">relations</span>: who
              shares your college, your city, your craft — so every search feels
              closer to a warm introduction than a cold filter.
            </p>

            <div className="mx-auto mt-10 max-w-xl">
              <label className="group relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400 transition group-focus-within:text-indigo-600" />
                <input
                  readOnly
                  placeholder="e.g. AI engineer from SRM in Chennai"
                  className="w-full rounded-2xl border border-white/70 bg-white/85 py-4 pl-12 pr-4 text-left text-sm text-slate-800 shadow-lg shadow-indigo-950/10 outline-none ring-1 ring-slate-200/60 backdrop-blur-md transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/15"
                />
              </label>
              <p className="mt-2 text-xs font-medium text-slate-600 [text-shadow:0_1px_12px_rgba(255,255,255,0.9)]">
                Sign in to run live search — the query is parsed by an LLM layer
                (when configured) and fused with embeddings for smarter matches.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAuthModal('signup')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:from-slate-800 hover:to-indigo-900 hover:shadow-xl"
              >
                Sign up
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setAuthModal('signin')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-md backdrop-blur-md transition hover:border-indigo-200 hover:bg-white hover:shadow-lg"
              >
                Sign in
              </button>
              <Link
                to="/student"
                className="text-sm font-semibold text-slate-600 underline-offset-4 [text-shadow:0_1px_10px_rgba(255,255,255,0.95)] transition hover:text-indigo-800 hover:underline"
              >
                Skip to student demo
              </Link>
              <Link
                to="/alumni"
                className="text-sm font-semibold text-slate-600 underline-offset-4 [text-shadow:0_1px_10px_rgba(255,255,255,0.95)] transition hover:text-indigo-800 hover:underline"
              >
                Skip to alumni demo
              </Link>
            </div>
          </ScrollReveal>
        </main>
      </div>

      <section
        id="graph"
        className="relative z-10 border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/90 to-white py-16"
      >
        <div className="mx-auto max-w-5xl px-6">
          <ScrollReveal>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-600/90">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Live preview
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              See how alumni connect
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Edges form when people share a college, employer, or skills — the
              same graph powers recommendations after you sign in.
            </p>
          </ScrollReveal>
          <ScrollReveal className="mt-8" delay={140}>
            <Suspense
              fallback={
                <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
                  Loading graph…
                </div>
              }
            >
              <div className="transform-gpu rounded-2xl shadow-xl shadow-indigo-500/[0.08] ring-1 ring-slate-200/70">
                <GraphPanel graphHeight={360} showChrome only3d />
              </div>
            </Suspense>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="organization"
        className="relative isolate z-10 scroll-mt-24 overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-indigo-50/65 via-white to-sky-50/55 py-20"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-16 top-16 h-52 w-52 rounded-full bg-indigo-400/18 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-sky-400/18 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(99,102,241,0.12),transparent_32%),radial-gradient(circle_at_78%_70%,rgba(56,189,248,0.12),transparent_34%)]" />
        </div>
        <div className="mx-auto max-w-5xl px-6">
          <ScrollReveal className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-800 shadow-sm backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
              For institutions
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Your alumni roster, your search
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              Create a workspace and drop a roster CSV — it stays in your
              organization&apos;s private database, not the shared ConXn list.
              Optionally opt in to copy the same upload into ConXn, scope by
              affiliated colleges, and run smart search only on your people.
            </p>
            <Link
              to="/organization"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/25 transition hover:bg-indigo-950 hover:shadow-xl"
            >
              Open organization workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="how"
        className="relative isolate z-10 overflow-hidden border-t border-slate-200/60 bg-gradient-to-b from-white via-slate-50/80 to-white py-20"
      >
        <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-6 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="mx-auto max-w-5xl px-6">
          <ScrollReveal className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700/80">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              A clear workflow from data to action. Follow the boxes and arrows to
              understand exactly how ConXn processes your search.
            </p>
          </ScrollReveal>

          <div className="mt-8 flex items-center justify-center">
            <span className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Start
            </span>
          </div>

          <ol className="mx-auto mt-6 flex max-w-5xl flex-col items-center gap-2 lg:flex-row lg:items-stretch lg:justify-center">
            {HOW_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex w-full max-w-xl flex-col items-center gap-2 lg:w-auto lg:max-w-none lg:flex-row"
              >
                <ScrollReveal
                  className="group w-full rounded-2xl border border-indigo-200/70 bg-white/90 p-5 shadow-md shadow-indigo-900/[0.06] ring-1 ring-white/70 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/12 lg:w-[280px]"
                  delay={80 + i * 120}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-800">
                    <span className="font-bold">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.d}</p>
                </ScrollReveal>
                {i < HOW_STEPS.length - 1 && (
                  <>
                    <ArrowDown className="h-5 w-5 text-indigo-300 lg:hidden" />
                    <ArrowRight className="hidden h-5 w-5 shrink-0 text-indigo-300 lg:block" />
                  </>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-6 flex items-center justify-center">
            <span className="rounded-full border border-sky-200 bg-sky-50/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
              Outcome: Better alumni matches + faster outreach
            </span>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative isolate z-10 overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-white via-indigo-50/45 to-sky-50/45 py-20"
      >
        <div className="pointer-events-none absolute -top-20 left-1/3 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="mx-auto max-w-5xl px-6">
          <ScrollReveal className="text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700/80">
              Features
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Everything is designed to turn alumni data into clear discovery and
              confident action.
            </p>
          </ScrollReveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURE_PANELS.map((feature, i) => {
              const Icon = feature.icon
              return (
                <ScrollReveal
                  key={feature.t}
                  delay={100 + i * 120}
                  className="group relative overflow-hidden rounded-2xl border border-white/75 bg-white/85 p-6 shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-200/70 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/15"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${feature.a}`}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                      <Icon className="h-3.5 w-3.5" />
                      {feature.k}
                    </span>
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="relative mt-4 text-base font-semibold tracking-tight text-slate-900">
                    {feature.t}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.d}
                  </p>
                  <div className="relative mt-5 h-px w-full bg-gradient-to-r from-indigo-200/70 via-slate-200 to-transparent transition group-hover:from-indigo-300 group-hover:via-slate-300" />
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/90 py-8 text-center text-xs text-slate-500 backdrop-blur-sm">
        <p className="font-medium text-slate-600">ConXn — demo alumni intelligence layer</p>
        <p className="mx-auto mt-3 max-w-lg leading-relaxed">
          Hero photograph by{' '}
          <a
            href={HERO_PHOTO_CREDIT.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-700 underline-offset-2 hover:underline"
          >
            {HERO_PHOTO_CREDIT.photographer}
          </a>{' '}
          on{' '}
          <a
            href={HERO_PHOTO_CREDIT.photoPageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-700 underline-offset-2 hover:underline"
          >
            Unsplash
          </a>
          .
        </p>
      </footer>
    </div>
  )
}
