export default function SuperAdminHomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-purple-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-500">Super Admin</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Operations dashboard</h1>
        <p className="mt-2 text-lg text-slate-600">
          Monitor schools, content releases, and platform health from one place. Modules coming soon.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border-4 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-100 p-6 shadow-md">
          <h2 className="text-2xl font-semibold text-slate-900">School directory</h2>
          <p className="mt-2 text-sm text-slate-600">Add new schools, manage terms, and view enrollment metrics.</p>
        </div>
        <div className="rounded-3xl border-4 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-100 p-6 shadow-md">
          <h2 className="text-2xl font-semibold text-slate-900">Content & releases</h2>
          <p className="mt-2 text-sm text-slate-600">Track level releases, audio updates, and QR pack printing.</p>
        </div>
      </section>
    </div>
  );
}
