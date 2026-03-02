"use client";

import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="h-[80dvh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
      <div className="w-20 h-20 mb-6 rounded-3xl bg-(--danger)/10 flex items-center justify-center border border-(--danger)/20 relative">
        <div className="absolute inset-0 bg-(--danger)/20 blur-xl rounded-full" />
        <ShieldAlert className="w-10 h-10 text-(--danger) relative z-10" strokeWidth={1.5} />
      </div>

      <h1 className="text-3xl font-bold text-(--text) tracking-tight mb-2">
        Access Restricted
      </h1>

      <p className="max-w-md text-sm text-(--text-muted) leading-relaxed mb-8">
        Your current plan or role permissions do not grant access to this module.
        If you believe this is an error, please contact your school administrator.
      </p>

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-(--bg-card) border border-(--border) text-sm font-semibold text-(--text) hover:bg-(--primary-soft) hover:border-(--primary)/30 hover:text-(--primary) transition-all shadow-sm"
      >
        <ArrowLeft size={16} />
        Go Back
      </button>
    </div>
  );
}
