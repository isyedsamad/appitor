import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uids, toClass, toSection } = await req.json();
    if (!uids?.length || !toClass || !toSection) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const schoolSnap = await adminDb
      .collection("schools")
      .doc(user.schoolId)
      .get();
    if (!schoolSnap.exists || !schoolSnap.data().currentSession) {
      return NextResponse.json(
        { message: "Academic session not configured" },
        { status: 400 }
      );
    }
    const currentSession = schoolSnap.data().currentSession;
    const batch = adminDb.batch();
    for (const uid of uids) {
      const userRef = adminDb.collection("schoolUsers").doc(uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) continue;
      const student = userSnap.data();
      const branchRef = adminDb
        .collection("schools")
        .doc(student.schoolId)
        .collection("branches")
        .doc(student.branchId)
        .collection("students")
        .doc(uid);
      const historyEntry = {
        session: student.currentSession,
        className: student.className,
        section: student.section,
        action:
          toClass === student.className
            ? "section-change"
            : "promoted",
      };
      batch.update(userRef, {
        academicHistory: FieldValue.arrayUnion(historyEntry),
        className: toClass,
        section: toSection,
        currentSession,
        rollNo: null,
        rollAssignedAt: null,
        rollAssignedBy: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(branchRef, {
        academicHistory: FieldValue.arrayUnion(historyEntry),
        className: toClass,
        section: toSection,
        currentSession,
        rollNo: null,
        rollAssignedAt: null,
        rollAssignedBy: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PROMOTION ERROR:", err);
    return NextResponse.json(
      { message: "Promotion failed" },
      { status: 500 }
    );
  }
}
