"use client";

import type { ResumeProfile } from "@talentloop/resume-parser";
import type { JdRequirement, JobCategory, MustHave } from "@talentloop/jd-parser";

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
// Job import (same auto-recognition approach, job-specific dictionary)
// ---------------------------------------------------------------------------

export type JobField =
  | "title"
  | "company"
  | "category"
  | "location"
  | "industry"
  | "skills"
  | "mustHave"
  | "niceToHave"
  | "responsibilities"
  | "salaryMin"
  | "salaryMax"
  | "salaryRange"
  | "benefits"
  | "level"
  | "ignore";

export const JOB_FIELD_LABELS: Record<JobField, string> = {
  title: "Job title",
  company: "Company",
  category: "Category",
  location: "Location",
  industry: "Industry",
  skills: "Required skills",
  mustHave: "Hard requirements",
  niceToHave: "Nice to have",
  responsibilities: "Responsibilities",
  salaryMin: "Salary from",
  salaryMax: "Salary to",
  salaryRange: "Salary range",
  benefits: "Benefits",
  level: "Level / seniority",
  ignore: "— ignore —",
};

const JOB_SYNONYMS: Record<Exclude<JobField, "ignore">, string[]> = {
  title: ["jobtitle", "title", "position", "role", "vacancy", "stellenbezeichnung", "stelle", "职位", "岗位", "岗位名称", "职位名称"],
  company: ["company", "employer", "client", "firma", "unternehmen", "arbeitgeber", "公司", "单位", "客户", "用人单位"],
  category: ["category", "jobcategory", "type", "kategorie", "类别", "岗位类别", "类型", "岗位类型"],
  location: ["location", "city", "standort", "ort", "arbeitsort", "地点", "城市", "工作地点", "工作城市"],
  industry: ["industry", "sector", "branche", "行业"],
  skills: ["skills", "requiredskills", "skillset", "kenntnisse", "技能", "技能要求"],
  mustHave: ["musthave", "hardrequirements", "requirements", "voraussetzungen", "anforderungen", "必备", "硬性要求", "必备条件", "任职要求", "岗位要求"],
  niceToHave: ["nicetohave", "preferred", "plus", "wunschenswert", "wünschenswert", "加分项", "优先", "优先条件"],
  responsibilities: ["responsibilities", "tasks", "duties", "aufgaben", "taetigkeiten", "职责", "工作内容", "工作职责"],
  salaryMin: ["salarymin", "salaryfrom", "minsalary", "gehaltvon", "薪资下限", "最低薪资", "薪资从"],
  salaryMax: ["salarymax", "salaryto", "maxsalary", "gehaltbis", "薪资上限", "最高薪资", "薪资到"],
  salaryRange: ["salary", "salaryrange", "pay", "compensation", "gehalt", "verguetung", "vergütung", "薪资", "薪资范围", "月薪", "年薪", "工资"],
  benefits: ["benefits", "perks", "wirbieten", "weoffer", "福利", "待遇", "福利待遇"],
  level: ["level", "seniority", "grade", "职级", "级别"],
};

export function guessJobMapping(headers: string[]): JobField[] {
  const used = new Set<JobField>();
  return headers.map((header) => {
    const norm = normalizeHeader(header);
    if (!norm) return "ignore";
    for (const [field, synonyms] of Object.entries(JOB_SYNONYMS) as Array<[JobField, string[]]>) {
      if (used.has(field)) continue;
      if (synonyms.some((s) => norm === s || norm.includes(s) || s.includes(norm))) {
        used.add(field);
        return field;
      }
    }
    return "ignore";
  });
}

function normalizeCategory(s: string): JobCategory {
  const v = s.toLowerCase();
  if (/sales|verkauf|vertrieb|销售/.test(v)) return "sales";
  if (/tech|it|engineer|developer|entwickl|技术|研发/.test(v)) return "technical";
  if (/blue|produktion|lager|handwerk|gewerblich|蓝领|工人|operative/.test(v)) return "blue-collar";
  if (/general|allgemein|通用/.test(v)) return "general";
  return "general";
}

/** Classify a free-text hard requirement into a typed knock-out criterion. */
function toMustHave(value: string): MustHave {
  const v = value.toLowerCase();
  const years = v.match(/(\d+)\s*\+?\s*(years?|jahre|年)/);
  if (years) return { type: "experience-years", value: years[1] };
  if (/licen[cs]e|certificat|schein|zertifikat|führerschein|证/.test(v)) return { type: "certification", value };
  if (/german|english|deutsch|englisch|sprach|语|[abc][12]\b/.test(v)) return { type: "language", value };
  if (/ausbildung|degree|bachelor|master|diplom|abschluss|学历|vocational/.test(v)) return { type: "education", value };
  return { type: "skill", value };
}

function parseSalaryRange(s: string): { min?: number; max?: number } {
  if (!s) return {};
  const parts = s
    .split(/-|–|~|到|至|\bbis\b|\bto\b/i)
    .map((p) => parseSalary(p))
    .filter((n): n is number => n !== undefined);
  if (parts.length >= 2) return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
  if (parts.length === 1) return { min: parts[0] };
  return {};
}

export function rowsToJobs(rows: string[][], mapping: string[], makeId: () => string): { items: JdRequirement[]; skipped: number } {
  const items: JdRequirement[] = [];
  let skipped = 0;
  for (const row of rows) {
    const get = (field: JobField): string => {
      const idx = mapping.indexOf(field);
      return idx >= 0 ? (row[idx] ?? "").trim() : "";
    };
    const title = get("title");
    if (!title) {
      skipped++;
      continue;
    }
    // A "salary from" column sometimes carries a full range ("40.000-48.000 €") —
    // run range parsing on every salary-ish column and merge.
    const range = parseSalaryRange(get("salaryRange"));
    const minCol = parseSalaryRange(get("salaryMin"));
    const salaryMin = minCol.min ?? range.min;
    const salaryMax = parseSalary(get("salaryMax")) ?? minCol.max ?? range.max;

    items.push({
      id: makeId(),
      title,
      company: get("company") || undefined,
      category: normalizeCategory(get("category")),
      location: get("location") || undefined,
      industry: get("industry") || undefined,
      mustHave: splitList(get("mustHave")).map(toMustHave),
      niceToHave: splitList(get("niceToHave")),
      skills: splitList(get("skills")),
      responsibilities: splitList(get("responsibilities")).length ? splitList(get("responsibilities")) : undefined,
      offer: {
        salaryMin,
        salaryMax,
        benefits: splitList(get("benefits")).length ? splitList(get("benefits")) : undefined,
        level: get("level") || undefined,
      },
    });
  }
  return { items, skipped };
}

export const JOBS_TEMPLATE_CSV = [
  "job title,company,category,location,industry,required skills,hard requirements,salary from,salary to,benefits,responsibilities",
  '"CNC Machinist","Example GmbH","blue-collar","Munich","machinery","cnc milling; technical drawings","3 years experience; Facharbeiterbrief","44000","52000","30 days vacation; shift bonus","Set up machining centers; first-article inspection"',
  '"Inside Sales Rep","Sample SE","sales","Hamburg","software","b2b sales; hubspot","2 years experience; German C1","45000","55000","uncapped commission","Qualify leads; run demos"',
].join("\n");

// ---------------------------------------------------------------------------
// Fallback template
// ---------------------------------------------------------------------------

export const TEMPLATE_CSV = [
  "name,city,job title,company,years of experience,work description,skills,certifications,target roles,salary expectation,languages",
  '"Max Example","Munich","CNC Machinist","Example GmbH","6","Milling and turning of precision parts","cnc milling; technical drawings","IHK certificate","CNC Machinist","46000","German; English"',
  '"Jane Sample","Berlin","Frontend Developer","Sample AG","4","React storefront development","react; typescript","","Frontend Engineer","65000","English"',
].join("\n");

// ---------------------------------------------------------------------------
// Import specs — one generic modal, two configurations
// ---------------------------------------------------------------------------

export interface ImportSpec {
  /** e.g. "candidates" — used in UI copy. */
  noun: string;
  idPrefix: string;
  requiredField: string;
  requiredLabel: string;
  fieldLabels: Record<string, string>;
  guess: (headers: string[]) => string[];
  convert: (rows: string[][], mapping: string[], makeId: () => string) => { items: unknown[]; skipped: number };
  templateCsv: string;
  templateName: string;
}

export const CANDIDATE_IMPORT_SPEC: ImportSpec = {
  noun: "candidates",
  idPrefix: "cand",
  requiredField: "name",
  requiredLabel: "Name",
  fieldLabels: FIELD_LABELS,
  guess: (headers) => guessMapping(headers),
  convert: (rows, mapping, makeId) => {
    const r = rowsToProfiles(rows, mapping as CanonicalField[], makeId);
    return { items: r.profiles, skipped: r.skipped };
  },
  templateCsv: TEMPLATE_CSV,
  templateName: "talentloop-candidates-template.csv",
};

export const JOB_IMPORT_SPEC: ImportSpec = {
  noun: "positions",
  idPrefix: "jd",
  requiredField: "title",
  requiredLabel: "Job title",
  fieldLabels: JOB_FIELD_LABELS,
  guess: (headers) => guessJobMapping(headers),
  convert: (rows, mapping, makeId) => rowsToJobs(rows, mapping, makeId),
  templateCsv: JOBS_TEMPLATE_CSV,
  templateName: "talentloop-jobs-template.csv",
};
