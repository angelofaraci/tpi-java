import '../styles/scoreBox.css'
export interface ScoreBoxProps {
    score: number;
    label: string;
    proficiencyBonus: number;
    skills: Array<{ name: string; proficient: boolean }>;
    savingProficiency: number;
}

export function ScoreBox({ score, label, skills = [], savingProficiency, proficiencyBonus }: ScoreBoxProps) {
    const abilityModifier: number = Math.floor((score - 10) / 2);
    
    return (
        <div className="ability-score-container">
            <div className="ability-label">{label}</div>
            <div className="score-box">
                <div className="modifier">{abilityModifier >= 0 ? `+${abilityModifier}` : abilityModifier}</div>
                <div className="score">{score}</div>
            </div>
            <hr></hr>
            <div className='ability-proficiency-label'>
                <input type="checkbox" checked={savingProficiency==1} readOnly />
                <span> Saving throw: {abilityModifier + savingProficiency*proficiencyBonus}</span>
            </div>
            <hr></hr>
                {skills.length > 0 && (
                <div className="skills-list">
                    {skills.map((skill) => (
                        <div key={skill.name} className="skill-item">
                            <input type="checkbox" checked={skill.proficient} readOnly />
                            <span>{skill.name}: {abilityModifier + (skill.proficient? proficiencyBonus:0)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}