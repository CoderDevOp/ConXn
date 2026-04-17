import { ChevronRight } from 'lucide-react'

export function SearchHitArticle({
  a,
  tierBadgeClass,
  onConnect,
  showConnect = true,
  showConnections = true,
}) {
  return (
    <article className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">{a.name}</h3>
            {a.match_tier && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tierBadgeClass(a.match_tier)}`}
              >
                {a.match_tier}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            {a.role_company} · {a.location}
          </p>
          {a.match_signals?.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              Signals: {a.match_signals.join(' · ')}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(a.skills_tags || []).map((t) => (
              <span
                key={t}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        {showConnect && onConnect && (
          <button
            type="button"
            onClick={() => onConnect(a)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Connect
            <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">
        <span className="font-medium text-slate-800">Why this match</span>
        <br />
        {a.explanation}
      </p>
      {showConnections && a.connections?.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Network:{' '}
          {a.connections
            .slice(0, 4)
            .map((c) => c.name)
            .join(', ')}
          {a.connections.length > 4 ? '…' : ''}
        </p>
      )}
    </article>
  )
}
