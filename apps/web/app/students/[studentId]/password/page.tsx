import { notFound } from "next/navigation";

import StudentPasswordClient from "./StudentPasswordClient";
import { supabaseServerClient } from "@/lib/supabase/server";

interface StudentPasswordPageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentPasswordPage({ params }: StudentPasswordPageProps) {
  const { studentId } = await params;

  const client = supabaseServerClient();
  const { data: student, error } = await client
    .from("students")
    .select("id, first_name, last_name, picture_password")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load student", error);
    notFound();
  }

  if (!student) {
    notFound();
  }

  return (
    <StudentPasswordClient
      student={{
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        picturePassword: student.picture_password
      }}
    />
  );
}
