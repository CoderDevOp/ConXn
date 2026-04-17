import { useEffect, useState } from 'react'
import { Copy, Loader2, Send, Sparkles, X } from 'lucide-react'
import { generateEmail, sendEmail } from '../api'

export function EmailModal({
  open,
  onClose,
  alumni,
  searchQuery,
  studentNote = '',
}) {
  const [intentDraft, setIntentDraft] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState('warm and professional')
  const [loading, setLoading] = useState(false)
  const [sendTo, setSendTo] = useState('')
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!open || !alumni) return
    setStatus(null)
    setIntentDraft((studentNote || '').trim())
    setBody(`Hi ${alumni.name},\n\n`)
    setLoading(false)
  }, [open, alumni?.id, studentNote])

  if (!open || !alumni) return null

  async function enhanceWithAi() {
    const notes = intentDraft.trim()
    const ctx = notes || (studentNote || '').trim() || (searchQuery || '').trim()
    if (!ctx) {
      setStatus('Add a few lines in “Your purpose & notes” first (or set context from search).')
      return
    }
    setStatus(null)
    setLoading(true)
    try {
      const r = await generateEmail({
        alumni_id: alumni.id,
        query: searchQuery || '',
        student_note: studentNote || '',
        draft_notes: intentDraft,
        tone,
        current_message: body,
      })
      setBody(r.email || body)
      setStatus(r.used_llm ? 'Draft updated with AI.' : 'Template applied (LLM offline).')
    } catch {
      setStatus('Could not reach the API — edit the email manually.')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(body)
    setStatus('Copied to clipboard')
  }

  async function handleSend() {
    setLoading(true)
    try {
      const r = await sendEmail({
        to_email: sendTo || 'demo@conxn.app',
        subject: `Hello from ConXn — ${alumni.name}`,
        body,
      })
      setStatus(r.message || 'Sent')
    } catch {
      setStatus('Saved as draft (demo)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 transition-all duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Cold outreach
            </p>
            <p className="text-sm font-semibold text-slate-900">
              To {alumni.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="conxn-intent-draft"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Your purpose &amp; rough notes
            </label>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Write what you want them to know and why you are reaching out (bullets or messy
              sentences are fine).{' '}
              <span className="font-medium text-slate-700">Enhance with AI</span> turns this — plus
              the draft below — into a polished email.
            </p>
            <textarea
              id="conxn-intent-draft"
              value={intentDraft}
              onChange={(e) => setIntentDraft(e.target.value)}
              rows={5}
              disabled={loading}
              placeholder={`Example:\n• Saw your work at ${alumni.company} on ML infra\n• I'm a student exploring careers in applied ML\n• Hoping for 15 min of advice on breaking into the field`}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-amber-50/40 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-500/15 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['warm and professional', 'formal', 'friendly and brief'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                disabled={loading}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                  tone === t
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label
              htmlFor="conxn-email-body"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Email (edit after AI or write by hand)
            </label>
            <div className="relative mt-2">
              <textarea
                id="conxn-email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={11}
                disabled={loading}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed text-slate-800 outline-none ring-blue-500/20 transition focus:border-blue-300 focus:ring-2 disabled:opacity-60"
                placeholder="Polished message appears here after Enhance, or type directly…"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="email"
              placeholder="Recipient email (optional)"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 sm:max-w-xs disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={enhanceWithAi}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-blue-100 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Enhance with AI
              </button>
              <button
                type="button"
                onClick={copy}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
          {status && <p className="text-xs text-slate-600">{status}</p>}
        </div>
      </div>
    </div>
  )
}
