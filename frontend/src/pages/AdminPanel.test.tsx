import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../services/api'
import { AdminPanel } from './AdminPanel'
import type { DndClassDto, RaceDto } from '../services/api'
import type { Character } from '../interfaces/character'
import type { User } from '../interfaces/user'
import type { Campaign } from '../interfaces/campaign'

// ── Mock de api completo ────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  api: {
    classes: { findAll: vi.fn() },
    races:   { findAll: vi.fn() },
    admin: {
      classes:    { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      races:      { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      characters: { findAll: vi.fn(), update: vi.fn(), delete: vi.fn() },
      users:      { findAll: vi.fn(), update: vi.fn(), delete: vi.fn() },
      campaigns:  { findAll: vi.fn(), update: vi.fn(), delete: vi.fn() },
    },
  },
}))

// ── Datos de prueba ─────────────────────────────────────────────────────────────
const mockClasses: DndClassDto[] = [
  { id: 1, name: 'Wizard', description: 'A scholarly magic-user', hitDice: 6, levelCharacteristics: {}, savingThrows: ['Intelligence', 'Wisdom'] },
  { id: 2, name: 'Fighter', description: 'A master of martial combat', hitDice: 10, levelCharacteristics: {}, savingThrows: ['Strength', 'Constitution'] },
]

const mockRaces: RaceDto[] = [
  { id: 1, name: 'Elf', description: 'A graceful, long-lived race', racialFeats: ['Darkvision'] },
]

const mockCharacters: Character[] = [
  {
    id: 10,
    name: 'Gandalf',
    alignment: 'Neutral Good',
    background: 'Sage',
    user: { id: 1, username: 'player1' },
    campaign: { id: 1, name: 'Campaign A' } as never,
    characteristics: [],
    race: { id: 1, name: 'Elf', description: '', racialFeats: [] },
    characterStats: { xp: 0, proficiency: 2, abilityScores: {} as never, velocities: [], proficiencies: {}, hp: 30 },
  },
]

const mockUsers: User[] = [
  { id: 1, username: 'player1', email: 'player1@test.com', role: 'ROLE_USER' },
  { id: 2, username: 'admin1', email: 'admin@test.com', role: 'ROLE_ADMIN' },
]

const mockCampaigns: Campaign[] = [
  { id: 1, name: 'Lost Mines', description: 'A classic adventure', privacy: false, joinCode: 'ABCD-1234' },
  { id: 2, name: 'Secret Campaign', description: 'Very secret', privacy: true },
]

// ── Setup helpers ───────────────────────────────────────────────────────────────
const defaultProps = { onBack: vi.fn(), onLogout: vi.fn() }

function setupMocks() {
  vi.mocked(api.classes.findAll).mockResolvedValue(mockClasses as never)
  vi.mocked(api.races.findAll).mockResolvedValue(mockRaces as never)
  vi.mocked(api.admin.characters.findAll).mockResolvedValue(mockCharacters as never)
  vi.mocked(api.admin.users.findAll).mockResolvedValue(mockUsers)
  vi.mocked(api.admin.campaigns.findAll).mockResolvedValue(mockCampaigns)
}

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Tabs', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('renders the five tab buttons', () => {
    render(<AdminPanel {...defaultProps} />)
    expect(screen.getByRole('tab', { name: 'Clases' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Razas' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Personajes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Campañas' })).toBeInTheDocument()
  })

  it('Classes tab is active by default', () => {
    render(<AdminPanel {...defaultProps} />)
    expect(screen.getByRole('tab', { name: 'Clases' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clicking Usuarios tab loads and shows users', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    expect(await screen.findByText('player1')).toBeInTheDocument()
    expect(screen.getByText('admin1')).toBeInTheDocument()
    expect(api.admin.users.findAll).toHaveBeenCalledOnce()
  })

  it('clicking Personajes tab loads and shows characters', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    expect(await screen.findByText('Gandalf')).toBeInTheDocument()
    expect(api.admin.characters.findAll).toHaveBeenCalledOnce()
  })

  it('clicking Campañas tab loads and shows campaigns', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    expect(await screen.findByText('Lost Mines')).toBeInTheDocument()
    expect(screen.getByText('Secret Campaign')).toBeInTheDocument()
    expect(api.admin.campaigns.findAll).toHaveBeenCalledOnce()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Users CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('shows Edit and Delete buttons for each user', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = await screen.findByText('player1')
    const card = playerCard.closest('div')!
    expect(within(card).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('opens edit modal with prefilled username and email', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Editar' }))

    expect(screen.getByDisplayValue('player1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('player1@test.com')).toBeInTheDocument()
  })

  it('password field is empty in edit modal (not pre-filled)', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Editar' }))

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveValue('')
  })

  it('calls api.admin.users.update with correct payload and reloads', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.users.update).mockResolvedValue({ id: 1, username: 'new-name', email: 'player1@test.com', role: 'ROLE_USER' })
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Editar' }))

    const usernameInput = screen.getByDisplayValue('player1')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'new-name')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(api.admin.users.update).toHaveBeenCalledWith(1, expect.objectContaining({ username: 'new-name' }))
    expect(api.admin.users.findAll).toHaveBeenCalledTimes(2) // initial + reload
  })

  it('shows confirm modal before deleting a user', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Eliminar' }))

    expect(screen.getByText(/Eliminar al usuario "player1"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('calls api.admin.users.delete when confirm is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.users.delete).mockResolvedValue(null as never)
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(api.admin.users.delete).toHaveBeenCalledWith(1)
  })

  it('does NOT delete when cancel is clicked in confirm modal', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(api.admin.users.delete).not.toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Characters CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('shows character cards with Edit and Delete buttons', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    const card = (await screen.findByText('Gandalf')).closest('div')!
    expect(within(card).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('opens edit modal with prefilled name', async () => {
    const user = userEvent.setup()
    vi.mocked(api.races.findAll).mockResolvedValue(mockRaces as never)
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    const card = (await screen.findByText('Gandalf')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))

    expect(screen.getByDisplayValue('Gandalf')).toBeInTheDocument()
  })

  it('calls api.admin.characters.update when saving', async () => {
    const user = userEvent.setup()
    vi.mocked(api.races.findAll).mockResolvedValue(mockRaces as never)
    vi.mocked(api.admin.characters.update).mockResolvedValue(mockCharacters[0] as never)
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    const card = (await screen.findByText('Gandalf')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))

    const nameInput = screen.getByDisplayValue('Gandalf')
    await user.clear(nameInput)
    await user.type(nameInput, 'Saruman')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(api.admin.characters.update).toHaveBeenCalledWith(10, expect.objectContaining({ name: 'Saruman' }))
  })

  it('calls api.admin.characters.delete after confirm', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.characters.delete).mockResolvedValue(null as never)
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    const card = (await screen.findByText('Gandalf')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(api.admin.characters.delete).toHaveBeenCalledWith(10)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Campaigns CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('shows both public and private campaigns', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    expect(await screen.findByText('Lost Mines')).toBeInTheDocument()
    expect(screen.getByText('Secret Campaign')).toBeInTheDocument()
  })

  it('opens edit modal with prefilled campaign data', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))

    expect(screen.getByDisplayValue('Lost Mines')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A classic adventure')).toBeInTheDocument()
  })

  it('calls api.admin.campaigns.update when saving', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.campaigns.update).mockResolvedValue(mockCampaigns[0])
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))

    const nameInput = screen.getByDisplayValue('Lost Mines')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Campaign')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(api.admin.campaigns.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Renamed Campaign' }))
  })

  it('calls api.admin.campaigns.delete after confirm', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.campaigns.delete).mockResolvedValue(null as never)
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(api.admin.campaigns.delete).toHaveBeenCalledWith(1)
  })

  it('disables Save button when campaign name is empty', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))

    const nameInput = screen.getByDisplayValue('Lost Mines')
    await user.clear(nameInput)

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Classes tab (smoke)', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('loads and renders class cards on mount', async () => {
    render(<AdminPanel {...defaultProps} />)
    expect(await screen.findByText('Wizard')).toBeInTheDocument()
    expect(screen.getByText('Fighter')).toBeInTheDocument()
  })

  it('shows Create Class button', async () => {
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard') // wait for classes to load
    expect(screen.getByRole('button', { name: '+ Crear Clase' })).toBeInTheDocument()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Races tab (smoke)', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('loads and renders race cards when Razas tab is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: 'Razas' }))

    expect(await screen.findByText('Elf')).toBeInTheDocument()
    expect(api.races.findAll).toHaveBeenCalledOnce()
  })

  it('shows Create Race button in Razas tab', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: 'Razas' }))

    expect(await screen.findByRole('button', { name: '+ Crear Raza' })).toBeInTheDocument()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Cancel edit flows', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('closes user edit modal when Cancelar is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Editar' }))
    expect(screen.getByDisplayValue('player1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByDisplayValue('player1')).not.toBeInTheDocument()
    expect(api.admin.users.update).not.toHaveBeenCalled()
  })

  it('closes character edit modal when Cancelar is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Personajes' }))

    const card = (await screen.findByText('Gandalf')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))
    expect(screen.getByDisplayValue('Gandalf')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByDisplayValue('Gandalf')).not.toBeInTheDocument()
    expect(api.admin.characters.update).not.toHaveBeenCalled()
  })

  it('closes campaign edit modal when Cancelar is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))
    expect(screen.getByDisplayValue('Lost Mines')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByDisplayValue('Lost Mines')).not.toBeInTheDocument()
    expect(api.admin.campaigns.update).not.toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Error feedback', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('shows error banner when api.admin.users.update rejects', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.users.update).mockRejectedValue(new Error('Server error'))
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Usuarios' }))

    const playerCard = (await screen.findByText('player1')).closest('div')!
    await user.click(within(playerCard).getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Server error')).toBeInTheDocument()
  })

  it('shows error banner when api.admin.campaigns.update rejects', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.campaigns.update).mockRejectedValue(new Error('Campaign update failed'))
    render(<AdminPanel {...defaultProps} />)
    await user.click(screen.getByRole('tab', { name: 'Campañas' }))

    const card = (await screen.findByText('Lost Mines')).closest('div')!
    await user.click(within(card).getByRole('button', { name: 'Editar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Campaign update failed')).toBeInTheDocument()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
describe('AdminPanel — Classes saving throws', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks() })

  it('renders all 6 saving throw checkboxes in create class form', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard') // wait for classes to load

    await user.click(screen.getByRole('button', { name: '+ Crear Clase' }))

    for (const ability of ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']) {
      expect(screen.getByRole('checkbox', { name: ability })).toBeInTheDocument()
    }
  })

  it('pre-checks the correct saving throws when editing a class', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard')

    const wizardCard = screen.getByText('Wizard').closest('div')!
    await user.click(within(wizardCard).getByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('checkbox', { name: 'Intelligence' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Wisdom' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Strength' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Dexterity' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Constitution' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Charisma' })).not.toBeChecked()
  })

  it('includes selected saving throws in the create payload', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.classes.create).mockResolvedValue({ id: 99, name: 'Bard', description: 'A musical muse', hitDice: 8, levelCharacteristics: {}, savingThrows: ['Dexterity', 'Charisma'] } as never)
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard')

    await user.click(screen.getByRole('button', { name: '+ Crear Clase' }))

    // First textbox is Nombre, second is Descripción (inside level characteristics section is "Título" with placeholder)
    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[0], 'Bard')          // Nombre
    await user.type(textboxes[1], 'A musical muse') // Descripción

    await user.click(screen.getByRole('checkbox', { name: 'Dexterity' }))
    await user.click(screen.getByRole('checkbox', { name: 'Charisma' }))

    await user.click(screen.getByRole('button', { name: 'Crear Clase' }))

    expect(api.admin.classes.create).toHaveBeenCalledWith(
      expect.objectContaining({ savingThrows: expect.arrayContaining(['Dexterity', 'Charisma']) })
    )
  })

  it('includes empty savingThrows array when none are checked on create', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.classes.create).mockResolvedValue({ id: 99, name: 'Monk', description: 'A martial artist', hitDice: 8, levelCharacteristics: {}, savingThrows: [] } as never)
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard')

    await user.click(screen.getByRole('button', { name: '+ Crear Clase' }))

    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[0], 'Monk')              // Nombre
    await user.type(textboxes[1], 'A martial artist')  // Descripción

    // No checkboxes clicked — savingThrows should be []
    await user.click(screen.getByRole('button', { name: 'Crear Clase' }))

    expect(api.admin.classes.create).toHaveBeenCalledWith(
      expect.objectContaining({ savingThrows: [] })
    )
  })

  it('includes updated savingThrows in the edit (update) payload', async () => {
    const user = userEvent.setup()
    vi.mocked(api.admin.classes.update).mockResolvedValue({ ...mockClasses[0], savingThrows: ['Strength'] } as never)
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard')

    const wizardCard = screen.getByText('Wizard').closest('div')!
    await user.click(within(wizardCard).getByRole('button', { name: 'Editar' }))

    // Wizard starts with Intelligence + Wisdom checked — uncheck Intelligence, check Strength
    await user.click(screen.getByRole('checkbox', { name: 'Intelligence' }))
    await user.click(screen.getByRole('checkbox', { name: 'Strength' }))

    await user.click(screen.getByRole('button', { name: 'Actualizar Clase' }))

    expect(api.admin.classes.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ savingThrows: expect.arrayContaining(['Wisdom', 'Strength']) })
    )
    expect(api.admin.classes.update).toHaveBeenCalledWith(
      1,
      expect.not.objectContaining({ savingThrows: expect.arrayContaining(['Intelligence']) })
    )
  })

  it('clears saving throws when cancelling and reopening create form', async () => {
    const user = userEvent.setup()
    render(<AdminPanel {...defaultProps} />)
    await screen.findByText('Wizard')

    // Open create, check a checkbox, then cancel
    await user.click(screen.getByRole('button', { name: '+ Crear Clase' }))
    await user.click(screen.getByRole('checkbox', { name: 'Charisma' }))
    expect(screen.getByRole('checkbox', { name: 'Charisma' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Reopen create — checkboxes must be cleared
    await user.click(screen.getByRole('button', { name: '+ Crear Clase' }))
    expect(screen.getByRole('checkbox', { name: 'Charisma' })).not.toBeChecked()
  })
})
