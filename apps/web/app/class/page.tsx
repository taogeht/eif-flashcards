import { cookies } from "next/headers";

import ClassCodeEntry from "./ClassCodeEntry";
import { supabaseServerClient } from "@/lib/supabase/server";

const KIOSK_SCHOOL_ID = process.env.EIF_KIOSK_SCHOOL_ID ?? null;

export default async function ClassHomePage() {
  const cookieStore = await cookies();
  const lastCode = cookieStore.get("eif_last_class_code")?.value ?? null;

  let schoolName: string | null = null;

  if (KIOSK_SCHOOL_ID) {
    try {
      const client = supabaseServerClient();
      const { data: schoolRow, error } = await client
        .from("schools")
        .select("id, name")
        .eq("id", KIOSK_SCHOOL_ID)
        .maybeSingle();

      if (error) {
        console.error("Unable to load school for kiosk", error);
      } else if (schoolRow?.name) {
        schoolName = schoolRow.name;
      }
    } catch (loadError) {
      console.error("Unexpected kiosk school lookup error", loadError);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <ClassCodeEntry lastClassCode={lastCode} schoolName={schoolName} schoolId={KIOSK_SCHOOL_ID} />
    </div>
  );
}
