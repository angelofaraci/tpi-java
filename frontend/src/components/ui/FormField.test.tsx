import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('FormField', () => {
  it('renders the label wired to the control via htmlFor/id', () => {
    render(
      <FormField id="username" label="Username">
        <input id="username" />
      </FormField>
    )
    const input = screen.getByLabelText('Username')
    expect(input).toBeInTheDocument()
  })

  it('renders an error message when error is provided', () => {
    render(
      <FormField id="pw" label="Password" error="Passwords do not match">
        <input id="pw" />
      </FormField>
    )
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('renders a hint message when hint is provided and no error', () => {
    render(
      <FormField id="email" label="Email" hint="We will never share this">
        <input id="email" />
      </FormField>
    )
    expect(screen.getByText('We will never share this')).toBeInTheDocument()
  })

  it('does not render error or hint text when neither is provided', () => {
    render(
      <FormField id="plain" label="Plain">
        <input id="plain" />
      </FormField>
    )
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })
})
