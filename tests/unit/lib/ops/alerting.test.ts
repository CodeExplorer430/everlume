import { buildOpsAlertPayload, postOpsAlert } from '@/lib/ops/alerting'

describe('buildOpsAlertPayload', () => {
  const originalServerUrl = process.env.GITHUB_SERVER_URL
  const originalRunId = process.env.GITHUB_RUN_ID

  beforeEach(() => {
    process.env.GITHUB_SERVER_URL = 'https://github.example.test'
    process.env.GITHUB_RUN_ID = '123456789'
  })

  afterEach(() => {
    if (originalServerUrl === undefined) {
      delete process.env.GITHUB_SERVER_URL
    } else {
      process.env.GITHUB_SERVER_URL = originalServerUrl
    }

    if (originalRunId === undefined) {
      delete process.env.GITHUB_RUN_ID
    } else {
      process.env.GITHUB_RUN_ID = originalRunId
    }
  })

  it('builds a payload from workflow metadata and defaults warning severity', () => {
    const payload = buildOpsAlertPayload(
      {
        summary: ' Launch readiness failed. ',
        repository: 'CodeExplorer430/everlume',
        branch: 'main',
        sha: 'abc123',
        workflow: 'CI',
        job: 'launch_readiness',
        event: 'push',
      },
      new Date('2026-03-14T00:00:00.000Z')
    )

    expect(payload).toEqual({
      source: 'CI/launch_readiness',
      summary: 'Launch readiness failed.',
      severity: 'warning',
      repository: 'CodeExplorer430/everlume',
      branch: 'main',
      sha: 'abc123',
      workflow: 'CI',
      job: 'launch_readiness',
      event: 'push',
      runUrl:
        'https://github.example.test/CodeExplorer430/everlume/actions/runs/123456789',
      timestamp: '2026-03-14T00:00:00.000Z',
    })
  })

  it('prefers explicit source, severity, and run url values', () => {
    const payload = buildOpsAlertPayload(
      {
        source: 'backup-db',
        summary: 'Backup job failed',
        severity: 'critical',
        repository: 'CodeExplorer430/everlume',
        branch: 'main',
        sha: 'abc123',
        workflow: 'Backup Database',
        job: 'backup',
        event: 'schedule',
        runUrl: 'https://example.test/run/1',
      },
      new Date('2026-03-14T00:00:00.000Z')
    )

    expect(payload.source).toBe('backup-db')
    expect(payload.severity).toBe('critical')
    expect(payload.runUrl).toBe('https://example.test/run/1')
  })

  it('falls back to null run url when repository metadata is missing', () => {
    const payload = buildOpsAlertPayload(
      {
        summary: 'Worker deploy failed',
        workflow: 'Deploy Cloudflare Worker',
        job: 'deploy',
      },
      new Date('2026-03-14T00:00:00.000Z')
    )

    expect(payload.repository).toBe('unknown')
    expect(payload.runUrl).toBeNull()
  })

  it('falls back to default github metadata values when workflow context is missing', () => {
    delete process.env.GITHUB_SERVER_URL

    const payload = buildOpsAlertPayload(
      {
        summary: 'Operational failure',
        repository: 'CodeExplorer430/everlume',
      },
      new Date('2026-03-14T00:00:00.000Z')
    )

    expect(payload.workflow).toBe('unknown')
    expect(payload.job).toBe('unknown')
    expect(payload.event).toBe('unknown')
    expect(payload.source).toBe('unknown/unknown')
    expect(payload.runUrl).toBe(
      'https://github.com/CodeExplorer430/everlume/actions/runs/123456789'
    )
  })
})

describe('postOpsAlert', () => {
  const payload = buildOpsAlertPayload(
    {
      source: 'launch_readiness',
      summary: 'Launch readiness failed',
      severity: 'critical',
      repository: 'CodeExplorer430/everlume',
      branch: 'main',
      sha: 'abc123',
      workflow: 'CI',
      job: 'launch_readiness',
      event: 'push',
      runUrl: 'https://example.test/run/1',
    },
    new Date('2026-03-14T00:00:00.000Z')
  )

  it('posts the alert payload as json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })

    await postOpsAlert(
      'https://alerts.example.test',
      payload,
      fetchImpl as typeof fetch
    )

    expect(fetchImpl).toHaveBeenCalledWith('https://alerts.example.test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  })

  it('throws when the webhook response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502 })

    await expect(
      postOpsAlert(
        'https://alerts.example.test',
        payload,
        fetchImpl as typeof fetch
      )
    ).rejects.toThrow('Alert webhook failed with status 502')
  })
})
