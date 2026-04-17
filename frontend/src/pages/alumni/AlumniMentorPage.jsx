import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Loader2, Mail, Send, Sparkles, X } from 'lucide-react'
import {
  fetchPlatformMentorRequests,
  markMentorRequestSeen,
  mentorAiDraft,
  sendPlatformMessage,
  seedMentorInbox,
} from '../../api'

const SELF_ID_KEY = 'conxn_alumni_id'

const INBOX_FILTER_ALL = 'all'
const INBOX_FILTER_UNREAD = 'unread'
const INBOX_FILTER_SEEN = 'seen'

const TIME_SLOTS = [
  'Mon 5:00–5:30 pm IST',
  'Tue 6:00–6:30 pm IST',
  'Wed 12:00–12:30 pm IST',
]

function isStudentPeer(peerId) {
  return String(peerId).startsWith('student:')
}

function studentRequestText(t) {
  const r = (t.request_body || '').trim()
  return r || (t.last_body || '').trim()
}

function isUnreadRequest(t) {
  return t.mentor_seen !== true
}

export function AlumniMentorPage() {
  const selfId = useMemo(
    () => localStorage.getItem(SELF_ID_KEY) || '0',
    [],
  )
  const [threads, setThreads] = useState([])
  const [filter, setFilter] = useState(INBOX_FILTER_ALL)
  const [expandedPeer, setExpandedPeer] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [aiNote, setAiNote] = useState('')
  const [booting, setBooting] = useState(true)
  const [timeModalPeer, setTimeModalPeer] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState(() => new Set(TIME_SLOTS))
  const [actionBusy, setActionBusy] = useState(null)
  const [aiBusy, setAiBusy] = useState(null)

  const loadThreads = useCallback(async () => {
    try {
      const d = await fetchPlatformMentorRequests(selfId)
      setThreads(d.threads || [])
    } catch {
      setThreads([])
    }
  }, [selfId])

  useEffect(() => {
    let cancel = false
    setBooting(true)
    seedMentorInbox(selfId)
      .catch(() => {})
      .finally(() => {
        if (!cancel) {
          loadThreads().finally(() => {
            if (!cancel) setBooting(false)
          })
        }
      })
    return () => {
      cancel = true
    }
  }, [selfId, loadThreads])

  useEffect(() => {
    if (!expandedPeer) setReplyDraft('')
  }, [expandedPeer])

  const studentThreads = threads.filter((t) => isStudentPeer(t.peer_id))

  const visibleThreads =
    filter === INBOX_FILTER_UNREAD
      ? studentThreads.filter((t) => isUnreadRequest(t))
      : filter === INBOX_FILTER_SEEN
        ? studentThreads.filter((t) => t.mentor_seen === true)
        : studentThreads

  const unreadCount = studentThreads.filter((t) => isUnreadRequest(t)).length
  const seenCount = studentThreads.filter((t) => t.mentor_seen === true).length

  async function markRead(peerId) {
    setActionBusy(`read-${peerId}`)
    try {
      await markMentorRequestSeen(selfId, peerId, true)
      await loadThreads()
    } finally {
      setActionBusy(null)
    }
  }

  async function sendDeclineTemplate(peerId) {
    setActionBusy(`decline-${peerId}`)
    try {
      await sendPlatformMessage(
        selfId,
        peerId,
        'Thank you for reaching out. I will not be able to take this on right now, but I wish you the best with your plans.',
      )
      await loadThreads()
      setExpandedPeer(null)
    } finally {
      setActionBusy(null)
    }
  }

  async function declineWithAi(peerId) {
    if (
      !window.confirm(
        'Send an AI-written polite decline to this student? You can configure Gemini/Ollama on the server for best results.',
      )
    ) {
      return
    }
    setAiBusy(`decline-${peerId}`)
    try {
      const d = await mentorAiDraft({
        alumni_id: selfId,
        peer_id: peerId,
        mode: 'decline',
        note: aiNote,
      })
      await sendPlatformMessage(selfId, peerId, d.text)
      await loadThreads()
      setExpandedPeer(null)
    } catch {
      window.alert('Could not generate or send decline. Check the API and try again.')
    } finally {
      setAiBusy(null)
    }
  }

  async function draftReplyWithAi(peerId) {
    setAiBusy(`reply-${peerId}`)
    try {
      const d = await mentorAiDraft({
        alumni_id: selfId,
        peer_id: peerId,
        mode: 'reply',
        note: aiNote,
      })
      setReplyDraft(d.text)
    } catch {
      window.alert('Could not draft a reply. Check the API / LLM configuration.')
    } finally {
      setAiBusy(null)
    }
  }

  async function sendReply(peerId) {
    const body = replyDraft.trim()
    if (!body) return
    setActionBusy(`reply-${peerId}`)
    try {
      await sendPlatformMessage(selfId, peerId, body)
      setReplyDraft('')
      await loadThreads()
    } finally {
      setActionBusy(null)
    }
  }

  async function confirmTimeSlots() {
    if (!timeModalPeer) return
    const slots = TIME_SLOTS.filter((s) => selectedSlots.has(s))
    const body =
      slots.length > 0
        ? `Here are some times that work for me — let me know what suits you best:\n${slots.map((s) => `• ${s}`).join('\n')}`
        : 'I would like to suggest a quick call — please share a few windows that work for you and I will try to match one.'
    setActionBusy(`time-${timeModalPeer}`)
    try {
      await sendPlatformMessage(selfId, timeModalPeer, body)
      await loadThreads()
      setTimeModalPeer(null)
      setSelectedSlots(new Set(TIME_SLOTS))
      setExpandedPeer(null)
    } finally {
      setActionBusy(null)
    }
  }

  function toggleSlot(s) {
    setSelectedSlots((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  return (
    <main className="relative mx-auto max-w-3xl space-y-10 border-t border-teal-100/70 bg-gradient-to-b from-teal-50/30 via-white/65 to-emerald-50/25 px-6 py-10 pb-20">
      <section>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Mentor hub
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Student requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          New vs opened labels are for your queue. Use AI to draft a reply or a
          polite decline (server uses Gemini/Ollama when configured). Alumni
          networking:{' '}
          <Link
            to="/alumni/discover"
            className="font-medium text-blue-700 hover:underline"
          >
            Discover peers
          </Link>
          .
        </p>
      </section>

      <section id="inbox" className="scroll-mt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
              <p className="text-xs text-slate-500">
                {studentThreads.length} from students · {unreadCount} new ·{' '}
                {seenCount} opened
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setFilter(INBOX_FILTER_ALL)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                filter === INBOX_FILTER_ALL
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter(INBOX_FILTER_UNREAD)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                filter === INBOX_FILTER_UNREAD
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Unread
              {unreadCount > 0 ? (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-xs ${
                    filter === INBOX_FILTER_UNREAD
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setFilter(INBOX_FILTER_SEEN)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                filter === INBOX_FILTER_SEEN
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Opened
              {seenCount > 0 ? (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-xs ${
                    filter === INBOX_FILTER_SEEN
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {seenCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {booting ? (
          <div className="mt-8 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {visibleThreads.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                No student requests in this view.
              </li>
            )}
            {visibleThreads.map((t) => {
              const open = expandedPeer === t.peer_id
              const unread = isUnreadRequest(t)
              return (
                <li
                  key={t.thread_key}
                  className={`overflow-hidden rounded-xl border bg-white transition hover:border-slate-300 ${
                    unread
                      ? 'border-l-4 border-l-blue-600 border-slate-200/80'
                      : 'border-slate-200/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedPeer(open ? null : t.peer_id)}
                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50/80"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {t.peer_name}
                        </span>
                        <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                          Student
                        </span>
                        {unread ? (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                            New
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                            Opened
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {studentRequestText(t)}
                      </p>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Their request
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {studentRequestText(t)}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => markRead(t.peer_id)}
                          disabled={!!actionBusy || !!aiBusy || t.mentor_seen === true}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                          {actionBusy === `read-${t.peer_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Mark opened'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimeModalPeer(t.peer_id)}
                          disabled={!!actionBusy || !!aiBusy}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Suggest times
                        </button>
                        <button
                          type="button"
                          onClick={() => sendDeclineTemplate(t.peer_id)}
                          disabled={!!actionBusy || !!aiBusy}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {actionBusy === `decline-${t.peer_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Decline (short)'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => declineWithAi(t.peer_id)}
                          disabled={!!actionBusy || !!aiBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-100 disabled:opacity-50"
                        >
                          {aiBusy === `decline-${t.peer_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Decline with AI
                        </button>
                      </div>

                      <div className="mt-5 border-t border-slate-200/80 pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Optional note for AI
                        </p>
                        <input
                          type="text"
                          value={aiNote}
                          onChange={(e) => setAiNote(e.target.value)}
                          placeholder="e.g. Keep it under 120 words, mention ConXn once…"
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="mt-4 border-t border-slate-200/80 pt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Reply to student
                          </p>
                          <button
                            type="button"
                            onClick={() => draftReplyWithAi(t.peer_id)}
                            disabled={!!actionBusy || !!aiBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 transition hover:bg-violet-100 disabled:opacity-50"
                          >
                            {aiBusy === `reply-${t.peer_id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Draft reply with AI
                          </button>
                        </div>
                        <textarea
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          rows={5}
                          placeholder="Write your reply, or use “Draft reply with AI” above…"
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => sendReply(t.peer_id)}
                            disabled={!replyDraft.trim() || !!actionBusy || !!aiBusy}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                          >
                            {actionBusy === `reply-${t.peer_id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Send reply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {timeModalPeer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="relative max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-modal-title"
          >
            <button
              type="button"
              onClick={() => {
                setTimeModalPeer(null)
                setSelectedSlots(new Set(TIME_SLOTS))
              }}
              className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2
              id="time-modal-title"
              className="pr-8 text-lg font-semibold text-slate-900"
            >
              Suggest times
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These slots will be sent as your reply to this student.
            </p>
            <ul className="mt-4 space-y-2">
              {TIME_SLOTS.map((s) => (
                <li key={s}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedSlots.has(s)}
                      onChange={() => toggleSlot(s)}
                      className="rounded border-slate-300"
                    />
                    {s}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTimeModalPeer(null)
                  setSelectedSlots(new Set(TIME_SLOTS))
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTimeSlots}
                disabled={!!actionBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {actionBusy === `time-${timeModalPeer}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Send reply
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
