import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession, hashTeacherPasscode } from "@/lib/teacher/auth";

interface CreateTeacherPayload {
  email?: string;
  firstName?: string;
  lastName?: string | null;
  passcode?: string;
  schoolId?: string | null;
  isAdmin?: boolean;
}

const MIN_PASSCODE_LENGTH = 6;

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);

  if (!session || !session.allSchools) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { email, firstName, lastName, passcode, schoolId, isAdmin } = (await request.json()) as CreateTeacherPayload;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!passcode || passcode.trim().length < MIN_PASSCODE_LENGTH) {
      return NextResponse.json({ error: `Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.` }, { status: 400 });
    }

    const client = supabaseServerClient();

    const normalizedFirstName = firstName?.trim();
    const normalizedLastName = lastName?.trim() || null;

    if (!normalizedFirstName) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }

    const payload = {
      email: normalizedEmail,
      full_name: [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ") || normalizedEmail,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      passcode_hash: hashTeacherPasscode(passcode.trim()),
      school_id: isAdmin ? null : schoolId ?? null,
      is_admin: Boolean(isAdmin)
    };

    const { data, error } = await client
      .from("teachers")
      .insert(payload)
      .select("id, email, first_name, last_name, full_name, school_id, is_admin, school:schools(id, name)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A teacher with that email already exists." }, { status: 409 });
      }
      console.error("Unable to create teacher", error);
      return NextResponse.json({ error: "Unable to create teacher." }, { status: 500 });
    }

    revalidatePath("/teacher/admin/teachers");

    return NextResponse.json({
      ok: true,
      teacher: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        fullName: data.full_name,
        schoolId: data.school_id,
        schoolName: data.school?.name ?? null,
        isAdmin: Boolean(data.is_admin)
      }
    });
  } catch (error) {
    console.error("Unexpected error creating teacher", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
