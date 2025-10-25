import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";

import audioIndex from "@eif/content/audio.index.json";
import imageIndex from "@eif/content/images.index.json";
import levelMeta from "@eif/content/levels.meta.json";

import type { LevelCode } from "@/config/types";

export interface UnitItem {
  id: number;
  text: string;
  imageKey: string;
  audioKey: string;
}

export interface UnitContent {
  slug: string;
  title: string;
  level: LevelCode;
  order: number;
  audioKey: string;
  items: UnitItem[];
}

export interface UnitBundle {
  unit: UnitContent;
  images: Record<string, string>;
  audio: Record<string, string>;
}

const contentRoot = (() => {
  const candidates = [
    path.resolve(process.cwd(), "packages", "content"),
    path.resolve(process.cwd(), "..", "packages", "content"),
    path.resolve(process.cwd(), "..", "..", "packages", "content")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
})();
const assetBase = (() => {
  const value = process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? process.env.ASSETS_BASE_URL ?? "";
  return value ? value.replace(/\/+$/, "") : "";
})();

const resolveAssetPath = (value: string): string => {
  if (!assetBase) {
    return value;
  }

  const normalized = value.replace(/^\/+/, "");
  if (assetBase.endsWith("/assets") && normalized.startsWith("assets/")) {
    const trimmed = normalized.slice("assets/".length);
    return `${assetBase}/${trimmed}`;
  }

  return `${assetBase}/${normalized}`;
};

export const imagesMap = Object.fromEntries(
  Object.entries(imageIndex as Record<string, string>).map(([key, value]) => [key, resolveAssetPath(value)])
) as Record<string, string>;

export const audioMap = Object.fromEntries(
  Object.entries(audioIndex as Record<string, string>).map(([key, value]) => [key, resolveAssetPath(value)])
) as Record<string, string>;
const levelMetadata = levelMeta as Record<LevelCode, { title: string }>;

async function readUnit(level: LevelCode, slug: string): Promise<UnitContent> {
  const filePath = path.join(contentRoot, "levels", level, `${slug}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as UnitContent;
}

export async function loadUnits(level: LevelCode): Promise<UnitContent[]> {
  const dir = path.join(contentRoot, "levels", level);
  const files = await fs.readdir(dir);
  const units = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readUnit(level, path.parse(file).name))
  );

  return units.sort((a, b) => a.order - b.order);
}

export async function loadUnitBundle(level: LevelCode, slug: string): Promise<UnitBundle> {
  const unit = await readUnit(level, slug);
  return {
    unit,
    images: imagesMap,
    audio: audioMap
  };
}

export const getLevelTitle = (level: LevelCode): string => levelMetadata[level]?.title ?? `Level ${level}`;
