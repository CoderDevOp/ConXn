import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import {
  fetchPlatformThread,
  fetchPlatformThreads,
  sendPlatformMessage,
} from '../../api'

const SELF_ID_KEY = 'conxn_alumni_id'

export function AlumniChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selfId = useMemo(
    () => localStorage.getItem(SELF_ID_KEY) || '0',
    [],
  )
  const [threads, setThreads] = useState([])
  const [activePeer, setActivePeer] = useState(
    () => searchParams.get('peer') || '',
  )
  const [detail, setDetail] = useState(null)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)

  const loadThreads = useCallback(async () => {
    setLoadingList(true)
    try {
      const d = await fetchPlatformThreads(selfId)
      setThreads(d.threads || [])
    } catch {
      setThreads([])
    } finally {
      setLoadingList(false)
    }
  }, [selfId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    const p = searchParams.get('peer')
    if (p) setActivePeer(p)
  }, [searchParams])

  useEffect(() => {
    if (!activePeer) {
      setDetail(null)
      return
    }
    let cancel = false
    setLoadingThread(true)
    fetchPlatformThread(selfId, activePeer)
      .then((d) => {
        if (!cancel) setDetail(d)
      })
      .catch(() => {
        if (!cancel) setDetail(null)
      })
      .finally(() => {
        if (!cancel) setLoadingThread(false)
      })
    return () => {
      cancel = true
    }
  }, [selfId, activePeer])

  function openPeer(peerId) {
    setActivePeer(peerId)
    setSearchParams({ peer: peerId }, { replace: true })
  }

  async function send() {
    const body = draft.trim()
    if (!body || !activePeer) return
    setErr('')
    setSending(true)
    try {
      await sendPlatformMessage(selfId, activePeer, body)
      setDraft('')
      const d = await fetchPlatformThread(selfId, activePeer)
      setDetail(d)
      loadThreads()
    } catch (e) {
      const raw = e?.response?.data?.detail
      let msg =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.map((x) => x?.msg || x).join(' ')
            : raw
      if (!msg && typeof e?.response?.data === 'string') msg = e.response.data
      setErr(String(msg || e?.message || 'Could not send'))
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="relative mx-auto max-w-5xl border-t border-emerald-100/60 bg-gradient-to-b from-white/70 via-emerald-50/20 to-teal-50/15 px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Chats
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Messages
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Conversations with your ConXn connections and student requests.{' '}
          <Link to="/alumni/discover" className="font-medium text-blue-700 hover:underline">
            Discover peers
          </Link>{' '}
          to connect first.
        </p>
      </div>

      <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Conversations
          </div>
          {loadingList ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No threads yet.</p>
          ) : (
            <ul className="max-h-[50vh] overflow-y-auto md:max-h-[min(70vh,560px)]">
              {threads.map((t) => (
                <li key={t.thread_key}>
                  <button
                    type="button"
                    onClick={() => openPeer(t.peer_id)}
                    className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-3 py-3 text-left text-sm transition hover:bg-slate-50 ${
                      activePeer === t.peer_id ? 'bg-blue-50/80' : ''
                    }`}
                  >
                    <span className="font-medium text-slate-900">
                      {t.peer_name}
                    </span>
                    <span className="line-clamp-2 text-xs text-slate-500">
                      {t.last_body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[320px] flex-1 flex-col">
          {!activePeer ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
              <MessageSquare className="h-10 w-10 text-slate-300" />
              <p>Select a conversation or open one from Mentor hub.</p>
            </div>
          ) : loadingThread ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="font-semibold text-slate-900">
                  {detail?.peer_name || activePeer}
                </p>
                <p className="text-xs text-slate-500">
                  {activePeer.startsWith('student:')
                    ? 'Student request thread'
                    : 'Alumni connection'}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
                {(detail?.messages || []).map((m) => {
                  const mine = m.from === selfId
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          mine
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? 'text-slate-400' : 'text-slate-400'
                          }`}
                        >
                          {m.at?.replace('T', ' ').slice(0, 16) || ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-slate-100 p-3">
                {err && (
                  <p className="mb-2 text-xs text-red-600">{err}</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Write a message…"
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || !draft.trim()}
                    className="inline-flex shrink-0 items-center justify-center self-end rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Enter to send · Shift+Enter for newline
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
