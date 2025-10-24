import { LEVEL_CODES } from "@/config/types";
import type { ClassLevel, LevelCode } from "@/config/types";

export const isLevelCode = (value: string): value is LevelCode =>
  (LEVEL_CODES as readonly string[]).includes(value as LevelCode);

export const resolveLevelParam = (value: string): LevelCode | null => {
  const normalized = value.toUpperCase();
  return isLevelCode(normalized) ? (normalized as LevelCode) : null;
};

export const levelForClass = (classLevel: ClassLevel, termCode: string | null | undefined): LevelCode => {
  const isH1 = typeof termCode === "string" ? /-H1$/i.test(termCode) : true;

  switch (classLevel) {
    case "Small":
      return isH1 ? "1A" : "1B";
    case "Middle":
      return isH1 ? "2A" : "2B";
    case "Big":
    default:
      return isH1 ? "3A" : "3B";
  }
};
