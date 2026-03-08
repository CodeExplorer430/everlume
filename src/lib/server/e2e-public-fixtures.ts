import { hashMemorialPassword, verifyMemorialPassword } from '@/lib/server/page-password'

type FixtureAccessMode = 'public' | 'password' | 'private'

type FixtureMemorial = {
  id: string
  slug: string
  owner_id: string
  title: string
  full_name: string | null
  dedication_text: string | null
  hero_image_url: string | null
  dob: string | null
  dod: string | null
  privacy: 'public' | 'private'
  access_mode: FixtureAccessMode
  password_hash: string | null
  password_updated_at: string | null
  memorial_theme: 'classic' | 'serene' | 'editorial'
  memorial_slideshow_enabled: boolean
  memorial_slideshow_interval_ms: number
  memorial_video_layout: 'grid' | 'featured'
  memorial_photo_fit: 'cover' | 'contain'
  memorial_caption_style: 'classic' | 'minimal'
}

type FixturePhoto = {
  id: string
  page_id: string
  image_url: string | null
  thumb_url: string | null
  caption: string | null
  sort_index: number
}

type FixtureVideo = {
  id: string
  page_id: string
  provider: 'youtube' | 'cloudinary'
  provider_id: string
  title: string | null
  created_at: string
}

type FixtureTimelineEvent = {
  id: string
  page_id: string
  year: number
  text: string
}

type FixtureGuestbookEntry = {
  id: string
  page_id: string
  name: string
  message: string
  created_at: string
  is_approved: boolean
}

type FixtureSiteSettings = {
  memorial_slideshow_enabled: boolean
  memorial_slideshow_interval_ms: number
  memorial_video_layout: 'grid' | 'featured'
}

export type E2EMemorialFixture = {
  memorial: FixtureMemorial
  photos: FixturePhoto[]
  videos: FixtureVideo[]
  timeline: FixtureTimelineEvent[]
  guestbook: FixtureGuestbookEntry[]
  siteSettings: FixtureSiteSettings
  unlockPassword?: string
}

type E2ERedirectFixture = {
  shortcode: string
  target_url: string
  is_active: boolean
}

const PASSWORD_MEMORIAL_PASSWORD = 'EverlumeMemory!'
const PASSWORD_UPDATED_AT = '2026-03-08T00:00:00.000Z'
const PASSWORD_HASH = hashMemorialPassword(PASSWORD_MEMORIAL_PASSWORD)

const memorialFixtures: E2EMemorialFixture[] = [
  {
    memorial: {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'e2e-public-memorial',
      owner_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'In Loving Memory of Amelia Stone',
      full_name: 'Amelia Grace Stone',
      dedication_text: 'Amelia taught our family to sing, to serve, and to carry gentleness into every room. May this memorial keep her music close to us.',
      hero_image_url: '/next.svg',
      dob: '1940-05-12',
      dod: '2025-12-03',
      privacy: 'public',
      access_mode: 'public',
      password_hash: null,
      password_updated_at: null,
      memorial_theme: 'serene',
      memorial_slideshow_enabled: true,
      memorial_slideshow_interval_ms: 4200,
      memorial_video_layout: 'featured',
      memorial_photo_fit: 'contain',
      memorial_caption_style: 'minimal',
    },
    photos: [
      {
        id: '21111111-1111-1111-1111-111111111111',
        page_id: '11111111-1111-1111-1111-111111111111',
        image_url: '/vercel.svg',
        thumb_url: '/window.svg',
        caption: 'Sunday service in 1988',
        sort_index: 1,
      },
      {
        id: '21111111-1111-1111-1111-111111111112',
        page_id: '11111111-1111-1111-1111-111111111111',
        image_url: '/globe.svg',
        thumb_url: '/file.svg',
        caption: 'Handwritten notes kept for the family',
        sort_index: 2,
      },
    ],
    videos: [
      {
        id: '31111111-1111-1111-1111-111111111111',
        page_id: '11111111-1111-1111-1111-111111111111',
        provider: 'youtube',
        provider_id: 'dQw4w9WgXcQ',
        title: 'Family tribute recording',
        created_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    timeline: [
      {
        id: '41111111-1111-1111-1111-111111111111',
        page_id: '11111111-1111-1111-1111-111111111111',
        year: 1962,
        text: 'Amelia began teaching music to parish children every Saturday morning.',
      },
      {
        id: '41111111-1111-1111-1111-111111111112',
        page_id: '11111111-1111-1111-1111-111111111111',
        year: 1998,
        text: 'She organized the first annual remembrance concert for the neighborhood.',
      },
    ],
    guestbook: [
      {
        id: '51111111-1111-1111-1111-111111111111',
        page_id: '11111111-1111-1111-1111-111111111111',
        name: 'Maria Santos',
        message: 'Amelia taught three generations of our family to sing with courage.',
        created_at: '2026-03-02T00:00:00.000Z',
        is_approved: true,
      },
    ],
    siteSettings: {
      memorial_slideshow_enabled: true,
      memorial_slideshow_interval_ms: 4200,
      memorial_video_layout: 'featured',
    },
  },
  {
    memorial: {
      id: '12222222-2222-2222-2222-222222222222',
      slug: 'e2e-password-memorial',
      owner_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      title: 'In Loving Memory of Mateo Rivera',
      full_name: 'Mateo Luis Rivera',
      dedication_text: 'This memorial is shared quietly with those who knew Mateo best. Thank you for entering with care and carrying his craft forward.',
      hero_image_url: '/window.svg',
      dob: '1938-09-21',
      dod: '2026-01-17',
      privacy: 'private',
      access_mode: 'password',
      password_hash: PASSWORD_HASH,
      password_updated_at: PASSWORD_UPDATED_AT,
      memorial_theme: 'editorial',
      memorial_slideshow_enabled: true,
      memorial_slideshow_interval_ms: 3600,
      memorial_video_layout: 'grid',
      memorial_photo_fit: 'cover',
      memorial_caption_style: 'classic',
    },
    photos: [
      {
        id: '22222222-2222-2222-2222-222222222221',
        page_id: '12222222-2222-2222-2222-222222222222',
        image_url: '/next.svg',
        thumb_url: '/file.svg',
        caption: 'Mateo with the family workshop in 1975',
        sort_index: 1,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        page_id: '12222222-2222-2222-2222-222222222222',
        image_url: '/globe.svg',
        thumb_url: '/favicon.svg',
        caption: 'A quiet afternoon in the garden',
        sort_index: 2,
      },
    ],
    videos: [],
    timeline: [
      {
        id: '42222222-2222-2222-2222-222222222221',
        page_id: '12222222-2222-2222-2222-222222222222',
        year: 1975,
        text: 'Mateo opened the family workshop and trained dozens of apprentices.',
      },
    ],
    guestbook: [
      {
        id: '52222222-2222-2222-2222-222222222221',
        page_id: '12222222-2222-2222-2222-222222222222',
        name: 'Elena Rivera',
        message: 'Thank you for protecting this space for the family.',
        created_at: '2026-03-03T00:00:00.000Z',
        is_approved: true,
      },
    ],
    siteSettings: {
      memorial_slideshow_enabled: true,
      memorial_slideshow_interval_ms: 3600,
      memorial_video_layout: 'grid',
    },
    unlockPassword: PASSWORD_MEMORIAL_PASSWORD,
  },
  {
    memorial: {
      id: '13333333-3333-3333-3333-333333333333',
      slug: 'e2e-private-memorial',
      owner_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      title: 'In Loving Memory of Clara Reyes',
      full_name: 'Clara Isabel Reyes',
      dedication_text: 'Clara kept our family rooted in prayer, discipline, and laughter across every season.',
      hero_image_url: '/globe.svg',
      dob: '1945-04-02',
      dod: '2026-02-11',
      privacy: 'private',
      access_mode: 'private',
      password_hash: null,
      password_updated_at: null,
      memorial_theme: 'classic',
      memorial_slideshow_enabled: false,
      memorial_slideshow_interval_ms: 4500,
      memorial_video_layout: 'grid',
      memorial_photo_fit: 'cover',
      memorial_caption_style: 'classic',
    },
    photos: [],
    videos: [],
    timeline: [],
    guestbook: [],
    siteSettings: {
      memorial_slideshow_enabled: false,
      memorial_slideshow_interval_ms: 4500,
      memorial_video_layout: 'grid',
    },
  },
]

const redirectFixtures: E2ERedirectFixture[] = [
  {
    shortcode: 'tribute-demo',
    target_url: '/memorials/e2e-public-memorial',
    is_active: true,
  },
  {
    shortcode: 'tribute-disabled',
    target_url: '/memorials/e2e-public-memorial',
    is_active: false,
  },
]

export function isE2EPublicFixturesEnabled() {
  return process.env.E2E_PUBLIC_FIXTURES === '1'
}

export function getE2EMemorialFixtureBySlug(slug: string) {
  if (!isE2EPublicFixturesEnabled()) return null
  return memorialFixtures.find((fixture) => fixture.memorial.slug === slug) || null
}

export function getE2ERedirectFixtureByCode(code: string) {
  if (!isE2EPublicFixturesEnabled()) return null
  return redirectFixtures.find((fixture) => fixture.shortcode === code) || null
}

export function getE2EPhotoFixtureById(photoId: string) {
  if (!isE2EPublicFixturesEnabled()) return null

  for (const fixture of memorialFixtures) {
    const photo = fixture.photos.find((candidate) => candidate.id === photoId)
    if (photo) {
      return { photo, memorial: fixture.memorial }
    }
  }

  return null
}

export function verifyE2EMemorialPassword(slug: string, password: string) {
  const fixture = getE2EMemorialFixtureBySlug(slug)
  if (!fixture || fixture.memorial.access_mode !== 'password') {
    return null
  }

  const valid = verifyMemorialPassword(password, fixture.memorial.password_hash)
  if (!valid) {
    return { ok: false as const, memorial: fixture.memorial }
  }

  return { ok: true as const, memorial: fixture.memorial }
}
