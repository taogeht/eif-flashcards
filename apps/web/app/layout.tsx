import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AudioProvider } from "@/contexts/AudioContext";
import { PracticeProvider } from "@/contexts/PracticeContext";
import SiteHeader from "@/components/SiteHeader";
import { GoogleAnalytics } from "@next/third-parties/google";
import { resolveLevelParam } from "@/lib/levels";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900"
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900"
});

export const metadata: Metadata = {
  title: "English Is Fun",
  description: "Interactive language practice across all English Is Fun levels."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const studentId = cookieStore.get("eif_student_id")?.value ?? null;
  const studentName = cookieStore.get("eif_student_name")?.value ?? null;
  const classId = cookieStore.get("eif_class_id")?.value ?? null;
  const assignmentId = cookieStore.get("eif_assignment_id")?.value ?? null;
  const rawLevelCode = cookieStore.get("eif_level_code")?.value ?? null;
  const levelCode = rawLevelCode ? resolveLevelParam(rawLevelCode) : null;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 font-sans text-slate-900">
        <PracticeProvider
          initialValue={{ studentId, studentName, classId, assignmentId, levelCode }}
        >
          <SiteHeader />
          <AudioProvider>
            <main className="min-h-[calc(100vh-6rem)] pb-16">{children}</main>
          </AudioProvider>
        </PracticeProvider>
        <GoogleAnalytics gaId="G-E2RM2GY0CH" />
      </body>
    </html>
  );
}
