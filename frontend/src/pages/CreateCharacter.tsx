import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
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
  /** Pre-filled campaign join code (e.g. from the home screen's "Join a table" flow). */
  initialCampaignCode?: string | null
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
  initialCampaignCode = null,
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
    setCampaignCode(initialCampaignCode ?? '')
    setCampaignCodeError(null)
    setCampaignCodeStatus('idle')
    setResolvedCampaignName(null)
  }, [currentUserId, initialEditData, mode, initialCampaignCode])

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

  useEffect(() => {
    if (initialCampaignCode) {
      handleCampaignCodeChange(initialCampaignCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCampaignCode])

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

  const selectBase = 'w-full rounded-home-md border bg-home-well px-[10px] py-[5px] text-[12.5px] text-home-muted disabled:opacity-50'
  const selectBorder = (invalid: boolean) => (invalid ? 'border-home-danger' : 'border-home-border-mid')

  return (
    <div className="min-h-screen bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
        <h1
          onClick={onCancel}
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

      <div className="px-[26px] py-[16px]">
        <button
          className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
          onClick={onCancel}
          type="button"
        >
          ← {cancelLabel}
        </button>
      </div>

      <div className="px-[26px] pb-[28px]">
        <div className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
          <div className="mb-[16px] flex flex-wrap items-center justify-between gap-[12px]">
            <div>
              <h2 className="font-home-display text-[20px] font-semibold leading-[1.15] tracking-[-.01em] text-home-text-strong">
                {pageTitle}
              </h2>
              <p className="mt-[8px] text-[12.5px] leading-[1.5] text-home-muted">{pageLead}</p>
            </div>
            <div className="flex items-center gap-[8px]">
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                Level {totalLevel || 1}
              </span>
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                AC {armorClass}
              </span>
              <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">
                Speed {speed}
              </span>
            </div>
          </div>

          {isLoadingCatalog && <div className="text-[12.5px] text-home-dim">Loading creation options...</div>}
          {!isLoadingCatalog && catalogError && (
            <div className="rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
              {catalogError}
            </div>
          )}

          {!isLoadingCatalog && !catalogError && (
            <form data-testid="create-character-form" onSubmit={handleSubmit} noValidate>
              {submitError && (
                <div data-testid="create-character-error" className="mb-[16px] rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2">
                <section className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                  <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                    Identity
                  </h3>

                  <div className="mb-[14px]">
                    <label
                      htmlFor="character-campaign-code"
                      className="mb-[10px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2"
                    >
                      Campaign Code
                    </label>
                    <Input
                      id="character-campaign-code"
                      type="text"
                      value={campaignCode}
                      onChange={(event) => handleCampaignCodeChange(event.target.value)}
                      placeholder="Ask your DM for the code — e.g. A3F9-B72C"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.campaignId) || campaignCodeStatus === 'invalid'}
                      invalid={Boolean(fieldErrors.campaignId) || campaignCodeStatus === 'invalid'}
                      className="uppercase"
                    />
                    {campaignCodeStatus === 'loading' && (
                      <p className="mt-[5px] block text-[11.5px] text-home-dim">Validating code...</p>
                    )}
                    {campaignCodeStatus === 'valid' && resolvedCampaignName && (
                      <p data-testid="character-campaign-code-valid" className="mt-[5px] block text-[11.5px] text-[#22c55e]">✓ Campaign: <strong>{resolvedCampaignName}</strong></p>
                    )}
                    {campaignCodeStatus === 'invalid' && campaignCodeError && (
                      <p className="mt-[5px] block text-[11.5px] text-home-danger">{campaignCodeError}</p>
                    )}
                    {fieldErrors.campaignId && campaignCodeStatus === 'idle' && (
                      <p className="mt-[5px] block text-[11.5px] text-home-danger">{fieldErrors.campaignId}</p>
                    )}
                  </div>

                  <FormField id="character-name" label="Character Name" error={fieldErrors.name}>
                    <Input
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
                      invalid={Boolean(fieldErrors.name)}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                    <FormField id="character-alignment" label="Alignment" error={fieldErrors.alignment}>
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
                        className={`${selectBase} ${selectBorder(Boolean(fieldErrors.alignment))}`}
                      >
                        <option value="">Select alignment</option>
                        {canonicalAlignments.map((alignment) => (
                          <option key={alignment} value={alignment}>{alignment}</option>
                        ))}
                      </select>
                    </FormField>

                    <FormField id="character-background" label="Background" error={fieldErrors.background}>
                      <Input
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
                        invalid={Boolean(fieldErrors.background)}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                    <FormField id="character-race" label="Race" error={fieldErrors.raceId}>
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
                        className={`${selectBase} ${selectBorder(Boolean(fieldErrors.raceId))}`}
                      >
                        <option value="">Select a race</option>
                        {races.map((race) => (
                          <option key={race.id} value={race.id}>{race.name}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  {/* Portrait upload — optional */}
                  {!isEditMode && (
                    <div className="mb-[14px]">
                      <label className="mb-[10px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">
                        Portrait <span className="font-normal normal-case tracking-normal text-home-dim">(optional)</span>
                      </label>
                      <div
                        onDragOver={handlePortraitDragOver}
                        onDragLeave={handlePortraitDragLeave}
                        onDrop={handlePortraitDrop}
                        onClick={() => !portraitPreview && document.getElementById('portrait-file-input')?.click()}
                        className={
                          isDragOver
                            ? 'flex min-h-[128px] flex-col items-center justify-center gap-[8px] rounded-home-lg border-2 border-dashed border-home-border-acc bg-home-surface p-[16px] text-center transition-colors duration-150'
                            : 'flex min-h-[128px] flex-col items-center justify-center gap-[8px] rounded-home-lg border-2 border-dashed border-home-border-mid bg-transparent p-[16px] text-center transition-colors duration-150'
                        }
                        style={{ cursor: portraitPreview ? 'default' : 'pointer' }}
                      >
                        {portraitPreview ? (
                          <>
                            <img
                              src={portraitPreview}
                              alt="Portrait preview"
                              className="max-h-[120px] max-w-[120px] rounded-home-sm object-cover"
                            />
                            <button
                              type="button"
                              className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
                              onClick={(e) => { e.stopPropagation(); handleRemovePortrait() }}
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[32px]">🖼️</span>
                            <span className="text-[12.5px] text-home-dim">
                              Drag & drop or click to select
                            </span>
                            <span className="text-[11.5px] text-home-dim">
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
                      {portraitError && <p className="mt-[5px] block text-[11.5px] text-home-danger">{portraitError}</p>}
                    </div>
                  )}

                  <section className="mb-[14px]">
                    <h4 className="mb-[10px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                      {isEditMode ? 'Level For Class' : 'Class'}
                    </h4>
                    {isMulticlassEdit && (
                      <p className="mt-[6px] mb-[10px] text-[13px] text-home-muted">Multiclass rows are locked during editing.</p>
                    )}
                    {isMulticlassEdit ? (
                      <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3">
                        {draft.classLevels.map((entry, index) => (
                          <div key={`${entry.classId}-${index}`} className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                              <FormField id={`character-class-${index}`} label="Class">
                                <Input
                                  id={`character-class-${index}`}
                                  type="text"
                                  value={classes.find((dndClass) => dndClass.id === entry.classId)?.name ?? editClassNameById.get(entry.classId) ?? `Class ${entry.classId}`}
                                  disabled
                                />
                              </FormField>
                              <FormField id={`character-level-${index}`} label="Level">
                                <Input id={`character-level-${index}`} type="number" value={entry.level} disabled />
                              </FormField>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                              <FormField id="character-class" label={isEditMode ? 'Class' : 'Primary Class'}>
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
                                  className={`${selectBase} ${selectBorder(Boolean(fieldErrors.classId))}`}
                                >
                                  <option value="">Select a class</option>
                                  {classes.map((dndClass) => (
                                    <option key={dndClass.id} value={dndClass.id}>{dndClass.name}</option>
                                  ))}
                                </select>
                              </FormField>

                              <FormField id="character-level" label={isEditMode ? 'Level' : 'Primary Level'}>
                                <Input
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
                              </FormField>
                            </div>
                          </div>

                          {!isEditMode && secondaryCreateRow ? (
                            <div className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                              <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                                <FormField id="character-secondary-class" label="Secondary Class">
                                  <select
                                    id="character-secondary-class"
                                    value={secondaryCreateRow.classId > 0 ? secondaryCreateRow.classId : ''}
                                    onChange={(event) => handleCreateClassChange(1, event.target.value ? Number(event.target.value) : 0)}
                                    disabled={isSubmitting}
                                    aria-invalid={Boolean(fieldErrors.classId)}
                                    className={`${selectBase} ${selectBorder(Boolean(fieldErrors.classId))}`}
                                  >
                                    <option value="">Select a class</option>
                                    {classes.map((dndClass) => (
                                      <option key={dndClass.id} value={dndClass.id}>{dndClass.name}</option>
                                    ))}
                                  </select>
                                </FormField>

                                <FormField id="character-secondary-level" label="Secondary Level">
                                  <Input
                                    id="character-secondary-level"
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={secondaryCreateRow.level}
                                    onChange={(event) => handleCreateLevelChange(1, event.target.value)}
                                    disabled={isSubmitting}
                                  />
                                </FormField>
                              </div>
                              <button
                                type="button"
                                className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
                                onClick={handleRemoveSecondaryClassRow}
                                disabled={isSubmitting}
                              >
                                Remove Secondary Class
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {!isEditMode && !secondaryCreateRow ? (
                          <button
                            type="button"
                            className="mt-[10px] font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300"
                            onClick={handleAddSecondaryClassRow}
                            disabled={isSubmitting}
                          >
                            Add Secondary Class
                          </button>
                        ) : null}

                        {fieldErrors.classId && <p className="mt-[5px] block text-[11.5px] text-home-danger">{fieldErrors.classId}</p>}
                      </>
                    )}
                  </section>

                  <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-4">
                    <FormField id="character-hp" label="Hit Points">
                      <Input
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
                      <label className="mt-[8px] flex items-center gap-[8px] text-[11.5px] text-home-muted" htmlFor="character-hp-auto">
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
                          className="h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50"
                        />
                        <span>Auto-calculate (D&D fixed HP average)</span>
                      </label>
                    </FormField>

                    <FormField id="character-speed" label="Speed">
                      <Input
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
                    </FormField>

                    <FormField id="character-xp" label="XP">
                      <Input
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
                    </FormField>

                    <FormField id="character-proficiency" label="Proficiency Bonus">
                      <Input
                        id="character-proficiency"
                        type="number"
                        min="1"
                        max="6"
                        value={draft.proficiency}
                        disabled
                        readOnly
                      />
                    </FormField>
                  </div>
                </section>

                <section className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                  <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                    Ability Scores
                  </h3>
                  <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
                    {abilityScoreOrder.map((ability) => (
                      <div key={ability} className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                        <label
                          htmlFor={`ability-${ability}`}
                          className="mb-[10px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2"
                        >
                          {ability}
                        </label>
                        <Input
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
                        <span className="mt-[6px] block text-[11.5px] text-home-dim">
                          Mod {Math.floor((draft.abilityScores[ability] - 10) / 2)}
                        </span>
                        <label htmlFor={`saving-${ability}`} className="mt-[8px] flex items-center gap-[8px] text-[11.5px] text-home-muted">
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
                            className="h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50"
                          />
                          <span>Saving Throw Proficiency</span>
                          {classSavingThrowDefaults[ability] > 0 && (
                            <span className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]">Class</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>

                  <FormField id="character-characteristics" label="Characteristics">
                    <textarea
                      id="character-characteristics"
                      rows={3}
                      className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
                      value={characteristicsInput}
                      onChange={(event) => setCharacteristicsInput(event.target.value)}
                      onBlur={commitCharacteristics}
                      onKeyDown={handleCharacteristicsKeyDown}
                      placeholder="Press Enter to add traits such as Darkvision"
                      disabled={isSubmitting}
                    />
                    {draft.characteristics.length > 0 && (
                      <div className="mt-[10px] flex flex-wrap gap-[8px]">
                        {draft.characteristics.map((entry) => (
                          <button
                            key={entry}
                            type="button"
                            className="rounded-full bg-home-chip px-[7px] py-[2px] font-home-mono text-[10.5px] font-semibold text-[#8fb2ec]"
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
                  </FormField>

                  <section className="mb-[14px]">
                    <h4 className="mb-[10px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                      Roleplay Details
                    </h4>
                    <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
                      <FormField id="character-personality-traits" label="Personality Traits">
                        <textarea
                          id="character-personality-traits"
                          rows={2}
                          className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
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
                      </FormField>

                      <FormField id="character-ideals" label="Ideals">
                        <textarea
                          id="character-ideals"
                          rows={2}
                          className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
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
                      </FormField>

                      <FormField id="character-bonds" label="Bonds">
                        <textarea
                          id="character-bonds"
                          rows={2}
                          className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
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
                      </FormField>

                      <FormField id="character-flaws" label="Flaws">
                        <textarea
                          id="character-flaws"
                          rows={2}
                          className="min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50"
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
                      </FormField>
                    </div>
                  </section>
                </section>

              </div>

              <section className="rounded-home-2xl border border-home-border bg-home-surface p-[14px]">
                <h3 className="mb-[12px] font-home-display text-[13px] font-semibold uppercase tracking-[.13em] text-home-text-strong">
                  Skill Proficiencies
                </h3>
                <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3">
                  {skillGroups.map((group) => (
                    <div
                      key={group.ability}
                      className={`rounded-home-2xl border border-home-border bg-home-surface p-[14px] ${group.ability === 'Charisma' ? 'md:col-start-2' : ''}`}
                    >
                      <span className="mb-[10px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">{group.ability}</span>
                      <div className="flex flex-col gap-[10px]">
                        {group.skills.map((skill) => (
                          <div key={skill} className="flex items-center justify-between gap-[12px]">
                            <label htmlFor={`skill-${skill}-proficient`} className="text-[12.5px] text-home-text-soft">{skill}</label>
                            <div className="flex items-center gap-[12px]">
                              <label htmlFor={`skill-${skill}-proficient`} className="flex items-center gap-[6px] text-[11.5px] text-home-muted">
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
                                  className="h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50"
                                />
                                <span>Proficiency</span>
                              </label>

                              {(draft.proficiencies[skill] ?? 0) > 0 && (
                                <label htmlFor={`skill-${skill}-expertise`} className="flex items-center gap-[6px] text-[11.5px] text-home-muted">
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
                                    className="h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50"
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

              <div className="mt-[20px] flex justify-end gap-[10px]">
                <button
                  type="button"
                  data-testid="create-character-cancel"
                  className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </button>
                <Button data-testid="create-character-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? submittingLabel : submitLabel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
