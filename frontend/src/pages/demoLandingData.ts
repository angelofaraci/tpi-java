import type { RailCampaign } from '../components/CampaignRailCard'
import type { Character, LevelRecord } from '../interfaces/character'

// Showcase constants for `DemoLanding` — see design.md §3.1. Typed against the
// real domain interfaces (not a separate demo DTO shape) so `tsc --noEmit`
// breaks loudly if the domain interfaces ever change. Ids are in a 9000+ band
// on purpose: they can never collide with a real record.
//
// Extracted into their own module (rather than living inline in
// `DemoLanding.tsx`, as ADR-02 in design.md originally specified) so both the
// component and its test file can import them without violating
// `react-refresh/only-export-components` (page files may only export
// components). ADR-02's stated rejection reason for a separate module —
// "indirection with a single consumer" — no longer applies once the test
// needs the same constants directly.
export const DEMO_CAMPAIGN: RailCampaign = {
  id: 9001,
  name: 'The Sunken Crown',
  role: 'DM',
  joinCode: 'A3F9-B72C',
  playerCount: 4,
  characterCount: 3,
}

export const DEMO_CHARACTERS: Character[] = [
  {
    id: 9101,
    user: { id: 9000, username: 'preview' },
    campaign: { id: 9001, name: 'The Sunken Crown' },
    name: 'Kaelen Vurr',
    characterClasses: [{ id: 9301, name: 'Paladin', description: '' }],
    characteristics: [],
    alignment: 'Lawful Good',
    background: 'Soldier',
    characterStats: {
      xp: 2700,
      proficiency: 2,
      abilityScores: {
        Strength: 17,
        Dexterity: 11,
        Constitution: 15,
        Intelligence: 9,
        Wisdom: 12,
        Charisma: 16,
      },
      velocities: [30],
      proficiencies: {},
      hp: 38,
    },
    race: { id: 9201, name: 'Dragonborn', description: '' },
  },
  {
    id: 9102,
    user: { id: 9000, username: 'preview' },
    campaign: { id: 9001, name: 'The Sunken Crown' },
    name: 'Sylra Moonhollow',
    characterClasses: [
      { id: 9302, name: 'Ranger', description: '' },
      { id: 9303, name: 'Rogue', description: '' },
    ],
    characteristics: [],
    alignment: 'Chaotic Good',
    background: 'Outlander',
    characterStats: {
      xp: 900,
      proficiency: 2,
      abilityScores: {
        Strength: 12,
        Dexterity: 18,
        Constitution: 13,
        Intelligence: 10,
        Wisdom: 16,
        Charisma: 11,
      },
      velocities: [35],
      proficiencies: {},
      hp: 29,
    },
    race: { id: 9202, name: 'Wood Elf', description: '' },
  },
  {
    id: 9103,
    user: { id: 9000, username: 'preview' },
    campaign: { id: 9001, name: 'The Sunken Crown' },
    name: 'Bram Ironkettle',
    characterClasses: [{ id: 9304, name: 'Artificer', description: '' }],
    characteristics: [],
    alignment: 'Neutral Good',
    background: 'Guild Artisan',
    characterStats: {
      xp: 900,
      proficiency: 2,
      abilityScores: {
        Strength: 8,
        Dexterity: 14,
        Constitution: 14,
        Intelligence: 17,
        Wisdom: 12,
        Charisma: 10,
      },
      velocities: [25],
      proficiencies: {},
      hp: 24,
    },
    race: { id: 9203, name: 'Rock Gnome', description: '' },
  },
]

export const DEMO_LEVELS: Map<number, LevelRecord[]> = new Map([
  [9101, [{ dndClass: { id: 9301 }, level: 4 }]],
  [
    9102,
    [
      { dndClass: { id: 9302 }, level: 3 },
      { dndClass: { id: 9303 }, level: 2 },
    ],
  ],
  [9103, [{ dndClass: { id: 9304 }, level: 3 }]],
])
