import { CopyCodeButton } from './CopyCodeButton'

export type RailCampaign = {
  id: number
  name: string
  role: 'DM' | 'PLAYER'
  /** Shown ONLY when role === 'DM' — role never read from CampaignDto.dm (@JsonIgnore). */
  joinCode?: string
  playerCount?: number
  characterCount?: number
  /** Player's own character name, shown on the normal PLAYER variant left slot. */
  heroName?: string
}

export interface CampaignRailCardProps {
  campaign: RailCampaign
  featured?: boolean
  onOpen: (campaignId: number) => void
  onManage?: (campaignId: number) => void
}

export function CampaignRailCard({ campaign, featured = false, onOpen, onManage }: CampaignRailCardProps) {
  const { id, name, role, joinCode, playerCount, characterCount, heroName } = campaign
  const isDungeonMaster = role === 'DM'
  const metaLine = `${playerCount ?? 0} players · ${characterCount ?? 0} of your heroes`

  const containerClassName = featured
    ? 'mb-[9px] rounded-home-2xl border border-home-border-acc bg-[linear-gradient(160deg,#121a28,#0d1015)] p-[13px_14px]'
    : 'mb-[9px] rounded-home-2xl border border-home-border bg-home-surface p-[13px_14px]'

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-[10px]">
        <button
          type="button"
          onClick={() => onOpen(id)}
          className="font-home-display text-[15px] font-semibold text-home-text-strong"
        >
          {name}
        </button>
        <span
          className={
            isDungeonMaster
              ? 'rounded-home-sm bg-[#16233a] px-[7px] py-[3px] font-home-mono text-[9px] font-bold tracking-[.12em] text-home-blue-300'
              : 'rounded-home-sm bg-[#1b2029] px-[7px] py-[3px] font-home-mono text-[9px] font-bold tracking-[.12em] text-home-muted'
          }
        >
          {role}
        </span>
      </div>

      <div className="mt-[7px] text-[11.5px] text-home-muted-2">{metaLine}</div>

      {featured && isDungeonMaster && joinCode && (
        <div className="mt-[11px] flex items-center justify-between rounded-home-lg border border-home-line bg-home-well px-[9px] py-[7px]">
          <span className="font-home-mono text-[9px] tracking-[.14em] text-home-dim-2">JOIN CODE</span>
          <div className="flex items-center gap-[6px]">
            <span className="font-home-mono text-[12px] tracking-[.06em] text-home-gold">{joinCode}</span>
            <CopyCodeButton code={joinCode} size="xs" />
          </div>
        </div>
      )}

      {featured ? (
        <div className="mt-[11px] flex gap-[8px]">
          <button
            type="button"
            onClick={() => onOpen(id)}
            className="flex-1 rounded-home-lg bg-home-blue-ink py-[7px] text-center font-home-display text-[11.5px] font-semibold text-home-blue-200"
          >
            Open table
          </button>
          {isDungeonMaster && (
            <button
              type="button"
              onClick={() => onManage?.(id)}
              className="rounded-home-lg border border-home-border-mid px-[11px] py-[7px] font-home-display text-[11.5px] font-semibold text-home-muted"
            >
              Manage
            </button>
          )}
        </div>
      ) : (
        <div className="mt-[11px] flex items-center justify-between">
          <span className="text-[11.5px] text-home-dim">
            {isDungeonMaster
              ? joinCode && <span className="font-home-mono text-[12px] tracking-[.06em] text-home-gold">{joinCode}</span>
              : heroName && <span className="text-home-text-soft">Your hero: {heroName}</span>}
          </span>
          <button
            type="button"
            onClick={() => onOpen(id)}
            className="font-home-display text-[11.5px] font-semibold text-home-blue-400"
          >
            Open →
          </button>
        </div>
      )}
    </div>
  )
}
