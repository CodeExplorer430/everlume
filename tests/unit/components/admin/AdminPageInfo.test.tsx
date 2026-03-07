import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPageInfo } from '@/components/admin/AdminPageInfo'

describe('AdminPageInfo', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resets form values when page prop changes', async () => {
    const onUpdate = vi.fn()
    const { rerender } = render(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={{
          id: 'page-1',
          title: 'First Title',
          slug: 'first-title',
          full_name: 'Jane Doe',
          dob: null,
          dod: null,
          access_mode: 'public',
          privacy: 'public',
        }}
      />
    )

    const user = userEvent.setup()
    const titleInput = screen.getByLabelText('Page Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited Locally')
    expect(titleInput).toHaveValue('Edited Locally')

    rerender(
      <AdminPageInfo
        onUpdate={onUpdate}
        page={{
          id: 'page-1',
          title: 'Server Updated Title',
          slug: 'first-title',
          full_name: 'Jane Doe',
          dob: null,
          dod: null,
          access_mode: 'public',
          privacy: 'public',
        }}
      />
    )

    expect(screen.getByLabelText('Page Title')).toHaveValue('Server Updated Title')
  })
})
