import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { CopyCodeButton } from '../components/CopyCodeButton'
import { MetricTile } from '../components/MetricTile'
import type { Campaign, CampaignParticipant, CampaignCharacterReference } from '../interfaces/campaign'

interface ViewCampaignProps {
  campaignId: number
  isDungeonMaster: boolean
  onBack: () => void
  onLogout: () => void
  onDeleteCampaign: (campaignId: number, campaignName: string) => void
  deletingCampaignId: number | null
  deleteError: string | null
  feedback?: string | null
  onDismissFeedback?: () => void
  onViewCharacter?: (characterId: number) => void
  onEditCharacter?: (characterId: number) => void
}

function formatDate(dateString?: string) {
  if (!dateString) {
    return 'Date unavailable'
  }

  const parsed = new Date(dateString)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable'
  }

  return parsed.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ViewCampaign({
  campaignId,
  isDungeonMaster,
  onBack,
  onLogout,
  onDeleteCampaign,
  deletingCampaignId,
  deleteError,
  feedback,
  onDismissFeedback,
  onViewCharacter,
  onEditCharacter,
}: ViewCampaignProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await api.campaigns.findById(campaignId)

        if (!data || typeof data !== 'object') {
          setError('Malformed campaign payload')
          return
        }

        setCampaign(data)
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('403')) {
          setForbidden(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load campaign')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [campaignId])

  if (loading) {
    return (
      <div className="min-h-screen bg-home-ink-900 p-[26px] text-[12.5px] text-home-dim">
        Loading campaign...
      </div>
    )
  }

  if (forbidden) {
    return (
      <div>
        <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
          <h1
            onClick={onBack}
            className="cursor-pointer font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
          >
            D&D Manager
          </h1>
          <button
            onClick={onLogout}
            type="button"
            className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft"
          >
            Logout
          </button>
        </header>
        <div className="p-[22px_26px_28px]">
          <button
            className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
            onClick={onBack}
            type="button"
          >
            ← Back to Home
          </button>
          <div className="mt-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
            🔒 This campaign is private. You need to be the Dungeon Master or an active player to view it.
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
          <h1
            onClick={onBack}
            className="cursor-pointer font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
          >
            D&D Manager
          </h1>
          <button
            onClick={onLogout}
            type="button"
            className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft"
          >
            Logout
          </button>
        </header>
        <div className="p-[22px_26px_28px]">
          <button
            className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
            onClick={onBack}
            type="button"
          >
            ← Back to Home
          </button>
          <div className="mt-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
            Error: {error}
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  const players: CampaignParticipant[] = campaign.players ?? []
  const characters: CampaignCharacterReference[] = campaign.characters ?? []

  return (
    <div className="min-h-screen bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
        <h1
          onClick={onBack}
          className="cursor-pointer font-home-display text-[12.5px] font-bold uppercase text-home-text-strong"
        >
          D&D Manager
        </h1>
        <button
          onClick={onLogout}
          type="button"
          className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft"
        >
          Logout
        </button>
      </header>

      <div className="p-[22px_26px_28px]">
        <button
          className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
          onClick={onBack}
          type="button"
        >
          ← Back to Home
        </button>

        {feedback && (
          <div
            className="mt-[16px] flex items-center justify-between rounded-home-xl border border-home-border-acc bg-[rgba(37,99,235,.08)] p-[12px_14px] text-[12.5px] text-home-blue-200"
            role="status"
          >
            <span>{feedback}</span>
            {onDismissFeedback && (
              <button
                type="button"
                className="font-semibold text-home-dim transition-colors duration-150 hover:text-home-text-soft"
                onClick={onDismissFeedback}
                aria-label="Dismiss campaign feedback"
              >
                x
              </button>
            )}
          </div>
        )}

        {deleteError && (
          <div className="mt-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
            {deleteError}
          </div>
        )}
      </div>

      <div className="px-[26px] pb-[28px]">
        <div className="mx-auto max-w-[960px] rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
          {/* DM Actions */}
          {isDungeonMaster && (
            <div className="mb-[16px] flex justify-end">
              <button
                type="button"
                className="h-[36px] rounded-home-md border border-[#3f2226] bg-[rgba(220,38,38,.12)] px-[16px] font-home-display text-[12.5px] font-semibold text-home-danger transition-colors duration-150 hover:bg-[rgba(220,38,38,.2)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onDeleteCampaign(campaignId, campaign.name)}
                disabled={deletingCampaignId === campaignId}
              >
                {deletingCampaignId === campaignId ? 'Deleting...' : 'Delete Campaign'}
              </button>
            </div>
          )}

          {/* Campaign Header */}
          <div className="mb-[24px] text-center">
            <div className="mb-[24px]">
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                {campaign.privacy ? 'Private' : 'Public'}
              </span>
              <h2 className="mt-[10px] font-home-display text-[28px] font-semibold text-home-text-strong">
                {campaign.name}
              </h2>
              <p className="mt-[4px] text-[12.5px] text-home-muted">{formatDate(campaign.creationDate)}</p>
              {campaign.description && (
                <p className="mx-auto mt-[12px] max-w-[560px] text-[12.5px] leading-[1.5] text-home-muted">
                  {campaign.description}
                </p>
              )}
              {isDungeonMaster && campaign.joinCode && (
                <div className="mt-[14px] inline-flex items-center gap-[10px] rounded-home-lg border border-home-border-mid bg-home-well px-[12px] py-[7px]">
                  <span className="font-home-mono text-[10px] uppercase tracking-[.14em] text-home-dim-2">
                    JOIN CODE
                  </span>
                  <span className="font-home-mono text-[13px] tracking-[.1em] text-[#fbbf24]">
                    {campaign.joinCode}
                  </span>
                  <CopyCodeButton code={campaign.joinCode} size="sm" variant="dark" />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-[14px]">
              <MetricTile value={players.length} label="PLAYERS" />
              <MetricTile value={characters.length} label="CHARACTERS" />
            </div>

            {isDungeonMaster && (
              <div className="mt-[20px] border-y border-home-line py-[10px] text-[12.5px] font-semibold tracking-[.05em] text-home-text-strong">
                <span>ROLE: DUNGEON MASTER</span>
              </div>
            )}
          </div>

          {/* Campaign Content */}
          <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2">
            {/* Players Section */}
            <section className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                Players
              </h3>
              {players.length === 0 ? (
                <p className="text-[12.5px] italic text-home-dim">No players have joined this campaign yet.</p>
              ) : (
                <ul className="divide-y divide-home-line overflow-hidden rounded-home-2xl border border-home-border bg-home-surface">
                  {players.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center gap-[12px] px-[14px] py-[10px] transition-colors duration-150 hover:bg-home-ink-850"
                    >
                      <div className="text-[20px]">🧑</div>
                      <div>
                        <div className="font-home-display text-[12.5px] font-semibold text-home-text-strong">
                          {player.username || `Player #${player.id}`}
                        </div>
                        {player.email && (
                          <div className="mt-[2px] text-[11.5px] text-home-dim">{player.email}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Characters Section */}
            <section className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                Characters
              </h3>
              {characters.length === 0 ? (
                <p className="text-[12.5px] italic text-home-dim">No characters assigned to this campaign yet.</p>
              ) : (
                <ul className="divide-y divide-home-line overflow-hidden rounded-home-2xl border border-home-border bg-home-surface">
                  {characters.map((character) => (
                    <li
                      key={character.id}
                      className="flex items-center gap-[12px] px-[14px] py-[10px] transition-colors duration-150 hover:bg-home-ink-850"
                    >
                      <div className="text-[20px]">🧙</div>
                      <div className="flex-1">
                        <div className="font-home-display text-[12.5px] font-semibold text-home-text-strong">
                          {character.name || `Character #${character.id}`}
                        </div>
                        <div className="mt-[2px] text-[11.5px] text-home-dim">
                          {[
                            character.race?.name,
                            character.alignment,
                          ].filter(Boolean).join(' · ')}
                        </div>
                        {character.user?.username && (
                          <div className="mt-[2px] text-[11.5px] text-home-dim">
                            Player: {character.user.username}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-[8px]">
                        {onViewCharacter && (
                          <button
                            type="button"
                            title="View Sheet"
                            aria-label="View character sheet"
                            onClick={() => onViewCharacter(character.id)}
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-home-md border border-home-border-mid bg-transparent text-home-dim transition-colors duration-150 hover:border-home-blue-400 hover:bg-[rgba(96,165,250,0.08)] hover:text-home-blue-400"
                          >
                            {/* Eye icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                        )}
                        {isDungeonMaster && onEditCharacter && (
                          <button
                            type="button"
                            title="Edit Character"
                            aria-label="Edit character"
                            onClick={() => onEditCharacter(character.id)}
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-home-md border border-home-border-mid bg-transparent text-home-dim transition-colors duration-150 hover:border-[#a78bfa] hover:bg-[rgba(167,139,250,0.08)] hover:text-[#a78bfa]"
                          >
                            {/* Pencil icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                              <path d="m15 5 4 4"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
