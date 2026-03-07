import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import '../App.css'
import type {
  AbilityScoreName,
  CharacterCatalogCampaignOption,
  CharacterCatalogClassOption,
  CharacterCatalogRaceOption,
  CharacterDraft,
  CharacterUpdatePlan,
  HydratedCharacterEditData,
  InitialCharacterClassLevel,
} from '../interfaces/character'
import { api } from '../services/api'
import {
  buildCharacterUpdatePlan,
  buildCreateCharacterPayload,
  createCharacterDraft,
  DEFAULT_ABILITY_SCORES,
  getCharacterCatalogSelections,
} from '../utils/characterDraft'

interface CreateCharacterProps {
  currentUserId: number
  mode?: 'create' | 'edit'
  initialEditData?: HydratedCharacterEditData | null
  onCancel: () => void
  onLogout: () => void
  onSuccess: (result: { characterId?: number; characterName: string }) => void
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

const MIN_CLASS_LEVEL = 1
const MAX_CLASS_LEVEL = 20

function createEmptyClassRow(): InitialCharacterClassLevel {
  return {
    classId: 0,
    level: 1,
  }
}

function hasSelectedClass(entry: InitialCharacterClassLevel | undefined) {
  return Boolean(entry && Number.isFinite(entry.classId) && entry.classId > 0)
}

function isAllowedClassLevel(level: number) {
  return Number.isFinite(level) && level >= MIN_CLASS_LEVEL && level <= MAX_CLASS_LEVEL
}

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

function getInitialDraft(currentUserId: number, mode: 'create' | 'edit', initialEditData: HydratedCharacterEditData | null) {
  if (mode === 'edit' && initialEditData) {
    return createCharacterDraft(initialEditData.draft)
  }

  return createCharacterDraft({ userId: currentUserId, classLevels: [createEmptyClassRow()] })
}

export function CreateCharacter({
  currentUserId,
  mode = 'create',
  initialEditData = null,
  onCancel,
  onLogout,
  onSuccess,
}: CreateCharacterProps) {
  const [draft, setDraft] = useState<CharacterDraft>(() => getInitialDraft(currentUserId, mode, initialEditData))
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

  const isEditMode = mode === 'edit'
  const isMulticlassEdit = isEditMode && draft.classLevels.length > 1
  const canEditSingleClass = !isMulticlassEdit

  useEffect(() => {
    setDraft(getInitialDraft(currentUserId, mode, initialEditData))
    setCharacteristicsInput('')
    setFieldErrors({})
    setSubmitError(null)
  }, [currentUserId, initialEditData, mode])

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
  const editClassNameById = useMemo(
    () => new Map((initialEditData?.classRows ?? []).map((row) => [row.classId, row.name ?? `Class ${row.classId}`])),
    [initialEditData],
  )

  const totalLevel = selections.selectedClasses.reduce((sum, entry) => sum + entry.level, 0)
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

  const pageTitle = isEditMode ? 'Edit Character' : 'Create Character'
  const pageLead = isEditMode
    ? 'Update the existing sheet values while keeping the current backend persistence flow and class-row contract intact.'
    : 'Shape the first pass of the sheet with class level, proficiencies, and roleplay hooks while staying inside the current backend contract.'
  const cancelLabel = isEditMode ? 'Back to Sheet' : 'Cancel'
  const submitLabel = isEditMode ? 'Save Changes' : 'Create Character'
  const submittingLabel = isEditMode ? 'Saving...' : 'Creating...'

  const primaryCreateRow = draft.classLevels[0] ?? createEmptyClassRow()
  const secondaryCreateRow = draft.classLevels[1]

  const updateCreateClassRows = (updater: (rows: InitialCharacterClassLevel[]) => InitialCharacterClassLevel[]) => {
    setDraft((current) => {
      const currentRows = [current.classLevels[0] ?? createEmptyClassRow()]

      if (current.classLevels[1]) {
        currentRows.push(current.classLevels[1])
      }

      return {
        ...current,
        classLevels: updater(currentRows),
      }
    })
  }

  const handleCreateClassChange = (index: number, classId: number) => {
    updateCreateClassRows((rows) => {
      const nextRows = [...rows]
      nextRows[index] = {
        ...(nextRows[index] ?? createEmptyClassRow()),
        classId,
      }

      return nextRows.slice(0, 2)
    })
    setFieldErrors((current) => ({ ...current, classId: undefined }))
    setSubmitError(null)
  }

  const handleCreateLevelChange = (index: number, value: string) => {
    const level = Math.min(MAX_CLASS_LEVEL, Math.max(MIN_CLASS_LEVEL, parseNumber(value, 1)))

    updateCreateClassRows((rows) => {
      const nextRows = [...rows]
      nextRows[index] = {
        ...(nextRows[index] ?? createEmptyClassRow()),
        level,
      }

      return nextRows.slice(0, 2)
    })
    setFieldErrors((current) => ({ ...current, classId: undefined }))
    setSubmitError(null)
  }

  const handleAddSecondaryClassRow = () => {
    updateCreateClassRows((rows) => (rows[1] ? rows : [rows[0] ?? createEmptyClassRow(), createEmptyClassRow()]))
    setFieldErrors((current) => ({ ...current, classId: undefined }))
    setSubmitError(null)
  }

  const handleRemoveSecondaryClassRow = () => {
    updateCreateClassRows((rows) => [rows[0] ?? createEmptyClassRow()])
    setFieldErrors((current) => ({ ...current, classId: undefined }))
    setSubmitError(null)
  }

  const validateForm = (nextDraft: CharacterDraft = draft) => {
    const nextErrors: CharacterFormErrors = {}
    const primaryClassRow = nextDraft.classLevels[0]
    const secondClassRow = nextDraft.classLevels[1]
    const hasPrimaryClass = hasSelectedClass(primaryClassRow)
    const hasSecondRow = secondClassRow !== undefined
    const hasSecondClass = hasSelectedClass(secondClassRow)
    const hasInvalidLevel = nextDraft.classLevels.some((entry) => !isAllowedClassLevel(entry.level))

    if (!nextDraft.campaignId) {
      nextErrors.campaignId = 'Campaign is required'
    }
    if (!nextDraft.name.trim()) {
      nextErrors.name = 'Character name is required'
    }
    if (!nextDraft.alignment.trim()) {
      nextErrors.alignment = 'Alignment is required'
    }
    if (!nextDraft.background.trim()) {
      nextErrors.background = 'Background is required'
    }
    if (!nextDraft.raceId) {
      nextErrors.raceId = 'Race is required'
    }
    if (!hasPrimaryClass) {
      nextErrors.classId = 'Primary class is required'
    } else if (hasInvalidLevel) {
      nextErrors.classId = 'Class levels must be between 1 and 20'
    } else if (hasSecondRow && !hasSecondClass) {
      nextErrors.classId = 'Secondary class row is incomplete'
    } else if (hasPrimaryClass && hasSecondClass && primaryClassRow?.classId === secondClassRow?.classId) {
      nextErrors.classId = 'Primary and secondary classes must be different'
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

    if (!validateForm(nextDraft)) {
      return
    }

    setIsSubmitting(true)

    try {
      if (!isEditMode) {
        const createdCharacter = await api.characters.create(buildCreateCharacterPayload(nextDraft))
        onSuccess({ characterId: createdCharacter.id, characterName: nextDraft.name.trim() })
        return
      }

      if (!initialEditData) {
        throw new Error('Character edit data is unavailable')
      }

      const plan: CharacterUpdatePlan = buildCharacterUpdatePlan(initialEditData, nextDraft)

      if (plan.characterPatch) {
        await api.characters.update(initialEditData.characterId, plan.characterPatch)
      }

      if (plan.statsPatch) {
        if (!initialEditData.statsId) {
          throw new Error('Character stats could not be updated because the stats record is missing')
        }

        await api.characterStats.update(initialEditData.statsId, plan.statsPatch)
      }

      for (const operation of plan.classOperations) {
        if (operation.type === 'create') {
          await api.levels.create(operation.payload)
        } else if (operation.type === 'update') {
          await api.levels.update(operation.characterId, operation.classId, operation.payload)
        } else if (operation.type === 'delete') {
          await api.levels.remove(operation.characterId, operation.classId)
        }
      }

      onSuccess({
        characterId: initialEditData.characterId,
        characterName: nextDraft.name.trim(),
      })
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
          ← {cancelLabel}
        </button>
      </div>

      <div className="create-character-page">
        <div className="create-character-card">
          <div className="create-character-hero">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{pageTitle}</h2>
              <p className="create-character-lead">{pageLead}</p>
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
                  </div>

                  <section className="create-character-subsection">
                    <h4>{isEditMode ? 'Class Progression' : 'Class'}</h4>
                    {isMulticlassEdit && <p className="section-subtitle">Multiclass rows are locked during editing.</p>}
                    {isMulticlassEdit ? (
                      <div className="create-character-skill-groups">
                        {draft.classLevels.map((entry, index) => (
                          <div key={`${entry.classId}-${index}`} className="skill-group-card">
                            <div className="create-character-two-column">
                              <div className="form-group">
                                <label htmlFor={`character-class-${index}`}>Class</label>
                                <input
                                  id={`character-class-${index}`}
                                  type="text"
                                  value={classes.find((dndClass) => dndClass.id === entry.classId)?.name ?? editClassNameById.get(entry.classId) ?? `Class ${entry.classId}`}
                                  disabled
                                />
                              </div>
                              <div className="form-group">
                                <label htmlFor={`character-level-${index}`}>Level</label>
                                <input id={`character-level-${index}`} type="number" value={entry.level} disabled />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="create-character-skill-groups">
                          <div className="skill-group-card">
                            <div className="create-character-two-column">
                              <div className="form-group">
                                <label htmlFor="character-class">{isEditMode ? 'Class' : 'Primary Class'}</label>
                                <select
                                  id="character-class"
                                  value={primaryCreateRow.classId > 0 ? primaryCreateRow.classId : ''}
                                  onChange={(event) => {
                                    if (isEditMode) {
                                      const classId = event.target.value ? Number(event.target.value) : 0
                                      setDraft((current) => ({
                                        ...current,
                                        classLevels: [{
                                          classId,
                                          level: current.classLevels[0]?.level ?? 1,
                                        }],
                                      }))
                                      setFieldErrors((current) => ({ ...current, classId: undefined }))
                                      setSubmitError(null)
                                      return
                                    }

                                    handleCreateClassChange(0, event.target.value ? Number(event.target.value) : 0)
                                  }}
                                  disabled={isSubmitting || !canEditSingleClass}
                                  aria-invalid={Boolean(fieldErrors.classId)}
                                >
                                  <option value="">Select a class</option>
                                  {classes.map((dndClass) => (
                                    <option key={dndClass.id} value={dndClass.id}>{dndClass.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label htmlFor="character-level">{isEditMode ? 'Level' : 'Primary Level'}</label>
                                <input
                                  id="character-level"
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={primaryCreateRow.level}
                                  onChange={(event) => {
                                    if (isEditMode) {
                                      const level = Math.min(MAX_CLASS_LEVEL, Math.max(MIN_CLASS_LEVEL, parseNumber(event.target.value, 1)))
                                      setDraft((current) => ({
                                        ...current,
                                        classLevels: current.classLevels[0]
                                          ? [{ classId: current.classLevels[0].classId, level }]
                                          : current.classLevels,
                                      }))
                                      setSubmitError(null)
                                      return
                                    }

                                    handleCreateLevelChange(0, event.target.value)
                                  }}
                                  disabled={isSubmitting || !canEditSingleClass}
                                />
                              </div>
                            </div>
                          </div>

                          {!isEditMode && secondaryCreateRow ? (
                            <div className="skill-group-card">
                              <div className="create-character-two-column">
                                <div className="form-group">
                                  <label htmlFor="character-secondary-class">Secondary Class</label>
                                  <select
                                    id="character-secondary-class"
                                    value={secondaryCreateRow.classId > 0 ? secondaryCreateRow.classId : ''}
                                    onChange={(event) => handleCreateClassChange(1, event.target.value ? Number(event.target.value) : 0)}
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(fieldErrors.classId)}
                                  >
                                    <option value="">Select a class</option>
                                    {classes.map((dndClass) => (
                                      <option key={dndClass.id} value={dndClass.id}>{dndClass.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="form-group">
                                  <label htmlFor="character-secondary-level">Secondary Level</label>
                                  <input
                                    id="character-secondary-level"
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={secondaryCreateRow.level}
                                    onChange={(event) => handleCreateLevelChange(1, event.target.value)}
                                    disabled={isSubmitting}
                                  />
                                </div>
                              </div>
                              <button type="button" className="link-button" onClick={handleRemoveSecondaryClassRow} disabled={isSubmitting}>
                                Remove Secondary Class
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {!isEditMode && !secondaryCreateRow ? (
                          <button type="button" className="link-button" onClick={handleAddSecondaryClassRow} disabled={isSubmitting}>
                            Add Secondary Class
                          </button>
                        ) : null}

                        {fieldErrors.classId && <p className="field-error">{fieldErrors.classId}</p>}
                      </>
                    )}
                  </section>

                  <div className="create-character-two-column create-character-compact-stats">
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
                                  aria-label={draft.proficiencies[skill] === 2 ? `${skill} expertise` : skill}
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
                      <p>Select a primary class to preview the submitted class split.</p>
                    ) : (
                      <>
                        <strong>Total Level {totalLevel}</strong>
                        {selections.selectedClasses.map((selectedClass, index) => (
                          <div key={`${selectedClass.id}-${index}`} className="sheet-preview-feature-group">
                            <strong>{selectedClass.name} - Level {selectedClass.level}</strong>
                            <p>{selectedClass.description}</p>
                            <ul>
                              {Object.entries(selectedClass.levelCharacteristics)
                                .filter(([level]) => Number(level) <= selectedClass.level)
                                .map(([level, feature]) => (
                                  <li key={`${selectedClass.id}-${level}`}>{feature}</li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </>
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
                  {cancelLabel}
                </button>
                <button type="submit" className="login-button form-submit-button" disabled={isSubmitting}>
                  {isSubmitting ? submittingLabel : submitLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
