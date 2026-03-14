export type OpsAlertSeverity = 'warning' | 'critical'

export type OpsAlertPayload = {
  source: string
  summary: string
  severity: OpsAlertSeverity
  repository: string
  branch: string
  sha: string
  workflow: string
  job: string
  event: string
  runUrl: string | null
  timestamp: string
}

type AlertInput = Partial<Omit<OpsAlertPayload, 'timestamp'>> & {
  summary: string
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : ''
}

function buildGitHubRunUrl(repository: string, runId: string) {
  if (!repository || repository === 'unknown' || !runId) {
    return null
  }

  const serverUrl = clean(process.env.GITHUB_SERVER_URL) || 'https://github.com'
  return `${serverUrl}/${repository}/actions/runs/${runId}`
}

export function buildOpsAlertPayload(
  input: AlertInput,
  now = new Date()
): OpsAlertPayload {
  const repository = clean(input.repository) || 'unknown'
  const branch = clean(input.branch) || 'unknown'
  const sha = clean(input.sha) || 'unknown'
  const workflow = clean(input.workflow) || 'unknown'
  const job = clean(input.job) || 'unknown'
  const event = clean(input.event) || 'unknown'
  const source =
    clean(input.source) || [workflow, job].filter(Boolean).join('/')
  const runUrl =
    input.runUrl === undefined
      ? buildGitHubRunUrl(repository, clean(process.env.GITHUB_RUN_ID))
      : input.runUrl
  const severity =
    input.severity === 'critical' ? 'critical' : ('warning' as const)

  return {
    source,
    summary: input.summary.trim(),
    severity,
    repository,
    branch,
    sha,
    workflow,
    job,
    event,
    runUrl,
    timestamp: now.toISOString(),
  }
}

export async function postOpsAlert(
  webhookUrl: string,
  payload: OpsAlertPayload,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Alert webhook failed with status ${response.status}`)
  }
}
