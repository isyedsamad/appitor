import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uid, updates, branch } = await req.json();
    if (!uid || !updates || !branch) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const userRef = adminDb.collection("schoolUsers").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }
    const student = userSnap.data();
    const studentRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid);
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await Promise.all([
      userRef.update(updateData),
      studentRef.update(updateData),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
