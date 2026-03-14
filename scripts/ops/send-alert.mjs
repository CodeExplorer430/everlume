function getTrimmedEnv(name) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : ''
}

function buildRunUrl(repository, runId) {
  if (!repository || !runId) {
    return null
  }

  const serverUrl = getTrimmedEnv('GITHUB_SERVER_URL') || 'https://github.com'
  return `${serverUrl}/${repository}/actions/runs/${runId}`
}

async function main() {
  const webhookUrl = getTrimmedEnv('OPS_ALERT_WEBHOOK_URL')
  if (!webhookUrl) {
    console.log('OPS_ALERT_WEBHOOK_URL not set; skipping alert delivery.')
    return
  }

  const repository = getTrimmedEnv('GITHUB_REPOSITORY') || 'unknown'
  const workflow = getTrimmedEnv('GITHUB_WORKFLOW') || 'unknown'
  const job = getTrimmedEnv('GITHUB_JOB') || 'unknown'
  const payload = {
    source:
      getTrimmedEnv('OPS_ALERT_SOURCE') ||
      [workflow, job].filter(Boolean).join('/'),
    summary:
      getTrimmedEnv('OPS_ALERT_SUMMARY') || 'Operational workflow failure',
    severity:
      getTrimmedEnv('OPS_ALERT_SEVERITY') === 'critical'
        ? 'critical'
        : 'warning',
    repository,
    branch: getTrimmedEnv('GITHUB_REF_NAME') || 'unknown',
    sha: getTrimmedEnv('GITHUB_SHA') || 'unknown',
    workflow,
    job,
    event: getTrimmedEnv('GITHUB_EVENT_NAME') || 'unknown',
    runUrl: buildRunUrl(repository, getTrimmedEnv('GITHUB_RUN_ID')),
    timestamp: new Date().toISOString(),
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Alert webhook failed with status ${response.status}`)
  }

  console.log(`Sent ${payload.severity} alert for ${payload.source}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
