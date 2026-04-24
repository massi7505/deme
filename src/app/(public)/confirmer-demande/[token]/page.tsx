"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "already" | "invalid";

export default function ConfirmReconfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  // Optional hint rendered before the POST completes so the user sees why
  // they're here even on slow networks. Server is the source of truth for
  // which action actually runs (encoded in the token).
  const hintAction = searchParams.get("action");

  const [state, setState] = useState<State>("loading");
  const [action, setAction] = useState<"yes" | "no" | null>(null);
  const [extendedUntil, setExtendedUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    try {
      const res = await fetch("/api/public/quote-reconfirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("invalid");
        setError(data.error || "Lien invalide ou expiré");
        return;
      }
      setAction(data.action || null);
      setExtendedUntil(data.extendedUntil || null);
      setState(data.already ? "already" : "success");
    } catch {
      setState("invalid");
      setError("Erreur réseau");
    }
  }, [token]);

  useEffect(() => {
    submit();
  }, [submit]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {state === "loading" && (
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {hintAction === "no"
                  ? "Enregistrement de votre réponse..."
                  : "Mise à jour de votre demande..."}
              </p>
            </div>
          )}

          {state === "success" && action === "yes" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold">Demande prolongée</h1>
              <p className="text-sm text-muted-foreground">
                Votre demande reste visible pour nos déménageurs
                {extendedUntil ? ` jusqu'au ${new Date(extendedUntil).toLocaleDateString("fr-FR")}` : ""}.
                Vous pouvez recevoir de nouvelles propositions.
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </div>
          )}

          {state === "success" && action === "no" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold">Merci pour votre retour</h1>
              <p className="text-sm text-muted-foreground">
                Votre demande a été archivée. Nos déménageurs ne seront plus sollicités.
                Bon déménagement !
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </div>
          )}

          {state === "already" && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto" />
              <h1 className="text-xl font-bold">Réponse déjà enregistrée</h1>
              <p className="text-sm text-muted-foreground">
                Vous avez déjà répondu à cette demande. Aucune nouvelle action n&apos;est nécessaire.
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </div>
          )}

          {state === "invalid" && (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h1 className="text-xl font-bold">Lien invalide</h1>
              <p className="text-sm text-muted-foreground">
                {error || "Ce lien n'est plus valide ou a expiré."}
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
