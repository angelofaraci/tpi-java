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
  const [feedback, setFeedback] = useState<string | null>(null)

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
    setLevelCharacteristics((prev) => {
      const updated = { ...prev }
      delete updated[level]
      return updated
    })
  }

  const handleAddRacialFeat = () => {
    if (newRacialFeat.trim() && !racialFeats.includes(newRacialFeat.trim())) {
      setRacialFeats((prev) => [...prev, newRacialFeat.trim()])
      setNewRacialFeat('')
    }
  }

  const handleRemoveRacialFeat = (index: number) => {
    setRacialFeats((prev) => prev.filter((_, i) => i !== index))
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
        setFeedback('Class created successfully')
      } else if (editMode === 'edit-class' && editingClass) {
        await api.admin.classes.update(editingClass.id!, payload)
        setFeedback('Class updated successfully')
      }

      await loadData()
      handleCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class')
    }
  }

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      await api.admin.classes.delete(id)
      setFeedback('Class deleted successfully')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete class')
    }
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
        setFeedback('Race created successfully')
      } else if (editMode === 'edit-race' && editingRace) {
        await api.admin.races.update(editingRace.id!, payload)
        setFeedback('Race updated successfully')
      }

      await loadData()
      handleCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save race')
    }
  }

  const handleDeleteRace = async (id: number) => {
    if (!confirm('Are you sure you want to delete this race?')) return

    try {
      await api.admin.races.delete(id)
      setFeedback('Race deleted successfully')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete race')
    }
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
        <div style={{ padding: '2rem' }}>
          <button className="link-button" onClick={handleCancelEdit}>← Back to Admin Panel</button>
          
          <div style={{ marginTop: '2rem', maxWidth: '600px' }}>
            <h2>{isCreate ? 'Create' : 'Edit'} {isClass ? 'Class' : 'Race'}</h2>
            {error && <div className="error-message">{error}</div>}

            {isClass ? (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                  <textarea
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Hit Dice</label>
                  <input
                    type="number"
                    value={classHitDice}
                    onChange={(e) => setClassHitDice(Number(e.target.value))}
                    min={1}
                    max={20}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Level Characteristics</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      type="number"
                      placeholder="Level"
                      value={newLevel}
                      onChange={(e) => setNewLevel(Number(e.target.value))}
                      min={1}
                      max={20}
                      style={{ width: '80px', padding: '0.5rem', fontSize: '1rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Feature description"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddLevelCharacteristic()}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddLevelCharacteristic}
                      style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
                    >
                      Add
                    </button>
                  </div>
                  
                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem' }}>
                    {Object.entries(levelCharacteristics)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([level, feature]) => (
                        <div key={level} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0.5rem', background: '#f5f5f5' }}>
                          <span><strong>Level {level}:</strong> {feature}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLevelCharacteristic(Number(level))}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    {Object.keys(levelCharacteristics).length === 0 && (
                      <p style={{ color: '#666', textAlign: 'center' }}>No level characteristics added yet</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveClass}
                    className="section-action-button"
                    disabled={!className || !classDescription}
                  >
                    {isCreate ? 'Create Class' : 'Update Class'}
                  </button>
                  <button type="button" onClick={handleCancelEdit} style={{ padding: '0.5rem 1rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Name</label>
                  <input
                    type="text"
                    value={raceName}
                    onChange={(e) => setRaceName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                  <textarea
                    value={raceDescription}
                    onChange={(e) => setRaceDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Racial Features</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      type="text"
                      placeholder="Racial feature"
                      value={newRacialFeat}
                      onChange={(e) => setNewRacialFeat(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddRacialFeat()}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddRacialFeat}
                      style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}
                    >
                      Add
                    </button>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '0.5rem' }}>
                    {racialFeats.map((feat, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0.5rem', background: '#f5f5f5' }}>
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRacialFeat(index)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {racialFeats.length === 0 && (
                      <p style={{ color: '#666', textAlign: 'center' }}>No racial features added yet</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveRace}
                    className="section-action-button"
                    disabled={!raceName || !raceDescription}
                  >
                    {isCreate ? 'Create Race' : 'Update Race'}
                  </button>
                  <button type="button" onClick={handleCancelEdit} style={{ padding: '0.5rem 1rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
          <div className="status-banner success-banner" role="status" style={{ marginTop: '1rem' }}>
            <span>{feedback}</span>
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
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClass(dndClass.id!)}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}
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
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRace(race.id!)}
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', color: '#ef4444' }}
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
