import { createUntypedAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createUntypedAdminClient>;

export async function startCronRun(
  admin: SupabaseAdmin,
  cronName: string
): Promise<number | null> {
  const { data, error } = await admin
    .from("cron_runs")
    .insert({ cron_name: cronName })
    .select("id")
    .single();
  if (error) {
    console.error(`[cron-log] startCronRun(${cronName}) failed:`, error.message);
    return null;
  }
  return (data as { id: number } | null)?.id ?? null;
}

export async function finishCronRun(
  admin: SupabaseAdmin,
  runId: number | null,
  outcome: { success: boolean; error?: string | null; meta?: unknown }
) {
  if (runId == null) return;
  const { error } = await admin
    .from("cron_runs")
    .update({
      finished_at: new Date().toISOString(),
      success: outcome.success,
      error: outcome.error ?? null,
      meta: (outcome.meta as Record<string, unknown>) ?? null,
    })
    .eq("id", runId);
  if (error) {
    console.error(`[cron-log] finishCronRun(${runId}) failed:`, error.message);
  }
}
