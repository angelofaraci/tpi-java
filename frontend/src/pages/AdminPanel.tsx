import { useState, useEffect } from 'react'
import { api, type DndClassDto, type RaceDto } from '../services/api'
import type { Character, CharacterCatalogRaceOption } from '../interfaces/character'
import type { User } from '../interfaces/user'
import type { Campaign } from '../interfaces/campaign'
import '../styles/CharacterSheet.css'

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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem', fontSize: '1rem',
    borderRadius: '4px', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)', color: 'var(--color-foreground)',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.35rem', fontWeight: 'bold' }

  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' }

  // ── Edit forms rendered as modal-like inline panels ──────────────────────────
  const renderCharacterEditForm = () => {
    if (!editingCharacter) return null
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3 style={{ marginTop: 0 }}>Edit Character</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={charName} onChange={e => setCharName(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Alignment</label>
            <select style={inputStyle} value={charAlignment} onChange={e => setCharAlignment(e.target.value)}>
              <option value="">— No alignment —</option>
              {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Background</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
              value={charBackground} onChange={e => setCharBackground(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Race</label>
            <select style={inputStyle} value={charRaceId} onChange={e => setCharRaceId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Keep unchanged —</option>
              {charCatalogRaces.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelCharacterEdit} style={cancelBtnStyle}>Cancel</button>
            <button type="button" onClick={handleSaveCharacter} className="section-action-button">Save</button>
          </div>
        </div>
      </div>
    )
  }

  const renderUserEditForm = () => {
    if (!editingUser) return null
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3 style={{ marginTop: 0 }}>Edit User</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={userUsername} onChange={e => setUserUsername(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>New password <span style={{ fontWeight: 'normal', color: '#888' }}>(leave blank to keep unchanged)</span></label>
            <input style={inputStyle} type="password" placeholder="••••••••"
              value={userPassword} onChange={e => setUserPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelUserEdit} style={cancelBtnStyle}>Cancel</button>
            <button type="button" onClick={handleSaveUser} className="section-action-button">Save</button>
          </div>
        </div>
      </div>
    )
  }

  const renderCampaignEditForm = () => {
    if (!editingCampaign) return null
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h3 style={{ marginTop: 0 }}>Edit Campaign</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={campaignName} onChange={e => setCampaignName(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
              value={campaignDescription} onChange={e => setCampaignDescription(e.target.value)} />
          </div>
          <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="camp-privacy" checked={campaignPrivacy}
              onChange={e => setCampaignPrivacy(e.target.checked)} />
            <label htmlFor="camp-privacy" style={{ fontWeight: 'bold', marginBottom: 0 }}>Private campaign</label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelCampaignEdit} style={cancelBtnStyle}>Cancel</button>
            <button type="button" onClick={handleSaveCampaign} className="section-action-button" disabled={!campaignName.trim()}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  const renderFeatureEditModal = () => {
    if (!featureEditModal) return null
    const isClassFeature = featureEditModal.type === 'class'
    const title = isClassFeature ? `Edit Class Feature (Level ${featureEditModal.level})` : 'Edit Race Feature'

    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, maxWidth: '560px' }}>
          <h3 style={{ marginTop: 0 }}>{title}</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={featureEditModal.title}
              onChange={e => setFeatureEditModal(prev => prev ? { ...prev, title: e.target.value } : prev)}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={4}
              value={featureEditModal.description}
              onChange={e => setFeatureEditModal(prev => prev ? { ...prev, description: e.target.value } : prev)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setFeatureEditModal(null)} style={cancelBtnStyle}>Cancel</button>
            <button
              type="button"
              onClick={handleSaveFeatureModal}
              className="section-action-button"
              disabled={!featureEditModal.title.trim() || !featureEditModal.description.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Classes tab with inline edit panel ───────────────────────────────────────
  const renderClassesTab = () => {
    if (classesLoading) return <p>Loading classes...</p>
    if (classEditMode !== 'none') {
      const isCreate = classEditMode === 'create'
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="link-button" onClick={handleCancelClassEdit}>← Back to Classes</button>
          <div style={sectionCardStyle}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>{isCreate ? 'Create Class' : 'Edit Class'}</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={className} onChange={e => setClassName(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
                value={classDescription} onChange={e => setClassDescription(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Hit Dice</label>
              <input style={inputStyle} type="number" min={1} max={20}
                value={classHitDice} onChange={e => setClassHitDice(Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Saving Throw Proficiencies</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem' }}>
                {(['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const).map(ability => (
                  <label key={ability} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={classSavingThrows.includes(ability)}
                      onChange={() => setClassSavingThrows(prev =>
                        prev.includes(ability) ? prev.filter(a => a !== ability) : [...prev, ability]
                      )}
                    />
                    {ability}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0 }}>Level features</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="number" placeholder="Level" value={newLevel} min={1} max={20}
                  onChange={e => setNewLevel(Number(e.target.value))}
                  style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <input type="text" placeholder="Title" value={newFeatureTitle}
                  onChange={e => setNewFeatureTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddLevelCharacteristic()}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <button type="button" onClick={handleAddLevelCharacteristic} className="section-action-button" style={{ padding: '0.4rem 0.75rem' }}>Add</button>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <textarea
                  placeholder="Description"
                  value={newFeatureDescription}
                  onChange={e => setNewFeatureDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(levelCharacteristics).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, feat]) => (
                  <div key={lvl} style={rowItemStyle}>
                    <span>
                      <strong>Level {lvl}:</strong> {parseFeature(feat).title}
                      {parseFeature(feat).description ? ` — ${parseFeature(feat).description}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => handleEditLevelCharacteristic(Number(lvl))}
                        style={editIconStyle}
                        title="Edit feature"
                        aria-label="Edit feature"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLevelCharacteristic(Number(lvl))}
                        style={deleteIconStyle}
                        title="Delete feature"
                        aria-label="Delete feature"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                {Object.keys(levelCharacteristics).length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No features configured</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" onClick={handleSaveClass} className="section-action-button" disabled={!className || !classDescription}>
                {isCreate ? 'Create Class' : 'Update Class'}
              </button>
              <button type="button" onClick={handleCancelClassEdit} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="section-action-button" onClick={handleOpenCreateClass}>+ Create Class</button>
        </div>
        {classes.length === 0 && <p style={{ color: '#888' }}>No classes registered.</p>}
        <div style={gridStyle}>
          {classes.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.4rem' }}>{c.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Hit Dice:</strong> d{c.hitDice}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><strong>Levels:</strong> {Object.keys(c.levelCharacteristics || {}).length} configured</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditClass(c)} className="section-action-button" style={cardBtnStyle}>Edit</button>
                <button type="button" onClick={() => handleDeleteClass(c.id!)} className="sheet-delete-button" style={cardBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderRacesTab = () => {
    if (racesLoading) return <p>Loading races...</p>
    if (raceEditMode !== 'none') {
      const isCreate = raceEditMode === 'create'
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="link-button" onClick={handleCancelRaceEdit}>← Back to Races</button>
          <div style={sectionCardStyle}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>{isCreate ? 'Create Race' : 'Edit Race'}</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={raceName} onChange={e => setRaceName(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
                value={raceDescription} onChange={e => setRaceDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0 }}>Racial Features</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" placeholder="Title" value={newRacialFeatTitle}
                  onChange={e => setNewRacialFeatTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRacialFeat()}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <button type="button" onClick={handleAddRacialFeat} className="section-action-button" style={{ padding: '0.4rem 0.75rem' }}>Add</button>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <textarea
                  placeholder="Description"
                  value={newRacialFeatDescription}
                  onChange={e => setNewRacialFeatDescription(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {racialFeats.map((feat, i) => (
                  <div key={i} style={rowItemStyle}>
                    <span>
                      <strong>{parseFeature(feat).title}</strong>
                      {parseFeature(feat).description ? ` — ${parseFeature(feat).description}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => handleEditRacialFeat(i)}
                        style={editIconStyle}
                        title="Edit feature"
                        aria-label="Edit feature"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveRacialFeat(i)}
                        style={deleteIconStyle}
                        title="Delete feature"
                        aria-label="Delete feature"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                {racialFeats.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No racial features</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" onClick={handleSaveRace} className="section-action-button" disabled={!raceName || !raceDescription}>
                {isCreate ? 'Create Race' : 'Update Race'}
              </button>
              <button type="button" onClick={handleCancelRaceEdit} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="section-action-button" onClick={handleOpenCreateRace}>+ Create Race</button>
        </div>
        {races.length === 0 && <p style={{ color: '#888' }}>No races registered.</p>}
        <div style={gridStyle}>
          {races.map(r => (
            <div key={r.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{r.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.4rem' }}>{r.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><strong>Features:</strong> {r.racialFeats?.length || 0}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditRace(r)} className="section-action-button" style={cardBtnStyle}>Edit</button>
                <button type="button" onClick={() => handleDeleteRace(r.id!)} className="sheet-delete-button" style={cardBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCharactersTab = () => {
    if (charactersLoading) return <p>Loading characters...</p>
    return (
      <>
        {characters.length === 0 && <p style={{ color: '#888' }}>No characters registered.</p>}
        <div style={gridStyle}>
          {characters.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Player:</strong> {c.user?.username ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Campaign:</strong> {(c.campaign as { name?: string } | null)?.name ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Race:</strong> {c.race?.name ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <strong>Alignment:</strong> {c.alignment || '—'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditCharacter(c)} className="section-action-button" style={cardBtnStyle}>Edit</button>
                <button type="button" onClick={() => handleDeleteCharacter(c.id)} className="sheet-delete-button" style={cardBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderUsersTab = () => {
    if (usersLoading) return <p>Loading users...</p>
    return (
      <>
        {users.length === 0 && <p style={{ color: '#888' }}>No users registered.</p>}
        <div style={gridStyle}>
          {users.map(u => (
            <div key={u.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{u.username}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>{u.email}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <strong>Role:</strong> {u.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditUser(u)} className="section-action-button" style={cardBtnStyle}>Edit</button>
                <button type="button" onClick={() => handleDeleteUser(u.id)} className="sheet-delete-button" style={cardBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCampaignsTab = () => {
    if (campaignsLoading) return <p>Loading campaigns...</p>
    return (
      <>
        {campaignsList.length === 0 && <p style={{ color: '#888' }}>No campaigns registered.</p>}
        <div style={gridStyle}>
          {campaignsList.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>{c.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <strong>Privacy:</strong> {c.privacy ? 'Private' : 'Public'}
              </p>
              {c.joinCode && (
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <strong>Código:</strong> {c.joinCode}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditCampaign(c)} className="section-action-button" style={cardBtnStyle}>Edit</button>
                <button type="button" onClick={() => handleDeleteCampaign(c.id)} className="sheet-delete-button" style={cardBtnStyle}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <header className="app-header">
        <h1 onClick={onBack} style={{ cursor: 'pointer' }}>D&D Manager — Admin Panel</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div style={{ padding: '1.5rem 2rem' }}>
        <button className="link-button" onClick={onBack}>← Back to home</button>

        {/* Feedback banner */}
        {feedback && (
          <div className={`status-banner ${feedback.type === 'success' ? 'success-banner' : 'error-banner'}`}
            role="status" style={{ marginTop: '1rem' }}>
            <span>{feedback.message}</span>
            <button type="button" className="banner-dismiss-button" onClick={() => setFeedback(null)} aria-label="Dismiss feedback">x</button>
          </div>
        )}

        {/* Confirm modal */}
        {confirmModal && (
          <div style={overlayStyle}>
            <div style={{ ...modalStyle, maxWidth: '420px' }}>
              <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setConfirmModal(null)} style={cancelBtnStyle}>Cancel</button>
                <button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }} className="sheet-delete-button" style={{ padding: '0.5rem 1.25rem' }}>Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modals */}
        {renderCharacterEditForm()}
        {renderUserEditForm()}
        {renderCampaignEditForm()}
        {renderFeatureEditModal()}

        {/* Tabs nav */}
        <nav role="tablist" aria-label="Admin sections" style={{ display: 'flex', gap: '0', marginTop: '1.5rem', borderBottom: '2px solid var(--color-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                padding: '0.65rem 1.25rem',
                border: 'none',
                borderBottom: activeTab === tab.key ? '3px solid var(--color-accent, #6d4fc2)' : '3px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                color: activeTab === tab.key ? 'var(--color-accent, #6d4fc2)' : 'var(--color-foreground)',
                fontSize: '0.95rem',
                transition: 'border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div role="tabpanel" style={{ marginTop: '1.5rem' }}>
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

// ── Style constants ────────────────────────────────────────────────────────────
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '1rem',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '1rem',
  backgroundColor: 'var(--color-surface)',
}

const cardBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.45rem',
  fontSize: '0.85rem',
}

const sectionCardStyle: React.CSSProperties = {
  marginTop: '1.5rem',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  padding: '2rem',
  backgroundColor: 'var(--color-surface)',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)', borderRadius: '8px',
  padding: '2rem', maxWidth: '520px', width: '90%',
  border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  maxHeight: '90vh', overflowY: 'auto',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '4px',
  border: '1px solid var(--color-border)', cursor: 'pointer',
  background: 'none',
}

const rowItemStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '0.4rem', padding: '0.4rem 0.5rem',
  background: 'rgba(0,0,0,0.03)', borderRadius: '4px',
}

const editIconStyle: React.CSSProperties = {
  color: '#ffffff',
  backgroundColor: '#2563eb',
  border: '1px solid #1d4ed8',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  width: '30px',
  height: '30px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}

const deleteIconStyle: React.CSSProperties = {
  color: '#ffffff',
  backgroundColor: '#dc2626',
  border: '1px solid #b91c1c',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '1rem',
  width: '30px',
  height: '30px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}
