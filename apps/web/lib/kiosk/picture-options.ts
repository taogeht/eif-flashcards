export interface PictureOption {
  id: string
  label: string
  emoji: string
  gradient: string
}

export const PICTURE_OPTIONS: PictureOption[] = [
  { id: 'rocket', label: 'Rocket', emoji: '🚀', gradient: 'from-orange-400 via-pink-400 to-red-500' },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈', gradient: 'from-purple-400 via-indigo-400 to-blue-500' },
  { id: 'dino', label: 'Dino', emoji: '🦕', gradient: 'from-emerald-400 via-lime-400 to-teal-500' },
  { id: 'star', label: 'Star', emoji: '⭐️', gradient: 'from-yellow-300 via-amber-400 to-orange-400' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄', gradient: 'from-fuchsia-400 via-pink-400 to-rose-400' },
  { id: 'robot', label: 'Robot', emoji: '🤖', gradient: 'from-slate-400 via-slate-500 to-gray-600' },
  { id: 'panda', label: 'Panda', emoji: '🐼', gradient: 'from-neutral-200 via-neutral-300 to-neutral-400' },
  { id: 'music', label: 'Music', emoji: '🎵', gradient: 'from-sky-400 via-blue-400 to-indigo-500' },
  { id: 'heart', label: 'Heart', emoji: '💖', gradient: 'from-rose-400 via-pink-400 to-rose-500' },
  { id: 'soccer', label: 'Soccer', emoji: '⚽️', gradient: 'from-slate-200 via-slate-300 to-slate-400' }
]

export const getPictureOption = (id: string | null | undefined): PictureOption | null =>
  id ? PICTURE_OPTIONS.find((option) => option.id === id) ?? null : null

