"use client";

export default function UnauthorizedPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold text-(--danger)">
        Access Denied
      </h1>
      <p className="mt-2 text-sm text-(--text-muted)">
        You don’t have permission to access this page.
      </p>
    </div>
  );
}
