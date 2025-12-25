import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uid, newBranchId, branch } = await req.json();
    if (!uid || !newBranchId || !branch) {
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
    const oldBranchId = branch;
    if (oldBranchId === newBranchId) {
      return NextResponse.json(
        { message: "Student already in this branch" },
        { status: 400 }
      );
    }
    const schoolRef = adminDb
      .collection("schools")
      .doc(student.schoolId);
    const newBranchSnap = await schoolRef
      .collection("branches")
      .doc(newBranchId)
      .get();
    if (!newBranchSnap.exists) {
      return NextResponse.json(
        { message: "Invalid branch" },
        { status: 400 }
      );
    }
    const oldStudentRef = schoolRef
      .collection("branches")
      .doc(oldBranchId)
      .collection("students")
      .doc(uid);
    const newStudentRef = schoolRef
      .collection("branches")
      .doc(newBranchId)
      .collection("students")
      .doc(uid);
    await newStudentRef.set(
      {
        ...student,
        currentBranch: newBranchId,
        branchIds: FieldValue.arrayUnion(newBranchId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await userRef.update({
      currentBranch: newBranchId,
      branchIds: FieldValue.arrayUnion(newBranchId),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await oldStudentRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT TRANSFER ERROR:", err);
    return NextResponse.json(
      { message: "Transfer failed" },
      { status: 500 }
    );
  }
}
