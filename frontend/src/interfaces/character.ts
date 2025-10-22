interface User {
    id: number;
    username: string;
    email: string;
    isDm: Campaign[]; // Campaigns where the user is a Dungeon Master
    characters: Character[];
}

interface Campaign {
    id: number;
    dm: User;
    name: string;
    description: string;
    privacy: boolean;
    creationDate: string;
    players: User[];
    characters?: Character[];
}

interface CharacterStats {
    id: number;
    xp: number;
    proficiency: number;
    abilityScores: {
        Strength: number;
        Dexterity: number;
        Constitution: number;
        Intelligence: number;
        Wisdom: number;
        Charisma: number;
    };
    velocities: number[];
    proficiencies: {
        [key: string]: number;
    }
    hp: number
}

interface Race {
    id: number;
    name: string;
    description: string;
    feats: string[];
    // Add race properties as needed
}

export interface Character {
    id: number;
    user: User;
    campaign: Campaign;
    name: string;
    characteristics: string[];
    alignment: string;
    background: string;
    characterStats: CharacterStats;
    race: Race;
}