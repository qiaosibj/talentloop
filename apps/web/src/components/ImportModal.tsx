"use client";

import { useMemo, useState } from "react";
import { ImportSpec, parseCsv } from "@/lib/csv";
import { newId } from "@/lib/store";

/**
 * Generic CSV importer: dynamic header recognition + user-confirmed column
 * mapping. The `spec` decides whether it imports candidates or positions.
 */
export function ImportModal({
  spec,
  onImported,
  onClose,
}: {
  spec: ImportSpec;
  onImported: (items: unknown[], skipped: number) => void;
  onClose: () => void;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const fieldOptions = useMemo(() => Object.keys(spec.fieldLabels), [spec]);
  const templateHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(spec.templateCsv)}`,
    [spec],
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
      setMapping(spec.guess(parsed[0]));
    } catch {
      setError("Could not read this file — is it a CSV?");
    }
  }

  function doImport() {
    if (!mapping.includes(spec.requiredField)) {
      setError(`Map one column to "${spec.requiredLabel}" — it is the only required field.`);
      return;
    }
    const result = spec.convert(rows, mapping, () => newId(spec.idPrefix));
    onImported(result.items, result.skipped);
  }

  const recognized = mapping.filter((m) => m !== "ignore").length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Import {spec.noun} from CSV</h3>
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
              <input
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                onChange={(e) => void onPickFile(e)}
                hidden
              />
              <span>📄 Choose a CSV file…</span>
            </label>
            <p className="muted small">
              No spreadsheet at hand?{" "}
              <a href={templateHref} download={spec.templateName}>
                Download the template
              </a>{" "}
              — but your own export will usually work as-is.
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              <strong>{fileName}</strong> · {rows.length} rows · {recognized}/{headers.length} columns recognized
              automatically. Adjust below, then import — only "{spec.requiredLabel}" is required.
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
                            next[i] = e.target.value;
                            setMapping(next);
                          }}
                        >
                          {fieldOptions.map((f) => (
                            <option key={f} value={f}>
                              {spec.fieldLabels[f]}
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
                Import {rows.length} {spec.noun}
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
        {error && (
          <p className="error" style={{ padding: 0, marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
