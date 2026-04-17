import { NavLink, Outlet, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AppBrand } from '../../components/AppBrand'

const STUDENT_INTENT_KEY = 'conxn_student_intent'

function clearStudentSession() {
  sessionStorage.removeItem(STUDENT_INTENT_KEY)
}

export function StudentLayout() {
  const linkCls = ({ isActive }) =>
    `rounded-xl px-2.5 py-2 text-sm transition ${
      isActive
        ? 'bg-gradient-to-br from-violet-100 to-cyan-50 font-semibold text-violet-950 shadow-sm ring-1 ring-violet-200/80'
        : 'text-slate-600 hover:bg-violet-50/80 hover:text-slate-900'
    }`

  return (
    <div className="min-h-svh bg-gradient-to-br from-violet-50/90 via-white to-cyan-50/70">
      <div className="flex">
        <aside className="fixed left-0 top-0 z-20 hidden h-svh w-56 flex-col border-r border-violet-100/90 bg-white/85 px-4 py-6 shadow-sm shadow-violet-950/5 backdrop-blur-md md:flex">
          <Link
            to="/"
            className="text-violet-950 transition hover:text-cyan-700"
          >
            <AppBrand
              iconClassName="h-7 w-7"
              textClassName="text-base font-semibold tracking-tight"
            />
          </Link>
          <p className="mt-1.5 inline-flex w-fit rounded-full bg-violet-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">
            Student
          </p>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            <NavLink to="/student" end className={linkCls}>
              Choose path
            </NavLink>
            <NavLink to="/student/mentorship" className={linkCls}>
              Mentorship
            </NavLink>
            <NavLink to="/student/events" className={linkCls}>
              Event invitations
            </NavLink>
          </nav>
          <Link
            to="/"
            onClick={clearStudentSession}
            className="mt-auto inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-500 transition hover:bg-violet-50/80 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </Link>
        </aside>

        <div className="relative flex-1 md:pl-56">
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-1 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 md:left-56"
            aria-hidden
          />
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-violet-100/80 bg-white/80 px-6 py-4 shadow-sm shadow-violet-900/5 backdrop-blur-md md:hidden">
            <Link to="/" className="text-violet-950">
              <AppBrand
                iconClassName="h-6 w-6"
                textClassName="text-sm font-semibold tracking-tight"
              />
            </Link>
            <div className="flex gap-3 text-sm font-medium">
              <NavLink
                to="/student/events"
                className={({ isActive }) =>
                  isActive ? 'text-violet-700' : 'text-slate-600'
                }
              >
                Events
              </NavLink>
              <NavLink
                to="/student/mentorship"
                className={({ isActive }) =>
                  isActive ? 'text-violet-700' : 'text-slate-600'
                }
              >
                Mentor
              </NavLink>
              <Link
                to="/"
                onClick={clearStudentSession}
                className="text-slate-500"
              >
                Exit
              </Link>
            </div>
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
