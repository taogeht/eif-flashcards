import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import ManageTeachersClient from "./ManageTeachersClient";
import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession } from "@/lib/teacher/auth";

export default async function AdminTeachersPage() {
  const cookieStore = await cookies();
  const session = getTeacherSession(cookieStore);

  if (!session || !session.allSchools) {
    redirect("/teacher/classes");
  }

  const client = supabaseServerClient();

  const [{ data: teacherRows, error: teacherError }, { data: schoolRows, error: schoolError }, { data: classRows, error: classError }] =
    await Promise.all([
      client
        .from("teachers")
        .select("id, email, first_name, last_name, full_name, school_id, is_admin, school:schools(id, name)")
        .order("full_name", { ascending: true }),
      client.from("schools").select("id, name").order("name", { ascending: true }),
      client
        .from("classes")
        .select("id, name, code, school_id, teacher_id")
        .order("name", { ascending: true })
    ]);

  if (teacherError) {
    console.error("Unable to load teachers", teacherError);
  }

  if (schoolError) {
    console.error("Unable to load schools", schoolError);
  }

  if (classError) {
    console.error("Unable to load classes", classError);
  }

  const teachers = (teacherRows ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name ?? row.full_name ?? null,
    lastName: row.last_name ?? null,
    schoolId: row.school_id,
    schoolName: row.school?.name ?? null,
    isAdmin: Boolean(row.is_admin)
  }));

  const schools = (schoolRows ?? []).map((row) => ({
    id: row.id,
    name: row.name
  }));

  const classes = (classRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    schoolId: row.school_id,
    teacherId: row.teacher_id
  }));

  return <ManageTeachersClient initialTeachers={teachers} schools={schools} classes={classes} />;
}
