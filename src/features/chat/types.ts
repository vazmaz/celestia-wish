export interface ChatMessage {
  id: string
  userId: string
  username: string
  body: string
  createdAt: number
}

export interface ChatMute {
  userId: string
  username: string
  chatMutedUntil: number
  chatMuteReason: string | null
}

export const CHAT_MUTE_PRESETS = [
  { minutes: 60, label: '1 час' },
  { minutes: 60 * 24, label: '24 часа' },
  { minutes: 60 * 24 * 7, label: '7 дней' },
  { minutes: -1, label: 'Навсегда' },
] as const
