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
    updates.forEach(item => {
      const userRef = adminDb
        .collection("schoolUsers")
        .doc(item.uid);
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
