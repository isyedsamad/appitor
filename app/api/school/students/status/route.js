import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";
import { incrementStudentCount } from "@/lib/school/analyticsUtils";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.profile.manage");
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
      .doc(`${student.className}_${student.section}_${student.currentSession}`);

    await adminDb.runTransaction(async (tx) => {
      const rosterSnap = await tx.get(rosterRef);
      const currentSnap = await tx.get(userRef);
      const currentData = currentSnap.data();
      const oldStatus = currentData.status;

      tx.update(userRef, { status, updatedAt: FieldValue.serverTimestamp() });
      tx.update(studentRef, { status, updatedAt: FieldValue.serverTimestamp() });

      if (rosterSnap.exists) {
        const data = rosterSnap.data();
        const students = (data.students || []).map((s) =>
          s.uid === uid ? { ...s, status } : s
        );
        tx.update(rosterRef, {
          students,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Sync Analytics
      if (oldStatus !== status) {
        if (status === "active") {
          await incrementStudentCount(tx, adminDb, student.schoolId, branch, 1, student.gender);
        } else if (oldStatus === "active") {
          await incrementStudentCount(tx, adminDb, student.schoolId, branch, -1, student.gender);
        }
      }
    });

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
