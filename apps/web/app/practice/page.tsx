import PracticeClient from "./PracticeClient";
import { LEVEL_CODES, type LevelCode } from "@/config/types";
import { audioMap, getLevelTitle, imagesMap, loadUnits } from "@/lib/content";
import { resolveLevelParam } from "@/lib/levels";

interface PracticePageProps {
  searchParams: Promise<{ level?: string }>;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const query = await searchParams;
  const requestedLevel = query.level ? resolveLevelParam(query.level) : null;
  const codesToLoad: LevelCode[] = requestedLevel
    ? [requestedLevel]
    : LEVEL_CODES.map((code) => code as LevelCode);

  const levels = await Promise.all(
    codesToLoad.map(async (code) => {
      const units = await loadUnits(code);
      return {
        code,
        title: getLevelTitle(code),
        units
      };
    })
  );

  return <PracticeClient levels={levels} audio={audioMap} images={imagesMap} />;
}
