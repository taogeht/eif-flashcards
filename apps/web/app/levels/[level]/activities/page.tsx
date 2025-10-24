import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ActivityContent from "./ActivityContent";
import { getLevelTitle, loadUnitBundle } from "@/lib/content";
import { resolveLevelParam } from "@/lib/levels";

interface ActivitiesPageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ unit?: string }>;
}

export async function generateMetadata({ params, searchParams }: ActivitiesPageProps): Promise<Metadata> {
  const [{ level }, query] = await Promise.all([params, searchParams]);
  const levelCode = resolveLevelParam(level);
  const unitSlug = query.unit;
  const baseTitle = levelCode ? getLevelTitle(levelCode) : "Activities";

  if (!levelCode || !unitSlug) {
    return { title: `${baseTitle} Activities | English Is Fun` };
  }

  try {
    const { unit } = await loadUnitBundle(levelCode, unitSlug);
    return {
      title: `${unit.title} | English Is Fun`
    };
  } catch {
    return { title: `${baseTitle} Activities | English Is Fun` };
  }
}

export default async function ActivitiesPage({ params, searchParams }: ActivitiesPageProps) {
  const [{ level }, query] = await Promise.all([params, searchParams]);
  const levelCode = resolveLevelParam(level);

  if (!levelCode) {
    notFound();
  }

  const unitSlug = query.unit;
  const assignmentId = query.assignment ?? null;
  const assignmentActivity = query.activity ?? null;

  if (!unitSlug) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">Choose a unit first</h2>
        <p className="mt-3 text-slate-600">Go back to the track list and pick a unit to load its activities.</p>
        <div className="mt-6 flex justify-center">
          <Link
            href={`/levels/${levelCode.toLowerCase()}`}
            className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Back to track list
          </Link>
        </div>
      </div>
    );
  }

  try {
    const bundle = await loadUnitBundle(levelCode, unitSlug);
    return (
      <ActivityContent
        level={levelCode}
        unit={bundle.unit}
        images={bundle.images}
        audio={bundle.audio}
        assignmentId={assignmentId}
        assignmentActivity={assignmentActivity}
      />
    );
  } catch {
    notFound();
  }
}
