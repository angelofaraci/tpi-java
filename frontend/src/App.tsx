import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { Login } from './pages/Login'
import { DemoLanding } from './pages/DemoLanding'
import { DemoCampaignDetail } from './pages/DemoCampaignDetail'
import { Characters } from './pages/Characters'
import { CreateCampaign } from './pages/CreateCampaign'
import { CreateCharacter } from './pages/CreateCharacter'
import { ViewCampaign } from './pages/ViewCampaign'
import { AdminPanel } from './pages/AdminPanel'
import { CopyCodeButton } from './components/CopyCodeButton'
import { api } from './services/api'
import type { OwnedCampaignSummary, PlayerCampaignSummary, PublicCampaignSummary } from './interfaces/campaign'
import type { Character, HydratedCharacterEditData, LevelRecord } from './interfaces/character'
import type { User } from './interfaces/user'
import { hydrateCharacterEditData } from './utils/characterDraft'
import './styles/CharacterSheet.css'

type View = 'home' | 'character-sheet' | 'create-campaign' | 'create-character' | 'view-campaign' | 'admin' | 'view-character-readonly'
type CharacterFormMode = 'create' | 'edit'
type CharacterReturnView = 'home' | 'character-sheet'
type AuthView = 'demo' | 'login'

interface CharacterCard {
  id: number
  name?: string
  level?: number
  alignment?: string
  race?: {
    name?: string
  }
}

interface DeleteDialogState {
  characterId: number
  characterName: string
}

interface DeleteCampaignDialogState {
  campaignId: number
  campaignName: string
}

interface JoinCodeDialogState {
  campaignName: string
  joinCode: string
}

function formatCampaignStartDate(creationDate?: string) {
  if (!creationDate) {
    return 'Campaign start date unavailable'
  }

  const parsedDate = new Date(creationDate)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Campaign start date unavailable'
  }

  return `Campaign Started ${parsedDate.toLocaleDateString('en-US', { timeZone: 'UTC' })}`
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState<'ROLE_USER' | 'ROLE_ADMIN' | null>(null)
  const [view, setView] = useState<View>('home')
  const [characters, setCharacters] = useState<CharacterCard[]>([])
  const [campaigns, setCampaigns] = useState<OwnedCampaignSummary[]>([])
  const [playerCampaigns, setPlayerCampaigns] = useState<PlayerCampaignSummary[]>([])
  const [publicCampaigns, setPublicCampaigns] = useState<PublicCampaignSummary[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingPlayerCampaigns, setLoadingPlayerCampaigns] = useState(false)
  const [loadingPublicCampaigns, setLoadingPublicCampaigns] = useState(false)
  const [deletingCharacterId, setDeletingCharacterId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)
  const [readOnlyCharacterId, setReadOnlyCharacterId] = useState<number | null>(null)
  const [deletingCampaignId, setDeletingCampaignId] = useState<number | null>(null)
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState<DeleteCampaignDialogState | null>(null)
  const [joinCodeDialog, setJoinCodeDialog] = useState<JoinCodeDialogState | null>(null)
  const [campaignViewError, setCampaignViewError] = useState<string | null>(null)
  const [campaignViewFeedback, setCampaignViewFeedback] = useState<string | null>(null)
  const [charactersError, setCharactersError] = useState<string | null>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [playerCampaignsError, setPlayerCampaignsError] = useState<string | null>(null)
  const [publicCampaignsError, setPublicCampaignsError] = useState<string | null>(null)
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null)
  const [characterSheetFeedback, setCharacterSheetFeedback] = useState<string | null>(null)
  const [characterFormMode, setCharacterFormMode] = useState<CharacterFormMode>('create')
  const [characterReturnView, setCharacterReturnView] = useState<CharacterReturnView>('home')
  const [editCharacterData, setEditCharacterData] = useState<HydratedCharacterEditData | null>(null)
  const [characterSheetRefreshToken, setCharacterSheetRefreshToken] = useState(0)
  const [authView, setAuthView] = useState<AuthView>('demo')
  const [demoCharacterId, setDemoCharacterId] = useState<number | null>(null)
  const [demoCampaignId, setDemoCampaignId] = useState<number | null>(null)
  const currentUserIdRef = useRef<number | null>(null)
  const latestCharacterRequestId = useRef(0)
  const latestCampaignRequestId = useRef(0)
  const latestPlayerCampaignRequestId = useRef(0)
  const latestPublicCampaignRequestId = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  const loadCharacters = useCallback(async () => {
    const requestId = latestCharacterRequestId.current + 1
    latestCharacterRequestId.current = requestId
    setLoadingCharacters(true)
    setCharactersError(null)

    try {
      let data: unknown
      let resolvedUserId: number | null = currentUserIdRef.current

      if (!resolvedUserId) {
        try {
          const user = await api.auth.me() as User
          const userIdNum = user.id ? Number(user.id) : null

          if (userIdNum) {
            resolvedUserId = userIdNum
            setCurrentUserId(userIdNum)
            setUserRole(user.role)
          }
        } catch (meErr) {
          console.warn('Failed to resolve authenticated user, falling back to all characters', meErr)
        }
      }

      if (resolvedUserId) {
        data = await api.characters.findByUserId(resolvedUserId)
      } else {
        data = await api.characters.findAll()
      }

      if (requestId !== latestCharacterRequestId.current) {
        return
      }

      setCharacters(Array.isArray(data) ? (data as CharacterCard[]) : [])
    } catch (err: unknown) {
      if (requestId !== latestCharacterRequestId.current) {
        return
      }

      setCharactersError(err instanceof Error ? err.message : 'Failed to load characters')
    } finally {
      if (requestId === latestCharacterRequestId.current) {
        setLoadingCharacters(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    void loadCharacters()
  }, [isAuthenticated, loadCharacters])

  const loadCampaigns = useCallback(async () => {
    const requestId = latestCampaignRequestId.current + 1
    latestCampaignRequestId.current = requestId
    setLoadingCampaigns(true)
    setCampaignsError(null)

    try {
      const data = await api.campaigns.findMine()

      if (requestId !== latestCampaignRequestId.current) {
        return
      }

      setCampaigns(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (requestId !== latestCampaignRequestId.current) {
        return
      }

      setCampaignsError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      if (requestId === latestCampaignRequestId.current) {
        setLoadingCampaigns(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    loadCampaigns()
  }, [isAuthenticated, loadCampaigns])

  const loadPlayerCampaigns = useCallback(async () => {
    const requestId = latestPlayerCampaignRequestId.current + 1
    latestPlayerCampaignRequestId.current = requestId
    setLoadingPlayerCampaigns(true)
    setPlayerCampaignsError(null)

    try {
      const data = await api.campaigns.findAsPlayer()

      if (requestId !== latestPlayerCampaignRequestId.current) {
        return
      }

      setPlayerCampaigns(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (requestId !== latestPlayerCampaignRequestId.current) {
        return
      }

      setPlayerCampaignsError(err instanceof Error ? err.message : 'Failed to load player campaigns')
    } finally {
      if (requestId === latestPlayerCampaignRequestId.current) {
        setLoadingPlayerCampaigns(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    void loadPlayerCampaigns()
  }, [isAuthenticated, loadPlayerCampaigns])

  const loadPublicCampaigns = useCallback(async () => {
    const requestId = latestPublicCampaignRequestId.current + 1
    latestPublicCampaignRequestId.current = requestId
    setLoadingPublicCampaigns(true)
    setPublicCampaignsError(null)

    try {
      const data = await api.campaigns.findAllPublic()

      if (requestId !== latestPublicCampaignRequestId.current) {
        return
      }

      setPublicCampaigns(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (requestId !== latestPublicCampaignRequestId.current) {
        return
      }

      setPublicCampaignsError(err instanceof Error ? err.message : 'Failed to load public campaigns')
    } finally {
      if (requestId === latestPublicCampaignRequestId.current) {
        setLoadingPublicCampaigns(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    void loadPublicCampaigns()
  }, [isAuthenticated, loadPublicCampaigns])

  const handleLogout = () => {
    localStorage.removeItem('token')
    latestCharacterRequestId.current += 1
    latestCampaignRequestId.current += 1
    latestPlayerCampaignRequestId.current += 1
    latestPublicCampaignRequestId.current += 1
    setIsAuthenticated(false)
    setCurrentUserId(null)
    setUserRole(null)
    setView('home')
    setSelectedCharacterId(null)
    setSelectedCampaignId(null)
    setCharacters([])
    setCampaigns([])
    setPlayerCampaigns([])
    setPublicCampaigns([])
    setCampaignFeedback(null)
    setCharacterSheetFeedback(null)
    setCampaignViewFeedback(null)
    setCharactersError(null)
    setCampaignsError(null)
    setPublicCampaignsError(null)
    setCampaignViewError(null)
    setDeleteDialog(null)
    setDeleteCampaignDialog(null)
    setJoinCodeDialog(null)
    setCharacterFormMode('create')
    setCharacterReturnView('home')
    setEditCharacterData(null)
    setAuthView('demo')
    setDemoCharacterId(null)
    setDemoCampaignId(null)
  }

  const handleViewCharacter = (characterId: number) => {
    setSelectedCharacterId(characterId)
    setView('character-sheet')
  }

  const handleBackToHome = () => {
    setView('home')
    setSelectedCharacterId(null)
    setSelectedCampaignId(null)
    setReadOnlyCharacterId(null)
    setCharacterSheetFeedback(null)
    setCampaignViewFeedback(null)
    setCampaignViewError(null)
    setEditCharacterData(null)
    setCharacterReturnView('home')
  }

  const handleViewCampaign = (campaignId: number) => {
    setSelectedCampaignId(campaignId)
    setCampaignViewFeedback(null)
    setCampaignViewError(null)
    setView('view-campaign')
  }

  const handleViewCharacterReadOnly = (characterId: number) => {
    setReadOnlyCharacterId(characterId)
    setView('view-character-readonly')
  }

  const handleRequestDeleteCampaign = (campaignId: number, campaignName: string) => {
    setDeleteCampaignDialog({ campaignId, campaignName })
    setCampaignViewError(null)
  }

  const handleCloseDeleteCampaignDialog = () => {
    if (deletingCampaignId !== null) {
      return
    }

    setDeleteCampaignDialog(null)
  }

  const handleConfirmDeleteCampaign = async () => {
    if (!deleteCampaignDialog) {
      return
    }

    const { campaignId, campaignName } = deleteCampaignDialog

    setDeletingCampaignId(campaignId)
    setCampaignViewError(null)

    try {
      await api.campaigns.remove(campaignId)
      setDeleteCampaignDialog(null)
      setCampaigns((current) => current.filter((c) => c.id !== campaignId))

      if (selectedCampaignId === campaignId) {
        setSelectedCampaignId(null)
        setView('home')
        setCampaignViewFeedback(null)
      }

      setCampaignFeedback(`Campaign "${campaignName}" deleted successfully.`)
    } catch (err: unknown) {
      setCampaignViewError(err instanceof Error ? err.message : 'Failed to delete campaign')
    } finally {
      setDeletingCampaignId((currentId) => (currentId === campaignId ? null : currentId))
    }
  }

  const handleOpenCreateCampaign = () => {
    setCampaignFeedback(null)
    setView('create-campaign')
  }

  const handleOpenCreateCharacter = () => {
    setCampaignFeedback(null)
    setCharacterSheetFeedback(null)
    setCharacterFormMode('create')
    setCharacterReturnView('home')
    setEditCharacterData(null)
    setView('create-character')
  }

  const handleOpenAdminPanel = () => {
    setCampaignFeedback(null)
    setCharacterSheetFeedback(null)
    setView('admin')
  }

  const handleOpenEditCharacter = (nextEditData: HydratedCharacterEditData) => {
    setCampaignFeedback(null)
    setCharacterSheetFeedback(null)
    setSelectedCharacterId(nextEditData.characterId)
    setCharacterFormMode('edit')
    setCharacterReturnView('character-sheet')
    setEditCharacterData(nextEditData)
    setView('create-character')
  }

  const handleCancelCreateCampaign = () => {
    setView('home')
  }

  const handleCreateCampaignSuccess = async (result: { campaignName: string; joinCode?: string }) => {
    setView('home')

    // Intentamos obtener el joinCode desde la respuesta del POST primero.
    // Si no vino (backend issue), recargamos la lista via loadCampaigns (que anula peticiones anteriores)
    // y buscamos el joinCode por nombre en la lista fresca.
    let joinCode = result.joinCode

    if (!joinCode) {
      try {
        const requestId = latestCampaignRequestId.current + 1
        latestCampaignRequestId.current = requestId
        setLoadingCampaigns(true)
        setCampaignsError(null)

        const freshList = await api.campaigns.findMine()

        if (requestId === latestCampaignRequestId.current) {
          const match = Array.isArray(freshList)
            ? freshList.find((c) => c.name === result.campaignName)
            : undefined
          joinCode = match?.joinCode
          if (Array.isArray(freshList)) {
            setCampaigns(freshList)
          }
          setLoadingCampaigns(false)
        }
      } catch {
        void loadCampaigns()
      }
    } else {
      void loadCampaigns()
    }

    void loadPublicCampaigns()

    if (joinCode) {
      setJoinCodeDialog({ campaignName: result.campaignName, joinCode })
    } else {
      setCampaignFeedback(`Campaign "${result.campaignName}" created successfully. You are now the DM.`)
    }
  }

  const handleCancelCreateCharacter = () => {
    const shouldReturnToSheet = characterFormMode === 'edit' && characterReturnView === 'character-sheet' && selectedCharacterId

    setCharacterFormMode('create')
    setEditCharacterData(null)

    if (shouldReturnToSheet) {
      setView('character-sheet')
      return
    }

    setView('home')
  }

  const handleCreateCharacterSuccess = (result: { characterId?: number; characterName: string }) => {
    if (characterFormMode === 'edit') {
      const resolvedCharacterId = result.characterId ?? editCharacterData?.characterId ?? selectedCharacterId

      setCharacterFormMode('create')
      setEditCharacterData(null)
      setCharacterSheetFeedback(`Character "${result.characterName}" updated successfully.`)

      if (resolvedCharacterId) {
        setSelectedCharacterId(resolvedCharacterId)
      }

      setCharacterSheetRefreshToken((current) => current + 1)
      setView(characterReturnView)
      void loadCharacters()
      return
    }

    setView('home')
    setCampaignFeedback(`Character "${result.characterName}" created successfully.`)
    void loadCharacters()
  }

  const handleRequestDeleteCharacter = (characterId: number, characterName?: string) => {
    setDeleteDialog({
      characterId,
      characterName: characterName?.trim() || 'this character',
    })
    setCharactersError(null)
  }

  const handleCloseDeleteDialog = () => {
    if (deletingCharacterId !== null) {
      return
    }

    setDeleteDialog(null)
  }

  const handleConfirmDeleteCharacter = async () => {
    if (!deleteDialog) {
      return
    }

    const { characterId, characterName } = deleteDialog

    setDeletingCharacterId(characterId)
    setCharactersError(null)

    try {
      await api.characters.remove(characterId)
      setCharacters((currentCharacters) => currentCharacters.filter((character) => character.id !== characterId))
      setDeleteDialog(null)

        if (selectedCharacterId === characterId) {
          setSelectedCharacterId(null)
          setView('home')
          setCharacterSheetFeedback(null)
        }

      setCampaignFeedback(`Character "${characterName}" deleted successfully.`)
    } catch (err: unknown) {
      setCharactersError(err instanceof Error ? err.message : 'Failed to delete character')
    } finally {
      setDeletingCharacterId((currentId) => (currentId === characterId ? null : currentId))
    }
  }

  const handleEditCharacterFromCampaign = async (characterId: number) => {
    try {
      const [characterData, levelsResponse] = await Promise.all([
        api.characters.findById(characterId),
        api.levels.findAll().catch(() => []),
      ])
      if (!characterData || typeof characterData !== 'object') return

      const characterPayload = characterData as Partial<Character> & Record<string, unknown>
      const mappedData: Character = {
        id: characterPayload.id ?? characterId,
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
      const hydratedData: HydratedCharacterEditData = hydrateCharacterEditData(mappedData, normalizedLevels)
      handleOpenEditCharacter(hydratedData)
    } catch (err: unknown) {
      console.error('Failed to load character for editing:', err)
    }
  }

  let content

  if (!isAuthenticated) {
    if (authView === 'login') {
      content = (
        <Login
          onAuthSuccess={() => {
            setIsAuthenticated(true)
            setView('home')
            setCampaignFeedback(null)
            setAuthView('demo')
            setDemoCharacterId(null)
            setDemoCampaignId(null)
          }}
        />
      )
    } else if (demoCharacterId) {
      content = (
        <Characters
          characterId={demoCharacterId}
          source="demo"
          onBack={() => setDemoCharacterId(null)}
          onEditCharacter={() => {}}
          onLogout={() => setDemoCharacterId(null)}
          onDeleteCharacter={() => {}}
          deletingCharacterId={null}
          deleteError={null}
        />
      )
    } else if (demoCampaignId) {
      content = (
        <DemoCampaignDetail
          campaignId={demoCampaignId}
          onBack={() => setDemoCampaignId(null)}
          onSelectCharacter={(characterId) => setDemoCharacterId(characterId)}
        />
      )
    } else {
      content = (
        <DemoLanding
          onLoginRequest={() => setAuthView('login')}
          onSelectCharacter={(characterId) => setDemoCharacterId(characterId)}
          onSelectCampaign={(campaignId) => setDemoCampaignId(campaignId)}
        />
      )
    }
  } else if (view === 'character-sheet' && selectedCharacterId) {
    content = (
      <Characters
        characterId={selectedCharacterId}
        onBack={handleBackToHome}
        onEditCharacter={handleOpenEditCharacter}
        onLogout={handleLogout}
        onDeleteCharacter={handleRequestDeleteCharacter}
        onViewCampaign={handleViewCampaign}
        deletingCharacterId={deletingCharacterId}
        deleteError={charactersError}
        feedback={characterSheetFeedback}
        onDismissFeedback={() => setCharacterSheetFeedback(null)}
        refreshToken={characterSheetRefreshToken}
      />
    )
  } else if (view === 'create-campaign') {
    content = (
      <CreateCampaign
        onCancel={handleCancelCreateCampaign}
        onLogout={handleLogout}
        onSuccess={handleCreateCampaignSuccess}
      />
    )
  } else if (view === 'admin') {
    content = (
      <AdminPanel
        onBack={handleBackToHome}
        onLogout={handleLogout}
      />
    )
  } else if (view === 'view-campaign' && selectedCampaignId) {
    const isDungeonMaster = campaigns.some((c) => c.id === selectedCampaignId)
    content = (
      <ViewCampaign
        campaignId={selectedCampaignId}
        isDungeonMaster={isDungeonMaster}
        onBack={handleBackToHome}
        onLogout={handleLogout}
        onDeleteCampaign={handleRequestDeleteCampaign}
        deletingCampaignId={deletingCampaignId}
        deleteError={campaignViewError}
        feedback={campaignViewFeedback}
        onDismissFeedback={() => setCampaignViewFeedback(null)}
        onViewCharacter={handleViewCharacterReadOnly}
        onEditCharacter={isDungeonMaster ? handleEditCharacterFromCampaign : undefined}
      />
    )
  } else if (view === 'create-character' && currentUserId) {
    content = (
      <CreateCharacter
        currentUserId={currentUserId}
        mode={characterFormMode}
        initialEditData={editCharacterData}
        onCancel={handleCancelCreateCharacter}
        onLogout={handleLogout}
        onSuccess={handleCreateCharacterSuccess}
      />
    )
  } else if (view === 'view-character-readonly' && readOnlyCharacterId) {
    content = (
      <Characters
        characterId={readOnlyCharacterId}
        readOnly
        onBack={() => {
          setReadOnlyCharacterId(null)
          setView('view-campaign')
        }}
        onEditCharacter={() => {}}
        onLogout={handleLogout}
        onDeleteCharacter={() => {}}
        deletingCharacterId={null}
        deleteError={null}
      />
    )
  } else {
    content = (
      <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {userRole === 'ROLE_ADMIN' && (
            <button onClick={handleOpenAdminPanel} className="section-action-button">
              Admin Panel
            </button>
          )}
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <div className="app-shell">
        {campaignFeedback && (
          <div className="status-banner success-banner" role="status">
            <span>{campaignFeedback}</span>
            <button
              type="button"
              className="banner-dismiss-button"
              onClick={() => setCampaignFeedback(null)}
              aria-label="Dismiss campaign feedback"
            >
              x
            </button>
          </div>
        )}

        {/* Characters Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Characters</h2>
              <p className="section-subtitle">Create a hero from the guided sheet-inspired flow or open an existing record.</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateCharacter}>
              + Create Character
            </button>
          </div>
          {loadingCharacters && <div className="loading-container">Loading characters...</div>}
          {charactersError && <div className="error-message">{charactersError}</div>}
          {!loadingCharacters && !charactersError && (
            <div className="entity-grid">
              {characters.length === 0 ? (
                <button type="button" className="campaign-create-card character-create-card" onClick={handleOpenCreateCharacter}>
                  <span className="campaign-create-badge">Hero</span>
                  <h3>Forge your first adventurer</h3>
                  <p>Pick a campaign, race, class, and starting sheet values without leaving the home view flow.</p>
                  <span className="campaign-create-link">Open creator</span>
                </button>
              ) : (
                characters.map((character) => (
                  <div
                    key={character.id}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleViewCharacter(character.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-foreground-muted)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Character Image/Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1a4d2e 0%, #0f3a1f 100%)',
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '0.375rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}>
                        🧙
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>
                          {character.name || 'Unnamed Character'}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                          {character.level ? `Level ${character.level} | ` : ''}
                          {character.race?.name || 'No Species Selected'} | 
                          {character.alignment || 'No Classes Selected'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      gap: '1rem',
                      borderTop: '1px solid var(--color-border)'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCharacter(character.id)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--color-foreground)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
                      >
                        VIEW
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewCharacter(character.id)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: 'var(--color-foreground)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-foreground-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-foreground)'}
                      >
                        EDIT
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRequestDeleteCharacter(character.id, character.name)
                        }}
                        disabled={deletingCharacterId === character.id}
                        aria-label={`Delete ${character.name || 'character'}`}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          cursor: deletingCharacterId === character.id ? 'wait' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          transition: 'color 0.2s',
                          opacity: deletingCharacterId === character.id ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (deletingCharacterId !== character.id) {
                            e.currentTarget.style.color = '#dc2626'
                          }
                        }}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                      >
                        {deletingCharacterId === character.id ? 'DELETING...' : 'DELETE'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Campaigns Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Campaigns</h2>
              <p className="section-subtitle">Create a new table and manage it as the assigned Dungeon Master.</p>
            </div>
            <button type="button" className="section-action-button" onClick={handleOpenCreateCampaign}>
              + Create Campaign
            </button>
          </div>

          <div className="entity-grid">
            <button type="button" className="campaign-create-card" onClick={handleOpenCreateCampaign}>
              <span className="campaign-create-badge">New</span>
              <h3>Start a fresh adventure</h3>
              <p>Set the campaign name, description, and privacy in one step.</p>
              <span className="campaign-create-link">Open creator</span>
            </button>

            {loadingCampaigns && (
              <div className="campaign-section-message" role="status">
                Loading campaigns...
              </div>
            )}

            {!loadingCampaigns && campaignsError && (
              <div className="error-message campaign-section-message">{campaignsError}</div>
            )}

            {!loadingCampaigns && !campaignsError && campaigns.length === 0 && (
              <div className="campaign-section-message campaign-section-empty">
                You are not DM of any campaigns yet.
              </div>
            )}

            {!loadingCampaigns && !campaignsError && campaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-placeholder-card">
                <div style={{
                  backgroundColor: 'var(--color-background)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.5rem',
                    fontWeight: 'normal',
                    color: 'var(--color-foreground)'
                  }}>
                    {campaign.name}
                  </h3>
                  <p style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-foreground-muted)'
                  }}>
                    {formatCampaignStartDate(campaign.creationDate)}
                  </p>


                  <div style={{
                    padding: '0.75rem 0',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: 'var(--color-foreground)',
                      letterSpacing: '0.05em'
                    }}>
                      ROLE: DUNGEON MASTER
                    </div>
                    {campaign.joinCode && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                      }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          color: 'var(--color-foreground-muted)',
                          letterSpacing: '0.1em',
                        }}>
                          {campaign.joinCode}
                        </span>
                        <CopyCodeButton code={campaign.joinCode} size="sm" />
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#3b82f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        transition: 'color 0.2s',
                        letterSpacing: '0.05em'
                      }}
                      onClick={() => handleViewCampaign(campaign.id)}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                    >
                      VIEW CAMPAIGN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestDeleteCampaign(campaign.id, campaign.name)}
                      disabled={deletingCampaignId === campaign.id}
                      style={{
                        flex: 1,
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: 'none',
                        cursor: deletingCampaignId === campaign.id ? 'wait' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        transition: 'color 0.2s',
                        letterSpacing: '0.05em',
                        opacity: deletingCampaignId === campaign.id ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (deletingCampaignId !== campaign.id) {
                          e.currentTarget.style.color = '#dc2626'
                        }
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                    >
                      {deletingCampaignId === campaign.id ? 'DELETING...' : 'DELETE'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Player Campaigns Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Campaigns as Player</h2>
              <p className="section-subtitle">Campaigns you have joined with one of your characters.</p>
            </div>
          </div>

          <div className="entity-grid">
            {loadingPlayerCampaigns && (
              <div className="campaign-section-message" role="status">
                Loading player campaigns...
              </div>
            )}

            {!loadingPlayerCampaigns && playerCampaignsError && (
              <div className="error-message campaign-section-message">{playerCampaignsError}</div>
            )}

            {!loadingPlayerCampaigns && !playerCampaignsError && playerCampaigns.length === 0 && (
              <div className="campaign-section-message campaign-section-empty">
                You have not joined any campaigns as a player yet.
              </div>
            )}

            {!loadingPlayerCampaigns && !playerCampaignsError && (() => {
              // Group by campaignId — one card per campaign, list all characters inside
              const grouped = playerCampaigns.reduce<Map<number, { campaignId: number; campaignName: string; creationDate?: string; characters: { id: number; name: string }[] }>>(
                (acc, pc) => {
                  if (!acc.has(pc.campaignId)) {
                    acc.set(pc.campaignId, { campaignId: pc.campaignId, campaignName: pc.campaignName, creationDate: pc.creationDate, characters: [] })
                  }
                  acc.get(pc.campaignId)!.characters.push({ id: pc.characterId, name: pc.characterName })
                  return acc
                },
                new Map()
              )

              return [...grouped.values()].map((group) => (
                <div key={group.campaignId} className="campaign-placeholder-card">
                  <div style={{
                    backgroundColor: 'var(--color-background)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '1.5rem',
                      fontWeight: 'normal',
                      color: 'var(--color-foreground)'
                    }}>
                      {group.campaignName}
                    </h3>
                    <p style={{
                      margin: '0 0 1.5rem 0',
                      fontSize: '0.875rem',
                      color: 'var(--color-foreground-muted)'
                    }}>
                      {formatCampaignStartDate(group.creationDate)}
                    </p>

                    <div style={{
                      padding: '0.75rem 0',
                      borderTop: '1px solid var(--color-border)',
                      borderBottom: '1px solid var(--color-border)',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: 'var(--color-foreground)',
                        letterSpacing: '0.05em',
                        marginBottom: group.characters.length > 0 ? '0.5rem' : 0
                      }}>
                        ROLE: PLAYER
                      </div>
                      {group.characters.map((ch) => (
                        <div key={ch.id} style={{
                          fontSize: '0.875rem',
                          color: 'var(--color-foreground-muted)'
                        }}>
                          <strong style={{ color: 'var(--color-foreground)' }}>{ch.name}</strong>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#3b82f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        transition: 'color 0.2s',
                        letterSpacing: '0.05em'
                      }}
                      onClick={() => handleViewCampaign(group.campaignId)}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                    >
                      VIEW CAMPAIGN
                    </button>
                  </div>
                </div>
              ))
            })()}
          </div>
        </section>

        {/* Public Campaigns Section */}
        <section className="content-section">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Public Campaigns</h2>
              <p className="section-subtitle">Open campaigns available for everyone to view.</p>
            </div>
          </div>

          <div className="entity-grid">
            {loadingPublicCampaigns && (
              <div className="campaign-section-message" role="status">
                Loading public campaigns...
              </div>
            )}

            {!loadingPublicCampaigns && publicCampaignsError && (
              <div className="error-message campaign-section-message">{publicCampaignsError}</div>
            )}

            {!loadingPublicCampaigns && !publicCampaignsError && publicCampaigns.length === 0 && (
              <div className="campaign-section-message campaign-section-empty">
                No public campaigns available at the moment.
              </div>
            )}

            {!loadingPublicCampaigns && !publicCampaignsError && publicCampaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-placeholder-card">
                <div style={{
                  backgroundColor: 'var(--color-background)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.5rem',
                    fontWeight: 'normal',
                    color: 'var(--color-foreground)'
                  }}>
                    {campaign.name}
                  </h3>
                  <p style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '0.875rem',
                    color: 'var(--color-foreground-muted)'
                  }}>
                    {formatCampaignStartDate(campaign.creationDate)}
                  </p>

                  <div style={{
                    padding: '0.75rem 0',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      color: 'var(--color-foreground)',
                      letterSpacing: '0.05em'
                    }}>
                      {campaign.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      color: '#3b82f6',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      transition: 'color 0.2s',
                      letterSpacing: '0.05em'
                    }}
                    onClick={() => handleViewCampaign(campaign.id)}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#60a5fa'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                  >
                    VIEW CAMPAIGN
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

  return (
    <>
      {content}
      {joinCodeDialog && (
        <div className="confirmation-backdrop" role="presentation">
          <div className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="join-code-title">
            <span className="confirmation-eyebrow">Campaign created!</span>
            <h2 id="join-code-title">🎲 {joinCodeDialog.campaignName}</h2>
            <p>
              Share this code with your players so they can join the campaign:
            </p>
            <div style={{
              background: 'var(--color-background)',
              border: '2px solid var(--color-border)',
              borderRadius: '0.5rem',
              padding: '1rem 1.5rem',
              margin: '1rem 0',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--color-foreground-muted)', marginBottom: '0.5rem' }}>
                JOIN CODE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '0.15em', color: 'var(--color-foreground)', fontFamily: 'monospace' }}>
                  {joinCodeDialog.joinCode}
                </div>
                <CopyCodeButton code={joinCodeDialog.joinCode} size="md" />
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', margin: '0 0 1.5rem' }}>
              You can also find this code later in the campaign view.
            </p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="login-button"
                onClick={() => setJoinCodeDialog(null)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteDialog && (
        <div className="confirmation-backdrop" role="presentation">
          <div className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-character-title">
            <span className="confirmation-eyebrow">Character deletion</span>
            <h2 id="delete-character-title">Delete {deleteDialog.characterName}?</h2>
            <p>
              This permanently removes the character sheet and linked progression data from your roster.
            </p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="confirmation-secondary-button"
                onClick={handleCloseDeleteDialog}
                disabled={deletingCharacterId === deleteDialog.characterId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirmation-danger-button"
                onClick={() => void handleConfirmDeleteCharacter()}
                disabled={deletingCharacterId === deleteDialog.characterId}
              >
                {deletingCharacterId === deleteDialog.characterId ? 'Deleting...' : 'Delete character'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteCampaignDialog && (
        <div className="confirmation-backdrop" role="presentation">
          <div className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-campaign-title">
            <span className="confirmation-eyebrow">Campaign deletion</span>
            <h2 id="delete-campaign-title">Delete {deleteCampaignDialog.campaignName}?</h2>
            <p>
              This permanently removes the campaign and all associated player assignments. Characters will not be deleted.
            </p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="confirmation-secondary-button"
                onClick={handleCloseDeleteCampaignDialog}
                disabled={deletingCampaignId === deleteCampaignDialog.campaignId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirmation-danger-button"
                onClick={() => void handleConfirmDeleteCampaign()}
                disabled={deletingCampaignId === deleteCampaignDialog.campaignId}
              >
                {deletingCampaignId === deleteCampaignDialog.campaignId ? 'Deleting...' : 'Delete campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
