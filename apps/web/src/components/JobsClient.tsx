"use client";

import { useEffect, useState } from "react";
import type { JdRequirement, JobCategory } from "@talentloop/jd-parser";
import { Pool, loadPool, newId, savePool } from "@/lib/store";
import { JobDetail } from "@/components/JobDetail";

const CATEGORIES: JobCategory[] = ["blue-collar", "sales", "technical", "general"];

export function JobsClient() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [tab, setTab] = useState<"paste" | "form">("paste");
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewing, setViewing] = useState<JdRequirement | null>(null);

  const [form, setForm] = useState({
    title: "",
    company: "",
    category: "general" as JobCategory,
    location: "",
    industry: "",
    skills: "",
    mustHave: "",
    salaryMin: "",
    salaryMax: "",
    benefits: "",
  });

  useEffect(() => {
    void loadPool().then(setPool);
  }, []);

  if (!pool) return <main className="board" />;

  function persist(next: Pool) {
    setPool(next);
    void savePool(next);
  }

  function addJob(jd: JdRequirement) {
    persist({ ...pool!, jobs: [jd, ...pool!.jobs] });
    setNotice(`Added "${jd.title}".`);
  }

  function removeJob(id: string) {
    persist({ ...pool!, jobs: pool!.jobs.filter((j) => j.id !== id) });
  }

  async function parsePasted() {
    setParsing(true);
    setNotice("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "jd", text: pasteText, id: newId("jd") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      addJob(data.jd as JdRequirement);
      setPasteText("");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Parsing failed");
    } finally {
      setParsing(false);
    }
  }

  function addFromForm() {
    if (!form.title.trim()) {
      setNotice("Job title is required.");
      return;
    }
    const jd: JdRequirement = {
      id: newId("jd"),
      title: form.title.trim(),
      company: form.company.trim() || undefined,
      category: form.category,
      location: form.location.trim() || undefined,
      industry: form.industry.trim() || undefined,
      mustHave: splitList(form.mustHave).map((value) => ({ type: "skill" as const, value })),
      niceToHave: [],
      skills: splitList(form.skills),
      offer: {
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        benefits: splitList(form.benefits).length ? splitList(form.benefits) : undefined,
      },
    };
    addJob(jd);
    setForm({
      title: "",
      company: "",
      category: "general",
      location: "",
      industry: "",
      skills: "",
      mustHave: "",
      salaryMin: "",
      salaryMax: "",
      benefits: "",
    });
  }

  return (
    <main className="board">
      <section className="hero">
        <h1>Open positions</h1>
        <p>
          {pool.jobs.length} positions. Add a job by pasting the JD (AI parsing) or with the quick form, then{" "}
          <a href="/board">run matching</a> to see who in your pool fits it.
        </p>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="tabs">
            <button className={tab === "paste" ? "active" : ""} onClick={() => setTab("paste")}>
              Paste JD (AI)
            </button>
            <button className={tab === "form" ? "active" : ""} onClick={() => setTab("form")}>
              Quick form
            </button>
          </div>

          {tab === "paste" ? (
            <>
              <textarea
                rows={10}
                placeholder="Paste the full job description here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button className="btn-primary" onClick={() => void parsePasted()} disabled={parsing || !pasteText.trim()}>
                {parsing ? "Parsing…" : "Parse & add"}
              </button>
            </>
          ) : (
            <div className="form-grid">
              <input placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as JobCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              <input placeholder="Salary range, e.g. 45000" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
              <input placeholder="…to, e.g. 55000" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
              <input className="span2" placeholder="Required skills, comma-separated" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              <input className="span2" placeholder="Hard requirements, comma-separated" value={form.mustHave} onChange={(e) => setForm({ ...form, mustHave: e.target.value })} />
              <input className="span2" placeholder="Benefits, comma-separated" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
              <button className="btn-primary span2" onClick={addFromForm}>
                Add position
              </button>
            </div>
          )}
          {notice && <p className="muted small">{notice}</p>}
        </section>

        <section className="panel">
          <h3>Open positions</h3>
          <ul className="entity-list">
            {pool.jobs.map((j) => (
              <li key={j.id}>
                <div className="entity-main clickable" onClick={() => setViewing(j)} title="View job details">
                  <strong>{j.title}</strong>
                  <span className="muted-inline">
                    {" "}
                    · {j.company ?? "—"} · {j.location ?? "—"} · {j.category}
                  </span>
                  <span className="details-hint">details ›</span>
                </div>
                <button className="btn-ghost danger" onClick={() => removeJob(j.id)}>
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
              <h3>{viewing.title}</h3>
              <button className="modal-close" onClick={() => setViewing(null)}>
                ✕
              </button>
            </header>
            <JobDetail jd={viewing} />
          </div>
        </div>
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
