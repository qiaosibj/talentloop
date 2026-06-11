"use client";

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@talentloop/match-engine";
import { Pool, findCandidate, findJob, savePool } from "@/lib/store";
import { fillTemplate, templateForTier } from "@/lib/outreach";

export function OutreachModal({
  opp,
  pool,
  onClose,
  onTemplatesChanged,
}: {
  opp: Opportunity;
  pool: Pool;
  onClose: () => void;
  onTemplatesChanged: (pool: Pool) => void;
}) {
  const candidate = findCandidate(pool, opp.personId);
  const jd = findJob(pool, opp.jdId);
  const template = templateForTier(pool, opp.tier);

  const generated = useMemo(
    () => (candidate && jd ? fillTemplate(template, opp, candidate, jd) : ""),
    [template, opp, candidate, jd],
  );

  const [message, setMessage] = useState(generated);
  const [copied, setCopied] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [note, setNote] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateBody, setTemplateBody] = useState(template.body);

  useEffect(() => setMessage(generated), [generated]);

  if (!candidate || !jd) return null;

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function rewrite() {
    setRewriting(true);
    setNote("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMessage(data.text);
      if (data.note) setNote(data.note);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  }

  function saveTemplate() {
    const next: Pool = {
      ...pool,
      templates: pool.templates.map((t) => (t.id === template.id ? { ...t, body: templateBody } : t)),
    };
    void savePool(next);
    onTemplatesChanged(next);
    setEditingTemplate(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>
            Outreach — {candidate.basics.name} · {jd.title}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <p className="muted">
          Template "{template.name}" filled with this opportunity's real data. Edit freely — the pre-screening link is
          already included.
        </p>

        <textarea className="outreach-text" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} />
        {note && <p className="muted small">{note}</p>}

        <div className="modal-actions">
          <button className="btn-primary" onClick={() => void copy()}>
            {copied ? "Copied ✓" : "Copy message"}
          </button>
          <button className="btn-ghost" onClick={() => void rewrite()} disabled={rewriting}>
            {rewriting ? "Rewriting…" : "✨ AI rewrite"}
          </button>
          <button className="btn-ghost" onClick={() => setEditingTemplate((v) => !v)}>
            {editingTemplate ? "Hide template" : "Edit template"}
          </button>
        </div>

        {editingTemplate && (
          <div className="template-editor">
            <p className="muted small">
              Placeholders: {"{name} {jobTitle} {company} {location} {topReason} {link}"} — saved per tier, applies to
              all future messages in the "{opp.tier}" tier.
            </p>
            <textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} rows={6} />
            <button className="btn-primary" onClick={saveTemplate}>
              Save template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
