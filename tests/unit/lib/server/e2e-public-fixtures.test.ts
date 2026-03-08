import {
  getE2EMemorialFixtureBySlug,
  getE2EPhotoFixtureById,
  getE2ERedirectFixtureByCode,
  isE2EPublicFixturesEnabled,
  verifyE2EMemorialPassword,
} from '@/lib/server/e2e-public-fixtures'

describe('e2e public fixtures', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stays disabled outside the e2e fixture lane', () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '0')

    expect(isE2EPublicFixturesEnabled()).toBe(false)
    expect(getE2EMemorialFixtureBySlug('e2e-public-memorial')).toBeNull()
    expect(getE2ERedirectFixtureByCode('tribute-demo')).toBeNull()
    expect(getE2EPhotoFixtureById('22222222-2222-2222-2222-222222222221')).toBeNull()
  })

  it('returns public memorial, photo, and redirect fixtures when enabled', () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    const memorial = getE2EMemorialFixtureBySlug('e2e-public-memorial')
    const privateMemorial = getE2EMemorialFixtureBySlug('e2e-private-memorial')
    const redirect = getE2ERedirectFixtureByCode('tribute-demo')
    const photo = getE2EPhotoFixtureById('22222222-2222-2222-2222-222222222221')

    expect(memorial?.memorial.access_mode).toBe('public')
    expect(memorial?.photos).toHaveLength(2)
    expect(privateMemorial?.memorial.access_mode).toBe('private')
    expect(redirect).toMatchObject({ shortcode: 'tribute-demo', is_active: true })
    expect(photo).toMatchObject({
      memorial: expect.objectContaining({ slug: 'e2e-password-memorial' }),
      photo: expect.objectContaining({ caption: 'Mateo with the family workshop in 1975' }),
    })
  })

  it('verifies the password memorial unlock secret only for password fixtures', () => {
    vi.stubEnv('E2E_PUBLIC_FIXTURES', '1')

    expect(verifyE2EMemorialPassword('e2e-password-memorial', 'EverlumeMemory!')).toMatchObject({
      ok: true,
      memorial: expect.objectContaining({ slug: 'e2e-password-memorial' }),
    })
    expect(verifyE2EMemorialPassword('e2e-password-memorial', 'wrong-password')).toMatchObject({
      ok: false,
      memorial: expect.objectContaining({ slug: 'e2e-password-memorial' }),
    })
    expect(verifyE2EMemorialPassword('e2e-public-memorial', 'EverlumeMemory!')).toBeNull()
    expect(verifyE2EMemorialPassword('missing-slug', 'EverlumeMemory!')).toBeNull()
  })
})
