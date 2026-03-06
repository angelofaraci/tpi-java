export interface CampaignParticipant {
  id: number
  username?: string
  email?: string
}

export interface CampaignCharacterReference {
  id: number
}

export interface Campaign {
  id: number
  name: string
  description: string
  privacy: boolean
  creationDate?: string
  players?: CampaignParticipant[]
  characters?: CampaignCharacterReference[]
}

export interface OwnedCampaignSummary {
  id: number
  name: string
  description: string
  privacy: boolean
  creationDate?: string
  playerCount: number
}

export interface CreateCampaignPayload {
  name: string
  description: string
  privacy: boolean
  creationDate?: string
  players?: CampaignParticipant[]
  characters?: CampaignCharacterReference[]
}
