"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Lock, Mail } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Identifiants incorrects");
      setLoading(false);
      return;
    }

    // Store admin token in cookie
    document.cookie = `admin_token=${data.token}; path=/admin; max-age=86400; SameSite=Strict`;
    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
            <Truck className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">
            Admin Demenagement24
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Connectez-vous pour accéder au panneau d&apos;administration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                placeholder="admin@demenagement24.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
