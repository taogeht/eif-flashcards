import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession } from "@/lib/teacher/auth";

export default async function TeacherClassesPage() {
  const cookieStore = await cookies();
  const session = getTeacherSession(cookieStore);

  if (!session) {
    redirect("/teacher/login");
  }

  const client = supabaseServerClient();
  let query = client
    .from("classes")
    .select("id, name, code, level, term_id, school_id, teacher_id")
    .order("name", { ascending: true });

  if (!session.allSchools) {
    query = query.eq("school_id", session.schoolId).eq("teacher_id", session.teacherId);
  }

  const { data: classes, error } = await query;

  if (error) {
    console.error("Unable to load classes", error);
    return <p className="p-6 text-sm text-rose-600">Unable to load classes right now.</p>;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Teacher Portal</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">My classes</h1>
        <p className="mt-2 text-lg text-slate-600">Tap a class to open its dashboard.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {(classes ?? []).map((classRow) => (
          <Link
            key={classRow.id}
            href={`/teacher/class/${classRow.id}`}
            className="rounded-3xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-6 shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
          >
            <h2 className="text-2xl font-semibold text-slate-900">{classRow.name}</h2>
            <p className="mt-2 text-sm text-slate-600">Level {classRow.level} · Code {classRow.code ?? '—'}</p>
          </Link>
        ))}
        {(classes ?? []).length === 0 && <p className="text-sm text-slate-500">No classes yet.</p>}
      </section>
    </div>
  );
}
