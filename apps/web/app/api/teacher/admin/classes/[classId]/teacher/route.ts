import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession } from "@/lib/teacher/auth";

interface AssignTeacherPayload {
  teacherId?: string | null;
}

export async function PATCH(request: NextRequest, { params }: { params: { classId: string } }) {
  const classId = params.classId;

  if (!classId) {
    return NextResponse.json({ error: "Class ID is required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  if (!session || !session.allSchools) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { teacherId } = (await request.json()) as AssignTeacherPayload;
    const client = supabaseServerClient();

    if (teacherId) {
      const { data: teacherRow, error: teacherError } = await client
        .from("teachers")
        .select("id, school_id")
        .eq("id", teacherId)
        .maybeSingle();

      if (teacherError) {
        console.error("Unable to load teacher", teacherError);
        return NextResponse.json({ error: "Unable to load teacher." }, { status: 500 });
      }

      if (!teacherRow) {
        return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
      }

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

      if (classRow.school_id && teacherRow.school_id && classRow.school_id !== teacherRow.school_id) {
        return NextResponse.json({ error: "Teacher belongs to a different school." }, { status: 409 });
      }
    }

    const { data, error } = await client
      .from("classes")
      .update({ teacher_id: teacherId ?? null })
      .eq("id", classId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Unable to assign teacher", error);
      return NextResponse.json({ error: "Unable to assign teacher." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    revalidatePath("/teacher/admin/teachers");
    revalidatePath("/teacher/classes");
    revalidatePath(`/teacher/class/${classId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error assigning teacher", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
