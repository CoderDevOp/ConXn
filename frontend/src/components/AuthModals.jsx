import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

const SESSION_KEY = 'conxn_demo_session'

export function AuthModals({ mode, onClose }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')

  function submit(e) {
    e.preventDefault()
    sessionStorage.removeItem('conxn_student_intent')
    sessionStorage.removeItem('conxn_alumni_intent')
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: email.trim(),
        name: (name.trim() || email.split('@')[0] || 'Guest').slice(0, 80),
        role,
        mode,
      }),
    )
    onClose()
    navigate(role === 'student' ? '/student' : '/alumni')
  }

  const signup = mode === 'signup'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2
          id="auth-title"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          {signup ? 'Create a demo account' : 'Sign in'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {signup
            ? 'No backend auth — this stores a session in your browser for the demo.'
            : 'Welcome back. Pick a role to enter the demo workspace.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {signup && (
            <div>
              <label className="text-xs font-medium text-slate-600">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              placeholder="you@university.edu"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
              placeholder="Demo only — not validated"
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-600">I am a</span>
            <div className="mt-2 flex gap-2">
              {[
                { id: 'student', label: 'Student' },
                { id: 'alumni', label: 'Alumni' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setRole(o.id)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    role === o.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {signup ? 'Sign up & continue' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
