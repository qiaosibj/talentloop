import { NextResponse } from "next/server";

/**
 * Lightweight abuse protection for the AI endpoints, so a public demo with
 * real API keys can't be quota-drained:
 *
 *  1. per-request size caps (enforced in each route)
 *  2. per-IP sliding-window rate limits
 *  3. a global daily budget per endpoint
 *
 * State is in-memory per server instance — on serverless that means
 * "per warm instance", which is a deterrent, not a guarantee. Good enough
 * for a demo; a real deployment would back this with Redis/Upstash.
 *
 * Set DISABLE_RATE_LIMITS=1 (e.g. locally) to switch everything off.
 */

const windows = new Map<string, number[]>();

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  return true;
}

const budgets = new Map<string, { day: string; used: number }>();

function spendBudget(name: string, amount: number, dailyMax: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = budgets.get(name);
  const used = entry && entry.day === day ? entry.used : 0;
  if (used + amount > dailyMax) return false;
  budgets.set(name, { day, used: used + amount });
  return true;
}

function clientKey(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
}

export interface GuardOptions {
  /** Endpoint name for budget bookkeeping, e.g. "chat". */
  name: string;
  /** Per-IP requests allowed per window. */
  perIp: number;
  /** Window length in ms. */
  windowMs: number;
  /** Global daily budget for this endpoint (units = `amount`). */
  dailyMax: number;
  /** How many units this request spends (e.g. number of texts). Default 1. */
  amount?: number;
}

/** Returns a 429 response when a limit is hit, or null to proceed. */
export function guard(req: Request, opts: GuardOptions): NextResponse | null {
  if (process.env.DISABLE_RATE_LIMITS === "1") return null;

  if (!allow(`${opts.name}:${clientKey(req)}`, opts.perIp, opts.windowMs)) {
    return NextResponse.json(
      { error: "Rate limit reached — please wait a few minutes and try again." },
      { status: 429 },
    );
  }
  if (!spendBudget(opts.name, opts.amount ?? 1, opts.dailyMax)) {
    return NextResponse.json(
      { error: "The daily AI budget for this demo is used up — try again tomorrow." },
      { status: 429 },
    );
  }
  return null;
}
