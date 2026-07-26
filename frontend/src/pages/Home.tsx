export type HomeNavItem = 'home' | 'characters' | 'campaigns' | 'admin'

export interface HomeProps {
  /** Authenticated username; avatar initials are derived from this (uppercased first 2 chars). */
  username: string
  userRole: 'ROLE_USER' | 'ROLE_ADMIN' | null
  /** Which nav item is visually active. Defaults to 'home' — Home.tsx only ever mounts on the home view (ADR-02). */
  activeNav?: HomeNavItem
  onOpenAdmin?: () => void
  onLogout: () => void
}

function deriveInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

export function Home({ username, userRole, activeNav = 'home', onOpenAdmin, onLogout }: HomeProps) {
  const isAdmin = userRole === 'ROLE_ADMIN'
  const initials = deriveInitials(username)

  return (
    <div className="min-w-[1280px] bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between bg-home-ink-800 border-b border-home-line px-[26px]">
        <div className="flex items-center gap-[30px]">
          <div className="flex items-center gap-[10px]">
            <div
              aria-hidden="true"
              className="h-[20px] w-[20px] rotate-45 rounded-[3px] border-[1.5px] border-home-blue-500"
            />
            <span
              className="font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
              style={{ letterSpacing: '.16em' }}
            >
              D&D MANAGER
            </span>
          </div>

          <nav aria-label="Primary" className="flex items-center gap-[22px] text-[13px]">
            <button
              type="button"
              aria-current={activeNav === 'home' ? 'page' : undefined}
              className={
                activeNav === 'home'
                  ? 'border-b-2 border-home-blue-500 py-[19px] font-semibold text-home-text-strong'
                  : 'py-[19px] text-home-dim'
              }
            >
              Home
            </button>
            <button
              type="button"
              aria-current={activeNav === 'characters' ? 'page' : undefined}
              className={
                activeNav === 'characters'
                  ? 'border-b-2 border-home-blue-500 py-[19px] font-semibold text-home-text-strong'
                  : 'py-[19px] text-home-dim'
              }
            >
              Characters
            </button>
            <button
              type="button"
              aria-current={activeNav === 'campaigns' ? 'page' : undefined}
              className={
                activeNav === 'campaigns'
                  ? 'border-b-2 border-home-blue-500 py-[19px] font-semibold text-home-text-strong'
                  : 'py-[19px] text-home-dim'
              }
            >
              Campaigns
            </button>
            {isAdmin && (
              <button
                type="button"
                aria-current={activeNav === 'admin' ? 'page' : undefined}
                onClick={onOpenAdmin}
                className={
                  activeNav === 'admin'
                    ? 'border-b-2 border-home-blue-500 py-[19px] font-semibold text-home-text-strong'
                    : 'py-[19px] text-home-dim'
                }
              >
                Admin
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-[12px]">
          <div
            role="search"
            className="flex h-[32px] items-center gap-[8px] rounded-home-md border border-home-border-mid bg-home-well px-[12px]"
          >
            <span
              aria-hidden="true"
              className="h-[11px] w-[11px] rounded-full border-[1.5px] border-home-dim"
            />
            <input
              type="text"
              placeholder="Search or paste join code"
              aria-label="Search or paste join code"
              className="border-0 bg-transparent font-home-mono text-[11.5px] text-home-text outline-none placeholder:text-home-placeholder"
              style={{ fontFamily: 'var(--font-home-mono)' }}
            />
          </div>

          <div
            role="img"
            aria-label={`Avatar for ${username}`}
            className="grid h-[30px] w-[30px] place-items-center rounded-full border border-home-border-hi bg-[#1c2431] font-home-mono text-[11px] font-semibold text-[#8fb2ec]"
          >
            {initials}
          </div>

          <button type="button" onClick={onLogout} className="text-[12px] text-home-dim">
            Logout
          </button>
        </div>
      </header>

      {/* Home body — Phase 3 (hero, metrics bar, character grid, campaign rail) */}
      <div />
    </div>
  )
}
