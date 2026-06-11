"use client";

import { useEffect, useState } from "react";
import type { ResumeProfile } from "@talentloop/resume-parser";
import { Pool, PoolCandidate, loadPool, newId, savePool } from "@/lib/store";
import { ImportModal } from "@/components/ImportModal";
import { CandidateDetail } from "@/components/CandidateDetail";

export function PoolClient() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [tab, setTab] = useState<"paste" | "form">("paste");
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const [viewing, setViewing] = useState<PoolCandidate | null>(null);

  useEffect(() => {
    void loadPool().then(setPool);
  }, []);

  // Structured quick-add form (works without any API key).
  const [form, setForm] = useState({
    name: "",
    location: "",
    title: "",
    company: "",
    years: "",
    description: "",
    skills: "",
    certifications: "",
    targetRoles: "",
    salaryMin: "",
  });

  if (!pool) return <main className="board" />;

  function persist(next: Pool) {
    setPool(next);
    void savePool(next);
  }

  function addCandidates(profiles: ResumeProfile[], note: string) {
    persist({ ...pool!, candidates: [...profiles, ...pool!.candidates] });
    setNotice(note);
  }

  function removeCandidate(id: string) {
    persist({ ...pool!, candidates: pool!.candidates.filter((c) => c.id !== id) });
  }

  async function parsePasted() {
    setParsing(true);
    setNotice("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "resume", text: pasteText, id: newId("cand") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const profile = data.profile as ResumeProfile;
      addCandidates([profile], `Added ${profile.basics.name ?? profile.id} to the pool.`);
      setPasteText("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Parsing failed");
    } finally {
      setParsing(false);
    }
  }

  function addFromForm() {
    if (!form.name.trim()) {
      setNotice("Name is required.");
      return;
    }
    const nowYear = new Date().getFullYear();
    const years = parseInt(form.years, 10);
    const profile: ResumeProfile = {
      id: newId("cand"),
      basics: { name: form.name.trim(), location: form.location.trim() || undefined },
      experiences: form.title.trim()
        ? [
            {
              title: form.title.trim(),
              company: form.company.trim() || undefined,
              startDate: isNaN(years) ? undefined : String(nowYear - years),
              endDate: "present",
              description: form.description.trim() || undefined,
            },
          ]
        : [],
      education: [],
      skills: splitList(form.skills),
      certifications: splitList(form.certifications).length ? splitList(form.certifications) : undefined,
      intention: {
        roles: splitList(form.targetRoles).length ? splitList(form.targetRoles) : undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        locations: form.location.trim() ? [form.location.trim()] : undefined,
      },
    };
    addCandidates([profile], `Added ${profile.basics.name} to the pool.`);
    setForm({
      name: "",
      location: "",
      title: "",
      company: "",
      years: "",
      description: "",
      skills: "",
      certifications: "",
      targetRoles: "",
      salaryMin: "",
    });
  }

  return (
    <main className="board">
      <section className="hero">
        <h1>Candidate pool</h1>
        <p>
          {pool.candidates.length} candidates, stored only in this browser (IndexedDB). Import a spreadsheet, paste a
          resume, or use the quick form — then <a href="/">run matching</a>.
        </p>
        <div className="toolbar">
          <button className="btn-primary" onClick={() => setImporting(true)}>
            ⤒ Import CSV
          </button>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="tabs">
            <button className={tab === "paste" ? "active" : ""} onClick={() => setTab("paste")}>
              Paste resume (AI)
            </button>
            <button className={tab === "form" ? "active" : ""} onClick={() => setTab("form")}>
              Quick form
            </button>
          </div>

          {tab === "paste" ? (
            <>
              <textarea
                rows={10}
                placeholder="Paste the full resume text here — any language, any format…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button className="btn-primary" onClick={() => void parsePasted()} disabled={parsing || !pasteText.trim()}>
                {parsing ? "Parsing…" : "Parse & add to pool"}
              </button>
            </>
          ) : (
            <div className="form-grid">
              <input placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="City" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input placeholder="Current/last job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <input placeholder="Years of experience" value={form.years} onChange={(e) => setForm({ ...form, years: e.target.value })} />
              <input placeholder="Min. salary expectation (annual)" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
              <textarea className="span2" rows={3} placeholder="What do/did they do? (free text)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="span2" placeholder="Skills, comma-separated" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              <input className="span2" placeholder="Certifications, comma-separated" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
              <input className="span2" placeholder="Target roles, comma-separated" value={form.targetRoles} onChange={(e) => setForm({ ...form, targetRoles: e.target.value })} />
              <button className="btn-primary span2" onClick={addFromForm}>
                Add to pool
              </button>
            </div>
          )}
          {notice && <p className="muted small">{notice}</p>}
        </section>

        <section className="panel">
          <h3>In the pool</h3>
          <ul className="entity-list">
            {pool.candidates.map((c) => (
              <li key={c.id}>
                <div className="entity-main clickable" onClick={() => setViewing(c)} title="View full profile">
                  <strong>{c.basics.name ?? c.id}</strong>
                  <span className="muted-inline">
                    {" "}
                    · {c.experiences[0]?.title ?? c.derived?.roleTendency?.[0] ?? "no title"} ·{" "}
                    {c.basics.location ?? "—"}
                  </span>
                  {c.derived && <span className="badge-ai">AI-inferred role</span>}
                  {c.engagement && (
                    <span className={`badge-fresh ${c.engagement.status}`}>
                      ● {c.engagement.status === "applied" ? "applied" : "engaged"} · {relTime(c.engagement.at)}
                    </span>
                  )}
                  <span className="details-hint">details ›</span>
                </div>
                <button className="btn-ghost danger" onClick={() => removeCandidate(c.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{viewing.basics.name ?? viewing.id}</h3>
              <button className="modal-close" onClick={() => setViewing(null)}>
                ✕
              </button>
            </header>
            <CandidateDetail candidate={viewing} />
          </div>
        </div>
      )}

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={(profiles, skipped) => {
            setImporting(false);
            addCandidates(
              profiles,
              `Imported ${profiles.length} candidates${skipped > 0 ? ` (${skipped} rows skipped — missing name)` : ""}.`,
            );
          }}
        />
      )}
    </main>
  );
}

function splitList(s: string): string[] {
  return s
    .split(/[,;，；]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function relTime(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
