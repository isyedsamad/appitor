import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { className, section, branch, updates, session } = await req.json();
    if (!className || !section || !updates?.length || !branch || !session) {
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
      .doc(`${className}_${section}_${session}`);

    const rosterSnap = await rosterRef.get();
    if (rosterSnap.exists) {
      const data = rosterSnap.data();
      let students = data.students || [];
      const rosterUids = new Set(students.map(s => s.uid));

      const rollMap = new Map();
      updates.forEach((item) => {
        if (!rosterUids.has(item.uid)) return; // Skip if not in roster

        rollMap.set(item.uid, item.rollNo);

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

      // Update roster students array
      students = students.map((s) =>
        rollMap.has(s.uid)
          ? { ...s, rollNo: rollMap.get(s.uid) }
          : s
      );

      batch.update(rosterRef, {
        students,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      return NextResponse.json(
        { message: "Roster not found" },
        { status: 404 }
      );
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
