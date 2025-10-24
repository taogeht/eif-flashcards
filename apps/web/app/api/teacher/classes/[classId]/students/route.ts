import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { supabaseServerClient } from "@/lib/supabase/server";
import { PICTURE_OPTIONS } from "@/lib/kiosk/picture-options";
import { getTeacherSession } from "@/lib/teacher/auth";

const VALID_PICTURE_IDS = new Set(PICTURE_OPTIONS.map((option) => option.id));

interface CreateStudentPayload {
  studentId?: string | null;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  picturePassword?: string | null;
}

const ensureEnrollment = async (
  client: ReturnType<typeof supabaseServerClient>,
  classId: string,
  studentId: string
) => {
  const { data: existingEnrollment, error: existingError } = await client
    .from("enrollments")
    .select("id, left_on")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    throw existingError;
  }

  if (existingEnrollment) {
    if (existingEnrollment.left_on === null) {
      const error = new Error("ALREADY_ENROLLED");
      error.name = "ALREADY_ENROLLED";
      throw error;
    }

    const { error: reactivateError } = await client
      .from("enrollments")
      .update({ left_on: null })
      .eq("id", existingEnrollment.id);

    if (reactivateError) {
      throw reactivateError;
    }

    return existingEnrollment.id as string;
  }

  const { data: enrollmentRow, error: enrollmentError } = await client
    .from("enrollments")
    .insert({
      student_id: studentId,
      class_id: classId,
      left_on: null
    })
    .select("id")
    .single();

  if (enrollmentError) {
    throw enrollmentError;
  }

  return enrollmentRow.id as string;
};

export async function POST(request: NextRequest, { params }: { params: { classId: string } }) {
  const classId = params.classId;

  if (!classId) {
    return NextResponse.json({ error: "Class ID is required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateStudentPayload;
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

    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";

    if (studentId) {
      const { data: studentRow, error: studentFetchError } = await client
        .from("students")
        .select("id, first_name, last_name, avatar_url, school_id")
        .eq("id", studentId)
        .maybeSingle();

      if (studentFetchError) {
        throw studentFetchError;
      }

      if (!studentRow) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }

      if (classSchoolId && studentRow.school_id && studentRow.school_id !== classSchoolId) {
        return NextResponse.json({ error: "Student belongs to a different school." }, { status: 409 });
      }

      if (classSchoolId && !studentRow.school_id) {
        await client.from("students").update({ school_id: classSchoolId }).eq("id", studentRow.id);
      }

      try {
        await ensureEnrollment(client, classId, studentRow.id);
      } catch (enrollError) {
        if ((enrollError as Error).name === "ALREADY_ENROLLED") {
          return NextResponse.json({ error: "Student is already enrolled in this class." }, { status: 409 });
        }
        throw enrollError;
      }

      revalidatePath(`/teacher/class/${classId}`);

      return NextResponse.json({
        ok: true,
        student: {
          id: studentRow.id,
          firstName: studentRow.first_name,
          lastName: studentRow.last_name,
          avatarUrl: studentRow.avatar_url
        }
      });
    }

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const avatarUrlRaw = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const avatarUrl = avatarUrlRaw.length ? avatarUrlRaw : null;
    const picturePasswordRaw = typeof body.picturePassword === "string" ? body.picturePassword.trim() : "";
    const picturePassword = picturePasswordRaw.length ? picturePasswordRaw : null;

    if (!firstName) {
      return NextResponse.json({ error: "First name is required to create a student." }, { status: 400 });
    }

    if (picturePassword && !VALID_PICTURE_IDS.has(picturePassword)) {
      return NextResponse.json({ error: "Invalid picture password selection." }, { status: 400 });
    }

    const { data: studentInsertRow, error: studentInsertError } = await client
      .from("students")
      .insert({
        first_name: firstName,
        last_name: lastName || null,
        avatar_url: avatarUrl,
        picture_password: picturePassword,
        school_id: classSchoolId
      })
      .select("id, first_name, last_name, avatar_url, picture_password")
      .single();

    if (studentInsertError) {
      console.error("Unable to create student", studentInsertError);
      return NextResponse.json({ error: "Unable to create student." }, { status: 500 });
    }

    try {
      await ensureEnrollment(client, classId, studentInsertRow.id);
    } catch (enrollError) {
      if ((enrollError as Error).name === "ALREADY_ENROLLED") {
        return NextResponse.json({ error: "Student is already enrolled in this class." }, { status: 409 });
      }
      throw enrollError;
    }

    revalidatePath(`/teacher/class/${classId}`);

    return NextResponse.json({
      ok: true,
      student: {
        id: studentInsertRow.id,
        firstName: studentInsertRow.first_name,
        lastName: studentInsertRow.last_name,
        avatarUrl: studentInsertRow.avatar_url,
        picturePassword: studentInsertRow.picture_password
      }
    });
  } catch (error) {
    console.error("Unexpected error creating/enrolling student", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
