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

    const rosterRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${student.className}_${student.section}`);

    const rosterSnap = await rosterRef.get();
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();
    batch.update(userRef, updateData);
    batch.update(studentRef, updateData);
    if (rosterSnap.exists && updates.name) {
      const data = rosterSnap.data();
      const students = (data.students || []).map((s) =>
        s.uid === uid ? { ...s, name: updates.name } : s
      );
      batch.update(rosterRef, {
        students,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT UPDATE ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
