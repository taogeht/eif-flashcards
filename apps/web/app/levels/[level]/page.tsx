import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrackList from "@/components/TrackList";
import { resolveLevelParam } from "@/lib/levels";
import { audioMap, getLevelTitle, loadUnits } from "@/lib/content";

interface LevelPageProps {
  params: Promise<{ level: string }>;
}

export async function generateMetadata({ params }: LevelPageProps): Promise<Metadata> {
  const { level } = await params;
  const levelCode = resolveLevelParam(level);
  const levelTitle = levelCode ? getLevelTitle(levelCode) : "Level";
  return {
    title: `${levelTitle} | English Is Fun`
  };
}

export default async function LevelPage({ params }: LevelPageProps) {
  const { level } = await params;
  const levelCode = resolveLevelParam(level);

  if (!levelCode) {
    notFound();
  }

  const title = getLevelTitle(levelCode);
  const units = await loadUnits(levelCode);
  const trackUnits = units.map((unit) => ({
    slug: unit.slug,
    title: unit.title,
    audioUrl: audioMap[unit.audioKey]
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Track Library</p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Listen to the unit songs and open the matching activities. Pick any track to get started.
            </p>
          </div>
          <Link
            href={`/practice?level=${levelCode.toLowerCase()}`}
            className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600"
          >
            Practice flashcards
          </Link>
        </div>
        <div className="mt-8">
          <TrackList level={levelCode} units={trackUnits} />
        </div>
      </div>
    </div>
  );
}
