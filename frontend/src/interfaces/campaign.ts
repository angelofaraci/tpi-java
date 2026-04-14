export interface CampaignParticipant {
  id: number
  username?: string
  email?: string
}

export interface CampaignCharacterReference {
  id: number
  name?: string
  alignment?: string
  background?: string
  race?: {
    id: number
    name?: string
  }
  user?: {
    id: number
    username?: string
  }
}

export interface Campaign {
  id: number
  joinCode?: string
  name: string
  description: string
  privacy: boolean
  creationDate?: string
  players?: CampaignParticipant[]
  characters?: CampaignCharacterReference[]
}

export interface OwnedCampaignSummary {
  id: number
  joinCode?: string
  name: string
  description: string
  privacy: boolean
  creationDate?: string
}

export interface PublicCampaignSummary {
  id: number
  name: string
  description: string
  privacy: boolean
  creationDate?: string
}

export interface CreateCampaignPayload {
  name: string
  description: string
  privacy: boolean
  creationDate?: string
  players?: CampaignParticipant[]
  characters?: CampaignCharacterReference[]
}

export interface PlayerCampaignSummary {
  campaignId: number
  campaignName: string
  campaignDescription: string
  privacy: boolean
  creationDate?: string
  characterId: number
  characterName: string
}
