import { authUtils } from '../utils/auth'
import type { Campaign, CreateCampaignPayload, OwnedCampaignSummary, PlayerCampaignSummary, PublicCampaignSummary } from '../interfaces/campaign'
import type {
  Character,
  CharacterCatalogCampaignOption,
  CharacterCatalogClassOption,
  CharacterCatalogRaceOption,
  CharacterStats,
  CharacterStatsUpdatePayload,
  CreateCharacterPayload,
  LevelPayload,
  LevelRecord,
} from '../interfaces/character'
import type { User } from '../interfaces/user'

type JsonObject = Record<string, unknown>

interface AuthTokenResponse {
  token?: string
}

export interface DndClassDto {
  id?: number
  name: string
  description: string
  levelCharacteristics: Record<number, string>
  hitDice: number
  savingThrows?: string[]
}

export interface RaceDto {
  id?: number
  name: string
  description: string
  racialFeats: string[]
}

// Base configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// Helper function to handle responses
async function handleResponse<T = unknown>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error ${response.status}: ${error}`)
  }

  // If there's no content (e.g. DELETE), return null
  if (response.status === 204) return null as T

  // Get the raw response text first to debug JSON issues
  const responseText = await response.text()
  console.log('Raw backend response:', responseText)

  // Try to parse JSON and catch any parsing errors
  try {
    return JSON.parse(responseText) as T
  } catch (jsonError) {
    console.error('JSON Parse Error:', jsonError)
    console.error('Raw response that failed to parse:', responseText)
    console.error('Response preview:', responseText.substring(0, 200) + '...')
    throw new Error('Backend returned invalid JSON. Check console for details.')
  }
}

// Helper function to create headers with authentication
function createHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...authUtils.getAuthHeader(),
    ...additionalHeaders,
  }
}

// Objeto principal con todas las funciones
export const api = {
  // USERS
  characters: {
    async findAll() {
      const response = await fetch(`${API_BASE_URL}/characters`, {
        headers: createHeaders(),
      })
      return handleResponse<Character[]>(response)
    },

    async findByUserId(userId: number) {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/characters`, {
        headers: createHeaders(),
      })
      return handleResponse<Character[]>(response)
    },

    async findById(id: number) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`, {
        headers: createHeaders(),
      })
      return handleResponse<Partial<Character> & JsonObject>(response)
    },

    async create(payload: CreateCharacterPayload) {
      const response = await fetch(`${API_BASE_URL}/characters`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(payload),
      })
      return handleResponse<Character>(response)
    },

    async crear(character: CreateCharacterPayload) {
      return this.create(character)
    },
    
    //CREAR INTERFAZ DE CHARACTER
    async update(id: number, character: unknown) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify(character),
      })
      return handleResponse(response)
    },

    async remove(id: number) {
      const response = await fetch(`${API_BASE_URL}/character/${id}`, {
        method: 'DELETE',
        headers: createHeaders(),
      })
      return handleResponse(response)
    },

    async uploadPortrait(characterId: number, file: File): Promise<{ portraitUrl: string }> {
      const formData = new FormData()
      formData.append('file', file)
      const token = authUtils.getToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch(`${API_BASE_URL}/characters/${characterId}/portrait`, {
        method: 'POST',
        headers,
        body: formData,
      })
      return handleResponse<{ portraitUrl: string }>(response)
    },
  },

  levels: {
    async findAll() {
      const response = await fetch(`${API_BASE_URL}/levels`, {
        headers: createHeaders(),
      })
      return handleResponse<LevelRecord[]>(response)
    },

    async findOne(characterId: number, classId: number) {
      const response = await fetch(`${API_BASE_URL}/level/${characterId}/${classId}`, {
        headers: createHeaders(),
      })
      return handleResponse<LevelRecord>(response)
    },

    async create(payload: LevelPayload) {
      const response = await fetch(`${API_BASE_URL}/levels`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify(payload),
      })
      return handleResponse<LevelRecord>(response)
    },

    async update(characterId: number, classId: number, payload: LevelPayload) {
      const response = await fetch(`${API_BASE_URL}/level/${characterId}/${classId}`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify(payload),
      })
      return handleResponse<LevelRecord>(response)
    },

    async remove(characterId: number, classId: number) {
      const response = await fetch(`${API_BASE_URL}/level/${characterId}/${classId}`, {
        method: 'DELETE',
        headers: createHeaders(),
      })
      return handleResponse(response)
    },
  },

  characterStats: {
    async update(id: number, payload: CharacterStatsUpdatePayload) {
      const response = await fetch(`${API_BASE_URL}/character-stats/${id}`, {
        method: 'PATCH',
        headers: createHeaders(),
        body: JSON.stringify(payload),
      })
      return handleResponse<CharacterStats>(response)
    },
  },

  // PRODUCTOS
  productos: {
    async obtenerTodos(params = {}) {
      const queryString = new URLSearchParams(params).toString()
      const url = `${API_BASE_URL}/productos${queryString ? `?${queryString}` : ''}`
      const response = await fetch(url, {
        headers: createHeaders(),
      })
      return handleResponse(response)
    },

    async buscar(query: string) {
      const response = await fetch(`${API_BASE_URL}/productos/buscar?q=${encodeURIComponent(query)}`, {
        headers: createHeaders(),
      })
      return handleResponse(response)
    },

    async obtenerPorCategoria(categoriaId: number) {
      const response = await fetch(`${API_BASE_URL}/productos/categoria/${categoriaId}`, {
        headers: createHeaders(),
      })
      return handleResponse(response)
    },
  },

  campaigns: {
    async create(payload: CreateCampaignPayload) {
      const { name, description, privacy, creationDate, players, characters } = payload
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({
          name,
          description,
          privacy,
          creationDate,
          players,
          characters,
        }),
      })
      return handleResponse<Campaign>(response)
    },

    async findByCode(code: string) {
      const response = await fetch(`${API_BASE_URL}/campaigns/by-code/${encodeURIComponent(code)}`, {
        headers: createHeaders(),
      })
      if (response.status === 404) return null
      return handleResponse<Campaign>(response)
    },

    async findMine() {
      const response = await fetch(`${API_BASE_URL}/campaigns/mine`, {
        headers: createHeaders(),
      })
      return handleResponse<OwnedCampaignSummary[]>(response)
    },

    async findAsPlayer() {
      const response = await fetch(`${API_BASE_URL}/campaigns/as-player`, {
        headers: createHeaders(),
      })
      return handleResponse<PlayerCampaignSummary[]>(response)
    },

    async findById(id: number) {
      const response = await fetch(`${API_BASE_URL}/campaign/${id}`, {
        headers: createHeaders(),
      })
      return handleResponse<Campaign>(response)
    },

    async remove(id: number) {
      const response = await fetch(`${API_BASE_URL}/campaign/${id}`, {
        method: 'DELETE',
        headers: createHeaders(),
      })
      return handleResponse(response)
    },

    async findAll() {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        headers: createHeaders(),
      })
      return handleResponse<CharacterCatalogCampaignOption[]>(response)
    },

    async findAllPublic() {
      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        headers: createHeaders(),
      })
      return handleResponse<PublicCampaignSummary[]>(response)
    },
  },

  races: {
    async findAll() {
      const response = await fetch(`${API_BASE_URL}/races`, {
        headers: createHeaders(),
      })
      return handleResponse<CharacterCatalogRaceOption[]>(response)
    },
  },

  classes: {
    async findAll() {
      const response = await fetch(`${API_BASE_URL}/dnd-classes`, {
        headers: createHeaders(),
      })
      return handleResponse<CharacterCatalogClassOption[]>(response)
    },
  },

  // AUTHENTICATION
  auth: {
    async login(credentials: { username: string; password: string }) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })
      return handleResponse<AuthTokenResponse>(response)
    },

    async register(userData: { email: string; username: string; password: string }) {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      return handleResponse<AuthTokenResponse>(response)
    },

    async logout() {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: createHeaders(),
      })
      return handleResponse(response)
    },

    async me() {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: createHeaders(),
      })
      return handleResponse<User>(response)
    },
  },

  // ADMIN
  admin: {
    users: {
      async findAll() {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: createHeaders(),
        })
        return handleResponse<User[]>(response)
      },

      async update(id: number, payload: { username?: string; email?: string; password?: string }) {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
          method: 'PATCH',
          headers: createHeaders(),
          body: JSON.stringify(payload),
        })
        return handleResponse<User>(response)
      },

      async delete(id: number) {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
          method: 'DELETE',
          headers: createHeaders(),
        })
        return handleResponse(response)
      },
    },

    characters: {
      async findAll() {
        const response = await fetch(`${API_BASE_URL}/admin/characters`, {
          headers: createHeaders(),
        })
        return handleResponse<Character[]>(response)
      },

      async update(id: number, payload: unknown) {
        const response = await fetch(`${API_BASE_URL}/admin/characters/${id}`, {
          method: 'PATCH',
          headers: createHeaders(),
          body: JSON.stringify(payload),
        })
        return handleResponse<Character>(response)
      },

      async delete(id: number) {
        const response = await fetch(`${API_BASE_URL}/admin/characters/${id}`, {
          method: 'DELETE',
          headers: createHeaders(),
        })
        return handleResponse(response)
      },
    },

    campaigns: {
      async findAll() {
        const response = await fetch(`${API_BASE_URL}/admin/campaigns`, {
          headers: createHeaders(),
        })
        return handleResponse<Campaign[]>(response)
      },

      async update(id: number, payload: { name?: string; description?: string; privacy?: boolean }) {
        const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
          method: 'PATCH',
          headers: createHeaders(),
          body: JSON.stringify(payload),
        })
        return handleResponse<Campaign>(response)
      },

      async delete(id: number) {
        const response = await fetch(`${API_BASE_URL}/admin/campaigns/${id}`, {
          method: 'DELETE',
          headers: createHeaders(),
        })
        return handleResponse(response)
      },
    },

    races: {
      async create(race: RaceDto) {
        const response = await fetch(`${API_BASE_URL}/races`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify(race),
        })
        return handleResponse<RaceDto>(response)
      },

      async update(id: number, race: RaceDto) {
        const response = await fetch(`${API_BASE_URL}/race/${id}`, {
          method: 'PUT',
          headers: createHeaders(),
          body: JSON.stringify(race),
        })
        return handleResponse<RaceDto>(response)
      },

      async delete(id: number) {
        const response = await fetch(`${API_BASE_URL}/race/${id}`, {
          method: 'DELETE',
          headers: createHeaders(),
        })
        return handleResponse(response)
      },
    },

    classes: {
      async create(dndClass: DndClassDto) {
        const response = await fetch(`${API_BASE_URL}/dnd-classes`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify(dndClass),
        })
        return handleResponse<DndClassDto>(response)
      },

      async update(id: number, dndClass: DndClassDto) {
        const response = await fetch(`${API_BASE_URL}/dnd-class/${id}`, {
          method: 'PUT',
          headers: createHeaders(),
          body: JSON.stringify(dndClass),
        })
        return handleResponse<DndClassDto>(response)
      },

      async delete(id: number) {
        const response = await fetch(`${API_BASE_URL}/dnd-class/${id}`, {
          method: 'DELETE',
          headers: createHeaders(),
        })
        return handleResponse(response)
      },
    },
  },
}
