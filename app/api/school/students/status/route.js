import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uid, status, branch } = await req.json();
    if (!uid || !["active", "disabled"].includes(status) || !branch) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("schoolUsers").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }

    const student = snap.data();
    const studentRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid);

    const rosterRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${student.className}_${student.section}`);

    const rosterSnap = await rosterRef.get();

    const batch = adminDb.batch();
    batch.update(userRef, { status });
    batch.update(studentRef, { status });
    if (rosterSnap.exists) {
      const data = rosterSnap.data();
      const students = (data.students || []).map((s) =>
        s.uid === uid ? { ...s, status } : s
      );
      batch.update(rosterRef, {
        students,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    await adminAuth.updateUser(uid, {
      disabled: status !== "active",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT STATUS ERROR:", err);
    return NextResponse.json(
      { message: "Status update failed" },
      { status: 500 }
    );
  }
}
