import { findJd, findResume } from "@/lib/data";
import { InterviewChat } from "@/components/InterviewChat";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ jd?: string }>;
}) {
  const { personId } = await params;
  const { jd: jdId } = await searchParams;
  const candidate = findResume(personId);
  const jd = jdId ? findJd(jdId) : undefined;

  if (!candidate || !jd) {
    return (
      <main className="interview">
        <p className="empty">Unknown candidate or job. Go back to the board and pick an opportunity.</p>
      </main>
    );
  }

  return (
    <main className="interview">
      <section className="interview-head">
        <h1>AI pre-screening — {jd.title}</h1>
        <p>
          Candidate view: this is what <strong>{candidate.basics.name}</strong> sees after tapping the outreach link.
          The conversation fills a structured profile on the right; a human recruiter reviews everything.
        </p>
      </section>
      <InterviewChat personId={candidate.id} jdId={jd.id} candidateName={candidate.basics.name ?? candidate.id} />
    </main>
  );
}
