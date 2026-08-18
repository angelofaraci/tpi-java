import type { KeyboardEvent } from 'react'
import type { Character, LevelRecord } from '../interfaces/character'
import { AbilityScoreStrip } from './scoreBox'

export interface CharacterCardProps {
  character: Character
  campaignName: string | null
  isDungeonMaster: boolean
  /** Required only in interactive mode; ignored when interactive === false. */
  onOpenSheet?: (characterId: number) => void
  onRequestDelete?: (characterId: number, name?: string) => void
  /** Grouped GET /levels response by characterId — see design.md "Revised: parallel fetch includes levels". */
  levelsByCharacterId: Map<number, LevelRecord[]>
  /** Default true. When false the card is inert: no role/tabIndex/handlers, no footer row. */
  interactive?: boolean
}

// AC has no backing field; derive unarmored AC client-side (spec.md "Character Cards
// Grid — Derivation Rules"): 10 + floor((DEX-10)/2).
function deriveArmorClass(dexterity: number): number {
  return 10 + Math.floor((dexterity - 10) / 2)
}

// Level badge: Character/CharacterClass carries no level field. Resolve via the
// GET /levels records grouped by characterId, ordered by character.characterClasses.
function deriveLevelBadge(character: Character, levelsByCharacterId: Map<number, LevelRecord[]>): string | null {
  const records = levelsByCharacterId.get(character.id) ?? []
  if (records.length === 0) return null

  const classes = character.characterClasses ?? []
  const levels = classes
    .map((cls) => records.find((record) => String(record.dndClass?.id) === String(cls.id))?.level)
    .filter((level): level is number | string => level !== undefined && level !== null)

  if (levels.length === 0) return null

  return `LV ${levels.join('/')}`
}

export function CharacterCard({
  character,
  campaignName,
  isDungeonMaster,
  onOpenSheet,
  onRequestDelete,
  levelsByCharacterId,
  interactive = true,
}: CharacterCardProps) {
  const abilityScores = character.characterStats?.abilityScores ?? {
    Strength: 10,
    Dexterity: 10,
    Constitution: 10,
    Intelligence: 10,
    Wisdom: 10,
    Charisma: 10,
  }
  const armorClass = deriveArmorClass(abilityScores.Dexterity ?? 10)
  const speed = character.characterStats?.velocities?.[0]
  const levelBadge = deriveLevelBadge(character, levelsByCharacterId)
  const primaryClassName = character.characterClasses?.[0]?.name ?? ''
  const raceName = character.race?.name ?? ''
  const resolvedCampaignName = campaignName ?? 'Unassigned'
  const dotColorClass = isDungeonMaster ? 'bg-home-blue-500' : 'bg-home-dim'

  const interactiveProps = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: () => onOpenSheet?.(character.id),
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') onOpenSheet?.(character.id)
        },
      }
    : {}
  const containerClassName = interactive
    ? 'cursor-pointer rounded-home-3xl border border-home-border bg-[linear-gradient(165deg,#111721,#0c0f14)] p-[15px_16px_13px] transition-colors duration-150 hover:border-home-border-hi'
    : 'rounded-home-3xl border border-home-border bg-[linear-gradient(165deg,#111721,#0c0f14)] p-[15px_16px_13px] transition-colors duration-150'

  return (
    <div data-testid="character-card" {...interactiveProps} className={containerClassName}>
      <div className="flex items-start justify-between gap-[10px]">
        <div>
          <div data-testid="character-card-name" className="font-home-display text-[17.5px] font-semibold tracking-[-.01em] text-home-text-strong">
            {character.name || 'Unnamed Character'}
          </div>
          <div className="mt-[3px] text-[12px] text-home-muted">
            {raceName} · {primaryClassName}
          </div>
        </div>
        {levelBadge && (
          <span className="rounded-home-md border border-home-border-acc bg-[#16233a] px-[8px] py-[4px] font-home-mono text-[10.5px] font-bold tracking-[.08em] text-home-blue-300">
            {levelBadge}
          </span>
        )}
      </div>

      <div className="mt-[9px] flex items-center gap-[6px] text-[11px] text-home-muted-2">
        <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${dotColorClass}`} />
        <span>{resolvedCampaignName}</span>
      </div>

      <div className="mt-[13px]">
        <AbilityScoreStrip abilityScores={abilityScores} />
      </div>

      <div className="mt-[12px] flex items-center gap-[14px]">
        <span className="flex items-baseline gap-[5px] font-home-mono">
          <span data-testid="character-card-ac" className="text-[15px] font-semibold text-home-text-strong">
            {armorClass}
          </span>
          <span className="text-[9px] tracking-[.12em] text-home-dim-2">AC</span>
        </span>
        {typeof speed === 'number' && (
          <span className="flex items-baseline gap-[5px] font-home-mono">
            <span data-testid="character-card-speed" className="text-[15px] font-semibold text-home-text-strong">
              {speed}
            </span>
            <span className="text-[9px] tracking-[.12em] text-home-dim-2">FT</span>
          </span>
        )}
      </div>

      {interactive && (
        <div className="mt-[13px] flex items-center justify-between border-t border-home-line-soft pt-[11px]">
          <span className="font-home-display text-[11.5px] font-semibold text-home-blue-400">Open sheet →</span>
          <button
            type="button"
            data-testid="character-card-delete"
            title={`More actions for ${character.name || 'character'}`}
            onClick={(event) => {
              event.stopPropagation()
              onRequestDelete?.(character.id, character.name)
            }}
            className="font-home-mono text-[12px] font-semibold text-home-dim-3 transition-colors duration-150 hover:text-home-dim"
          >
            ···
          </button>
        </div>
      )}
    </div>
  )
}
