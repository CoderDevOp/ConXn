import { NavLink, Outlet, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { AppBrand } from '../../components/AppBrand'

const ALUMNI_INTENT_KEY = 'conxn_alumni_intent'

function clearAlumniSession() {
  sessionStorage.removeItem(ALUMNI_INTENT_KEY)
}

export function AlumniLayout() {
  const linkCls = ({ isActive }) =>
    `rounded-xl px-2.5 py-2 text-sm transition ${
      isActive
        ? 'bg-gradient-to-br from-emerald-100 to-amber-50 font-semibold text-emerald-950 shadow-sm ring-1 ring-emerald-200/90'
        : 'text-slate-600 hover:bg-emerald-50/80 hover:text-slate-900'
    }`

  return (
    <div className="min-h-svh bg-gradient-to-br from-emerald-50/85 via-white to-amber-50/65">
      <div className="flex">
        <aside className="fixed left-0 top-0 z-20 hidden h-svh w-56 flex-col border-r border-emerald-100/90 bg-white/85 px-4 py-6 shadow-sm shadow-emerald-950/5 backdrop-blur-md md:flex">
          <Link
            to="/"
            className="text-emerald-950 transition hover:text-amber-700"
          >
            <AppBrand
              iconClassName="h-7 w-7"
              textClassName="text-base font-semibold tracking-tight"
            />
          </Link>
          <p className="mt-1.5 inline-flex w-fit rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            Alumni
          </p>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            <NavLink to="/alumni" end className={linkCls}>
              Choose path
            </NavLink>
            <NavLink to="/alumni/mentor" className={linkCls}>
              Mentor hub
            </NavLink>
            <NavLink to="/alumni/discover" className={linkCls}>
              Discover peers
            </NavLink>
            <NavLink to="/alumni/chats" className={linkCls}>
              Chats
            </NavLink>
          </nav>
          <Link
            to="/"
            onClick={clearAlumniSession}
            className="mt-auto inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-500 transition hover:bg-amber-50/80 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Exit
          </Link>
        </aside>

        <div className="relative flex-1 md:pl-56">
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 md:left-56"
            aria-hidden
          />
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-100/80 bg-white/80 px-6 py-4 shadow-sm shadow-emerald-900/5 backdrop-blur-md md:hidden">
            <Link to="/" className="text-emerald-950">
              <AppBrand
                iconClassName="h-6 w-6"
                textClassName="text-sm font-semibold tracking-tight"
              />
            </Link>
            <div className="flex flex-wrap justify-end gap-2 text-xs font-medium sm:text-sm">
              <NavLink
                to="/alumni/discover"
                className={({ isActive }) =>
                  isActive ? 'text-emerald-800' : 'text-slate-600'
                }
              >
                Discover
              </NavLink>
              <NavLink
                to="/alumni/mentor"
                className={({ isActive }) =>
                  isActive ? 'text-emerald-800' : 'text-slate-600'
                }
              >
                Mentor
              </NavLink>
              <NavLink
                to="/alumni/chats"
                className={({ isActive }) =>
                  isActive ? 'text-emerald-800' : 'text-slate-600'
                }
              >
                Chats
              </NavLink>
              <Link
                to="/"
                onClick={clearAlumniSession}
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
