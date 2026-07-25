import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateCharacterPayload } from '../interfaces/character'
import { api } from './api'

describe('api.campaigns.create', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('omits dm from the request payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 12, name: 'Stormwreck', description: 'Island quest', privacy: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await api.campaigns.create({
      name: 'Stormwreck',
      description: 'Island quest',
      privacy: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/campaigns')
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })

    const payload = JSON.parse(String(options.body)) as Record<string, unknown>
    expect(payload).toEqual({
      name: 'Stormwreck',
      description: 'Island quest',
      privacy: true,
    })
    expect(payload).not.toHaveProperty('dm')
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.campaigns.findMine', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests the authenticated user campaign summaries', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 9,
            name: 'Hidden Shrine',
            description: 'Second owned campaign',
            privacy: true,
            creationDate: '2025-11-29T00:00:00.000+00:00',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.campaigns.findMine()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/campaigns/mine')
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toEqual([
      {
        id: 9,
        name: 'Hidden Shrine',
        description: 'Second owned campaign',
        privacy: true,
        creationDate: '2025-11-29T00:00:00.000+00:00',
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.campaigns.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests all campaigns for character creation catalog use', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 3,
            name: 'Open Table',
            description: 'Shared campaign',
            privacy: false,
            creationDate: '2025-11-29T00:00:00.000+00:00',
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.campaigns.findAll()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/campaigns')
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toEqual([
      {
        id: 3,
        name: 'Open Table',
        description: 'Shared campaign',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.campaigns.findAllPublic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests all public campaigns from GET /campaigns and returns PublicCampaignSummary[]', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 5,
            name: 'Lost Mines',
            description: 'Classic starter adventure',
            privacy: false,
            creationDate: '2025-11-29T00:00:00.000+00:00',
          },
          {
            id: 8,
            name: 'Open Table',
            description: 'Shared campaign',
            privacy: false,
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.campaigns.findAllPublic()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/campaigns')
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toEqual([
      {
        id: 5,
        name: 'Lost Mines',
        description: 'Classic starter adventure',
        privacy: false,
        creationDate: '2025-11-29T00:00:00.000+00:00',
      },
      {
        id: 8,
        name: 'Open Table',
        description: 'Shared campaign',
        privacy: false,
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.races.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests the race catalog from the backend', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 5,
            name: 'Elf',
            description: 'Fey ancestry',
            racialFeats: ['Darkvision'],
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.races.findAll()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/races')
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toEqual([
      {
        id: 5,
        name: 'Elf',
        description: 'Fey ancestry',
        racialFeats: ['Darkvision'],
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.classes.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests the class catalog from the backend', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 8,
            name: 'Wizard',
            description: 'Arcane scholar',
            hitDice: 6,
            levelCharacteristics: {
              1: 'Spellcasting',
            },
          },
        ]),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.classes.findAll()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/dnd-classes')
    expect(options).toMatchObject({
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toEqual([
      {
        id: 8,
        name: 'Wizard',
        description: 'Arcane scholar',
        hitDice: 6,
        levelCharacteristics: {
          1: 'Spellcasting',
        },
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.characters.create', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('posts a typed character payload to the plural backend endpoint', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 21,
          name: 'Iria',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const payload: CreateCharacterPayload = {
      user: { id: 4 },
      campaign: { id: 2 },
      name: 'Iria',
      characteristics: ['Darkvision'],
      alignment: 'Neutral Good',
      background: 'Sage',
      characterStats: {
        xp: 0,
        proficiency: 2,
        abilityScores: {
          Strength: 10,
          Dexterity: 14,
          Constitution: 12,
          Intelligence: 16,
          Wisdom: 13,
          Charisma: 8,
        },
        velocities: [30],
        proficiencies: {
          Arcana: 1,
          Intelligence: 1,
        },
        hp: 8,
      },
      race: { id: 7 },
      initialClasses: [{ classId: 8, level: 1 }],
    }

    const result = await api.characters.create(payload)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/characters')
    expect(options.method).toBe('POST')
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(options.body))).toEqual(payload)
    expect(result).toEqual({ id: 21, name: 'Iria' })
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.characters.remove', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('deletes the requested character id from the singular backend endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.characters.remove(31)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/character/31')
    expect(options).toMatchObject({
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toBeNull()
  })
})

describe('api.characterStats.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('patches character stats with a typed payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 14,
          xp: 325,
          proficiency: 3,
          abilityScores: {
            Strength: 10,
            Dexterity: 14,
            Constitution: 12,
            Intelligence: 16,
            Wisdom: 13,
            Charisma: 8,
          },
          velocities: [30],
          proficiencies: {
            Acrobatics: 0,
            'Animal Handling': 0,
            Arcana: 1,
            Athletics: 0,
            Deception: 0,
            History: 1,
            Insight: 0,
            Intimidation: 0,
            Investigation: 0,
            Medicine: 0,
            Nature: 0,
            Perception: 0,
            Performance: 0,
            Persuasion: 0,
            Religion: 0,
            'Sleight of Hand': 0,
            Stealth: 0,
            Survival: 0,
            Strength: 0,
            Dexterity: 0,
            Constitution: 0,
            Intelligence: 1,
            Wisdom: 0,
            Charisma: 0,
          },
          hp: 18,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const payload = {
      xp: 325,
      proficiency: 3,
      abilityScores: {
        Strength: 10,
        Dexterity: 14,
        Constitution: 12,
        Intelligence: 16,
        Wisdom: 13,
        Charisma: 8,
      },
      velocities: [30],
      proficiencies: {
        Acrobatics: 0,
        'Animal Handling': 0,
        Arcana: 1,
        Athletics: 0,
        Deception: 0,
        History: 1,
        Insight: 0,
        Intimidation: 0,
        Investigation: 0,
        Medicine: 0,
        Nature: 0,
        Perception: 0,
        Performance: 0,
        Persuasion: 0,
        Religion: 0,
        'Sleight of Hand': 0,
        Stealth: 0,
        Survival: 0,
        Strength: 0,
        Dexterity: 0,
        Constitution: 0,
        Intelligence: 1,
        Wisdom: 0,
        Charisma: 0,
      },
      hp: 18,
    }

    const result = await api.characterStats.update(14, payload)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/character-stats/14')
    expect(options).toMatchObject({
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(options.body))).toEqual(payload)
    expect(result).toMatchObject({ id: 14, hp: 18, xp: 325 })
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.levels mutations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('creates a level row for a character class pair', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: { characterId: 21, classId: 8 },
          character: { id: 21 },
          dndClass: { id: 8, name: 'Wizard' },
          level: 3,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const payload = {
      character: { id: 21 },
      dndClass: { id: 8 },
      level: 3,
    }

    const result = await api.levels.create(payload)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/levels')
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(options.body))).toEqual(payload)
    expect(result).toMatchObject({ id: { characterId: 21, classId: 8 }, level: 3 })
    expect(logSpy).toHaveBeenCalled()
  })

  it('updates an existing level row using the composite id path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: { characterId: 21, classId: 8 },
          character: { id: 21 },
          dndClass: { id: 8, name: 'Wizard' },
          level: 4,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const payload = {
      character: { id: 21 },
      dndClass: { id: 8 },
      level: 4,
    }

    const result = await api.levels.update(21, 8, payload)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/level/21/8')
    expect(options).toMatchObject({
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(options.body))).toEqual(payload)
    expect(result).toMatchObject({ id: { characterId: 21, classId: 8 }, level: 4 })
    expect(logSpy).toHaveBeenCalled()
  })

  it('deletes an existing level row using the composite id path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await api.levels.remove(21, 8)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/level/21/8')
    expect(options).toMatchObject({
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    })
    expect(result).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Admin — Users
// ══════════════════════════════════════════════════════════════════════════════

describe('api.admin.users.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests GET /admin/users with auth header', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ id: 1, username: 'player1', email: 'p1@test.com', role: 'ROLE_USER' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.users.findAll()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/users')
    expect(options).toMatchObject({ headers: { Authorization: 'Bearer test-token' } })
    expect(result).toEqual([{ id: 1, username: 'player1', email: 'p1@test.com', role: 'ROLE_USER' }])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.users.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('sends PATCH /admin/users/{id} with the partial payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, username: 'new-name', email: 'p1@test.com', role: 'ROLE_USER' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.users.update(1, { username: 'new-name' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/users/1')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(String(options.body))).toEqual({ username: 'new-name' })
    expect(result).toMatchObject({ id: 1, username: 'new-name' })
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.users.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('token', 'test-token')
  })

  it('sends DELETE /admin/users/{id} and returns null on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.users.delete(5)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/users/5')
    expect(options.method).toBe('DELETE')
    expect(result).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Admin — Characters
// ══════════════════════════════════════════════════════════════════════════════

describe('api.admin.characters.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests GET /admin/characters with auth header', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ id: 10, name: 'Gandalf' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.characters.findAll()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/characters')
    expect(options).toMatchObject({ headers: { Authorization: 'Bearer test-token' } })
    expect(result).toEqual([{ id: 10, name: 'Gandalf' }])
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.characters.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('sends PATCH /admin/characters/{id} with the partial payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 10, name: 'Saruman' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.characters.update(10, { name: 'Saruman', alignment: 'Neutral Evil' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/characters/10')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(String(options.body))).toEqual({ name: 'Saruman', alignment: 'Neutral Evil' })
    expect(result).toMatchObject({ id: 10, name: 'Saruman' })
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.characters.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('token', 'test-token')
  })

  it('sends DELETE /admin/characters/{id} and returns null on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.characters.delete(10)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/characters/10')
    expect(options.method).toBe('DELETE')
    expect(result).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Admin — Campaigns
// ══════════════════════════════════════════════════════════════════════════════

describe('api.admin.campaigns.findAll', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('requests GET /admin/campaigns with auth header', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, name: 'Lost Mines', privacy: false },
          { id: 2, name: 'Secret Campaign', privacy: true },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.campaigns.findAll()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/campaigns')
    expect(options).toMatchObject({ headers: { Authorization: 'Bearer test-token' } })
    // Both public and private campaigns are returned
    expect(result).toHaveLength(2)
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, privacy: false }),
      expect.objectContaining({ id: 2, privacy: true }),
    ]))
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.campaigns.update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('sends PATCH /admin/campaigns/{id} with the partial payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, name: 'Renamed Campaign', privacy: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.campaigns.update(1, { name: 'Renamed Campaign' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/campaigns/1')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(String(options.body))).toEqual({ name: 'Renamed Campaign' })
    expect(result).toMatchObject({ id: 1, name: 'Renamed Campaign' })
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('api.admin.campaigns.delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('token', 'test-token')
  })

  it('sends DELETE /admin/campaigns/{id} and returns null on 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.admin.campaigns.delete(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/admin/campaigns/1')
    expect(options.method).toBe('DELETE')
    expect(result).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// api.demo — anonymous read-only endpoints
// ══════════════════════════════════════════════════════════════════════════════

describe('api.demo.campaigns', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.clear()
  })

  it('requests GET /demo/campaigns without an Authorization header', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, name: 'Demo Campaign', description: 'A sample adventure', creationDate: '2025-01-01T00:00:00.000+00:00', characterCount: 2 },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.demo.campaigns()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/demo/campaigns')
    expect(options.headers).not.toHaveProperty('Authorization')
    expect(result).toEqual([
      { id: 1, name: 'Demo Campaign', description: 'A sample adventure', creationDate: '2025-01-01T00:00:00.000+00:00', characterCount: 2 },
    ])
    expect(logSpy).toHaveBeenCalled()
  })

  it('does not attach a real session token to /demo/campaigns even when one is present', async () => {
    localStorage.setItem('token', 'a-real-session-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.demo.campaigns()

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers).not.toHaveProperty('Authorization')
  })
})

describe('api.demo.characters', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.clear()
  })

  it('requests GET /demo/characters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.demo.characters()

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/demo/characters')
    expect(result).toEqual([{ id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' }])
  })
})

describe('api.demo.characterById', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.clear()
  })

  it('requests GET /demo/characters/{id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 100, name: 'Aldric', raceName: 'Human', classes: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.demo.characterById(100)

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/demo/characters/100')
    expect(result).toMatchObject({ id: 100, name: 'Aldric' })
  })

  it('propagates a 404 error for a non-demo or missing id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.demo.characterById(999)).rejects.toThrow('Error 404')
  })
})

describe('api.demo.campaignById', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.clear()
  })

  it('requests GET /demo/campaigns/{id} without an Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 1,
          name: 'Demo Campaign',
          description: 'A sample adventure',
          creationDate: '2025-01-01T00:00:00.000+00:00',
          characters: [{ id: 100, name: 'Aldric', raceName: 'Human', level: 3, alignment: 'Lawful Good' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.demo.campaignById(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:8080/demo/campaigns/1')
    expect(options.headers).not.toHaveProperty('Authorization')
    expect(result).toMatchObject({ id: 1, name: 'Demo Campaign' })
    expect(result.characters).toHaveLength(1)
  })

  it('does not attach a real session token even when one is present', async () => {
    localStorage.setItem('token', 'a-real-session-token')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Demo Campaign', characters: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.demo.campaignById(1)

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers).not.toHaveProperty('Authorization')
  })

  it('propagates a 404 error for a non-demo or missing id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.demo.campaignById(999)).rejects.toThrow('Error 404')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// characters.uploadPortrait
// ══════════════════════════════════════════════════════════════════════════════

describe('api.characters.uploadPortrait', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('console', console)
    localStorage.setItem('token', 'test-token')
  })

  it('sends POST /characters/{id}/portrait with FormData containing the file under key "file"', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ portraitUrl: '/uploads/portraits/uuid.jpg' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['image-bytes'], 'portrait.jpg', { type: 'image/jpeg' })
    const result = await api.characters.uploadPortrait(42, file)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://localhost:8080/characters/42/portrait')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get('file')).toBe(file)
    expect(result).toEqual({ portraitUrl: '/uploads/portraits/uuid.jpg' })
    expect(logSpy).toHaveBeenCalled()
  })

  it('does not include Content-Type: application/json header (lets browser set multipart boundary)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ portraitUrl: '/uploads/portraits/uuid.jpg' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['image-bytes'], 'portrait.jpg', { type: 'image/jpeg' })
    await api.characters.uploadPortrait(42, file)

    const [, options] = fetchMock.mock.calls[0]
    // The headers object must NOT contain 'Content-Type' — FormData sets its own boundary
    const headers = options.headers as Record<string, string>
    expect(headers).not.toHaveProperty('Content-Type')
  })

  it('sends the Authorization header when a token is present', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ portraitUrl: '/uploads/portraits/uuid.jpg' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['image-bytes'], 'portrait.jpg', { type: 'image/jpeg' })
    await api.characters.uploadPortrait(7, file)

    const [, options] = fetchMock.mock.calls[0]
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
  })
})
