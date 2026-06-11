"use client";

import type { ResumeProfile } from "@talentloop/resume-parser";

/**
 * CSV import with dynamic header recognition.
 *
 * Real-world HR spreadsheets never share one schema, so the importer guesses
 * a column mapping from a multilingual synonym dictionary (EN/DE/ZH) and
 * lets the user confirm or correct it before anything is written. A fixed
 * template is offered only as a fallback download.
 */

// ---------------------------------------------------------------------------
// Parsing (RFC 4180-ish, auto-detected delimiter: , ; or tab)
// ---------------------------------------------------------------------------

export function detectDelimiter(firstLine: string): string {
  const counts: Array<[string, number]> = [
    [",", (firstLine.match(/,/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(text: string, delimiter?: string): string[][] {
  const content = text.replace(/^﻿/, ""); // strip BOM (Excel exports)
  const delim = delimiter ?? detectDelimiter(content.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

// ---------------------------------------------------------------------------
// Header mapping
// ---------------------------------------------------------------------------

export type CanonicalField =
  | "name"
  | "location"
  | "title"
  | "company"
  | "years"
  | "description"
  | "skills"
  | "certifications"
  | "targetRoles"
  | "salaryMin"
  | "languages"
  | "ignore";

export const FIELD_LABELS: Record<CanonicalField, string> = {
  name: "Name",
  location: "City / location",
  title: "Job title",
  company: "Company",
  years: "Years of experience",
  description: "Work description",
  skills: "Skills",
  certifications: "Certifications",
  targetRoles: "Target roles",
  salaryMin: "Salary expectation",
  languages: "Languages",
  ignore: "— ignore —",
};

/** Multilingual header synonyms (EN / DE / ZH), normalized before lookup. */
const SYNONYMS: Record<Exclude<CanonicalField, "ignore">, string[]> = {
  name: ["name", "fullname", "candidatename", "candidate", "vollername", "姓名", "名字", "候选人"],
  location: ["location", "city", "ort", "stadt", "wohnort", "standort", "城市", "所在地", "地点", "现居地"],
  title: ["title", "jobtitle", "position", "role", "currenttitle", "currentposition", "berufsbezeichnung", "beruf", "职位", "岗位", "现职", "当前职位", "职位名称"],
  company: ["company", "employer", "firma", "arbeitgeber", "unternehmen", "公司", "单位", "现公司", "所在公司"],
  years: ["years", "experience", "yearsofexperience", "workexperience", "berufserfahrung", "erfahrung", "工作年限", "年限", "经验年限", "工龄"],
  description: ["description", "summary", "responsibilities", "workhistory", "duties", "beschreibung", "taetigkeit", "tätigkeit", "工作内容", "工作描述", "描述", "简介", "职责"],
  skills: ["skills", "skill", "kenntnisse", "faehigkeiten", "fähigkeiten", "kompetenzen", "技能", "技能标签", "专业技能"],
  certifications: ["certifications", "certification", "certificates", "licences", "licenses", "zertifikate", "scheine", "证书", "资格证书", "资质"],
  targetRoles: ["targetroles", "targetrole", "desiredposition", "desiredrole", "wunschposition", "zielposition", "求职意向", "期望职位", "意向岗位", "目标职位"],
  salaryMin: ["salary", "expectedsalary", "salaryexpectation", "gehalt", "gehaltsvorstellung", "wunschgehalt", "期望薪资", "薪资", "期望工资", "薪资期望"],
  languages: ["languages", "language", "sprachen", "sprachkenntnisse", "语言", "语言能力"],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[\s_\-./()（）:：*]+/g, "")
    .trim();
}

/** Guess a canonical field per column header; unrecognized → "ignore". */
export function guessMapping(headers: string[]): CanonicalField[] {
  const used = new Set<CanonicalField>();
  return headers.map((header) => {
    const norm = normalizeHeader(header);
    if (!norm) return "ignore";
    for (const [field, synonyms] of Object.entries(SYNONYMS) as Array<[CanonicalField, string[]]>) {
      if (used.has(field)) continue;
      if (synonyms.some((s) => norm === s || norm.includes(s) || s.includes(norm))) {
        used.add(field);
        return field;
      }
    }
    return "ignore";
  });
}

// ---------------------------------------------------------------------------
// Rows → profiles
// ---------------------------------------------------------------------------

export interface ImportResult {
  profiles: ResumeProfile[];
  skipped: number;
}

export function rowsToProfiles(
  rows: string[][],
  mapping: CanonicalField[],
  makeId: () => string,
): ImportResult {
  const profiles: ResumeProfile[] = [];
  let skipped = 0;
  const nowYear = new Date().getFullYear();

  for (const row of rows) {
    const get = (field: CanonicalField): string => {
      const idx = mapping.indexOf(field);
      return idx >= 0 ? (row[idx] ?? "").trim() : "";
    };

    const name = get("name");
    if (!name) {
      skipped++;
      continue;
    }
    const title = get("title");
    const description = get("description");
    const years = parseFloat(get("years").replace(",", "."));
    const salary = parseSalary(get("salaryMin"));
    const location = get("location");

    profiles.push({
      id: makeId(),
      basics: {
        name,
        location: location || undefined,
        languages: splitList(get("languages")).length ? splitList(get("languages")) : undefined,
      },
      experiences:
        title || description
          ? [
              {
                title: title || undefined,
                company: get("company") || undefined,
                startDate: isNaN(years) ? undefined : String(Math.max(1970, nowYear - Math.round(years))),
                endDate: "present",
                description: description || undefined,
              },
            ]
          : [],
      education: [],
      skills: splitList(get("skills")),
      certifications: splitList(get("certifications")).length ? splitList(get("certifications")) : undefined,
      intention: {
        roles: splitList(get("targetRoles")).length ? splitList(get("targetRoles")) : undefined,
        salaryMin: salary,
        locations: location ? [location] : undefined,
      },
    });
  }
  return { profiles, skipped };
}

function splitList(s: string): string[] {
  return s
    .split(/[,;，；/|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** "48k", "48.000", "48000", "45-50k" → annual number (lower bound). */
function parseSalary(s: string): number | undefined {
  if (!s) return undefined;
  const cleaned = s.toLowerCase().replace(/[€$£\s]/g, "");
  const m = cleaned.match(/(\d+(?:[.,]\d+)?)(k)?/);
  if (!m) return undefined;
  let value = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  if (m[2] === "k" || value < 1000) value *= 1000;
  return Math.round(value);
}

// ---------------------------------------------------------------------------
// Fallback template
// ---------------------------------------------------------------------------

export const TEMPLATE_CSV = [
  "name,city,job title,company,years of experience,work description,skills,certifications,target roles,salary expectation,languages",
  '"Max Example","Munich","CNC Machinist","Example GmbH","6","Milling and turning of precision parts","cnc milling; technical drawings","IHK certificate","CNC Machinist","46000","German; English"',
  '"Jane Sample","Berlin","Frontend Developer","Sample AG","4","React storefront development","react; typescript","","Frontend Engineer","65000","English"',
].join("\n");
