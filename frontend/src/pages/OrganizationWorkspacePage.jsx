import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Loader2, Search, Sparkles, Upload } from 'lucide-react'
import {
  addOrganizationAlumni,
  createOrganization,
  getOrganization,
  organizationSmartSearch,
  uploadOrganizationAlumniCsv,
} from '../api'
import { EmailModal } from '../components/EmailModal'
import { SearchHitArticle } from '../components/SearchHitArticle'
import { useSearchLoadingPhase } from '../hooks/useSearchLoadingPhase'
import { AppBrand } from '../components/AppBrand'

const ORG_STORAGE_KEY = 'conxn_org_workspace_id'

function tierBadgeClass(tier) {
  if (tier === 'strong') return 'bg-emerald-100 text-emerald-800'
  if (tier === 'good') return 'bg-blue-100 text-blue-800'
  if (tier === 'semantic') return 'bg-slate-100 text-slate-700'
  return 'bg-amber-100 text-amber-900'
}

export function OrganizationWorkspacePage() {
  const [orgId, setOrgId] = useState('')
  const [summary, setSummary] = useState(null)
  const [createName, setCreateName] = useState('Our alumni office')
  const [createColleges, setCreateColleges] = useState('SRM, IIT Madras')
  const [createBusy, setCreateBusy] = useState(false)
  const [loadIdInput, setLoadIdInput] = useState('')

  const [q, setQ] = useState('engineers in Bangalore with ML skills')
  const [filteredResults, setFilteredResults] = useState([])
  const [recommendedResults, setRecommendedResults] = useState([])
  const [smartMeta, setSmartMeta] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const searchPhase = useSearchLoadingPhase(loading)

  const [addName, setAddName] = useState('')
  const [addCollege, setAddCollege] = useState('SRM — Computer Science (B.Tech)')
  const [addCompany, setAddCompany] = useState('')
  const [addSkills, setAddSkills] = useState('Python, ML')
  const [addLocation, setAddLocation] = useState('Chennai')
  const [addExp, setAddExp] = useState(4)
  const [addBusy, setAddBusy] = useState(false)
  const [addMsg, setAddMsg] = useState(null)

  const fileInputRef = useRef(null)
  const [replaceRoster, setReplaceRoster] = useState(false)
  const [shareWithConxn, setShareWithConxn] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(ORG_STORAGE_KEY)
    if (saved) setOrgId(saved)
  }, [])

  async function refreshSummary(id) {
    if (!id) {
      setSummary(null)
      return
    }
    try {
      const s = await getOrganization(id)
      setSummary(s)
    } catch {
      setSummary(null)
    }
  }

  useEffect(() => {
    refreshSummary(orgId)
  }, [orgId])

  async function handleCreate() {
    setCreateBusy(true)
    setErr(null)
    try {
      const colleges = createColleges
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const data = await createOrganization({
        name: createName.trim() || 'Organization',
        affiliated_colleges: colleges,
      })
      localStorage.setItem(ORG_STORAGE_KEY, data.id)
      setOrgId(data.id)
      setSummary(data)
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Could not create workspace')
    } finally {
      setCreateBusy(false)
    }
  }

  function handleLeaveWorkspace() {
    localStorage.removeItem(ORG_STORAGE_KEY)
    setOrgId('')
    setSummary(null)
    setFilteredResults([])
    setRecommendedResults([])
    setSuggestions([])
    setSmartMeta(null)
  }

  function handleLoadPastedId() {
    const id = loadIdInput.trim()
    if (!id) return
    localStorage.setItem(ORG_STORAGE_KEY, id)
    setOrgId(id)
    setLoadIdInput('')
  }

  async function runSearch() {
    if (!orgId) return
    setLoading(true)
    setErr(null)
    try {
      const data = await organizationSmartSearch(orgId, q, 10)
      setSmartMeta({
        interpretation_line: data.interpretation_line,
        criteria: data.criteria,
      })
      setFilteredResults(data.filtered || [])
      setRecommendedResults(data.recommended || [])
      setSuggestions(data.suggestions || [])
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Search failed')
      setFilteredResults([])
      setRecommendedResults([])
      setSmartMeta(null)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAlumni() {
    if (!orgId) return
    setAddBusy(true)
    setAddMsg(null)
    try {
      await addOrganizationAlumni(orgId, {
        name: addName.trim() || `Alumni ${(summary?.roster_in_scope ?? 0) + 1}`,
        college: addCollege,
        company: addCompany || '—',
        skills: addSkills,
        location: addLocation,
        experience: Number(addExp) || 0,
      })
      setAddMsg('Profile added to your roster.')
      setAddName('')
      await refreshSummary(orgId)
    } catch (e) {
      setAddMsg(
        e.response?.data?.detail ||
          e.message ||
          'Could not add alumni (check college vs scope).',
      )
    } finally {
      setAddBusy(false)
    }
  }

  const scopeHint = useMemo(() => {
    if (!summary?.affiliated_colleges?.length) {
      return 'No college filter — every profile in your file is stored in your workspace.'
    }
    return `Only CSV rows whose college field contains one of: ${summary.affiliated_colleges.join(', ')}`
  }, [summary])

  async function handleCsvFile(file) {
    if (!orgId || !file) return
    if (!file.name?.toLowerCase().endsWith('.csv')) {
      setUploadMsg('Please drop a .csv file.')
      return
    }
    setUploadBusy(true)
    setUploadMsg(null)
    try {
      const r = await uploadOrganizationAlumniCsv(orgId, file, {
        replace: replaceRoster,
        shareWithConxn,
      })
      const head = replaceRoster
        ? `Replaced your workspace roster with this file (${r.rows_accepted_from_file ?? 0} row(s) after scope filter).`
        : `Merged into your workspace: ${r.new_rows_added ?? 0} new row(s); roster now ${r.roster_total ?? '—'} total.`
      const parts = [
        head,
        r.skipped_college_scope
          ? `Skipped ${r.skipped_college_scope} row(s) (outside college scope).`
          : null,
        r.duplicates_skipped_vs_existing
          ? `Skipped ${r.duplicates_skipped_vs_existing} duplicate(s) vs existing roster.`
          : null,
        r.shared_to_conxn
          ? `Also added ${r.shared_to_conxn} row(s) to the shared ConXn alumni directory.`
          : null,
      ].filter(Boolean)
      setUploadMsg(parts.join(' '))
      await refreshSummary(orgId)
    } catch (e) {
      setUploadMsg(
        e.response?.data?.detail ||
          e.message ||
          'Upload failed — check CSV columns and college scope.',
      )
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-gradient-to-b from-amber-50/80 via-stone-100/85 to-slate-200/70">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-amber-200/30 to-transparent blur-2xl" />
        <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-[-5rem] top-[22rem] h-72 w-72 rounded-full bg-sky-300/14 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-300/12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.12),transparent_35%),radial-gradient(circle_at_82%_45%,rgba(56,189,248,0.1),transparent_34%),radial-gradient(circle_at_50%_88%,rgba(139,92,246,0.08),transparent_30%)]" />
      </div>
      <header className="relative z-10 border-b border-amber-200/60 bg-amber-50/40 px-6 py-4 shadow-sm shadow-amber-900/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-amber-950 transition hover:text-amber-800"
          >
            <span aria-hidden>←</span>
            <AppBrand
              iconClassName="h-6 w-6"
              textClassName="text-sm font-semibold tracking-tight"
            />
          </Link>
          <nav className="flex flex-wrap gap-2 rounded-xl border border-amber-200/50 bg-white/50 px-2 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            <Link
              to="/student"
              className="rounded-lg px-2 py-1 transition hover:bg-sky-50 hover:text-sky-900"
            >
              Student
            </Link>
            <Link
              to="/alumni"
              className="rounded-lg px-2 py-1 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              Alumni
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl space-y-14 px-6 py-10">
        <section>
          <p className="inline-flex rounded-full border border-amber-200/80 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-sm shadow-amber-900/10 backdrop-blur-sm">
            Organization
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 [text-shadow:0_1px_8px_rgba(255,255,255,0.75)]">
            Your alumni roster, your search scope
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            Create a workspace for your institution or chapter, optionally pin
            affiliated college names so only matching alumni appear in the pool,
            upload your own rows, then run the same smart search as the student
            tools — limited to your data only.
          </p>
        </section>

        {!orgId ? (
          <section className="rounded-2xl border border-amber-200/80 bg-white/85 p-6 shadow-lg shadow-amber-900/5 ring-1 ring-stone-200/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-stone-900">
              <Building2 className="h-5 w-5 text-amber-700" />
              <h2 className="text-lg font-semibold">Create a workspace</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Affiliated colleges are optional substring filters on each
              profile&apos;s college field (e.g. &quot;SRM&quot;, &quot;IIT
              Madras&quot;). Leave the list empty to accept any college text.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Organization name
            </label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Affiliated colleges (comma-separated)
            </label>
            <input
              value={createColleges}
              onChange={(e) => setCreateColleges(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="SRM, Anna University"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={createBusy}
              className="mt-4 rounded-xl bg-gradient-to-r from-amber-800 to-stone-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/20 transition hover:from-amber-900 hover:to-stone-900 disabled:opacity-50"
            >
              {createBusy ? 'Creating…' : 'Create workspace'}
            </button>
            <div className="mt-8 border-t border-amber-100/80 pt-6">
              <p className="text-sm font-medium text-slate-800">Already have an ID?</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={loadIdInput}
                  onChange={(e) => setLoadIdInput(e.target.value)}
                  placeholder="org_xxxxxxxxxxxx"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleLoadPastedId}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Load workspace
                </button>
              </div>
            </div>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-stone-50/80 p-5 shadow-md shadow-amber-900/5 ring-1 ring-white/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-900/90">
                    Active workspace
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {summary?.name || 'Loading…'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{orgId}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Roster in scope:{' '}
                    <span className="font-semibold text-slate-900">
                      {summary?.roster_in_scope ?? '—'}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  Switch workspace
                </button>
              </div>
            </section>

            <section id="roster" className="scroll-mt-24">
              <div className="flex items-center gap-2 text-slate-900">
                <Upload className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-semibold">Alumni roster (your workspace)</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Drop a CSV here — it is saved only to this organization&apos;s private
                roster, not the shared ConXn alumni list. Use the checkbox below if you
                also want this upload copied into ConXn.
              </p>
              <p className="mt-2 text-xs text-slate-500">{scopeHint}</p>
              <p className="mt-1 text-xs text-slate-500">
                Columns: either{' '}
                <code className="rounded bg-slate-100 px-1">name, college, company, skills, location</code>{' '}
                (optional <code className="rounded bg-slate-100 px-1">experience</code>) or
                the extended <code className="rounded bg-slate-100 px-1">alumni_*</code>{' '}
                schema like the main demo export.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) handleCsvFile(f)
                }}
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={replaceRoster}
                    onChange={(e) => setReplaceRoster(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Replace entire roster with this file (default: merge / append)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={shareWithConxn}
                    onChange={(e) => setShareWithConxn(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Also copy this upload into the shared ConXn alumni directory
                </label>
              </div>

              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleCsvFile(f)
                }}
                className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50/60'
                    : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                {uploadBusy ? (
                  <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
                ) : (
                  <Upload className="h-10 w-10 text-slate-400" />
                )}
                <p className="mt-3 text-sm font-medium text-slate-800">
                  Drop CSV here or click to browse
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Private to your organization until you opt in to share with ConXn.
                </p>
              </button>
              {uploadMsg && (
                <p className="mt-3 text-sm text-slate-700" role="status">
                  {uploadMsg}
                </p>
              )}

              <details className="mt-10 rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-800">
                  Add one profile by hand
                </summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Full name (optional)"
                  />
                  <input
                    value={addCollege}
                    onChange={(e) => setAddCollege(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="College / program"
                  />
                  <input
                    value={addCompany}
                    onChange={(e) => setAddCompany(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Current company"
                  />
                  <input
                    value={addLocation}
                    onChange={(e) => setAddLocation(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Location"
                  />
                </div>
                <input
                  value={addSkills}
                  onChange={(e) => setAddSkills(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Skills (comma-separated)"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    Years since graduation (approx.)
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={addExp}
                      onChange={(e) => setAddExp(e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAlumni}
                    disabled={addBusy}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addBusy ? 'Saving…' : 'Add to roster'}
                  </button>
                </div>
                {addMsg && <p className="mt-2 text-sm text-slate-700">{addMsg}</p>}
              </details>
            </section>

            <section id="search" className="scroll-mt-24 pb-24">
              <div className="flex items-center gap-2 text-slate-900">
                <Search className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-semibold">Search your roster only</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Parsed criteria and embeddings run only on profiles in this
                workspace.
              </p>
              {smartMeta?.interpretation_line && (
                <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                  {smartMeta.interpretation_line}
                </p>
              )}
              {smartMeta?.criteria && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    ['roles', 'Role'],
                    ['skills', 'Skills'],
                    ['colleges', 'College'],
                    ['locations', 'Location'],
                    ['companies', 'Company'],
                  ].map(([key, label]) => {
                    const arr = smartMeta.criteria[key]
                    if (!arr?.length) return null
                    return (
                      <span
                        key={key}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
                      >
                        <span className="font-medium text-slate-800">{label}:</span>{' '}
                        {arr.slice(0, 4).join(', ')}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Who are you looking for?"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Search
                </button>
              </div>
              {loading && searchPhase && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-800">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                  {searchPhase}
                </p>
              )}
              {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Filtered matches
              </h3>
              <div className="mt-3 space-y-4">
                {filteredResults.length === 0 && !loading && (
                  <p className="text-sm text-slate-500">
                    Add alumni, then search. Results never leave your roster.
                  </p>
                )}
                {filteredResults.map((a) => (
                  <SearchHitArticle
                    key={a.id}
                    a={a}
                    tierBadgeClass={tierBadgeClass}
                    onConnect={(alum) => {
                      setSelected(alum)
                      setModalOpen(true)
                    }}
                  />
                ))}
              </div>
              {recommendedResults.length > 0 && (
                <div className="mt-10 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800/90">
                    Recommended (partial fit)
                  </h3>
                  <div className="space-y-4">
                    {recommendedResults.map((a) => (
                      <SearchHitArticle
                        key={a.id}
                        a={a}
                        tierBadgeClass={tierBadgeClass}
                        onConnect={(alum) => {
                          setSelected(alum)
                          setModalOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="mt-10 space-y-6">
                  <h3 className="text-sm font-semibold text-slate-800">Suggestions</h3>
                  {suggestions.map((block) => (
                    <div key={block.title}>
                      <p className="text-sm font-medium text-slate-900">{block.title}</p>
                      <div className="mt-2 space-y-1">
                        {(block.items || []).map((a) => (
                          <div
                            key={a.id}
                            className="flex justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-slate-800">{a.name}</span>
                            <span className="text-xs text-slate-500">{a.location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <EmailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alumni={selected}
        searchQuery={q}
        studentNote="Organization roster outreach (ConXn org workspace)."
      />
    </div>
  )
}
