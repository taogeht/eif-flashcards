import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import TeacherLoginClient from "./TeacherLoginClient";
import { getTeacherSession } from "@/lib/teacher/auth";

export default async function TeacherLoginPage() {
  const cookieStore = await cookies();

  if (getTeacherSession(cookieStore)) {
    redirect("/teacher/classes");
  }

  return <TeacherLoginClient />;
}
