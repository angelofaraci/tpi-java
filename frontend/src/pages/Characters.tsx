import { useState, useEffect } from 'react'
import { ScoreBox } from '../components/scoreBox'
import '../styles/CharacterSheet.css'
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
    return <div className="loading-container">Loading character sheet...</div>
  }

  if (error) {
    return (
      <div>
        <header className="app-header">
          <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager</h1>
          <button onClick={onLogout} className="logout-button">
            {source === 'demo' ? 'Back to Demo' : 'Logout'}
          </button>
        </header>
        <div style={{ padding: '2rem' }}>
          <button className="link-button" onClick={onBack}>← Back to Home</button>
          <div className="error-message" style={{ marginTop: '1rem' }}>Error: {error}</div>
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
    <div>
      <header className="app-header">
        <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager</h1>
        <button onClick={onLogout} className="logout-button">
          {source === 'demo' ? 'Back to Demo' : 'Logout'}
        </button>
      </header>
      <div style={{ padding: '1rem 2rem' }}>
        <button className="link-button" onClick={onBack}>← Back to Home</button>
        {feedback && (
          <div className="status-banner success-banner" role="status" style={{ marginTop: '1rem' }}>
            <span>{feedback}</span>
            {onDismissFeedback && (
              <button
                type="button"
                className="banner-dismiss-button"
                onClick={onDismissFeedback}
                aria-label="Dismiss character feedback"
              >
                x
              </button>
            )}
          </div>
        )}
        {deleteError && <div className="error-message" style={{ marginTop: '1rem' }}>{deleteError}</div>}
      </div>
      <div className="character-sheet">
        <div className="sheet-actions-row">
          {!isReadOnly && (
            <>
              <button
                type="button"
                className="section-action-button sheet-hero-action-button"
                onClick={() => {
                  if (characterEditData) {
                    onEditCharacter(characterEditData)
                  }
                }}
                disabled={!characterEditData}
              >
                Edit Character
              </button>
              <button
                type="button"
                className="sheet-delete-button sheet-hero-action-button"
                onClick={() => onDeleteCharacter(characterId, characterSheetData.name)}
                disabled={deletingCharacterId === characterId}
              >
                {deletingCharacterId === characterId ? 'Deleting...' : 'Delete Character'}
              </button>
            </>
          )}
        </div>

        <div className="header-section">
          <div className="sheet-hero-actions">
            <div className="sheet-hero-content">
              <span className="sheet-hero-badge">Character Sheet</span>
              <h2 className="sheet-hero-title">{characterSheetData.name || 'Unnamed Character'}</h2>
              {!isReadOnly && <p className="sheet-hero-copy">Review the current sheet, class features, and core stats before making your next table decision.</p>}
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

          <div className="stats-container sheet-top-stats">
            <div className="stat-box proficiency-stat-box">
              <div>Proficiency</div>
              <div className="score proficiency-stat-score">+{characterSheetData.proficiency}</div>
            </div>
            <div className="stat-box">
              <div>Armor Class</div>
              <div className="score">{10 + dexterityModifier}</div>
            </div>
            <div className="stat-box">
              <div>Initiative</div>
              <div className="score">{dexterityModifier}</div>
            </div>
            <div className="stat-box">
              <div>Speed</div>
              <div className="score">{characterSheetData.velocity}</div>
            </div>
          </div>

          <div className="basic-info">
            <div className='infobox'>
              <h3>Class: </h3>
              {characterSheetData.classes.length > 0 ? (
                <div>
                  {characterSheetData.classes.map((c) => (
                    <p key={c.classId}>{c.description} (Level {c.level})</p>
                  ))}
                </div>
              ) : (
                <p>Not Specified</p>
              )}
            </div>
            <div className='infobox'>
              <h3>Race: </h3>
              <p>{characterSheetData.race}</p>
            </div>
            <div className='infobox'>
              <h3>Background: </h3>
              <p>{characterSheetData.background}</p>
            </div>
            <div className='infobox'>
              <h3>Alignment: </h3>
              <p>{characterSheetData.alignment}</p>
            </div>
            <div className='infobox'>
              <h3>HP: </h3>
              <p>{characterSheetData.hp}</p>
            </div>
          </div>

          {/* Campaign Info */}
          {characterCampaign && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--color-foreground-muted)' }}>
                  CAMPAIGN
                </span>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-foreground)', marginTop: '0.25rem' }}>
                  🗺️ {characterCampaign.name || `Campaign #${characterCampaign.id}`}
                </div>
              </div>
              {onViewCampaign && (
                <button
                  type="button"
                  className="section-action-button"
                  onClick={() => onViewCampaign(characterCampaign.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  View Campaign →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sheet-columns">
          <div className="sheet-column-left">
            <div className="features-section">
              <h3>Abilities & Proficiencies</h3>
              <div className="ability-scores ability-scores-sidebar">
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

          <div className="sheet-column-right">
            <div className="features-section">
              <h3>Class Features</h3>
              {characterSheetData.classes.length === 0 ? (
                <div className="feature-item">No class features</div>
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
                    <div key={c.classId} className="class-features-block">
                      <div className="class-features-header">
                        {c.description} (Level {c.level})
                      </div>
                      {levels.length === 0 ? (
                        <div className="feature-item">No features unlocked</div>
                      ) : (
                        levels.map((level) => (
                          <div key={`${c.classId}-level-${level}`} className="level-features-group">
                            <div className="level-features-header">Level {level}</div>
                            <div className="level-features-list">
                              {featuresByLevel[level].map((feature, idx) => (
                                <div key={`${c.classId}-${level}-${idx}`} className="feature-card">
                                  <div className="feature-title">{feature.title}</div>
                                  {feature.description && (
                                    <div className="feature-description">{feature.description}</div>
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

            <div className="features-section">
              <h3>Race Features</h3>
              {!characterSheetData.racialFeats || characterSheetData.racialFeats.length === 0 ? (
                <div className="feature-item">No racial features</div>
              ) : (
                <div className="class-features-block">
                  <div className="class-features-header">{characterSheetData.race || 'Race'}</div>
                  <div className="level-features-list">
                    {characterSheetData.racialFeats.map((feat, index) => {
                      const parsed = parseFeature(feat)
                      const cleanedTitle = stripRaceLevelPrefix(parsed.title)
                      return (
                        <div key={index} className="feature-card">
                          <div className="feature-title">{cleanedTitle || 'Feature'}</div>
                          {parsed.description && <div className="feature-description">{parsed.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="features-section">
              <h3>Character Features</h3>
              {characterSheetData.characteristics.length === 0 ? (
                <div className="feature-item">No character features</div>
              ) : (
                <div className="class-features-block">
                  <div className="level-features-list">
                    {characterSheetData.characteristics.map((feature, index) => {
                      const parsed = parseFeature(feature)
                      return (
                        <div key={index} className="feature-card">
                          <div className="feature-title">{parsed.title || 'Feature'}</div>
                          {parsed.description && <div className="feature-description">{parsed.description}</div>}
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
