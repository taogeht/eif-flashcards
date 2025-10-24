import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  TEACHER_SESSION_COOKIE,
  teacherSessionCookieOptions,
  createTeacherSessionValue,
  getTeacherSession,
  hashTeacherPasscode
} from "@/lib/teacher/auth";
import { supabaseServerClient } from "@/lib/supabase/server";

interface TeacherSessionPayload {
  email?: string;
  passcode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, passcode } = (await request.json()) as TeacherSessionPayload;
    const normalizedEmail = email?.trim().toLowerCase();
    const trimmedPasscode = passcode?.trim();

    if (!trimmedPasscode) {
      return NextResponse.json({ error: "Passcode is required." }, { status: 400 });
    }

    const client = supabaseServerClient();
    let teacherId: string | null = null;
    let schoolId: string | null = null;
    let teacherName: string | null = null;
    let allSchools = false;

    if (normalizedEmail) {
      let teacherRow: {
        id: string;
        email: string | null;
        full_name: string | null;
        passcode_hash: string | null;
        school_id: string | null;
        is_admin?: boolean | null;
      } | null = null;

      let { data, error } = await client
        .from("teachers")
        .select("id, email, full_name, passcode_hash, school_id, is_admin")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (error && error.code === "42703") {
        const fallback = await client
          .from("teachers")
          .select("id, email, full_name, passcode_hash, school_id")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("Unable to load teacher record", error);
        return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
      }

      teacherRow = data;

      if (teacherRow && teacherRow.passcode_hash) {
        const expectedHash = teacherRow.passcode_hash;
        const providedHash = hashTeacherPasscode(trimmedPasscode);

        if (expectedHash === providedHash) {
          teacherId = teacherRow.id;
          schoolId = teacherRow.school_id ?? null;
          teacherName = teacherRow.full_name ?? teacherRow.email ?? null;
          allSchools = Boolean(teacherRow.is_admin);
        }
      }
    }

    if (!teacherId) {
      const fallbackSecret = process.env.TEACHER_PORTAL_SECRET;
      if (!fallbackSecret || fallbackSecret !== trimmedPasscode) {
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }
      teacherId = "legacy-admin";
      schoolId = null;
      teacherName = "Teacher Admin";
      allSchools = true;
    }

    const response = NextResponse.json({
      ok: true,
      teacherId,
      schoolId,
      allSchools,
      teacherName
    });
    response.cookies.set(
      TEACHER_SESSION_COOKIE,
      createTeacherSessionValue({ teacherId, schoolId, allSchools }),
      teacherSessionCookieOptions
    );
    return response;
  } catch (error) {
    console.error("Unexpected error creating teacher session", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEACHER_SESSION_COOKIE, "", { ...teacherSessionCookieOptions, maxAge: 0 });
  return response;
}

export async function GET() {
  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  return NextResponse.json({
    authorized: Boolean(session),
    session
  });
}
