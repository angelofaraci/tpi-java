import { useState, useEffect } from 'react'
import { api, type DndClassDto, type RaceDto } from '../services/api'
import type { Character, CharacterCatalogRaceOption } from '../interfaces/character'
import type { User } from '../interfaces/user'
import type { Campaign } from '../interfaces/campaign'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'

interface AdminPanelProps {
  onBack: () => void
  onLogout: () => void
}

type Tab = 'classes' | 'races' | 'characters' | 'users' | 'campaigns'

type ClassEditMode = 'none' | 'create' | 'edit'
type RaceEditMode = 'none' | 'create' | 'edit'
type FeatureEditModalState = {
  type: 'class' | 'race'
  level?: number
  index?: number
  title: string
  description: string
}

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
]

// Danger recipe (design.md "Recipe Catalog") — destructive buttons stay raw <button>,
// not a 4th Button variant (design decision #5). Reused verbatim from App.tsx.
const dangerButtonClasses =
  'h-[36px] rounded-home-md border border-[#3f2226] bg-[rgba(220,38,38,.12)] px-[16px] font-home-display text-[12.5px] font-semibold text-home-danger transition-colors duration-150 hover:bg-[rgba(220,38,38,.2)] disabled:cursor-not-allowed disabled:opacity-50'

// Small variant of the danger recipe, sized to match Button's `sm` size for card action rows.
const dangerButtonSmClasses =
  'h-[30px] flex-1 rounded-home-md border border-[#3f2226] bg-[rgba(220,38,38,.12)] px-[12px] font-home-display text-[11.5px] font-semibold text-home-danger transition-colors duration-150 hover:bg-[rgba(220,38,38,.2)] disabled:cursor-not-allowed disabled:opacity-50'

// Select recipe (design.md Recipe Catalog: Home.tsx:354), `w-full` added for form-row alignment
// — same "add what the row needs" precedent as CreateCharacter.tsx's selectBase.
const selectClasses =
  'w-full rounded-home-md border border-home-border-mid bg-home-well px-[10px] py-[5px] text-[12.5px] text-home-muted disabled:opacity-50'

// Textarea recipe (design.md: Input base minus h-[34px], plus min-h-[80px] resize-y py-[8px]),
// reused verbatim from CreateCampaign.tsx's description textarea.
const textareaClasses =
  'min-h-[80px] w-full resize-y rounded-home-lg border border-home-border-mid bg-home-well px-[11px] py-[8px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50'

// Checkbox recipe, reused verbatim from CreateCampaign.tsx / CreateCharacter.tsx.
const checkboxClasses =
  'h-[16px] w-[16px] rounded-home-md border border-home-border-mid bg-home-well accent-home-blue-600 disabled:opacity-50'

// Card recipe (design.md Recipe Catalog: Home.tsx:82).
const cardClasses = 'rounded-home-2xl border border-home-border bg-home-surface p-[14px]'

// Entity grid recipe (design.md Recipe Catalog).
const gridClasses = 'grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-3'

// Edit/Delete circular icon buttons for the level-feature / racial-feature rows.
// Legacy `editIconStyle`/`deleteIconStyle` colors (#2563eb/#1d4ed8, #dc2626/#b91c1c) have no
// home-* token equivalent (home-blue-600 matches the fill but not the border, home-danger is
// lighter than the legacy delete fill) — carried over via Tailwind arbitrary-value syntax per
// design's "legacy hex colors with no home-* equivalent" precedent.
const editIconButtonClasses =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-home-md border border-[#1d4ed8] bg-home-blue-600 text-[16px] leading-none text-white transition-colors duration-150 hover:bg-home-blue-500'
const deleteIconButtonClasses =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-home-md border border-[#b91c1c] bg-[#dc2626] text-[16px] leading-none text-white transition-colors duration-150 hover:bg-[rgba(220,38,38,.85)]'

export function AdminPanel({ onBack, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('classes')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // ── Classes state ────────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<DndClassDto[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [classEditMode, setClassEditMode] = useState<ClassEditMode>('none')
  const [editingClass, setEditingClass] = useState<DndClassDto | null>(null)
  const [className, setClassName] = useState('')
  const [classDescription, setClassDescription] = useState('')
  const [classHitDice, setClassHitDice] = useState(6)
  const [classSavingThrows, setClassSavingThrows] = useState<string[]>([])
  const [levelCharacteristics, setLevelCharacteristics] = useState<Record<number, string>>({})
  const [newLevel, setNewLevel] = useState(1)
  const [newFeatureTitle, setNewFeatureTitle] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')

  // ── Races state ──────────────────────────────────────────────────────────────
  const [races, setRaces] = useState<RaceDto[]>([])
  const [racesLoading, setRacesLoading] = useState(false)
  const [raceEditMode, setRaceEditMode] = useState<RaceEditMode>('none')
  const [editingRace, setEditingRace] = useState<RaceDto | null>(null)
  const [raceName, setRaceName] = useState('')
  const [raceDescription, setRaceDescription] = useState('')
  const [racialFeats, setRacialFeats] = useState<string[]>([])
  const [newRacialFeatTitle, setNewRacialFeatTitle] = useState('')
  const [newRacialFeatDescription, setNewRacialFeatDescription] = useState('')
  const [featureEditModal, setFeatureEditModal] = useState<FeatureEditModalState | null>(null)

  // ── Characters state ─────────────────────────────────────────────────────────
  const [characters, setCharacters] = useState<Character[]>([])
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [charName, setCharName] = useState('')
  const [charAlignment, setCharAlignment] = useState('')
  const [charBackground, setCharBackground] = useState('')
  const [charRaceId, setCharRaceId] = useState<number | ''>('')
  const [charCatalogRaces, setCharCatalogRaces] = useState<CharacterCatalogRaceOption[]>([])

  // ── Users state ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userUsername, setUserUsername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')

  // ── Campaigns state ──────────────────────────────────────────────────────────
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [campaignPrivacy, setCampaignPrivacy] = useState(false)

  // ── Load data on tab change ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'classes' && classes.length === 0) loadClasses()
    if (activeTab === 'races' && races.length === 0) loadRaces()
    if (activeTab === 'characters') loadCharacters()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'campaigns') loadCampaigns()
  }, [activeTab])

  // Load races catalog for the character edit form
  useEffect(() => {
    if (editingCharacter !== null && charCatalogRaces.length === 0) {
      api.races.findAll().then(r => setCharCatalogRaces(r as CharacterCatalogRaceOption[]))
    }
  }, [editingCharacter])

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadClasses = async () => {
    setClassesLoading(true)
    try { setClasses((await api.classes.findAll()) as DndClassDto[]) }
    catch (e) { showError(e) }
    finally { setClassesLoading(false) }
  }

  const loadRaces = async () => {
    setRacesLoading(true)
    try { setRaces((await api.races.findAll()) as RaceDto[]) }
    catch (e) { showError(e) }
    finally { setRacesLoading(false) }
  }

  const loadCharacters = async () => {
    setCharactersLoading(true)
    try { setCharacters((await api.admin.characters.findAll()) as Character[]) }
    catch (e) { showError(e) }
    finally { setCharactersLoading(false) }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try { setUsers(await api.admin.users.findAll()) }
    catch (e) { showError(e) }
    finally { setUsersLoading(false) }
  }

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    try { setCampaignsList((await api.admin.campaigns.findAll()) as Campaign[]) }
    catch (e) { showError(e) }
    finally { setCampaignsLoading(false) }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showError = (e: unknown) => {
    setFeedback({ message: e instanceof Error ? e.message : 'Unexpected error', type: 'error' })
  }

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm })
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setFeatureEditModal(null)
  }

  const formatFeature = (title: string, description: string) => `${title.trim()}\n${description.trim()}`

  const parseFeature = (feature: string) => {
    const [title, ...descriptionParts] = String(feature || '').split('\n')
    return {
      title: (title || '').trim(),
      description: descriptionParts.join('\n').trim(),
    }
  }

  // ── Class handlers ───────────────────────────────────────────────────────────
  const resetClassForm = () => {
    setClassName(''); setClassDescription(''); setClassHitDice(6)
    setClassSavingThrows([])
    setLevelCharacteristics({}); setNewLevel(1)
    setNewFeatureTitle(''); setNewFeatureDescription('')
    setEditingClass(null)
    setFeatureEditModal(null)
  }

  const handleOpenCreateClass = () => { resetClassForm(); setClassEditMode('create') }

  const handleOpenEditClass = (c: DndClassDto) => {
    setEditingClass(c); setClassName(c.name); setClassDescription(c.description)
    setClassHitDice(c.hitDice); setClassSavingThrows(c.savingThrows ?? [])
    setLevelCharacteristics(c.levelCharacteristics || {})
    setClassEditMode('edit')
  }

  const handleCancelClassEdit = () => { setClassEditMode('none'); resetClassForm() }

  const handleAddLevelCharacteristic = () => {
    const title = newFeatureTitle.trim()
    const description = newFeatureDescription.trim()
    if (newLevel > 0 && title && description) {
      setLevelCharacteristics(prev => ({ ...prev, [newLevel]: formatFeature(title, description) }))
      setNewLevel(newLevel + 1)
      setNewFeatureTitle('')
      setNewFeatureDescription('')
    }
  }

  const handleEditLevelCharacteristic = (level: number) => {
    const parsed = parseFeature(levelCharacteristics[level])
    setFeatureEditModal({
      type: 'class',
      level,
      title: parsed.title,
      description: parsed.description,
    })
  }

  const handleRemoveLevelCharacteristic = (level: number) => {
    showConfirm(`Delete level ${level} feature?`, () => {
      setLevelCharacteristics(prev => { const u = { ...prev }; delete u[level]; return u })
      if (featureEditModal?.type === 'class' && featureEditModal.level === level) setFeatureEditModal(null)
    })
  }

  const handleSaveClass = async () => {
    try {
      const payload: DndClassDto = { name: className, description: classDescription, hitDice: classHitDice, levelCharacteristics, savingThrows: classSavingThrows }
      if (classEditMode === 'create') {
        await api.admin.classes.create(payload)
        setFeedback({ message: 'Class created successfully', type: 'success' })
      } else if (editingClass) {
        await api.admin.classes.update(editingClass.id!, payload)
        setFeedback({ message: 'Class updated successfully', type: 'success' })
      }
      await loadClasses(); handleCancelClassEdit()
    } catch (e) { showError(e) }
  }

  const handleDeleteClass = async (id: number) => {
    const name = classes.find(c => c.id === id)?.name || 'this class'
    showConfirm(`Delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.classes.delete(id)
        setFeedback({ message: 'Class deleted', type: 'success' })
        await loadClasses()
      } catch (e) { showError(e) }
    })
  }

  // ── Race handlers ────────────────────────────────────────────────────────────
  const resetRaceForm = () => {
    setRaceName(''); setRaceDescription(''); setRacialFeats([])
    setNewRacialFeatTitle(''); setNewRacialFeatDescription('')
    setEditingRace(null)
    setFeatureEditModal(null)
  }

  const handleOpenCreateRace = () => { resetRaceForm(); setRaceEditMode('create') }

  const handleOpenEditRace = (r: RaceDto) => {
    setEditingRace(r); setRaceName(r.name); setRaceDescription(r.description)
    setRacialFeats(r.racialFeats || []); setRaceEditMode('edit')
  }

  const handleCancelRaceEdit = () => { setRaceEditMode('none'); resetRaceForm() }

  const handleAddRacialFeat = () => {
    const title = newRacialFeatTitle.trim()
    const description = newRacialFeatDescription.trim()
    if (!title || !description) return

    const formattedFeature = formatFeature(title, description)
    setRacialFeats(prev => prev.includes(formattedFeature) ? prev : [...prev, formattedFeature])
    setNewRacialFeatTitle('')
    setNewRacialFeatDescription('')
  }

  const handleEditRacialFeat = (index: number) => {
    const parsed = parseFeature(racialFeats[index])
    setFeatureEditModal({
      type: 'race',
      index,
      title: parsed.title,
      description: parsed.description,
    })
  }

  const handleRemoveRacialFeat = (index: number) => {
    const feat = racialFeats[index]
    showConfirm(`Delete racial feature "${feat}"?`, () => {
      setRacialFeats(prev => prev.filter((_, i) => i !== index))
      if (featureEditModal?.type === 'race' && featureEditModal.index === index) setFeatureEditModal(null)
    })
  }

  const handleSaveFeatureModal = () => {
    if (!featureEditModal) return
    const title = featureEditModal.title.trim()
    const description = featureEditModal.description.trim()
    if (!title || !description) return
    const formatted = formatFeature(title, description)

    if (featureEditModal.type === 'class' && typeof featureEditModal.level === 'number') {
      setLevelCharacteristics(prev => ({ ...prev, [featureEditModal.level!]: formatted }))
    }
    if (featureEditModal.type === 'race' && typeof featureEditModal.index === 'number') {
      setRacialFeats(prev => prev.map((f, i) => i === featureEditModal.index ? formatted : f))
    }
    setFeatureEditModal(null)
  }

  const handleSaveRace = async () => {
    try {
      const payload: RaceDto = { name: raceName, description: raceDescription, racialFeats }
      if (raceEditMode === 'create') {
        await api.admin.races.create(payload)
        setFeedback({ message: 'Race created successfully', type: 'success' })
      } else if (editingRace) {
        await api.admin.races.update(editingRace.id!, payload)
        setFeedback({ message: 'Race updated successfully', type: 'success' })
      }
      await loadRaces(); handleCancelRaceEdit()
    } catch (e) { showError(e) }
  }

  const handleDeleteRace = async (id: number) => {
    const name = races.find(r => r.id === id)?.name || 'this race'
    showConfirm(`Delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.races.delete(id)
        setFeedback({ message: 'Race deleted', type: 'success' })
        await loadRaces()
      } catch (e) { showError(e) }
    })
  }

  // ── Character handlers ───────────────────────────────────────────────────────
  const handleOpenEditCharacter = (c: Character) => {
    setEditingCharacter(c)
    setCharName(c.name)
    setCharAlignment(c.alignment || '')
    setCharBackground(c.background || '')
    setCharRaceId(c.race?.id ?? '')
  }

  const handleCancelCharacterEdit = () => { setEditingCharacter(null) }

  const handleSaveCharacter = async () => {
    if (!editingCharacter) return
    try {
      const payload: Record<string, unknown> = {
        name: charName,
        alignment: charAlignment || undefined,
        background: charBackground || undefined,
        race: charRaceId !== '' ? { id: charRaceId } : undefined,
      }
      await api.admin.characters.update(editingCharacter.id, payload)
      setFeedback({ message: 'Character updated successfully', type: 'success' })
      setEditingCharacter(null)
      await loadCharacters()
    } catch (e) { showError(e) }
  }

  const handleDeleteCharacter = async (id: number) => {
    const name = characters.find(c => c.id === id)?.name || 'this character'
    showConfirm(`Delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.characters.delete(id)
        setFeedback({ message: 'Character deleted', type: 'success' })
        await loadCharacters()
      } catch (e) { showError(e) }
    })
  }

  // ── User handlers ────────────────────────────────────────────────────────────
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u); setUserUsername(u.username); setUserEmail(u.email); setUserPassword('')
  }

  const handleCancelUserEdit = () => { setEditingUser(null) }

  const handleSaveUser = async () => {
    if (!editingUser) return
    try {
      const payload: { username?: string; email?: string; password?: string } = {}
      if (userUsername.trim()) payload.username = userUsername.trim()
      if (userEmail.trim()) payload.email = userEmail.trim()
      if (userPassword.trim()) payload.password = userPassword.trim()
      await api.admin.users.update(editingUser.id, payload)
      setFeedback({ message: 'User updated successfully', type: 'success' })
      setEditingUser(null)
      await loadUsers()
    } catch (e) { showError(e) }
  }

  const handleDeleteUser = async (id: number) => {
    const name = users.find(u => u.id === id)?.username || 'this user'
    showConfirm(`Delete user "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.users.delete(id)
        setFeedback({ message: 'User deleted', type: 'success' })
        await loadUsers()
      } catch (e) { showError(e) }
    })
  }

  // ── Campaign handlers ────────────────────────────────────────────────────────
  const handleOpenEditCampaign = (c: Campaign) => {
    setEditingCampaign(c)
    setCampaignName(c.name)
    setCampaignDescription(c.description || '')
    setCampaignPrivacy(c.privacy ?? false)
  }

  const handleCancelCampaignEdit = () => { setEditingCampaign(null) }

  const handleSaveCampaign = async () => {
    if (!editingCampaign) return
    try {
      await api.admin.campaigns.update(editingCampaign.id, {
        name: campaignName,
        description: campaignDescription,
        privacy: campaignPrivacy,
      })
      setFeedback({ message: 'Campaign updated successfully', type: 'success' })
      setEditingCampaign(null)
      await loadCampaigns()
    } catch (e) { showError(e) }
  }

  const handleDeleteCampaign = async (id: number) => {
    const name = campaignsList.find(c => c.id === id)?.name || 'this campaign'
    showConfirm(`Delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.campaigns.delete(id)
        setFeedback({ message: 'Campaign deleted', type: 'success' })
        await loadCampaigns()
      } catch (e) { showError(e) }
    })
  }

  // ── Shared UI ────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'classes', label: 'Classes' },
    { key: 'races', label: 'Races' },
    { key: 'characters', label: 'Characters' },
    { key: 'users', label: 'Users' },
    { key: 'campaigns', label: 'Campaigns' },
  ]

  // ── Edit forms rendered via the shared Modal primitive ───────────────────────
  const renderCharacterEditForm = () => {
    if (!editingCharacter) return null
    return (
      <Modal
        open
        onClose={handleCancelCharacterEdit}
        titleId="admin-character-edit-title"
        title="Edit Character"
        maxWidthClassName="max-w-[520px]"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={handleCancelCharacterEdit}>Cancel</Button>
            <Button type="button" onClick={handleSaveCharacter}>Save</Button>
          </>
        }
      >
        <FormField id="admin-character-name" label="Name">
          <Input id="admin-character-name" value={charName} onChange={e => setCharName(e.target.value)} />
        </FormField>
        <FormField id="admin-character-alignment" label="Alignment">
          <select id="admin-character-alignment" className={selectClasses} value={charAlignment} onChange={e => setCharAlignment(e.target.value)}>
            <option value="">— No alignment —</option>
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </FormField>
        <FormField id="admin-character-background" label="Background">
          <textarea id="admin-character-background" className={textareaClasses} rows={2}
            value={charBackground} onChange={e => setCharBackground(e.target.value)} />
        </FormField>
        <FormField id="admin-character-race" label="Race">
          <select id="admin-character-race" className={selectClasses} value={charRaceId} onChange={e => setCharRaceId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">— Keep unchanged —</option>
            {charCatalogRaces.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
      </Modal>
    )
  }

  const renderUserEditForm = () => {
    if (!editingUser) return null
    return (
      <Modal
        open
        onClose={handleCancelUserEdit}
        titleId="admin-user-edit-title"
        title="Edit User"
        maxWidthClassName="max-w-[520px]"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={handleCancelUserEdit}>Cancel</Button>
            <Button type="button" onClick={handleSaveUser}>Save</Button>
          </>
        }
      >
        <FormField id="admin-user-username" label="Username">
          <Input id="admin-user-username" value={userUsername} onChange={e => setUserUsername(e.target.value)} />
        </FormField>
        <FormField id="admin-user-email" label="Email">
          <Input id="admin-user-email" type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
        </FormField>
        <FormField id="admin-user-password" label="New password" hint="(leave blank to keep unchanged)">
          <Input id="admin-user-password" type="password" placeholder="••••••••"
            value={userPassword} onChange={e => setUserPassword(e.target.value)} />
        </FormField>
      </Modal>
    )
  }

  const renderCampaignEditForm = () => {
    if (!editingCampaign) return null
    return (
      <Modal
        open
        onClose={handleCancelCampaignEdit}
        titleId="admin-campaign-edit-title"
        title="Edit Campaign"
        maxWidthClassName="max-w-[520px]"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={handleCancelCampaignEdit}>Cancel</Button>
            <Button type="button" onClick={handleSaveCampaign} disabled={!campaignName.trim()}>Save</Button>
          </>
        }
      >
        <FormField id="admin-campaign-name" label="Name">
          <Input id="admin-campaign-name" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
        </FormField>
        <FormField id="admin-campaign-description" label="Description">
          <textarea id="admin-campaign-description" className={textareaClasses} rows={3}
            value={campaignDescription} onChange={e => setCampaignDescription(e.target.value)} />
        </FormField>
        <div className="mb-[14px] flex items-center gap-[10px]">
          <input type="checkbox" id="admin-campaign-privacy" checked={campaignPrivacy}
            onChange={e => setCampaignPrivacy(e.target.checked)}
            className={checkboxClasses} />
          <label htmlFor="admin-campaign-privacy" className="text-[12.5px] text-home-muted">Private campaign</label>
        </div>
      </Modal>
    )
  }

  const renderFeatureEditModal = () => {
    if (!featureEditModal) return null
    const isClassFeature = featureEditModal.type === 'class'
    const title = isClassFeature ? `Edit Class Feature (Level ${featureEditModal.level})` : 'Edit Race Feature'

    return (
      <Modal
        open
        onClose={() => setFeatureEditModal(null)}
        titleId="admin-feature-edit-title"
        title={title}
        maxWidthClassName="max-w-[560px]"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setFeatureEditModal(null)}>Cancel</Button>
            <Button
              type="button"
              onClick={handleSaveFeatureModal}
              disabled={!featureEditModal.title.trim() || !featureEditModal.description.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <FormField id="admin-feature-title" label="Title">
          <Input
            id="admin-feature-title"
            value={featureEditModal.title}
            onChange={e => setFeatureEditModal(prev => prev ? { ...prev, title: e.target.value } : prev)}
          />
        </FormField>
        <FormField id="admin-feature-description" label="Description">
          <textarea
            id="admin-feature-description"
            className={textareaClasses}
            rows={4}
            value={featureEditModal.description}
            onChange={e => setFeatureEditModal(prev => prev ? { ...prev, description: e.target.value } : prev)}
          />
        </FormField>
      </Modal>
    )
  }

  // ── Classes tab with inline edit panel ───────────────────────────────────────
  const renderClassesTab = () => {
    if (classesLoading) return <p className="text-[12.5px] text-home-dim">Loading classes...</p>
    if (classEditMode !== 'none') {
      const isCreate = classEditMode === 'create'
      return (
        <div className="mx-auto max-w-[800px]">
          <button type="button" className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300" onClick={handleCancelClassEdit}>← Back to Classes</button>
          <div className="mt-[24px] rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
            <h2 className="mb-[20px] text-center font-home-display text-[17px] font-semibold text-home-text-strong">{isCreate ? 'Create Class' : 'Edit Class'}</h2>
            <FormField id="admin-class-name" label="Name">
              <Input id="admin-class-name" value={className} onChange={e => setClassName(e.target.value)} />
            </FormField>
            <FormField id="admin-class-description" label="Description">
              <textarea id="admin-class-description" className={textareaClasses} rows={3}
                value={classDescription} onChange={e => setClassDescription(e.target.value)} />
            </FormField>
            <FormField id="admin-class-hitdice" label="Hit Dice">
              <Input id="admin-class-hitdice" type="number" min={1} max={20}
                value={classHitDice} onChange={e => setClassHitDice(Number(e.target.value))} />
            </FormField>
            <FormField id="admin-class-saving-throws" label="Saving Throw Proficiencies">
              <div className="flex flex-wrap gap-[8px_24px]">
                {(['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const).map(ability => (
                  <label key={ability} className="flex cursor-pointer items-center gap-[6px] text-[12.5px] text-home-text">
                    <input
                      type="checkbox"
                      className={checkboxClasses}
                      checked={classSavingThrows.includes(ability)}
                      onChange={() => setClassSavingThrows(prev =>
                        prev.includes(ability) ? prev.filter(a => a !== ability) : [...prev, ability]
                      )}
                    />
                    {ability}
                  </label>
                ))}
              </div>
            </FormField>
            <div className="mb-[24px] rounded-home-lg border border-home-border-mid bg-home-well p-[16px]">
              <h4 className="mb-[12px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Level features</h4>
              <div className="mb-[12px] flex gap-[8px]">
                <div className="w-[80px]">
                  <Input type="number" placeholder="Level" value={newLevel} min={1} max={20}
                    onChange={e => setNewLevel(Number(e.target.value))} />
                </div>
                <div className="flex-1">
                  <Input type="text" placeholder="Title" value={newFeatureTitle}
                    onChange={e => setNewFeatureTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLevelCharacteristic()} />
                </div>
                <Button type="button" size="sm" onClick={handleAddLevelCharacteristic}>Add</Button>
              </div>
              <div className="mb-[12px]">
                <textarea
                  placeholder="Description"
                  value={newFeatureDescription}
                  onChange={e => setNewFeatureDescription(e.target.value)}
                  rows={3}
                  className={textareaClasses}
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {Object.entries(levelCharacteristics).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, feat]) => (
                  <div key={lvl} className="mb-[7px] flex items-center justify-between gap-[12px] rounded-home-md bg-home-well px-[10px] py-[7px] text-[12.5px] text-home-text">
                    <span>
                      <strong>Level {lvl}:</strong> {parseFeature(feat).title}
                      {parseFeature(feat).description ? ` — ${parseFeature(feat).description}` : ''}
                    </span>
                    <div className="flex gap-[4px]">
                      <button
                        type="button"
                        onClick={() => handleEditLevelCharacteristic(Number(lvl))}
                        className={editIconButtonClasses}
                        title="Edit feature"
                        aria-label="Edit feature"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLevelCharacteristic(Number(lvl))}
                        className={deleteIconButtonClasses}
                        title="Delete feature"
                        aria-label="Delete feature"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                {Object.keys(levelCharacteristics).length === 0 && <p className="text-center text-[12.5px] text-home-dim">No features configured</p>}
              </div>
            </div>
            <div className="flex justify-center gap-[16px]">
              <Button type="button" onClick={handleSaveClass} disabled={!className || !classDescription}>
                {isCreate ? 'Create Class' : 'Update Class'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelClassEdit}>Cancel</Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="mb-[16px] flex justify-end">
          <Button type="button" onClick={handleOpenCreateClass}>+ Create Class</Button>
        </div>
        {classes.length === 0 && <p className="text-[12.5px] text-home-dim">No classes registered.</p>}
        <div className={gridClasses}>
          {classes.map(c => (
            <div key={c.id} className={cardClasses}>
              <h3 className="mb-[6px] font-home-display text-[15px] font-semibold text-home-text-strong">{c.name}</h3>
              <p className="mb-[6px] text-[12.5px] text-home-muted">{c.description}</p>
              <p className="mb-[6px] text-[12.5px] text-home-muted"><strong className="text-home-text-soft">Hit Dice:</strong> d{c.hitDice}</p>
              <p className="mb-[12px] text-[12.5px] text-home-muted"><strong className="text-home-text-soft">Levels:</strong> {Object.keys(c.levelCharacteristics || {}).length} configured</p>
              <div className="flex gap-[8px]">
                <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => handleOpenEditClass(c)}>Edit</Button>
                <button type="button" onClick={() => handleDeleteClass(c.id!)} className={dangerButtonSmClasses}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderRacesTab = () => {
    if (racesLoading) return <p className="text-[12.5px] text-home-dim">Loading races...</p>
    if (raceEditMode !== 'none') {
      const isCreate = raceEditMode === 'create'
      return (
        <div className="mx-auto max-w-[800px]">
          <button type="button" className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300" onClick={handleCancelRaceEdit}>← Back to Races</button>
          <div className="mt-[24px] rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]">
            <h2 className="mb-[20px] text-center font-home-display text-[17px] font-semibold text-home-text-strong">{isCreate ? 'Create Race' : 'Edit Race'}</h2>
            <FormField id="admin-race-name" label="Name">
              <Input id="admin-race-name" value={raceName} onChange={e => setRaceName(e.target.value)} />
            </FormField>
            <FormField id="admin-race-description" label="Description">
              <textarea id="admin-race-description" className={textareaClasses} rows={3}
                value={raceDescription} onChange={e => setRaceDescription(e.target.value)} />
            </FormField>
            <div className="mb-[24px] rounded-home-lg border border-home-border-mid bg-home-well p-[16px]">
              <h4 className="mb-[12px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">Racial Features</h4>
              <div className="mb-[12px] flex gap-[8px]">
                <div className="flex-1">
                  <Input type="text" placeholder="Title" value={newRacialFeatTitle}
                    onChange={e => setNewRacialFeatTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRacialFeat()} />
                </div>
                <Button type="button" size="sm" onClick={handleAddRacialFeat}>Add</Button>
              </div>
              <div className="mb-[12px]">
                <textarea
                  placeholder="Description"
                  value={newRacialFeatDescription}
                  onChange={e => setNewRacialFeatDescription(e.target.value)}
                  rows={3}
                  className={textareaClasses}
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {racialFeats.map((feat, i) => (
                  <div key={i} className="mb-[7px] flex items-center justify-between gap-[12px] rounded-home-md bg-home-well px-[10px] py-[7px] text-[12.5px] text-home-text">
                    <span>
                      <strong>{parseFeature(feat).title}</strong>
                      {parseFeature(feat).description ? ` — ${parseFeature(feat).description}` : ''}
                    </span>
                    <div className="flex gap-[4px]">
                      <button
                        type="button"
                        onClick={() => handleEditRacialFeat(i)}
                        className={editIconButtonClasses}
                        title="Edit feature"
                        aria-label="Edit feature"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRacialFeat(i)}
                        className={deleteIconButtonClasses}
                        title="Delete feature"
                        aria-label="Delete feature"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                {racialFeats.length === 0 && <p className="text-center text-[12.5px] text-home-dim">No racial features</p>}
              </div>
            </div>
            <div className="flex justify-center gap-[16px]">
              <Button type="button" onClick={handleSaveRace} disabled={!raceName || !raceDescription}>
                {isCreate ? 'Create Race' : 'Update Race'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancelRaceEdit}>Cancel</Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="mb-[16px] flex justify-end">
          <Button type="button" onClick={handleOpenCreateRace}>+ Create Race</Button>
        </div>
        {races.length === 0 && <p className="text-[12.5px] text-home-dim">No races registered.</p>}
        <div className={gridClasses}>
          {races.map(r => (
            <div key={r.id} className={cardClasses}>
              <h3 className="mb-[6px] font-home-display text-[15px] font-semibold text-home-text-strong">{r.name}</h3>
              <p className="mb-[6px] text-[12.5px] text-home-muted">{r.description}</p>
              <p className="mb-[12px] text-[12.5px] text-home-muted"><strong className="text-home-text-soft">Features:</strong> {r.racialFeats?.length || 0}</p>
              <div className="flex gap-[8px]">
                <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => handleOpenEditRace(r)}>Edit</Button>
                <button type="button" onClick={() => handleDeleteRace(r.id!)} className={dangerButtonSmClasses}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCharactersTab = () => {
    if (charactersLoading) return <p className="text-[12.5px] text-home-dim">Loading characters...</p>
    return (
      <>
        {characters.length === 0 && <p className="text-[12.5px] text-home-dim">No characters registered.</p>}
        <div className={gridClasses}>
          {characters.map(c => (
            <div key={c.id} className={cardClasses}>
              <h3 className="mb-[6px] font-home-display text-[15px] font-semibold text-home-text-strong">{c.name}</h3>
              <p className="mb-[4px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Player:</strong> {c.user?.username ?? '—'}
              </p>
              <p className="mb-[4px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Campaign:</strong> {(c.campaign as { name?: string } | null)?.name ?? '—'}
              </p>
              <p className="mb-[4px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Race:</strong> {c.race?.name ?? '—'}
              </p>
              <p className="mb-[12px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Alignment:</strong> {c.alignment || '—'}
              </p>
              <div className="flex gap-[8px]">
                <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => handleOpenEditCharacter(c)}>Edit</Button>
                <button type="button" onClick={() => handleDeleteCharacter(c.id)} className={dangerButtonSmClasses}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderUsersTab = () => {
    if (usersLoading) return <p className="text-[12.5px] text-home-dim">Loading users...</p>
    return (
      <>
        {users.length === 0 && <p className="text-[12.5px] text-home-dim">No users registered.</p>}
        <div className={gridClasses}>
          {users.map(u => (
            <div key={u.id} className={cardClasses}>
              <h3 className="mb-[6px] font-home-display text-[15px] font-semibold text-home-text-strong">{u.username}</h3>
              <p className="mb-[4px] text-[12.5px] text-home-muted">{u.email}</p>
              <p className="mb-[12px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Role:</strong> {u.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
              </p>
              <div className="flex gap-[8px]">
                <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => handleOpenEditUser(u)}>Edit</Button>
                <button type="button" onClick={() => handleDeleteUser(u.id)} className={dangerButtonSmClasses}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCampaignsTab = () => {
    if (campaignsLoading) return <p className="text-[12.5px] text-home-dim">Loading campaigns...</p>
    return (
      <>
        {campaignsList.length === 0 && <p className="text-[12.5px] text-home-dim">No campaigns registered.</p>}
        <div className={gridClasses}>
          {campaignsList.map(c => (
            <div key={c.id} className={cardClasses}>
              <h3 className="mb-[6px] font-home-display text-[15px] font-semibold text-home-text-strong">{c.name}</h3>
              <p className="mb-[4px] text-[12.5px] text-home-muted">{c.description}</p>
              <p className="mb-[4px] text-[12.5px] text-home-muted">
                <strong className="text-home-text-soft">Privacy:</strong> {c.privacy ? 'Private' : 'Public'}
              </p>
              {c.joinCode && (
                <p className="mb-[12px] text-[12.5px] text-home-muted">
                  <strong className="text-home-text-soft">Code:</strong> {c.joinCode}
                </p>
              )}
              <div className="flex gap-[8px]">
                <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => handleOpenEditCampaign(c)}>Edit</Button>
                <button type="button" onClick={() => handleDeleteCampaign(c.id)} className={dangerButtonSmClasses}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-home-ink-900 text-home-text" style={{ fontFamily: 'var(--font-home-display)' }}>
      <header className="flex h-[58px] items-center justify-between border-b border-home-line bg-home-ink-800 px-[26px]">
        <h1 onClick={onBack} className="cursor-pointer font-home-display text-[12.5px] font-bold uppercase text-home-text-strong">D&D Manager — Admin Panel</h1>
        <button onClick={onLogout} type="button" className="text-[12px] text-home-dim transition-colors duration-150 hover:text-home-text-soft">Logout</button>
      </header>

      <div className="p-[22px_26px_28px]">
        <button type="button" className="font-home-display text-[11.5px] font-semibold text-home-blue-400 transition-colors duration-150 hover:text-home-blue-300" onClick={onBack}>← Back to home</button>

        {/* Feedback banner */}
        {feedback && (
          <div
            className={
              feedback.type === 'success'
                ? 'mt-[16px] flex items-center justify-between rounded-home-xl border border-home-border-acc bg-[rgba(37,99,235,.08)] p-[12px_14px] text-[12.5px] text-home-blue-200'
                : 'mt-[16px] flex items-center justify-between rounded-home-xl border border-[#3f2226] bg-[rgba(220,38,38,.08)] p-[12px_14px] text-[12.5px] text-[#f2b8b5]'
            }
            role="status"
          >
            <span>{feedback.message}</span>
            <button type="button" className="font-semibold text-home-dim transition-colors duration-150 hover:text-home-text-soft" onClick={() => setFeedback(null)} aria-label="Dismiss feedback">x</button>
          </div>
        )}

        {/* Confirm modal — legacy markup had no separate heading; the confirmation message
            itself is used as the Modal's required `title` (kept as the sole accessible name
            via aria-labelledby) with no body content, since Modal always renders an <h2>. */}
        {confirmModal && (
          <Modal
            open
            onClose={() => setConfirmModal(null)}
            titleId="admin-confirm-modal-title"
            title={confirmModal.message}
            maxWidthClassName="max-w-[420px]"
            footer={
              <>
                <Button type="button" variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
                <button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }} className={dangerButtonClasses}>Confirm</button>
              </>
            }
          >
            {null}
          </Modal>
        )}

        {/* Edit modals */}
        {renderCharacterEditForm()}
        {renderUserEditForm()}
        {renderCampaignEditForm()}
        {renderFeatureEditModal()}

        {/* Tabs nav */}
        <nav role="tablist" aria-label="Admin sections" className="mt-[24px] flex items-center border-b border-home-line">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={
                activeTab === tab.key
                  ? 'border-b-2 border-home-blue-500 px-[14px] py-[12px] font-home-display text-[13px] font-semibold text-home-text-strong transition-colors duration-150'
                  : 'px-[14px] py-[12px] font-home-display text-[13px] text-home-dim transition-colors duration-150 hover:text-home-text-soft'
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div role="tabpanel" className="mt-[24px]">
          {activeTab === 'classes' && renderClassesTab()}
          {activeTab === 'races' && renderRacesTab()}
          {activeTab === 'characters' && renderCharactersTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'campaigns' && renderCampaignsTab()}
        </div>
      </div>
    </div>
  )
}
