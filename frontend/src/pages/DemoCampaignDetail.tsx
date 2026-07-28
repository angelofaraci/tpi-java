import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { DemoCampaignDetail as DemoCampaignDetailData } from '../interfaces/demo'
import { Button } from '../components/ui/Button'

interface DemoCampaignDetailProps {
  campaignId: number
  onBack: () => void
  onSelectCharacter: (characterId: number) => void
}

export function DemoCampaignDetail({ campaignId, onBack, onSelectCharacter }: DemoCampaignDetailProps) {
  const [campaign, setCampaign] = useState<DemoCampaignDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadCampaign = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await api.demo.campaignById(campaignId)
        if (cancelled) return
        setCampaign(result)
      } catch {
        if (cancelled) return
        setError('This demo campaign is unavailable.')
        setCampaign(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCampaign()

    return () => {
      cancelled = true
    }
  }, [campaignId])

  return (
    <div className="min-h-screen bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
        <h1 className="font-home-display text-[12.5px] font-bold uppercase text-home-text-strong">D&D Manager</h1>
        <Button variant="primary" onClick={onBack}>
          Back
        </Button>
      </header>

      <div>
        <section className="p-[22px_26px_28px]">
          {loading && <div className="text-[12.5px] text-home-dim">Loading campaign...</div>}

          {!loading && error && (
            <div className="rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
              {error}
            </div>
          )}

          {!loading && !error && campaign && (
            <>
              <div className="mb-[16px] flex items-center justify-between">
                <div>
                  <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                    {campaign.name}
                  </h2>
                  {campaign.description && (
                    <p className="mt-[6px] text-[13px] text-home-muted">{campaign.description}</p>
                  )}
                  {campaign.creationDate && (
                    <p className="mt-[6px] text-[13px] text-home-muted">
                      Created {new Date(campaign.creationDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-[16px] mt-[32px] flex items-center justify-between">
                <div>
                  <h2 className="font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                    Characters
                  </h2>
                </div>
              </div>

              {campaign.characters.length === 0 ? (
                <div className="rounded-home-2xl border border-dashed border-home-border-dash p-[14px]">
                  <p className="font-home-display text-[13.5px] font-semibold text-home-text-soft">
                    No characters in this demo campaign yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3">
                  {campaign.characters.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => onSelectCharacter(character.id)}
                      className="overflow-hidden rounded-home-2xl border border-home-border bg-home-surface p-0 text-left transition-colors duration-150 hover:bg-home-ink-850"
                    >
                      <div className="p-[14px]">
                        <h3 className="font-home-display text-[13.5px] font-semibold text-home-text-strong">
                          {character.name}
                        </h3>
                        <p className="mt-[6px] text-[11.5px] text-home-muted">
                          {character.level ? `Level ${character.level} | ` : ''}
                          {character.raceName || 'No Species Selected'} | {character.alignment || 'No Alignment'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
