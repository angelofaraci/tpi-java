interface User {
    id: number;
    // Add other user properties as needed
}

interface Campaign {
    id: number;
    // Add other campaign properties as needed
}

interface CharacterStats {
    id: number;
    // Add character stats properties as needed
}

interface Race {
    id: number;
    name: string;
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