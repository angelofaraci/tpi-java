import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { Login } from './pages/Login'
import { DemoLanding } from './pages/DemoLanding'
import { Characters } from './pages/Characters'
import { CreateCampaign } from './pages/CreateCampaign'
import { CreateCharacter } from './pages/CreateCharacter'
import { ViewCampaign } from './pages/ViewCampaign'
import { AdminPanel } from './pages/AdminPanel'
import { Home, type HomeFilter, type HomeSort, type HomeStatus } from './pages/Home'
import { CopyCodeButton } from './components/CopyCodeButton'
import type { RailCampaign } from './components/CampaignRailCard'
import { api } from './services/api'
import type { OwnedCampaignSummary, PlayerCampaignSummary } from './interfaces/campaign'
import type { Character, HydratedCharacterEditData, LevelRecord } from './interfaces/character'
import type { User } from './interfaces/user'
import { hydrateCharacterEditData } from './utils/characterDraft'
import './styles/CharacterSheet.css'

type View = 'home' | 'character-sheet' | 'create-campaign' | 'create-character' | 'view-campaign' | 'admin' | 'view-character-readonly'
type CharacterFormMode = 'create' | 'edit'
type CharacterReturnView = 'home' | 'character-sheet'
type AuthView = 'demo' | 'login'

const HOME_FILTER_VALUES: HomeFilter[] = ['all', 'active', 'retired']
const HOME_SORT_VALUES: HomeSort[] = ['recent', 'level', 'name']

function readStoredHomeFilter(): HomeFilter {
  const stored = localStorage.getItem('home.filter')
  return (HOME_FILTER_VALUES as string[]).includes(stored ?? '') ? (stored as HomeFilter) : 'all'
}

function readStoredHomeSort(): HomeSort {
  const stored = localStorage.getItem('home.sort')
  return (HOME_SORT_VALUES as string[]).includes(stored ?? '') ? (stored as HomeSort) : 'recent'
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [username, setUsername] = useState('')
  const [userRole, setUserRole] = useState<'ROLE_USER' | 'ROLE_ADMIN' | null>(null)
  const [view, setView] = useState<View>('home')
  const [characters, setCharacters] = useState<Character[]>([])
  const [campaigns, setCampaigns] = useState<OwnedCampaignSummary[]>([])
  const [playerCampaigns, setPlayerCampaigns] = useState<PlayerCampaignSummary[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [loadingCharacters, setLoadingCharacters] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingPlayerCampaigns, setLoadingPlayerCampaigns] = useState(false)
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
  const [campaignFeedback, setCampaignFeedback] = useState<string | null>(null)
  const [characterSheetFeedback, setCharacterSheetFeedback] = useState<string | null>(null)
  const [characterFormMode, setCharacterFormMode] = useState<CharacterFormMode>('create')
  const [characterReturnView, setCharacterReturnView] = useState<CharacterReturnView>('home')
  const [editCharacterData, setEditCharacterData] = useState<HydratedCharacterEditData | null>(null)
  const [characterSheetRefreshToken, setCharacterSheetRefreshToken] = useState(0)
  const [authView, setAuthView] = useState<AuthView>('demo')
  const [levels, setLevels] = useState<LevelRecord[]>([])
  const [loadingLevels, setLoadingLevels] = useState(false)
  const [levelsError, setLevelsError] = useState<string | null>(null)
  const [homeFilter, setHomeFilter] = useState<HomeFilter>(readStoredHomeFilter)
  const [homeSort, setHomeSort] = useState<HomeSort>(readStoredHomeSort)
  const [joinCode, setJoinCode] = useState('')
  const currentUserIdRef = useRef<number | null>(null)
  const latestCharacterRequestId = useRef(0)
  const latestCampaignRequestId = useRef(0)
  const latestPlayerCampaignRequestId = useRef(0)
  const latestLevelsRequestId = useRef(0)

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
            setUsername(user.username ?? '')
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

      setCharacters(Array.isArray(data) ? (data as Character[]) : [])
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

  // Third parallel fetch alongside characters/campaigns (design.md "Revised: parallel
  // fetch includes levels") — feeds CharacterCard's level-badge derivation via GET /levels,
  // the same endpoint Characters.tsx already consumes. Non-critical: a failure here only
  // omits level badges, it does not block the rest of the home from loading.
  const loadLevels = useCallback(async () => {
    const requestId = latestLevelsRequestId.current + 1
    latestLevelsRequestId.current = requestId
    setLoadingLevels(true)
    setLevelsError(null)

    try {
      const data = await api.levels.findAll()

      if (requestId !== latestLevelsRequestId.current) {
        return
      }

      setLevels(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (requestId !== latestLevelsRequestId.current) {
        return
      }

      setLevelsError(err instanceof Error ? err.message : 'Failed to load levels')
    } finally {
      if (requestId === latestLevelsRequestId.current) {
        setLoadingLevels(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    void loadLevels()
  }, [isAuthenticated, loadLevels])

  useEffect(() => {
    localStorage.setItem('home.filter', homeFilter)
  }, [homeFilter])

  useEffect(() => {
    localStorage.setItem('home.sort', homeSort)
  }, [homeSort])

  // Campaign name resolution Map (design.md "App.tsx State Management") — a Character
  // only carries campaign.id, so the display name is resolved against the fetched lists.
  const campaignNameById = useMemo(() => {
    const map = new Map<number, string>()
    campaigns.forEach((c) => map.set(c.id, c.name))
    playerCampaigns.forEach((pc) => map.set(pc.campaignId, pc.campaignName))
    return map
  }, [campaigns, playerCampaigns])

  // Groups GET /levels by characterId for CharacterCard's level-badge derivation.
  const levelsByCharacterId = useMemo(() => {
    const map = new Map<number, LevelRecord[]>()
    levels.forEach((record) => {
      const characterId = Number(record.character?.id ?? record.id?.characterId)
      if (!characterId || Number.isNaN(characterId)) return
      const existing = map.get(characterId) ?? []
      existing.push(record)
      map.set(characterId, existing)
    })
    return map
  }, [levels])

  // Unified rail view model: DM campaigns take variant priority (spec.md "Campaign
  // Rail — Card Variants and Role Logic"); player rows are deduped by campaignId.
  const railCampaigns = useMemo<RailCampaign[]>(() => {
    const dmEntries: RailCampaign[] = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      role: 'DM',
      joinCode: c.joinCode,
      playerCount: c.playerCount,
      characterCount: c.characterCount,
    }))

    const seenPlayerCampaignIds = new Set<number>()
    const playerEntries: RailCampaign[] = []
    playerCampaigns.forEach((pc) => {
      if (seenPlayerCampaignIds.has(pc.campaignId)) return
      seenPlayerCampaignIds.add(pc.campaignId)
      playerEntries.push({
        id: pc.campaignId,
        name: pc.campaignName,
        role: 'PLAYER',
        playerCount: pc.playerCount,
        characterCount: pc.characterCount,
        heroName: pc.characterName,
      })
    })

    return [...dmEntries, ...playerEntries]
  }, [campaigns, playerCampaigns])

  // 4 metric tiles (tile 5, next-session, dropped per Plan B — repeat(4,1fr)).
  const metrics = useMemo(() => {
    const dmIds = new Set(campaigns.map((c) => c.id))
    const playerIds = new Set(playerCampaigns.map((pc) => pc.campaignId))
    return {
      campaignsCount: new Set([...dmIds, ...playerIds]).size,
      charactersCount: characters.length,
      asDmCount: campaigns.length,
      playersAtTables: campaigns.reduce((sum, c) => sum + (c.playerCount ?? 0), 0),
    }
  }, [characters, campaigns, playerCampaigns])

  // ADR-04: keep the existing per-list loading/error flags and their race guards;
  // only derive the aggregate status the home skeleton/error band needs.
  const homeStatus = useMemo<HomeStatus>(() => {
    if (loadingCharacters || loadingCampaigns || loadingPlayerCampaigns || loadingLevels) {
      return 'loading'
    }
    if (charactersError || campaignsError || playerCampaignsError) {
      return 'error'
    }
    return 'ready'
  }, [
    loadingCharacters,
    loadingCampaigns,
    loadingPlayerCampaigns,
    loadingLevels,
    charactersError,
    campaignsError,
    playerCampaignsError,
  ])

  const homeErrorMessage = charactersError || campaignsError || playerCampaignsError || levelsError || null

  const handleRetryHome = () => {
    void loadCharacters()
    void loadCampaigns()
    void loadPlayerCampaigns()
    void loadLevels()
  }

  // Visual-only per spec (no new backend endpoint introduced): validates the code
  // against the existing GET /campaigns/by-code/{code} lookup and opens the guided
  // character creator, which is how this app's existing flow joins a player to a
  // campaign (CreateCharacter.tsx's own "Campaign Code" field).
  const handleJoinByCode = async () => {
    const trimmed = joinCode.trim()
    if (!trimmed) {
      return
    }

    try {
      const campaign = await api.campaigns.findByCode(trimmed)

      if (!campaign) {
        setCampaignsError(`No campaign found for code "${trimmed}".`)
        return
      }

      setJoinCode('')
      handleOpenCreateCharacter()
    } catch (err: unknown) {
      setCampaignsError(err instanceof Error ? err.message : 'Failed to look up join code')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    latestCharacterRequestId.current += 1
    latestCampaignRequestId.current += 1
    latestPlayerCampaignRequestId.current += 1
    latestLevelsRequestId.current += 1
    setIsAuthenticated(false)
    setCurrentUserId(null)
    setUsername('')
    setUserRole(null)
    setView('home')
    setSelectedCharacterId(null)
    setSelectedCampaignId(null)
    setCharacters([])
    setCampaigns([])
    setPlayerCampaigns([])
    setLevels([])
    setLoadingLevels(false)
    setLevelsError(null)
    setJoinCode('')
    setCampaignFeedback(null)
    setCharacterSheetFeedback(null)
    setCampaignViewFeedback(null)
    setCharactersError(null)
    setCampaignsError(null)
    setCampaignViewError(null)
    setDeleteDialog(null)
    setDeleteCampaignDialog(null)
    setJoinCodeDialog(null)
    setCharacterFormMode('create')
    setCharacterReturnView('home')
    setEditCharacterData(null)
    setAuthView('demo')
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
    // Named `resolvedJoinCode` (not `joinCode`) to avoid shadowing the "Join a table" `joinCode` state.
    let resolvedJoinCode = result.joinCode

    if (!resolvedJoinCode) {
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
          resolvedJoinCode = match?.joinCode
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

    if (resolvedJoinCode) {
      setJoinCodeDialog({ campaignName: result.campaignName, joinCode: resolvedJoinCode })
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
          }}
        />
      )
    } else {
      content = (
        <DemoLanding
          onLoginRequest={() => setAuthView('login')}
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
      <>
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
        <Home
        username={username}
        userRole={userRole}
        activeNav="home"
        onOpenAdmin={handleOpenAdminPanel}
        onLogout={handleLogout}
        status={homeStatus}
        characters={characters}
        campaignNameById={campaignNameById}
        levelsByCharacterId={levelsByCharacterId}
        railCampaigns={railCampaigns}
        metrics={metrics}
        filter={homeFilter}
        sort={homeSort}
        joinCode={joinCode}
        errorMessage={homeErrorMessage}
        onOpenCreateCharacter={handleOpenCreateCharacter}
        onOpenCreateCampaign={handleOpenCreateCampaign}
        onOpenSheet={handleViewCharacter}
        onOpenCampaign={handleViewCampaign}
        onManageCampaign={handleViewCampaign}
        onRequestDeleteCharacter={handleRequestDeleteCharacter}
        onFilterChange={setHomeFilter}
        onSortChange={setHomeSort}
        onJoinCodeChange={setJoinCode}
        onJoinSubmit={() => void handleJoinByCode()}
        onRetry={handleRetryHome}
        />
      </>
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
