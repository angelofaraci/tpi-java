import { useState, useEffect } from 'react'
import { api, type DndClassDto, type RaceDto } from '../services/api'
import '../styles/CharacterSheet.css'

interface AdminPanelProps {
  onBack: () => void
  onLogout: () => void
}

type EditMode = 'none' | 'create-class' | 'edit-class' | 'create-race' | 'edit-race'

export function AdminPanel({ onBack, onLogout }: AdminPanelProps) {
  const [classes, setClasses] = useState<DndClassDto[]>([])
  const [races, setRaces] = useState<RaceDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('none')
  const [editingClass, setEditingClass] = useState<DndClassDto | null>(null)
  const [editingRace, setEditingRace] = useState<RaceDto | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Form states for class
  const [className, setClassName] = useState('')
  const [classDescription, setClassDescription] = useState('')
  const [classHitDice, setClassHitDice] = useState(6)
  const [levelCharacteristics, setLevelCharacteristics] = useState<Record<number, string>>({})
  const [newLevel, setNewLevel] = useState(1)
  const [newFeature, setNewFeature] = useState('')

  // Form states for race
  const [raceName, setRaceName] = useState('')
  const [raceDescription, setRaceDescription] = useState('')
  const [racialFeats, setRacialFeats] = useState<string[]>([])
  const [newRacialFeat, setNewRacialFeat] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [classesData, racesData] = await Promise.all([
        api.classes.findAll(),
        api.races.findAll(),
      ])
      setClasses(classesData as DndClassDto[])
      setRaces(racesData as RaceDto[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const resetClassForm = () => {
    setClassName('')
    setClassDescription('')
    setClassHitDice(6)
    setLevelCharacteristics({})
    setNewLevel(1)
    setNewFeature('')
    setEditingClass(null)
  }

  const resetRaceForm = () => {
    setRaceName('')
    setRaceDescription('')
    setRacialFeats([])
    setNewRacialFeat('')
    setEditingRace(null)
  }

  const handleOpenCreateClass = () => {
    resetClassForm()
    setEditMode('create-class')
  }

  const handleOpenEditClass = (dndClass: DndClassDto) => {
    setEditingClass(dndClass)
    setClassName(dndClass.name)
    setClassDescription(dndClass.description)
    setClassHitDice(dndClass.hitDice)
    setLevelCharacteristics(dndClass.levelCharacteristics || {})
    setEditMode('edit-class')
  }

  const handleOpenCreateRace = () => {
    resetRaceForm()
    setEditMode('create-race')
  }

  const handleOpenEditRace = (race: RaceDto) => {
    setEditingRace(race)
    setRaceName(race.name)
    setRaceDescription(race.description)
    setRacialFeats(race.racialFeats || [])
    setEditMode('edit-race')
  }

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm })
  }

  const handleCancelEdit = () => {
    setEditMode('none')
    resetClassForm()
    resetRaceForm()
    setFeedback(null)
  }

  const handleAddLevelCharacteristic = () => {
    if (newLevel > 0 && newFeature.trim()) {
      setLevelCharacteristics((prev) => ({ ...prev, [newLevel]: newFeature.trim() }))
      setNewLevel(newLevel + 1)
      setNewFeature('')
    }
  }

  const handleRemoveLevelCharacteristic = (level: number) => {
    showConfirm(`Remove level ${level} characteristic?`, () => {
      setLevelCharacteristics((prev) => {
        const updated = { ...prev }
        delete updated[level]
        return updated
      })
    })
  }

  const handleAddRacialFeat = () => {
    if (newRacialFeat.trim() && !racialFeats.includes(newRacialFeat.trim())) {
      setRacialFeats((prev) => [...prev, newRacialFeat.trim()])
      setNewRacialFeat('')
    }
  }

  const handleRemoveRacialFeat = (index: number) => {
    const featName = racialFeats[index]
    showConfirm(`Remove racial feature "${featName}"?`, () => {
      setRacialFeats((prev) => prev.filter((_, i) => i !== index))
    })
  }

  const handleSaveClass = async () => {
    try {
      const payload: DndClassDto = {
        name: className,
        description: classDescription,
        hitDice: classHitDice,
        levelCharacteristics,
      }

      if (editMode === 'create-class') {
        await api.admin.classes.create(payload)
        setFeedback({ message: 'Class created successfully', type: 'success' })
      } else if (editMode === 'edit-class' && editingClass) {
        await api.admin.classes.update(editingClass.id!, payload)
        setFeedback({ message: 'Class updated successfully', type: 'success' })
      }

      await loadData()
      handleCancelEdit()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save class'
      setFeedback({ message: 'Error: ' + errorMsg, type: 'error' })
    }
  }

  const handleDeleteClass = async (id: number) => {
    const name = classes.find(c => c.id === id)?.name || 'this class'
    showConfirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.classes.delete(id)
        setFeedback({ message: 'Class deleted successfully', type: 'success' })
        await loadData()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete class'
        setFeedback({ message: 'Error: ' + errorMsg, type: 'error' })
      }
    })
  }

  const handleSaveRace = async () => {
    try {
      const payload: RaceDto = {
        name: raceName,
        description: raceDescription,
        racialFeats,
      }

      if (editMode === 'create-race') {
        await api.admin.races.create(payload)
        setFeedback({ message: 'Race created successfully', type: 'success' })
      } else if (editMode === 'edit-race' && editingRace) {
        await api.admin.races.update(editingRace.id!, payload)
        setFeedback({ message: 'Race updated successfully', type: 'success' })
      }

      await loadData()
      handleCancelEdit()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save race'
      setFeedback({ message: 'Error: ' + errorMsg, type: 'error' })
    }
  }

  const handleDeleteRace = async (id: number) => {
    const name = races.find(r => r.id === id)?.name || 'this race'
    showConfirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`, async () => {
      try {
        await api.admin.races.delete(id)
        setFeedback({ message: 'Race deleted successfully', type: 'success' })
        await loadData()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete race'
        setFeedback({ message: 'Error: ' + errorMsg, type: 'error' })
      }
    })
  }

  if (loading) {
    return <div className="loading-container">Loading admin panel...</div>
  }

  if (editMode !== 'none') {
    const isClass = editMode === 'create-class' || editMode === 'edit-class'
    const isCreate = editMode === 'create-class' || editMode === 'create-race'

    return (
      <div>
        <header className="app-header">
          <h1>D&D Manager - Admin</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <button className="link-button" onClick={handleCancelEdit}>← Back to Admin Panel</button>
            
            <div style={{ 
              marginTop: '2rem',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '2rem',
              backgroundColor: 'var(--color-surface)'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
                {isCreate ? 'Create' : 'Edit'} {isClass ? 'Class' : 'Race'}
              </h2>
              {error && <div className="error-message">{error}</div>}

            {isClass ? (
              <div>
                {/* Basic Info Section */}
                <div style={{ 
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-foreground)' }}>Basic Information</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                    <textarea
                      value={classDescription}
                      onChange={(e) => setClassDescription(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Hit Dice</label>
                    <input
                      type="number"
                      value={classHitDice}
                      onChange={(e) => setClassHitDice(Number(e.target.value))}
                      min={1}
                      max={20}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>

                {/* Level Characteristics Section */}
                <div style={{ 
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-foreground)' }}>Level Characteristics</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      type="number"
                      placeholder="Level"
                      value={newLevel}
                      onChange={(e) => setNewLevel(Number(e.target.value))}
                      min={1}
                      max={20}
                      style={{ width: '80px', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                    <input
                      type="text"
                      placeholder="Feature description"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLevelCharacteristic()}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddLevelCharacteristic}
                      className="section-action-button"
                      style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
                    >
                      Add
                    </button>
                  </div>
                  
                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--color-surface)' }}>
                    {Object.entries(levelCharacteristics)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([level, feature]) => (
                        <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '4px' }}>
                          <span><strong>Level {level}:</strong> {feature}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLevelCharacteristic(Number(level))}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    {Object.keys(levelCharacteristics).length === 0 && (
                      <p style={{ color: '#666', textAlign: 'center', margin: '1rem 0' }}>No level characteristics added yet</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSaveClass}
                    className="section-action-button"
                    disabled={!className || !classDescription}
                  >
                    {isCreate ? 'Create Class' : 'Update Class'}
                  </button>
                  <button type="button" onClick={handleCancelEdit} style={{ padding: '0.5rem 1.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Basic Info Section */}
                <div style={{ 
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-foreground)' }}>Basic Information</h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
                    <input
                      type="text"
                      value={raceName}
                      onChange={(e) => setRaceName(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                  <div style={{ marginBottom: '0' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                    <textarea
                      value={raceDescription}
                      onChange={(e) => setRaceDescription(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>

                {/* Racial Features Section */}
                <div style={{ 
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--color-foreground)' }}>Racial Features</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Racial feature"
                      value={newRacialFeat}
                      onChange={(e) => setNewRacialFeat(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRacialFeat()}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddRacialFeat}
                      className="section-action-button"
                      style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', padding: '0.5rem', borderRadius: '4px', backgroundColor: 'var(--color-surface)' }}>
                    {racialFeats.map((feat, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.03)', borderRadius: '4px' }}>
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRacialFeat(index)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {racialFeats.length === 0 && (
                      <p style={{ color: '#666', textAlign: 'center', margin: '1rem 0' }}>No racial features added yet</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSaveRace}
                    className="section-action-button"
                    disabled={!raceName || !raceDescription}
                  >
                    {isCreate ? 'Create Race' : 'Update Race'}
                  </button>
                  <button type="button" onClick={handleCancelEdit} style={{ padding: '0.5rem 1.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )
  }

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager - Admin Panel</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      <div style={{ padding: '2rem' }}>
        <button className="link-button" onClick={onBack}>← Back to Home</button>

        {feedback && (
          <div className={`status-banner ${feedback.type === 'success' ? 'success-banner' : 'error-banner'}`} role="status" style={{ marginTop: '1rem' }}>
            <span>{feedback.message}</span>
            <button
              type="button"
              className="banner-dismiss-button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss feedback"
            >
              x
            </button>
          </div>
        )}

        {confirmModal && (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'var(--color-surface)', borderRadius: '8px',
              padding: '2rem', maxWidth: '420px', width: '90%',
              border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
              <p style={{ margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
                  className="sheet-delete-button"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

        {/* Classes Section */}
        <section className="content-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Classes</h2>
              <p className="section-subtitle">Manage D&D classes and their level characteristics</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateClass}>
              + Create Class
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {classes.map((dndClass) => (
              <div key={dndClass.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{dndClass.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>{dndClass.description}</p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  <strong>Hit Dice:</strong> d{dndClass.hitDice}
                </p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  <strong>Features:</strong> {Object.keys(dndClass.levelCharacteristics || {}).length} levels configured
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditClass(dndClass)}
                    className="section-action-button"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClass(dndClass.id!)}
                    className="sheet-delete-button"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Races Section */}
        <section className="content-section" style={{ marginTop: '2rem' }}>
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Races</h2>
              <p className="section-subtitle">Manage D&D races and their racial features</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateRace}>
              + Create Race
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {races.map((race) => (
              <div key={race.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{race.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>{race.description}</p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  <strong>Features:</strong> {race.racialFeats?.length || 0} racial features
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditRace(race)}
                    className="section-action-button"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRace(race.id!)}
                    className="sheet-delete-button"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
