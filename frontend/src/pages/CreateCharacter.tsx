import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import '../App.css'
import type {
  AbilityScoreName,
  CharacterCatalogCampaignOption,
  CharacterCatalogClassOption,
  CharacterCatalogRaceOption,
  CharacterDraft,
} from '../interfaces/character'
import { api } from '../services/api'
import {
  buildCreateCharacterPayload,
  createCharacterDraft,
  DEFAULT_ABILITY_SCORES,
  getCharacterCatalogSelections,
} from '../utils/characterDraft'

interface CreateCharacterProps {
  currentUserId: number
  onCancel: () => void
  onLogout: () => void
  onSuccess: (characterName: string) => void
}

interface CharacterFormErrors {
  campaignId?: string
  name?: string
  alignment?: string
  background?: string
  raceId?: string
  classId?: string
}

const abilityScoreOrder: AbilityScoreName[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
]

const savingThrowOrder: AbilityScoreName[] = [...abilityScoreOrder]

const skillGroups: Array<{ ability: AbilityScoreName; skills: string[] }> = [
  { ability: 'Strength', skills: ['Athletics'] },
  { ability: 'Dexterity', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
  { ability: 'Intelligence', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
  { ability: 'Wisdom', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
  { ability: 'Charisma', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] },
]

const skillProficiencyOptions = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Proficient' },
  { value: 2, label: 'Expertise' },
]

function getSubmitErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred'
  }

  if (error.message.includes('Failed to fetch')) {
    return 'Unable to connect to server. Please check if the backend is running.'
  }

  if (error.message.toLowerCase().includes('invalid json')) {
    return 'Backend returned invalid data. Check browser console for details.'
  }

  return `Error: ${error.message}`
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isAbilityScoreName(value: string): value is AbilityScoreName {
  return abilityScoreOrder.includes(value as AbilityScoreName)
}

export function CreateCharacter({ currentUserId, onCancel, onLogout, onSuccess }: CreateCharacterProps) {
  const [draft, setDraft] = useState<CharacterDraft>(() => createCharacterDraft({ userId: currentUserId }))
  const [campaignCode, setCampaignCode] = useState('')
  const [characteristicsInput, setCharacteristicsInput] = useState('')
  const [campaigns, setCampaigns] = useState<CharacterCatalogCampaignOption[]>([])
  const [races, setRaces] = useState<CharacterCatalogRaceOption[]>([])
  const [classes, setClasses] = useState<CharacterCatalogClassOption[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CharacterFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadCatalogs = async () => {
      setIsLoadingCatalog(true)
      setCatalogError(null)

      try {
        const [loadedCampaigns, loadedRaces, loadedClasses] = await Promise.all([
          api.campaigns.findAll(),
          api.races.findAll(),
          api.classes.findAll(),
        ])

        if (!isMounted) {
          return
        }

        setCampaigns(Array.isArray(loadedCampaigns) ? loadedCampaigns : [])
        setRaces(Array.isArray(loadedRaces) ? loadedRaces : [])
        setClasses(Array.isArray(loadedClasses) ? loadedClasses : [])
      } catch (error) {
        if (!isMounted) {
          return
        }

        setCatalogError(getSubmitErrorMessage(error))
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false)
        }
      }
    }

    void loadCatalogs()

    return () => {
      isMounted = false
    }
  }, [])

  const selections = useMemo(
    () => getCharacterCatalogSelections(draft, { campaigns, races, classes }),
    [campaigns, races, classes, draft],
  )

  const totalLevel = draft.classLevels.reduce((sum, entry) => sum + entry.level, 0)
  const speed = draft.velocities[0] ?? 30
  const armorClass = 10 + Math.floor((draft.abilityScores.Dexterity - 10) / 2)
  const initiative = Math.floor((draft.abilityScores.Dexterity - 10) / 2)
  const selectedSkillCount = Object.entries(draft.proficiencies).filter(
    ([name, value]) => !isAbilityScoreName(name) && value > 0,
  ).length
  const selectedSavingThrowCount = savingThrowOrder.filter((name) => (draft.proficiencies[name] ?? 0) > 0).length
  const detailPreview = [
    draft.details.personalityTraits.trim() ? `Personality Trait: ${draft.details.personalityTraits.trim()}` : null,
    draft.details.ideals.trim() ? `Ideal: ${draft.details.ideals.trim()}` : null,
    draft.details.bonds.trim() ? `Bond: ${draft.details.bonds.trim()}` : null,
    draft.details.flaws.trim() ? `Flaw: ${draft.details.flaws.trim()}` : null,
  ].filter((entry): entry is string => Boolean(entry))

  const validateForm = () => {
    const nextErrors: CharacterFormErrors = {}

    if (!draft.campaignId) {
      nextErrors.campaignId = 'Campaign is required'
    }
    if (!draft.name.trim()) {
      nextErrors.name = 'Character name is required'
    }
    if (!draft.alignment.trim()) {
      nextErrors.alignment = 'Alignment is required'
    }
    if (!draft.background.trim()) {
      nextErrors.background = 'Background is required'
    }
    if (!draft.raceId) {
      nextErrors.raceId = 'Race is required'
    }
    if (draft.classLevels.length === 0 || !draft.classLevels[0]?.classId) {
      nextErrors.classId = 'Initial class is required'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const commitCharacteristics = () => {
    const tokens = characteristicsInput
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    if (tokens.length === 0) {
      setCharacteristicsInput('')
      return
    }

    setDraft((current) => ({
      ...current,
      characteristics: [...current.characteristics, ...tokens.filter((token) => !current.characteristics.includes(token))],
    }))
    setCharacteristicsInput('')
  }

  const handleCharacteristicsKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitCharacteristics()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (characteristicsInput.trim()) {
      commitCharacteristics()
    }

    const pendingCharacteristics = characteristicsInput
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)

    const nextDraft = pendingCharacteristics.length
      ? {
          ...draft,
          characteristics: [...draft.characteristics, ...pendingCharacteristics.filter((token) => !draft.characteristics.includes(token))],
        }
      : draft

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await api.characters.create(buildCreateCharacterPayload(nextDraft))
      onSuccess(nextDraft.name.trim())
    } catch (error) {
      setSubmitError(getSubmitErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div className="page-toolbar">
        <button className="link-button" onClick={onCancel} type="button">
          ← Cancel
        </button>
      </div>

      <div className="create-character-page">
        <div className="create-character-card">
          <div className="create-character-hero">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Create Character</h2>
              <p className="create-character-lead">
                Shape the first pass of the sheet with class level, proficiencies, and roleplay hooks while staying inside the current backend contract.
              </p>
            </div>
            <div className="create-character-summary">
              <span>Level {totalLevel || 1}</span>
              <span>AC {armorClass}</span>
              <span>Speed {speed}</span>
            </div>
          </div>

          {isLoadingCatalog && <div className="campaign-section-message">Loading creation options...</div>}
          {!isLoadingCatalog && catalogError && <div className="error-message">{catalogError}</div>}

          {!isLoadingCatalog && !catalogError && (
            <form onSubmit={handleSubmit} noValidate>
              {submitError && <div className="error-message">{submitError}</div>}

              <div className="create-character-layout">
                <section className="create-character-panel">
                  <h3>Identity</h3>

                  <div className="form-group">
                    <label htmlFor="character-campaign">Campaign</label>
                    <select
                      id="character-campaign"
                      value={draft.campaignId ?? ''}
                      onChange={(event) => {
                        const campaignId = event.target.value ? Number(event.target.value) : null
                        setDraft((current) => ({ ...current, campaignId }))
                        setFieldErrors((current) => ({ ...current, campaignId: undefined }))
                      }}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.campaignId)}
                    >
                      <option value="">Select a campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                      ))}
                    </select>
                    {fieldErrors.campaignId && <p className="field-error">{fieldErrors.campaignId}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="character-campaign-code">Campaign Code (Coming Soon)</label>
                    <input
                      id="character-campaign-code"
                      type="text"
                      value={campaignCode}
                      onChange={(event) => setCampaignCode(event.target.value)}
                      placeholder="Reserved for invite-based joining"
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="character-name">Character Name</label>
                    <input
                      id="character-name"
                      type="text"
                      value={draft.name}
                      onChange={(event) => {
                        setDraft((current) => ({ ...current, name: event.target.value }))
                        setFieldErrors((current) => ({ ...current, name: undefined }))
                        setSubmitError(null)
                      }}
                      disabled={isSubmitting}
                      maxLength={100}
                      aria-invalid={Boolean(fieldErrors.name)}
                    />
                    {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
                  </div>

                  <div className="create-character-two-column">
                    <div className="form-group">
                      <label htmlFor="character-alignment">Alignment</label>
                      <input
                        id="character-alignment"
                        type="text"
                        value={draft.alignment}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, alignment: event.target.value }))
                          setFieldErrors((current) => ({ ...current, alignment: undefined }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.alignment)}
                      />
                      {fieldErrors.alignment && <p className="field-error">{fieldErrors.alignment}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-background">Background</label>
                      <input
                        id="character-background"
                        type="text"
                        value={draft.background}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, background: event.target.value }))
                          setFieldErrors((current) => ({ ...current, background: undefined }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.background)}
                      />
                      {fieldErrors.background && <p className="field-error">{fieldErrors.background}</p>}
                    </div>
                  </div>

                  <div className="create-character-two-column">
                    <div className="form-group">
                      <label htmlFor="character-race">Race</label>
                      <select
                        id="character-race"
                        value={draft.raceId ?? ''}
                        onChange={(event) => {
                          const raceId = event.target.value ? Number(event.target.value) : null
                          setDraft((current) => ({ ...current, raceId }))
                          setFieldErrors((current) => ({ ...current, raceId: undefined }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.raceId)}
                      >
                        <option value="">Select a race</option>
                        {races.map((race) => (
                          <option key={race.id} value={race.id}>{race.name}</option>
                        ))}
                      </select>
                      {fieldErrors.raceId && <p className="field-error">{fieldErrors.raceId}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-class">Class</label>
                      <select
                        id="character-class"
                        value={draft.classLevels[0]?.classId ?? ''}
                        onChange={(event) => {
                          const classId = event.target.value ? Number(event.target.value) : null
                          setDraft((current) => ({
                            ...current,
                            classLevels: classId ? [{ classId, level: current.classLevels[0]?.level ?? 1 }] : [],
                          }))
                          setFieldErrors((current) => ({ ...current, classId: undefined }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.classId)}
                      >
                        <option value="">Select a class</option>
                        {classes.map((dndClass) => (
                          <option key={dndClass.id} value={dndClass.id}>{dndClass.name}</option>
                        ))}
                      </select>
                      {fieldErrors.classId && <p className="field-error">{fieldErrors.classId}</p>}
                    </div>
                  </div>

                  <div className="create-character-two-column create-character-compact-stats">
                    <div className="form-group">
                      <label htmlFor="character-level">Level</label>
                      <input
                        id="character-level"
                        type="number"
                        min="1"
                        max="20"
                        value={draft.classLevels[0]?.level ?? 1}
                        onChange={(event) => {
                          const level = Math.min(20, Math.max(1, parseNumber(event.target.value, 1)))
                          setDraft((current) => ({
                            ...current,
                            classLevels: current.classLevels[0]
                              ? [{ classId: current.classLevels[0].classId, level }]
                              : current.classLevels,
                          }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting || draft.classLevels.length === 0}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-hp">Hit Points</label>
                      <input
                        id="character-hp"
                        type="number"
                        min="1"
                        value={draft.hp}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, hp: Math.max(1, parseNumber(event.target.value, 1)) }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-speed">Speed</label>
                      <input
                        id="character-speed"
                        type="number"
                        min="0"
                        value={speed}
                        onChange={(event) => {
                          const nextSpeed = Math.max(0, parseNumber(event.target.value, 30))
                          setDraft((current) => ({ ...current, velocities: [nextSpeed] }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-xp">XP</label>
                      <input
                        id="character-xp"
                        type="number"
                        min="0"
                        value={draft.xp}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, xp: Math.max(0, parseNumber(event.target.value, 0)) }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="character-proficiency">Proficiency Bonus</label>
                      <input
                        id="character-proficiency"
                        type="number"
                        min="1"
                        max="10"
                        value={draft.proficiency}
                        onChange={(event) => {
                          const nextBonus = Math.min(10, Math.max(1, parseNumber(event.target.value, 2)))
                          setDraft((current) => ({ ...current, proficiency: nextBonus }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </section>

                <section className="create-character-panel">
                  <h3>Ability Scores</h3>
                  <div className="create-character-ability-grid">
                    {abilityScoreOrder.map((ability) => (
                      <div key={ability} className="ability-draft-card">
                        <label htmlFor={`ability-${ability}`}>{ability}</label>
                        <input
                          id={`ability-${ability}`}
                          type="number"
                          min="1"
                          max="30"
                          value={draft.abilityScores[ability]}
                          onChange={(event) => {
                            const nextValue = Math.min(30, Math.max(1, parseNumber(event.target.value, DEFAULT_ABILITY_SCORES[ability])))
                            setDraft((current) => ({
                              ...current,
                              abilityScores: {
                                ...current.abilityScores,
                                [ability]: nextValue,
                              },
                            }))
                            setSubmitError(null)
                          }}
                          disabled={isSubmitting}
                        />
                        <span className="ability-draft-modifier">
                          Mod {Math.floor((draft.abilityScores[ability] - 10) / 2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="create-character-sheet-strip">
                    <div>
                      <span className="sheet-strip-label">Proficiency</span>
                      <strong>+{draft.proficiency}</strong>
                    </div>
                    <div>
                      <span className="sheet-strip-label">Initiative</span>
                      <strong>{initiative >= 0 ? `+${initiative}` : initiative}</strong>
                    </div>
                    <div>
                      <span className="sheet-strip-label">XP</span>
                      <strong>{draft.xp}</strong>
                    </div>
                  </div>

                  <div className="sheet-mini-grid">
                    <div className="sheet-mini-card">
                      <span className="sheet-strip-label">Saving Throws</span>
                      <strong>{selectedSavingThrowCount}</strong>
                    </div>
                    <div className="sheet-mini-card">
                      <span className="sheet-strip-label">Skill Selections</span>
                      <strong>{selectedSkillCount}</strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="character-characteristics">Characteristics</label>
                    <textarea
                      id="character-characteristics"
                      rows={3}
                      className="form-textarea"
                      value={characteristicsInput}
                      onChange={(event) => setCharacteristicsInput(event.target.value)}
                      onBlur={commitCharacteristics}
                      onKeyDown={handleCharacteristicsKeyDown}
                      placeholder="Press Enter to add traits such as Darkvision"
                      disabled={isSubmitting}
                    />
                    {draft.characteristics.length > 0 && (
                      <div className="characteristics-chip-list">
                        {draft.characteristics.map((entry) => (
                          <button
                            key={entry}
                            type="button"
                            className="characteristic-chip"
                            onClick={() => {
                              setDraft((current) => ({
                                ...current,
                                characteristics: current.characteristics.filter((characteristic) => characteristic !== entry),
                              }))
                            }}
                            disabled={isSubmitting}
                          >
                            {entry} x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <section className="create-character-subsection">
                    <h4>Saving Throws</h4>
                    <div className="create-character-saving-grid">
                      {savingThrowOrder.map((ability) => (
                        <label key={ability} className="toggle-card">
                          <input
                            type="checkbox"
                            checked={(draft.proficiencies[ability] ?? 0) > 0}
                            onChange={(event) => {
                              setDraft((current) => ({
                                ...current,
                                proficiencies: {
                                  ...current.proficiencies,
                                  [ability]: event.target.checked ? 1 : 0,
                                },
                              }))
                              setSubmitError(null)
                            }}
                            disabled={isSubmitting}
                            aria-label={`${ability} saving throw`}
                          />
                          <span>{ability}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="create-character-subsection">
                    <h4>Skill Proficiencies</h4>
                    <div className="create-character-skill-groups">
                      {skillGroups.map((group) => (
                        <div key={group.ability} className="skill-group-card">
                          <span className="sheet-strip-label">{group.ability}</span>
                          <div className="skill-group-list">
                            {group.skills.map((skill) => (
                              <div key={skill} className="skill-select-row">
                                <label htmlFor={`skill-${skill}`}>{skill}</label>
                                <select
                                  id={`skill-${skill}`}
                                  aria-label={
                                    draft.proficiencies[skill] === 2 ? `${skill} expertise` : skill
                                  }
                                  value={draft.proficiencies[skill] ?? 0}
                                  onChange={(event) => {
                                    const nextValue = Number(event.target.value)
                                    setDraft((current) => ({
                                      ...current,
                                      proficiencies: {
                                        ...current.proficiencies,
                                        [skill]: nextValue,
                                      },
                                    }))
                                    setSubmitError(null)
                                  }}
                                  disabled={isSubmitting}
                                >
                                  {skillProficiencyOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="create-character-subsection">
                    <h4>Roleplay Details</h4>
                    <div className="create-character-details-grid">
                      <div className="form-group">
                        <label htmlFor="character-personality-traits">Personality Traits</label>
                        <textarea
                          id="character-personality-traits"
                          rows={2}
                          className="form-textarea"
                          value={draft.details.personalityTraits}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              details: { ...current.details, personalityTraits: event.target.value },
                            }))
                            setSubmitError(null)
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="character-ideals">Ideals</label>
                        <textarea
                          id="character-ideals"
                          rows={2}
                          className="form-textarea"
                          value={draft.details.ideals}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              details: { ...current.details, ideals: event.target.value },
                            }))
                            setSubmitError(null)
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="character-bonds">Bonds</label>
                        <textarea
                          id="character-bonds"
                          rows={2}
                          className="form-textarea"
                          value={draft.details.bonds}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              details: { ...current.details, bonds: event.target.value },
                            }))
                            setSubmitError(null)
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="character-flaws">Flaws</label>
                        <textarea
                          id="character-flaws"
                          rows={2}
                          className="form-textarea"
                          value={draft.details.flaws}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              details: { ...current.details, flaws: event.target.value },
                            }))
                            setSubmitError(null)
                          }}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </section>
                </section>

                <aside className="create-character-panel create-character-sidebar">
                  <h3>Sheet Snapshot</h3>
                  <div className="sheet-preview-block">
                    <span className="sheet-preview-label">Selected Campaign</span>
                    <strong>{selections.selectedCampaign?.name ?? 'Choose a campaign'}</strong>
                  </div>
                  <div className="sheet-preview-block">
                    <span className="sheet-preview-label">Race Notes</span>
                    <strong>{selections.selectedRace?.name ?? 'Choose a race'}</strong>
                    <p>{selections.selectedRace?.description ?? 'Racial description will appear here.'}</p>
                    {selections.selectedRace?.racialFeats?.length ? (
                      <ul>
                        {selections.selectedRace.racialFeats.map((feat) => (
                          <li key={feat}>{feat}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="sheet-preview-block">
                    <span className="sheet-preview-label">Class Features</span>
                    {selections.selectedClasses.length === 0 ? (
                      <p>Select an initial class to preview level one features.</p>
                    ) : (
                      selections.selectedClasses.map((selectedClass) => (
                        <div key={selectedClass.id} className="sheet-preview-feature-group">
                          <strong>{selectedClass.name}</strong>
                          <p>{selectedClass.description}</p>
                          <ul>
                            {Object.entries(selectedClass.levelCharacteristics)
                              .filter(([level]) => Number(level) <= selectedClass.level)
                              .map(([level, feature]) => (
                                <li key={`${selectedClass.id}-${level}`}>{feature}</li>
                              ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="sheet-preview-block">
                    <span className="sheet-preview-label">Prepared Training</span>
                    <strong>{selectedSkillCount} skill selections</strong>
                    <p>{selectedSavingThrowCount} saving throw{selectedSavingThrowCount === 1 ? '' : 's'}</p>
                  </div>
                  <div className="sheet-preview-block">
                    <span className="sheet-preview-label">Roleplay Notes</span>
                    {detailPreview.length > 0 ? (
                      <ul>
                        {detailPreview.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Add traits, ideals, bonds, or flaws to preview them here.</p>
                    )}
                  </div>
                  <div className="sheet-preview-block sheet-preview-block-muted">
                    <span className="sheet-preview-label">Still Pending</span>
                    <p>Equipment, spell lists, currencies, and other sheet sections still need backend-backed persistence before they can join this form safely.</p>
                  </div>
                </aside>
              </div>

              <div className="form-actions">
                <button type="button" className="logout-button" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="login-button form-submit-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Character'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
