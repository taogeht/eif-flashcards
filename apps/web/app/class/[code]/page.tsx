import { notFound } from "next/navigation";

import ClassLoginClient from "./ClassLoginClient";
import { supabaseServerClient } from "@/lib/supabase/server";
import { levelForClass } from "@/lib/levels";
import type { ClassLevel } from "@/config/types";

interface ClassPageProps {
  params: Promise<{ code: string }>;
}

export default async function ClassLoginPage({ params }: ClassPageProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const client = supabaseServerClient();

  const { data: classRow, error: classError } = await client
    .from("classes")
    .select("id, name, level, code, term_id")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (classError) {
    console.error("Failed to load class", classError);
    notFound();
  }

  if (!classRow) {
    notFound();
  }

  let termCode: string | null = null;
  if (classRow.term_id) {
    const { data: termRow, error: termError } = await client
      .from("terms")
      .select("code")
      .eq("id", classRow.term_id)
      .maybeSingle();

    if (termError) {
      console.error("Failed to load term", termError);
    }

    termCode = termRow?.code ?? null;
  }

  const { data: enrollmentRows, error: studentsError } = await client
    .from("enrollments")
    .select(
      "student:students!inner(id, first_name, last_name, avatar_url, picture_password)",
    )
    .eq("class_id", classRow.id)
    .is("left_on", null)
    .order("first_name", { ascending: true, foreignTable: "students" });

  if (studentsError) {
    console.error("Failed to load students", studentsError);
    notFound();
  }

  const students = (enrollmentRows ?? [])
    .map((row) => row.student)
    .filter((student): student is Exclude<typeof student, null> => Boolean(student))
    .map((student) => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      avatarUrl: student.avatar_url,
      picturePassword: student.picture_password
    }));

  const classLevel = classRow.level as ClassLevel;
  const levelCode = levelForClass(classLevel, termCode);

  return (
    <ClassLoginClient
      classInfo={{
        id: classRow.id,
        name: classRow.name,
        code: classRow.code,
        level: classLevel,
        levelCode,
        termCode
      }}
      students={students}
    />
  );
}
