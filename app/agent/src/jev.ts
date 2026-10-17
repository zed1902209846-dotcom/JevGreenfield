/**
 * Client for Jev (TypeSafe AI's "System One" decision model) through
 * OpenRouter's Decisions API. Ported from markusbug/jevymarket `jev.py`
 * (MIT License, Copyright (c) 2026 Markus Haas).
 *
 * Jev is not a chat model. You hand it a JSON `state` and a map of typed
 * `questions`; it returns a typed decision per question with calibrated
 * probabilities. On OpenRouter this lives on a separate beta endpoint:
 *
 *     POST https://openrouter.ai/api/alpha/decisions
 *     { "model": "typesafe/jev-1.14", "state": {...}, "questions": { name: {...} } }
 *
 * Three question primitives:
 *   noul   -> yes/no, answered as P(yes) in [0, 1]; `criteria` must carry "true" and "false"
 *   choice -> one key out of `criteria` {key: description}, plus per-key probabilities
 *   score  -> position on an ordinal rubric `criteria` [level0, level1, ...], plus probabilities
 *
 * Jev only produces the work product — it never touches pricing or signing.
 */

export type Question = Record<string, unknown>;

// ── question builders ───────────────────────────────────────────────────────

export function noul(
  instructions: string,
  criteria: { true: string; false: string } = {
    true: "The statement is true.",
    false: "The statement is false.",
  },
): Question {
  return { type: "noul", instructions, criteria: { ...criteria } };
}

export function choice(
  instructions: string,
  criteria: Record<string, string>,
): Question {
  const n = Object.keys(criteria).length;
  if (n < 2 || n > 255) throw new Error("choice needs between 2 and 255 options");
  return { type: "choice", instructions, criteria: { ...criteria } };
}

export function score(instructions: string, levels: string[]): Question {
  if (levels.length < 2 || levels.length > 10) {
    throw new Error("score needs between 2 and 10 levels");
  }
  return { type: "score", instructions, criteria: [...levels] };
}

// ── response accessors ──────────────────────────────────────────────────────
// Permissive on purpose: the endpoint is in beta and field names may drift.

export type Answer = Record<string, unknown>;

function pick(a: Answer | undefined, ...names: string[]): unknown {
  if (!a) return undefined;
  for (const n of names) {
    if (a[n] !== undefined && a[n] !== null) return a[n];
  }
  return undefined;
}

/** P(yes) for a noul question. */
export function noulOf(a: Answer | undefined): number | null {
  const v = pick(a, "noul", "probability", "p", "value");
  if (typeof v === "boolean") return v ? 1 : 0;
  return typeof v === "number" ? v : null;
}

/** Raw score as returned — the expected value (e.g. 2.92), not a level. */
export function scoreMeanOf(a: Answer | undefined): number | null {
  const v = pick(a, "score", "value");
  return typeof v === "number" ? v : null;
}

export function choiceOf(a: Answer | undefined): string | null {
  const v = pick(a, "choice", "value");
  return v === undefined ? null : String(v);
}

export function confidenceOf(a: Answer | undefined): number | null {
  const v = pick(a, "confidence");
  return typeof v === "number" ? v : null;
}

export interface Decision {
  id?: string;
  model?: string;
  answers: Record<string, Answer>;
  usage: { input_tokens?: number; output_tokens?: number; cost?: number };
}

export class JevError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(`Jev/OpenRouter ${status}: ${message}`);
  }
}

// ── client ──────────────────────────────────────────────────────────────────

export interface JevClientOpts {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxRetries?: number;
}

export class JevClient {
  readonly model: string;
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private readonly maxRetries: number;

  constructor(opts: JevClientOpts) {
    if (!opts.apiKey) throw new Error("OPENROUTER_API_KEY is required to call Jev");
    this.model = opts.model ?? "typesafe/jev-1.14";
    this.maxRetries = opts.maxRetries ?? 4;
    this.url =
      (opts.baseUrl ?? "https://openrouter.ai/api").replace(/\/+$/, "") +
      "/alpha/decisions";
    this.headers = {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "jevGreenfield",
    };
  }

  async decide(
    state: unknown,
    questions: Record<string, Question>,
    abortSignal?: AbortSignal,
  ): Promise<Decision> {
    const data = await postWithRetry(
      this.url,
      this.headers,
      { model: this.model, state, questions },
      this.maxRetries,
      0.5,
      abortSignal,
      (status, msg, body) => new JevError(status, msg, body),
    );
    const d = data as Partial<Decision>;
    if (!d || typeof d.answers !== "object" || d.answers === null) {
      throw new JevError(200, "response has no `answers` map", data);
    }
    return { ...d, answers: d.answers, usage: d.usage ?? {} } as Decision;
  }
}

/** POST JSON with jittered exponential backoff on 429 / 5xx. Shared with research.ts. */
export async function postWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  maxRetries: number,
  initialDelaySeconds: number,
  abortSignal: AbortSignal | undefined,
  makeError: (status: number, message: string, body: unknown) => Error,
): Promise<unknown> {
  let delay = initialDelaySeconds;
  for (let attempt = 1; ; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });
    const text = await resp.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }
    if (resp.status < 400) return parsed;
    const retryable = resp.status === 429 || resp.status >= 500;
    const msg = errorMessage(parsed, text, resp.statusText);
    if (retryable && attempt < maxRetries) {
      const sleep = delay * (1 + Math.random());
      console.warn(
        `[jev] ${url} ${resp.status} (${msg}); retry ${attempt}/${maxRetries} in ${sleep.toFixed(1)}s`,
      );
      await new Promise((r) => setTimeout(r, sleep * 1000));
      delay *= 2;
      continue;
    }
    throw makeError(resp.status, msg, parsed);
  }
}

function errorMessage(body: unknown, text: string, statusText: string): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const err = b.error;
    if (err && typeof err === "object") {
      const m = (err as Record<string, unknown>).message;
      return String(m ?? JSON.stringify(err));
    }
    if (err) return String(err);
    if (b.detail) return String(b.detail);
  }
  return (text || statusText || "").slice(0, 300);
}
