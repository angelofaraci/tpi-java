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
            playerCount: 1,
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
        playerCount: 1,
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
