import axios from 'axios'

const envBase = import.meta.env.VITE_API_URL?.trim()
const devFallsBackToProxy =
  import.meta.env.DEV &&
  (!envBase ||
    /^(https?:\/\/)?(127\.0\.0\.1|localhost):8080\/?$/i.test(envBase))

const base = devFallsBackToProxy ? '/api' : envBase || '/api'

export const api = axios.create({
  baseURL: base,
  timeout: 120000,
})

export async function fetchHealth() {
  const { data } = await api.get('/health')
  return data
}

export async function searchAlumni(q, limit = 8) {
  const { data } = await api.get('/search', { params: { q, limit } })
  return data
}

/** LLM-assisted parsing + structured filters + suggestion groups */
export async function smartSearchAlumni(q, limit = 10) {
  const { data } = await api.post('/smart-search', { q, limit })
  return data
}

/** Institution-owned roster + optional college scope (same response shape as smart-search). */
export async function organizationSmartSearch(orgId, q, limit = 10) {
  const { data } = await api.post(
    `/organizations/${encodeURIComponent(orgId)}/smart-search`,
    { q, limit },
  )
  return data
}

export async function createOrganization(body) {
  const { data } = await api.post('/organizations', body)
  return data
}

export async function getOrganization(orgId) {
  const { data } = await api.get(`/organizations/${encodeURIComponent(orgId)}`)
  return data
}

export async function addOrganizationAlumni(orgId, row) {
  const { data } = await api.post(
    `/organizations/${encodeURIComponent(orgId)}/alumni`,
    row,
  )
  return data
}

/** CSV bulk import → org roster only; optional copy each accepted row to global ConXn alumni. */
export async function uploadOrganizationAlumniCsv(
  orgId,
  file,
  { replace = false, shareWithConxn = false } = {},
) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('replace', replace ? 'true' : 'false')
  fd.append('share_with_conxn', shareWithConxn ? 'true' : 'false')
  const { data } = await api.post(
    `/organizations/${encodeURIComponent(orgId)}/alumni/upload`,
    fd,
  )
  return data
}

export async function mentorMatch(goal, limit = 8) {
  const { data } = await api.post('/mentor-match', { goal, limit })
  return data
}

export async function generateEmail(payload) {
  const { data } = await api.post('/generate-email', payload)
  return data
}

export async function sendEmail(payload) {
  const { data } = await api.post('/send-email', payload)
  return data
}

export async function fetchGraph() {
  const { data } = await api.get('/graph')
  return data
}

export async function fetchConnections(alumniId) {
  const { data } = await api.get(`/connections/${alumniId}`)
  return data
}

/** Website connections (mutual connect), not graph neighbors */
export async function fetchPlatformConnections(alumniId) {
  const { data } = await api.get(`/platform/connections/${alumniId}`)
  return data
}

export async function connectPlatform(viewerId, peerId) {
  const { data } = await api.post('/platform/connect', {
    viewer_id: viewerId,
    peer_id: peerId,
  })
  return data
}

export async function sendPlatformMessage(
  fromAlumniId,
  toId,
  body,
  peerLabel = null,
) {
  const { data } = await api.post('/platform/message', {
    from_alumni_id: fromAlumniId,
    to_id: toId,
    body,
    peer_label: peerLabel,
  })
  return data
}

export async function fetchPlatformThreads(alumniId) {
  const { data } = await api.get(`/platform/threads/${alumniId}`)
  return data
}

/** Mentor hub: student request threads only (no alumni DM threads). */
export async function fetchPlatformMentorRequests(alumniId) {
  const { data } = await api.get(`/platform/mentor-requests/${alumniId}`)
  return data
}

export async function markMentorRequestSeen(alumniId, peerId, seen = true) {
  const { data } = await api.post('/platform/mentor-request/seen', {
    alumni_id: alumniId,
    peer_id: peerId,
    seen,
  })
  return data
}

/** mode: 'reply' | 'decline' — uses Gemini/Ollama when configured */
export async function mentorAiDraft({ alumni_id, peer_id, mode, note = '' }) {
  const { data } = await api.post('/platform/mentor-ai-draft', {
    alumni_id,
    peer_id,
    mode,
    note,
  })
  return data
}

export async function fetchPlatformThread(viewer, peer) {
  const { data } = await api.get('/platform/thread', {
    params: { viewer, peer },
  })
  return data
}

export async function seedMentorInbox(alumniId) {
  const { data } = await api.post('/platform/seed-mentor-inbox', {
    alumni_id: alumniId,
  })
  return data
}

export async function addAlumniProfile(row) {
  const { data } = await api.post('/alumni', row)
  return data
}

export async function eventInvite(payload) {
  const { data } = await api.post('/event-invite', payload)
  return data
}

export async function mentorIntroDraft(payload) {
  const { data } = await api.post('/mentor-intro-draft', payload)
  return data
}
