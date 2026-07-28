import { useState, useEffect } from 'react'
import { ScoreBox } from '../components/scoreBox'
import { Button } from '../components/ui/Button'
import { MetricTile } from '../components/MetricTile'
import { api, API_BASE_URL } from '../services/api'
import type { Character, CharacterCatalogClassOption, HydratedCharacterEditData, LevelRecord } from '../interfaces/character'
import type { DemoCharacterDetail } from '../interfaces/demo'
import { hydrateCharacterEditData } from '../utils/characterDraft'

type LevelResponse = {
  id?: {
    characterId?: number | string
    classId?: number | string
  }
  character?: {
    id?: number | string
  }
  dndClass?: {
    id?: number | string
    name?: string
    description?: string
    levelCharacteristics?: Record<string, unknown>
  }
  level?: number | string
}

type CharacterPayload = Partial<Character> & Record<string, unknown>

interface FormCharacterData {
  name: string;
  classes: Array<{
    classId: number;
    description: string;
    level: number;
    features: Array<{ level: number; text: string }>;
  }>;
  race: string;
  racialFeats: string[];
  background: string;
  characteristics: string[];
  alignment: string;
  proficiency: number;
  abilityScores: {
    Strength: number;
    Dexterity: number;
    Constitution: number;
    Intelligence: number;
    Wisdom: number;
    Charisma: number;
  };
  proficiencies: { [key: string]: number };
  velocity: number;
  hp: number;
  portraitUrl?: string;
}

interface CharactersProps {
  characterId: number;
  onBack: () => void;
  onEditCharacter: (editData: HydratedCharacterEditData) => void;
  onLogout: () => void;
  onDeleteCharacter: (characterId: number, characterName?: string) => void;
  onViewCampaign?: (campaignId: number) => void;
  deletingCharacterId: number | null;
  deleteError: string | null;
  feedback?: string | null;
  onDismissFeedback?: () => void;
  refreshToken?: number;
  readOnly?: boolean;
  source?: 'user' | 'demo';
}

export function Characters({
  characterId,
  onBack,
  onEditCharacter,
  onLogout,
  onDeleteCharacter,
  onViewCampaign,
  deletingCharacterId,
  deleteError,
  feedback,
  onDismissFeedback,
  refreshToken,
  readOnly = false,
  source = 'user',
}: CharactersProps) {
  // Demo characters are always read-only, regardless of what the caller passes,
  // as a defensive guard against ever exposing mutation controls for demo data.
  const isReadOnly = readOnly || source === 'demo'
  const [characterSheetData, setCharacterSheetData] = useState<FormCharacterData | null>(null)
  const [characterEditData, setCharacterEditData] = useState<HydratedCharacterEditData | null>(null)
  const [characterCampaign, setCharacterCampaign] = useState<{ id: number; name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacterSheet = async () => {
      setLoading(true)
      setError(null)
      try {
        const [responseData, levelsResponse, classesResponse] = await Promise.all([
          api.characters.findById(characterId),
          api.levels.findAll().catch(() => []),
          api.classes.findAll().catch(() => []),
        ])

        if (!responseData || typeof responseData !== 'object') {
          setError('Malformed character payload')
          return
        }

        const characterPayload = responseData as CharacterPayload

        const hasUser = !!characterPayload.user
        const hasRace = !!characterPayload.race

        if (!hasUser || !hasRace) {
          setError('Malformed character payload from server')
          return
        }

        const mappedData: Character = {
          id: characterPayload.id ?? 0,
          user: characterPayload.user as Character['user'],
          campaign: (characterPayload.campaign ?? { id: 0 }) as Character['campaign'],
          name: characterPayload.name ?? '',
          characterClasses: Array.isArray(characterPayload.characterClasses) ? characterPayload.characterClasses : [],
          characteristics: Array.isArray(characterPayload.characteristics) ? characterPayload.characteristics : [],
          alignment: characterPayload.alignment ?? '',
          background: characterPayload.background ?? '',
          characterStats: characterPayload.characterStats as Character['characterStats'],
          race: characterPayload.race as Character['race'],
          portraitUrl: typeof characterPayload.portraitUrl === 'string' ? characterPayload.portraitUrl : undefined,
        }

        const normalizedLevels = Array.isArray(levelsResponse) ? (levelsResponse as LevelRecord[]) : []
        const classCatalog = Array.isArray(classesResponse) ? (classesResponse as CharacterCatalogClassOption[]) : []
        const classCatalogById = new Map(classCatalog.map((entry) => [Number(entry.id), entry]))

        const classLevels = normalizedLevels.length > 0
          ? normalizedLevels
              .filter((lvl): lvl is LevelResponse => typeof lvl === 'object' && lvl !== null)
              .filter((lvl) => {
                const levelData = lvl as LevelResponse
                const lvlCharacterId = levelData.id?.characterId ?? levelData.character?.id
                return Number(lvlCharacterId) === Number(characterId)
              })
              .map((lvl) => {
                const levelData = lvl as LevelResponse
                const classId = Number(levelData.id?.classId ?? levelData.dndClass?.id ?? 0)
                const classCatalogEntry = classCatalogById.get(classId)
                const description = String(
                  levelData.dndClass?.name
                    ?? classCatalogEntry?.name
                    ?? levelData.dndClass?.description
                    ?? classCatalogEntry?.description
                    ?? 'Unknown',
                )
                const level = Number(levelData.level ?? 0)
                const rawCharacteristics = levelData.dndClass?.levelCharacteristics ?? classCatalogEntry?.levelCharacteristics
                const features =
                  rawCharacteristics && typeof rawCharacteristics === 'object'
                    ? Object.entries(rawCharacteristics)
                        .map(([k, v]) => ({ level: Number(k), text: String(v) }))
                        .filter((f) => Number.isFinite(f.level) && f.level > 0 && f.level <= level)
                        .filter((f) => f.text && f.text !== 'null' && f.text !== 'undefined')
                        .sort((a, b) => a.level - b.level)
                    : []

                return { classId, description, level, features }
              })
              .filter((x) => x.classId)
          : []

        setCharacterSheetData({
          name: mappedData.name || '',
          classes: classLevels,
          race: mappedData.race.name || '',
          racialFeats: mappedData.race.racialFeats || [],
          background: mappedData.background || '',
          characteristics: mappedData.characteristics || [],
          alignment: mappedData.alignment || '',
          proficiency: mappedData.characterStats.proficiency || 0,
          abilityScores: {
            Strength: mappedData.characterStats.abilityScores.Strength || 0,
            Dexterity: mappedData.characterStats.abilityScores.Dexterity || 0,
            Constitution: mappedData.characterStats.abilityScores.Constitution || 0,
            Intelligence: mappedData.characterStats.abilityScores.Intelligence || 0,
            Wisdom: mappedData.characterStats.abilityScores.Wisdom || 0,
            Charisma: mappedData.characterStats.abilityScores.Charisma || 0
          },
          proficiencies: mappedData.characterStats.proficiencies || {},
          velocity: mappedData.characterStats.velocities[0] || 0,
          hp: mappedData.characterStats.hp || 0,
          portraitUrl: mappedData.portraitUrl,
        })
        if (mappedData.campaign?.id && Number(mappedData.campaign.id) > 0) {
          setCharacterCampaign({ id: Number(mappedData.campaign.id), name: mappedData.campaign.name })
        }
        setCharacterEditData(hydrateCharacterEditData(mappedData, normalizedLevels))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    const fetchDemoCharacterSheet = async () => {
      setLoading(true)
      setError(null)
      try {
        const demoData = await api.demo.characterById(characterId) as DemoCharacterDetail

        setCharacterSheetData({
          name: demoData.name || '',
          classes: Array.isArray(demoData.classes)
            ? demoData.classes.map((c) => ({
                classId: c.classId,
                description: c.description,
                level: c.level,
                features: Array.isArray(c.features) ? c.features : [],
              }))
            : [],
          race: demoData.raceName || '',
          racialFeats: Array.isArray(demoData.racialFeats) ? demoData.racialFeats : [],
          background: demoData.background || '',
          characteristics: Array.isArray(demoData.characteristics) ? demoData.characteristics : [],
          alignment: demoData.alignment || '',
          proficiency: demoData.proficiency || 0,
          abilityScores: {
            Strength: demoData.abilityScores?.Strength || 0,
            Dexterity: demoData.abilityScores?.Dexterity || 0,
            Constitution: demoData.abilityScores?.Constitution || 0,
            Intelligence: demoData.abilityScores?.Intelligence || 0,
            Wisdom: demoData.abilityScores?.Wisdom || 0,
            Charisma: demoData.abilityScores?.Charisma || 0,
          },
          proficiencies: demoData.proficiencies || {},
          velocity: demoData.velocity || 0,
          hp: demoData.hp || 0,
          portraitUrl: demoData.portraitUrl,
        })
        // Demo characters have no campaign or edit context.
        setCharacterCampaign(null)
        setCharacterEditData(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message.includes('404') ? 'This demo sheet is unavailable.' : message)
      } finally {
        setLoading(false)
      }
    }

    if (source === 'demo') {
      void fetchDemoCharacterSheet()
      return
    }

    fetchCharacterSheet()
  }, [characterId, refreshToken, source])

  if (loading) {
    return (
      <div className="min-h-screen bg-home-ink-900 p-[26px] text-[12.5px] text-home-dim">
        Loading character sheet...
      </div>
    )
  }

  if (error) {
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
            {source === 'demo' ? 'Back to Demo' : 'Logout'}
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

  if (!characterSheetData) {
    return null
  }

  const dexterityModifier = Math.floor((characterSheetData.abilityScores.Dexterity - 10) / 2)

  const parseFeature = (featureText: string) => {
    const [title, ...descParts] = String(featureText || '').split('\n')
    return {
      title: (title || '').trim(),
      description: descParts.join('\n').trim(),
    }
  }

  const stripRaceLevelPrefix = (title: string) => title.replace(/^(level|nivel)\s*\d+\s*[:\-]?\s*/i, '').trim()

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
          {source === 'demo' ? 'Back to Demo' : 'Logout'}
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
                aria-label="Dismiss character feedback"
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
      <div className="flex w-full flex-col items-center p-[22px_26px_28px]">
        <div className="mx-auto mb-[14px] flex w-full max-w-[1320px] items-center justify-end gap-[10px]">
          {!isReadOnly && (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  if (characterEditData) {
                    onEditCharacter(characterEditData)
                  }
                }}
                disabled={!characterEditData}
              >
                Edit Character
              </Button>
              <button
                type="button"
                className="h-[36px] rounded-home-md border border-[#3f2226] bg-[rgba(220,38,38,.12)] px-[16px] font-home-display text-[12.5px] font-semibold text-home-danger transition-colors duration-150 hover:bg-[rgba(220,38,38,.2)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onDeleteCharacter(characterId, characterSheetData.name)}
                disabled={deletingCharacterId === characterId}
              >
                {deletingCharacterId === characterId ? 'Deleting...' : 'Delete Character'}
              </button>
            </>
          )}
        </div>

        <div className="mx-auto mb-[20px] w-full max-w-[1320px]">
          <div className="mb-[16px] flex items-center gap-[16px] rounded-home-2xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[22px_24px]">
            <div className="flex-1">
              <span className="inline-flex items-center rounded-full bg-[rgba(220,38,38,.12)] px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#f2b8b5]">
                Character Sheet
              </span>
              <h2 className="mt-[10px] font-home-display text-[28px] font-semibold text-home-text-strong">
                {characterSheetData.name || 'Unnamed Character'}
              </h2>
              {!isReadOnly && (
                <p className="mt-[8px] text-[12.5px] leading-[1.5] text-home-muted">
                  Review the current sheet, class features, and core stats before making your next table decision.
                </p>
              )}
            </div>
          </div>

          {characterSheetData.portraitUrl && (
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <img
                src={characterSheetData.portraitUrl.startsWith('/') ? `${API_BASE_URL}${characterSheetData.portraitUrl}` : characterSheetData.portraitUrl}
                alt={`${characterSheetData.name || 'Character'} portrait`}
                style={{ maxWidth: '160px', maxHeight: '160px', borderRadius: '0.5rem', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          <div className="mb-[20px] grid grid-cols-2 gap-[12px] sm:grid-cols-4">
            <MetricTile value={`+${characterSheetData.proficiency}`} label="PROFICIENCY" valueClassName="text-home-blue-300" />
            <MetricTile value={10 + dexterityModifier} label="ARMOR CLASS" />
            <MetricTile value={dexterityModifier} label="INITIATIVE" />
            <MetricTile value={characterSheetData.velocity} label="SPEED" />
          </div>

          <div className="mb-[20px] grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-home-lg border border-home-border bg-home-surface p-[10px]">
              <h3 className="mb-[4px] font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Class: </h3>
              {characterSheetData.classes.length > 0 ? (
                <div>
                  {characterSheetData.classes.map((c) => (
                    <p key={c.classId} className="text-[12.5px] text-home-text">{c.description} (Level {c.level})</p>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-home-text">Not Specified</p>
              )}
            </div>
            <div className="rounded-home-lg border border-home-border bg-home-surface p-[10px]">
              <h3 className="mb-[4px] font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Race: </h3>
              <p className="text-[12.5px] text-home-text">{characterSheetData.race}</p>
            </div>
            <div className="rounded-home-lg border border-home-border bg-home-surface p-[10px]">
              <h3 className="mb-[4px] font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Background: </h3>
              <p className="text-[12.5px] text-home-text">{characterSheetData.background}</p>
            </div>
            <div className="rounded-home-lg border border-home-border bg-home-surface p-[10px]">
              <h3 className="mb-[4px] font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Alignment: </h3>
              <p className="text-[12.5px] text-home-text">{characterSheetData.alignment}</p>
            </div>
            <div className="rounded-home-lg border border-home-border bg-home-surface p-[10px]">
              <h3 className="mb-[4px] font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">HP: </h3>
              <p className="text-[12.5px] text-home-text">{characterSheetData.hp}</p>
            </div>
          </div>

          {/* Campaign Info */}
          {characterCampaign && (
            <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[16px] rounded-home-lg border border-home-border-mid bg-home-well p-[12px_16px]">
              <div>
                <span className="font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">
                  CAMPAIGN
                </span>
                <div className="mt-[4px] text-[16px] font-semibold text-home-text-strong">
                  🗺️ {characterCampaign.name || `Campaign #${characterCampaign.id}`}
                </div>
              </div>
              {onViewCampaign && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewCampaign(characterCampaign.id)}
                  className="whitespace-nowrap"
                >
                  View Campaign →
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-[16px] lg:grid-cols-2">
          <div className="flex flex-col gap-[20px]">
            <div className="rounded-home-2xl border border-home-border bg-home-surface p-[16px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">Abilities & Proficiencies</h3>
              <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                <ScoreBox
                  label="Strength"
                  score={characterSheetData.abilityScores.Strength}
                  skills={[{ name: 'Athletics', proficient: characterSheetData.proficiencies['Athletics'] }]}
                  savingProficiency={characterSheetData.proficiencies['Strength']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
                <ScoreBox
                  label="Dexterity"
                  score={characterSheetData.abilityScores.Dexterity}
                  skills={[
                    { name: 'Acrobatics', proficient: characterSheetData.proficiencies['Acrobatics'] },
                    { name: 'Sleight of Hand', proficient: characterSheetData.proficiencies['Sleight of Hand'] },
                    { name: 'Stealth', proficient: characterSheetData.proficiencies['Stealth'] },
                  ]}
                  savingProficiency={characterSheetData.proficiencies['Dexterity']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
                <ScoreBox
                  label="Constitution"
                  score={characterSheetData.abilityScores.Constitution}
                  skills={[]}
                  savingProficiency={characterSheetData.proficiencies['Constitution']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
                <ScoreBox
                  label="Intelligence"
                  score={characterSheetData.abilityScores.Intelligence}
                  skills={[
                    { name: 'Arcana', proficient: characterSheetData.proficiencies['Arcana'] },
                    { name: 'History', proficient: characterSheetData.proficiencies['History'] },
                    { name: 'Investigation', proficient: characterSheetData.proficiencies['Investigation'] },
                    { name: 'Nature', proficient: characterSheetData.proficiencies['Nature'] },
                    { name: 'Religion', proficient: characterSheetData.proficiencies['Religion'] },
                  ]}
                  savingProficiency={characterSheetData.proficiencies['Intelligence']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
                <ScoreBox
                  label="Wisdom"
                  score={characterSheetData.abilityScores.Wisdom}
                  skills={[
                    { name: 'Animal Handling', proficient: characterSheetData.proficiencies['Animal Handling'] },
                    { name: 'Insight', proficient: characterSheetData.proficiencies['Insight'] },
                    { name: 'Medicine', proficient: characterSheetData.proficiencies['Medicine'] },
                    { name: 'Perception', proficient: characterSheetData.proficiencies['Perception'] },
                    { name: 'Survival', proficient: characterSheetData.proficiencies['Survival'] },
                  ]}
                  savingProficiency={characterSheetData.proficiencies['Wisdom']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
                <ScoreBox
                  label="Charisma"
                  score={characterSheetData.abilityScores.Charisma}
                  skills={[
                    { name: 'Deception', proficient: characterSheetData.proficiencies['Deception'] },
                    { name: 'Intimidation', proficient: characterSheetData.proficiencies['Intimidation'] },
                    { name: 'Performance', proficient: characterSheetData.proficiencies['Performance'] },
                    { name: 'Persuasion', proficient: characterSheetData.proficiencies['Persuasion'] },
                  ]}
                  savingProficiency={characterSheetData.proficiencies['Charisma']}
                  proficiencyBonus={characterSheetData.proficiency}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[20px]">
            <div className="rounded-home-2xl border border-home-border bg-home-surface p-[16px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">Class Features</h3>
              {characterSheetData.classes.length === 0 ? (
                <div className="text-[12.5px] italic text-home-dim">No class features</div>
              ) : (
                characterSheetData.classes.map((c) => {
                  // Group features by level
                  const featuresByLevel = c.features.reduce<Record<number, Array<{ title: string; description: string }>>>((acc, f) => {
                    const [title, ...descParts] = f.text.split('\n')
                    const description = descParts.join('\n')
                    if (!acc[f.level]) {
                      acc[f.level] = []
                    }
                    acc[f.level].push({ title: title || 'Feature', description: description || '' })
                    return acc
                  }, {})

                  const levels = Object.keys(featuresByLevel).map(Number).sort((a, b) => a - b)

                  return (
                    <div key={c.classId} className="mb-[16px] last:mb-0">
                      <div className="mb-[10px] border-b-2 border-home-line pb-[8px] text-[15px] font-bold text-home-text-strong">
                        {c.description} (Level {c.level})
                      </div>
                      {levels.length === 0 ? (
                        <div className="text-[12.5px] italic text-home-dim">No features unlocked</div>
                      ) : (
                        levels.map((level) => (
                          <div key={`${c.classId}-level-${level}`} className="mb-[16px] border-l-[3px] border-[#3f2226] pl-[10px] last:mb-0">
                            <div className="mb-[10px] rounded-r-[4px] bg-[rgba(220,38,38,.08)] px-[10px] py-[6px] font-home-mono text-[10px] font-bold uppercase tracking-[.08em] text-home-danger">
                              Level {level}
                            </div>
                            <div className="flex flex-col gap-[10px] pl-[6px]">
                              {featuresByLevel[level].map((feature, idx) => (
                                <div key={`${c.classId}-${level}-${idx}`} className="rounded-home-md border border-home-border bg-home-ink-900 p-[10px_14px] transition-colors duration-150 hover:border-home-border-hi">
                                  <div className="mb-[5px] text-[13px] font-bold text-home-text-strong">{feature.title}</div>
                                  {feature.description && (
                                    <div className="text-[12.5px] leading-[1.5] text-home-muted">{feature.description}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="rounded-home-2xl border border-home-border bg-home-surface p-[16px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">Race Features</h3>
              {!characterSheetData.racialFeats || characterSheetData.racialFeats.length === 0 ? (
                <div className="text-[12.5px] italic text-home-dim">No racial features</div>
              ) : (
                <div className="mb-[16px] last:mb-0">
                  <div className="mb-[10px] border-b-2 border-home-line pb-[8px] text-[15px] font-bold text-home-text-strong">{characterSheetData.race || 'Race'}</div>
                  <div className="flex flex-col gap-[10px] pl-[6px]">
                    {characterSheetData.racialFeats.map((feat, index) => {
                      const parsed = parseFeature(feat)
                      const cleanedTitle = stripRaceLevelPrefix(parsed.title)
                      return (
                        <div key={index} className="rounded-home-md border border-home-border bg-home-ink-900 p-[10px_14px] transition-colors duration-150 hover:border-home-border-hi">
                          <div className="mb-[5px] text-[13px] font-bold text-home-text-strong">{cleanedTitle || 'Feature'}</div>
                          {parsed.description && <div className="text-[12.5px] leading-[1.5] text-home-muted">{parsed.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-home-2xl border border-home-border bg-home-surface p-[16px]">
              <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">Character Features</h3>
              {characterSheetData.characteristics.length === 0 ? (
                <div className="text-[12.5px] italic text-home-dim">No character features</div>
              ) : (
                <div className="mb-[16px] last:mb-0">
                  <div className="flex flex-col gap-[10px] pl-[6px]">
                    {characterSheetData.characteristics.map((feature, index) => {
                      const parsed = parseFeature(feature)
                      return (
                        <div key={index} className="rounded-home-md border border-home-border bg-home-ink-900 p-[10px_14px] transition-colors duration-150 hover:border-home-border-hi">
                          <div className="mb-[5px] text-[13px] font-bold text-home-text-strong">{parsed.title || 'Feature'}</div>
                          {parsed.description && <div className="text-[12.5px] leading-[1.5] text-home-muted">{parsed.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
