export const dynamic = "force-dynamic";

export default function TestSentryPage() {
  throw new Error("[sentry-test] Déclenchement volontaire pour vérifier la capture");
}
