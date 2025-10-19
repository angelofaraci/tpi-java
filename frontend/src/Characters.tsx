import { useState, useEffect } from 'react'
import { ScoreBox } from './components/scoreBox'
import './styles/CharacterSheet.css'
import { api } from './services/api'
import type { Character } from './interfaces/character'

interface FormCharacterData {
  name: string;
  class: string;
  species: string;
  background: string;
}

export function Characters() {
  const [formData, setFormData] = useState<FormCharacterData>({
    name: '',
    class: '',
    species: '',
    background: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacterData = async () => {
      try {
        setLoading(true)
        const responseData = await api.characters.findById(1)
        console.log('📋 Raw character response:', responseData)

        if (!responseData || typeof responseData !== 'object') {
          setError('Malformed character payload: empty or invalid response')
          return
        }
        const hasUser = !!(responseData as any)?.user && typeof (responseData as any).user.id !== 'undefined'
        const hasCampaign = !!(responseData as any)?.campaign && typeof (responseData as any).campaign.id !== 'undefined'
        const hasRace = !!(responseData as any)?.race
        if (!hasUser || !hasCampaign || !hasRace) {
          console.error('Character payload missing fields', {
            hasUser,
            hasCampaign,
            hasRace,
            responseData
          })
          setError('Malformed character payload from server')
          return
        }

        const mappedData: Character = {
          id: responseData.id ?? 0,
          user: { id: responseData.user.id ?? 0 },
          campaign: { id: responseData.campaign?.id ?? 0 },
          name: responseData.name ?? '',
          characteristics: Array.isArray(responseData.characteristics)
            ? (responseData as any).characteristics
            : [],
          alignment: responseData.alignment ?? '',
          background: responseData.background ?? '',
          characterStats: {
            id:
              responseData.characterStats.id ?? 0,
          },
          race: {
            id: responseData.race.id ?? 0,
            name: responseData.race.name ?? '',
          },
        }
        console.log('Mapped character data:', mappedData)
        // Update form data with character data
        setFormData({
          name: mappedData.name || '',
          class: '',
          species: mappedData.race.name || '',
          background: mappedData.background || '',
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchCharacterData()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="character-sheet">
      <div className="header-section">
        <div className="basic-info">
          <input
            type="text"
            className="input-field"
            placeholder="Character Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Class"
            value={formData.class}
            onChange={(e) => setFormData((prev) => ({ ...prev, class: e.target.value }))}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Species"
            value={formData.species}
            onChange={(e) => setFormData((prev) => ({ ...prev, species: e.target.value }))}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Background"
            value={formData.background}
            onChange={(e) => setFormData((prev) => ({ ...prev, background: e.target.value }))}
          />
        </div>
      </div>

      <div className="ability-scores">
        <ScoreBox
          label="Strength"
          score={15}
          skills={[{ name: 'Athletics', proficient: false }]}
          savingProficiency={1}
          proficiencyBonus={2}
        />
        <ScoreBox
          label="Dexterity"
          score={14}
          skills={[
            { name: 'Acrobatics', proficient: true },
            { name: 'Sleight of Hand', proficient: false },
            { name: 'Stealth', proficient: false },
          ]}
          savingProficiency={1}
          proficiencyBonus={2}
        />
        <ScoreBox label="Constitution" score={13} skills={[]} savingProficiency={1} proficiencyBonus={2} />
        <ScoreBox
          label="Intelligence"
          score={12}
          skills={[
            { name: 'Arcana', proficient: true },
            { name: 'History', proficient: true },
            { name: 'Investigation', proficient: false },
            { name: 'Nature', proficient: false },
            { name: 'Religion', proficient: false },
          ]}
          savingProficiency={0}
          proficiencyBonus={2}
        />
        <ScoreBox
          label="Wisdom"
          score={10}
          skills={[
            { name: 'Animal Handling', proficient: false },
            { name: 'Insight', proficient: false },
            { name: 'Medicine', proficient: false },
            { name: 'Perception', proficient: false },
            { name: 'Survival', proficient: false },
          ]}
          savingProficiency={0}
          proficiencyBonus={2}
        />
        <ScoreBox
          label="Charisma"
          score={8}
          skills={[
            { name: 'Deception', proficient: false },
            { name: 'Intimidation', proficient: false },
            { name: 'Performance', proficient: false },
            { name: 'Persuasion', proficient: false },
          ]}
          savingProficiency={0}
          proficiencyBonus={2}
        />
      </div>

      <div className="stats-container">
        <div className="stat-box">
          <div>Armor Class</div>
          <div className="score">15</div>
        </div>
        <div className="stat-box">
          <div>Initiative</div>
          <div className="score">+2</div>
        </div>
        <div className="stat-box">
          <div>Speed</div>
          <div className="score">30</div>
        </div>
      </div>

      <div className="features-section">
        <h3>Class Features</h3>
        {/* Add features content here */}
      </div>
      <div className="features-section">
        <h3>Character Features</h3>
        {/* Add features content here */}
      </div>
    </div>
  )
}
