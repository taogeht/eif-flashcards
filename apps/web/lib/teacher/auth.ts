import { createHash, createHmac } from "crypto";

export interface TeacherSession {
  teacherId: string;
  schoolId: string | null;
  allSchools: boolean;
  issuedAt: string;
}

export const TEACHER_SESSION_COOKIE = "eif_teacher_session";
const SESSION_VERSION = "v2";

type CookieStoreLike = {
  get(name: string): { value?: string } | undefined;
};

const getSessionSecret = (): string => {
  const secret = process.env.TEACHER_SESSION_SECRET ?? process.env.TEACHER_PORTAL_SECRET;
  if (!secret) {
    throw new Error("TEACHER_SESSION_SECRET is not set. Please update your environment configuration.");
  }
  return secret;
};

const hashPayload = (payload: string) =>
  createHmac("sha256", getSessionSecret()).update(payload).digest("hex");

const encodePayload = (payload: TeacherSession): string => {
  const json = JSON.stringify(payload);
  const signature = hashPayload(json);
  return Buffer.from(
    JSON.stringify({
      v: SESSION_VERSION,
      s: signature,
      d: Buffer.from(json, "utf8").toString("base64url")
    })
  ).toString("base64url");
};

const decodePayload = (value: string): TeacherSession | null => {
  try {
    const wrapper = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      v: string;
      s: string;
      d: string;
    };

    if (!wrapper || wrapper.v !== SESSION_VERSION || typeof wrapper.d !== "string") {
      return null;
    }

    const json = Buffer.from(wrapper.d, "base64url").toString("utf8");
    const expectedSignature = hashPayload(json);
    if (expectedSignature !== wrapper.s) {
      return null;
    }

    const payload = JSON.parse(json) as TeacherSession;
    if (!payload?.teacherId) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("Unable to decode teacher session", error);
    return null;
  }
};

export const createTeacherSessionValue = (data: {
  teacherId: string;
  schoolId: string | null;
  allSchools?: boolean;
}): string => {
  const payload: TeacherSession = {
    teacherId: data.teacherId,
    schoolId: data.schoolId ?? null,
    allSchools: Boolean(data.allSchools),
    issuedAt: new Date().toISOString()
  };
  return encodePayload(payload);
};

export const parseTeacherSession = (value: string | null | undefined): TeacherSession | null => {
  if (!value) return null;
  return decodePayload(value);
};

export const getTeacherSession = (cookiesStore: CookieStoreLike | null | undefined): TeacherSession | null => {
  if (!cookiesStore) return null;
  const cookie = cookiesStore.get(TEACHER_SESSION_COOKIE);
  if (!cookie?.value) return null;
  return parseTeacherSession(cookie.value);
};

export const isTeacherAuthorized = (cookiesStore: CookieStoreLike | null | undefined): boolean =>
  Boolean(getTeacherSession(cookiesStore));

export const teacherSessionCookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 12, // 12 hours
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production"
};

export const hashTeacherPasscode = (passcode: string) =>
  createHash("sha256").update(passcode).digest("hex");
