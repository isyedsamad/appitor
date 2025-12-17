"use client";

import { useState } from "react";
import { Mail, Lock, Shield, ArrowRight } from "lucide-react";
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
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
            <Shield className="h-6 w-6 text-neutral-700" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Appitor Admin
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Super Admin Console
          </p>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              placeholder="admin@appitor.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-10 py-2.5 text-sm outline-none transition focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-10 py-2.5 text-sm outline-none transition focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading && (
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          )}
        </button>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-neutral-400">
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
