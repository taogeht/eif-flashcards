import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession } from "@/lib/teacher/auth";

export async function GET(request: NextRequest, { params }: { params: { classId: string } }) {
  const classId = params.classId;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!classId) {
    return NextResponse.json({ error: "Class ID is required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (query.length < 2) {
    return NextResponse.json({ students: [] });
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

    const sanitizedQuery = query.replace(/[,%]/g, "").replace(/[%_]/g, (match) => `\\${match}`);

    const { data: searchRows, error: searchError } = await client
      .from("students")
      .select("id, first_name, last_name, avatar_url, school_id, enrollments!left(class_id)")
      .or(`first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`)
      .limit(20);

    if (searchError) {
      console.error("Unable to search students", searchError);
      return NextResponse.json({ error: "Unable to search students." }, { status: 500 });
    }

    const results = (searchRows ?? [])
      .filter((student) => {
        const enrollmentMatches = Array.isArray(student.enrollments)
          ? student.enrollments.some((enrollment: { class_id?: string | null }) => enrollment?.class_id === classId)
          : false;

        if (enrollmentMatches) {
          return false;
        }

        if (!session.allSchools && classSchoolId) {
          if (student.school_id && student.school_id !== classSchoolId) {
            return false;
          }
        }

        return true;
      })
      .map((student) => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        avatarUrl: student.avatar_url
      }));

    return NextResponse.json({ students: results });
  } catch (error) {
    console.error("Unexpected error searching students", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
