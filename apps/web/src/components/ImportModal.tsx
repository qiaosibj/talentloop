"use client";

import { useMemo, useState } from "react";
import type { ResumeProfile } from "@talentloop/resume-parser";
import {
  CanonicalField,
  FIELD_LABELS,
  TEMPLATE_CSV,
  guessMapping,
  parseCsv,
  rowsToProfiles,
} from "@/lib/csv";
import { newId } from "@/lib/store";

const FIELD_OPTIONS = Object.keys(FIELD_LABELS) as CanonicalField[];

export function ImportModal({
  onImported,
  onClose,
}: {
  onImported: (profiles: ResumeProfile[], skipped: number) => void;
  onClose: () => void;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CanonicalField[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const templateHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`,
    [],
  );

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("The file needs a header row plus at least one data row.");
        return;
      }
      setFileName(file.name);
      setHeaders(parsed[0]);
      setRows(parsed.slice(1));
      setMapping(guessMapping(parsed[0]));
    } catch {
      setError("Could not read this file — is it a CSV?");
    }
  }

  function doImport() {
    const nameIdx = mapping.indexOf("name");
    if (nameIdx < 0) {
      setError('Map one column to "Name" — it is the only required field.');
      return;
    }
    const result = rowsToProfiles(rows, mapping, () => newId("cand"));
    onImported(result.profiles, result.skipped);
  }

  const recognized = mapping.filter((m) => m !== "ignore").length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Import candidates from CSV</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {headers.length === 0 ? (
          <>
            <p className="muted">
              Any column layout works — headers are recognized automatically (English / German / Chinese), and you
              confirm the mapping before anything is imported. Comma, semicolon and tab delimiters are detected.
            </p>
            <label className="file-drop">
              <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={(e) => void onPickFile(e)} hidden />
              <span>📄 Choose a CSV file…</span>
            </label>
            <p className="muted small">
              No spreadsheet at hand? <a href={templateHref} download="talentloop-template.csv">Download the template</a>{" "}
              — but your own export will usually work as-is.
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              <strong>{fileName}</strong> · {rows.length} rows · {recognized}/{headers.length} columns recognized
              automatically. Adjust below, then import — only "Name" is required.
            </p>
            <div className="mapping-table-wrap">
              <table className="mapping-table">
                <thead>
                  <tr>
                    <th>Your column</th>
                    <th>Maps to</th>
                    <th>First rows preview</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, i) => (
                    <tr key={i} className={mapping[i] === "ignore" ? "row-ignored" : ""}>
                      <td className="col-header">{h || <em>(empty)</em>}</td>
                      <td>
                        <select
                          value={mapping[i]}
                          onChange={(e) => {
                            const next = [...mapping];
                            next[i] = e.target.value as CanonicalField;
                            setMapping(next);
                          }}
                        >
                          {FIELD_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {FIELD_LABELS[f]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="col-preview">
                        {rows.slice(0, 3).map((r) => r[i]).filter(Boolean).join(" · ") || <em>—</em>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={doImport}>
                Import {rows.length} candidates
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setHeaders([]);
                  setRows([]);
                  setMapping([]);
                  setFileName("");
                }}
              >
                Pick another file
              </button>
            </div>
          </>
        )}
        {error && <p className="error" style={{ padding: 0, marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
}
