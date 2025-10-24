import Link from "next/link";

export default function TeacherHomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Teacher Portal</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Welcome back!</h1>
        <p className="mt-2 text-lg text-slate-600">
          Jump to your classes, review assignments, or monitor today’s practice.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <Link
          href="/teacher/classes"
          className="rounded-3xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-slate-900">Class dashboards</h2>
          <p className="mt-2 text-sm text-slate-600">See practice time, assignment progress, and who needs support.</p>
        </Link>

        <Link
          href="/teacher/reports"
          className="rounded-3xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-slate-900">Reports & exports</h2>
          <p className="mt-2 text-sm text-slate-600">Weekly summaries and CSV exports (coming soon).</p>
        </Link>
      </section>
    </div>
  );
}
