import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { className, section, branch, updates } = await req.json();
    if (!className || !section || !updates?.length || !branch) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }

    const batch = adminDb.batch();
    const rosterRef = adminDb
      .collection("schools")
      .doc(user.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("meta")
      .doc(`${className}_${section}`);

    const rosterSnap = await rosterRef.get();
    updates.forEach((item) => {
      const userRef = adminDb.collection("schoolUsers").doc(item.uid);
      const branchRef = adminDb
        .collection("schools")
        .doc(user.schoolId)
        .collection("branches")
        .doc(branch)
        .collection("students")
        .doc(item.uid);

      const data = {
        rollNo: item.rollNo,
        rollAssignedAt: FieldValue.serverTimestamp(),
        rollAssignedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.update(userRef, data);
      batch.update(branchRef, data);
    });

    if (rosterSnap.exists) {
      const data = rosterSnap.data();
      let students = data.students || [];
      const rollMap = new Map(
        updates.map((u) => [u.uid, u.rollNo])
      );
      students = students.map((s) =>
        rollMap.has(s.uid)
          ? { ...s, rollNo: rollMap.get(s.uid) }
          : s
      );
      batch.update(rosterRef, {
        students,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ASSIGN ROLL ERROR:", err);
    return NextResponse.json(
      { message: "Failed to assign roll numbers" },
      { status: 500 }
    );
  }
}
