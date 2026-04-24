import { NextResponse } from "next/server";

/**
 * Return a generic 500 response for a DB / internal error, logging the real
 * cause server-side only. Use this instead of `NextResponse.json({ error:
 * dbError.message })` to avoid leaking Postgres / PostgREST details (table
 * names, constraint names, column hints) to anonymous or lightly-authed
 * callers.
 *
 * `context` is a short tag that lands in `console.error` so the log is
 * greppable in Vercel logs (e.g. "public/reviews:insert").
 */
export function serverError(context: string, detail: unknown): NextResponse {
  console.error(`[${context}]`, detail);
  return NextResponse.json(
    { error: "Une erreur est survenue, réessayez plus tard" },
    { status: 500 }
  );
}
