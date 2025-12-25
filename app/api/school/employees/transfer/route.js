import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "employee.manage");
    const { branch, employeeId, newBranchId } = await req.json();
    if (!branch || !employeeId || !newBranchId) {
      return NextResponse.json(
        { message: "Invalid payload" },
        { status: 400 }
      );
    }
    const userRef = adminDb.collection("schoolUsers").doc(employeeId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }
    const emp = userSnap.data();
    const oldBranchId = emp.currentBranch;
    if (oldBranchId === newBranchId) {
      return NextResponse.json(
        { message: "Employee already in this branch" },
        { status: 400 }
      );
    }
    const schoolRef = adminDb.collection("schools").doc(emp.schoolId);
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
    const newBranchName = newBranchSnap.data().name;
    const oldEmpRef = schoolRef
      .collection("branches")
      .doc(oldBranchId)
      .collection("employees")
      .doc(employeeId);
    const newEmpRef = schoolRef
      .collection("branches")
      .doc(newBranchId)
      .collection("employees")
      .doc(employeeId);
    await newEmpRef.set(
      {
        ...emp,
        currentBranch: newBranchId,
        branchIds: FieldValue.arrayUnion(newBranchId),
        branchNames: FieldValue.arrayUnion(newBranchName),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await userRef.update({
      currentBranch: newBranchId,
      branchIds: FieldValue.arrayUnion(newBranchId),
      branchNames: FieldValue.arrayUnion(newBranchName),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await oldEmpRef.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EMPLOYEE TRANSFER ERROR:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
