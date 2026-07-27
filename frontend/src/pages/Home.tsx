import { CharacterCard } from '../components/CharacterCard'
import { CampaignRailCard, type RailCampaign } from '../components/CampaignRailCard'
import { MetricTile } from '../components/MetricTile'
import { formatJoinCodeInput } from '../utils/joinCode'
import type { Character, LevelRecord } from '../interfaces/character'

export type HomeNavItem = 'home' | 'characters' | 'campaigns' | 'admin'
export type HomeStatus = 'loading' | 'ready' | 'error'
export type HomeFilter = 'all' | 'active' | 'retired'
export type HomeSort = 'recent' | 'level' | 'name'

export interface HomeMetrics {
  campaignsCount: number
  charactersCount: number
  asDmCount: number
  playersAtTables: number
}

export interface HomeProps {
  /** Authenticated username; avatar initials are derived from this (uppercased first 2 chars). */
  username: string
  userRole: 'ROLE_USER' | 'ROLE_ADMIN' | null
  /** Which nav item is visually active. Defaults to 'home' — Home.tsx only ever mounts on the home view (ADR-02). */
  activeNav?: HomeNavItem
  onOpenAdmin?: () => void
  onLogout: () => void

  status: HomeStatus
  characters: Character[]
  campaignNameById: Map<number, string>
  /** Grouped GET /levels response by characterId — see design.md "Revised: parallel fetch includes levels". */
  levelsByCharacterId: Map<number, LevelRecord[]>
  railCampaigns: RailCampaign[]
  metrics: HomeMetrics
  filter: HomeFilter
  sort: HomeSort
  joinCode: string
  errorMessage?: string | null

  onOpenCreateCharacter: () => void
  onOpenCreateCampaign: () => void
  onOpenSheet: (characterId: number) => void
  onOpenCampaign: (campaignId: number) => void
  onManageCampaign?: (campaignId: number) => void
  onRequestDeleteCharacter?: (characterId: number, name?: string) => void
  onFilterChange: (filter: HomeFilter) => void
  onSortChange: (sort: HomeSort) => void
  onJoinCodeChange: (value: string) => void
  onJoinSubmit: () => void
  onRetry?: () => void
}

function deriveInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

function deriveFirstName(username: string): string {
  if (!username) return ''
  return username.charAt(0).toUpperCase() + username.slice(1)
}

function deriveCharacterLevel(character: Character, levelsByCharacterId: Map<number, LevelRecord[]>): number {
  const records = levelsByCharacterId.get(character.id) ?? []
  return records.reduce((max, record) => Math.max(max, Number(record.level) || 0), 0)
}

function CharacterCardSkeleton({ index }: { index: number }) {
  return (
    <div
      key={index}
      data-testid="character-card-skeleton"
      className="h-[220px] animate-pulse rounded-home-3xl border border-home-border bg-home-surface"
    />
  )
}

function RailCardSkeleton({ index }: { index: number }) {
  return (
    <div
      key={index}
      data-testid="rail-card-skeleton"
      className="mb-[9px] h-[120px] animate-pulse rounded-home-2xl border border-home-border bg-home-surface"
    />
  )
}

function CreateCharacterCta({ full, onOpenCreateCharacter }: { full: boolean; onOpenCreateCharacter: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenCreateCharacter}
      className={
        full
          ? 'col-span-2 flex items-center justify-between rounded-home-3xl border border-dashed border-home-border-dash bg-[rgba(37,99,235,.04)] p-[22px_24px] text-left'
          : 'col-span-2 flex items-center justify-between rounded-home-3xl border border-dashed border-home-border-dash bg-[rgba(37,99,235,.04)] p-[14px_16px] text-left'
      }
    >
      <div>
        <div className={full ? 'font-home-display text-[17px] font-semibold text-home-text-soft' : 'font-home-display text-[13.5px] font-semibold text-home-text-soft'}>
          {full ? 'Forge your first adventurer' : 'Forge another adventurer'}
        </div>
        <div className="mt-[3px] text-[11.5px] text-home-dim">
          Guided flow: campaign code → race &amp; class → ability scores → proficiencies.
        </div>
      </div>
      <span className="font-home-display text-[11.5px] font-semibold text-home-blue-400">Open creator →</span>
    </button>
  )
}

export function Home({
  username,
  userRole,
  activeNav = 'home',
  onOpenAdmin,
  onLogout,
  status,
  characters,
  campaignNameById,
  levelsByCharacterId,
  railCampaigns,
  metrics,
  filter,
  sort,
  joinCode,
  errorMessage,
  onOpenCreateCharacter,
  onOpenCreateCampaign,
  onOpenSheet,
  onOpenCampaign,
  onManageCampaign,
  onRequestDeleteCharacter,
  onFilterChange,
  onSortChange,
  onJoinCodeChange,
  onJoinSubmit,
  onRetry,
}: HomeProps) {
  const isAdmin = userRole === 'ROLE_ADMIN'
  const initials = deriveInitials(username)
  const firstName = deriveFirstName(username)

  const isDungeonMasterOfAny = metrics.asDmCount >= 1
  const isPlayerOfAny = railCampaigns.some((campaign) => campaign.role === 'PLAYER')

  const subtitle = isDungeonMasterOfAny
    ? `${metrics.asDmCount} table${metrics.asDmCount === 1 ? ' is' : 's are'} waiting on you as Dungeon Master.`
    : isPlayerOfAny
      ? 'Pick up where you left off with your tables.'
      : 'Start by creating a campaign, or join one with a code.'

  // No `active`/`retired`/`status` field exists on Character (spec.md Plan B):
  // treat everything as active — `retired` yields an empty grid, `all`/`active` are identical.
  const filteredCharacters = filter === 'retired' ? [] : characters

  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    if (sort === 'name') {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    }
    if (sort === 'level') {
      return deriveCharacterLevel(b, levelsByCharacterId) - deriveCharacterLevel(a, levelsByCharacterId)
    }
    return 0 // 'recent' — keep API order
  })

  const dmCampaignIds = new Set(railCampaigns.filter((c) => c.role === 'DM').map((c) => c.id))
  const featuredCampaignId = railCampaigns.find((c) => c.role === 'DM')?.id ?? null

  return (
    <div className="bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
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

      <div className="border-b border-home-line bg-[radial-gradient(900px_240px_at_12%_-40%,rgba(59,130,246,.14),transparent_70%)] p-[24px_26px_20px]">
        <div className="mb-[20px] flex items-end justify-between gap-[24px]">
          <div>
            <div className="mb-[8px] font-home-mono text-[10px] tracking-[.18em] text-[#5b6deb]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </div>
            <h1 className="font-home-display text-[27px] font-semibold leading-[1.15] tracking-[-.01em] text-home-text-strong">
              Welcome back, {firstName}
            </h1>
            <p className="mt-[6px] text-[13px] text-home-muted">{subtitle}</p>
          </div>
          <div className="flex gap-[10px]">
            <button
              type="button"
              onClick={onOpenCreateCharacter}
              className="h-[36px] rounded-home-md bg-home-blue-600 px-[16px] font-home-display text-[12.5px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(37,99,235,.8)]"
            >
              + New character
            </button>
            <button
              type="button"
              onClick={onOpenCreateCampaign}
              className="h-[36px] rounded-home-md border border-home-border-hi bg-[#111621] px-[16px] font-home-display text-[12.5px] font-semibold text-home-text-soft"
            >
              + New campaign
            </button>
          </div>
        </div>

        <div data-testid="home-metrics-grid" className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
          <MetricTile value={metrics.campaignsCount} label="CAMPAIGNS" />
          <MetricTile value={metrics.charactersCount} label="CHARACTERS" />
          <MetricTile value={metrics.asDmCount} label="AS DUNGEON MASTER" valueClassName="text-home-blue-400" />
          <MetricTile value={metrics.playersAtTables} label="PLAYERS AT YOUR TABLES" />
        </div>
      </div>

      {status === 'error' && (
        <div className="mx-[26px] mt-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
          <span>{errorMessage || 'Something went wrong loading your dashboard.'}</span>{' '}
          <button type="button" onClick={onRetry} className="font-semibold text-[#f87171]">
            Retry
          </button>
        </div>
      )}

      <div data-testid="home-body-grid" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_368px]">
          <div data-testid="home-characters-column" className="order-2 p-[22px_26px_28px] lg:order-none">
            <div className="mb-[16px] flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                  Characters
                </h2>
                <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                  {characters.length}
                </span>
              </div>
              <div className="flex items-center gap-[6px] font-home-display text-[11px] font-medium">
                {(['all', 'active', 'retired'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onFilterChange(option)}
                    aria-pressed={filter === option}
                    className={
                      filter === option
                        ? 'rounded-home-md bg-home-chip px-[10px] py-[5px] text-home-text-soft'
                        : 'rounded-home-md px-[10px] py-[5px] text-home-dim'
                    }
                  >
                    {option === 'all' ? 'All' : option === 'active' ? 'Active' : 'Retired'}
                  </button>
                ))}
                <select
                  aria-label="Sort characters"
                  value={sort}
                  onChange={(event) => onSortChange(event.target.value as HomeSort)}
                  className="ml-[6px] rounded-home-md border border-home-border-mid px-[10px] py-[5px] text-home-muted"
                >
                  <option value="recent">Recently played</option>
                  <option value="level">Level</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            {status === 'loading' ? (
              <div className="grid grid-cols-2 gap-[12px]">
                {[0, 1, 2, 3].map((index) => (
                  <CharacterCardSkeleton key={index} index={index} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[12px]">
                {sortedCharacters.length === 0 ? (
                  <CreateCharacterCta full={characters.length === 0} onOpenCreateCharacter={onOpenCreateCharacter} />
                ) : (
                  <>
                    {sortedCharacters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        campaignName={campaignNameById.get(character.campaign?.id) ?? null}
                        isDungeonMaster={dmCampaignIds.has(character.campaign?.id)}
                        onOpenSheet={onOpenSheet}
                        onRequestDelete={onRequestDeleteCharacter}
                        levelsByCharacterId={levelsByCharacterId}
                      />
                    ))}
                    <CreateCharacterCta full={false} onOpenCreateCharacter={onOpenCreateCharacter} />
                  </>
                )}
              </div>
            )}
          </div>

          <div data-testid="home-campaigns-column" className="order-1 border-l border-home-line bg-home-ink-850 p-[22px_24px_28px] lg:order-none">
            <div className="mb-[16px] flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                  Campaigns
                </h2>
                <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                  {railCampaigns.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenCreateCampaign}
                aria-label="New campaign"
                className="font-home-mono text-[15px] font-semibold text-home-blue-400"
              >
                +
              </button>
            </div>

            {status === 'loading' ? (
              <div>
                {[0, 1, 2].map((index) => (
                  <RailCardSkeleton key={index} index={index} />
                ))}
              </div>
            ) : railCampaigns.length === 0 ? (
              <div className="mb-[9px] rounded-home-2xl border border-dashed border-home-border-dash p-[14px]">
                <div className="font-home-display text-[13.5px] font-semibold text-home-text-soft">No tables yet</div>
                <div className="mt-[3px] text-[11.5px] text-home-dim">Create one as DM, or join with a code below.</div>
              </div>
            ) : (
              <div data-testid="home-rail-list" className="flex flex-col md:flex-row md:overflow-x-auto lg:flex-col">
                {railCampaigns.map((campaign) => (
                  <div key={campaign.id} className="md:min-w-[280px] lg:min-w-0">
                    <CampaignRailCard
                      campaign={campaign}
                      featured={campaign.id === featuredCampaignId}
                      onOpen={onOpenCampaign}
                      onManage={onManageCampaign}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-[22px] border-t border-home-line pt-[18px]">
              <div className="mb-[10px] font-home-mono text-[10px] tracking-[.16em] text-home-dim-2">JOIN A TABLE</div>
              <div className="flex gap-[8px]">
                <input
                  type="text"
                  value={joinCode}
                  placeholder="A3F9-B72C"
                  aria-label="Join a table by code"
                  onChange={(event) => onJoinCodeChange(formatJoinCodeInput(event.target.value))}
                  className="h-[34px] flex-1 rounded-home-lg border border-home-border-mid bg-home-well px-[11px] font-home-mono text-[11.5px] tracking-[.08em] text-home-text placeholder:text-home-placeholder"
                />
                <button
                  type="button"
                  onClick={onJoinSubmit}
                  className="h-[34px] rounded-home-lg bg-home-blue-ink px-[14px] font-home-display text-[11.5px] font-semibold text-home-blue-200"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
