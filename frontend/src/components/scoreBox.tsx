import '../styles/scoreBox.css'
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
