import { useState, useEffect } from 'react'
import { ScoreBox } from './components/scoreBox'
import './styles/CharacterSheet.css'
import { api } from './services/api'
import type { Character } from './interfaces/character'

interface FormCharacterData {
  name: string;
  class: string;
  race: string;
  background: string;
  characteristics: string[];
  alignment: string;
  proficiency: number;
  abilityScores: {
    Strength: number;
    Dexterity: number;
    Constitution: number;
    Intelligence: number;
    Wisdom: number;
    Charisma: number;
  };
  proficiencies: { [key: string]: number };
  velocity: number;
  hp: number;
}

export function Characters() {
  const [formData, setFormData] = useState<FormCharacterData>({
    name: '',
    class: '',
    race: '',
    background: '',
    characteristics: [],
    alignment: '',
    proficiency: 0,
    abilityScores: {
      Strength: 0,
      Dexterity: 0,
      Constitution: 0,
      Intelligence: 0,
      Wisdom: 0,
      Charisma: 0
    },
    proficiencies: {},
    velocity: 0,
    hp: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacterData = async () => {
      try {
        setLoading(true)
        const responseData = await api.characters.findById(1)
        console.log('Raw character response:', responseData)

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
          id: responseData.id,
          user: responseData.user,
          campaign: responseData.campaign,
          name: responseData.name,
          characteristics: responseData.characteristics,
          alignment: responseData.alignment,
          background: responseData.background,
          characterStats: responseData.characterStats,
          race: responseData.race,
        }
        console.log('Mapped character data:', mappedData)
        // Update form data with character data
        setFormData({
          name: mappedData.name || '',
          class: 'Not Specified',
          race: mappedData.race.name || '',
          background: mappedData.background || '',
          characteristics: mappedData.characteristics || [],
          alignment: mappedData.alignment || '',
          proficiency: mappedData.characterStats.proficiency || 0,
          abilityScores: {
            Strength: mappedData.characterStats.abilityScores.Strength || 0,
            Dexterity: mappedData.characterStats.abilityScores.Dexterity || 0,
            Constitution: mappedData.characterStats.abilityScores.Constitution || 0,
            Intelligence: mappedData.characterStats.abilityScores.Intelligence || 0,
            Wisdom: mappedData.characterStats.abilityScores.Wisdom || 0,
            Charisma: mappedData.characterStats.abilityScores.Charisma || 0
          },
          proficiencies: mappedData.characterStats.proficiencies || {},
          velocity: mappedData.characterStats.velocities[0] || 0,
          hp: mappedData.characterStats.hp || 0
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
          <div className='infobox'>
            <h3>Name: </h3>
            <p>{formData.name}</p>
          </div>
          <div className='infobox'>
            <h3>Class: </h3>
            <p>{formData.class}</p>
          </div>
          <div className='infobox'>
            <h3>Race: </h3>
            <p>{formData.race}</p>
          </div>
          <div className='infobox'>
            <h3>Background: </h3>
            <p>{formData.background}</p>
          </div>
          <div className='infobox'>
            <h3>Alignment: </h3>
            <p>{formData.alignment}</p>
          </div>
          <div className='infobox'>
            <h3>Proficiency: </h3>
            <p>{formData.proficiency}</p>
          </div>
        </div>
      </div>

      <div className="ability-scores">
        <ScoreBox
          label="Strength"
          score={formData.abilityScores.Strength}
          skills={[{ name: 'Athletics', proficient: formData.proficiencies['Athletics'] }]}
          savingProficiency={formData.proficiencies['Strength']}
          proficiencyBonus={formData.proficiency}
        />
        <ScoreBox
          label="Dexterity"
          score={formData.abilityScores.Dexterity}
          skills={[
            { name: 'Acrobatics', proficient: formData.proficiencies['Acrobatics'] },
            { name: 'Sleight of Hand', proficient: formData.proficiencies['Sleight of Hand'] },
            { name: 'Stealth', proficient: formData.proficiencies['Stealth'] },
          ]}
          savingProficiency={formData.proficiencies['Dexterity']}
          proficiencyBonus={formData.proficiency}
        />
        <ScoreBox label="Constitution" score={13} skills={[]} savingProficiency={formData.proficiencies['Constitution']} proficiencyBonus={formData.proficiency} />
        <ScoreBox
          label="Intelligence"
          score={12}
          skills={[
            { name: 'Arcana', proficient: formData.proficiencies['Arcana'] },
            { name: 'History', proficient: formData.proficiencies['History'] },
            { name: 'Investigation', proficient: formData.proficiencies['Investigation'] },
            { name: 'Nature', proficient: formData.proficiencies['Nature'] },
            { name: 'Religion', proficient: formData.proficiencies['Religion'] },
          ]}
          savingProficiency={formData.proficiencies['Intelligence']}
          proficiencyBonus={formData.proficiency}
        />
        <ScoreBox
          label="Wisdom"
          score={10}
          skills={[
            { name: 'Animal Handling', proficient: formData.proficiencies['Animal Handling'] },
            { name: 'Insight', proficient: formData.proficiencies['Insight'] },
            { name: 'Medicine', proficient: formData.proficiencies['Medicine'] },
            { name: 'Perception', proficient: formData.proficiencies['Perception'] },
            { name: 'Survival', proficient: formData.proficiencies['Survival'] },
          ]}
          savingProficiency={formData.proficiencies['Wisdom']}
          proficiencyBonus={formData.proficiency}
        />
        <ScoreBox
          label="Charisma"
          score={8}
          skills={[
            { name: 'Deception', proficient: formData.proficiencies['Deception'] },
            { name: 'Intimidation', proficient: formData.proficiencies['Intimidation'] },
            { name: 'Performance', proficient: formData.proficiencies['Performance'] },
            { name: 'Persuasion', proficient: formData.proficiencies['Persuasion'] },
          ]}
          savingProficiency={formData.proficiencies['Charisma']}
          proficiencyBonus={formData.proficiency}
        />
      </div>

      <div className="stats-container">
        <div className="stat-box">
          <div>Armor Class</div>
          <div className="score">{10 + Math.floor((formData.abilityScores.Dexterity - 10) / 2)}</div>
        </div>
        <div className="stat-box">
          <div>Initiative</div>
          <div className="score">{Math.floor((formData.abilityScores.Dexterity - 10) / 2)}</div>
        </div>
        <div className="stat-box">
          <div>Speed</div>
          <div className="score">{formData.velocity}</div>
        </div>
      </div>

      <div className="features-section">
        <h3>Class Features</h3>
        {/* Add features content here */}
      </div>
      <div className="features-section">
        <h3>Character Features</h3>
        {formData.characteristics.map((feature, index) => (
          <div key={index} className="feature-item">
            {feature}
          </div>
        ))}
      </div>
    </div>
  )
}
