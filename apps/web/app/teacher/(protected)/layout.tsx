import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getTeacherSession } from "@/lib/teacher/auth";
import TeacherToolbar from "./TeacherToolbar";
import { supabaseServerClient } from "@/lib/supabase/server";

export default async function TeacherProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = getTeacherSession(cookieStore);

  if (!session) {
    redirect("/teacher/login");
  }

  const isAdmin = session.allSchools;
  let teacherName: string | null = null;

  if (isAdmin) {
    teacherName = "Teacher Admin";
  } else {
    const client = supabaseServerClient();
    const { data: teacherRow } = await client
      .from("teachers")
      .select("id, full_name, email, school_id")
      .eq("id", session.teacherId)
      .maybeSingle();

    if (!teacherRow) {
      redirect("/teacher/login");
    }

    if (teacherRow.school_id && session.schoolId && teacherRow.school_id !== session.schoolId) {
      redirect("/teacher/login");
    }

    teacherName = teacherRow.full_name ?? teacherRow.email ?? null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TeacherToolbar teacherName={teacherName} isAdmin={isAdmin} />
      {children}
    </div>
  );
}
