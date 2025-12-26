export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const {orgId, schoolId, name, branchCode, appitorCode, city, state} = await req.json();
    if (!orgId || !schoolId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const batch = adminDb.batch();
    const branchRef = adminDb.collection("branches").doc();
    batch.set(branchRef, {
      orgId,
      schoolId,
      name,
      appitorCode,
      employeeCounter: 1000,
      branchCode: branchCode || "",
      city: city || "",
      state: state || "",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
    const schoolBranchRef = adminDb.collection('schools').doc(schoolId)
      .collection('branches').doc(branchRef.id);
    batch.set(schoolBranchRef, {
      orgId,
      schoolId,
      name,
      appitorCode,
      employeeCounter: 1000,
      branchCode: branchCode || "",
      city: city || "",
      state: state || "",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    })
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
