import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const { employeeId, updates, branch } = await req.json();
    if (!employeeId || !updates || !branch) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const userRef = adminDb.collection("schoolUsers").doc(employeeId);
    const empRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("employees")
      .doc(employeeId);
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await Promise.all([
      userRef.update(updateData),
      empRef.update(updateData),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
