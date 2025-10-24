interface ProgressStripProps {
  minutes: number;
  streak: number;
  mastered: number;
  total: number;
}

export default function ProgressStrip({ minutes, streak, mastered, total }: ProgressStripProps) {
  const completion = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <MetricCard label="Minutes Today" value={`${minutes}`} description="Keep it up for a solid streak!" />
        <MetricCard label="Streak" value={`${streak}🔥`} description="Consecutive practice days" />
        <MetricCard label="Words Mastered" value={`${mastered}/${total}`} description="Across Today’s 10" />
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all"
          style={{ width: `${completion}%` }}
        />
      </div>
      <p className="text-sm text-slate-500">{completion}% complete</p>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <div className="flex-1 min-w-[160px] rounded-2xl border border-indigo-100 bg-white/70 px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
