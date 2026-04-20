import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import '../App.css'
import type {
  AbilityScoreName,
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
  deriveProficiencyFromLevel,
  deriveSavingThrowDefaults,
  deriveXpFromClassLevels,
  resolveDrivingClass,
} from '../utils/characterDraft'
import { CANONICAL_ALIGNMENTS as canonicalAlignments } from '../interfaces/character'

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

const skillGroups: Array<{ ability: AbilityScoreName; skills: string[] }> = [
  { ability: 'Strength', skills: ['Athletics'] },
  { ability: 'Dexterity', skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'] },
  { ability: 'Intelligence', skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'] },
  { ability: 'Wisdom', skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'] },
  { ability: 'Charisma', skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'] },
]

const MIN_CLASS_LEVEL = 1
const MAX_CLASS_LEVEL = 20

function getFixedHpGainPerLevel(hitDice: number) {
  return Math.floor(hitDice / 2) + 1
}

function calculateAutoHp(draft: CharacterDraft, classes: CharacterCatalogClassOption[]) {
  const classById = new Map(classes.map((entry) => [entry.id, entry]))
  const selectedRows = draft.classLevels.filter((entry) => hasSelectedClass(entry) && isAllowedClassLevel(entry.level))

  if (selectedRows.length === 0) {
    return null
  }

  const constitutionModifier = Math.floor((draft.abilityScores.Constitution - 10) / 2)
  let totalHp = 0

  selectedRows.forEach((entry, index) => {
    const classData = classById.get(entry.classId)

    if (!classData?.hitDice) {
      return
    }

    const levelCount = Math.max(1, Math.trunc(entry.level))
    const perLevelGain = Math.max(1, getFixedHpGainPerLevel(classData.hitDice) + constitutionModifier)

    if (index === 0) {
      totalHp += Math.max(1, classData.hitDice + constitutionModifier)

      if (levelCount > 1) {
        totalHp += (levelCount - 1) * perLevelGain
      }

      return
    }

    totalHp += levelCount * perLevelGain
  })

  return Math.max(1, totalHp)
}

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
  const [campaignCodeError, setCampaignCodeError] = useState<string | null>(null)
  const [campaignCodeStatus, setCampaignCodeStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle')
  const [resolvedCampaignName, setResolvedCampaignName] = useState<string | null>(null)
  const campaignCodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [characteristicsInput, setCharacteristicsInput] = useState('')
  const [races, setRaces] = useState<CharacterCatalogRaceOption[]>([])
  const [classes, setClasses] = useState<CharacterCatalogClassOption[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CharacterFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoCalculateHp, setAutoCalculateHp] = useState(false)
  const [lastAutoSavingThrowsKey, setLastAutoSavingThrowsKey] = useState<string | null>(null)
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [portraitError, setPortraitError] = useState<string | null>(null)

  const isEditMode = mode === 'edit'
  const isMulticlassEdit = isEditMode && draft.classLevels.length > 1
  const canEditSingleClass = !isMulticlassEdit

  useEffect(() => {
    setDraft(getInitialDraft(currentUserId, mode, initialEditData))
    setCharacteristicsInput('')
    setFieldErrors({})
    setSubmitError(null)
    setAutoCalculateHp(false)
    setLastAutoSavingThrowsKey(null)
    setCampaignCode('')
    setCampaignCodeError(null)
    setCampaignCodeStatus('idle')
    setResolvedCampaignName(null)
  }, [currentUserId, initialEditData, mode])

  useEffect(() => {
    let isMounted = true

    const loadCatalogs = async () => {
      setIsLoadingCatalog(true)
      setCatalogError(null)

      try {
        const [loadedRaces, loadedClasses] = await Promise.all([
          api.races.findAll(),
          api.classes.findAll(),
        ])

        if (!isMounted) {
          return
        }

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

  const drivingClass = useMemo(() => resolveDrivingClass(draft.classLevels), [draft.classLevels])
  const derivedProficiency = useMemo(
    () => deriveProficiencyFromLevel(drivingClass?.level ?? 1),
    [drivingClass?.level],
  )
  const classSavingThrowDefaults = useMemo(
    () => deriveSavingThrowDefaults(draft.classLevels, classes),
    [classes, draft.classLevels],
  )
  const minXp = useMemo(
    () => (isEditMode ? 0 : deriveXpFromClassLevels(draft.classLevels)),
    [draft.classLevels, isEditMode],
  )
  const editClassNameById = useMemo(
    () => new Map((initialEditData?.classRows ?? []).map((row) => [row.classId, row.name ?? `Class ${row.classId}`])),
    [initialEditData],
  )

  const totalLevel = draft.classLevels.reduce((sum, entry) => sum + (Number.isFinite(entry.level) ? entry.level : 0), 0)
  const speed = draft.velocities[0] ?? 30
  const armorClass = 10 + Math.floor((draft.abilityScores.Dexterity - 10) / 2)
  useEffect(() => {
    if (draft.proficiency === derivedProficiency) {
      return
    }

    setDraft((current) => ({
      ...current,
      proficiency: derivedProficiency,
    }))
  }, [derivedProficiency, draft.proficiency])

  useEffect(() => {
    const primaryClass = draft.classLevels[0]
    const primaryClassName = primaryClass ? classes.find((entry) => entry.id === primaryClass.classId)?.name ?? 'unknown' : 'none'
    const primaryKey = primaryClass ? `${primaryClass.classId}:${primaryClass.level}:${primaryClassName}` : 'none'

    if (primaryKey === lastAutoSavingThrowsKey) {
      return
    }

    setDraft((current) => ({
      ...current,
      proficiencies: {
        ...current.proficiencies,
        ...classSavingThrowDefaults,
      },
    }))
    setLastAutoSavingThrowsKey(primaryKey)
  }, [classSavingThrowDefaults, classes, draft.classLevels, lastAutoSavingThrowsKey])

  useEffect(() => {
    if (isEditMode) {
      return
    }

    const minXp = deriveXpFromClassLevels(draft.classLevels)

    if (draft.xp >= minXp) {
      return
    }

    setDraft((current) => ({
      ...current,
      xp: minXp,
    }))
  }, [draft.classLevels, draft.xp, isEditMode])

  useEffect(() => {
    if (!autoCalculateHp) {
      return
    }

    const autoHp = calculateAutoHp(draft, classes)

    if (!autoHp || draft.hp === autoHp) {
      return
    }

    setDraft((current) => ({
      ...current,
      hp: autoHp,
    }))
  }, [autoCalculateHp, classes, draft])

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

  const handleCampaignCodeChange = (value: string) => {
    setCampaignCode(value)
    setCampaignCodeError(null)
    setResolvedCampaignName(null)
    setCampaignCodeStatus('idle')
    setDraft((current) => ({ ...current, campaignId: null }))
    setFieldErrors((current) => ({ ...current, campaignId: undefined }))

    if (campaignCodeDebounceRef.current) {
      clearTimeout(campaignCodeDebounceRef.current)
    }

    const trimmed = value.trim().toUpperCase()
    if (!trimmed) return

    setCampaignCodeStatus('loading')
    campaignCodeDebounceRef.current = setTimeout(async () => {
      try {
        const campaign = await api.campaigns.findByCode(trimmed)
        if (campaign) {
          setCampaignCodeStatus('valid')
          setResolvedCampaignName(campaign.name)
          setCampaignCodeError(null)
          setDraft((current) => ({ ...current, campaignId: campaign.id }))
        } else {
          setCampaignCodeStatus('invalid')
          setCampaignCodeError('Campaign code not found. Check the code with your DM.')
        }
      } catch {
        setCampaignCodeStatus('invalid')
        setCampaignCodeError('Could not validate campaign code. Try again.')
      }
    }, 600)
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
    } else if (!canonicalAlignments.includes(nextDraft.alignment.trim() as (typeof canonicalAlignments)[number])) {
      nextErrors.alignment = 'Alignment must be a canonical D&D alignment'
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

  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_PORTRAIT_SIZE = 5 * 1024 * 1024 // 5 MB

  const handlePortraitFile = (file: File) => {
    setPortraitError(null)
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setPortraitError('Only JPEG, PNG, WebP, and GIF images are accepted.')
      return
    }
    if (file.size > MAX_PORTRAIT_SIZE) {
      setPortraitError('Image must be under 5 MB.')
      return
    }
    if (portraitPreview) {
      URL.revokeObjectURL(portraitPreview)
    }
    setPortraitFile(file)
    setPortraitPreview(URL.createObjectURL(file))
  }

  const handlePortraitDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handlePortraitDragLeave = () => {
    setIsDragOver(false)
  }

  const handlePortraitDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files[0]
    if (file) handlePortraitFile(file)
  }

  const handlePortraitInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handlePortraitFile(file)
  }

  const handleRemovePortrait = () => {
    if (portraitPreview) URL.revokeObjectURL(portraitPreview)
    setPortraitFile(null)
    setPortraitPreview(null)
    setPortraitError(null)
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

    const draftWithCharacteristics = pendingCharacteristics.length
      ? {
          ...draft,
          characteristics: [...draft.characteristics, ...pendingCharacteristics.filter((token) => !draft.characteristics.includes(token))],
        }
      : draft

    const nextDraft = !isEditMode
      ? {
          ...draftWithCharacteristics,
          xp: Math.max(draftWithCharacteristics.xp, deriveXpFromClassLevels(draftWithCharacteristics.classLevels)),
        }
      : draftWithCharacteristics

    if (!validateForm(nextDraft)) {
      return
    }

    setIsSubmitting(true)

    try {
      if (!isEditMode) {
        const createdCharacter = await api.characters.create(buildCreateCharacterPayload(nextDraft))
        if (portraitFile && createdCharacter.id) {
          try {
            await api.characters.uploadPortrait(createdCharacter.id, portraitFile)
          } catch {
            // Portrait upload failure is non-fatal — character was created successfully
          }
        }
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
        <h1 onClick={onCancel} style={{ cursor: 'pointer' }}>D&D Manager</h1>
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
                    <label htmlFor="character-campaign-code">Campaign Code</label>
                    <input
                      id="character-campaign-code"
                      type="text"
                      value={campaignCode}
                      onChange={(event) => handleCampaignCodeChange(event.target.value)}
                      placeholder="Ask your DM for the code — e.g. A3F9-B72C"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.campaignId) || campaignCodeStatus === 'invalid'}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {campaignCodeStatus === 'loading' && (
                      <p className="field-hint">Validating code...</p>
                    )}
                    {campaignCodeStatus === 'valid' && resolvedCampaignName && (
                      <p className="field-success">✓ Campaign: <strong>{resolvedCampaignName}</strong></p>
                    )}
                    {campaignCodeStatus === 'invalid' && campaignCodeError && (
                      <p className="field-error">{campaignCodeError}</p>
                    )}
                    {fieldErrors.campaignId && campaignCodeStatus === 'idle' && (
                      <p className="field-error">{fieldErrors.campaignId}</p>
                    )}
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
                      <select
                        id="character-alignment"
                        value={draft.alignment}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, alignment: event.target.value }))
                          setFieldErrors((current) => ({ ...current, alignment: undefined }))
                          setSubmitError(null)
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors.alignment)}
                      >
                        <option value="">Select alignment</option>
                        {canonicalAlignments.map((alignment) => (
                          <option key={alignment} value={alignment}>{alignment}</option>
                        ))}
                      </select>
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

                  {/* Portrait upload — optional */}
                  {!isEditMode && (
                    <div className="form-group">
                      <label>Portrait <span style={{ fontWeight: 400, color: 'var(--color-foreground-muted)' }}>(optional)</span></label>
                      <div
                        onDragOver={handlePortraitDragOver}
                        onDragLeave={handlePortraitDragLeave}
                        onDrop={handlePortraitDrop}
                        onClick={() => !portraitPreview && document.getElementById('portrait-file-input')?.click()}
                        style={{
                          border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          textAlign: 'center',
                          cursor: portraitPreview ? 'default' : 'pointer',
                          background: isDragOver ? 'var(--color-surface)' : 'transparent',
                          transition: 'border-color 0.2s, background 0.2s',
                          minHeight: '8rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        {portraitPreview ? (
                          <>
                            <img
                              src={portraitPreview}
                              alt="Portrait preview"
                              style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '0.25rem', objectFit: 'cover' }}
                            />
                            <button
                              type="button"
                              className="link-button"
                              onClick={(e) => { e.stopPropagation(); handleRemovePortrait() }}
                              style={{ fontSize: '0.8rem' }}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '2rem' }}>🖼️</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
                              Drag & drop or click to select
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                              JPEG, PNG, WebP, GIF · max 5 MB
                            </span>
                          </>
                        )}
                      </div>
                      <input
                        id="portrait-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={handlePortraitInputChange}
                      />
                      {portraitError && <p className="field-error">{portraitError}</p>}
                    </div>
                  )}

                  <section className="create-character-subsection">
                    <h4>{isEditMode ? 'Level For Class' : 'Class'}</h4>
                    {isMulticlassEdit && <p className="section-subtitle">Multiclass rows are locked during editing.</p>}
                    {isMulticlassEdit ? (
                      <div className="create-character-skill-groups">
                        {draft.classLevels.map((entry, index) => (
                          <div key={`${entry.classId}-${index}`} className="skill-group-card">
                            <div className="create-character-two-column create-character-class-row">
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
                            <div className="create-character-two-column create-character-class-row">
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
                              <div className="create-character-two-column create-character-class-row">
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
                        disabled={isSubmitting || autoCalculateHp}
                      />
                      <label className="create-character-inline-checkbox" htmlFor="character-hp-auto">
                        <input
                          id="character-hp-auto"
                          type="checkbox"
                          checked={autoCalculateHp}
                          onChange={(event) => {
                            const nextChecked = event.target.checked
                            setAutoCalculateHp(nextChecked)

                            if (nextChecked) {
                              const autoHp = calculateAutoHp(draft, classes)

                              if (autoHp) {
                                setDraft((current) => ({
                                  ...current,
                                  hp: autoHp,
                                }))
                              }
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <span>Auto-calculate (D&D fixed HP average)</span>
                      </label>
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
                        min={minXp}
                        value={draft.xp}
                        onChange={(event) => {
                          setDraft((current) => ({ ...current, xp: Math.max(minXp, parseNumber(event.target.value, minXp)) }))
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
                        max="6"
                        value={draft.proficiency}
                        disabled
                        readOnly
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
                          max="20"
                          value={draft.abilityScores[ability]}
                          onChange={(event) => {
                            const nextValue = Math.min(20, Math.max(1, parseNumber(event.target.value, DEFAULT_ABILITY_SCORES[ability])))
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
                        <label htmlFor={`saving-${ability}`} className="ability-save-row">
                          <input
                            id={`saving-${ability}`}
                            type="checkbox"
                            aria-label={`${ability} saving throw`}
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
                          />
                          <span>Saving Throw Proficiency</span>
                          {classSavingThrowDefaults[ability] > 0 && (
                            <span className="ability-save-granted">Class</span>
                          )}
                        </label>
                      </div>
                    ))}
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

              </div>

              <section className="create-character-panel create-character-panel-wide">
                <h3>Skill Proficiencies</h3>
                <div className="create-character-skill-groups">
                  {skillGroups.map((group) => (
                    <div
                      key={group.ability}
                      className={`skill-group-card ${group.ability === 'Charisma' ? 'skill-group-card-centered' : ''}`}
                    >
                      <span className="sheet-strip-label">{group.ability}</span>
                      <div className="skill-group-list">
                        {group.skills.map((skill) => (
                          <div key={skill} className="skill-select-row">
                            <label htmlFor={`skill-${skill}-proficient`}>{skill}</label>
                            <div className="skill-checkbox-grid">
                              <label htmlFor={`skill-${skill}-proficient`} className="skill-checkbox-inline">
                                <input
                                  id={`skill-${skill}-proficient`}
                                  type="checkbox"
                                  checked={(draft.proficiencies[skill] ?? 0) > 0}
                                  onChange={(event) => {
                                    const isChecked = event.target.checked
                                    setDraft((current) => {
                                      const currentValue = current.proficiencies[skill] ?? 0
                                      return {
                                        ...current,
                                        proficiencies: {
                                          ...current.proficiencies,
                                          [skill]: isChecked ? (currentValue === 2 ? 2 : 1) : 0,
                                        },
                                      }
                                    })
                                    setSubmitError(null)
                                  }}
                                  disabled={isSubmitting}
                                />
                                <span>Proficiency</span>
                              </label>

                              {(draft.proficiencies[skill] ?? 0) > 0 && (
                                <label htmlFor={`skill-${skill}-expertise`} className="skill-checkbox-inline">
                                  <input
                                    id={`skill-${skill}-expertise`}
                                    type="checkbox"
                                    checked={(draft.proficiencies[skill] ?? 0) === 2}
                                    onChange={(event) => {
                                      const isChecked = event.target.checked
                                      setDraft((current) => ({
                                        ...current,
                                        proficiencies: {
                                          ...current.proficiencies,
                                          [skill]: isChecked ? 2 : 1,
                                        },
                                      }))
                                      setSubmitError(null)
                                    }}
                                    disabled={isSubmitting}
                                  />
                                  <span>Expertise</span>
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

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
