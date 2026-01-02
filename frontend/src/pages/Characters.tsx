import { useState, useEffect } from 'react'
import { ScoreBox } from '../components/scoreBox'
import '../styles/CharacterSheet.css'
import { api } from '../services/api'
import type { Character } from '../interfaces/character'

interface FormCharacterData {
  name: string;
  classes: Array<{
    classId: number;
    description: string;
    level: number;
    features: Array<{ level: number; text: string }>;
  }>;
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

interface CharactersProps {
  characterId: number;
  onBack: () => void;
  onLogout: () => void;
}

export function Characters({ characterId, onBack, onLogout }: CharactersProps) {
  const [characterSheetData, setCharacterSheetData] = useState<FormCharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCharacterSheet = async () => {
      setLoading(true)
      setError(null)
      try {
        const [responseData, levelsResponse] = await Promise.all([
          api.characters.findById(characterId),
          api.levels.findAll().catch(() => []),
        ])

        if (!responseData || typeof responseData !== 'object') {
          setError('Malformed character payload')
          return
        }

        const hasUser = !!(responseData as any)?.user
        const hasCampaign = !!(responseData as any)?.campaign
        const hasRace = !!(responseData as any)?.race

        if (!hasUser || !hasCampaign || !hasRace) {
          setError('Malformed character payload from server')
          return
        }

        const mappedData: Character = {
          id: responseData.id,
          user: responseData.user,
          campaign: responseData.campaign,
          name: responseData.name,
          characterClasses: (responseData as any)?.characterClasses ?? [],
          characteristics: responseData.characteristics,
          alignment: responseData.alignment,
          background: responseData.background,
          characterStats: responseData.characterStats,
          race: responseData.race,
        }

        const classLevels = Array.isArray(levelsResponse)
          ? levelsResponse
              .filter((lvl: any) => {
                const lvlCharacterId = lvl?.id?.characterId ?? lvl?.character?.id
                return Number(lvlCharacterId) === Number(characterId)
              })
              .map((lvl: any) => {
                const classId = Number(lvl?.id?.classId ?? lvl?.dndClass?.id ?? 0)
                const description = String(lvl?.dndClass?.description ?? 'Unknown')
                const level = Number(lvl?.level ?? 0)
                const rawCharacteristics = lvl?.dndClass?.levelCharacteristics
                const features =
                  rawCharacteristics && typeof rawCharacteristics === 'object'
                    ? Object.entries(rawCharacteristics)
                        .map(([k, v]) => ({ level: Number(k), text: String(v) }))
                        .filter((f) => Number.isFinite(f.level) && f.level > 0 && f.level <= level)
                        .filter((f) => f.text && f.text !== 'null' && f.text !== 'undefined')
                        .sort((a, b) => a.level - b.level)
                    : []

                return { classId, description, level, features }
              })
              .filter((x: any) => x.classId)
          : []

        setCharacterSheetData({
          name: mappedData.name || '',
          classes: classLevels,
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

    fetchCharacterSheet()
  }, [characterId])

  if (loading) {
    return <div className="loading-container">Loading character sheet...</div>
  }

  if (error) {
    return (
      <div>
        <header className="app-header">
          <h1>D&D Manager</h1>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </header>
        <div style={{ padding: '2rem' }}>
          <button className="link-button" onClick={onBack}>← Back to Home</button>
          <div className="error-message" style={{ marginTop: '1rem' }}>Error: {error}</div>
        </div>
      </div>
    )
  }

  if (!characterSheetData) {
    return null
  }

  return (
    <div>
      <header className="app-header">
        <h1>D&D Manager</h1>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </header>
      <div style={{ padding: '1rem 2rem' }}>
        <button className="link-button" onClick={onBack}>← Back to Home</button>
      </div>
      <div className="character-sheet">
        <div className="header-section">
          <div className="basic-info">
            <div className='infobox'>
              <h3>Name: </h3>
              <p>{characterSheetData.name}</p>
            </div>
            <div className='infobox'>
              <h3>Class: </h3>
              {characterSheetData.classes.length > 0 ? (
                <div>
                  {characterSheetData.classes.map((c) => (
                    <p key={c.classId}>{c.description} (Level {c.level})</p>
                  ))}
                </div>
              ) : (
                <p>Not Specified</p>
              )}
            </div>
            <div className='infobox'>
              <h3>Race: </h3>
              <p>{characterSheetData.race}</p>
            </div>
            <div className='infobox'>
              <h3>Background: </h3>
              <p>{characterSheetData.background}</p>
            </div>
            <div className='infobox'>
              <h3>Alignment: </h3>
              <p>{characterSheetData.alignment}</p>
            </div>
            <div className='infobox'>
              <h3>Proficiency: </h3>
              <p>{characterSheetData.proficiency}</p>
            </div>
          </div>
        </div>

        <div className="ability-scores">
          <ScoreBox
            label="Strength"
            score={characterSheetData.abilityScores.Strength}
            skills={[{ name: 'Athletics', proficient: characterSheetData.proficiencies['Athletics'] }]}
            savingProficiency={characterSheetData.proficiencies['Strength']}
            proficiencyBonus={characterSheetData.proficiency}
          />
          <ScoreBox
            label="Dexterity"
            score={characterSheetData.abilityScores.Dexterity}
            skills={[
              { name: 'Acrobatics', proficient: characterSheetData.proficiencies['Acrobatics'] },
              { name: 'Sleight of Hand', proficient: characterSheetData.proficiencies['Sleight of Hand'] },
              { name: 'Stealth', proficient: characterSheetData.proficiencies['Stealth'] },
            ]}
            savingProficiency={characterSheetData.proficiencies['Dexterity']}
            proficiencyBonus={characterSheetData.proficiency}
          />
          <ScoreBox
            label="Constitution"
            score={characterSheetData.abilityScores.Constitution}
            skills={[]}
            savingProficiency={characterSheetData.proficiencies['Constitution']}
            proficiencyBonus={characterSheetData.proficiency}
          />
          <ScoreBox
            label="Intelligence"
            score={characterSheetData.abilityScores.Intelligence}
            skills={[
              { name: 'Arcana', proficient: characterSheetData.proficiencies['Arcana'] },
              { name: 'History', proficient: characterSheetData.proficiencies['History'] },
              { name: 'Investigation', proficient: characterSheetData.proficiencies['Investigation'] },
              { name: 'Nature', proficient: characterSheetData.proficiencies['Nature'] },
              { name: 'Religion', proficient: characterSheetData.proficiencies['Religion'] },
            ]}
            savingProficiency={characterSheetData.proficiencies['Intelligence']}
            proficiencyBonus={characterSheetData.proficiency}
          />
          <ScoreBox
            label="Wisdom"
            score={characterSheetData.abilityScores.Wisdom}
            skills={[
              { name: 'Animal Handling', proficient: characterSheetData.proficiencies['Animal Handling'] },
              { name: 'Insight', proficient: characterSheetData.proficiencies['Insight'] },
              { name: 'Medicine', proficient: characterSheetData.proficiencies['Medicine'] },
              { name: 'Perception', proficient: characterSheetData.proficiencies['Perception'] },
              { name: 'Survival', proficient: characterSheetData.proficiencies['Survival'] },
            ]}
            savingProficiency={characterSheetData.proficiencies['Wisdom']}
            proficiencyBonus={characterSheetData.proficiency}
          />
          <ScoreBox
            label="Charisma"
            score={characterSheetData.abilityScores.Charisma}
            skills={[
              { name: 'Deception', proficient: characterSheetData.proficiencies['Deception'] },
              { name: 'Intimidation', proficient: characterSheetData.proficiencies['Intimidation'] },
              { name: 'Performance', proficient: characterSheetData.proficiencies['Performance'] },
              { name: 'Persuasion', proficient: characterSheetData.proficiencies['Persuasion'] },
            ]}
            savingProficiency={characterSheetData.proficiencies['Charisma']}
            proficiencyBonus={characterSheetData.proficiency}
          />
        </div>

        <div className="stats-container">
          <div className="stat-box">
            <div>Armor Class</div>
            <div className="score">{10 + Math.floor((characterSheetData.abilityScores.Dexterity - 10) / 2)}</div>
          </div>
          <div className="stat-box">
            <div>Initiative</div>
            <div className="score">{Math.floor((characterSheetData.abilityScores.Dexterity - 10) / 2)}</div>
          </div>
          <div className="stat-box">
            <div>Speed</div>
            <div className="score">{characterSheetData.velocity}</div>
          </div>
        </div>

        <div className="features-section">
          <h3>Class Features</h3>
          {characterSheetData.classes.length === 0 ? (
            <div className="feature-item">No class features</div>
          ) : (
            characterSheetData.classes.map((c) => (
              <div key={c.classId}>
                <div className="feature-item">
                  <strong>{c.description} (Level {c.level})</strong>
                </div>
                {c.features.length === 0 ? (
                  <div className="feature-item">No features unlocked</div>
                ) : (
                  c.features.map((f) => (
                    <div key={`${c.classId}-${f.level}`} className="feature-item">
                      {f.text}
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </div>
        <div className="features-section">
          <h3>Character Features</h3>
          {characterSheetData.characteristics.map((feature, index) => (
            <div key={index} className="feature-item">
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
