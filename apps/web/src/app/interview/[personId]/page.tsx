import { InterviewClient } from "@/components/InterviewClient";

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ jd?: string }>;
}) {
  const { personId } = await params;
  const { jd: jdId } = await searchParams;
  return <InterviewClient personId={personId} jdId={jdId ?? ""} />;
}
