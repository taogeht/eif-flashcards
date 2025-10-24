import Link from "next/link";

const LEVELS = [
  { code: "1A", title: "Level 1A", description: "Getting started with English basics." },
  { code: "1B", title: "Level 1B", description: "Practice phonics and early vocabulary." },
  { code: "2A", title: "Level 2A", description: "Grow everyday conversation skills." },
  { code: "2B", title: "Level 2B", description: "Build confidence with reading and listening." },
  { code: "3A", title: "Level 3A", description: "Explore stories and express yourself." },
  { code: "3B", title: "Level 3B", description: "Master advanced vocabulary and grammar." }
];

export default function SplashPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 py-20 px-4">
      <section className="w-full max-w-5xl rounded-3xl bg-white/90 shadow-2xl ring-1 ring-indigo-100 backdrop-blur">
        <div className="px-8 py-12 sm:px-12">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">English Is Fun</p>
            <h1 className="mt-4 text-4xl font-bold text-slate-900 sm:text-5xl">Choose your learning level</h1>
            <p className="mt-3 text-lg text-slate-600">
              Jump into the songs, games, and practice activities designed for your class.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/practice"
                className="inline-flex items-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600"
              >
                Launch practice center
              </Link>
            </div>
          </header>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS.map((level) => (
              <Link
                key={level.code}
                href={`/levels/${level.code.toLowerCase()}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Level {level.code}
                  </span>
                  <span className="text-sm font-medium text-indigo-400 group-hover:text-indigo-500">Start →</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900">{level.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{level.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-indigo-500">
                  <span>View track list</span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
