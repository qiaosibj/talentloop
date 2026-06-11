"use client";

import { useState } from "react";
import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement } from "@talentloop/jd-parser";
import { recordApplication } from "@/lib/store";

type ResumeChoice = "keep" | "paste" | "upload";

/**
 * Application step with a resume-refresh moment — applying is exactly when
 * a candidate is most willing to update their data, so the loop captures it
 * here instead of asking later.
 */
export function ApplyModal({
  candidate,
  jd,
  answers,
  onClose,
  onApplied,
}: {
  candidate: ResumeProfile;
  jd: JdRequirement;
  answers: Record<string, string>;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [choice, setChoice] = useState<ResumeChoice>("keep");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const latestRole = candidate.experiences[0]?.title ?? candidate.derived?.roleTendency?.[0];
  const onFileSummary = [latestRole, `${candidate.skills.length} skills`, candidate.basics.location]
    .filter(Boolean)
    .join(" · ");

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!/\.(txt|md|text)$/i.test(file.name) && !file.type.startsWith("text/")) {
      setError("For now please use a plain-text file (.txt/.md) — or paste the resume text instead.");
      return;
    }
    setResumeText(await file.text());
    setFileName(file.name);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setNote("");
    try {
      const engagement = {
        status: "applied" as const,
        at: Date.now(),
        jdId: jd.id,
        jdTitle: jd.title,
        answers,
      };

      const text = resumeText.trim();
      if (choice === "keep" || !text) {
        await recordApplication(candidate.id, engagement);
      } else {
        // Try AI parsing; without an API key, attach the raw text honestly.
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "resume", text, id: candidate.id }),
        });
        if (res.ok) {
          const data = await res.json();
          await recordApplication(candidate.id, engagement, { parsed: data.profile as ResumeProfile });
          setNote("Resume parsed and profile updated.");
        } else {
          await recordApplication(candidate.id, engagement, { rawText: text });
          setNote("Application sent with your resume text attached — it will be parsed once AI is enabled.");
        }
      }
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application failed, please retry");
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>
            Apply — {jd.title}
            {jd.company ? ` · ${jd.company}` : ""}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="muted">
          Your conversation answers ({Object.keys(answers).length} fields) go along with the application — nothing to
          fill in twice. One last thing: is your resume up to date?
        </p>

        <div className="choice-list">
          <label className={`choice ${choice === "keep" ? "selected" : ""}`}>
            <input type="radio" checked={choice === "keep"} onChange={() => setChoice("keep")} />
            <div>
              <strong>Use the resume on file</strong>
              <span className="capsule-sub">{onFileSummary || "current profile"}</span>
            </div>
          </label>

          <label className={`choice ${choice === "paste" ? "selected" : ""}`}>
            <input type="radio" checked={choice === "paste"} onChange={() => setChoice("paste")} />
            <div>
              <strong>Paste an updated resume</strong>
              <span className="capsule-sub">Things changed since you last applied? Paste the latest version.</span>
            </div>
          </label>

          <label className={`choice ${choice === "upload" ? "selected" : ""}`}>
            <input type="radio" checked={choice === "upload"} onChange={() => setChoice("upload")} />
            <div>
              <strong>Upload a file</strong>
              <span className="capsule-sub">{fileName || "Plain text (.txt/.md) for now"}</span>
            </div>
          </label>
        </div>

        {choice === "paste" && (
          <textarea
            className="outreach-text"
            rows={7}
            placeholder="Paste your full, current resume text here…"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        )}
        {choice === "upload" && (
          <label className="file-drop">
            <input type="file" accept=".txt,.md,.text,text/plain" onChange={(e) => void onPickFile(e)} hidden />
            <span>{fileName ? `📄 ${fileName} — choose another` : "📄 Choose a file…"}</span>
          </label>
        )}

        {note && <p className="muted small">{note}</p>}
        {error && <p className="error" style={{ padding: 0 }}>{error}</p>}

        <div className="modal-actions">
          <button
            className="btn-primary"
            onClick={() => void submit()}
            disabled={submitting || (choice !== "keep" && !resumeText.trim())}
          >
            {submitting ? "Sending…" : "Send application"}
          </button>
          <button className="btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
