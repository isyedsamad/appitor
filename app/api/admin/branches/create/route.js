export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { orgId, schoolId, name, branchCode, appitorCode, city, state, plan } = await req.json();
    if (!orgId || !schoolId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const batch = adminDb.batch();
    const branchRef = adminDb.collection("branches").doc();
    const branchData = {
      orgId,
      schoolId,
      name,
      appitorCode,
      plan: plan || "core",
      employeeCounter: 1000,
      studentCounter: 1000,
      branchCode: branchCode || "",
      city: city || "",
      state: state || "",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    };
    batch.set(branchRef, branchData);

    const schoolBranchRef = adminDb.collection("schools").doc(schoolId).collection("branches").doc(branchRef.id);
    batch.set(schoolBranchRef, branchData);
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create branch error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
