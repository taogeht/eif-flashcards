export type AvatarPresetId = 'boy' | 'girl'

export interface AvatarPreset {
  id: AvatarPresetId
  label: string
  emoji: string
  gradient: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'boy', label: 'Boy avatar', emoji: '🧒', gradient: 'from-blue-100 to-indigo-200' },
  { id: 'girl', label: 'Girl avatar', emoji: '👧', gradient: 'from-pink-100 to-rose-200' }
]

export const buildPresetValue = (id: AvatarPresetId) => `preset:${id}`

export const findAvatarPreset = (value?: string | null): AvatarPreset | null => {
  if (!value || !value.startsWith('preset:')) {
    return null
  }
  const presetId = value.slice('preset:'.length) as AvatarPresetId
  return AVATAR_PRESETS.find((preset) => preset.id === presetId) ?? null
}
