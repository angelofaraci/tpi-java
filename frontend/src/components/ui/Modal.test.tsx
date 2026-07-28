import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}} titleId="t1" title="Hidden">
        <p>Body</p>
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog with aria-modal and aria-labelledby when open', () => {
    render(
      <Modal open onClose={() => {}} titleId="t2" title="Confirm delete">
        <p>Body</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 't2')
    expect(screen.getByText('Confirm delete')).toHaveAttribute('id', 't2')
  })

  it('renders children content', () => {
    render(
      <Modal open onClose={() => {}} titleId="t3" title="Title">
        <p>This action cannot be undone.</p>
      </Modal>
    )
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
  })

  it('renders an optional eyebrow', () => {
    render(
      <Modal open onClose={() => {}} titleId="t4" title="Title" eyebrow="WARNING">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByText('WARNING')).toBeInTheDocument()
  })

  it('renders an optional footer', () => {
    const handleClose = vi.fn()
    render(
      <Modal
        open
        onClose={handleClose}
        titleId="t5"
        title="Title"
        footer={<button onClick={handleClose}>Cancel</button>}
      >
        <p>Body</p>
      </Modal>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('defaults to max-w-[440px] when maxWidthClassName is not provided', () => {
    render(
      <Modal open onClose={() => {}} titleId="t6" title="Title">
        <p>Body</p>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-[440px]')
  })

  it('applies a custom maxWidthClassName when provided', () => {
    render(
      <Modal open onClose={() => {}} titleId="t7" title="Title" maxWidthClassName="max-w-[560px]">
        <p>Body</p>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('max-w-[560px]')
    expect(dialog).not.toHaveClass('max-w-[440px]')
  })
})
