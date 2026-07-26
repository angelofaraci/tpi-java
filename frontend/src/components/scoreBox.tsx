import '../styles/scoreBox.css'
import type { AbilityScoreName, AbilityScores } from '../interfaces/character'

const ABILITY_ORDER: AbilityScoreName[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
]

const ABILITY_LABELS: Record<AbilityScoreName, string> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
}

export interface AbilityScoreStripProps {
  abilityScores: AbilityScores
}

// Compact, read-only STR-CHA strip for CharacterCard (design.md Component Interfaces).
// A cell is highlighted when its score >= 16 — client-derived, no new data.
export function AbilityScoreStrip({ abilityScores }: AbilityScoreStripProps) {
  return (
    <div
      role="group"
      aria-label="Ability scores"
      className="grid grid-cols-6 gap-px overflow-hidden rounded-home-lg bg-home-line"
    >
      {ABILITY_ORDER.map((name) => {
        const score = abilityScores[name]
        const highlighted = score >= 16

        return (
          <div key={name} className="bg-home-surface-in py-[7px] text-center">
            <div className="font-home-mono text-[8.5px] tracking-[.1em] text-home-dim-2">
              {ABILITY_LABELS[name]}
            </div>
            <div
              data-highlighted={highlighted}
              className={
                highlighted
                  ? 'mt-[3px] font-home-mono text-[13px] text-home-blue-300'
                  : 'mt-[3px] font-home-mono text-[13px] text-home-text-soft'
              }
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {score}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface ScoreBoxProps {
    score: number;
    label: string;
    proficiencyBonus: number;
    skills: Array<{ name: string; proficient: number }>;
    savingProficiency: number;
}

function getProficiencyTag(level: number) {
    if (level >= 2) {
        return { text: 'E', className: 'proficiency-tag expertise' }
    }
    if (level === 1) {
        return { text: 'P', className: 'proficiency-tag proficient' }
    }
    return null
}

export function ScoreBox({ score, label, skills = [], savingProficiency, proficiencyBonus }: ScoreBoxProps) {
    const abilityModifier: number = Math.floor((score - 10) / 2);
    const savingTag = getProficiencyTag(savingProficiency)
    
    return (
        <div className="ability-score-container">
            <div className="ability-label">{label}</div>
            <div className="score-box">
                <div className="modifier">{abilityModifier >= 0 ? `+${abilityModifier}` : abilityModifier}</div>
                <div className="score">{score}</div>
            </div>
            <hr></hr>
            <div className='ability-proficiency-label'>
                {savingTag && (
                    <span className={savingTag.className} title="Saving throw proficiency">
                        {savingTag.text}
                    </span>
                )}
                <span> 
                    Saving throw: {abilityModifier + savingProficiency*proficiencyBonus}
                </span>
            </div>
            <hr></hr>
                {skills.length > 0 && (
                <div className="skills-list">
                    {skills.map((skill) => {
                        const skillTag = getProficiencyTag(skill.proficient)
                        return (
                            <div key={skill.name} className="skill-item">
                                {skillTag && (
                                    <span className={skillTag.className} title="Skill proficiency">
                                        {skillTag.text}
                                    </span>
                                )}
                                <span className={
                                    skill.proficient >= 2
                                        ? 'skill-text expertise'
                                        : skill.proficient === 1
                                            ? 'skill-text proficient'
                                            : 'skill-text'
                                }>
                                    {skill.name}: {abilityModifier + skill.proficient * proficiencyBonus}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
