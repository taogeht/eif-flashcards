export const LEVEL_CODES = ["1A", "1B", "2A", "2B", "3A", "3B"] as const;

export type LevelCode = (typeof LEVEL_CODES)[number];
export type ClassLevel = "Small" | "Middle" | "Big";

export interface FlashCard {
  id: number;
  word: string;
  image: string;
}

export interface Track {
  id: number;
  name: string;
  numFlashcards: number;
  cards: FlashCard[];
}
