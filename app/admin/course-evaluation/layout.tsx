import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "강의 설문지",
};

export default function CourseEvaluationAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
