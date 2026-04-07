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
  const [levelCharacteristics, setLevelCharacteristics] = useState<Record<number, string>>({})
  const [newLevel, setNewLevel] = useState(1)
  const [newFeature, setNewFeature] = useState('')

  // ── Races state ──────────────────────────────────────────────────────────────
  const [races, setRaces] = useState<RaceDto[]>([])
  const [racesLoading, setRacesLoading] = useState(false)
  const [raceEditMode, setRaceEditMode] = useState<RaceEditMode>('none')
  const [editingRace, setEditingRace] = useState<RaceDto | null>(null)
  const [raceName, setRaceName] = useState('')
  const [raceDescription, setRaceDescription] = useState('')
  const [racialFeats, setRacialFeats] = useState<string[]>([])
  const [newRacialFeat, setNewRacialFeat] = useState('')

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
    setFeedback({ message: e instanceof Error ? e.message : 'Error inesperado', type: 'error' })
  }

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm })
  }

  // ── Class handlers ───────────────────────────────────────────────────────────
  const resetClassForm = () => {
    setClassName(''); setClassDescription(''); setClassHitDice(6)
    setLevelCharacteristics({}); setNewLevel(1); setNewFeature('')
    setEditingClass(null)
  }

  const handleOpenCreateClass = () => { resetClassForm(); setClassEditMode('create') }

  const handleOpenEditClass = (c: DndClassDto) => {
    setEditingClass(c); setClassName(c.name); setClassDescription(c.description)
    setClassHitDice(c.hitDice); setLevelCharacteristics(c.levelCharacteristics || {})
    setClassEditMode('edit')
  }

  const handleCancelClassEdit = () => { setClassEditMode('none'); resetClassForm() }

  const handleAddLevelCharacteristic = () => {
    if (newLevel > 0 && newFeature.trim()) {
      setLevelCharacteristics(prev => ({ ...prev, [newLevel]: newFeature.trim() }))
      setNewLevel(newLevel + 1); setNewFeature('')
    }
  }

  const handleRemoveLevelCharacteristic = (level: number) => {
    showConfirm(`¿Eliminar característica del nivel ${level}?`, () => {
      setLevelCharacteristics(prev => { const u = { ...prev }; delete u[level]; return u })
    })
  }

  const handleSaveClass = async () => {
    try {
      const payload: DndClassDto = { name: className, description: classDescription, hitDice: classHitDice, levelCharacteristics }
      if (classEditMode === 'create') {
        await api.admin.classes.create(payload)
        setFeedback({ message: 'Clase creada correctamente', type: 'success' })
      } else if (editingClass) {
        await api.admin.classes.update(editingClass.id!, payload)
        setFeedback({ message: 'Clase actualizada correctamente', type: 'success' })
      }
      await loadClasses(); handleCancelClassEdit()
    } catch (e) { showError(e) }
  }

  const handleDeleteClass = async (id: number) => {
    const name = classes.find(c => c.id === id)?.name || 'esta clase'
    showConfirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.admin.classes.delete(id)
        setFeedback({ message: 'Clase eliminada', type: 'success' })
        await loadClasses()
      } catch (e) { showError(e) }
    })
  }

  // ── Race handlers ────────────────────────────────────────────────────────────
  const resetRaceForm = () => {
    setRaceName(''); setRaceDescription(''); setRacialFeats([]); setNewRacialFeat(''); setEditingRace(null)
  }

  const handleOpenCreateRace = () => { resetRaceForm(); setRaceEditMode('create') }

  const handleOpenEditRace = (r: RaceDto) => {
    setEditingRace(r); setRaceName(r.name); setRaceDescription(r.description)
    setRacialFeats(r.racialFeats || []); setRaceEditMode('edit')
  }

  const handleCancelRaceEdit = () => { setRaceEditMode('none'); resetRaceForm() }

  const handleAddRacialFeat = () => {
    if (newRacialFeat.trim() && !racialFeats.includes(newRacialFeat.trim())) {
      setRacialFeats(prev => [...prev, newRacialFeat.trim()]); setNewRacialFeat('')
    }
  }

  const handleRemoveRacialFeat = (index: number) => {
    const feat = racialFeats[index]
    showConfirm(`¿Eliminar característica racial "${feat}"?`, () => {
      setRacialFeats(prev => prev.filter((_, i) => i !== index))
    })
  }

  const handleSaveRace = async () => {
    try {
      const payload: RaceDto = { name: raceName, description: raceDescription, racialFeats }
      if (raceEditMode === 'create') {
        await api.admin.races.create(payload)
        setFeedback({ message: 'Raza creada correctamente', type: 'success' })
      } else if (editingRace) {
        await api.admin.races.update(editingRace.id!, payload)
        setFeedback({ message: 'Raza actualizada correctamente', type: 'success' })
      }
      await loadRaces(); handleCancelRaceEdit()
    } catch (e) { showError(e) }
  }

  const handleDeleteRace = async (id: number) => {
    const name = races.find(r => r.id === id)?.name || 'esta raza'
    showConfirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.admin.races.delete(id)
        setFeedback({ message: 'Raza eliminada', type: 'success' })
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
      setFeedback({ message: 'Personaje actualizado correctamente', type: 'success' })
      setEditingCharacter(null)
      await loadCharacters()
    } catch (e) { showError(e) }
  }

  const handleDeleteCharacter = async (id: number) => {
    const name = characters.find(c => c.id === id)?.name || 'este personaje'
    showConfirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.admin.characters.delete(id)
        setFeedback({ message: 'Personaje eliminado', type: 'success' })
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
      setFeedback({ message: 'Usuario actualizado correctamente', type: 'success' })
      setEditingUser(null)
      await loadUsers()
    } catch (e) { showError(e) }
  }

  const handleDeleteUser = async (id: number) => {
    const name = users.find(u => u.id === id)?.username || 'este usuario'
    showConfirm(`¿Eliminar al usuario "${name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.admin.users.delete(id)
        setFeedback({ message: 'Usuario eliminado', type: 'success' })
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
      setFeedback({ message: 'Campaña actualizada correctamente', type: 'success' })
      setEditingCampaign(null)
      await loadCampaigns()
    } catch (e) { showError(e) }
  }

  const handleDeleteCampaign = async (id: number) => {
    const name = campaignsList.find(c => c.id === id)?.name || 'esta campaña'
    showConfirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await api.admin.campaigns.delete(id)
        setFeedback({ message: 'Campaña eliminada', type: 'success' })
        await loadCampaigns()
      } catch (e) { showError(e) }
    })
  }

  // ── Shared UI ────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'classes', label: 'Clases' },
    { key: 'races', label: 'Razas' },
    { key: 'characters', label: 'Personajes' },
    { key: 'users', label: 'Usuarios' },
    { key: 'campaigns', label: 'Campañas' },
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
          <h3 style={{ marginTop: 0 }}>Editar Personaje</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={charName} onChange={e => setCharName(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Alineamiento</label>
            <select style={inputStyle} value={charAlignment} onChange={e => setCharAlignment(e.target.value)}>
              <option value="">— Sin alineamiento —</option>
              {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Trasfondo</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
              value={charBackground} onChange={e => setCharBackground(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Raza</label>
            <select style={inputStyle} value={charRaceId} onChange={e => setCharRaceId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Sin cambiar —</option>
              {charCatalogRaces.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelCharacterEdit} style={cancelBtnStyle}>Cancelar</button>
            <button type="button" onClick={handleSaveCharacter} className="section-action-button">Guardar</button>
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
          <h3 style={{ marginTop: 0 }}>Editar Usuario</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={userUsername} onChange={e => setUserUsername(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nueva contraseña <span style={{ fontWeight: 'normal', color: '#888' }}>(dejar vacío para no cambiar)</span></label>
            <input style={inputStyle} type="password" placeholder="••••••••"
              value={userPassword} onChange={e => setUserPassword(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelUserEdit} style={cancelBtnStyle}>Cancelar</button>
            <button type="button" onClick={handleSaveUser} className="section-action-button">Guardar</button>
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
          <h3 style={{ marginTop: 0 }}>Editar Campaña</h3>
          <div style={fieldStyle}>
            <label style={labelStyle}>Nombre</label>
            <input style={inputStyle} value={campaignName} onChange={e => setCampaignName(e.target.value)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
              value={campaignDescription} onChange={e => setCampaignDescription(e.target.value)} />
          </div>
          <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="camp-privacy" checked={campaignPrivacy}
              onChange={e => setCampaignPrivacy(e.target.checked)} />
            <label htmlFor="camp-privacy" style={{ fontWeight: 'bold', marginBottom: 0 }}>Campaña privada</label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" onClick={handleCancelCampaignEdit} style={cancelBtnStyle}>Cancelar</button>
            <button type="button" onClick={handleSaveCampaign} className="section-action-button" disabled={!campaignName.trim()}>Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Classes tab with inline edit panel ───────────────────────────────────────
  const renderClassesTab = () => {
    if (classesLoading) return <p>Cargando clases...</p>
    if (classEditMode !== 'none') {
      const isCreate = classEditMode === 'create'
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="link-button" onClick={handleCancelClassEdit}>← Volver a Clases</button>
          <div style={sectionCardStyle}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>{isCreate ? 'Crear Clase' : 'Editar Clase'}</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={className} onChange={e => setClassName(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
                value={classDescription} onChange={e => setClassDescription(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Dado de Golpe</label>
              <input style={inputStyle} type="number" min={1} max={20}
                value={classHitDice} onChange={e => setClassHitDice(Number(e.target.value))} />
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0 }}>Características por nivel</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="number" placeholder="Nivel" value={newLevel} min={1} max={20}
                  onChange={e => setNewLevel(Number(e.target.value))}
                  style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <input type="text" placeholder="Característica" value={newFeature}
                  onChange={e => setNewFeature(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddLevelCharacteristic()}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <button type="button" onClick={handleAddLevelCharacteristic} className="section-action-button" style={{ padding: '0.4rem 0.75rem' }}>Agregar</button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(levelCharacteristics).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, feat]) => (
                  <div key={lvl} style={rowItemStyle}>
                    <span><strong>Nivel {lvl}:</strong> {feat}</span>
                    <button type="button" onClick={() => handleRemoveLevelCharacteristic(Number(lvl))} style={deleteIconStyle}>✕</button>
                  </div>
                ))}
                {Object.keys(levelCharacteristics).length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>Sin características configuradas</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" onClick={handleSaveClass} className="section-action-button" disabled={!className || !classDescription}>
                {isCreate ? 'Crear Clase' : 'Actualizar Clase'}
              </button>
              <button type="button" onClick={handleCancelClassEdit} style={cancelBtnStyle}>Cancelar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="section-action-button" onClick={handleOpenCreateClass}>+ Crear Clase</button>
        </div>
        {classes.length === 0 && <p style={{ color: '#888' }}>No hay clases registradas.</p>}
        <div style={gridStyle}>
          {classes.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.4rem' }}>{c.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}><strong>Hit Dice:</strong> d{c.hitDice}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><strong>Niveles:</strong> {Object.keys(c.levelCharacteristics || {}).length} configurados</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditClass(c)} className="section-action-button" style={cardBtnStyle}>Editar</button>
                <button type="button" onClick={() => handleDeleteClass(c.id!)} className="sheet-delete-button" style={cardBtnStyle}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderRacesTab = () => {
    if (racesLoading) return <p>Cargando razas...</p>
    if (raceEditMode !== 'none') {
      const isCreate = raceEditMode === 'create'
      return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button className="link-button" onClick={handleCancelRaceEdit}>← Volver a Razas</button>
          <div style={sectionCardStyle}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>{isCreate ? 'Crear Raza' : 'Editar Raza'}</h2>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={raceName} onChange={e => setRaceName(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
                value={raceDescription} onChange={e => setRaceDescription(e.target.value)} />
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0 }}>Características Raciales</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" placeholder="Característica racial" value={newRacialFeat}
                  onChange={e => setNewRacialFeat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRacialFeat()}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                <button type="button" onClick={handleAddRacialFeat} className="section-action-button" style={{ padding: '0.4rem 0.75rem' }}>Agregar</button>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {racialFeats.map((feat, i) => (
                  <div key={i} style={rowItemStyle}>
                    <span>{feat}</span>
                    <button type="button" onClick={() => handleRemoveRacialFeat(i)} style={deleteIconStyle}>✕</button>
                  </div>
                ))}
                {racialFeats.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>Sin características raciales</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" onClick={handleSaveRace} className="section-action-button" disabled={!raceName || !raceDescription}>
                {isCreate ? 'Crear Raza' : 'Actualizar Raza'}
              </button>
              <button type="button" onClick={handleCancelRaceEdit} style={cancelBtnStyle}>Cancelar</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="section-action-button" onClick={handleOpenCreateRace}>+ Crear Raza</button>
        </div>
        {races.length === 0 && <p style={{ color: '#888' }}>No hay razas registradas.</p>}
        <div style={gridStyle}>
          {races.map(r => (
            <div key={r.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{r.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.4rem' }}>{r.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><strong>Características:</strong> {r.racialFeats?.length || 0}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditRace(r)} className="section-action-button" style={cardBtnStyle}>Editar</button>
                <button type="button" onClick={() => handleDeleteRace(r.id!)} className="sheet-delete-button" style={cardBtnStyle}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCharactersTab = () => {
    if (charactersLoading) return <p>Cargando personajes...</p>
    return (
      <>
        {characters.length === 0 && <p style={{ color: '#888' }}>No hay personajes registrados.</p>}
        <div style={gridStyle}>
          {characters.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Jugador:</strong> {c.user?.username ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Campaña:</strong> {(c.campaign as { name?: string } | null)?.name ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>
                <strong>Raza:</strong> {c.race?.name ?? '—'}
              </p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <strong>Alineamiento:</strong> {c.alignment || '—'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditCharacter(c)} className="section-action-button" style={cardBtnStyle}>Editar</button>
                <button type="button" onClick={() => handleDeleteCharacter(c.id)} className="sheet-delete-button" style={cardBtnStyle}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderUsersTab = () => {
    if (usersLoading) return <p>Cargando usuarios...</p>
    return (
      <>
        {users.length === 0 && <p style={{ color: '#888' }}>No hay usuarios registrados.</p>}
        <div style={gridStyle}>
          {users.map(u => (
            <div key={u.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{u.username}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>{u.email}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <strong>Rol:</strong> {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Usuario'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditUser(u)} className="section-action-button" style={cardBtnStyle}>Editar</button>
                <button type="button" onClick={() => handleDeleteUser(u.id)} className="sheet-delete-button" style={cardBtnStyle}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const renderCampaignsTab = () => {
    if (campaignsLoading) return <p>Cargando campañas...</p>
    return (
      <>
        {campaignsList.length === 0 && <p style={{ color: '#888' }}>No hay campañas registradas.</p>}
        <div style={gridStyle}>
          {campaignsList.map(c => (
            <div key={c.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#777', marginBottom: '0.25rem' }}>{c.description}</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <strong>Privacidad:</strong> {c.privacy ? 'Privada' : 'Pública'}
              </p>
              {c.joinCode && (
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <strong>Código:</strong> {c.joinCode}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleOpenEditCampaign(c)} className="section-action-button" style={cardBtnStyle}>Editar</button>
                <button type="button" onClick={() => handleDeleteCampaign(c.id)} className="sheet-delete-button" style={cardBtnStyle}>Eliminar</button>
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
        <h1>D&D Manager — Panel de Admin</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>

      <div style={{ padding: '1.5rem 2rem' }}>
        <button className="link-button" onClick={onBack}>← Volver al inicio</button>

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
                <button type="button" onClick={() => setConfirmModal(null)} style={cancelBtnStyle}>Cancelar</button>
                <button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }} className="sheet-delete-button" style={{ padding: '0.5rem 1.25rem' }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modals */}
        {renderCharacterEditForm()}
        {renderUserEditForm()}
        {renderCampaignEditForm()}

        {/* Tabs nav */}
        <nav role="tablist" aria-label="Admin sections" style={{ display: 'flex', gap: '0', marginTop: '1.5rem', borderBottom: '2px solid var(--color-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
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

const deleteIconStyle: React.CSSProperties = {
  color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem',
}
