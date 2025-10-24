import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession } from "@/lib/teacher/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: { classId: string; studentId: string } }
) {
  const classId = params.classId;
  const studentId = params.studentId;

  if (!classId || !studentId) {
    return NextResponse.json({ error: "Class ID and student ID are required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const client = supabaseServerClient();

    const { data: classRow, error: classError } = await client
      .from("classes")
      .select("id, school_id")
      .eq("id", classId)
      .maybeSingle();

    if (classError) {
      console.error("Unable to load class", classError);
      return NextResponse.json({ error: "Unable to load class." }, { status: 500 });
    }

    if (!classRow) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const classSchoolId = classRow.school_id ?? null;
    if (!session.allSchools) {
      if (!classSchoolId || classSchoolId !== session.schoolId) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const { data: enrollmentRow, error: enrollmentError } = await client
      .from("enrollments")
      .update({ left_on: new Date().toISOString() })
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .is("left_on", null)
      .select("id")
      .maybeSingle();

    if (enrollmentError) {
      if (enrollmentError.code === "PGRST116") {
        return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
      }
      console.error("Unable to remove enrollment", enrollmentError);
      return NextResponse.json({ error: "Unable to update enrollment." }, { status: 500 });
    }

    if (!enrollmentRow) {
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    revalidatePath(`/teacher/class/${classId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error removing student from class", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
