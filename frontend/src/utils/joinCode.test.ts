import { describe, expect, it } from 'vitest'
import { formatJoinCodeInput } from './joinCode'

// Spec: "Join a table" input MUST uppercase all typed characters and insert a
// hyphen immediately after the 4th character while typing (placeholder A3F9-B72C).
describe('formatJoinCodeInput', () => {
  it('uppercases and inserts a hyphen after the 4th character', () => {
    expect(formatJoinCodeInput('a3f9b72c')).toBe('A3F9-B72C')
  })

  it('does not insert a hyphen before 4 characters are typed', () => {
    expect(formatJoinCodeInput('a3f')).toBe('A3F')
  })

  it('does not duplicate the hyphen when the user types it manually', () => {
    expect(formatJoinCodeInput('a3f9-b72c')).toBe('A3F9-B72C')
  })

  it('caps the result length to the 4-4 join code shape', () => {
    expect(formatJoinCodeInput('a3f9b72cxxxx')).toBe('A3F9-B72C')
  })
})
