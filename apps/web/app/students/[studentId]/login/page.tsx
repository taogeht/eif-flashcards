import { notFound } from "next/navigation";

import StudentDirectLoginClient from "./StudentDirectLoginClient";
import { supabaseServerClient } from "@/lib/supabase/server";
import { levelForClass } from "@/lib/levels";
import type { ClassLevel } from "@/config/types";

interface StudentLoginPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDirectLoginPage({ params }: StudentLoginPageProps) {
  const { studentId } = await params;
  const client = supabaseServerClient();

  const { data: student, error: studentError } = await client
    .from("students")
    .select("id, first_name, last_name, avatar_url, picture_password")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Failed to load student", studentError);
    notFound();
  }

  if (!student) {
    notFound();
  }

  const { data: enrollment, error: enrollmentError } = await client
    .from("enrollments")
    .select("class:classes!inner(id, name, level, code, term_id)")
    .eq("student_id", studentId)
    .is("left_on", null)
    .maybeSingle();

  if (enrollmentError) {
    console.error("Failed to load enrollment", enrollmentError);
  }

  if (!enrollment?.class) {
    notFound();
  }

  let termCode: string | null = null;
  if (enrollment.class.term_id) {
    const { data: term, error: termError } = await client
      .from("terms")
      .select("code")
      .eq("id", enrollment.class.term_id)
      .maybeSingle();
    if (termError) {
      console.error("Failed to load term for student", termError);
    }
    termCode = term?.code ?? null;
  }

  const levelCode = levelForClass(enrollment.class.level as ClassLevel, termCode);

  return (
    <StudentDirectLoginClient
      student={{
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        avatarUrl: student.avatar_url,
        picturePassword: student.picture_password
      }}
      classInfo={{
        id: enrollment.class.id,
        name: enrollment.class.name,
        code: enrollment.class.code,
        levelCode
      }}
    />
  );
}
