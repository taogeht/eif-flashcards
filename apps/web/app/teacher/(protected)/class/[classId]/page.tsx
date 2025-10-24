import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import TeacherClassDashboard from "./TeacherClassDashboardClient";
import { supabaseServerClient } from "@/lib/supabase/server";
import { levelForClass } from "@/lib/levels";
import type { ClassLevel } from "@/config/types";
import { getTeacherSession } from "@/lib/teacher/auth";

interface TeacherClassPageProps {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ range?: string }>;
}

const DEFAULT_RANGE_DAYS = 7;

const toMinutes = (seconds: number | null | undefined) => Math.max(0, Math.round((seconds ?? 0) / 60));

export default async function TeacherClassPage({ params, searchParams }: TeacherClassPageProps) {
  const [{ classId }, query] = await Promise.all([params, searchParams]);
  const cookieStore = await cookies();
  const session = getTeacherSession(cookieStore);

  if (!session) {
    redirect("/teacher/login");
  }

  const client = supabaseServerClient();

  const { data: classRow, error: classError } = await client
    .from("classes")
    .select("id, name, level, code, term_id, school_id, teacher_id")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    console.error("Unable to load class", classError);
    notFound();
  }

  if (!classRow) {
    notFound();
  }

  const classSchoolId = classRow.school_id ?? null;

  if (!session.allSchools) {
    if (!classSchoolId || classSchoolId !== session.schoolId || classRow.teacher_id !== session.teacherId) {
      notFound();
    }
  }

  let termCode: string | null = null;
  if (classRow.term_id) {
    const { data: termRow, error: termError } = await client
      .from("terms")
      .select("code")
      .eq("id", classRow.term_id)
      .maybeSingle();

    if (termError) {
      console.error("Unable to load term", termError);
    }

    termCode = termRow?.code ?? null;
  }

  const classLevel = classRow.level as ClassLevel;
  const levelCode = levelForClass(classLevel, termCode);

  const { data: enrollmentRows, error: enrollmentsError } = await client
    .from("enrollments")
    .select("student:students!inner(id, first_name, last_name, avatar_url)")
    .eq("class_id", classRow.id)
    .is("left_on", null)
    .order("first_name", { ascending: true, foreignTable: "students" });

  if (enrollmentsError) {
    console.error("Unable to load students", enrollmentsError);
    notFound();
  }

  const students = (enrollmentRows ?? [])
    .map((row) => row.student)
    .filter((student): student is Exclude<typeof student, null> => Boolean(student))
    .map((student) => ({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`.trim(),
      firstName: student.first_name,
      avatarUrl: student.avatar_url
    }));

  const rangeDays = Number(query.range ?? DEFAULT_RANGE_DAYS);
  const safeRangeDays = Number.isFinite(rangeDays) && rangeDays > 0 ? Math.min(rangeDays, 30) : DEFAULT_RANGE_DAYS;

  const since = new Date();
  since.setDate(since.getDate() - safeRangeDays);

  const [{ data: sessionRows, error: sessionsError }, { data: assignmentRows, error: assignmentsError }] = await Promise.all([
    client
      .from("practice_sessions")
      .select("id, student_id, activity, level, started_at, ended_at, duration_s, items_completed, accuracy, created_at")
      .eq("class_id", classRow.id)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false }),
    client
      .from("assignments")
      .select("id, title, activity, level, target, due_at, assignment_submissions(id, student_id, status, time_spent_s, completed_at)")
      .eq("class_id", classRow.id)
      .order("created_at", { ascending: false })
  ]);

  if (sessionsError) {
    console.error("Unable to load practice sessions", sessionsError);
    notFound();
  }

  if (assignmentsError) {
    console.error("Unable to load assignments", assignmentsError);
    notFound();
  }

  const studentIndex = new Map<string, (typeof students)[number]>();
  students.forEach((student) => studentIndex.set(student.id, student));

  const studentStats = new Map<
    string,
    {
      minutes: number;
      sessions: number;
      items: number;
      accuracySum: number;
      accuracyCount: number;
    }
  >();

  const recentSessions = (sessionRows ?? []).slice(0, 10).map((session) => {
    const student = studentIndex.get(session.student_id ?? "");
    return {
      id: session.id,
      studentName: student?.firstName ?? "Unknown",
      activity: session.activity,
      minutes: toMinutes(session.duration_s),
      startedAt: session.started_at ?? session.created_at ?? new Date().toISOString()
    };
  });

  for (const session of sessionRows ?? []) {
    if (!session.student_id) {
      continue;
    }

    const current = studentStats.get(session.student_id) ?? {
      minutes: 0,
      sessions: 0,
      items: 0,
      accuracySum: 0,
      accuracyCount: 0
    };

    current.minutes += toMinutes(session.duration_s);
    current.sessions += 1;
    current.items += session.items_completed ?? 0;

    const accuracyValue = typeof session.accuracy === "number" ? session.accuracy : Number(session.accuracy);
    if (!Number.isNaN(accuracyValue) && Number.isFinite(accuracyValue)) {
      current.accuracySum += accuracyValue;
      current.accuracyCount += 1;
    }

    studentStats.set(session.student_id, current);
  }

  const studentSummaries = students.map((student) => {
    const stats = studentStats.get(student.id) ?? {
      minutes: 0,
      sessions: 0,
      items: 0,
      accuracySum: 0,
      accuracyCount: 0
    };

    const accuracy = stats.accuracyCount ? stats.accuracySum / stats.accuracyCount : null;

    return {
      id: student.id,
      name: student.name,
      firstName: student.firstName,
      avatarUrl: student.avatarUrl,
      minutes: stats.minutes,
      sessions: stats.sessions,
      items: stats.items,
      accuracy
    };
  });

  const totals = studentSummaries.reduce(
    (acc, student) => {
      acc.minutes += student.minutes;
      acc.sessions += student.sessions;
      acc.items += student.items;

      if (student.accuracy != null) {
        acc.accuracySum += student.accuracy;
        acc.accuracyCount += 1;
      }

      if (student.sessions > 0) {
        acc.activeStudents += 1;
      }

      return acc;
    },
    {
      minutes: 0,
      sessions: 0,
      items: 0,
      accuracySum: 0,
      accuracyCount: 0,
      activeStudents: 0
    }
  );

  const avgAccuracy = totals.accuracyCount ? totals.accuracySum / totals.accuracyCount : null;

  const assignmentsSummary = (assignmentRows ?? []).map((assignment) => {
    const submissions = assignment.assignment_submissions ?? [];
    const completedCount = submissions.filter((submission) => submission.status === "completed").length;
    const inProgressCount = submissions.filter((submission) => submission.status === "in_progress").length;

    return {
      id: assignment.id,
      title: assignment.title ?? "Untitled",
      activity: assignment.activity,
      level: assignment.level,
      target: assignment.target,
      dueAt: assignment.due_at,
      submissions: submissions.map((submission) => ({
        id: submission.id,
        studentId: submission.student_id,
        status: submission.status,
        timeSpent: submission.time_spent_s ?? 0,
        completedAt: submission.completed_at
      })),
      completedCount,
      inProgressCount,
      totalStudents: submissions.length
    };
  });

  return (
    <TeacherClassDashboard
      classInfo={{
        id: classRow.id,
        name: classRow.name,
        level: classRow.level,
        code: classRow.code ?? "—",
        levelCode,
        termCode,
        schoolId: classSchoolId
      }}
      rangeDays={safeRangeDays}
      summary={{
        minutes: totals.minutes,
        sessions: totals.sessions,
        activeStudents: totals.activeStudents,
        avgAccuracy
      }}
      students={studentSummaries}
      assignments={assignmentsSummary}
      recentSessions={recentSessions}
    />
  );
}
