"use client";

import { useState } from "react";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isSuperAdmin } from "@/lib/superAdminService";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const allowed = await isSuperAdmin(res.user.uid);

      if (!allowed) {
        setError("Access denied. Super Admin only.");
        return;
      }

      router.replace("/appitor-admin/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md card">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)]">
            <Shield className="h-6 w-6 text-[var(--primary)]" />
          </div>

          <h1 className="text-2xl font-semibold">Appitor Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Super Admin Console
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="email"
              placeholder="admin@appitor.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
