import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { supabaseServerClient } from "@/lib/supabase/server";
import { getTeacherSession, hashTeacherPasscode } from "@/lib/teacher/auth";

interface UpdatePasscodePayload {
  passcode?: string;
}

const MIN_PASSCODE_LENGTH = 6;

export async function PATCH(request: NextRequest, { params }: { params: { teacherId: string } }) {
  const teacherId = params.teacherId;

  if (!teacherId) {
    return NextResponse.json({ error: "Teacher ID is required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const session = getTeacherSession(cookieStore);
  if (!session || !session.allSchools) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { passcode } = (await request.json()) as UpdatePasscodePayload;

    if (!passcode || passcode.trim().length < MIN_PASSCODE_LENGTH) {
      return NextResponse.json({ error: `Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.` }, { status: 400 });
    }

    const client = supabaseServerClient();
    const { data, error } = await client
      .from("teachers")
      .update({ passcode_hash: hashTeacherPasscode(passcode.trim()) })
      .eq("id", teacherId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Unable to update teacher passcode", error);
      return NextResponse.json({ error: "Unable to update passcode." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error updating passcode", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
