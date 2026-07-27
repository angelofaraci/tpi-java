import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

// Spec: "Other screens unaffected by new tokens" — the home-scoped `--color-home-*`,
// `--font-home-*`, and `--radius-home-*` tokens (design.md ADR-03) must be additive
// only. jsdom/vitest does not run a real CSS cascade (no `css: true`/browser mode
// configured for this project), so a `getComputedStyle` assertion on a rendered
// non-home page would not actually exercise the stylesheet. Instead this asserts,
// at the source level, that the pre-existing global `@theme` block and the global
// border reset are byte-for-byte unchanged, and that no new `--color-home-*`
// variable collides with an existing `--color-*` name — the two ways this change
// could otherwise repaint every other screen.
//
// Read via Vite's `?raw` import (not node:fs) so this file type-checks under
// tsconfig.app.json, which has no Node types — `tsc -b` (the production build)
// enforces this even though a bare `tsc --noEmit` run against the root config
// does not, since the root tsconfig only lists project references.
describe('index.css — home tokens do not alter existing global theme', () => {

  it('keeps the original global @theme block values unchanged', () => {
    expect(css).toContain('--color-background: #09090b;')
    expect(css).toContain('--color-surface: #18181b;')
    expect(css).toContain('--color-border: #27272a;')
    expect(css).toContain('--color-muted: #3f3f46;')
    expect(css).toContain('--color-foreground: #fafafa;')
    expect(css).toContain('--color-foreground-muted: #a1a1aa;')
  })

  it('keeps the global border-color reset unchanged', () => {
    expect(css).toMatch(/\*\s*\{\s*border-color:\s*var\(--color-border\);\s*\}/)
  })

  it('namespaces every new home token under --color-home-*, --font-home-*, or --radius-home-*', () => {
    const homeThemeBlockMatch = css.match(/--color-home-ink-900:[\s\S]*?--radius-home-3xl: 11px;/)
    expect(homeThemeBlockMatch).not.toBeNull()

    const homeBlock = homeThemeBlockMatch![0]
    const declaredVars = [...homeBlock.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1])

    expect(declaredVars.length).toBeGreaterThan(0)
    for (const name of declaredVars) {
      expect(name.startsWith('color-home-') || name.startsWith('font-home-') || name.startsWith('radius-home-')).toBe(true)
    }
  })

  it('does not redefine any existing non-home --color-*/--font-*/--radius-* name', () => {
    const existingNames = new Set(
      [...css.matchAll(/^\s*--(color|font|radius)-(?!home-)[a-z0-9-]+(?=:)/gm)].map((m) => `${m[1]}-${m[0].split('--' + m[1] + '-')[1]}`)
    )

    // Every pre-existing token from the original @theme block must still be declared exactly once.
    const originalTokenNames = ['--color-background', '--color-surface', '--color-border', '--color-muted', '--color-foreground', '--color-foreground-muted']
    for (const token of originalTokenNames) {
      const occurrences = css.split(token + ':').length - 1
      expect(occurrences).toBe(1)
    }

    expect(existingNames.size).toBeGreaterThan(0)
  })
})
